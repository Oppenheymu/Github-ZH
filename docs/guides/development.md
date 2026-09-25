# 开发指南

本文面向本仓库的维护者与词典贡献者，说明翻译管线的架构、词典的归档与维护规则、以及手工加载调试的完整流程。

## 架构总览

### 目录结构

```
Github-ZH/
├── public/                  # 静态资产，构建时原样拷入 dist/
│   ├── manifest.json        # MV3：content_scripts + action.popup + storage 权限
│   ├── popup.html           # 开关弹窗（样式内联）
│   └── icons/               # 16/32/48/128 PNG（bun run icons 生成，勿手改）
├── assets/
│   └── icon.svg             # 图标唯一源文件（无头浏览器栅格化为 PNG）
├── src/
│   ├── content/             # 翻译引擎（浏览器侧）
│   │   ├── index.ts         # 入口：开关读取 + 观察器启动 + storage 联动
│   │   ├── engine.ts        # mutation 收集 → 微任务合并 → flush 调度
│   │   ├── walker.ts        # TreeWalker 翻译核心（文本 + 属性）
│   │   ├── filters.ts       # 排除选择器、CJK / 空白 / 长度判定
│   │   └── pages.ts         # 路由匹配 + 词典视图合并（单槽缓存）
│   ├── dict/                # 自建词典（纯数据模块）
│   │   ├── global.ts        # 全站通用词条 + 通用规则
│   │   ├── pages/           # 页面模块：repo / issues / pulls / settings / profile / dashboard
│   │   ├── rules.ts         # 跨页通用正则规则（相对时间、计数）
│   │   └── index.ts         # 页面模块注册表（顺序即优先级）
│   ├── popup/popup.ts       # 开关读写 + 状态渲染 + 版本回填
│   └── shared/              # types.ts（词典类型）、storage.ts（开关存取）
├── tooling/
│   ├── build.ts             # Bun.build IIFE ×2 + 重命名 + 拷贝 public/ → dist/
│   ├── checks/dict.ts       # 词典门禁（键值 / CJK / 正则 / 路由 / 重复键）
│   ├── checks/manifest.ts   # manifest 门禁（MV3 字段 / matches / 资产与产物存在性）
│   ├── gen-icons.ts         # assets/icon.svg → public/icons（无头浏览器 CDP 栅格化）
│   └── pack.ts              # dist/ 压 zip（零依赖 store 模式）
├── *.test.ts                # 与源码同目录，bun:test
└── .github/workflows/ci.yml # bun install → bun run check
```

### 翻译管线

content script 以 `run_at: document_start` 注入：

1. **入口**（`src/content/index.ts`）：读取 `chrome.storage.local` 的开关；开启时把 `MutationObserver` 挂到 `document.documentElement`（childList + subtree + characterData），天然覆盖 GitHub 的 Turbo SPA 导航，无需单独路由钩子；
2. **调度**（`src/content/engine.ts`）：mutation 只收集 `record.target` 入队，微任务合并后统一 flush，避免高频抖动；flush 时跳过已脱离文档的节点；
3. **路由**（`src/content/pages.ts`）：flush 前按 `location.pathname` 取词典视图（单槽缓存，路径变化才重建）——由 global 词典与所有命中路由的页面模块合并而成；
4. **翻译**（`src/content/walker.ts`）：TreeWalker 遍历元素与文本节点——
   - 文本节点：trim 后先查静态词条 Map（O(1)），未命中再按序试正则规则（首条命中生效），替换保留原首尾空白；
   - 元素：`title` / `aria-label` / `placeholder` / `alt` 属性值精确命中词条才替换（属性不应用正则规则）；
   - 替换结果含 CJK，天然幂等：自身修改触发的观察器循环会在下一轮立刻收敛；
5. **开关**：popup 写 `chrome.storage.local` → content script 的 `storage.onChanged` 监听触发整页 `location.reload()`（开启重建翻译 / 关闭还原英文，简单可靠）。

### 关键设计决策

- **IIFE 经典脚本**：MV3 的 content_scripts 不支持 module，`tooling/build.ts` 用 Bun.build `format: "iife"` 产出；Bun.build 没有 outfile，产物名靠 naming 模板输出后重命名成 manifest 引用的 `content.js` / `popup.js`；
- **排除清单优先**：`src/content/filters.ts` 的 `EXCLUDE_SELECTOR` 命中元素自身或祖先即整树跳过（`code` / `pre` / `textarea` / `.markdown-body` / 代码高亮与 diff 容器等）。误伤修复永远先加排除选择器，**不得为覆盖 UI 词条而放宽排除**；
- **词条合并「先到先得」**：`src/dict/index.ts` 的注册表按「具体页 → 泛化页」排序，`buildView` 先放页面词条、后放 global 兜底，因此议题页词条能压过仓库泛化词条、页面词条能压过全站词条；
- **图标**：`assets/icon.svg` 是图标的唯一源文件，`bun run icons` 用系统 Edge / Chrome 无头 CDP 栅格化出 `public/icons/` 四尺寸 PNG。已知坑：新版无头浏览器的 `--screenshot` 不支持透明背景，必须走 CDP 的 `Emulation.setDefaultBackgroundColorOverride`（`gen-icons.ts` 已封装）；找不到浏览器时可设 `GITHUB_ZH_BROWSER_PATH`。

## 词典维护指南

### 归档规则（硬性约束）

- 全站通用的词条进 `src/dict/global.ts`；仅特定页面出现的进 `src/dict/pages/<页名>.ts`，并在模块头注释写明路由；
- **键**必须是 GitHub 实际渲染的英文原文精确串（整节点精确匹配语义），大小写一致、不含 CJK；
- **值**必须含 CJK（`check:dict` 强制，防替换循环）；
- 动态文本（计数、相对时间等）用正则规则：`pattern` 禁用 g / y 标志（lastIndex 状态会跨节点累积导致漏翻），`replacement` 必须含 CJK；带修饰语的规则排在泛化规则之前（首条命中生效）。

### 静态词条与正则规则的取舍

- 文案固定 → 静态词条；
- 含数字 / 单复数 / 相对时间等动态部分 → 正则规则，用 `(\d+)` 与 `?` 折叠单复数（如 `/^(\d+) minutes? ago$/ → "$1 分钟前"`）；
- 键可能与仓库名 / 文件名 / 用户名撞车的泛化短词（如 `docs` / `test` 这类小写词）宁可漏收录，优先收录多词无歧义短语。

### 加一条词条的流程

1. 在 GitHub 实机用 DevTools 确认渲染的精确原文（看文本节点，而不是 DOM 里的源码）；
2. 按归档规则放进对应模块；
3. `bun run check:dict` 过门禁 → `bun run build` → 浏览器重载扩展验证。

## 手工加载与调试

1. `bun run watch`：改动 src / public 自动重建 `dist/`；
2. `chrome://extensions`（Edge 为 `edge://extensions`）→ 开发者模式 → 「加载已解压的扩展程序」→ 选择 `dist/`；
3. 改动源码后：重建 + 在扩展卡片点「重新加载」+ 刷新 GitHub 页签；
4. **漏翻排查**：DevTools 看文本节点原文 → 词典是否收录（键须与渲染原文完全一致）→ 收录位置是否正确（global vs 页面模块）→ 是否被排除容器挡住；
5. **误伤排查**：定位承载元素 → 把容器选择器加进 `filters.ts` 排除清单 → 再考虑词典侧回避。

## 已知边界（v1 不做）

- Shadow DOM 内文本不翻译；
- 扩展自身 UI 不做多语言（无 `_locales`，popup 即中文）；
- GitHub 正渐进迁移 React 重写页面，类名 / 结构变动导致的漏翻 / 误伤属常态：先修排除选择器，再修词条；
- `<relative-time>` 等自定义元素会自行重渲染英文，观察器会再翻一遍收敛，勿追求一次性翻译。
