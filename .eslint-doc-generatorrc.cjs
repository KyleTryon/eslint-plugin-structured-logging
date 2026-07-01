const prettier = require("prettier");

/** @type {import("eslint-doc-generator").GenerateOptions} */
module.exports = {
	configEmoji: [
		["recommended", "✅"],
		["strict", "🔒"],
	],
	ruleDocNotices: ["description", "configs", "fixableAndHasSuggestions"],
	pathRuleDoc: "docs/rules/{name}.md",
	pathRuleList: "README.md",
	ruleDocSectionOptions: false,
	ruleListColumns: [
		"name",
		"description",
		"configsWarn",
		"configsError",
		"fixable",
	],
	postprocess: async (content, pathToFile) =>
		prettier.format(content, {
			...(await prettier.resolveConfig(pathToFile)),
			filepath: pathToFile,
		}),
};
