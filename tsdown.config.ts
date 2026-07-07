import { defineConfig } from "tsdown";

export default defineConfig({
	dts: true,
	entry: [
		"src/index.ts",
		"src/utils.ts",
		"src/rules/index.ts",
		"src/rules/logger/require-logger-inline-attributes.ts",
		"src/rules/logger/require-logger-message.ts",
		"src/rules/logger/require-logger-primitive-attributes.ts",
		"src/rules/logger/require-logger-scoped-dot-notation.ts",
		"src/rules/logger/utils.ts",
	],
	fixedExtension: false,
	outDir: "lib",
	unbundle: true,
});
