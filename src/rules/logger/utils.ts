import { AST_NODE_TYPES, TSESTree } from "@typescript-eslint/utils";

// ─── Constants ────────────────────────────────────────────────────────────────

/** Matches a single lowercase snake_case dotted-name segment. */
export const DOTTED_SNAKE_CASE_SEGMENT_RE = /^[a-z][a-z0-9_]*$/;

/**
 * Default logger severity methods matched as level calls. Covers the level
 * names shared by most structured loggers (pino, bunyan, and similar).
 * Libraries with extra levels (for example winston's `http`/`verbose`/`silly`)
 * can extend this set via the `levelMethods` rule option.
 */
const DEFAULT_LEVEL_METHODS = [
	"trace",
	"debug",
	"info",
	"warn",
	"error",
	"fatal",
];

/** Expression node shapes that are never valid primitive log attribute values. */
const NON_PRIMITIVE_NODE_TYPES = new Set<AST_NODE_TYPES>([
	AST_NODE_TYPES.ObjectExpression,
	AST_NODE_TYPES.ArrayExpression,
	AST_NODE_TYPES.FunctionExpression,
	AST_NODE_TYPES.ArrowFunctionExpression,
	AST_NODE_TYPES.ClassExpression,
]);

// ─── Shared option schema ─────────────────────────────────────────────────────

/** Shared JSON schema properties for rules that match logger calls. */
export const LOGGER_MATCHER_OPTION_SCHEMA_PROPERTIES = {
	allowedLoggerObjects: {
		description: "Fully-qualified logger object paths, such as `log.child`.",
		type: "array",
		items: { type: "string" },
	},
	allowedLoggerIdentifiers: {
		description: "Bare logger object identifiers accepted as logger callees.",
		type: "array",
		items: { type: "string" },
	},
	attributesFirstLoggerObjects: {
		description:
			"Logger object paths whose calls pass attributes before the message.",
		type: "array",
		items: { type: "string" },
	},
	attributesFirstLoggerIdentifiers: {
		description:
			"Logger identifiers whose calls pass attributes before the message.",
		type: "array",
		items: { type: "string" },
	},
	levelMethods: {
		description:
			"Method names treated as logger level calls, such as `info` or `error`.",
		type: "array",
		items: { type: "string" },
	},
	ignoreDynamicLevelMethods: {
		description:
			"Skip computed logger level methods such as `logger[level](...)` instead of matching them.",
		type: "boolean",
	},
} as const;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LoggerMatcherOptions {
	/** Fully-qualified logger object paths, such as `log.child`. */
	allowedLoggerObjects?: string[];
	/** Bare logger object identifiers accepted as logger callees. */
	allowedLoggerIdentifiers?: string[];
	/** Logger object paths whose calls pass attributes before the message. */
	attributesFirstLoggerObjects?: string[];
	/** Logger identifiers whose calls pass attributes before the message. */
	attributesFirstLoggerIdentifiers?: string[];
	/** Method names treated as logger level calls, such as `info` or `error`. */
	levelMethods?: string[];
	/** Skip computed logger level methods such as `logger[level](...)` instead of matching them. */
	ignoreDynamicLevelMethods?: boolean;
}

/**
 * Pre-built sets derived from {@link LoggerMatcherOptions}.
 * Construct once per file via {@link buildLoggerMatcherSets} in `create()` to
 * avoid re-allocating on every `CallExpression` node visit.
 */
export interface LoggerMatcherSets {
	/** Pre-built set for fully-qualified logger object paths. */
	allowedLoggerObjects: Set<string>;
	/** Pre-built set for bare logger object identifiers. */
	allowedLoggerIdentifiers: Set<string>;
	/** Pre-built set for object paths using attributes-first argument order. */
	attributesFirstLoggerObjects: Set<string>;
	/** Pre-built set for identifiers using attributes-first argument order. */
	attributesFirstLoggerIdentifiers: Set<string>;
	/** Pre-built set of method names treated as logger level calls. */
	levelMethods: Set<string>;
	/** Whether to skip computed logger level methods instead of matching them. */
	ignoreDynamicLevelMethods: boolean;
}

/** A statically-known key/value pair from an inline attributes object. */
export interface AttrEntry {
	/** Attribute key exactly as written, with literal keys normalized to strings. */
	key: string;
	/** AST node for the attribute key, used as the report and fix target. */
	keyNode: TSESTree.Node;
	/** AST expression for the attribute value. */
	valueNode: TSESTree.Expression;
}

/** Controls which malformed attribute shapes are reported while collecting. */
export interface CollectAttrsOptions {
	/** Report spreads and computed keys found inside inline attributes. */
	reportMalformedProperties?: boolean;
	/** Report non-object attributes arguments that cannot be statically checked. */
	reportNonLiteral?: boolean;
	/** Called when a reportable violation is found inside the attribute object. */
	report?: (
		node: TSESTree.Node,
		messageId: string,
		data?: Record<string, string>,
	) => void;
}

interface LoggerCallConfig {
	/** Zero-based index of the attributes argument for this logger call. */
	attributesArgumentIndex: number;
	/** Zero-based index of the message argument for this logger call. */
	messageArgumentIndex: number;
}

// ─── Logger matcher set helpers ───────────────────────────────────────────────

/** Default {@link LoggerMatcherOptions} shared across the logger rules. */
export const DEFAULT_LOGGER_MATCHER_OPTIONS: Required<LoggerMatcherOptions> = {
	allowedLoggerObjects: [],
	allowedLoggerIdentifiers: ["logger", "log"],
	attributesFirstLoggerObjects: [],
	attributesFirstLoggerIdentifiers: [],
	levelMethods: DEFAULT_LEVEL_METHODS,
	ignoreDynamicLevelMethods: false,
};

/**
 * Convert rule options into pre-built `Set`s. Call this once in `create()` so
 * sets are not rebuilt for every `CallExpression` in the linted file.
 *
 * Back-fills {@link DEFAULT_LOGGER_MATCHER_OPTIONS} for direct callers of
 * {@link isLoggerCall} that pass partial or omitted options; rule callers
 * already receive fully-resolved options from `meta.defaultOptions`.
 */
export function buildLoggerMatcherSets(
	options: LoggerMatcherOptions = {},
): LoggerMatcherSets {
	const resolved = { ...DEFAULT_LOGGER_MATCHER_OPTIONS, ...options };
	return {
		allowedLoggerObjects: new Set(resolved.allowedLoggerObjects),
		allowedLoggerIdentifiers: new Set(resolved.allowedLoggerIdentifiers),
		attributesFirstLoggerObjects: new Set(
			resolved.attributesFirstLoggerObjects,
		),
		attributesFirstLoggerIdentifiers: new Set(
			resolved.attributesFirstLoggerIdentifiers,
		),
		levelMethods: new Set(resolved.levelMethods),
		ignoreDynamicLevelMethods: resolved.ignoreDynamicLevelMethods,
	};
}

// ─── Internal AST helpers ─────────────────────────────────────────────────────

/**
 * Removes optional-chaining wrapper nodes so logger-call analysis can inspect
 * the underlying callee.
 */
function unwrapChainExpression(
	node: TSESTree.Node | null | undefined,
): TSESTree.Node | null | undefined {
	if (node?.type === AST_NODE_TYPES.ChainExpression) {
		return node.expression;
	}
	return node;
}

/**
 * Reads a statically-known member property name from dot or string-literal
 * bracket notation.
 */
function getStaticPropertyName(
	node: TSESTree.Node | null | undefined,
): string | null {
	if (node?.type !== AST_NODE_TYPES.MemberExpression) return null;
	if (!node.computed && node.property.type === AST_NODE_TYPES.Identifier) {
		return node.property.name;
	}
	if (
		node.computed &&
		node.property.type === AST_NODE_TYPES.Literal &&
		typeof node.property.value === "string"
	) {
		return node.property.value;
	}
	return null;
}

/**
 * Converts a non-computed member expression chain into a dotted path such as
 * `log.child`.
 */
function getMemberPath(node: TSESTree.Node | null | undefined): string | null {
	const segments: string[] = [];
	let current: TSESTree.Node | null | undefined = node;

	while (current) {
		if (current.type === AST_NODE_TYPES.Identifier) {
			segments.unshift(current.name);
			return segments.join(".");
		}

		if (current.type === AST_NODE_TYPES.MemberExpression && !current.computed) {
			// Non-computed member expressions (a.b) always have an Identifier property.
			// PrivateIdentifiers (#field) are not valid logger paths.
			if (current.property.type !== AST_NODE_TYPES.Identifier) return null;
			segments.unshift(current.property.name);
			current = current.object;
			continue;
		}

		return null;
	}

	return null;
}

/**
 * Matches a call expression against the configured logger objects and returns
 * its expected argument positions.
 */
function getLoggerCallConfig(
	node: TSESTree.Node | null | undefined,
	sets: LoggerMatcherSets,
): LoggerCallConfig | false {
	if (node?.type !== AST_NODE_TYPES.CallExpression) return false;

	const callee = unwrapChainExpression(node.callee);
	if (callee?.type !== AST_NODE_TYPES.MemberExpression) return false;

	const objectPath = getMemberPath(callee.object);
	const objectIdentifier =
		callee.object.type === AST_NODE_TYPES.Identifier
			? callee.object.name
			: null;

	const isAllowedLoggerObject =
		(objectPath !== null && sets.allowedLoggerObjects.has(objectPath)) ||
		(objectIdentifier !== null &&
			sets.allowedLoggerIdentifiers.has(objectIdentifier));

	if (!isAllowedLoggerObject) return false;

	const method = getStaticPropertyName(callee);
	const isLevelMethod = method
		? sets.levelMethods.has(method)
		: callee.computed && !sets.ignoreDynamicLevelMethods;

	if (!isLevelMethod) return false;

	const attributesFirst =
		(objectPath !== null &&
			sets.attributesFirstLoggerObjects.has(objectPath)) ||
		(objectIdentifier !== null &&
			sets.attributesFirstLoggerIdentifiers.has(objectIdentifier));

	return {
		attributesArgumentIndex: attributesFirst ? 0 : 1,
		messageArgumentIndex: attributesFirst ? 1 : 0,
	};
}

/**
 * Extracts a static object property key, rejecting computed keys that cannot be
 * checked safely by logger attribute rules.
 */
function getPropertyKey(prop: TSESTree.Property): string | null {
	if (prop.computed) return null;
	// Widen to TSESTree.Node to avoid over-narrowing of the discriminated union.
	const key = prop.key as TSESTree.Node;
	if (key.type === AST_NODE_TYPES.Identifier) return key.name;
	if (key.type === AST_NODE_TYPES.Literal) return String(key.value);
	return null;
}

// ─── Public helpers ───────────────────────────────────────────────────────────

/**
 * Convenience wrapper for external callers that don't pre-build sets.
 * Within this plugin's rules, prefer {@link getLoggerArguments} with
 * pre-built sets from {@link buildLoggerMatcherSets}.
 */
export function isLoggerCall(
	node: TSESTree.Node | null | undefined,
	options: LoggerMatcherOptions = {},
): boolean {
	return Boolean(getLoggerCallConfig(node, buildLoggerMatcherSets(options)));
}

/**
 * Returns the message and attributes arguments for a logger call, or `null`
 * if the node is not a recognised logger call. Use pre-built sets from
 * {@link buildLoggerMatcherSets} so sets are not reallocated per-node.
 */
export function getLoggerArguments(
	node: TSESTree.CallExpression,
	sets: LoggerMatcherSets,
): {
	attrsArg: TSESTree.Node | undefined;
	messageArg: TSESTree.Node | undefined;
} | null {
	const config = getLoggerCallConfig(node, sets);
	if (!config) return null;
	return {
		attrsArg: node.arguments[config.attributesArgumentIndex],
		messageArg: node.arguments[config.messageArgumentIndex],
	};
}

/**
 * Extracts key/value pairs from an attribute object literal.
 * Returns `null` when the node cannot be analysed (not an ObjectExpression).
 * Returns `[]` when there is no attributes argument at all.
 */
export function collectAttrsEntries(
	attrsNode: TSESTree.Node | null | undefined,
	options: CollectAttrsOptions = {},
): AttrEntry[] | null {
	if (!attrsNode) return [];

	const {
		reportMalformedProperties = false,
		reportNonLiteral = false,
		report,
	} = options;

	if (attrsNode.type !== AST_NODE_TYPES.ObjectExpression) {
		if (reportNonLiteral) {
			report?.(attrsNode, "nonInlineAttributes");
		}
		return null;
	}

	const entries: AttrEntry[] = [];

	for (const prop of attrsNode.properties) {
		if (prop.type === AST_NODE_TYPES.SpreadElement) {
			if (reportMalformedProperties) {
				report?.(prop, "noAttributeSpread");
			}
			continue;
		}

		// ObjectExpression.properties is Property | SpreadElement; after the
		// SpreadElement branch above, prop is always a Property here.
		const key = getPropertyKey(prop);
		if (!key) {
			if (reportMalformedProperties) {
				report?.(prop.key, "staticAttributeKeys");
			}
			continue;
		}

		entries.push({
			key,
			keyNode: prop.key,
			valueNode: prop.value as TSESTree.Expression,
		});
	}

	return entries;
}

// ─── Value-shape helpers ──────────────────────────────────────────────────────

/** Returns whether a node is a literal string, number, or boolean value. */
function isScalarLiteral(node: TSESTree.Node | null | undefined): boolean {
	return (
		node?.type === AST_NODE_TYPES.Literal &&
		(typeof node.value === "string" ||
			typeof node.value === "number" ||
			typeof node.value === "boolean")
	);
}

/**
 * Returns whether a node is a syntactic expression shape known to produce a
 * scalar log attribute without requiring type information.
 */
function isKnownScalarExpression(
	node: TSESTree.Node | null | undefined,
): boolean {
	return isScalarLiteral(node) || node?.type === AST_NODE_TYPES.TemplateLiteral;
}

/**
 * Returns whether a single (non-array) attribute value should be rejected as a
 * primitive log value.
 *
 * @remarks
 * Objects, arrays, functions, classes, and non-scalar literals are always
 * rejected. Unknown expressions are rejected only when
 * `disallowUnknownAttributeValues` is `true`.
 */
function isDisallowedPrimitiveValue(
	node: TSESTree.Node | null | undefined,
	options: { disallowUnknownAttributeValues?: boolean },
): boolean {
	if (node?.type !== undefined && NON_PRIMITIVE_NODE_TYPES.has(node.type))
		return true;
	if (node?.type === AST_NODE_TYPES.Literal) return !isScalarLiteral(node);
	return (
		options.disallowUnknownAttributeValues === true &&
		!isKnownScalarExpression(node)
	);
}

/**
 * Returns whether an attribute value should be rejected by primitive-value
 * rules.
 *
 * @remarks
 * Primitive values (string, number, boolean) are always allowed. Arrays are
 * allowed when every element is itself a primitive value, so arrays of scalars
 * such as `["a", "b"]` pass while nested arrays and arrays of objects do not.
 * Objects, functions, and classes are always rejected. Unknown expressions
 * (including array spreads) are rejected only when
 * `disallowUnknownAttributeValues` is `true`.
 */
export function isDisallowedAttributeValue(
	node: TSESTree.Node | null | undefined,
	options: { disallowUnknownAttributeValues?: boolean } = {},
): boolean {
	if (node?.type === AST_NODE_TYPES.ArrayExpression) {
		return node.elements.some((element) => {
			// Array holes (`[1, , 3]`) parse as null elements; treat them as empty.
			if (element === null) return false;
			if (element.type === AST_NODE_TYPES.SpreadElement) {
				return options.disallowUnknownAttributeValues === true;
			}
			return isDisallowedPrimitiveValue(element, options);
		});
	}
	return isDisallowedPrimitiveValue(node, options);
}

/**
 * Returns whether a candidate logger message is clearly not static text.
 *
 * @remarks
 * This intentionally returns `false` for a missing node so callers can report a
 * dedicated "message required" violation.
 */
export function isClearlyNotMessage(
	node: TSESTree.Node | null | undefined,
): boolean {
	if (!node) return false;
	return node.type !== AST_NODE_TYPES.Literal || typeof node.value !== "string";
}
