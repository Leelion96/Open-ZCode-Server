# 阿里云 CLI 插件

[English](./README.md)

本插件是官方 [Alibaba Cloud CLI](https://github.com/aliyun/aliyun-cli)（命令 `aliyun`）的轻量 Skill 封装：只调用用户本机 CLI，不内置 CLI 二进制、MCP 或云端凭证。

封装由 Z.ai 维护，版本 0.1.2；这不是上游厂商发布的插件。上游 CLI、文档和商标仍归对应厂商所有。

## 快速 setup

运行 `/alibaba-cloud-cli:setup`。先验证并复用已有 CLI 和 profile；只在缺少安装或用户要求升级时使用官方最新版。新凭证优先本机 OAuth。使用 `aliyun sts GetCallerIdentity --auto-plugin-install false` 验证身份，无需预装 STS 插件。

云调用保留所选 profile/region，关闭产品插件自动安装；JSON 使用默认输出，不统一追加 `--output json`。基础身份验证与实际产品只读请求分别报告。

## Skills

| Skill | 入口 | 用途 |
| --- | --- | --- |
| `setup` | `/alibaba-cloud-cli:setup` | 检查/安装最新版 `aliyun`，配置 profile 与身份验证 |
| `cli` | 自动按上下文触发 | 用实时 `--help` 选择产品命令，执行查询或经确认的写操作 |

## 安全边界

- 安装/升级 CLI、安装云产品插件、远端写操作都需要用户明确参与或确认。
- 不要求用户在聊天中粘贴 AccessKey、STS Token、OAuth Token；不读取或回显 `~/.aliyun/config.json`。
- 创建、删除、授权、扩缩容、网络变更等操作会先展示账号、profile、地域和资源目标。

## 上游文档

- [安装与升级](https://www.alibabacloud.com/help/en/cli/install-update-alibaba-cloud-cli)
- [凭证配置](https://www.alibabacloud.com/help/en/cli/configure-credentials)
- [快速开始](https://www.alibabacloud.com/help/en/cli/quickly-start-using-alibaba-cloud-cli)

启用或更新插件后请新建 ZCode session，确保 Skill 清单刷新。
