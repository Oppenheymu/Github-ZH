// 营销模块：/features 与 /pricing 产品营销页专属词条
// 固定单段路径，置于 profile 之前压过其兜底命中
// 注：纯产品名（GitHub Actions、Copilot、Electron、Enterprise Cloud、
//     Enterprise Server、Copilot Autofix 等）与 LDAP / SAML 等
//     不可译缩写、纯容量数值（2GB 等）不收录；内部实验标识
//     （River Breakout）非用户文案不收录；Contact Sales 为跨营销页
//     出现的 CTA，留待全站词条处理

import type { PageDict } from "../../shared/types.ts";

export const marketingDict: PageDict = {
	route: /^\/(features|pricing)/,
	entries: {
		// —— /pricing：套餐卡 ——
		Free: "免费",
		forever: "永久",
		Unlimited: "无限制",
		"The basics for individuals": "面向个人的基础功能",
		"and organizations": "与组织",
		"Continue with Team": "继续使用 Team",
		"With policies and controls": "提供策略与管控",
		"Unlimited public/private repositories":
			"公开/私有仓库数量不限",
		"Free for public repositories": "对公开仓库免费",
		"Join for free": "免费加入",
		"Featured add-ons": "精选附加组件",
		"Most popular": "最受欢迎",
		Recommended: "推荐",
		"Advanced collaboration for": "高级协作，面向",
		"individuals and organizations": "个人与组织",
		"Security, compliance,": "安全、合规，",
		"and flexible deployment": "以及灵活部署",
		"Everything included in Free, plus...":
			"包含 Free 的所有功能，另加…",
		"Everything included in Team, plus...":
			"包含 Team 的所有功能，另加…",
		// —— /pricing：价格与计费 ——
		USD: "美元",
		"per user/month": "每用户/月",
		"per month": "每月",
		"Usage-based": "按用量计费",
		"for the first 12 months": "前 12 个月",
		"$0 spend limit": "支出上限 $0",
		"Ability to increase spend limit": "可提高支出上限",
		"Starting at": "起价",
		"per month forever": "每月 永久",
		"$5 per month for 50 GB bandwidth and 50 GB of storage.":
			"每月 $5，含 50 GB 带宽和 50 GB 存储。",
		// —— /pricing：Actions 与 Packages 额度 ——
		"2,000 minutes/month": "2,000 分钟/月",
		"3,000 minutes/month": "3,000 分钟/月",
		"50,000 minutes/month": "50,000 分钟/月",
		"2,000 CI/CD minutes/month": "2,000 CI/CD 分钟/月",
		"3,000 CI/CD minutes/month": "3,000 CI/CD 分钟/月",
		"50,000 CI/CD minutes/month": "50,000 CI/CD 分钟/月",
		"2GB of Packages storage": "2GB Packages 存储",
		"500MB of Packages storage": "500MB Packages 存储",
		"50GB of Packages storage": "50GB Packages 存储",
		"Access to GitHub Codespaces":
			"可使用 GitHub Codespaces",
		"GitHub Codespaces Access":
			"GitHub Codespaces 访问权限",
		"GitHub sandbox (public preview)":
			"GitHub 沙盒（公开预览版）",
		// —— /pricing：功能对比行 ——
		"Code owners": "代码所有者",
		"Repository rules": "仓库规则",
		"Issues & Projects": "议题与项目",
		"Pages and Wikis": "页面与维基",
		"Required reviewers": "必需的审查者",
		"Draft pull requests": "草稿拉取请求",
		"Multiple reviewers in pull requests":
			"拉取请求中的多名审查者",
		"Environment protection rules": "环境的保护规则",
		"Environment deployment branches and secrets":
			"环境的部署分支与机密",
		"Easily discuss and collaborate on pull requests before submitting to formal review.":
			"在提交正式审查前，轻松讨论拉取请求并展开协作。",
		"A job cannot access secrets that are defined in an environment unless it is running on the specified branch.":
			"除非作业在指定分支上运行，否则无法访问环境中定义的机密。",
		"When a workflow job references an environment, the job won't start until all of the environment's protection rules pass.":
			"当工作流作业引用某个环境时，只有在该环境的所有保护规则都通过后，作业才会启动。",
		// —— /pricing：功能对比行（补充）——
		"Not available": "不可用",
		"Insights in security overview": "安全概览中的洞察",
		"Artifact attestations": "构件证明",
		"Audit log API": "审计日志 API",
		"Automatic code review assignment": "自动指派代码审查",
		"Code reviews": "代码审查",
		"Collaborators for private repositories":
			"私有仓库的协作者",
		"Collaborators for public repositories":
			"公开仓库的协作者",
		"Contextual vulnerability intelligence and advice":
			"情境化的漏洞情报与建议",
		"Copilot secret scanning": "Copilot 机密扫描",
		"Custom patterns": "自定义模式",
		"Generic patterns": "通用模式",
		"Provider patterns": "提供商模式",
		"Provider notification": "提供商通知",
		"Validity checks": "有效性检查",
		"Dependabot custom auto-triage rules":
			"Dependabot 自定义自动分诊规则",
		"Dependabot security updates with grouped updates":
			"支持分组更新的 Dependabot 安全更新",
		"Dependabot version updates": "Dependabot 版本更新",
		"Dependency review action": "依赖项审查 Action",
		"GitHub Apps": "GitHub 应用程序",
		"GitHub Security Advisories": "GitHub 安全公告",
		"IP allow list": "IP 允许列表",
		"Invoice billing": "发票结算",
		"Multiple issue assignees": "多名议题指派人",
		"Multiple pull request assignees": "多名拉取请求指派人",
		"Organization and team management": "组织与团队管理",
		"Pages and wikis": "页面与维基",
		"Pre-receive hooks": "Pre-receive 钩子",
		"Private repositories": "私有仓库",
		"Push protection": "推送保护",
		"Push protection bypass controls": "推送保护绕过管控",
		"Required 2FA": "强制双因素认证（2FA）",
		"Role-based access control": "基于角色的访问控制",
		"SAML single sign-on (SSO)": "SAML 单点登录（SSO）",
		SBOMs: "SBOM（软件物料清单）",
		"Scan history API": "扫描历史 API",
		"Scheduled reminders": "定期提醒",
		"Self-hosted deployment": "自托管部署",
		"Status checks": "状态检查",
		"Third party extensibility for code scanning alerts":
			"代码扫描警报的第三方扩展能力",
		// —— /pricing：安全、合规与管理 ——
		"Data residency": "数据驻留",
		"Advanced auditing": "高级审计",
		"Audit Log API": "审计日志 API",
		"SAML single sign-on": "SAML 单点登录",
		"User provisioning through SCIM": "通过 SCIM 预配用户",
		"Requires GitHub Enterprise": "需要 GitHub Enterprise",
		"Enterprise Account to centrally manage multiple organizations":
			"以企业账户集中管理多个组织",
		"FedRAMP Tailored Authority to Operate (ATO)":
			"FedRAMP 定制版运营授权（ATO）",
		"SOC1, SOC2, type 2 reports annually":
			"每年提供 SOC1、SOC2 type 2 报告",
		// —— /pricing：支持与购买 ——
		"Community support": "社区支持",
		"Web-based support": "网页端支持",
		"Premium support": "Premium 支持",
		"Learn more about Premium Support":
			"进一步了解 Premium 支持",
		"Start a free trial": "开始免费试用",
		"Start a free 30 day trial": "开始 30 天免费试用",
		"View pricing plans": "查看定价方案",
		"Show features": "显示功能",
		"Read the case study": "阅读案例研究",
		"contact our sales team": "联系我们的销售团队",
		"Contact our sales team": "联系我们的销售团队",
		"Public repositories": "公开仓库",
		Available: "可用",
		// —— /pricing：支持与购买（补充）——
		"Community Support": "社区支持",
		"Standard Support": "标准支持",
		"Premium and Premium Plus Support":
			"Premium 与 Premium Plus 支持",
		"Exclusive add-on": "专属附加组件",
		"Learn more about billing": "进一步了解计费",
		"Compare plans": "比较方案",
		"How to get started": "如何开始使用",
		"Get expert help for Enterprise Cloud and Enterprise—any hour your team needs it.":
			"为 Enterprise Cloud 和 Enterprise 获取专家帮助——团队需要的任何时刻均可。",
		"Gain peace of mind with our security, privacy, and responsible AI policies.":
			"凭借我们的安全、隐私与负责任的 AI 政策，安心无忧。",
		// —— /pricing：套餐说明长句 ——
		"Host open source projects in public GitHub repositories, accessible via web or command line. Public repositories are accessible to anyone at GitHub.com.":
			"在 GitHub 公开仓库中托管开源项目，可通过网页或命令行访问。GitHub.com 上的任何人都可以访问公开仓库。",
		"Host your own software packages or use them as dependencies in other projects. Both private and public hosting available.":
			"托管你自己的软件包，或将其用作其他项目的依赖。私有与公开托管均可。",
		"Host documentation and simple websites for your project in a wiki format that contributors can easily edit either on the web or command line.":
			"以维基形式为项目承载文档与简单网站，贡献者可以在网页或命令行上轻松编辑。",
		"Use execution minutes with GitHub Actions to automate your software development workflows. Write tasks and combine them to build, test, and deploy any code project on GitHub.":
			"使用 GitHub Actions 的执行分钟数来自动化软件开发工作流。编写任务并将其组合，即可在 GitHub 上构建、测试和部署任何代码项目。",
		"Get help with most of your GitHub questions and issues in our Community Forum.":
			"在我们社区论坛获取大多数 GitHub 问题与议题方面的帮助。",
		"Use an identity provider to manage the identities of GitHub users and applications.":
			"使用身份提供商管理 GitHub 用户和应用程序的身份。",
		"With Premium, get a 30-minute SLA on Urgent tickets and 24/7 web and phone support via callback request. With Premium Plus, get everything in Premium, assigned Customer Reliability Engineer and more.":
			"选用 Premium，Urgent（紧急）工单可享 30 分钟 SLA，并可通过回拨请求获得 24/7 全天候网页与电话支持。选用 Premium Plus，可获 Premium 全部权益，另有专属客户可靠性工程师等更多服务。",
		// —— /pricing：套餐说明长句（补充）——
		With: "借助",
		", get an instant dev environment in the cloud, so you can code anywhere on any device.":
			"，即可在云端获得即时开发环境，随时随地用任何设备编写代码。",
		"Blazing fast cloud developer environments with flexible compute and pre-configured containers, developers can code, collaborate, and debug from any browser. Pay only for what you use with compute fees starting at $0.18/hr and storage fees at $0.07/GB per month.":
			"极速的云端开发者环境，算力灵活、容器预配置，开发者可在任何浏览器中编写代码、协作与调试。按用量付费：算力费用 $0.18/小时起，存储费用每月 $0.07/GB。",
		"Assign multiple users or a team to review a pull request.":
			"指派多名用户或一个团队来审查拉取请求。",
		"Automatically request reviews—or require approval—by selected contributors when changes are made to sections of code that they own.":
			"当其所拥有的代码部分发生变更时，自动向选定的贡献者请求审查——或要求其批准。",
		"Automatically request reviews – or require approval – by selected contributors when changes are made to sections of code that they own.":
			"当其所拥有的代码部分发生变更时，自动向选定的贡献者请求审查——或要求其批准。",
		"Enforce restrictions on how code branches and tags are merged across your organization, including requiring reviews by selected collaborators, or allowing only specific contributors to work on a particular branch.":
			"在整个组织内强制执行代码分支与标签的合并限制，包括要求选定协作者进行审查，或仅允许特定贡献者在特定分支上工作。",
		"Enforce restrictions on how code branches are merged, including requiring reviews by selected collaborators, or allowing only specific contributors to work on a particular branch.":
			"强制执行代码分支合并限制，包括要求选定协作者进行审查，或仅允许特定贡献者在特定分支上工作。",
		"Ensure that pull requests have a specific number of approving reviews before collaborators can make changes to a protected branch.":
			"确保在协作者能够更改受保护分支之前，拉取请求已获得特定数量的批准审查。",
		"Ensure your secrets stay secure. Mitigate risk associated with exposed secrets in your repositories, while preventing new leaks before they happen with push protection.":
			"确保你的机密安全无虞。降低仓库中已泄露机密的相关风险，并借助推送保护在新泄露发生之前加以防范。",
		"Find and fix vulnerabilities in your code before they reach production. Prioritize your Dependabot alerts with automated triage rules.":
			"在漏洞进入生产环境之前发现并修复代码中的漏洞。借助自动分诊规则排定 Dependabot 警报的优先级。",
		"GitHub Support can help you troubleshoot issues you run into while using GitHub.":
			"GitHub 支持团队可以帮你排查使用 GitHub 时遇到的问题。",
		"GitHub Support can help you troubleshoot issues you run into while using GitHub. Get support via the web.":
			"GitHub 支持团队可以帮你排查使用 GitHub 时遇到的问题。通过网络获取支持。",
		"Give your developers flexible features for project management that adapts to any team, project, and workflow — all alongside your code.":
			"为你的开发者提供灵活的项目管理功能，适配任何团队、项目与工作流——一切都与代码相伴。",
		"Keep projects secure by automatically opening pull requests to update vulnerable dependencies and keep them up to date.":
			"自动发起拉取请求更新易受攻击的依赖项并使其保持最新，保障项目安全。",
		"As a GitHub Enterprise Cloud organization administrator, you can now access log events using our GraphQL API and monitor the activity in your organization.":
			"作为 GitHub Enterprise Cloud 组织管理员，你现在可以使用我们的 GraphQL API 访问日志事件，并监控组织中的活动。",
		"Automatically invite members to join your organization when you grant access on your IdP. If you remove a member's access to your GitHub organization on your SAML IdP, the member will be automatically removed from the GitHub organization.":
			"在 IdP 上授予访问权限时，自动邀请成员加入你的组织。如果你在 SAML IdP 上移除某成员对你 GitHub 组织的访问权限，该成员将自动从 GitHub 组织中移除。",
		"Enforce branch and tag protections, as well as push rules across your enterprise. Rule insights allow you to assess impact of rules before and during enforcement.":
			"在整个企业内强制执行分支与标签保护以及推送规则。规则洞察让你能在强制执行之前及期间评估规则的影响。",
		"GitHub Enterprise Cloud includes the option to create an enterprise account, which enables collaboration between multiple organizations, gives administrators a single point of visibility and management and brings license cost savings for identical users in multiple organizations.":
			"GitHub Enterprise Cloud 支持创建企业账户，实现多个组织之间的协作，为管理员提供单一的可见性与管理入口，并为多个组织中的同一用户节省许可证费用。",
		"GitHub Enterprise Cloud offers a multi-tenant enterprise SaaS solution on Microsoft Azure, allowing you to choose a regional cloud deployment for data residency, so your in-scope data is stored at rest in a designated location.":
			"GitHub Enterprise Cloud 在 Microsoft Azure 上提供多租户企业级 SaaS 解决方案，你可选择区域云部署来实现数据驻留，让范围内的静态数据存储在指定位置。",
		"Multi-tenant enterprise SaaS solution on Microsoft Azure, allowing you to choose a regional cloud deployment for data residency, so your in-scope data is stored at rest in a designated location. This is available in the EU and Australia with additional regions coming soon.":
			"Microsoft Azure 上的多租户企业级 SaaS 解决方案，你可选择区域云部署来实现数据驻留，让范围内的静态数据存储在指定位置。目前在欧盟和澳大利亚可用，更多地区即将推出。",
		"GitHub offers AICPA System and Organization Controls (SOC) 1 Type 2 and SOC 2 Type 2 reports with IAASB International Standards on Assurance Engagements, ISAE 3000, and ISAE 3402.":
			"GitHub 提供 AICPA 系统与组织控制（SOC）1 Type 2 与 SOC 2 Type 2 报告，符合 IAASB 国际鉴证业务准则 ISAE 3000 与 ISAE 3402。",
		"Government users can host projects on GitHub Enterprise Cloud with the confidence that our platform meets the low impact software-as-a-service (SaaS) baseline of security standards set by our U.S. federal government partners.":
			"政府用户可以放心地在 GitHub Enterprise Cloud 上托管项目：我们的平台符合美国联邦政府合作伙伴制定的低影响软件即服务（SaaS）安全标准基线。",
		"Own and control the user accounts of your enterprise members through your identity provider (IdP).":
			"通过你的身份提供商（IdP）拥有并控制企业成员的用户账户。",
		"Quickly review the actions performed by members of your organization.":
			"快速审查组织成员执行的操作。",
		"Keep copies of audit log data to ensure secure IP and maintain compliance for your organization.":
			"保留审计日志数据副本，确保 IP 安全并为你的组织保持合规。",
		"Quickly review the actions performed by members of your organization. Keep copies of audit log data to ensure secure IP and maintain compliance for your organization.":
			"快速审查组织成员执行的操作。保留审计日志数据副本，确保 IP 安全并为你的组织保持合规。",
		"Access GitHub Enterprise Server using your existing accounts and centrally manage repository access.":
			"使用你现有的账户访问 GitHub Enterprise Server，并集中管理仓库访问权限。",
		"Allow contributors to easily notify you of changes they've pushed to a repository – with access limited to the contributors you specify. Easily merge changes you accept.":
			"让贡献者轻松通知你他们推送到仓库的变更——访问权限仅限你指定的贡献者。轻松合并你接受的变更。",
		"Assign more than one person to a pull request.":
			"可将多人指派给一个拉取请求。",
		"Assign more than one person to an issue.":
			"可将多人指派给一个议题。",
		"Automated pull requests that batch dependency updates for known vulnerabilities.":
			"自动发起拉取请求，批量更新存在已知漏洞的依赖项。",
		"Automated pull requests that keep your dependencies up to date.":
			"自动发起拉取请求，让你的依赖项保持最新。",
		"Automatically assign code reviews to members of your team based on one of two algorithms.":
			"根据两种算法之一，自动将代码审查指派给你的团队成员。",
		"Catch insecure dependencies before adding them and get insights on licenses, dependents, and age.":
			"在添加不安全的依赖项之前将其拦截，并获取有关许可证、依赖方与存在时长的洞察。",
		"Centralize your findings across all your scanning tools via SARIF upload to GitHub.":
			"通过向 GitHub 上传 SARIF，集中管理所有扫描工具的检测结果。",
		"Create requirements for automatically accepting or rejecting a push based on the contents of the push.":
			"根据推送内容创建要求，自动接受或拒绝推送。",
		"Create your own patterns and find organization-specific secrets.":
			"创建你自己的模式，发现组织特有的机密。",
		"Define alert-centric policies to control how Dependabot handles alerts and pull requests.":
			"定义以警报为中心的策略，控制 Dependabot 处理警报和拉取请求的方式。",
		"Define tests that GitHub automatically runs against code being committed to your repository, and get details about failures and what is causing them.":
			"定义 GitHub 对提交到仓库的代码自动运行的测试，并获取失败的详情及其原因。",
		"Define users' level of access to your code, data and settings.":
			"定义用户对你的代码、数据和设置的访问级别。",
		"Detect and manage exposed secrets across git history, pull requests, issues, and wikis.":
			"检测并管理 git 历史、拉取请求、议题和维基中泄露的机密。",
		"Detect tokens from unknown providers, including HTTP authentication headers, connection strings, and private keys.":
			"检测来自未知提供商的令牌，包括 HTTP 身份验证标头、连接字符串和私钥。",
		"Enforce consistent code standards, security, and compliance across branches and tags.":
			"在分支与标签间强制执行一致的代码标准、安全与合规要求。",
		"Ensure unfalsifiable provenance and integrity for your software.":
			"为你的软件提供不可伪造的来源与完整性保证。",
		"Export a software bill of materials (SBOM) for your repository.":
			"为你的仓库导出软件物料清单（SBOM）。",
		"Get a clear view of risk distribution with security metrics and dashboards.":
			"借助安全指标与仪表板，清晰掌握风险分布情况。",
		"Get a clear view of your project’s dependencies with a summary of manifest, lock files, and submitted dependencies via the API.":
			"通过清单、锁文件与经 API 提交的依赖项摘要，清晰掌握项目的依赖项。",
		"GitHub collaborates with AWS, Azure, and Google Cloud to detect secrets with high accuracy. This minimizes false positives, letting you focus on what matters.":
			"GitHub 与 AWS、Azure 和 Google Cloud 合作，以高准确度检测机密。这能最大限度减少误报，让你专注于真正重要的事。",
		"Host code in private GitHub repositories, accessible via appliance, web, and command line. Private repositories are only accessible to you and people you share them with.":
			"在私有 GitHub 仓库中托管代码，可通过设备、网页和命令行访问。私有仓库仅你与你共享的对象可以访问。",
		"Host your own software packages or use them as dependencies in other projects. Both private and public hosting available. Packages are free for public repositories.":
			"托管你自己的软件包，或将其用作其他项目的依赖。私有与公开托管均可。软件包对公开仓库免费。",
		"Install apps that integrate directly with GitHub's API to improve development workflows – or build your own for private use or publication in the GitHub Marketplace.":
			"安装与 GitHub API 直接集成的应用程序来改进开发工作流——或自行构建应用程序，供私有使用或发布到 GitHub Marketplace。",
		"Invite any GitHub member, or all GitHub members, to work with you on code in a private repository you control – including making changes and opening issues.":
			"邀请任意 GitHub 成员或全部 GitHub 成员，在你控制的私有仓库中与你协作处理代码——包括做出变更和开启议题。",
		"Invite any GitHub member, or all GitHub members, to work with you on code in a public repository you control – including making changes and opening issues.":
			"邀请任意 GitHub 成员或全部 GitHub 成员，在你控制的公开仓库中与你协作处理代码——包括做出变更和开启议题。",
		"Limit access to known allowed IP addresses.":
			"将访问限制在已知的允许 IP 地址范围内。",
		"Manage access to projects on a team-by-team, or individual user, basis.":
			"按团队或单个用户管理项目的访问权限。",
		"Manage who can bypass push protection and when.":
			"管理谁可以在何时绕过推送保护。",
		"Pay bills via invoice, rather than using your credit card.":
			"通过发票支付账单，而非使用信用卡。",
		"Powered by GitHub Copilot, generate automatic fixes for 90% of alert types in JavaScript, Typescript, Java, and Python.":
			"由 GitHub Copilot 提供支持，可为 JavaScript、TypeScript、Java 和 Python 中 90% 的警报类型生成自动修复。",
		"Prevent secret exposures by proactively blocking secrets before they reach your code.":
			"在机密进入你的代码之前主动拦截，防止机密泄露。",
		"Prioritize active secrets with validity checks for provider patterns.":
			"通过对提供商模式进行有效性检查，优先处理仍有效的机密。",
		"Providers get real-time alerts when their tokens appear in public code, enabling them to notify, quarantine, or revoke secrets.":
			"当其令牌出现在公开代码中时，提供商会收到实时警报，从而可通知、隔离或吊销机密。",
		"Quickly remediate with context provided by Copilot Autofix.":
			"借助 Copilot Autofix 提供的上下文快速补救。",
		"Reduce security debt and burn down your security backlog with security campaigns.":
			"借助安全活动减少安全欠债，逐步清偿安全积压。",
		"Review how and when GitHub scans your repositories for secrets.":
			"查看 GitHub 扫描仓库机密的方式与时机。",
		"Review new code, see visual code changes, and confidently merge code changes with automated status checks.":
			"审查新代码、直观查看代码变更，并借助自动化状态检查放心地合并代码变更。",
		"Run agent-generated code safely in isolated, stateful cloud environments with snapshot and resume.":
			"在支持快照与恢复的隔离、有状态云环境中安全运行代理生成的代码。",
		"See data about activity and contributions within your repositories, including trends. You can use this data to improve collaboration and make development faster and more effective.":
			"查看仓库内活动与贡献的数据（包括趋势）。你可以利用这些数据改进协作，让开发更快、更高效。",
		"Self-hosted GitHub for on-prem appliances or self-managed cloud tenants.":
			"自托管 GitHub，适用于本地部署设备或自主管理的云租户。",
		"Send scheduled messages to you or your team listing open pull requests.":
			"定时向你或你的团队发送消息，列出打开的拉取请求。",
		'Spin up fully configured dev environments in the cloud with the power of your favorite editor. A "core hour" denotes compute usage. On a 2-core machine, you would get 60 hours free. On a 4-core machine, you would get 30 hours free, etc. Free hours are assigned to personal accounts, rather than free organizations.':
			"在云端启动配置齐全的开发环境，尽情发挥你最钟爱编辑器的全部能力。“核心小时”表示算力用量。2 核机器可获得 60 个免费小时，4 核机器可获得 30 个免费小时，依此类推。免费小时分配给个人账户，而非免费组织。",
		"Uncover vulnerabilities in your code with our industry-leading semantic code analysis.":
			"借助我们业界领先的语义代码分析，发现代码中的漏洞。",
		"Understand how risk is distributed across your organization with security metrics and insight dashboards.":
			"借助安全指标与洞察仪表板，了解风险在组织内的分布情况。",
		"Use AI to detect unstructured like passwords—without the noise.":
			"使用 AI 检测密码等非结构化机密——不受噪音干扰。",
		"Use an extra layer of security with two factor authentication (2FA) when logging into GitHub.":
			"登录 GitHub 时使用双因素认证（2FA），增加一层安全保障。",
		"Use execution minutes with GitHub Actions to automate your software development workflows. Write tasks and combine them to build, test, and deploy any code project on GitHub. Minutes are free for public repositories.":
			"使用 GitHub Actions 的执行分钟数来自动化软件开发工作流。编写任务并将其组合，即可在 GitHub 上构建、测试和部署任何代码项目。分钟数对公开仓库免费。",
		"Visualize and manage issues and pull requests across tables, boards, and roadmaps with custom fields and views that you can arrange to suit your workflow.":
			"借助自定义字段与视图，在表格、看板和路线图中可视化并管理议题和拉取请求，并可随心排列以适应你的工作流。",
		"for more information.": "以了解更多。",
		"today or": "，今天就来，或",
		"to learn more.": "以了解更多。",
		// —— /features：产品与能力 ——
		Teams: "团队",
		"Enterprise accounts": "企业账户",
		"Enterprise Managed Users": "企业管理用户",
		"Bring your own identity provider for Enterprise Managed Users":
			"为企业管理用户自带身份提供商",
		"Repository insights": "仓库洞察",
		"Charts and insights": "图表与洞察",
		"Org dependency insights": "组织依赖项洞察",
		"Project management": "项目管理",
		"Application security": "应用安全",
		"Client apps": "客户端应用",
		"Code review": "代码审查",
		"Code scanning": "代码扫描",
		"Secret scanning": "机密扫描",
		"Dependabot alerts": "Dependabot 警报",
		"Dependabot security and version updates":
			"Dependabot 安全与版本更新",
		"Dependency review": "依赖项审查",
		"GitHub Copilot secret scanning":
			"GitHub Copilot 机密扫描",
		"GitHub Copilot tutorials": "GitHub Copilot 教程",
		"GitHub security advisories": "GitHub 安全公告",
		"Private vulnerability reporting": "私密漏洞报告",
		"Security campaigns": "安全活动",
		"Target historical alerts": "针对历史警报",
		"Protected branches": "受保护的分支",
		"Custom roles": "自定义角色",
		"Custom repository roles": "自定义仓库角色",
		"Team sync": "团队同步",
		"Domain verification": "域名验证",
		"Compliance reports": "合规报告",
		"Audit log": "审计日志",
		"GitHub-hosted runners": "GitHub 托管的运行器",
		"Self-hosted runners": "自托管的运行器",
		"Workflow templates": "工作流模板",
		"Workflow visualization": "工作流可视化",
		Webhooks: "网络钩子",
		Wikis: "维基",
		APIs: "API 接口",
		"Code search & code view": "代码搜索与代码视图",
		"Collaborative coding": "协作编码",
		"Build community": "构建社区",
		"Prevent, find, and fix": "预防、发现并修复",
		"See the changes": "查看变更",
		"The latest GitHub previews": "最新 GitHub 预览功能",
		"Automation & CI/CD": "自动化与 CI/CD",
		"Automation and CI/CD": "自动化与 CI/CD",
		"Code search": "代码搜索",
		"Collaborative Coding": "协作编码",
		"Copilot Code Review": "Copilot 代码审查",
		"Governance & administration": "治理与管理",
		"CI/CD, testing, planning, project management, issue labeling, approvals, onboarding, and more":
			"CI/CD、测试、规划、项目管理、议题标签、审批、新人上手等",
		// —— /features：标语与分区说明 ——
		"Accessible anywhere.": "随处可用。",
		"Efficient management.": "高效管理。",
		"Streamlined development.": "精简高效的开发。",
		"Engineered for software teams.":
			"为软件团队精心打造。",
		"Built into the GitHub platform": "内置于 GitHub 平台",
		"The tools you need to build what you want":
			"随心构建所需的工具",
		"Coordinate initiatives big and small":
			"统筹大大小小的工作计划",
		"Keep feature requests, bugs, and more organized.":
			"让功能请求、缺陷等井井有条。",
		"Track what you deliver down to the commit.":
			"跟踪你的交付成果，精确到每次提交。",
		"Experience AI with Copilot Chat":
			"通过 Copilot Chat 体验 AI",
		"Sync with Okta and Entra ID.":
			"与 Okta 和 Entra ID 同步。",
		"Update permissions, add new users as you grow,":
			"随规模增长更新权限、添加新用户，",
		"Share features and workflows between your GitHub Enterprise Server instance and GitHub Enterprise Cloud.":
			"在 GitHub Enterprise Server 实例与 GitHub Enterprise Cloud 之间共享功能与工作流。",
		About: "关于",
		"Access GitHub anywhere:": "随时随地访问 GitHub：",
		"On Desktop, Mobile, and Command Line.":
			"桌面端、移动端与命令行。",
		"Access GitHub anywhere: On Desktop, Mobile, and Command Line.":
			"随时随地访问 GitHub：桌面端、移动端与命令行。",
		"Application security where found means fixed.":
			"应用安全：发现即修复。",
		"Powered by GitHub Copilot Autofix.":
			"由 GitHub Copilot Autofix 提供支持。",
		"Application security where found means fixed. Powered by GitHub Copilot Autofix.":
			"应用安全：发现即修复。由 GitHub Copilot Autofix 提供支持。",
		"Automate everything:": "自动化一切：",
		"Explore GitHub Advanced Security":
			"探索 GitHub Advanced Security",
		"Innovate faster": "更快创新",
		"Simplify access and permissions management":
			"简化访问与权限管理",
		"across your projects and teams.":
			"覆盖你的所有项目与团队。",
		"Simplify access and permissions management across your projects and teams.":
			"简化跨项目与团队的访问与权限管理。",
		"with seamless collaboration.": "实现无缝协作。",
		"Ready to get started?": "准备好开始了吗？",
		"Explore all the plans to find the solution that fits your needs.":
			"探索所有方案，找到适合你需求的解决方案。",
		// —— /features：功能描述长句 ——
		"Track bugs, enhancements, and other requests, prioritize work, and communicate with stakeholders as changes are proposed and merged.":
			"跟踪缺陷、增强功能与其他请求，在变更提议与合并的过程中排列工作优先级并与利益相关者沟通。",
		"Track progress on groups of issues or pull requests in a repository, and map groups to overall project goals.":
			"跟踪仓库中一组议题或拉取请求的进度，并将这些组映射到整体项目目标。",
		"Additional AI capabilities to detect elusive secrets like passwords.":
			"额外的 AI 能力，用于检测密码等难以察觉的机密。",
		"Assess the security impact of new dependencies in pull requests before merging.":
			"在合并前评估拉取请求中新增依赖项的安全影响。",
		"Automate your software workflows by writing tasks and combining them to build, test, and deploy faster from GitHub.":
			"通过编写任务并将其组合，从 GitHub 更快地构建、测试和部署，让软件工作流自动化。",
		"Browse or search GitHub's database of known vulnerabilities, featuring curated CVEs and security advisories linked to the GitHub dependency graph.":
			"浏览或搜索 GitHub 已知漏洞数据库，其中收录经整理的 CVE 以及与 GitHub 依赖项图关联的安全公告。",
		"Centralize repository management. LDAP is one of the most common protocols used to integrate third-party software with large company user directories.":
			"集中管理仓库。LDAP 是第三方软件与大型公司用户目录集成时最常用的协议之一。",
		"Collaborate and discuss changes without a formal review or the risk of unwanted merges.":
			"无需正式审查，也无意外合并的风险，即可协作并讨论变更。",
		"Create a customized view of your issues and pull requests to plan and track your work.":
			"为议题和拉取请求创建自定义视图，以规划和跟踪你的工作。",
		"Create calls to get all the data and events you need within GitHub, and automatically kick off and advance your software workflows.":
			"创建调用，获取 GitHub 内你需要的所有数据和事件，并自动启动和推进软件工作流。",
		"Create groups of user accounts that own repositories and manage access on a team-by-team or individual user basis.":
			"创建拥有仓库的用户账户组，并按团队或单个用户管理访问权限。",
		"Dedicated space for your community to come together, ask and answer questions, and have open-ended conversations.":
			"为社区提供专属空间，让大家聚在一起提问、答疑，并展开开放式交流。",
		"Define users' access level to your code, data, and settings based on their role in your organization.":
			"根据用户在组织中的角色，定义其对代码、数据和设置的访问级别。",
		"Detect exposed secrets in your public and private repositories, and revoke them to secure access to your services.":
			"检测公开与私有仓库中泄露的机密并予以吊销，以保护对你服务的访问。",
		"Dozens of events and a webhooks API help you integrate with and automate work for your repository, organization, or application.":
			"数十种事件和 webhooks API 帮你集成并自动化仓库、组织或应用程序的相关工作。",
		"Enable collaboration between your organization and GitHub environments with a single point of visibility and management via an enterprise account.":
			"借助企业账户实现组织与 GitHub 环境之间的协作，并提供单一的可见性与管理入口。",
		"Enable team synchronization between your identity provider and your organization on GitHub, including Entra ID and Okta.":
			"在身份提供商与你在 GitHub 上的组织之间启用团队同步，包括 Entra ID 和 Okta。",
		"Enable your public repository to privately receive vulnerability reports from the community and collaborate on solutions.":
			"让公开仓库能够私密地接收社区的漏洞报告，并协作制定解决方案。",
		"Enforce branch merge restrictions by requiring reviews or limiting access to specific contributors.":
			"通过要求审查或限定特定贡献者访问，强制执行分支合并限制。",
		"Enhance your organization's security with scalable source code protections, and use rule insights to easily review how and why code changes occurred in your repositories.":
			"借助可扩展的源代码保护增强组织的安全性，并利用规则洞察轻松审查仓库中代码变更的发生方式与原因。",
		"Ensure members have only the permissions they need by creating custom roles with fine-grained permission settings.":
			"通过创建具有细粒度权限设置的自定义角色，确保成员只拥有所需的权限。",
		"Financially support the open source projects your code depends on. Sponsor a contributor, maintainer, or project with one time or recurring contributions.":
			"为你代码所依赖的开源项目提供资金支持。以一次性或定期捐助赞助贡献者、维护者或项目。",
		"Find vulnerabilities in your code with CodeQL, GitHub’s industry-leading semantic code analysis. Prevent new vulnerabilities from being introduced by scanning every pull request.":
			"使用 CodeQL（GitHub 业界领先的语义代码分析）查找代码中的漏洞，并通过扫描每个拉取请求防止引入新漏洞。",
		"Gain more environments and fuller control with labels, groups, and policies to manage runs on your own machines, plus an open source runner application.":
			"借助标签、组与策略获得更多环境，更全面地管控自有机器上的运行，另有开源运行器应用程序可用。",
		"Get started quickly with thousands of actions from partners and the community.":
			"借助来自合作伙伴与社区的数千个 action 快速上手。",
		"Get suggestions for whole lines of code or entire functions right inside your editor.":
			"直接在编辑器中获得整行代码乃至整个函数的建议。",
		"GitHub Education is a commitment to bringing tech and open source collaboration to students and educators across the globe.":
			"GitHub Education 致力于让全球的学生和教育工作者都能参与技术和开源协作。",
		"Handle pull requests, issues, and tasks swiftly with GitHub CLI or mobile.":
			"使用 GitHub CLI 或移动端快速处理拉取请求、议题和任务。",
		"Host project documentation in a wiki within your repository, allowing contributors to easily edit it on the web or locally.":
			"在仓库内的维基中承载项目文档，贡献者可在网页上或本地轻松编辑。",
		"Host your own software packages or use them as dependencies in other projects, with both private and public hosting available.":
			"托管你自己的软件包或将其用作其他项目的依赖，同时提供私有与公开托管。",
		"Keep your code secure by automatically opening pull requests that update vulnerable or out-of-date dependencies.":
			"自动发起拉取请求更新易受攻击或过期的依赖项，确保代码安全。",
		"Learn new skills by completing tasks and projects directly within GitHub, guided by our friendly bot.":
			"在我们友好机器人的引导下，直接在 GitHub 内完成任务和项目，学习新技能。",
		"Leverage insights to visualize your projects by creating and sharing charts built from your project's data.":
			"利用洞察功能，通过创建并共享基于项目数据的图表，将项目可视化。",
		"Leverage thousands of actions and applications from our community to help build, improve, and accelerate your workflows.":
			"利用社区提供的数千个 action 和应用程序，帮助构建、改进并加速你的工作流。",
		"Manage issues and pull requests from the terminal, where you're already working with Git and your code.":
			"在终端中管理议题和拉取请求——你本就在这里使用 Git 和代码。",
		"Manage the lifecycle and authentication of users on GitHub Enterprise Cloud from your identity provider (IdP).":
			"通过你的身份提供商（IdP）管理 GitHub Enterprise Cloud 上用户的生命周期与身份验证。",
		"Map workflows, track their progression in real time, understand complex workflows, and communicate status with the rest of the team.":
			"映射工作流、实时跟踪进展、理解复杂工作流，并与团队其他成员沟通状态。",
		"Move automation to the cloud with on-demand Linux, macOS, Windows, ARM, and GPU environments for your workflow runs, all hosted by GitHub.":
			"将自动化迁移到云端：为工作流运行提供按需的 Linux、macOS、Windows、ARM 和 GPU 环境，全部由 GitHub 托管。",
		"Organize your members to mirror your company's structure, with cascading access to permissions and mentions.":
			"按公司组织结构安排成员，让权限与提及逐级级联。",
		"Powered by GitHub Copilot, generate automatic fixes for 90% of alert types in JavaScript, TypeScript, Java, and Python. Quickly remediate with contextual vulnerability intelligence and advice.":
			"由 GitHub Copilot 提供支持，可为 JavaScript、TypeScript、Java 和 Python 中 90% 的警报类型生成自动修复。借助情境化的漏洞情报与建议快速补救。",
		"Privately report, discuss, fix, and publish information about security vulnerabilities found in open source repositories.":
			"私密报告、讨论、修复并发布开源仓库中发现的安全漏洞的相关信息。",
		"Quickly review the actions performed by members of your organization. Monitor access, permission changes, user changes, and other events.":
			"快速审查组织成员执行的操作。监控访问、权限变更、用户变更及其他事件。",
		"Rapidly search, navigate, and understand code right from GitHub.com with our powerful new tools.":
			"借助强大的新工具，直接在 GitHub.com 上快速搜索、浏览和理解代码。",
		"Receive alerts when new vulnerabilities affect your repositories, with GitHub detecting and notifying you of vulnerable dependencies in both public and private repositories.":
			"当新漏洞影响你的仓库时接收警报：GitHub 会检测公开与私有仓库中的易受攻击依赖项并通知你。",
		"Receive notifications of contributor changes to a repository, with specified access limits, and seamlessly merge accepted updates.":
			"接收仓库贡献者变更的通知，并可指定访问限制，无缝合并已接受的更新。",
		"Review new code, visualize changes, and merge confidently with automated status checks.":
			"审查新代码、可视化变更，并借助自动化状态检查放心合并。",
		"Securely control access to organization resources like repositories, issues, and pull requests with SAML, while allowing users to authenticate with their GitHub usernames.":
			"使用 SAML 安全地控制对仓库、议题和拉取请求等组织资源的访问，同时允许用户以自己的 GitHub 用户名进行身份验证。",
		"Simplify your development workflow with a GUI to visualize, commit, and push changes—no command line needed.":
			"通过 GUI 可视化、提交并推送变更，简化你的开发工作流——无需命令行。",
		"Solve your backlog of application security debt with security campaigns that target and generate autofixes for up to 1,000 alerts at a time, rapidly reducing the risk of vulnerabilities and zero-day attacks.":
			"借助安全活动清偿应用安全欠债：一次可针对多达 1,000 条警报并生成自动修复，快速降低漏洞与零日攻击风险。",
		"Spin up fully configured dev environments in the cloud with the full power of your favorite editor.":
			"在云端启动配置齐全的开发环境，尽情发挥你最钟爱编辑器的全部能力。",
		"Standardize and scale best practices and processes with preconfigured workflow templates shared across your organization.":
			"通过组织内共享的预配置工作流模板，标准化并推广最佳实践与流程。",
		"Standardize and scale best practices, security, and compliance across your organization.":
			"在整个组织内标准化并推广最佳实践、安全与合规。",
		"Take care of your security assessment and certification needs by accessing GitHub’s cloud compliance reports, such as our SOC reports and Cloud Security Alliance CAIQ self-assessments (CSA CAIQ).":
			"访问 GitHub 的云合规报告，例如 SOC 报告与云安全联盟 CAIQ 自评估（CSA CAIQ），满足你的安全评估与认证需求。",
		"Take your projects, ideas, and code to go with fully native mobile and tablet experiences.":
			"凭借完全原生的移动与平板电脑体验，随身携带你的项目、想法和代码。",
		"This beginner-friendly playlist takes you from installation to execution, showing you how to translate natural language into terminal commands instantly.":
			"这份适合初学者的播放列表带你从安装走到执行，展示如何将自然语言即时转换为终端命令。",
		"Use GitHub on macOS, Windows, mobile, or tablet with native apps.":
			"使用原生应用在 macOS、Windows、手机或平板上使用 GitHub。",
		"Use data about activity, trends, and contributions within your repositories, to make data-driven improvements to your development cycle.":
			"利用仓库内的活动、趋势与贡献数据，对开发周期进行数据驱动的改进。",
		// —— /features：功能描述长句（补充）——
		"Use the SSO and SCIM providers of your choice for Enterprise Managed Users, separate from one another, for a more flexible approach to user lifecycle management.":
			"为企业管理用户使用你自选的 SSO 和 SCIM 提供商，且两者相互独立，让用户生命周期管理更加灵活。",
		"Verify your organization's identity on GitHub and display that verification through a profile badge.":
			"在 GitHub 上验证你的组织身份，并通过资料页徽章展示已验证状态。",
		"View the packages your project relies on, the repositories that depend on them, and any vulnerabilities detected in their dependencies.":
			"查看项目依赖的软件包、依赖这些软件包的仓库，以及在其依赖项中检测到的任何漏洞。",
		"View vulnerabilities, licenses, and other important information for the open source projects your organization depends on.":
			"查看你的组织所依赖的开源项目的漏洞、许可证及其他重要信息。",
		"Visualize and commit changes easily with GitHub Desktop.":
			"使用 GitHub Desktop 轻松可视化并提交变更。",
		"Write cross-platform desktop applications using JavaScript, HTML, and CSS with the Electron framework, based on Node.js and Chromium.":
			"使用基于 Node.js 和 Chromium 的 Electron 框架，以 JavaScript、HTML 和 CSS 编写跨平台桌面应用程序。",
		// —— /features：区块导航（aria-label）——
		"Navigation menu": "导航菜单",
		"Anchored navigation": "锚点导航",
		"Anchor navigation menu. Currently selected:":
			"锚点导航菜单。当前选中：",
		"Scroll to Application security section":
			"滚动到应用安全分区",
		"Scroll to Automation & CI/CD section":
			"滚动到自动化与 CI/CD 分区",
		"Scroll to Client apps section": "滚动到客户端应用分区",
		"Scroll to Project management section":
			"滚动到项目管理分区",
		"Scroll to features-collaboration section":
			"滚动到协作编码分区",
		// —— /features：Dev Days 活动横幅 ——
		"Dev Days are here! Join an in-person event near you to learn more about the GitHub Copilot app and Copilot CLI with your community.":
			"Dev Days 来了！参加你身边的线下活动，与社区一同深入了解 GitHub Copilot app 和 Copilot CLI。",
		"Find an event": "查找活动",
		// —— /features：跨链接分句片段（整节点翻译）——
		"and assign everyone the exact permissions they need.":
			"并为每个人分配所需的确切权限。",
		"application vulnerabilities and leaked secrets.":
			"应用漏洞与泄露的机密。",
		"around your code.": "围绕你的代码。",
		"that developers know and love.":
			"开发者熟知且喜爱的。",
		"to reduce security debt at scale.":
			"以大规模清偿安全欠债。",
		"with project tables, boards, and task lists.":
			"借助项目表格、看板与任务列表。",
		"you care about.": "你所关心的。",
		// —— /features 与 /pricing：图片 alt 描述 ——
		"GitHub Team Admin board showing access levels for a private repo: 23 members with read access, 14 with direct access, 12 via org. 'Manage access' section lists roles and edit options. Background has a pink-to-purple gradient. 4o":
			"GitHub Team 管理员看板，展示私有仓库的访问级别：23 名成员拥有读取权限，14 人有直接访问权限，12 人经组织获得访问权限。“管理访问权限”部分列出了角色与编辑选项。背景为粉色到紫色的渐变。4o",
		"GitHub code review showing a change to include variableDeprecations with versionDeprecations and selectorDeprecations. The old line is red and the new line is green. Below, three users comment on the teamwork, ending with a 'Resolve conversation' button.":
			"GitHub 代码审查，展示一项纳入 variableDeprecations 以及 versionDeprecations 和 selectorDeprecations 的变更。旧行为红色，新行为绿色。下方有三位用户就团队协作发表评论，最后是一个“解决对话”按钮。",
		"Screenshot of a GitHub Projects board titled 'Product Roadmap,' displaying three columns: Backlog, In Progress, and Triage. Each column contains cards representing issues or tasks, with labels and tags indicating status, priority, iteration.":
			"标题为“Product Roadmap”的 GitHub Projects 看板截图，显示 Backlog、In Progress 和 Triage 三列。每列包含代表议题或任务的卡片，带有指示状态、优先级和迭代的标签。",
		"American Airlines office": "美国航空办公室",
		"Ford car interior": "福特汽车内饰",
	},
	rules: [],
};
