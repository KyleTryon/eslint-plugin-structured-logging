# Development

For contribution policy, issue expectations, and PR title/release rules, see [CONTRIBUTING.md](./CONTRIBUTING.md).

After [forking the repo from GitHub](https://help.github.com/articles/fork-a-repo) and [installing Vite+](https://viteplus.dev/guide/):

```shell
git clone https://github.com/(your-name-here)/structured-logging-eslint-plugin
cd structured-logging-eslint-plugin
vp install
vp config
```

## Building

Run Vite+ locally to build source files from `src/` into `lib/`:

```shell
vp pack
```

## Formatting

Vite+ formatting is used to format code.
It should be applied automatically when you save files in VS Code or make a Git commit.

To manually reformat all files, you can run:

```shell
vp fmt .
```

## Linting

This package includes several forms of linting to enforce consistent code quality and styling.
Each should be shown in VS Code, and can be run manually on the command-line:

- `vp lint`: Lints source files, including JavaScript, Markdown, and TypeScript

Read the individual documentation for each linter to understand how it can be configured and used best.

For example, ESLint can be run with `--fix` to auto-fix some lint rule complaints:

```shell
vp lint --fix
```

Note that you'll need to run `vp pack` before `vp lint` so that lint rules which check the file system can pick up on any built files.

## Testing

Vite+ is used for tests.
You can run it locally on the command-line:

```shell
vp test
```

Add the `--coverage` flag to compute test coverage and place reports in the `coverage/` directory:

```shell
vp test --coverage
```

Note that `console-fail-test` is enabled for all test runs.
Calls to `console.log`, `console.warn`, and other console methods will cause a test to fail.

## Type Checking

You should be able to see suggestions from [TypeScript](https://typescriptlang.org) in your editor for all open files.

However, it can be useful to run the TypeScript command-line (`tsc`) to type check all source files:

```shell
vp run tsc
```

## Releases

This repository publishes the `@techsquidtv/eslint-plugin-structured-logging` npm package.

The package version is inferred from [Conventional Commit](https://www.conventionalcommits.org) titles. See [CONTRIBUTING.md](./CONTRIBUTING.md#pr-titles-and-releases) for the versioning rules.

The release workflow validates the repo and runs `vp run release`, which publishes the package through npm trusted publishing with provenance. It then pushes an annotated version tag, such as `v1.2.3`, and creates the matching GitHub Release from the same generated notes.

The release workflow is manually dispatched from GitHub Actions. It defaults to a dry run; set `dry_run` to `false` only when publishing from `main`.
