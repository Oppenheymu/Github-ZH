// popup 逻辑：扩展自身 UI 文案（_locales）+ 开关读写 + 状态文案 + 版本号回填 +
// 开发者模式漏翻面板
//
// 扩展自身 UI 与「翻译目标语言」是两条独立的轴：前者跟随浏览器界面语言，走
// public/_locales/**（manifest 的 __MSG_*__ 也走同一套）；后者是用户在 popup 里
// 选的词典语言，存在 chrome.storage.local，见 src/dict/locales.ts。

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

/**
 * 取扩展 UI 文案；键不存在时返回空串（_locales 键集合一致性由
 * tooling/checks/manifest.ts 门禁保证），故这里显式报错，避免静默空界面。
 */
function msg(
	name: string,
	substitutions?: string[],
): string {
	const text = chrome.i18n.getMessage(
		name,
		substitutions ?? [],
	);
	if (text.length === 0) {
		throw new Error(`缺少扩展 UI 文案：${name}`);
	}
	return text;
}

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
	status.textContent = msg(
		enabled ? "statusOn" : "statusOff",
	);
	status.className = enabled ? "on" : "off";
}

/** 渲染开发者区块：面板显隐 + 计数文案 */
function renderDev(devMode: boolean): void {
	devToggle.checked = devMode;
	devPanel.classList.toggle("hidden", !devMode);
	devCount.textContent = msg("devCount", [
		String(misses.length),
	]);
}

/** 复制按钮临时反馈文案，1.5 秒后还原 */
function flashCopyButton(text: string): void {
	devCopy.textContent = text;
	devCopy.disabled = true;
	window.setTimeout(() => {
		devCopy.textContent = msg("devCopy");
		devCopy.disabled = false;
	}, 1500);
}

/** 初始化开发者区块：读漏翻日志与开关状态 */
async function initDev(): Promise<void> {
	misses = await readMissLog();
	renderDev(await readDevMode());
}

/** 把 popup.html 里所有 data-i18n 占位按浏览器界面语言回填 */
function renderMessages(): void {
	for (const element of document.querySelectorAll<HTMLElement>(
		"[data-i18n]",
	)) {
		const key = element.dataset["i18n"];
		if (key === undefined) continue;
		element.textContent = msg(key);
	}
	document.title = msg("appName");
	document.documentElement.lang =
		chrome.i18n.getUILanguage();
}

function main(): void {
	renderMessages();
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
			() => flashCopyButton(msg("devCopied")),
			() => flashCopyButton(msg("devCopyFailed")),
		);
	});
	devClear.addEventListener("click", () => {
		misses = [];
		renderDev(devToggle.checked);
		void writeMissLog([]);
	});
}

main();
