---
name: mimosa-security-scan
description: Run a sealed, reproducible Mimosa deep security scan. / 运行可复核的 Mimosa 密封深度安全扫描。 Use only when the user explicitly requests a deep or full repository security scan.
---

# Mimosa Security Scan

只在用户明确要求深度安全审计时运行。Mimosa 返回密封扫描产物与状态；不要把它塞进日常 Hook。

## 执行工作流

1. 调用 `security_scan_start`，默认 `depth: "deep"`，项目路径使用用户指定范围。它应立即返回 `jobId`，避免大型仓库扫描占满宿主单次工具调用窗口。
   - 若工具不可用，停止并提示用户启用 Mimosa MCP 后重试，不要改用自管模型路径。
2. 使用 `security_scan_status({jobId})` 轮询，单次调用只读当前持久状态，不长时间等待。
   - `running`：稍后继续轮询；不得将尚未完成的任务表述为最终审计结果。
   - 用户要求停止：调用 `security_scan_cancel`，再用 status 确认 `cancelled`。
   - `interrupted`、`cancelled` 或 `failed` 且用户要求继续：调用 `security_scan_resume`；它会让 attempt 加一并安全重跑未封印尝试，不把半成品当 checkpoint；这是重新尝试，不是断点续扫。
   - `completed`：读取返回的 scanId、scanDir、seal、finding 摘要与 dependencySummary（如有）。
3. 交付 scan ID、seal、依赖风险与已返回的 finding 摘要；不要额外调用其他 MCP 工具、修改代码或执行目标项目。

## 结论纪律

- 不自动修改代码，也不执行目标项目。
- 不自动作出“项目完全安全”或“无风险”的结论。

## 交付顺序

最终报告依次给出：

1. 扫描目标、scan ID、seal 状态和产物目录；
2. 依赖风险摘要（如有）；
3. 已返回的 finding 摘要。

需要解释密封产物、历史列表或 compare 语义时，读取 [scan contract](references/scan-contract.md)。
