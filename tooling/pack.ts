// dist/ 压 zip：零依赖 store 模式（不压缩），Chrome Web Store / Edge Add-ons 通用
// 商店要求 zip 根目录直接包含 manifest.json；打包逻辑导出为纯函数供测试复用

import {
	existsSync,
	readdirSync,
	readFileSync,
	writeFileSync,
} from "node:fs";
import { join, relative } from "node:path";
import packageJson from "../package.json";

const ROOT = join(import.meta.dir, "..");

export interface ZipEntry {
	/** zip 内相对路径，固定用 / 分隔 */
	name: string;
	data: Uint8Array;
}

/** CRC-32（IEEE 802.3），与 PNG / ZIP 通用 */
const CRC_TABLE = (() => {
	const table = new Uint32Array(256);
	for (let n = 0; n < 256; n++) {
		let c = n;
		for (let k = 0; k < 8; k++) {
			c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
		}
		table[n] = c;
	}
	return table;
})();

export function crc32(data: Uint8Array): number {
	let crc = 0xffffffff;
	for (const byte of data) {
		// 查表 0..255 全量填充，?? 0 仅为满足索引类型收窄
		const slot = CRC_TABLE[(crc ^ byte) & 0xff] ?? 0;
		crc = slot ^ (crc >>> 8);
	}
	return (crc ^ 0xffffffff) >>> 0;
}

/** 递归收集目录下全部文件（zip 内路径用 / 分隔，按名称排序保证确定性） */
export function collectFiles(root: string): ZipEntry[] {
	const entries: ZipEntry[] = [];
	const walk = (dir: string) => {
		for (const item of readdirSync(dir, {
			withFileTypes: true,
		})) {
			const full = join(dir, item.name);
			if (item.isDirectory()) {
				walk(full);
				continue;
			}
			entries.push({
				name: relative(root, full).replaceAll("\\", "/"),
				data: readFileSync(full),
			});
		}
	};
	walk(root);
	return entries.sort((a, b) => (a.name < b.name ? -1 : 1));
}

function dosDateTime(date: Date): {
	time: number;
	day: number;
} {
	const time =
		(date.getHours() << 11) |
		(date.getMinutes() << 5) |
		Math.floor(date.getSeconds() / 2);
	const day =
		((date.getFullYear() - 1980) << 9) |
		((date.getMonth() + 1) << 5) |
		date.getDate();
	return { time, day };
}

/**
 * 打包为 zip 字节流（store 模式：local header + 数据 ×N → central directory → EOCD）
 * flags 0x0800 声明 UTF-8 文件名；时间默认取当前时刻。
 */
export function buildZip(
	entries: readonly ZipEntry[],
	now = new Date(),
): Uint8Array {
	if (entries.length === 0)
		throw new Error("没有可打包的文件");
	const { time, day } = dosDateTime(now);
	// 名称与条目绑定为同一序列，避免索引访问的 undefined 收窄噪音
	const packed = entries.map((entry) => ({
		entry,
		name: Buffer.from(entry.name, "utf8"),
		offset: 0,
	}));
	const localSize = packed.reduce(
		(sum, item) =>
			sum + 30 + item.name.length + item.entry.data.length,
		0,
	);
	const centralSize = packed.reduce(
		(sum, item) => sum + 46 + item.name.length,
		0,
	);
	const total = localSize + centralSize + 22;
	const buffer = Buffer.alloc(total);
	const view = new DataView(
		buffer.buffer,
		buffer.byteOffset,
		buffer.byteLength,
	);
	let pos = 0;
	for (const item of packed) {
		item.offset = pos;
		view.setUint32(pos, 0x04034b50, true); // local file header 签名
		view.setUint16(pos + 4, 20, true); // version needed
		view.setUint16(pos + 6, 0x0800, true); // flags：UTF-8 文件名
		view.setUint16(pos + 8, 0, true); // method：store
		view.setUint16(pos + 10, time, true);
		view.setUint16(pos + 12, day, true);
		view.setUint32(pos + 14, crc32(item.entry.data), true);
		view.setUint32(pos + 18, item.entry.data.length, true);
		view.setUint32(pos + 22, item.entry.data.length, true);
		view.setUint16(pos + 26, item.name.length, true);
		view.setUint16(pos + 28, 0, true); // extra 长度
		buffer.set(item.name, pos + 30);
		buffer.set(
			item.entry.data,
			pos + 30 + item.name.length,
		);
		pos += 30 + item.name.length + item.entry.data.length;
	}
	const centralOffset = pos;
	for (const item of packed) {
		view.setUint32(pos, 0x02014b50, true); // central directory 签名
		view.setUint16(pos + 4, 20, true); // version made by
		view.setUint16(pos + 6, 20, true); // version needed
		view.setUint16(pos + 8, 0x0800, true);
		view.setUint16(pos + 10, 0, true); // method：store
		view.setUint16(pos + 12, time, true);
		view.setUint16(pos + 14, day, true);
		view.setUint32(pos + 16, crc32(item.entry.data), true);
		view.setUint32(pos + 20, item.entry.data.length, true);
		view.setUint32(pos + 24, item.entry.data.length, true);
		view.setUint16(pos + 28, item.name.length, true);
		view.setUint32(pos + 42, item.offset, true);
		buffer.set(item.name, pos + 46);
		pos += 46 + item.name.length;
	}
	view.setUint32(pos, 0x06054b50, true); // EOCD 签名
	view.setUint16(pos + 8, entries.length, true);
	view.setUint16(pos + 10, entries.length, true);
	view.setUint32(
		pos + 12,
		total - centralOffset - 22,
		true,
	);
	view.setUint32(pos + 16, centralOffset, true);
	return new Uint8Array(buffer);
}

function main(): void {
	const dist = join(ROOT, "dist");
	if (!existsSync(dist)) {
		console.error(
			"dist/ 不存在：先运行 bun run build 再打包",
		);
		process.exitCode = 1;
		return;
	}
	const entries = collectFiles(dist);
	if (
		!entries.some((entry) => entry.name === "manifest.json")
	) {
		console.error(
			"dist/ 缺少 manifest.json：构建产物不完整，请重新构建",
		);
		process.exitCode = 1;
		return;
	}
	const zip = buildZip(entries);
	const outPath = join(
		ROOT,
		`github-i18n-v${String(packageJson.version)}.zip`,
	);
	writeFileSync(outPath, zip);
	console.log(
		`已打包 ${outPath}（${entries.length} 个文件，${zip.length} 字节，store 模式）`,
	);
}

if (import.meta.main) main();
