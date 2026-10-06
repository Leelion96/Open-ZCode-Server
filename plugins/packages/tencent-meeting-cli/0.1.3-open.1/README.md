# Tencent Meeting CLI Plugin

A lightweight Skill wrapper for Tencent's [tencentmeeting-cli](https://github.com/TencentCloud/tencentmeeting-cli). It does not bundle binaries, credentials, or an MCP server.

The executable is **`tmeet`**, installed from npm package **`@tencentcloud/tmeet`**. The plugin name remains `tencent-meeting-cli`.

Use `/tencent-meeting-cli:setup` to check installation and authentication or complete OAuth2 login, then `/tencent-meeting-cli:cli` for meeting, recording, and attendee-report workflows. The skills use task-specific live help: `meeting`, `record`, and `report` are the command groups; JSON output uses `--format json` and is the default.

Setup reuses an existing installation and login. CLI availability, login readiness, and successful business queries are reported separately. Installation changes local software; login opens a browser and stores credentials locally; business commands access Tencent Meeting services. Remote writes and data exports/sharing require authorization for the specific action; existing explicit authorization is respected. Secrets are never requested in chat.
