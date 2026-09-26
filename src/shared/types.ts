// 词典与翻译管线的共享类型定义（content / popup / dict 共用）

/** 正则规则：pattern 对整段已 trim 文本 test，命中即执行 replace(pattern, replacement) */
export interface Rule {
	/** 匹配模式（禁用 g / y 标志——lastIndex 状态会跨节点累积，见 tooling/checks/dict.ts） */
	readonly pattern: RegExp;
	/** 替换模板（必须含目标语言的文字系统，防 MutationObserver 翻译循环） */
	readonly replacement: string;
}

/** 页面词典模块：仅 route 命中 location.pathname 时参与合并 */
export interface PageDict {
	/** 路由正则：对 pathname 做 test（必须以 ^/ 开头锚定、不带标志） */
	readonly route: RegExp;
	/** 静态词条：键 = GitHub 实际渲染的英文原文（整节点精确匹配语义） */
	readonly entries: Readonly<Record<string, string>>;
	/** 本页专属正则规则 */
	readonly rules: readonly Rule[];
}

/** 全站词典：所有页面共享的词条与规则 */
export interface GlobalDict {
	readonly entries: Readonly<Record<string, string>>;
	readonly rules: readonly Rule[];
}

/** 运行时合并视图：global + 命中页面模块的预构建只读快照（热路径只查 Map） */
export interface DictView {
	readonly entries: ReadonlyMap<string, string>;
	/** 已按优先级排序：页面模块在前（先命中先生效），global 兜底在后 */
	readonly rules: readonly Rule[];
}

/** 开发者模式收集的未翻译种类：text 为文本节点，其余为元素属性名 */
export type MissKind =
	| "text"
	| "title"
	| "aria-label"
	| "placeholder"
	| "alt";

/** 开发者模式收集的一条未翻译记录（kind + text 唯一，text 即词典候选键） */
export interface MissItem {
	readonly kind: MissKind;
	/** GitHub 实际渲染的英文原文精确串（trim 后） */
	readonly text: string;
	/** 首次出现页面的 location.pathname */
	readonly path: string;
	/** 累计出现次数 */
	readonly count: number;
}
