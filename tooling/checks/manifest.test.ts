import { describe, expect, it } from "bun:test";
import { existsSync } from "node:fs";
import { join } from "node:path";
import packageJson from "../../package.json";
import manifestJson from "../../public/manifest.json";
import type { ManifestLike } from "./manifest.ts";
import {
	BUILD_OUTPUTS,
	validateManifest,
} from "./manifest.ts";

const rootDir = join(import.meta.dir, "..", "..");
// 版本断言跟随 package.json，升版无需改测试
const packageVersion = packageJson.version;
const options = {
	publicDir: join(rootDir, "public"),
	rootDir,
	distDir: null,
	packageVersion,
};

const validManifest: ManifestLike = {
	manifest_version: 3,
	name: "GitHub 汉化",
	version: packageVersion,
	description: "测试描述",
	permissions: ["storage"],
	icons: { "16": "icons/icon-16.png" },
	action: { default_popup: "popup.html" },
	content_scripts: [
		{
			matches: [
				"https://github.com/*",
				"https://gist.github.com/*",
			],
			js: ["content.js"],
			run_at: "document_start",
		},
	],
};

describe("validateManifest", () => {
	it("accepts a complete MV3 manifest", () => {
		expect(
			validateManifest(validManifest, options),
		).toEqual([]);
	});

	it("rejects MV2 and version drift with package.json", () => {
		const errors = validateManifest(
			{
				...validManifest,
				manifest_version: 2,
				version: "9.9.9",
			},
			options,
		);
		expect(errors.length).toBe(2);
	});

	it("requires the storage permission", () => {
		const errors = validateManifest(
			{ ...validManifest, permissions: [] },
			options,
		);
		expect(
			errors.some((error) => error.includes("storage")),
		).toBe(true);
	});

	it("requires github matches and document_start", () => {
		const errors = validateManifest(
			{
				...validManifest,
				content_scripts: [
					{
						matches: ["https://example.com/*"],
						js: ["content.js"],
						run_at: "document_idle",
					},
				],
			},
			options,
		);
		expect(errors.length).toBe(3);
	});

	it("rejects js outputs missing from the build mapping", () => {
		const errors = validateManifest(
			{
				...validManifest,
				content_scripts: [
					{
						...validManifest.content_scripts?.[0],
						js: ["mystery.js"],
					},
				],
			},
			options,
		);
		expect(
			errors.some((error) => error.includes("mystery.js")),
		).toBe(true);
	});

	it("accepts the shipped public/manifest.json", () => {
		expect(
			validateManifest(
				manifestJson as ManifestLike,
				options,
			),
		).toEqual([]);
	});

	it("maps both build outputs to existing source entries", () => {
		expect(Object.keys(BUILD_OUTPUTS).sort()).toEqual([
			"content.js",
			"popup.js",
		]);
		for (const source of Object.values(BUILD_OUTPUTS)) {
			expect(existsSync(join(rootDir, source))).toBe(true);
		}
	});
});
