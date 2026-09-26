// manifest 门禁：MV3 字段完整性 / matches / 资产与产物引用存在性 /
// _locales 与 __MSG_*__ 占位符一致性
// 校验逻辑导出为纯函数供测试复用；失败置 exitCode = 1

import {
	existsSync,
	readdirSync,
	readFileSync,
} from "node:fs";
import { join } from "node:path";
import packageJson from "../../package.json";
import manifestJson from "../../public/manifest.json";

/** 校验用松散类型（真实 manifest 由 JSON 推断类型，测试手工构造缺字段场景） */
export interface ManifestLike {
	manifest_version?: number;
	default_locale?: string;
	name?: string;
	version?: string;
	description?: string;
	permissions?: readonly string[];
	icons?: Readonly<Record<string, string>>;
	action?: {
		default_popup?: string;
		default_title?: string;
	};
	content_scripts?: readonly {
		matches?: readonly string[];
		js?: readonly string[];
		run_at?: string;
	}[];
}

/** 产物文件 → 源码入口映射（改产物名时同步 build.ts 与 public/manifest.json） */
export const BUILD_OUTPUTS: Readonly<
	Record<string, string>
> = {
	"content.js": "src/content/index.ts",
	"popup.js": "src/popup/popup.ts",
};

export interface ValidateOptions {
	/** public/ 目录（静态资产基准） */
	publicDir: string;
	/** 仓库根（BUILD_OUTPUTS 的源码路径基准） */
	rootDir: string;
	/** dist/ 目录；null 表示尚未构建，跳过产物存在性断言 */
	distDir: string | null;
	packageVersion: string;
	/** public/_locales 下各语言的消息键集合（由 loadLocaleMessages 读取） */
	locales: readonly LocaleMessages[];
	/** popup.html 源码；null 表示读不到，跳过 data-i18n 键校验 */
	popupHtml: string | null;
}

/** popup.html 里的 data-i18n="key" 引用 */
const I18N_ATTR = /data-i18n="([A-Za-z0-9_@]+)"/g;

/** 取出 popup.html 引用的全部 i18n 消息键（去重，保持出现顺序） */
export function extractI18nKeys(html: string): string[] {
	const keys: string[] = [];
	for (const match of html.matchAll(I18N_ATTR)) {
		const key = match[1];
		if (key !== undefined && !keys.includes(key))
			keys.push(key);
	}
	return keys;
}

/** 读取文本文件；不存在或读失败返回 null（由调用方转成门禁错误） */
export function readTextOrNull(
	path: string,
): string | null {
	try {
		return readFileSync(path, "utf8");
	} catch {
		return null;
	}
}

/** 一个语言目录的消息键集合（tooling 侧读取 public/_locales/<locale>/messages.json） */
export interface LocaleMessages {
	/** 目录名，即 Chrome 的 locale 标识（en / zh_CN / ja） */
	readonly locale: string;
	readonly keys: readonly string[];
}

/** manifest 里 __MSG_key__ 形式的占位符 */
const PLACEHOLDER = /__MSG_([A-Za-z0-9_@]+)__/g;

/** 取出一个 manifest 字段里引用的全部 __MSG_key__（无则空数组） */
export function extractPlaceholders(
	value: string,
): string[] {
	const keys: string[] = [];
	for (const match of value.matchAll(PLACEHOLDER)) {
		const key = match[1];
		if (key !== undefined) keys.push(key);
	}
	return keys;
}

/**
 * 读取 public/_locales 下所有语言的消息键集合。
 * 目录不存在或文件不合法即记入 errors（品牌文案整套走 _locales，缺了就会显示成
 * 裸占位符或空白，必须在门禁里响亮失败）。
 */
export function loadLocaleMessages(localesDir: string): {
	locales: LocaleMessages[];
	errors: string[];
} {
	const errors: string[] = [];
	const locales: LocaleMessages[] = [];
	if (!existsSync(localesDir)) {
		return {
			locales,
			errors: [`_locales 目录不存在：${localesDir}`],
		};
	}
	for (const entry of readdirSync(localesDir, {
		withFileTypes: true,
	})) {
		if (!entry.isDirectory()) continue;
		const file = join(
			localesDir,
			entry.name,
			"messages.json",
		);
		if (!existsSync(file)) {
			errors.push(
				`_locales/${entry.name} 缺少 messages.json`,
			);
			continue;
		}
		let parsed: unknown;
		try {
			parsed = JSON.parse(readFileSync(file, "utf8"));
		} catch (error) {
			errors.push(
				`_locales/${entry.name}/messages.json 无法解析：${String(error)}`,
			);
			continue;
		}
		if (
			typeof parsed !== "object" ||
			parsed === null ||
			Array.isArray(parsed)
		) {
			errors.push(
				`_locales/${entry.name}/messages.json 必须是对象`,
			);
			continue;
		}
		locales.push({
			locale: entry.name,
			keys: Object.keys(parsed),
		});
	}
	locales.sort((a, b) =>
		a.locale < b.locale ? -1 : a.locale > b.locale ? 1 : 0,
	);
	return { locales, errors };
}

/**
 * 校验 _locales 的一致性：default_locale 必须有对应目录，manifest 里引用的
 * 每个 __MSG_key__ 必须在默认语言里存在，且所有语言的消息键集合完全相同
 * （缺键会让某语言的界面出现空文案；键集合很小，要求翻译齐全是合理的）。
 */
export function validateLocales(
	locales: readonly LocaleMessages[],
	defaultLocale: string | undefined,
): string[] {
	const errors: string[] = [];
	if (
		typeof defaultLocale !== "string" ||
		defaultLocale.trim().length === 0
	) {
		errors.push(
			"default_locale 缺失（品牌文案走 __MSG_*__ 时必填）",
		);
		return errors;
	}
	const base = locales.find(
		(entry) => entry.locale === defaultLocale,
	);
	if (base === undefined) {
		errors.push(
			`default_locale（${defaultLocale}）没有对应的 _locales/${defaultLocale}/messages.json`,
		);
		return errors;
	}
	for (const entry of locales) {
		if (entry.locale === defaultLocale) continue;
		const missing = base.keys.filter(
			(key) => !entry.keys.includes(key),
		);
		if (missing.length > 0) {
			errors.push(
				`_locales/${entry.locale} 缺少消息键：${missing.join(" / ")}`,
			);
		}
		const extra = entry.keys.filter(
			(key) => !base.keys.includes(key),
		);
		if (extra.length > 0) {
			errors.push(
				`_locales/${entry.locale} 多出消息键（默认语言 ${defaultLocale} 里没有）：${extra.join(" / ")}`,
			);
		}
	}
	return errors;
}

export function validateManifest(
	manifest: ManifestLike,
	options: ValidateOptions,
): string[] {
	const errors: string[] = [];
	if (manifest.manifest_version !== 3) {
		errors.push(
			"manifest_version 必须为 3（本项目仅支持 MV3）",
		);
	}
	if (
		typeof manifest.name !== "string" ||
		manifest.name.trim().length === 0
	) {
		errors.push("name 不能为空");
	}
	if (
		typeof manifest.description !== "string" ||
		manifest.description.trim().length === 0
	) {
		errors.push("description 不能为空");
	}
	errors.push(
		...validateLocales(
			options.locales,
			manifest.default_locale,
		),
	);
	// 品牌文案走 __MSG_*__：占位符必须在默认语言里存在，否则商店与工具栏显示裸占位符
	const defaultMessages = options.locales.find(
		(entry) => entry.locale === manifest.default_locale,
	);
	if (defaultMessages !== undefined) {
		const fields: readonly [string, string | undefined][] =
			[
				["name", manifest.name],
				["description", manifest.description],
				[
					"action.default_title",
					manifest.action?.default_title,
				],
			];
		for (const [field, value] of fields) {
			if (typeof value !== "string") continue;
			for (const key of extractPlaceholders(value)) {
				if (defaultMessages.keys.includes(key)) continue;
				errors.push(
					`${field} 引用的 __MSG_${key}__ 在 _locales/${defaultMessages.locale}/messages.json 里不存在`,
				);
			}
		}
		// popup.html 的 data-i18n 键：getMessage 取不到就会抛错，必须在这里拦住
		for (const key of extractI18nKeys(
			options.popupHtml ?? "",
		)) {
			if (defaultMessages.keys.includes(key)) continue;
			errors.push(
				`popup.html 的 data-i18n="${key}" 在 _locales/${defaultMessages.locale}/messages.json 里不存在`,
			);
		}
	}
	if (manifest.version !== options.packageVersion) {
		errors.push(
			`version（${manifest.version}）须与 package.json（${options.packageVersion}）一致`,
		);
	}
	const permissions = manifest.permissions ?? [];
	if (!permissions.includes("storage")) {
		errors.push(
			"permissions 必须包含 storage（popup 开关状态存取）",
		);
	}
	for (const [size, file] of Object.entries(
		manifest.icons ?? {},
	)) {
		if (!existsSync(join(options.publicDir, file))) {
			errors.push(
				`图标 ${size}x${size} 引用的 ${file} 不存在于 public/`,
			);
		}
	}
	const popup = manifest.action?.default_popup;
	if (typeof popup !== "string" || popup.length === 0) {
		errors.push(
			"action.default_popup 缺失（popup 开关入口）",
		);
	} else if (!existsSync(join(options.publicDir, popup))) {
		errors.push(
			`action.default_popup 引用的 ${popup} 不存在于 public/`,
		);
	}
	const scripts = manifest.content_scripts ?? [];
	if (scripts.length === 0)
		errors.push("content_scripts 不能为空");
	for (const script of scripts) {
		const matches = script.matches ?? [];
		for (const required of [
			"https://github.com/*",
			"https://gist.github.com/*",
		]) {
			if (!matches.includes(required)) {
				errors.push(
					`content_scripts.matches 缺少 ${required}`,
				);
			}
		}
		if (script.run_at !== "document_start") {
			errors.push(
				"content_scripts.run_at 必须为 document_start（尽早挂观察器）",
			);
		}
		for (const file of script.js ?? []) {
			const source = BUILD_OUTPUTS[file];
			if (source === undefined) {
				errors.push(
					`content_scripts.js 引用 ${file} 不在构建映射中（同步本文件 BUILD_OUTPUTS）`,
				);
				continue;
			}
			if (!existsSync(join(options.rootDir, source))) {
				errors.push(
					`产物 ${file} 的源码入口 ${source} 不存在`,
				);
			}
			if (
				options.distDir !== null &&
				!existsSync(join(options.distDir, file))
			) {
				errors.push(
					`dist/${file} 不存在（先 bun run build 再校验）`,
				);
			}
		}
	}
	return errors;
}

function main(): void {
	const root = join(import.meta.dir, "..", "..");
	const publicDir = join(root, "public");
	const distDir = join(root, "dist");
	const loaded = loadLocaleMessages(
		join(publicDir, "_locales"),
	);
	const shipped = manifestJson as ManifestLike;
	const popupFile = shipped.action?.default_popup;
	const popupHtml =
		typeof popupFile === "string"
			? readTextOrNull(join(publicDir, popupFile))
			: null;
	const errors = [
		...loaded.errors,
		...validateManifest(shipped, {
			publicDir,
			rootDir: root,
			distDir: existsSync(distDir) ? distDir : null,
			packageVersion: packageJson.version,
			locales: loaded.locales,
			popupHtml,
		}),
	];
	if (errors.length > 0) {
		console.error(
			`manifest 门禁未通过（${errors.length} 处）：`,
		);
		for (const error of errors)
			console.error(`  - ${error}`);
		process.exitCode = 1;
		return;
	}
	console.log(
		`manifest 门禁通过：MV3 字段完整，资产与产物引用有效，_locales ${loaded.locales.map((entry) => entry.locale).join(" / ")} 键集合一致`,
	);
}

if (import.meta.main) main();
