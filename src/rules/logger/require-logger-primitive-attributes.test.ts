import { requireLoggerPrimitiveAttributes } from "@/rules/logger/require-logger-primitive-attributes";

import { ruleTester } from "../ruleTester";

ruleTester.run(
	"require-logger-primitive-attributes",
	requireLoggerPrimitiveAttributes,
	{
		valid: [
			{
				name: "primitive literals",
				code: `logger.info("msg", { retries: 3, success: true, region: "us" });`,
			},
			{
				name: "array of string primitives",
				code: `logger.info("msg", { tags: ["a", "b"] });`,
			},
			{
				name: "array of number primitives",
				code: `logger.info("msg", { codes: [1, 2, 3] });`,
			},
			{
				name: "empty array",
				code: `logger.info("msg", { tags: [] });`,
			},
			{
				name: "unknown value allowed with default option",
				code: `logger.info("msg", { request_id: requestId });`,
			},
			{
				name: "non-inline attrs are ignored by primitive rule",
				code: `logger.info("msg", attrs);`,
			},
		],
		invalid: [
			{
				name: "nested object value",
				code: `logger.info("msg", { meta: { nested: true } });`,
				errors: [{ messageId: "primitiveAttributeValue" }],
			},
			{
				name: "array of objects",
				code: `logger.info("msg", { items: [{ id: 1 }] });`,
				errors: [{ messageId: "primitiveAttributeValue" }],
			},
			{
				name: "nested array",
				code: `logger.info("msg", { grid: [[1, 2]] });`,
				errors: [{ messageId: "primitiveAttributeValue" }],
			},
			{
				name: "array with unknown element under disallowUnknownAttributeValues",
				code: `logger.info("msg", { tags: [tag] });`,
				options: [{ disallowUnknownAttributeValues: true }],
				errors: [{ messageId: "primitiveAttributeValue" }],
			},
			{
				name: "array spread under disallowUnknownAttributeValues",
				code: `logger.info("msg", { tags: [...extra] });`,
				options: [{ disallowUnknownAttributeValues: true }],
				errors: [{ messageId: "primitiveAttributeValue" }],
			},
			{
				name: "unknown value with disallowUnknownAttributeValues: true",
				code: `logger.info("msg", { request_id: requestId });`,
				options: [{ disallowUnknownAttributeValues: true }],
				errors: [{ messageId: "primitiveAttributeValue" }],
			},
		],
	},
);
