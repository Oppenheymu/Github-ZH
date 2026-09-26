// Mutation 批量调度：收集 → 微任务合并 → 统一 flush
// MutationObserver 挂在 documentElement 上，天然覆盖 Turbo SPA 导航

import type { DictView } from "../shared/types.ts";
import { translateTree } from "./walker.ts";

/** 引擎宿主：由入口注入词典视图来源与开关状态（便于解耦测试） */
export interface EngineHost {
	/** 取当前词典视图（入口侧按 location.pathname 单槽缓存切换） */
	getView(): DictView;
	/** 翻译总开关；关闭时 flush 只清空队列不翻译 */
	isEnabled(): boolean;
}

export class TranslationEngine {
	readonly #host: EngineHost;
	readonly #observer: MutationObserver;
	readonly #pending = new Set<Node>();
	#flushScheduled = false;

	constructor(host: EngineHost) {
		this.#host = host;
		this.#observer = new MutationObserver((records) => {
			this.#collect(records);
		});
	}

	/** 开始观察 root 子树，并把 root 入队做首轮全量翻译 */
	start(root: Node): void {
		this.#observer.observe(root, {
			childList: true,
			subtree: true,
			characterData: true,
			// 属性只观察 value / data-disable-with：按钮类 <input> 的可见文案就在
			// 这两个属性上（见 walker.ts 的 isButtonInputValue）。不加 attributes 的话，
			// 页面把 value 改回英文（Turbo 快照 / data-disable-with）后我们不会重翻。
			// 用 attributeFilter 把噪音压到最小：只有这两个属性变化才产生记录。
			attributes: true,
			attributeFilter: ["value", "data-disable-with"],
		});
		this.#enqueue(root);
	}

	/** 停止观察并清空待处理队列（当前开关流程用整页刷新，此方法备用） */
	stop(): void {
		this.#observer.disconnect();
		this.#pending.clear();
		this.#flushScheduled = false;
	}

	#enqueue(node: Node): void {
		this.#pending.add(node);
		if (this.#flushScheduled) return;
		this.#flushScheduled = true;
		queueMicrotask(() => {
			this.#flush();
		});
	}

	#collect(records: readonly MutationRecord[]): void {
		for (const record of records) {
			// childList 的 target（父节点）子树已覆盖新增节点；
			// characterData 的 target 是文本节点本身
			this.#enqueue(record.target);
		}
	}

	#flush(): void {
		this.#flushScheduled = false;
		if (!this.#host.isEnabled()) {
			this.#pending.clear();
			return;
		}
		const view = this.#host.getView();
		for (const node of this.#pending) {
			// 已脱离文档的节点跳过，避免无谓遍历
			if (node.isConnected) translateTree(node, view);
		}
		this.#pending.clear();
	}
}
