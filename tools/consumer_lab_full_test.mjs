#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  stat,
  writeFile
} from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

export const DEFAULT_LAB_DIR = "/Users/momoooo/Documents/sdlc-harness-consumer-lab";

const STATUS_ORDER = {
  PASS: 0,
  BLOCKED: 1,
  FAIL: 2
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
    markdownReport: ""
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
    throw new Error("--commit-lab requires --keep-lab because the default behavior deletes the lab after the run");
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
    (current, check) => (STATUS_ORDER[check.status] > STATUS_ORDER[current] ? check.status : current),
    "PASS"
  );
  return { ...summary, worst };
}

export function classifyMissingTools(result) {
  if (result.status === 0) {
    return { status: "PASS", details: "command passed" };
  }
  const output = `${result.stdout}\n${result.stderr}`;
  if (output.includes("tools/") && (output.includes("No such file") || output.includes("can't open file"))) {
    return { status: "BLOCKED", details: "consumer repo is missing generated Makefile tools/** dependency" };
  }
  return { status: "FAIL", details: trimOutput(output) || `exit ${result.status}` };
}

export function classifyUnknownValidator(result) {
  if (result.status === 0) {
    return { status: "PASS", details: "command passed" };
  }
  const output = `${result.stdout}\n${result.stderr}`;
  if (output.includes("unknown validator")) {
    return { status: "BLOCKED", details: "package CLI does not expose this later-stage validator yet" };
  }
  return { status: "FAIL", details: trimOutput(output) || `exit ${result.status}` };
}

export async function runConsumerLabFullTest(rawOptions) {
  const options = {
    ...rawOptions,
    sourceRoot: path.resolve(rawOptions.sourceRoot ?? process.cwd()),
    labDir: path.resolve(rawOptions.labDir ?? DEFAULT_LAB_DIR)
  };
  const startedAt = new Date().toISOString();
  const packageManifest = JSON.parse(
    await readFile(path.join(options.sourceRoot, "packages", "sdlc-harness", "package.json"), "utf8")
  );
  const packageVersion = packageManifest.version;
  const checks = [];
  let report;
  const artifactsDir = path.join(options.labDir, ".artifacts");

  const add = (check) => {
    checks.push({
      status: check.status,
      area: check.area,
      evidence: check.evidence,
      details: check.details ?? "",
      command: check.command ?? ""
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
      details: result.status === 0 ? output || "command passed" : output || `exit ${result.status}`
    });
    return result;
  };
  const expectedBlockedOrPass = (area, evidence, command, args, classifier, opts = {}) => {
    const result = run(command, args, opts.cwd ?? options.labDir);
    const classified = classifier(result);
    add({
      area,
      evidence,
      command: renderCommand(command, args),
      status: classified.status,
      details: classified.details
    });
    return result;
  };

  if (options.resetLab) {
    await rm(options.labDir, { recursive: true, force: true });
  }
  await mkdir(artifactsDir, { recursive: true });

  const pack = run("npm", ["pack", "--workspace", "agent-project-sdlc", "--pack-destination", artifactsDir], options.sourceRoot);
  const tarballName = findTarballName(pack.stdout);
  add({
    area: "Package smoke",
    evidence: "npm pack current source package",
    command: "npm pack --workspace agent-project-sdlc --pack-destination <lab>/.artifacts",
    status: pack.status === 0 && tarballName ? "PASS" : "FAIL",
    details: tarballName ? tarballName : trimOutput(`${pack.stdout}\n${pack.stderr}`)
  });
  if (pack.status !== 0 || !tarballName) {
    report = await finishReport({ options, packageVersion, startedAt, checks, labCommit: "", labTag: "" });
    await cleanupLab(options);
    return report;
  }

  const tarballPath = path.join(artifactsDir, tarballName);
  await ensureBaseLab(options.labDir, tarballPath);

  commandCheck("Package smoke", "install current source tarball", "npm", ["install", "-D", `./.artifacts/${tarballName}`]);
  commandCheck("CLI lifecycle", "init explicit .codex root", "npx", ["sdlc-harness", "init", "--harness-folder", ".codex"]);
  commandCheck("CLI lifecycle", "doctor installed workspace", "npx", ["sdlc-harness", "doctor"]);
  commandCheck("CLI lifecycle", "sync idempotency", "npx", ["sdlc-harness", "sync"]);
  commandCheck("CLI lifecycle", "upgrade idempotency", "npx", ["sdlc-harness", "upgrade"]);

  await verifyManagedAssets(options.labDir, add);
  await verifyAdoptAndConfiguredRoots(options.labDir, tarballPath, add);
  await verifyOverrides(options.labDir, add);
  await writeToyProject(options.labDir);

  commandCheck("Toy project", "node:test fixture", "npm", ["test"]);
  commandCheck("CLI validators", "validate-harness", "npx", ["sdlc-harness", "validate-harness"]);
  commandCheck("CLI validators", "validate-current", "npx", ["sdlc-harness", "validate-current"]);
  commandCheck("CLI validators", "validate-pm", "npx", ["sdlc-harness", "validate-pm"]);
  commandCheck("CLI validators", "validate-design", "npx", ["sdlc-harness", "validate-design"]);
  commandCheck("CLI validators", "validate-dev final empty plan", "npx", ["sdlc-harness", "validate-dev"]);

  await verifyPlanProtocol(options.labDir, commandCheck, add);
  await verifyStaticWorkflowText(options.labDir, add);

  for (const gate of ["validate-harness", "validate-current", "validate-review", "validate-test", "validate-release"]) {
    expectedBlockedOrPass("Makefile gates", `make ${gate}`, "make", [gate], classifyMissingTools);
  }
  expectedBlockedOrPass("Docs overview", "make docs-overview", "make", ["docs-overview"], classifyMissingTools);
  expectedBlockedOrPass(
    "Lifecycle transition",
    "python3 tools/transition.py --to ARCHITECTING",
    "python3",
    ["tools/transition.py", "--to", "ARCHITECTING"],
    classifyMissingTools
  );
  for (const validator of ["validate-review", "validate-test", "validate-release", "validate-rfc"]) {
    expectedBlockedOrPass(
      "Later-stage CLI validators",
      `npx sdlc-harness validate ${validator}`,
      "npx",
      ["sdlc-harness", "validate", validator],
      classifyUnknownValidator
    );
  }

  await verifyReleaseAndGithubStatic(options.sourceRoot, options.labDir, add);
  const { commit: labCommit, tag: labTag } = options.commitLab
    ? await commitLabEvidence(options.labDir, options.tagPrefix, packageVersion)
    : await readLabHead(options.labDir);

  report = await finishReport({ options, packageVersion, startedAt, checks, labCommit, labTag });
  await cleanupLab(options);
  return report;
}

async function ensureBaseLab(labDir, tarballPath) {
  await mkdir(labDir, { recursive: true });
  if (!existsSync(path.join(labDir, ".git"))) {
    run("git", ["init"], labDir);
  }
  await writeFile(path.join(labDir, ".gitignore"), "node_modules/\n.artifacts/runs/\n", "utf8");
  if (!existsSync(path.join(labDir, "package.json"))) {
    run("npm", ["init", "-y"], labDir);
  }
  await stat(tarballPath);
}

async function verifyManagedAssets(labDir, add) {
  const required = [
    "AGENTS.md",
    "Makefile",
    ".github/workflows/harness.yml",
    ".docs/INDEX.md",
    ".codex/config.yaml",
    ".codex/state/lifecycle.yaml",
    ".codex/state/plan.yaml",
    ".codex/skills/pjsdlc_manager/SKILL.md",
    ".codex/pjsdlc_managed/templates/PLAN_TEMPLATE.yaml",
    ".codex/pjsdlc_managed/policies/phase_contracts.yaml"
  ];
  const missing = required.filter((relative) => !existsSync(path.join(labDir, relative)));
  add({
    area: "Managed assets",
    evidence: "expected generated files exist",
    status: missing.length === 0 ? "PASS" : "FAIL",
    details: missing.length === 0 ? `${required.length} managed files checked` : `missing: ${missing.join(", ")}`
  });

  if (missing.length === 0) {
    const lifecycle = await readFile(path.join(labDir, ".codex/state/lifecycle.yaml"), "utf8");
    const lifecycleReady =
      lifecycle.includes('current_phase: "SPRINTING"') &&
      lifecycle.includes('active_role: "developer"') &&
      lifecycle.includes('active_skill: "pjsdlc_dev_sprint"') &&
      lifecycle.includes('  - "REVIEWING"');
    add({
      area: "Managed assets",
      evidence: "init lifecycle starts in developer sprint",
      status: lifecycleReady ? "PASS" : "FAIL",
      details: lifecycleReady ? "lifecycle.yaml routes to pjsdlc_dev_sprint" : trimOutput(lifecycle)
    });
  }
}

async function verifyAdoptAndConfiguredRoots(labDir, tarballPath, add) {
  const runsDir = path.join(labDir, ".artifacts", "runs");
  await mkdir(runsDir, { recursive: true });

  const adoptDir = await mkdtemp(path.join(runsDir, "adopt-"));
  run("npm", ["init", "-y"], adoptDir);
  await writeFile(path.join(adoptDir, "README.md"), "# Existing Project\n", "utf8");
  run("npm", ["install", "-D", tarballPath], adoptDir);
  const adopt = run("npx", ["sdlc-harness", "init", "--adopt", "--harness-folder", ".codex"], adoptDir);
  add({
    area: "Adoption",
    evidence: "init --adopt existing project",
    command: "npx sdlc-harness init --adopt --harness-folder .codex",
    status: adopt.status === 0 && existsSync(path.join(adoptDir, ".codex/config.yaml")) ? "PASS" : "FAIL",
    details: trimOutput(`${adopt.stdout}\n${adopt.stderr}`)
  });

  const configuredDir = await mkdtemp(path.join(runsDir, "configured-root-"));
  await writeFile(
    path.join(configuredDir, "package.json"),
    JSON.stringify({ name: "configured-root", version: "1.0.0", sdlcHarness: { harnessFolderName: ".workflow" } }, null, 2),
    "utf8"
  );
  run("npm", ["install", "-D", tarballPath], configuredDir);
  const configured = run("npx", ["sdlc-harness", "init", "--adopt"], configuredDir);
  add({
    area: "Configurable root",
    evidence: "package.json#sdlcHarness.harnessFolderName",
    command: "npx sdlc-harness init --adopt",
    status: configured.status === 0 && existsSync(path.join(configuredDir, ".workflow/config.yaml")) ? "PASS" : "FAIL",
    details: trimOutput(`${configured.stdout}\n${configured.stderr}`)
  });
}

async function verifyOverrides(labDir, add) {
  const overrideDir = path.join(labDir, ".codex/pjsdlc_managed/override_skills");
  await mkdir(overrideDir, { recursive: true });
  await writeFile(path.join(overrideDir, "pjsdlc_dev_sprint.md"), "Consumer lab local dev rule.\n", "utf8");
  const sync = run("npx", ["sdlc-harness", "sync"], labDir);
  const skill = await readFile(path.join(labDir, ".codex/skills/pjsdlc_dev_sprint/SKILL.md"), "utf8");
  add({
    area: "Local overrides",
    evidence: "known Skill override appends Local Override",
    command: "npx sdlc-harness sync",
    status: sync.status === 0 && skill.includes("Local Override") && skill.includes("Consumer lab local dev rule.") ? "PASS" : "FAIL",
    details: sync.status === 0 ? "override appended" : trimOutput(`${sync.stdout}\n${sync.stderr}`)
  });

  await writeFile(
    path.join(overrideDir, "pjsdlc_pm_prd.md"),
    [
      "---",
      "name: pjsdlc_pm_prd",
      "description: Use during REQUIREMENT_GATHERING for consumer lab full PRD override.",
      "---",
      "",
      "# Consumer Lab PM Skill",
      "",
      "Consumer lab full skill body."
    ].join("\n"),
    "utf8"
  );
  const fullSkillSync = run("npx", ["sdlc-harness", "sync"], labDir);
  const fullSkill = await readFile(path.join(labDir, ".codex/skills/pjsdlc_pm_prd/SKILL.md"), "utf8");
  add({
    area: "Local overrides",
    evidence: "complete Skill override merges description and appends stripped body",
    command: "npx sdlc-harness sync",
    status:
      fullSkillSync.status === 0 &&
      fullSkill.includes("Project override: Use during REQUIREMENT_GATHERING for consumer lab full PRD override.") &&
      fullSkill.includes("# Consumer Lab PM Skill") &&
      !fullSkill.includes("name: pjsdlc_pm_prd\n---\n\n# Consumer Lab PM Skill")
        ? "PASS"
        : "FAIL",
    details: fullSkillSync.status === 0 ? "full skill override merged" : trimOutput(`${fullSkillSync.stdout}\n${fullSkillSync.stderr}`)
  });

  await writeFile(path.join(overrideDir, "pjsdlc_unknown.md"), "unknown\n", "utf8");
  const unknown = run("npx", ["sdlc-harness", "sync"], labDir);
  await rm(path.join(overrideDir, "pjsdlc_unknown.md"), { force: true });
  run("npx", ["sdlc-harness", "sync"], labDir);
  const unknownOutput = `${unknown.stdout}\n${unknown.stderr}`;
  add({
    area: "Local overrides",
    evidence: "unknown Skill override blocks sync",
    command: "npx sdlc-harness sync",
    status: unknown.status !== 0 && unknownOutput.includes("unknown skill override") ? "PASS" : "FAIL",
    details: trimOutput(unknownOutput)
  });

  const localPolicy = path.join(labDir, ".codex/pjsdlc_managed/policies/lab.local.yaml");
  await writeFile(localPolicy, "lab: true\n", "utf8");
  run("npx", ["sdlc-harness", "sync"], labDir);
  add({
    area: "Local policy overrides",
    evidence: "*.local.yaml preserved across sync",
    status: existsSync(localPolicy) ? "PASS" : "FAIL",
    details: existsSync(localPolicy) ? "local policy preserved" : "local policy missing"
  });
}

async function writeToyProject(labDir) {
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
    "utf8"
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
    "utf8"
  );

  await writeDocs(labDir);
  await writeFile(
    path.join(labDir, ".codex/state/plan.yaml"),
    `current_phase: "SPRINTING"
current_task_id: ""
next_task_sequence: 2
tasks: []
`,
    "utf8"
  );
  await writeFile(
    path.join(labDir, ".codex/state/plan.draft.yaml"),
    `current_phase: "SPRINTING"
current_task_id: "DEV-001"
next_task_sequence: 2
tasks:
  - id: "DEV-001"
    title: "Implement text summary helper"
    status: "pending"
    summary: "Add the toy helper and tests used by the consumer lab lifecycle rehearsal."
    docs:
      product:
        - ".docs/01_product/text_summary_prd.md"
    allowed_paths:
      - "src/**"
      - "tests/**"
      - ".docs/04_implementation/**"
    required_gates:
      - "npm test"
    acceptance_criteria:
      - "summarizeText returns character count, word count, and empty state."
    implementation_doc: ".docs/04_implementation/text_summary.md"
`,
    "utf8"
  );
}

async function writeDocs(labDir) {
  const files = {
    ".docs/00_raw/text_summary_request.md": "# Raw Request\n\nBuild a tiny text summary helper for consumer lab validation.\n",
    ".docs/01_product/text_summary_prd.md":
      "# Text Summary PRD\n\n## Goal\n\nValidate Harness lifecycle behavior.\n\n## Acceptance Criteria\n\n- Return character count, word count, and empty state.\n\n## Out Of Scope\n\n- Locale-aware tokenization is out of scope.\n\n## Open Questions\n\n- None.\n",
    ".docs/02_architecture/text_summary_architecture.md":
      "# Text Summary Architecture\n\nThe PRD requirement is implemented as a pure JavaScript API interface in `src/stringStats.js`.\n\nTask breakdown: add helper, add tests, record implementation.\n",
    ".docs/03_tech_plan/text_summary_plan.md":
      "# Text Summary Technical Plan\n\nThis plan implements the PRD requirement.\n\n## API Contract\n\n`summarizeText(input)` returns `characters`, `words`, and `empty`.\n\n## Task Breakdown\n\n- `DEV-001`: implement helper and tests.\n",
    ".docs/04_implementation/text_summary.md":
      "# Text Summary Implementation\n\n`src/stringStats.js` exports `summarizeText(input)`.\n\n## Verification\n\n- `npm test`: PASS\n",
    ".docs/06_review/REVIEW_REPORT.md":
      "# Review Report\n\n## Findings\n\nNo blocking finding.\n\n## Test Gap\n\nCoverage is intentionally narrow.\n\n## Decision\n\nPASS\n",
    ".docs/07_test/TEST_PLAN.md":
      "# Test Plan\n\n## Matrix\n\n| Scenario | Result |\n|---|---|\n| Normal text | PASS |\n| Empty text | PASS |\n\n## Regression\n\n- `npm test`: PASS\n\n## Coverage Gap\n\nNo locale-specific coverage.\n\n## Decision\n\nPASS\n",
    ".docs/08_release/v0.1.0_lab_release.md":
      "# Lab Release v0.1.0\n\n## Release Notes\n\nTiny helper fixture.\n\n## Smoke Evidence\n\n- `npm test`: PASS\n\n## Rollback Plan\n\nRevert the lab helper commit.\n",
    ".docs/rfc/RFC_001_change_empty_semantics.md":
      "# RFC 001 Change Empty Semantics\n\nStatus: VERIFIED\n\n## Background\n\nThe lab needs one RFC document.\n\n## Product Impact\n\nWhitespace-only strings remain empty.\n\n## Technical Impact\n\nNo code change required.\n\n## Regression\n\nKeep whitespace-only coverage.\n",
    ".docs/INDEX.md":
      "# Documentation Index\n\n- Product: `.docs/01_product/text_summary_prd.md`\n- Architecture: `.docs/02_architecture/text_summary_architecture.md`\n- Technical plan: `.docs/03_tech_plan/text_summary_plan.md`\n- Implementation: `.docs/04_implementation/text_summary.md`\n- Test: `.docs/07_test/TEST_PLAN.md`\n"
  };
  for (const [relative, content] of Object.entries(files)) {
    await mkdir(path.dirname(path.join(labDir, relative)), { recursive: true });
    await writeFile(path.join(labDir, relative), content, "utf8");
  }
}

async function verifyPlanProtocol(labDir, commandCheck, add) {
  const planPath = path.join(labDir, ".codex/state/plan.yaml");
  await writeFile(
    planPath,
    `current_phase: "SPRINTING"
current_task_id: ""
next_task_sequence: 2
tasks:
  - id: "DEV-001"
    title: "Completed task should not remain"
    status: "done"
    summary: "Negative protocol check."
    implementation_doc: ".docs/04_implementation/text_summary.md"
`,
    "utf8"
  );
  const done = run("npx", ["sdlc-harness", "validate-dev"], labDir);
  add({
    area: "Task protocol",
    evidence: "done task retained in plan is rejected",
    command: "npx sdlc-harness validate-dev",
    status: done.status !== 0 && `${done.stdout}\n${done.stderr}`.includes("Completed task DEV-001") ? "PASS" : "FAIL",
    details: trimOutput(`${done.stdout}\n${done.stderr}`)
  });

  await writeFile(
    planPath,
    `current_phase: "SPRINTING"
current_task_id: "DEV-001"
next_task_sequence: 2
tasks:
  - id: "DEV-001"
    title: "Open task should remain until completion"
    status: "in_progress"
    summary: "Negative protocol check."
    docs:
      product:
        - ".docs/01_product/text_summary_prd.md"
    allowed_paths:
      - "src/**"
    required_gates:
      - "npm test"
    acceptance_criteria:
      - "Open task is intentionally present."
    implementation_doc: ".docs/04_implementation/text_summary.md"
`,
    "utf8"
  );
  const open = run("npx", ["sdlc-harness", "validate-dev"], labDir);
  add({
    area: "Task protocol",
    evidence: "open task retained is rejected by completion gate",
    command: "npx sdlc-harness validate-dev",
    status: open.status !== 0 && `${open.stdout}\n${open.stderr}`.includes("Open tasks remain") ? "PASS" : "FAIL",
    details: trimOutput(`${open.stdout}\n${open.stderr}`)
  });

  await writeFile(
    planPath,
    `current_phase: "SPRINTING"
current_task_id: ""
next_task_sequence: 2
parallel_execution:
  enabled: true
  trigger: "user_requested"
  mode: "user_orchestrated"
  phase: "TESTING"
  coordinator: "main_agent"
  workers:
    - id: "worker-smoke"
      writes_repo: false
      owned_paths: []
      forbidden_paths:
        - ".codex/state/**"
      expected_output:
        - "smoke test evidence"
      required_gates:
        - "npm test"
  integration:
    owner: "main_agent"
    merge_strategy: "main agent reviews evidence"
    required_gates:
      - "npx sdlc-harness validate-dev"
    fact_source_updates:
      - ".docs/07_test/"
tasks: []
`,
    "utf8"
  );
  commandCheck("Parallel execution", "valid explicit user_requested contract", "npx", ["sdlc-harness", "validate-dev"]);

  const valid = await readFile(planPath, "utf8");
  await writeFile(planPath, valid.replace('trigger: "user_requested"', 'trigger: "automatic"'), "utf8");
  const invalid = run("npx", ["sdlc-harness", "validate-dev"], labDir);
  add({
    area: "Parallel execution",
    evidence: "automatic trigger is rejected",
    command: "npx sdlc-harness validate-dev",
    status: invalid.status !== 0 && `${invalid.stdout}\n${invalid.stderr}`.includes("user_requested") ? "PASS" : "FAIL",
    details: trimOutput(`${invalid.stdout}\n${invalid.stderr}`)
  });

  await writeFile(
    planPath,
    `current_phase: "SPRINTING"
current_task_id: ""
next_task_sequence: 2
tasks: []
`,
    "utf8"
  );
}

async function verifyStaticWorkflowText(labDir, add) {
  const agents = await readFile(path.join(labDir, "AGENTS.md"), "utf8");
  const manager = await readFile(path.join(labDir, ".codex/skills/pjsdlc_manager/SKILL.md"), "utf8");
  const text = `${agents}\n${manager}`;
  const required = ["/status", "/next", "/dev", "/test", "自然语言", "active_skill"];
  const missing = required.filter((needle) => !text.includes(needle));
  add({
    area: "Natural-language control",
    evidence: "static AGENTS/manager routing text",
    status: missing.length === 0 ? "PASS" : "FAIL",
    details: missing.length === 0 ? "natural-language routing text present" : `missing: ${missing.join(", ")}`
  });
}

async function verifyReleaseAndGithubStatic(sourceRoot, labDir, add) {
  const workflow = await readFile(path.join(labDir, ".github/workflows/harness.yml"), "utf8");
  add({
    area: "GitHub Actions",
    evidence: "workflow asset static coverage",
    status: workflow.includes("validate-harness") && workflow.includes("workflow_dispatch") ? "PASS" : "FAIL",
    details: "static workflow asset checked; remote GitHub Actions execution is out of scope"
  });
  const releaseScript = path.join(sourceRoot, "tools/release_npm.mjs");
  add({
    area: "Release automation",
    evidence: "release automation static coverage",
    status: existsSync(releaseScript) ? "PASS" : "FAIL",
    details: "npm publish is out of scope for consumer lab"
  });
}

async function commitLabEvidence(labDir, tagPrefix, packageVersion) {
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
    run("git", ["commit", "-m", "Record full Harness consumer lab evidence"], labDir);
  }
  const commit = run("git", ["rev-parse", "--short", "HEAD"], labDir).stdout.trim();
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\..+$/, "Z");
  const tag = `${tagPrefix}-${packageVersion}-${stamp}`;
  run("git", ["tag", tag], labDir);
  return { commit, tag };
}

async function readLabHead(labDir) {
  if (!existsSync(path.join(labDir, ".git"))) {
    return { commit: "", tag: "" };
  }
  const commit = run("git", ["rev-parse", "--short", "HEAD"], labDir).stdout.trim();
  const tag = run("git", ["tag", "--points-at", "HEAD"], labDir).stdout.trim().split("\n").filter(Boolean).at(-1) ?? "";
  return { commit, tag };
}

async function finishReport({ options, packageVersion, startedAt, checks, labCommit, labTag }) {
  const finishedAt = new Date().toISOString();
  const summary = summarizeChecks(checks);
  const report = {
    startedAt,
    finishedAt,
    packageName: "agent-project-sdlc",
    packageVersion,
    sourceRoot: options.sourceRoot,
    labDir: options.labDir,
    labCleanup: options.keepLab ? "kept" : "deleted",
    labCommit,
    labTag,
    summary,
    checks,
    recommendedRfc: buildRecommendedRfc(checks)
  };

  const defaultJson = path.join(options.labDir, ".artifacts", "consumer_lab_full_report.json");
  const defaultMarkdown = path.join(options.labDir, ".artifacts", "consumer_lab_full_report.md");
  await mkdir(path.dirname(options.jsonReport || defaultJson), { recursive: true });
  await mkdir(path.dirname(options.markdownReport || defaultMarkdown), { recursive: true });
  await writeFile(options.jsonReport || defaultJson, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  await writeFile(options.markdownReport || defaultMarkdown, renderMarkdownReport(report), "utf8");
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
      impactAreas: []
    };
  }
  const areas = [...new Set(blocked.map((check) => check.area))];
  return {
    title: "RFC: Close installed-consumer workflow coverage gaps",
    impactAreas: ["README", "PROJECT_SPEC", "package CLI", "Makefile assets", "validators", "tools", "tests", ...areas]
  };
}

export function renderMarkdownReport(report) {
  const rows = report.checks
    .map(
      (check) =>
        `| ${escapeTable(check.area)} | ${escapeTable(check.evidence)} | ${check.status} | ${escapeTable(check.details)} |`
    )
    .join("\n");
  const blocked = report.checks.filter((check) => check.status === "BLOCKED");
  const failures = report.checks.filter((check) => check.status === "FAIL");
  const blockers = blocked.length
    ? blocked.map((check) => `- ${check.area}: ${check.evidence} (${check.details})`).join("\n")
    : "- None";
  const defects = blocked.length
    ? blocked
        .map(
          (check, index) =>
            `| LAB-${String(index + 1).padStart(3, "0")} | ${escapeTable(check.area)} | ${escapeTable(check.evidence)} | ${escapeTable(check.details)} |`
        )
        .join("\n")
    : "| None |  |  |  |";
  const fails = failures.length ? failures.map((check) => `- ${check.area}: ${check.evidence} (${check.details})`).join("\n") : "- None";
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

This script installs the package tarball into the lab, does not copy source-repo \`tools/**\` into the consumer repository, and deletes the lab repository after reports are written unless \`--keep-lab\` is set.

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
  return String(value ?? "").replaceAll("|", "\\|").replaceAll("\n", " ");
}

function findTarballName(stdout) {
  return stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .findLast((line) => line.endsWith(".tgz"));
}

function run(command, args, cwd) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    env: { ...process.env, CI: "1" }
  });
  return {
    command,
    args,
    cwd,
    status: result.status ?? 1,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? (result.error ? String(result.error) : "")
  };
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
  if (!options.reportOnly && report.summary.worst !== "PASS") {
    process.exitCode = 1;
  }
}

const entrypoint = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : "";
if (import.meta.url === entrypoint) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
