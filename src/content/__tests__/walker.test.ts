import { describe, expect, it } from "bun:test";
import type { DictView } from "../../shared/types.ts";
import { translateText, translateTree } from "../walker.ts";

const view: DictView = {
	entries: new Map([
		["Star", "星标"],
		["Fork", "复刻"],
		["Collaborators", "协作者"],
	]),
	aliases: new Map([
		// 上游把 Sign in with GitHub 改成 Sign in to GitHub 的场景
		["Sign in with GitHub", "Sign in to GitHub"],
		["Collaborators", "Collaborators"],
	]),
	rules: [
		{
			pattern: /^(\d+) minutes? ago$/,
			replacement: "$1 分钟前",
		},
		{ pattern: /^([\d,]+) Open$/, replacement: "$1 打开" },
	],
};

describe("translateText", () => {
	it("maps exact static entries", () => {
		expect(translateText("Star", view)).toBe("星标");
		expect(translateText("Fork", view)).toBe("复刻");
	});

	it("matches keys case-sensitively", () => {
		expect(translateText("star", view)).toBeNull();
	});

	it("falls back to the alias map when the direct lookup misses", () => {
		const aliased: DictView = {
			...view,
			entries: new Map([
				...view.entries,
				["Sign in to GitHub", "使用 GitHub 登录"],
			]),
		};
		expect(
			translateText("Sign in with GitHub", aliased),
		).toBe("使用 GitHub 登录");
		// 直查命中时不走别名：别名源与键同名时以直查译文为准
		expect(translateText("Star", aliased)).toBe("星标");
	});

	it("prefers a direct entry over an alias pointing at itself", () => {
		expect(translateText("Collaborators", view)).toBe(
			"协作者",
		);
	});

	it("applies the first matching regex rule", () => {
		expect(translateText("3 minutes ago", view)).toBe(
			"3 分钟前",
		);
		expect(translateText("1 minute ago", view)).toBe(
			"1 分钟前",
		);
		expect(translateText("128 Open", view)).toBe(
			"128 打开",
		);
	});

	it("collapses surrounding and inner whitespace before matching", () => {
		// GitHub React 页面的文本节点常带首尾空白与换行缩进
		expect(translateText("  Star  ", view)).toBe("星标");
		expect(translateText("3\n   minutes ago", view)).toBe(
			"3 分钟前",
		);
		expect(translateText("Fork\n            ", view)).toBe(
			"复刻",
		);
	});

	it("returns null when nothing matches", () => {
		expect(translateText("Unknown", view)).toBeNull();
	});

	it("skips text that fails the translatable check", () => {
		expect(translateText("已翻译", view)).toBeNull();
		expect(translateText("", view)).toBeNull();
		expect(translateText("a".repeat(501), view)).toBeNull();
	});

	it("prefers the static dictionary over rules", () => {
		const overlapping: DictView = {
			entries: new Map([["2 minutes ago", "两分钟前"]]),
			aliases: new Map(),
			rules: view.rules,
		};
		expect(
			translateText("2 minutes ago", overlapping),
		).toBe("两分钟前");
	});
});

describe("translateTree 的同值写入守卫", () => {
	/**
	 * 桩 DOM：只实现 walker.ts 用到的 createTreeWalker / closest / nodeValue。
	 * 每次给 nodeValue 赋值都记一笔「写入」，用来断言同值写入确实被跳过。
	 */
	class StubText {
		readonly nodeType = 3;
		readonly writes: string[] = [];
		parentElement: {
			closest(selector: string): unknown;
		} | null = null;
		#value: string;
		constructor(value: string) {
			this.#value = value;
		}
		get nodeValue(): string {
			return this.#value;
		}
		set nodeValue(next: string) {
			this.#value = next;
			this.writes.push(next);
		}
	}

	class StubElement {
		readonly nodeType = 1;
		readonly childNodes: (StubElement | StubText)[] = [];
		readonly tagName: string;
		readonly classes: Set<string> = new Set();
		readonly attrs = new Map<string, string>();
		parentElement: StubElement | null = null;
		constructor(tag: string) {
			this.tagName = tag.toUpperCase();
		}
		append(node: StubElement | StubText): void {
			Object.defineProperty(node, "parentElement", {
				value: this,
				configurable: true,
			});
			this.childNodes.push(node);
		}
		addText(value: string): StubText {
			const text = new StubText(value);
			this.append(text);
			return text;
		}
		getAttribute(name: string): string | null {
			return this.attrs.get(name) ?? null;
		}
		closest(selector: string): StubElement | null {
			const parts = selector
				.split(",")
				.map((part) => part.trim());
			const matches = (element: StubElement): boolean =>
				parts.some((part) =>
					part.startsWith(".")
						? element.classes.has(part.slice(1))
						: element.tagName === part.toUpperCase(),
				);
			let current: StubElement | null = this;
			while (current !== null) {
				if (matches(current)) return current;
				current = current.parentElement;
			}
			return null;
		}
	}

	class StubTreeWalker {
		readonly #queue: (StubElement | StubText)[] = [];
		readonly #filter: { acceptNode(node: unknown): number };
		constructor(
			root: StubElement | StubText,
			_filter: unknown,
			filter: { acceptNode(node: unknown): number },
		) {
			this.#filter = filter;
			this.#queue.push(root);
		}
		nextNode(): unknown {
			while (this.#queue.length > 0) {
				const node = this.#queue.shift();
				if (node === undefined) return null;
				if (this.#filter.acceptNode(node) === 2) continue;
				if (node instanceof StubElement) {
					this.#queue.push(...node.childNodes);
				}
				return node;
			}
			return null;
		}
	}

	// 一次性装桩：Node / NodeFilter / Element / document 只被 walker 用到这四处
	const globals = globalThis as unknown as Record<
		string,
		unknown
	>;
	globals["Node"] = { TEXT_NODE: 3 };
	globals["Element"] = StubElement;
	globals["NodeFilter"] = {
		SHOW_ELEMENT: 1,
		SHOW_TEXT: 4,
		FILTER_ACCEPT: 1,
		FILTER_REJECT: 2,
		FILTER_SKIP: 3,
	};
	globals["document"] = {
		createTreeWalker(
			root: StubElement | StubText,
			what: unknown,
			filter: { acceptNode(node: unknown): number },
		) {
			return new StubTreeWalker(root, what, filter);
		},
	};

	/** 译文与原文同形：这正是让 /settings/profile 卡死的形态 */
	const selfIdentical: DictView = {
		entries: new Map([["ORCID iD", "ORCID iD"]]),
		aliases: new Map(),
		rules: [],
	};

	it("skips writing when the translation equals the current value", () => {
		const root = new StubElement("div");
		const node = root.addText("ORCID iD");
		const replaced = translateTree(
			root as unknown as Node,
			selfIdentical,
		);
		expect(replaced).toBe(0);
		// 关键断言：一次赋值都没发生（同值写入也会产生 characterData 记录，
		// 观察器会把它再入队，于是微任务队列无限自转）
		expect(node.writes).toEqual([]);
		expect(node.nodeValue).toBe("ORCID iD");
	});

	it("still writes when the translation differs", () => {
		const root = new StubElement("div");
		const node = root.addText("Star");
		const replaced = translateTree(
			root as unknown as Node,
			view,
		);
		expect(replaced).toBe(1);
		expect(node.writes).toEqual(["星标"]);
		// 第二轮：已是译文，不再产生任何写入（收敛）
		expect(
			translateTree(root as unknown as Node, view),
		).toBe(0);
		expect(node.writes).toHaveLength(1);
	});
});
