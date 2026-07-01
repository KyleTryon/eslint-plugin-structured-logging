import { createRule } from "@/utils";
import {
	DEFAULT_LOGGER_MATCHER_OPTIONS,
	LOGGER_MATCHER_OPTION_SCHEMA_PROPERTIES,
	buildLoggerMatcherSets,
	collectAttrsEntries,
	getLoggerArguments,
	isDisallowedAttributeValue,
	type LoggerMatcherOptions,
} from "@/rules/logger/utils";

type MessageIds = "primitiveAttributeValue";

/** Options for primitive logger attribute enforcement. */
export interface RequireLoggerPrimitiveAttributesOptions extends LoggerMatcherOptions {
	/**
	 * Reject expressions whose static value shape is unknown instead of
	 * allowing them as attribute values.
	 */
	disallowUnknownAttributeValues?: boolean;
}

type RuleOptions = [RequireLoggerPrimitiveAttributesOptions];

/** Enforces primitive values (or arrays of primitives) for logger attributes. */
export const requireLoggerPrimitiveAttributes = createRule<
	RuleOptions,
	MessageIds
>({
	name: "require-logger-primitive-attributes",
	meta: {
		type: "problem",
		docs: {
			description:
				"Require logger attribute values to be primitives or arrays of primitives.",
			recommended: true,
		},
		messages: {
			primitiveAttributeValue:
				'Attribute "{{key}}" must be a primitive or an array of primitives. Use a string, number, or boolean (or an array of those), or flatten nested data into separate attributes.',
		},
		schema: [
			{
				type: "object",
				properties: {
					...LOGGER_MATCHER_OPTION_SCHEMA_PROPERTIES,
					disallowUnknownAttributeValues: {
						description:
							"Reject expressions whose static value shape is unknown instead of allowing them as attribute values.",
						type: "boolean",
					},
				},
				additionalProperties: false,
			},
		],
		defaultOptions: [
			{
				...DEFAULT_LOGGER_MATCHER_OPTIONS,
				disallowUnknownAttributeValues: false,
			},
		],
	},
	create(context) {
		const sets = buildLoggerMatcherSets(context.options[0]);

		return {
			CallExpression(node) {
				const args = getLoggerArguments(node, sets);
				if (!args) return;

				const entries = collectAttrsEntries(args.attrsArg);
				if (!entries) return;

				for (const entry of entries) {
					if (isDisallowedAttributeValue(entry.valueNode, context.options[0])) {
						context.report({
							node: entry.valueNode,
							messageId: "primitiveAttributeValue",
							data: { key: entry.key },
						});
					}
				}
			},
		};
	},
});
