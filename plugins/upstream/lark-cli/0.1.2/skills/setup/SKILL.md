---
name: setup
description: Check or install the latest Lark CLI, reuse existing profiles or guide first-time app and OAuth setup, and verify identity, scopes, and a minimal read-only call.
---

# 设置Lark CLI

只准备本机 CLI、应用和身份，并做只读验证。已有环境直接复用；不因为再次运行 setup 就创建应用、重新授权或覆盖全局 Skills。

## 1. 检查或安装 CLI

```bash
command -v lark-cli
lark-cli --version
```

缺少 CLI 或用户要求更新时，先查 `npm view @larksuite/cli@latest version`，展示纯 CLI 安装命令并取得用户明确同意：

```bash
npm install -g @larksuite/cli@latest
```

隔离验证可追加 `--prefix <isolated-prefix>`，随后直接调用该目录下的二进制，不修改用户 PATH 或已有安装。安装后重新验证实际版本；失败时停止业务操作。

官方 `npx @larksuite/cli@latest install` 是完整向导，会额外安装全局 Skills，交互环境还会发起应用配置和授权；本插件默认不使用该向导。`lark-cli update` 也可能同步上游 Skills，纯 CLI 更新沿用上述 npm 通道。用户单独要求上游 Skills 时，先确认具体子集和目录，再按上游帮助安装；保留用户既有策展，不全量覆盖。

## 2. 优先复用当前身份

用户指定 `--profile <name>` 时，后续每个命令都保留它；否则沿用当前 profile，不切换应用。

```bash
lark-cli auth status --json --verify
```

只读取 `identity`、`verified`、`identities.user.status`、`userName`、`openId`、`tokenStatus` 等必要字段，不读取或输出 App Secret、OAuth Token、Cookie 或配置文件内容。

- 配置缺失（`not_configured`）：进入第 3 步。
- 用户身份不存在、授权失效：进入第 4 步。
- `identity=user` 且服务端验证成功：进入第 5 步，无需重新登录。
- `needs_refresh` 不等于必须重新授权：允许只读请求使用 CLI 自带正常刷新；请求成功才算业务路径通过。
- 只有 bot 可用不能证明用户登录成功。用户明确要求 bot 时保留 `--as bot`；bot 缺权限应由应用管理员开通，不能用用户 OAuth 修复。
- 网络错误或 scope 不足按具体错误处理，不重建应用或扩大权限碰运气。

## 3. 全新环境：应用配置

确认用户要初始化后，在能持续读取输出的终端启动：

```bash
lark-cli config init --new
```

该命令会阻塞等待浏览器操作并写入本机配置。把授权 URL 原样展示，可用 `lark-cli auth qrcode <url> --output <relative-path.png>` 生成二维码。先让用户看到链接，再等待；工具无法实时透传输出时，让用户在自己的终端运行，不在不可见的阻塞调用中等待。不要猜填 App ID/Secret，也不要对已有可用配置重复运行。完成后回到第 2 步。

## 4. 缺少用户授权：分步 OAuth

先从目标命令帮助/schema 确定最小 scope。没有具体任务且用户同意推荐权限时使用 `--recommend`；也可由用户选定 `--domain <domain>`。Agent 发起授权使用非阻塞流程：

```bash
lark-cli auth login --scope <required-scopes> --no-wait --json
```

将 verification URL 原样展示，并用 `lark-cli auth qrcode` 生成二维码（路径相对 cwd）。结束本轮，让用户完成授权后回来确认；不要展示链接后立刻在同一轮阻塞轮询。用户确认后，用同一次流程的 device code 在本机完成：

```bash
lark-cli auth login --device-code <device-code>
```

不让用户把 Token、Secret 或验证码粘贴到聊天。设备码过期时重新发起相同范围的流程，不复用旧链接。完成后回到第 2 步验证。

## 5. 验证任务范围和最小只读调用

```bash
lark-cli auth check --scope <required-scopes> --json
lark-cli <domain> <command> --help
```

`auth check` 必须带实际 scope；检查缺失范围，不能只看退出码。默认用户操作显式传 `--as user`。例如任务涉及日历时：

```bash
lark-cli calendar +agenda --as user --format json
```

选择与任务相关的最小只读请求，仅报告成功、条数等必要信息。业务调用以退出码 0 且 JSON `ok == true` 为成功；`auth status` 的诊断 JSON 没有同样的信封，按第 2 步字段判断。帮助、dry-run、缓存状态均不能代替真实请求。缺权限时报告 scope 和对应身份，等待授权，不试探其他账号。

## 完成条件

报告实际版本、profile 来源、有效身份、scope 检查和只读结果。没有完成真实请求时，只能报告“基础认证通过，业务未验证”，不能宣称全部就绪。setup 不发送消息、不创建文档、不修改 SaaS 数据。
