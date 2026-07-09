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
	postprocess: async (content, pathToFile) => {
		const { format } = await import("vite-plus/fmt");
		const result = await format(pathToFile, content, {
			printWidth: 80,
			useTabs: true,
		});

		if (result.errors.length > 0) {
			throw new Error(result.errors.map((error) => error.message).join("\n"));
		}

		return result.code;
	},
};
