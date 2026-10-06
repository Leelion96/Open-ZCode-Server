---
name: cli
description: Use Tencent Meeting CLI (tmeet) to query or manage meetings, recordings, and attendee reports. Discover task-specific commands from live help after checking authentication.
---

# 使用腾讯会议 CLI

通过本机 `tmeet` 执行腾讯会议操作。若本回合尚未确认 CLI 和登录状态，先读取 [setup](../setup/SKILL.md) 完成检查；已有成功结果时复用，避免重复安装或登录。

## 命令选择

先读顶层帮助，再按任务选择命令组，最后读取具体子命令的 `--help`，确认必填参数、时间格式和分页方式：

```bash
tmeet --help
```

| 任务 | 按需读取 |
| --- | --- |
| 会议查询、创建、修改、取消 | `tmeet meeting --help` |
| 录制、转写、智能纪要 | `tmeet record --help` |
| 参会报告 | `tmeet report --help` |

例如查询会议时先运行 `tmeet meeting list --help`。该命令列出进行中或即将开始的会议；历史会议从实时帮助中的 `list-ended` 或 `search` 入口选择。其他能力从顶层帮助发现，未出现的命令不要直接执行。

当前 CLI 默认输出 JSON，显式指定时使用 `--format json`；可读格式为 `--format json-pretty`。命令组和参数以本机帮助为准；若示例不受支持，退回父级帮助确认版本差异后再继续。

查询前从用户请求确定账号、资源和时间范围（含时区）；只追问缺失且影响结果的信息。需要完整列表时按子命令帮助和响应中的分页游标取全；只查询一页时说明覆盖范围。

## 读写边界

- 范围明确的只读查询可直接执行。
- 创建、修改、取消会议，变更录制权限及导出/分享数据前，展示账号、资源标识、时间和变更摘要；用户尚未明确授权该具体操作时请求确认。已有明确授权时继续执行，目标或范围变化时重新确认。
- 不输出 client secret、access token、refresh token 或完整参会者敏感信息；报告只保留完成任务所需字段。
- 发现权限或参数错误时先读取实时 `--help` 和错误信息，不通过猜参数或更换账号绕过授权。

## 完成报告

说明实际 CLI 版本、账号状态、执行结果和查询覆盖范围。业务成功必须依据实际响应；帮助可用或登录成功不等于业务操作成功。未获授权的写操作只提供预览。
