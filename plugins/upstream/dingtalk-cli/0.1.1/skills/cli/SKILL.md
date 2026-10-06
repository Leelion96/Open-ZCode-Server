---
name: cli
description: Use DingTalk Workspace CLI (dws) for enterprise messages, docs, tables, calendar, and tasks after setup, preserving profile context and gating remote writes.
---

# 使用钉钉 Workspace CLI

所有钉钉操作优先通过本机 `dws` CLI 完成。若本回合没有可信的 setup 结果，先读取并执行 `../setup/SKILL.md` 的检查。

## 命令选择

1. 先确认认证和当前 profile：

   ```bash
   dws auth status --format json
   dws profile list --format json
   ```

   读取 `authenticated`，为 false 时转 setup；不能用退出码或 `success` 代替登录状态。多账号先选择稳定 profile，再用 `dws auth status --profile <corpId:userId> --format json` 检查同一账号。

2. 从实时帮助确认产品、方法和参数：

   ```bash
   dws --help
   dws <product> --help
   dws <product> <command> --help
   ```

   常见产品包括 `chat`、`doc`、`aitable`、`calendar`、`todo` 和 `contact`，实际可用项以当前 CLI discovery 为准。

3. 读取优先使用结构化输出；需要切换账号时显式传入稳定的 profile：

   ```bash
   dws --profile <corpId:userId> <product> <command> --format json
   ```

   `dws` 支持的 `--dry-run` 或预览能力应优先用于写操作。

## 写操作和组织边界

- 发消息、创建/更新/删除文档或表格、修改成员/权限、创建日程/待办和机器人操作都属于远端写操作；执行前展示组织、账号、资源标识、接收人和变更摘要并请求确认。
- profile 只按 `corpId:userId` 等稳定选择器确定；同名组织或账号必须让用户消歧。
- 不要在对话、日志或命令回显中输出 OAuth Token、App Secret、PAT 或 Keychain 内容。
- 发现、schema 或权限错误时先读取 `--help` 和错误信息，不能通过猜参数或换组织绕过授权。

## 完成报告

说明实际使用的 profile、产品/命令、输出格式和结果。远端写操作未获确认时只给出预览或待执行命令。
