// 拉取请求模块：/owner/repo/pull 与 /pulls（列表与详情页）专属词条
// 路由同时覆盖详情页（/pull/<编号>）与列表页（/pulls）

import type { PageDict } from "../../shared/types.ts";

export const pullsDict: PageDict = {
	route: /^\/[^/]+\/[^/]+\/pull/,
	entries: {
		Conversation: "对话",
		Checks: "检查",
		"Files changed": "文件变更",
		Merge: "合并",
		"Squash and merge": "压缩合并",
		"Rebase and merge": "变基合并",
		"Merge pull request": "合并拉取请求",
		"Close pull request": "关闭拉取请求",
		"Reopen pull request": "重新打开拉取请求",
		"Request changes": "请求修改",
		Approve: "批准",
		"Submit review": "提交审查",
		"Resolve conversation": "解决对话",
		"This branch has no conflicts with the base branch":
			"此分支与基线分支没有冲突",
	},
	rules: [],
};
