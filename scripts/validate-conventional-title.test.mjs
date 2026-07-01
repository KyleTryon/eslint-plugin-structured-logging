import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";

const root = path.resolve(fileURLToPath(import.meta.url), "../..");
const script = path.join(root, "scripts/validate-conventional-title.mjs");

function validateTitle(...args) {
	return spawnSync(process.execPath, [script, ...args], {
		cwd: root,
		encoding: "utf8",
	});
}

describe("validate-conventional-title", () => {
	test.each([
		"feat: add rule",
		"fix(logger): include parser options",
		"docs: update usage docs",
		"perf(rules): optimize build",
		"chore: update tooling",
		"chore(deps): update dependencies",
		"feat!: remove deprecated config",
		"feat(logger)!: remove deprecated option",
	])("accepts %s", (title) => {
		expect(validateTitle(title).status).toBe(0);
	});

	test.each([
		"feature: add rule",
		"feat:",
		"feat: add rule\n",
		"feat: add rule\ninvalid trailer",
	])("rejects %s", (title) => {
		const result = validateTitle(title);

		expect(result.status).toBe(1);
		expect(result.stderr).toContain("Invalid title:");
	});

	test("reads the first line from --file", () => {
		const directory = mkdtempSync(
			path.join(tmpdir(), "structured-logging-eslint-title-"),
		);
		const filePath = path.join(directory, "COMMIT_EDITMSG");

		try {
			writeFileSync(filePath, "fix: update config\n\nbody");

			expect(validateTitle("--file", filePath).status).toBe(0);
		} finally {
			rmSync(directory, { force: true, recursive: true });
		}
	});

	test("requires a file path after --file", () => {
		const result = validateTitle("--file");

		expect(result.status).toBe(1);
		expect(result.stderr).toContain("Missing file path after --file.");
	});
});
