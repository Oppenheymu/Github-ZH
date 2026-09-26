// 扩展身份标记：content script 在 isolated world 的全局上留一个常量，
// 实机探针（tooling/verify-live.ts）据此认出「本扩展的 content script 上下文」。
//
// 为什么不能再用 manifest.name（AGENTS.md 已知坑）：品牌改走 __MSG_*__ 之后，
// chrome.runtime.getManifest().name 会随浏览器界面语言变化，用它做身份匹配会
// 「找不到扩展」。
//
// 本模块刻意只有字面量、无任何副作用：浏览器侧与工具侧都直接 import 它，
// 不能把 content 入口（有顶层副作用）拖进工具侧的模块图。

/** 内容脚本写进 isolated world 全局的值 */
export const EXTENSION_MARKER = "github-i18n/content";

/** 承载 EXTENSION_MARKER 的全局属性名 */
export const EXTENSION_MARKER_KEY = "__githubI18nContent";
