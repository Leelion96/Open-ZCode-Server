---
name: secret
description: List, set, delete, or synchronize GitHub Actions repository secrets without exposing secret values. Use when the user explicitly wants to manage GitHub secret storage, not ordinary environment files or repository variables.
---

# Repository Secrets

Manage repository secrets for GitHub Actions using the GitHub CLI (`gh`).

## Arguments

$ARGUMENTS

**Format:** `[action] [args...]`

- `list` - List secrets (names only, values are hidden)
- `set <name>` - Set a secret
- `delete <name>` - Delete a secret
- `sync` - Sync secrets from .env file

## Examples

```
/github:secret list
/github:secret set API_KEY
/github:secret delete OLD_SECRET
/github:secret sync .env.production
```

## Instructions

### Required GitHub CLI preflight

Before any workflow step, read `../../references/github-cli-preflight.md` and complete it. Do not run workflow commands until `gh` installation and authentication are verified.

### List Secrets

```bash
gh secret list
```

Format output:
```
Secret Name          Updated
───────────────────────────
API_KEY              2 days ago
DATABASE_URL         1 week ago
DEPLOY_TOKEN         3 months ago

Total: 3 secrets
```

Note: Secret values are never displayed.

### Set Secret

1. **Never accept or request a raw secret value in chat or command arguments.**
   Ask the user for the name of an existing environment variable or a local
   file that already contains the value. Never print either value.

2. **Validate secret name:**
   - Must start with letter or underscore
   - Can only contain alphanumeric and underscores
   - Cannot start with GITHUB_ prefix

3. **Set the secret without putting its value in argv:**
   Show the verified repository and secret name and require explicit
   confirmation before reading or submitting the value. Then run:
   ```bash
   # From an existing environment variable (do not echo the value)
   secret_env_name="<ENV_VAR_NAME>"
   printenv "$secret_env_name" | gh secret set <name>

   # From file
   gh secret set <name> < secret.txt
   ```

4. **Confirm:**
   ```
   Secret 'API_KEY' has been set.
   ```

### Delete Secret

1. **Require explicit confirmation:** Show the verified repository and secret
   name. Do not delete until the user confirms that exact target.

2. **Delete:**
   ```bash
   gh secret delete <name>
   ```

3. **Confirm deletion:**
   ```
   Secret 'OLD_SECRET' has been deleted.
   ```

### Sync from .env File

1. **Validate the path without printing file contents.** Never run `cat` on a
   secrets file. Resolve the requested path, require a regular non-symlink
   file, and reject device files, directories, and paths outside the intended
   workspace unless the user explicitly selected them.

2. **Generate an exact preview:** Locate the bundled
   `../../scripts/secret_sync.py` relative to this Skill's installed directory.
   Its preview and apply commands share one parser and reject duplicate,
   multiline, ambiguous, symlink, or non-regular inputs. It prints names only.
   ```bash
   python3 <plugin_root>/scripts/secret_sync.py preview --file "$secret_file"
   ```
   Record the `SHA256` value printed to stderr as `<preview_sha256>`. This
   digest binds the later import to the exact file the user reviewed.

3. **Show preview:** Compare the exact names with `gh secret list` if the user
   needs new/existing status. Never claim per-name created/updated results
   unless that comparison was actually performed.
   ```
   Will sync the following secrets:
   - API_KEY (new)
   - DATABASE_URL (update)
   - CACHE_HOST (new)

   Continue? [y/N]
   ```

4. **Require final confirmation:** Show the verified repository, source path,
   and exact secret names. Do not show values. Import only after explicit
   confirmation.

5. **Import the same validated file:** Pass the verified repository explicitly.
   The helper sends each value to `gh secret set` through stdin, never argv.
   ```bash
   python3 <plugin_root>/scripts/secret_sync.py apply \
     --file "$secret_file" \
     --repo "<host>/<owner>/<repo>" \
     --expect-sha256 <preview_sha256>
   ```
   If the file changed after preview, the helper stops and requires a new
   preview and confirmation.

6. **Report only verified results:**
   ```
   Synced 3 secrets from .env.production
   Names submitted:
   - API_KEY
   - DATABASE_URL
   - CACHE_HOST
   ```

## Environment Secrets

For organization-level or environment-specific secrets:

```bash
# Environment secrets
gh secret set <name> --env production

# List environment secrets
gh secret list --env production
```

## Security Notes

- **NEVER** echo or log secret values
- **NEVER** put secret values in command arguments
- **NEVER** commit secrets to the repository
- Recommend using `.env.example` with placeholder values
- Secrets are encrypted and only exposed to workflows

## Error Handling

- If not in repo: "Error: Not in a git repository"
- If no write access: "Error: You don't have permission to manage secrets"
- If secret not found: "Error: Secret '<name>' not found"
- If invalid name: "Error: Secret name must start with letter/underscore and contain only alphanumeric/underscores"

## Important

- This manages **repository** secrets, not environment variables
- For environment-specific secrets, use `--env <environment>`
- Changes take effect on next workflow run
