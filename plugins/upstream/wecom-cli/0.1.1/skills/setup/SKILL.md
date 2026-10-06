---
name: setup
description: Check and set up the latest WeCom CLI (wecom-cli), guide QR or local credential initialization, install optional official Agent Skills, and verify authorization.
---

# 设置企业微信 CLI

这个 Skill 只负责 CLI 安装、凭证初始化和状态验证，不发送消息、不修改文档或其他企业微信资源。

## 工作流

1. 检查二进制和版本：

   ```bash
   command -v wecom-cli
   wecom-cli --version
   ```

2. 缺失或需要升级时，向用户展示 npm 最新通道；安装/升级必须由用户明确同意：

   ```bash
   npm install -g @wecom/cli@latest
   ```

   用户完成后重新执行 `wecom-cli --version`。不要把某个固定版本写死，也不要静默覆盖现有安装。

3. 若用户需要上游按领域拆分的完整 Agent Skills，可在用户确认后安装；本插件自身的 Skill 不依赖这一步：

   ```bash
   npx skills add WeComTeam/wecom-cli -y -g
   ```

4. 先执行 `wecom-cli auth show --status`。已有 `authorized` 时复用现有授权，跳到步骤 5；仅未授权或用户要求重登时初始化。Agent 非交互环境显式选择扫码：

   ```bash
   wecom-cli auth init --noninteractive
   ```

   等用户扫码完成后再继续验证；无终端二维码显示时，先查 `auth init --help`，可用 `--output-qrcode qr.png` 输出到当前临时目录展示，完成后清理二维码。普通终端可运行不带参数的 `auth init` 交互选择。无扫码条件时，可由用户在本机交互输入：

   ```bash
   wecom-cli auth init --manual
   ```

   Bot ID/Secret 只能在用户自己的终端输入，不能要求用户粘贴到对话、Skill 参数、日志或代码中。基础能力通常在扫码后即可使用；高级机器人能力可能还需要 Bot ID/Secret 和管理员配置。

5. 验证授权：

   ```bash
   wecom-cli auth show --status
   ```

   严格比较输出整行为 `authorized`；`unauthorized` 也可能退出码为 0，且含有 authorized 子串。该状态只证明本地凭据存在，不能证明远端授权或目标业务可用。

   只汇报是否 `authorized`、CLI 版本和可用能力，不复制凭证文件或完整 Bot 信息。

## 成功条件

只有 CLI 可执行、`auth show --status` 返回 `authorized` 且用户需要的服务可通过帮助发现时只能报告“本地授权已配置”。随后根据用户任务，读取目标方法帮助/schema 并执行最小只读请求，远端成功后才能报告该能力已验证；帮助或 dry-run 成功不算业务验收。失败时区分安装、扫码/手动授权、管理员权限和服务 discovery 问题，并停止业务写操作。

## 参考

- [WeCom CLI 官方仓库](https://github.com/WecomTeam/wecom-cli)
- [CLI 命令参考与授权](https://github.com/WecomTeam/wecom-cli/blob/main/docs/cli-reference.md)
