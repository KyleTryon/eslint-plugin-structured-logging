import { requireLoggerInlineAttributes } from "@/rules/logger/require-logger-inline-attributes";

import { ruleTester } from "../ruleTester";

ruleTester.run(
	"require-logger-inline-attributes",
	requireLoggerInlineAttributes,
	{
		valid: [
			{
				name: "inline attributes",
				code: `logger.info("msg", { user_id: 1 });`,
			},
			{
				name: "message only",
				code: `logger.info("msg");`,
			},
			{
				name: "attributes-first inline attributes",
				code: `logger.info({ user_id: 1 }, "msg");`,
				options: [{ attributesFirstLoggerObjects: ["logger"] }],
			},
			{
				name: "non-logger call is ignored",
				code: `console.log("msg", attrs);`,
			},
		],
		invalid: [
			{
				name: "variable reference instead of inline object",
				code: `const attrs = { user_id: 1 };
logger.info("msg", attrs);`,
				errors: [{ messageId: "nonInlineAttributes" }],
			},
			{
				name: "spread inside attributes",
				code: `logger.info("msg", { ...extra, user_id: 1 });`,
				errors: [{ messageId: "noAttributeSpread" }],
			},
			{
				name: "computed non-literal key",
				code: `logger.info("msg", { [expr]: "val" });`,
				errors: [{ messageId: "staticAttributeKeys" }],
			},
		],
	},
);
