// 跨页面通用正则规则：相对时间与计数等动态文本
// 语义：pattern 对整段已 trim 文本 test，命中即 replace（首条命中生效）
// 硬性约束：replacement 必须含 CJK（防观察器翻译循环）；pattern 禁用 g / y 标志

import type { Rule } from "../shared/types.ts";

/** 相对时间：<relative-time> 渲染的英文文本，单复数通吃 */
export const timeRules: Rule[] = [
	{ pattern: /^now$/, replacement: "刚刚" },
	{ pattern: /^yesterday$/, replacement: "昨天" },
	{
		pattern: /^(\d+) seconds? ago$/,
		replacement: "$1 秒前",
	},
	{
		pattern: /^(\d+) minutes? ago$/,
		replacement: "$1 分钟前",
	},
	{
		pattern: /^(\d+) hours? ago$/,
		replacement: "$1 小时前",
	},
	{ pattern: /^(\d+) days? ago$/, replacement: "$1 天前" },
	{ pattern: /^(\d+) weeks? ago$/, replacement: "$1 周前" },
	{
		pattern: /^(\d+) months? ago$/,
		replacement: "$1 个月前",
	},
	{ pattern: /^(\d+) years? ago$/, replacement: "$1 年前" },
	{
		pattern: /^in (\d+) seconds?$/,
		replacement: "$1 秒后",
	},
	{
		pattern: /^in (\d+) minutes?$/,
		replacement: "$1 分钟后",
	},
	{
		pattern: /^in (\d+) hours?$/,
		replacement: "$1 小时后",
	},
	{ pattern: /^in (\d+) days?$/, replacement: "$1 天后" },
	{ pattern: /^in (\d+) weeks?$/, replacement: "$1 周后" },
	{
		pattern: /^in (\d+) months?$/,
		replacement: "$1 个月后",
	},
	{ pattern: /^in (\d+) years?$/, replacement: "$1 年后" },
];

/** 计数与统计；带修饰语的条目必须排在泛化条目之前（首条命中生效） */
export const countRules: Rule[] = [
	{ pattern: /^([\d,]+) Open$/, replacement: "$1 打开" },
	{
		pattern: /^([\d,]+) Closed$/,
		replacement: "$1 已关闭",
	},
	{
		pattern: /^([\d,]+) contributions in the last year$/,
		replacement: "过去一年 $1 次贡献",
	},
	{
		pattern: /^([\d,]+) contributions?$/,
		replacement: "$1 次贡献",
	},
	{
		pattern: /^([\d,]+) public repositor(?:y|ies)$/,
		replacement: "$1 个公开仓库",
	},
	{
		pattern: /^([\d,]+) private repositor(?:y|ies)$/,
		replacement: "$1 个私有仓库",
	},
	{
		pattern: /^([\d,]+) repositor(?:y|ies)$/,
		replacement: "$1 个仓库",
	},
	{
		pattern: /^([\d,]+) commits?$/,
		replacement: "$1 次提交",
	},
	{
		pattern: /^([\d,]+) contributors?$/,
		replacement: "$1 位贡献者",
	},
	{
		pattern: /^([\d,]+) members?$/,
		replacement: "$1 名成员",
	},
	{
		pattern: /^([\d,]+) files? changed$/,
		replacement: "$1 个文件发生变更",
	},
];

/** 全站通用规则集合（global 兜底，页面模块规则先于它生效） */
export const commonRules: Rule[] = [
	...timeRules,
	...countRules,
];
