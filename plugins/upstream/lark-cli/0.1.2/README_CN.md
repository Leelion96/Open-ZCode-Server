# Lark CLI 插件

[English](./README.md)

本插件是官方 [Lark CLI](https://github.com/larksuite/cli)（命令 `lark-cli`）的轻量 Skill 封装：使用用户本机 CLI，不内置凭证、MCP 或远程服务。

封装由 Z.ai 维护，版本 0.1.2；这不是上游厂商发布的插件。上游 CLI、文档和商标仍归对应厂商所有。

## 快速 setup

运行 `/lark-cli:setup`。纯 CLI 安装/升级使用 `npm install -g @larksuite/cli@latest`，避开会写入全局 Skills 的完整向导。先复用现有 profile，并用 `lark-cli auth status --json --verify` 检查身份。

仅未配置环境运行 `lark-cli config init --new`。缺少用户授权时按任务所需最小 scope 分步完成：`auth login --no-wait --json` 发起并展示链接，用户回来确认后再用 `--device-code` 完成。创建应用和 OAuth 需要用户参与；检查 scope 并完成一个相关只读请求，不能将身份有效等同于业务权限齐全。

上游 Skills 是可选项，安装前确认具体子集和目录，保留已有策展；纯 CLI 更新继续使用上述 npm 命令，不自动同步全量 Skills。

## Skills

| Skill | 入口 | 用途 |
| --- | --- | --- |
| `setup` | `/lark-cli:setup` | 检查/安装最新版 `lark-cli`，配置应用并登录 |
| `cli` | 自动按上下文触发 | 使用文档、表格、多维表格、日历、消息等 CLI 能力 |

## 安全边界

- 默认显式使用 `--as user`；切换 bot 身份必须由用户指定。
- 发消息、修改文档/表格、权限和日程等写操作会先展示资源、接收人和 scope，并请求确认。
- 不要求用户在聊天中粘贴 App Secret、OAuth Token 或 Cookie，也不回显本地配置。

## 上游文档

- [Lark CLI](https://github.com/larksuite/cli)
- [安装与快速开始](https://github.com/larksuite/cli#installation--quick-start)

启用或更新插件后请新建 ZCode session，确保 Skill 清单刷新。
