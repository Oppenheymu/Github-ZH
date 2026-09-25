// chrome.storage.local 的启用开关读写（content script 与 popup 共用）

const KEY = "enabled";

/** 读取开关状态；从未写入过（异常数据）时默认开启 */
export async function readEnabled(): Promise<boolean> {
	const data = await chrome.storage.local.get(KEY);
	const value = data[KEY];
	return typeof value === "boolean" ? value : true;
}

/** 写入开关状态（popup 调用；content 侧经 onChanged 收到变更） */
export async function writeEnabled(
	enabled: boolean,
): Promise<void> {
	await chrome.storage.local.set({ [KEY]: enabled });
}

/** 监听开关变化；非布尔新值（脏数据）忽略不回调 */
export function watchEnabled(
	callback: (enabled: boolean) => void,
): void {
	chrome.storage.onChanged.addListener((changes, area) => {
		if (area !== "local") return;
		const change = changes[KEY];
		if (!change || typeof change.newValue !== "boolean")
			return;
		callback(change.newValue);
	});
}
