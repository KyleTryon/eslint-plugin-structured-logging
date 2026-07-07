import { requireLoggerScopedDotNotation } from "@/rules/logger/require-logger-scoped-dot-notation";

import { ruleTester } from "../ruleTester";

ruleTester.run(
	"require-logger-scoped-dot-notation",
	requireLoggerScopedDotNotation,
	{
		valid: [
			{
				name: "dotted snake case message and attribute keys",
				code: `logger.info("payment.capture.failed", { "payment.id": 1, "reason.code": "declined" });`,
			},
			{
				name: "message format disabled",
				code: `logger.info("Payment capture failed", { "payment.id": 1 });`,
				options: [{ messageFormat: "off" }],
			},
			{
				name: "attribute key format disabled",
				code: `logger.info("payment.capture.failed", { paymentId: 1 });`,
				options: [{ attributeKeyFormat: "off" }],
			},
			{
				name: "non-inline attrs are ignored by attribute key check",
				code: `logger.info("payment.capture.failed", attrs);`,
			},
			{
				name: "Sentry logger object path",
				code: `Sentry.logger.info("payment.capture.failed", { "payment.id": 1 });`,
				options: [{ allowedLoggerObjects: ["Sentry.logger"] }],
			},
			{
				name: "Pino attributes-first logger call",
				code: `logger.info({ "payment.id": 1 }, "payment.capture.failed");`,
				options: [{ attributesFirstLoggerIdentifiers: ["logger"] }],
			},
			{
				name: "LogTape category logger call",
				code: `log.info("payment.capture.failed", { "payment.id": 1 });`,
			},
			{
				name: "Winston attributes-first custom level method",
				code: `logger.http({ "request.id": requestId }, "request.received");`,
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
		],
		invalid: [
			{
				name: "prose message",
				code: `logger.info("Payment capture failed", { "payment.id": 1 });`,
				output: null,
				errors: [{ messageId: "dottedSnakeCaseMessage" }],
			},
			{
				name: "message segment can be autofixed",
				code: `logger.info("payment.captureFailed", { "payment.id": 1 });`,
				output: `logger.info("payment.capture_failed", { "payment.id": 1 });`,
				errors: [{ messageId: "dottedSnakeCaseMessage" }],
			},
			{
				name: "single-segment attribute key",
				code: `logger.info("payment.capture.failed", { payment_id: 1 });`,
				output: null,
				errors: [{ messageId: "dottedSnakeCaseAttributeKey" }],
			},
			{
				name: "dotted attribute key with non-snake_case segment",
				code: `logger.info("payment.capture.failed", { "payment.orderId": "abc" });`,
				output: `logger.info("payment.capture.failed", { "payment.order_id": "abc" });`,
				errors: [{ messageId: "dottedSnakeCaseAttributeKey" }],
			},
			{
				name: "disabled attribute key format still reports message",
				code: `logger.info("Payment capture failed", { paymentId: 1 });`,
				options: [{ attributeKeyFormat: "off" }],
				output: null,
				errors: [{ messageId: "dottedSnakeCaseMessage" }],
			},
			{
				name: "disabled message format still reports attribute key",
				code: `logger.info("Payment capture failed", { paymentId: 1 });`,
				options: [{ messageFormat: "off" }],
				output: null,
				errors: [{ messageId: "dottedSnakeCaseAttributeKey" }],
			},
			{
				name: "message and attribute key violations",
				code: `logger.info("Payment capture failed", { paymentId: 1 });`,
				output: null,
				errors: [
					{ messageId: "dottedSnakeCaseMessage" },
					{ messageId: "dottedSnakeCaseAttributeKey" },
				],
			},
			{
				name: "Pino attributes-first single-segment attribute key",
				code: `logger.info({ paymentId: 1 }, "payment.capture.failed");`,
				options: [{ attributesFirstLoggerIdentifiers: ["logger"] }],
				output: null,
				errors: [{ messageId: "dottedSnakeCaseAttributeKey" }],
			},
			{
				name: "Sentry logger object path with prose message",
				code: `Sentry.logger.info("Payment capture failed", { "payment.id": 1 });`,
				options: [{ allowedLoggerObjects: ["Sentry.logger"] }],
				output: null,
				errors: [{ messageId: "dottedSnakeCaseMessage" }],
			},
			{
				name: "Winston custom level with non-dotted snake case message segment",
				code: `logger.verbose("requestReceived", { "request.id": requestId });`,
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
				output: null,
				errors: [{ messageId: "dottedSnakeCaseMessage" }],
			},
		],
	},
);
