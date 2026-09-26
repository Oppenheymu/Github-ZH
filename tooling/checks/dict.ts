// 词典门禁：结构编译（严格）+ 词条与规则的语义约束
//
// 分工说明（改本文件前先读）：
// - 结构合法性（字段白名单、route 以 ^/ 锚定、正则可编译、规则不得带 flags）由
//   src/dict/load.ts 负责——本门禁走严格路径调用同一套函数，故校验逻辑只有一份；
// - 单文件内的重复键由 Biome 的 lint/suspicious/noDuplicateObjectKeys 负责
//   （biome check . 会扫 .jsonc，两种引号写法都能报），故这里不再扫源码；
// - 跨模块同键异译是「先到先得 + 注册表顺序」的有意设计，不作错误（见 registry.ts 注释）；
// - 本文件只补 loader 管不到的语义约束：键值与译文的 CJK 形态。
//
// 零依赖 bun 直跑；校验逻辑导出为纯函数供测试复用；失败置 exitCode = 1。

import { hasCJK } from "../../src/content/filters.ts";
import {
	buildGlobalDict,
	buildPageDict,
} from "../../src/dict/load.ts";
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
 * 还原正则源里的 \uXXXX / \u{...} 转义。
 * Bun 会把正则源中的非 ASCII 字符规范化为转义序列，
 * 直接对 source 查 CJK 会漏检。
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
): string[] {
	const errors: string[] = [];
	if (rule.pattern.source.length === 0) {
		errors.push(`${where}：pattern 不能为空`);
	}
	if (hasCJK(decodeUnicodeEscapes(rule.pattern.source))) {
		errors.push(
			`${where}：pattern 不得含 CJK（输入恒为英文原文）`,
		);
	}
	if (
		typeof rule.replacement !== "string" ||
		rule.replacement.trim().length === 0
	) {
		errors.push(`${where}：replacement 不能为空`);
	} else if (!hasCJK(rule.replacement)) {
		errors.push(
			`${where}：replacement 必须含 CJK（防翻译循环）`,
		);
	}
	return errors;
}

/** 校验一组静态词条，返回中文错误列表 */
export function validateEntries(
	entries: Readonly<Record<string, string>>,
	where: string,
): string[] {
	const errors: string[] = [];
	for (const [key, value] of Object.entries(entries)) {
		const label = `${where} 词条 ${JSON.stringify(key)}`;
		if (key.trim().length === 0)
			errors.push(`${label}：键不能为空`);
		if (key !== key.trim())
			errors.push(`${label}：键不得含首尾空白`);
		if (hasCJK(key))
			errors.push(
				`${label}：键必须保持英文原文，不得含 CJK`,
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
		} else if (!hasCJK(value)) {
			errors.push(`${label}：值必须含 CJK`);
		}
	}
	return errors;
}

/** 校验一个词典模块（global 与页面模块共用） */
export function validateDict(
	dict: GlobalDict | PageDict,
	where: string,
): string[] {
	return [
		...validateEntries(dict.entries, where),
		...dict.rules.flatMap((rule) =>
			validateRule(rule, where),
		),
	];
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

function main(): void {
	const built = buildAll({
		global: globalRawDict,
		pages: pageRawModules,
	});
	const errors = [...built.errors];
	if (built.global !== null) {
		errors.push(...validateDict(built.global, "global"));
	}
	for (const [where, dict] of built.pages) {
		errors.push(...validateDict(dict, where));
	}

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
		`词典门禁通过：${countEntries(built.global, built.pages)} 词条 / ${countRules(built.global, built.pages)} 规则 / ${built.pages.length} 页面模块`,
	);
}

if (import.meta.main) main();
