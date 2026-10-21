# 插件市场实现与验收

## 2026-10-21 配套 v3.16.2 客户端合并

- 沿用 `pnpm plugins:sync` 下载官方目录；源 SHA-256 为 `5a428f3770b7293cecc39a083606e734261b3813d20138ec0a7c863a445e607a`。47 个条目中过滤 14 个付费项，发布 33 个（20 个 official、13 个 community）；其余字段、顺序、包 URL、图片及签名元数据原样保留。
- 新增 zcode-context、jupyter-notebook、typst-workbench、zotero、unreal-engine、anet；12 个已有插件条目更新。CDN 独立发布，本记录不把全部目录变化归因于 v3.16.2 源码提交。
- HTTP/离线加载断言同步到 33 条，覆盖新增插件及 community / UI 字段；`app_version=3.16.2` 与无版本、旧版本和未知版本继续返回同一配置。未变更生产 API、数据库、模型目录 revision 35、工作流 alwaysOn 或部署配置。
- 同步后先确认旧 27 条断言在真实 Fastify HTTP / 离线加载两处失败，再更新对应快照预期；`pnpm verify` 通过：typecheck、lint、架构（52 个生产源码文件）、内容、8 文件 / 78 项测试及全仓格式。`pnpm plugins:check` 通过。
- 本次未执行 Compose 发布、数据库迁移或生产 TLS/手机联调，未下载或保存插件包、未修改正常用户资料；服务重启或重建后才会加载新目录。按用户明确授权在 `main` 创建中文提交，不推送。

## 2026-10-15 官方目录同步

- 当前同步输入：官方 `marketplace.json`。41 个条目中排除 14 个 `requiresPaidPlan === true` 条目，Server 清单现为 27 个。
- 上游 marketplace 对象及插件字段保持原样，仅移除付费项；ZIP 和图片 URL 仍指向官方 CDN。Browser Use 与 Node Repl Host 继续只由客户端提供。
- `pnpm plugins:sync` 只下载官方目录 JSON 并直接更新 `data/plugins/catalog.json`；不下载、保存、编辑或重新打包插件 ZIP。
- 取消了之前的插件重发方案，避免作者、版本、技能正文、签名和来源结构与上游分叉。
- 按用户要求删除了此前保存的插件包、图标、抽取副本、市场安装缓存和对应签名工件；只保留 Server 的官方过滤目录。
- 本次验证：Server 市场列表为 27 条且没有 `requiresPaidPlan: true`；ZIP/图片均为 `cdn-zcode.z.ai` 官方地址。`pnpm typecheck`、`pnpm lint`、`pnpm architecture:check`、`pnpm format:check`、`pnpm plugins:check`、`pnpm content:check` 以及 Compose 配置校验通过。Vitest 未运行。

## 旧版本地托管实现记录（2026-10-06，已由上游目录镜像方案替代）

2026-10-06 曾创建 Server 侧独立插件市场，发布 21 个本地适配的插件包。2026-10-15 按用户要求移除本地插件包和图标素材，改为只保留过滤后的官方 marketplace JSON；以下内容仅作历史记录。

### 当时的实现与验收

- 发布目录：`GET /api/v1/plugins/marketplace.json`，裸市场 JSON，原技术 ID、分类与排序保持。
- ZIP 与图片：`GET/HEAD /assets/plugins/{name}/{version}/{digest}/{file}`，同域 HTTPS、真实 SHA-256、ETag 与 immutable 缓存。
- 作者字段统一 Open-ZCode；89 个技能入口及其 Markdown 引用完成品牌正文清理，中文需要主体时使用“应用”，英文使用 the app。
- `plugins/upstream` 保存输入原件，`plugins/packages` 保存发行副本，`plugins/sources.json` 记录来源、改动、技术例外和签名公钥摘要。
- Mimosa 改动后使用本发行者 Ed25519 密钥重新签名；完整性检查保持。私钥只在被忽略的本地 artifacts 中，不进入 Git 或 Docker。
- 本发行内容采用 `sourceVersion-open.1`，区分于原件；相同版本内容变化会在构建中被拒绝。
- 工件在启动时校验并加载到内存，当前约 8.8 MB、总上限 128 MiB。生产请求路径不读磁盘，不访问上游、不执行插件。
- 客户端默认市场链接由现有 ZCODE_BASE_URL 地址解析器与固定 API 路径组合，不再固定本机域名或端口；新增插件资源与额外内置定义已撤出客户端，基础两个插件源码保持原样。
- 客户端临时内置 MCP 适配、具名黑名单和新增资产白名单已回退；发行范围由 Server 决定，客户端继续复用通用市场安装流程。

## 实际执行的证据

| 验证                                            | 结果                                                              |
| ----------------------------------------------- | ----------------------------------------------------------------- |
| Server typecheck / lint / architecture / format | 全部通过                                                          |
| Server 单元及真实 Fastify HTTP 测试             | 68 通过                                                           |
| 内容检查                                        | 21 个 ZIP 哈希、作者、89 个技能正文和 Mimosa 签名通过             |
| 正常 Docker 部署                                | app 重建及 readiness 通过，既有数据库/TLS volume 保留             |
| Compose 验收                                    | 构建、HTTP、Swagger、真实 PostgreSQL、HTTPS、自签 CA、重启通过    |
| 正常部署 HTTPS                                  | 市场 21 条，所有展示作者 Open-ZCode，健康检查全部 true            |
| 客户端实际 ZIP 安装器                           | 经 HTTPS 真实下载并安装全部 21 个工件                             |
| 下载后 MCP initialize / tools/list              | Android 23、iOS 20、Mimosa 5、video2code 4 个工具                 |
| 接口网页                                        | 浏览器真实 Execute 返回 HTTP 200、当前目录及下载地址              |
| 客户端 typecheck / lint                         | 类型通过；Lint 0 错误、69 个原有警告                              |
| 客户端资源清理回归                              | 精简后 7 项通过；Desktop / SEA 仅两个基础插件，原有工作流技能保留 |
| 客户端清理后的实际构建                          | Bootstrap、CLI 与桌面暂存通过，CLI 实际重编译并核对暂存字节       |
| 客户端撤出后独立服务验证                        | Server 独立构建 21 包，现有可信 HTTPS 仍返回 21 个插件            |

详细机器记录位于被忽略的 `artifacts/plugin-*.json` 与 `artifacts/plugin-*.log`。这些结果不代表已运行每个第三方账号的业务操作，也不代表 Windows/Linux 全平台端到端验证。

## 已处理的问题与保留事项

1. **技术字符串不是展示品牌**：`.zcode-plugin`、`ZCODE_PLUGIN_ROOT`、`::zcode-file-citation`、稳定市场/插件 ID、必要 CLI 命令保持兼容，逐文件例外写入 sources.json。原产品资料目录文档调整为当前 `.open-zcode`；配置指南可见技能名去除品牌前缀。
2. **作者与版权分开**：展示/清单作者为 Open-ZCode，原许可证和版权声明仍完整保留。办公四个包明确限制商业用途；GitHub 与核算报告材料仍存在上游许可/来源不完整的记录，不能把新的展示作者当作取得授权。
3. **签名材料**：Mimosa 包内技能/元数据修改会使原签名失效，已重新签名并真实验证运行；其加密运行载荷未解密或修改。后续修改该包需保存本地签名密钥并升版本。
4. **本机 HTTPS**：当前地址为 `https://localhost:8443`，使用现有 Caddy CA；跨机器使用需设置正式 PUBLIC_ORIGIN、域名及可信 HTTPS，不能把 localhost 当公开域名，也不应关闭 TLS 验证。
5. **外部依赖**：第三方 CLI/账号、Python 依赖、FFmpeg、Android SDK 和 Xcode 仍是各自运行环境要求，Server 不代持凭据或实现这些平台业务。本机 video2code 的既有 Python 环境已用于验证。
6. **资源规模**：首版启动内存工件约 8.8 MB。若超过 128 MiB，构建部署应明确改为独立静态工件服务；当前不做无界内存读取。
7. **客户端原材料**：已核对服务端 21 份输入快照与客户端最新运行材料的树哈希一致，再移除客户端的临时提取目录、额外内置定义和 inventory 构建依赖。清理备份当时位于被忽略的 `artifacts/client-plugin-cleanup-*`，现已按用户要求删除其中保存的插件材料。Browser Use、Node Repl Host、原有工作流技能以及其他会话改动共 56 个受保护文件的哈希保持不变；正常用户资料和已安装插件数据未清理。
8. **原生平台**：当前实际运行验收在 macOS；其他系统需要使用相应 SDK/CLI 并按原生依赖范围验证，不将 macOS 通过当作全平台通过。

后续按用户确认范围回退了客户端临时适配，四个文件完整恢复 HEAD，移除黑名单模块及两项对应测试；额外 SEA 白名单恢复原范围，仅保留构建共用的导出。回退备份中的 video2code runtime cache 已按用户后续要求删除。62 个其他文件哈希保持不变；CLI 已重新编译并暂存，Server HTTPS 目录仍返回 21 个插件。

用户进一步明确按实际读取方界定范围：桌面与独立 CLI 共用的配置允许同步修改，独立 CLI 专用部分保持原样。共用市场地址和内置声明继续保留；CLI README 已恢复 HEAD。SEA 文件只新增原资产白名单的公开别名供桌面暂存读取，原资源采集代码保持 HEAD；在相同源文件下实际比对了完整 SEA 清单，文件哈希与模式均与 HEAD 一致。7 项回归、类型、Lint 和架构检查再次通过，验收记录位于客户端被忽略的 `.tmp/plugin-shared-scope-verification.json`。

2026-10-07 已将默认市场地址接入既有 Server origin 配置，保留 /api/v1 路径。Agent 同步默认来源变更时仅重建 CDN 分片，保留内置、个人来源、安装和数据；未获取新目录时内置分片不阻止懒加载，旧来源的晚返回结果及失败状态不能覆盖新来源。新增 6 项来源配置回归与原 7 项资源回归共 13 项通过；类型、Lint（0 错误、69 个原有警告）与架构通过。使用客户端现有 .env.local 配置，经可信 CA 实际访问 HTTPS 市场取得 21 个条目，并由原 ZIP 安装器安装 GitLab。机器记录在客户端 .tmp/plugin-source-live-verification.json。

前次审查确认的两项构建边界（bootstrap 提前暂存、失败后留下不完整运行目录）属于独立构建修复，本次地址配置改动未扩展处理；复现记录仍在客户端 .tmp/plugin-staging-review.json。
