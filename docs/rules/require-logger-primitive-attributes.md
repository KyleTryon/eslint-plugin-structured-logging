# @techsquidtv/structured-logging/require-logger-primitive-attributes

📝 Require logger attribute values to be primitives or arrays of primitives.

💼⚠️ This rule is enabled in the 🔒 `strict` config. This rule _warns_ in the ✅ `recommended` config.

<!-- end auto-generated rule header -->

## Options

<!-- begin auto-generated rule options list -->

| Name                               | Description                                                                                          | Type     | Default                                              |
| :--------------------------------- | :--------------------------------------------------------------------------------------------------- | :------- | :--------------------------------------------------- |
| `allowedLoggerIdentifiers`         | Bare logger object identifiers accepted as logger callees.                                           | String[] | [`logger`, `log`]                                    |
| `allowedLoggerObjects`             | Fully-qualified logger object paths, such as `log.child`.                                            | String[] | `[]`                                                 |
| `attributesFirstLoggerIdentifiers` | Logger identifiers whose calls pass attributes before the message.                                   | String[] | `[]`                                                 |
| `attributesFirstLoggerObjects`     | Logger object paths whose calls pass attributes before the message.                                  | String[] | `[]`                                                 |
| `disallowUnknownAttributeValues`   | Reject expressions whose static value shape is unknown instead of allowing them as attribute values. | Boolean  | `false`                                              |
| `ignoreDynamicLevelMethods`        | Skip computed logger level methods such as `logger[level](...)` instead of matching them.            | Boolean  | `false`                                              |
| `levelMethods`                     | Method names treated as logger level calls, such as `info` or `error`.                               | String[] | [`trace`, `debug`, `info`, `warn`, `error`, `fatal`] |

<!-- end auto-generated rule options list -->
