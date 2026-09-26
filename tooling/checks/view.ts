// 合并视图骨架门禁：把「视图语义」固化成仓内 golden 快照，纳入 bun run check。
//
// 为什么只锁骨架、不做全量快照：全量视图是 27 探针 × 1618 词条，词典每加一条词条就
// 产生巨大 diff，没人会认真看，最后必然被无脑 --update 掉。这里只锁**语义骨架**——
// 那些一旦变了就必须有人类看一眼的东西：
//   1. 模块顺序（core/modules.jsonc 的序列）与「global 兜底必须在最后」；
//   2. 每个探针 pathname 命中的模块名序列（顺序即优先级的直接证据）；
//   3. 每个 pathname 的**赢家覆盖**：只记「同一键被 ≥2 个命中模块提供」的键及其最终
//      胜出来源——这是「有意同键异译」的回归保护，也让意外新增的同键异译立刻可见；
//   4. 每个 pathname 生效的规则 id 序列（顺序即语义的证据）。**记 id 不记 pattern 源串**：
//      上游改 pattern 不必动快照，与「规则改命名捕获组」这类改动解耦。
// 每 pathname 的词条数与规则数由本门禁运行时统计并打印，不进快照——它们纯粹随词典增长
// 而变化，进快照只会制造无意义的 diff。
//
// 数据来源：registry.ts + load.ts 的**严格**路径（与词典门禁同一套编译），不 import
// src/dict/index.ts——那边是软失败，坏数据被静默跳过后门禁反而会变绿。
//
// 快照按语言逐份存（view-skeleton.<语言>.json），理由是「有意同键异译」是分语言的事实：
// 某种语言少译了被压过的那个键，跨模块同键就不成立，那是该语言覆盖率的真实状态。
//
// 零依赖 bun 直跑；骨架生成与比对都是纯函数（供测试复用）；失败置 exitCode = 1。

import { matchModules } from "../../src/content/view.ts";
import { GLOBAL_MODULE } from "../../src/dict/load.ts";
import {
	LOCALES,
	type LocaleId,
} from "../../src/dict/locales.ts";
import { localeRawDicts } from "../../src/dict/registry.ts";
import type {
	LocaleDict,
	ModuleDict,
	RuleDef,
} from "../../src/shared/types.ts";
import { buildCore, buildLocaleData } from "./dict.ts";

/**
 * 探针路径集合：覆盖每个模块的代表路由 + 兜底路径 + 一条不存在的页面。
 * 它是快照的「坐标」——改这里等于重新定义快照覆盖面，必须与 --update 一起提交。
 */
export const PROBE_PATHS: readonly string[] = [
	"/",
	"/octocat",
	"/microsoft/vscode",
	"/microsoft/vscode/issues",
	"/microsoft/vscode/issues/1",
	"/microsoft/vscode/pull/1",
	"/microsoft/vscode/pulls",
	"/microsoft/vscode/settings",
	"/settings/profile",
	"/settings/accessibility",
	"/microsoft/vscode/actions",
	"/microsoft/vscode/agents",
	"/microsoft/vscode/commits",
	"/microsoft/vscode/discussions",
	"/microsoft/vscode/wiki",
	"/microsoft/vscode/pulse",
	"/microsoft/vscode/graphs",
	"/microsoft/vscode/forks",
	"/microsoft/vscode/security",
	"/microsoft/vscode/projects",
	"/microsoft/vscode/tags",
	"/microsoft/vscode/branches",
	"/microsoft/vscode/compare",
	"/search",
	"/topics",
	"/features",
	"/pricing",
	"/not-a-real-page/x",
];

/** 一个键被 ≥2 个命中模块提供时的胜出记录（只记来源模块名，不记译文） */
export interface Winner {
	readonly key: string;
	readonly module: string;
}

/** 一个探针路径的骨架 */
export interface PathSkeleton {
	/** 快照里的短名（去掉仓库 / 用户名部分，便于人读） */
	readonly name: string;
	/** location.pathname：比对的主键，探针清单的坐标 */
	readonly path: string;
	/** 命中的模块名序列（顺序 = 优先级） */
	readonly matched: readonly string[];
	/** 仅含被 ≥2 个模块提供的键，按键名排序保证快照稳定 */
	readonly collisions: readonly Winner[];
	/** 该路径生效的规则 id 序列（顺序 = 规则顺序 = 首条命中生效的优先级） */
	readonly rules: readonly string[];
	/**
	 * 该路径**本应生效但本语言尚未翻译**的规则 id 序列（core 声明了、本语言没给模板）。
	 * 单独记一笔的理由：只记 rules 的话，「往 core/rules.jsonc 加一条规则、忘了给模板」
	 * 在视图里完全不可见（缺模板 = 规则不生效），快照看不出任何变化——而这恰恰是最常见
	 * 的回归。它同时是该语言分路径规则覆盖率的可读视图。
	 */
	readonly notTranslated: readonly string[];
}

/** 视图骨架：模块顺序 + 各探针路径的命中、赢家与规则序列 */
export interface ViewSkeleton {
	readonly modules: readonly string[];
	readonly probes: readonly PathSkeleton[];
}

/** 探针路径在快照里的短名，去掉仓库 / 用户名部分（快照可读性） */
export function probeName(pathname: string): string {
	return pathname
		.split("/")
		.filter((segment) => segment.length > 0)
		.join("/");
}

/**
 * 纯函数：core 的规则定义 → 「pattern 源串 → 规则 id」。
 *
 * 运行时的规则是「pattern + 模板」，不带 id（id 只活在语言无关的 core/rules.jsonc 里，
 * 用来让各语言对齐模板）。骨架要记 id 而不记 pattern 源串，故按同一份 core 反查。
 */
export function ruleIdMap(
	defs: readonly RuleDef[],
): ReadonlyMap<string, string> {
	return new Map(
		defs.map((def) => [def.pattern.source, def.id]),
	);
}

/**
 * 纯函数：生成一份语言的视图骨架。
 * 输入是**已经编译好的**模块词典（与运行时同一份结构），输出可直接 JSON 序列化。
 * ruleIds 是规则 pattern 源串 → id；pending 是「本语言还没给模板」的规则 id 序列
 * （由 core.rules 与 dict 里实际生效的规则求差得到，见 pendingRuleIds）。
 * 模块归属直接取自 core 的 RuleDef.module，不必反查 pattern。
 */
export function buildSkeleton(
	modules: readonly string[],
	dictModules: readonly ModuleDict[],
	ruleIds: ReadonlyMap<string, string>,
	pending: ReadonlyMap<
		string,
		readonly string[]
	> = new Map(),
): ViewSkeleton {
	const probes = PROBE_PATHS.map((pathname) => {
		const matched = matchModules(pathname, dictModules);
		// 逐键收集提供者：提供者 ≥2 才记录；胜者是「先到先得」里第一个提供的模块
		const providers = new Map<string, string[]>();
		for (const module of matched) {
			for (const key of Object.keys(module.entries)) {
				const list = providers.get(key);
				if (list === undefined) {
					providers.set(key, [module.name]);
				} else {
					list.push(module.name);
				}
			}
		}
		const collisions: Winner[] = [];
		for (const [key, sources] of providers) {
			const winner = sources[0];
			if (sources.length < 2 || winner === undefined)
				continue;
			collisions.push({ key, module: winner });
		}
		collisions.sort((left, right) =>
			compareText(left.key, right.key),
		);
		return {
			name: probeName(pathname),
			path: pathname,
			matched: matched.map((module) => module.name),
			collisions,
			rules: matched.flatMap((module) =>
				module.rules.map((rule) =>
					lookupRuleId(ruleIds, rule),
				),
			),
			// 顺序与 rules 一致：模块顺序、组内保持 core 的声明顺序
			notTranslated: matched.flatMap(
				(module) => pending.get(module.name) ?? [],
			),
		};
	});
	return { modules: [...modules], probes };
}

/**
 * 纯函数：core 声明的规则里，本语言**没有给模板**的那些 → 模块名 → 规则 id 序列。
 * 缺模板 = 该规则在本语言不生效（见 docs/guides/development.md「稀疏覆盖」），
 * 但它是「本应有、暂时没有」的规则，必须能在骨架里被看见。
 */
export function pendingRuleIds(
	defs: readonly RuleDef[],
	dictModules: readonly ModuleDict[],
): ReadonlyMap<string, readonly string[]> {
	const active = new Set<string>();
	for (const module of dictModules) {
		for (const rule of module.rules) {
			active.add(rule.pattern.source);
		}
	}
	const pending = new Map<string, string[]>();
	for (const def of defs) {
		if (active.has(def.pattern.source)) continue;
		const list = pending.get(def.module);
		if (list === undefined)
			pending.set(def.module, [def.id]);
		else list.push(def.id);
	}
	return pending;
}

/** 视图里出现的规则必须能在 core/rules.jsonc 里反查到 id，否则结构已错，响亮失败 */
function lookupRuleId(
	ruleIds: ReadonlyMap<string, string>,
	rule: { readonly pattern: RegExp },
): string {
	const id = ruleIds.get(rule.pattern.source);
	if (id === undefined) {
		throw new Error(
			`视图里出现了 core/rules.jsonc 未声明的规则（pattern ${JSON.stringify(rule.pattern.source)}）：无法记入骨架`,
		);
	}
	return id;
}

function compareText(left: string, right: string): number {
	if (left < right) return -1;
	if (left > right) return 1;
	return 0;
}

/**
 * 稳定序列化：字段顺序固定、2 空格缩进（与仓库其它 JSON 一致）、末尾换行。
 * --update 写出的文件必须逐字节可复现，否则快照会因字段顺序抖动。
 */
export function serializeSkeleton(
	skeleton: ViewSkeleton,
): string {
	const normalized: ViewSkeleton = {
		modules: [...skeleton.modules],
		probes: skeleton.probes.map((probe) => ({
			name: probe.name,
			path: probe.path,
			matched: [...probe.matched],
			collisions: probe.collisions.map((collision) => ({
				key: collision.key,
				module: collision.module,
			})),
			rules: [...probe.rules],
			notTranslated: [...probe.notTranslated],
		})),
	};
	return `${JSON.stringify(normalized, null, 2)}\n`;
}

/** 数组逐位比较，返回第一条差异的可读说明；完全相同返回 null */
function diffList(
	actual: readonly string[],
	expected: readonly string[],
): string | null {
	const length = Math.max(actual.length, expected.length);
	for (let index = 0; index < length; index += 1) {
		if (actual[index] === expected[index]) continue;
		const want = expected[index];
		const got = actual[index];
		return `第 ${index + 1} 项期望 ${want === undefined ? "（无）" : JSON.stringify(want)}，实为 ${got === undefined ? "（无）" : JSON.stringify(got)}`;
	}
	return null;
}

/**
 * 取「实际 → 期望」的差异说明。
 *
 * 刻意**只报首处差异 + 差异条数**，不整表打印：规则 id 序列一条路径就有上百项
 * （/microsoft/vscode/settings 有 98 条），整表打印会把终端刷满、真正的信息被淹掉。
 * 首处差异已足够定位（位置 + 期望值 + 实际值），要看全貌用 --update 前后比 diff。
 */
function listChange(
	actual: readonly string[],
	expected: readonly string[],
): string | null {
	const diff = diffList(actual, expected);
	if (diff === null) return null;
	const dropped = expected.filter(
		(item) => !actual.includes(item),
	).length;
	const added = actual.filter(
		(item) => !expected.includes(item),
	).length;
	const tail =
		dropped + added > 0
			? `；快照有 ${dropped} 项不见了，实际多出 ${added} 项`
			: "";
	return `${diff}${tail}`;
}

/**
 * 纯函数：比对实际骨架与快照，返回中文错误列表（空数组 = 一致）。
 * 每条错误都指出「哪条路径的哪一项变了、期望什么、实为什么」。
 */
export function diffSkeleton(
	actual: ViewSkeleton,
	snapshot: ViewSkeleton,
	locale: string,
): string[] {
	const errors: string[] = [];
	if (snapshot.modules.length === 0) {
		return [
			`${locale}：快照里没有模块清单（生成：bun run check:view --update）`,
		];
	}
	const modules = listChange(
		actual.modules,
		snapshot.modules,
	);
	if (modules !== null) {
		errors.push(
			`${locale}：模块顺序变了（core/modules.jsonc 的顺序即优先级）——${modules}`,
		);
	}
	const last = actual.modules[actual.modules.length - 1];
	if (last !== GLOBAL_MODULE) {
		errors.push(
			`${locale}：最后一个模块必须是 ${GLOBAL_MODULE}（兜底模块，route 命中一切），实为 ${last === undefined ? "（无）" : JSON.stringify(last)}`,
		);
	}
	if (actual.probes.length !== snapshot.probes.length) {
		errors.push(
			`${locale}：探针路径数量变了——期望 ${snapshot.probes.length} 条，实为 ${actual.probes.length} 条`,
		);
	}
	const actualByPath = new Map(
		actual.probes.map((probe) => [probe.path, probe]),
	);
	for (const expected of snapshot.probes) {
		const got = actualByPath.get(expected.path);
		if (got === undefined) {
			errors.push(
				`${locale} ${expected.path}：快照里有这条探针路径，实际数据里没有（探针清单被改动？）`,
			);
			continue;
		}
		const matched = listChange(
			got.matched,
			expected.matched,
		);
		if (matched !== null) {
			errors.push(
				`${locale} ${expected.path}：命中模块序列变了——${matched}`,
			);
		}
		const rules = listChange(got.rules, expected.rules);
		if (rules !== null) {
			errors.push(
				`${locale} ${expected.path}：生效规则 id 序列变了——${rules}`,
			);
		}
		const pending = listChange(
			got.notTranslated,
			expected.notTranslated,
		);
		if (pending !== null) {
			errors.push(
				`${locale} ${expected.path}：尚未翻译的规则 id 序列变了——${pending}（往 core/rules.jsonc 加了规则却没给本语言模板？或某条模板被删除 / id 改名）`,
			);
		}
		errors.push(
			...diffCollisions(
				got.collisions,
				expected.collisions,
				{
					locale,
					path: expected.path,
				},
			),
		);
	}
	return errors;
}

/** 赢家覆盖的比对：消失 / 改主 / 新增，三种情况都要有人看 */
function diffCollisions(
	actual: readonly Winner[],
	expected: readonly Winner[],
	where: { readonly locale: string; readonly path: string },
): string[] {
	const errors: string[] = [];
	const expectedByKey = new Map(
		expected.map((collision) => [
			collision.key,
			collision.module,
		]),
	);
	const actualByKey = new Map(
		actual.map((collision) => [
			collision.key,
			collision.module,
		]),
	);
	for (const [key, winner] of expectedByKey) {
		const got = actualByKey.get(key);
		if (got === undefined) {
			errors.push(
				`${where.locale} ${where.path}：键 ${JSON.stringify(key)} 不再由 ≥2 个命中模块提供（原本 ${JSON.stringify(winner)} 胜出——某个模块少译了这个键？）`,
			);
			continue;
		}
		if (got !== winner) {
			errors.push(
				`${where.locale} ${where.path}：键 ${JSON.stringify(key)} 的胜出模块变了——期望 ${JSON.stringify(winner)}，实为 ${JSON.stringify(got)}（模块顺序或词条改动导致）`,
			);
		}
	}
	for (const [key, winner] of actualByKey) {
		if (expectedByKey.has(key)) continue;
		errors.push(
			`${where.locale} ${where.path}：新增同键异译——键 ${JSON.stringify(key)} 现在由 ≥2 个命中模块提供，${JSON.stringify(winner)} 胜出（确认是有意的再 --update）`,
		);
	}
	return errors;
}

// —— 数据加载与主流程 ——

const FIXTURE_DIR = "tooling/fixtures";

/** 快照按语言一份：同键异译是分语言的事实（见文件头说明） */
export function fixturePath(locale: LocaleId): string {
	return `${FIXTURE_DIR}/view-skeleton.${locale}.json`;
}

export interface LoadedLocale {
	readonly locale: LocaleId;
	readonly dict: LocaleDict;
	readonly skeleton: ViewSkeleton;
}

/**
 * 严格构建所有语言的骨架（问题一次列全，不 import 软失败的 index.ts）。
 * 词典本身有问题时返回错误而不是抛异常——门禁要把「数据坏了」与「骨架变了」分开报。
 */
export function loadSkeletons(): {
	readonly loaded: readonly LoadedLocale[];
	readonly errors: readonly string[];
} {
	const errors: string[] = [];
	const builtCore = buildCore();
	errors.push(...builtCore.errors);
	if (builtCore.core === null)
		return { loaded: [], errors };
	const core = builtCore.core;
	const ruleIds = ruleIdMap(core.rules);
	const coreModules = core.modules.map(
		(module) => module.name,
	);
	const loaded: LoadedLocale[] = [];
	for (const raw of localeRawDicts) {
		const localeData = buildLocaleData({
			localeId: raw.locale,
			core,
			canonical: builtCore.canonical,
			modules: raw.modules,
			rulesRaw: raw.rules,
		});
		if (localeData === null || localeData.dict === null) {
			errors.push(
				`${raw.locale}：词典无法严格编译（先跑 bun run check:dict 看原因），骨架无从生成`,
			);
			continue;
		}
		// 数据本身有错时不生成骨架：否则会把坏数据固化进快照
		if (localeData.errors.length > 0) {
			errors.push(
				...localeData.errors.map(
					(error) => `${raw.locale}：${error}`,
				),
			);
			continue;
		}
		try {
			loaded.push({
				locale: raw.locale,
				dict: localeData.dict,
				skeleton: buildSkeleton(
					coreModules,
					localeData.dict.modules,
					ruleIds,
					pendingRuleIds(
						core.rules,
						localeData.dict.modules,
					),
				),
			});
		} catch (error) {
			errors.push(
				error instanceof Error
					? error.message
					: String(error),
			);
		}
	}
	// 声明了却没数据：与词典门禁同一套配置校验
	const shipped = new Set(
		localeRawDicts.map((raw) => raw.locale),
	);
	for (const meta of LOCALES) {
		if (!shipped.has(meta.id)) {
			errors.push(
				`${meta.id}：src/dict/locales.ts 声明了该语言，但 registry.ts 里没有它的数据`,
			);
		}
	}
	return { loaded, errors };
}

/** 某条探针路径合并后的词条数 / 规则数：纯统计，不进快照，只打印给人看 */
export function pathCounts(
	pathname: string,
	modules: readonly ModuleDict[],
): { readonly entries: number; readonly rules: number } {
	const matched = matchModules(pathname, modules);
	const keys = new Set<string>();
	let rules = 0;
	for (const module of matched) {
		for (const key of Object.keys(module.entries))
			keys.add(key);
		rules += module.rules.length;
	}
	return { entries: keys.size, rules };
}

function printCounts(dict: LocaleDict): void {
	for (const pathname of PROBE_PATHS) {
		const counts = pathCounts(pathname, dict.modules);
		const matched = matchModules(pathname, dict.modules)
			.map((module) => module.name)
			.join(" + ");
		console.log(
			`  ${probeName(pathname) || "（根路径）"}：${counts.entries} 词条 / ${counts.rules} 规则 [${matched}]`,
		);
	}
}

/** 读快照：文件不存在返回 null（是否算失败由调用方决定，--update 下不算） */
async function readSnapshot(
	locale: LocaleId,
): Promise<ViewSkeleton | null> {
	const file = Bun.file(fixturePath(locale));
	if (!(await file.exists())) return null;
	const raw: unknown = await file.json();
	if (raw === null || typeof raw !== "object") {
		throw new Error(
			`${fixturePath(locale)}：快照必须是 JSON 对象，实为 ${typeof raw}`,
		);
	}
	return raw as ViewSkeleton;
}

async function run(update: boolean): Promise<void> {
	const { loaded, errors } = loadSkeletons();
	if (errors.length > 0) {
		console.error(
			`视图骨架门禁未通过：词典数据本身有问题（${errors.length} 处）——先跑 bun run check:dict 修数据：`,
		);
		for (const error of errors)
			console.error(`  - ${error}`);
		process.exitCode = 1;
		return;
	}
	if (update) {
		for (const { locale, skeleton } of loaded) {
			const path = fixturePath(locale);
			await Bun.write(path, serializeSkeleton(skeleton));
			console.log(`已更新快照 ${path}`);
		}
		return;
	}
	const problems: string[] = [];
	for (const { locale, skeleton } of loaded) {
		const snapshot = await readSnapshot(locale);
		if (snapshot === null) {
			problems.push(
				`${locale}：缺少快照 ${fixturePath(locale)}（生成：bun run check:view --update）`,
			);
			continue;
		}
		problems.push(
			...diffSkeleton(skeleton, snapshot, locale),
		);
	}
	if (problems.length > 0) {
		console.error(
			`视图骨架门禁未通过（${problems.length} 处）：`,
		);
		for (const problem of problems) {
			console.error(`  - ${problem}`);
		}
		console.error(
			"若改动是有意的（例如有意新增同键异译或调整模块顺序），用 bun run check:view --update 重新生成快照，并在提交信息里说明原因。",
		);
		process.exitCode = 1;
		return;
	}
	console.log(
		`视图骨架一致：${loaded
			.map(({ locale }) => locale)
			.join(" / ")}`,
	);
	for (const { locale, dict } of loaded) {
		console.log(`  ${locale}：`);
		printCounts(dict);
	}
}

if (import.meta.main) {
	await run(process.argv.includes("--update"));
}
