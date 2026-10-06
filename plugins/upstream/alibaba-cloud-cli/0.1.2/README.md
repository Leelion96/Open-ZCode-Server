# Alibaba Cloud CLI Plugin

[中文文档](./README_CN.md)

This plugin is a lightweight Skill wrapper around the official [Alibaba Cloud CLI](https://github.com/aliyun/aliyun-cli) (`aliyun`). It uses the user's local CLI and does not bundle a binary, MCP server, or cloud credentials.

Wrapper maintained by Z.ai, version 0.1.2; this is not a vendor-published plugin. Upstream CLI software, documentation, and trademarks remain attributed to their respective owners.

## Quick setup

Run `/alibaba-cloud-cli:setup`. Existing CLI profiles are verified and reused first; only missing installations or requested upgrades use the latest official release. New credentials use local OAuth where possible. Identity is checked with `aliyun sts GetCallerIdentity --auto-plugin-install false`, without requiring an STS plugin.

Cloud calls retain the selected profile/region and disable automatic plugin installation. Use the default JSON output, not a generic `--output json` suffix. Setup distinguishes identity verification from an actual read-only product query.

## Skills

| Skill | Entry | Purpose |
| --- | --- | --- |
| `setup` | `/alibaba-cloud-cli:setup` | Check/install the latest `aliyun`, configure a profile, and verify identity |
| `cli` | Context-triggered | Discover product commands from live help and gate remote writes |

## Safety boundary

- CLI upgrades, product-plugin installation, and remote writes require explicit user participation or confirmation.
- Never ask for AccessKey, STS, or OAuth tokens in chat; never read or echo `~/.aliyun/config.json`.
- Create/delete, authorization, scaling, and network changes are preceded by an account, profile, region, and target summary.

## Upstream documentation

- [Install and update](https://www.alibabacloud.com/help/en/cli/install-update-alibaba-cloud-cli)
- [Configure credentials](https://www.alibabacloud.com/help/en/cli/configure-credentials)
- [Get started](https://www.alibabacloud.com/help/en/cli/quickly-start-using-alibaba-cloud-cli)

Open a new ZCode session after enabling or updating the plugin so the Skill catalog is refreshed.
