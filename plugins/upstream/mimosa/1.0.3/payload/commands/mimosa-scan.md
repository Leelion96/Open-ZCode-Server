---
description: Fast static security audit with Mimosa. / 用 Mimosa 做快速静态安全审计。
argument-hint: "[项目路径 | project path]"
---

这是用户明确请求的**快速静态**安全审计(Mimosa Native 引擎)。

调用 Mimosa MCP 的 `security_scan` 工具:`project` 使用 `${ARGUMENTS:-.}`,`depth` 使用 `"normal"`(不运行项目业务逻辑投研,保持轻量)。它会同步返回扫描摘要与覆盖状态。若该工具不可用,明确提示用户启用 Mimosa MCP 后重试——**不要**改用自管模型路径,也**不要**假设本机存在 `mimosa` CLI 或任何写死的可执行文件/路径。

对返回摘要里的每个安全问题:
- **高危**:必须修复——按建议改正,改完再次调用 `security_scan` 确认通过。
- **中/低危**:评估后决定是否修复,并简要说明理由。

最后用一句话总结:扫了哪个范围、发现几个问题、修了哪些。若需要权限、业务流程或跨服务信任关系分析,提示用户可运行 `/mimosa-deep-audit`(密封深度审计);写入前 hook、Stop 增量复查与 Git 门仍会继续工作。不要调用其他 MCP 工具、修改代码或执行目标项目。
