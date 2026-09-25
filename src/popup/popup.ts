// popup 逻辑：开关读写 + 状态文案 + 版本号回填

import {
	readEnabled,
	writeEnabled,
} from "../shared/storage.ts";

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

/** 渲染开关与状态文案（与 popup.html 的 #status.on/.off 样式联动） */
function render(enabled: boolean): void {
	toggle.checked = enabled;
	status.textContent = enabled ? "已启用" : "已停用";
	status.className = enabled ? "on" : "off";
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
}

main();
