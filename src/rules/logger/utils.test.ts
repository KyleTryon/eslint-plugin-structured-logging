import { AST_NODE_TYPES, type TSESTree } from "@typescript-eslint/utils";
import { describe, expect, test } from "vite-plus/test";

import { isLoggerCall } from "@/rules/logger/utils";

function identifier(name: string): TSESTree.Identifier {
	return {
		type: AST_NODE_TYPES.Identifier,
		name,
	} as unknown as TSESTree.Identifier;
}

function member(
	object: TSESTree.Expression,
	property: string,
): TSESTree.MemberExpression {
	return {
		type: AST_NODE_TYPES.MemberExpression,
		object,
		property: identifier(property),
		computed: false,
		optional: false,
	} as unknown as TSESTree.MemberExpression;
}

function call(callee: TSESTree.Expression): TSESTree.CallExpression {
	return {
		type: AST_NODE_TYPES.CallExpression,
		callee,
		arguments: [],
		optional: false,
	} as unknown as TSESTree.CallExpression;
}

describe("isLoggerCall", () => {
	test("matches default logger level calls", () => {
		expect(isLoggerCall(call(member(identifier("logger"), "info")))).toBe(true);
	});

	test("returns false for non-call nodes and unknown loggers", () => {
		expect(isLoggerCall(null)).toBe(false);
		expect(isLoggerCall(call(member(identifier("console"), "log")))).toBe(
			false,
		);
	});
});
