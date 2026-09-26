import { describe, expect, it } from "bun:test";
import type { DictView } from "../../shared/types.ts";
import { translateText } from "../walker.ts";

const view: DictView = {
	entries: new Map([
		["Star", "星标"],
		["Fork", "复刻"],
		["Collaborators", "协作者"],
	]),
	aliases: new Map([
		// 上游把 Sign in with GitHub 改成 Sign in to GitHub 的场景
		["Sign in with GitHub", "Sign in to GitHub"],
		["Collaborators", "Collaborators"],
	]),
	rules: [
		{
			pattern: /^(\d+) minutes? ago$/,
			replacement: "$1 分钟前",
		},
		{ pattern: /^([\d,]+) Open$/, replacement: "$1 打开" },
	],
};

describe("translateText", () => {
	it("maps exact static entries", () => {
		expect(translateText("Star", view)).toBe("星标");
		expect(translateText("Fork", view)).toBe("复刻");
	});

	it("matches keys case-sensitively", () => {
		expect(translateText("star", view)).toBeNull();
	});

	it("falls back to the alias map when the direct lookup misses", () => {
		const aliased: DictView = {
			...view,
			entries: new Map([
				...view.entries,
				["Sign in to GitHub", "使用 GitHub 登录"],
			]),
		};
		expect(
			translateText("Sign in with GitHub", aliased),
		).toBe("使用 GitHub 登录");
		// 直查命中时不走别名：别名源与键同名时以直查译文为准
		expect(translateText("Star", aliased)).toBe("星标");
	});

	it("prefers a direct entry over an alias pointing at itself", () => {
		expect(translateText("Collaborators", view)).toBe(
			"协作者",
		);
	});

	it("applies the first matching regex rule", () => {
		expect(translateText("3 minutes ago", view)).toBe(
			"3 分钟前",
		);
		expect(translateText("1 minute ago", view)).toBe(
			"1 分钟前",
		);
		expect(translateText("128 Open", view)).toBe(
			"128 打开",
		);
	});

	it("collapses surrounding and inner whitespace before matching", () => {
		// GitHub React 页面的文本节点常带首尾空白与换行缩进
		expect(translateText("  Star  ", view)).toBe("星标");
		expect(translateText("3\n   minutes ago", view)).toBe(
			"3 分钟前",
		);
		expect(translateText("Fork\n            ", view)).toBe(
			"复刻",
		);
	});

	it("returns null when nothing matches", () => {
		expect(translateText("Unknown", view)).toBeNull();
	});

	it("skips text that fails the translatable check", () => {
		expect(translateText("已翻译", view)).toBeNull();
		expect(translateText("", view)).toBeNull();
		expect(translateText("a".repeat(501), view)).toBeNull();
	});

	it("prefers the static dictionary over rules", () => {
		const overlapping: DictView = {
			entries: new Map([["2 minutes ago", "两分钟前"]]),
			aliases: new Map(),
			rules: view.rules,
		};
		expect(
			translateText("2 minutes ago", overlapping),
		).toBe("两分钟前");
	});
});
