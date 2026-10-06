---
name: cli
description: Use WeCom CLI (wecom-cli) for messages, docs, sheets, mail, calendar, meetings, contacts, and todos after setup, with live schema discovery and write confirmation.
---

# 使用企业微信 CLI

所有企业微信操作优先通过本机 `wecom-cli` 完成。若本回合没有可信的 setup 结果，先读取并执行 `../setup/SKILL.md` 的检查。

## 命令选择

1. 先确认授权状态：

   ```bash
   wecom-cli auth show --status
   ```

   输出必须整行等于 `authorized`，不能判断退出码或用子串匹配。此状态只证明本地凭据存在；远端拒绝时报告实际错误，不重复初始化或自动扩权。

2. 服务目录和 schema 是动态 discovery，必须以当前 CLI 帮助为准：

   ```bash
   wecom-cli --help
   wecom-cli <service> --help
   wecom-cli <service> [resource...] <method> --help
   ```

   常见服务包括 `message`、`mail`、`doc`、`sheet`、`smartsheet`、`smartpage`、`calendar`、`meeting`、`todo`、`disk`、`contact` 和 `media`，实际列表以当前输出为准。

3. 查询优先使用结构化参数或 JSON：

   ```bash
   wecom-cli doc search --json '{"keywords":["周报"],"limit":1}'
   ```

   该示例会读取真实文档；按用户实际关键词执行并限制为一条，只汇报摘要。可追加 `--dry-run` 做本地请求预览，但不会可靠校验 `--json` 的必填字段/类型，也不能验证远端授权；执行前需对照方法 schema 检查请求体。

   复杂方法先查看 `--schema`/`--doc`，不要凭旧版本参数猜调用体。

## 写操作和凭证边界

- 发消息、发送邮件、修改文档/表格、更新联系人、创建或取消会议/日程/待办都属于远端写操作；执行前展示组织身份、目标资源、收件人和变更摘要并请求确认。
- 资源 ID、收件人或方法 schema 不明确时先询问；不要从搜索结果中自动选择相似目标。
- 不要输出 `credentials.enc`、Bot Secret、Access Token、keyring 内容或完整请求体中的敏感字段。
- 分页或 NDJSON 输出先限制范围，避免将整份企业数据复制回对话。

## 完成报告

说明实际使用的 service/method、授权状态、结构化输出摘要和失败原因。未获确认的写操作只给出 schema 或待执行命令。
