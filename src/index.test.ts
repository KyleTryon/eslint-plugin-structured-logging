import { Linter } from "eslint";
import { describe, expect, test } from "vitest";

import plugin from "@/index";

type Severity = "warn" | "error";

const pluginName = "@techsquidtv/structured-logging";
const strictAttributeRuleName = "require-logger-primitive-attributes";

function createExpectedRules({
	severity,
	strictAttributes,
}: {
	severity: Severity;
	strictAttributes: boolean;
}): Record<string, unknown> {
	const rules: Record<string, unknown> = {};

	for (const [ruleName, rule] of Object.entries(plugin.rules)) {
		const docs = rule.meta.docs;

		if (!docs || !("recommended" in docs) || !docs.recommended) {
			continue;
		}

		rules[`${pluginName}/${ruleName}`] =
			strictAttributes && ruleName === strictAttributeRuleName
				? [severity, { disallowUnknownAttributeValues: true }]
				: severity;
	}

	return rules;
}

describe("plugin configs", () => {
	test("exports a recommended config with warning severities", () => {
		expect(plugin.configs.recommended).toMatchObject({
			name: `${pluginName}/recommended`,
			plugins: { [pluginName]: plugin },
			rules: createExpectedRules({
				severity: "warn",
				strictAttributes: false,
			}),
		});
	});

	test("exports a strict config with error severities and strict attrs", () => {
		expect(plugin.configs.strict).toMatchObject({
			name: `${pluginName}/strict`,
			plugins: { [pluginName]: plugin },
			rules: createExpectedRules({
				severity: "error",
				strictAttributes: true,
			}),
		});
	});

	test("recommended is safe without type information", () => {
		const linter = new Linter({ configType: "flat" });

		const messages = linter.verify(
			`logger.info("Checkout completed", { checkout_id: id });`,
			[plugin.configs.recommended as Linter.Config],
			{ filename: "file.js" },
		);

		expect(messages).toHaveLength(0);
	});

	test("strict enforces strict attribute values without type information", () => {
		const linter = new Linter({ configType: "flat" });

		const messages = linter.verify(
			`logger.info("message", { request_id: requestId });`,
			[plugin.configs.strict as Linter.Config],
			{ filename: "file.js" },
		);

		expect(messages).toMatchObject([
			{
				messageId: "primitiveAttributeValue",
				ruleId: `${pluginName}/require-logger-primitive-attributes`,
				severity: 2,
			},
		]);
	});
});
