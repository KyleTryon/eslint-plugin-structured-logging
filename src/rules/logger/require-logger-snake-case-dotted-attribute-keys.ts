import { AST_NODE_TYPES } from "@typescript-eslint/utils";

import { createRule } from "@/utils";
import {
	LOGGER_MATCHER_OPTION_SCHEMA_PROPERTIES,
	SNAKE_CASE_SEGMENT_RE,
	DEFAULT_LOGGER_MATCHER_OPTIONS,
	buildLoggerMatcherSets,
	collectAttrsEntries,
	getLoggerArguments,
	type LoggerMatcherOptions,
} from "@/rules/logger/utils";

type MessageIds = "snakeCaseAttributeKey";
type RuleOptions = [LoggerMatcherOptions];

/** Converts one dotted attribute-key segment to lower snake_case. */
function toSnakeCaseSegment(segment: string): string {
	return segment
		.replace(/([a-z0-9])([A-Z])/g, "$1_$2")
		.replace(/([A-Z]+)([A-Z][a-z])/g, "$1_$2")
		.replace(/[-\s]+/g, "_")
		.toLowerCase();
}

/** Converts every segment of a dotted attribute key to lower snake_case. */
function toSnakeCaseKey(key: string): string {
	return key.split(".").map(toSnakeCaseSegment).join(".");
}

/**
 * Quotes an autofixed string literal using the original quote style and escapes
 * backslashes plus matching quote characters.
 */
function quoteStringLike(raw: string, value: string): string {
	const quote = raw.startsWith("'") ? "'" : '"';
	const escaped = value
		.replace(/\\/g, "\\\\")
		.replace(new RegExp(quote, "g"), `\\${quote}`);

	return `${quote}${escaped}${quote}`;
}

/** Enforces lower snake_case keys for logger attributes. */
export const requireLoggerSnakeCaseDottedAttributeKeys = createRule<
	RuleOptions,
	MessageIds
>({
	name: "require-logger-snake-case-dotted-attribute-keys",
	meta: {
		type: "problem",
		fixable: "code",
		docs: {
			description:
				"Require logger attribute keys to use snake_case for each dotted segment.",
			recommended: true,
		},
		messages: {
			snakeCaseAttributeKey:
				'Attribute key must use snake_case for each dotted segment: "{{key}}". Rename the key, for example "userId" to "user_id".',
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
		const sourceCode = context.sourceCode;

		return {
			CallExpression(node) {
				const args = getLoggerArguments(node, sets);
				if (!args) return;

				const entries = collectAttrsEntries(args.attrsArg);
				if (!entries) return;

				for (const entry of entries) {
					const segments = entry.key.split(".");
					if (
						segments.every(
							(segment) => segment && SNAKE_CASE_SEGMENT_RE.test(segment),
						)
					) {
						continue;
					}

					const fixedKey = toSnakeCaseKey(entry.key);
					context.report({
						node: entry.keyNode,
						messageId: "snakeCaseAttributeKey",
						data: { key: entry.key },
						fix(fixer) {
							const keyText = sourceCode.getText(entry.keyNode);

							if (
								entry.keyNode.type === AST_NODE_TYPES.Identifier &&
								entry.valueNode.type === AST_NODE_TYPES.Identifier &&
								entry.keyNode.range[0] === entry.valueNode.range[0] &&
								entry.keyNode.range[1] === entry.valueNode.range[1]
							) {
								return fixer.replaceText(
									entry.keyNode,
									`${fixedKey}: ${keyText}`,
								);
							}

							if (entry.keyNode.type === AST_NODE_TYPES.Literal) {
								return fixer.replaceText(
									entry.keyNode,
									quoteStringLike(keyText, fixedKey),
								);
							}

							return fixer.replaceText(entry.keyNode, fixedKey);
						},
					});
				}
			},
		};
	},
});
