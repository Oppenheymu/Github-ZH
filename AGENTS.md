# 项目常驻指令

> 本文件是本仓库（Github-ZH，扩展显示名「GitHub 汉化」——GitHub 界面简体中文汉化浏览器扩展，Chrome / Edge，Manifest V3，MIT）的常驻开发约定，适用于本仓库内所有会话与任务。

## 基本约束

- **全程使用简体中文**：所有回复、代码注释、提交说明、生成的文档均使用简体中文。
- **不要在 Biome 的 JSON 行尾不可见字符上浪费 Token**：已知、正常、无害，看到即跳过，不调查、不修复、不报告。
- 除以上约束外，不要过度解读本指令——其余行为遵循默认 Agent 规则。

## 硬性约束（违反 = 错误）

1. **许可证纪律**：全仓 MIT（见 LICENSE 与 NOTICE）。**严禁引入任何 GPL / AGPL 系汉化项目的词典或代码**（包括但不限于 maboloshi/github-chinese）；词典 100% 原创，逐条手写。
2. **词典归档纪律**：词条只进 `src/dict/data/`——全站通用进 `global.jsonc`，仅特定页面出现的进 `pages/<页名>.jsonc`（页面范围靠路由正则表达，模块头注释说明）；动态文本用正则规则，**字符串替换值必须含 CJK**（防替换循环，`check:dict` 强制）；键必须保持 GitHub 实际渲染的英文原文精确串，不得含 CJK。JSONC 里正则的反斜杠必须双写（`\d` 写作 `\\d`）；规则不得带 `flags` 字段（`g` / `y` 的 `lastIndex` 会跨节点累积导致漏翻）；新增 / 改名模块要同步 `src/dict/registry.ts` 注册表——**顺序即优先级**，具体页在前。
3. **词典键是「整节点精确匹配」语义**：收录可能与仓库名、文件名、用户名撞车的泛化短词（如 `docs` / `test` / `blog` 等小写词）前三思，优先收录多词无歧义短语；大小写必须与 GitHub 实际渲染一致。
4. **manifest.json 手写在 `public/`**：构建时原样拷贝进 dist，不存在自动生成；改 `matches` / 权限 / 产物文件名时，同步 `tooling/checks/manifest.ts` 的断言。
5. **content script 产物必须是经典脚本（IIFE）**：MV3 的 `content_scripts` 不支持 `type: "module"`，`tooling/build.ts` 用 Bun.build `format: "iife"` 产出，勿改回 esm。
6. **排除清单优先**：代码块 / 用户内容可能出现的容器，先加进 `src/content/filters.ts` 的排除选择器，再考虑词典侧回避；**不得为覆盖 UI 词条而放宽排除**。
7. **dist/ 是构建产物**：不入 git；商店发布一律使用 `bun run pack` 产出的 zip。

## 门禁与工作流

```bash
bun install                     # 安装依赖（Bun，产出 bun.lock）
bun run check                   # 全量门禁：lint + typecheck + check:dict + check:manifest + test
bun run lint                    # biome check .（格式 + lint 唯一权威）
bun run format                  # biome format --write .
bun run typecheck               # 两条 tsc：src（浏览器侧）+ tooling（脚本侧）
bun run check:dict              # 词典门禁（JSONC 结构编译 / 键值合法性 / CJK 约束）
bun run check:manifest          # manifest 门禁（MV3 字段完整性与 public 资产存在性）
bun test                        # 全量用例（bun test）
bun run build                   # 构建 dist/（Bun.build IIFE ×2 + 拷贝 public/）
bun run watch                   # 构建并监听（改 src 自动重建，扩展需手动重载）
bun run icons                   # 从 assets/icon.svg 重新生成 public/icons（系统浏览器无头 CDP 栅格化）
bun run pack                    # dist/ 打 zip（Chrome Web Store / Edge Add-ons 通用）
```

- 提交前 `bun run check` 必须全绿；实机验证：构建后在 `chrome://extensions`（Edge 为 `edge://extensions`）开发者模式加载 `dist/` 目录。
- GitHub 改版导致漏翻 / 误伤属常态：先在实机确认失效点，再修对应词条或排除选择器。

## 代码风格

- 缩进 tab、双引号、无分号（asNeeded）——**biome 是格式的唯一权威**（`.editorconfig` 已与之对齐：代码 tab，文档 `.md`/`.yml` 2 空格）。
- TS 严格全家桶（`tsconfig.base.json`）：`strict` + `noUncheckedIndexedAccess` + `noPropertyAccessFromIndexSignature` + `exactOptionalPropertyTypes` + `noUnusedLocals/Parameters` + `verbatimModuleSyntax` + `isolatedModules` + `erasableSyntaxOnly`；类型导入一律 `import type`；显式 `any` 保持 0，动态边界用 `unknown` + 收窄。
- 测试与源码同目录 `*.test.ts`，`bun:test`（`describe` / `it`，英文短描述）；门禁与工具脚本零第三方依赖、bun 直跑，校验逻辑导出为纯函数（`main` 用 `import.meta.main` 守卫）供测试复用；错误信息中文，失败统一 `process.exitCode = 1`。

## 已知坑（一行一条，细节见 docs/guides/development.md）

- **biome.json 里不能写注释**：出现 `//` 会让 Biome **静默丢弃整个 `overrides` 数组**。
- **Bun.build 没有 `outfile`**：产物命名靠 `naming` 模板，content 与 popup 按入口分别构建；iife 是硬约束（见硬性约束 5）。
- **新版无头浏览器 `--screenshot` 不支持透明背景**（整图会被填成不透明底色）：`gen-icons.ts` 走 CDP（`Emulation.setDefaultBackgroundColorOverride` + `setDeviceMetricsOverride`）截图，勿改回 `--screenshot`。
- **GitHub 正在渐进迁移 React 重写页面**：类名 / 结构变动导致漏翻或排除失灵属常态，修词条前先修对应排除选择器。
- **翻译收敛依赖 CJK 守卫**：替换结果不含 CJK 的正则规则会随 MutationObserver 无限循环，字符串替换值必须含 CJK。
- **`<relative-time>` 等自定义元素会自行重渲染英文**：靠观察器再翻一遍收敛，勿试图一次性翻译。
- **词典误伤权衡**：静态词典按「整节点精确匹配」工作，任何词条都可能命中同名的用户内容（仓库名 / 文件名），高风险短词靠不收录来回避（见硬性约束 3）。
- **JSONC 正则的反斜杠必须双写**：`\d` 在 `.jsonc` 里要写 `\\d`；写漏一层 Bun 直接报 `Syntax Error`（响亮失败，不会静默变成别的正则）。另注意 `RegExp#source` 会把 `/` 转义回 `\/`，断言路由 / 规则请断言行为，别断言 `source`。
- **tsc 不认 `.jsonc`**：开了 `resolveJsonModule` 也报 TS2307，靠 `src/dict/jsonc.d.ts` 的 ambient 声明；`tooling/tsconfig.json` 的 include 必须含 `../src/**/*.d.ts`，否则脚本侧工程拿不到该声明。
- **词典数据由两条路消费同一个注册表**：`src/dict/index.ts` 单模块编译失败只跳过 + 打日志（保整站翻译），`tooling/checks/dict.ts` 走同一套 `load.ts` 但严格报错。**禁止让门禁 import `index.ts`**——那样坏数据被静默跳过后门禁反而变绿。
- **`.jsonc` 的重复键归 Biome 管**：`biome check .` 会扫 `.jsonc`，`noDuplicateObjectKeys` 对加引号 / 裸键两种写法都报，故 `check:dict` 不再扫源码。编辑器侧另有 `src/dict/dict.schema.json`（`$schema` 只对编辑器生效，CI 不读它；它也无法从形状区分页面模块与全站模块）。

## git 提交流程

1. 先跑 `bun run check`（必要时先 `bun run format`），确保通过再提交。
2. `git add -A` 后提交，提交信息用简体中文，格式参考现有历史（`feat:` / `fix:` / `docs:` / `chore:` / `build:`，可带 scope 如 `fix(dict):`）。
3. 提交到主分支 `main`；若当前不在主分支，先切回主分支再提交。
4. 提交完成后向用户简要说明改了什么与提交哈希。
