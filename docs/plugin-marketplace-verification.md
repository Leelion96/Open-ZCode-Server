# 插件市场实现与验收

2026-10-06 创建 Server 侧独立插件市场。客户端仓库只是一次性输入；服务端运行、构建、Docker 镜像均不读取客户端源码。当前发布 21 个插件，原有 Browser Use 和 Node Repl Host 仍在客户端保留。

## 已完成

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
7. **客户端原材料**：已核对服务端 21 份输入快照与客户端最新运行材料的树哈希一致，再移除客户端的临时提取目录、额外内置定义和 inventory 构建依赖。完整清理前备份保存在被忽略的 `artifacts/client-plugin-cleanup-*`，不参与任一项目构建。Browser Use、Node Repl Host、原有工作流技能以及其他会话改动共 56 个受保护文件的哈希保持不变；正常用户资料和已安装插件数据未清理。
8. **原生平台**：当前实际运行验收在 macOS；其他系统需要使用相应 SDK/CLI 并按原生依赖范围验证，不将 macOS 通过当作全平台通过。

后续按用户确认范围回退了客户端临时适配，四个文件完整恢复 HEAD，移除黑名单模块及两项对应测试；额外 SEA 白名单恢复原范围，仅保留构建共用的导出。回退前备份位于被忽略的 `artifacts/client-plugin-rollback-*`，其中也归档了撤销忽略规则后露出的 video2code 运行缓存。62 个其他文件哈希保持不变；CLI 已重新编译并暂存，Server HTTPS 目录仍返回 21 个插件。

用户进一步明确按实际读取方界定范围：桌面与独立 CLI 共用的配置允许同步修改，独立 CLI 专用部分保持原样。共用市场地址和内置声明继续保留；CLI README 已恢复 HEAD。SEA 文件只新增原资产白名单的公开别名供桌面暂存读取，原资源采集代码保持 HEAD；在相同源文件下实际比对了完整 SEA 清单，文件哈希与模式均与 HEAD 一致。7 项回归、类型、Lint 和架构检查再次通过，验收记录位于客户端被忽略的 `.tmp/plugin-shared-scope-verification.json`。

2026-10-07 已将默认市场地址接入既有 Server origin 配置，保留 /api/v1 路径。Agent 同步默认来源变更时仅重建 CDN 分片，保留内置、个人来源、安装和数据；未获取新目录时内置分片不阻止懒加载，旧来源的晚返回结果及失败状态不能覆盖新来源。新增 6 项来源配置回归与原 7 项资源回归共 13 项通过；类型、Lint（0 错误、69 个原有警告）与架构通过。使用客户端现有 .env.local 配置，经可信 CA 实际访问 HTTPS 市场取得 21 个条目，并由原 ZIP 安装器安装 GitLab。机器记录在客户端 .tmp/plugin-source-live-verification.json。

前次审查确认的两项构建边界（bootstrap 提前暂存、失败后留下不完整运行目录）属于独立构建修复，本次地址配置改动未扩展处理；复现记录仍在客户端 .tmp/plugin-staging-review.json。
