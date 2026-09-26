import { describe, expect, it } from "bun:test";
import {
	mkdirSync,
	mkdtempSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildZip, collectFiles, crc32 } from "./pack.ts";

describe("crc32", () => {
	it("matches the standard check vector", () => {
		const data = new TextEncoder().encode("123456789");
		expect(crc32(data)).toBe(0xcbf43926);
	});

	it("returns 0 for the empty input", () => {
		expect(crc32(new Uint8Array(0))).toBe(0);
	});
});

describe("collectFiles", () => {
	it("collects nested files with / separators, sorted", () => {
		const root = mkdtempSync(join(tmpdir(), "pack-test-"));
		try {
			mkdirSync(join(root, "icons"));
			writeFileSync(join(root, "b.txt"), "b");
			writeFileSync(join(root, "a.txt"), "a");
			writeFileSync(join(root, "icons", "i.png"), "i");
			const names = collectFiles(root).map(
				(entry) => entry.name,
			);
			expect(names).toEqual([
				"a.txt",
				"b.txt",
				"icons/i.png",
			]);
		} finally {
			rmSync(root, { recursive: true, force: true });
		}
	});
});

describe("buildZip", () => {
	const encoder = new TextEncoder();

	it("writes store-mode local headers and an EOCD with entry count", () => {
		const zip = buildZip([
			{ name: "manifest.json", data: encoder.encode("{}") },
			{ name: "icons/i.png", data: encoder.encode("i") },
		]);
		const view = new DataView(
			zip.buffer,
			zip.byteOffset,
			zip.byteLength,
		);
		expect(view.getUint32(0, true)).toBe(0x04034b50);
		expect(view.getUint16(8, true)).toBe(0); // method：store
		const eocd = zip.length - 22;
		expect(view.getUint32(eocd, true)).toBe(0x06054b50);
		expect(view.getUint16(eocd + 10, true)).toBe(2);
	});

	it("keeps UTF-8 names intact in both directories", () => {
		const zip = buildZip([
			{ name: "icons/图标.png", data: encoder.encode("i") },
		]);
		const text = new TextDecoder().decode(zip);
		expect(text.match(/icons\/图标\.png/g)).toHaveLength(2);
	});

	it("rejects an empty entry list", () => {
		expect(() => buildZip([])).toThrow("没有可打包的文件");
	});
});
