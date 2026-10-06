---
description: Show Mimosa hook, coverage, and open-finding status for this project. / 查看 Mimosa 当前项目的 Hook、扫描覆盖与未结 finding 状态。
---

这是用户明确请求的本地只读状态查看。**不要**启用 MCP、不要发起任何模型调用、不要运行扫描,也不要读取或展示源码;不要假设本机存在 `mimosa` CLI 或任何写死的可执行文件/安装路径。

Mimosa 的写入前 hook 会把每次结果原子写入**项目相对**目录 `.mimosa/hook-status/`(每个会话一份 JSON),报告则在 `.mimosa/reports/`。只读取当前项目根下这些相对路径的文件(不存在就说明尚无 Mimosa 评估记录),据其字段解释:

- 取最新一条 `.mimosa/hook-status/*.json`(按 `recordedAt`),报告其 `outcome`、`coverage`、`findingCount`、`hostState` 与最近处理的 `file`;
- `coverage` 为 `partial` 时,明确证据不完整,不能声称项目安全;
- 目录为空或无可读记录时,说明当前没有足够的 Mimosa 评估记录,不做安全性断言。

可以展示相对文件、finding 状态、最近 Hook 结果、覆盖与计数;不要寻找或补充源码,不要把静态结果说成运行时已验证。
