import { describe, expect, it } from "bun:test";
import { globalDict } from "../dict/global.ts";
import { pageDicts } from "../dict/index.ts";
import type {
	GlobalDict,
	PageDict,
} from "../shared/types.ts";
import { buildView, matchPageModules } from "./pages.ts";

const routes = (pathname: string) =>
	matchPageModules(pathname, pageDicts).map(
		(dict) => dict.route.source,
	);

describe("matchPageModules", () => {
	it("matches dashboard, profile and repo pages exclusively", () => {
		expect(routes("/")).toHaveLength(1);
		expect(routes("/torvalds")).toHaveLength(1);
		expect(routes("/owner/repo")).toHaveLength(1);
	});

	it("layers specific modules over the repo module", () => {
		expect(routes("/owner/repo/issues")).toHaveLength(2);
		expect(routes("/owner/repo/pull/12")).toHaveLength(2);
		expect(routes("/settings/profile")).toHaveLength(2);
	});

	it("does not match unrelated subpaths", () => {
		expect(routes("/owner")).toHaveLength(1);
		expect(routes("/features")).toHaveLength(1);
	});
});

describe("buildView", () => {
	it("falls back to global entries on any path", () => {
		const view = buildView(
			"/owner/repo",
			globalDict,
			pageDicts,
		);
		expect(view.entries.get("Skip to content")).toBe(
			"跳到主要内容",
		);
	});

	it("only merges entries from matching page modules", () => {
		const issues = buildView(
			"/owner/repo/issues",
			globalDict,
			pageDicts,
		);
		expect(issues.entries.get("Close issue")).toBe(
			"关闭议题",
		);
		expect(
			issues.entries.get("Conversation"),
		).toBeUndefined();
		const pulls = buildView(
			"/owner/repo/pull/3",
			globalDict,
			pageDicts,
		);
		expect(pulls.entries.get("Files changed")).toBe(
			"文件变更",
		);
		expect(
			pulls.entries.get("Close issue"),
		).toBeUndefined();
	});

	it("keeps dashboard entries off repo pages", () => {
		const dashboard = buildView("/", globalDict, pageDicts);
		expect(dashboard.entries.get("Home")).toBe("主页");
		const repo = buildView(
			"/owner/repo",
			globalDict,
			pageDicts,
		);
		expect(repo.entries.get("Home")).toBeUndefined();
		expect(repo.entries.get("Code")).toBe("代码");
	});

	it("gives page entries priority over global with first-wins merge", () => {
		const global: GlobalDict = {
			entries: { Base: "全局兜底" },
			rules: [
				{ pattern: /^now$/, replacement: "全局刚刚" },
			],
		};
		const modules: PageDict[] = [
			{
				route: /^\/a/,
				entries: { Base: "页面优先", OnlyA: "甲" },
				rules: [{ pattern: /^x$/, replacement: "页面X" }],
			},
		];
		const onA = buildView("/a", global, modules);
		expect(onA.entries.get("Base")).toBe("页面优先");
		expect(onA.rules[0]?.replacement).toBe("页面X");
		const elsewhere = buildView("/b", global, modules);
		expect(elsewhere.entries.get("Base")).toBe("全局兜底");
		expect(elsewhere.entries.get("OnlyA")).toBeUndefined();
		expect(elsewhere.rules).toHaveLength(1);
	});
});
