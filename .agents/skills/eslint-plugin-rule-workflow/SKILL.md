---
name: eslint-plugin-rule-workflow
description: Create and wire new rules for this Structured Logging ESLint plugin. Use when adding an @techsquidtv/eslint-plugin-structured-logging rule, updating rule docs/tests, or ensuring the rule is included in the plugin's config presets.
---

# ESLint Plugin Rule Workflow

## Start With The Plan

Before editing, inspect the existing rule nearest to the requested behavior and create a short plan covering:

1. Rule implementation and AST approach.
2. Unit tests for valid, invalid, options, and autofix behavior when relevant.
3. Plugin exports and generated docs.
4. Config preset inclusion or verification.
5. Validation commands to run.
6. Conventional commit plan.

For commits, read `.agents/skills/git-workflow/SKILL.md` and follow its Conventional Commit rules. A new rule should usually be planned as:

```text
feat: add <rule-name> rule
```

## Add The Rule

Follow existing local patterns:

- Put the rule in `src/rules/<rule-name>.ts`, or under `src/rules/logger/` for logger-specific rules.
- Use `createRule` from `src/utils.ts`.
- Export the rule from `src/rules/index.ts`.
- Add the rule to the `rules` object in `src/index.ts`.
- Set `meta.docs.description` clearly. Set `meta.docs.recommended: true` when the rule should be enabled by the plugin's presets.
- Set `meta.docs.requiresTypeChecking: true` for type-aware rules so only type-checked presets include it.
- Prefer shared utilities when the behavior overlaps existing logger patterns.

## Test The Rule

Add `src/rules/<rule-name>.test.ts` beside the rule, following `RuleTester` patterns already in the repo.

Cover:

- Valid examples that are close to real logger usage.
- Invalid examples with `messageId` assertions.
- Options and custom matcher behavior, when the rule accepts options.
- Autofix output, only when the rule is fixable.
- Type-aware parser configuration, when `requiresTypeChecking` is true.

## Document The Rule

Run the docs generator instead of hand-writing generated sections:

```shell
vp run docs:rules
```

Review `docs/rules/<rule-name>.md` and add any non-generated explanation that the rule needs.

## Ensure The Config Presets Include It

The plugin exports `recommended` and `strict` presets from `src/index.ts`, built from rule metadata. Make sure plugin metadata places the rule in the intended presets:

- `recommended: true` includes the rule in the recommended preset.
- The strict preset promotes included rules to `error`.

Update `src/index.test.ts` to assert the new rule appears with the expected severity in the relevant config presets.

## Validate

Prefer focused checks while iterating:

```shell
vp test <rule-name>
vp run docs:rules:check
```

Before presenting the work as complete, prefer the repo-level checks from `.agents/skills/git-workflow/SKILL.md`:

```shell
vp check
vp run release:dry-run
```
