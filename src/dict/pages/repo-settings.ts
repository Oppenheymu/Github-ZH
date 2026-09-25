// 仓库设置模块：/owner/repo/settings 子树——设置侧边栏与 General 设置页词条
// 覆盖：通用信息 / 发布 / 社交预览 / 功能开关 / 合并选项 / 提交 / 归档 / 推送 / 自动关闭议题 / 危险区域
// 注：路由也会命中 /orgs/<org>/settings，共享的侧边栏与危险区域文案同样适用

import type { PageDict } from "../../shared/types.ts";

export const repoSettingsDict: PageDict = {
	route: /^\/[^/]+\/[^/]+\/settings/,
	entries: {
		// —— 设置侧边栏 ——
		General: "常规",
		Access: "访问权限",
		Collaborators: "协作者",
		"Moderator tools": "管理员工具",
		"Code security": "代码安全",
		Runners: "运行器",
		Pages: "页面",
		"Secrets and variables": "机密与变量",
		"Deploy keys": "部署密钥",
		Integrations: "集成",
		"GitHub Apps": "GitHub 应用",
		// —— 通用信息 ——
		"Repository name": "仓库名称",
		"Default branch": "默认分支",
		"Template repository": "模板仓库",
		"Template repositories let users generate new repositories with the same directory structure and files.":
			"模板仓库让用户能够以相同的目录结构和文件生成新仓库。",
		"Learn more about template repositories.":
			"进一步了解模板仓库。",
		"The default branch is considered the “base” branch in your repository, against which all pull requests and code commits are automatically made, unless you specify a different branch.":
			"默认分支会被视为仓库中的“基线”分支，除非你另行指定分支，否则所有拉取请求和代码提交都会自动以此为基准。",
		// —— 发布与社交预览 ——
		"Enable release immutability": "启用发布不可变性",
		"Disallow assets and tags from being modified once a release is published.":
			"发布一经正式发布，其附件与标签即不可再修改。",
		"Social preview": "社交预览",
		"Upload an image to customize your repository’s social media preview.":
			"上传图片，自定义仓库在社交媒体上的预览图。",
		"Images should be at least 640×320px (1280×640px for best display).":
			"图片尺寸应至少为 640×320px（1280×640px 显示效果最佳）。",
		"Download template": "下载模板",
		// —— 功能开关 ——
		Features: "功能",
		Wikis: "维基",
		"Wikis host documentation for your repository.":
			"维基用于承载仓库的文档。",
		"Restrict editing to collaborators only":
			"仅限协作者编辑",
		"Public wikis will still be readable by everyone.":
			"公开维基仍对所有人可读。",
		"Issues integrate lightweight task tracking into your repository. Keep projects on track with issue labels and milestones, and reference them in commit messages.":
			"议题为仓库提供轻量级任务跟踪。用议题标签和里程碑让项目保持在正轨上，并在提交信息中引用议题。",
		"Issue permissions": "议题权限",
		"If restricted, issues will still be readable by everyone who can see this repository.":
			"受限后，所有能查看此仓库的人仍可阅读议题。",
		"Get organized with issue templates":
			"用议题模板让工作井井有条",
		"Give contributors issue templates that help you cut through the noise and help them push your project forward.":
			"为贡献者提供议题模板，帮你从噪音中筛出重点，也帮他们推动项目前进。",
		Sponsorships: "赞助",
		"Sponsorships help your community know how to financially support this repository.":
			"赞助功能让你的社区知道如何为这个仓库提供资金支持。",
		"Add links to GitHub Sponsors or third-party methods your repository accepts for financial contributions to your project.":
			"添加 GitHub Sponsors 链接，或仓库接受的第三方资助方式链接。",
		"Preserve this repository": "长期保存此仓库",
		"Include this code in the GitHub Archive Program.":
			"将此代码纳入 GitHub 归档计划。",
		Discussions: "讨论区",
		"Discussions is the space for your community to have conversations, ask questions and post answers without opening issues.":
			"讨论区是你的社区不开议题也能交流、提问和回答的空间。",
		"Get started with Discussions": "开始使用讨论区",
		"Engage your community by having discussions right in your repository, where your community already lives":
			"直接在你的仓库中开展讨论，你的社区本就活跃在这里。",
		"Projects on GitHub are created at the repository owner's level (organization or user) and can be linked to a repository's Projects tab. Projects are suitable for cross-repository development efforts such as feature work, complex product roadmaps or even Issue triage.":
			"GitHub 上的项目创建于仓库所有者层级（组织或用户），并可关联到仓库的“项目”标签页。项目适合跨仓库的开发工作，例如功能开发、复杂的产品路线图，甚至议题分类整理。",
		"Pull requests allow others to suggest changes to your repository.":
			"拉取请求让其他人可以向你的仓库建议更改。",
		"Pull request permissions": "拉取请求权限",
		"If restricted, pull requests will still be readable by everyone who can see this repository.":
			"受限后，所有能查看此仓库的人仍可阅读拉取请求。",
		// —— 合并选项 ——
		"Pull Requests": "拉取请求",
		"When merging pull requests, you can allow any combination of merge commits, squashing, or rebasing. At least one option must be enabled. If you have linear history requirement enabled on any protected branch, you must enable squashing or rebasing.":
			"合并拉取请求时，你可以允许合并提交、压缩合并、变基的任意组合。至少必须启用一项。如果任何受保护分支启用了线性历史要求，则必须启用压缩合并或变基。",
		"Allow merge commits": "允许合并提交",
		"Add all commits from the head branch to the base branch with a merge commit.":
			"用一个合并提交将源分支的所有提交并入基线分支。",
		"Default commit message": "默认提交信息",
		"Presented when merging a pull request with merge.":
			"以合并提交方式合并拉取请求时显示。",
		"Allow squash merging": "允许压缩合并",
		"Combine all commits from the head branch into a single commit in the base branch.":
			"将源分支的所有提交压缩为基线分支中的单个提交。",
		"Presented when merging a pull request with squash.":
			"以压缩合并方式合并拉取请求时显示。",
		"Allow rebase merging": "允许变基合并",
		"Add all commits from the head branch onto the base branch individually.":
			"将源分支的所有提交逐一变基到基线分支之上。",
		"Control how and when users are prompted to update their branches if there are new changes available in the base branch.":
			"当基线分支有新变更可用时，控制提示用户更新分支的方式与时机。",
		"Always suggest updating pull request branches":
			"始终建议更新拉取请求分支",
		"Whenever there are new changes available in the base branch, present an “update branch” option in the pull request.":
			"只要基线分支有新的变更可用，就在拉取请求中提供“更新分支”选项。",
		"You can allow setting pull requests to merge automatically once all required reviews and status checks have passed.":
			"你可以允许拉取请求在所有必需的审查与状态检查通过后自动合并。",
		"Allow auto-merge": "允许自动合并",
		"Waits for merge requirements to be met and then merges automatically.":
			"等待合并条件全部满足后自动合并。",
		"After pull requests are merged, you can have head branches deleted automatically.":
			"拉取请求合并后，你可以让源分支自动删除。",
		"Automatically delete head branches": "自动删除源分支",
		"Deleted branches will still be able to be restored.":
			"已删除的分支仍可恢复。",
		// —— 提交 ——
		"Require contributors to sign off on web-based commits":
			"要求贡献者签署网页端提交",
		"Enabling this setting will require contributors to sign off on commits made through GitHub’s web interface. Signing off is a way for contributors to affirm that their commit complies with the repository's terms, commonly the Developer Certificate of Origin (DCO).":
			"启用此设置后，贡献者通过 GitHub 网页界面提交时必须签署。签署是贡献者声明其提交符合仓库条款（通常为开发者原创证书 DCO）的方式。",
		"Learn more about signing off on commits.":
			"进一步了解提交签署。",
		"Allow comments on individual commits":
			"允许对单个提交发表评论",
		"Enabling this setting will allow anyone who can view this repository to add commit comments. Existing commit comments are not affected by this setting and will remain viewable, editable, and deletable.":
			"启用此设置后，任何能查看此仓库的人都可以添加提交评论。现有的提交评论不受此设置影响，仍可查看、编辑和删除。",
		// —— 归档 ——
		Archives: "归档",
		"When creating source code archives, you can choose to include files stored using Git LFS in the archive.":
			"创建源代码归档时，你可以选择把通过 Git LFS 存储的文件包含进归档。",
		"Include Git LFS objects in archives":
			"在归档中包含 Git LFS 对象",
		"Git LFS usage in archives is billed at the same rate as usage with the client.":
			"归档中的 Git LFS 用量按与客户端用量相同的费率计费。",
		// —— 推送 ——
		Pushes: "推送",
		"Limit how many branches and tags can be updated in a single push":
			"限制单次推送可更新的分支和标签数量",
		"Pushes will be rejected if they attempt to update more than this.":
			"如果推送试图更新的数量超过此上限，推送将被拒绝。",
		"Learn more about this setting, and send us your feedback.":
			"进一步了解此设置，并向我们反馈。",
		"Learn more about this setting": "进一步了解此设置",
		// —— 自动关闭议题 ——
		"After merging a pull request, linked issues can be closed automatically.":
			"合并拉取请求后，可自动关闭关联的议题。",
		"Auto-close issues with merged linked pull requests":
			"关联拉取请求合并后自动关闭议题",
		"Whenever linked pull requests have merged, auto-close the issue.":
			"关联的拉取请求一旦合并，即自动关闭相应议题。",
		// —— 危险区域 ——
		"Change repository visibility": "更改仓库可见性",
		"This repository is currently public.":
			"此仓库当前为公开仓库。",
		"This repository is currently private.":
			"此仓库当前为私有仓库。",
		"Disable branch protection rules": "禁用分支保护规则",
		"Disable branch protection rules enforcement and APIs":
			"禁用分支保护规则的强制执行与 API",
		"Transfer ownership": "转移所有权",
		"Transfer this repository to another user or to an organization where you have the ability to create repositories.":
			"将此仓库转移到另一个用户，或转移到你有权创建仓库的组织。",
		"Archive this repository": "归档此仓库",
		"Mark this repository as archived and read-only.":
			"将此仓库标记为已归档并只读。",
		"Delete this repository": "删除此仓库",
		"Once you delete a repository, there is no going back. Please be certain.":
			"一旦删除仓库，将无法撤消。请务必谨慎。",
		// —— 危险区域操作按钮 ——
		"Change visibility": "更改可见性",
		Transfer: "转移",
		Archive: "归档",
		Unarchive: "取消归档",
	},
	rules: [
		// “Sponsor” 的引号在 GitHub 文案中直弯混用，用字符类一并覆盖
		{
			pattern: /^Display a [“"]Sponsor[”"] button$/,
			replacement: "显示“赞助”按钮",
		},
		// 推送限制说明的链接若拆成「链接 + 尾句」两个节点，尾句在此兜底
		{
			pattern: /^, and send us your feedback\.$/,
			replacement: "，并向我们反馈。",
		},
	],
};
