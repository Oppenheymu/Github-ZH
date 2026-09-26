import { describe, expect, it } from "bun:test";
import {
	buildLabels,
	describeUpdate,
	diffLabels,
	type LabelSpec,
	type LabelState,
	parseLabelState,
	readSpecs,
} from "./labels.ts";

const spec = (
	name: string,
	color = "d73a4a",
	description = "描述",
): LabelSpec => ({ name, color, description });

const state = (
	name: string,
	color = "d73a4a",
	description = "描述",
): LabelState => ({ name, color, description });

describe("buildLabels", () => {
	it("normalizes colors to lowercase", () => {
		const specs = buildLabels(
			[
				{
					name: "类型:缺陷",
					color: "D73A4A",
					description: "d",
				},
			],
			"t",
		);
		expect(specs).toEqual([
			spec("类型:缺陷", "d73a4a", "d"),
		]);
	});

	it("rejects a non-array root", () => {
		expect(() => buildLabels({ name: "x" }, "t")).toThrow(
			"顶层必须是标签数组",
		);
	});

	it("rejects an empty list", () => {
		expect(() => buildLabels([], "t")).toThrow("不能为空");
	});

	it("rejects unknown fields", () => {
		expect(() =>
			buildLabels(
				[
					{
						name: "a",
						color: "ffffff",
						description: "d",
						colour: "f",
					},
				],
				"t",
			),
		).toThrow("未知字段");
	});

	it("rejects a name with surrounding whitespace", () => {
		expect(() =>
			buildLabels(
				[{ name: " a", color: "ffffff", description: "d" }],
				"t",
			),
		).toThrow("首尾不得有空白");
	});

	it("rejects names longer than 50 characters", () => {
		expect(() =>
			buildLabels(
				[
					{
						name: "a".repeat(51),
						color: "ffffff",
						description: "d",
					},
				],
				"t",
			),
		).toThrow("超过 GitHub 上限 50");
	});

	it("rejects a non-string color (unquoted YAML scalar)", () => {
		expect(() =>
			buildLabels(
				[{ name: "a", color: 123456, description: "d" }],
				"t",
			),
		).toThrow("必须是字符串（词表里请加引号）");
	});

	it("rejects a color with a leading #", () => {
		expect(() =>
			buildLabels(
				[{ name: "a", color: "#ffffff", description: "d" }],
				"t",
			),
		).toThrow("6 位十六进制且不带 #");
	});

	it("rejects descriptions longer than 100 characters", () => {
		expect(() =>
			buildLabels(
				[
					{
						name: "a",
						color: "ffffff",
						description: "d".repeat(101),
					},
				],
				"t",
			),
		).toThrow("超过 GitHub 上限 100");
	});

	it("rejects duplicate names case-insensitively", () => {
		expect(() =>
			buildLabels(
				[
					{
						name: "Bug",
						color: "ffffff",
						description: "d",
					},
					{
						name: "bug",
						color: "ffffff",
						description: "d",
					},
				],
				"t",
			),
		).toThrow("标签名重复");
	});
});

describe("parseLabelState", () => {
	it("maps a null description to an empty string", () => {
		const states = parseLabelState(
			[{ name: "bug", color: "D73A4A", description: null }],
			"t",
		);
		expect(states).toEqual([state("bug", "d73a4a", "")]);
	});

	it("rejects a non-array root", () => {
		expect(() => parseLabelState({}, "t")).toThrow(
			"必须是数组",
		);
	});

	it("rejects a non-string description", () => {
		expect(() =>
			parseLabelState(
				[{ name: "bug", color: "ffffff", description: 1 }],
				"t",
			),
		).toThrow("必须是字符串或 null");
	});
});

describe("diffLabels", () => {
	it("separates create, update and unchanged", () => {
		const diff = diffLabels(
			[spec("a"), spec("b", "00ff00"), spec("c")],
			[state("b"), state("c")],
		);
		expect(diff.create.map((item) => item.name)).toEqual([
			"a",
		]);
		expect(
			diff.update.map((item) => item.spec.name),
		).toEqual(["b"]);
		expect(diff.unchanged.map((item) => item.name)).toEqual(
			["c"],
		);
	});

	it("treats a description change as an update", () => {
		const diff = diffLabels(
			[spec("a", "d73a4a", "新描述")],
			[state("a", "d73a4a", "旧描述")],
		);
		expect(diff.update).toHaveLength(1);
		expect(diff.unchanged).toHaveLength(0);
	});

	it("matches names case-insensitively and reports a rename", () => {
		const diff = diffLabels([spec("Bug")], [state("bug")]);
		expect(diff.create).toHaveLength(0);
		expect(diff.prune).toEqual([]);
		expect(
			diff.update.map((item) => describeUpdate(item)),
		).toEqual(["改名 bug → Bug"]);
	});

	it("lists remote-only labels under prune", () => {
		const diff = diffLabels(
			[spec("a")],
			[state("a"), state("z")],
		);
		expect(diff.prune).toEqual(["z"]);
	});

	it("does not prune a matched label", () => {
		const diff = diffLabels([spec("a")], [state("a")]);
		expect(diff.prune).toEqual([]);
		expect(diff.create).toHaveLength(0);
	});
});

describe("describeUpdate", () => {
	it("collects every changed field", () => {
		const text = describeUpdate({
			actual: state("a", "000000", "旧"),
			spec: spec("a", "ffffff", "新"),
		});
		expect(text).toBe("色 000000 → ffffff，描述");
	});
});

describe("labels.yml", () => {
	it("parses the real vocabulary", () => {
		const specs = readSpecs();
		expect(specs.length).toBeGreaterThan(0);
		for (const dimension of [
			"类型",
			"范围",
			"语言",
			"状态",
		]) {
			expect(
				specs.some((item) =>
					item.name.startsWith(`${dimension}:`),
				),
			).toBe(true);
		}
	});
});
