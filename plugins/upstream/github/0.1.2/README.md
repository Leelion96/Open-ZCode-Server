# GitHub CLI Workflows for ZCode

[中文文档](./README_CN.md)

This ZCode plugin brings a focused set of GitHub CLI workflow skills into the ZCode plugin marketplace. It uses the locally installed [GitHub CLI](https://cli.github.com/) (`gh`) for GitHub operations.

## Setup and authentication

- Run `/github:setup` to let the agent check for GitHub CLI, guide installation
  when it is missing, and guide browser-based authentication when needed.
- A Git repository with a GitHub remote for repository-scoped operations
- A new ZCode session after installing or updating the plugin

Every GitHub-backed skill verifies the `gh` binary, authenticated host, and
active account before running its workflow. Authentication is rechecked after
the user completes `gh auth login`; the agent must stop if verification still
fails. The plugin never asks the user to paste a token or device code into chat.

The plugin does not bundle `gh`, install software automatically, store
credentials, or replace Git's local state. Review every skill before enabling
write operations. The agent must ask for final confirmation before operations
such as merging PRs, publishing public gists, creating releases, closing issues,
deleting labels or milestones, changing secrets, triggering workflows, or
creating/deleting Codespaces.

## Skills

| Skill | ZCode command | Description |
|-------|---------------|-------------|
| setup | `/github:setup` | Verify `gh`, guide browser login, and confirm the active account |
| commit | `/github:commit` | Create a Conventional Commit from staged changes |
| pr | `/github:pr <create\|list\|checkout\|review\|merge>` | Create, list, check out, review, or merge pull requests |
| issue | `/github:issue [create\|view\|list\|close\|label\|milestone]` | Manage issues plus their labels and milestones |
| release | `/github:release` | Create a GitHub Release with changelog notes |
| workflow-run | `/github:workflow-run` | List, trigger, watch, or inspect Actions runs |
| secret | `/github:secret` | List, set, or delete repository secrets |
| repo | `/github:repo <clone\|browse>` | Clone/fork a repository or open GitHub resources in the browser |
| gist | `/github:gist` | Create, view, edit, or delete gists |
| codespace | `/github:codespace` | Create and connect to Codespaces |

## Examples

```text
/github:setup
/github:commit fix login validation
/github:pr create feature/auth
/github:pr list --reviewer @me
/github:pr review 123 request-changes "Please add coverage for the new path"
/github:issue label add 123 bug
/github:workflow-run watch 12345678
/github:repo clone owner/repo feature/new
```

## ZCode packaging

The installable manifest is `.zcode-plugin/plugin.json`. The marketplace entry is maintained in the repository root at [`marketplace.json`](../../marketplace.json).

## Upstream and license

See [`UPSTREAM.md`](./UPSTREAM.md) for the source commit and adaptation boundary. The upstream repository does not contain a `LICENSE` file or a machine-detectable SPDX license; resolve licensing with the maintainer before publishing this adaptation.
