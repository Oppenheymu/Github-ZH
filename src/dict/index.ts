// 词典汇总：把注册表里的 JSONC 原始数据编译成运行时词典。
//
// 数据在 data/**.jsonc（编辑器按 dict.schema.json 即时校验），形状翻译统一走 load.ts，
// 与门禁共用同一套编译逻辑；门禁另走严格路径（见 tooling/checks/dict.ts）。
// 本模块刻意容错：单个模块编译失败只跳过该模块并打印错误，不拖垮整站翻译。

import type {
	GlobalDict,
	PageDict,
} from "../shared/types.ts";
import { buildGlobalDict, buildPageDict } from "./load.ts";
import {
	globalRawDict,
	pageRawModules,
} from "./registry.ts";

/**
 * 构建失败即返回 null 并打印错误。
 * 词典数据出错时「少翻一个模块」远好于「整站翻译全失效」，因此运行时不做硬失败；
 * 但错误照打，且门禁会在提交前以非零码拦住同一份数据，故不会有坏数据被发布。
 */
function loadOrSkip<T>(
	where: string,
	build: () => T,
): T | null {
	try {
		return build();
	} catch (error) {
		console.error(
			`[GitHub 汉化] 词典模块加载失败，已跳过（${where}）：${String(error)}`,
		);
		return null;
	}
}

/** 全站词典；构建失败时退化为空词典（页面模块仍可正常工作） */
export const globalDict: GlobalDict = loadOrSkip(
	"global",
	() => buildGlobalDict(globalRawDict, "global"),
) ?? { entries: {}, rules: [] };

/** 页面模块视图；构建失败的模块被剔除 */
export const pageDicts: readonly PageDict[] =
	pageRawModules.flatMap(([where, raw]) => {
		const dict = loadOrSkip(where, () =>
			buildPageDict(raw, where),
		);
		return dict === null ? [] : [dict];
	});
