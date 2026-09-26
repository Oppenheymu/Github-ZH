// 语言元数据表：已支持的目标语言、显示名与文字系统声明
//
// 为什么需要它：词典门禁要判断「译文是否真的译成了目标语言」，而语言相关的判定
// 绝不能写死汉字——纯假名的日语译文（「もっと見る」）在 CJK 判定下会被直接拒绝，
// 韩语 / 泰语 / 阿拉伯语更是一条都过不了。因此把「目标语言用什么文字系统」集中
// 声明在这里，业务代码只消费声明，不内联任何具体文字系统。

/**
 * 目标语言使用的 Unicode 文字系统（即 `\p{Script=X}` 的 X）。
 * 只登记当前确实使用的项；新增语言需要新字系时在这里补一个名字即可。
 */
export type Script = "Han" | "Hiragana" | "Katakana";

/** 已支持的目标语言 id（即 BCP 47 标签的规范写法） */
export type LocaleId = "zh-CN" | "ja";

export interface LocaleMeta {
	/** 语言 id：同时是 locales/<id>/ 目录名与 storage 里存的值 */
	readonly id: LocaleId;
	/** 显示名：用该语言自身书写，供 popup 语言选择器展示 */
	readonly name: string;
	/**
	 * 该语言的译文至少应命中的文字系统之一，门禁据此校验译文形态。
	 * 空数组 = 拉丁语系目标：它与源语言共用拉丁字母，无法凭字系区分
	 * 「已翻译」与「英文原文」，防循环只能靠「译文不得等于任何键」的结构门禁
	 * （见 tooling/checks/dict.ts）——这是已知边界，不是遗漏。
	 */
	readonly scripts: readonly Script[];
}

/** 支持的语言：顺序即 popup 选择器顺序，第一个为默认语言的候选 */
export const LOCALES: readonly LocaleMeta[] = [
	{ id: "zh-CN", name: "简体中文", scripts: ["Han"] },
	{
		id: "ja",
		name: "日本語",
		scripts: ["Han", "Hiragana", "Katakana"],
	},
];

/** 未指定 / 识别不出浏览器语言时的回退语言（也是本扩展的传统默认） */
export const FALLBACK_LOCALE: LocaleId = "zh-CN";

export function isLocaleId(
	value: unknown,
): value is LocaleId {
	return (
		typeof value === "string" &&
		LOCALES.some((meta) => meta.id === value)
	);
}

/** 取语言元数据；id 不存在即抛错（防类型与注册表脱节） */
export function getLocaleMeta(id: LocaleId): LocaleMeta {
	const meta = LOCALES.find(
		(candidate) => candidate.id === id,
	);
	if (meta === undefined) {
		throw new Error(`未声明的语言：${id}`);
	}
	return meta;
}

/**
 * 浏览器语言标签 → 已支持的语言 id：
 * 先忽略大小写精确匹配（`zh-cn` / `zh_CN` 都算），再按主语言子标签匹配
 * （`ja-JP` → ja、`zh-Hans-CN` → zh-CN），都不命中则回退。
 */
export function resolveLocale(tag: string): LocaleId {
	const normalized = tag
		.trim()
		.toLowerCase()
		.replaceAll("_", "-");
	if (normalized.length === 0) return FALLBACK_LOCALE;
	for (const meta of LOCALES) {
		if (meta.id.toLowerCase() === normalized)
			return meta.id;
	}
	const language = normalized.split("-")[0] ?? "";
	for (const meta of LOCALES) {
		if (meta.id.toLowerCase().split("-")[0] === language) {
			return meta.id;
		}
	}
	return FALLBACK_LOCALE;
}
