// 词典加载：JSONC 原始数据 → 运行时词典（严格编译正则，非法即抛中文错误）
//
// 定位：本模块是唯一把 JSONC 形状翻译成词典类型的地方。运行时（src/dict/index.ts）
// 与门禁（tooling/checks/dict.ts）共用同一套编译逻辑，保证「CI 校验的」与
// 「浏览器实际加载的」是同一份语义，不会出现两套判定标准。
//
// 形状（每种形状一个 build* 函数，顶层字段是白名单）：
//   core/modules.jsonc      { modules: [{ name, route }] }        顺序即优先级
//   core/rules.jsonc        { modules: [{ name, rules: [{ id, pattern }] }] }
//   core/aliases.jsonc      { aliases: { "<DOM 文本>": "<规范键>" } }
//   locales/<语言>/<模块>.jsonc        { entries: { "<英文原文>": "<译文>" } }
//   locales/<语言>/rules.jsonc         { replacements: { "<规则 id>": "<模板>" } }
//
// 为什么严格抛错而不是就地修数据：把非法数据静默降级会变成「不报错、只是不翻」，
// 正是本项目最怕的静默失效。门禁负责在提交前拦住错误，index.ts 负责让运行时
// 单个模块失败不拖垮整站翻译。

import type {
	DictCore,
	LocaleDict,
	ModuleDef,
	ModuleDict,
	Rule,
	RuleDef,
} from "../shared/types.ts";
import type { LocaleId } from "./locales.ts";

/** 允许的顶层字段集合；`$schema` 由编辑器消费，加载时忽略 */
const CORE_MODULE_KEYS: readonly string[] = ["modules"];
const CORE_RULE_KEYS: readonly string[] = ["modules"];
const ALIAS_KEYS: readonly string[] = ["aliases"];
const ENTRIES_KEYS: readonly string[] = ["entries"];
const REPLACEMENT_KEYS: readonly string[] = [
	"replacements",
];
const MODULE_ITEM_KEYS: readonly string[] = [
	"name",
	"route",
];
const RULE_GROUP_KEYS: readonly string[] = [
	"name",
	"rules",
];
const RULE_ITEM_KEYS: readonly string[] = ["id", "pattern"];

/** 兜底模块名：路由命中一切 pathname，必须排在模块清单最后 */
export const GLOBAL_MODULE = "global";

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

function asArray(raw: unknown, where: string): unknown[] {
	if (!Array.isArray(raw)) {
		fail(where, `必须是数组，实为 ${describe(raw)}`);
	}
	return raw;
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
 * 结构上不允许出现（带 flags 字段的规则会被 buildRuleDefs 拒绝）。
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

/** 路由正则：必须以 ^/ 锚定 pathname */
function compileRoute(
	source: string,
	where: string,
): RegExp {
	if (!source.startsWith("^/")) {
		fail(
			where,
			`必须以 ^/ 锚定 pathname：${JSON.stringify(source)}`,
		);
	}
	return compilePattern(source, where);
}

/** 字符串 → 字符串映射表（词条 / 别名 / 规则模板共用一套键值校验） */
function buildStringMap(
	raw: unknown,
	where: string,
): Record<string, string> {
	const source = asRecord(raw, where);
	const map: Record<string, string> = {};
	for (const [key, value] of Object.entries(source)) {
		// 对象字面量语义下 "__proto__" 会改写原型而非新增条目（静默丢失），必须显式拒绝
		if (key === "__proto__") {
			fail(
				where,
				"键不得为 __proto__（会改写原型而非新增条目）",
			);
		}
		if (key.trim().length === 0) {
			fail(where, "键不能为空");
		}
		if (typeof value !== "string") {
			fail(
				`${where} 条目 ${JSON.stringify(key)}`,
				`值必须是字符串，实为 ${describe(value)}`,
			);
		}
		map[key] = value;
	}
	return map;
}

/** core/modules.jsonc → 模块定义（顺序即优先级；global 必须是最后一个） */
export function buildModules(
	raw: unknown,
	where: string,
): readonly ModuleDef[] {
	const source = asRecord(raw, where);
	rejectUnknownKeys(source, CORE_MODULE_KEYS, where);
	const items = asArray(
		source["modules"],
		`${where} modules`,
	);
	if (items.length === 0)
		fail(`${where} modules`, "不能为空");
	const modules = items.map((item, index) => {
		const at = `${where} modules[${index}]`;
		const record = asRecord(item, at);
		rejectUnknownKeys(record, MODULE_ITEM_KEYS, at);
		return {
			name: requireString(record["name"], `${at} name`),
			route: compileRoute(
				requireString(record["route"], `${at} route`),
				`${at} route`,
			),
		};
	});
	const names = modules.map((module) => module.name);
	if (new Set(names).size !== names.length) {
		fail(`${where} modules`, "模块名不得重复");
	}
	// global 是兜底模块（route 命中一切），必须排在最后——否则会压过具体页词条
	const last = modules[modules.length - 1];
	if (last?.name !== GLOBAL_MODULE) {
		fail(
			`${where} modules`,
			`最后一个模块必须是 ${GLOBAL_MODULE}（兜底，route 为 ^/）`,
		);
	}
	return modules;
}

/** core/rules.jsonc → 共享规则（顺序即语义；模块顺序必须与模块清单一致） */
export function buildRuleDefs(
	raw: unknown,
	where: string,
	modules: readonly ModuleDef[],
): readonly RuleDef[] {
	const source = asRecord(raw, where);
	rejectUnknownKeys(source, CORE_RULE_KEYS, where);
	const groups = asArray(
		source["modules"],
		`${where} modules`,
	);
	const known = modules.map((module) => module.name);
	const defs: RuleDef[] = [];
	const seenIds = new Set<string>();
	let lastModuleIndex = -1;
	groups.forEach((group, index) => {
		const at = `${where} modules[${index}]`;
		const record = asRecord(group, at);
		rejectUnknownKeys(record, RULE_GROUP_KEYS, at);
		const name = requireString(
			record["name"],
			`${at} name`,
		);
		const moduleIndex = known.indexOf(name);
		if (moduleIndex === -1) {
			fail(
				`${at} name`,
				`未在 core/modules.jsonc 里声明的模块：${JSON.stringify(name)}`,
			);
		}
		// 规则按模块分组存放，组顺序必须与模块顺序一致（否则优先级语义被悄悄改掉）
		if (moduleIndex <= lastModuleIndex) {
			fail(
				`${at} name`,
				`规则分组顺序必须与 core/modules.jsonc 一致：${JSON.stringify(name)} 出现在了更靠后的模块之后`,
			);
		}
		lastModuleIndex = moduleIndex;
		const items = asArray(record["rules"], `${at} rules`);
		items.forEach((item, ruleIndex) => {
			const ruleAt = `${at} rules[${ruleIndex}]`;
			const rule = asRecord(item, ruleAt);
			for (const key of Object.keys(rule)) {
				if (key === "flags") {
					fail(
						ruleAt,
						"规则不得带 flags 字段（g / y 的 lastIndex 会跨节点累积导致漏翻；本项目规则一律无标志）",
					);
				}
				if (!RULE_ITEM_KEYS.includes(key)) {
					fail(
						ruleAt,
						`未知字段 ${JSON.stringify(key)}（允许：${RULE_ITEM_KEYS.join(" / ")}）`,
					);
				}
			}
			const id = requireString(rule["id"], `${ruleAt} id`);
			if (seenIds.has(id)) {
				fail(
					`${ruleAt} id`,
					`规则 id 重复：${JSON.stringify(id)}`,
				);
			}
			seenIds.add(id);
			defs.push({
				id,
				module: name,
				pattern: compilePattern(
					requireString(
						rule["pattern"],
						`${ruleAt} pattern`,
					),
					`${ruleAt} pattern`,
				),
			});
		});
	});
	return defs;
}

/** core/aliases.jsonc → 上游改名映射（值是否指向真实规范键由门禁校验） */
export function buildAliases(
	raw: unknown,
	where: string,
): Readonly<Record<string, string>> {
	const source = asRecord(raw, where);
	rejectUnknownKeys(source, ALIAS_KEYS, where);
	return buildStringMap(
		source["aliases"],
		`${where} aliases`,
	);
}

/** locales/<语言>/<模块>.jsonc → 词条键值对 */
export function buildEntries(
	raw: unknown,
	where: string,
): Readonly<Record<string, string>> {
	const source = asRecord(raw, where);
	rejectUnknownKeys(source, ENTRIES_KEYS, where);
	return buildStringMap(
		source["entries"],
		`${where} entries`,
	);
}

/** locales/<语言>/rules.jsonc → 规则 id → 替换模板（id 必须在共享规则里存在） */
export function buildReplacements(
	raw: unknown,
	where: string,
	ruleDefs: readonly RuleDef[],
): Readonly<Record<string, string>> {
	const source = asRecord(raw, where);
	rejectUnknownKeys(source, REPLACEMENT_KEYS, where);
	const known = new Set(ruleDefs.map((def) => def.id));
	const map = buildStringMap(
		source["replacements"],
		`${where} replacements`,
	);
	for (const id of Object.keys(map)) {
		if (known.has(id)) continue;
		fail(
			`${where} replacements`,
			`未知规则 id ${JSON.stringify(id)}（core/rules.jsonc 里没有；改过 id 的话模板也要跟着改）`,
		);
	}
	return map;
}

/** 组装一种语言的完整词典：模块顺序来自 core，词条与模板来自该语言（可缺） */
export function buildLocaleDict(input: {
	readonly locale: LocaleId;
	readonly core: DictCore;
	/** 模块名 → 该语言词条原始数据（缺模块 = 该语言尚未翻译该模块） */
	readonly entries: ReadonlyMap<string, unknown>;
	/** locales/<语言>/rules.jsonc 原始数据；null = 该语言一个规则模板都没写 */
	readonly rulesRaw: unknown | null;
}): LocaleDict {
	const { locale, core, entries, rulesRaw } = input;
	// 未知模块名必须响亮失败：静默忽略等于「这份译文永远不生效」，最难发现的一类失效
	const known = new Set(
		core.modules.map((module) => module.name),
	);
	for (const name of entries.keys()) {
		if (known.has(name)) continue;
		fail(
			`locales/${locale}`,
			`未在 core/modules.jsonc 里声明的模块：${JSON.stringify(name)}`,
		);
	}
	const replacements =
		rulesRaw === null
			? {}
			: buildReplacements(
					rulesRaw,
					`locales/${locale}/rules`,
					core.rules,
				);
	const modules: ModuleDict[] = core.modules.map(
		(module) => {
			const where = `locales/${locale}/${module.name}`;
			const rawEntries = entries.get(module.name);
			const rules: Rule[] = [];
			for (const def of core.rules) {
				if (def.module !== module.name) continue;
				const replacement = replacements[def.id];
				// 缺模板 = 该语言尚未翻译这条规则：整条规则不生效（绝不能用空串替换）
				if (replacement === undefined) continue;
				rules.push({
					pattern: def.pattern,
					replacement,
				});
			}
			return {
				name: module.name,
				route: module.route,
				entries:
					rawEntries === undefined
						? {}
						: buildEntries(rawEntries, where),
				rules,
			};
		},
	);
	return { locale, modules };
}
