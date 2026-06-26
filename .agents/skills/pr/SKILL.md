---
name: pr
description: Branch, commit, push, and create project pull requests for Buku with standardized branch names, ready-for-review GitHub PRs, Conventional Commit-style titles, consistent PR bodies, and base-branch freshness checks. Use when the user asks Codex to create, open, prepare, or submit a PR for this repository, including when current uncommitted work should be committed first.
---

# PR

Branch, commit when needed, push, and create ready-for-review GitHub pull requests for Buku using the repository instructions and a deterministic Git workflow.

## Required Context

Read `AGENTS.md` before doing anything else. Follow its current quality gates and command prefix rules. Treat this skill as project-specific guidance layered on top of those instructions.

Discover the repository default branch and call it the base branch. Prefer `gh repo view --json defaultBranchRef` when available; otherwise inspect the remote. Do not hard-code `master` unless discovery fails and the user confirms that `master` is the base branch.

## Branch Workflow

Create the work branch from an up-to-date base branch:

```bash
git fetch origin
git switch <base-branch>
git pull --ff-only origin <base-branch>
git switch -c <type>/<short-kebab-summary>
```

Use branch names in this format:

```text
<type>/<short-kebab-summary>
```

Allowed types: `feat`, `fix`, `docs`, `test`, `refactor`, `chore`, `ci`.

Use lowercase kebab-case for the summary. Keep the branch name under about 48 characters when practical. If there is an issue number, prefix the summary:

```text
feat/123-add-book-search
```

If the target branch already exists locally or remotely, stop and report the collision. Offer to choose a different branch name, switch to the existing branch, or inspect the existing branch. Do not delete, overwrite, or force-push.

If the user already has commits on a work branch, do not move, rebase, or recreate the branch without explicit approval.

## Commit Workflow

If the user asks for a PR while relevant work is uncommitted, create or switch to the intended work branch first, stage the relevant files, commit them, then continue with the clean-worktree PR flow. Do not leave requested PR work uncommitted and stop unless the user has not approved committing it or the dirty files appear unrelated to the requested PR.

Use a Conventional Commit-style commit message when creating a new commit for the PR:

```text
<type>: <imperative summary>
```

Keep the commit focused on the requested PR. If unrelated dirty files are present, stop and ask how to handle them before staging.

## Preconditions

Before creating the PR, require a clean worktree:

```bash
git status --short
```

If the worktree is dirty and the user has not already approved committing those changes for this PR, stop. Summarize the uncommitted files and ask whether the user wants them committed first. Do not create a PR from uncommitted work.

Run:

```bash
git diff --check
```

Run the smallest useful project checks while working. Before handoff, follow the relevant gates from `AGENTS.md`; for meaningful Buku changes, expect:

```bash
rtk pnpm format:check
rtk pnpm lint
rtk pnpm lint:styles
rtk pnpm exec tsc -p tsconfig.spec.json --noEmit
rtk pnpm build
rtk pnpm cap:sync:android
```

When Android files or Capacitor integration changed, run the Gradle gates from `android/` as instructed by `AGENTS.md`.

## PR Title

Use Conventional Commit style without a trailing period:

```text
<type>: <imperative summary>
```

Examples:

```text
feat: add book search
fix: repair cap sync
docs: add PR skill
chore: update dependencies
```

Keep issue numbers out of the title unless existing project practice requires them. Put issue references in the PR body.

## PR Body

Derive a first draft from the committed diff, then show the exact title and body before creating the PR. Stop if credible manual QA steps cannot be inferred.

Use this structure:

```md
## Summary

- ...

## How To Test

1. ...

## Verification

- [ ] ...

## Notes

...

Closes #123
```

Rules:

- `Summary` explains what changed.
- `How To Test` gives manual QA steps a reviewer can follow.
- `Verification` lists checks actually run.
- `Notes` is optional; omit it when empty.
- `How To Test` is required, but may say `Not applicable - documentation only` or `Not applicable - tooling only`.
- Add `Closes #123` when there is a closing issue reference. Place it near the end, before `Notes` if `Notes` exists.

## Create The PR

Use GitHub CLI only. If `gh` is unavailable or unauthenticated, stop and report the exact authentication command needed.

Push the branch and create a ready-for-review PR with `gh pr create`. Do not create draft PRs unless the user explicitly asks for a draft.

Before running `gh pr create`, present:

- base branch
- branch name
- PR title
- PR body
- verification results

Proceed only after the user approves the GitHub-side action or the command approval clearly shows the final title and body.

Do not rewrite existing commit messages without explicit approval. New commits created by this skill should use Conventional Commit style.
