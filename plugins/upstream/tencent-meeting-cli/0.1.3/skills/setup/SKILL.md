---
name: setup
description: Set up Tencent Meeting CLI (tmeet) when installation, OAuth2 login, or authentication checks are needed. Resolve missing executables and verify readiness without exposing credentials.
---

# 设置腾讯会议 CLI

检查 CLI 安装和 OAuth2 登录状态。插件名为 `tencent-meeting-cli`，官方仓库为 `TencentCloud/tencentmeeting-cli`，npm 包为 `@tencentcloud/tmeet`，实际可执行命令为 `tmeet`。

## 工作流

1. 检查 CLI 是否已安装：

   ```bash
   command -v tmeet
   tmeet --version
   tmeet --help
   ```

   若命令缺失，先检查用户现有包管理器的安装记录和 PATH，避免把 PATH 问题误判为未安装。

2. 确实未安装时，读取[官方安装说明](https://github.com/TencentCloud/tencentmeeting-cli#安装)，按用户的包管理约定安装 `@tencentcloud/tmeet`。官方 npm 安装命令为：

   ```bash
   npm install -g @tencentcloud/tmeet@latest
   ```

   已有可用版本时优先复用；安装或升级未经用户授权时，说明来源和本机改动后请求确认。只安装 CLI；本插件已提供 Skill，无需再全局安装上游 Skill。完成后重复步骤 1，确认命令可执行。

3. 检查当前认证状态，已登录且账号符合任务时直接复用：

   ```bash
   tmeet auth --help
   tmeet auth status
   ```

   仅需确认登录状态和账号；不要回显完整凭证信息，不读取或展示凭证文件。

4. 未登录或授权过期时，先运行 `tmeet auth login --help`。用户同意登录后运行 `tmeet auth login`，由用户在本机浏览器完成 OAuth2 授权；无法自动打开浏览器时，按实时帮助使用 `--no-browser`。登录后再次运行 `tmeet auth status` 验证。

   不要索取或输出 client secret、access token、refresh token 或授权码，也不要将其写入命令参数、shell 历史或日志。登录失败或超时后报告原因，等待用户完成所需操作，避免循环登录。

## 成功条件

- “CLI 可用”：版本与帮助命令成功。
- “基础就绪”：CLI 可用且认证状态明确为已登录，账号符合任务。
- 业务权限仍需在 [cli](../cli/SKILL.md) 中通过用户请求范围内的只读查询验证。没有业务请求时停在状态检查，不额外读取会议数据。

认证失败或账号不符时说明阻塞点，停止后续业务操作；命令差异先查当前版本帮助。完成报告只包含版本、脱敏账号状态和实际验证范围。

## 参考

- [腾讯会议 CLI 官方仓库](https://github.com/TencentCloud/tencentmeeting-cli)
- [腾讯会议开放平台](https://meeting.tencent.com/)
