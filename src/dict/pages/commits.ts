// 提交与版本模块：/owner/repo 下的提交相关子页专属词条
// 覆盖 commits / commit / tags / branches / compare 五类子树
// 注：用户名、提交哈希、提交消息为仓库内容，不收录；属性不应用规则
// （见 content/walker.ts），含动态部分的属性值不设词条

import type { PageDict } from "../../shared/types.ts";

export const commitsDict: PageDict = {
	route:
		/^\/[^/]+\/[^/]+\/(commits?|tags|branches|compare)/,
	entries: {
		// —— 分支页：表格列头与行内操作 ——
		Ahead: "领先",
		Behind: "落后",
		"Check status": "检查状态",
		"Branch menu": "分支菜单",
		"Action menu": "操作菜单",
		"Copy branch name to clipboard": "复制分支名到剪贴板",
		// —— 分支页：区块标题与筛选 ——
		"Active branches": "活跃分支",
		Stale: "陈旧",
		"View rules": "查看规则",
		"View more branches": "查看更多分支",
		"Search branches...": "搜索分支…",
		// —— 提交列表页：筛选栏 sr-only 分区标题 ——
		"User selector": "用户选择器",
		"Branch selector": "分支选择器",
		Datepicker: "日期选择器",
		"All time": "全部时间",
		"Commit history": "提交历史",
		// —— 标签页 ——
		Notes: "说明",
		// —— 提交详情页：文件树与差异工具栏 ——
		"Expand file tree": "展开文件树",
		"Collapse file tree": "收起文件树",
		"Collapse file": "收起文件",
		"Copy file name to clipboard": "复制文件名到剪贴板",
		"Open diff view settings": "打开差异视图设置",
		"Filter files…": "筛选文件…",
		"Filter options": "筛选选项",
		"Browse the repository at this point in the history":
			"浏览该历史时点的仓库",
		"Browse files": "浏览文件",
		// —— 比较页 ——
		"Find a branch": "查找分支",
		"base repository:": "基准仓库：",
	},
	rules: [
		// 标签行「…」按钮的悬浮提示（tool-tip 文本节点，含标签名）
		{
			pattern: /^Toggle (.+)'s commit message$/,
			replacement: "展开或收起 $1 的提交信息",
		},
		// 差异统计的读屏文本（含行数，单复数通吃）
		{
			pattern:
				/^Lines changed: (\d+) additions? & (\d+) deletions?$/,
			replacement: "变更行数：新增 $1 行，删除 $2 行",
		},
		// 提交行 SHA 复制按钮的悬浮提示（tool-tip 文本节点，含短哈希）
		{
			pattern: /^Copy full SHA for ([0-9a-f]+)$/,
			replacement: "复制完整 SHA（$1）",
		},
		// 提交行「…」展开按钮的悬浮提示（tool-tip 文本节点，含短哈希）
		{
			pattern: /^Show description for ([0-9a-f]+)$/,
			replacement: "显示 $1 的提交说明",
		},
		// 提交列表按日期分组的标题（月份缩写逐月映射，同 global.ts）
		{
			pattern: /^Commits on Jan (\d{1,2}), (\d{4})$/,
			replacement: "$2 年 1 月 $1 日的提交",
		},
		{
			pattern: /^Commits on Feb (\d{1,2}), (\d{4})$/,
			replacement: "$2 年 2 月 $1 日的提交",
		},
		{
			pattern: /^Commits on Mar (\d{1,2}), (\d{4})$/,
			replacement: "$2 年 3 月 $1 日的提交",
		},
		{
			pattern: /^Commits on Apr (\d{1,2}), (\d{4})$/,
			replacement: "$2 年 4 月 $1 日的提交",
		},
		{
			pattern: /^Commits on May (\d{1,2}), (\d{4})$/,
			replacement: "$2 年 5 月 $1 日的提交",
		},
		{
			pattern: /^Commits on Jun (\d{1,2}), (\d{4})$/,
			replacement: "$2 年 6 月 $1 日的提交",
		},
		{
			pattern: /^Commits on Jul (\d{1,2}), (\d{4})$/,
			replacement: "$2 年 7 月 $1 日的提交",
		},
		{
			pattern: /^Commits on Aug (\d{1,2}), (\d{4})$/,
			replacement: "$2 年 8 月 $1 日的提交",
		},
		{
			pattern: /^Commits on Sep (\d{1,2}), (\d{4})$/,
			replacement: "$2 年 9 月 $1 日的提交",
		},
		{
			pattern: /^Commits on Oct (\d{1,2}), (\d{4})$/,
			replacement: "$2 年 10 月 $1 日的提交",
		},
		{
			pattern: /^Commits on Nov (\d{1,2}), (\d{4})$/,
			replacement: "$2 年 11 月 $1 日的提交",
		},
		{
			pattern: /^Commits on Dec (\d{1,2}), (\d{4})$/,
			replacement: "$2 年 12 月 $1 日的提交",
		},
	],
};
