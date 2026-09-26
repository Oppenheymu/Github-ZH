// src/dict/locales.ts 的纯函数测试。
//
// 为什么单独测：resolveLocale 是「自动语言」体验的唯一入口——用户在 popup 里选
// 「自动」时，最终翻成哪种语言完全由它决定。它此前只有隐式覆盖（别的测试顺带
// import 了 LOCALES 常量），而 zh-Hans-CN / zh_TW / en-US 这类真实浏览器标签
// 的归属从来没有被断言过。
import { describe, expect, it } from "bun:test";
import {
	FALLBACK_LOCALE,
	getLocaleMeta,
	isLocaleId,
	LOCALES,
	type LocaleId,
	resolveLocale,
} from "../locales.ts";

describe("isLocaleId", () => {
	it("accepts only the declared locale ids", () => {
		expect(isLocaleId("zh-CN")).toBe(true);
		expect(isLocaleId("ja")).toBe(true);
		// 下划线写法是浏览器标签的常见形态，但不是本项目的语言 id
		expect(isLocaleId("zh_CN")).toBe(false);
		expect(isLocaleId("en")).toBe(false);
		expect(isLocaleId("")).toBe(false);
		expect(isLocaleId(123)).toBe(false);
		expect(isLocaleId(null)).toBe(false);
		expect(isLocaleId(undefined)).toBe(false);
	});
});

describe("resolveLocale", () => {
	it("matches ids case-insensitively and tolerates underscores", () => {
		expect(resolveLocale("zh-cn")).toBe("zh-CN");
		expect(resolveLocale("zh_CN")).toBe("zh-CN");
		expect(resolveLocale("JA")).toBe("ja");
		expect(resolveLocale("  ja  ")).toBe("ja");
	});

	it("falls back to the primary language subtag", () => {
		expect(resolveLocale("ja-JP")).toBe("ja");
		expect(resolveLocale("zh-Hans-CN")).toBe("zh-CN");
		expect(resolveLocale("zh-TW")).toBe("zh-CN");
		expect(resolveLocale("zh-Hant-HK")).toBe("zh-CN");
	});

	it("returns the fallback locale for unknown or empty tags", () => {
		expect(resolveLocale("en-US")).toBe(FALLBACK_LOCALE);
		expect(resolveLocale("de")).toBe(FALLBACK_LOCALE);
		expect(resolveLocale("")).toBe(FALLBACK_LOCALE);
		expect(resolveLocale("   ")).toBe(FALLBACK_LOCALE);
	});

	it("always returns a declared locale id", () => {
		for (const tag of [
			"",
			"en",
			"ja-JP",
			"zh-TW",
			"xx-YY",
			"ZH_hant_TW",
		]) {
			expect(isLocaleId(resolveLocale(tag))).toBe(true);
		}
	});
});

describe("getLocaleMeta", () => {
	it("returns the declared metadata", () => {
		expect(getLocaleMeta("zh-CN").name).toBe("简体中文");
		expect(getLocaleMeta("ja").scripts).toEqual([
			"Han",
			"Hiragana",
			"Katakana",
		]);
	});

	it("throws for an id that is not declared", () => {
		// 类型上不可能传入未声明的 id；这里模拟配置脱节（例如 registry 里多了一种语言）
		expect(() => getLocaleMeta("fr" as LocaleId)).toThrow(
			"未声明的语言",
		);
	});

	it("declares a script for every locale that needs one", () => {
		// 拉丁语系目标允许 scripts 为空（与源语言同字系，无从判定）；
		// 当前两种语言都必须声明，否则门禁的译文形态校验会整段失效
		for (const meta of LOCALES) {
			expect(meta.scripts.length).toBeGreaterThan(0);
		}
	});
});
