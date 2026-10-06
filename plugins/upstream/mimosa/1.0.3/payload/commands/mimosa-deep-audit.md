---
description: Reproducible, sealed Mimosa deep security audit. / 执行可复核的 Mimosa 密封深度安全审计。
argument-hint: "[项目路径 | project path]"
---

按 bundled `$mimosa-security-scan` Skill 的相同契约执行，目标为 `${ARGUMENTS:-.}`；若 Skill 加载失败，明确报告注册故障后停止。

1. 调用 `security_scan_start`，再用 `security_scan_status` 轮询直到 completed；用户要求停止时用 cancel，interrupted/cancelled/failed 需要继续时用 resume 创建全新 attempt（从起点重跑，不是断点续扫）。
2. 返回 scan ID、seal、coverage 与已返回的 finding 摘要；`partial` 时只说明覆盖未完成。

不要调用其他 MCP 工具，不要修改代码或执行目标项目。
