// `.jsonc` 模块声明。
// tsc 只认 `.json`（resolveJsonModule 对 `.jsonc` 无效，实测开了也报 TS2307），
// 故这里给 ambient 声明；导入结果是 unknown，由 load.ts 窄化成词典类型。
// 编辑器侧的字段校验与补全由各数据文件顶部的 $schema 提供（见 dict.schema.json）。

declare module "*.jsonc" {
	const value: unknown;
	export default value;
}
