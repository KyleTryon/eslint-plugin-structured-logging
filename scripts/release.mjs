#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const dryRun = process.argv.includes("--dry-run");
const root = process.cwd();

const pkg = {
	name: "@techsquidtv/eslint-plugin-structured-logging",
	directory: ".",
};

const allowedTypes = [
	"build",
	"chore",
	"ci",
	"docs",
	"feat",
	"fix",
	"perf",
	"refactor",
	"style",
	"test",
];

const releaseTypes = new Map([
	["docs", "patch"],
	["feat", "minor"],
	["fix", "patch"],
	["perf", "patch"],
]);

const bumpOrder = ["none", "patch", "minor", "major"];

function run(command, args, options = {}) {
	return execFileSync(command, args, {
		cwd: root,
		encoding: "utf8",
		stdio: options.stdio ?? "pipe",
	});
}

function tryRun(command, args) {
	try {
		return run(command, args).trim();
	} catch {
		return "";
	}
}

function getPackageJson() {
	const filePath = path.join(root, pkg.directory, "package.json");
	return {
		filePath,
		json: JSON.parse(readFileSync(filePath, "utf8")),
		original: readFileSync(filePath, "utf8"),
	};
}

function parseVersion(version) {
	const match = /^(\d+)\.(\d+)\.(\d+)(?:-.+)?$/.exec(version);
	if (!match) {
		throw new Error(`Unsupported semver version: ${version}`);
	}
	return match.slice(1).map(Number);
}

function bumpVersion(version, bump) {
	const [major, minor, patch] = parseVersion(version);
	switch (bump) {
		case "major":
			return `${major + 1}.0.0`;
		case "minor":
			return `${major}.${minor + 1}.0`;
		case "patch":
			return `${major}.${minor}.${patch + 1}`;
		default:
			return version;
	}
}

function maxBump(current, next) {
	return bumpOrder.indexOf(next) > bumpOrder.indexOf(current) ? next : current;
}

function compareVersions(a, b) {
	const [aMajor, aMinor, aPatch] = parseVersion(a);
	const [bMajor, bMinor, bPatch] = parseVersion(b);

	if (aMajor !== bMajor) return aMajor - bMajor;
	if (aMinor !== bMinor) return aMinor - bMinor;
	return aPatch - bPatch;
}

function parseVersionFromTag(tag) {
	if (tag.startsWith("v")) {
		return tag.slice(1);
	}

	const scopedPrefix = `${pkg.name}@`;
	if (tag.startsWith(scopedPrefix)) {
		return tag.slice(scopedPrefix.length);
	}

	throw new Error(`Unsupported release tag: ${tag}`);
}

function getLastTag() {
	const tags = [`v*`, `${pkg.name}@*`]
		.map((pattern) =>
			tryRun("git", ["describe", "--tags", "--match", pattern, "--abbrev=0"]),
		)
		.filter(Boolean);

	if (tags.length === 0) {
		return "";
	}

	return tags.reduce((latest, tag) =>
		compareVersions(parseVersionFromTag(tag), parseVersionFromTag(latest)) >= 0
			? tag
			: latest,
	);
}

function getHeadSha() {
	return run("git", ["rev-parse", "HEAD"]).trim();
}

function getCommitsSince(tag) {
	const range = tag ? `${tag}..HEAD` : "HEAD";
	const output = tryRun("git", ["log", range, "--format=%H%x1f%s%x1f%b%x1e"]);

	return output
		.split("\x1e")
		.map((entry) => entry.trim())
		.filter(Boolean)
		.map((entry) => {
			const [hash, subject, body = ""] = entry.split("\x1f");
			return { hash, subject, body };
		});
}

function parseCommit(commit) {
	const match = /^(\w+)(?:\(([^)]+)\))?(!)?: (.+)$/.exec(commit.subject);
	if (!match) return null;

	const [, type, , bang, summary] = match;
	const breaking = Boolean(bang) || /BREAKING CHANGE:/m.test(commit.body);

	if (!allowedTypes.includes(type)) {
		return null;
	}

	return { type, breaking, summary };
}

function validateReleaseCommits(commits) {
	const invalidCommits = new Map();

	for (const commit of commits) {
		if (!parseCommit(commit)) {
			invalidCommits.set(commit.hash, commit.subject);
		}
	}

	if (invalidCommits.size === 0) {
		return;
	}

	const details = [...invalidCommits]
		.map(([hash, subject]) => `- ${hash.slice(0, 7)} ${subject}`)
		.join("\n");

	throw new Error(
		[
			"Release commits must use Conventional Commit subjects.",
			"Fix the merge/squash commit subject before publishing:",
			details,
		].join("\n"),
	);
}

function getReleasePlan() {
	const packageJson = getPackageJson();
	const lastTag = getLastTag();
	const commits = getCommitsSince(lastTag);
	let bump = "none";
	const releaseNotes = [];

	for (const commit of commits) {
		const parsed = parseCommit(commit);
		if (!parsed) continue;

		const commitBump = parsed.breaking
			? "major"
			: (releaseTypes.get(parsed.type) ?? "none");

		bump = maxBump(bump, commitBump);
		if (commitBump !== "none") {
			releaseNotes.push(`- ${parsed.summary} (${commit.hash.slice(0, 7)})`);
		}
	}

	const currentVersion = lastTag
		? parseVersionFromTag(lastTag)
		: packageJson.json.version;

	validateReleaseCommits(commits);

	return {
		...pkg,
		...packageJson,
		bump,
		currentVersion,
		commits,
		nextVersion: bumpVersion(currentVersion, bump),
		releaseNotes,
	};
}

function writeReleasePackageJson(plan) {
	plan.json.version = plan.nextVersion;
	writeFileSync(plan.filePath, `${JSON.stringify(plan.json, null, "\t")}\n`);
}

function restorePackageJson(plan) {
	writeFileSync(plan.filePath, plan.original);
}

function getPublishedGitHead(plan) {
	return tryRun("npm", ["view", `${plan.name}@${plan.nextVersion}`, "gitHead"]);
}

function assertPublishedFromHead(plan, headSha) {
	const gitHead = getPublishedGitHead(plan);

	if (!gitHead) {
		return false;
	}

	if (gitHead !== headSha) {
		throw new Error(
			`${plan.name}@${plan.nextVersion} already exists on npm from ${gitHead}, not ${headSha}.`,
		);
	}

	return true;
}

function publishPackage(plan, headSha) {
	if (!dryRun && assertPublishedFromHead(plan, headSha)) {
		console.log(
			`${plan.name}@${plan.nextVersion} already exists on npm from this commit; skipping publish.`,
		);
		return;
	}

	const args = [
		"publish",
		"--access",
		"public",
		"--provenance",
		"--no-git-checks",
	];

	if (dryRun) args.push("--dry-run");

	run("pnpm", args, { stdio: "inherit" });
}

function tagRelease(plan, headSha) {
	const tag = `v${plan.nextVersion}`;
	const existingTagSha = tryRun("git", ["rev-list", "-n", "1", tag]);

	if (existingTagSha) {
		if (existingTagSha !== headSha) {
			throw new Error(
				`${tag} already exists at ${existingTagSha}, not ${headSha}.`,
			);
		}

		console.log(`${tag} already points at this commit; skipping tag.`);
		return;
	}

	const notes = [
		`${plan.name}@${plan.nextVersion}`,
		"",
		...plan.releaseNotes,
	].join("\n");

	run("git", ["tag", "-a", tag, "-m", notes], { stdio: "inherit" });
}

const plan = getReleasePlan();

if (plan.bump === "none") {
	console.log("No release found from Conventional Commits.");
	process.exit(0);
}

const headSha = getHeadSha();

console.log("Release plan:");
console.log(
	`- ${plan.name}: ${plan.currentVersion} -> ${plan.nextVersion} (${plan.bump})`,
);

try {
	writeReleasePackageJson(plan);
	publishPackage(plan, headSha);

	if (!dryRun) {
		tagRelease(plan, headSha);
		run("git", ["push", "--follow-tags"], { stdio: "inherit" });
	}
} finally {
	restorePackageJson(plan);
}
