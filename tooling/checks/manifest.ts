// manifest 门禁：MV3 字段完整性 / matches / 资产与产物引用存在性
// 校验逻辑导出为纯函数供测试复用；失败置 exitCode = 1

import { existsSync } from "node:fs";
import { join } from "node:path";
import packageJson from "../../package.json";
import manifestJson from "../../public/manifest.json";

/** 校验用松散类型（真实 manifest 由 JSON 推断类型，测试手工构造缺字段场景） */
export interface ManifestLike {
	manifest_version?: number;
	name?: string;
	version?: string;
	description?: string;
	permissions?: readonly string[];
	icons?: Readonly<Record<string, string>>;
	action?: { default_popup?: string };
	content_scripts?: readonly {
		matches?: readonly string[];
		js?: readonly string[];
		run_at?: string;
	}[];
}

/** 产物文件 → 源码入口映射（改产物名时同步 build.ts 与 public/manifest.json） */
export const BUILD_OUTPUTS: Readonly<
	Record<string, string>
> = {
	"content.js": "src/content/index.ts",
	"popup.js": "src/popup/popup.ts",
};

export interface ValidateOptions {
	/** public/ 目录（静态资产基准） */
	publicDir: string;
	/** 仓库根（BUILD_OUTPUTS 的源码路径基准） */
	rootDir: string;
	/** dist/ 目录；null 表示尚未构建，跳过产物存在性断言 */
	distDir: string | null;
	packageVersion: string;
}

export function validateManifest(
	manifest: ManifestLike,
	options: ValidateOptions,
): string[] {
	const errors: string[] = [];
	if (manifest.manifest_version !== 3) {
		errors.push(
			"manifest_version 必须为 3（本项目仅支持 MV3）",
		);
	}
	if (
		typeof manifest.name !== "string" ||
		manifest.name.trim().length === 0
	) {
		errors.push("name 不能为空");
	}
	if (
		typeof manifest.description !== "string" ||
		manifest.description.trim().length === 0
	) {
		errors.push("description 不能为空");
	}
	if (manifest.version !== options.packageVersion) {
		errors.push(
			`version（${manifest.version}）须与 package.json（${options.packageVersion}）一致`,
		);
	}
	const permissions = manifest.permissions ?? [];
	if (!permissions.includes("storage")) {
		errors.push(
			"permissions 必须包含 storage（popup 开关状态存取）",
		);
	}
	for (const [size, file] of Object.entries(
		manifest.icons ?? {},
	)) {
		if (!existsSync(join(options.publicDir, file))) {
			errors.push(
				`图标 ${size}x${size} 引用的 ${file} 不存在于 public/`,
			);
		}
	}
	const popup = manifest.action?.default_popup;
	if (typeof popup !== "string" || popup.length === 0) {
		errors.push(
			"action.default_popup 缺失（popup 开关入口）",
		);
	} else if (!existsSync(join(options.publicDir, popup))) {
		errors.push(
			`action.default_popup 引用的 ${popup} 不存在于 public/`,
		);
	}
	const scripts = manifest.content_scripts ?? [];
	if (scripts.length === 0)
		errors.push("content_scripts 不能为空");
	for (const script of scripts) {
		const matches = script.matches ?? [];
		for (const required of [
			"https://github.com/*",
			"https://gist.github.com/*",
		]) {
			if (!matches.includes(required)) {
				errors.push(
					`content_scripts.matches 缺少 ${required}`,
				);
			}
		}
		if (script.run_at !== "document_start") {
			errors.push(
				"content_scripts.run_at 必须为 document_start（尽早挂观察器）",
			);
		}
		for (const file of script.js ?? []) {
			const source = BUILD_OUTPUTS[file];
			if (source === undefined) {
				errors.push(
					`content_scripts.js 引用 ${file} 不在构建映射中（同步本文件 BUILD_OUTPUTS）`,
				);
				continue;
			}
			if (!existsSync(join(options.rootDir, source))) {
				errors.push(
					`产物 ${file} 的源码入口 ${source} 不存在`,
				);
			}
			if (
				options.distDir !== null &&
				!existsSync(join(options.distDir, file))
			) {
				errors.push(
					`dist/${file} 不存在（先 bun run build 再校验）`,
				);
			}
		}
	}
	return errors;
}

function main(): void {
	const root = join(import.meta.dir, "..", "..");
	const distDir = join(root, "dist");
	const errors = validateManifest(
		manifestJson as ManifestLike,
		{
			publicDir: join(root, "public"),
			rootDir: root,
			distDir: existsSync(distDir) ? distDir : null,
			packageVersion: packageJson.version,
		},
	);
	if (errors.length > 0) {
		console.error(
			`manifest 门禁未通过（${errors.length} 处）：`,
		);
		for (const error of errors)
			console.error(`  - ${error}`);
		process.exitCode = 1;
		return;
	}
	console.log(
		"manifest 门禁通过：MV3 字段完整，资产与产物引用有效",
	);
}

if (import.meta.main) main();
