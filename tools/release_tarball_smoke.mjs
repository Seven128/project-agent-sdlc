#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { writeReleaseTarballLongTaskFixture } from "./release_tarball_smoke_fixture.mjs";

const { tarball, portableOnly } = parseArgs(process.argv.slice(2));
const root = await mkdtemp(path.join(os.tmpdir(), "ty-context-tarball-smoke-"));

try {
  run("npm", ["init", "-y"], root);
  run("npm", ["install", "--save-dev", tarball], root);
  const installed = path.join(
    root,
    "node_modules",
    "project-tiny-context-harness",
  );
  await assertTarballContents(installed);
  run(
    "npx",
    [
      "--no-install",
      "ty-context",
      "init",
      "--adopt",
      "--harness-folder",
      ".agent",
    ],
    root,
  );
  if (existsSync(path.join(root, ".codex", "hooks.json")))
    throw new Error("portable default unexpectedly installed Codex Hooks");
  run("npx", ["--no-install", "ty-context", "doctor"], root);
  run(
    "npx",
    [
      "--no-install",
      "ty-context",
      "route",
      "--task",
      "inspect project context",
      "--term",
      "Project Goal",
      "--format",
      "json",
    ],
    root,
  );
  run(
    "npx",
    [
      "--no-install",
      "ty-context",
      "context",
      "inspect",
      "project_context/global.md",
      "--format",
      "json",
    ],
    root,
  );
  run(
    "npx",
    [
      "--no-install",
      "ty-context",
      "context",
      "create",
      "--path",
      "project_context/areas/main/scaffold.md",
      "--role",
      "domain",
      "--format",
      "json",
    ],
    root,
  );
  run(
    "npx",
    [
      "--no-install",
      "ty-context",
      "context",
      "inspect",
      "project_context/areas/main/scaffold.md",
      "--format",
      "json",
    ],
    root,
  );
  run("npx", ["--no-install", "ty-context", "validate-context"], root);

  if (!portableOnly) {
    run("npx", ["--no-install", "ty-context", "enable", "long-task"], root);
    const workdir = await writeReleaseTarballLongTaskFixture(root);
    await writeFile(path.join(root, ".gitignore"), "node_modules/\n", "utf8");
    run("git", ["init", "-b", "main"], root);
    run("git", ["config", "user.email", "tarball-smoke@example.invalid"], root);
    run("git", ["config", "user.name", "Tarball Smoke"], root);
    run("git", ["add", "."], root);
    run("git", ["commit", "-m", "tarball smoke fixture"], root);
    run(
      "npx",
      ["--no-install", "ty-context", "long-task", "compile", workdir],
      root,
    );
    run(
      "npx",
      ["--no-install", "ty-context", "long-task", "final-gate", workdir],
      root,
    );
    const result = JSON.parse(
      await readFile(
        path.join(workdir, ".ty-context", "final-receipt.json"),
        "utf8",
      ),
    );
    if (
      result.schema_version !== "long-task-final-receipt-v3" ||
      result.workflow_status !== "machine_accepted"
    ) {
      throw new Error(
        `minimal Delivery Contract smoke was not accepted: ${JSON.stringify(result)}`,
      );
    }
  }

  console.log(
    portableOnly
      ? `Tarball smoke passed: ${path.basename(tarball)}; portable init, doctor, route, create, inspect, validate-context and contents accepted.`
      : `Tarball smoke passed: ${path.basename(tarball)}; portable checks plus long-task-delivery-v2 compile and Live Final Gate accepted.`,
  );
  await rm(root, { recursive: true, force: true });
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  console.error(`Tarball smoke workspace kept at: ${root}`);
  process.exitCode = 1;
}

async function assertTarballContents(directory) {
  const files = [];
  async function visit(current, relative = "") {
    for (const entry of await readdir(current, { withFileTypes: true })) {
      const next = relative ? `${relative}/${entry.name}` : entry.name;
      const absolute = path.join(current, entry.name);
      if (entry.name === "__pycache__" || /\.(?:pyc|pyo)$/iu.test(entry.name))
        throw new Error(`tarball contains a Python runtime cache: ${absolute}`);
      if (entry.isDirectory()) await visit(absolute, next);
      else files.push(next);
    }
  }
  await visit(directory);
  for (const forbidden of [
    /^dist\/lib\/(?:composite-|codex-|scope-fit|git-worktree-paths|process-(?:identity|tree))/u,
    /^dist\/schemas\/composite-/u,
    /^assets\/composite\//u,
    /^assets\/skills\/(?:prepare-composite-long-task|composite-long-task-workflow)\//u,
    /^dist\/lib\/long-task-delivery-set-/u,
    /^dist\/schemas\/long-task-delivery-set-/u,
    /^dist\/schemas\/long-task-delivery-v1\//u,
    /^assets\/hooks\/long-task-hook\.mjs$/u,
    /^assets\/skills\/source-plan-authoring\//u,
  ]) {
    const found = files.find((file) => forbidden.test(file));
    if (found)
      throw new Error(`tarball contains retired runtime asset: ${found}`);
  }
  for (const required of [
    "dist/schemas/design-resource-symbolic-noninterference-artifact-v2.schema.json",
    "dist/schemas/design-resource-symbolic-source-ir-v1.schema.json",
    "dist/schemas/long-task-external-confirmation-record-v1.schema.json",
    "dist/schemas/long-task-delivery-v2/long-task-delivery-v2.schema.json",
    "dist/lib/long-task-delivery-compiler.js",
    "dist/lib/long-task-claims.js",
    "dist/long-task-hook.js",
    "dist/lib/migrations.js",
    "assets/skills/design-resource-authoring/SKILL.md",
    "assets/skills/design-resource-authoring/references/resource-selection.md",
    "assets/skills/design-resource-authoring/references/open-design-provider.md",
    "assets/skills/design-resource-authoring/references/downstream-handoff.md",
    "assets/skills/design-resource-authoring/references/formal-selected-web-app-handoff.md",
    "assets/agents/long-task-implementation.toml",
    "assets/skills/long-task-workflow/SKILL.md",
  ]) {
    if (!files.includes(required))
      throw new Error(`tarball missing required asset: ${required}`);
  }
  const migrations = await readFile(
    path.join(directory, "dist/lib/migrations.js"),
    "utf8",
  );
  if (!migrations.includes("long-task-v1-retirement"))
    throw new Error("tarball missing V1 retirement migration");
}

function parseArgs(args) {
  const index = args.indexOf("--tarball");
  const value = index >= 0 ? args[index + 1] : args[0];
  const portableOnly = args.includes("--portable-only");
  const expectedLength = portableOnly ? 3 : 2;
  if (
    !value ||
    (index >= 0 && args.length !== expectedLength) ||
    (index < 0 && args.length !== 1)
  )
    throw new Error(
      "usage: node tools/release_tarball_smoke.mjs --tarball <package.tgz> [--portable-only]",
    );
  const resolved = path.resolve(value);
  if (!existsSync(resolved) || !resolved.endsWith(".tgz"))
    throw new Error(`tarball not found: ${resolved}`);
  return { tarball: resolved, portableOnly };
}

function run(command, args, cwd) {
  const executable =
    process.platform === "win32" && ["npm", "npx"].includes(command)
      ? (process.env.ComSpec ?? "cmd.exe")
      : command;
  const argv =
    executable === command ? args : ["/d", "/s", "/c", command, ...args];
  const result = spawnSync(executable, argv, {
    cwd,
    encoding: "utf8",
    env: { ...process.env, NO_COLOR: "1" },
  });
  if (result.status !== 0 || result.error)
    throw (
      result.error ??
      new Error(
        `${command} ${args.join(" ")} failed\n${result.stdout}\n${result.stderr}`,
      )
    );
}
