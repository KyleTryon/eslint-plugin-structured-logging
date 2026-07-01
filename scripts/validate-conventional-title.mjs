#!/usr/bin/env node

import { readFileSync } from "node:fs";

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

function getTitle() {
	const [, , firstArg, secondArg] = process.argv;

	if (firstArg === "--file") {
		if (!secondArg) {
			throw new Error("Missing file path after --file.");
		}

		return readFileSync(secondArg, "utf8").split(/\r?\n/, 1)[0] ?? "";
	}

	return process.argv.slice(2).join(" ");
}

function fail(title) {
	console.error("Invalid title:");
	console.error(`  ${title}`);
	console.error("");
	console.error("Titles must use Conventional Commits:");
	console.error("  <type>[(<scope>)][!]: <description>");
	console.error("");
	console.error(`Allowed types: ${allowedTypes.join(", ")}.`);
	console.error("");
	console.error("Examples:");
	console.error("  feat: add no-foo rule");
	console.error("  fix(logger): include parser options");
	console.error("  chore: update tooling");
}

const title = getTitle();
const pattern = new RegExp(
	`^(${allowedTypes.join("|")})(\\([^)]+\\))?!?: [^\\r\\n]+$(?![\\s\\S])`,
);

if (!pattern.test(title)) {
	fail(title);
	process.exit(1);
}
