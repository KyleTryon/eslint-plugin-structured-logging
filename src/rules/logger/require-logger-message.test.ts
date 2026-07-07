import { requireLoggerMessage } from "@/rules/logger/require-logger-message";

import { ruleTester } from "../ruleTester";

ruleTester.run("require-logger-message", requireLoggerMessage, {
	valid: [
		{
			name: "static message",
			code: `logger.info("User signed in", { user_id: 42 });`,
		},
		{
			name: "message only",
			code: `logger.warn("Rate limit exceeded");`,
		},
		{
			name: "named logger identifier",
			code: `logger.info("User signed in", { user_id: 42 });`,
		},
		{
			name: "custom logger object",
			code: `myLogger.info("message");`,
			options: [{ allowedLoggerObjects: ["myLogger"] }],
		},
		{
			name: "attributes-first call",
			code: `logger.info({ user_id: 1 }, "User signed in");`,
			options: [{ attributesFirstLoggerObjects: ["logger"] }],
		},
		{
			name: "Sentry logger object path",
			code: `Sentry.logger.info("User signed in", { user_id: 42 });`,
			options: [{ allowedLoggerObjects: ["Sentry.logger"] }],
		},
		{
			name: "Pino attributes-first logger call",
			code: `logger.info({ user_id: 42 }, "User signed in");`,
			options: [{ attributesFirstLoggerIdentifiers: ["logger"] }],
		},
		{
			name: "LogTape category logger call",
			code: `log.info("User signed in", { user_id: 42 });`,
		},
		{
			name: "Winston attributes-first custom level method",
			code: `logger.http({ request_id: requestId }, "Request received");`,
			options: [
				{
					attributesFirstLoggerIdentifiers: ["logger"],
					levelMethods: [
						"error",
						"warn",
						"info",
						"http",
						"verbose",
						"debug",
						"silly",
					],
				},
			],
		},
		{
			name: "non-logger call is ignored",
			code: `console.log();`,
		},
	],
	invalid: [
		{
			name: "no arguments",
			code: `logger.info();`,
			errors: [{ messageId: "messageRequired" }],
		},
		{
			name: "object passed as message",
			code: `logger.info({ msg: "oops" });`,
			errors: [{ messageId: "messageMustBeText" }],
		},
		{
			name: "identifier message",
			code: `logger.info(message, { user_id: 1 });`,
			errors: [{ messageId: "messageMustBeText" }],
		},
		{
			name: "named logger identifier with dynamic message",
			code: `logger.info(message, { user_id: 1 });`,
			errors: [{ messageId: "messageMustBeText" }],
		},
		{
			name: "template literal message with interpolation",
			code: `logger.info(\`Loaded \${count} records\`, { count });`,
			errors: [{ messageId: "messageMustBeText" }],
		},
		{
			name: "attributes-first missing message",
			code: `logger.info({ user_id: 1 });`,
			options: [{ attributesFirstLoggerObjects: ["logger"] }],
			errors: [{ messageId: "messageRequired" }],
		},
		{
			name: "Sentry logger object path with dynamic message",
			code: `Sentry.logger.info(message, { user_id: 1 });`,
			options: [{ allowedLoggerObjects: ["Sentry.logger"] }],
			errors: [{ messageId: "messageMustBeText" }],
		},
		{
			name: "Winston custom level without message",
			code: `logger.verbose();`,
			options: [
				{
					levelMethods: [
						"error",
						"warn",
						"info",
						"http",
						"verbose",
						"debug",
						"silly",
					],
				},
			],
			errors: [{ messageId: "messageRequired" }],
		},
	],
});
