---
name: setup
description: Verify and install the tools behind the Obsidian plugin skills — the official Obsidian CLI bundled with Obsidian 1.12+, defuddle, and knap. Use when `obsidian`, `defuddle`, or `knap` is missing or not working, when setup of any of them is requested, or before another Obsidian skill fails its tool checks.
---

# Set Up Obsidian Tooling

Guide the user through verifying and installing the command line tools this
plugin's skills rely on: the official Obsidian CLI, defuddle, and knap.

## Arguments

$ARGUMENTS

**Format:** `[component ...]`

- `obsidian` - verify the official Obsidian CLI and its connection to the
  running Obsidian app
- `defuddle` - verify the defuddle web extraction CLI
- `knap` - verify the knap template rendering CLI
- `all` - verify every component (default when no component is given)

## Examples

```text
/obsidian:setup
/obsidian:setup obsidian
/obsidian:setup defuddle knap
```

## Instructions

1. Read and complete `references/setup-preflight.md` in full, for each
   selected component. Follow its installation confirmation gate before any
   installation or environment change.
2. If the Obsidian CLI is missing (including the fallback probes in the
   preflight — the agent shell may not see the user's PATH), guide the user
   through the official registration flow inside the Obsidian app
   (Settings → General → Command line interface), wait for them to complete
   it and restart their terminal, then verify again.
3. If `defuddle` or `knap` is missing, guide the user through the matching
   `npm install -g` command (knap requires Node.js 20 or later), wait for
   completion, and verify again.
4. Confirm the Obsidian app is running before declaring the Obsidian CLI
   ready — the CLI talks to the running app, and the first command may launch
   it.
5. On success, report:
   - the version of each verified component;
   - the vaults listed by `obsidian vaults`, when the Obsidian CLI is ready;
   - which plugin skills are now ready.
6. Do not create, modify, or delete any vault content as part of setup.

## Important

- Never claim setup succeeded until the verification commands in
  `references/setup-preflight.md` pass for every selected component.
- Invoking setup or discovering a missing dependency is not installation
  consent. Use Ask User as described in the preflight before proceeding.
- The official Obsidian CLI ships inside the Obsidian desktop app. Never
  install the unrelated `obsidian-cli` package from npm.
