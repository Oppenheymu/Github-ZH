import { describe, expect, it } from "bun:test";
import type { DictView } from "../../shared/types.ts";
import { translateText } from "../walker.ts";

const view: DictView = {
	entries: new Map([
		["Star", "星标"],
		["Fork", "复刻"],
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
			rules: view.rules,
		};
		expect(
			translateText("2 minutes ago", overlapping),
		).toBe("两分钟前");
	});
});
