---
name: codespace
description: Create, list, connect to, stop, or delete GitHub Codespaces. Use when the user explicitly wants to manage a remote Codespaces development environment, not for cloning a repository locally.
---

# GitHub Codespaces

Create, manage, and connect to GitHub Codespaces using the GitHub CLI (`gh`).

## Arguments

$ARGUMENTS

**Format:** `[action] [args...]`

- `create [repo]` - Create a new codespace
- `list` - List your codespaces
- `code [name]` - Open codespace in VS Code
- `ssh [name]` - SSH into a codespace
- `stop [name]` - Stop a running codespace
- `delete [name]` - Delete a codespace

## Examples

```
/github:codespace create
/github:codespace create owner/repo
/github:codespace create --machine largePremiumLinux
/github:codespace list
/github:codespace code my-codespace
/github:codespace ssh my-codespace
/github:codespace stop
/github:codespace delete my-codespace
```

## Instructions

### Required GitHub CLI preflight

Before any workflow step, read `../../references/github-cli-preflight.md` and complete it. Do not run workflow commands until `gh` installation and authentication are verified.

### Create Codespace

1. **Determine repository:**
   - If repo provided, use it
   - If in a git repo, use current repo
   - Otherwise, ask user

2. **Check for devcontainer:**
   ```bash
   gh api repos/{owner}/{repo}/contents/.devcontainer
   ```
   Report if devcontainer exists.

3. **Prompt for options:**
   - Machine type (if user wants non-default)
   - Branch (default: default branch)
   - Region (optional)

4. **Require final confirmation:** Show the verified host, repository, branch,
   machine type, region, retention/idle settings, and a warning that Codespaces
   usage may incur charges. Do not create it until the user explicitly confirms.

5. **Create codespace non-interactively:** Specify the repository and all
   selected options. Use `--default-permissions` so extra devcontainer
   permissions do not open a prompt; if those permissions are required, stop
   and explain that the user must review them explicitly.
   ```bash
   gh codespace create --repo <owner/repo> --default-permissions \
     [--branch <branch>] [--machine <type>] [--location <region>]
   ```

6. **Report creation:**
   ```
   Created codespace: <name>
   Machine: 2-core, 4GB RAM
   Repository: owner/repo
   Branch: main

   Connect with:
     VS Code: /github:codespace code <name>
     SSH: /github:codespace ssh <name>
     Browser: gh codespace code --web -c <name>
   ```

### List Codespaces

```bash
gh codespace list
```

Format output:
```
Name                 Repository        Branch    State     Machine
─────────────────────────────────────────────────────────────────
turbo-spork-abc123   owner/repo        main      Running   2-core
fuzzy-robot-xyz789   owner/other       develop   Stopped   4-core
```

### Open in VS Code

```bash
gh codespace code -c <name>
```

### SSH into Codespace

```bash
gh codespace ssh -c <name>
```

### Stop Codespace

```bash
gh codespace stop -c <name>
```

If no name provided, show list and let user choose.

### Delete Codespace

Show the exact codespace name, repository, branch, state, and unsaved-change
warning. After explicit confirmation, delete through the API so no second
interactive prompt can block the agent:

```bash
codespace_name=$(<"$codespace_name_file")
gh api --method DELETE "user/codespaces/$codespace_name"
```

## Machine Types

Common machine types:
- `basicLinux` - 2 cores, 4GB RAM
- `standardLinux` - 4 cores, 8GB RAM
- `premiumLinux` - 8 cores, 16GB RAM
- `largePremiumLinux` - 16 cores, 32GB RAM

## Error Handling

- If the GitHub CLI preflight fails, stop and follow its installation or
  browser-authentication guidance; do not run a Codespaces command.
- If codespace limit reached: "Error: Codespace limit reached. Delete unused codespaces."
- If codespace not found: "Error: Codespace '<name>' not found"
- If VS Code not installed: "Tip: Install VS Code or use --web flag for browser"

## Billing Note

Remind users: "Note: Codespaces usage may incur charges. Check your billing settings."
