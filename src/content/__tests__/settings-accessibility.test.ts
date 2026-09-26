// 辅助功能设置页（/settings/accessibility）实机文本节点回归。
//
// 为什么单独锁这一页：
//   1. 本页有若干「按键名 + 符号」的混合文本（`Ctrl ⇧ V`、`alt upAlt↑`、`gn`、`?`），
//      键是整节点精确匹配，键串里少一个空格就静默保留英文——而译文里又绝不能把这些
//      按键名译掉（用户显式要求「按键千万别翻译」），故两者都要有断言；
//   2. 本页的保存按钮随区块不同（keyboard shortcut / motion / content / hovercard /
//      editor / assistive technology hint），截图上确认过的按钮文案逐条锁住；
//   3. 同页多处以 `?` 结尾的说明句与带 `<kbd>` 的句子，边界一旦对不上会静默漏翻。
//
// 已知未覆盖（留待实机确认后再补，勿凭猜测登记死键）：
//   - 页面标题键 `Accessibility settings`：截图未包含标题栏，实机若渲染成
//     `Accessibility`（与侧边栏同键）则本条不生效，届时按实机文本改键；
//   - <kbd> 元素在源码里的缩进（本文件按 `Ctrl ⇧ V` 与 `alt upAlt↑` 单空格录入；
//     引擎按「单个文本节点」查词，节点内连续空白会被折叠，故这里只锁键串形态）。
import { describe, expect, it } from "bun:test";
import {
	dictCore,
	dictForLocale,
} from "../../dict/index.ts";
import { buildView } from "../view.ts";
import { translateText } from "../walker.ts";

/** /settings 子树命中的模块视图（pages/settings + pages/repo + global） */
const view = buildView(
	"/settings/accessibility",
	dictForLocale("zh-CN"),
	new Map(Object.entries(dictCore.aliases)),
);

/** 辅助功能页的实机文本节点（原文逐字录入，不做 trim——引擎自己会归一空白） */
const ACCESSIBILITY_NODES: readonly string[] = [
	"General",
	"Keyboard shortcuts",
	"Character keys",
	"Enable GitHub shortcuts that don't use modifier keys in their activation. For example, the gn shortcut to navigate notifications, or question mark? to view context relevant shortcuts.",
	"Motion",
	"Autoplay animated images",
	"Select whether animated images should play automatically.",
	"Follow system",
	"Adopts your system preference for reduced motion",
	"Enabled",
	"Automatically plays animated images",
	"Disabled",
	"Prevents animated images from playing automatically",
	"Content",
	"Link underlines",
	"Toggle the visibility of underlines on links that are adjacent to text.",
	"Hide link underlines",
	"Show link underlines",
	"Hovercards",
	"Hovercards preview information about other parts of GitHub.",
	"Show hovercards",
	"Enable previewing link content via mouse hover or keyboard focus before navigation. Move focus to hovercard content using alt upAlt↑.",
	"Editor settings",
	"URL paste behavior",
	"Select if URLs should be formatted on paste. You can use control shift and VCtrl ⇧ V to paste a link in the opposite way.",
	"Formatted link",
	"Pasting a URL while having text selected will format to a Markdown link",
	"Plain text",
	"Pasting a URL while having text selected will replace the text",
	"Assistive technology hints",
	"Add or remove instructions for how to operate complex controls.",
	"Enable screen reader hint",
	"Disable screen reader hint",
	// 各区块的保存按钮（截图上确认过的四条 + 同一模板的另外两条）
	"Save keyboard shortcut preferences",
	"Save motion preferences",
	"Save content preferences",
	"Save hovercard preferences",
	"Save editor settings",
	"Save assistive technology hint preferences",
];

/** 节点在实机里通常带源码缩进与换行；两种形态都必须命中 */
function withWhitespace(node: string): readonly string[] {
	return [node, `\n        ${node}\n      `];
}

describe("辅助功能设置页的实机节点边界", () => {
	it("translates every text node GitHub actually renders", () => {
		for (const node of ACCESSIBILITY_NODES) {
			for (const variant of withWhitespace(node)) {
				const translated = translateText(variant, view);
				expect(
					translated,
					`未命中：${JSON.stringify(variant)}`,
				).not.toBeNull();
				// 译文必须是中文（防「收录了键但值还是英文」这类静默失效）
				expect(translated ?? "").toMatch(/[\u4e00-\u9fff]/);
			}
		}
	});

	it("keeps key names untranslated", () => {
		// 按键名与专名一律原样保留：Ctrl / ⇧ / V / Alt↑ / gn / ? / Markdown / URL / GitHub
		const shortcut = translateText(
			"Enable GitHub shortcuts that don't use modifier keys in their activation. For example, the gn shortcut to navigate notifications, or question mark? to view context relevant shortcuts.",
			view,
		);
		for (const raw of ["gn", "?", "GitHub"]) {
			expect(shortcut ?? "").toContain(raw);
		}
		const hovercard = translateText(
			"Enable previewing link content via mouse hover or keyboard focus before navigation. Move focus to hovercard content using alt upAlt↑.",
			view,
		);
		expect(hovercard ?? "").toContain("Alt ↑");
		const paste = translateText(
			"Select if URLs should be formatted on paste. You can use control shift and VCtrl ⇧ V to paste a link in the opposite way.",
			view,
		);
		expect(paste ?? "").toContain("Ctrl ⇧ V");
		expect(paste ?? "").toContain("URL");
		expect(
			translateText(
				"Pasting a URL while having text selected will format to a Markdown link",
				view,
			),
		).toContain("Markdown");
	});

	it("keeps the two URL paste options apart", () => {
		// 两句只差一个动词（format / replace），必须各自成条
		expect(
			translateText(
				"Pasting a URL while having text selected will format to a Markdown link",
				view,
			),
		).toBe(
			"在选中文本时粘贴 URL，会格式化为 Markdown 链接",
		);
		expect(
			translateText(
				"Pasting a URL while having text selected will replace the text",
				view,
			),
		).toBe("在选中文本时粘贴 URL，会替换所选文本");
	});

	it("keeps the motion toggle options apart", () => {
		// 自动播放动画图片的两态：启用 / 禁用，说明句不得互相顶替
		expect(translateText("Enabled", view)).toBe("启用");
		expect(translateText("Disabled", view)).toBe("禁用");
		expect(
			translateText(
				"Automatically plays animated images",
				view,
			),
		).toBe("自动播放动画图片");
		expect(
			translateText(
				"Prevents animated images from playing automatically",
				view,
			),
		).toBe("阻止动画图片自动播放");
	});

	it("keeps the hide/show underline options apart", () => {
		expect(
			translateText("Hide link underlines", view),
		).toBe("隐藏链接下划线");
		expect(
			translateText("Show link underlines", view),
		).toBe("显示链接下划线");
	});

	it("keeps the screen reader hint options apart", () => {
		expect(
			translateText("Enable screen reader hint", view),
		).toBe("启用屏幕阅读器提示");
		expect(
			translateText("Disable screen reader hint", view),
		).toBe("禁用屏幕阅读器提示");
	});
});
