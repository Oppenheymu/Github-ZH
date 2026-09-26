# GitHub 界面本地化（Github-i18n）

把 GitHub 网站界面本地化为多种语言的浏览器扩展（Chrome / Edge，Manifest V3）。

- **纯本地词典**：翻译完全在浏览器内完成，不联网、不收集任何数据；
- **词典 100% 原创**：全部词条手写维护，不含任何 GPL 系汉化项目的内容，仓库整体 MIT 许可；
- **当前语言**：简体中文（完整词典）+ 日本語（样例词典，覆盖率持续补齐中）；漏译处保持英文原文；
- **防误伤**：代码块、diff、README、评论等用户内容容器整树排除，绝不翻译你的代码与文字；
- **词典驱动**：静态词条精确匹配 + 正则规则处理「X minutes ago」等动态文本，零选择器维护负担。

## 安装（手动加载）

扩展尚未上架应用商店，请在开发者模式加载 `dist/` 构建产物：

1. 安装 [Bun](https://bun.sh) 后在本仓库执行 `bun install && bun run build`；
2. 打开 `chrome://extensions`（Edge 为 `edge://extensions`）；
3. 打开右上角「开发者模式」；
4. 点击「加载已解压的扩展程序」，选择本仓库的 `dist/` 目录；
5. 打开任意 GitHub 页面，界面即按「翻译语言」设置切换。

## 使用

- 点击工具栏扩展图标弹出开关，切换后页面自动刷新生效；
- popup 里的「翻译语言」用于选择目标语言（默认「自动」：跟随浏览器界面语言，未支持的语言回退简体中文）；
- 开关与语言设置保存在 `chrome.storage.local`，仅本机生效；
- 遇到漏翻？popup 底部「开发者模式」（默认关闭，仅存本地）可收集未翻译文本并一键复制为 JSON，用法见[开发指南](docs/guides/development.md)。

## 隐私

本扩展不包含任何网络请求：翻译由内置词典在本地完成，不收集、不上传任何数据，详见 [NOTICE](NOTICE)。

## 开发

工具链为 Bun 单运行时 + Biome 唯一格式权威 + TypeScript 严格全家桶，架构说明与词典维护流程见 [docs/guides/development.md](docs/guides/development.md)。

```bash
bun install        # 安装依赖
bun run check      # 全量门禁：lint + typecheck + check:dict + check:manifest + check:view + test
bun run build      # 构建 dist/
bun run watch      # 监听重建（扩展需在浏览器手动重载）
bun run verify     # 实机探针：无头浏览器逐页收集漏翻（--locale 切换目标语言）
bun run pack       # dist/ 打 zip（商店上传用）
```

## 词典贡献

数据分成两层：语言无关的路由 / 规则 / 规范键在 `src/dict/core/`，译文按语言放在 `src/dict/locales/<语言>/`（稀疏覆盖，缺键即未翻译）。补词条的完整流程见[词典维护指南](docs/guides/development.md)；`bun run check:dict` 会兜底校验结构、交叉引用、译文形态与覆盖率。

## 许可与声明

- 代码与词典以 [MIT](LICENSE) 许可发布；
- 「GitHub」名称与标识为 GitHub, Inc. 商标，本项目为独立的社区本地化工具，与 GitHub, Inc. 无任何隶属或背书关系，详见 [NOTICE](NOTICE)。
