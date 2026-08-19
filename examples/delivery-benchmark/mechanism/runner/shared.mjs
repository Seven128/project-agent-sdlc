import { createHash } from "node:crypto";
import {
  cp,
  mkdir,
  readFile,
  readdir,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const MECHANISM_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
export const REPO_ROOT = path.resolve(MECHANISM_ROOT, "../../..");
export const BASELINE_COMMIT = "c030d02eee315d2860c6a2ff01c22887690f3684";

export async function readJson(file) {
  return JSON.parse(await readFile(file, "utf8"));
}

export async function writeJson(file, value) {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export async function loadExperimentSet() {
  return readJson(path.join(MECHANISM_ROOT, "experiment-set.json"));
}

export async function loadTask(taskId) {
  return readJson(path.join(MECHANISM_ROOT, "tasks", `${safeId(taskId)}.json`));
}

export async function loadGold(taskId) {
  return readJson(path.join(MECHANISM_ROOT, "gold", `${safeId(taskId)}.json`));
}

export async function copyFixture(outDir) {
  await cp(path.join(MECHANISM_ROOT, "fixture"), outDir, {
    recursive: true,
    force: true,
  });
}

export async function pruneFixtureForTask(outDir, task) {
  const plans = path.join(outDir, "plans");
  const authoringTests = path.join(outDir, "tests", "authoring");
  if (
    !["long-task-authoring", "long-task-delegation"].includes(task.track_family)
  ) {
    await rm(plans, { recursive: true, force: true });
    await rm(authoringTests, { recursive: true, force: true });
    return;
  }
  for (const entry of await readdir(plans)) {
    if (entry !== `${task.id}.md`)
      await rm(path.join(plans, entry), { force: true });
  }
  if (task.track_family === "long-task-delegation") {
    await rm(authoringTests, { recursive: true, force: true });
    return;
  }
  const keep = new Set(task.oracle_paths.map((value) => path.basename(value)));
  for (const entry of await readdir(authoringTests)) {
    if (!keep.has(entry))
      await rm(path.join(authoringTests, entry), { force: true });
  }
}

export function run(command, args, options = {}) {
  const invocation = platformInvocation(command, args);
  const result = spawnSync(invocation.command, invocation.args, {
    cwd: options.cwd ?? process.cwd(),
    env: options.env ?? process.env,
    encoding: "utf8",
    windowsHide: true,
    timeout: options.timeout ?? 120_000,
    maxBuffer: options.maxBuffer ?? 64 * 1024 * 1024,
  });
  if (result.error) throw result.error;
  if (result.status !== 0 && !options.allowFailure) {
    throw new Error(
      `${command} ${args.join(" ")} failed (${result.status}): ${result.stderr || result.stdout}`,
    );
  }
  return {
    status: result.status,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}

export function gitValue(cwd, args, fallback = null) {
  const result = run("git", args, { cwd, allowFailure: true });
  return result.status === 0 ? result.stdout.trim() : fallback;
}

export async function treeHash(directory, options = {}) {
  const root = path.resolve(directory);
  const records = [];
  for (const file of await listFiles(root)) {
    const relative = normalize(path.relative(root, file));
    if (
      (options.exclude ?? []).some(
        (prefix) => relative === prefix || relative.startsWith(`${prefix}/`),
      )
    )
      continue;
    const bytes = await readFile(file);
    records.push(
      `${relative}\0${createHash("sha256").update(bytes).digest("hex")}`,
    );
  }
  records.sort();
  return createHash("sha256").update(records.join("\n")).digest("hex");
}

export async function listFiles(directory) {
  const result = [];
  if (!existsSync(directory)) return result;
  async function visit(current) {
    for (const entry of await readdir(current, { withFileTypes: true })) {
      const absolute = path.join(current, entry.name);
      if (entry.isDirectory()) await visit(absolute);
      else if (entry.isFile()) result.push(absolute);
    }
  }
  await visit(directory);
  return result.sort();
}

export async function fileBytes(root, relative) {
  try {
    return (await stat(path.join(root, ...normalize(relative).split("/"))))
      .size;
  } catch {
    return 0;
  }
}

export function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonical(value[key])]),
    );
  return value;
}

export function sha256(value) {
  return createHash("sha256")
    .update(
      typeof value === "string" ? value : JSON.stringify(canonical(value)),
    )
    .digest("hex");
}

export function parseArgs(argv) {
  const options = {
    command: argv[0],
    force: false,
    skipHarnessInit: false,
    scores: [],
  };
  for (let index = 1; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--force") options.force = true;
    else if (arg === "--skip-harness-init") options.skipHarnessInit = true;
    else if (arg === "--task") options.task = need(argv, ++index, arg);
    else if (arg === "--variant") options.variant = need(argv, ++index, arg);
    else if (arg === "--out-dir") options.outDir = need(argv, ++index, arg);
    else if (arg === "--run-dir") options.runDir = need(argv, ++index, arg);
    else if (arg === "--pair-id") options.pairId = need(argv, ++index, arg);
    else if (arg === "--replicate")
      options.replicate = Number(need(argv, ++index, arg));
    else if (arg === "--model") options.model = need(argv, ++index, arg);
    else if (arg === "--reasoning")
      options.reasoning = need(argv, ++index, arg);
    else if (arg === "--provider")
      options.provider = need(argv, ++index, arg);
    else if (arg === "--harness-cli")
      options.harnessCli = need(argv, ++index, arg);
    else if (arg === "--trace") options.trace = need(argv, ++index, arg);
    else if (arg === "--out") options.out = need(argv, ++index, arg);
    else if (arg === "--baseline-score")
      options.baselineScore = need(argv, ++index, arg);
    else if (arg === "--candidate-score")
      options.candidateScore = need(argv, ++index, arg);
    else if (arg === "--score") options.scores.push(need(argv, ++index, arg));
    else if (arg === "--protocol-status")
      options.protocolStatus = need(argv, ++index, arg);
    else if (arg === "--help" || arg === "-h") options.help = true;
    else throw new Error(`unknown argument: ${arg}`);
  }
  return options;
}

export function safeId(value) {
  if (!/^[a-z0-9][a-z0-9-]*$/u.test(value ?? ""))
    throw new Error(`invalid id: ${value}`);
  return value;
}

export function normalize(value) {
  return String(value).replace(/\\/gu, "/").replace(/^\.\//u, "");
}

export function median(values) {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!sorted.length) return null;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
}

export function ratio(numerator, denominator) {
  return Number.isFinite(numerator) &&
    Number.isFinite(denominator) &&
    denominator > 0
    ? numerator / denominator
    : null;
}

export function round(value, digits = 4) {
  if (!Number.isFinite(value)) return null;
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
}

function platformInvocation(command, args) {
  if (
    process.platform !== "win32" ||
    !["npm", "npx", "pnpm", "yarn"].includes(command)
  )
    return { command, args };
  const shell = process.env.ComSpec || "cmd.exe";
  const line = [command, ...args].map(cmdQuote).join(" ");
  return { command: shell, args: ["/d", "/s", "/c", line] };
}

function cmdQuote(value) {
  const text = String(value);
  if (!/[\s&|<>^()"]/.test(text)) return text;
  return `"${text.replace(/"/gu, '""')}"`;
}

function need(argv, index, flag) {
  const value = argv[index];
  if (!value || value.startsWith("--"))
    throw new Error(`${flag} requires a value`);
  return value;
}
