// TreeWalker 翻译核心：文本节点查静态词典与正则规则，元素查属性词条
// DOM 相关部分保持薄层；纯函数 translateText 导出供测试复用

import type { DictView } from "../shared/types.ts";
import { recordAttr, recordText } from "./collector.ts";
import {
	EXCLUDE_SELECTOR,
	isTranslatableText,
} from "./filters.ts";

/** 需要精确命中词条才替换的元素属性（属性不应用正则规则，防误伤） */
const TRANSLATABLE_ATTRS = [
	"title",
	"aria-label",
	"placeholder",
	"alt",
] as const;

/**
 * 对一段文本应用词典视图，返回译文；未命中返回 null。
 * 查询键先 trim 并把连续空白折叠为单空格（GitHub React 页面的文本节点
 * 常带首尾空白与换行缩进，精确匹配必须先归一），顺序：静态词典精确命中
 * → 首条命中的正则规则（pattern 不允许 g 标志，test 无 lastIndex 累积
 * 问题，见 tooling/checks/dict.ts 门禁）。
 */
export function translateText(
	text: string,
	view: DictView,
): string | null {
	if (!isTranslatableText(text)) return null;
	const normalized = normalizeKey(text);
	const mapped = view.entries.get(normalized);
	if (mapped !== undefined) return mapped;
	for (const rule of view.rules) {
		if (!rule.pattern.test(normalized)) continue;
		return normalized.replace(
			rule.pattern,
			rule.replacement,
		);
	}
	return null;
}

/** 查询键归一：trim 并折叠连续空白为单空格 */
function normalizeKey(text: string): string {
	return text.trim().replace(/\s+/g, " ");
}

/** 替换单个文本节点，保留原文首尾空白；返回是否发生了替换 */
function applyTextNode(
	node: Text,
	view: DictView,
): boolean {
	const value = node.nodeValue ?? "";
	const translated = translateText(value, view);
	if (translated === null) {
		// 未命中词典与规则：开发者模式下记录 trimmed 原文
		// （可翻译判定已滤掉空白 / CJK / 超长，排除容器由调用方整树跳过）
		if (isTranslatableText(value)) recordText(value);
		return false;
	}
	const lead = value.slice(
		0,
		value.length - value.trimStart().length,
	);
	const trail = value.slice(value.trimEnd().length);
	node.nodeValue = `${lead}${translated}${trail}`;
	return true;
}

/** 精确命中词条才替换元素属性值，同样保留首尾空白 */
function applyAttrs(
	element: Element,
	view: DictView,
): void {
	for (const name of TRANSLATABLE_ATTRS) {
		const value = element.getAttribute(name);
		if (value === null) continue;
		if (!isTranslatableText(value)) continue;
		const mapped = view.entries.get(normalizeKey(value));
		if (mapped === undefined) {
			// 未命中词条的属性值：开发者模式下记录（属性不应用正则规则，只会因缺词条漏翻）
			recordAttr(name, normalizeKey(value));
			continue;
		}
		const lead = value.slice(
			0,
			value.length - value.trimStart().length,
		);
		const trail = value.slice(value.trimEnd().length);
		element.setAttribute(name, `${lead}${mapped}${trail}`);
	}
}

/**
 * 翻译以 root 为根的子树，返回替换次数（供调试与测试断言）。
 * 排除容器内的子树整棵跳过（closest 同时覆盖祖先，越界根也不误入）。
 */
export function translateTree(
	root: Node,
	view: DictView,
): number {
	let count = 0;
	if (root.nodeType === Node.TEXT_NODE) {
		const parent = root.parentElement;
		if (!parent || parent.closest(EXCLUDE_SELECTOR))
			return 0;
		return applyTextNode(root as Text, view) ? 1 : 0;
	}
	if (
		root instanceof Element &&
		root.closest(EXCLUDE_SELECTOR)
	)
		return 0;
	const walker = document.createTreeWalker(
		root,
		NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT,
		{
			acceptNode(node: Node): number {
				if (node.nodeType === Node.TEXT_NODE) {
					const parent = node.parentElement;
					if (!parent || parent.closest(EXCLUDE_SELECTOR)) {
						return NodeFilter.FILTER_SKIP;
					}
					if (applyTextNode(node as Text, view)) count++;
					return NodeFilter.FILTER_SKIP;
				}
				const element = node as Element;
				if (element.closest(EXCLUDE_SELECTOR)) {
					return NodeFilter.FILTER_REJECT;
				}
				applyAttrs(element, view);
				return NodeFilter.FILTER_SKIP;
			},
		},
	);
	// 收集与替换都在 acceptNode 内完成，这里只需驱动遍历
	while (walker.nextNode() !== null);
	return count;
}
