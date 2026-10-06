# ZCode GitHub CLI 工作流插件

[English](./README.md)

本插件将一组聚焦的 GitHub CLI 工作流适配到 ZCode 插件市场，使用本机安装的 [GitHub CLI](https://cli.github.com/)（`gh`）执行 GitHub 操作。

## 安装与认证

- 运行 `/github:setup`，让 Agent 检查 GitHub CLI；如果缺少二进制，会引导安装；如果尚未登录，会引导完成浏览器认证。
- 执行仓库级操作时，当前目录应是带 GitHub remote 的 Git 仓库
- 安装或更新插件后，请新建 ZCode session

所有依赖 GitHub 的 Skill 都会在执行业务流程前检查 `gh` 二进制、认证主机和当前账号。用户完成 `gh auth login` 后，Agent 必须再次现场验证；验证仍失败时停止执行。Agent 不得要求用户在对话中粘贴 Token 或设备码。

插件不会内置 `gh`、自动安装软件、保存凭据，也不会替换本地 Git 状态。启用前请审查每个 Skill。合并 PR、发布公开 Gist、创建 Release、关闭 Issue、删除标签或 Milestone、修改 Secret、触发 Workflow，以及创建或删除 Codespace 前，Agent 必须展示准确目标并获得最终确认。

## Skills

| Skill | ZCode 命令 | 说明 |
|-------|------------|------|
| setup | `/github:setup` | 检查 `gh`、引导浏览器登录并确认当前账号 |
| commit | `/github:commit` | 根据暂存区变更创建 Conventional Commit |
| pr | `/github:pr <create\|list\|checkout\|review\|merge>` | 创建、列出、检出、Review 或合并 Pull Request |
| issue | `/github:issue [create\|view\|list\|close\|label\|milestone]` | 管理 Issue 及其标签、Milestone |
| release | `/github:release` | 创建带变更日志的 GitHub Release |
| workflow-run | `/github:workflow-run` | 列出、触发、观察或查看 Actions 运行 |
| secret | `/github:secret` | 列出、设置或删除仓库 Secret |
| repo | `/github:repo <clone\|browse>` | 克隆/派生仓库，或在浏览器中打开 GitHub 资源 |
| gist | `/github:gist` | 创建、查看、编辑或删除 Gist |
| codespace | `/github:codespace` | 创建和连接 Codespaces |

## 示例

```text
/github:setup
/github:commit 修复登录校验
/github:pr create feature/auth
/github:pr list --reviewer @me
/github:pr review 123 request-changes "请补充新路径的测试"
/github:issue label add 123 bug
/github:workflow-run watch 12345678
/github:repo clone owner/repo feature/new
```

## ZCode 打包

可安装的主清单是 `.zcode-plugin/plugin.json`。市场注册信息维护在仓库根目录 [`marketplace.json`](../../marketplace.json)。

## 上游与许可证

源码提交和适配边界见 [`UPSTREAM.md`](./UPSTREAM.md)。上游仓库没有 `LICENSE` 文件，也没有可检测到的 SPDX 许可证；发布此适配版本前请先与维护者确认授权。
