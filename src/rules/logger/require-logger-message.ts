import { createRule } from "@/utils";
import {
	LOGGER_MATCHER_OPTION_SCHEMA_PROPERTIES,
	DEFAULT_LOGGER_MATCHER_OPTIONS,
	buildLoggerMatcherSets,
	getLoggerArguments,
	isClearlyNotMessage,
	type LoggerMatcherOptions,
} from "@/rules/logger/utils";

type MessageIds = "messageRequired" | "messageMustBeText";
type RuleOptions = [LoggerMatcherOptions];

/** Enforces static message arguments for logger calls. */
export const requireLoggerMessage = createRule<RuleOptions, MessageIds>({
	name: "require-logger-message",
	meta: {
		type: "problem",
		docs: {
			description: "Require logger calls to include a static text message.",
			recommended: true,
		},
		messages: {
			messageRequired:
				"Logger call must include a static message. Add a descriptive string literal as the message.",
			messageMustBeText:
				"Logger call message must be static text. Use a string literal message, and put variable data in the attributes object.",
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

				if (!args.messageArg) {
					context.report({ node, messageId: "messageRequired" });
					return;
				}

				if (isClearlyNotMessage(args.messageArg)) {
					context.report({
						node: args.messageArg,
						messageId: "messageMustBeText",
					});
				}
			},
		};
	},
});
