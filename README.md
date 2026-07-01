<h1 align="center">Structured Logging ESLint Plugin</h1>

<p align="center">Library-agnostic ESLint rules for writing safer, more consistent structured logs in TypeScript.</p>

## Installation

Install the plugin alongside ESLint, TypeScript, and `@typescript-eslint/parser`:

```shell
pnpm add -D @techsquidtv/eslint-plugin-structured-logging eslint typescript @typescript-eslint/parser
```

```shell
npm install --save-dev @techsquidtv/eslint-plugin-structured-logging eslint typescript @typescript-eslint/parser
```

```shell
yarn add --dev @techsquidtv/eslint-plugin-structured-logging eslint typescript @typescript-eslint/parser
```

This package requires Node.js 20.19 or newer, ESLint 9 or newer, and TypeScript 5 or newer.

## Usage

The plugin exports flat ESLint configs. Add one to your `eslint.config.js` or `eslint.config.mjs`:

```js
import structuredLogging from "@techsquidtv/eslint-plugin-structured-logging";

export default [structuredLogging.configs.recommended];
```

By default the rules match calls on a `logger` or `log` identifier (for example
`logger.info(...)`). Point them at whatever logging API your codebase uses via
the shared rule options — see [Rule Options](#rule-options).

## Compatibility

The rules are library-agnostic. Both common argument orders are supported:

- **Message-first** — `logger.info("message", { attributes })` (e.g. winston, Sentry)
- **Attributes-first** — `logger.info({ attributes }, "message")` (e.g. pino, bunyan) via the `attributesFirst*` options

Level methods (`trace`, `debug`, `info`, `warn`, `error`, `fatal`) are matched by
default and are configurable via `levelMethods` for libraries with additional
levels (for example winston's `http`, `verbose`, and `silly`).

## Configs

The plugin exports two configs:

- `recommended`: Enables the recommended structured-logging rules as warnings.
- `strict`: Enables the recommended rules as errors and additionally requires logger attribute values to be statically known primitives where possible.

Neither config requires type information.

## Rules

<!-- begin auto-generated rules list -->

⚠️ Configurations set to warn in.\
💼 Configurations enabled in.\
✅ Set in the `recommended` configuration.\
🔒 Set in the `strict` configuration.\
🔧 Automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/user-guide/command-line-interface#--fix).

| Name                                                                                                             | Description                                                                | ⚠️  | 💼  | 🔧  |
| :--------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------- | :-- | :-- | :-- |
| [require-logger-inline-attributes](docs/rules/require-logger-inline-attributes.md)                               | Require logger attributes to be inline object literals with explicit keys. | ✅  | 🔒  |     |
| [require-logger-message](docs/rules/require-logger-message.md)                                                   | Require logger calls to include a static text message.                     | ✅  | 🔒  |     |
| [require-logger-primitive-attributes](docs/rules/require-logger-primitive-attributes.md)                         | Require logger attribute values to be primitives or arrays of primitives.  | ✅  | 🔒  |     |
| [require-logger-snake-case-dotted-attribute-keys](docs/rules/require-logger-snake-case-dotted-attribute-keys.md) | Require logger attribute keys to use snake_case for each dotted segment.   | ✅  | 🔒  | 🔧  |

<!-- end auto-generated rules list -->

## Examples

Prefer message-first logger calls with safe, searchable attributes:

```ts
logger.info("Checkout completed", {
	checkout_id: checkoutId,
	item_count: 3,
	is_guest: false,
	tags: ["priority", "guest"],
});
```

Avoid dynamic messages, nested data, and non-primitive values:

```ts
logger.info(`Checkout completed for ${email}`, {
	user: { email },
	items: [{ id: 1 }],
});
```

## Rule Options

The logger rules share options for matching the logging APIs used in your codebase:

```js
{
	"@techsquidtv/structured-logging/require-logger-message": [
		"warn",
		{
			allowedLoggerObjects: [],
			allowedLoggerIdentifiers: ["logger", "log"],
			attributesFirstLoggerObjects: [],
			attributesFirstLoggerIdentifiers: [],
			levelMethods: ["trace", "debug", "info", "warn", "error", "fatal"],
			ignoreDynamicLevelMethods: false,
		},
	],
	"@techsquidtv/structured-logging/require-logger-primitive-attributes": [
		"warn",
		{
			disallowUnknownAttributeValues: false,
		},
	],
}
```

- `allowedLoggerObjects`: Fully-qualified logger object paths that expose logger level methods, such as `log.child`. Defaults to `[]`.
- `allowedLoggerIdentifiers`: Identifier names that expose logger level methods. Defaults to `["logger", "log"]`.
- `attributesFirstLoggerObjects`: Object paths whose logger methods receive attributes before the message. Defaults to `[]`.
- `attributesFirstLoggerIdentifiers`: Identifier names whose logger methods receive attributes before the message. Defaults to `[]`.
- `levelMethods`: Method names treated as logger level calls. Defaults to `["trace", "debug", "info", "warn", "error", "fatal"]`.
- `ignoreDynamicLevelMethods`: Skip computed logger level methods such as `logger[level](...)` instead of matching them. Defaults to `false`.
- `disallowUnknownAttributeValues`: Available on `@techsquidtv/structured-logging/require-logger-primitive-attributes`. Set to `true` to require statically known primitive attribute values. Defaults to `false`.

### Example: pino / bunyan (attributes-first)

```js
{
	"@techsquidtv/structured-logging/require-logger-message": [
		"warn",
		{ attributesFirstLoggerIdentifiers: ["logger", "log"] },
	],
}
```

### Example: winston (extra levels)

```js
{
	"@techsquidtv/structured-logging/require-logger-message": [
		"warn",
		{
			levelMethods: ["error", "warn", "info", "http", "verbose", "debug", "silly"],
		},
	],
}
```

## Development

See [`.github/CONTRIBUTING.md`](.github/CONTRIBUTING.md), then [`.github/DEVELOPMENT.md`](.github/DEVELOPMENT.md).
