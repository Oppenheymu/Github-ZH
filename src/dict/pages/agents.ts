// Agents 模块：/owner/repo/agents——Copilot 代理会话列表与筛选
// 注：查询语法 token（is:open、@me 等）为可复制语义文本，不收录

import type { PageDict } from "../../shared/types.ts";

export const agentsDict: PageDict = {
	route: /^\/[^/]+\/[^/]+\/agents/,
	entries: {
		Agent: "代理",
		"Agent management": "代理管理",
		"Agent navigation": "代理导航",
		Sessions: "会话",
		Active: "活跃",
		"Needs attention": "需要关注",
		Newest: "最新",
		"Created by me": "我创建的",
		"Search or filter": "搜索或筛选",
		Configure: "配置",
		"Customize environment": "自定义环境",
		"Filter sessions": "筛选会话",
		"Session filters": "会话筛选",
		"Task filters": "任务筛选",
		"Filter by status": "按状态筛选",
		Suggestions: "建议",
		"Give feedback": "提供反馈",
		"Toggle sidebar": "切换侧栏",
		"uses AI. Check for mistakes.": "使用 AI，请注意甄别。",
		"Reset filters": "重置筛选",
		"No sessions match your filters":
			"没有符合筛选条件的会话",
		"Try adjusting your search or filters.":
			"请尝试调整你的搜索或筛选条件。",
	},
	rules: [
		// 会话计数与带仓库名的页头标题
		{
			pattern: /^([\d,]+) sessions?$/,
			replacement: "$1 个会话",
		},
		{
			pattern: /^Agents · (.+)$/,
			replacement: "代理 · $1",
		},
	],
};
