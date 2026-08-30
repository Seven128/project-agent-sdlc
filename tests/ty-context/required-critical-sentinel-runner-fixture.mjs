import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import {
  copyFile,
  cp,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const fixtureParent = await mkdtemp(
  path.join(os.tmpdir(), "ty-context-required-sentinel-test-"),
);
const childEnvironment = { ...process.env };
delete childEnvironment.NODE_TEST_CONTEXT;

export const sentinelId = "windows-finalization-tree-settlement";
export const suite = "long-task-trust";
export const ownerName = "long-task-final-authority-race.test.mjs";

export async function cleanupFixtures() {
  await rm(fixtureParent, { recursive: true, force: true });
}

export async function createFixture({
  name = "passing",
  ownerSource,
  extraFiles = {},
  reporterTransform = (source) => source,
  requiredPlatform = process.platform,
}) {
  const root = await mkdtemp(path.join(fixtureParent, `${name}-`));
  const toolsRoot = path.join(root, "tools");
  const testsRoot = path.join(root, "tests", "ty-context");
  await mkdir(toolsRoot, { recursive: true });
  await mkdir(testsRoot, { recursive: true });

  await copyFile(
    path.join(repositoryRoot, "tools", "run_required_critical_sentinel.mjs"),
    path.join(toolsRoot, "run_required_critical_sentinel.mjs"),
  );
  await copyFile(
    path.join(repositoryRoot, "tools", "test_title_inventory.mjs"),
    path.join(toolsRoot, "test_title_inventory.mjs"),
  );
  await copyFile(
    path.join(repositoryRoot, "tools", "test_suite_selection.mjs"),
    path.join(toolsRoot, "test_suite_selection.mjs"),
  );
  await cp(
    path.join(repositoryRoot, "node_modules", "acorn"),
    path.join(root, "node_modules", "acorn"),
    { recursive: true },
  );
  const policySource = await readFile(
    path.join(repositoryRoot, "tools", "test_suite_policy.mjs"),
    "utf8",
  );
  await writeFile(
    path.join(toolsRoot, "test_suite_policy.mjs"),
    setRequiredPlatform(policySource, requiredPlatform),
    "utf8",
  );
  const reporterSource = await readFile(
    path.join(
      repositoryRoot,
      "tests",
      "ty-context",
      "test-suite-file-reporter.mjs",
    ),
    "utf8",
  );
  await writeFile(
    path.join(testsRoot, "test-suite-file-reporter.mjs"),
    reporterTransform(reporterSource),
    "utf8",
  );
  await writeFile(path.join(testsRoot, ownerName), ownerSource, "utf8");
  for (const [file, source] of Object.entries(extraFiles))
    await writeFile(path.join(testsRoot, file), source, "utf8");
  return root;
}

export function passingOwner() {
  return testOwner(`[critical:${sentinelId}] passing sentinel`, "() => {}");
}

export function ordinaryOwner() {
  return testOwner("ordinary test without the selected marker", "() => {}");
}

export function testOwner(name, implementation) {
  return `import test from "node:test";\n${testDeclaration(
    name,
    implementation,
  )}\n`;
}

export function testDeclaration(name, implementation) {
  return `test(${JSON.stringify(name)}, ${implementation});`;
}

export function runFixture(root, args = [suite, sentinelId]) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [path.join(root, "tools", "run_required_critical_sentinel.mjs"), ...args],
      {
        cwd: root,
        env: childEnvironment,
        stdio: ["ignore", "pipe", "pipe"],
        windowsHide: true,
      },
    );
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.once("error", reject);
    child.once("close", (code, signal) =>
      resolve({ code, signal, stdout, stderr }),
    );
  });
}

export function finalJsonLine(output) {
  const line = output.trim().split(/\r?\n/u).filter(Boolean).at(-1);
  assert.ok(line, "runner emitted no JSON report");
  return JSON.parse(line);
}

function setRequiredPlatform(source, platform) {
  const sentinelStart = source.indexOf(
    `  criticalSentinel(\n    "${sentinelId}",`,
  );
  assert.notEqual(sentinelStart, -1, "missing sentinel policy block");
  const sentinelEnd = source.indexOf(
    "\n  criticalSentinel(",
    sentinelStart + 1,
  );
  assert.notEqual(sentinelEnd, -1, "missing next sentinel policy block");
  const block = source.slice(sentinelStart, sentinelEnd);
  const updatedBlock = replaceRequired(
    block,
    '{ requiredPlatforms: ["win32"] }',
    `{ requiredPlatforms: ["${platform}"] }`,
  );
  return `${source.slice(0, sentinelStart)}${updatedBlock}${source.slice(
    sentinelEnd,
  )}`;
}

export function replaceRequired(source, current, replacement) {
  const first = source.indexOf(current);
  assert.notEqual(first, -1, `missing fixture mutation target: ${current}`);
  assert.equal(
    source.indexOf(current, first + current.length),
    -1,
    `ambiguous fixture mutation target: ${current}`,
  );
  return `${source.slice(0, first)}${replacement}${source.slice(
    first + current.length,
  )}`;
}
