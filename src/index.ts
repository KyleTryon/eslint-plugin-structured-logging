import type { TSESLint } from "@typescript-eslint/utils";

import {
	requireLoggerInlineAttributes,
	requireLoggerMessage,
	requireLoggerPrimitiveAttributes,
	requireLoggerScopedDotNotation,
} from "@/rules/index";

const rules = {
	"require-logger-inline-attributes": requireLoggerInlineAttributes,
	"require-logger-message": requireLoggerMessage,
	"require-logger-primitive-attributes": requireLoggerPrimitiveAttributes,
	"require-logger-scoped-dot-notation": requireLoggerScopedDotNotation,
};

type Severity = "warn" | "error";
type Rules = NonNullable<TSESLint.FlatConfig.Config["rules"]>;

const pluginName = "@techsquidtv/structured-logging";
const strictAttributeRuleName = "require-logger-primitive-attributes";

function createRecommendedRules({
	severity,
	strictAttributes,
}: {
	severity: Severity;
	strictAttributes: boolean;
}): Rules {
	const configRules: Rules = {};

	for (const [ruleName, rule] of Object.entries(rules)) {
		const docs = rule.meta.docs;

		if (!docs || !("recommended" in docs) || !docs.recommended) {
			continue;
		}

		const ruleId = `${pluginName}/${ruleName}`;

		configRules[ruleId] =
			strictAttributes && ruleName === strictAttributeRuleName
				? [severity, { disallowUnknownAttributeValues: true }]
				: severity;
	}

	return configRules;
}

const plugin = {
	meta: {
		name: "@techsquidtv/eslint-plugin-structured-logging",
		version: "0.0.0",
	},
	rules,
	configs: {} as Record<string, TSESLint.FlatConfig.Config>,
};

Object.assign(plugin.configs, {
	recommended: {
		name: `${pluginName}/recommended`,
		plugins: { [pluginName]: plugin },
		rules: createRecommendedRules({
			severity: "warn",
			strictAttributes: false,
		}),
	} satisfies TSESLint.FlatConfig.Config,
	strict: {
		name: `${pluginName}/strict`,
		plugins: { [pluginName]: plugin },
		rules: createRecommendedRules({
			severity: "error",
			strictAttributes: true,
		}),
	} satisfies TSESLint.FlatConfig.Config,
});

export default plugin;
