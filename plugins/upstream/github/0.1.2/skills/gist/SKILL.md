---
name: gist
description: Create, view, edit, or delete GitHub gists for code and text sharing. Use when the user specifically asks to work with a gist, including public or secret gist visibility, not for files stored in a repository.
---

# GitHub Gists

Create or view gists using the GitHub CLI (`gh`).

## Arguments

$ARGUMENTS

**Format:** `[action] [args...]`

- `create [filename]` - Create a new gist (default action)
- `view <gist_id>` - View gist content
- `list` - List your gists
- `edit <gist_id>` - Edit an existing gist
- `delete <gist_id>` - Delete a gist

## Examples

```
/github:gist create snippet.js
/github:gist create snippet.js --public
/github:gist view abc123def
/github:gist list
/github:gist edit abc123def
```

## Instructions

### Required GitHub CLI preflight

Before any workflow step, read `../../references/github-cli-preflight.md` and complete it. Do not run workflow commands until `gh` installation and authentication are verified.

### Create Gist (default)

1. **Check for staged/selected content:**
   - If filename provided, read that file
   - If content is selected/provided, use that
   - Otherwise, ask user what to include

2. **Prepare safe inputs:**
   - Require a filename. Validate it as a basename without path traversal.
   - Write selected/provided content to a temporary file whose basename is the
     intended gist filename. Never put gist content in `echo`, a generated shell
     command, or an interpolated heredoc.
   - Write the optional description to a separate temporary text file, then
     load it into a quoted variable.

3. **Prompt for gist options:**
   - Public or private (default: private)
   - Description (optional)
   - Filename

4. **Confirm public disclosure:** For a public gist, show the verified host,
   account, filename, and byte count, warn that deletion cannot reliably undo
   indexing or copies, and require explicit confirmation immediately before
   creation. A secret gist does not require this extra disclosure gate.

5. **Create the gist non-interactively:**
   ```bash
   gist_description=$(<"$description_file")
   gh gist create "$content_file" --desc "$gist_description" [--public]
   ```
   `GH_HOST` from the preflight is mandatory because `gh gist` does not accept
   a repository or hostname flag.

6. **Report gist URL** to the user.

### View Gist

```bash
gh gist view <gist_id> --raw
```

### List Gists

```bash
gh gist list --limit 20
```

### Edit Gist

Fetch the current filenames, require the user to identify the file being
changed, write the replacement content to `<content_file>`, and generate a JSON
request body with a JSON-aware tool or library. Do not open `$EDITOR`.

```bash
gh api --method PATCH "gists/<gist_id>" --input <payload_file>
```

### Delete Gist

After explicit user confirmation, use the non-interactive flag:

```bash
gh gist delete <gist_id> --yes
```

## Output Format

After creation:
```
Created gist: https://gist.github.com/<username>/<id>

Files:
- filename.js (123 bytes)
```

## Error Handling

- If the GitHub CLI preflight fails, stop and follow its installation or
  browser-authentication guidance; do not run the gist command.
- If gist not found: "Error: Gist '<id>' not found"
- If file not found: "Error: File '<filename>' not found"
