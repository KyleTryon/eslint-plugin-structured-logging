import { spawnSync } from "node:child_process";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import { Linter } from "eslint";
import { describe, expect, test } from "vite-plus/test";

const root = path.resolve(fileURLToPath(import.meta.url), "../..");
const pluginName = "@techsquidtv/structured-logging";

function packPackage() {
	const result = spawnSync("vp", ["pack"], {
		cwd: root,
		encoding: "utf8",
	});

	if (result.status !== 0) {
		throw new Error(
			["vp pack failed", result.stdout.trim(), result.stderr.trim()].join("\n"),
		);
	}
}

async function importBuiltPlugin() {
	const builtEntryUrl = pathToFileURL(path.join(root, "lib/index.js"));
	const builtModule = await import(`${builtEntryUrl.href}?smoke=${Date.now()}`);

	return builtModule.default;
}

describe("built package", () => {
	test("can be consumed by ESLint flat config", async () => {
		packPackage();

		const builtPlugin = await importBuiltPlugin();
		const linter = new Linter({ configType: "flat" });

		const messages = linter.verify(
			`logger.info(\`Checkout \${checkoutId}\`, { checkoutId });`,
			[builtPlugin.configs.recommended],
			{ filename: "checkout.js" },
		);

		expect(messages).toMatchObject([
			{
				messageId: "messageMustBeText",
				ruleId: `${pluginName}/require-logger-message`,
				severity: 1,
			},
			{
				messageId: "dottedSnakeCaseAttributeKey",
				ruleId: `${pluginName}/require-logger-scoped-dot-notation`,
				severity: 1,
			},
		]);
	});
});
