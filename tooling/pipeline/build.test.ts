import { describe, expect, it } from "bun:test";
import {
	diffArtifacts,
	expectedArtifacts,
} from "./build.ts";

describe("expectedArtifacts", () => {
	it("renames the content entry and keeps the popup entry", () => {
		expect([...expectedArtifacts()].sort()).toEqual([
			"content.js",
			"popup.js",
		]);
	});

	it("expects the entry name when no rename is registered", () => {
		// 新增入口却没加 OUTPUT_RENAMES 映射时，期望集合里是入口原名（bar.js），
		// diffArtifacts 会把它当成意料之外的产物报出来
		expect(
			[
				...expectedArtifacts([
					"src/content/index.ts",
					"src/foo/bar.ts",
				]),
			].sort(),
		).toEqual(["bar.js", "content.js"]);
	});
});

describe("diffArtifacts", () => {
	it("reports nothing when the artifact set matches", () => {
		expect(
			diffArtifacts(
				["content.js", "popup.js"],
				expectedArtifacts(),
			),
		).toEqual([]);
	});

	it("reports a missing artifact", () => {
		const problems = diffArtifacts(
			["popup.js"],
			expectedArtifacts(),
		);
		expect(problems).toHaveLength(1);
		expect(problems[0]).toContain("content.js");
	});

	it("reports an artifact that no entry asked for", () => {
		const problems = diffArtifacts(
			["content.js", "popup.js", "index.js"],
			expectedArtifacts(),
		);
		expect(problems).toHaveLength(1);
		expect(problems[0]).toContain("index.js");
	});
});
