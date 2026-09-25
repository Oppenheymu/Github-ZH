// 图标生成：从 assets/icon.svg 用系统 Edge / Chrome 无头 CDP 栅格化出 public/icons/
// 零 npm 依赖。已知坑：新版无头浏览器的 --screenshot 不支持透明背景，
// 必须走 CDP（Emulation.setDefaultBackgroundColorOverride）才能拿到透明底 PNG。

import { spawn } from "node:child_process";
import {
	existsSync,
	mkdirSync,
	mkdtempSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = join(import.meta.dir, "..");
const SVG_PATH = join(ROOT, "assets", "icon.svg");
const OUT_DIR = join(ROOT, "public", "icons");
const ICON_SIZES = [16, 32, 48, 128] as const;

/** 依序探测常见浏览器安装路径；可用环境变量 GITHUB_ZH_BROWSER_PATH 覆盖 */
function findBrowser(): string {
	const candidates = [
		process.env["GITHUB_ZH_BROWSER_PATH"],
		"C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
		"C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
		"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
		"C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
		join(
			process.env["LOCALAPPDATA"] ?? "",
			"Google\\Chrome\\Application\\chrome.exe",
		),
	].filter((path): path is string => Boolean(path));
	for (const path of candidates) {
		if (path.length > 0 && existsSync(path)) return path;
	}
	throw new Error(
		"未找到 Edge / Chrome，请用环境变量 GITHUB_ZH_BROWSER_PATH 指定浏览器可执行文件路径",
	);
}

const sleep = (ms: number) =>
	new Promise((resolve) => setTimeout(resolve, ms));

/** 结束进程及其全部子进程（Windows 用 taskkill /T，其余平台用 kill） */
async function killProcessTree(
	child: ReturnType<typeof spawn>,
): Promise<void> {
	const exited = new Promise<void>((resolve) => {
		child.once("exit", () => resolve());
	});
	if (
		process.platform === "win32" &&
		child.pid !== undefined
	) {
		const { spawnSync } = await import(
			"node:child_process"
		);
		spawnSync(
			"taskkill",
			["/PID", String(child.pid), "/T", "/F"],
			{
				stdio: "ignore",
			},
		);
	} else {
		child.kill();
	}
	await Promise.race([exited, sleep(5000)]);
}

/** 从 stderr 捕捉 DevTools 端点（--remote-debugging-port=0 由浏览器自选端口） */
function waitForDevTools(
	child: ReturnType<typeof spawn>,
): Promise<string> {
	return new Promise((resolve, reject) => {
		let buffer = "";
		const timer = setTimeout(
			() =>
				reject(new Error("等待浏览器 DevTools 端口超时")),
			20000,
		);
		child.stderr?.on("data", (chunk: Buffer) => {
			buffer += String(chunk);
			const match = buffer.match(
				/DevTools listening on (ws:\/\/\S+)/,
			);
			const endpoint = match?.[1];
			if (endpoint !== undefined) {
				clearTimeout(timer);
				resolve(endpoint);
			}
		});
		child.on("exit", () => {
			clearTimeout(timer);
			reject(
				new Error(
					`浏览器进程提前退出：${buffer.slice(0, 300)}`,
				),
			);
		});
	});
}

/** 最小 CDP 客户端：只覆盖本脚本用到的 Page / Emulation 命令 */
class CdpPage {
	readonly #ws: WebSocket;
	#seq = 0;
	readonly #pending = new Map<
		number,
		(message: Record<string, unknown>) => void
	>();
	readonly #eventWaiters: {
		method: string;
		resolve: () => void;
	}[] = [];

	constructor(ws: WebSocket) {
		this.#ws = ws;
		ws.addEventListener("message", (event) => {
			const message = JSON.parse(
				String(event.data),
			) as Record<string, unknown>;
			if (typeof message["id"] === "number") {
				this.#pending.get(message["id"])?.(message);
				this.#pending.delete(message["id"]);
				return;
			}
			const method = message["method"];
			if (typeof method === "string") {
				const waiterIndex = this.#eventWaiters.findIndex(
					(waiter) => waiter.method === method,
				);
				if (waiterIndex >= 0) {
					const waiter = this.#eventWaiters.splice(
						waiterIndex,
						1,
					)[0];
					waiter?.resolve();
				}
			}
		});
	}

	send(
		method: string,
		params: Record<string, unknown> = {},
	): Promise<Record<string, unknown>> {
		return new Promise((resolve, reject) => {
			const id = ++this.#seq;
			this.#pending.set(id, (message) => {
				const error = message["error"];
				if (error !== undefined) {
					reject(
						new Error(
							`CDP ${method} 失败：${JSON.stringify(error)}`,
						),
					);
					return;
				}
				resolve(message);
			});
			this.#ws.send(JSON.stringify({ id, method, params }));
		});
	}

	/** 等待一次指定 CDP 事件（调用前注册，避免与 navigate 竞态） */
	waitEvent(
		method: string,
		timeoutMs = 10000,
	): Promise<void> {
		return new Promise((resolve, reject) => {
			const timer = setTimeout(() => {
				const index = this.#eventWaiters.findIndex(
					(waiter) => waiter.resolve === resolve,
				);
				if (index >= 0) this.#eventWaiters.splice(index, 1);
				reject(new Error(`等待事件 ${method} 超时`));
			}, timeoutMs);
			this.#eventWaiters.push({
				method,
				resolve: () => {
					clearTimeout(timer);
					resolve();
				},
			});
		});
	}
}

/** 把 SVG 包进固定尺寸、零边距的 HTML（CSS 尺寸覆盖，viewBox 等比居中） */
function wrapSvg(svg: string, size: number): string {
	const body = svg.replace(
		/<svg([^>]*)>/,
		`<svg$1 style="display:block;width:${size}px;height:${size}px">`,
	);
	return `<!doctype html><html><head><meta charset="utf-8">
<style>html,body{margin:0;padding:0;background:transparent}</style>
</head><body>${body}</body></html>`;
}

async function main(): Promise<void> {
	const browser = findBrowser();
	const svg = readFileSync(SVG_PATH, "utf8");
	mkdirSync(OUT_DIR, { recursive: true });
	const workDir = mkdtempSync(
		join(tmpdir(), "github-zh-icons-"),
	);
	const child = spawn(
		browser,
		[
			"--headless=new",
			"--disable-gpu",
			"--no-first-run",
			"--remote-debugging-port=0",
			`--user-data-dir=${join(workDir, "profile")}`,
			"about:blank",
		],
		{ stdio: ["ignore", "ignore", "pipe"] },
	);
	try {
		const wsEndpoint = await waitForDevTools(child);
		await sleep(300);
		const httpOrigin = wsEndpoint
			.replace(/^ws:\/\/([^/]+)\/.*$/, "ws://$1")
			.replace(/^ws/, "http");
		const targets = (await (
			await fetch(`${httpOrigin}/json/list`)
		).json()) as {
			type: string;
			webSocketDebuggerUrl: string;
		}[];
		const target = targets.find((t) => t.type === "page");
		if (!target)
			throw new Error(
				`未找到浏览器页面目标：${JSON.stringify(targets)}`,
			);
		const ws = new WebSocket(target.webSocketDebuggerUrl);
		await new Promise((resolve, reject) => {
			ws.addEventListener("open", resolve);
			ws.addEventListener("error", () =>
				reject(new Error("WebSocket 连接失败")),
			);
		});
		const cdp = new CdpPage(ws);
		await cdp.send("Page.enable");
		await cdp.send(
			"Emulation.setDefaultBackgroundColorOverride",
			{
				color: { r: 0, g: 0, b: 0, a: 0 },
			},
		);
		for (const size of ICON_SIZES) {
			// 视口必须逐尺寸设置：覆盖值跨导航持续有效，漏设会用上一档尺寸
			await cdp.send("Emulation.setDeviceMetricsOverride", {
				width: size,
				height: size,
				deviceScaleFactor: 1,
				mobile: false,
			});
			const htmlPath = join(workDir, `icon-${size}.html`);
			writeFileSync(htmlPath, wrapSvg(svg, size));
			const loaded = cdp.waitEvent("Page.loadEventFired");
			await cdp.send("Page.navigate", {
				url: pathToFileURL(htmlPath).href,
			});
			await loaded;
			const shot = await cdp.send(
				"Page.captureScreenshot",
				{ format: "png" },
			);
			const result = shot["result"];
			const data =
				result !== undefined && result !== null
					? (result as Record<string, unknown>)["data"]
					: undefined;
			if (typeof data !== "string")
				throw new Error("截图返回缺少 data 字段");
			const outPath = join(OUT_DIR, `icon-${size}.png`);
			writeFileSync(outPath, Buffer.from(data, "base64"));
			console.log(`已生成 icon-${size}.png`);
		}
		ws.close();
	} finally {
		// Windows 下 Edge 会派生浏览器进程树，taskkill /T 才能杀干净、释放 profile 锁
		await killProcessTree(child);
		try {
			rmSync(workDir, { recursive: true, force: true });
		} catch {
			// 浏览器未及退出时目录暂被锁定，留在系统临时区即可
		}
	}
}

if (import.meta.main) {
	await main().catch((error: unknown) => {
		console.error(
			`图标生成失败：${error instanceof Error ? error.message : String(error)}`,
		);
		process.exitCode = 1;
	});
}
