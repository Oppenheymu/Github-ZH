// 合并视图的纯函数层：路由匹配 + 模块合并。
//
// 为什么独立于 pages.ts：pages.ts 为了取数据要 import src/dict/index.ts，而 index.ts 是
// **软失败**的（单模块编译失败只跳过 + 打日志）。门禁若顺着 pages.ts 拿到同一份逻辑，
// 就会跟着软失败一起变绿——这正是最危险的失真。故这里只放纯函数：
// 数据一律由参数传入，本模块不 import 任何词典数据，运行时与门禁才能共用同一份合并语义。

import type {
	DictView,
	LocaleDict,
	ModuleDict,
	Rule,
} from "../shared/types.ts";

/** 纯函数：返回所有 route 命中 pathname 的模块（保持 core 里的顺序，顺序即优先级） */
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
 * aliases 必须显式传入：语言无关，调用方负责取一份并复用。
 */
export function buildView(
	pathname: string,
	dict: LocaleDict,
	aliases: ReadonlyMap<string, string>,
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
