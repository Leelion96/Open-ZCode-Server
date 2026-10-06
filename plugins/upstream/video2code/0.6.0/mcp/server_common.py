"""MCP server 公共层: 工具分发 + ToolResult → MCP content 转换。

关键点:
- 工具实现包含同步视频/文件处理，全部丢进**单线程** executor，避免阻塞
  MCP asyncio loop；顺带把工具调用串行化（与旧 agent loop 一致）。
- ToolResult.image_paths → ImageContent 内联; video_paths 由调用方传入的
  converter 转成图片 (MCP 无视频 content 类型) 再内联。
- 异常兜底成 [ERROR] 文本 (与旧 ToolRegistry.call 行为一致), 不让 server 崩。
"""
from __future__ import annotations
import asyncio
import base64
import logging
import os
import sys
import traceback
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from typing import Callable

import mcp.types as types
from mcp.server import Server
from mcp.server.stdio import stdio_server

from v2c_tools.result import ToolResult
from v2c_tools.run_context import RunContext

log = logging.getLogger(__name__)

_MIME = {".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
         ".webp": "image/webp", ".gif": "image/gif"}

# 内联载荷瘦身参数 (2026-07-24: 网关请求体硬限 32 MiB, 单任务 120+ 张内联图撞墙致
# 会话死亡螺旋; 实测 PNG 均 324KB 是大头, JPEG 转码即可砍半以上)。只瘦喂给模型的
# 字节, 不动落盘证据文件。
try:
    _INLINE_JPEG_Q = int(os.environ.get("V2C_INLINE_JPEG_QUALITY", "85"))
except ValueError:
    _INLINE_JPEG_Q = 85
try:
    _INLINE_MAX_KB = int(os.environ.get("V2C_INLINE_MAX_KB", "300"))
except ValueError:
    _INLINE_MAX_KB = 300


def _shrink_inline(raw: bytes, mime: str) -> tuple[bytes, str]:
    """PNG→JPEG 转码; 任何栅格图超 V2C_INLINE_MAX_KB 后按 0.75/0.5 降分辨率直到达标。
    动图 (gif) 原样; 已达标的 jpeg/webp 原样 (不重压, 不掉质)。失败兜底原样内联。"""
    cap = _INLINE_MAX_KB * 1024
    if mime == "image/gif":
        return raw, mime
    if mime != "image/png" and len(raw) <= cap:
        return raw, mime
    try:
        import io
        from PIL import Image
        im = Image.open(io.BytesIO(raw))
        if im.mode not in ("RGB", "L"):
            im = im.convert("RGB")
        out = raw
        for scale in (1.0, 0.75, 0.5):
            im2 = im if scale == 1.0 else im.resize(
                (max(1, int(im.width * scale)), max(1, int(im.height * scale))),
                Image.LANCZOS)
            buf = io.BytesIO()
            im2.save(buf, "JPEG", quality=_INLINE_JPEG_Q)
            out = buf.getvalue()
            if len(out) <= cap:
                break
        if len(out) < len(raw):
            return out, "image/jpeg"
        return raw, mime  # 转码反而更大 (极小图/纯色) → 保持原样
    except Exception as e:
        log.warning("内联瘦身失败, 原样内联: %s", e)
        return raw, mime


def _image_content(path: str) -> types.ImageContent | None:
    p = Path(path)
    try:
        raw = p.read_bytes()
    except OSError as e:
        log.warning("内联图片读取失败 %s: %s", path, e)
        return None
    raw, mime = _shrink_inline(raw, _MIME.get(p.suffix.lower(), "image/jpeg"))
    return types.ImageContent(type="image", data=base64.b64encode(raw).decode(),
                              mimeType=mime)


def result_to_content(res: ToolResult | str,
                      video_converter: Callable[[str], tuple[str, list[str]]] | None = None,
                      ) -> list[types.TextContent | types.ImageContent]:
    """ToolResult → MCP content 列表。video_converter(video_path) → (附加文本, 图片路径列表)。"""
    if isinstance(res, str):
        res = ToolResult(text=res)
    text = res.text
    images = list(res.image_paths)
    for vp in res.video_paths:
        if video_converter is None:
            text += f"\n[note] 视频已落盘: {vp} (本形态不内联视频)"
            continue
        try:
            note, grids = video_converter(vp)
        except Exception as e:
            log.warning("录像抽帧内联失败 %s: %s", vp, e)
            note, grids = f"\n[warn] 录像抽帧内联失败 ({e}), 视频已落盘: {vp}", []
        text += note
        images.extend(grids)
    out: list[types.TextContent | types.ImageContent] = []
    # CC 对单条 tool_result 的内联图片有上限 (实测 18 张只收到 16 张, 尾部被静默丢弃)。
    # 不丢图: 超出部分改为列文件路径, 模型用 Read 分批查看 (CC Read 原生渲染图片)。
    try:
        max_inline = int(os.environ.get("V2C_MAX_INLINE_IMAGES", "16"))
    except ValueError:
        max_inline = 16
    if len(images) > max_inline:
        overflow = images[max_inline:]
        images = images[:max_inline]
        text += (f"\n[note] 本次共拼出 {len(images) + len(overflow)} 张图, 单条结果最多内联 "
                 f"{max_inline} 张 — 前 {max_inline} 张已内联在下面, 其余 {len(overflow)} 张"
                 "同样已拼好并落盘 (与内联图同属本次请求的时间窗, 不是次要内容)。"
                 "请在下一步用 Read 取回 — 可在同一轮里并行 Read 全部路径, 一次补齐:\n"
                 + "\n".join(f"  - {p}" for p in overflow))
    out.append(types.TextContent(type="text", text=text))
    for ip in images:
        ic = _image_content(ip)
        if ic is not None:
            out.append(ic)
    return out


def serve(server_name: str,
          schemas: dict[str, dict],
          impls: dict[str, Callable],
          ctx: RunContext,
          video_converter: Callable[[str], tuple[str, list[str]]] | None = None,
          on_shutdown: Callable[[], None] | None = None) -> None:
    """起 stdio MCP server。schemas: name → {description, inputSchema}; impls: name → fn(args, ctx)。"""
    logging.basicConfig(level=logging.INFO, stream=sys.stderr,
                        format=f"[{server_name}] %(levelname)s %(message)s")
    server = Server(server_name)
    executor = ThreadPoolExecutor(max_workers=1,
                                  thread_name_prefix=f"{server_name}-tools")

    @server.list_tools()
    async def list_tools() -> list[types.Tool]:
        return [types.Tool(name=n, description=s["description"],
                           inputSchema=s["inputSchema"])
                for n, s in schemas.items()]

    @server.call_tool()
    async def call_tool(name: str, arguments: dict):
        fn = impls.get(name)
        if fn is None:
            return [types.TextContent(type="text",
                                      text=f"[ERROR] 未知工具: {name!r}")]

        def _run():
            try:
                res = fn(arguments or {}, ctx)
                return result_to_content(res, video_converter)
            except Exception as e:
                tb = traceback.format_exc(limit=5)
                return [types.TextContent(
                    type="text", text=f"[ERROR] tool {name} 执行失败: {e}\n{tb}")]

        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(executor, _run)

    async def _main():
        async with stdio_server() as (read, write):
            await server.run(read, write, server.create_initialization_options())

    try:
        asyncio.run(_main())
    finally:
        if on_shutdown is not None:
            # 收尾也走工具线程，和工具持有的本地进程/文件状态保持同一执行顺序。
            try:
                executor.submit(on_shutdown).result(timeout=60)
            except Exception as e:
                log.warning("shutdown 清理失败: %s", e)
        executor.shutdown(wait=False)
