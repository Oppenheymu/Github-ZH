// 讨论区模块：/owner/repo/discussions（列表与详情页）专属词条
// 模块头即路由说明：两段仓库路径下的 discussions 子树

import type { PageDict } from "../../shared/types.ts";

export const discussionsDict: PageDict = {
	route: /^\/[^/]+\/[^/]+\/discussions/,
	entries: {},
	rules: [],
};
