import { defineConfig } from "vitest/config";

export default defineConfig({
	resolve: {
		alias: {
			"@": new URL("./src", import.meta.url).pathname,
		},
	},
	test: {
		clearMocks: true,
		coverage: {
			include: ["src"],
			reporter: ["html", "lcov"],
		},
		exclude: ["lib", "node_modules"],
		setupFiles: ["console-fail-test/setup"],
	},
});
