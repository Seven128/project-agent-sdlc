#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

export const DEFAULT_LAB_DIR =
  "/Users/momoooo/Documents/ty-context-consumer-lab";

const STATUS_ORDER = {
  PASS: 0,
  BLOCKED: 1,
  FAIL: 2,
};

export function parseArgs(argv) {
  const options = {
    sourceRoot: process.cwd(),
    labDir: DEFAULT_LAB_DIR,
    resetLab: false,
    keepLab: false,
    reportOnly: false,
    commitLab: false,
    tagPrefix: "consumer-lab-full",
    jsonReport: "",
    markdownReport: "",
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help" || arg === "-h") {
      options.help = true;
    } else if (arg === "--source-root") {
      options.sourceRoot = requireValue(argv, ++index, arg);
    } else if (arg === "--lab-dir") {
      options.labDir = requireValue(argv, ++index, arg);
    } else if (arg === "--reset-lab") {
      options.resetLab = true;
    } else if (arg === "--keep-lab") {
      options.keepLab = true;
    } else if (arg === "--report-only") {
      options.reportOnly = true;
    } else if (arg === "--commit-lab") {
      options.commitLab = true;
    } else if (arg === "--tag-prefix") {
      options.tagPrefix = requireValue(argv, ++index, arg);
    } else if (arg === "--json-report") {
      options.jsonReport = requireValue(argv, ++index, arg);
    } else if (arg === "--markdown-report") {
      options.markdownReport = requireValue(argv, ++index, arg);
    } else {
      throw new Error(`unknown argument: ${arg}`);
    }
  }

  options.sourceRoot = path.resolve(options.sourceRoot);
  options.labDir = path.resolve(options.labDir);
  if (options.commitLab && !options.keepLab) {
    throw new Error(
      "--commit-lab requires --keep-lab because the default behavior deletes the lab after the run",
    );
  }
  return options;
}

function requireValue(argv, index, flag) {
  const value = argv[index];
  if (!value || value.startsWith("--")) {
    throw new Error(`${flag} requires a value`);
  }
  return value;
}

export function summarizeChecks(checks) {
  const summary = { PASS: 0, BLOCKED: 0, FAIL: 0 };
  for (const check of checks) {
    summary[check.status] = (summary[check.status] ?? 0) + 1;
  }
  const worst = checks.reduce(
    (current, check) =>
      STATUS_ORDER[check.status] > STATUS_ORDER[current]
        ? check.status
        : current,
    "PASS",
  );
  return { ...summary, worst };
}

export function classifyMissingTools(result) {
  if (result.status === 0) {
    return { status: "PASS", details: "command passed" };
  }
  const output = `${result.stdout}\n${result.stderr}`;
  if (
    output.includes("tools/") &&
    (output.includes("No such file") || output.includes("can't open file"))
  ) {
    return {
      status: "FAIL",
      details: "consumer repo is missing package-managed tools/**",
    };
  }
  return {
    status: "FAIL",
    details: trimOutput(output) || `exit ${result.status}`,
  };
}

export async function runConsumerLabFullTest(rawOptions) {
  const options = {
    ...rawOptions,
    sourceRoot: path.resolve(rawOptions.sourceRoot ?? process.cwd()),
    labDir: path.resolve(rawOptions.labDir ?? DEFAULT_LAB_DIR),
  };
  const startedAt = new Date().toISOString();
  const packageManifest = JSON.parse(
    await readFile(
      path.join(options.sourceRoot, "packages", "ty-context", "package.json"),
      "utf8",
    ),
  );
  const packageVersion = packageManifest.version;
  const checks = [];
  const artifactsDir = path.join(options.labDir, ".artifacts");
  const localHarnessArgs = (...args) => ["--no-install", "ty-context", ...args];
  const localHarnessMake = "TY_CONTEXT=npx --no-install ty-context";

  const add = (check) => {
    checks.push({
      status: check.status,
      area: check.area,
      evidence: check.evidence,
      details: check.details ?? "",
      command: check.command ?? "",
    });
  };
  const commandCheck = (area, evidence, command, args, opts = {}) => {
    const result = run(command, args, opts.cwd ?? options.labDir);
    const output = trimOutput(`${result.stdout}\n${result.stderr}`);
    add({
      area,
      evidence,
      command: renderCommand(command, args),
      status: result.status === 0 ? "PASS" : "FAIL",
      details:
        result.status === 0
          ? output || "command passed"
          : output || `exit ${result.status}`,
    });
    return result;
  };

  if (options.resetLab) {
    await rm(options.labDir, { recursive: true, force: true });
  }
  await mkdir(artifactsDir, { recursive: true });

  const pack = run(
    "npm",
    [
      "pack",
      "--workspace",
      "project-tiny-context-harness",
      "--pack-destination",
      artifactsDir,
    ],
    options.sourceRoot,
  );
  const tarballName = findTarballName(pack.stdout);
  add({
    area: "Package smoke",
    evidence: "npm pack current source package",
    command:
      "npm pack --workspace project-tiny-context-harness --pack-destination <lab>/.artifacts",
    status: pack.status === 0 && tarballName ? "PASS" : "FAIL",
    details: tarballName
      ? tarballName
      : trimOutput(`${pack.stdout}\n${pack.stderr}`),
  });
  if (pack.status !== 0 || !tarballName) {
    const report = await finishReport({
      options,
      packageVersion,
      startedAt,
      checks,
      labCommit: "",
      labTag: "",
    });
    await cleanupLab(options);
    return report;
  }

  const tarballPath = path.join(artifactsDir, tarballName);
  await ensureBaseLab(options.labDir, tarballPath);

  commandCheck("Package smoke", "install current source tarball", "npm", [
    "install",
    "-D",
    `./.artifacts/${tarballName}`,
  ]);
  commandCheck(
    "CLI lifecycle",
    "init explicit .codex root",
    "npx",
    localHarnessArgs("init", "--harness-folder", ".codex"),
  );
  commandCheck(
    "CLI lifecycle",
    "doctor installed workspace",
    "npx",
    localHarnessArgs("doctor"),
  );
  commandCheck(
    "CLI lifecycle",
    "sync idempotency",
    "npx",
    localHarnessArgs("sync"),
  );
  commandCheck(
    "CLI lifecycle",
    "upgrade idempotency",
    "npx",
    localHarnessArgs("upgrade"),
  );
  await commitLabCheckpoint(
    options.labDir,
    "Establish Minimal Context snapshot baseline",
  );
  commandCheck(
    "CLI validators",
    "validate-context",
    "npx",
    localHarnessArgs("validate-context"),
  );
  commandCheck(
    "CLI validators",
    "validate-harness composite gate",
    "npx",
    localHarnessArgs("validate-harness"),
  );
  commandCheck("Makefile gates", "make validate-context", "make", [
    localHarnessMake,
    "validate-context",
  ]);
  commandCheck(
    "Makefile gates",
    "make validate-harness composite gate",
    "make",
    [localHarnessMake, "validate-harness"],
  );

  await verifyManagedAssets(options.labDir, add);
  await verifyAdoptAndConfiguredRoots(options.labDir, tarballPath, add);
  await writeMinimalToyProject(options.labDir);
  await commitLabCheckpoint(
    options.labDir,
    "Record Minimal Context consumer lab fixture",
  );
  commandCheck("Toy project", "node:test fixture", "npm", ["test"]);
  commandCheck(
    "CLI validators",
    "validate-context after product fixture",
    "npx",
    localHarnessArgs("validate-context"),
  );
  await verifyReleaseAndGithubStatic(options.sourceRoot, options.labDir, add);

  const { commit: labCommit, tag: labTag } = options.commitLab
    ? await commitLabEvidence(options.labDir, options.tagPrefix, packageVersion)
    : await readLabHead(options.labDir);

  const report = await finishReport({
    options,
    packageVersion,
    startedAt,
    checks,
    labCommit,
    labTag,
  });
  await cleanupLab(options);
  return report;
}

async function ensureBaseLab(labDir, tarballPath) {
  await mkdir(labDir, { recursive: true });
  if (!existsSync(path.join(labDir, ".git"))) {
    run("git", ["init"], labDir);
  }
  await writeFile(
    path.join(labDir, ".gitignore"),
    "node_modules/\n.artifacts/runs/\n",
    "utf8",
  );
  if (!existsSync(path.join(labDir, "package.json"))) {
    run("npm", ["init", "-y"], labDir);
  }
  await stat(tarballPath);
}

async function verifyManagedAssets(labDir, add) {
  const packagedReadmePath = path.join(
    labDir,
    "node_modules/project-tiny-context-harness/assets/README.md",
  );
  const packagedReadmeExists = existsSync(packagedReadmePath);
  add({
    area: "Managed assets",
    evidence: "package ships root README as agent-readable docs asset",
    status: packagedReadmeExists ? "PASS" : "FAIL",
    details: packagedReadmeExists
      ? "node_modules/project-tiny-context-harness/assets/README.md exists"
      : "packaged README asset missing",
  });

  const required = [
    "AGENTS.md",
    "Makefile",
    ".github/workflows/harness.yml",
    "project_context/global.md",
    "project_context/context.toml",
    "project_context/architecture.md",
    "project_context/areas/main.md",
    ".codex/config.yaml",
    ".codex/ty-context-managed/context_templates/global.md",
    ".codex/ty-context-managed/context_templates/context.toml",
    ".codex/ty-context-managed/context_templates/architecture.md",
    ".codex/ty-context-managed/context_templates/area.md",
    ".codex/ty-context-managed/make/ty-context.mk",
    ".codex/skills/context_product_plan/SKILL.md",
    ".codex/skills/context_uiux_design/SKILL.md",
    ".codex/skills/design-resource-authoring/SKILL.md",
    ".codex/skills/context_development_engineer/SKILL.md",
    "tools/validate_context.py",
  ];
  const forbidden = [
    "tools/transition.py",
    ".work_products/INDEX.md",
    ".codex/state/lifecycle.yaml",
    ".codex/state/plan.yaml",
    ".codex/skills/ty-context_manager/SKILL.md",
    ".codex/ty-context-managed/templates/PLAN_TEMPLATE.yaml",
    ".codex/ty-context-managed/policies/phase_contracts.yaml",
  ];
  const missing = required.filter(
    (relative) => !existsSync(path.join(labDir, relative)),
  );
  const unexpected = forbidden.filter((relative) =>
    existsSync(path.join(labDir, relative)),
  );
  const hasLegacyDocsRoot = existsSync(path.join(labDir, ".docs"));
  add({
    area: "Managed assets",
    evidence:
      "Minimal Context default generated files exist without stage assets",
    status:
      missing.length === 0 && unexpected.length === 0 && !hasLegacyDocsRoot
        ? "PASS"
        : "FAIL",
    details:
      missing.length === 0 && unexpected.length === 0 && !hasLegacyDocsRoot
        ? `${required.length} Minimal Context files checked; legacy stage assets not generated`
        : `missing: ${missing.join(", ") || "none"}; unexpected: ${unexpected.join(", ") || "none"}; legacy .docs present: ${hasLegacyDocsRoot}`,
  });

  if (missing.length === 0) {
    const config = await readFile(
      path.join(labDir, ".codex/config.yaml"),
      "utf8",
    );
    const configReady =
      config.includes('schema_version: "4"') &&
      config.includes(".codex/ty-context-managed/context_templates") &&
      config.includes(".codex/skills") &&
      !config.includes(".codex/ty-context-managed/templates");
    add({
      area: "Managed assets",
      evidence: "fresh init config is Minimal Context schema",
      status: configReady ? "PASS" : "FAIL",
      details: configReady
        ? "schema_version 4 with context templates and no stage skills/templates"
        : trimOutput(config),
    });

    const agents = await readFile(path.join(labDir, "AGENTS.md"), "utf8");
    const guidanceReady =
      agents.includes("Minimal Context Harness") &&
      agents.includes("project_context/global.md") &&
      agents.includes("Default Workflow Contract") &&
      agents.includes("Long-Task Routing") &&
      !agents.includes("选择任何角色或 skill 前，先读取");
    add({
      area: "Managed assets",
      evidence:
        "AGENTS guidance separates the default Workflow Contract from explicit Long-Task routing",
      status: guidanceReady ? "PASS" : "FAIL",
      details: guidanceReady
        ? "Minimal Context AGENTS guidance present"
        : trimOutput(agents),
    });
  }
}

async function verifyAdoptAndConfiguredRoots(labDir, tarballPath, add) {
  const runsDir = path.join(labDir, ".artifacts", "runs");
  await mkdir(runsDir, { recursive: true });

  const adoptDir = await mkdtemp(path.join(runsDir, "adopt-"));
  run("npm", ["init", "-y"], adoptDir);
  await writeFile(
    path.join(adoptDir, "README.md"),
    "# Existing Project\n",
    "utf8",
  );
  run("npm", ["install", "-D", tarballPath], adoptDir);
  const adopt = run(
    "npx",
    [
      "--no-install",
      "ty-context",
      "init",
      "--adopt",
      "--harness-folder",
      ".codex",
    ],
    adoptDir,
  );
  add({
    area: "Adoption",
    evidence: "init --adopt existing project",
    command: "npx --no-install ty-context init --adopt --harness-folder .codex",
    status:
      adopt.status === 0 &&
      existsSync(path.join(adoptDir, ".codex/config.yaml")) &&
      existsSync(path.join(adoptDir, "project_context/global.md"))
        ? "PASS"
        : "FAIL",
    details: trimOutput(`${adopt.stdout}\n${adopt.stderr}`),
  });
  const adoptValidator = run(
    "npx",
    ["--no-install", "ty-context", "validate-context"],
    adoptDir,
  );
  add({
    area: "Adoption",
    evidence: "adopted project validates Minimal Context",
    command: "npx --no-install ty-context validate-context",
    status: adoptValidator.status === 0 ? "PASS" : "FAIL",
    details: trimOutput(`${adoptValidator.stdout}\n${adoptValidator.stderr}`),
  });

  const configuredDir = await mkdtemp(path.join(runsDir, "configured-root-"));
  await writeFile(
    path.join(configuredDir, "package.json"),
    JSON.stringify(
      {
        name: "configured-root",
        version: "1.0.0",
        tyContext: { harnessFolderName: ".workflow" },
      },
      null,
      2,
    ),
    "utf8",
  );
  run("npm", ["install", "-D", tarballPath], configuredDir);
  const configured = run(
    "npx",
    ["--no-install", "ty-context", "init", "--adopt"],
    configuredDir,
  );
  add({
    area: "Configurable root",
    evidence: "package.json#tyContext.harnessFolderName",
    command: "npx --no-install ty-context init --adopt",
    status:
      configured.status === 0 &&
      existsSync(path.join(configuredDir, ".workflow/config.yaml")) &&
      existsSync(path.join(configuredDir, "project_context/global.md"))
        ? "PASS"
        : "FAIL",
    details: trimOutput(`${configured.stdout}\n${configured.stderr}`),
  });
  const configuredCliValidator = run(
    "npx",
    ["--no-install", "ty-context", "validate-context"],
    configuredDir,
  );
  add({
    area: "Configurable root",
    evidence: "CLI context validator consumes configured .workflow root",
    command: "npx --no-install ty-context validate-context",
    status: configuredCliValidator.status === 0 ? "PASS" : "FAIL",
    details: trimOutput(
      `${configuredCliValidator.stdout}\n${configuredCliValidator.stderr}`,
    ),
  });
  const configuredMakeContext = run(
    "make",
    ["TY_CONTEXT=npx --no-install ty-context", "validate-context"],
    configuredDir,
  );
  add({
    area: "Configurable root",
    evidence: "Makefile context gate consumes configured .workflow root",
    command: "make validate-context",
    status: configuredMakeContext.status === 0 ? "PASS" : "FAIL",
    details: trimOutput(
      `${configuredMakeContext.stdout}\n${configuredMakeContext.stderr}`,
    ),
  });
  const configuredMakeHarness = run(
    "make",
    ["TY_CONTEXT=npx --no-install ty-context", "validate-harness"],
    configuredDir,
  );
  add({
    area: "Configurable root",
    evidence: "Makefile composite gate consumes configured .workflow root",
    command: "make validate-harness",
    status: configuredMakeHarness.status === 0 ? "PASS" : "FAIL",
    details: trimOutput(
      `${configuredMakeHarness.stdout}\n${configuredMakeHarness.stderr}`,
    ),
  });
  add({
    area: "Configurable root",
    evidence: "configured root does not generate legacy lifecycle state",
    status:
      !existsSync(path.join(configuredDir, ".workflow/state/lifecycle.yaml")) &&
      !existsSync(path.join(configuredDir, "tools/transition.py"))
        ? "PASS"
        : "FAIL",
    details:
      "Minimal Context configured root should not create transition.py or lifecycle.yaml",
  });
}

async function writeMinimalToyProject(labDir) {
  const packageJsonPath = path.join(labDir, "package.json");
  const pkg = JSON.parse(await readFile(packageJsonPath, "utf8"));
  pkg.type = "module";
  pkg.main = "src/stringStats.js";
  pkg.scripts = { ...(pkg.scripts ?? {}), test: "node --test" };
  await writeFile(packageJsonPath, `${JSON.stringify(pkg, null, 2)}\n`, "utf8");

  await mkdir(path.join(labDir, "src"), { recursive: true });
  await mkdir(path.join(labDir, "tests"), { recursive: true });
  await writeFile(
    path.join(labDir, "src/stringStats.js"),
    `export function summarizeText(input) {
  const text = String(input ?? "");
  const words = text.trim() ? text.trim().split(/\\s+/) : [];

  return {
    characters: text.length,
    words: words.length,
    empty: words.length === 0
  };
}
`,
    "utf8",
  );
  await writeFile(
    path.join(labDir, "tests/stringStats.test.mjs"),
    `import assert from "node:assert/strict";
import test from "node:test";
import { summarizeText } from "../src/stringStats.js";

test("summarizeText counts characters and words", () => {
  assert.deepEqual(summarizeText("hello small lab"), {
    characters: 15,
    words: 3,
    empty: false
  });
});

test("summarizeText marks empty input", () => {
  assert.deepEqual(summarizeText("  "), {
    characters: 2,
    words: 0,
    empty: true
  });
});
`,
    "utf8",
  );
}

async function verifyReleaseAndGithubStatic(sourceRoot, labDir, add) {
  const workflow = await readFile(
    path.join(labDir, ".github/workflows/harness.yml"),
    "utf8",
  );
  add({
    area: "GitHub Actions",
    evidence: "workflow asset static coverage",
    status:
      workflow.includes("validate-context") &&
      workflow.includes("workflow_dispatch")
        ? "PASS"
        : "FAIL",
    details:
      "static workflow asset checked; remote GitHub Actions execution is out of scope",
  });
  const releaseScript = path.join(sourceRoot, "tools/release_npm.mjs");
  const releaseScriptText = existsSync(releaseScript)
    ? await readFile(releaseScript, "utf8")
    : "";
  const releaseAligned =
    releaseScriptText.includes("tools/release_publish.mjs") &&
    !releaseScriptText.includes(".work_products/08_release/CURRENT_RELEASE.md");
  add({
    area: "Release automation",
    evidence: "release automation static coverage",
    status: releaseAligned ? "PASS" : "FAIL",
    details: releaseAligned
      ? "release:npm delegates to current release:publish without legacy work products; npm publish is out of scope for consumer lab"
      : "release automation entrypoint is not Minimal Context aligned",
  });
}

async function commitLabCheckpoint(labDir, message) {
  if (!existsSync(path.join(labDir, ".git"))) {
    run("git", ["init"], labDir);
  }
  if (!run("git", ["config", "user.name"], labDir).stdout.trim()) {
    run("git", ["config", "user.name", "Codex"], labDir);
  }
  if (!run("git", ["config", "user.email"], labDir).stdout.trim()) {
    run("git", ["config", "user.email", "codex@example.local"], labDir);
  }
  run("git", ["add", "."], labDir);
  const status = run("git", ["status", "--porcelain"], labDir).stdout.trim();
  if (status) {
    run("git", ["commit", "-m", message], labDir);
  }
}

async function commitLabEvidence(labDir, tagPrefix, packageVersion) {
  await commitLabCheckpoint(
    labDir,
    "Record Minimal Context consumer lab evidence",
  );
  const commit = run(
    "git",
    ["rev-parse", "--short", "HEAD"],
    labDir,
  ).stdout.trim();
  const stamp = new Date()
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\..+$/, "Z");
  const tag = `${tagPrefix}-${packageVersion}-${stamp}`;
  run("git", ["tag", tag], labDir);
  return { commit, tag };
}

async function readLabHead(labDir) {
  if (!existsSync(path.join(labDir, ".git"))) {
    return { commit: "", tag: "" };
  }
  const commit = run(
    "git",
    ["rev-parse", "--short", "HEAD"],
    labDir,
  ).stdout.trim();
  const tag =
    run("git", ["tag", "--points-at", "HEAD"], labDir)
      .stdout.trim()
      .split("\n")
      .filter(Boolean)
      .at(-1) ?? "";
  return { commit, tag };
}

async function finishReport({
  options,
  packageVersion,
  startedAt,
  checks,
  labCommit,
  labTag,
}) {
  const finishedAt = new Date().toISOString();
  const summary = summarizeChecks(checks);
  const report = {
    startedAt,
    finishedAt,
    packageName: "project-tiny-context-harness",
    packageVersion,
    sourceRoot: options.sourceRoot,
    labDir: options.labDir,
    labCleanup: options.keepLab ? "kept" : "deleted",
    labCommit,
    labTag,
    summary,
    checks,
    recommendedRfc: buildRecommendedRfc(checks),
  };

  const defaultJson = path.join(
    options.labDir,
    ".artifacts",
    "consumer_lab_full_report.json",
  );
  const defaultMarkdown = path.join(
    options.labDir,
    ".artifacts",
    "consumer_lab_full_report.md",
  );
  await mkdir(path.dirname(options.jsonReport || defaultJson), {
    recursive: true,
  });
  await mkdir(path.dirname(options.markdownReport || defaultMarkdown), {
    recursive: true,
  });
  await writeFile(
    options.jsonReport || defaultJson,
    `${JSON.stringify(report, null, 2)}\n`,
    "utf8",
  );
  await writeFile(
    options.markdownReport || defaultMarkdown,
    renderMarkdownReport(report),
    "utf8",
  );
  return report;
}

async function cleanupLab(options) {
  if (options.keepLab) {
    return;
  }
  await rm(options.labDir, { recursive: true, force: true });
}

function buildRecommendedRfc(checks) {
  const blocked = checks.filter((check) => check.status === "BLOCKED");
  if (blocked.length === 0) {
    return {
      title: "",
      impactAreas: [],
    };
  }
  const areas = [...new Set(blocked.map((check) => check.area))];
  return {
    title: "RFC: Close installed-consumer Minimal Context coverage gaps",
    impactAreas: [
      "README",
      "PROJECT_SPEC",
      "package CLI",
      "Makefile assets",
      "validators",
      "skills",
      "tests",
      ...areas,
    ],
  };
}

export function renderMarkdownReport(report) {
  const rows = report.checks
    .map(
      (check) =>
        `| ${escapeTable(check.area)} | ${escapeTable(check.evidence)} | ${check.status} | ${escapeTable(check.details)} |`,
    )
    .join("\n");
  const blocked = report.checks.filter((check) => check.status === "BLOCKED");
  const failures = report.checks.filter((check) => check.status === "FAIL");
  const blockers = blocked.length
    ? blocked
        .map((check) => `- ${check.area}: ${check.evidence} (${check.details})`)
        .join("\n")
    : "- None";
  const defects = blocked.length
    ? blocked
        .map(
          (check, index) =>
            `| LAB-${String(index + 1).padStart(3, "0")} | ${escapeTable(check.area)} | ${escapeTable(check.evidence)} | ${escapeTable(check.details)} |`,
        )
        .join("\n")
    : "| None |  |  |  |";
  const fails = failures.length
    ? failures
        .map((check) => `- ${check.area}: ${check.evidence} (${check.details})`)
        .join("\n")
    : "- None";
  const rfc = report.recommendedRfc.title
    ? `- Title: ${report.recommendedRfc.title}\n- Impact areas: ${report.recommendedRfc.impactAreas.join(", ")}`
    : "- None";

  return `# Harness Consumer Lab Full Test

## Scope

- Package: \`${report.packageName}@${report.packageVersion}\`
- Source root: \`${report.sourceRoot}\`
- Lab repository: \`${report.labDir}\`
- Lab cleanup: \`${report.labCleanup}\`
- Lab commit: \`${report.labCommit || "not recorded"}\`
- Lab tag: \`${report.labTag || "not recorded"}\`
- Started: ${report.startedAt}
- Finished: ${report.finishedAt}

This script installs the package tarball into the lab and validates the vNext Minimal Context default: \`project_context/**\`, \`validate-context\`, configured harness roots, default Context authoring Skills, and absence of default lifecycle/plan/stage assets.

## Summary

- PASS: ${report.summary.PASS}
- BLOCKED: ${report.summary.BLOCKED}
- FAIL: ${report.summary.FAIL}
- Decision: ${report.summary.worst}

## Script Usage

~~~sh
node tools/consumer_lab_full_test.mjs --report-only --lab-dir ${report.labDir}
node tools/consumer_lab_full_test.mjs --report-only --keep-lab --commit-lab --lab-dir ${report.labDir}
~~~

Default reports are written to \`${report.labDir}/.artifacts/consumer_lab_full_report.{json,md}\` before cleanup. Pass \`--markdown-report\` or \`--json-report\` outside the lab when the report must persist after the default cleanup. Use \`--reset-lab\` only when the existing lab should be deleted before the run; use \`--keep-lab\` only for debugging; use \`--commit-lab\` with \`--keep-lab\` when a local evidence commit and tag should be created.

## Matrix

| Area | Evidence | Result | Details |
|---|---|---|---|
${rows}

## Blocked Items

${blockers}

## Defect Candidates

| ID | Area | Evidence | Impact |
|---|---|---|---|
${defects}

## Failures

${fails}

## Recommended RFC

${rfc}
`;
}

function escapeTable(value) {
  return String(value ?? "")
    .replaceAll("|", "\\|")
    .replaceAll("\n", " ");
}

function findTarballName(stdout) {
  return stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .findLast((line) => line.endsWith(".tgz"));
}

function run(command, args, cwd, input) {
  const invocation = resolveInvocation(command, args);
  const result = spawnSync(invocation.command, invocation.args, {
    cwd,
    encoding: "utf8",
    env: { ...process.env, CI: "1" },
    input,
  });
  return {
    command,
    args,
    cwd,
    status: result.status ?? 1,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? (result.error ? String(result.error) : ""),
  };
}

export function resolveInvocation(
  command,
  args,
  platform = process.platform,
  nodePath = process.execPath,
) {
  if (platform !== "win32" || !["npm", "npx"].includes(command))
    return { command, args };
  const cli = path.win32.join(
    path.win32.dirname(nodePath),
    "node_modules",
    "npm",
    "bin",
    `${command}-cli.js`,
  );
  return { command: nodePath, args: [cli, ...args] };
}

function renderCommand(command, args) {
  return [command, ...args].join(" ");
}

function trimOutput(output) {
  return output.trim().split(/\r?\n/).slice(-8).join("\n");
}

function printHelp() {
  console.log(`Usage: node tools/consumer_lab_full_test.mjs [options]

Options:
  --source-root <path>      Source repository root. Default: cwd
  --lab-dir <path>          Consumer lab directory. Default: ${DEFAULT_LAB_DIR}
  --reset-lab               Delete and recreate the lab directory before running
  --keep-lab                Keep the lab directory after reports are written
  --report-only             Always exit 0 after writing reports
  --commit-lab              Commit lab changes and create a unique local evidence tag; requires --keep-lab
  --tag-prefix <prefix>     Evidence tag prefix. Default: consumer-lab-full
  --json-report <path>      JSON report path. Default: <lab>/.artifacts/consumer_lab_full_report.json
  --markdown-report <path>  Markdown report path. Default: <lab>/.artifacts/consumer_lab_full_report.md
`);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }
  const report = await runConsumerLabFullTest(options);
  console.log(renderMarkdownReport(report));
  if (!options.reportOnly && report.summary.worst === "FAIL") {
    process.exitCode = 1;
  }
}

const entrypoint = process.argv[1]
  ? pathToFileURL(path.resolve(process.argv[1])).href
  : "";
if (import.meta.url === entrypoint) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
