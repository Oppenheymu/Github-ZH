// popup 逻辑：开关读写 + 状态文案 + 版本号回填 + 开发者模式漏翻面板

import { serializeMisses } from "../content/collector.ts";
import {
	readDevMode,
	readEnabled,
	readMissLog,
	watchMissLog,
	writeDevMode,
	writeEnabled,
	writeMissLog,
} from "../shared/storage.ts";
import type { MissItem } from "../shared/types.ts";

/** 断言元素存在并收窄类型（闭包内不保留 || 链收窄，显式断言最稳） */
function assertFound<T>(
	element: T | null,
	selector: string,
): T {
	if (element === null)
		throw new Error(`popup 结构不完整：缺少 ${selector}`);
	return element;
}

const toggle = assertFound(
	document.querySelector<HTMLInputElement>("#toggle"),
	"#toggle",
);
const status = assertFound(
	document.querySelector<HTMLElement>("#status"),
	"#status",
);
const version = assertFound(
	document.querySelector<HTMLElement>(".version"),
	".version",
);
const devToggle = assertFound(
	document.querySelector<HTMLInputElement>("#dev-toggle"),
	"#dev-toggle",
);
const devPanel = assertFound(
	document.querySelector<HTMLElement>("#dev-panel"),
	"#dev-panel",
);
const devCount = assertFound(
	document.querySelector<HTMLElement>("#dev-count"),
	"#dev-count",
);
const devCopy = assertFound(
	document.querySelector<HTMLButtonElement>("#dev-copy"),
	"#dev-copy",
);
const devClear = assertFound(
	document.querySelector<HTMLButtonElement>("#dev-clear"),
	"#dev-clear",
);

/** 当前漏翻日志缓存：watchMissLog 实时同步，复制时同步序列化（用户手势内完成剪贴板写入） */
let misses: readonly MissItem[] = [];

/** 渲染开关与状态文案（与 popup.html 的 #status.on/.off 样式联动） */
function render(enabled: boolean): void {
	toggle.checked = enabled;
	status.textContent = enabled ? "已启用" : "已停用";
	status.className = enabled ? "on" : "off";
}

/** 渲染开发者区块：面板显隐 + 计数文案 */
function renderDev(devMode: boolean): void {
	devToggle.checked = devMode;
	devPanel.classList.toggle("hidden", !devMode);
	devCount.textContent = `已收集 ${misses.length} 条`;
}

/** 复制按钮临时反馈文案，1.5 秒后还原 */
function flashCopyButton(text: string): void {
	devCopy.textContent = text;
	devCopy.disabled = true;
	window.setTimeout(() => {
		devCopy.textContent = "复制";
		devCopy.disabled = false;
	}, 1500);
}

/** 初始化开发者区块：读漏翻日志与开关状态 */
async function initDev(): Promise<void> {
	misses = await readMissLog();
	renderDev(await readDevMode());
}

function main(): void {
	version.textContent =
		chrome.runtime.getManifest().version;
	void readEnabled().then(render);
	toggle.addEventListener("change", () => {
		const next = toggle.checked;
		render(next);
		// content script 经 storage.onChanged 收到后整页刷新生效
		void writeEnabled(next);
	});

	void initDev();
	// content script 可能在 popup 打开期间落盘，计数实时刷新
	watchMissLog((items) => {
		misses = items;
		renderDev(devToggle.checked);
	});
	devToggle.addEventListener("change", () => {
		void writeDevMode(devToggle.checked);
		renderDev(devToggle.checked);
	});
	devCopy.addEventListener("click", () => {
		const json = serializeMisses(misses, new Date());
		void navigator.clipboard.writeText(json).then(
			() => flashCopyButton("已复制"),
			() => flashCopyButton("复制失败"),
		);
	});
	devClear.addEventListener("click", () => {
		misses = [];
		renderDev(devToggle.checked);
		void writeMissLog([]);
	});
}

main();
