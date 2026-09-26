// 语言无关的纯文本工具：不依赖 DOM、不依赖 chrome，供运行时与门禁共用。
//
// 为什么单独一个模块：门禁（tooling/checks/dict.ts）必须用**引擎自己的**归一化函数
// 判定规范键形态，否则「键能否命中」会出现两套判定标准；而门禁的 tsconfig 刻意不含
// DOM（lib 只有 ES2023、types 只有 bun），不能反向 import walker.ts 那条 DOM 链路。

/**
 * 查询键归一：trim 并折叠连续空白为单空格。
 *
 * 引擎查表前对**节点文本**做这一步，因此规范键（词典的键）必须已经是归一化后的形态：
 * 键里带换行符 / 制表符 / 连续空格时，归一化后的文本永远不等于它 —— 该词条在实机
 * 永不命中，却仍然计入覆盖率分母（2026-09 实例：insights 的过滤说明句）。
 */
export function normalizeKey(text: string): string {
	return text.trim().replace(/\s+/g, " ");
}
