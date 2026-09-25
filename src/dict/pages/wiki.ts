// 维基模块：/owner/repo/wiki（文档页）专属词条
// 模块头即路由说明：两段仓库路径下的 wiki 子树
// 注：侧栏页面列表与页标题中的维基页面名（Home、Roadmap 等）为仓库内容
// （类比文件名 / 工作流名 / 议题标题），不收录；页脚编辑记录与标签页标题
// 中的用户名 / 页面名 / 仓库名靠规则捕获原样保留

import type { PageDict } from "../../shared/types.ts";

export const wikiDict: PageDict = {
	route: /^\/[^/]+\/[^/]+\/wiki/,
	entries: {
		// —— 侧栏 ——
		"Wiki pages": "维基页面",
		Pages: "页面",
		"Find a page or section": "查找页面或章节",
		"Find a page or section…": "查找页面或章节…",
		// —— 页面工具 ——
		"Jump to bottom": "跳到底部",
		"Clone this wiki locally": "在本地克隆此维基",
		"Clone URL for this wiki": "此维基的克隆 URL",
	},
	rules: [
		// 页脚编辑记录（用户名原样保留）
		{
			pattern: /^(.+) edited this page$/,
			replacement: "$1 编辑了此页面",
		},
		// 页脚修订计数（单复数通吃）
		{
			pattern: /^([\d,]+) revisions?$/,
			replacement: "$1 次修订",
		},
		// 侧栏展开剩余页面的按钮
		{
			pattern: /^Show (\d+) more pages…$/,
			replacement: "显示另外 $1 个页面…",
		},
		// 标签页标题（页面名与仓库名原样保留）
		{
			pattern: /^(.+) · ([^/]+\/[^/]+) Wiki · GitHub$/,
			replacement: "$1 · $2 维基 · GitHub",
		},
	],
};
