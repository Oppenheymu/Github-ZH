// 词典汇总：页面模块注册表按「具体 → 泛化」排列，顺序即优先级
// （buildView 词条先到先得、规则首条命中生效，靠此顺序保证具体页压过泛化页）

import type { PageDict } from "../shared/types.ts";
import { actionsDict } from "./pages/actions.ts";
import { agentsDict } from "./pages/agents.ts";
import { commitsDict } from "./pages/commits.ts";
import { dashboardDict } from "./pages/dashboard.ts";
import { discussionsDict } from "./pages/discussions.ts";
import { insightsDict } from "./pages/insights.ts";
import { issuesDict } from "./pages/issues.ts";
import { marketingDict } from "./pages/marketing.ts";
import { profileDict } from "./pages/profile.ts";
import { pullsDict } from "./pages/pulls.ts";
import { repoDict } from "./pages/repo.ts";
import { repoSettingsDict } from "./pages/repo-settings.ts";
import { searchDict } from "./pages/search.ts";
import { settingsDict } from "./pages/settings.ts";
import { wikiDict } from "./pages/wiki.ts";

/** 页面模块注册表：越靠前越具体，词条与规则越先生效 */
export const pageDicts: readonly PageDict[] = [
	issuesDict,
	pullsDict,
	settingsDict,
	repoSettingsDict,
	actionsDict,
	agentsDict,
	dashboardDict,
	commitsDict,
	discussionsDict,
	wikiDict,
	insightsDict,
	searchDict,
	marketingDict,
	profileDict,
	repoDict,
];
