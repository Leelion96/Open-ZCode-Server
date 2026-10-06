"""ToolResult: 工具返回值 (文本 + 待内联的媒体路径)。

CC 迁移后消费方从 agent_loop 变为 MCP server:
- image_paths → MCP ImageContent 直接内联进 tool result;
- video_paths → MCP 没有视频 content 类型, 由 runtime_server 抽帧拼 grid
  转成 ImageContent 内联 (模型看到的内容形态与旧 pipeline 的"录像回灌"等价)。
"""
from __future__ import annotations
from dataclasses import dataclass, field


@dataclass
class ToolResult:
    text: str
    image_paths: list[str] = field(default_factory=list)
    video_paths: list[str] = field(default_factory=list)
