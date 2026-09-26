// `.jsonc` 模块声明。
// tsc 只认 `.json`（resolveJsonModule 对 `.jsonc` 无效，实测开了也报 TS2307），
// 故这里给 ambient 声明；导入结果是 unknown，由 load.ts 窄化成词典类型。
// 编辑器侧的字段校验与补全由各数据文件顶部的 $schema 提供（见 types/dict.schema.json）。
//
// 为什么刻意是 unknown，而不是给每个文件标具体形状（**勿改成具体类型**）：
//   1. Bun 侧早就内置了 jsonc loader（运行时 import、Bun.JSONC.parse、Bun.build 内联都认，
//      见 bun-types 的 docs/runtime/file-types.mdx），但那是运行时与打包的事，
//      不改变 tsc 的判断——这份声明因此仍然必需。
//   2. tsc 从不读 `.jsonc` 的内容，具体类型只是「对文件的单方面声称」：文件里把 modules
//      写成 moduels，tsc 照样全绿，运行时才 `undefined`。形状真相只能留在 load.ts 的运行时
//      校验里（asRecord + rejectUnknownKeys），否则会诱导后人删掉那些校验、变成静默失效。
//   3. 真要逐文件标注也很脆：通配声明只吃一个 `*`（`*/locales/*` 实测不匹配），
//      23 个导入得写 23 条；且命中优先级按「前缀长度平局 → 先声明者赢」，
//      顺序一挪就静默退回 unknown（tsc 不会提醒）。

declare module "*.jsonc" {
	const value: unknown;
	export default value;
}
