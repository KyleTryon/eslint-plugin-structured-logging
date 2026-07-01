import { requireLoggerSnakeCaseDottedAttributeKeys } from "@/rules/logger/require-logger-snake-case-dotted-attribute-keys";

import { ruleTester } from "../ruleTester";

ruleTester.run(
	"require-logger-snake-case-dotted-attribute-keys",
	requireLoggerSnakeCaseDottedAttributeKeys,
	{
		valid: [
			{
				name: "snake_case attributes",
				code: `logger.info("msg", { user_id: 1, request_id: "abc" });`,
			},
			{
				name: "dotted snake_case key",
				code: `logger.info("msg", { "payment.order_id": "abc" });`,
			},
			{
				name: "non-inline attrs are ignored by casing rule",
				code: `logger.info("msg", attrs);`,
			},
		],
		invalid: [
			{
				name: "camelCase key",
				code: `logger.info("msg", { userId: 1 });`,
				output: `logger.info("msg", { user_id: 1 });`,
				errors: [{ messageId: "snakeCaseAttributeKey" }],
			},
			{
				name: "quoted camelCase key",
				code: `logger.info("msg", { "userId": 1 });`,
				output: `logger.info("msg", { "user_id": 1 });`,
				errors: [{ messageId: "snakeCaseAttributeKey" }],
			},
			{
				name: "dotted key with non-snake_case segment",
				code: `logger.info("msg", { "payment.orderId": "abc" });`,
				output: `logger.info("msg", { "payment.order_id": "abc" });`,
				errors: [{ messageId: "snakeCaseAttributeKey" }],
			},
			{
				name: "shorthand camelCase key",
				code: `logger.info("msg", { userId });`,
				output: `logger.info("msg", { user_id: userId });`,
				errors: [{ messageId: "snakeCaseAttributeKey" }],
			},
		],
	},
);
