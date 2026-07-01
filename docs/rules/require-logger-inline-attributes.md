# @techsquidtv/structured-logging/require-logger-inline-attributes

📝 Require logger attributes to be inline object literals with explicit keys.

💼⚠️ This rule is enabled in the 🔒 `strict` config. This rule _warns_ in the ✅ `recommended` config.

<!-- end auto-generated rule header -->

## Options

<!-- begin auto-generated rule options list -->

| Name                               | Description                                                                               | Type     | Default                                              |
| :--------------------------------- | :---------------------------------------------------------------------------------------- | :------- | :--------------------------------------------------- |
| `allowedLoggerIdentifiers`         | Bare logger object identifiers accepted as logger callees.                                | String[] | [`logger`, `log`]                                    |
| `allowedLoggerObjects`             | Fully-qualified logger object paths, such as `log.child`.                                 | String[] | `[]`                                                 |
| `attributesFirstLoggerIdentifiers` | Logger identifiers whose calls pass attributes before the message.                        | String[] | `[]`                                                 |
| `attributesFirstLoggerObjects`     | Logger object paths whose calls pass attributes before the message.                       | String[] | `[]`                                                 |
| `ignoreDynamicLevelMethods`        | Skip computed logger level methods such as `logger[level](...)` instead of matching them. | Boolean  | `false`                                              |
| `levelMethods`                     | Method names treated as logger level calls, such as `info` or `error`.                    | String[] | [`trace`, `debug`, `info`, `warn`, `error`, `fatal`] |

<!-- end auto-generated rule options list -->
