"""图片素材 catalog 工具 (Phase A): get_asset。

配合离线 build_section_catalog.py 产的 catalog.json。模型在 contact sheet 上按
ref (a01/a02…) 选图, 调 get_asset(ref) 把 canonical(≤1920) 下载进项目
public/assets/, 拿到本地路径写 JSX。URL 留在 ctx.catalog 里, 不进模型 context。
"""
from __future__ import annotations
import logging
import math
import shutil
import tempfile
import urllib.request
from pathlib import Path

from .run_context import RunContext
from .result import ToolResult

log = logging.getLogger(__name__)


def _fetch(url: str, dst: Path) -> None:
    """url 可以是 http(s) 或本地绝对路径 (图床 stub)。落到 dst。"""
    if url.startswith(("http://", "https://")):
        urllib.request.urlretrieve(url, str(dst))
    else:
        shutil.copy(url, dst)


def _label_font(size: int):
    from PIL import ImageFont
    for path in ("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
                 "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"):
        try:
            return ImageFont.truetype(path, size)
        except Exception:
            continue
    try:
        return ImageFont.load_default(size=size)
    except TypeError:
        return ImageFont.load_default()


def build_contact_sheet(images: list[dict], out_path: Path,
                        cols: int = 4, cell: int = 256, pad: int = 14,
                        header_h: int = 40) -> Path:
    """把 catalog 的缩略图拼成带边框 + 醒目标注的网格图, 给模型一眼扫全部逻辑图。

    每格: 顶部深色 header bar 写大号粗体 "a01  1074x806" (降低 OCR 难度),
    下方缩略图居中, 整格描边。白底。
    """
    from PIL import Image, ImageDraw

    font_ref = _label_font(24)
    font_dim = _label_font(18)
    BORDER = (60, 60, 60)
    HEADER_BG = (31, 41, 55)        # 深蓝灰
    HEADER_FG = (255, 255, 255)
    CELL_BG = (245, 245, 245)

    n = len(images)
    cols = max(1, min(cols, n)) if n else 1
    rows = max(1, math.ceil(n / cols))
    cw, ch = cell + 2 * pad, cell + header_h + 2 * pad
    W, H = cols * cw + pad, rows * ch + pad
    sheet = Image.new("RGB", (W, H), "white")
    draw = ImageDraw.Draw(sheet)

    tmp = Path(tempfile.mkdtemp(prefix="contact_"))
    for i, im in enumerate(images):
        r, c = divmod(i, cols)
        # 整格外框 (含 header + 图)
        gx0, gy0 = pad + c * cw, pad + r * ch
        gx1, gy1 = gx0 + cell + 2 * pad - pad, gy0 + cell + header_h + 2 * pad - pad
        draw.rectangle([gx0, gy0, gx1, gy1], fill=CELL_BG,
                       outline=BORDER, width=2)
        # header bar
        draw.rectangle([gx0, gy0, gx1, gy0 + header_h], fill=HEADER_BG)
        ref = str(im.get("ref", "?"))
        dim = f"{im.get('w','?')}x{im.get('h','?')}"
        draw.text((gx0 + 8, gy0 + 6), ref, fill=HEADER_FG, font=font_ref)
        rb = draw.textbbox((0, 0), ref, font=font_ref)
        draw.text((gx0 + 8 + (rb[2] - rb[0]) + 12, gy0 + 11), dim,
                  fill=(200, 205, 215), font=font_dim)
        # 缩略图区
        ix0, iy0 = gx0 + pad, gy0 + header_h + pad
        url = im.get("thumb_url") or im.get("url")
        try:
            local = tmp / f"{ref}{Path(url.split('?')[0]).suffix or '.jpg'}"
            _fetch(url, local)
            with Image.open(local) as t:
                t = t.convert("RGB")
                t.thumbnail((cell, cell), Image.LANCZOS)
            sheet.paste(t, (ix0 + (cell - t.width) // 2,
                            iy0 + (cell - t.height) // 2))
        except Exception as e:
            draw.text((ix0 + 6, iy0 + 6), f"(load fail)\n{e}",
                      fill="red", font=font_dim)
    shutil.rmtree(tmp, ignore_errors=True)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(out_path)
    return out_path


def _fetch_one(ref: str, entry: dict, ctx: RunContext,
               dest: str = "") -> tuple[str, str | None]:
    """下载单个 ref 到 public/assets, 返回 (结果行文本, 预览图路径或 None)。"""
    url = entry["url"]
    ext = Path(url.split("?")[0]).suffix.lower() or ".jpg"
    fname = dest.strip() if dest and dest.strip() else f"{ref}{ext}"
    if not Path(fname).suffix:
        fname += ext
    assets_dir = ctx.app_dir / "public" / "assets"
    assets_dir.mkdir(parents=True, exist_ok=True)
    dst = assets_dir / Path(fname).name
    try:
        _fetch(url, dst)
    except Exception as e:
        return f"[ERROR] ref={ref} 下载失败: {e}", None

    web = f"/assets/{dst.name}"
    w, h = entry.get("w"), entry.get("h")
    log.info("get_asset %s → %s (%sx%s)", ref, web, w, h)
    # 元信息随回执带出 (实际像素/透明通道/角部色), 省掉模型拿到素材后再用
    # PIL 探"有没有透明底/能不能放深色主题"的轮次 (实测一条 page 复刻轨迹花了 ~5 轮)。
    meta = f"{w}x{h}"
    if dst.suffix.lower() == ".svg":
        meta += ", SVG 矢量 (天然透明底)"
    else:
        try:
            import cv2
            raw = cv2.imread(str(dst), cv2.IMREAD_UNCHANGED)
            if raw is not None:
                ah, aw = raw.shape[:2]
                meta = f"{aw}x{ah}"
                if raw.ndim == 3 and raw.shape[2] == 4 and bool((raw[..., 3] < 250).any()):
                    meta += ", 透明底"
                else:
                    px = raw[..., :3] if raw.ndim == 3 else raw
                    cs = [px[0, 0], px[0, -1], px[-1, 0], px[-1, -1]]
                    hexes = []
                    for c in cs:
                        b, g, r = (int(c), int(c), int(c)) if px.ndim == 2 else (
                            int(c[0]), int(c[1]), int(c[2]))
                        hexes.append(f"#{r:02x}{g:02x}{b:02x}")
                    uniq = sorted(set(hexes))
                    meta += ", 不透明, 四角" + ("≈" + uniq[0] if len(uniq) == 1
                                               else " " + "/".join(hexes))
        except Exception as e:
            log.warning("get_asset 元信息探测失败 (照常返回): %s", e)
    # inline 预览降到 low 档缩略图 (用途只是确认"是不是这张", ~70tok 够;
    # 全分辨率原图已落 public/assets 不受影响)。不可解码格式 (svg 等) 回落原图。
    preview = str(dst)
    try:
        import cv2
        from .frame_utils import resize_frame
        img = cv2.imread(str(dst))
        if img is not None:
            pdir = ctx.upload_dir / "_asset_previews_"
            pdir.mkdir(parents=True, exist_ok=True)
            pp = pdir / f"{dst.stem}.preview.jpg"
            if cv2.imwrite(str(pp), resize_frame(img, "low"),
                           [cv2.IMWRITE_JPEG_QUALITY, 80]):
                preview = str(pp)
    except Exception as e:
        log.warning("get_asset 预览缩略失败, 回落原图: %s", e)
    return f"[asset ready] ref={ref}  → {web}  ({meta})", preview


def get_asset(args: dict, ctx: RunContext):
    """单 ref (ref=) 或批量 (refs=[...]) 下载素材, 预览图一并内联。

    批量是省轮次的首选: 计划好一个区域/整页要用的素材后一次调用全下,
    逐张确认预览。dest 重命名只对单 ref 生效。
    """
    ctx.load_catalog()
    catalog = ctx.catalog or {}
    if not catalog:
        return ("[ERROR] 本任务没有素材清单 (catalog) — get_asset 不可用。"
                "请自主取材: SVG/canvas 重绘、CSS 渐变/纹理、裁帧放大观察后重绘等。")

    refs = args.get("refs")
    if isinstance(refs, str):
        refs = [r.strip() for r in refs.split(",") if r.strip()]
    single = (args.get("ref") or "").strip()
    if not refs:
        refs = [single] if single else []
    refs = [str(r).strip() for r in refs if str(r).strip()]
    if not refs:
        return "[ERROR] 需要 ref 或 refs 参数, 例如 refs=[\"a01\",\"a05\"]"

    avail = ", ".join(sorted(catalog)) or "(空)"
    lines: list[str] = []
    previews: list[str] = []
    for ref in refs:
        entry = catalog.get(ref)
        if entry is None:
            lines.append(f"[ERROR] 没有 ref={ref!r} 的素材。可用 ref: {avail}")
            continue
        line, pv = _fetch_one(ref, entry, ctx,
                              dest=args.get("dest", "") if len(refs) == 1 else "")
        lines.append(line)
        if pv:
            previews.append(pv)
    text = "\n".join(lines)
    if previews:
        text += ("\n在 JSX 里用返回的本地 /assets/ 路径引用。下面按上列顺序 inline 低清预览, "
                 "仅确认内容对不对 (落盘原图是全分辨率); 内容不符的 ref 就弃用, 换 ref 或转代画。")
    return ToolResult(text=text, image_paths=previews)
