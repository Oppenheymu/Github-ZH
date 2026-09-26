// 词典与翻译管线的共享类型定义（content / popup / dict 共用）
//
// 数据形态（见 docs/guides/development.md）：
//   core/（语言无关：模块与路由、共享规则、上游改名映射、规范键清单）
//   locales/<语言>/（只有译文：词条键值对 + 规则模板，稀疏覆盖）
// 因此「规则」在编译期（RuleDef，只有 pattern）与运行期（Rule，pattern + 当前语言的
// 替换模板）是两个类型，不是同一个东西。

import type { LocaleId } from "../dict/locales.ts";

/** 共享规则定义（core/rules.jsonc 编译结果）：pattern 与语言无关，id 在语言间对齐模板 */
export interface RuleDef {
	/** 全局唯一的规则 id（形如 `global/minutes-ago`），locales/<语言>/rules.jsonc 按它给模板 */
	readonly id: string;
	/** 所属模块名：规则只在模块路由命中时生效（与词条同一套作用域） */
	readonly module: string;
	readonly pattern: RegExp;
}

/** 运行时规则：共享 pattern + 当前语言的替换模板 */
export interface Rule {
	/** 匹配模式（禁用 g / y 标志——lastIndex 状态会跨节点累积，见 tooling/checks/dict.ts） */
	readonly pattern: RegExp;
	/** 替换模板（必须含目标语言的文字系统，防 MutationObserver 翻译循环） */
	readonly replacement: string;
}

/** 模块定义（core/modules.jsonc 编译结果）：顺序即优先级，global 兜底必须排在最后 */
export interface ModuleDef {
	readonly name: string;
	/** 路由正则：对 location.pathname 做 test（必须以 ^/ 锚定、不带标志） */
	readonly route: RegExp;
}

/** 一个模块在某种语言下的词典（全站通用的 global 也是一个模块，route 为 ^/） */
export interface ModuleDict {
	readonly name: string;
	readonly route: RegExp;
	/** 静态词条：键 = GitHub 实际渲染的英文原文（整节点精确匹配语义）；缺键 = 未翻译 */
	readonly entries: Readonly<Record<string, string>>;
	/** 本模块专属正则规则（只翻译了模板的规则才会出现在这里） */
	readonly rules: readonly Rule[];
}

/** 一种目标语言的完整词典（模块顺序即优先级） */
export interface LocaleDict {
	readonly locale: LocaleId;
	readonly modules: readonly ModuleDict[];
}

/** 语言无关的核心数据：模块顺序、规则顺序与上游改名映射 */
export interface DictCore {
	readonly modules: readonly ModuleDef[];
	readonly rules: readonly RuleDef[];
	/** 上游改名映射：当前 DOM 文本 → 规范键（core/canonical.jsonc 里的键） */
	readonly aliases: Readonly<Record<string, string>>;
}

/** 运行时合并视图：命中路由的模块合并结果 + 改名映射（热路径只查 Map） */
export interface DictView {
	readonly entries: ReadonlyMap<string, string>;
	/** 改名映射：直查词条未命中时按它换规范键再查一次 */
	readonly aliases: ReadonlyMap<string, string>;
	/** 已按优先级排序：模块顺序与 core/modules.jsonc 一致（先命中先生效） */
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
