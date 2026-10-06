---
name: setup
description: Verify GitHub CLI installation and guide authentication for the intended GitHub host and account. Use when gh is missing, authentication is invalid, the user wants to switch accounts or hosts, or another GitHub skill cannot pass preflight.
---

# Set Up GitHub CLI

Guide the user through verifying the GitHub CLI installation and authenticating
the intended GitHub account before using the plugin's GitHub workflows.

## Arguments

$ARGUMENTS

**Format:** `[hostname]`

- `hostname` - GitHub host to authenticate (optional, defaults to the current
  repository remote host or `github.com`)

## Examples

```text
/github:setup
/github:setup github.com
/github:setup github.example.com
```

## Instructions

1. Read and complete `../../references/github-cli-preflight.md` in full.
2. If `gh` is missing, guide the user through the appropriate installation
   path, wait for completion, and verify the binary again.
3. If authentication is missing, guide the user through browser-based
   `gh auth login`, wait for completion, and verify authentication again.
4. On success, report:
   - the installed `gh` version;
   - the authenticated hostname;
   - the active GitHub login returned by `gh api`;
   - that the GitHub workflow skills are ready.
5. Do not create, modify, or delete any GitHub resource as part of setup.

## Important

- Never claim setup succeeded until both authentication and identity checks
  pass.
- Never ask the user to paste a token, password, or device code into chat.
- Do not install software or change authentication state without the user's
  explicit participation.
