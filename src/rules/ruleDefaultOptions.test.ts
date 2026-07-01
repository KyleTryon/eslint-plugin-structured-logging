import { describe, expect, test } from "vitest";

import { requireLoggerPrimitiveAttributes } from "@/rules/logger/require-logger-primitive-attributes";

import { ruleTester } from "./ruleTester";

ruleTester.run(
	"require-logger-primitive-attributes-default-options",
	requireLoggerPrimitiveAttributes,
	{
		valid: [],
		invalid: [
			{
				code: `logger.info("msg", { meta: { nested: true } });`,
				errors: [{ messageId: "primitiveAttributeValue" }],
			},
		],
	},
);

describe("rule default options", () => {
	test("reading context.options[0] throws before RuleCreator defaults are applied", () => {
		const emptyContextOptions: unknown[] = [];
		expect(emptyContextOptions[0]).toBeUndefined();

		expect(() => {
			const options = emptyContextOptions[0] as {
				allowedLoggerIdentifiers: string[];
			};
			new Set(options.allowedLoggerIdentifiers);
		}).toThrow(TypeError);

		const [defaults] =
			requireLoggerPrimitiveAttributes.meta.defaultOptions ?? [];
		expect(defaults?.allowedLoggerIdentifiers).toContain("logger");
	});
});
