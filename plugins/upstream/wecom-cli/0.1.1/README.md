# WeCom CLI Plugin

[中文文档](./README_CN.md)

This plugin is a lightweight Skill wrapper around the official [WeCom CLI](https://github.com/WecomTeam/wecom-cli) (`wecom-cli`). It guides the user through the latest install and QR/manual authorization, then uses the local CLI for messages, docs, sheets, mail, calendar, meetings, contacts, and todos.

Wrapper maintained by Z.ai, version 0.1.1; this is not a vendor-published plugin. Upstream CLI software, documentation, and trademarks remain attributed to their respective owners.

## Quick setup

Run `/wecom-cli:setup` after installation. The Skill guides the user through `npm install -g @wecom/cli@latest`, optional upstream fine-grained Skills, `wecom-cli auth init --noninteractive`, and `wecom-cli auth show --status`. When QR login is unavailable, the user can run `--manual` and enter Bot ID/Secret locally.

Reuse an existing authorization before initializing again. Match the status line exactly: `unauthorized` can also exit 0. `authorized` only confirms local credentials; validate the requested capability with a minimal read-only request. Help and dry-run success do not prove remote access.

## Skills

| Skill | Entry | Purpose |
| --- | --- | --- |
| `setup` | `/wecom-cli:setup` | Check/install the latest `wecom-cli`, initialize authorization, and verify status |
| `cli` | Context-triggered | Use dynamic discovery for messages, docs, sheets, calendar, and other services |

## Safety boundary

- CLI upgrades, global Skill installation, and remote writes require explicit user participation or confirmation.
- QR credentials remain in local encrypted storage; never request Bot Secrets, tokens, or credential files in chat.
- Sending messages/mail, editing docs/sheets, updating contacts, and meeting/todo actions are preceded by service, method, resource, and recipient summaries.

## Upstream documentation

- [WeCom CLI](https://github.com/WecomTeam/wecom-cli)
- [CLI reference](https://github.com/WecomTeam/wecom-cli/blob/main/docs/cli-reference.md)

Open a new ZCode session after enabling or updating the plugin so the Skill catalog is refreshed.
