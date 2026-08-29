#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function parseArgs(argv) {
  const options = { clean: false, outDir: null, packIgnoreScripts: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--clean") {
      options.clean = true;
    } else if (arg === "--pack-ignore-scripts") {
      options.packIgnoreScripts = true;
    } else if (arg === "--out-dir") {
      const value = argv[index + 1];
      if (!value) {
        throw new Error("--out-dir requires a path");
      }
      options.outDir = path.resolve(value);
      index += 1;
    } else if (arg === "--help" || arg === "-h") {
      options.help = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return options;
}

function printHelp() {
  console.log(`quickstart_smoke.mjs

Packs the local project-tiny-context-harness workspace, installs it into a temporary demo
repository, runs ty-context init, then validates the generated Minimal Context.

Usage:
  node tools/quickstart_smoke.mjs [--out-dir tmp/ty-context/quickstart-smoke/demo] [--clean] [--pack-ignore-scripts]

Options:
  --pack-ignore-scripts  Skip npm pack lifecycle scripts. Intended for package tests
                         that already built dist and run concurrently with other
                         dist-dependent tests.
`);
}

function bin(name) {
  if (process.platform === "win32" && (name === "npm" || name === "npx")) {
    return `${name}.cmd`;
  }
  return name;
}

function commandSpec(command, args) {
  if (process.platform === "win32" && (command === "npm" || command === "npx")) {
    return {
      command: process.env.ComSpec || "cmd.exe",
      args: ["/d", "/s", "/c", command, ...args]
    };
  }
  return { command: bin(command), args };
}

function run(command, args, cwd, options = {}) {
  const spec = commandSpec(command, args);
  const result = spawnSync(spec.command, spec.args, {
    cwd,
    encoding: "utf8"
  });
  if (!options.capture) {
    if (result.stdout) {
      process.stdout.write(result.stdout);
    }
    if (result.stderr) {
      process.stderr.write(result.stderr);
    }
  }
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    const detail = [result.stdout, result.stderr].filter(Boolean).join("\n");
    throw new Error(`${command} ${args.join(" ")} failed with exit ${result.status}\n${detail}`);
  }
  return result;
}

function assertFile(filePath) {
  if (!existsSync(filePath)) {
    throw new Error(`expected generated file missing: ${filePath}`);
  }
}

function assertContains(filePath, pattern) {
  const content = readFileSync(filePath, "utf8");
  if (!pattern.test(content)) {
    throw new Error(`expected ${filePath} to match ${pattern}`);
  }
}

function makeDefaultOutDir() {
  const stamp = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
  return path.join(repoRoot, "tmp", "ty-context", "quickstart-smoke", `${stamp}-${process.pid}`);
}

const options = parseArgs(process.argv.slice(2));
if (options.help) {
  printHelp();
  process.exit(0);
}

const outDir = options.outDir ?? makeDefaultOutDir();
const packageDir = path.join(outDir, "package");
const demoDir = path.join(outDir, "repo");

try {
  mkdirSync(packageDir, { recursive: true });
  mkdirSync(demoDir, { recursive: true });

  const packArgs = ["pack", "--workspace", "project-tiny-context-harness", "--pack-destination", packageDir];
  if (options.packIgnoreScripts) {
    packArgs.push("--ignore-scripts");
  }
  run("npm", packArgs, repoRoot);
  const tarballs = readdirSync(packageDir).filter((file) => file.endsWith(".tgz"));
  if (tarballs.length !== 1) {
    throw new Error(`expected one packed tarball in ${packageDir}, found ${tarballs.length}`);
  }
  const tarballPath = path.join(packageDir, tarballs[0]);

  run("git", ["init"], demoDir);
  run("npm", ["init", "-y"], demoDir);
  run("npm", ["install", "--save-dev", "--ignore-scripts", "--no-audit", "--no-fund", "--prefer-offline", tarballPath], demoDir);
  run("npx", ["--no-install", "ty-context", "init"], demoDir);
  run("npx", ["--no-install", "ty-context", "route", "--task", "inspect project context", "--term", "Project Goal", "--format", "json"], demoDir);
  run("npx", ["--no-install", "ty-context", "context", "inspect", "project_context/global.md", "--format", "json"], demoDir);
  run("npx", ["--no-install", "ty-context", "validate-context"], demoDir);

  const expectedFiles = [
    "AGENTS.md",
    "DESIGN.md",
    "Makefile",
    ".github/workflows/harness.yml",
    "project_context/context.toml",
    "project_context/global.md",
    "project_context/architecture.md",
    "project_context/areas/main.md",
    "project_context/areas/main/verification.md"
  ];

  for (const file of expectedFiles) {
    assertFile(path.join(demoDir, file));
  }
  assertContains(path.join(demoDir, "AGENTS.md"), /Minimal Context Harness/);
  assertContains(path.join(demoDir, "project_context/global.md"), /## Project Goal/);
  assertContains(path.join(demoDir, "project_context/architecture.md"), /## System Boundary/);
  assertContains(path.join(demoDir, ".github/workflows/harness.yml"), /Run harness gate/);

  writeFileSync(
    path.join(outDir, "quickstart-smoke-report.json"),
    `${JSON.stringify(
      {
        status: "passed",
        package: tarballs[0],
        demoDir,
        generatedFiles: expectedFiles
      },
      null,
      2
    )}\n`,
    "utf8"
  );

  console.log("");
  console.log("Quickstart smoke passed.");
  console.log(`Demo repo: ${demoDir}`);
  console.log(`Packed package: ${tarballPath}`);
  console.log("Generated recovery surface:");
  for (const file of expectedFiles) {
    console.log(`- ${file}`);
  }

  if (options.clean) {
    rmSync(outDir, { recursive: true, force: true });
    console.log(`Cleaned ${outDir}`);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  console.error(`Smoke output kept at: ${outDir}`);
  process.exit(1);
}
