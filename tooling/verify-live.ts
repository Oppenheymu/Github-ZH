// 实机验证驱动：无头浏览器加载 dist/ 扩展，开启开发者模式后逐页访问 GitHub，
// 读取漏翻日志（chrome.storage.local 的 missLog）并汇总输出 JSON。
// 输出 schema 与 popup「复制」导出一致（github-zh-misses/1），可直接作为词典候选键来源。
//
// 用法：
//   bun tooling/verify-live.ts [--out <文件>] [--pages <清单文件>] [--dwell <毫秒>]
//                              [--locale <语言 id>] [--headed] [--keep] [--browser <可执行文件>]
//
// --locale 会写进 storage（content script 据它选词典），同时决定翻译探针的锚点，
// 因此探针不依赖「某一种语言的中文译文」这类硬编码判据。
// 页面清单文件：每行一个 URL，# 开头为注释；缺省用 DEFAULT_PAGES。
// 退出码：0 成功；1 失败（原因见 stderr，中文）。
//
// 实现要点（Edge / Chrome 153 实测）：
// - CDP 打开的 chrome-extension:// 页面拿不到扩展 API，控制面走 content script
//   的 isolated world（Runtime.enable 后按 src/shared/identity.ts 的身份标记匹配
//   上下文——不能用 manifest.name，品牌走 __MSG_*__ 后它随浏览器语言变化）；
// - devMode 写入触发 content script 整页刷新，刷新后必须重开会话再读日志；
// - 收集器每 5 秒落盘，单页停留两轮落盘周期后再读。

import {
	access,
	mkdir,
	mkdtemp,
	readFile,
	rm,
	writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
	FALLBACK_LOCALE,
	getLocaleMeta,
	isLocaleId,
	LOCALES,
	type LocaleId,
} from "../src/dict/locales.ts";
import {
	EXTENSION_MARKER,
	EXTENSION_MARKER_KEY,
} from "../src/shared/identity.ts";
import type {
	MissItem,
	MissKind,
} from "../src/shared/types.ts";

// —— 默认页面清单：覆盖各词典模块对应路由的匿名可访问代表页 ——

export const DEFAULT_PAGES: readonly string[] = [
	"https://github.com/trending",
	"https://github.com/octocat",
	"https://github.com/microsoft/vscode",
	"https://github.com/microsoft/vscode/issues",
	"https://github.com/microsoft/vscode/pulls",
	"https://github.com/microsoft/vscode/releases",
	"https://github.com/microsoft/vscode/actions",
	"https://github.com/nodejs/node/issues/1",
	"https://github.com/nodejs/node/pull/1",
];

// —— 参数解析与页面清单 ——

export interface VerifyOptions {
	out?: string;
	pagesFile?: string;
	dwell: number;
	headed: boolean;
	keep: boolean;
	browser?: string;
	/** 目标语言：写进 storage 以便 content script 用它翻译，同时决定探针锚点 */
	locale: LocaleId;
}

/** 解析命令行参数；未知参数与缺值一律抛中文错误 */
export function parseArgs(
	argv: readonly string[],
): VerifyOptions {
	const options: VerifyOptions = {
		dwell: 11000,
		headed: false,
		keep: false,
		locale: FALLBACK_LOCALE,
	};
	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i];
		if (arg === undefined) continue;
		const value = (): string => {
			const next = argv[i + 1];
			if (next === undefined)
				throw new Error(`参数 ${arg} 缺少取值`);
			i += 1;
			return next;
		};
		switch (arg) {
			case "--out":
				options.out = value();
				break;
			case "--pages":
				options.pagesFile = value();
				break;
			case "--dwell": {
				const ms = Number(value());
				if (!Number.isInteger(ms) || ms < 3000)
					throw new Error(
						"--dwell 需为不小于 3000 的整数毫秒",
					);
				options.dwell = ms;
				break;
			}
			case "--headed":
				options.headed = true;
				break;
			case "--keep":
				options.keep = true;
				break;
			case "--browser":
				options.browser = value();
				break;
			case "--locale": {
				const locale = value();
				if (!isLocaleId(locale)) {
					throw new Error(
						`--locale 只支持已声明的语言：${LOCALES.map((meta) => meta.id).join(" / ")}`,
					);
				}
				options.locale = locale;
				break;
			}
			default:
				throw new Error(`未知参数：${arg}`);
		}
	}
	return options;
}

/** 页面清单文本 → URL 数组：去空行、去 # 注释 */
export function parsePagesFile(text: string): string[] {
	const pages: string[] = [];
	for (const rawLine of text.split(/\r?\n/)) {
		const line = rawLine.trim();
		if (line.length === 0 || line.startsWith("#")) continue;
		pages.push(line);
	}
	return pages;
}

// —— 汇总（与收集器 mergeMissLogs / sortMisses 同规：kind+text 去重、
// count 累加、path 首见；排序 path 升序 → count 降序 → text 升序） ——
// 上限放宽：这里只在内存合并本轮探针结果，不受 storage 500 条落盘上限约束
const AGGREGATE_CAP = 5000;

/** 缓冲键：kind + \0 + text（\0 不出现在正常 UI 文本里，消除拼接歧义） */
function missKey(kind: MissKind, text: string): string {
	return `${kind}\u0000${text}`;
}

/** 合并两批漏翻：同键 count 累加、path 首见；超 cap 丢弃新增键 */
export function mergeMisses(
	existing: readonly MissItem[],
	incoming: readonly MissItem[],
	cap: number,
): MissItem[] {
	const merged = new Map<string, MissItem>();
	for (const item of existing) {
		merged.set(missKey(item.kind, item.text), item);
	}
	for (const item of incoming) {
		const prior = merged.get(missKey(item.kind, item.text));
		if (prior !== undefined) {
			merged.set(missKey(prior.kind, prior.text), {
				kind: prior.kind,
				text: prior.text,
				path: prior.path,
				count: prior.count + item.count,
			});
			continue;
		}
		if (merged.size >= cap) continue;
		merged.set(missKey(item.kind, item.text), item);
	}
	return [...merged.values()];
}

/** 排序：path 升序 → count 降序 → text 升序（导出与展示共用） */
export function sortMisses(
	items: readonly MissItem[],
): MissItem[] {
	return [...items].sort((a, b) => {
		if (a.path !== b.path) return a.path < b.path ? -1 : 1;
		if (a.count !== b.count) return b.count - a.count;
		if (a.text !== b.text) return a.text < b.text ? -1 : 1;
		return 0;
	});
}

export function aggregateMisses(
	pageMisses: readonly (readonly MissItem[])[],
): MissItem[] {
	let merged: MissItem[] = [];
	for (const items of pageMisses) {
		merged = mergeMisses(merged, items, AGGREGATE_CAP);
	}
	return sortMisses(merged);
}

function isMissKind(value: unknown): value is MissKind {
	return (
		value === "text" ||
		value === "title" ||
		value === "aria-label" ||
		value === "placeholder" ||
		value === "alt"
	);
}

/** 收窄 CDP 求值取回的漏翻数组：结构不合法的条目静默丢弃（与 popup 侧同规） */
function narrowMisses(value: unknown): MissItem[] {
	if (!Array.isArray(value)) return [];
	const items: MissItem[] = [];
	for (const raw of value) {
		if (typeof raw !== "object" || raw === null) continue;
		const { kind, text, path, count } = raw as {
			kind?: unknown;
			text?: unknown;
			path?: unknown;
			count?: unknown;
		};
		if (
			!isMissKind(kind) ||
			typeof text !== "string" ||
			text.length === 0 ||
			typeof path !== "string" ||
			typeof count !== "number" ||
			!Number.isFinite(count) ||
			count < 1
		)
			continue;
		items.push({ kind, text, path, count });
	}
	return items;
}

// —— CDP 基础设施 ——

const sleep = (ms: number): Promise<void> =>
	new Promise((resolve) => setTimeout(resolve, ms));

interface TargetInfo {
	id: string;
	type: string;
	url: string;
	webSocketDebuggerUrl: string | null;
}

/** /json/new 返回单个对象、/json/list 返回数组：统一先收窄成列表 */
function narrowTargets(value: unknown): TargetInfo[] {
	if (!Array.isArray(value)) {
		if (typeof value !== "object" || value === null)
			return [];
		return narrowTargets([value]);
	}
	const targets: TargetInfo[] = [];
	for (const raw of value) {
		if (typeof raw !== "object" || raw === null) continue;
		const record = raw as {
			id?: unknown;
			type?: unknown;
			url?: unknown;
			webSocketDebuggerUrl?: unknown;
		};
		const { id, type, url, webSocketDebuggerUrl } = record;
		if (
			typeof id !== "string" ||
			typeof type !== "string" ||
			typeof url !== "string"
		)
			continue;
		targets.push({
			id,
			type,
			url,
			webSocketDebuggerUrl:
				typeof webSocketDebuggerUrl === "string"
					? webSocketDebuggerUrl
					: null,
		});
	}
	return targets;
}

interface CdpContext {
	id: number;
	name: string;
	type: string;
}

function extractContext(
	params: unknown,
): CdpContext | null {
	if (typeof params !== "object" || params === null)
		return null;
	const context = (params as { context?: unknown }).context;
	if (typeof context !== "object" || context === null)
		return null;
	const { id, name, auxData } = context as {
		id?: unknown;
		name?: unknown;
		auxData?: unknown;
	};
	if (typeof id !== "number") return null;
	const type =
		typeof auxData === "object" && auxData !== null
			? (auxData as { type?: unknown }).type
			: undefined;
	return {
		id,
		name: typeof name === "string" ? name : "",
		type: typeof type === "string" ? type : "default",
	};
}

function extractValue(message: unknown): unknown {
	if (typeof message !== "object" || message === null)
		return undefined;
	const result = (message as { result?: unknown }).result;
	if (typeof result !== "object" || result === null)
		return undefined;
	const record = result as {
		exceptionDetails?: unknown;
		result?: unknown;
	};
	if (record.exceptionDetails !== undefined)
		throw new Error(
			`CDP 求值出错：${JSON.stringify(record.exceptionDetails).slice(0, 300)}`,
		);
	const inner = record.result;
	if (typeof inner !== "object" || inner === null)
		return undefined;
	return (inner as { value?: unknown }).value;
}

const EVAL_TIMEOUT_MS = 12000;
const CONTEXT_TIMEOUT_MS = 8000;

interface IsolatedSession {
	evaluate(expression: string): Promise<unknown>;
	close(): void;
}

/**
 * 连接页签的 CDP 会话，找到本扩展 content script 的 isolated world
 * （全局上带有 EXTENSION_MARKER 的上下文），在其上串行求值。
 */
async function openIsolatedSession(
	wsUrl: string,
): Promise<IsolatedSession> {
	const ws = new WebSocket(wsUrl);
	await new Promise<void>((resolve, reject) => {
		ws.onopen = () => resolve();
		ws.onerror = () =>
			reject(new Error(`WebSocket 连接失败：${wsUrl}`));
	});

	const pending = new Map<
		number,
		(message: unknown) => void
	>();
	const contexts: CdpContext[] = [];
	let nextId = 1;

	ws.onmessage = (event) => {
		const message: unknown = JSON.parse(String(event.data));
		if (typeof message !== "object" || message === null)
			return;
		const record = message as {
			method?: unknown;
			params?: unknown;
			id?: unknown;
		};
		if (
			record.method === "Runtime.executionContextCreated"
		) {
			const context = extractContext(record.params);
			if (context) contexts.push(context);
			return;
		}
		const id = record.id;
		if (typeof id === "number" && pending.has(id)) {
			pending.get(id)?.(message);
			pending.delete(id);
		}
	};

	const send = (
		method: string,
		params: Record<string, unknown>,
	): Promise<unknown> =>
		new Promise((resolve, reject) => {
			const id = nextId;
			nextId += 1;
			const timer = setTimeout(() => {
				pending.delete(id);
				reject(new Error(`CDP 求值超时：${method}`));
			}, EVAL_TIMEOUT_MS);
			pending.set(id, (message) => {
				clearTimeout(timer);
				resolve(message);
			});
			ws.send(JSON.stringify({ id, method, params }));
		});

	await send("Runtime.enable", {});

	const probe = `globalThis[${JSON.stringify(EXTENSION_MARKER_KEY)}] ?? null`;
	let contextId: number | null = null;
	const deadline = Date.now() + CONTEXT_TIMEOUT_MS;
	while (contextId === null && Date.now() < deadline) {
		await sleep(300);
		for (const context of contexts) {
			if (context.type !== "isolated") continue;
			try {
				const value = extractValue(
					await send("Runtime.evaluate", {
						expression: probe,
						contextId: context.id,
						returnByValue: true,
					}),
				);
				if (value === EXTENSION_MARKER) {
					contextId = context.id;
					break;
				}
			} catch {
				// 上下文可能已被页面导航销毁，换下一个继续试
			}
		}
	}
	if (contextId === null)
		throw new Error(
			"未找到本扩展的 content script 上下文（扩展未加载或未注入）",
		);

	return {
		evaluate: async (expression) =>
			extractValue(
				await send("Runtime.evaluate", {
					expression,
					contextId,
					returnByValue: true,
					awaitPromise: true,
				}),
			),
		close: () => ws.close(),
	};
}

// —— 页面探针 ——

// 在扩展上下文里执行的 storage 读写（content script 有 storage 权限）
const setToggles = (locale: LocaleId): string =>
	`chrome.storage.local.set({ enabled: true, devMode: true, locale: ${JSON.stringify(locale)} }).then(() => true)`;
const READ_MISS_LOG =
	"chrome.storage.local.get('missLog').then((d) => (Array.isArray(d.missLog) ? d.missLog : []))";
const CLEAR_MISS_LOG =
	"chrome.storage.local.set({ missLog: [] }).then(() => true)";

/**
 * 各语言的翻译探针锚点：头部「登录 / 注册」链接是全站必渲染的稳定锚点，
 * 匿名页面同样生效。判据不能写死中文（旧版硬编码「注册 / 登录」与 CJK 计数，
 * 换成任何别的语言都会判成「翻译未生效」）。
 */
export const PROBE_ANCHORS: Readonly<
	Record<LocaleId, { signIn: string; signUp: string }>
> = {
	"zh-CN": { signIn: "登录", signUp: "注册" },
	ja: { signIn: "サインイン", signUp: "サインアップ" },
};

/** 统计正文里属于该语言文字系统的字符数（拉丁语系目标无从判定，记 0） */
function scriptCountExpression(locale: LocaleId): string {
	const scripts = getLocaleMeta(locale).scripts;
	if (scripts.length === 0) return "0";
	const source = `[${scripts
		.map((script) => `\\p{Script=${script}}`)
		.join("")}]`;
	return `(document.body.innerText.match(new RegExp(${JSON.stringify(source)}, 'gu')) || []).length`;
}

/** 生成在页面上下文里执行的探针表达式（按目标语言参数化） */
export function probeExpression(locale: LocaleId): string {
	const anchors = PROBE_ANCHORS[locale];
	return `(() => { const links = [...document.querySelectorAll('a')].map((a) => (a.innerText || '').trim()); return { signUp: links.filter((x) => x === ${JSON.stringify(anchors.signUp)}).length, signIn: links.filter((x) => x === ${JSON.stringify(anchors.signIn)}).length, scriptChars: ${scriptCountExpression(locale)} }; })()`;
}

interface ProbeResult {
	signUp: number;
	signIn: number;
	scriptChars: number;
}

function narrowProbe(value: unknown): ProbeResult | null {
	if (typeof value !== "object" || value === null)
		return null;
	const record = value as {
		signUp?: unknown;
		signIn?: unknown;
		scriptChars?: unknown;
	};
	const { signUp, signIn, scriptChars } = record;
	if (
		typeof signUp !== "number" ||
		typeof signIn !== "number" ||
		typeof scriptChars !== "number"
	)
		return null;
	return { signUp, signIn, scriptChars };
}

export interface PageProbe {
	url: string;
	misses: MissItem[];
	translated: boolean | null;
	scriptChars: number | null;
	error: string | null;
}

const FIRST_PAGE_BOOT_MS = 6000;
const RELOAD_SETTLE_MS = 11000;

async function probePage(input: {
	port: number;
	url: string;
	dwell: number;
	first: boolean;
	locale: LocaleId;
}): Promise<PageProbe> {
	const { port, url, dwell, first, locale } = input;
	const probe: PageProbe = {
		url,
		misses: [],
		translated: null,
		scriptChars: null,
		error: null,
	};
	let tabId: string | null = null;
	try {
		const created = narrowTargets(
			await cdpJson(port, `/json/new?${url}`, "PUT"),
		);
		const tab = created[0];
		if (!tab) throw new Error(`页签创建失败：${url}`);
		tabId = tab.id;
		await sleep(first ? FIRST_PAGE_BOOT_MS : dwell);

		const targets = narrowTargets(
			await cdpJson(port, "/json/list"),
		);
		const current = targets.find(
			(t) =>
				t.id === tabId && t.webSocketDebuggerUrl !== null,
		);
		if (!current?.webSocketDebuggerUrl)
			throw new Error("页签目标不存在或缺少调试地址");

		if (first) {
			// 先开开发者模式（触发整页刷新），等刷新与两轮落盘后再读
			const setup = await openIsolatedSession(
				current.webSocketDebuggerUrl,
			);
			try {
				await setup.evaluate(setToggles(locale));
			} finally {
				setup.close();
			}
			await sleep(RELOAD_SETTLE_MS);
		}

		const session = await openIsolatedSession(
			current.webSocketDebuggerUrl,
		);
		try {
			probe.misses = narrowMisses(
				await session.evaluate(READ_MISS_LOG),
			);
			await session.evaluate(CLEAR_MISS_LOG);
			const pageResult = narrowProbe(
				await session.evaluate(probeExpression(locale)),
			);
			if (pageResult) {
				probe.translated =
					pageResult.signUp + pageResult.signIn > 0;
				probe.scriptChars = pageResult.scriptChars;
			}
		} finally {
			session.close();
		}
	} catch (error) {
		probe.error =
			error instanceof Error
				? error.message
				: String(error);
	} finally {
		if (tabId !== null)
			await fetch(
				`http://127.0.0.1:${port}/json/close/${tabId}`,
			).catch(() => {});
	}
	return probe;
}

async function cdpJson(
	port: number,
	path: string,
	method = "GET",
): Promise<unknown> {
	const response = await fetch(
		`http://127.0.0.1:${port}${path}`,
		{
			method,
		},
	);
	if (!response.ok)
		throw new Error(
			`CDP 请求失败：${path}（HTTP ${response.status}）`,
		);
	return (await response.json()) as unknown;
}

// —— 环境解析与主流程 ——

const BROWSER_CANDIDATES = [
	"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
	"C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
	"C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
	"C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
];

async function pathExists(path: string): Promise<boolean> {
	try {
		await access(path);
		return true;
	} catch {
		return false;
	}
}

/**
 * 指定浏览器可执行文件的环境变量名。
 * 仓库从 Github-ZH 改名为 Github-i18n 后，新名优先、旧名继续兜底——
 * 别人本机（或 CI secrets）里存的还是旧名，不该因为一次改名就失效。
 */
const BROWSER_PATH_ENV = "GITHUB_I18N_BROWSER_PATH";
const LEGACY_BROWSER_PATH_ENV = "GITHUB_ZH_BROWSER_PATH";

async function resolveBrowser(
	flagValue?: string,
): Promise<string> {
	const candidates = [
		flagValue,
		process.env[BROWSER_PATH_ENV],
		process.env[LEGACY_BROWSER_PATH_ENV],
		...BROWSER_CANDIDATES,
	].filter(
		(path): path is string => typeof path === "string",
	);
	for (const candidate of candidates) {
		if (await pathExists(candidate)) return candidate;
	}
	throw new Error(
		`找不到浏览器可执行文件（--browser 或 ${BROWSER_PATH_ENV} 可指定，旧名 ${LEGACY_BROWSER_PATH_ENV} 仍兼容）`,
	);
}

async function waitForDevtoolsPort(
	profile: string,
	timeoutMs: number,
): Promise<number> {
	const filePath = join(profile, "DevToolsActivePort");
	const deadline = Date.now() + timeoutMs;
	while (Date.now() < deadline) {
		try {
			const text = await readFile(filePath, "utf8");
			const port = Number.parseInt(
				text.split("\n")[0]?.trim() ?? "",
				10,
			);
			if (Number.isInteger(port) && port > 0) return port;
		} catch {
			// 端口文件尚未生成，继续等
		}
		await sleep(300);
	}
	throw new Error(
		"等待浏览器 DevTools 端口超时（浏览器启动失败？）",
	);
}

export interface VerifyReport {
	schema: "github-zh-misses/1";
	source: "verify-live/1";
	exportedAt: string;
	browser: string;
	/** 本次探针使用的目标语言 */
	locale: LocaleId;
	pages: {
		url: string;
		translated: boolean | null;
		/** 正文里属于目标语言文字系统的字符数 */
		scriptChars: number | null;
		missCount: number;
		error: string | null;
	}[];
	items: MissItem[];
}

/** 全流程：拉起浏览器 → 逐页探针 → 汇总漏翻 → 返回报告 JSON */
export async function runVerify(
	options: VerifyOptions,
): Promise<VerifyReport> {
	if (process.platform !== "win32")
		throw new Error(
			"verify-live 仅支持 Windows（浏览器清理依赖 taskkill）",
		);

	const distDir = fileURLToPath(
		new URL("../dist", import.meta.url),
	);
	const manifestPath = join(distDir, "manifest.json");
	if (!(await pathExists(manifestPath)))
		throw new Error(
			"dist/ 不存在或缺少 manifest.json，请先 bun run build",
		);

	const browser = await resolveBrowser(options.browser);
	const pages = options.pagesFile
		? parsePagesFile(
				await readFile(options.pagesFile, "utf8"),
			)
		: DEFAULT_PAGES;
	if (pages.length === 0) throw new Error("页面清单为空");

	const profile = await mkdtemp(
		join(tmpdir(), "ghzh-verify-"),
	);
	const launched = Bun.spawn(
		[
			browser,
			...(options.headed ? [] : ["--headless=new"]),
			"--remote-debugging-port=0",
			`--user-data-dir=${profile}`,
			"--no-first-run",
			"--no-default-browser-check",
			`--disable-extensions-except=${distDir}`,
			`--load-extension=${distDir}`,
			"--window-size=1440,900",
			"about:blank",
		],
		{ stdout: "ignore", stderr: "ignore" },
	);

	try {
		const port = await waitForDevtoolsPort(profile, 20000);
		await waitForHttp(
			`http://127.0.0.1:${port}/json/version`,
			10000,
		);

		const pageProbes: PageProbe[] = [];
		for (const [index, pageUrl] of pages.entries()) {
			pageProbes.push(
				await probePage({
					port,
					url: pageUrl,
					dwell: options.dwell,
					first: index === 0,
					locale: options.locale,
				}),
			);
		}

		const failed = pageProbes.filter(
			(page) => page.error !== null,
		);
		if (failed.length === pageProbes.length)
			throw new Error(
				`所有页面探针失败，首个错误：${failed[0]?.error ?? "未知"}`,
			);
		if (
			!pageProbes.some((page) => page.translated === true)
		)
			throw new Error(
				"翻译探针未通过：没有任何页面出现已翻译的导航锚点，扩展可能未生效",
			);

		return {
			schema: "github-zh-misses/1",
			source: "verify-live/1",
			exportedAt: new Date().toISOString(),
			browser,
			locale: options.locale,
			pages: pageProbes.map((page) => ({
				url: page.url,
				translated: page.translated,
				scriptChars: page.scriptChars,
				missCount: page.misses.length,
				error: page.error,
			})),
			items: aggregateMisses(
				pageProbes.map((page) => page.misses),
			),
		};
	} finally {
		await Bun.spawn(
			[
				"taskkill",
				"/PID",
				String(launched.pid),
				"/T",
				"/F",
			],
			{ stdout: "ignore", stderr: "ignore" },
		).exited;
		if (options.keep)
			console.error(`用户数据目录保留：${profile}`);
		else
			await rm(profile, {
				recursive: true,
				force: true,
			}).catch(() => {});
	}
}

async function waitForHttp(
	url: string,
	timeoutMs: number,
): Promise<void> {
	const deadline = Date.now() + timeoutMs;
	while (Date.now() < deadline) {
		try {
			await fetch(url);
			return;
		} catch {
			await sleep(300);
		}
	}
	throw new Error(`等待 ${url} 超时`);
}

if (import.meta.main) {
	try {
		const options = parseArgs(Bun.argv.slice(2));
		const report = await runVerify(options);
		const json = JSON.stringify(report, null, 2);
		if (options.out) {
			await mkdir(dirname(options.out), {
				recursive: true,
			}).catch(() => {});
			await writeFile(options.out, json, "utf8");
			const total = report.items.length;
			console.log(
				`已写出 ${options.out}（漏翻共 ${total} 条）`,
			);
		} else {
			console.log(json);
		}
	} catch (error) {
		console.error(
			error instanceof Error
				? error.message
				: String(error),
		);
		process.exitCode = 1;
	}
}
