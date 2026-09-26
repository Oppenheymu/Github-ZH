// 路由解析：按 location.pathname 合并 global 与命中的页面模块
// buildView / matchPageModules 为纯函数；viewForPath 用单槽缓存热路径

import { globalDict, pageDicts } from "../dict/index.ts";
import type {
	DictView,
	GlobalDict,
	PageDict,
	Rule,
} from "../shared/types.ts";

/** 纯函数：返回所有 route 命中 pathname 的页面模块（保持注册表顺序） */
export function matchPageModules(
	pathname: string,
	modules: readonly PageDict[],
): PageDict[] {
	return modules.filter((dict) =>
		dict.route.test(pathname),
	);
}

/**
 * 纯函数：构建合并视图。
 * 词条「先到先得」——调用方需保证 modules 已按具体 → 泛化排序，
 * 因此具体页词条压过泛化页，页面词条压过 global 兜底；
 * 规则同序合并，运行时首条命中生效。
 */
export function buildView(
	pathname: string,
	global: GlobalDict,
	modules: readonly PageDict[],
): DictView {
	const entries = new Map<string, string>();
	const put = (
		source: Readonly<Record<string, string>>,
	) => {
		for (const [key, value] of Object.entries(source)) {
			if (!entries.has(key)) entries.set(key, value);
		}
	};
	const rules: Rule[] = [];
	for (const dict of matchPageModules(pathname, modules)) {
		put(dict.entries);
		rules.push(...dict.rules);
	}
	put(global.entries);
	rules.push(...global.rules);
	return { entries, rules };
}

// 单槽缓存：Turbo 导航改路径时才重建视图
let cachedPath: string | null = null;
let cachedView: DictView | null = null;

/** 入口热路径：同一路径直接复用缓存视图，换路径即重建 */
export function viewForPath(pathname: string): DictView {
	if (cachedPath === pathname && cachedView !== null)
		return cachedView;
	cachedPath = pathname;
	cachedView = buildView(pathname, globalDict, pageDicts);
	return cachedView;
}
