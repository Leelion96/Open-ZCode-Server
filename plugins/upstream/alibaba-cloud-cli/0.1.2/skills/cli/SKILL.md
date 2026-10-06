---
name: cli
description: Use the Alibaba Cloud CLI (aliyun) for cloud resource queries and operations after setup; choose product plugins from live help, preserve profile and region context, and gate remote writes.
---

# 使用阿里云 CLI

所有阿里云操作都通过本机 `aliyun` CLI 完成。若本回合没有可信的 setup 结果，先读取并执行 `../setup/SKILL.md` 的检查，不要直接调用 API。

## 命令选择

1. 确认生效身份和上下文：

   ```bash
   aliyun sts GetCallerIdentity --auto-plugin-install false
   ```

2. 从实时帮助和产品目录选择命令：

   ```bash
   aliyun <product> --auto-plugin-install false --help
   aliyun <product> <operation> --auto-plugin-install false --help
   ```

   身份检查及后续命令沿用同一 profile/region；用户指定时每次传入，未指定时不切换当前配置。先尝试内置 API；确需缺失的产品插件时，按 setup 的流程取得确认。帮助和业务命令保留 `--auto-plugin-install false`。

3. 执行查询时显式保留 `--profile` 和 `--region`（如果用户指定），优先使用结构化输出：

   ```bash
   aliyun <product> <operation> --profile <profile> --region <region> --auto-plugin-install false
   ```

   内置 OpenAPI 和已核验的产品插件默认返回 JSON。`--output` 是 `cols=... [rows=...]` 表格参数，不能统一追加 `--output json`。以当前命令帮助为准；帮助、dry-run 或配置有效不代表云端调用成功。

## 写操作和凭证边界

- 创建、更新、删除、扩缩容、授权、密钥轮换和网络变更都属于远端写操作；执行前展示账号/ARN、profile、地域、资源标识和变更摘要，并要求用户确认。
- 若该产品支持 `--dry-run` 或预览命令，先运行预览，再执行正式命令。
- 不要在对话、日志、文件或命令回显中暴露 AccessKey、STS Token、OAuth 刷新令牌或 `~/.aliyun/config.json` 内容。
- 资源标识、地域或账号不明确时先询问，不要从相似名称中猜选目标。
- 输出只保留完成任务所需字段；长列表先分页或限制数量。

## 完成报告

说明实际执行的 CLI 命令类型、profile/地域、读取或写入结果以及失败的上游错误。不要把完整的敏感输出复制回对话；远端写入若未获得确认则只给出待执行命令。
