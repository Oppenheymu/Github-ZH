// 运行时视图入口：取当前语言的数据 + 语言无关的别名映射，按「路径 + 语言」单槽缓存。
//
// 合并语义本身在 view.ts（纯函数，数据由参数传入）——那边不 import 词典，
// 门禁才能在不碰软失败的 index.ts 的前提下复用同一份合并逻辑（见 view.ts 顶部说明）。

import { dictCore, dictForLocale } from "../dict/index.ts";
import type { LocaleId } from "../dict/locales.ts";
import type { DictView } from "../shared/types.ts";
import { buildView } from "./view.ts";

/** 语言无关的上游改名映射：所有语言共用一份，构建视图时直接挂上 */
const aliasMap: ReadonlyMap<string, string> = new Map(
	Object.entries(dictCore.aliases),
);

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
