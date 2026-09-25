// 搜索模块：全站搜索与主题页专属词条
// 覆盖 /search 与 /topics 两类顶级路径

import type { PageDict } from "../../shared/types.ts";

export const searchDict: PageDict = {
	route: /^\/(search|topics)/,
	entries: {
		// —— 结果排序（「X最多 / X最少」与 issues.ts 排序菜单同款）——
		"Best match": "最佳匹配",
		"Most stars": "星标最多",
		"Fewest stars": "星标最少",
		"Most forks": "复刻最多",
		"Fewest forks": "复刻最少",
		"Least recently updated": "最早更新",
		"Sort by:": "排序方式：",
		"Sort options": "排序选项",
		// —— 筛选侧栏 ——
		"Filter:": "筛选：",
		"Filter by": "筛选依据",
		"Filter by type": "按类型筛选",
		"Filter by language": "按语言筛选",
		"Open column options": "打开列选项",
		Advanced: "高级",
		"Advanced search": "高级搜索",
		"Date created": "创建日期",
		"Date pushed": "推送日期",
		"Number of followers": "关注者数量",
		"Number of forks": "复刻数量",
		"Number of stars": "星标数量",
		Size: "大小",
		Topic: "主题",
		Users: "用户",
		"More languages...": "更多语言…",
		// —— 语言筛选项（语言名本身为专有名词，保留原文）——
		"Python language": "Python 语言",
		"Java language": "Java 语言",
		"TypeScript language": "TypeScript 语言",
		"CSS language": "CSS 语言",
		"JavaScript language": "JavaScript 语言",
		// —— ProTip 快捷键提示（实机整句拆为多节点，逐段兜底）——
		"ProTip!": "小贴士！",
		"Press the": "按下",
		"key to activate the search input again and adjust your query.":
			"键以再次激活搜索输入框并调整你的查询。",
		// —— 赞助推广卡 ——
		"Sponsor open source projects you depend on":
			"赞助你依赖的开源项目",
		"Contributors are working behind the scenes to make open source better for everyone—give them the help and recognition they deserve.":
			"贡献者在幕后默默付出，让开源惠及每一个人——请给予他们应有的帮助与认可。",
		"Explore sponsorable projects": "探索可赞助的项目",
		"Package icon": "软件包图标",
		// —— 主题页相关主题链接的 title 提示 ——
		// 主题名按既有约定保留原文（与 rules 里「Topic: X」规则同款渲染）；
		// 属性不适用正则规则，只能按实际渲染串逐条收录
		"Topic: angular": "主题：angular",
		"Topic: ant-design": "主题：ant-design",
		"Topic: antd": "主题：antd",
		"Topic: apis": "主题：apis",
		"Topic: artificial-intelligence":
			"主题：artificial-intelligence",
		"Topic: automation": "主题：automation",
		"Topic: awesome": "主题：awesome",
		"Topic: backup-tool": "主题：backup-tool",
		"Topic: bun": "主题：bun",
		"Topic: bundler": "主题：bundler",
		"Topic: chatgpt-prompts": "主题：chatgpt-prompts",
		"Topic: cli": "主题：cli",
		"Topic: data-flow": "主题：data-flow",
		"Topic: deepagents": "主题：deepagents",
		"Topic: deno": "主题：deno",
		"Topic: design-systems": "主题：design-systems",
		"Topic: development": "主题：development",
		"Topic: editor": "主题：editor",
		"Topic: electron": "主题：electron",
		"Topic: enterprise": "主题：enterprise",
		"Topic: esp32": "主题：esp32",
		"Topic: firmware": "主题：firmware",
		"Topic: flutter": "主题：flutter",
		"Topic: generative-ai": "主题：generative-ai",
		"Topic: google-photos": "主题：google-photos",
		"Topic: google-photos-alternative":
			"主题：google-photos-alternative",
		"Topic: gpt": "主题：gpt",
		"Topic: gpt-4": "主题：gpt-4",
		"Topic: home-assistant": "主题：home-assistant",
		"Topic: home-automation": "主题：home-automation",
		"Topic: integration-framework":
			"主题：integration-framework",
		"Topic: integrations": "主题：integrations",
		"Topic: iot": "主题：iot",
		"Topic: ipaas": "主题：ipaas",
		"Topic: javascriptcore": "主题：javascriptcore",
		"Topic: jsx": "主题：jsx",
		"Topic: language": "主题：language",
		"Topic: low-code": "主题：low-code",
		"Topic: low-code-platform": "主题：low-code-platform",
		"Topic: mcp-client": "主题：mcp-client",
		"Topic: mobile-app": "主题：mobile-app",
		"Topic: monitoring": "主题：monitoring",
		"Topic: multiagent": "主题：multiagent",
		"Topic: n8n": "主题：n8n",
		"Topic: networking": "主题：networking",
		"Topic: nextjs": "主题：nextjs",
		"Topic: npm": "主题：npm",
		"Topic: photo-gallery": "主题：photo-gallery",
		"Topic: photos": "主题：photos",
		"Topic: photos-management": "主题：photos-management",
		"Topic: prompts": "主题：prompts",
		"Topic: prompts-chat": "主题：prompts-chat",
		"Topic: pwa": "主题：pwa",
		"Topic: pydantic": "主题：pydantic",
		"Topic: react": "主题：react",
		"Topic: rf": "主题：rf",
		"Topic: rust": "主题：rust",
		"Topic: rust-lang": "主题：rust-lang",
		"Topic: skills": "主题：skills",
		"Topic: sveltekit": "主题：sveltekit",
		"Topic: transpiler": "主题：transpiler",
		"Topic: typechecker": "主题：typechecker",
		"Topic: ui-kit": "主题：ui-kit",
		"Topic: ui-library": "主题：ui-library",
		"Topic: videos": "主题：videos",
		"Topic: visual-studio-code": "主题：visual-studio-code",
		"Topic: web": "主题：web",
		"Topic: web-framework": "主题：web-framework",
		"Topic: web-performance": "主题：web-performance",
		"Topic: wifi": "主题：wifi",
		"Topic: workflow": "主题：workflow",
		"Topic: workflow-automation":
			"主题：workflow-automation",
	},
	rules: [
		// 主题页排序下拉里按子主题过滤的选项标题（主题名保留原文）
		{ pattern: /^Topic: (.+)$/, replacement: "主题：$1" },
		{
			pattern: /^([\d,]+) users? starred this repository$/,
			replacement: "$1 位用户星标了此仓库",
		},
		{
			pattern: /^([\d,]+) stars?$/,
			replacement: "$1 个星标",
		},
		{
			pattern: /^([\d,]+) results?$/,
			replacement: "$1 个结果",
		},
		// 「Updated on <日期>」的日期段，月份缩写保留原文
		{
			pattern: /^on ([A-Z][a-z]{2} \d{1,2}(?:, \d{4})?)$/,
			replacement: "于 $1",
		},
		// 主题页导语：数量动态，查询键已把连续空白折叠为单空格
		{
			pattern:
				/^Here are ([\d,]+) public repositor(?:y|ies) matching this topic\.\.\.$/,
			replacement: "共有 $1 个公开仓库匹配此主题…",
		},
	],
};
