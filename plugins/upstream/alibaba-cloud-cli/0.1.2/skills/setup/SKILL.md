---
name: setup
description: Check or install the latest Alibaba Cloud CLI, reuse or configure a local profile, and verify caller identity before cloud operations.
---

# 设置阿里云 CLI

只做本机依赖准备和只读验证。已有环境先复用；全新环境才安装、配置。插件安装、CLI 可执行、账号授权和业务权限是不同的验证层次。

## 1. 检查或安装 CLI

```bash
command -v aliyun
aliyun version
```

缺少 CLI 时进入安装步骤；已有可用 CLI 时先验证身份，不因再次运行 setup 而覆盖配置。需要安装或用户要求升级时，查[官方最新稳定版](https://github.com/aliyun/aliyun-cli/releases/latest)，展示命令并取得用户明确同意：

- macOS/Homebrew：`brew install aliyun-cli`；已有 Homebrew 安装用 `brew upgrade aliyun-cli`。
- 其他平台或隔离测试：从官方 Release 下载匹配 OS/架构的最新版压缩包，解压到用户选定目录，使用该二进制的完整路径验证，不覆盖已有安装。
- 安装失败时停止业务调用；成功后重新记录实际版本，不在 Skill 中固定安装旧版本。

## 2. 复用并验证身份

用户指定 profile 时，后续每个命令保留 `--profile <profile>`；否则沿用 CLI 当前配置，不擅自选择其他账号或切换默认 profile。用户指定 region 或配置路径时同样保留 `--region <region>`、`--config-path <file>`。

```bash
aliyun sts GetCallerIdentity --auto-plugin-install false --help
aliyun sts GetCallerIdentity --auto-plugin-install false
```

`GetCallerIdentity` 是内置 OpenAPI 的大小写形式，不要求先安装 STS 插件；产品插件的 kebab-case 子命令不一定能在空环境使用。帮助、身份检查和业务调用都保留 `--auto-plugin-install false`，防止检查触发自动下载。

成功以退出码 0 且响应中有 `AccountId`、`Arn` 为准，只报告必要身份字段。不要运行会回显凭证摘要的配置查询、读取配置文件，或输出 AccessKey、OAuth/STS Token。网络或权限错误不能当成未登录；报告具体错误，不切换账号绕过。

## 3. 仅在缺少凭证或用户要求重配时配置

确认目标 profile 后，桌面优先在用户自己的终端/浏览器完成 OAuth：

```bash
aliyun configure --mode OAuth --profile <profile>
```

该命令写入所选 profile；同名配置已存在时先确认覆盖。授权 URL 原样转交用户；工具无法实时展示输出时，让用户在自己的终端运行，不在不可见的阻塞调用中等待。无浏览器环境先检查当前版本支持的 CloudSSO/OIDC/角色认证；只有用户明确选择时才改用本机交互式 AK/临时凭证配置。Secret 只能由用户在自己的终端安全输入，不放进聊天、命令参数、日志或仓库。

完成后回到第 2 步，用同一 profile 重新验证，不凭用户一句“登录好了”报告成功。

## 4. 按需检查产品能力

```bash
aliyun <product> --auto-plugin-install false --help
aliyun <product> <operation> --auto-plugin-install false --help
```

能使用内置 API 时无需安装产品插件。确需缺失的产品插件时，用 `aliyun plugin list-remote` 查找完整包名，告知会下载并执行上游代码、写入 CLI 插件目录，取得确认后执行：

```bash
aliyun plugin install --names <package-name>
```

插件提示最低 CLI 版本时先解决版本兼容性；不要一次安装所有产品。重新查看帮助，以当前命令参数和默认输出为准。

## 完成条件

- 二进制可执行 + STS 身份检查成功：基础 setup 就绪。
- 目标产品的最小只读查询也成功：该产品的 CLI 路径已验证。
- 只有帮助成功：仅证明命令发现，不能声称 API 权限或业务调用已验证。

报告版本、身份结果、profile/region 来源，以及目标产品是否验证。保留未登录、权限不足、网络不可达等阻塞项；setup 不创建、修改或删除云资源。

## 参考

- [CLI 安装/升级](https://www.alibabacloud.com/help/en/cli/install-update-alibaba-cloud-cli)
- [CLI 凭证配置](https://www.alibabacloud.com/help/en/cli/configure-credentials)
