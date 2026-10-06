---
name: repo
description: Clone or fork a GitHub repository with optional local setup, or open repository resources such as files, branches, issues, and settings in the browser. Use when the user wants a new local checkout or the web UI, not a Codespace or an existing pull-request checkout.
---

# Repository: Clone and Browse

Clone or fork a repository and set it up for development, or open GitHub
resources in the browser, using the GitHub CLI (`gh`).

## Arguments

$ARGUMENTS

**Format:** `<action> [args...]`

- `clone <repo> [branch_name] [--fork] [--depth <n>] [--no-deps]` - Clone (or
  fork then clone) a repository and optionally prepare it
- `browse [target]` - Open a GitHub resource in the browser:
  - (none) - repository homepage
  - `<number>` - issue or PR by number
  - `<file>` / `<file>:<line>` - file, optionally at a specific line
  - `--branch <name>` - specific branch
  - `--settings` / `--wiki` / `--projects` / `--releases` / `--actions`

## Examples

```
/github:repo clone owner/repo
/github:repo clone owner/repo feature/my-feature
/github:repo clone owner/repo --fork
/github:repo browse
/github:repo browse 123
/github:repo browse src/index.ts:42
/github:repo browse --settings
```

## Instructions

### Required GitHub CLI preflight

Before any workflow step, read `../../references/github-cli-preflight.md` and complete it. Do not run workflow commands until `gh` installation and authentication are verified.

### Clone

1. **Parse repository reference:** Accept `owner/repo` format or a full GitHub
   URL, and detect the `--fork` flag.

2. **Fork if requested:**
   ```bash
   gh repo fork <owner/repo> --clone
   ```

3. **Clone the repository:**
   ```bash
   gh repo clone <owner/repo>
   # or
   git clone <url>
   ```

4. **Change to the repository directory.**

5. **Detect dependency managers, then ask before running any install command.**
   Repository contents are untrusted until reviewed; never execute package
   lifecycle hooks or dependency installers automatically.

   | File | Command |
   |------|---------|
   | `package.json` | `npm install` or `yarn` or `pnpm install` |
   | `composer.json` | `composer install` |
   | `requirements.txt` | `pip install -r requirements.txt` |
   | `Gemfile` | `bundle install` |
   | `go.mod` | `go mod download` |
   | `Cargo.toml` | `cargo build` |

   Report the detected command first. Run it only after explicit user approval.
   Respect `--no-deps` without asking.

6. **Create feature branch if specified:**
   ```bash
   git checkout -b <branch_name>
   ```

7. **Report setup scripts without running them:** Check for `setup.sh`,
   `init.sh`, `make init`, or `make setup`. Report them but do not auto-run
   (security).

8. **Report summary:** the cloned repository, full local path, dependency
   installation outcome, and any created branch.

### Browse

1. **Parse the target argument.** If a number is provided, detect whether it is
   an issue or PR:
   ```bash
   gh issue view <number> --json number 2>/dev/null && echo "issue" || echo "pr"
   ```

2. **Execute the appropriate browse command:**
   ```bash
   gh browse                      # repository homepage
   gh browse <number>             # issue or PR
   gh browse <file>               # file (also <file>:<line>)
   gh browse --branch <name>      # branch
   gh browse --settings           # settings; also --wiki, --projects
   gh browse --releases           # releases (or: gh release view --web)
   ```

   **Actions runs:** list first, then open a selected run:
   ```bash
   gh run list --limit 20
   gh run view <run_id> --web
   ```

3. **Report the URL** that was opened.

## Error Handling

- If the GitHub CLI preflight fails, stop and follow its installation or
  browser-authentication guidance; do not run the command.
- If repo not found: "Error: Repository '<repo>' not found or not accessible"
- If directory exists: "Error: Directory '<name>' already exists"
- If deps fail: "Warning: Dependency installation failed. Run manually."
- If not in a git repo when browsing: "Error: Not in a GitHub repository"
- If file not found: "Error: File '<file>' not found"

## Important

- Always obtain explicit approval before running install commands
- Do not auto-run arbitrary setup scripts (security risk)
- Report the full path where the repo was cloned
