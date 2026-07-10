import { Linter } from "eslint";
import { describe, expect, test } from "vite-plus/test";

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
			`logger.info("checkout.completed", { "checkout.id": id });`,
			[plugin.configs.recommended as Linter.Config],
			{ filename: "file.js" },
		);

		expect(messages).toHaveLength(0);
	});

	test("strict enforces strict attribute values without type information", () => {
		const linter = new Linter({ configType: "flat" });

		const messages = linter.verify(
			`logger.info("request.received", { "request.id": requestId });`,
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

	test("recommended reports realistic mixed logging issues", () => {
		const linter = new Linter({ configType: "flat" });

		const messages = linter.verify(
			`
function handleCheckout(checkoutId, user, attrs) {
	logger.info("checkout.started", { "checkout.id": checkoutId });
	logger.info(\`Checkout \${checkoutId}\`, {
		checkoutId,
		user: { id: user.id },
	});
	logger.warn("checkout.retry", attrs);
}
`,
			[plugin.configs.recommended as Linter.Config],
			{ filename: "checkout.js" },
		);

		expect(messages).toMatchObject([
			{
				messageId: "messageMustBeText",
				ruleId: `${pluginName}/require-logger-message`,
				severity: 1,
			},
			{
				messageId: "dottedSnakeCaseAttributeKey",
				ruleId: `${pluginName}/require-logger-scoped-dot-notation`,
				severity: 1,
			},
			{
				messageId: "dottedSnakeCaseAttributeKey",
				ruleId: `${pluginName}/require-logger-scoped-dot-notation`,
				severity: 1,
			},
			{
				messageId: "primitiveAttributeValue",
				ruleId: `${pluginName}/require-logger-primitive-attributes`,
				severity: 1,
			},
			{
				messageId: "nonInlineAttributes",
				ruleId: `${pluginName}/require-logger-inline-attributes`,
				severity: 1,
			},
		]);
	});

	test("rejects unknown shared rule options", () => {
		const linter = new Linter({ configType: "flat" });

		expect(() => {
			linter.verify(
				`logger.info("checkout.started");`,
				[
					plugin.configs.recommended as Linter.Config,
					{
						rules: {
							[`${pluginName}/require-logger-message`]: [
								"error",
								{ unknownLoggerOption: true },
							],
						},
					},
				],
				{ filename: "checkout.js" },
			);
		}).toThrow('Unexpected property "unknownLoggerOption".');
	});

	test("rejects invalid scoped-dot-notation option values", () => {
		const linter = new Linter({ configType: "flat" });

		expect(() => {
			linter.verify(
				`logger.info("checkout.started");`,
				[
					plugin.configs.recommended as Linter.Config,
					{
						rules: {
							[`${pluginName}/require-logger-scoped-dot-notation`]: [
								"error",
								{ messageFormat: "camel-case" },
							],
						},
					},
				],
				{ filename: "checkout.js" },
			);
		}).toThrow("should be equal to one of the allowed values");
	});
});
