// 个人主页模块：单段路径（如 /torvalds）
// 营销页（/pricing 等）同为单段路径，但本模块词条不会在其上出现，无副作用

import type { PageDict } from "../../shared/types.ts";

export const profileDict: PageDict = {
	route: /^\/[^/]+$/,
	entries: {
		"Popular repositories": "热门仓库",
		"Customize your pins": "自定义置顶项",
		"Edit profile": "编辑资料",
		"Block or report": "屏蔽或举报",
		"Contribution activity": "贡献动态",
		"Set status": "设置状态",
		"Send message": "发送消息",
	},
	rules: [],
};
