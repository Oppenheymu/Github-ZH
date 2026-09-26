# 交接提示词：C（合并视图 golden 门禁）、D（命名捕获组）、F（命名一致性）

> ✅ **本轮已执行完毕**（2026 年，实施记录见文末第 6 节）。C / D / F 三项与顺带的图标
> 残留清理都已完成并提交；"任务 B" 的前提也已失效（见第 0 节）。
> 下文保留撰写时的原始提示词，**下面几处出题前提已被实测推翻，动手前先读第 6 节**：
> 交互式提示里的「121 用例 / 9 文件」「任务 B 由另一会话完成」「远端仍是旧名」。
>
> 本文件是**可直接整段粘贴到新会话的提示词**，也是本轮的设计记录。
> 上一份交接见 `docs/design/i18n-handoff.md`（i18n 架构落地，已完成并附实施记录）；
> 本文件只覆盖尚未做的三项：C / D / F。新会话请先全文读完，再动手。

---

## 0. 环境与前置（先确认，别凭印象）

- **仓库根目录是 `C:\Dev\Tool-Dev\Github-i18n`**。旧路径 `C:\Dev\Tool-Dev\Github-ZH` 已随改名消失；
  若你被带进旧路径，说明工作目录失效，请让用户在新目录重开会话，否则相对路径工具与 `cwd` 全不可用。
- 远端是 `https://github.com/Oppenheymu/Github-i18n.git`（**已随仓库改名更新**），主分支 `main`，
  本地领先 origin/main 若干提交（未推送）。
- 必读顺序：`AGENTS.md`（项目常驻指令与硬性约束）→ `docs/guides/development.md`（架构与词典维护）→
  `docs/design/multilingual-dict-shape.md` 第 8 节（形态定稿结论）→ `docs/design/i18n-handoff.md` 的「实施记录」。
- 开工体检：`bun run check` 应全绿（现在是 **129 用例 / 9 个文件**；本文件撰写时是 121 / 9）。
  若变红先修红再谈新功能。

### ⚠️ 关于「任务 B」：它已不是标签同步，别再找 `tooling/labels.ts`

撰写时的前提已失效：`6e887cd feat(triage): 复刻 Koishi-CE 的 PR 路径打标与 issue 分诊流水线`
**整个替换掉了**标签同步方案——删除了 `tooling/labels.ts`、`tooling/labels.test.ts`、
`.github/labels.yml`、`.github/workflows/labels.yml`，改成 `.github/labeler.yml` +
`.github/workflows/triage.yml`。所以：

- 仓库里**没有** `tooling/labels.ts`，也没有 `labels.test.ts`；本文件下文提到的它们都已不存在；
- 标签 / 分诊流水线**已完成、不在任何本轮范围**：不要改、不要重构、不要提交与之相关的任何东西；
- `.github/labels.yml` 也已随同删除（若你看到「标签词表」之类的说法，那是更早的历史）。

### ⚠️ 这个仓库有并发会话在动，提交必须用显式路径

上一轮我因为 `git add -A` 误提交了别人正在写的文件，只能 amend 摘出来。
一律用 `git add <明确路径>`；`git status` 里出现的意外文件（尤其未跟踪文件）先查清是谁的，再决定动不动。

### `.zcode/` 已归档删除

`.zcode/` 是 gitignore 的草稿目录，现已被用户归档删除，里面的东西**都没了**：
迁移生成器 `migrate-shape.ts`、等价性工具 `dump-view.ts`、迁移前后快照 `view-before/after.json`、
探针页面清单 `pages-smoke.txt`、几个一次性诊断脚本。生产代码 / 数据 / 门禁 / 文档都在 git 里，无功能损失。
**唯一实质损失就是任务 C 要补的东西**：合并视图的逐字节等价验证没有了可复跑手段，只剩提交信息里的 SHA 记录
——这一项已由任务 C 的骨架门禁补上。

## 1. 现状事实（自足，不必翻历史）

形态：语言无关的数据在 `src/dict/core/`，译文在 `src/dict/locales/<语言 id>/`，稀疏覆盖（缺键 = 未翻译）。

```
src/dict/
├── core/modules.jsonc     模块名 + route，顺序即优先级（global 兜底必须最后，route ^/）
├── core/rules.jsonc       共享规则 { id, pattern }，按模块分组，顺序即语义（207 条）
├── core/aliases.jsonc     上游改名映射（当前为空表）
├── core/canonical.jsonc   规范键清单（1618 键，**仅门禁使用，不进 content 包**）
├── locales.ts             LocaleMeta：id / 显示名 / 文字系统声明（zh-CN 与 ja）
├── registry.ts            core + 各语言原始数据 → 运行时
├── load.ts                JSONC → 类型（严格编译 + 字段白名单 + 交叉引用）
├── index.ts               运行时汇总（软失败：单模块失败只跳过 + 打日志）
└── locales/{zh-CN,ja}/    global.jsonc + pages/<页名>.jsonc + rules.jsonc
```

- 语言相关判定一律取自 `locales.ts`：`scripts: ["Han"]`（zh-CN）/ `["Han","Hiragana","Katakana"]`（ja）；
  `scripts: []` 表示拉丁语系目标（脚本守卫结构上失效，防循环只剩「译文≠键」结构门禁）。
- 运行时：`src/content/view.ts` 的 `buildView(pathname, dict, aliases)` 合并命中模块（词条先到先得、规则同序），
  `src/content/pages.ts` 的 `viewForPath(pathname, locale)` 单槽缓存；`src/content/walker.ts` 的 `translateText` 先直查词条、
  未命中再查 `aliases` 换规范键重查，最后按序试规则。
- 门禁：`tooling/checks/dict.ts`（`check:dict`）、`tooling/checks/manifest.ts`（`check:manifest`）、
  `tooling/checks/view.ts`（`check:view`，任务 C 新增）；实机探针 `tooling/verify-live.ts`
  （`bun run verify`，支持 `--locale <id>`，浏览器可用 `GITHUB_I18N_BROWSER_PATH` 指定）。
- 实测数字（供判断，别当教条）：1618 规范键 / 207 共享规则（其中 ≥2 组 72 条）/ 16 模块；
  zh-CN 覆盖率 100%、ja 50/1618（3.1%）；content.js 194649 字节（`minify: false`），数据紧凑 JSON 144273 字节。

### 与本轮相关的已知坑

1. **门禁不得 import `src/dict/index.ts`**：它是软失败（单模块失败只跳过），门禁若依赖它，坏数据被静默跳过后
   门禁反而变绿。门禁必须走 `registry.ts` + `load.ts` 的严格路径。**任务 C 会撞上这条**（见 2.2）。
2. **`core/canonical.jsonc` 不进 content 包**：只被 `tooling/checks/dict.ts` import。别让 `src/**` 引它。
3. **规则模板按 id 对齐 pattern**：改 pattern 是 O(1)，**改 id 必须同步所有语言的 `rules.jsonc`**。
4. **JSONC 里正则反斜杠要双写**（`\d` → `\\d`）；规则不得带 `flags` 字段。
5. **`RegExp#source` 会把 `/` 转义回 `\/`**：断言路由 / 规则要断言**行为**，别断言 `source`；比较源串时也要先归一。
6. **tsc 不认 `.jsonc`**：靠 `src/dict/jsonc.d.ts` + `tooling/tsconfig.json` 的 `../src/**/*.d.ts`。
7. **格式与 lint 都归 Biome**（`bun run format` / `bunx biome check --write .`）；`.jsonc` 里的重复键由
   Biome 的 `noDuplicateObjectKeys` 负责。
8. 文件末尾必须有换行（少一个就让 `bun run check` 变红——上一轮真发生过）。

### 工作方式要求（沿用仓库约定）

全程简体中文（回复 / 注释 / 提交信息 / 文档）；每完成一项就跑 `bun run check` 并提交到 `main`；
提交信息格式参考历史（`feat:` / `fix:` / `refactor:` / `docs:` + 要点正文）；不做「可能将来有用」的抽象；
遇到与本文件或其它文档不符的事实，**以实测为准并更新文档**；任何数字先量再说。

---

## 2. 任务 C：把「合并视图」补成正式门禁（优先级最高）

> ✅ **已完成**（提交 `ae63d1e`）。实现与验收细节见第 6 节；下文保留原始设计。

### 2.1 为什么要做

架构的正确性有一半靠「合并视图」的语义：模块顺序（具体页压过泛化页）、跨模块同键异译的先后、
规则顺序（首条命中生效）、global 兜底必须在最后。这些语义**没有测试保护**——只有一次性验证
（迁移前后 27 条路径的视图 SHA256 逐字节相同，`7f6a2891c8673ab34cfbaaea6f376ee81cbe36eb5a08f2966373824e2349d8a5c`）
和 `src/content/__tests__/pages.test.ts` 里的几个通用用例（该文件已随任务 C 改名为 `view.test.ts`）。原 `dump-view.ts` 已随 `.zcode` 消失。

目标：把「视图骨架」固化成仓内 golden 快照 + 门禁，纳入 `bun run check`。

### 2.2 先解一个结构问题（否则会走歪）

`buildView` 现在住在 `src/content/pages.ts`，而 `pages.ts` import 了 `src/dict/index.ts`（为了 `dictForLocale`）。
门禁**不能** import `index.ts`（坑 1）。建议做法：

- 抽出 `src/content/view.ts`：只放纯函数 `matchModules(pathname, modules)` 与
  `buildView(pathname, dict, aliases)`，**不 import `index.ts`**，数据一律由参数传入；
- `pages.ts` 保留 `viewForPath` + 单槽缓存，从 `index.ts` 取数据后调用 `view.ts`；
- 门禁侧用 `registry.ts` + `load.ts` 严格构建出 `DictCore` / `LocaleDict`，再调用同一个 `buildView`。
  这样「门禁校验的」和「浏览器实际用的」仍是同一份合并逻辑（符合仓库「两边共用一套编译」的原则）。
- 顺带把 `src/content/__tests__/pages.test.ts` 的 import 改到新位置。

### 2.3 骨架快照要记什么（**别做全量快照**）

全量视图有 27 路径 × 1618 词条，每次改词典都会产生巨大 diff，没人会认真看。只锁**语义骨架**：

1. 模块顺序：`core/modules.jsonc` 的模块名序列（以及「global 必须在最后」）；
2. 每个探针 pathname 命中的模块名序列（顺序即优先级证据）；
3. 每个 pathname 的**赢家覆盖**：只记录「同一键被 ≥2 个命中模块提供」的键，及其最终生效值来自哪个模块
   —— 这是「有意同键异译」的回归保护；
4. 每个 pathname 生效的**规则 id 序列**（顺序即语义的证据）。**记 id，不要记 pattern 源串**：
   这样任务 D（改 pattern）不会打破任务 C 的快照，两者解耦；
5. 计数：每 pathname 的词条数与规则数。

建议文件与命令：

- 快照：`tooling/fixtures/view-skeleton.json`（JSON，带 `$schema` 可省；若要写注释说明维护方式，用 `.jsonc` 但注意门禁读取要用 `load.ts` 的方式或 `Bun.file` + JSON5 不支持，简单点就用 `.json`）
- 门禁：`tooling/checks/view.ts`，导出纯函数（生成骨架 / 比对骨架 / 格式化错误信息供测试复用），
  `main` 用 `import.meta.main` 守卫；失败 `process.exitCode = 1`；错误信息中文，指出「哪条路径的哪一项变了、
  期望什么、实为什么、以及如果是有意改动就用 `--update` 重新生成」；
- `package.json` 增加 `"check:view": "bun tooling/checks/view.ts"`，并把 `check:view` 串进 `check`
  （放在 `check:dict` / `check:manifest` 之后、`test` 之前）；
- `--update` 写快照（只允许显式调用），默认只校验不写；
- 测试：`tooling/checks/view.test.ts`，至少覆盖「骨架生成形状」「顺序变了要报错」「有意改动用 --update 后通过」。

### 2.4 探针路径集合（沿用原 dump-view 的 27 条）

```
/
/octocat
/microsoft/vscode
/microsoft/vscode/issues
/microsoft/vscode/issues/1
/microsoft/vscode/pull/1
/microsoft/vscode/pulls
/microsoft/vscode/settings
/settings/profile
/microsoft/vscode/actions
/microsoft/vscode/agents
/microsoft/vscode/commits
/microsoft/vscode/discussions
/microsoft/vscode/wiki
/microsoft/vscode/pulse
/microsoft/vscode/graphs
/microsoft/vscode/forks
/microsoft/vscode/security
/microsoft/vscode/projects
/microsoft/vscode/tags
/microsoft/vscode/branches
/microsoft/vscode/compare
/search
/topics
/features
/pricing
/not-a-real-page/x
```

### 2.5 必须固定下来的「有意同键异译」（`registry.ts` 注释里记了 5 处）

| 键 | 赢家 | 被压过的模块 | 在哪条路径可观测 |
| --- | --- | --- | --- |
| `Actions` | `pages/repo-settings`「Actions 工作流」 | `pages/repo`「操作」 | `/microsoft/vscode/settings` |
| `Name` | `pages/settings`「姓名」 | `pages/repo`「名称」 | `/settings/profile` |
| `Pages` | `pages/repo-settings`「页面」 | `global`「页码」 | `/microsoft/vscode/settings` |
| `Write` | `pages/repo-settings`「写入」 | `global`「编写」 | `/microsoft/vscode/settings` |
| `GitHub Apps` | `pages/repo-settings`「GitHub 应用」 | `pages/marketing`「GitHub 应用程序」 | 无（`marketing` 路由是 `^/(features\|pricing)`，与 repo-settings 永不共存，故顺序不影响结果；别为它写断言，只在注释里说明） |

请把前 4 条写成显式断言（骨架里的赢家覆盖自然覆盖它们，但要有一条直白命名的测试，便于日后 review 时一眼看懂）。

### 2.6 验收标准

- `bun run check` 全绿（含新门禁与新测试）；
- **故意破坏必须报错**（各自试一次、别提交）：
  (a) 交换 `core/modules.jsonc` 里两个页面模块的顺序 → 门禁报「命中顺序 / 赢家变化」；
  (b) 把 `global` 挪到最前 → 门禁报「global 必须在最后」（`load.ts` 也会拦，注意别被它先拦掉）；
  (c) 在某模块的 `rules` 里插一条规则 → 门禁报「规则 id 序列变化」；
- 提交信息里写明：为什么是全量快照之外的骨架设计、以及上面三次故意破坏都验证过。

---

## 3. 任务 D：规则改用命名捕获组

> ✅ **已完成**（提交 `fd3d6b3`）。实测 ≥2 组的规则是 **72 条**（不是下面写的 73），
> 实现与三项机械验证见第 6 节；下文保留原始设计。

### 3.1 现状与目标

`core/rules.jsonc` 的 207 条规则里，**72 条有 ≥2 个捕获组**（实测：2 组×42 / 3 组×17 / 4 组×12 / 6 组×1），
中文模板已经在重排位置引用它们，例如：

```jsonc
{ "id": "global/short-date-jan", "pattern": "^Jan (\\d{1,2}), (\\d{4})$" }
// locales/zh-CN/rules.jsonc
"global/short-date-jan": "$2 年 1 月 $1 日",
```

日语（或任何新语言）译者拿到这条模板，必须回头读 pattern 才知道 `$1`/`$2` 是谁。改成原生命名捕获组即可自解释
（**不要自造 `{name}` 模板语法**，用 JS 原生的 `$<name>`）：

```jsonc
{ "id": "global/short-date-jan", "pattern": "^Jan (?<day>\\d{1,2}), (?<year>\\d{4})$" }
"global/short-date-jan": "$<year> 年 1 月 $<day> 日",
```

范围：**只改 ≥2 组的规则**；单组规则保持 `$1`（本次统一约定：单组不命名，减少无意义改动，并把这条约定写进
`docs/guides/development.md` 的「加一条动态规则」一节）。`ja` 现有 7 条模板全是单组，因此实际只改
`core/rules.jsonc` 与 `locales/zh-CN/rules.jsonc`，但**门禁与文档要按「所有语言」写**。

门禁已经支持这件事，不用新增校验：`tooling/checks/dict.ts` 里 `extractTemplateRefs`（取 `$1` 与 `$<name>`）、
`countGroups`、`namedGroups`、`validateTemplate`（引用越界 / 未声明命名组都报错）。

### 3.2 命名建议（先定约定再批改，避免风格漂移）

| 语义 | 建议名 | 例子 |
| --- | --- | --- |
| 日期 | `day` / `year` / `time` | `^January (?<day>\\d{1,2}), (?<year>\\d{4}) (?<time>\\d\\d:\\d\\d)$` |
| 日期区间（同月） | `startDay` / `startYear` / `endDay` / `endYear` | insights 的 `^January ... – January ...` |
| 计数 | `count` | `^([\\d,]+) Open$`（单组 → 不命名） |
| 计数 + 单复数后缀 | `count` / `plural` | `^([\\d,]+) entit(y|ies) (?:has|have) ...$` |
| 仓库 / 用户 | `repo` / `owner` / `actor` | `^Make ([^/]+\\/[^/]+) private$`、`^(.+) reacted with heart emoji$` |
| 图表 a11y | `navigator` / `series` / `seriesCount` / `points` / `yAxis` / `xAxis` / `bars` | insights#56 |
| 时长 | `hours` / `minutes` / `seconds` | actions 的 `^([\\d,]+)h ([\\d,]+)m ([\\d,]+)s$` |
| 天数（insights 图表） | `days` | `^([\\d.]+)k$` 之类按语义取 |

同一条 pattern 内组名必须唯一；组名只允许 `[A-Za-z_$][A-Za-z0-9_$]*`（JS 规范）。

### 3.3 必须做的机械验证（写进提交信息）

改完不能只靠 `check:dict` 通过就提交。用一次性脚本（放临时目录、**不要**进仓，或跑完删除）验证三件事：

1. **pattern 等价**：新源串去掉所有 `?<name>` 后必须与旧源串**逐字符相同**
   （即只加了组名，没有动任何匹配语义）；
2. **模板等价**：用合成捕获值渲染旧模板与新模板，输出必须相同。
   做法：由 pattern 的组数造合成 match（`[整串, ⟨1⟩, ⟨2⟩, …]` 且 `groups = { name: ⟨i⟩ }`），
   自己实现 `$N` / `$<name>` 的替换（或直接 `template.replace(pattern, ...)` 配一个能匹配的合成输入）；
3. **行为抽样**：对一批真实文本（例如用 `bun run verify` 采集的漏翻清单、或所有 canonical 键）
   分别用「旧视图」与「新视图」跑 `translateText`，结果必须完全一致。
   旧视图可在改动前先 dump 一份 JSON 快照到临时目录作为对照。

### 3.4 验收标准

- `bun run check` 全绿；`bun run build` 成功；
- 上面三项机械验证全过（把三项的结论写进提交信息）；
- 故意写一个不存在的组名（如 `$<month>`）必须被 `check:dict` 拦住（试完改回，别提交）；
- `docs/guides/development.md` 的「加一条动态规则」补上「≥2 组必须命名捕获组、单组保持 `$1`」的约定。

---

## 4. 任务 F：命名一致性（本地目录已改名，其它地方还没跟上）

> ✅ **已完成**（提交 `74ff85d` 图标残留清理 + `378d702` 标识改名）。
> 用户的决定：远端已在 GitHub 改名并同步本地 remote；标识「全改」；四项清理全做。
> 实现与验证见第 6 节；**下文 4.1 的清单是撰写时的实测结果，多数已不再成立**，保留以存历史。

### 4.1 现状（清单已实测，见下表的文件:行）

- 本地目录：`C:\Dev\Tool-Dev\Github-i18n`（已是新名）
- 远端 URL：`https://github.com/Oppenheymu/Github-i18n.git`（已由用户改名，本地 remote 已同步）
- 跟踪文件里的旧名 / 旧定位残留（`git grep -in "github-zh"` 与 `git grep -in "汉化"` 的实测结果）：

| 位置 | 残留内容 | 处置建议 |
| --- | --- | --- |
| `AGENTS.md:3` | 「本仓库（Github-ZH，…）」 | 改成新名 |
| `README.md:1` | 标题 `# GitHub 界面本地化（Github-ZH）` | 改成新名 |
| `NOTICE:4` | 「本项目（Github-ZH，扩展显示名「GitHub 汉化」）」 | **两处都过时**：仓库名 + 显示名（现为「GitHub 界面本地化」） |
| `LICENSE:3` | `Copyright (c) 2026-present Github-ZH contributors` | 改名需谨慎：改版权署名属于实体变更，建议**保留**并在 NOTICE 说明新名 |
| `package.json:2,7` | `"name": "github-zh"`、`"description": "GitHub 汉化浏览器扩展…"` | 名字可改（注意同步 `bun.lock`），描述必须改 |
| `bun.lock:6` | 锁文件里镜像了包名 | 改 `package.json` 后重跑 `bun install` 让它同步 |
| `docs/guides/development.md:10` | 目录树首行写 `Github-ZH/` | 改成新名 |
| `tooling/pack.ts:186` | 发布产物名 `github-zh-v<版本>.zip` | 建议改名（`github-i18n-v…`），并同步文档里的 `bun run pack` 说明 |
| `src/shared/identity.ts:12` | `EXTENSION_MARKER = "github-zh/content"` | 可改（两侧都 import 同一常量，安全），但要与 `tooling/verify-live.ts` 一起验证探针仍能找到扩展 |
| `tooling/verify-live.ts:653,662` | 环境变量 `GITHUB_ZH_BROWSER_PATH` | 建议改 `GITHUB_I18N_BROWSER_PATH` 并**同时读旧名兜底**；`docs/guides/development.md:75,255` 两处文档同步 |
| `src/content/collector.ts:135,142`、`tooling/verify-live.ts`、`src/content/__tests__/collector.test.ts`、`docs/guides/development.md:234` | 导出 schema 名 `github-zh-misses/1` | **保持不动**（用户粘贴的 JSON 里的字段，改了旧数据无法被识别） |
| `docs/design/i18n-handoff.md:1,8` | 旧路径与旧名 | 历史文档：**不要重写历史**，但第 8 行声称「你正在接手仓库 `…\Github-ZH`」会误导后来者，在开头加一行「本文写于改名之前，仓库现名 Github-i18n」即可 |
| `AGENTS.md:13`、`NOTICE:7`、`README.md:6` | 「GPL 系汉化项目」这类**许可证表述** | **一个字都别动**：这里说的是别的项目，不是本扩展 |

补充：`*.zip`、`dist/`、`.zcode/` 都已被 `.gitignore` 忽略，不用管。

### 4.2 顺手清掉「图标脚本」的残留（与 F 同批改，因为同动 `package.json` 与文档）

`4c65fbb`（改名之前）已**有意删除** `assets/icon.svg` 与 `tooling/gen-icons.ts`——图标现在是提交在
`public/icons/*.png` 的静态文件。但引用还留在四处，任一条都会让后来者以为 `bun run icons` 可用：

| 位置 | 残留 |
| --- | --- |
| `package.json:18` | `"icons": "bun tooling/gen-icons.ts"`（**脚本悬空**，跑就报错） |
| `AGENTS.md:61` | 已知坑「新版无头浏览器 `--screenshot` 不支持透明背景…`gen-icons.ts` 走 CDP」 |
| `docs/guides/development.md:47` | 目录树里的 `gen-icons.ts` 与 `assets/` 行 |
| `docs/guides/development.md:75` | 「图标」那段设计决策（含 `GITHUB_ZH_BROWSER_PATH` 的说明） |

处置：删掉 `icons` 脚本（`AGENTS.md` 的「门禁与工作流」清单里也有对应行，一起删），
把 `AGENTS.md` 那条已知坑与开发指南那两处改写成「图标是 `public/icons/` 下的静态 PNG，改图标直接替换文件，
四个尺寸都要换；不再有生成脚本」。改完 `bun run check` 必须全绿。

### 4.3 先问清楚，再动手（**不要自行决定**）

这是一次**品牌 / 标识迁移**，影响面超出代码：先向用户确认以下三件事，拿到答复再改：

1. GitHub 远端仓库要不要真的改名（改 `Github-i18n`）？改了以后：
   - 旧链接会 301 重定向（GitHub 会保留重定向），但各处的 clone URL、README 徽章、商店「主页」链接要跟着改；
   - 若仓库已上架商店且填写了主页 URL，也要在商店后台同步。
2. `package.json` 的 `name`、`GITHUB_ZH_BROWSER_PATH`、导出 schema `github-zh-misses/1`、
   存储键（`enabled` / `devMode` / `locale` / `missLog`）——哪些改、哪些保留？
   建议：**schema 名与存储键保持不动**（前者是给用户粘贴的 JSON 里的字段，改了会让旧数据无法被工具识别；
   后者与仓库名无关，改了要写迁移代码），环境变量名可改但要在文档与脚本里同时改并保留旧名兜底。
3. 扩展显示名：目前已是中性的「GitHub 界面本地化」（`public/_locales/*/messages.json` 的 `appName`），
   **不要动它**，也不用改 `__MSG_*__`。

### 4.4 交付

- 一份「改名清单 + 风险」先给用户过目（可以就用本节的 4.1/4.3 补全），确认后再执行；
- 执行时**分维度提交**（例如 `chore: 仓库改名收尾（文档与链接）`、`chore: 环境变量改名前缀`），
  每步 `bun run check` 全绿；
- 若远端改名由用户手动在 GitHub 完成，则本地跟着执行 `git remote set-url origin <新地址>`，
  并确认 `git fetch` 正常；
- 文档里凡是写「Github-ZH」的地方统一到新名，并把「本仓库曾用名 Github-ZH」在 `NOTICE` 或 README 里留一句
  （避免旧链接失效后无人知道是新名）。

---

## 5. 明确不做（本轮范围外）

- **B：标签同步**——**前提已失效**：`tooling/labels.ts` / `labels.test.ts` / `.github/labels.yml`
  已被 `6e887cd feat(triage)` 整个删除，改成 `.github/labeler.yml` + `.github/workflows/triage.yml`
  的 PR 打标与 issue 分诊流水线。该流水线已完成，不在本轮范围，别碰。
- ja 词典覆盖率推进（翻译工作量，非工程任务）。
- 包体按 locale 分发（N≥4 再说）、复数语法类别（一个 pattern 一个模板，结构上不支持）。
- 任何「顺便重构一下」的冲动改动：本轮只做 C、D、F（外加 4.2 那处图标残留清理）。

---

## 6. 实施记录（本轮已完成）

提交顺序：`ae63d1e` C → `fd3d6b3` D → `74ff85d` 图标残留 → `378d702` 标识改名 → 本文档更新。
每一步都先跑 `bun run check` 全绿再提交；提交一律用显式路径（4 个提交都确认过没有夹带并发会话的文件）。
最终：**129 用例 / 9 个文件**（撰写时 121 / 9，多出来的是 C 新增的 `tooling/checks/view.test.ts`）。

### 6.1 任务 C（`ae63d1e`）

- 抽出 `src/content/view.ts`：`matchModules` / `buildView` 是纯函数，数据全部由参数传入，
  **不 import** `src/dict/index.ts`；`pages.ts` 只留 `viewForPath` + 单槽缓存；
  `src/content/__tests__/pages.test.ts` 改名成 `view.test.ts` 并改成显式传数据。
- 新增 `tooling/checks/view.ts` + `tooling/fixtures/view-skeleton.{zh-CN,ja}.json`，
  `package.json` 加 `check:view` 并串进 `check`（在 `check:manifest` 之后、`test` 之前）。
- 只锁语义骨架（模块顺序 / 每条路径的命中模块序列 / 赢家覆盖 / 生效规则 id 序列），
  词条数是运行时打印、不进快照；错误只报首处差异 + 差异条数（一条路径的规则序列可达上百项）。
- **实测发现的、设计里没写的一条**：只记「生效规则 id」的话，「往 `core/rules.jsonc` 加一条规则、
  忘了给本语言模板」在视图里完全不可见（缺模板 = 规则不生效）。故加了 `notTranslated`
  （该路径 core 声明了、本语言还没给模板的规则 id 序列）。这是查这项时真撞出来的。
- 快照按语言逐份：zh-CN 有 16 处赢家覆盖，ja 0 处（ja 只译了 50/1618 键，跨模块同键不成立）。
  `registry.ts` 原先手写注释列了 5 处，现在指向快照（快照更全）。
- 三次故意破坏都验证过（试完 `git restore` 还原、未提交）：
  (a) 交换 core 两个页面模块顺序（modules/canonical/rules 三处同步）→ 报「模块顺序变了——第 3 项…」；
      另单独演示了「赢家变化」（把快照里 `Pages` 的胜出模块改成 global → 精准报出该键）；
  (b) `global` 挪到最前 → **已知边界**：三个文件一起挪时 `load.ts` 先拦（模块顺序校验），
      只挪 `modules.jsonc` 时 gate 报「词典无法严格编译」。global-last 这条硬约束由 `load.ts`
      强制（`check:dict` 覆盖），骨架门禁到不了那一层；该分支保留 + 单元测试覆盖。
      这个边界已如实写进提交信息，没有假装门禁报了。
  (c) 往 `core/rules.jsonc` 插一条规则、不给模板 → 报「尚未翻译的规则 id 序列变了」。

### 6.2 任务 D（`fd3d6b3`）

- 实测 ≥2 组规则 **72 条**（2 组×42 / 3 组×17 / 4 组×12 / 6 组×1），不是 73；单组 123 条 + 无组 12 条不动。
- 命名表见 `docs/guides/development.md`「加一条动态规则」；生成脚本按「规则 id → 组名数组」
  逐条映射，改完自校验组数 / 组名合法性 / 唯一性，不成立就原地抛错不落盘。
- 三项机械验证（一次性脚本，跑完删除，未进仓）：
  1. pattern 等价：207 条「去掉所有 `?<name>`」后与旧源串逐字符相同；
  2. 模板等价：同一套合成捕获值渲染新旧模板，207 条输出全同；
  3. 行为抽样：1656 条样本（canonical 1584 + 合成 72）跑新旧视图，结果 0 条不同。
     **实测坑**：canonical 里这 72 条多组规则**一个真实样本都没有**（它们命中运行时动态文案），
     所以合成样本是必须的；合成器要处理转义 `\u00B7` 是「字面反斜杠」这件事，否则样例永远不命中。
- 故意把两条模板的 `$<year>` 改成 `$<month>` → `check:dict` 报「未声明该命名组（已声明：day / year）」。
- **快照逐字节未变**：骨架只记规则 id、不记 pattern 源串，C 与 D 成功解耦。

### 6.3 任务 F（`74ff85d` + `378d702`）

- 用户决定：远端已在 GitHub 改名（本地 `git remote set-url` + `git fetch` 验证通过）；
  标识「全改」；四项清理全做（图标残留 / NOTICE 显示名 / 版权署名保留 + 曾用名一句 / 本文档更新）。
- 改：`package.json` 的 name 与 description、`bun.lock` 的镜像包名（`bun install` 不会刷新这段，
  需手改）、`pack.ts` 产物名、`EXTENSION_MARKER` 与 `EXTENSION_MARKER_KEY`、
  环境变量 `GITHUB_I18N_BROWSER_PATH`（旧名 `GITHUB_ZH_BROWSER_PATH` 继续兜底，新名优先）、
  各处文档的仓库名 / 目录树 / 产物名。
- 刻意不改：导出 schema `github-zh-misses/1`、存储键、LICENSE 署名（在 NOTICE 里说明）。
- 图标残留：交接列了 4 处，**实测还有 `README.md:42` 的 `bun run icons`**（漏了），一并清掉。
- 验证：`check` 全绿 + `build` 成功 + dist 里确认新标记已内联 +
  **实机探针真跑一次**（`bun run verify` 退出码 0、采集 1610 条漏翻），
  确认改名后探针仍能认出扩展，而不是两边一起改成同一个错字造成的假绿。

### 6.4 仍未做 / 遗留

- 本地 `main` 领先 `origin/main` 若干提交（**未推送**）：需要用户决定何时推。
- ja 覆盖率 50/1618（翻译工作，非工程任务）。
- 骨架门禁的 `global`-last 分支实际不可达（由 `load.ts` 兜住），保留作为纵深防御。

