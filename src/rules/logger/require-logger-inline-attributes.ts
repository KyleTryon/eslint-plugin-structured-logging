import { createRule } from "@/utils";
import {
	LOGGER_MATCHER_OPTION_SCHEMA_PROPERTIES,
	DEFAULT_LOGGER_MATCHER_OPTIONS,
	buildLoggerMatcherSets,
	collectAttrsEntries,
	getLoggerArguments,
	type LoggerMatcherOptions,
} from "@/rules/logger/utils";

type MessageIds =
	| "nonInlineAttributes"
	| "noAttributeSpread"
	| "staticAttributeKeys";
type RuleOptions = [LoggerMatcherOptions];

/** Enforces statically inspectable inline attribute objects for logger calls. */
export const requireLoggerInlineAttributes = createRule<
	RuleOptions,
	MessageIds
>({
	name: "require-logger-inline-attributes",
	meta: {
		type: "problem",
		docs: {
			description:
				"Require logger attributes to be inline object literals with explicit keys.",
			recommended: true,
		},
		messages: {
			nonInlineAttributes:
				"Log attributes must be an inline object literal. Inline the attributes object so lint rules can validate its keys and values.",
			noAttributeSpread:
				"Do not spread into log attributes. List each safe scalar attribute explicitly.",
			staticAttributeKeys:
				"Attribute keys must be static identifiers or string literals. Replace the computed key with an explicit key.",
		},
		schema: [
			{
				type: "object",
				properties: { ...LOGGER_MATCHER_OPTION_SCHEMA_PROPERTIES },
				additionalProperties: false,
			},
		],
		defaultOptions: [DEFAULT_LOGGER_MATCHER_OPTIONS],
	},
	create(context) {
		const sets = buildLoggerMatcherSets(context.options[0]);

		return {
			CallExpression(node) {
				const args = getLoggerArguments(node, sets);
				if (!args) return;

				collectAttrsEntries(args.attrsArg, {
					reportMalformedProperties: true,
					reportNonLiteral: true,
					report: (reportNode, messageId) => {
						context.report({
							node: reportNode,
							messageId: messageId as MessageIds,
						});
					},
				});
			},
		};
	},
});
