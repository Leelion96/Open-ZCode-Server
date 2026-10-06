# 架构约定

采用功能模块单体；`AppModule` 只负责组合。`common` 仅容纳环境、错误信封等基础契约，不持有产品状态。`database` 封装唯一 Prisma client。`public-content` 拥有配置、场景和静态 release 快照；`oauth`、`shares`、`feedback`、`releases` 独立保留暂缓接口。`health` 只检查数据库与已加载内容。

功能模块之间通过 Nest Module export 的公开 Provider或 index 访问；不导入内部 Controller/Repository。Controller不能调用 fs、fetch、Prisma。任何新的跨模块边界需先更新此文档和架构检查规则。没有业务需求时不新增基类、全局 Service Locator、事件总线或多层空壳。

Nest 依赖显式构造器注入，Fastify 是唯一 HTTP adapter。schema 定义是 HTTP DTO校验与 OpenAPI的共同来源；框架默认错误由统一 filter 转换成当前兼容信封，但不修改公共成功样本。

配置发布是data中的configs/scenes/builtin公共配置与插件目录JSON -> 启动校验 -> 唯一不可变内存快照 -> HTTP副本。common/content-directory统一声明工作目录下的data路径，命令从项目根目录执行；无overlay、索引、运行manifest或版本/平台分流。PostgreSQL暂不承担公开内容；未来迁移所有者时必须同时更新spec，禁止双写。

自动检查验证模块目录、依赖方向、Controller IO、数据库入口、Express导入、循环依赖和依赖版本。测试分别验证独立样本、真实 Fastify HTTP、数据库事务/迁移与 Compose生命周期；不能将 Nest单元替身当作部署验收。

`documentation` 是启动时的文档适配模块：读取 API清单并补充由 Nest/Zod生成的 OpenAPI，不注册产品路由，也不改变功能状态。通过其公开 index供 App组合层使用。Swagger UI持有浏览器参数与响应临时状态，不引入新的业务状态所有者。

文档与页面使用固定名称 `Open-ZCode-Server`，不加载品牌配置。`common/software-version` 在生成文档时异步读取package版本；数据库schema版本仍由数据库模块独立控制。错误信封由common的纯生成函数统一定义，Controller抛出与文档示例共用它。

## Plugin marketplace

plugin-marketplace owns the immutable public catalog and bounded startup-loaded asset buffers. Controllers only select catalog/assets through the service; request paths never read files or execute plugin code. The source is data/plugins/catalog.json plus independently captured plugins/packages, built offline into plugin-artifacts. Deployment URLs derive from PUBLIC_ORIGIN. Health reads readiness through the public module index. Client installation, configuration, session and runtime state remain client-owned.
