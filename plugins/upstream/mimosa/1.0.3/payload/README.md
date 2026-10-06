# Mimosa for ZCode

把 Mimosa 的实时代码安全检测接进 ZCode（及 Cursor / Claude Code 等支持 MCP + hooks 的对话流工具）。

## 分级响应（核心理念：不是所有东西都强制改）

| 场景 | 响应 | 机制 |
|---|---|---|
| AI 准备写入的代码里有**明确高危**（自己拼的 SQL/命令注入…） | **写入前强制阻断 + 让 AI 修** | PreToolUse hook → 默认 `permissionDecision=deny`，问题/修复回灌 agent |
| AI 新代码**"用了"既有的危险代码**（调用别处定义的危险函数 / 跨文件污点） | **只告警，不强改** | hook 附带跨文件告警（非阻断）/ MCP `project` 参数 |
| **既有项目本身**的风险（用户没动的老代码） | **只报告** | SessionStart hook → 开场给"项目风险地图" |
| 单轮任务准备结束 | **复查本轮改动并回灌修复** | UserPromptSubmit 保存基线；Stop hook → 只审查本轮真实 diff 的新增/修改行 |
| agent 用 Bash/heredoc 直接写源码 | **拒绝旁路，要求改用 Write/Edit 进入候选代码扫描** | PreToolUse(Bash) |
| agent 准备提交或推送 | **提交前分级安全门：高危拒绝、中危确认、低危提示** | PreToolUse(Bash) → `--deep` 项目审计 |
| agent 想主动做普通自查 | **静态项目审计，零 GLM token** | `/mimosa-scan` → `mimosa audit <dir>` |
| 发布前或用户明确要求深度审计 | **Mimosa 密封深扫** | `/mimosa-deep-audit` / `$mimosa-security-scan` → MCP 深扫与状态查询 |

MCP 仅用于用户明确发起的密封深扫；日常写入保护与普通审计仍由本地 Hook 和 CLI 完成。

## 组件

| 文件 | 作用 |
|---|---|
| `hooks/prompt-hook.mjs` | UserPromptSubmit：保存源码基线，并对 URL/XML/SQL/凭据需求注入精简的生成前安全约束 |
| `hooks/scan-hook.mjs` | PreToolUse：写入前扫描并拦截高危；PostToolUse：可选跨文件提示 |
| `hooks/session-hook.mjs` | SessionStart：开场注入项目风险地图（快速静态，跳过 semgrep） |
| `hooks/stop-hook.mjs` | Stop：任务收尾时复查本轮真实 diff；默认只为新增、跨会话未报告的确定性 high 触发一次安全修复回合；同时保留结构化证据、状态、不可覆盖历史和 finding ledger |
| `hooks/ledger-client.mjs` | Hook 与 CLI ledger 的窄适配层；只传相对位置、状态和证据哈希，不传 prompt、源码或绝对路径 |
| `hooks/git-gate-hook.mjs` | 阻止 Bash 直接写源码旁路；`git commit/push` 前运行 L3 深度项目审计 |
| `dist/mcp/server.js` | MCP server，仅提供深扫及状态生命周期 |
| `commands/mimosa-scan.md` | `/mimosa-scan` 手动扫描 |
| `commands/mimosa-deep-audit.md` | `/mimosa-deep-audit` 宿主模型深审编排（不依赖 Skill 自动发现） |
| `skills/mimosa-security-scan/` | Skill-aware 宿主使用的同版深审工作流与 sealed scan 合同 |

## 安装

1. 构建并组装（在 Mimosa 仓库根目录）：
   ```bash
   npm install
   npm run build:cli && npm run build:mcp
   node scripts/build-plugin.mjs
   ```
   产物在 `mimosa-zcode/`，已自包含 `dist/cli.js` 与 `dist/mcp/server.js`。

2. 安装进 ZCode：设置 → 插件管理 → 添加本地路径 `…/mimosa-zcode`，启用后重启会话。

3. 前置依赖：
   - `node`（hook 与 MCP server 运行时，需在 PATH 上）
   - `semgrep`（检测层）：可运行 `node ~/.zcode/mimosa-zcode/dist/cli.js semgrep install --accept-license` 将未修改的固定版本 Semgrep CE 安装到 `~/.zcode/mimosa-runtime/`，或继续使用已有的 Semgrep 路径

一键安装只在用户显式触发时联网，不修改系统 Python，不使用 `sudo`。当前固定下载
`semgrep==1.136.0`（LGPL-2.1-only）及其运行依赖；引擎本身保持未修改，Mimosa
不下载或分发 Semgrep 官方规则集，只加载插件内的第一方离线规则。可用
`node ~/.zcode/mimosa-zcode/dist/cli.js semgrep status --json` 查看安装状态。

默认安装不会向每轮编码对话注册 Mimosa MCP 工具。普通项目静态审计可直接用本机 CLI；仅在需要密封深扫时显式启用 MCP。写入前 Hook、Stop 增量复查和 Git 门不受影响。

需要语义深审时可显式切换，命令只改变 ZCode 的 Mimosa MCP 开关，不影响静态 Hook：

```bash
node ~/.zcode/mimosa-zcode/dist/cli.js mcp status
node ~/.zcode/mimosa-zcode/dist/cli.js mcp enable   # 启用后重启 ZCode
node ~/.zcode/mimosa-zcode/dist/cli.js mcp disable  # 深审结束后关闭并重启 ZCode
```

若 `mimosa` CLI 已在 `PATH` 中，上述命令可简写为 `mimosa mcp ...`。
开关会按 ZCode 当前用户配置契约写入 `mcp.servers.mimosa.enable`；旧版 Mimosa
误写的 `enabled` 会在下一次显式切换或重装时迁移，避免界面显示关闭但宿主仍加载 MCP。

## 配置

**userConfig（插件设置）**
- `engine`：深度自查静态引擎。`native`（默认）仅运行 Mimosa Native；`semgrep` 是显式外部模式；`auto`、`builtin` 保持兼容。写入前 Hook 始终 Native-only。

> MCP 不需要额外的模型密钥或模型配置。

**环境变量**
- `MIMOSA_HOOK_BLOCK=graded|ask|deny|warn`：写入前门禁模式。默认 `graded`，当前 blocking 级别的 high 必须 `deny`；`ask` 仅用于显式兼容/演示，允许用户确认后落盘，不是安全默认值。
- `MIMOSA_HOOK_FAILURE_MODE=open|strict`：扫描基础设施异常或覆盖不完整时的处理。默认 `open` 会显示 `INCONCLUSIVE` 并由 Stop 复核；高保障项目用 `strict`，使候选缺失、扫描失败、坏输出或 partial coverage 在写入前直接 `deny`。也可用 `MIMOSA_HOOK_STRICT=1`。
- `MIMOSA_GIT_GATE_FAILURE_MODE=open|strict`：单独控制 commit/push 前项目扫描不完整时是否阻断；未设置时继承 `MIMOSA_HOOK_FAILURE_MODE`。
- `MIMOSA_HOOK_STATUS=quiet|important|all`：ZCode 状态反馈。默认 `important` 只显示风险和不完整；`all` 还显示安全放行及“Hook 已完成，正在等待 ZCode 工具授权/执行”，适合演示和排障。
- `MIMOSA_HOOK_PROJECT=1`：编辑 hook 附带跨文件告警（"用了既有危险代码"提示，非阻断）。
- `MIMOSA_NO_PROMPT_GUARD=1`：关闭生成前安全约束；默认开启，尽量让模型首稿直接采用安全实现，减少 deny 后重试。
- `MIMOSA_SESSION_WELCOME=1`：恢复旧版 SessionStart 项目扫描菜单；默认不注入该长菜单，避免它占用每轮模型上下文。
- `MIMOSA_PROJECT_MAXFILES`：项目图解析文件上限（hook 默认 1500，控延迟）。
- `MIMOSA_NO_TASK_REVIEW=1`：关闭 Stop 时的本轮增量 L2 复查。
- `MIMOSA_TASK_REVIEW_MODE=high|all`：默认 `high`，Stop 仍完整扫描并写兼容的 `.mimosa/reports/task-review-<session>.json`、一次一文件的不可覆盖报告及 `.mimosa/history/` 摘要，但只为新增、未报告的确定性 high 唤醒 agent；`all` 仅用于显式高噪声审计。
- `MIMOSA_HOOK_REVIEW_MAX_ATTEMPTS`：Stop 扫描或报告失败后的最大自动尝试次数，默认 3；耗尽后保留 `failed` 状态、失败历史和原基线，不再无限重跑。
- `MIMOSA_HOOK_REVIEW_LEASE_STALE_MS`：长扫描 processing 租约失效时间，默认 10 分钟；扫描阶段会持续刷新 heartbeat。
- `MIMOSA_NO_GIT_GATE=1`：关闭 `git commit/push` 前的 L3 深度安全门。
- `MIMOSA_GIT_GATE_MODE=graded|ask|deny|warn`：L3 Git 门处理方式。默认 `graded`：high=强制拒绝、medium=询问确认、low/info=只提示；显式 `deny`/`ask` 会统一覆盖 high/medium。
- `MIMOSA_GIT_GATE_GLM=1`：L3 Git 门启用 GLM 语义复核（默认纯静态，避免提交延迟和费用）。

## CLI（hook/MCP 共用底座）

```bash
mimosa scan <file>                 # 单文件：semgrep + (有 Key) GLM 复核
mimosa scan <file> --project <dir> # 附带跨文件告警
mimosa scan <dir>                  # 项目基线审计（哪些文件有风险）
mimosa scan <dir> --no-semgrep     # 快速静态审计（只跨文件，SessionStart 用）

# 推荐的分级入口：默认不调用 GLM
mimosa audit <dir>                  # 静态项目审计
mimosa audit <dir> --deep           # 深度静态：调用图、跨文件、传递依赖
mimosa audit <dir> --deep --with-glm # 明确允许 GLM 做语义复核（发布前/人工触发）

# 项目安全上下文、不可覆盖历史、跨会话 finding ledger 和未证实 finding backlog
mimosa threat-model show --project <dir> --file src/app.ts
mimosa history list --project <dir>
mimosa history show <runId> --project <dir>
mimosa ledger list --project <dir>
mimosa ledger show <findingId> --project <dir>
mimosa ledger checkpoint --project <dir>
mimosa ledger prune --project <dir>          # 默认 dry-run
mimosa ledger prune --project <dir> --apply  # 当前安全拒绝且不删除
mimosa status --project <dir>                # 只读聚合 ledger + Hook + Stop 历史
mimosa status --project <dir> --json --limit 20 # 供宿主状态面板消费
mimosa validate <findingId> --project <dir>  # 内置 allowlist finding 级运行 Oracle
mimosa backlog import --project <dir> --file findings.json --kind findings
mimosa backlog triage --project <dir> --file findings.json --kind findings
```

`mimosa status` 不读取源码或修改状态，并将未结 finding 明细限制在至多 100 条；
空证据是 `not_evaluated`，partial、损坏、history/ledger 失配或仍等待宿主工具
决策是 `inconclusive`。`no_open_findings` 仅表示完整读取的 ledger
当前无未结 finding，不代表全项目无漏洞。ZCode 后续若增加专用安全面板，可直接消费
`mimosa-project-security-status/v1` JSON，而无需读取 Hook 私有目录中的原始文件。

退出码：`0`=完整扫描且无拦截级风险，`2`=命中高危，`1`=运行错误，或在显式 `--fail-on` 门禁下扫描覆盖不完整。`--fail-on none` 保持非门禁审计语义。**跨文件/预测属告警，永不单独进入风险退出码。**

## 行为细节

- **失败语义可分级且不冒充安全**：默认 `open` 遇基础设施错误会放行、显示 `INCONCLUSIVE` 并由 Stop 复核；`strict` 则在写入前阻断未知状态。两种模式都不会把空结果写成安全。
- 源码扫描支持 `.py / .ts / .tsx / .js / .jsx / .go / .java / .php / .rb / .cs / .kt / .kts / .rs`；超大（>2MB）或疑似二进制文件标记"已跳过"而非误报为"干净"。Go/Java/PHP/Ruby/C#/Kotlin/Rust 优先由固定 Semgrep Generic AST 统一 lowering 到 Security IR，失败时退回共享结构化 token 前端；模块覆盖始终诚实保持 `partial`，不据零候选宣称安全。只有已知 source、精确数据流、完整参数角色、`exact/qualified` API 形状且命中 27 个固定 proof profile 的 finding 会进入 deny。C#/Kotlin/Rust 中命令、SQL、SSRF 的 9 个精确 API/参数 profile，以及 Kotlin/Rust 两个既有文件 realpath containment profile 已可自动 deny；C# 词法路径校验、反序列化、PHP `file_get_contents` 二义性、fallback 与其他未验证 profile 仍为 shadow。
- VS Code 项目扫描独立枚举整个工作区，不依赖已打开文档；截断、取消、读取/解析失败会返回 `partial / inconclusive`，保留上一份完整诊断与未完成 GLM 候选，不显示 clean。
- 单文件 `scan --project` 把 direct scan 与 `mimosa-project-context-coverage/v1` 分开报告；项目图不完整时 Hook/MCP/SARIF 都不能把本文件零发现解释成完整跨文件安全。
- SessionStart 用快速静态扫描（跳过慢 semgrep），不卡会话启动。
- PreToolUse 的完整 `Write` 候选会运行 finding 级 Security IR enforce；`Edit` 若能在本轮 UserPromptSubmit 基线中唯一定位 `old_string`，会先合并出完整候选再执行相同门禁。Edit 候选结果会和同一基线复扫做增量归因，存量未触碰 finding 不会因无关 Edit 被重复阻断。基线缺失、不可读或匹配歧义时只扫描工具片段，并显式提示覆盖不完整。
- `MultiEdit` matcher 仅保留宿主兼容入口：当前已验证的 ZCode 工具 schema、安装包与本机日志没有提供其 `toolInput` payload 契约，Mimosa 不猜测 `edits/files` 等字段。收到该事件时，`failureMode=strict` 会在写入前 deny；默认 `open` 会显式返回 `INCONCLUSIVE`，并说明 Stop 也无法保证覆盖未枚举文件。取得真实版本化契约前不宣称逐文件门禁已实现。
- Node `execFile/spawn` 会区分固定程序与用户可控程序、固定 argv 与整段外部 argv、解释器代码参数及 `--` 之前的 option injection；不会把所有参数数组一概误报。
- 每次源码 Hook 都会原子更新 `.mimosa/hook-status/<session>.json`，只保存事件、文件、结果、覆盖、耗时和 `hook_complete_waiting_host_tool_decision` 等元数据，不保存候选源码。ZCode 若提供专用面板可直接消费该状态。
- Stop 不再整文件复查：UserPromptSubmit 会在任务开始时保存基线，Stop 用 `git diff --no-index` 计算当前文件相对基线的新增/修改行，只保留落在这些行上的发现。
- Stop 高危通过 ZCode 支持的 `continue: true + additionalContext` 进入修复回合；同一 UserPrompt 最多自动续写一次。之后即使仍有新增高危，也只显示短提示并保存报告，避免形成模型重试环；用户提交下一条任务后预算才重置。
- 基线、变更候选或扫描器一旦截断/跳过/失败，报告的 `coverage.status` 会变为 `partial`，`run_status` 必须是 `inconclusive`；只向 UI 显示一条短提示，不以 additionalContext 触发额外模型重试，也绝不会把空结果写成“安全”。
- Hook 状态使用每会话短锁和唯一代次基线；Stop 先认领为 `processing`，仅在报告与历史成功落盘后清理。进程崩溃或报告写入失败会恢复同一 review 供下次重试，并发 PostToolUse 不会互相覆盖。
- `.mimosa/hook-state/` 与基线目录固定为 `0700`，状态及源码快照为 `0600`。调试日志只记录事件、长度和短哈希等元数据，不再保存 Hook stdin 或候选源码。
- 高危 diff 的归因点始终是本轮改动行；定义、导入、调用方只作为有界 supporting evidence，并只保存位置与哈希。修复后规则不再命中会记为 `static_verified`，但没有独立运行 Oracle 时绝不会标成 `runtime_verified`。
- Hook 会把不可变批次追加到 `.mimosa/finding-ledger/v1/events/`，跨会话折叠 open、blocked、fixed、reopened 等状态。只有完整 direct 扫描和完整项目上下文共同证明 finding 缺席才会静态闭环；diff 外仍存在、`range_only`、partial 或损坏证据都不能自动关账。历史“已展示”只减少重复唤醒，不会跳过本轮扫描或写入前 deny。
- Ledger checkpoint 保存 finding 当前状态、last conclusive、reopen/reporting、来源元数据、覆盖统计、事件索引、lineage 及 covered batch 哈希；reader 只从校验成功且无分支冲突的 checkpoint 恢复。历史 partial/inconclusive 另行统计，不污染当前读完整性。Prune 目前只做 dry-run 并返回 `applySupported=false / executable=false`；Node 缺少可信目录句柄下的 `unlinkat`，所以 `--apply` 会非零退出且不删除，避免父目录替换 TOCTOU。
- `mimosa validate` 不执行仓库模块或脚本。当前只 allowlist CommonJS `readDoc` 路径穿越契约；严格 AST 切片在临时权限子进程中验证正常读取，以及直接、嵌套、相似目录名前缀和绝对路径逃逸。只有功能通过且所有逃逸输入均被拒绝才进入 `runtime_verified`，异常一律保留为 `INCONCLUSIVE`。
- Stop 的兼容 latest 报告可被下一轮刷新；带 run ID 的报告与 `.mimosa/history/run-<runId>.json` 不可覆盖。`inconclusive` 与 token `unavailable` 会显式保留，不会被写成“安全/0 token”。
