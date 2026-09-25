// 词典汇总：页面模块注册表按「具体 → 泛化」排列，顺序即优先级
// （buildView 词条先到先得、规则首条命中生效，靠此顺序保证具体页压过泛化页）

import type { PageDict } from "../shared/types.ts";
import { dashboardDict } from "./pages/dashboard.ts";
import { issuesDict } from "./pages/issues.ts";
import { profileDict } from "./pages/profile.ts";
import { pullsDict } from "./pages/pulls.ts";
import { repoDict } from "./pages/repo.ts";
import { repoSettingsDict } from "./pages/repo-settings.ts";
import { settingsDict } from "./pages/settings.ts";

/** 页面模块注册表：越靠前越具体，词条与规则越先生效 */
export const pageDicts: readonly PageDict[] = [
	issuesDict,
	pullsDict,
	settingsDict,
	repoSettingsDict,
	dashboardDict,
	profileDict,
	repoDict,
];
