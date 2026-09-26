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
│   ├── dict/                # 自建词典（JSONC 数据 + 加载层）
│   │   ├── data/
│   │   │   ├── global.jsonc # 全站通用词条 + 通用规则（相对时间、计数在前）
│   │   │   └── pages/       # 页面模块：repo / issues / pulls / settings / profile ...
│   │   ├── dict.schema.json # 编辑器侧 JSON Schema（各数据文件的 $schema 指向它）
│   │   ├── registry.ts      # 数据注册表：名字 → JSONC 原始数据，顺序即优先级
│   │   ├── load.ts          # JSONC → 词典类型（严格编译正则 + 字段白名单）
│   │   ├── index.ts         # 运行时汇总：单模块失败只跳过 + 打日志
│   │   └── jsonc.d.ts       # `.jsonc` ambient 声明（tsc 不认该扩展名）
│   ├── popup/popup.ts       # 开关读写 + 状态渲染 + 版本回填
│   └── shared/              # types.ts（词典类型）、storage.ts（开关存取）
├── tooling/
│   ├── build.ts             # Bun.build IIFE ×2 + 重命名 + 拷贝 public/ → dist/
│   ├── checks/dict.ts       # 词典门禁（严格结构编译 + 键值 / CJK 约束）
│   ├── checks/manifest.ts   # manifest 门禁（MV3 字段 / matches / 资产与产物存在性）
│   ├── gen-icons.ts         # assets/icon.svg → public/icons（无头浏览器 CDP 栅格化）
│   ├── verify-live.ts       # 实机验证：无头浏览器加载 dist/ 逐页收集漏翻 → JSON（bun run verify）
│   └── pack.ts              # dist/ 压 zip（零依赖 store 模式）
├── *.test.ts                # 与源码同目录，bun:test
└── .github/workflows/ci.yml # bun install → bun run check
```

### 翻译管线

content script 以 `run_at: document_start` 注入：

1. **入口**（`src/content/index.ts`）：读取 `chrome.storage.local` 的开关；开启时把 `MutationObserver` 挂到 `document.documentElement`（childList + subtree + characterData），天然覆盖 GitHub 的 Turbo SPA 导航，无需单独路由钩子；
2. **调度**（`src/content/engine.ts`）：mutation 只收集 `record.target` 入队，微任务合并后统一 flush，避免高频抖动；flush 时跳过已脱离文档的节点；
3. **路由**（`src/content/pages.ts`）：flush 前按 `location.pathname` 取词典视图（单槽缓存，路径变化才重建）——由 global 词典与所有命中路由的页面模块合并而成。词典本身在模块加载时由 `src/dict/index.ts` 从 JSONC 编译（正则字符串 → `RegExp`）；
4. **翻译**（`src/content/walker.ts`）：TreeWalker 遍历元素与文本节点——
   - 文本节点：trim 后先查静态词条 Map（O(1)），未命中再按序试正则规则（首条命中生效），替换保留原首尾空白；
   - 元素：`title` / `aria-label` / `placeholder` / `alt` 属性值精确命中词条才替换（属性不应用正则规则）；
   - 替换结果含 CJK，天然幂等：自身修改触发的观察器循环会在下一轮立刻收敛；
5. **开关**：popup 写 `chrome.storage.local` → content script 的 `storage.onChanged` 监听触发整页 `location.reload()`（开启重建翻译 / 关闭还原英文，简单可靠）。

### 关键设计决策

- **IIFE 经典脚本**：MV3 的 content_scripts 不支持 module，`tooling/build.ts` 用 Bun.build `format: "iife"` 产出；Bun.build 没有 outfile，产物名靠 naming 模板输出后重命名成 manifest 引用的 `content.js` / `popup.js`；
- **排除清单优先**：`src/content/filters.ts` 的 `EXCLUDE_SELECTOR` 命中元素自身或祖先即整树跳过（`code` / `pre` / `textarea` / `.markdown-body` / 代码高亮与 diff 容器等）。误伤修复永远先加排除选择器，**不得为覆盖 UI 词条而放宽排除**；
- **词条合并「先到先得」**：`src/dict/registry.ts` 的注册表按「具体页 → 泛化页」排序，`buildView` 先放页面词条、后放 global 兜底，因此议题页词条能压过仓库泛化词条、页面词条能压过全站词条。已知有意的跨模块同键异译（如 `Actions` 在仓库页是「操作」、在设置页是「Actions 工作流」；`Pages` 在设置页是「页面」、在 global 是「页码」）正是靠这个顺序生效，**勿当重复键清理**；
- **词典是 JSONC 数据，不是 TS 模块**：词条与规则放在 `src/dict/data/**.jsonc`。好处：编辑器按 `dict.schema.json` 直接给红线与补全；脚本 / AI 能安全批量追加词条，不必重写 TS 对象字面量；重复键由 Biome 的 `noDuplicateObjectKeys` 原生覆盖（加引号与裸键两种写法都能报）。代价：正则从字面量降级成字符串，反斜杠必须双写，正则语法检查从编译期挪到门禁；
- **词典数据两条消费路径**：`index.ts`（运行时）与 `tooling/checks/dict.ts`（门禁）都从 `registry.ts` 取原始数据、都走 `load.ts` 编译，只有失败策略不同——运行时单模块失败只跳过 + `console.error`，避免整站翻译失效；门禁严格报错并一次列全。**门禁不得 import `index.ts`**，否则坏数据被静默跳过后门禁反而变绿；
- **图标**：`assets/icon.svg` 是图标的唯一源文件，`bun run icons` 用系统 Edge / Chrome 无头 CDP 栅格化出 `public/icons/` 四尺寸 PNG。已知坑：新版无头浏览器的 `--screenshot` 不支持透明背景，必须走 CDP 的 `Emulation.setDefaultBackgroundColorOverride`（`gen-icons.ts` 已封装）；找不到浏览器时可设 `GITHUB_ZH_BROWSER_PATH`。

## 词典维护指南

### 归档规则（硬性约束）

- 全站通用的词条进 `src/dict/data/global.jsonc`；仅特定页面出现的进 `src/dict/data/pages/<页名>.jsonc`，并在模块头注释写明路由（JSONC 支持注释，现有的分组注释请保留）；新增或改名页面模块要同步 `src/dict/registry.ts`；
- **键**必须是 GitHub 实际渲染的英文原文精确串（整节点精确匹配语义），大小写一致、不含 CJK。一律加双引号——裸键虽然 JSONC 合法，但统一加引号便于 Biome 查重与脚本改写；
- **值**必须含 CJK（`check:dict` 强制，防替换循环）；
- 顶层字段是白名单：`$schema` / `route` / `entries` / `rules`。多写一个字段（例如把 `entries` 拼成 `entires`）会被 `load.ts` 拒绝——否则整块词典会静默变成空对象；
- 动态文本（计数、相对时间等）用正则规则：规则只有 `pattern` 与 `replacement` 两个字段，**没有 `flags` 字段**——`g` / `y` 的 `lastIndex` 会跨节点累积导致漏翻，故从结构上不允许；`replacement` 必须含 CJK；带修饰语的规则排在泛化规则之前（首条命中生效）；
- **JSONC 里正则的反斜杠必须双写**：TS 字面量 `/^(\d+) minutes? ago$/` 在 JSONC 里写作 `"^(\\d+) minutes? ago$"`。写漏一层 Bun 会直接报 `Syntax Error`（响亮失败，不会静默变成别的正则）；
- `route` 与 `pattern` 都是**字符串形态的正则源**，因此 `/` 无需转义：`"route": "^/owner/repo/issues"`。`route` 必须以 `^/` 锚定 pathname。

### 静态词条与正则规则的取舍

- 文案固定 → 静态词条；
- 含数字 / 单复数 / 相对时间等动态部分 → 正则规则，用 `(\d+)` 与 `?` 折叠单复数，JSONC 里写作 `{ "pattern": "^(\\d+) minutes? ago$", "replacement": "$1 分钟前" }`；
- 键可能与仓库名 / 文件名 / 用户名撞车的泛化短词（如 `docs` / `test` 这类小写词）宁可漏收录，优先收录多词无歧义短语。

### 加一条词条的流程

1. 在 GitHub 实机用 DevTools 确认渲染的精确原文（看文本节点，而不是 DOM 里的源码）；
2. 按归档规则放进 `src/dict/data/` 下的对应模块；新增页面模块还要在 `src/dict/registry.ts` 注册（顺序即优先级，具体页在前）；打开该 `.jsonc` 时编辑器会按 `$schema` 即时提示字段与 CJK 问题；
3. `bun run check:dict` 过门禁 → `bun run build` → 浏览器重载扩展验证。

### 批量补词条

从开发者模式导出的 JSON 往往一次带来几百条待补词条。迁移到 JSONC 后这条路径是纯数据追加：把条目按归档规则追加进对应 `.jsonc` 的 `entries` 即可，不需要手写 TS 对象字面量，也不必担心「重复键被静默覆盖」——单文件重复键由 Biome 报错，跨模块同键异译由注册表顺序决定（见 `registry.ts` 注释）。

## 手工加载与调试

1. `bun run watch`：改动 src / public 自动重建 `dist/`；
2. `chrome://extensions`（Edge 为 `edge://extensions`）→ 开发者模式 → 「加载已解压的扩展程序」→ 选择 `dist/`；
3. 改动源码后：重建 + 在扩展卡片点「重新加载」+ 刷新 GitHub 页签；
4. **漏翻排查**：DevTools 看文本节点原文 → 词典是否收录（键须与渲染原文完全一致）→ 收录位置是否正确（global vs 页面模块）→ 是否被排除容器挡住；
5. **误伤排查**：定位承载元素 → 把容器选择器加进 `filters.ts` 排除清单 → 再考虑词典侧回避。

## 开发者模式（漏翻收集）

popup 底部的「开发者模式」开关**默认关闭**，用于系统性发现漏翻：开启后，content script 在翻译时把未命中词典与规则的文本记录下来（仅本地，无任何网络请求）。逛几页 GitHub 攒一批后，在 popup 一键复制为 JSON，粘贴给 AI 会话批量补词条。

### 用法

1. popup 开启「开发者模式」——已打开的 GitHub 页签自动刷新，之后开始收集（翻译开关关闭时不翻译，自然也不收集）；
2. 正常浏览仓库 / 议题 / PR 等页面，引擎每 5 秒（以及页面隐藏 / 卸载时）把缓冲合并写入本机 `chrome.storage.local`；
3. 回到 popup 查看「已收集 N 条」，点「复制」得到 JSON，粘贴给 AI 会话或按下方归档规则手工补词条；
4. 点「清空」重新攒一批；
5. 自动化路径：`bun run verify` 跳过手工浏览——用无头浏览器加载 `dist/`，开启开发者模式后逐页访问内置页面清单（`--pages` 可换自定义清单，每行一个 URL，`#` 为注释），读取漏翻日志并输出与「复制」完全同构的 JSON（`--out` 落盘）。探针失败（扩展未加载 / 翻译未生效）时以非零码退出。

### 收集范围与导出格式

- 文本节点：未命中静态词条与正则规则的可见 UI 文本（trim 后原文）；
- 属性：`title` / `aria-label` / `placeholder` / `alt` 未命中词条的原值；
- 记录的 `text` 就是「GitHub 渲染的精确英文原文」，可直接作为词典候选键（`kind: "text"` 为文本节点，其余 kind 为属性名）；
- 缓冲上限 300 条、落盘上限 500 条（满了保留先收集的），同键累加出现次数、`path` 取首次出现页面的 pathname。

导出 JSON 结构（排序：path 升序 → count 降序 → text 升序）：

```json
{
  "schema": "github-zh-misses/1",
  "exportedAt": "2026-09-25T12:00:00.000Z",
  "items": [
    { "text": "Some English Text", "kind": "text", "path": "/owner/repo/pulls", "count": 3 }
  ]
}
```

### 隐私

- 默认关闭，开启前零收集；全程无任何网络请求；
- 收集内容仅存本机 `chrome.storage.local`，不自动上传、不同步、不导出下载；
- 导出内容可能含页面文本（文件名、仓库名等），复制后请自查再粘贴。

## 已知边界（v1 不做）

- Shadow DOM 内文本不翻译；
- 扩展自身 UI 不做多语言（无 `_locales`，popup 即中文）；
- GitHub 正渐进迁移 React 重写页面，类名 / 结构变动导致的漏翻 / 误伤属常态：先修排除选择器，再修词条；
- `<relative-time>` 等自定义元素会自行重渲染英文，观察器会再翻一遍收敛，勿追求一次性翻译。
