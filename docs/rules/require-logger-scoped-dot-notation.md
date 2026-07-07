# @techsquidtv/structured-logging/require-logger-scoped-dot-notation

📝 Require logger messages and attribute keys to use dotted snake case.

💼⚠️ This rule is enabled in the 🔒 `strict` config. This rule _warns_ in the ✅ `recommended` config.

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->

## Dotted Snake Case

Dotted snake case means at least two dot-separated segments, where each segment
is lower `snake_case`, such as `payment.capture_failed` or `request.user_id`.

## Options

<!-- begin auto-generated rule options list -->

| Name                               | Description                                                                               | Type     | Choices                    | Default                                              |
| :--------------------------------- | :---------------------------------------------------------------------------------------- | :------- | :------------------------- | :--------------------------------------------------- |
| `allowedLoggerIdentifiers`         | Bare logger object identifiers accepted as logger callees.                                | String[] |                            | [`logger`, `log`]                                    |
| `allowedLoggerObjects`             | Fully-qualified logger object paths, such as `log.child`.                                 | String[] |                            | `[]`                                                 |
| `attributeKeyFormat`               | Format required for inline attribute keys.                                                | String   | `dotted-snake-case`, `off` | `dotted-snake-case`                                  |
| `attributesFirstLoggerIdentifiers` | Logger identifiers whose calls pass attributes before the message.                        | String[] |                            | `[]`                                                 |
| `attributesFirstLoggerObjects`     | Logger object paths whose calls pass attributes before the message.                       | String[] |                            | `[]`                                                 |
| `ignoreDynamicLevelMethods`        | Skip computed logger level methods such as `logger[level](...)` instead of matching them. | Boolean  |                            | `false`                                              |
| `levelMethods`                     | Method names treated as logger level calls, such as `info` or `error`.                    | String[] |                            | [`trace`, `debug`, `info`, `warn`, `error`, `fatal`] |
| `messageFormat`                    | Format required for logger messages.                                                      | String   | `dotted-snake-case`, `off` | `dotted-snake-case`                                  |

<!-- end auto-generated rule options list -->
