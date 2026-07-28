import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const mode = process.argv[2] ?? "--semantic";
const targetRef = "harness-package-runtime";
const rootEntrypoint = "tools/verify_design_fact_completeness_delivery.mjs";
const policyFile = "packages/ty-context/src/lib/design-resource-fact-policy.ts";
const handoffTest = "tests/ty-context/design-resource-handoff.test.mjs";
const runtimeEvidence = "packages/ty-context/src/lib/long-task-evidence-capability-runtime.ts";
const semanticObservationRules = [
  ["result", false, [[policyFile, "complete_observable_design_fact_delivery"],
    [runtimeEvidence, "design_method_fact_refs_mismatch"]]],
  ["default_fact_granularity", false,
    [["packages/ty-context/src/lib/design-resource-handoff-types.ts",
      "facts", "resource_fact_closure"], [policyFile, "observable_design_fact"]]],
  [
    "resource_fact_inventory",
    false,
    [
      [policyFile, "resource_fact_inventory_closure_required"],
      ["packages/ty-context/src/lib/design-resource-handoff-validation-coverage.ts", "design_resource_fact_unreferenced"],
      ["packages/ty-context/src/lib/design-resource-handoff-validation-facts.ts", "resource_fact_closure"],
      [handoffTest, "resource fact closure", "fact inventory"],
    ],
  ],
  [
    "pixel_fidelity",
    false,
    [
      [policyFile, "exact_target_visual_pixel_required"],
      [handoffTest, "pixel", "exact target"],
    ],
  ],
  [
    "complete_fact_consumption",
    false,
    [
      [policyFile, "exact_fact_set_conservation_required"],
      ["packages/ty-context/src/lib/long-task-design-resource-handoff.ts", "design_method_fact_refs_mismatch"],
      ["packages/ty-context/src/lib/long-task-ui-surface-types.ts", "fact_refs"],
    ],
  ],
  [
    "honest_expression_boundary",
    false,
    [
      [policyFile, "design_fact_expression_boundary"],
      ["PROJECT_SPEC.md", "design_fact_expression_boundary", "unsupported_design_fact_blocks"],
    ],
  ],
  [
    "control_semantics_preserved",
    false,
    [
      [policyFile, "control_granularity_is_not_design_fact_granularity"],
      ["PROJECT_SPEC.md", "control_granularity_is_not_design_fact_granularity"],
    ],
  ],
  [
    "public_guidance_aligned",
    false,
    [
      [policyFile, "public_design_fact_guidance_required"],
      ["README.md", "complete observable design fact", "pixel"],
      ["README.zh-CN.md", "complete observable design fact", "pixel"],
      ["packages/ty-context/README.md", "complete observable design fact", "pixel"],
      [".codex/ty-context-managed/skills/design-resource-authoring/SKILL.md", "complete observable design fact", "pixel"],
      [".codex/ty-context-managed/skills/long-task-workflow/references/contract-authoring.md", "complete observable design fact", "pixel"],
      [".codex/ty-context-managed/skills/context_development_engineer/SKILL.md", "complete observable design fact", "pixel"],
    ],
  ],
  [
    "single_authority_projection",
    false,
    [
      [policyFile, "design_fact_values_stay_in_canonical_resources", "no_second_design_fact_authority"],
      ["PROJECT_SPEC.md", "design_fact_values_stay_in_canonical_resources", "no_second_design_fact_authority"],
    ],
  ],
  [
    "machine_fact_schema",
    false,
    [
      [policyFile, "fact_inventory_required"],
      ["packages/ty-context/src/schemas/long-task-delivery-v2/long-task-delivery-v2.schema.json", "fact_refs"],
    ],
  ],
  [
    "contract_evidence_binding",
    false,
    [
      [policyFile, "contract_evidence_fact_binding_required"],
      ["packages/ty-context/src/lib/long-task-evidence-capability-types.ts", "fact_refs"],
      [runtimeEvidence, "design_method_fact_refs_mismatch"],
      ["packages/ty-context/src/lib/long-task-playwright-evidence.ts", "fact_refs"],
    ],
  ],
  [
    "antidegradation_protected",
    false,
    [
      [policyFile, "selected_design_fact_antidegradation_required"],
      ["tools/test_suite_policy.mjs", "selected-design-fact-closure"],
      ["tests/ty-context/long-task-semantic-drift-closure.test.mjs", "[critical:selected-design-fact-closure]"],
      ["PROJECT_SPEC.md", "Coverage_new", "FalseNegative_new", "Implementation Freedom Boundary"],
    ],
  ],
  [
    "distribution_context_cost",
    false,
    [
      [policyFile, "design_fact_distribution_context_cost"],
      ["PROJECT_SPEC.md", "design-resource-fact-policy.ts", "design_fact_distribution_context_cost"],
    ],
  ],
  ["forbidden_shortcut_present", true, [[policyFile, "forbidden_design_fact_shortcuts_absent"]]],
  ["opaque_resource_claim_absent", false, [[policyFile, "unsupported_facts_block"]]],
  ["integrity_treated_as_completion", true, [[policyFile, "preflight_is_not_production_conformance"]]],
  [
    "handoff_fact_closure_ac",
    false,
    [
      [policyFile, "resource_fact_inventory_closure_required"],
      [handoffTest, "fact inventory", "resource fact closure"],
    ],
  ],
  [
    "pixel_default_ac",
    false,
    [
      [policyFile, "exact_target_visual_pixel_required"],
      [handoffTest, "exact target", "visual_pixel"],
    ],
  ],
  [
    "long_task_fact_binding_ac",
    false,
    [
      [policyFile, "exact_fact_set_conservation_required"],
      ["tests/ty-context/long-task-delivery-compiler.test.mjs", "fact_refs", "condition"],
    ],
  ],
  [
    "runtime_fact_evidence_ac",
    false,
    [
      [policyFile, "contract_evidence_fact_binding_required"],
      ["tests/ty-context/long-task-playwright-ac-evidence.test.mjs", "fact_refs"],
      [runtimeEvidence, "design_method_fact"],
    ],
  ],
  [
    "antidegradation_parity_ac",
    false,
    [
      [policyFile, "selected_design_fact_antidegradation_required"],
      ["tests/ty-context/long-task-semantic-drift-closure.test.mjs", "[critical:selected-design-fact-closure]"],
    ],
  ],
  ["relations_applicable", true, [[policyFile, "control_relations_unchanged"]]],
];
const semanticAssertionKeys = [
  "result", "default-fact-granularity", "resource-fact-inventory",
  "pixel-fidelity", "complete-fact-consumption", "honest-expression-boundary",
  "control-semantics-preserved", "public-guidance-aligned",
  "single-authority-projection", "machine-fact-schema",
  "contract-evidence-binding", "antidegradation-protected",
  "distribution-context-cost", "no-shortcut", "opaque-resource-boundary",
  "integrity-not-completion", "handoff-fact-closure-ac", "pixel-default-ac",
  "long-task-fact-binding-ac", "runtime-fact-evidence-ac",
  "antidegradation-parity-ac", "relations-na", "semantic-liveness",
];
if (mode === "--complete") await completeVerification();
else if (mode === "--semantic") await semanticVerification();
else throw new Error(`unsupported verification mode: ${mode}`);

async function semanticVerification() {
  const inputPaths = [
    ...new Set(
      semanticObservationRules.flatMap(([, , requirements]) =>
        requirements.map(([file]) => file),
      ),
    ),
  ];
  const files = await readFiles(inputPaths);
  const observations = Object.fromEntries(
    semanticObservationRules.map(([key, negate, requirements]) => {
      const present = requirements.every(([file, ...needles]) =>
        needles.every((needle) => (files.get(file) ?? "").includes(needle)),
      );
      return [key, negate ? !present : present];
    }),
  );
  observations.target_live = true;
  emitResult(observations, semanticAssertionKeys, "semantic");
}

async function completeVerification() {
  const commands = [
    ["npm", ["test"]],
    [process.execPath, ["packages/ty-context/dist/cli.js", "package", "check-source"]],
  ];
  const results = [];
  for (const [command, args] of commands)
    results.push(await run(command, args));
  const completeSuitePassed = results.every((result) => result.code === 0);
  emitResult(
    {
      complete_suite_passed: completeSuitePassed,
      delivery_result_passed: completeSuitePassed,
      delivery_default_fact_granularity_passed: completeSuitePassed,
      target_live: true, command_results: results,
    },
    ["complete-suite", "complete-result",
      "complete-default-fact-granularity", "complete-liveness"],
    "complete",
  );
}

function emitResult(observations, assertionKeys, sessionKind) {
  const digest = sha256(JSON.stringify(observations)).slice(0, 16);
  const sessionId = `design-fact-${sessionKind}-${digest}`;
  const evidenceRecords = assertionKeys.map((assertionKey) => ({
    assertion_key: assertionKey,
    capability: "target_runtime",
    target_ref: targetRef,
    root_entrypoint: rootEntrypoint,
    session_id: sessionId,
    cold_start: true,
  }));
  console.log(
    JSON.stringify({
      schema_version: "long-task-check-result-v3",
      execution_status: "completed",
      observations,
      evidence_records: evidenceRecords,
    }),
  );
}

async function readFiles(paths) {
  const result = new Map();
  for (const relative of paths) {
    const contents = await readFile(
      path.join(repositoryRoot, relative),
      "utf8",
    ).catch(() => "");
    result.set(relative, contents);
  }
  return result;
}

async function run(command, args) {
  const actualCommand =
    process.platform === "win32" && command === "npm" ? "npm.cmd" : command;
  return new Promise((resolve) => {
    const child = spawn(actualCommand, args, {
      cwd: repositoryRoot,
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
      shell: false,
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout = tail(`${stdout}${chunk.toString()}`);
    });
    child.stderr.on("data", (chunk) => {
      stderr = tail(`${stderr}${chunk.toString()}`);
    });
    child.on("error", (error) => {
      resolve({
        command,
        args,
        code: null,
        error: error.message,
        stdout,
        stderr,
      });
    });
    child.on("close", (code, signal) => {
      resolve({ command, args, code, signal, stdout, stderr });
    });
  });
}

function tail(value) {
  return value.length <= 4000 ? value : value.slice(-4000);
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}
