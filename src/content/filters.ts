// 翻译排除判定：保护代码与用户内容绝不被替换（硬性约束 6：排除清单优先）

/**
 * 容器级排除选择器：元素自身或其祖先命中即跳过整个子树。
 * 新页面误伤代码块时，先往这里加选择器，再考虑词典侧回避；
 * 严禁为覆盖 UI 词条而放宽本清单。
 */
export const EXCLUDE_SELECTOR = [
	// 原生代码与输入容器
	"code",
	"pre",
	"kbd",
	"samp",
	"textarea",
	// 脚本与模板（不可见，但会被遍历到）
	"script",
	"style",
	"noscript",
	"template",
	// GitHub 的代码高亮 / diff / 编辑器容器
	".highlight",
	".blob-code",
	".diff-table",
	".js-file-line",
	".react-code-lines",
	".CodeMirror",
	".cm-editor",
	// 用户创作内容（README、issue 正文、评论等均挂 markdown-body）
	".markdown-body",
].join(",");

/**
 * 是否含**非拉丁字母**（语言无关的「已翻译 / 非英文」判定）。
 *
 * 刻意用 Unicode 脚本属性而不是硬编码汉字区间：日语译文可能全是假名
 * （「もっと見る」）、韩语用谚文、还有西里尔 / 希腊 / 阿拉伯等，汉字判定对它们
 * 全部失效，会让译文被当成英文原文再翻一遍。这里只要求「存在一个不属于拉丁
 * 字系的字母」——标点、数字、符号（`©`、`…`、`——`）不算字母，带变音符的拉丁
 * 字母（`café`）仍属拉丁字系，故英文 UI 文本不会被误判为已翻译。
 *
 * 拉丁语系目标语言无法靠本判定区分（与源语言同字系），其防循环依赖
 * 「译文不得等于任何键」的结构门禁，见 tooling/checks/dict.ts。
 */
const NON_LATIN_LETTER =
	/(?:(?!\p{Script=Latin})\p{Letter})/u;

export function hasNonLatinLetter(text: string): boolean {
	return NON_LATIN_LETTER.test(text);
}

/** 单段文本长度上限：超过视为代码或用户内容，直接放弃 */
const MAX_TEXT_LENGTH = 500;

/**
 * 文本节点 / 属性值翻译前的可翻译判定：
 * 空白、超长、无拉丁字母（纯数字或符号）、已含非拉丁字母（已是译文或非英文
 * 用户内容）一律跳过。先测最便宜的「含拉丁字母」再测字系，热路径上更省。
 */
export function isTranslatableText(text: string): boolean {
	const trimmed = text.trim();
	if (trimmed.length === 0) return false;
	if (trimmed.length > MAX_TEXT_LENGTH) return false;
	if (!/[a-z]/i.test(trimmed)) return false;
	if (hasNonLatinLetter(trimmed)) return false;
	return true;
}
