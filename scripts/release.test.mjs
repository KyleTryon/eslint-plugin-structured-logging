import { spawnSync } from "node:child_process";
import {
	chmodSync,
	mkdtempSync,
	mkdirSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vite-plus/test";

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

function createReleaseFixture(version = "1.0.0") {
	const directory = mkdtempSync(
		path.join(tmpdir(), "structured-logging-eslint-release-"),
	);
	const remoteDirectory = `${directory}-remote.git`;
	const binDirectory = path.join(directory, "bin");

	mkdirSync(binDirectory);

	writeFileSync(
		path.join(binDirectory, "vp"),
		[
			"#!/usr/bin/env sh",
			'printf \'vp %s\\n\' "$*" >> "$RELEASE_CALLS"',
			"",
		].join("\n"),
	);
	chmodSync(path.join(binDirectory, "vp"), 0o755);

	writeFileSync(
		path.join(binDirectory, "npm"),
		[
			"#!/usr/bin/env sh",
			'printf \'npm %s\\n\' "$*" >> "$RELEASE_CALLS"',
			'if [ "$1" = "view" ]; then exit 0; fi',
			'if [ "$1" = "publish" ]; then printf \'%s\\n\' "$@" >> "$NPM_CALLS"; exit 0; fi',
			"exit 1",
			"",
		].join("\n"),
	);
	chmodSync(path.join(binDirectory, "npm"), 0o755);

	writeFileSync(
		path.join(binDirectory, "gh"),
		[
			"#!/usr/bin/env sh",
			'printf \'%s\\n\' "$*" >> "$GH_CALLS"',
			'if [ "$1" = "release" ] && [ "$2" = "view" ]; then exit 1; fi',
			'if [ "$1" = "release" ] && [ "$2" = "create" ]; then exit 0; fi',
			"exit 1",
			"",
		].join("\n"),
	);
	chmodSync(path.join(binDirectory, "gh"), 0o755);

	writePackageJson(path.join(directory, "package.json"), {
		name: "@techsquidtv/eslint-plugin-structured-logging",
		version,
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
	run("git", ["branch", "-M", "main"], { cwd: directory });
	run("git", ["tag", "-a", `v${version}`, "-m", "release"], {
		cwd: directory,
	});
	run("git", ["init", "--bare", remoteDirectory]);
	run("git", ["remote", "add", "origin", remoteDirectory], { cwd: directory });
	run("git", ["push", "-u", "origin", "main", "--follow-tags"], {
		cwd: directory,
	});

	return { binDirectory, directory, remoteDirectory };
}

function removeReleaseFixture(fixture) {
	rmSync(fixture.directory, { force: true, recursive: true });
	rmSync(fixture.remoteDirectory, { force: true, recursive: true });
}

function commitAll(directory, message) {
	writeFileSync(path.join(directory, "change.txt"), `${message}\n`);
	run("git", ["add", "."], { cwd: directory });
	run("git", ["commit", "-m", message], { cwd: directory });
}

function release(fixture, args = []) {
	return spawnSync(process.execPath, [script, ...args], {
		cwd: fixture.directory,
		encoding: "utf8",
		env: {
			...process.env,
			PATH: `${fixture.binDirectory}${path.delimiter}${process.env.PATH}`,
			GH_CALLS: path.join(fixture.directory, "gh-calls.txt"),
			NPM_CALLS: path.join(fixture.directory, "npm-calls.txt"),
			RELEASE_CALLS: path.join(fixture.directory, "release-calls.txt"),
		},
	});
}

function releaseDryRun(fixture) {
	return release(fixture, ["--dry-run"]);
}

function getReleaseCalls(fixture) {
	return readFileSync(path.join(fixture.directory, "release-calls.txt"), "utf8")
		.trim()
		.split("\n");
}

function expectBuildBeforePublish(fixture) {
	const releaseCalls = getReleaseCalls(fixture);
	const buildIndex = releaseCalls.indexOf("vp pack");
	const publishIndex = releaseCalls.findIndex((call) =>
		call.startsWith("npm publish"),
	);

	expect(buildIndex).toBeGreaterThanOrEqual(0);
	expect(publishIndex).toBeGreaterThan(buildIndex);
}

function getGitHubCalls(fixture) {
	return readFileSync(path.join(fixture.directory, "gh-calls.txt"), "utf8")
		.trim()
		.split("\n");
}

describe("release", () => {
	test("keeps breaking pre-1 releases on the minor track", () => {
		const fixture = createReleaseFixture("0.0.0");

		try {
			commitAll(fixture.directory, "feat(logger)!: require dotted log names");

			const result = releaseDryRun(fixture);

			expect(result.status).toBe(0);
			expect(result.stdout).toContain(
				"@techsquidtv/eslint-plugin-structured-logging: 0.0.0 -> 0.1.0 (minor)",
			);
			expectBuildBeforePublish(fixture);
		} finally {
			removeReleaseFixture(fixture);
		}
	});

	test("patches the package for docs changes", () => {
		const fixture = createReleaseFixture();

		try {
			commitAll(fixture.directory, "docs: update usage docs");

			const result = releaseDryRun(fixture);

			expect(result.status).toBe(0);
			expect(result.stdout).toContain(
				"@techsquidtv/eslint-plugin-structured-logging: 1.0.0 -> 1.0.1 (patch)",
			);
			expectBuildBeforePublish(fixture);
		} finally {
			removeReleaseFixture(fixture);
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
			expectBuildBeforePublish(fixture);
		} finally {
			removeReleaseFixture(fixture);
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
			removeReleaseFixture(fixture);
		}
	});

	test("creates a GitHub release after publishing", () => {
		const fixture = createReleaseFixture();

		try {
			commitAll(fixture.directory, "fix: publish release notes");

			const result = release(fixture);

			expect(result.status).toBe(0);
			expect(result.stdout).toContain("Release notes:");
			expect(result.stdout).toContain("- publish release notes");
			expectBuildBeforePublish(fixture);
			const gitHubCalls = getGitHubCalls(fixture).join("\n");
			expect(gitHubCalls).toContain(
				"release view v1.0.1 --json tagName --jq .tagName",
			);
			expect(gitHubCalls).toContain(
				"release create v1.0.1 --verify-tag --title @techsquidtv/eslint-plugin-structured-logging@1.0.1 --notes @techsquidtv/eslint-plugin-structured-logging@1.0.1",
			);
			expect(gitHubCalls).toContain("- publish release notes");
		} finally {
			removeReleaseFixture(fixture);
		}
	});
});
