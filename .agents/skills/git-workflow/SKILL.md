---
name: git-workflow
description: Use when creating commits, PRs, release notes, branches, dependency updates, or explaining the release process for this repository.
---

## Repository Context

This is a single-package repository that publishes the `@techsquidtv/eslint-plugin-structured-logging` npm package. Source lives in `src/`, rule docs in `docs/`, and shared tooling, CI, and release automation at the repo root.

## Commit And PR Titles

All commit subjects and PR titles must use [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0):

```text
<type>[(<scope>)][!]: <description>
```

Allowed types:

```text
build
chore
ci
docs
feat
fix
perf
refactor
style
test
```

A scope is optional and free-form.

Examples:

```text
feat: add no-foo rule
fix(logger): include parser options
perf: reduce config startup work
chore: update release script
ci(deps): bump checkout action
```

Use the shared validator instead of duplicating regexes:

```shell
node scripts/validate-conventional-title.mjs "feat: add rule"
node scripts/validate-conventional-title.mjs --file .git/COMMIT_EDITMSG
```

The same validator is used by `.husky/commit-msg` and `.github/workflows/semantic-pull-request.yaml`.

## Release Rules

The release script infers the version bump from Conventional Commit titles.

- `feat: ...` creates a minor release.
- `fix: ...`, `docs: ...`, and `perf: ...` create a patch release (`docs` because the README is published to npm).
- A `!` after the type, or a `BREAKING CHANGE:` footer, creates a major release.
- Other types (`build`, `chore`, `ci`, `refactor`, `style`, `test`) do not publish a release.

Release tags use the version:

```text
v1.2.3
```

Do not add Changesets. This repo intentionally uses conventional commits and `scripts/release.mjs` instead of committed release metadata.

## Dependency Updates

- npm updates that do not need a release: `chore(deps): ...`
- GitHub Actions updates: `ci(deps): ...`

If an npm dependency update changes what the published package ships or requires, use a release type instead:

- `fix: update @typescript-eslint/utils`

Do not use `chore(deps)` when the dependency update should trigger an npm release. If Dependabot opens a PR with a nonconforming title, update the PR title before merging.

## Validation

Before presenting changes as complete, prefer running:

```shell
pnpm check
pnpm release:dry-run
```

For docs-only changes, at minimum run a focused Prettier check on edited markdown/YAML files.

## Publishing

The release workflow is manually dispatched from GitHub Actions.

- It defaults to dry run.
- Real publishing runs `pnpm release`.
- Publishing uses npm trusted publishing with provenance.

## Commit Guidance For Agents

When asked to commit:

1. Inspect `git status`, `git diff`, and recent commit style.
2. Stage only relevant files.
3. Use a conventional subject that passes `scripts/validate-conventional-title.mjs`, choosing a release type (`feat`/`fix`/`docs`/`perf`) only when the change should publish.
