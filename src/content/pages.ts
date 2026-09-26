// 路由解析：按 location.pathname 合并命中的模块（含 global 兜底）
// buildView / matchModules 为纯函数；viewForPath 用单槽缓存热路径

import { dictCore, dictForLocale } from "../dict/index.ts";
import type { LocaleId } from "../dict/locales.ts";
import type {
	DictView,
	LocaleDict,
	ModuleDict,
	Rule,
} from "../shared/types.ts";

/** 语言无关的上游改名映射：所有语言共用一份，构建视图时直接挂上 */
const aliasMap: ReadonlyMap<string, string> = new Map(
	Object.entries(dictCore.aliases),
);

/** 纯函数：返回所有 route 命中 pathname 的模块（保持 core 里的顺序） */
export function matchModules(
	pathname: string,
	modules: readonly ModuleDict[],
): ModuleDict[] {
	return modules.filter((dict) =>
		dict.route.test(pathname),
	);
}

/**
 * 纯函数：构建合并视图。
 * 词条「先到先得」——模块顺序即优先级（具体页在前、global 兜底在后），
 * 因此具体页词条压过泛化页，页面词条压过 global；规则同序合并，运行时首条命中生效。
 */
export function buildView(
	pathname: string,
	dict: LocaleDict,
	aliases: ReadonlyMap<string, string> = aliasMap,
): DictView {
	const entries = new Map<string, string>();
	const rules: Rule[] = [];
	for (const module of matchModules(
		pathname,
		dict.modules,
	)) {
		for (const [key, value] of Object.entries(
			module.entries,
		)) {
			if (!entries.has(key)) entries.set(key, value);
		}
		rules.push(...module.rules);
	}
	return { entries, aliases, rules };
}

// 单槽缓存：Turbo 导航改路径或用户改目标语言时才重建视图
let cachedKey: string | null = null;
let cachedView: DictView | null = null;

/** 入口热路径：同一 (路径, 语言) 直接复用缓存视图，否则重建 */
export function viewForPath(
	pathname: string,
	locale: LocaleId,
): DictView {
	const key = `${locale}\u0000${pathname}`;
	if (cachedKey === key && cachedView !== null) {
		return cachedView;
	}
	cachedKey = key;
	cachedView = buildView(
		pathname,
		dictForLocale(locale),
		aliasMap,
	);
	return cachedView;
}
