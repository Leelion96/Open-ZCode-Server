---
name: release
description: Create a GitHub release and prepare changelog notes for a version tag. Use when the user wants to publish or draft a repository release, not merely create a Git commit, tag, or pull request.
---

# Create GitHub Release

Create a release using the GitHub CLI (`gh`) with auto-generated or custom changelog notes.

## Arguments

$ARGUMENTS

**Format:** `<version> [--draft] [--prerelease] [--target <branch>]`

- `version` - Version tag (e.g., v1.2.0, 1.2.0)
- `--draft` - Create as draft release
- `--prerelease` - Mark as pre-release
- `--target` - Target branch or commit (defaults to the repository's configured
  default branch)

## Examples

```
/github:release v1.2.0
/github:release v2.0.0-beta.1 --prerelease
/github:release v1.3.0 --draft
/github:release v1.4.0 --target main
```

## Instructions

### Required GitHub CLI preflight

Before any workflow step, read `../../references/github-cli-preflight.md` and complete it. Do not run workflow commands until `gh` installation and authentication are verified.

1. **Verify prerequisites:** The required GitHub CLI preflight has already
   confirmed installation, authentication, active identity, and repository.
   Fetching tags changes local refs, so explain that and run it only as part of
   an explicitly requested release workflow:
   ```bash
   git fetch --tags
   ```

2. **Validate and resolve the release target:**
   - Validate the version as a Git tag with `git check-ref-format
     "refs/tags/<version>"`.
   - If `--target` was supplied, resolve it to an exact commit SHA.
   - Otherwise resolve the repository default branch, then its exact commit SHA.

3. **Check if tag already exists:**
   ```bash
   git tag -l "$version"
   gh release view "$version" 2>/dev/null
   ```

4. **Find previous release tag, excluding the version being created:**
   ```bash
   git describe --tags --abbrev=0 --exclude "$version" 2>/dev/null ||
     echo "No previous tag"
   ```

5. **Generate changelog** against the resolved target commit:
   ```bash
   git log <previous_tag>..<target_sha> --pretty=format:"%h %s" --no-merges
   ```

6. **Categorize changes** into sections:
   - **Features** - `feat:` commits
   - **Bug Fixes** - `fix:` commits
   - **Performance** - `perf:` commits
   - **Breaking Changes** - commits with `BREAKING CHANGE:` or `!:`
   - **Documentation** - `docs:` commits
   - **Other Changes** - remaining commits

7. **Prepare safe content:** Create the release title and notes as separate
   temporary files. Do not interpolate either into a shell command.

8. **Require final confirmation:** Show the verified repository, version,
   exact target commit SHA, title, draft/prerelease state, and a notes summary.
   Do not create the release until the user explicitly confirms.

9. **Create the release:** Read the title from its file into a quoted variable
   and always pass the exact target SHA:
   ```bash
   release_title=$(<"$title_file")
   gh release create "$version" \
     --title "$release_title" \
     --notes-file <changelog_file> \
     --target <target_sha> \
     [--draft] \
     [--prerelease]
   ```

10. **Report the release URL** to the user.

## Changelog Template

```markdown
## What's Changed

### Features
- feat: description (#PR)
- feat(scope): description (#PR)

### Bug Fixes
- fix: description (#PR)

### Performance
- perf: description (#PR)

### Breaking Changes
- **BREAKING:** description

### Other Changes
- chore: description
- refactor: description

**Full Changelog**: https://github.com/owner/repo/compare/v1.1.0...v1.2.0
```

## Smart Changelog Generation

When generating the changelog:

1. **Parse commit messages** for conventional commit prefixes
2. **Extract PR numbers** from commit messages or merge commits
3. **Link contributors** using `@username` when available
4. **Include comparison link** at the bottom
5. **Highlight breaking changes** prominently at the top if any exist

## Error Handling

- If the GitHub CLI preflight fails, stop and follow its installation or
  browser-authentication guidance; do not create a release.
- If tag exists: "Error: Release <version> already exists. Use a different version."
- If no commits since last release: "Warning: No new commits since <previous_tag>"

## Important

- Do NOT add any AI/LLM attribution
- Follow semantic versioning conventions
- Include breaking changes prominently if present
- Keep changelog entries concise but descriptive
