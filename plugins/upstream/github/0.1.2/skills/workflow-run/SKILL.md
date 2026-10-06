---
name: workflow-run
description: List, inspect, trigger, watch, or rerun GitHub Actions workflows and runs. Use when the user wants to operate or inspect CI workflows, not when they only want to merge a PR or browse the Actions page.
---

# GitHub Actions Workflows

Trigger, view, or manage GitHub Actions workflows using `gh workflow` and `gh run`.

## Arguments

$ARGUMENTS

**Format:** `[action] [args...]`

- `list` - List available workflows (default)
- `run <workflow> [--ref <branch>] [inputs...]` - Trigger a workflow
- `view [run_id]` - View workflow run status
- `watch <run_id>` - Watch a running workflow
- `logs <run_id>` - View run logs

## Examples

```
/github:workflow-run
/github:workflow-run list
/github:workflow-run run ci.yml
/github:workflow-run run deploy.yml --ref main
/github:workflow-run view
/github:workflow-run view 12345678
/github:workflow-run watch 12345678
/github:workflow-run logs 12345678
```

## Instructions

### Required GitHub CLI preflight

Before any workflow step, read `../../references/github-cli-preflight.md` and complete it. Do not run workflow commands until `gh` installation and authentication are verified.

### List Workflows (default)

```bash
gh workflow list
```

Show workflow names, states, and IDs.

### Trigger Workflow

1. **List available workflows:**
   ```bash
   gh workflow list
   ```

2. **Inspect the workflow and collect inputs:**
   ```bash
   gh workflow view <workflow>
   ```
   Collect every required input from the user. Do not guess deployment
   environments, release versions, or other sensitive values. Write the input
   object as JSON to a temporary file using a JSON-aware tool.

3. **Resolve correlation data:** Resolve the selected ref to an exact commit SHA
   and record the current UTC timestamp immediately before dispatch.

4. **Require final confirmation:** Show the verified repository, workflow,
   ref, exact commit SHA, and input names with non-secret values. Redact values
   identified as sensitive. Do not trigger until the user explicitly confirms.

5. **Run the workflow non-interactively:** If the workflow has inputs, pass the
   JSON file. If it has no inputs, omit `--json` and stdin entirely:
   ```bash
   # With inputs
   gh workflow run "$workflow" --ref "$workflow_ref" --json < "$inputs_file"

   # Without inputs
   gh workflow run "$workflow" --ref "$workflow_ref"
   ```

6. **Find this dispatch, not merely the latest run:** Poll for a
   `workflow_dispatch` run created after the recorded timestamp and matching
   the workflow and exact commit SHA. For a branch ref, also filter by branch:
   ```bash
   gh run list --workflow "$workflow" \
     --event workflow_dispatch \
     --branch "$workflow_ref" \
     --commit "$expected_head_sha" \
     --created ">=$dispatch_started_at" \
     --limit 20 \
     --json databaseId,createdAt,event,headBranch,headSha,workflowName,url
   ```
   For a tag or commit ref, omit `--branch` and verify the returned
   `headBranch`/`headSha` fields explicitly.
   If zero or multiple plausible runs remain, report the ambiguity and ask the
   user which run to follow; never silently select `--limit 1`.

7. **Offer to watch:**
   ```bash
   gh run watch <run_id>
   ```

### View Run Status

```bash
# Latest run
gh run list --limit 5

# Specific run
gh run view <run_id>

# With web
gh run view <run_id> --web
```

### Watch Running Workflow

```bash
gh run watch <run_id>
```

Shows live status updates until completion.

### View Logs

```bash
# Full logs
gh run view <run_id> --log

# Failed steps only
gh run view <run_id> --log-failed
```

## Common Workflows

Detect and suggest common workflows:
- `ci.yml` / `test.yml` - CI/Testing
- `build.yml` - Build
- `deploy.yml` / `release.yml` - Deployment
- `lint.yml` - Linting

## Error Handling

- If workflow not found: "Error: Workflow '<name>' not found. Available: <list>"
- If workflow disabled: "Error: Workflow is disabled. Enable in repo settings."
- If no permission: "Error: Cannot trigger workflows in this repository"
- If run failed: Show failed steps and suggest viewing logs
