// 议题模块：/owner/repo/issues（列表与详情页）专属词条
// 模块头即路由说明：两段仓库路径下的 issues 子树

import type { PageDict } from "../../shared/types.ts";

export const issuesDict: PageDict = {
	route: /^\/[^/]+\/[^/]+\/issues/,
	entries: {
		Newest: "最新",
		Oldest: "最早",
		"Most commented": "评论最多",
		"Least commented": "评论最少",
		"Recently updated": "最近更新",
		"Least recently updated": "最早更新",
		"New label": "新建标签",
		"New milestone": "新建里程碑",
		"Close issue": "关闭议题",
		"Reopen issue": "重新打开议题",
		"Submit new issue": "提交新议题",
		"Assign yourself": "指派给自己",
	},
	rules: [],
};
