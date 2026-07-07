import { AST_NODE_TYPES } from "@typescript-eslint/utils";

import { createRule } from "@/utils";
import {
	LOGGER_MATCHER_OPTION_SCHEMA_PROPERTIES,
	DOTTED_SNAKE_CASE_SEGMENT_RE,
	DEFAULT_LOGGER_MATCHER_OPTIONS,
	buildLoggerMatcherSets,
	collectAttrsEntries,
	getLoggerArguments,
	type LoggerMatcherOptions,
} from "@/rules/logger/utils";

type MessageIds = "dottedSnakeCaseAttributeKey" | "dottedSnakeCaseMessage";
export type DottedSnakeCaseFormat = "dotted-snake-case" | "off";

/** Options for dotted snake case logger message and attribute enforcement. */
export interface RequireLoggerScopedDotNotationOptions extends LoggerMatcherOptions {
	/** Format required for inline attribute keys. */
	attributeKeyFormat?: DottedSnakeCaseFormat;
	/** Format required for logger messages. */
	messageFormat?: DottedSnakeCaseFormat;
}

type RuleOptions = [RequireLoggerScopedDotNotationOptions];

const DOTTED_SNAKE_CASE_FORMAT: DottedSnakeCaseFormat = "dotted-snake-case";

/** Converts one dotted snake case segment to lower snake_case. */
function toDottedSnakeCaseSegment(segment: string): string {
	return segment
		.replace(/([a-z0-9])([A-Z])/g, "$1_$2")
		.replace(/([A-Z]+)([A-Z][a-z])/g, "$1_$2")
		.replace(/[-\s]+/g, "_")
		.toLowerCase();
}

/** Converts every existing segment of a dotted name to lower snake_case. */
function toDottedSnakeCaseName(name: string): string {
	return name.split(".").map(toDottedSnakeCaseSegment).join(".");
}

/** Returns a safe dotted snake case autofix, or null when no safe fix exists. */
function getDottedSnakeCaseFix(name: string): string | null {
	const fixedName = toDottedSnakeCaseName(name);
	return fixedName.includes(".") && isDottedSnakeCaseName(fixedName)
		? fixedName
		: null;
}

/** Returns whether a static logger name is dotted lower snake_case. */
function isDottedSnakeCaseName(name: string): boolean {
	const segments = name.split(".");
	return (
		segments.length >= 2 &&
		segments.every(
			(segment) =>
				segment.length > 0 && DOTTED_SNAKE_CASE_SEGMENT_RE.test(segment),
		)
	);
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

/** Enforces dotted snake case for logger messages and attribute keys. */
export const requireLoggerScopedDotNotation = createRule<
	RuleOptions,
	MessageIds
>({
	name: "require-logger-scoped-dot-notation",
	meta: {
		type: "problem",
		fixable: "code",
		docs: {
			description:
				"Require logger messages and attribute keys to use dotted snake case.",
			recommended: true,
		},
		messages: {
			dottedSnakeCaseAttributeKey:
				'Attribute key must use dotted snake case: "{{name}}". Use at least two lowercase dotted segments, for example "payment.id".',
			dottedSnakeCaseMessage:
				'Logger message must use dotted snake case: "{{name}}". Use at least two lowercase dotted segments, for example "payment.capture.failed".',
		},
		schema: [
			{
				type: "object",
				properties: {
					...LOGGER_MATCHER_OPTION_SCHEMA_PROPERTIES,
					attributeKeyFormat: {
						description: "Format required for inline attribute keys.",
						enum: [DOTTED_SNAKE_CASE_FORMAT, "off"],
						type: "string",
					},
					messageFormat: {
						description: "Format required for logger messages.",
						enum: [DOTTED_SNAKE_CASE_FORMAT, "off"],
						type: "string",
					},
				},
				additionalProperties: false,
			},
		],
		defaultOptions: [
			{
				...DEFAULT_LOGGER_MATCHER_OPTIONS,
				attributeKeyFormat: DOTTED_SNAKE_CASE_FORMAT,
				messageFormat: DOTTED_SNAKE_CASE_FORMAT,
			},
		],
	},
	create(context) {
		const options = context.options[0];
		const sets = buildLoggerMatcherSets(options);
		const sourceCode = context.sourceCode;

		return {
			CallExpression(node) {
				const args = getLoggerArguments(node, sets);
				if (!args) return;

				const messageArg = args.messageArg;
				if (
					options.messageFormat === DOTTED_SNAKE_CASE_FORMAT &&
					messageArg?.type === AST_NODE_TYPES.Literal &&
					typeof messageArg.value === "string" &&
					!isDottedSnakeCaseName(messageArg.value)
				) {
					const fixedMessage = getDottedSnakeCaseFix(messageArg.value);
					context.report({
						node: messageArg,
						messageId: "dottedSnakeCaseMessage",
						data: { name: messageArg.value },
						fix: fixedMessage
							? (fixer) =>
									fixer.replaceText(
										messageArg,
										quoteStringLike(
											sourceCode.getText(messageArg),
											fixedMessage,
										),
									)
							: null,
					});
				}

				if (options.attributeKeyFormat === DOTTED_SNAKE_CASE_FORMAT) {
					const entries = collectAttrsEntries(args.attrsArg);
					if (!entries) return;

					for (const entry of entries) {
						if (isDottedSnakeCaseName(entry.key)) {
							continue;
						}

						const fixedKey = getDottedSnakeCaseFix(entry.key);
						context.report({
							node: entry.keyNode,
							messageId: "dottedSnakeCaseAttributeKey",
							data: { name: entry.key },
							fix: fixedKey
								? (fixer) => {
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
									}
								: null,
						});
					}
				}
			},
		};
	},
});
