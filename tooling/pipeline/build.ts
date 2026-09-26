// 构建脚本：Bun.build 打包 content / popup 为 IIFE 经典脚本 + 拷贝 public/ → dist/
// 已知坑（AGENTS.md）：Bun.build 没有 outfile，产物命名靠 naming 模板；
// iife 是硬约束（MV3 content_scripts 不支持 module）

import {
	cpSync,
	watch as fsWatch,
	mkdirSync,
	renameSync,
	rmSync,
} from "node:fs";
import { join } from "node:path";

const DIST = "dist";
const ENTRIES = [
	"src/content/index.ts",
	"src/popup/popup.ts",
] as const;

/** content script 产物名由入口 basename（index）映射为 manifest 引用的 content.js */
const OUTPUT_RENAMES = new Map([
	["index.js", "content.js"],
]);

async function buildOnce(): Promise<void> {
	const result = await Bun.build({
		entrypoints: [...ENTRIES],
		outdir: DIST,
		format: "iife",
		target: "browser",
		// 不压缩：便于在浏览器里排查漏翻与误伤
		minify: false,
		sourcemap: "none",
		naming: "[name].[ext]",
	});
	if (!result.success) {
		console.error("构建失败：");
		for (const log of result.logs)
			console.error(`  ${String(log)}`);
		process.exitCode = 1;
		return;
	}
	for (const [from, to] of OUTPUT_RENAMES) {
		renameSync(join(DIST, from), join(DIST, to));
	}
	// public/ 静态资产原样拷入 dist/（manifest / popup.html / icons）
	cpSync("public", DIST, { recursive: true });
	const files = [
		...new Bun.Glob("**/*").scanSync({ cwd: DIST }),
	].sort();
	console.log(`构建完成：dist/（${files.length} 个文件）`);
}

/** --watch 模式：监听 src/ 与 public/ 变更后防抖重建 */
function startWatch(): void {
	let timer: ReturnType<typeof setTimeout> | null = null;
	const schedule = () => {
		if (timer !== null) clearTimeout(timer);
		timer = setTimeout(() => {
			timer = null;
			void buildOnce();
		}, 100);
	};
	fsWatch("src", { recursive: true }, schedule);
	fsWatch("public", { recursive: true }, schedule);
	console.log(
		"监听中：修改 src/ 或 public/ 后自动重建（扩展需在浏览器手动重载）",
	);
}

async function main(): Promise<void> {
	rmSync(DIST, { recursive: true, force: true });
	mkdirSync(DIST, { recursive: true });
	await buildOnce();
	if (process.argv.includes("--watch")) startWatch();
}

if (import.meta.main) await main();
