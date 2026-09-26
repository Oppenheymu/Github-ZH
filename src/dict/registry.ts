// 词典数据注册表：只做「名字 → JSONC 原始数据」的映射，不含编译与容错。
//
// 为什么要独立成一层：运行时（index.ts）需要「单模块失败不拖垮整站」的容错，
// 而门禁（tooling/checks/dict.ts）必须对同一份数据严格到报错。若门禁直接 import
// index.ts，坏数据会被 index.ts 静默跳过、门禁反而变绿——这正是最危险的失真。
// 两边都从这里取数据，编译逻辑共用 load.ts，只有失败处理策略不同。
//
// 顺序即优先级（具体页在前、泛化页在后）：buildView 词条「先到先得」、
// 规则「首条命中生效」。已知有意的跨模块同键异译——靠注册表顺序压过泛化模块，
// 属于设计意图，勿当「重复键」清理：
//   "Actions"      pages/repo-settings「Actions 工作流」压 pages/repo「操作」
//   "Name"         pages/settings「姓名」压 pages/repo「名称」
//   "Pages"        pages/repo-settings「页面」（GitHub Pages）压 global「页码」（分页）
//   "Write"        pages/repo-settings「写入」（权限级别）压 global「编写」
//   "GitHub Apps"  pages/repo-settings「GitHub 应用」压 pages/marketing「GitHub 应用程序」

import globalRaw from "./data/global.jsonc";
import actionsRaw from "./data/pages/actions.jsonc";
import agentsRaw from "./data/pages/agents.jsonc";
import commitsRaw from "./data/pages/commits.jsonc";
import dashboardRaw from "./data/pages/dashboard.jsonc";
import discussionsRaw from "./data/pages/discussions.jsonc";
import insightsRaw from "./data/pages/insights.jsonc";
import issuesRaw from "./data/pages/issues.jsonc";
import marketingRaw from "./data/pages/marketing.jsonc";
import profileRaw from "./data/pages/profile.jsonc";
import pullsRaw from "./data/pages/pulls.jsonc";
import repoRaw from "./data/pages/repo.jsonc";
import repoSettingsRaw from "./data/pages/repo-settings.jsonc";
import searchRaw from "./data/pages/search.jsonc";
import settingsRaw from "./data/pages/settings.jsonc";
import wikiRaw from "./data/pages/wiki.jsonc";

/** 全站词典原始数据（编辑器侧形状校验见 dict.schema.json） */
export const globalRawDict: unknown = globalRaw;

/** 页面模块原始数据：顺序即优先级，勿随意调整 */
export const pageRawModules: readonly (readonly [
	string,
	unknown,
])[] = [
	["pages/issues", issuesRaw],
	["pages/pulls", pullsRaw],
	["pages/settings", settingsRaw],
	["pages/repo-settings", repoSettingsRaw],
	["pages/actions", actionsRaw],
	["pages/agents", agentsRaw],
	["pages/dashboard", dashboardRaw],
	["pages/commits", commitsRaw],
	["pages/discussions", discussionsRaw],
	["pages/wiki", wikiRaw],
	["pages/insights", insightsRaw],
	["pages/search", searchRaw],
	["pages/marketing", marketingRaw],
	["pages/profile", profileRaw],
	["pages/repo", repoRaw],
];
