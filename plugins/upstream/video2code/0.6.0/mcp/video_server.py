#!/usr/bin/env python3
"""video MCP server: clip_video (源视频时间窗细看) + ingest_video (整片摄入概览)
+ still_crops / composite_view (静帧裁剪与对照拼图, 产图即内联)。

与 runtime 分开跑的理由: 依赖面 (cv2/ffmpeg) 与部署服务分离, clip 的
CPU 密集抽帧不会堵部署工具的单线程队列。
"""
from __future__ import annotations
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from server_common import serve
from v2c_tools import stillview, video
from v2c_tools.run_context import RunContext
from v2c_tools.schemas import TOOL_SCHEMAS


def main() -> None:
    ctx = RunContext()
    serve("v2c-video",
          {"clip_video": TOOL_SCHEMAS["clip_video"],
           "ingest_video": TOOL_SCHEMAS["ingest_video"],
           "still_crops": TOOL_SCHEMAS["still_crops"],
           "composite_view": TOOL_SCHEMAS["composite_view"]},
          {"clip_video": video.clip_video,
           "ingest_video": video.ingest_video,
           "still_crops": stillview.still_crops,
           "composite_view": stillview.composite_view},
          ctx)


if __name__ == "__main__":
    main()
