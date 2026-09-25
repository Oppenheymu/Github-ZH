# 安全政策

> [跳转到英文版（English Version）](#english-version)

## 支持的版本

本项目是 [Koishi](https://koishi.chat) 的社区再发行版（Community Edition），核心与 webui 合并重构的单一 monorepo，发布包位于 npm 作用域 `@koishi-ce`。安全更新仅针对当前发布线提供，并以补丁版本的形式通过正式发布链发布。

| 版本线 | 支持情况 |
| ------ | -------- |
| 1.x（当前发布线，如 `@koishi-ce/koishi`、`@koishi-ce/loader`、`@koishi-ce/plugin-console` 等） | 支持 |
| `@koishi-ce/koishi-shim`（4.18.x）、`@koishi-ce/console-shim`（5.30.x）——冻结的占位再导出包 | 支持，随主发布线提供安全修复 |
| 0.x（早期预发布）及已被取代或删除的包（如 `plugin-marketn`、`core-shim` 等） | 不支持 |
| 上游官方 [koishijs/koishi](https://github.com/koishijs/koishi) 与 [koishijs/webui](https://github.com/koishijs/webui) 的版本 | 不支持，请到上游仓库报告 |

## 报告漏洞

请通过以下方式报告漏洞：

* **首选**：使用 GitHub 的私有漏洞报告功能——进入本仓库 **Security** 标签页 → **Report a vulnerability**，填写漏洞详情。该渠道对维护者与报告者均可见，漏洞细节不会公开暴露。
* **备选**：发送邮件至 `oppenheymu@gmail.com`（与行为准则中一致的联系邮箱），请在主题中注明「Security」。

报告后的流程与预期：

* 我们通常会在 **48 小时内**确认收到报告，并给出初步评估。
* 确认有效的漏洞将以补丁版本修复，并记录于受影响包的 CHANGELOG；在修复落地前，我们不会公开漏洞细节，以免影响未升级的用户。
* 若漏洞被评估为不适用或无法在社区版范围内修复（例如问题根因在上游 koishijs），我们会说明原因，并视情况将问题转交上游。
* **请不要**在公开渠道（Issues、讨论区、社交媒体等）披露尚未修复的漏洞细节。

---

<a id="english-version"></a>

# Security Policy

## Supported Versions

This project is a community redistribution (Community Edition) of [Koishi](https://koishi.chat) — the Koishi core and webui codebases restructured into a single monorepo, published under the npm scope `@koishi-ce`. Security updates are provided for the current release line only, shipped as patch releases through the formal release chain.

| Version | Supported |
| ------- | --------- |
| 1.x (current release line, e.g. `@koishi-ce/koishi`, `@koishi-ce/loader`, `@koishi-ce/plugin-console`, ...) | Yes |
| `@koishi-ce/koishi-shim` (4.18.x), `@koishi-ce/console-shim` (5.30.x) — frozen placeholder re-export packages | Yes, security fixes follow the main release line |
| 0.x (early pre-releases) and superseded/removed packages (e.g. `plugin-marketn`, `core-shim`, ...) | No |
| Upstream official [koishijs/koishi](https://github.com/koishijs/koishi) and [koishijs/webui](https://github.com/koishijs/webui) versions | No, report to the upstream repositories |

## Reporting a Vulnerability

Please report vulnerabilities through the following channels:

* **Preferred**: use GitHub's private vulnerability reporting — go to the **Security** tab of this repository → **Report a vulnerability** and fill in the details. The channel is visible to maintainers and reporters only, and vulnerability details are not exposed publicly.
* **Alternative**: send an email to `oppenheymu@gmail.com` (same contact as in the Code of Conduct), with "Security" noted in the subject line.

What to expect after reporting:

* We typically **acknowledge receipt within 48 hours** and provide an initial assessment.
* Confirmed vulnerabilities are fixed in a patch release and recorded in the affected package's CHANGELOG; until the fix lands, we will not disclose details publicly, so that users who have not yet upgraded are not exposed.
* If the report is assessed as not applicable, or cannot be fixed within the scope of this community edition (e.g. the root cause lives upstream in koishijs), we will explain why and, where appropriate, forward the issue upstream.
* **Please do not** disclose details of unfixed vulnerabilities in public channels (Issues, discussions, social media, etc.).
