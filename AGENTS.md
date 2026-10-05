# Open-ZCode-Server 开发规则

- 先更新 `specs/` 中对应行为规范，再改实现；读取 `docs/architecture.md` 与当前接口清单。
- 固定 TypeScript、NestJS、Fastify、PostgreSQL、Prisma。只使用当前安装版本的 API，禁止 Express/Multer 与跨客户端源码导入。
- Controller 仅处理 HTTP DTO 与调用 Service；Service 持有业务规则；数据库仅通过 Repository / DatabaseService 访问。禁止循环依赖和 `forwardRef` 掩盖循环。
- 对外契约以 Zod schema 为统一来源，DTO/校验/OpenAPI复用它；数据库模型不得直接作为外部响应。
- data中的三份公共JSON是唯一内容来源，直接编辑完整配置。内容与部署 URL/凭据分离。
- 接口浏览页面的行为与设计规则统一维护在 `specs/api-explorer.md`，样式实现位于 `src/documentation/styles.ts`。
- 首版占位 API 返回明确失败，不生成令牌、分享地址、上传凭据或有效更新文件。不注册排除的接口，不运行时代理官方。
- 使用异步 IO；不得在生产请求路径读取文件或跑迁移。不记录 body、query、Authorization、Cookie、数据库 URL或用户数据。
- 代码变更完成后运行 `pnpm typecheck`、`pnpm lint`、`pnpm test`、`pnpm architecture:check`、`pnpm format:check`。数据库/部署相关改动还运行集成或 Compose 验证。
- 必要的故障样本使用副本；不要清理用户现有数据或容器。新增依赖使用精确版本并更新 lockfile。
- Git commit必须由用户明确授权，并限定在用户指定的提交范围；不修改相邻 ZCode 客户端目录。
