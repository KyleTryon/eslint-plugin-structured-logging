import { ESLintUtils } from "@typescript-eslint/utils";

export interface StructuredLoggingPluginDocs {
	description: string;
	recommended?: boolean;
}

export const createRule = ESLintUtils.RuleCreator<StructuredLoggingPluginDocs>(
	(name) =>
		`https://github.com/KyleTryon/eslint-plugin-structured-logging/tree/main/docs/rules/${name}.md`,
);
