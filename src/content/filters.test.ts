import { describe, expect, it } from "bun:test";
import {
	EXCLUDE_SELECTOR,
	hasCJK,
	isTranslatableText,
} from "./filters.ts";

describe("hasCJK", () => {
	it("detects Han characters", () => {
		expect(hasCJK("汉化")).toBe(true);
		expect(hasCJK("mixed 中 text")).toBe(true);
	});

	it("rejects text without Han characters", () => {
		expect(hasCJK("english only")).toBe(false);
		expect(hasCJK("123 !@#")).toBe(false);
		expect(hasCJK("")).toBe(false);
	});
});

describe("isTranslatableText", () => {
	it("accepts plain UI text", () => {
		expect(isTranslatableText("Pull requests")).toBe(true);
	});

	it("judges on trimmed content", () => {
		expect(isTranslatableText("   Star  ")).toBe(true);
	});

	it("rejects empty or whitespace-only text", () => {
		expect(isTranslatableText("")).toBe(false);
		expect(isTranslatableText("   \n\t ")).toBe(false);
	});

	it("rejects text already containing CJK", () => {
		expect(isTranslatableText("已合并")).toBe(false);
		expect(isTranslatableText("merged 已合并")).toBe(false);
	});

	it("rejects overlong text (likely code or user content)", () => {
		expect(isTranslatableText("a".repeat(501))).toBe(false);
		expect(isTranslatableText("a".repeat(500))).toBe(true);
	});

	it("rejects text without latin letters (numbers / symbols)", () => {
		expect(isTranslatableText("123")).toBe(false);
		expect(isTranslatableText("+-*/")).toBe(false);
	});
});

describe("EXCLUDE_SELECTOR", () => {
	it("guards the essential code and user-content containers", () => {
		const selectors = EXCLUDE_SELECTOR.split(",");
		for (const required of [
			"code",
			"pre",
			"textarea",
			".markdown-body",
			".highlight",
			".blob-code",
			".diff-table",
		]) {
			expect(selectors).toContain(required);
		}
	});
});
