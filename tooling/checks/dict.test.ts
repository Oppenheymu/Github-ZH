import { describe, expect, it } from "bun:test";
import {
	buildGlobalDict,
	buildPageDict,
} from "../../src/dict/load.ts";
import { getLocaleMeta } from "../../src/dict/locales.ts";
import {
	globalRawDict,
	pageRawModules,
} from "../../src/dict/registry.ts";
import {
	buildAll,
	validateAll,
	validateDict,
	validateEntries,
	validateNoIdentity,
	validateRule,
	validateRulesRematch,
} from "./dict.ts";

/** 复数 zh / ja 的语言声明（校验逻辑必须靠声明，而不是硬编码汉字） */
const ZH = getLocaleMeta("zh-CN");
const JA = getLocaleMeta("ja");

/** 一个合法页面模块的最小形态，反例在其上做单点破坏 */
const validPage = () => ({
	$schema: "../../dict.schema.json",
	route: "^/owner/repo/issues",
	entries: { "Close issue": "关闭议题" },
	rules: [
		{
			pattern: "^(\\d+) minutes? ago$",
			replacement: "$1 分钟前",
		},
	],
});

describe("validateRule", () => {
	it("accepts a well-formed rule", () => {
		const errors = validateRule(
			{
				pattern: /^(\d+) minutes? ago$/,
				replacement: "$1 分钟前",
			},
			"测试",
			ZH,
		);
		expect(errors).toEqual([]);
	});

	it("requires the target script in the replacement", () => {
		const errors = validateRule(
			{ pattern: /^a$/, replacement: "b" },
			"测试",
			ZH,
		);
		expect(
			errors.some((error) => error.includes("文字系统")),
		).toBe(true);
	});

	it("accepts pure kana replacements for japanese", () => {
		// 汉字判定会拒掉这条，语言声明判定必须放行
		const errors = validateRule(
			{ pattern: /^See more$/, replacement: "もっと見る" },
			"测试",
			JA,
		);
		expect(errors).toEqual([]);
	});

	it("rejects non-latin letters inside the pattern source", () => {
		const errors = validateRule(
			{ pattern: /中文/, replacement: "替换" },
			"测试",
			ZH,
		);
		expect(errors.length).toBeGreaterThan(0);
	});
});

describe("validateEntries", () => {
	it("accepts valid translations", () => {
		const errors = validateEntries(
			{ Star: "星标", Fork: "复刻" },
			"测试",
			ZH,
		);
		expect(errors).toEqual([]);
	});

	it("rejects non-latin keys and scriptless values", () => {
		// 中文键：违反「键不得含非拉丁字母」与「键不含拉丁字母」两条
		const errors = validateEntries(
			{ 中文键: "值", English: "no cjk" },
			"测试",
			ZH,
		);
		expect(errors.length).toBe(3);
	});

	it("rejects empty values and letterless keys", () => {
		const errors = validateEntries(
			{ Empty: "", "123": "数字" },
			"测试",
			ZH,
		);
		expect(errors.length).toBeGreaterThanOrEqual(2);
	});

	it("rejects keys with leading or trailing whitespace", () => {
		const errors = validateEntries(
			{ " Open": "打开", "Close ": "关闭" },
			"测试",
			ZH,
		).filter((error) => error.includes("首尾空白"));
		expect(errors).toHaveLength(2);
	});
});

describe("validateNoIdentity", () => {
	it("flags a translation that equals some key", () => {
		const errors = validateNoIdentity(
			{ Markdown: "Markdown" },
			"测试",
			new Set(["Markdown", "Star"]),
		);
		expect(errors).toHaveLength(1);
		expect(errors[0]).toContain("等于某个词典键");
	});

	it("ignores translations that are not keys", () => {
		const errors = validateNoIdentity(
			{ Star: "星标" },
			"测试",
			new Set(["Star"]),
		);
		expect(errors).toEqual([]);
	});
});

describe("validateRulesRematch", () => {
	it("flags a replacement that another rule would translate again", () => {
		const errors = validateRulesRematch(
			[
				{
					pattern: /^Much more$/,
					replacement: "5 stars",
				},
				{
					pattern: /^(\d+) stars$/,
					replacement: "$1 星标",
				},
			],
			"测试",
		);
		expect(errors).toHaveLength(1);
		expect(errors[0]).toContain("再次命中");
	});

	it("accepts replacements that no rule matches", () => {
		const errors = validateRulesRematch(
			[
				{
					pattern: /^(\d+) minutes? ago$/,
					replacement: "$1 分钟前",
				},
			],
			"测试",
		);
		expect(errors).toEqual([]);
	});
});

describe("buildPageDict", () => {
	it("compiles route and rules from JSONC shapes", () => {
		const dict = buildPageDict(validPage(), "测试");
		// 断言行为而非 source：RegExp#source 会把 / 转义成 \/（规范要求可用于字面量）
		expect(dict.route.test("/owner/repo/issues")).toBe(
			true,
		);
		expect(dict.route.test("/owner/repo/issues/12")).toBe(
			true,
		);
		expect(dict.route.test("/owner/repo/pulls")).toBe(
			false,
		);
		expect(dict.route.flags).toBe("");
		const rule = dict.rules[0];
		expect(rule?.pattern.test("5 minutes ago")).toBe(true);
		expect(rule?.pattern.test("5 minutes")).toBe(false);
		expect(dict.entries["Close issue"]).toBe("关闭议题");
	});

	it("rejects unknown top-level fields (typo silently empties a dict)", () => {
		expect(() =>
			buildPageDict(
				{ ...validPage(), entires: {} },
				"测试",
			),
		).toThrow(/未知字段/);
	});

	it("rejects a missing or unanchored route", () => {
		const { route: _route, ...withoutRoute } = validPage();
		expect(() =>
			buildPageDict(withoutRoute, "测试"),
		).toThrow(/route/);
		expect(() =>
			buildPageDict(
				{ ...validPage(), route: "[^/]+/issues" },
				"测试",
			),
		).toThrow(/\^\/ 锚定/);
	});

	it("rejects a pattern that cannot compile", () => {
		expect(() =>
			buildPageDict(
				{
					...validPage(),
					rules: [
						{ pattern: "(unclosed", replacement: "替换" },
					],
				},
				"测试",
			),
		).toThrow(/正则无法编译/);
	});

	it("rejects a rule carrying a flags field", () => {
		expect(() =>
			buildPageDict(
				{
					...validPage(),
					rules: [
						{
							pattern: "^a$",
							replacement: "甲",
							flags: "g",
						},
					],
				},
				"测试",
			),
		).toThrow(/flags/);
	});

	it("rejects non-string entry values", () => {
		expect(() =>
			buildPageDict(
				{
					...validPage(),
					entries: { Fork: 1 },
				},
				"测试",
			),
		).toThrow(/值必须是字符串/);
	});

	it("rejects a __proto__ entry key", () => {
		// 对象字面量里 "__proto__" 会被当成原型设置器，只能用 JSON.parse 构造真实输入
		const raw = JSON.parse(
			'{"route":"^/x","entries":{"__proto__":"值"},"rules":[]}',
		);
		expect(() => buildPageDict(raw, "测试")).toThrow(
			/__proto__/,
		);
	});
});

describe("buildGlobalDict", () => {
	it("accepts entries plus rules without a route", () => {
		const dict = buildGlobalDict(
			{ entries: { Star: "星标" }, rules: [] },
			"测试",
		);
		expect(dict.entries["Star"]).toBe("星标");
	});

	it("rejects a route on the global dict", () => {
		expect(() =>
			buildGlobalDict(
				{
					route: "^/x",
					entries: { Star: "星标" },
					rules: [],
				},
				"测试",
			),
		).toThrow(/未知字段/);
	});
});

describe("buildAll", () => {
	it("keeps good modules and reports every broken one", () => {
		const built = buildAll({
			global: { entries: { Star: "星标" }, rules: [] },
			pages: [
				["pages/ok", validPage()],
				["pages/broken", { ...validPage(), entires: {} }],
			],
		});
		expect(built.errors).toHaveLength(1);
		expect(built.errors[0]).toContain("未知字段");
		expect(built.pages).toHaveLength(1);
		expect(built.pages[0]?.[0]).toBe("pages/ok");
	});
});

describe("real dictionaries", () => {
	it("builds and validates against shipped data", () => {
		const built = buildAll({
			global: globalRawDict,
			pages: pageRawModules,
		});
		expect(built.errors).toEqual([]);
		expect(built.pages).toHaveLength(pageRawModules.length);
		expect(built.global).not.toBeNull();
		if (built.global !== null) {
			expect(
				validateDict(built.global, "global", ZH),
			).toEqual([]);
		}
		for (const [where, dict] of built.pages) {
			expect(validateDict(dict, where, ZH)).toEqual([]);
		}
		// 防循环结构门禁：现有数据实测 0 命中（译文≠键、译文再命中规则）
		expect(validateAll(built, ZH)).toEqual([]);
	});
});
