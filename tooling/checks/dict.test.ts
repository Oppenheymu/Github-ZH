import { describe, expect, it } from "bun:test";
import { globalDict } from "../../src/dict/global.ts";
import { pageDicts } from "../../src/dict/index.ts";
import {
	findDuplicateKeys,
	validateEntries,
	validateGlobalDict,
	validatePageDict,
	validateRule,
} from "./dict.ts";

describe("validateRule", () => {
	it("accepts a well-formed rule", () => {
		const errors = validateRule(
			{
				pattern: /^(\d+) minutes? ago$/,
				replacement: "$1 分钟前",
			},
			"测试",
		);
		expect(errors).toEqual([]);
	});

	it("rejects g / y flags (stateful lastIndex)", () => {
		const errors = validateRule(
			{ pattern: /x/g, replacement: "替换" },
			"测试",
		);
		expect(
			errors.some((error) => error.includes("g / y")),
		).toBe(true);
	});

	it("requires CJK in the replacement", () => {
		const errors = validateRule(
			{ pattern: /^a$/, replacement: "b" },
			"测试",
		);
		expect(
			errors.some((error) => error.includes("CJK")),
		).toBe(true);
	});

	it("rejects CJK inside the pattern source", () => {
		const errors = validateRule(
			{ pattern: /中文/, replacement: "替换" },
			"测试",
		);
		expect(errors.length).toBeGreaterThan(0);
	});
});

describe("validateEntries", () => {
	it("accepts valid translations", () => {
		const errors = validateEntries(
			{ Star: "星标", Fork: "复刻" },
			"测试",
		);
		expect(errors).toEqual([]);
	});

	it("rejects CJK keys and non-CJK values", () => {
		// 中文键：违反「键不得含 CJK」与「键不含拉丁字母」两条
		const errors = validateEntries(
			{ 中文键: "值", English: "no cjk" },
			"测试",
		);
		expect(errors.length).toBe(3);
	});

	it("rejects empty values and letterless keys", () => {
		const errors = validateEntries(
			{ Empty: "", "123": "数字" },
			"测试",
		);
		expect(errors.length).toBeGreaterThanOrEqual(2);
	});
});

describe("validatePageDict", () => {
	it("accepts a well-formed page module", () => {
		const errors = validatePageDict(
			{
				route: /^\/owner\/repo/,
				entries: { Code: "代码" },
				rules: [],
			},
			"测试",
		);
		expect(errors).toEqual([]);
	});

	it("rejects unanchored or flagged routes", () => {
		const flagged = validatePageDict(
			{ route: /^\/a/i, entries: {}, rules: [] },
			"测试",
		);
		expect(flagged.length).toBe(1);
		const unanchored = validatePageDict(
			{ route: /owner/, entries: {}, rules: [] },
			"测试",
		);
		expect(unanchored.length).toBe(1);
	});
});

describe("findDuplicateKeys", () => {
	it("finds duplicated entry keys in dict source", () => {
		const source = [
			"export const x = {",
			"\tentries: {",
			'\t\t"A": "甲",',
			'\t\t"B": "乙",',
			'\t\t"A": "丙",',
			"\t},",
			"};",
		].join("\n");
		expect(findDuplicateKeys(source)).toEqual(["A"]);
	});

	it("ignores non-entry lines", () => {
		const source = [
			'\trules: [{ pattern: /^a$/, replacement: "替换" }],',
			'\t\t"Only": "唯一",',
		].join("\n");
		expect(findDuplicateKeys(source)).toEqual([]);
	});
});

describe("real dictionaries", () => {
	it("passes all validators against shipped data", () => {
		expect(
			validateGlobalDict(globalDict, "global"),
		).toEqual([]);
		for (const dict of pageDicts) {
			expect(
				validatePageDict(dict, dict.route.source),
			).toEqual([]);
		}
	});
});
