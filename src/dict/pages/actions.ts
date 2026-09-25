// Actions 模块：/owner/repo/actions 子树——工作流侧栏、运行列表、筛选与删除确认
// 注：工作流名（CI 等）、提交消息、提交哈希为仓库内容，不收录；
// 运行时长与运行计数是动态文本，用规则覆盖；属性（title/aria）不应用规则

import type { PageDict } from "../../shared/types.ts";

export const actionsDict: PageDict = {
	route: /^\/[^/]+\/[^/]+\/actions/,
	entries: {
		// —— 侧栏 ——
		"Actions Workflows": "Actions 工作流",
		Workflows: "工作流",
		Attestations: "构件证明",
		Caches: "缓存",
		Management: "管理",
		"Performance metrics": "性能指标",
		"Usage metrics": "用量指标",
		"All workflows": "所有工作流",
		"New workflow": "新建工作流",
		"Show more workflows...": "显示更多工作流…",
		// —— 运行列表 ——
		Workflow: "工作流",
		"View workflow file": "查看工作流文件",
		"pushed by": "推送者：",
		"synchronize by": "同步者：",
		by: "由",
		Commit: "提交",
		"Run duration": "运行时长",
		"Show options": "显示选项",
		"completed successfully:": "已成功完成：",
		// 运行状态 aria 前缀与结论徽标（属性值精确命中）
		"currently running:": "当前正在运行：",
		"queued:": "排队中：",
		"requires action with the application:":
			"需要在应用中处理：",
		"Action required": "需要操作",
		// —— 筛选 ——
		"Filter workflow runs": "筛选工作流运行",
		"Clear filters": "清除筛选",
		"Filter by Actor": "按触发者筛选",
		"Filter by Branch": "按分支筛选",
		"Filter by Event": "按事件筛选",
		"Filter by Status": "按状态筛选",
		"Filter by Workflow": "按工作流筛选",
		"Showing runs from all workflows":
			"显示所有工作流的运行",
		Actor: "触发者",
		Event: "事件",
		"No matching branches.": "没有匹配的分支。",
		"No matching events.": "没有匹配的事件。",
		"No matching statuses.": "没有匹配的状态。",
		"No matching users.": "没有匹配的用户。",
		"No matching workflows.": "没有匹配的工作流。",
		// —— 删除确认 ——
		"Delete workflow run": "删除工作流运行",
		"Are you sure you want to permanently delete this workflow run?":
			"确定要永久删除此工作流运行吗？",
		"This action cannot be undone.": "此操作无法撤消。",
		"Yes, delete this workflow run": "是，删除此工作流运行",
		// —— 搜索提示 ——
		"to exclude": "以排除",
		"will be ignored since log searching is not yet available":
			"将被忽略，因为日志搜索尚不可用",
		// —— 变更公告 ——
		"GitHub Changelog": "GitHub 更新日志",
		"Upcoming change to GitHub App installation token format":
			"GitHub 应用安装令牌格式即将变更",
		"GitHub App installation tokens will soon use a new stateless format (ghs_...) and may be longer (~520 characters). Apps with hardcoded length assumptions may break.":
			"GitHub 应用安装令牌即将改用新的无状态格式（ghs_...），令牌可能变长（约 520 个字符）。把长度写死的假设用于令牌的应用可能会失效。",
		"Validate your apps and workflows with the per-request override header detailed in this":
			"使用本文中详述的每请求覆盖标头来验证你的应用与工作流",
		// —— 半动态属性：词条键含具体工作流名，仅解当前值（属性不应用规则）——
		"Pin CI": "置顶 CI",
		// 工作流侧栏钉选状态（aria）
		pinned: "已置顶",
	},
	rules: [
		// 运行时长：12s / 3m 40s / 1h 2m 3s（长格式在前，首条命中生效）
		{
			pattern: /^([\d,]+)h ([\d,]+)m ([\d,]+)s$/,
			replacement: "$1 时 $2 分 $3 秒",
		},
		{
			pattern: /^([\d,]+)h ([\d,]+)m$/,
			replacement: "$1 时 $2 分",
		},
		{
			pattern: /^([\d,]+)m ([\d,]+)s$/,
			replacement: "$1 分 $2 秒",
		},
		{
			pattern: /^([\d,]+)s$/,
			replacement: "$1 秒",
		},
		// 运行行菜单「查看」链接与 sr-only 页头标题
		{
			pattern: /^View #(\d+)$/,
			replacement: "查看 #$1",
		},
		{
			pattern: /^Actions: ([^/]+\/[^/]+)$/,
			replacement: "Actions 页面：$1",
		},
		// 运行计数与带仓库名的页头标题
		{
			pattern: /^([\d,]+)\+ workflow runs?$/,
			replacement: "$1+ 个工作流运行",
		},
		{
			pattern: /^([\d,]+) workflow runs?$/,
			replacement: "$1 个工作流运行",
		},
		{
			pattern: /^Workflow runs · (.+)$/,
			replacement: "工作流运行 · $1",
		},
		// 运行行「opened by <用户>」片段：内部空白随 JSX 渲染浮动，用 \s+ 容错
		{
			pattern: /^opened\s+by$/,
			replacement: "打开者：",
		},
	],
};
