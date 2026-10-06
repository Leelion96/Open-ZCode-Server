---
name: cli
description: Use the Lark CLI for documents, sheets, Base, calendar, messages, and other SaaS operations after setup, with explicit user identity and write confirmation.
---

# 使用Lark CLI

所有飞书操作优先通过本机 `lark-cli` 完成。若本回合没有可信的 setup 结果，先读取并执行 `../setup/SKILL.md` 的检查。

## 命令选择

1. 先确认登录状态和身份：

   ```bash
   lark-cli auth status --json --verify
   ```

2. 用实时帮助发现领域和参数，不凭旧文档猜命令：

   ```bash
   lark-cli --help
   lark-cli <domain> --help
   lark-cli <domain> <command> --help
   ```

3. 默认显式使用用户身份 `--as user`，并保留用户指定的业务域。示例：

   ```bash
   lark-cli calendar +agenda --as user
   lark-cli <domain> <command> --as user
   ```

   需要机器人身份时必须由用户明确指定，并在结果中标明变化。用户指定 profile 时每次保留 `--profile <name>`；否则沿用当前配置。权限不足按当前身份和缺少的 scope 处理，不切换账号，也不以用户登录修复 bot 权限。

## 写操作和数据边界

- 发消息、邀请成员、创建/更新/删除文档或表格、修改权限、创建日程和审批动作都属于远端写操作；执行前展示目标资源、接收人/成员、授权范围和变更摘要并请求确认。
- 资源 URL、token、文档 ID、表格 ID 或用户身份不明确时先询问，不要猜选相似资源。
- 优先使用 CLI 的 JSON/结构化输出；输出只保留完成任务所需字段，避免复制整份文档或通讯录。
- 业务调用以退出码 0 且 `ok == true` 判断成功，不使用顶层 `code == 0`。失败 JSON 通常在 stderr；不要因解析错成功信封而重试写操作。
- 支持 `--dry-run` 时先预览写请求；退出码 10/`confirmation_required` 是高风险确认门禁，取得用户明确确认后才按当前帮助追加确认参数，不自动绕过。
- 文件输入输出使用 cwd 下的相对路径。需要用户授权时按 setup 分步展示链接并交还控制权，不在用户看不到链接时阻塞等待。
- 不要输出 App Secret、OAuth Token、Cookie 或本地配置文件内容。

## 完成报告

说明实际执行的领域/命令、`--as` 身份、读取或写入结果和 scope/权限错误。未获确认的写操作只展示待执行命令，不要代为执行。
