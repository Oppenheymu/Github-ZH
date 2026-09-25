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

/** 是否含 CJK（汉字）；已翻译文本与替换值校验都靠它收敛 */
export function hasCJK(text: string): boolean {
	return /\p{Script=Han}/u.test(text);
}

/** 单段文本长度上限：超过视为代码或用户内容，直接放弃 */
const MAX_TEXT_LENGTH = 500;

/**
 * 文本节点 / 属性值翻译前的可翻译判定：
 * 空白、已含 CJK、超长、无拉丁字母（纯数字或符号）一律跳过。
 */
export function isTranslatableText(text: string): boolean {
	const trimmed = text.trim();
	if (trimmed.length === 0) return false;
	if (trimmed.length > MAX_TEXT_LENGTH) return false;
	if (hasCJK(trimmed)) return false;
	if (!/[a-z]/i.test(trimmed)) return false;
	return true;
}
