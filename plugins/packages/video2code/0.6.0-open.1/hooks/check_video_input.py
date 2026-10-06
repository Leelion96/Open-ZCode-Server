"""UserPromptSubmit: 用户 prompt 里出现本地视频文件路径时注入摄入引导。

只做检测 + 廉价探测 (文件存在性 / metadata 时长 / sheet glob), 不抽帧 —
重活留给 ingest_video 工具 (幂等, 图片直接内联)。误命中 (用户提视频路径
另有他意) 的代价只是一行提示, 所以措辞是"若任务涉及", 不强制。
cv2 仅在真的命中视频路径后才 import (导入本身 ~0.5s, 不摊给每次提交)。
"""
from __future__ import annotations
import json
import sys
import re
from pathlib import Path

from hook_common import read_stdin_json, project_dir

# 排除引号/括号/常见中英文标点, 避免 "a.mp4,b.mp4" 被贪婪匹配成一个假路径
VIDEO_PATH_RE = re.compile(
    r"[^\s'\"()\[\]<>,;,、。;:!?]+\.(?:mp4|mov|webm|mkv|avi)\b", re.IGNORECASE)
MAX_VIDEOS = 3  # 每条 prompt 最多引导前 3 个视频, 再多是枚举不是任务输入


def _duration_s(p: Path) -> float:
    """cv2 metadata 时长 (秒); 任何失败返回 0 (提示里省略时长, 不报错)。"""
    try:
        import cv2
        cap = cv2.VideoCapture(str(p))
        fps = cap.get(cv2.CAP_PROP_FPS) or 0.0
        n = cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0.0
        cap.release()
        return n / fps if fps > 0 else 0.0
    except Exception:
        return 0.0


def _grid_start_ms(p: Path) -> int:
    """video_grid_<start_ms>ms_<end_ms>ms.jpg → start_ms (与 v2c_tools.video 同款排序键;
    字典序会把 103926ms 排到 39350ms 前面)。"""
    m = re.search(r"_grid_(\d+)ms_", p.name)
    return int(m.group(1)) if m else 1 << 62


def _existing_sheets(proj: Path, video: Path) -> list[Path]:
    """已完成摄入的证据: ingest_video 工具输出目录或 batch 预抽帧目录任一有 sheet。"""
    for d in (proj / ".v2c" / "_ingest_" / video.stem, proj / "ingest"):
        if d.is_dir():
            sheets = sorted(d.glob("video_grid_*.jpg"), key=_grid_start_ms)
            if sheets:
                return sheets
    return []


def main() -> None:
    data = read_stdin_json()
    prompt = data.get("prompt") or ""
    proj = project_dir()
    seen: set[Path] = set()
    lines: list[str] = []
    for m in VIDEO_PATH_RE.finditer(prompt):
        p = Path(m.group(0))
        if not p.is_absolute():
            p = proj / p
        try:
            p = p.resolve()
        except OSError:
            continue
        if p in seen or not p.is_file():
            continue
        seen.add(p)
        if len(seen) > MAX_VIDEOS:
            break
        sheets = _existing_sheets(proj, p)
        if sheets:
            listed = "\n".join(f"  - {s}" for s in sheets)
            lines.append(
                f"[video2code] 视频 {p} 已完成整片摄入, 带时间戳的概览 contact sheet "
                f"就位 (可直接 Read, 细看具体时刻用 clip_video):\n{listed}")
        else:
            dur = _duration_s(p)
            dur_txt = f" (时长 ~{dur:.0f}s)" if dur > 0 else ""
            lines.append(
                f"[video2code] 检测到本地视频输入 {p}{dur_txt}, 尚未做整片摄入。"
                "若本次任务需要观察/复刻该视频, 先调用 ingest_video(video_path) 获取"
                "带时间戳的整片概览 contact sheet, 之后再用 clip_video 细看具体时刻。")
    if not lines:
        sys.exit(0)
    print(json.dumps({
        "hookSpecificOutput": {
            "hookEventName": "UserPromptSubmit",
            "additionalContext": "\n".join(lines),
        }
    }, ensure_ascii=False))
    sys.exit(0)


if __name__ == "__main__":
    main()
