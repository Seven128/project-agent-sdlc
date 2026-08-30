import assert from "node:assert/strict";
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
import { fileURLToPath, pathToFileURL } from "node:url";
import { runOwnedChildProcess } from "./helpers/owned-child-process.mjs";

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
  runnerTransform = (source) => source,
  requiredPlatform = process.platform,
}) {
  const root = await mkdtemp(path.join(fixtureParent, `${name}-`));
  const toolsRoot = path.join(root, "tools");
  const testsRoot = path.join(root, "tests", "ty-context");
  await mkdir(toolsRoot, { recursive: true });
  await mkdir(testsRoot, { recursive: true });

  const runnerSource = await readFile(
    path.join(repositoryRoot, "tools", "run_required_critical_sentinel.mjs"),
    "utf8",
  );
  const processOwnerUrl = pathToFileURL(
    path.join(
      repositoryRoot,
      "packages",
      "ty-context",
      "dist",
      "lib",
      "long-task-command-process.js",
    ),
  ).href;
  await writeFile(
    path.join(toolsRoot, "run_required_critical_sentinel.mjs"),
    runnerTransform(
      replaceRequired(
        runnerSource,
        '"../packages/ty-context/dist/lib/long-task-command-process.js"',
        JSON.stringify(processOwnerUrl),
      ),
    ),
    "utf8",
  );
  await copyFile(
    path.join(repositoryRoot, "tools", "test_title_inventory.mjs"),
    path.join(toolsRoot, "test_title_inventory.mjs"),
  );
  await copyFile(
    path.join(repositoryRoot, "tools", "test_title_static_analysis.mjs"),
    path.join(toolsRoot, "test_title_static_analysis.mjs"),
  );
  await copyFile(
    path.join(repositoryRoot, "tools", "test_title_destructuring_roles.mjs"),
    path.join(toolsRoot, "test_title_destructuring_roles.mjs"),
  );
  await copyFile(
    path.join(repositoryRoot, "tools", "test_title_module_edges.mjs"),
    path.join(toolsRoot, "test_title_module_edges.mjs"),
  );
  await copyFile(
    path.join(
      repositoryRoot,
      "tools",
      "test_title_registration_resolution.mjs",
    ),
    path.join(toolsRoot, "test_title_registration_resolution.mjs"),
  );
  await copyFile(
    path.join(repositoryRoot, "tools", "test_title_expression_roles.mjs"),
    path.join(toolsRoot, "test_title_expression_roles.mjs"),
  );
  await copyFile(
    path.join(repositoryRoot, "tools", "test_title_scope_model.mjs"),
    path.join(toolsRoot, "test_title_scope_model.mjs"),
  );
  await copyFile(
    path.join(repositoryRoot, "tools", "test_title_scope_bindings.mjs"),
    path.join(toolsRoot, "test_title_scope_bindings.mjs"),
  );
  await copyFile(
    path.join(repositoryRoot, "tools", "test_title_pattern_scope.mjs"),
    path.join(toolsRoot, "test_title_pattern_scope.mjs"),
  );
  await copyFile(
    path.join(repositoryRoot, "tools", "test_title_roles.mjs"),
    path.join(toolsRoot, "test_title_roles.mjs"),
  );
  await copyFile(
    path.join(repositoryRoot, "tools", "test_title_reference_validation.mjs"),
    path.join(toolsRoot, "test_title_reference_validation.mjs"),
  );
  await copyFile(
    path.join(repositoryRoot, "tools", "test_title_reference_exports.mjs"),
    path.join(toolsRoot, "test_title_reference_exports.mjs"),
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
  for (const [file, source] of Object.entries(extraFiles)) {
    const target = path.join(testsRoot, file);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, source, "utf8");
  }
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

export async function runFixture(root, args = [suite, sentinelId]) {
  const result = await runOwnedChildProcess(
    process.execPath,
    [path.join(root, "tools", "run_required_critical_sentinel.mjs"), ...args],
    {
      cwd: root,
      env: childEnvironment,
      timeoutMs: 60_000,
    },
  );
  return {
    code: result.status,
    signal: result.signal,
    stdout: result.stdout,
    stderr: result.stderr,
  };
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
