"""UserPromptSubmit: 用户 prompt 里出现网站 URL (且无本地视频路径) 时注入 url2video 引导。

与 check_video_input 同一哲学: 只做检测, 不强制 — 误命中 (用户提 URL 另有他意)
的代价只是一行提示, 所以措辞是"若任务涉及"。URL 在日常 prompt 里远比视频路径
常见, 故加一层任务词门控 (复刻/录制/replicate/record...), 纯贴 URL 不触发。
本地视频路径与 URL 并存时不注入 (视频优先, 录制这步本来就是可选的)。
"""
from __future__ import annotations
import json
import re
import sys

from hook_common import read_stdin_json

URL_RE = re.compile(r"https?://[^\s'\"()\[\]<>,;,、。;:!?]+", re.IGNORECASE)
VIDEO_PATH_RE = re.compile(
    r"[^\s'\"()\[\]<>,;,、。;:!?]+\.(?:mp4|mov|webm|mkv|avi)\b", re.IGNORECASE)
# 任务词门控: prompt 里得像在提"复刻/录制这个网站", 而不是随手贴个链接
INTENT_RE = re.compile(
    r"复刻|复现|还原|克隆|录制|录屏|录成|录个|replicat|recreat|reproduc|clone|record|capture",
    re.IGNORECASE)
MAX_URLS = 3


def main() -> None:
    data = read_stdin_json()
    prompt = data.get("prompt") or ""
    if VIDEO_PATH_RE.search(prompt) or not INTENT_RE.search(prompt):
        sys.exit(0)
    urls = []
    for m in URL_RE.finditer(prompt):
        u = m.group(0).rstrip("/.")
        if u not in urls:
            urls.append(u)
        if len(urls) >= MAX_URLS:
            break
    if not urls:
        sys.exit(0)
    listed = " ".join(urls)
    print(json.dumps({
        "hookSpecificOutput": {
            "hookEventName": "UserPromptSubmit",
            "additionalContext": (
                f"[video2code] 检测到网站 URL 输入 ({listed}) 且无本地视频。"
                "若本次任务是录制/复刻该网站: 先加载 url2video skill, 按"
                " survey→写剧本→record→转码→审片 流程用内置浏览器把网站动效录成"
                " recordings/<name>.webm, 再用 ffmpeg 转成 recordings/<name>.mp4"
                " (原 webm 保留); 若还需复刻, 再连同"
                " video2code + web-replicate 一起以该 MP4 为源视频走原流程。"),
        }
    }, ensure_ascii=False))
    sys.exit(0)


if __name__ == "__main__":
    main()
