import { describe, expect, it } from "bun:test";
import type { MissItem } from "../../shared/types.ts";
import {
	isEnabled,
	mergeMissLogs,
	missKey,
	serializeMisses,
	setEnabled,
	sortMisses,
	upsertMiss,
} from "../collector.ts";

function item(overrides: Partial<MissItem> = {}): MissItem {
	return {
		kind: "text",
		text: "Some English Text",
		path: "/owner/repo",
		count: 1,
		...overrides,
	};
}

describe("missKey", () => {
	it("separates kinds sharing the same text", () => {
		expect(missKey("text", "Star")).not.toBe(
			missKey("title", "Star"),
		);
		expect(missKey("text", "Star")).toBe("text\u0000Star");
	});
});

describe("upsertMiss", () => {
	it("inserts a new entry with count 1", () => {
		const buffer = new Map<string, MissItem>();
		upsertMiss(buffer, "text", "Star", "/repo", 10);
		expect(buffer.size).toBe(1);
		expect(buffer.get(missKey("text", "Star"))).toEqual(
			item({ text: "Star", path: "/repo" }),
		);
	});

	it("accumulates count and keeps the first path", () => {
		const buffer = new Map<string, MissItem>();
		upsertMiss(buffer, "text", "Star", "/repo/pulls", 10);
		upsertMiss(buffer, "text", "Star", "/repo/issues", 10);
		expect(buffer.get(missKey("text", "Star"))).toEqual(
			item({ text: "Star", path: "/repo/pulls", count: 2 }),
		);
	});

	it("distinguishes kinds of the same text", () => {
		const buffer = new Map<string, MissItem>();
		upsertMiss(buffer, "text", "Star", "/repo", 10);
		upsertMiss(buffer, "title", "Star", "/repo", 10);
		expect(buffer.size).toBe(2);
	});

	it("drops new keys at cap but still counts existing ones", () => {
		const buffer = new Map<string, MissItem>();
		upsertMiss(buffer, "text", "First", "/repo", 2);
		upsertMiss(buffer, "text", "Second", "/repo", 2);
		expect(buffer.size).toBe(2);
		upsertMiss(buffer, "text", "Third", "/repo", 2);
		expect(buffer.size).toBe(2);
		upsertMiss(buffer, "text", "First", "/repo", 2);
		expect(
			buffer.get(missKey("text", "First"))?.count,
		).toBe(2);
	});
});

describe("mergeMissLogs", () => {
	it("accumulates counts and keeps the persisted path", () => {
		const existing = [item({ path: "/repo", count: 3 })];
		const incoming = [
			item({ path: "/repo/pulls", count: 2 }),
		];
		const merged = mergeMissLogs(existing, incoming, 10);
		expect(merged).toEqual([
			item({ path: "/repo", count: 5 }),
		]);
	});

	it("appends unseen entries", () => {
		const existing = [item({ text: "First" })];
		const incoming = [item({ text: "Second", path: "/x" })];
		const merged = mergeMissLogs(existing, incoming, 10);
		expect(merged).toHaveLength(2);
		expect(merged).toContainEqual(
			item({ text: "Second", path: "/x" }),
		);
	});

	it("keeps previously collected entries at cap", () => {
		const existing = [item({ text: "First" })];
		const incoming = [
			item({ text: "Second" }),
			item({ text: "Third" }),
		];
		const merged = mergeMissLogs(existing, incoming, 2);
		expect(merged).toHaveLength(2);
		const texts = merged.map((entry) => entry.text);
		expect(texts).toContain("First");
		expect(texts).toContain("Second");
		expect(texts).not.toContain("Third");
	});

	it("does not mutate its inputs", () => {
		const existing = [item({ count: 1 })];
		const incoming = [item({ count: 1 })];
		mergeMissLogs(existing, incoming, 10);
		expect(existing[0]?.count).toBe(1);
		expect(incoming[0]?.count).toBe(1);
	});
});

describe("sortMisses", () => {
	it("sorts by path asc, then count desc, then text asc", () => {
		const sorted = sortMisses([
			item({ path: "/b", text: "Zeta", count: 1 }),
			item({ path: "/a", text: "Beta", count: 1 }),
			item({ path: "/b", text: "Alpha", count: 3 }),
			item({ path: "/b", text: "Alpha", count: 2 }),
			item({ path: "/a", text: "Alpha", count: 1 }),
		]);
		expect(sorted.map((entry) => entry.text)).toEqual([
			"Alpha",
			"Beta",
			"Alpha",
			"Alpha",
			"Zeta",
		]);
	});
});

describe("serializeMisses", () => {
	it("emits the github-zh-misses/1 schema in sorted key order", () => {
		const json = serializeMisses(
			[item({ text: "Zeta", path: "/b", count: 1 })],
			new Date("2026-09-25T12:00:00.000Z"),
		);
		const parsed = JSON.parse(json) as {
			schema: string;
			exportedAt: string;
			items: {
				text: string;
				kind: string;
				path: string;
				count: number;
			}[];
		};
		expect(parsed.schema).toBe("github-zh-misses/1");
		expect(parsed.exportedAt).toBe(
			"2026-09-25T12:00:00.000Z",
		);
		expect(parsed.items).toEqual([
			{
				text: "Zeta",
				kind: "text",
				path: "/b",
				count: 1,
			},
		]);
		expect(json).toContain('"text": "Zeta",');
	});

	it("sorts items by path asc, then count desc", () => {
		const json = serializeMisses(
			[
				item({ text: "B", path: "/b", count: 5 }),
				item({ text: "A", path: "/a", count: 1 }),
			],
			new Date("2026-09-25T12:00:00.000Z"),
		);
		const parsed = JSON.parse(json) as {
			items: { text: string }[];
		};
		expect(parsed.items.map((entry) => entry.text)).toEqual(
			["A", "B"],
		);
	});
});

describe("module state", () => {
	it("starts disabled", () => {
		expect(isEnabled()).toBe(false);
	});

	it("toggles via setEnabled", () => {
		setEnabled(true);
		expect(isEnabled()).toBe(true);
		setEnabled(false);
		expect(isEnabled()).toBe(false);
	});
});
