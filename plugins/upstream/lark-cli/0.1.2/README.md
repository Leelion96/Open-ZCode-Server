# Lark CLI Plugin

[中文文档](./README_CN.md)

This plugin is a lightweight Skill wrapper around the official [Lark CLI](https://github.com/larksuite/cli) (`lark-cli`). It uses the user's local CLI and does not bundle credentials, an MCP server, or a remote service.

Wrapper maintained by Z.ai, version 0.1.2; this is not a vendor-published plugin. Upstream CLI software, documentation, and trademarks remain attributed to their respective owners.

## Quick setup

Run `/lark-cli:setup`. Install or upgrade only the CLI with `npm install -g @larksuite/cli@latest`; this avoids the full installation wizard and its global Skills changes. Reuse existing profiles and check `lark-cli auth status --json --verify` before configuring anything.

Only an unconfigured environment needs `lark-cli config init --new`. Missing user authorization uses the task's minimum scopes and a split device flow: `auth login --no-wait --json`, show the URL, then complete with `--device-code` after the user returns. OAuth and app creation require user participation. Verify required scopes and one task-relevant read-only call; a valid identity alone does not establish business permissions.

Upstream Skills are optional. Confirm the desired subset and target directory before installation, preserving the user's existing curated set. CLI-only updates use the npm command above rather than a CLI-and-Skills updater.

## Skills

| Skill | Entry | Purpose |
| --- | --- | --- |
| `setup` | `/lark-cli:setup` | Check/install the latest `lark-cli`, configure the app, and complete OAuth |
| `cli` | Context-triggered | Use CLI capabilities for docs, sheets, Base, calendar, and messaging |

## Safety boundary

- Use `--as user` explicitly by default; switching to a bot identity requires an explicit user request.
- Sending messages, editing docs/sheets, changing permissions, and scheduling events require a target and scope summary plus confirmation.
- Never request or echo App Secrets, OAuth tokens, cookies, or local configuration.

## Upstream documentation

- [Lark CLI](https://github.com/larksuite/cli)
- [Installation and quick start](https://github.com/larksuite/cli#installation--quick-start)

Open a new ZCode session after enabling or updating the plugin so the Skill catalog is refreshed.
