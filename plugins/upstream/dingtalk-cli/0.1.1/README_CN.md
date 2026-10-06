# 钉钉 Workspace CLI 插件

[English](./README.md)

本插件是官方 [DingTalk Workspace CLI](https://github.com/DingTalk-Real-AI/dingtalk-workspace-cli)（命令 `dws`）的轻量 Skill 封装：支持 CLI 和可选上游 Skills 安装，使用本机 OAuth/设备流认证，不内置二进制、MCP 或凭证。

封装由 Z.ai 维护，版本 0.1.1；这不是上游厂商发布的插件。上游 CLI、文档和商标仍归对应厂商所有。

## 快速 setup

运行 `/dingtalk-cli:setup`。按需安装最新版 `dws`，复用已认证的 profile，或使用 `dws auth login`（无头环境 `--device`）登录，再以 `dws auth status --format json` 和 `dws profile list --format json` 验证。

macOS/Linux 默认使用官方 shell 安装器的 `DWS_NO_SKILLS=1` 模式。npm 安装器及 CLI 升级可能安装或恢复全局上游 Skills，安装前需说明。必须检查 `authenticated: true`，不能仅凭退出码 0 或 `success: true` 判断已登录。

本封装的两个 Skill 不依赖上游 Skills。仅用户单独要求时查看 `dws skill setup --help`，选择实际宿主（含 ZCode）、模式和目录后确认安装。企业管理员可能需要开启 CLI 访问或批准应用权限。

## Skills

| Skill | 入口 | 用途 |
| --- | --- | --- |
| `setup` | `/dingtalk-cli:setup` | 检查/安装最新版 `dws`、完成认证，上游 Skills 可选 |
| `cli` | 自动按上下文触发 | 使用消息、文档、表格、日历、待办等 CLI 能力 |

## 安全边界

- 安装脚本、Skill 目录写入、CLI 升级和远端写操作都需要用户明确参与或确认。
- 多组织/多账号必须按稳定的 `corpId:userId` 选择，不能按同名组织猜选。
- 不要求用户在聊天中粘贴 OAuth Token、App Secret 或 PAT；写操作会先展示组织、账号、资源和接收人。

自建应用 Secret 使用本地凭证库或安全注入的完整环境变量对，不放入命令参数、shell 历史或聊天。

## 上游文档

- [DingTalk Workspace CLI](https://github.com/DingTalk-Real-AI/dingtalk-workspace-cli)
- [安装与 Skill setup](https://github.com/DingTalk-Real-AI/dingtalk-workspace-cli#installation)

启用或更新插件后请新建 ZCode session，确保 Skill 清单刷新。
