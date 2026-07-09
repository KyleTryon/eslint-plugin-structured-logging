import { RuleTester } from "@typescript-eslint/rule-tester";
import { afterAll, describe, it } from "vite-plus/test";

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

export const ruleTester = new RuleTester({
	languageOptions: {
		parserOptions: {
			projectService: {
				allowDefaultProject: ["*.ts"],
			},
		},
	},
});
