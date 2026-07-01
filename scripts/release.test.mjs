import { spawnSync } from "node:child_process";
import {
	chmodSync,
	mkdtempSync,
	mkdirSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";

const root = path.resolve(fileURLToPath(import.meta.url), "../..");
const script = path.join(root, "scripts/release.mjs");

function run(command, args, options) {
	const result = spawnSync(command, args, {
		encoding: "utf8",
		...options,
	});

	if (result.status !== 0) {
		throw new Error(
			[
				`${command} ${args.join(" ")} failed`,
				result.stdout,
				result.stderr,
			].join("\n"),
		);
	}

	return result;
}

function writePackageJson(filePath, json) {
	writeFileSync(filePath, `${JSON.stringify(json, null, "\t")}\n`);
}

function createReleaseFixture() {
	const directory = mkdtempSync(
		path.join(tmpdir(), "structured-logging-eslint-release-"),
	);
	const binDirectory = path.join(directory, "bin");

	mkdirSync(binDirectory);

	writeFileSync(
		path.join(binDirectory, "pnpm"),
		'#!/usr/bin/env sh\nprintf \'%s\\n\' "$@" >> "$PNPM_CALLS"\n',
	);
	chmodSync(path.join(binDirectory, "pnpm"), 0o755);

	writePackageJson(path.join(directory, "package.json"), {
		name: "@techsquidtv/eslint-plugin-structured-logging",
		version: "1.0.0",
	});

	run("git", ["init"], { cwd: directory });
	run("git", ["config", "user.email", "release-test@example.com"], {
		cwd: directory,
	});
	run("git", ["config", "user.name", "Release Test"], { cwd: directory });
	run("git", ["add", "."], { cwd: directory });
	run("git", ["commit", "-m", "chore: initial setup"], {
		cwd: directory,
	});
	run("git", ["tag", "-a", "v1.0.0", "-m", "release"], {
		cwd: directory,
	});

	return { binDirectory, directory };
}

function commitAll(directory, message) {
	writeFileSync(path.join(directory, "change.txt"), `${message}\n`);
	run("git", ["add", "."], { cwd: directory });
	run("git", ["commit", "-m", message], { cwd: directory });
}

function releaseDryRun(fixture) {
	return spawnSync(process.execPath, [script, "--dry-run"], {
		cwd: fixture.directory,
		encoding: "utf8",
		env: {
			...process.env,
			PATH: `${fixture.binDirectory}${path.delimiter}${process.env.PATH}`,
			PNPM_CALLS: path.join(fixture.directory, "pnpm-calls.txt"),
		},
	});
}

describe("release", () => {
	test("patches the package for docs changes", () => {
		const fixture = createReleaseFixture();

		try {
			commitAll(fixture.directory, "docs: update usage docs");

			const result = releaseDryRun(fixture);

			expect(result.status).toBe(0);
			expect(result.stdout).toContain(
				"@techsquidtv/eslint-plugin-structured-logging: 1.0.0 -> 1.0.1 (patch)",
			);
		} finally {
			rmSync(fixture.directory, { force: true, recursive: true });
		}
	});

	test("patches from legacy scoped package tags", () => {
		const fixture = createReleaseFixture();

		try {
			run("git", ["tag", "-d", "v1.0.0"], { cwd: fixture.directory });
			run(
				"git",
				[
					"tag",
					"-a",
					"@techsquidtv/eslint-plugin-structured-logging@1.0.0",
					"-m",
					"release",
				],
				{
					cwd: fixture.directory,
				},
			);
			commitAll(fixture.directory, "docs: update usage docs");

			const result = releaseDryRun(fixture);

			expect(result.status).toBe(0);
			expect(result.stdout).toContain(
				"@techsquidtv/eslint-plugin-structured-logging: 1.0.0 -> 1.0.1 (patch)",
			);
		} finally {
			rmSync(fixture.directory, { force: true, recursive: true });
		}
	});

	test("fails instead of silently skipping malformed release commits", () => {
		const fixture = createReleaseFixture();

		try {
			commitAll(fixture.directory, "Merge pull request #1 from branch");

			const result = releaseDryRun(fixture);

			expect(result.status).toBe(1);
			expect(result.stderr).toContain(
				"Release commits must use Conventional Commit subjects.",
			);
		} finally {
			rmSync(fixture.directory, { force: true, recursive: true });
		}
	});
});
