import { AST_NODE_TYPES, type TSESTree } from "@typescript-eslint/utils";
import { parse } from "@typescript-eslint/parser";
import { describe, expect, test } from "vite-plus/test";

import {
	buildLoggerMatcherSets,
	getLoggerArguments,
	isLoggerCall,
} from "@/rules/logger/utils";

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

function parseCallExpression(code: string): TSESTree.CallExpression {
	const program = parse(code, {
		ecmaVersion: "latest",
		sourceType: "module",
	});
	const [statement] = program.body;

	if (statement.type !== AST_NODE_TYPES.ExpressionStatement) {
		throw new TypeError("Expected an expression statement.");
	}

	const expression =
		statement.expression.type === AST_NODE_TYPES.ChainExpression
			? statement.expression.expression
			: statement.expression;

	if (expression.type !== AST_NODE_TYPES.CallExpression) {
		throw new TypeError("Expected a call expression.");
	}

	return expression;
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

	test("matches configured object paths and custom level methods", () => {
		expect(
			isLoggerCall(parseCallExpression(`app.logger.notice("msg");`), {
				allowedLoggerObjects: ["app.logger"],
				levelMethods: ["notice"],
			}),
		).toBe(true);
	});

	test("matches string-literal bracket level methods", () => {
		expect(isLoggerCall(parseCallExpression(`logger["info"]("msg");`))).toBe(
			true,
		);
	});

	test("matches dynamic level methods unless configured to ignore them", () => {
		const node = parseCallExpression(`logger[level]("msg");`);

		expect(isLoggerCall(node)).toBe(true);
		expect(isLoggerCall(node, { ignoreDynamicLevelMethods: true })).toBe(false);
	});

	test("matches optional logger calls", () => {
		expect(isLoggerCall(parseCallExpression(`logger?.info("msg");`))).toBe(
			true,
		);
		expect(isLoggerCall(parseCallExpression(`logger.info?.("msg");`))).toBe(
			true,
		);
	});
});

describe("getLoggerArguments", () => {
	test("uses attributes-first argument positions for configured object paths", () => {
		const node = parseCallExpression(
			`app.logger.info({ "request.id": requestId }, "request.received");`,
		);

		const args = getLoggerArguments(
			node,
			buildLoggerMatcherSets({
				allowedLoggerObjects: ["app.logger"],
				attributesFirstLoggerObjects: ["app.logger"],
			}),
		);

		expect(args?.attrsArg?.type).toBe(AST_NODE_TYPES.ObjectExpression);
		expect(args?.messageArg).toMatchObject({
			type: AST_NODE_TYPES.Literal,
			value: "request.received",
		});
	});
});
