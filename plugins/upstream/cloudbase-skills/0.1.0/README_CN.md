# CloudBase Skills

CloudBase Skills 将上游
[`TencentCloudBase/cloudbase-skills`](https://github.com/TencentCloudBase/cloudbase-skills)
开发知识与 CloudBase MCP 服务包装成一个可直接安装的 ZCode 插件。

## 包含能力

- 覆盖 Web、微信小程序、原生/移动端、数据库、云函数、云托管、云存储、AI 模型、运维排障和架构设计的 CloudBase 开发指导。
- `cloudbase` 技能使用的完整上游参考资料。
- 用于环境管理、部署、数据库操作和诊断的 CloudBase MCP 工具。

插件内置的 skill 内容来自上游 tag `v2026.07.15.1305`，commit
`856a308316e7b8c944cf16c49c193c5beb931f54`。MCP 配置固定使用
`@cloudbase/cloudbase-mcp@2.23.11`，避免 npm 的 `latest` 标签变化后，同一个已发布插件制品表现不一致。

## 使用前提

- `PATH` 中可用 Node.js、`npm` 和 `npx`。
- 首次使用时能访问网络，以便 `npx` 下载固定版本的 MCP 包。
- 拥有腾讯云账号，并具备目标 CloudBase 资源的访问权限。

## 使用方式

在 ZCode 插件管理器中安装并启用 `cloudbase-skills`，然后新建任务。请求与技能描述匹配时，ZCode
可以自动启用 `cloudbase` 技能，也可以在提示词中明确要求使用 CloudBase 技能。

示例提示词：

- `使用 CloudBase 创建一个带登录和文档数据库的 Web 应用。`
- `排查这个微信小程序为什么无法调用 CloudBase 云函数。`
- `把这个 Node.js API 部署到 CloudBase 云托管。`

涉及资源管理的操作需要 CloudBase MCP。MCP 服务支持交互式设备授权；本插件不包含，也不要求硬编码
Secret ID 或 Secret Key。

## 上游与许可证

本插件对 MIT 许可证下的上游项目进行再分发和 ZCode 集成。来源与本地包装变更见
[`UPSTREAM.md`](./UPSTREAM.md)，保留的上游许可证声明见 [`LICENSE`](./LICENSE)。
