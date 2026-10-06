---
name: issue
description: Create, view, list, or close GitHub issues and manage the labels and milestones that organize issues and pull requests. Use when the user wants to track or organize repository work, not when they are referring to a pull request itself.
---

# GitHub Issues, Labels, and Milestones

Manage issues and the labels and milestones that organize them using the
GitHub CLI (`gh`).

## Arguments

$ARGUMENTS

**Format:** `[action] [args...]`

- `create [title]` - Create a new issue (default action)
- `view <number>` - View issue details
- `list` - List open issues
- `close <number>` - Close an issue
- `label <list|create|edit|delete|add|remove> [args...]` - Manage labels
- `milestone <list|create|view|edit|close|delete> [args...]` - Manage milestones

## Examples

```
/github:issue create "Bug: Login fails on mobile"
/github:issue view 42
/github:issue list
/github:issue close 42
/github:issue label list
/github:issue label create bug --color d73a4a --description "Something isn't working"
/github:issue label add 123 bug "help wanted"
/github:issue milestone create "v1.0 Release" --due 2024-03-01
/github:issue milestone close 1
```

## Instructions

### Required GitHub CLI preflight

Before any workflow step, read `../../references/github-cli-preflight.md` and complete it. Do not run workflow commands until `gh` installation and authentication are verified.

### Create Issue (default)

1. **If title not provided**, analyze recent context or ask user

2. **Prompt for issue type:** Bug report, Feature request, Documentation, or
   Other.

3. **Generate issue body** based on type:

   **Bug Report:**
   ```markdown
   ## Description
   Brief description of the bug

   ## Steps to Reproduce
   1. Step one
   2. Step two

   ## Expected Behavior
   What should happen

   ## Actual Behavior
   What actually happens

   ## Environment
   - OS:
   - Version:
   ```

   **Feature Request:**
   ```markdown
   ## Description
   Brief description of the feature

   ## Use Case
   Why this feature is needed

   ## Proposed Solution
   How it could be implemented

   ## Alternatives Considered
   Other approaches
   ```

4. **Create the issue safely:** Write the title and generated body to separate
   temporary files. Show the verified repository, title, and labels and require
   confirmation. Then read the title into a quoted variable and run:
   ```bash
   issue_title=$(<"$title_file")
   gh issue create --title "$issue_title" --body-file <body_file> [--label <validated_label>]
   ```

5. **Report issue URL**

### View Issue

```bash
gh issue view <number> --comments
```

### List Issues

```bash
gh issue list --state open --limit 20
```

### Close Issue

Fetch the issue title and current state, ask whether the reason is `completed`
or `not planned`, then show the verified repository, issue number, title, and
reason. Close only after explicit confirmation:

```bash
gh issue close <number> --reason <completed_or_not_planned>
```

### Labels

**List:**
```bash
gh label list
```
Show name, color, and description for each label plus a total count.

**Create:** Parse `--color <hex>` (default: random) and
`--description <text>`. Write the label name, color, and description to
separate temporary files, validate the color as six hexadecimal characters,
then load each file into a quoted variable:
```bash
label_name=$(<"$name_file")
label_color=$(<"$color_file")
label_description=$(<"$description_file")
gh label create "$label_name" --color "$label_color" --description "$label_description"
```

**Edit:** Look up the label with `gh label list --search "$label_name"`,
prompt for the new name, color, or description, load each supplied value from
its temporary file, and pass only quoted variables. Omit flags whose values
were not supplied:
```bash
gh label edit "$label_name" [--name "$new_label_name"] \
  [--color "$label_color"] [--description "$label_description"]
```

**Delete:** Require explicit confirmation first. Show the verified repository
and label name and warn that deletion removes it from every issue and PR:
```bash
gh label delete "$label_name" --yes
```

**Add/remove on an issue or PR:** Resolve the resource type before editing:
```bash
if gh pr view <number> --json number >/dev/null 2>&1; then
  gh pr edit <number> --add-label "$labels"      # or --remove-label
else
  gh issue edit <number> --add-label "$labels"   # or --remove-label
fi
```

When suggesting labels, prefer common conventions such as `bug` (#d73a4a),
`enhancement` (#a2eeef), `documentation` (#0075ca), `good first issue`,
`help wanted`, and `priority: high/medium/low`.

### Milestones

**List:**
```bash
gh api repos/{owner}/{repo}/milestones --jq '.[] | [.number, .title, .state, .due_on, .open_issues, .closed_issues] | @tsv'
```
Show number, title, state, due date, and progress
(`closed_issues / total * 100`), with an overdue warning when past due.

**Create:** Gather the title (required), description, and due date
(`YYYY-MM-DD`). Write title and description to separate temporary files,
validate the date format, and load the files into quoted variables:
```bash
milestone_title=$(<"$title_file")
milestone_description=$(<"$description_file")
gh api "repos/{owner}/{repo}/milestones" \
  -f title="$milestone_title" \
  -f description="$milestone_description" \
  -f due_on="${due_date}T00:00:00Z"
```

**View:**
```bash
gh api repos/{owner}/{repo}/milestones/<number>
gh issue list --milestone "$milestone_title"
```
Show title, description, state, due date, and progress.

**Edit:** Fetch the current milestone, prompt for changes, load text fields
from temporary files, validate the date, and include only fields the user
requested to change:
```bash
gh api "repos/{owner}/{repo}/milestones/<number>" -X PATCH \
  [-f title="$milestone_title"] \
  [-f description="$milestone_description"] \
  [-f due_on="${due_date}T00:00:00Z"]
```

**Close:**
```bash
gh api repos/{owner}/{repo}/milestones/<number> -X PATCH -f state="closed"
```

**Delete:** Warn that deleting a milestone removes it from all associated
issues and cannot be undone. Require explicit confirmation showing the
verified repository, milestone number, and title, then:
```bash
gh api repos/{owner}/{repo}/milestones/<number> -X DELETE
```

**Assign an issue to a milestone:**
```bash
gh issue edit <issue_number> --milestone "$milestone_title"
# Remove from milestone:
gh issue edit <issue_number> --milestone ""
```

## Error Handling

- If the GitHub CLI preflight fails, stop and follow its installation or
  browser-authentication guidance; do not run the command.
- If issue not found: "Error: Issue #<number> not found"
- If label exists: "Error: Label '<name>' already exists"
- If label not found: "Error: Label '<name>' not found"
- If milestone not found: "Error: Milestone #<number> not found"
- If milestone title exists: "Error: A milestone with this title already exists"
- If invalid date: "Error: Invalid date format. Use YYYY-MM-DD"
- If no write access: "Error: You don't have permission for this operation"
