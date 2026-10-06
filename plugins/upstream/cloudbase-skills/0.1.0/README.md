# CloudBase Skills

CloudBase Skills brings the upstream
[`TencentCloudBase/cloudbase-skills`](https://github.com/TencentCloudBase/cloudbase-skills)
guidance and the CloudBase MCP server into ZCode as one installable plugin.

## Included capabilities

- CloudBase development guidance for Web, WeChat Mini Program, native/mobile, databases, cloud
  functions, CloudRun, cloud storage, AI models, operations, and architecture design.
- The complete upstream reference library used by the `cloudbase` skill.
- CloudBase MCP tools for environment management, deployment, database operations, and diagnostics.

The vendored skill content comes from upstream tag `v2026.07.15.1305`, commit
`856a308316e7b8c944cf16c49c193c5beb931f54`. The bundled MCP configuration pins
`@cloudbase/cloudbase-mcp` to `2.23.11` so a published plugin artifact does not change behavior when
the npm `latest` tag moves.

## Requirements

- Node.js with `npm` and `npx` available on `PATH`.
- Network access on first use so `npx` can download the pinned MCP package.
- A Tencent Cloud account with access to the CloudBase resources you want to manage.

## Usage

Install and enable `cloudbase-skills` from the ZCode plugin manager, then start a new task. ZCode can
activate the `cloudbase` skill when a request matches its description. You can also explicitly ask
ZCode to use the CloudBase skill.

Example prompts:

- `Use CloudBase to build a Web app with sign-in and a document database.`
- `Diagnose why this WeChat Mini Program cannot call its CloudBase function.`
- `Deploy this Node.js API to CloudBase CloudRun.`

The skill requires CloudBase MCP for management operations. The MCP server supports interactive
device authorization; this plugin does not contain or require hard-coded Secret ID or Secret Key
values.

## Upstream and license

This package redistributes and integrates an upstream MIT-licensed project. See
[`UPSTREAM.md`](./UPSTREAM.md) for provenance and local packaging changes, and [`LICENSE`](./LICENSE)
for the retained upstream license notice.
