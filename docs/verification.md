# 首版验证记录

更新日期：2026-10-06（Asia/Shanghai）。版本0.1.0；当前内容为2个场景、15个供应商模板、builtin revision 32，schemaVersion 1。

## 当前自动检查

- 使用Node 24.18.0、pnpm 10.33.2实际执行`pnpm verify`，退出码0：类型、Lint、架构、内容与格式检查通过，4个文件、59项测试全部通过。内容检查确认当前场景数、模板数与revision。
- 构建统一使用`tsconfig.json`；与原配置对比，编译选项和源文件范围一致，`tsconfig.check.json`继续覆盖源码与全部测试文件。
- 实际执行`pnpm test:compose`，退出码0：镜像构建、迁移、健康检查、Swagger、HTTP、三份正式JSON清单、1项真实PostgreSQL事务测试、HTTPS证书与重启检查全部通过。报告位于被Git忽略的`artifacts/compose-verification.json`，临时项目与volume已清理。
- 本轮调整工具、构建配置、文档与测试复制流程，未修改业务实现、正式JSON或数据库模型。正常部署的app/db/tls容器ID保持不变，未执行客户端UI复验、未创建Git提交。

## 已有验收证据

- 2026-10-06正常部署HTTP与使用现有CA验证的HTTPS均返回正式JSON；readiness中的content/database/schema全部通过。当前场景的生产映射保持3条草稿推荐、4条定时任务模板及中英文预填内容一致。
- 2026-10-05使用正常客户端与现有资料完成公共配置、供应商模板和自动化模板首轮联调；当时为8场景、17模板、revision 31。后续内容收敛已有服务端、生产映射与接口验证，尚未完成最新内容的完整客户端UI复验。此前客户端详细报告未见于当前检出，此项仅保留已有历史摘要。
- 本机部署与映射证据位于被Git忽略的`artifacts/scene-pruning-2026-10-06/`、`artifacts/provider-template-pruning-2026-10-06/`；这些产物不是构建或启动依赖。

## 已知限制

- 登录、分享、反馈、更新业务暂缓，15个接口返回501；14个排除接口返回404。不返回令牌、上传凭据、工单或安装包。
- 客户端硬编码业务入口、帮助链接回退、固定供应商分组及Plan导航仍需客户端侧处理。
- 本地HTTPS使用内部CA，生产证书与域名需按实际部署配置；不自动修改宿主机信任库。
- 内容检查覆盖JSON安全与既有结构，未增加builtin深层规则校验。
