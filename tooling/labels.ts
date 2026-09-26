// 标签同步：.github/labels.yml（词表，唯一权威来源）→ GitHub 仓库标签
//
// 定位：词表进 git，仓库标签只在网页上被改就会与词表漂移（改了名忘改词表、
// 手加一个没登记的标签、换色没同步描述），本脚本负责把两边收敛回词表。
//
// 默认只增不删：词表里没写的标签原样保留，要删必须显式 --prune。原因是
// GitHub 的 `good first issue` / `help wanted` 靠名字特殊渲染（仓库首页的
// Contribute 入口），误删的代价高于收益，删除不能是默认动作。
//
// 读写都走 gh CLI（`gh label list/create/edit/delete`）而不是直接打 REST：
// gh 已处理认证、分页与中文可读的错误信息，本地与 CI 行为一致，且不需要
// 往仓库里引入任何第三方 action。
//
// 用法：
//   bun run labels               # 同步（新增 + 更新，不删除）
//   bun run labels -- --dry-run  # 只列出将要做的改动，不落盘
//   bun run labels -- --prune    # 额外删除词表里没有的标签

import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dir, "..");

/** 词表路径（相对仓库根），与 labels workflow 的 paths 触发器保持一致 */
export const LABELS_PATH = ".github/labels.yml";

/** GitHub 的字段上限：标签名 50 字符、描述 100 字符 */
const NAME_LIMIT = 50;
const DESCRIPTION_LIMIT = 100;

const LABEL_KEYS: readonly string[] = [
	"name",
	"color",
	"description",
];

export interface LabelSpec {
	readonly name: string;
	readonly color: string;
	readonly description: string;
}

/** GitHub 侧读回的现状；gh 对没有描述的标签返回 null */
export interface LabelState {
	readonly name: string;
	readonly color: string;
	readonly description: string;
}

export interface LabelUpdate {
	readonly actual: LabelState;
	readonly spec: LabelSpec;
}

export interface LabelDiff {
	readonly create: readonly LabelSpec[];
	readonly update: readonly LabelUpdate[];
	readonly unchanged: readonly LabelSpec[];
	/** 词表里没有、只在 GitHub 上存在的标签名（仅 --prune 时删除） */
	readonly prune: readonly string[];
}

function fail(where: string, message: string): never {
	throw new Error(`${where}：${message}`);
}

function describe(value: unknown): string {
	if (value === null) return "null";
	if (Array.isArray(value)) return "数组";
	return typeof value;
}

function asRecord(
	raw: unknown,
	where: string,
): Record<string, unknown> {
	if (
		raw === null ||
		typeof raw !== "object" ||
		Array.isArray(raw)
	) {
		return fail(where, `必须是对象，实为 ${describe(raw)}`);
	}
	return raw as Record<string, unknown>;
}

/**
 * 标签名大小写不敏感：GitHub 视 `Bug` 与 `bug` 为同一个标签，新建后者会直接
 * 报 already exists。故归一化后判重与比对，避免脚本在生产上才炸。
 */
function normalizeName(name: string): string {
	return name.toLowerCase();
}

/**
 * 词表原始数据 → 标签清单。拼错字段名（color 写成 colour）、漏引号导致的
 * 类型漂移（color 被 YAML 读成数字）都必须响亮失败——静默跳过的结果是
 * 「标签没建出来但脚本绿了」，最难发现的一类失效。
 */
export function buildLabels(
	raw: unknown,
	where: string,
): readonly LabelSpec[] {
	if (!Array.isArray(raw)) {
		return fail(
			where,
			`顶层必须是标签数组，实为 ${describe(raw)}`,
		);
	}
	if (raw.length === 0) fail(where, "标签数组不能为空");
	const specs: LabelSpec[] = [];
	const seen = new Set<string>();
	raw.forEach((item, index) => {
		const at = `${where} [${index}]`;
		const record = asRecord(item, at);
		for (const key of Object.keys(record)) {
			if (!LABEL_KEYS.includes(key)) {
				fail(
					at,
					`未知字段 ${JSON.stringify(key)}（允许：${LABEL_KEYS.join(" / ")}）`,
				);
			}
		}
		const name = record["name"];
		if (typeof name !== "string") {
			fail(
				`${at} name`,
				`必须是字符串，实为 ${describe(name)}`,
			);
		}
		if (name.trim() !== name || name.length === 0) {
			fail(
				`${at} name`,
				`首尾不得有空白且不能为空：${JSON.stringify(name)}`,
			);
		}
		if (name.length > NAME_LIMIT) {
			fail(
				`${at} name`,
				`超过 GitHub 上限 ${NAME_LIMIT} 字符：${JSON.stringify(name)}`,
			);
		}
		const key = normalizeName(name);
		if (seen.has(key)) {
			fail(
				`${at} name`,
				`标签名重复（大小写不敏感）：${JSON.stringify(name)}`,
			);
		}
		seen.add(key);
		// 不加引号的 color 会被 YAML 读成数字（ff0000 又不合法），故此处只收字符串
		const color = record["color"];
		if (typeof color !== "string") {
			fail(
				`${at} color`,
				`必须是字符串（词表里请加引号），实为 ${describe(color)}`,
			);
		}
		if (!/^[0-9a-fA-F]{6}$/.test(color)) {
			fail(
				`${at} color`,
				`必须是 6 位十六进制且不带 #：${JSON.stringify(color)}`,
			);
		}
		const description = record["description"];
		if (typeof description !== "string") {
			fail(
				`${at} description`,
				`必须是字符串，实为 ${describe(description)}`,
			);
		}
		if (description.length > DESCRIPTION_LIMIT) {
			fail(
				`${at} description`,
				`超过 GitHub 上限 ${DESCRIPTION_LIMIT} 字符`,
			);
		}
		specs.push({
			name,
			color: color.toLowerCase(),
			description,
		});
	});
	return specs;
}

/** gh label list 的 JSON → 现状清单（description 为 null 时归一为空串） */
export function parseLabelState(
	raw: unknown,
	where: string,
): readonly LabelState[] {
	if (!Array.isArray(raw)) {
		return fail(where, `必须是数组，实为 ${describe(raw)}`);
	}
	return raw.map((item, index) => {
		const at = `${where} [${index}]`;
		const record = asRecord(item, at);
		const name = record["name"];
		const color = record["color"];
		const description = record["description"];
		if (typeof name !== "string" || name.length === 0) {
			fail(`${at} name`, "必须是字符串");
		}
		if (typeof color !== "string") {
			fail(`${at} color`, "必须是字符串");
		}
		if (
			description !== null &&
			typeof description !== "string"
		) {
			fail(
				`${at} description`,
				`必须是字符串或 null，实为 ${describe(description)}`,
			);
		}
		return {
			name,
			color: color.toLowerCase(),
			description: description ?? "",
		};
	});
}

/** 词表与现状比对：先按大小写不敏感的名字配对，再逐字段判是否要动 */
export function diffLabels(
	desired: readonly LabelSpec[],
	actual: readonly LabelState[],
): LabelDiff {
	const stateByName = new Map<string, LabelState>();
	for (const state of actual) {
		stateByName.set(normalizeName(state.name), state);
	}
	const create: LabelSpec[] = [];
	const update: LabelUpdate[] = [];
	const unchanged: LabelSpec[] = [];
	for (const spec of desired) {
		const state = stateByName.get(normalizeName(spec.name));
		if (state === undefined) {
			create.push(spec);
			continue;
		}
		stateByName.delete(normalizeName(spec.name));
		const same =
			state.name === spec.name &&
			state.color === spec.color &&
			state.description === spec.description;
		if (same) {
			unchanged.push(spec);
			continue;
		}
		update.push({ actual: state, spec });
	}
	// 剩下的就是只在 GitHub 上存在的标签
	const prune = [...stateByName.values()]
		.map((state) => state.name)
		.sort();
	return { create, update, unchanged, prune };
}

/** 一行说明某个标签为什么要改（供 --dry-run 与同步日志共用） */
export function describeUpdate(
	update: LabelUpdate,
): string {
	const { actual, spec } = update;
	const reasons: string[] = [];
	if (actual.name !== spec.name) {
		reasons.push(`改名 ${actual.name} → ${spec.name}`);
	}
	if (actual.color !== spec.color) {
		reasons.push(`色 ${actual.color} → ${spec.color}`);
	}
	if (actual.description !== spec.description) {
		reasons.push("描述");
	}
	return reasons.join("，");
}

function gh(args: readonly string[]): string {
	const result = Bun.spawnSync({
		cmd: ["gh", ...args],
		stdout: "pipe",
		stderr: "pipe",
	});
	if (result.exitCode !== 0) {
		const detail = result.stderr.toString().trim();
		throw new Error(
			`gh ${args.join(" ")} 失败：${detail.length > 0 ? detail : `退出码 ${String(result.exitCode)}`}`,
		);
	}
	return result.stdout.toString();
}

/** 读词表；YAML 语法错误也收成中文错误，避免只吐一坨 parser 栈 */
export function readSpecs(
	path = join(ROOT, LABELS_PATH),
): readonly LabelSpec[] {
	let text: string;
	try {
		text = readFileSync(path, "utf8");
	} catch (error) {
		return fail(LABELS_PATH, `读取失败：${String(error)}`);
	}
	let raw: unknown;
	try {
		raw = Bun.YAML.parse(text);
	} catch (error) {
		return fail(
			LABELS_PATH,
			`YAML 解析失败：${String(error)}`,
		);
	}
	return buildLabels(raw, LABELS_PATH);
}

function readState(): readonly LabelState[] {
	const json = gh([
		"label",
		"list",
		"--limit",
		"200",
		"--json",
		"name,color,description",
	]);
	const parsed: unknown = JSON.parse(json);
	return parseLabelState(parsed, "gh label list");
}

function applyDiff(diff: LabelDiff, prune: boolean): void {
	for (const spec of diff.create) {
		gh([
			"label",
			"create",
			spec.name,
			"--color",
			spec.color,
			"--description",
			spec.description,
		]);
	}
	for (const { actual, spec } of diff.update) {
		// gh 的 edit 支持 --name 改名，大小写纠偏也走这条
		gh([
			"label",
			"edit",
			actual.name,
			"--name",
			spec.name,
			"--color",
			spec.color,
			"--description",
			spec.description,
		]);
	}
	if (!prune) return;
	for (const name of diff.prune) {
		gh(["label", "delete", name, "--yes"]);
	}
}

const KNOWN_FLAGS: readonly string[] = [
	"--dry-run",
	"-n",
	"--prune",
];

function main(): void {
	const argv = process.argv.slice(2);
	for (const arg of argv) {
		if (!KNOWN_FLAGS.includes(arg)) {
			console.error(
				`未知参数 ${JSON.stringify(arg)}（可用：--dry-run / -n / --prune）`,
			);
			process.exitCode = 1;
			return;
		}
	}
	const dryRun =
		argv.includes("--dry-run") || argv.includes("-n");
	const prune = argv.includes("--prune");
	const specs = readSpecs();
	const diff = diffLabels(specs, readState());
	console.log(
		`词表 ${LABELS_PATH} 共 ${String(specs.length)} 个标签：新增 ${String(diff.create.length)}、更新 ${String(diff.update.length)}、未变 ${String(diff.unchanged.length)}、仅远端存在 ${String(diff.prune.length)}`,
	);
	for (const spec of diff.create) {
		console.log(`  + ${spec.name}（#${spec.color}）`);
	}
	for (const item of diff.update) {
		console.log(
			`  ~ ${item.spec.name}：${describeUpdate(item)}`,
		);
	}
	if (diff.prune.length > 0) {
		const verb = prune
			? "删除"
			: "保留（要删除请加 --prune）";
		console.log(`  - ${verb}：${diff.prune.join("、")}`);
	}
	if (dryRun) {
		console.log("--dry-run：未对仓库做任何改动");
		return;
	}
	if (
		diff.create.length === 0 &&
		diff.update.length === 0 &&
		!(prune && diff.prune.length > 0)
	) {
		console.log("仓库标签已与词表一致，无需改动");
		return;
	}
	applyDiff(diff, prune);
	console.log("同步完成");
}

if (import.meta.main) {
	try {
		main();
	} catch (error) {
		console.error(
			error instanceof Error
				? error.message
				: String(error),
		);
		process.exitCode = 1;
	}
}
