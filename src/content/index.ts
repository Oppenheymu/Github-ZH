// content script 入口：document_start 启动观察器，storage 开关联动
// 产物为 IIFE 经典脚本（MV3 content_scripts 不支持 module）

import {
	readEnabled,
	watchEnabled,
} from "../shared/storage.ts";
import { TranslationEngine } from "./engine.ts";
import { viewForPath } from "./pages.ts";

let enabled = false;

const engine = new TranslationEngine({
	getView: () => viewForPath(location.pathname),
	isEnabled: () => enabled,
});

async function bootstrap(): Promise<void> {
	enabled = await readEnabled();
	// 关闭状态下不启动观察器；等待 popup 切换后经 storage 联动整页刷新
	if (enabled) engine.start(document.documentElement);
}

// 开关变化一律整页刷新：开启时重建翻译，关闭时还原英文（简单可靠）
watchEnabled((value) => {
	if (value !== enabled) location.reload();
});

void bootstrap();
