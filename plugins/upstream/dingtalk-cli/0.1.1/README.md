# DingTalk Workspace CLI Plugin

[中文文档](./README_CN.md)

This plugin is a lightweight Skill wrapper around the official [DingTalk Workspace CLI](https://github.com/DingTalk-Real-AI/dingtalk-workspace-cli) (`dws`). It guides CLI installation and optional upstream Skills, uses local OAuth/device-flow authentication, and does not bundle a binary, MCP server, or credentials.

Wrapper maintained by Z.ai, version 0.1.1; this is not a vendor-published plugin. Upstream CLI software, documentation, and trademarks remain attributed to their respective owners.

## Quick setup

Run `/dingtalk-cli:setup`. Install the latest `dws` if needed, reuse an authenticated profile or log in with `dws auth login` (`--device` headlessly), then verify `dws auth status --format json` and `dws profile list --format json`.

On macOS/Linux, prefer the official shell installer with `DWS_NO_SKILLS=1`. The npm installer and CLI upgrades may install or restore global upstream Skills; disclose this before installation. Check `authenticated: true`, not just exit code 0 or `success: true`.

The wrapper's two Skills work without upstream Skills. If separately requested, inspect `dws skill setup --help` and choose the actual host (including ZCode), mode, and destination before confirming installation. Administrators may need to enable CLI access or approve app permissions.

## Skills

| Skill | Entry | Purpose |
| --- | --- | --- |
| `setup` | `/dingtalk-cli:setup` | Check/install the latest `dws`, authenticate; upstream Skills are optional |
| `cli` | Context-triggered | Use CLI capabilities for messages, docs, tables, calendar, and tasks |

## Safety boundary

- Install scripts, Skill-directory writes, CLI upgrades, and remote writes require explicit user participation or confirmation.
- Select multiple organizations/accounts by stable `corpId:userId` selectors; never guess from duplicate names.
- Never request or echo OAuth tokens, App Secrets, or PATs; summarize organization, account, resource, and recipients before writes.

Custom-app secrets use the local credential store or a securely supplied complete environment pair, never command-line arguments, shell history, or chat.

## Upstream documentation

- [DingTalk Workspace CLI](https://github.com/DingTalk-Real-AI/dingtalk-workspace-cli)
- [Installation and Skill setup](https://github.com/DingTalk-Real-AI/dingtalk-workspace-cli#installation)

Open a new ZCode session after enabling or updating the plugin so the Skill catalog is refreshed.
