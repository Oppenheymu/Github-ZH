import { describe, expect, it } from "bun:test";
import { existsSync } from "node:fs";
import { join } from "node:path";
import packageJson from "../../package.json";
import manifestJson from "../../public/manifest.json";
import type {
	LocaleMessages,
	ManifestLike,
} from "./manifest.ts";
import {
	BUILD_OUTPUTS,
	extractI18nKeys,
	extractPlaceholders,
	loadLocaleMessages,
	readTextOrNull,
	validateLocales,
	validateManifest,
} from "./manifest.ts";

const rootDir = join(import.meta.dir, "..", "..");
const publicDir = join(rootDir, "public");
// 版本断言跟随 package.json，升版无需改测试
const packageVersion = packageJson.version;
/** 真实 _locales 目录：品牌文案门禁要按仓库里的实际消息校验 */
const shippedLocales = loadLocaleMessages(
	join(publicDir, "_locales"),
);
const options = {
	publicDir,
	rootDir,
	distDir: null,
	packageVersion,
	locales: shippedLocales.locales,
	popupHtml: readTextOrNull(join(publicDir, "popup.html")),
};

const validManifest: ManifestLike = {
	manifest_version: 3,
	default_locale: "en",
	name: "__MSG_appName__",
	version: packageVersion,
	description: "__MSG_appDesc__",
	permissions: ["storage"],
	icons: { "16": "icons/icon-16.png" },
	action: {
		default_popup: "popup.html",
		default_title: "__MSG_appName__",
	},
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

describe("extractPlaceholders", () => {
	it("collects every __MSG_key__ reference", () => {
		expect(
			extractPlaceholders("__MSG_appName__ / 汉化"),
		).toEqual(["appName"]);
		expect(
			extractPlaceholders("__MSG_a__ __MSG_a__"),
		).toEqual(["a", "a"]);
		expect(extractPlaceholders("plain")).toEqual([]);
	});
});

describe("loadLocaleMessages", () => {
	it("reads the shipped locale key sets", () => {
		expect(shippedLocales.errors).toEqual([]);
		expect(
			shippedLocales.locales.map((entry) => entry.locale),
		).toEqual(["en", "ja", "zh_CN"]);
	});

	it("reports a missing _locales directory", () => {
		const loaded = loadLocaleMessages(
			join(rootDir, "public", "__missing__"),
		);
		expect(loaded.errors).toHaveLength(1);
	});
});

describe("extractI18nKeys", () => {
	it("collects unique data-i18n keys in order", () => {
		expect(
			extractI18nKeys(
				'<h1 data-i18n="appName"></h1><p data-i18n="footer"></p><span data-i18n="appName"></span>',
			),
		).toEqual(["appName", "footer"]);
	});

	it("finds every key used by the shipped popup.html", () => {
		const keys = extractI18nKeys(options.popupHtml ?? "");
		expect(keys.length).toBeGreaterThan(5);
		const en = shippedLocales.locales.find(
			(entry) => entry.locale === "en",
		);
		for (const key of keys) {
			expect(en?.keys).toContain(key);
		}
	});
});

describe("validateLocales", () => {
	const en: LocaleMessages = {
		locale: "en",
		keys: ["appName", "devCopy"],
	};

	it("accepts identical key sets", () => {
		expect(
			validateLocales(
				[en, { locale: "ja", keys: [...en.keys] }],
				"en",
			),
		).toEqual([]);
	});

	it("reports missing and unknown keys", () => {
		const errors = validateLocales(
			[en, { locale: "ja", keys: ["appName", "extra"] }],
			"en",
		);
		expect(errors.length).toBe(2);
	});

	it("requires default_locale to exist", () => {
		expect(validateLocales([en], undefined)).toHaveLength(
			1,
		);
		expect(validateLocales([en], "de")).toHaveLength(1);
	});
});

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

	it("rejects a __MSG_ placeholder with no message behind it", () => {
		const errors = validateManifest(
			{ ...validManifest, name: "__MSG_nope__" },
			options,
		);
		expect(
			errors.some((error) =>
				error.includes("__MSG_nope__"),
			),
		).toBe(true);
	});

	it("requires default_locale once the brand uses __MSG_*__", () => {
		const { default_locale: _dropped, ...withoutDefault } =
			validManifest;
		const errors = validateManifest(
			withoutDefault,
			options,
		);
		expect(
			errors.some((error) =>
				error.includes("default_locale"),
			),
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
