// verify-live 纯函数用例：参数解析 / 页面清单解析 / 漏翻汇总

import { describe, expect, it } from "bun:test";
import type { MissItem } from "../src/shared/types.ts";
import {
	aggregateMisses,
	parseArgs,
	parsePagesFile,
} from "./verify-live.ts";

describe("parseArgs", () => {
	it("returns defaults without flags", () => {
		expect(parseArgs([])).toEqual({
			dwell: 11000,
			headed: false,
			keep: false,
		});
	});

	it("parses flags with values", () => {
		expect(
			parseArgs([
				"--out",
				"m.json",
				"--pages",
				"p.txt",
				"--dwell",
				"15000",
				"--headed",
				"--keep",
				"--browser",
				"msedge.exe",
			]),
		).toEqual({
			out: "m.json",
			pagesFile: "p.txt",
			dwell: 15000,
			headed: true,
			keep: true,
			browser: "msedge.exe",
		});
	});

	it("rejects unknown flags", () => {
		expect(() => parseArgs(["--wat"])).toThrow(
			"未知参数：--wat",
		);
	});

	it("rejects missing values", () => {
		expect(() => parseArgs(["--out"])).toThrow(
			"参数 --out 缺少取值",
		);
	});

	it("rejects dwell below 3000", () => {
		expect(() => parseArgs(["--dwell", "999"])).toThrow(
			"--dwell 需为不小于 3000 的整数毫秒",
		);
	});
});

describe("parsePagesFile", () => {
	it("keeps urls and skips comments and blanks", () => {
		expect(
			parsePagesFile(
				"# 清单\r\nhttps://github.com/trending\r\n\r\n  \nhttps://github.com/octocat\n# 结尾注释",
			),
		).toEqual([
			"https://github.com/trending",
			"https://github.com/octocat",
		]);
	});
});

describe("aggregateMisses", () => {
	const a = (over: Partial<MissItem>): MissItem => ({
		kind: "text",
		text: "A",
		path: "/a",
		count: 1,
		...over,
	});

	it("sums counts and keeps first path for same key", () => {
		const merged = aggregateMisses([
			[a({ count: 2 })],
			[
				a({ count: 3 }),
				a({ kind: "title", text: "B", path: "/b" }),
			],
		]);
		expect(merged).toEqual([
			a({ count: 5 }),
			a({ kind: "title", text: "B", path: "/b" }),
		]);
	});

	it("sorts by path ascending", () => {
		const merged = aggregateMisses([
			[a({ path: "/z" }), a({ text: "C", path: "/a" })],
		]);
		expect(merged.map((item) => item.path)).toEqual([
			"/a",
			"/z",
		]);
	});

	it("tolerates duplicate items within one page", () => {
		const merged = aggregateMisses([
			[a({ count: 1 }), a({ count: 1 })],
		]);
		expect(merged).toEqual([a({ count: 2 })]);
	});
});
