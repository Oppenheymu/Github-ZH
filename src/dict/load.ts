// 词典加载：JSONC 原始数据 → 运行时词典（严格编译正则，非法即抛中文错误）
//
// 定位：本模块是唯一把 JSONC 形状翻译成词典类型的地方。运行时（src/dict/index.ts）
// 与门禁（tooling/checks/dict.ts）共用同一套编译逻辑，保证「CI 校验的」与
// 「浏览器实际加载的」是同一份语义，不会出现两套判定标准。
//
// 为什么严格抛错而不是就地修数据：把非法数据静默降级会变成「不报错、只是不翻」，
// 正是本项目最怕的静默失效。门禁负责在提交前拦住错误，index.ts 负责让运行时
// 单个模块失败不拖垮整站翻译。

import type {
	GlobalDict,
	PageDict,
	Rule,
} from "../shared/types.ts";

/** 允许的字段集合；`$schema` 由编辑器消费，加载时忽略 */
const GLOBAL_KEYS: readonly string[] = ["entries", "rules"];
const PAGE_KEYS: readonly string[] = [
	"route",
	"entries",
	"rules",
];
const RULE_KEYS: readonly string[] = [
	"pattern",
	"replacement",
];

function fail(where: string, message: string): never {
	throw new Error(`${where}：${message}`);
}

function describe(value: unknown): string {
	if (value === null) return "null";
	if (Array.isArray(value)) return "数组";
	return typeof value;
}

function asRecord(
	raw: unknown,
	where: string,
): Record<string, unknown> {
	if (
		raw === null ||
		typeof raw !== "object" ||
		Array.isArray(raw)
	) {
		return fail(where, `必须是对象，实为 ${describe(raw)}`);
	}
	return raw as Record<string, unknown>;
}

/**
 * 拒绝未知顶层字段。拼错字段名（如 entries 写成 entires）会让整块词典
 * 静默变成空对象——这类错误必须在门禁与运行时都响亮失败。
 */
function rejectUnknownKeys(
	source: Record<string, unknown>,
	allowed: readonly string[],
	where: string,
): void {
	for (const key of Object.keys(source)) {
		if (key === "$schema") continue;
		if (!allowed.includes(key)) {
			fail(
				where,
				`未知字段 ${JSON.stringify(key)}（允许：$schema / ${allowed.join(" / ")}）`,
			);
		}
	}
}

function requireString(
	value: unknown,
	where: string,
): string {
	if (typeof value !== "string") {
		return fail(
			where,
			`必须是字符串，实为 ${describe(value)}`,
		);
	}
	if (value.trim().length === 0) fail(where, "不能为空");
	return value;
}

/**
 * 正则源串 → RegExp。刻意不传标志：g / y 的 lastIndex 状态会跨节点累积导致漏翻，
 * 结构上不允许出现（带 flags 字段的规则会被 buildRules 拒绝）。
 */
function compilePattern(
	source: string,
	where: string,
): RegExp {
	try {
		return new RegExp(source);
	} catch (error) {
		return fail(
			where,
			`正则无法编译：${JSON.stringify(source)}（${String(error)}）`,
		);
	}
}

function buildEntries(
	raw: unknown,
	where: string,
): Record<string, string> {
	const source = asRecord(raw, where);
	const entries: Record<string, string> = {};
	for (const [key, value] of Object.entries(source)) {
		// 对象字面量语义下 "__proto__" 会改写原型而非新增词条（静默丢失），必须显式拒绝
		if (key === "__proto__") {
			fail(
				where,
				"词条键不得为 __proto__（会改写原型而非新增词条）",
			);
		}
		if (typeof value !== "string") {
			fail(
				`${where} 词条 ${JSON.stringify(key)}`,
				`值必须是字符串，实为 ${describe(value)}`,
			);
		}
		entries[key] = value;
	}
	return entries;
}

function buildRules(
	raw: unknown,
	where: string,
): readonly Rule[] {
	if (!Array.isArray(raw)) {
		fail(where, `必须是数组，实为 ${describe(raw)}`);
	}
	return raw.map((item, index) => {
		const at = `${where}[${index}]`;
		const source = asRecord(item, at);
		for (const key of Object.keys(source)) {
			if (key === "flags") {
				fail(
					at,
					"规则不得带 flags 字段（g / y 的 lastIndex 会跨节点累积导致漏翻；本项目规则一律无标志）",
				);
			}
			if (!RULE_KEYS.includes(key)) {
				fail(
					at,
					`未知字段 ${JSON.stringify(key)}（允许：${RULE_KEYS.join(" / ")}）`,
				);
			}
		}
		const patternSource = requireString(
			source["pattern"],
			`${at} pattern`,
		);
		return {
			pattern: compilePattern(
				patternSource,
				`${at} pattern`,
			),
			replacement: requireString(
				source["replacement"],
				`${at} replacement`,
			),
		};
	});
}

/** 全站词典：entries + rules，无 route */
export function buildGlobalDict(
	raw: unknown,
	where: string,
): GlobalDict {
	const source = asRecord(raw, where);
	rejectUnknownKeys(source, GLOBAL_KEYS, where);
	return {
		entries: buildEntries(
			source["entries"],
			`${where} entries`,
		),
		rules: buildRules(source["rules"], `${where} rules`),
	};
}

/** 页面词典模块：route + entries + rules */
export function buildPageDict(
	raw: unknown,
	where: string,
): PageDict {
	const source = asRecord(raw, where);
	rejectUnknownKeys(source, PAGE_KEYS, where);
	const routeSource = requireString(
		source["route"],
		`${where} route`,
	);
	if (!routeSource.startsWith("^/")) {
		fail(
			`${where} route`,
			`必须以 ^/ 锚定 pathname：${JSON.stringify(routeSource)}`,
		);
	}
	return {
		route: compilePattern(routeSource, `${where} route`),
		entries: buildEntries(
			source["entries"],
			`${where} entries`,
		),
		rules: buildRules(source["rules"], `${where} rules`),
	};
}
