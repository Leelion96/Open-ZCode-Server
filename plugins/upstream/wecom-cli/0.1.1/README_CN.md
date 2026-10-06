# 企业微信 CLI 插件

[English](./README.md)

本插件是官方 [WeCom CLI](https://github.com/WecomTeam/wecom-cli)（命令 `wecom-cli`）的轻量 Skill 封装：支持安装最新版、扫码/手动初始化授权，并使用本机 CLI 完成消息、文档、表格、邮件、日历、会议、通讯录和待办操作。

封装由 Z.ai 维护，版本 0.1.1；这不是上游厂商发布的插件。上游 CLI、文档和商标仍归对应厂商所有。

## 快速 setup

安装插件后运行 `/wecom-cli:setup`。Skill 会引导用户运行 `npm install -g @wecom/cli@latest`，按需安装官方细分 Skills，然后执行 `wecom-cli auth init --noninteractive` 扫码并用 `wecom-cli auth show --status` 验证。没有扫码条件时，用户可在自己的终端使用 `--manual` 输入 Bot ID/Secret。

先检查并复用已有授权，避免重复初始化。状态需整行匹配：`unauthorized` 也可能退出码为 0。`authorized` 只说明本地凭据存在；目标能力还需最小只读请求验证，帮助和 dry-run 成功不代表远端可用。

## Skills

| Skill | 入口 | 用途 |
| --- | --- | --- |
| `setup` | `/wecom-cli:setup` | 检查/安装最新版 `wecom-cli`，初始化授权并验证状态 |
| `cli` | 自动按上下文触发 | 通过动态 discovery 使用消息、文档、表格、日历等服务 |

## 安全边界

- 安装/升级 CLI、全局 Skills 写入和远端写操作需要用户明确参与或确认。
- 默认扫码凭证保存在本机加密存储；不要求用户在聊天中粘贴 Bot Secret、Token 或凭证文件。
- 发送消息/邮件、修改文档/表格、更新联系人和会议/待办动作会先展示服务、方法、资源和收件人。

## 上游文档

- [WeCom CLI](https://github.com/WecomTeam/wecom-cli)
- [CLI 命令参考](https://github.com/WecomTeam/wecom-cli/blob/main/docs/cli-reference.md)

启用或更新插件后请新建 ZCode session，确保 Skill 清单刷新。
