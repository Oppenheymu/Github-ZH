// 词典门禁：键值合法性 / CJK 约束 / 正则规则 / 路由正则 / 源文件重复键
// 零依赖 bun 直跑；校验逻辑导出为纯函数供测试复用；失败置 exitCode = 1

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { hasCJK } from "../../src/content/filters.ts";
import { globalDict } from "../../src/dict/global.ts";
import { pageDicts } from "../../src/dict/index.ts";
import type {
	GlobalDict,
	PageDict,
	Rule,
} from "../../src/shared/types.ts";

const DICT_DIR = join(
	import.meta.dir,
	"..",
	"..",
	"src",
	"dict",
);

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
	if (!(rule.pattern instanceof RegExp)) {
		return [`${where}：pattern 必须是正则`];
	}
	if (rule.pattern.global || rule.pattern.sticky) {
		errors.push(
			`${where}：禁用 g / y 标志（lastIndex 会跨节点累积导致漏翻）`,
		);
	}
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

/** 校验全站词典（无路由字段） */
export function validateGlobalDict(
	dict: GlobalDict,
	where: string,
): string[] {
	return [
		...validateEntries(dict.entries, where),
		...dict.rules.flatMap((rule) =>
			validateRule(rule, where),
		),
	];
}

/** 校验页面词典模块：路由正则格式 + 词条 + 规则 */
export function validatePageDict(
	dict: PageDict,
	where: string,
): string[] {
	const errors: string[] = [];
	if (!(dict.route instanceof RegExp)) {
		errors.push(`${where}：route 必须是正则`);
	} else {
		if (dict.route.flags.length > 0) {
			errors.push(
				`${where}：route 不得带标志（需对 pathname 无状态 test）`,
			);
		}
		// 正则字面量里 / 会被转义成 \/，先归一再检查锚定
		const normalized = dict.route.source.replaceAll(
			"\\/",
			"/",
		);
		if (!normalized.startsWith("^/")) {
			errors.push(
				`${where}：route 必须以 ^/ 开头锚定 pathname`,
			);
		}
	}
	return [
		...errors,
		...validateEntries(dict.entries, where),
		...dict.rules.flatMap((rule) =>
			validateRule(rule, where),
		),
	];
}

/**
 * 扫描词典源文件中 entries 的重复键。
 * 对象字面量的重复键会被 JS 静默去重（后写覆盖前写），只能从源码检出；
 * 约定：词条键在源文件中位于 2 个 tab 缩进处（biome 格式保证）。
 */
export function findDuplicateKeys(
	source: string,
): string[] {
	const seen = new Set<string>();
	const duplicates = new Set<string>();
	for (const match of source.matchAll(
		/^\t\t"((?:[^"\\]|\\.)*)": /gm,
	)) {
		const key = match[1];
		if (key === undefined) continue;
		if (seen.has(key)) duplicates.add(key);
		seen.add(key);
	}
	return [...duplicates];
}

function dictSourceFiles(): string[] {
	const files: string[] = [];
	for (const entry of readdirSync(DICT_DIR, {
		recursive: true,
	})) {
		const name = String(entry).replaceAll("\\", "/");
		if (
			name.endsWith(".ts") &&
			!name.endsWith(".test.ts")
		) {
			files.push(join(DICT_DIR, name));
		}
	}
	return files;
}

function countEntries(): number {
	let count = Object.keys(globalDict.entries).length;
	for (const dict of pageDicts)
		count += Object.keys(dict.entries).length;
	return count;
}

function countRules(): number {
	let count = globalDict.rules.length;
	for (const dict of pageDicts) count += dict.rules.length;
	return count;
}

function main(): void {
	const errors: string[] = [];
	errors.push(...validateGlobalDict(globalDict, "global"));
	for (const dict of pageDicts) {
		errors.push(
			...validatePageDict(
				dict,
				`模块 ${dict.route.source}`,
			),
		);
	}
	for (const file of dictSourceFiles()) {
		for (const key of findDuplicateKeys(
			readFileSync(file, "utf8"),
		)) {
			errors.push(
				`${file}：重复键 ${JSON.stringify(key)}（后写会静默覆盖前写）`,
			);
		}
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
		`词典门禁通过：${countEntries()} 词条 / ${countRules()} 规则 / ${pageDicts.length} 页面模块`,
	);
}

if (import.meta.main) main();
