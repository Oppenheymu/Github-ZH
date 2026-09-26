// 账单页（/settings/billing）与用量页（/settings/billing/usage）实机文本节点回归。
//
// 为什么单独锁这两页：
//   1. 键整批来自开发者模式导出的漏翻 JSON（2026-09 该页会话），导出记录的是
//      **逐个文本节点的 trimmed 原文**——账单总览被拆成一堆卡片、下拉与说明句碎片，
//      这是「不凭视觉整句登记键」的唯一依据，故把这份清单原样锁在这里；
//   2. 本页有三类动态文本，只能靠 core/rules.jsonc 的规则覆盖，且规则顺序有语义：
//      时间范围（同月 / 跨月）、计费周期后缀（/month）、额度摘要（N GB used / N included）。
//      裸日期区间必须排在 global 的 long-date-* 之前，否则「September 1 - September 30, 2026」
//      会被 long-date-september 做**部分替换**，产出「2026 年 9 月 1 日 - September 30, 2026」
//      这种中英混合的残句——下面有专门一条用例盯住它；
//   3. 用户内容与纯专名**必须不被翻译**：仓库名、@用户名、头像 alt、Copilot / Spark /
//      GitHub Models / Packages / Git LFS，以及 per / month / items / usage 这类泛化短词。
//      门禁要求译文含中文字系，这类词条的正确做法就是不收录（未命中即保留英文），
//      这里反向断言，防止后人「补」成死键或造出翻译循环；
//   4. 用量页（/settings/billing/usage）是**同一路由下的另一页**，实机截图逐行誊录的
//      节点清单在下面的 USAGE_NODES：除了静态词条，它还要两个下拉（Group by / Timeframe）
//      与**短月份**账期（「Sep 1 - Sep 30, 2026」，与账单总览的长月份是两套写法）。
//
// 实机节点清单来源：账单总览是 popup 开发者模式导出的 github-zh-misses/1 JSON（path 全为
// /settings/billing）；用量页需登录、未进导出，按 2026-09 的实机截图誊录。
import { describe, expect, it } from "bun:test";
import {
	dictCore,
	dictForLocale,
} from "../../dict/index.ts";
import { buildView } from "../view.ts";
import { translateText } from "../walker.ts";

/** /settings/billing 命中的模块视图（pages/settings + pages/repo + global） */
const view = buildView(
	"/settings/billing",
	dictForLocale("zh-CN"),
	new Map(Object.entries(dictCore.aliases)),
);

/**
 * 导出的漏翻文本节点（原文逐字录入，不做 trim——引擎自己会归一空白）。
 * 顺序按页面上出现的先后排列，便于人工对照实机。
 */
const BILLING_NODES: readonly string[] = [
	// —— 页面外壳与账号行 ——
	"Billing Overview",
	"User navigation",
	"Manage subscriptions",
	// 卡片右上角入口（原导出里 count 21，当时的会话漏收，导致点开后整块英文）
	"More details",
	// —— 账期与金额 ——
	"Next payment due",
	"Current metered usage",
	"Current included usage",
	"Metered usage",
	"Included usage",
	"Billable usage",
	"Included usage limits reset in",
	"Gross amount",
	"Minus",
	"discounts",
	"consumed usage",
	"Total billable usage after subtracting discounts from consumed usage",
	"Total gross spend on Copilot for the selected timeframe including licenses and AI Credits.",
	"Manage budgets",
	"View details",
	// —— 时间范围下拉 ——
	"Current month",
	"Last month",
	"Last year (2025)",
	"This year (2026)",
	// —— 用量区块与产品选择器 ——
	"Usage by products",
	"Usage by repository",
	"Additional usage",
	"Top two repositories this month",
	"Products selector",
	"Products selector navigation",
	"Open repository usage options",
	"Copilot usage",
	"About Copilot AI credits",
	"About GitHub Models rate limits",
	"About GitHub Actions storage billing",
	"Models",
	"Spark AI credits",
	// —— 各产品的计费说明 ——
	"Billable spend for Git LFS for the selected timeframe. Applicable discounts cover included usage for Git LFS bandwidth and storage.",
	"Billable spend for Packages for the selected timeframe. Applicable discounts cover Packages usage in public repositories and included usage for Packages data transfer and storage.",
	"Billable spend for Sandbox for the selected timeframe.",
	"Billable spend for Actions and Actions Runners for the selected timeframe. Applicable discounts cover Actions usage in public repositories and included usage for Actions minutes and storage.",
	"Billable spend for Codespaces for the selected timeframe.",
	"Based on 0 additional AI credits beyond your included usage.",
	"Cost calculated based on 0 Spark AI credits that exceed the AI credits usage included with your Copilot licenses.",
	"Cost calculated based on additional 0 token units",
	// —— 用量明细行 ——
	"Actions minutes",
	"Actions storage",
	"Git LFS bandwidth",
	"Git LFS storage",
	"Packages data transfer",
	"Packages storage",
	// —— 含完整日期区间的说明句（实机里日期也可能被拆成独立节点，见下方规则用例）——
	"Gross metered usage for September 1 - September 30, 2026.",
	"Included usage discounts for September 1 - September 30, 2026.",
	"Gross metered usage for September 1 - September 29, 2026.",
	"Included usage discounts for September 1 - September 29, 2026.",
];

/**
 * 用户内容与纯专名 / 泛化短词：字面上含拉丁字母，会通过「可翻译判定」，
 * 但**必须**保持英文——收录它们要么让译文与键同形（自触发循环，门禁也会拒），
 * 要么把用户名 / 仓库名 / 产品名当成 UI 文案改坏。
 */
const MUST_STAY_ENGLISH: readonly string[] = [
	"M. Oppenheymu",
	"(Oppenheymu)",
	"@Oppenheymu",
	"Oppenheymu",
	"GitHub",
	"OppenApps",
	"Github-i18n",
	"Koishi-CE",
	"Kuro-Bridge",
	"NapukettoDev",
	"TextCraft-War",
	"Copilot",
	"Spark",
	"Git LFS",
	"GitHub Models",
	"per",
	"month",
	"items",
	"usage",
];

/**
 * 账单页会命中 pages/repo（泛化仓库模块）的词条：「Packages」在仓库导航里已译作
 * 「软件包」，账单页的 Packages 卡片沿用同一术语，这里锁住这个跨模块胜出关系。
 */
const REPO_MODULE_WINS: readonly [string, string][] = [
	["Packages", "软件包"],
];

/** 节点在实机里通常带源码缩进与换行；两种形态都必须命中 */
function withWhitespace(node: string): readonly string[] {
	return [node, `\n        ${node}\n      `];
}

/**
 * 把一段实机节点序列按 walker 的语义过一遍：未命中的节点按原样保留，
 * 命中的节点写回译文并保留其首尾空白，最后拼接成页面上真实看到的那一行。
 */
function renderNodes(nodes: readonly string[]): string {
	return nodes
		.map((node) => {
			const translated = translateText(node, view);
			if (translated === null) return node;
			const lead = node.slice(
				0,
				node.length - node.trimStart().length,
			);
			const trail = node.slice(node.trimEnd().length);
			return `${lead}${translated}${trail}`;
		})
		.join("");
}

describe("账单页的实机节点边界", () => {
	it("translates every text node GitHub actually renders", () => {
		for (const node of BILLING_NODES) {
			for (const variant of withWhitespace(node)) {
				const translated = translateText(variant, view);
				expect(
					translated,
					`未命中：${JSON.stringify(variant)}`,
				).not.toBeNull();
				// 译文必须是中文（防「收录了键但值还是英文」这类静默失效）
				expect(translated ?? "").toMatch(/[\u4e00-\u9fff]/);
			}
		}
	});

	it("keeps user content, product names and generic words as-is", () => {
		for (const raw of MUST_STAY_ENGLISH) {
			expect(
				translateText(raw, view),
				`不应被翻译：${JSON.stringify(raw)}`,
			).toBeNull();
		}
	});

	it("falls through to the repo module for shared product names", () => {
		for (const [raw, expected] of REPO_MODULE_WINS) {
			expect(
				translateText(raw, view),
				`期望由 pages/repo 提供译文：${JSON.stringify(raw)}`,
			).toBe(expected);
		}
	});

	it("renders the metered usage blurb split around its date range", () => {
		// 实机边界（可能的一种形态）：说明句 + 日期区间各自成节点。
		// 区间规则以「, 年份」收尾，句点留给纯符号节点（翻不了，保持英文句点）——
		// 故拼接结果末尾是「日」而不是「日。」，与 GitHub 的英文句点衔接
		expect(
			renderNodes([
				"Gross metered usage for ",
				"September 1 - September 30, 2026",
				".",
			]),
		).toBe(
			"Gross metered usage for 2026 年 9 月 1 日 – 30 日.",
		);
		expect(
			renderNodes([
				"Included usage discounts for ",
				"September 1 - September 29, 2026",
				".",
			]),
		).toBe(
			"Included usage discounts for 2026 年 9 月 1 日 – 29 日.",
		);
		// 整句成节点时的形态（静态词条先命中，产物与规则一致）
		expect(
			translateText(
				"Gross metered usage for September 1 - September 30, 2026.",
				view,
			),
		).toBe(
			"2026 年 9 月 1 日 – 9 月 30 日的毛按量计费用量。",
		);
	});

	it("rewrites date ranges as a whole instead of partially", () => {
		// 关键回归：global 的 long-date-* 以 ^ 锚定但不以 $ 收尾，若本模块的区间规则
		// 排在它之后（或缺失），这里会产出「2026 年 9 月 1 日 - September 30, 2026」
		const sameMonth = translateText(
			"September 1 - September 30, 2026",
			view,
		);
		expect(sameMonth).toBe("2026 年 9 月 1 日 – 30 日");
		expect(sameMonth ?? "").not.toContain("September");
		// 跨月区间要写出两个月份
		const crossMonth = translateText(
			"September 15 - October 14, 2026",
			view,
		);
		expect(crossMonth).toBe(
			"2026 年 9 月 15 日 – 10 月 14 日",
		);
		expect(crossMonth ?? "").not.toContain("October");
		// 跨年（12 月 → 次年 1 月）也要成立
		expect(
			translateText("December 15 - January 14, 2026", view),
		).toBe("2026 年 12 月 15 日 – 1 月 14 日");
		// 带时刻的绝对日期仍由 global 规则接手（区间规则不得把它截断）
		expect(
			translateText("November 27, 2014 16:57", view),
		).toBe("2014 年 11 月 27 日 16:57");
	});

	it("translates the billing period suffix", () => {
		expect(translateText("/month", view)).toBe("每月");
		expect(translateText("/year", view)).toBe("每年");
		expect(translateText("/day", view)).toBe("每天");
	});

	it("keeps the quota summaries dynamic", () => {
		expect(
			translateText("0 GB used / 10 GB included", view),
		).toBe("已用 0 GB / 包含 10 GB");
		expect(
			translateText("2.4 GB used / 1 GB included", view),
		).toBe("已用 2.4 GB / 包含 1 GB");
		expect(
			translateText(
				"0 min used / 2,000 min included",
				view,
			),
		).toBe("已用 0 分钟 / 包含 2,000 分钟");
		// 单位不同的形态不命中（pattern 用 \\k<unit> 要求两处单位相同），保留英文
		expect(
			translateText("1 GB used / 500 MB included", view),
		).toBeNull();
	});

	it("rewrites the included AI credits sentence like the page does", () => {
		expect(
			translateText(
				"Based on 0 additional AI credits beyond your included usage.",
				view,
			),
		).toBe("基于超出所含用量的 0 个额外 AI 点数。");
		expect(
			translateText(
				"Cost calculated based on 0 Spark AI credits that exceed the AI credits usage included with your Copilot licenses.",
				view,
			),
		).toContain("Spark AI 点数");
	});
});

/**
 * 「More details」弹窗的实机文本节点。
 *
 * 这份清单的边界比页身弱一档：弹窗只在点开后才渲染，**没进开发者模式导出**，
 * 节点原文按截图逐行誊录（GitHub 的弹窗每行自成一个文本节点），未经 DevTools 复核。
 * 若实机出现漏翻，第一步是把弹窗里的节点原文抓下来，按此处格式替换。
 */
const PANEL_NODES: readonly string[] = [
	"More details",
	"Included usage and credits",
	"Showing currently applied usage and credits for your account.",
	"Current usage for Sep 1 - Sep 30, 2026. Monthly quota resets in 5 day(s).",
	"Included usage*",
	"2,000 included Actions minutes",
	"~$12.00 off*",
	".5 GB included Actions storage",
	"~$0.125 off*",
	"10 GB included Git LFS bandwidth",
	"~$0.875 off*",
	"10 GB included Git LFS storage",
	"~$0.70 off*",
	"1 GB included Packages data transfer",
	"~$0.50 off*",
	".5 GB included Packages storage",
	"~$0.125 off*",
	"Free usage**",
	"100% off per month",
	"15 GB included Codespaces storage",
	"~$1.05 off*",
	"120 included Codespaces core hours",
	"~$10.80 off*",
	"* Included usage is an approximate amount based on current pricing.",
];

describe("「More details」弹窗的实机节点边界", () => {
	it("translates every panel row", () => {
		for (const node of PANEL_NODES) {
			for (const variant of withWhitespace(node)) {
				const translated = translateText(variant, view);
				// 弹窗里每一行都含英文词，「翻不了」在实机上就等于整块漏翻
				expect(
					translated,
					`未命中：${JSON.stringify(variant)}`,
				).not.toBeNull();
				expect(translated ?? "").toMatch(/[\u4e00-\u9fff]/);
			}
		}
	});

	it("keeps the quota rows dynamic", () => {
		expect(
			translateText("2,000 included Actions minutes", view),
		).toBe("包含 2,000 分钟 Actions 用量");
		expect(
			translateText(
				"15 GB included Codespaces storage",
				view,
			),
		).toBe("包含 15 GB 代码空间存储");
		expect(
			translateText(
				"120 included Codespaces core hours",
				view,
			),
		).toBe("包含 120 个代码空间核心小时");
		// 数量变化不影响匹配
		expect(
			translateText("20 GB included Git LFS storage", view),
		).toBe("包含 20 GB Git LFS 存储");
	});

	it("translates the discount column", () => {
		expect(translateText("~$12.00 off*", view)).toBe(
			"约 12.00 抵扣",
		);
		expect(translateText("$0.125 off*", view)).toBe(
			"0.125 抵扣",
		);
		expect(translateText("~$10.80 off", view)).toBe(
			"约 10.80 抵扣",
		);
	});

	it("renders the panel footnote with its inline link", () => {
		// 实机节点原文（Console 实测）：**脚注标记在同一个文本节点里**
		// ——「** GitHub Packages usage is free for public packages. For details on free
		// Actions usage, see」是整串，故带标记的形态必须单独收键（引擎是整节点精确匹配）。
		// 链接后的句点是纯符号节点（翻不了，保持英文句点）
		expect(
			renderNodes([
				"** GitHub Packages usage is free for public packages. For details on free Actions usage, see ",
				"Free use of GitHub Actions",
				".",
			]),
		).toBe(
			"** 公共软件包的 GitHub Packages 用量免费。免费 Actions 用量的详情见 免费使用 GitHub Actions.",
		);
		// 标记若独立成节点（另一种渲染），不带标记的键顶上来
		expect(
			renderNodes([
				"GitHub Packages usage is free for public packages. For details on free Actions usage, see ",
				"Free use of GitHub Actions",
				".",
			]),
		).toBe(
			"公共软件包的 GitHub Packages 用量免费。免费 Actions 用量的详情见 免费使用 GitHub Actions.",
		);
		// 脚注首行的单星标记同理
		expect(
			translateText(
				"* Included usage is an approximate amount based on current pricing.",
				view,
			),
		).toBe("* 所含用量是按当前价格估算的近似金额。");
	});

	it("leaves bare amounts untouched", () => {
		for (const raw of ["$0.72", "$0", "$12.00"]) {
			expect(
				translateText(raw, view),
				`不应被翻译：${JSON.stringify(raw)}`,
			).toBeNull();
		}
	});
});

/**
 * 用量页（/settings/billing/usage）的实机文本节点。
 *
 * 这份清单的边界强度分两档：
 *   - **已实测**：说明句「Usage for Sep 1 - Sep 30, 2026. 」（span.UsageTable-module__hintText__）
 *     由维护者在实机 Console 取回原文，节点边界确定；
 *   - **按截图誊录**：其余行（标题、按钮、搜索框 placeholder、两个下拉、表头）取自 2026-09 的
 *     实机截图，每行假定为一个独立文本节点，未经 Console 复核。
 * 因此这里只断言「确实收录且译成中文」，不断言每个节点的确切边界；若实机出现漏翻，第一步是
 * 把用量页的漏翻 JSON（popup 开发者模式）或 Console 取的节点原文贴回来，按此处格式替换。
 */
const USAGE_NODES: readonly string[] = [
	// —— 页头与工具条 ——
	"Get usage report",
	"Search or filter usage",
	"Group by: None",
	"Timeframe: Current month",
	// —— 图表卡片（标题「按量计费用量」与副标题「Sep 1 - Sep 30, 2026」分别由
	//    静态词条「Metered usage」与 usage-range-same-month-* 规则覆盖，此处不重复列）——
	"Usage",
	// —— 用量明细区块 ——
	// 说明句在实机里是**一个整节点**（Console 实测，见下方 renderNodes 用例的注释）：
	// 「Usage for <区间>.」，故这里列的是整句而不是「Usage for」片段
	"Usage breakdown",
	"Usage for Sep 1 - Sep 30, 2026.",
	"For license-based products, the price/unit is a prorated portion of the monthly price.",
	"Date",
	"Gross amount",
	"Billed amount",
	// —— 「获取用量报告」弹窗（点按钮才渲染，键来自产品文案，尚未实机核对）——
	"Generate usage report",
	"Download a CSV or JSON report of your usage for the selected timeframe.",
	"Select the date range for your report.",
	"Report format",
	"Generate report",
	"The start date must be before the end date.",
];

/** 用量页命中的模块视图（pages/settings + pages/settings-billing + pages/repo + global） */
const usageView = buildView(
	"/settings/billing/usage",
	dictForLocale("zh-CN"),
	new Map(Object.entries(dictCore.aliases)),
);

describe("用量页的实机节点边界", () => {
	it("translates every text node GitHub actually renders", () => {
		for (const node of USAGE_NODES) {
			for (const variant of withWhitespace(node)) {
				const translated = translateText(
					variant,
					usageView,
				);
				expect(
					translated,
					`未命中：${JSON.stringify(variant)}`,
				).not.toBeNull();
				expect(translated ?? "").toMatch(/[\u4e00-\u9fff]/);
			}
		}
	});

	it("translates both dropdowns for every option they offer", () => {
		// 下拉「标签: 当前值」的候选值逐条由 core/rules.jsonc 覆盖（模板写死中文，
		// 因为引擎的替换模板不支持「捕获组 → 中文」的映射）
		for (const [raw, expected] of [
			["Group by: None", "分组方式：无"],
			["Group by: Repository", "分组方式：仓库"],
			["Group by: Product", "分组方式：产品"],
			["Timeframe: Current month", "时间范围：本月"],
			["Timeframe: Last month", "时间范围：上个月"],
			["Timeframe: Last 3 months", "时间范围：近 3 个月"],
			["Timeframe: Last 6 months", "时间范围：近 6 个月"],
			["Timeframe: Last 12 months", "时间范围：近 12 个月"],
		] as const) {
			expect(
				translateText(raw, usageView),
				`下拉值未覆盖：${JSON.stringify(raw)}`,
			).toBe(expected);
		}
		// 未列出的值（上游新增候选）原样保留，不得被规则截断成半句中文
		expect(
			translateText("Timeframe: Last 24 months", usageView),
		).toBeNull();
	});

	it("translates the usage breakdown table and its dates", () => {
		expect(
			translateText("Usage breakdown", usageView),
		).toBe("用量明细");
		expect(translateText("Billed amount", usageView)).toBe(
			"计费金额",
		);
		// 明细行的日期由 global 的短日期规则覆盖（Sep 1, 2026 → 2026 年 9 月 1 日）
		expect(translateText("Sep 1, 2026", usageView)).toBe(
			"2026 年 9 月 1 日",
		);
		// 图表卡片的副标题：短月份账期，由本模块的 usage-range-short-same-month-* 覆盖
		// （同月只写一次月份，与长月份那组同一形态）
		expect(
			translateText("Sep 1 - Sep 30, 2026", usageView),
		).toBe("2026 年 9 月 1 日 – 30 日");
		// 跨月的短月份区间暂无实证、未收规则：必须**原样保留**（不得被 global 的短日期
		// 规则做部分替换而产出「2026 年 9 月 1 日 - Oct 1, 2026」这类残句）
		expect(
			translateText("Sep 1 - Oct 1, 2026", usageView),
		).toBeNull();
		// 表格里的金额节点（纯符号 + 数字）保持原样——它们本来就翻不了，也不该翻
		for (const raw of ["$0", "<$0.01", "$1"]) {
			expect(
				translateText(raw, usageView),
				`不应被翻译：${JSON.stringify(raw)}`,
			).toBeNull();
		}
	});

	it("renders the usage breakdown blurb as GitHub actually renders it", () => {
		// 实机原文（Console 实测，用户提供）：
		//   "Usage for Sep 1 - Sep 30, 2026. " | SPAN UsageTable-module__hintText__BIrRL
		// 关键：说明句与账期区间**在同一个文本节点里**，所以静态键「Usage for」与只匹配
		// 裸区间的 usage-range-short-* 都套不上，必须由 settings/usage-hint-same-month-*
		// 整句覆盖；句点在节点内，模板自带「。」，尾随空格由 walker 保留。
		expect(
			renderNodes([
				"Usage for Sep 1 - Sep 30, 2026. ",
				"For license-based products, the price/unit is a prorated portion of the monthly price.",
			]),
		).toBe(
			"用量统计：2026 年 9 月 1 日 – 30 日。 对于基于许可证的产品，单价是按月价格折算后的部分金额。",
		);
		// 不带尾随空格的形态（另一个渲染分支）同样命中，且句号不会丢
		expect(
			translateText(
				"Usage for Sep 1 - Sep 30, 2026.",
				usageView,
			),
		).toBe("用量统计：2026 年 9 月 1 日 – 30 日。");
		// 其它月份也要命中有句点的整句形态
		expect(
			translateText(
				"Usage for Oct 1 - Oct 31, 2026.",
				usageView,
			),
		).toBe("用量统计：2026 年 10 月 1 日 – 31 日。");
		// 「Usage for」被上游拆成独立节点的渲染分支：静态键兜底（收着不亏）
		expect(translateText("Usage for", usageView)).toBe(
			"用量统计：",
		);
		// 跨月区间仍是未收形态：必须原样保留，不得被区间规则截成半句
		expect(
			translateText(
				"Usage for Sep 1 - Oct 1, 2026.",
				usageView,
			),
		).toBeNull();
	});

	it("keeps the Cancel button on the global dictionary", () => {
		// 弹窗的「Cancel」不在本模块登记，靠 global 词条生效——重复登记会制造同键异译
		expect(translateText("Cancel", usageView)).toBe("取消");
	});
});

/**
 * AI 用量页（/settings/billing/ai_usage）的实机文本节点。
 *
 * 边界强度与上面的 USAGE_NODES 同档：该路由同样只命中 ^/settings/billing，页面需登录、
 * **未进开发者模式导出**，节点原文按 2026-09 的实机截图逐行誊录，每行假定为一个独立文本节点
 * （表格两行表头的「英文列名 / 另一种写法」在截图里各自成列，故按两个节点收录）。
 * 若实机出现漏翻，第一步是把该页的漏翻 JSON（popup 开发者模式）或 Console 取的节点原文
 * 贴回来，按此处格式替换。
 */
const AI_USAGE_NODES: readonly string[] = [
	// 页面标题来自 pages/settings 的同一键（模块更靠前），本模块不重复登记
	"AI usage",
	// 图表分组切换器（截图里 Days 为选中态；Models 沿用本模块既有的「模型」词条）
	"Models",
	"Days",
	// 账期选择器（未展开时「月份 年份」，由 settings/month-year-* 规则覆盖）
	"Sep 2026",
	// 额外用量限额卡片
	"Extra usage",
	"Not enabled",
	"If enabled, your enterprise will be billed for additional AI credits usage after your included credits have been exhausted.",
	// 图表空状态
	"No usage",
	// 模型用量表的英文列名（第二行的「所含用量」「额外用量」由既有词条译出）
	"Model",
	"Included credits",
	"Additional credits",
	// 表脚注
	"Each GitHub AI credit costs $0.01.",
];

/** AI 用量页命中的模块视图（与用量页同一组模块：settings + settings-billing + repo + global） */
const aiUsageView = buildView(
	"/settings/billing/ai_usage",
	dictForLocale("zh-CN"),
	new Map(Object.entries(dictCore.aliases)),
);

describe("AI 用量页的实机节点边界", () => {
	it("translates every text node GitHub actually renders", () => {
		for (const node of AI_USAGE_NODES) {
			for (const variant of withWhitespace(node)) {
				const translated = translateText(
					variant,
					aiUsageView,
				);
				expect(
					translated,
					`未命中：${JSON.stringify(variant)}`,
				).not.toBeNull();
				expect(translated ?? "").toMatch(/[\u4e00-\u9fff]/);
			}
		}
	});

	it("translates the account-period selector for every month", () => {
		// 账期选择器未展开时是「月份缩写 年份」，逐月由 settings/month-year-* 覆盖
		// （模板写死中文月份，理由同上面的账期区间：模板不支持捕获组 → 中文的映射）
		for (const [raw, expected] of [
			["Jan 2026", "2026 年 1 月"],
			["May 2026", "2026 年 5 月"],
			["Sep 2026", "2026 年 9 月"],
			["Dec 2026", "2026 年 12 月"],
			// 跨年同样只换年份
			["Sep 2025", "2025 年 9 月"],
		] as const) {
			expect(
				translateText(raw, aiUsageView),
				`账期未覆盖：${JSON.stringify(raw)}`,
			).toBe(expected);
		}
		// 未收的形态必须**原样保留**，不得被规则截成半句中文：
		// 长月份（"September 2026"）与非法月份（"Foo 2026"）都不在规则里
		for (const raw of ["September 2026", "Foo 2026"]) {
			expect(
				translateText(raw, aiUsageView),
				`不应被翻译：${JSON.stringify(raw)}`,
			).toBeNull();
		}
	});

	it("keeps the AI credit price in the footnote dynamic", () => {
		// 单价随定价变化：静态词条只覆盖截图里的 $0.01，其余金额靠规则补上
		expect(
			translateText(
				"Each GitHub AI credit costs $0.02.",
				aiUsageView,
			),
		).toBe("每个 GitHub AI 点数费用为 $0.02。");
		// 规则以英文锚定，替换产物（已含中文）不会再命中任何规则
		expect(
			translateText(
				"每个 GitHub AI 点数费用为 $0.02。",
				aiUsageView,
			),
		).toBeNull();
	});

	it("keeps the table headers bilingual row as separate nodes", () => {
		// 截图边界：英文列名与第二行写法分属两列（各自成节点），
		// 故「Included credits」这类单节点键必须在词典里；
		// 若实机把两者渲染进**同一个**文本节点（"Included credits 所含用量"），
		// 该节点含非拉丁字母，引擎按设计整节点跳过——这是节点边界问题，不是缺词条
		expect(translateText("Model", aiUsageView)).toBe(
			"模型",
		);
		expect(
			translateText("Included credits", aiUsageView),
		).toBe("所含点数");
		expect(
			translateText("Additional credits", aiUsageView),
		).toBe("额外点数");
	});
});
