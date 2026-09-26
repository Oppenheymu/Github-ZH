# 交接提示词：为 Github-ZH 引入多语言（i18n）

> ⚠️ **本文写于改名之前**：仓库现名 **Github-i18n**（旧名 Github-ZH，
> 本地目录 `C:\Dev\Tool-Dev\Github-i18n`，远端 `https://github.com/Oppenheymu/Github-i18n.git`）。
> 下文出现的 `Github-ZH` 路径与地址都是当时的事实，保留不改以存历史。

> 本文件是**可直接整段粘贴到新会话的提示词**，也是本项目的设计决策记录。
> 写它的原因是上一会话上下文耗尽。新会话请先全文读完，再动手。
>
> 本文所述任务**已全部完成**（见文末「实施记录」）；后续的 C / D / F 三项见
> `docs/design/i18n-next-handoff.md`。

---

你正在接手仓库 `C:\Dev\Tool-Dev\Github-ZH`（远端 `https://github.com/Oppenheymu/Github-ZH.git`，主分支 `main`）。
> 若你被带进上面这个路径：那是**改名前的旧路径**，现在仓库在 `C:\Dev\Tool-Dev\Github-i18n`。
请先读 `AGENTS.md`（项目常驻指令，含硬性约束）与 `docs/guides/development.md`，再读 `docs/design/multilingual-dict-shape.md`（多语言数据形态的设计请求）。

## 项目是什么

浏览器扩展（Chrome / Edge，MV3，MIT，显示名「GitHub 汉化」），把 GitHub 界面译为简体中文。**纯本地静态替换，无任何网络请求**：

- **键** = GitHub 实际渲染的**英文原文文本节点**（整节点精确匹配，如 `Pull requests`、`Collaborators 3`）
- **值** = 译文；命中的节点就地替换
- 另有正则规则处理动态文本（相对时间、计数），`pattern` 对整段已 trim 文本 test，**首条命中生效（顺序即语义）**
- 键不是手写 i18n key，而是用「开发者模式」在真机**采集**漏翻文本得到的——**英文原文本身就是天然身份**

## 本轮目标

为 i18n 铺路，**不只是中文**。已确认的决策：

- **范围**：只搭架构 + 双语言最小集（zh-CN + ja）跑通，**存量 1618 条中文不批量重译**
- **语言集**：zh-CN + ja
- **品牌**：中性化改名（如「GitHub 界面本地化」）+ `_locales` + `__MSG_*__`

## 现状（上一会话刚完成的 JSONC 迁移）

提交 `dd17e7c`（迁移）、`00d66da`（设计请求），`main` 领先 `origin/main` 若干提交（未推送）。

```
src/dict/
├── data/
│   ├── global.jsonc            314 词条 / 73 规则
│   └── pages/*.jsonc           15 模块 / 1304 词条 / 134 规则
├── dict.schema.json            编辑器侧 JSON Schema（数据文件顶部 $schema 指向它）
├── registry.ts                 数据注册表：名字 → JSONC 原始数据，顺序即优先级
├── load.ts                     JSONC → 词典类型（严格编译正则 + 字段白名单）
├── index.ts                    运行时汇总：单模块失败只跳过 + console.error
└── jsonc.d.ts                  `.jsonc` ambient 声明（tsc 不认该扩展名）
```

关键命令：`bun run check`（lint + typecheck + check:dict + check:manifest + test）、`bun run build`、`bun run verify`（实机漏翻探针）、`bun run pack`。

## 必须先知道的坑（都踩过，别重踩）

1. **门禁不得 `import` `src/dict/index.ts`**。`index.ts` 是软失败（单模块失败只跳过），门禁若依赖它，坏数据被静默跳过后**门禁反而变绿**。门禁走 `registry.ts` + `load.ts` 严格路径。
2. **`hasCJK` 现在承担双重职责且对非中文语言是坏的**：它既是「已翻译」判定（防翻译循环），又是门禁约束（译文必须含汉字）。纯假名的日语译文（「もっと見る」）会被门禁**直接拒绝**；韩语 / 泰语 / 阿拉伯语全被拒；拉丁语系目标守卫**结构上不可能生效**。
3. **`isTranslatableText` 还要求文本含拉丁字母**，所以纯假名/纯符号文本本就不会被处理——这点影响漏翻采集范围。
4. **防翻译循环的真实条件是两条同时成立**：(a) 脚本守卫没拦住译文，(b) **译文本身又是一个键、或能命中某条规则**。实测今天 (b) 的命中数为 **0**，所以中文安全是靠 (a) 挡住的。
5. **不要采用「WeakSet 追踪已翻译节点」来防循环**——会让被外部重置回英文的节点**永久卡在英文**，直接废掉「`<relative-time>` 自行重渲染英文、靠观察器再翻一遍收敛」这条现有行为（见 AGENTS.md 已知坑）。而且我们改的是 `nodeValue`，节点对象复用。若要做兜底，用「单节点在无用户交互窗口内的翻译次数上限」这类限流断路器。
6. **`verify-live.ts` 用 `chrome.runtime.getManifest().name` 识别扩展上下文**。一旦 `manifest.json` 的 `name` 改成 `__MSG_appName__`，该值会**随浏览器语言变化**，探针会「找不到扩展」——改品牌时必须同步修。
7. **`verify-live.ts` 的「翻译是否生效」判据硬编码中文**：`probe.translated = zhSignUp + zhSignIn > 0`，另有 CJK 计数启发式。必须按 locale 参数化。
8. **`manifest.json` 手写在 `public/`**，改 `matches` / 权限 / 产物文件名要同步 `tooling/checks/manifest.ts` 的断言。当前 manifest **没有 `background`、没有 `scripting` 权限**。
9. **`RegExp#source` 会把 `/` 转义回 `\/`**：断言路由/规则要断言**行为**，别断言 `source`。
10. **JSONC 里正则反斜杠必须双写**（`\d` 写作 `\\d`）；写漏一层 Bun 直接报 `Syntax Error`（响亮失败，不会静默变义）。
11. **`tsc` 不认 `.jsonc`**（开 `resolveJsonModule` 也报 TS2307），靠 `src/dict/jsonc.d.ts` + `tooling/tsconfig.json` 的 `../src/**/*.d.ts`。
12. **`.jsonc` 的重复键由 Biome 的 `noDuplicateObjectKeys` 覆盖**（加引号/裸键、值同行/折行四种形态都报），不需要自维护扫描。
13. **5 处跨模块同键异译是有意设计**（如 `Pages` 在设置页是「页面」、在 global 是「页码」），靠注册表顺序生效，见 `registry.ts` 注释，**勿当重复键清理**。
14. `discussions` 模块是空模块（0 条 0 规则）；`insights` 有 1 条键**含换行符**（旧 TS 里就是显式 `\n`，有意为之）。
15. **许可证红线（硬性约束 1）**：严禁引入任何 GPL / AGPL 系汉化项目的词典或代码，**点名包括 `maboloshi/github-chinese`**。读架构思路可以，取用代码/词典绝对不行。若参考了某个项目，在提交信息里注明「未复制代码」。

## 数据形态：已定的方向

`docs/design/multilingual-dict-shape.md` 里列了 4 种候选。外部评审的结论与我的核实如下，**采纳以下形态**（如无新证据即按此实施）：

```
src/dict/
├── core/
│   ├── canonical.jsonc     维护者专管：当前 GitHub 真实有效英文键清单（覆盖率的分子/分母来源）
│   ├── aliases.jsonc       维护者专管：当前 DOM 文本 → 已存译文的规范键（实现 O(1) 改动）
│   └── rules.jsonc         共享规则：pattern 与捕获组定义，顺序即语义
└── locales/
    ├── zh-CN/
    │   ├── pages/issues.jsonc   只记已翻译的键值对（稀疏覆盖，缺键=未翻译≠错误）
    │   └── rules.jsonc          pattern 对应的替换模板
    └── ja/
        └── ...
```

要点：

- **稀疏覆盖**：引擎未命中即保留英文，所以各 locale 文件是纯增量，**键集合不需要跨 locale 相同**（「键漂移」不是问题）。
- **物理隔离**：规范键只有维护者动，贡献者只碰 `locales/<locale>/**`，可直接用 GitHub CODEOWNERS 按目录分流审阅，且某语言文件出错不会级联影响其它语言构建。这是**否掉「同文件嵌套」的关键理由**（同键嵌套会让不同语言贡献者改同一行，冲突常态化）。
- **引擎流程**：`DOM 文本 → 查 aliases 得规范键 → 查当前 locale 词典`。建议**先直查、未命中再查 aliases**（热路径只多一次 Map 查找）。
- **别名只适合「改词」，不适合「拆节点」**：`Sign in with GitHub` → `Sign in to GitHub` 可用别名复用译文；但 `Collaborators 3` 拆成碎片 `Collaborators` **不能**复用整句译文，必须新增碎片词条（现有做法见提交 `c502dcd`，配合计数规则）。
- **别名的风险**：它是维护者手工写的「这是同一个概念」断言。若上游是语义变更（`Watch` → `Subscribe`），错误加别名会**静默沿用错误译文**。建议别名条目带 `note` 字段，并在评审时重点看。
- **规则不要按 locale 拆 pattern**：`pattern` 与语言无关、只有 `replacement` 有关，而顺序是语义。规则统一在 `core/rules.jsonc` 定顺序，各 locale 只提供 `id → 模板`。

### 规则的命名捕获组（评审的真收获，建议采纳）

实测 **73/207 条规则有 ≥2 个捕获组**，且中文已经在重排位置引用：
`^Jan (\d{1,2}), (\d{4})$` → `"$2 年 1 月 $1 日"`。日语译者拿到这个模板必须知道哪个组是哪个。
改用命名组 `(?<day>\d{1,2})` + 原生 `$<day>`（**不要自造 `{name}` 模板语法**，JS 原生的就够了）。
迁移后门禁可新增一条机械检查：**替换模板里引用的每个组名都必须存在于对应 pattern**。

### 与形态耦合的两处门禁（建议一起做）

1. **防循环结构门禁：任何 locale 的译文不得等于任何键。** 实测现有数据误报 **0 条**、译文能再命中规则的也是 **0 条**，所以今天加上去零成本。将来若某语言需要原样保留英文术语（如日语保留 Markdown / GitHub Actions），加显式允许清单，**不要因此放弃这条检查**。
2. **每 locale 覆盖率报告**：`canonical` 键集合与各 locale 的差集，列出待译清单。

## 明确不做 / 待定

- **不批量重译存量 1618 条中文**（本轮范围只到架构 + 双语言最小集）。
- **包体策略待定**：实测词典数据紧凑 JSON **97978 字节 = content.js（168616 字节）的 58.1%**，引擎+打包壳占 42%（且 `minify: false`）。所以**数据是大头**，N 种语言全量打包的解析开销比评审估的更大（10 语言约 1MB 数据）。选项：
  - (a) 维持现状全量打包（N=2 时推荐，无闪烁、零风险）
  - (b) `document_start` 异步 `fetch(chrome.runtime.getURL(...))` 按需加载——**需实测**内容脚本是否需要 `web_accessible_resources`，且「无 FOUC」未经证实；现在是同步注入，天然无闪烁
  - (c) **`chrome.scripting.registerContentScripts` 按 locale 注册**（同步注入、无闪烁、只解析一份）——代价是引入 background service worker 与 `scripting` 权限，两者当前都没有；需同步改 `manifest.json` 与 `checks/manifest.ts`
  - 建议：N=2 用 (a)，把 (b)/(c) 留给 N≥4 时再定。
- **复数的语法分歧**（俄语 3 种、阿拉伯语 6 种）不作本轮目标，但要记入已知边界：现在一个 `pattern` 只配一个模板，无法表达复数类别。
- **未证断言，不要当依据**：设计请求评审里引用的 `maboloshi/github-chinese` 演化史、SteamDB / 游戏 Web UI 的「实践经验」、「语义未变占 80% 以上」都无出处，需要自己核实（核实其**架构思路**可以，**不得取用代码或词典**）。

## 形状无关、可立即开工的部分（建议先做这些）

这些不依赖最终形态定稿，不会白做：

1. **防翻译循环守卫泛化**（优先级最高，因为它现在对非中文语言是坏的）
   - 保留内容判定（它是「重渲染后仍能收敛」的原因），但把「含汉字」换成**语言无关**的判定（含非拉丁字母字符），并配 `locales.ts` 里声明的期望文字系统
   - 新增「译文不得等于任何键」结构门禁（见上）
2. **`src/dict/locales.ts` 语言元数据表**：id / 显示名 / 期望文字系统 / 是否拉丁语系
3. **locale 选择与存储**：`src/shared/storage.ts` 加 locale 键（现有 `enabled` / `devMode`）、popup 加语言选择器、默认值取 `chrome.i18n.getUILanguage()`
4. **品牌中性化**：`manifest.json` 的 `name`/`description`/`action.default_title` 走 `__MSG_*__` + `_locales/`（需 `default_locale`），popup 自身 UI 文案一并外置；**同步修 `verify-live.ts` 的扩展识别**（见坑 6）
5. **`verify-live.ts` 探针判据参数化**：把硬编码的 `zhSignUp`/`zhSignIn`/CJK 计数换成按 locale 配置的锚点（见坑 7）

## 参考数字（用于判断，别凭印象）

| 项 | 值 |
| --- | --- |
| 词条 / 规则 / 页面模块 | 1618 / 207 / 15（另有 1 个全站模块） |
| 词典数据（紧凑 JSON） | 97978 字节（占 content.js 的 58.1%） |
| content.js 产物 | 168616 字节（`minify: false`） |
| 多捕获组规则 | 73 / 207 |
| 「译文 == 某个键」现有条数 | 0 |
| 「译文能再命中规则」现有条数 | 0 |
| 注释行 | 245（旧的 244 行全部保留 + 1 行新增说明） |
| 迁移等价性验证 | 15 模块 × 27 路径 = 12847 词条项 / 2473 规则项，最终合并视图 SHA256 完全一致 |
| 实机探针基线 | 2 页 485 条漏翻（`bun run verify -- --pages .zcode/pages-smoke.txt`） |

`.zcode/` 是 gitignore 的草稿目录，内有可复用工具：
- `dump-view.ts` —— dump 任意仓库 revision 的「路由 → 合并词典视图」，用于**迁移前后 SHA256 等价性比对**（这是词条级 golden 回归的地基，将来可提升为正式门禁）
- `make-schema-fixtures.ts` + `schema-check/` —— JSON Schema 的正反例夹具（曾用 ajv 验出 18 正例全过 / 11 反例全拒）

## 建议的推进顺序

1. 读 `AGENTS.md`、`docs/guides/development.md`、`docs/design/multilingual-dict-shape.md`、本文件
2. 做上面「形状无关」的 5 项，每项跑 `bun run check`
3. 形态定稿后迁数据：`src/dict/data/**` → `src/dict/core/**` + `src/dict/locales/zh-CN/**`（稀疏化），ja 只放样例词条
4. 门禁新增：命名组引用完整性、每 locale 覆盖率、译文≠键（带允许清单）
5. 用 `.zcode/dump-view.ts` 的方式做迁移等价性验证，再更新文档（AGENTS.md 硬性约束 2、开发指南的目录结构与归档规则）
6. 提交按现有风格（`refactor(dict):` / `feat(i18n):` / `docs:`），中文提交信息 + 要点正文

## 工作方式要求

- 全程简体中文（回复、注释、提交信息、文档）
- 提交前 `bun run check` 必须全绿；`git add -A` 后提交到 `main`
- 不要为「可能将来有用」而增加抽象；先做能验证的最小改动
- 遇到与本文档记载不符的事实，**以实测为准并更新文档**——本文档里的数字都是实测的，我（上一会话）曾在注释行数与扫描覆盖率上算错过一次并已修正，请对任何数字保持怀疑

---

## 实施记录（本轮已做完）

上面「形状无关的 5 项」与数据形态迁移、门禁、等价性验证、文档更新都已落地，提交序列：

| 提交 | 内容 |
| --- | --- |
| `6226b21` | `src/dict/locales.ts` 语言元数据表；`hasCJK` → `hasNonLatinLetter`（语言无关）；译文按语言声明校验；新增「译文≠键」「替换产物不再命中规则」两条防循环门禁 |
| `bb2dbb1` | 品牌中性化（`__MSG_*__` + `public/_locales/{en,zh_CN,ja}`）；popup UI 文案外置；verify-live 改用身份标记认扩展（原坑 6）；`check:manifest` 增加 `_locales` 断言 |
| `954d5bb` | 数据迁到 `core/` + `locales/zh-CN/`（稀疏化）+ ja 样例；加载层 / 运行时按语言汇总；`locale` 存储与 popup 语言选择器；`verify --locale`（原坑 7） |
| （本轮收尾） | `AGENTS.md` 硬性约束 2 与已知坑、`docs/guides/development.md`、README、设计文档结论 |

核实与修正（与本文档记载不符者）：

- 词典数据紧凑 JSON 实测 **131218 字节**（口径：entries + rules），不是 97978；迁移后含规则 id / 模块名 / 别名表为 **144273 字节**，content.js 168616 → **194649 字节**；
- 迁移等价性：27 条路径的合并视图 SHA256 迁移前后**逐字节相同**（`7f6a2891c8673ab34cfbaaea6f376ee81cbe36eb5a08f2966373824e2349d8a5c`），比「词条级比对」更强；
- 实机基线：迁移前后均为 **482 条漏翻**（本文档记的 485 是更早的一次观测，GitHub 页面内容本身在变）；`--locale ja` 探针 `translated=true`，脚本字符数 26 / 84；
- 仓库已改名 `Github-i18n`（远端仍是 `Github-ZH.git`），`.zcode/` 草稿目录已归档删除。

尚未做（有意留待后续）：

- **把「合并视图等价性」补成正式门禁**：`.zcode/` 连同 `dump-view.ts`、迁移前后快照与页面清单一起被归档，于是「模块顺序 / 跨模块覆盖 / 规则顺序」目前只剩一次性记录，没有可复跑的保护。建议在 `tooling/` 下补一个正式检查（golden 快照 + 测试），纳入 `bun run check`——这是本轮最该补的欠账；
- **命名捕获组**：门禁已支持并校验 `$N` 与 `$<name>` 的引用完整性，但现有 207 条规则仍是位置引用。转换是纯数据改动，可用「去掉 `?<name>` 后 pattern 源串必须与旧串相同」+「合成捕获值渲染结果相同」做机械验证；
- 包体策略：N=2 维持全量打包；N≥4 时再评估 `registerContentScripts` 按 locale 注册（需 background + `scripting` 权限）；
- 复数语法分歧（俄语 / 阿拉伯语）：一个 pattern 一个模板，无法表达复数类别。

