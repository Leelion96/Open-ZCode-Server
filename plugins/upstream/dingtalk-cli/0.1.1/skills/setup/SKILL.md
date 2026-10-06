---
name: setup
description: Check or install the latest DingTalk Workspace CLI (dws), reuse or authenticate an organization profile, and optionally install upstream Skills for the user's agent host.
---

# 设置钉钉 Workspace CLI

这个 Skill 只负责 CLI、认证准备及用户单独要求的上游 Skills，不发送消息、不修改表格/文档或其他钉钉资源。

## 工作流

1. 检查当前 CLI：

   ```bash
   command -v dws
   dws version
   ```

   如果缺失，先向用户展示最新版安装方式；不要静默执行下载脚本：

   macOS/Linux 优先使用官方安装脚本的仅 CLI 模式，先下载到临时文件并审阅；获得安装授权后执行：

   ```bash
   curl -fsSL https://raw.githubusercontent.com/DingTalk-Real-AI/dingtalk-workspace-cli/main/scripts/install.sh -o /tmp/dws-install.sh
   DWS_NO_SKILLS=1 sh /tmp/dws-install.sh
   ```

   安装后按安装器提示把二进制目录加入 PATH，再运行 `command -v dws` 和 `dws version`。隔离验证可另设 `DWS_INSTALL_DIR` 指向临时目录。

   npm 备选 `npm install -g dingtalk-workspace-cli@latest` 的 postinstall 会安装/更新全局上游 Skills，不能把它当作仅 CLI 安装；仅在用户同时授权这项副作用时使用。`DWS_NO_SKILLS` 是 shell 安装器开关，不承诺对 npm 生效。单独 `--ignore-scripts` 会缺少解包后的二进制，不能报告安装完成。

   Windows 按[官方安装说明](https://github.com/DingTalk-Real-AI/dingtalk-workspace-cli#installation)核对当前 PowerShell 参数和 Skill 写入行为；中国大陆网络问题按官方 README 的镜像方式处理。升级先运行 `dws upgrade --check`；实际升级也可能重装上游 Skills，先说明影响并取得授权。

2. 本插件的两个 Skill 已足够调用 CLI。只有用户单独要求上游 Skills 时才安装；先查看帮助，选择实际使用的 Agent（ZCode 或 Claude Code）和目标目录，不固定选择 Claude Code：

   ```bash
   dws skill setup --help
   ```

   按当前帮助确认 `--target`（ZCode 对应 `zcode`）及 `--mode` 后再执行。该可选步骤会写入全局 Skills 或 Agent 兼容目录，先预览路径并确认，保留用户已选的子集；跳过不影响 CLI 就绪。

3. 先检查 `dws auth status --format json`，已有有效 profile 时直接复用。只有缺少认证或用户要求重登时，才在本机完成 OAuth 登录：

   ```bash
   dws auth login
   ```

   SSH、容器或无浏览器环境使用设备流：

   ```bash
   dws auth login --device
   ```

   组织可能要求管理员开启 CLI 访问或批准应用权限；遇到申请提示时停止并联系管理员。自建应用优先复用已保存在系统凭证库中的完整配置；确需新凭证时，让用户通过安全的本地输入/凭证管理器提供完整 `DWS_CLIENT_ID`、`DWS_CLIENT_SECRET` 环境变量对，再运行不带密钥参数的登录命令。不要把 Secret 放进 argv、shell 历史或聊天，也不输出环境变量值。

4. 验证认证和当前身份：

   ```bash
   dws auth status --format json
   dws profile list --format json
   ```

   必须读取 JSON 的 `authenticated` 字段；退出码 0 或 `success: true` 仅说明状态命令执行成功，`authenticated: false` 仍是未登录。`profiles` 必须非空，并验证选中 profile 的认证状态。状态检查可能自动刷新过期 token。

   多组织/多账号时要求用户选择明确的 `corpId:userId`，不要按名称猜选。

## 成功条件

只有 CLI 版本可用、`dws auth status --format json` 返回 `authenticated: true` 且至少有一个匹配的有效 profile 时才能报告“基础就绪”。上游 Skills 是可选项，不作为就绪条件；真实业务调用是否验证需另行说明。失败时说明 CLI 安装、组织授权、设备登录或 profile 阻塞项，并停止业务写操作。

## 参考

- [DingTalk Workspace CLI 官方仓库](https://github.com/DingTalk-Real-AI/dingtalk-workspace-cli)
- [官方安装与 Skill setup](https://github.com/DingTalk-Real-AI/dingtalk-workspace-cli#installation)
