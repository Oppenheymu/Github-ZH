// content script 入口：document_start 启动观察器，storage 开关联动
// 产物为 IIFE 经典脚本（MV3 content_scripts 不支持 module）

import {
	readDevMode,
	readEnabled,
	watchToggles,
} from "../shared/storage.ts";
import {
	setEnabled as setCollectorEnabled,
	startAutoFlush,
} from "./collector.ts";
import { TranslationEngine } from "./engine.ts";
import { viewForPath } from "./pages.ts";

let enabled = false;
let devMode = false;

const engine = new TranslationEngine({
	getView: () => viewForPath(location.pathname),
	isEnabled: () => enabled,
});

async function bootstrap(): Promise<void> {
	[enabled, devMode] = await Promise.all([
		readEnabled(),
		readDevMode(),
	]);
	setCollectorEnabled(devMode);
	// 关闭状态下不启动观察器；等待 popup 切换后经 storage 联动整页刷新
	if (enabled) engine.start(document.documentElement);
	// 开发者模式开启时启动漏翻收集与节流落盘
	if (devMode) startAutoFlush();
}

// 开关（翻译 / 开发者）任一变化一律整页刷新：
// 开启时重建翻译与收集，关闭时还原英文并停止收集（简单可靠）
watchToggles((key, value) => {
	const current = key === "enabled" ? enabled : devMode;
	if (value !== current) location.reload();
});

void bootstrap();
