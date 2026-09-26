// 词典门禁：结构编译（严格）+ 词条与规则的语义约束
//
// 分工说明（改本文件前先读）：
// - 结构合法性（字段白名单、route 以 ^/ 锚定、正则可编译、规则不得带 flags）由
//   src/dict/load.ts 负责——本门禁走严格路径调用同一套函数，故校验逻辑只有一份；
// - 单文件内的重复键由 Biome 的 lint/suspicious/noDuplicateObjectKeys 负责
//   （biome check . 会扫 .jsonc，两种引号写法都能报），故这里不再扫源码；
// - 跨模块同键异译是「先到先得 + 注册表顺序」的有意设计，不作错误（见 registry.ts 注释）；
// - 本文件只补 loader 管不到的语义约束：键值形态、译文是否真的译成了目标语言、
//   以及「译文不得等于任何键」这一防翻译循环的结构门禁。
//
// 语言相关判定一律取自 src/dict/locales.ts 的声明，这里不写死任何具体文字系统：
// 硬编码汉字会把纯假名的日语译文拒之门外。
//
// 零依赖 bun 直跑；校验逻辑导出为纯函数供测试复用；失败置 exitCode = 1。

import { hasNonLatinLetter } from "../../src/content/filters.ts";
import {
	buildGlobalDict,
	buildPageDict,
} from "../../src/dict/load.ts";
import {
	FALLBACK_LOCALE,
	getLocaleMeta,
	LOCALES,
	type LocaleId,
	type LocaleMeta,
	type Script,
} from "../../src/dict/locales.ts";
import {
	globalRawDict,
	pageRawModules,
} from "../../src/dict/registry.ts";
import type {
	GlobalDict,
	PageDict,
	Rule,
} from "../../src/shared/types.ts";

/**
 * 迁移到 core/ + locales/ 之前，data/** 全部是默认语言（zh-CN）的数据。
 * 门禁仍按「某语言的数据」校验，这样语言相关判定从第一天就走在最终路径上。
 */
const DATA_LOCALE: LocaleId = FALLBACK_LOCALE;

/**
 * 译文与键完全相同时的显式例外（键 = 英文原文）。
 * 将来某语言需要原样保留英文术语（日语保留 Markdown / GitHub Actions 等）
 * 时加在这里，**不要**因此放弃这条检查。
 */
const IDENTICAL_ALLOWLIST: readonly string[] = [];

/** 一个字系一个正则；门禁调用量小，无需缓存池 */
function scriptPattern(script: Script): RegExp {
	return new RegExp(`\\p{Script=${script}}`, "u");
}

/** 文本是否含指定语言文字系统的字母 */
function hasAnyScript(
	text: string,
	scripts: readonly Script[],
): boolean {
	if (scripts.length === 0) return false;
	return scripts.some((script) =>
		scriptPattern(script).test(text),
	);
}

/**
 * 还原正则源里的 \uXXXX / \u{...} 转义。
 * Bun 会把正则源中的非 ASCII 字符规范化为转义序列，
 * 直接对 source 查字系会漏检。
 */
function decodeUnicodeEscapes(source: string): string {
	return source.replaceAll(
		/\\u\{?([0-9a-fA-F]{4,6})\}?/g,
		(_match, hex: string) =>
			String.fromCodePoint(Number.parseInt(hex, 16)),
	);
}

/** 校验单条正则规则，返回中文错误列表（空数组 = 通过） */
export function validateRule(
	rule: Rule,
	where: string,
	locale: LocaleMeta,
): string[] {
	const errors: string[] = [];
	if (rule.pattern.source.length === 0) {
		errors.push(`${where}：pattern 不能为空`);
	}
	if (
		hasNonLatinLetter(
			decodeUnicodeEscapes(rule.pattern.source),
		)
	) {
		errors.push(
			`${where}：pattern 不得含非拉丁字母（输入恒为英文原文）`,
		);
	}
	if (
		typeof rule.replacement !== "string" ||
		rule.replacement.trim().length === 0
	) {
		errors.push(`${where}：replacement 不能为空`);
	} else if (
		locale.scripts.length > 0 &&
		!hasAnyScript(rule.replacement, locale.scripts)
	) {
		errors.push(
			`${where}：replacement 必须含 ${locale.name} 的文字系统（${locale.scripts.join(" / ")}），防翻译循环`,
		);
	}
	return errors;
}

/** 校验一组静态词条，返回中文错误列表 */
export function validateEntries(
	entries: Readonly<Record<string, string>>,
	where: string,
	locale: LocaleMeta,
): string[] {
	const errors: string[] = [];
	for (const [key, value] of Object.entries(entries)) {
		const label = `${where} 词条 ${JSON.stringify(key)}`;
		if (key.trim().length === 0)
			errors.push(`${label}：键不能为空`);
		if (key !== key.trim())
			errors.push(`${label}：键不得含首尾空白`);
		if (hasNonLatinLetter(key))
			errors.push(
				`${label}：键必须保持英文原文，不得含非拉丁字母`,
			);
		if (!/[a-z]/i.test(key)) {
			errors.push(
				`${label}：键不含拉丁字母（疑似误收录纯符号 / 数字）`,
			);
		}
		if (
			typeof value !== "string" ||
			value.trim().length === 0
		) {
			errors.push(`${label}：值不能为空`);
		} else if (
			locale.scripts.length > 0 &&
			!hasAnyScript(value, locale.scripts)
		) {
			errors.push(
				`${label}：值必须含 ${locale.name} 的文字系统（${locale.scripts.join(" / ")}）`,
			);
		}
	}
	return errors;
}

/** 校验一个词典模块（global 与页面模块共用） */
export function validateDict(
	dict: GlobalDict | PageDict,
	where: string,
	locale: LocaleMeta,
): string[] {
	return [
		...validateEntries(dict.entries, where, locale),
		...dict.rules.flatMap((rule) =>
			validateRule(rule, where, locale),
		),
	];
}

/** 收集全部模块的词条键（防循环门禁的「键集合」） */
function collectKeys(
	global: GlobalDict | null,
	pages: readonly (readonly [string, PageDict])[],
): Set<string> {
	const keys = new Set<string>();
	if (global !== null) {
		for (const key of Object.keys(global.entries))
			keys.add(key);
	}
	for (const [, dict] of pages) {
		for (const key of Object.keys(dict.entries))
			keys.add(key);
	}
	return keys;
}

/**
 * 防翻译循环的结构门禁（形状与语言无关的一半）：译文不得等于任何键。
 *
 * 翻译循环的真实条件是两条同时成立：(a) 脚本守卫没拦住译文，(b) 译文本身又是
 * 一个键、或能命中某条规则。这里从结构上让 (b) 不可能发生，于是各语言拿到同一
 * 套保证——包括拉丁语系目标（脚本守卫对它们结构上失效）。
 */
export function validateNoIdentity(
	entries: Readonly<Record<string, string>>,
	where: string,
	keys: ReadonlySet<string>,
): string[] {
	const errors: string[] = [];
	for (const [key, value] of Object.entries(entries)) {
		const trimmed = value.trim();
		if (!keys.has(trimmed)) continue;
		if (IDENTICAL_ALLOWLIST.includes(trimmed)) continue;
		errors.push(
			`${where} 词条 ${JSON.stringify(key)}：译文 ${JSON.stringify(trimmed)} 等于某个词典键，会在下一轮被再翻一次（防循环）`,
		);
	}
	return errors;
}

/**
 * 防翻译循环的结构门禁（另一半）：规则的替换产物不得再命中任何规则。
 * 校验对象是替换模板本身——真实产物含捕获组取值，无法穷举，但所有规则都以英文
 * 字面量为锚，模板能命中即说明有循环风险（实测现有数据命中数为 0）。
 */
export function validateRulesRematch(
	rules: readonly Rule[],
	where: string,
): string[] {
	const errors: string[] = [];
	for (const [index, rule] of rules.entries()) {
		const template = rule.replacement;
		if (template.trim().length === 0) continue;
		for (const other of rules) {
			if (!other.pattern.test(template)) continue;
			errors.push(
				`${where} 规则 ${index}（${JSON.stringify(other.pattern.source)}）会再次命中替换产物 ${JSON.stringify(template)}（防循环）`,
			);
			break;
		}
	}
	return errors;
}

/**
 * 严格构建注册表里的全部模块：任一模块报错即记入 errors 并跳过，
 * 以便一次列全所有问题（loader 是「首错即抛」，这里负责汇集）。
 */
export function buildAll(raw: {
	global: unknown;
	pages: readonly (readonly [string, unknown])[];
}): {
	global: GlobalDict | null;
	pages: readonly (readonly [string, PageDict])[];
	errors: string[];
} {
	const errors: string[] = [];
	const collect = <T>(build: () => T): T | null => {
		try {
			return build();
		} catch (error) {
			errors.push(
				error instanceof Error
					? error.message
					: String(error),
			);
			return null;
		}
	};
	const global = collect(() =>
		buildGlobalDict(raw.global, "global"),
	);
	const pages: (readonly [string, PageDict])[] = [];
	for (const [where, module] of raw.pages) {
		const dict = collect(() =>
			buildPageDict(module, where),
		);
		if (dict !== null) pages.push([where, dict]);
	}
	return { global, pages, errors };
}

function countEntries(
	global: GlobalDict | null,
	pages: readonly (readonly [string, PageDict])[],
): number {
	return (
		(global === null
			? 0
			: Object.keys(global.entries).length) +
		pages.reduce(
			(sum, [, dict]) =>
				sum + Object.keys(dict.entries).length,
			0,
		)
	);
}

function countRules(
	global: GlobalDict | null,
	pages: readonly (readonly [string, PageDict])[],
): number {
	return (
		(global === null ? 0 : global.rules.length) +
		pages.reduce(
			(sum, [, dict]) => sum + dict.rules.length,
			0,
		)
	);
}

/** 汇总一个「模块集合」的全部语义错误（迁移前：整个 data/** 即一种语言的数据） */
export function validateAll(
	built: {
		global: GlobalDict | null;
		pages: readonly (readonly [string, PageDict])[];
	},
	locale: LocaleMeta,
): string[] {
	const errors: string[] = [];
	if (built.global !== null) {
		errors.push(
			...validateDict(built.global, "global", locale),
		);
	}
	for (const [where, dict] of built.pages) {
		errors.push(...validateDict(dict, where, locale));
	}
	const keys = collectKeys(built.global, built.pages);
	if (built.global !== null) {
		errors.push(
			...validateNoIdentity(
				built.global.entries,
				"global",
				keys,
			),
		);
	}
	for (const [where, dict] of built.pages) {
		errors.push(
			...validateNoIdentity(dict.entries, where, keys),
		);
	}
	errors.push(
		...validateRulesRematch(
			[
				...(built.global?.rules ?? []),
				...built.pages.flatMap(([, dict]) => dict.rules),
			],
			"全站",
		),
	);
	return errors;
}

function main(): void {
	// 语言表自身的完整性：任一字系名必须能编译成正则（防手写错名字静默失效）
	for (const meta of LOCALES) {
		for (const script of meta.scripts) {
			try {
				scriptPattern(script);
			} catch (error) {
				console.error(
					`语言 ${meta.id} 声明了无法识别的文字系统 ${script}：${String(error)}`,
				);
				process.exitCode = 1;
				return;
			}
		}
	}
	const locale = getLocaleMeta(DATA_LOCALE);
	const built = buildAll({
		global: globalRawDict,
		pages: pageRawModules,
	});
	const errors = [
		...built.errors,
		...validateAll(built, locale),
	];

	if (errors.length > 0) {
		console.error(
			`词典门禁未通过（${errors.length} 处）：`,
		);
		for (const error of errors)
			console.error(`  - ${error}`);
		process.exitCode = 1;
		return;
	}
	console.log(
		`词典门禁通过（${locale.name}）：${countEntries(built.global, built.pages)} 词条 / ${countRules(built.global, built.pages)} 规则 / ${built.pages.length} 页面模块`,
	);
}

if (import.meta.main) main();
