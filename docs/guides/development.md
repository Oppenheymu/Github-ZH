# 开发指南

本文面向本仓库的维护者与词典贡献者，说明翻译管线的架构、多语言词典的形态与维护规则、以及手工加载调试的完整流程。

## 架构总览

### 目录结构

```
Github-i18n/
├── public/                  # 静态资产，构建时原样拷入 dist/
│   ├── manifest.json        # MV3：content_scripts + action.popup + storage 权限（name 走 __MSG_*__）
│   ├── popup.html           # 开关弹窗（样式内联，文案用 data-i18n 占位）
│   ├── _locales/            # 扩展自身 UI 文案（en / zh_CN / ja）——与「翻译目标语言」无关
│   └── icons/               # 16/32/48/128 PNG（静态资产，改图标直接替换这四个文件）
├── src/
│   ├── content/             # 翻译引擎（浏览器侧）
│   │   ├── index.ts         # 入口：身份标记 + 语言解析 + 观察器启动 + storage 联动
│   │   ├── engine.ts        # mutation 收集 → 微任务合并 → flush 调度
│   │   ├── walker.ts        # TreeWalker 翻译核心（文本 + 属性 + 别名回退）
│   │   ├── filters.ts       # 排除选择器、非拉丁字母 / 空白 / 长度判定
│   │   ├── pages.ts         # 路由匹配 + 词典视图合并（按「路径 + 语言」单槽缓存）
│   │   └── collector.ts     # 开发者模式漏翻收集
│   ├── dict/                # 自建词典
│   │   ├── core/            # 语言无关的数据（运行时）
│   │   │   ├── modules.jsonc   # 模块名 + 路由，顺序即优先级（global 兜底在最后）
│   │   │   ├── rules.jsonc     # 共享规则的 id + pattern，顺序即语义
│   │   │   ├── aliases.jsonc   # 上游改名映射：当前 DOM 文本 → 规范键
│   │   │   └── canonical.jsonc # 键的权威清单（**仅门禁使用，不进 content 包**）
│   │   ├── locales/         # 只有译文（稀疏覆盖）
│   │   │   ├── zh-CN/       # global.jsonc + pages/<页名>.jsonc + rules.jsonc
│   │   │   └── ja/          # 同上，目前只有样例
│   │   ├── locales.ts       # 语言元数据：id / 显示名 / 文字系统声明
│   │   ├── registry.ts      # 数据注册表：core + 各语言 → JSONC 原始数据
│   │   ├── load.ts          # JSONC → 词典类型（严格编译 + 字段白名单 + 交叉引用）
│   │   ├── index.ts         # 运行时汇总：按语言构建词典，单模块失败只跳过 + 打日志
│   │   └── types/           # 类型 / schema 资产（不含运行时代码）
│   │       ├── dict.schema.json # 编辑器侧 JSON Schema（oneOf 覆盖六种数据形状）
│   │       └── jsonc.d.ts       # `.jsonc` ambient 声明（tsc 不认该扩展名）
│   ├── popup/popup.ts       # popup：UI 文案回填 + 开关 / 语言读写 + 漏翻面板
│   └── shared/              # types.ts（词典类型）、storage.ts（开关与语言存取）、identity.ts
├── tooling/
│   ├── pipeline/build.ts    # Bun.build IIFE ×2 + 重命名 + 拷贝 public/ → dist/
│   ├── pipeline/pack.ts     # dist/ 压 zip（零依赖 store 模式）
│   ├── checks/dict.ts       # 词典门禁（严格编译 + 交叉引用 + 覆盖率）
│   ├── checks/manifest.ts   # manifest 门禁（MV3 字段 / _locales 一致性 / 资产与产物）
│   └── checks/view.ts       # 视图骨架门禁（模块顺序 / 命中序列 / 同键异译赢家 / 规则 id）
├── *.test.ts                # 与源码同目录，bun:test
└── .github/workflows/ci.yml # bun install → bun run check
```

### 翻译管线

content script 以 `run_at: document_start` 注入：

1. **入口**（`src/content/index.ts`）：先在 isolated world 的全局写一个身份标记（`src/shared/identity.ts`），再读 `chrome.storage.local`（`enabled` / `devMode` / `locale`）；开启时把 `MutationObserver` 挂到 `document.documentElement`（childList + subtree + characterData），天然覆盖 GitHub 的 Turbo SPA 导航，无需单独路由钩子；
2. **目标语言**：`locale` 有值即用它；没设过则取 `chrome.i18n.getUILanguage()` 并按 `src/dict/locales.ts` 的声明解析（`ja-JP` → ja、`zh-Hans-CN` → zh-CN、未支持即回退 zh-CN）。popup 改语言会触发整页刷新重建视图；
3. **调度**（`engine.ts`）：mutation 只收集 `record.target` 入队，微任务合并后统一 flush，避免高频抖动；flush 时跳过已脱离文档的节点；
4. **路由与视图**（`pages.ts`）：flush 前按 `location.pathname` + 目标语言取词典视图（单槽缓存，二者任一变化才重建）。视图 = `core/modules.jsonc` 顺序下所有命中路由的模块合并结果：词条「先到先得」（具体页压过泛化页、页面压过 global 兜底），规则「首条命中生效」；
5. **翻译**（`walker.ts`）：TreeWalker 遍历元素与文本节点——
   - 文本节点：trim 后先查静态词条 Map（O(1)），未命中再查 `core/aliases.jsonc` 的改名映射并按规范键重查一次，仍未命中才按序试正则规则，替换保留原首尾空白；
   - 元素：`title` / `aria-label` / `placeholder` / `alt` 属性值精确命中词条（含别名）才替换（属性不应用正则规则）；
   - 已翻译判定是**语言无关**的「含非拉丁字母」（`filters.ts`），自身修改触发的观察器循环会在下一轮立刻收敛；
6. **开关**：popup 写 `chrome.storage.local` → content script 的 `storage.onChanged` 监听触发整页 `location.reload()`（开启重建翻译 / 关闭还原英文，简单可靠）。

### 关键设计决策

- **IIFE 经典脚本**：MV3 的 content_scripts 不支持 module，`tooling/pipeline/build.ts` 用 Bun.build `format: "iife"` 产出；Bun.build 没有 outfile，产物名靠 naming 模板输出后重命名成 manifest 引用的 `content.js` / `popup.js`；
- **排除清单优先**：`src/content/filters.ts` 的 `EXCLUDE_SELECTOR` 命中元素自身或祖先即整树跳过（`code` / `pre` / `textarea` / `.markdown-body` / 代码高亮与 diff 容器等）。误伤修复永远先加排除选择器，**不得为覆盖 UI 词条而放宽排除**；
- **词条合并「先到先得」**：`core/modules.jsonc` 的顺序是优先级，`buildView` 先放具体页词条、后放 global 兜底，因此议题页词条能压过仓库泛化词条、页面词条能压过全站词条。已知有意的跨模块同键异译（如 `Actions` 在仓库页是「操作」、在设置页是「Actions 工作流」；`Pages` 在设置页是「页面」、在 global 是「页码」）正是靠这个顺序生效，**勿当重复键清理**；
- **词典是 JSONC 数据，不是 TS 模块**：编辑器按 `types/dict.schema.json` 直接给红线与补全；脚本 / AI 能安全批量追加词条，不必重写 TS 对象字面量；重复键由 Biome 的 `noDuplicateObjectKeys` 原生覆盖。代价：正则从字面量降级成字符串，反斜杠必须双写，正则语法检查从编译期挪到门禁；
- **词典数据两条消费路径**：`index.ts`（运行时）与 `tooling/checks/dict.ts`（门禁）都从 `registry.ts` 取原始数据、都走 `load.ts` 编译，只有失败策略不同——运行时单模块失败只跳过 + `console.error`，避免整站翻译失效；门禁严格报错并一次列全。**门禁不得 import `index.ts`**，否则坏数据被静默跳过后门禁反而变绿；
- **图标**：`public/icons/` 下的 16/32/48/128 PNG 是**直接提交在仓库里的静态资产**，改图标就替换这四个文件（四个尺寸都要换），没有生成脚本、也没有 `bun run icons`。历史原因：图标曾由 `assets/icon.svg` 经 `tooling/gen-icons.ts` 用系统浏览器无头 CDP 栅格化，新版无头浏览器的 `--screenshot` 不支持透明背景、必须走 `Emulation.setDefaultBackgroundColorOverride`；后来这条链路整体删除，SVG 源文件也不在仓库里了。

## 多语言词典形态

### 两条变更频率完全不同的数据

| | 键（英文原文）与路由 | 译文 |
| --- | --- | --- |
| 因何而变 | 上游改版（GitHub 渐进迁移 React，文案与节点结构都会变） | 译者修订 |
| 谁改 | 维护者，一次性横跨所有语言 | 各语言贡献者，互相独立 |
| 失效方式 | 静默：键失配只导致不翻，不报错 | 通常可见 |

因此数据按「语言无关」与「按语言」物理隔离：

- `core/**`：路由、规则 pattern、改名映射、规范键清单——**每个语言共享一份**；
- `locales/<语言>/**`：只有译文。不同语言的贡献者永远不会改到同一个文件，日语文件出错也不会影响中文构建（按目录分流审阅、可用 CODEOWNERS）。

### 稀疏覆盖

**缺键 = 尚未翻译，不是错误**：引擎未命中即保留英文，所以各语言的键集合不必相同，也不存在「键集合漂移」问题。同理，某语言没翻译的规则不必出现在它的 `rules.jsonc` 里（缺 id 即整条规则不生效，绝不用空串替换）。

覆盖率由 `bun run check:dict` 报告（分母是 `core/canonical.jsonc`）：

```
词典门禁通过：16 模块 / 1618 规范键 / 207 条共享规则 / 1668 条译文
覆盖率：zh-CN 1618/1618（100.0%，全部已译） | ja 50/1618（3.1%，15 个模块待译）
```

### 规则为什么按 id 拆

`pattern` 与语言无关、只有替换模板与语言有关，而**规则顺序是语义**（首条命中生效）。若把规则整体按语言拆成 N 份，就得保证 N 份顺序永远一致。故：

- `core/rules.jsonc` 定 `id` + `pattern` 与顺序（模块分组顺序必须与 `core/modules.jsonc` 一致，门禁强制）；
- `locales/<语言>/rules.jsonc` 只放 `id → 模板`，顺序无关。

于是「上游改一次文案」的代价是 O(1)：改 `pattern` 不必动任何语言的模板。**代价**：改 `id` 必须同步所有语言的模板（门禁会报「未知规则 id」）。

模板用 `$1` 或 `$<name>` 引用捕获组，门禁对着 `pattern` 校验引用完整性（组数够不够、命名组有没有声明）。**≥2 组必须命名、单组保持 `$1`** 的约定见「加一条动态规则」。

### 规范键是稳定的身份

`core/canonical.jsonc` 里的键就是**译文的身份**：登记时它等于 GitHub 当时渲染的英文原文；之后即使上游改了措辞，也优先保持这个身份不变，让已有译文继续有效。**改名意味着所有语言的词条都要跟着改**，只在语义真的变了时才做。

### aliases：上游改词时的 O(1) 通道

上游把 `Sign in with GitHub` 改成 `Sign in to GitHub` 这类**纯改词**，只需在 `core/aliases.jsonc` 加一行：

```jsonc
// 上游改成 "Sign in to GitHub"，语义未变，沿用旧译文
"Sign in to GitHub": "Sign in with GitHub",
```

键是**当前 DOM 文本**，值是**已存译文的规范键**。引擎先按 DOM 文本直查当前语言词典，未命中才查别名，所以这条映射加完，所有语言的译文都不用动（O(1)）。JSONC 注释就是这条断言的理由，请写上判断依据（何时改的、为什么认定语义未变）。

两个边界：

- **拆节点不能靠别名**。上游把 `Collaborators 3` 拆成 `<span>Collaborators</span><span>3</span>` 时，整句译文无法复用，必须新增 `Collaborators` 碎片词条（配合计数规则），旧整句键从 canonical 删掉；
- **语义变更不能靠别名**。`Watch` → `Subscribe` 若错加别名，会静默沿用错误译文——这正是别名必须人工评审的原因。

别名源文本也参与「译文不得等于任何键」的门禁：它是引擎的另一种输入，译文等于它同样会被二次翻译。

### 门禁能拦住什么

`tooling/checks/dict.ts`（`bun run check:dict`）：

- 结构：字段白名单、`route` 以 `^/` 锚定、正则可编译、规则无 `flags`、`global` 必须最后、规则分组顺序与模块顺序一致；
- 交叉引用：词条的键必须在 `core/canonical.jsonc` 里（**拼错即报**，旧结构下拼错只会静默不翻）、规范清单与模块清单同名同序、规则模板的 id 必须存在、模板引用的捕获组必须存在、别名目标必须是规范键；
- 译文形态：必须含该语言的文字系统（声明在 `src/dict/locales.ts`），**不得等于任何键**（含别名源文本）——这是与语言无关的防循环结构门禁，也是拉丁语系目标唯一的依靠；
- 防循环：规则的替换产物不得再命中任何规则（实测现有数据命中数为 0）；
- 覆盖率报告。

`tooling/checks/view.ts`（`bun run check:view`）：

- 校验对象是**合并视图的语义骨架**，golden 快照在 `tooling/fixtures/view-skeleton.<语言>.json`；
- 锁住四件事：模块顺序（`core/modules.jsonc` 的顺序即优先级）与 `global` 兜底必须在最后、每条探针路径命中的模块名序列、**赢家覆盖**（同一键被 ≥2 个命中模块提供时最终胜出来源——这是「有意同键异译」的回归保护）、每条路径生效的规则 **id** 序列；
- 另记 `notTranslated`：该路径 `core` 声明了、本语言还没给模板的规则 id。「往 `core/rules.jsonc` 加一条规则、忘了给模板」在视图里完全不可见（缺模板 = 规则不生效），只有它能把这种回归暴露出来；
- **记 id 不记 pattern 源串**：只改 pattern（例如给已有规则加命名组）不会动快照，与「上游改文案」解耦；
- 快照按语言逐份：同键异译是分语言的事实（某语言少译了被压过的那个键，跨模块同键就不成立）；
- 失败时只报首处差异 + 差异条数（一条路径的规则序列可达上百项，整表打印会淹掉真正的信息）；
- 改动确实有意时用 `bun run check:view --update` 重生成快照，并在提交信息里说明原因；
- 与词典门禁一样走 `registry.ts` + `load.ts` 的严格路径，**不 import 软失败的 `src/dict/index.ts`**。

## 词典维护指南

### 归档规则（硬性约束）

见 `AGENTS.md` 硬性约束 2；此处补细节：

- **键**必须是 GitHub 实际渲染的英文原文精确串（整节点精确匹配语义），大小写一致、不含目标语言文字系统。一律加双引号——裸键虽然 JSONC 合法，但统一加引号便于 Biome 查重与脚本改写；
- **值**必须含目标语言的文字系统（如简体中文的汉字、日语的汉字 / 平假名 / 片假名），门禁按 `src/dict/locales.ts` 的声明校验；
- `route` 与 `pattern` 都是**字符串形态的正则源**，因此 `/` 无需转义：`"route": "^/owner/repo/issues"`。`route` 必须以 `^/` 锚定 pathname；
- 顶层字段是白名单：`modules` / `rules` / `aliases` / `entries` / `replacements`（哪个文件用哪个见 `types/dict.schema.json`）。多写一个字段（例如把 `entries` 拼成 `entires`）会被 `load.ts` 拒绝——否则整块词典会静默变成空对象；
- **JSONC 里正则的反斜杠必须双写**：TS 字面量 `/^(\d+) minutes? ago$/` 在 JSONC 里写作 `"^(\\d+) minutes? ago$"`。写漏一层 Bun 会直接报 `Syntax Error`（响亮失败，不会静默变成别的正则）。

### 加一条静态词条

1. 在 GitHub 实机用 DevTools 确认渲染的精确原文（看文本节点，而不是 DOM 里的源码——见下方「采集实机渲染文本」）；
2. 决定归属模块：全站通用进 `global`，仅特定页面出现的进对应 `pages/<页名>`（模块路由见 `core/modules.jsonc`）；需要新模块时同时改 `core/modules.jsonc` 与 `core/canonical.jsonc`（同名同序，门禁强制）；
3. 在 `core/canonical.jsonc` 对应模块的 `keys` 里登记该键；
4. 在**每种已支持语言**的 `locales/<语言>/<模块>.jsonc` 里加键值对（没翻译的语言可以先不加，覆盖率会显示缺口）；
5. 若该页已有 `src/content/__tests__/<页名>.test.ts` 的实机节点回归，把新节点（以及拼接结果）补进去——没有就在同一 PR 里建一份：**页面上的节点边界只有测试能长期锁住**；
6. `bun run check` → `bun run build` → 浏览器重载扩展验证。

### 采集实机渲染文本（每个页面会话的固定起手式）

引擎按**单个文本节点**精确匹配，而 GitHub 的长说明句普遍被拆成多个节点（链接拆开、`<kbd>` 夹在中间、无障碍文本放进 `<span class="sr-only">`），因此「整句键」在实机上永远不会命中——**任何页面开工前都应先把真实节点文本抓下来**，不要照着视觉上看到的一整句登记键。做法（在目标页面打开 DevTools → Console）：

```js
// 按关键字找出承载它的文本节点，逐条打印「节点原文 + 父元素」
const probes = ["modifier keys", "formatted on paste"];
for (const p of probes) {
  const it = document.evaluate(`//text()[contains(., "${p}")]`, document, null,
    XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
  for (let i = 0; i < it.snapshotLength; i++) {
    const n = it.snapshotItem(i);
    console.log(JSON.stringify(n.nodeValue), "|", n.parentElement?.tagName, n.parentElement?.className);
  }
}
```

再配合 Elements 面板右键节点 → Copy → Copy outerHTML，就能看到完整的拆分明细。四类必须记住的边界事实：

1. **`<kbd>` / `<code>` / `<pre>` / `<textarea>` / `.markdown-body` 等容器被整棵排除**（`src/content/filters.ts`），其中的文本节点绝不翻译；`kbd` 之间的连词（如 `and`）若单独成节点，**不要收录**——它与别的模块同键时会互相顶替（本模块在前会压过对方），正确做法是把连词并进相邻片段；
2. **`sr-only` 文本照常翻译**（它不在排除清单里），所以像 `alt upAlt↑` 这种「无障碍文本 + `<kbd>` 序列」在实机里是三段以上，键要按段收；翻译时按视觉意图处理即可（例如 `按 Alt ↑`）；
3. **纯符号 / 纯数字节点翻不了**：可翻译判定要求「含至少一个拉丁字母」（`isTranslatableText`），所以单独的 `.`、`↑`、`1.2` 永远保持原样——**不要为它们收词条**（收了也不会生效，只会变成 canonical 里的死键）；
4. **查询键会 trim + 折叠空白**（`walker.ts` 的 `normalizeKey`），故键里不要写源码缩进；但**不换行空格 `\u00a0` 会被 trim 掉**，按实际文本收键时按「无前导空格」的形态写（本次实测：`"\u00a0to paste a link…"` 收不中，`"to paste a link…"` 才中）。

### 加一条动态规则

1. 在 `core/rules.jsonc` 对应模块分组的 `rules` 里追加 `{ "id": "...", "pattern": "..." }`——**位置决定优先级**：带修饰语的规则排在泛化规则之前（首例：`^([\\d,]+)\\+ workflow runs?$` 必须排在其泛化形式之前）；
2. id 全局唯一、形如 `<模块短名>/<语义>`（如 `global/minutes-ago`）；
3. **捕获组命名约定**（`$1` 只有位置信息，译另一门语言的人必须回头读 pattern 才知道谁是谁）：

   - **≥2 个捕获组必须用命名组**，模板里一律写 `$<name>`：

     ```jsonc
     { "id": "global/long-date-january", "pattern": "^January (?<day>\\d{1,2}), (?<year>\\d{4})$" }
     ```

     对应模板 `"$<year> 年 1 月 $<day> 日"`（原生 `$<name>`，**不要自造 `{name}` 模板语法**）。

   - **单组规则保持 `$1`，不命名**：`$1` 没有歧义，命名只增加无意义的改动与噪音。

   - 组名按语义取，同一 pattern 内必须唯一，且只允许 `[A-Za-z_$][A-Za-z0-9_$]*`（JS 规范）。现有词表：

     | 语义 | 组名 |
     | --- | --- |
     | 日期 | `day` / `year` / `time` |
     | 日期区间（同月） | `startDay` / `startYear` / `endDay` / `endYear` |
     | 计数 | `count`（总量用 `total`；改动行数用 `additions` / `deletions`） |
     | 计数 + 单复数后缀 | `count` / `plural`（`(?<plural>y\|ies)` 只为折叠单复数，模板通常不引用） |
     | 时长 | `hours` / `minutes` / `seconds` |
     | 仓库 / 用户 | `repo` / `owner` / `actor`；标题用 `title`、编号用 `number` |
     | 图表 a11y | `navigator` / `series` / `seriesCount` / `points` / `yAxis` / `xAxis` / `axisCount` / `from` / `to` |

4. 在每种语言的 `locales/<语言>/rules.jsonc` 里加 `id → 模板`；模板必须含该语言的文字系统；
5. 门禁会校验引用完整性（`$2` 超出组数、`$<month>` 未声明都会报错），`bun run check:dict` 通过后实机验证。
6. **只改 pattern 不必动任何语言的模板**（O(1)）；反过来说，**改 id 必须同步所有语言的 `rules.jsonc`**。
   另外：视图骨架门禁记的是规则 **id**、不记 pattern 源串，所以给已有规则加命名组不会动快照。

### 上游改版时怎么办

| 情形 | 例子 | 做法 |
| --- | --- | --- |
| 文案改词，语义不变 | `Sign in with GitHub` → `Sign in to GitHub` | `core/aliases.jsonc` 加一行映射，译文不动（O(1)） |
| 节点被拆开 / 拼接 | `Collaborators 3` 拆成两个 span | 新增碎片词条（如 `Collaborators`），必要时配计数规则；旧整句键从 canonical 删掉 |
| 语义真的变了 | `Watch` → `Subscribe` | **不要加别名**：改 canonical 的安全做法是新增键、删旧键，然后各语言重译 |
| 页面结构变了导致漏翻 / 误伤 | React 重写 | 先修 `src/content/filters.ts` 的排除选择器，再考虑词条 |

「旧键不再渲染」不会报错（引擎只是再也命中不到它），所以定期用 popup 的开发者模式采集漏翻、并清理 canonical 里的死键是维护常态。**上游把整句拆成多节点时，整句键会静默失效**（节点拼接前的文本永远不出现）：这时要按实机节点逐片收录碎片键，并把旧整句键从 canonical 删掉——留着不会报错，但会和碎片键互相顶替（同一节点命中错的那条）。

### 新增一种语言

1. `src/dict/locales.ts`：加一条 `LocaleMeta`（id 用 BCP 47 规范写法、显示名用该语言自身书写、声明文字系统；拉丁语系目标传空数组 `scripts: []`——它与源语言同字系，脚本守卫结构上失效，防循环只剩「译文不得等于任何键」）；
2. `src/dict/registry.ts`：加一段 `LocaleRaw`（`modules` 里只列已开始翻译的模块，`rules` 指向该语言的 `rules.jsonc`，一个都没译可传 `null`）；
3. `src/dict/locales/<id>/`：建 `global.jsonc`（可先只放几条样例）与可选的 `rules.jsonc`；
4. 若该语言的浏览器界面语言也需要扩展自身 UI 文案，在 `public/_locales/<Chrome 语言标识>/messages.json` 补一份（键集合必须与默认语言完全一致，门禁强制）；
5. `bun run check`：覆盖率报告会列出待译模块。

### 批量补词条

从开发者模式导出的 JSON 往往一次带来几百条待补词条。路径是纯数据追加：先按模块把键登记进 `core/canonical.jsonc`，再往 `locales/<语言>/` 的对应文件追加键值对。不必担心「重复键被静默覆盖」——单文件重复键由 Biome 报错，跨模块同键异译由模块顺序决定（见 `registry.ts` 注释）。

## 手工加载与调试

1. `bun run watch`：改动 src / public 自动重建 `dist/`；
2. `chrome://extensions`（Edge 为 `edge://extensions`）→ 开发者模式 → 「加载已解压的扩展程序」→ 选择 `dist/`；
3. 改动源码后：重建 + 在扩展卡片点「重新加载」+ 刷新 GitHub 页签；
4. **漏翻排查**：DevTools 看文本节点原文 → 该键是否在 `core/canonical.jsonc` 里 → 当前语言的 `locales/<语言>/<模块>.jsonc` 是否收录 → 模块归属是否正确 → 是否被排除容器挡住；
5. **误伤排查**：定位承载元素 → 把容器选择器加进 `filters.ts` 排除清单 → 再考虑词典侧回避；
6. **切语言调试**：popup 改「翻译语言」会整页刷新；想验证某语言的真实覆盖率，可先切到它再逛页面，用开发者模式看漏翻量。

## 开发者模式（漏翻收集）

popup 底部的「开发者模式」开关**默认关闭**，用于系统性发现漏翻：开启后，content script 在翻译时把未命中词典与规则的文本记录下来（仅本地，无任何网络请求）。逛几页 GitHub 攒一批后，在 popup 一键复制为 JSON，粘贴给 AI 会话批量补词条。

### 用法

1. popup 开启「开发者模式」——已打开的 GitHub 页签自动刷新，之后开始收集（翻译开关关闭时不翻译，自然也不收集）；
2. 正常浏览仓库 / 议题 / PR 等页面，引擎每 5 秒（以及页面隐藏 / 卸载时）把缓冲合并写入本机 `chrome.storage.local`；
3. 回到 popup 查看「已收集 N 条」，点「复制」得到 JSON，粘贴给 AI 会话或按下方归档规则手工补词条；
4. 点「清空」重新攒一批；
5. 需要覆盖更多页面时，重复上面 1–4 步（`bun run verify` 的自动化探针已在 `48bf519` 删除，尚未重建）。

### 收集范围与导出格式

- 文本节点：未命中静态词条与正则规则的可见 UI 文本（trim 后原文）；
- 属性：`title` / `aria-label` / `placeholder` / `alt` 未命中词条的原值；
- 记录的 `text` 就是「GitHub 渲染的精确英文原文」，可直接作为 canonical 候选键（`kind: "text"` 为文本节点，其余 kind 为属性名）；
- 缓冲上限 300 条、落盘上限 500 条（满了保留先收集的），同键累加出现次数、`path` 取首次出现页面的 pathname。

导出 JSON 结构（排序：path 升序 → count 降序 → text 升序）：

> `schema` 字段里的 `github-zh-misses/1` 是**故意保留的旧名**：它是用户粘贴回来的 JSON 里的字段值，
> 改名会让已经导出的旧数据无法被识别。仓库改名不影响它。

```json
{
  "schema": "github-zh-misses/1",
  "exportedAt": "2026-09-25T12:00:00.000Z",
  "items": [
    { "text": "Some English Text", "kind": "text", "path": "/owner/repo/pulls", "count": 3 }
  ]
}
```

## 隐私

- 漏翻收集**默认关闭**，开启前零收集；全程无任何网络请求；
- 收集内容仅存本机 `chrome.storage.local`，不自动上传、不同步、不导出下载；
- 导出内容可能含页面文本（文件名、仓库名等），复制后请自查再粘贴。

## 包体与分发

- content script 必须内联全部词典（现在是同步注入、天然无闪烁），实测数据占产物大头：迁移到 core/locales 形态后数据紧凑 JSON 约 **144 KB**（content.js 约 **195 KB**，`minify: false`）。相比单语言形态增加约 13 KB，来自共享结构（207 条规则 id + 模块名）与 ja 样例；
- 因此 N 种语言**全量打包**在 N=2 时仍是最优解（无闪烁、零风险）；待到 N≥4 再考虑按 locale 分发（`chrome.scripting.registerContentScripts` 按语言注册是唯一能保持同步注入、无闪烁的方案，代价是引入 background service worker 与 `scripting` 权限）；
- 发布一律用 `bun run pack` 产出的 zip：仓库根目录下的 `github-i18n-v<版本>.zip`（store 模式、零依赖打包）。

## 已知边界

- Shadow DOM 内文本不翻译；
- **拉丁语系目标语言**（西 / 法 / 德等）的「已翻译」判定在结构上不可靠（与源语言同字系），只能靠「译文不得等于任何键」的结构门禁防循环，且「译文必须含目标文字系统」这条校验对它无意义（`scripts: []`）；
- **复数的语法分歧**（俄语 3 种、阿拉伯语 6 种）无法表达：一个 `pattern` 只能配一个模板，没有复数类别；
- GitHub 正渐进迁移 React 重写页面，类名 / 结构变动导致的漏翻 / 误伤属常态：先修排除选择器，再修词条；
- `<relative-time>` 等自定义元素会自行重渲染英文，观察器会再翻一遍收敛，勿追求一次性翻译；
- 上游删除的文案会在 `core/canonical.jsonc` 里留下死键（不报错）：靠 popup 的开发者模式定期采集漏翻、或按页面逐个核对时顺手清理。
