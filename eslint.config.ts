import eslint from "@eslint/js";
import eslintPlugin from "eslint-plugin-eslint-plugin";
import vitest from "@vitest/eslint-plugin";
import { defineConfig, globalIgnores } from "eslint/config";
import tseslint from "typescript-eslint";

export default defineConfig(
	globalIgnores(
		["**/*.snap", "**/coverage", "**/lib", "node_modules", "pnpm-lock.yaml"],
		"Global Ignores",
	),
	{ linterOptions: { reportUnusedDisableDirectives: "error" } },
	{
		extends: [
			eslint.configs.recommended,
			tseslint.configs.strictTypeChecked,
			tseslint.configs.stylisticTypeChecked,
		],
		files: ["**/*.{js,ts}"],
		languageOptions: {
			parserOptions: {
				projectService: {
					allowDefaultProject: ["*.config.*s"],
				},
			},
		},
	},
	{
		extends: [eslintPlugin.configs.recommended],
		files: ["src/**/*.ts"],
	},
	{
		extends: [vitest.configs.recommended],
		files: ["**/*.test.*"],
		rules: { "@typescript-eslint/no-unsafe-assignment": "off" },
	},
	{
		files: ["**/*.test.{js,ts}"],
		settings: { vitest: { typecheck: true } },
	},
);
