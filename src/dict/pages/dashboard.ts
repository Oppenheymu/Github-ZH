// 仪表板模块：根路径（登录后首页）

import type { PageDict } from "../../shared/types.ts";

export const dashboardDict: PageDict = {
	route: /^\/$/,
	entries: {
		Home: "主页",
		"For you": "为你推荐",
		"Top repositories": "热门仓库",
		"Find a repository…": "查找仓库…",
		"Recent activity": "最近动态",
		"Latest changes": "最新变更",
		"Create repository": "创建仓库",
	},
	rules: [],
};
