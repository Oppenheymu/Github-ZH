import { describe, expect, it } from "bun:test";
import {
	dictCore,
	dictForLocale,
} from "../../dict/index.ts";
import { LOCALES } from "../../dict/locales.ts";
import type { LocaleDict } from "../../shared/types.ts";
import { buildView, matchModules } from "../view.ts";

const zh = dictForLocale("zh-CN");

/** 语言无关的别名映射：运行时与门禁都从 core 的数据里取，这里同样显式传入 */
const aliases: ReadonlyMap<string, string> = new Map(
	Object.entries(dictCore.aliases),
);

const routes = (pathname: string) =>
	matchModules(pathname, zh.modules).map(
		(module) => module.name,
	);

describe("matchModules", () => {
	it("matches dashboard, profile and repo pages exclusively", () => {
		// 每个 pathname 都会命中 global 兜底（route 为 ^/），故数量为「具体模块 + 1」
		expect(routes("/")).toEqual([
			"pages/dashboard",
			"global",
		]);
		expect(routes("/torvalds")).toEqual([
			"pages/profile",
			"global",
		]);
		expect(routes("/owner/repo")).toEqual([
			"pages/repo",
			"global",
		]);
	});

	it("layers specific modules over the repo module", () => {
		expect(routes("/owner/repo/issues")).toEqual([
			"pages/issues",
			"pages/repo",
			"global",
		]);
		expect(routes("/owner/repo/pull/12")).toEqual([
			"pages/pulls",
			"pages/repo",
			"global",
		]);
		expect(routes("/settings/profile")).toEqual([
			"pages/settings",
			"pages/repo",
			"global",
		]);
	});

	it("keeps global last so that specific pages win", () => {
		for (const pathname of [
			"/",
			"/owner/repo",
			"/owner/repo/issues",
			"/settings/profile",
		]) {
			const matched = routes(pathname);
			expect(matched.at(-1)).toBe("global");
		}
	});
});

describe("buildView", () => {
	it("falls back to global entries on any path", () => {
		const view = buildView("/owner/repo", zh, aliases);
		expect(view.entries.get("Skip to content")).toBe(
			"跳到主要内容",
		);
	});

	it("only merges entries from matching page modules", () => {
		const issues = buildView(
			"/owner/repo/issues",
			zh,
			aliases,
		);
		expect(issues.entries.get("Close issue")).toBe(
			"关闭议题",
		);
		expect(
			issues.entries.get("Conversation"),
		).toBeUndefined();
		const pulls = buildView(
			"/owner/repo/pull/3",
			zh,
			aliases,
		);
		expect(pulls.entries.get("Files changed")).toBe(
			"文件变更",
		);
		expect(
			pulls.entries.get("Close issue"),
		).toBeUndefined();
	});

	it("keeps dashboard entries off repo pages", () => {
		const dashboard = buildView("/", zh, aliases);
		expect(dashboard.entries.get("Home")).toBe("主页");
		const repo = buildView("/owner/repo", zh, aliases);
		expect(repo.entries.get("Home")).toBeUndefined();
		expect(repo.entries.get("Code")).toBe("代码");
	});

	it("gives page entries priority over global with first-wins merge", () => {
		const dict: LocaleDict = {
			locale: "zh-CN",
			modules: [
				{
					name: "pages/a",
					route: /^\/a/,
					entries: { Base: "页面优先", OnlyA: "甲" },
					rules: [{ pattern: /^x$/, replacement: "页面X" }],
				},
				{
					name: "global",
					route: /^\//,
					entries: { Base: "全局兜底" },
					rules: [
						{ pattern: /^now$/, replacement: "全局刚刚" },
					],
				},
			],
		};
		const onA = buildView("/a", dict, aliases);
		expect(onA.entries.get("Base")).toBe("页面优先");
		expect(onA.rules[0]?.replacement).toBe("页面X");
		const elsewhere = buildView("/b", dict, aliases);
		expect(elsewhere.entries.get("Base")).toBe("全局兜底");
		expect(elsewhere.entries.get("OnlyA")).toBeUndefined();
		expect(elsewhere.rules).toHaveLength(1);
	});

	it("exposes the alias map on every view", () => {
		const view = buildView("/owner/repo", zh, aliases);
		expect(view.aliases).toBeInstanceOf(Map);
		expect(view.aliases).toBe(aliases);
	});

	it("covers every declared locale with a dictionary", () => {
		for (const meta of LOCALES) {
			expect(dictForLocale(meta.id).modules.length).toBe(
				zh.modules.length,
			);
		}
	});
});
