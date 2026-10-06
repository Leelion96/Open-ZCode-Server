---
name: commit
description: Create a local Git commit from staged changes using a conventional commit message. Use when the user wants to record already prepared changes locally, not when they want to create, review, or merge a pull request.
---

# Commit Staged Changes

Create a commit for the currently staged changes following Conventional Commits specification.

## Instructions

1. **Check current state** - Run `git status` and `git diff --staged` to understand what's being committed

2. **Analyze the changes** - Look at:
   - Which files are modified/added/deleted
   - The nature of changes (feature, fix, refactor, docs, etc.)
   - The scope (component/module affected)

3. **Write commit message** following Conventional Commits:
   ```
   <type>(<scope>): <description>

   [optional body]

   [optional footer]
   ```

   Types:
   - `feat`: New feature
   - `fix`: Bug fix
   - `docs`: Documentation only
   - `style`: Formatting, no code change
   - `refactor`: Code change that neither fixes nor adds
   - `perf`: Performance improvement
   - `test`: Adding/updating tests
   - `chore`: Build process, dependencies, etc.

4. **Commit** - Execute the commit (do NOT push)

5. **Confirm** - Report success/failure

## Important

- Do NOT push to remote
- Do NOT modify any files
- Focus ONLY on creating the commit
- If nothing is staged, inform the user and suggest `git add`
- DO NOT MENTION ANY LLM-RELATED INFORMATION OR THAT IT HAS BEEN CO-AUTHORED BY ANYONE!

## Arguments

$ARGUMENTS

If arguments provided, use them as additional context for the commit message.
