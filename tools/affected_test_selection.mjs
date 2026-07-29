import path from "node:path";
import {
  assertHotspotTestFanoutBudget,
  DELIVERY_CONTRACT_FOCUSED_TESTS,
  LONG_TASK_FOCUSED_TESTS,
  LONG_TASK_TRUST_TESTS,
  normalizeRepositoryPath,
  STATIC_TESTS,
  TEST_ROOT,
  testPath,
} from "./test_suite_policy.mjs";

export {
  DELIVERY_CONTRACT_FOCUSED_TESTS,
  LONG_TASK_FOCUSED_TESTS,
  LONG_TASK_TRUST_TESTS,
} from "./test_suite_policy.mjs";

const SHARED_SEMANTIC_FACT_RUNTIME_PREFIXES = Object.freeze([
  "packages/ty-context/src/lib/semantic-fact-",
  "packages/ty-context/src/lib/long-task-semantic-fact-",
  "tools/semantic_fact_delivery_",
  "tools/verify_semantic_fact_completeness_delivery.mjs",
]);

const HOTSPOT_TESTS = new Map([
  [
    "packages/ty-context/src/commands/design-resource.ts",
    ["design-resource-handoff.test.mjs"],
  ],
  [
    "packages/ty-context/src/commands/index.ts",
    ["design-resource-handoff.test.mjs", "workflow-test-entrypoints.test.mjs"],
  ],
  [
    "packages/ty-context/src/index.ts",
    ["design-resource-handoff.test.mjs", "package-source.test.mjs"],
  ],
  ...[
    "packages/ty-context/src/lib/design-resource-handoff-types.ts",
    "packages/ty-context/src/lib/design-resource-handoff-shape.ts",
    "packages/ty-context/src/lib/design-resource-handoff-shape-primitives.ts",
    "packages/ty-context/src/lib/design-resource-handoff-shape-structure.ts",
    "packages/ty-context/src/lib/design-resource-handoff-shape-evidence.ts",
    "packages/ty-context/src/lib/design-resource-handoff-parser.ts",
    "packages/ty-context/src/lib/design-resource-handoff-policy.ts",
    "packages/ty-context/src/lib/design-resource-fact-enums.ts",
    "packages/ty-context/src/lib/design-resource-fact-locator-extractors.ts",
    "packages/ty-context/src/lib/design-resource-fact-locator-resolver.ts",
    "packages/ty-context/src/lib/design-resource-fact-policy.ts",
    "packages/ty-context/src/lib/design-resource-fact-locator-validation.ts",
    "packages/ty-context/src/lib/design-resource-fact-manifest-catalog.ts",
    "packages/ty-context/src/lib/design-resource-fact-manifest-model.ts",
    "packages/ty-context/src/lib/design-resource-fact-manifest-shape-axes.ts",
    "packages/ty-context/src/lib/design-resource-fact-manifest-shape-evidence.ts",
    "packages/ty-context/src/lib/design-resource-fact-manifest-shape-facts.ts",
    "packages/ty-context/src/lib/design-resource-fact-manifest-shape-inspector.ts",
    "packages/ty-context/src/lib/design-resource-fact-manifest-shape.ts",
    "packages/ty-context/src/lib/design-resource-fact-manifest-types.ts",
    "packages/ty-context/src/lib/design-resource-fact-manifest-universe.ts",
    "packages/ty-context/src/lib/design-resource-fact-manifest-validation.ts",
    "packages/ty-context/src/lib/design-resource-fact-property-methods.ts",
    "packages/ty-context/src/lib/design-resource-fact-shape-primitives.ts",
    "packages/ty-context/src/lib/design-resource-fact-types.ts",
    "packages/ty-context/src/lib/design-resource-fact-universe-assets.ts",
    "packages/ty-context/src/lib/design-resource-fact-universe-catalog.ts",
    "packages/ty-context/src/lib/design-resource-fact-universe-conditions.ts",
    "packages/ty-context/src/lib/design-resource-fact-universe-facts.ts",
    "packages/ty-context/src/lib/design-resource-fact-universe-helpers.ts",
    "packages/ty-context/src/lib/design-resource-fact-universe-inspector.ts",
    "packages/ty-context/src/lib/design-resource-fact-universe-proof.ts",
    "packages/ty-context/src/lib/design-resource-fact-universe-subjects.ts",
    "packages/ty-context/src/lib/design-resource-fact-universe-variations.ts",
    "packages/ty-context/src/lib/design-resource-fact-value-validation.ts",
    "packages/ty-context/src/lib/design-resource-handoff-file-primitives.ts",
    "packages/ty-context/src/lib/design-resource-handoff-file-validation.ts",
    "packages/ty-context/src/lib/design-resource-handoff-web-dependency-validation.ts",
    "packages/ty-context/src/lib/design-resource-handoff-validation.ts",
    "packages/ty-context/src/lib/design-resource-handoff-validation-primitives.ts",
    "packages/ty-context/src/lib/design-resource-handoff-validation-structure.ts",
    "packages/ty-context/src/lib/design-resource-handoff-validation-coverage.ts",
    "packages/ty-context/src/lib/design-resource-handoff-validation-fact-cells.ts",
    "packages/ty-context/src/lib/design-resource-handoff-validation-fact-records.ts",
    "packages/ty-context/src/lib/design-resource-handoff-validation-facts.ts",
    "packages/ty-context/src/lib/design-resource-handoff-validation-proofs.ts",
    "packages/ty-context/src/lib/design-resource-handoff-validation-resource-closure.ts",
  ].map((sourcePath) => [
    sourcePath,
    [
      "design-resource-handoff.test.mjs",
      "long-task-delivery-compiler.test.mjs",
    ],
  ]),
  ...[
    "packages/ty-context/src/lib/long-task-design-resource-handoff.ts",
    "packages/ty-context/src/lib/long-task-design-target-capabilities.ts",
  ].map((sourcePath) => [
    sourcePath,
    [
      "design-resource-handoff.test.mjs",
      "long-task-delivery-compiler.test.mjs",
    ],
  ]),
  ...[
    "packages/ty-context/src/commands/long-task-authoring.ts",
    "packages/ty-context/src/lib/long-task-authoring-authority-preview.ts",
    "packages/ty-context/src/lib/long-task-claims.ts",
    "packages/ty-context/src/lib/long-task-delivery-parser.ts",
    "packages/ty-context/src/lib/long-task-delivery-types.ts",
    "packages/ty-context/src/lib/long-task-delivery-validation.ts",
    "packages/ty-context/src/lib/long-task-outcome-parser.ts",
    "packages/ty-context/src/lib/long-task-semantic-drift-migration.ts",
    "packages/ty-context/src/lib/long-task-shape-primitives.ts",
    "packages/ty-context/src/lib/long-task-source-item-parser.ts",
    "packages/ty-context/src/lib/long-task-source-target-continuity.ts",
  ].map((sourcePath) => [
    sourcePath,
    [
      "long-task-delivery-compiler.test.mjs",
      "long-task-delivery-parser.test.mjs",
      "long-task-schema-parser-parity.test.mjs",
      "long-task-semantic-fact-closure.test.mjs",
    ],
  ]),
  [
    "packages/ty-context/src/lib/long-task-runner-freeze.ts",
    [
      "long-task-runner-freeze-v2.test.mjs",
      "long-task-semantic-fact-closure.test.mjs",
    ],
  ],
  [
    "packages/ty-context/src/lib/long-task-activation-validation.ts",
    [
      "design-resource-handoff.test.mjs",
      "long-task-authoring-preflight.test.mjs",
      "long-task-delivery-compiler.test.mjs",
      "long-task-semantic-fact-closure.test.mjs",
      "long-task-workspace-scope.test.mjs",
    ],
  ],
  [
    "packages/ty-context/src/lib/design-md.ts",
    ["sync-init-doctor.test.mjs", "visual-delivery-guidance.test.mjs"],
  ],
  ["packages/ty-context/src/lib/doctor.ts", ["sync-init-doctor.test.mjs"]],
  [
    "packages/ty-context/src/lib/profiles.ts",
    [
      "design-system-authoring-skill.test.mjs",
      "design-resource-authoring-skill.test.mjs",
      "sync-init-doctor.test.mjs",
      "long-task-profile-hook.test.mjs",
    ],
  ],
  [
    "packages/ty-context/src/lib/long-task-contract-types.ts",
    [
      "long-task-authority-field-completeness.test.mjs",
      "long-task-claim-coverage.test.mjs",
      "long-task-semantic-fact-closure.test.mjs",
      "long-task-schema-parser-parity.test.mjs",
    ],
  ],
  [
    "packages/ty-context/src/lib/long-task-product-shape.ts",
    [
      "long-task-claim-coverage.test.mjs",
      "long-task-delivery-parser.test.mjs",
      "long-task-schema-parser-parity.test.mjs",
    ],
  ],
  [
    "packages/ty-context/src/lib/long-task-ui-surface-types.ts",
    [
      "long-task-authority-field-completeness.test.mjs",
      "long-task-schema-parser-parity.test.mjs",
      "long-task-semantic-authority-revision.test.mjs",
      "long-task-semantic-drift-closure.test.mjs",
    ],
  ],
  [
    "packages/ty-context/src/lib/long-task-ui-surface-shape.ts",
    [
      "long-task-authoring-claims.test.mjs",
      "long-task-schema-parser-parity.test.mjs",
      "long-task-semantic-drift-closure.test.mjs",
    ],
  ],
  [
    "packages/ty-context/src/lib/long-task-ui-surface-policy.ts",
    [
      "long-task-authoring-claims.test.mjs",
      "long-task-claim-coverage.test.mjs",
      "long-task-semantic-authority-revision.test.mjs",
      "long-task-semantic-drift-closure.test.mjs",
    ],
  ],
  [
    "packages/ty-context/src/lib/long-task-ui-surface-validation.ts",
    [
      "long-task-authoring-claims.test.mjs",
      "long-task-claim-coverage.test.mjs",
      "long-task-semantic-drift-closure.test.mjs",
    ],
  ],
  [
    "packages/ty-context/src/lib/long-task-ui-design-policy.ts",
    [
      "long-task-semantic-authority-revision.test.mjs",
      "long-task-semantic-drift-closure.test.mjs",
    ],
  ],
  [
    "packages/ty-context/src/lib/long-task-claim-definitions.ts",
    [
      "long-task-authoring-claims.test.mjs",
      "long-task-claim-coverage.test.mjs",
      "long-task-semantic-fact-closure.test.mjs",
    ],
  ],
  [
    "packages/ty-context/src/lib/long-task-source-target-index.ts",
    [
      "long-task-claim-coverage.test.mjs",
      "long-task-semantic-fact-closure.test.mjs",
      "long-task-source-authority-closure.test.mjs",
    ],
  ],
  [
    "packages/ty-context/src/lib/long-task-authority-policy.ts",
    [
      "long-task-authority-field-completeness.test.mjs",
      "long-task-semantic-fact-closure.test.mjs",
      "long-task-semantic-authority-revision.test.mjs",
    ],
  ],
  [
    "packages/ty-context/src/lib/long-task-authority-types.ts",
    [
      "long-task-authority-field-completeness.test.mjs",
      "long-task-context-evolution.test.mjs",
      "long-task-semantic-authority-revision.test.mjs",
    ],
  ],
  [
    "packages/ty-context/src/lib/long-task-runtime-types.ts",
    [
      "long-task-context-evolution.test.mjs",
      "long-task-delivery-compiler.test.mjs",
      "long-task-semantic-fact-closure.test.mjs",
      "long-task-semantic-authority-revision.test.mjs",
      "long-task-semantic-drift-closure.test.mjs",
      "long-task-semantic-drift-lifecycle.test.mjs",
      "long-task-state-resume.test.mjs",
    ],
  ],
  [
    "packages/ty-context/src/commands/long-task.ts",
    [
      "long-task-active-authority-continuity.test.mjs",
      "long-task-authority-revision-classification.test.mjs",
      "long-task-authority-revision-diagnosis.test.mjs",
      "long-task-context-evolution.test.mjs",
      "long-task-model-choice-checkpoint.test.mjs",
      "long-task-semantic-drift-closure.test.mjs",
      "long-task-semantic-drift-lifecycle.test.mjs",
      "long-task-verification-preview.test.mjs",
      "long-task-workflow-black-box.test.mjs",
    ],
  ],
  [
    "packages/ty-context/src/commands/long-task-revision.ts",
    [
      "long-task-active-authority-continuity.test.mjs",
      "long-task-authority-revision-classification.test.mjs",
      "long-task-authority-revision-diagnosis.test.mjs",
      "long-task-context-evolution.test.mjs",
      "long-task-model-choice-checkpoint.test.mjs",
      "long-task-workflow-black-box.test.mjs",
    ],
  ],
  [
    "packages/ty-context/src/commands/long-task-command-args.ts",
    [
      "long-task-authority-revision-diagnosis.test.mjs",
      "long-task-verification-preview.test.mjs",
      "long-task-workflow-black-box.test.mjs",
    ],
  ],
  [
    "packages/ty-context/src/lib/long-task-authority-revision-diagnosis.ts",
    ["long-task-authority-revision-diagnosis.test.mjs"],
  ],
  [
    "packages/ty-context/src/lib/long-task-authority-revision-brief.ts",
    [
      "long-task-authority-revision-classification.test.mjs",
      "long-task-authority-revision-diagnosis.test.mjs",
      "long-task-semantic-authority-revision.test.mjs",
    ],
  ],
  [
    "packages/ty-context/src/lib/long-task-authority-revision-summary.ts",
    [
      "long-task-authority-revision-classification.test.mjs",
      "long-task-authority-revision-diagnosis.test.mjs",
      "long-task-authority-revision-replay.test.mjs",
      "long-task-semantic-authority-revision.test.mjs",
      "long-task-semantic-drift-closure.test.mjs",
      "long-task-semantic-drift-lifecycle.test.mjs",
    ],
  ],
  [
    "packages/ty-context/src/lib/long-task-authority-revision-types.ts",
    [
      "long-task-authority-progress-retry.test.mjs",
      "long-task-authority-revision-classification.test.mjs",
      "long-task-authority-revision-diagnosis.test.mjs",
      "long-task-authority-revision-replay.test.mjs",
      "long-task-semantic-authority-revision.test.mjs",
      "long-task-semantic-drift-closure.test.mjs",
      "long-task-semantic-drift-lifecycle.test.mjs",
    ],
  ],
  [
    "packages/ty-context/src/lib/long-task-authority-revision.ts",
    [
      "long-task-authority-progress-retry.test.mjs",
      "long-task-authority-revision-classification.test.mjs",
      "long-task-authority-revision-diagnosis.test.mjs",
      "long-task-authority-revision-replay.test.mjs",
      "long-task-semantic-authority-revision.test.mjs",
      "long-task-semantic-drift-closure.test.mjs",
      "long-task-semantic-drift-lifecycle.test.mjs",
    ],
  ],
  [
    "packages/ty-context/src/lib/long-task-authority-revision-analysis.ts",
    [
      "long-task-authority-progress-retry.test.mjs",
      "long-task-authority-revision-classification.test.mjs",
      "long-task-authority-revision-diagnosis.test.mjs",
      "long-task-authority-revision-replay.test.mjs",
      "long-task-semantic-authority-revision.test.mjs",
      "long-task-semantic-drift-lifecycle.test.mjs",
    ],
  ],
  [
    "packages/ty-context/src/lib/long-task-authority-revision-details.ts",
    [
      "long-task-authority-progress-retry.test.mjs",
      "long-task-authority-revision-classification.test.mjs",
      "long-task-authority-revision-diagnosis.test.mjs",
      "long-task-authority-revision-replay.test.mjs",
      "long-task-semantic-authority-revision.test.mjs",
    ],
  ],
  [
    "packages/ty-context/src/lib/long-task-authority-revision-enforcement.ts",
    [
      "long-task-authority-progress-retry.test.mjs",
      "long-task-authority-revision-classification.test.mjs",
      "long-task-authority-revision-diagnosis.test.mjs",
      "long-task-authority-revision-replay.test.mjs",
      "long-task-semantic-authority-revision.test.mjs",
    ],
  ],
  [
    "packages/ty-context/src/lib/long-task-authority.ts",
    [
      "long-task-authority-progress-retry.test.mjs",
      "long-task-authority-revision-classification.test.mjs",
      "long-task-authority-revision-replay.test.mjs",
      "long-task-semantic-fact-closure.test.mjs",
      "long-task-semantic-authority-revision.test.mjs",
    ],
  ],
  [
    "packages/ty-context/src/lib/context-graph-snapshot.ts",
    [
      "long-task-context-authority-topology.test.mjs",
      "context-manifest-hardening.test.mjs",
      "long-task-authority-progress-retry.test.mjs",
      "long-task-context-evolution.test.mjs",
      "long-task-semantic-authority-revision.test.mjs",
    ],
  ],
  [
    "packages/ty-context/src/lib/long-task-context-authority-topology.ts",
    [
      "long-task-context-authority-topology.test.mjs",
      "long-task-context-evolution.test.mjs",
      "long-task-semantic-authority-revision.test.mjs",
    ],
  ],
  [
    "packages/ty-context/src/lib/long-task-authoring-preflight.ts",
    [
      "long-task-authoring-preflight.test.mjs",
      "long-task-workspace-scope.test.mjs",
    ],
  ],
  [
    "packages/ty-context/src/lib/long-task-authoring-preflight-repair-order.ts",
    ["long-task-authoring-preflight.test.mjs"],
  ],
  [
    "packages/ty-context/src/lib/long-task-authoring-preflight-diagnostics.ts",
    [
      "long-task-authoring-preflight.test.mjs",
      "long-task-workspace-scope.test.mjs",
    ],
  ],
  [
    "packages/ty-context/src/lib/long-task-authoring-preflight-types.ts",
    ["long-task-authoring-preflight.test.mjs"],
  ],
  [
    "packages/ty-context/src/lib/long-task-context-authority.ts",
    [
      "long-task-authority-progress-retry.test.mjs",
      "long-task-context-evolution.test.mjs",
      "long-task-semantic-authority-revision.test.mjs",
    ],
  ],
  [
    "packages/ty-context/src/lib/long-task-authority-materials.ts",
    [
      "long-task-active-authority-continuity.test.mjs",
      "long-task-authority-field-completeness.test.mjs",
      "long-task-authority-progress-retry.test.mjs",
      "long-task-context-evolution.test.mjs",
      "long-task-semantic-authority-revision.test.mjs",
    ],
  ],
  [
    "packages/ty-context/src/lib/long-task-authority-material-diff.ts",
    [
      "long-task-authority-field-completeness.test.mjs",
      "long-task-authority-progress-retry.test.mjs",
      "long-task-context-evolution.test.mjs",
      "long-task-semantic-authority-revision.test.mjs",
    ],
  ],
  [
    "packages/ty-context/src/lib/long-task-delivery-compiler.ts",
    [
      "long-task-closure-invariants.test.mjs",
      "long-task-context-evolution.test.mjs",
      "long-task-delivery-compiler.test.mjs",
      "long-task-authority-revision-classification.test.mjs",
      "long-task-authority-revision-diagnosis.test.mjs",
      "long-task-semantic-fact-closure.test.mjs",
      "long-task-semantic-authority-revision.test.mjs",
      "long-task-semantic-drift-closure.test.mjs",
      "long-task-semantic-drift-lifecycle.test.mjs",
      "long-task-workspace-scope.test.mjs",
    ],
  ],
  [
    "packages/ty-context/src/lib/long-task-semantic-contract-types.ts",
    [
      "long-task-delivery-compiler.test.mjs",
      "long-task-delivery-parser.test.mjs",
      "long-task-schema-parser-parity.test.mjs",
      "long-task-semantic-fact-closure.test.mjs",
      "long-task-semantic-drift-closure.test.mjs",
      "long-task-semantic-drift-lifecycle.test.mjs",
    ],
  ],
  [
    "packages/ty-context/src/lib/long-task-evidence-capability-codec.ts",
    [
      "long-task-evidence-kernel.test.mjs",
      "long-task-semantic-fact-closure.test.mjs",
      "long-task-semantic-drift-closure.test.mjs",
    ],
  ],
  [
    "packages/ty-context/src/lib/long-task-evidence-capability-types.ts",
    [
      "long-task-evidence-kernel.test.mjs",
      "long-task-playwright-ac-evidence.test.mjs",
      "long-task-semantic-fact-closure.test.mjs",
      "long-task-semantic-drift-closure.test.mjs",
    ],
  ],
  [
    "packages/ty-context/src/lib/long-task-evidence-capability-runtime.ts",
    [
      "long-task-evidence-kernel.test.mjs",
      "long-task-semantic-fact-closure.test.mjs",
      "long-task-semantic-drift-closure.test.mjs",
    ],
  ],
  [
    "packages/ty-context/src/lib/long-task-evidence-capability-policy.ts",
    [
      "long-task-assertion-safety.test.mjs",
      "long-task-evidence-kernel.test.mjs",
      "long-task-semantic-fact-closure.test.mjs",
      "long-task-semantic-drift-closure.test.mjs",
    ],
  ],
  [
    "packages/ty-context/src/lib/long-task-playwright-evidence.ts",
    [
      "long-task-playwright-ac-evidence.test.mjs",
      "long-task-semantic-fact-closure.test.mjs",
      "long-task-semantic-drift-closure.test.mjs",
    ],
  ],
  ...[
    "packages/ty-context/src/lib/long-task-playwright-case-evidence.ts",
    "packages/ty-context/src/lib/long-task-playwright-case-primitives.ts",
  ].map((sourcePath) => [
    sourcePath,
    [
      "long-task-playwright-ac-evidence.test.mjs",
      "long-task-semantic-drift-closure.test.mjs",
    ],
  ]),
  [
    "packages/ty-context/src/lib/modularity.ts",
    ["check-modularity.test.mjs", "validators.test.mjs"],
  ],
  [
    "packages/ty-context/src/lib/execution-target-capabilities.ts",
    [
      "long-task-schema-parser-parity.test.mjs",
      "long-task-semantic-drift-closure.test.mjs",
    ],
  ],
  [
    "packages/ty-context/src/schemas/long-task-delivery-v2/long-task-delivery-v2.schema.json",
    [
      "long-task-authority-field-completeness.test.mjs",
      "long-task-delivery-compiler.test.mjs",
      "long-task-schema-parser-parity.test.mjs",
      "long-task-semantic-fact-closure.test.mjs",
      "long-task-semantic-drift-closure.test.mjs",
    ],
  ],
  [
    "packages/ty-context/src/lib/long-task-target-policy.ts",
    [
      "long-task-semantic-drift-closure.test.mjs",
      "long-task-semantic-drift-lifecycle.test.mjs",
    ],
  ],
  [
    "packages/ty-context/src/lib/long-task-state.ts",
    [
      "long-task-active-authority-continuity.test.mjs",
      "long-task-authority-progress-retry.test.mjs",
      "long-task-authority-revision-diagnosis.test.mjs",
      "long-task-state-resume.test.mjs",
    ],
  ],
  [
    "packages/ty-context/src/lib/long-task-status-v2.ts",
    [
      "long-task-authority-revision-diagnosis.test.mjs",
      "long-task-qualified-completion.test.mjs",
      "long-task-semantic-drift-closure.test.mjs",
      "long-task-semantic-drift-lifecycle.test.mjs",
      "long-task-state-resume.test.mjs",
      "long-task-verification-preview.test.mjs",
    ],
  ],
  [
    "packages/ty-context/src/lib/long-task-verifier-v2.ts",
    [
      "long-task-authority-progress-retry.test.mjs",
      "long-task-authority-revision-diagnosis.test.mjs",
      "long-task-workspace-scope.test.mjs",
      "long-task-workflow-black-box.test.mjs",
    ],
  ],
  [
    "packages/ty-context/src/lib/long-task-verification-preview.ts",
    ["long-task-verification-preview.test.mjs"],
  ],
  [
    "packages/ty-context/src/lib/long-task-workspace-scope.ts",
    ["long-task-workspace-scope.test.mjs"],
  ],
  [
    "packages/ty-context/src/lib/long-task-workspace.ts",
    ["long-task-workspace-scope.test.mjs"],
  ],
  [
    "packages/ty-context/src/lib/long-task-progress.ts",
    [
      "long-task-authority-progress-retry.test.mjs",
      "long-task-context-evolution.test.mjs",
      "long-task-semantic-drift-closure.test.mjs",
      "long-task-semantic-drift-lifecycle.test.mjs",
      "long-task-state-resume.test.mjs",
    ],
  ],
]);

assertHotspotTestFanoutBudget(HOTSPOT_TESTS);

export function selectAffectedTests(changedPaths, options = {}) {
  const scope = options.scope ?? "auto";
  if (scope === "all") return plan("full-suite", [], true, ["scope:all"]);
  if (scope === "trust")
    return plan("trust-boundary", [], true, ["scope:trust"]);
  if (scope === "long-task")
    return plan("selected", LONG_TASK_FOCUSED_TESTS, true, ["scope:long-task"]);
  if (scope === "delivery-contract")
    return plan("selected", DELIVERY_CONTRACT_FOCUSED_TESTS, true, [
      "scope:delivery-contract",
    ]);
  if (scope !== "auto")
    throw new Error(`unknown affected-test scope: ${scope}`);

  const normalized = [...new Set(changedPaths.map(normalizePath))].filter(
    Boolean,
  );
  if (!normalized.length)
    return plan("selected", LONG_TASK_FOCUSED_TESTS, true, [
      "no_changes:focused_default",
    ]);

  const tests = new Set();
  const reasons = [];
  let mode = "selected";

  for (const file of normalized) {
    if (
      file === "tests/ty-context/run-package-suite.mjs" ||
      file === "tests/ty-context/test-suite-file-reporter.mjs"
    ) {
      tests.add(testPath("test-suite-runtime.test.mjs"));
      tests.add(testPath("workflow-test-entrypoints.test.mjs"));
      reasons.push(`${file}:suite_runtime_tooling`);
      continue;
    }

    if (file.startsWith(`${TEST_ROOT}/`)) {
      if (file.endsWith(".test.mjs")) {
        tests.add(file);
        reasons.push(`${file}:direct_test`);
      } else {
        const suite = path.basename(file).startsWith("long-task-")
          ? "long-task-suite"
          : "full-suite";
        mode = widen(mode, suite);
        reasons.push(`${file}:shared_test_support`);
      }
      continue;
    }

    if (
      SHARED_SEMANTIC_FACT_RUNTIME_PREFIXES.some((prefix) =>
        file.startsWith(prefix),
      )
    ) {
      mode = widen(mode, "long-task-suite");
      reasons.push(`${file}:shared_semantic_fact_runtime`);
      continue;
    }

    const hotspot = HOTSPOT_TESTS.get(file);
    if (hotspot) {
      hotspot.map(testPath).forEach((test) => tests.add(test));
      reasons.push(`${file}:mapped_hotspot`);
      continue;
    }

    if (
      file === "tools/package_build_fingerprint.mjs" ||
      file === "tools/affected_change_discovery.mjs" ||
      file === "tools/affected_test_selection.mjs" ||
      file === "tools/run_affected_tests.mjs" ||
      file === "tools/test_suite_policy.mjs"
    ) {
      tests.add(testPath("affected-change-discovery.test.mjs"));
      tests.add(testPath("affected-test-selection.test.mjs"));
      if (file === "tools/package_build_fingerprint.mjs")
        tests.add(testPath("test-suite-runtime.test.mjs"));
      tests.add(testPath("workflow-test-entrypoints.test.mjs"));
      reasons.push(`${file}:affected_test_tooling`);
      continue;
    }

    if (file === "package.json") {
      tests.add(testPath("affected-test-selection.test.mjs"));
      tests.add(testPath("design-system-authoring-skill.test.mjs"));
      tests.add(testPath("design-resource-authoring-provider.test.mjs"));
      tests.add(testPath("workflow-test-entrypoints.test.mjs"));
      reasons.push(`${file}:root_entrypoints`);
      continue;
    }

    if (
      file === "package-lock.json" ||
      file === "packages/ty-context/package.json" ||
      file.startsWith("packages/ty-context/tsconfig")
    ) {
      mode = "full-suite";
      reasons.push(`${file}:package_or_dependency_boundary`);
      continue;
    }

    if (file.startsWith("packages/ty-context/src/schemas/")) {
      mode = widen(mode, "long-task-suite");
      reasons.push(`${file}:contract_schema`);
      continue;
    }

    if (file.startsWith("packages/ty-context/src/lib/long-task-")) {
      mode = widen(mode, "trust-boundary");
      reasons.push(`${file}:unmapped_long_task_runtime`);
      continue;
    }

    if (file.startsWith("packages/ty-context/src/")) {
      mode = "full-suite";
      reasons.push(`${file}:shared_package_runtime`);
      continue;
    }

    if (
      file.startsWith(".codex/") ||
      file.startsWith("packages/ty-context/assets/")
    ) {
      tests.add(testPath("design-system-authoring-skill.test.mjs"));
      tests.add(testPath("design-resource-authoring-skill.test.mjs"));
      if (file.includes("design-system-authoring"))
        tests.add(testPath("design-resource-authoring-provider.test.mjs"));
      if (file.includes("design-resource-authoring"))
        tests.add(testPath("design-resource-authoring-provider.test.mjs"));
      tests.add(testPath("long-task-design-context.test.mjs"));
      tests.add(testPath("long-task-efficiency-design.test.mjs"));
      tests.add(testPath("long-task-semantic-fact-closure.test.mjs"));
      tests.add(testPath("package-source.test.mjs"));
      tests.add(testPath("source-plan-authoring-skill.test.mjs"));
      tests.add(testPath("visual-delivery-guidance.test.mjs"));
      tests.add(testPath("workflow-contract-routing.test.mjs"));
      reasons.push(`${file}:managed_guidance`);
      continue;
    }

    if (file.startsWith("project_context/")) {
      tests.add(testPath("design-system-authoring-skill.test.mjs"));
      tests.add(testPath("design-resource-authoring-skill.test.mjs"));
      tests.add(testPath("long-task-design-context.test.mjs"));
      tests.add(testPath("long-task-efficiency-design.test.mjs"));
      tests.add(testPath("long-task-semantic-fact-closure.test.mjs"));
      tests.add(testPath("source-plan-authoring-skill.test.mjs"));
      tests.add(testPath("visual-delivery-guidance.test.mjs"));
      tests.add(testPath("validators.test.mjs"));
      reasons.push(`${file}:project_context`);
      continue;
    }

    if (
      file === "PROJECT_SPEC.md" ||
      file === "packages/ty-context/README.md" ||
      /^README(?:\.zh-CN)?\.md$/u.test(file)
    ) {
      tests.add(testPath("design-system-authoring-skill.test.mjs"));
      tests.add(testPath("design-resource-authoring-skill.test.mjs"));
      tests.add(testPath("long-task-design-context.test.mjs"));
      tests.add(testPath("long-task-efficiency-design.test.mjs"));
      tests.add(testPath("long-task-semantic-fact-closure.test.mjs"));
      tests.add(testPath("package-source.test.mjs"));
      tests.add(testPath("source-plan-authoring-skill.test.mjs"));
      tests.add(testPath("visual-delivery-guidance.test.mjs"));
      reasons.push(`${file}:public_design_surface`);
      continue;
    }

    if (
      file.startsWith(".github/workflows/") ||
      file === ".github/PULL_REQUEST_TEMPLATE.md" ||
      file.startsWith("tools/release_")
    ) {
      tests.add(testPath("workflow-test-entrypoints.test.mjs"));
      reasons.push(`${file}:workflow_entrypoint`);
      continue;
    }

    if (file === "tools/open_design_live_smoke.mjs") {
      tests.add(testPath("design-system-authoring-skill.test.mjs"));
      tests.add(testPath("design-resource-authoring-provider.test.mjs"));
      reasons.push(`${file}:open_design_smoke`);
      continue;
    }

    if (file.endsWith(".md") || file.startsWith("docs/")) {
      if (file === "docs/design-resource-authoring-source-plan.md")
        tests.add(testPath("design-system-authoring-skill.test.mjs"));
      if (file === "docs/design-resource-authoring-source-plan.md")
        tests.add(testPath("design-resource-authoring-skill.test.mjs"));
      tests.add(testPath("long-task-design-context.test.mjs"));
      tests.add(testPath("long-task-efficiency-design.test.mjs"));
      tests.add(testPath("long-task-semantic-fact-closure.test.mjs"));
      tests.add(testPath("source-plan-authoring-skill.test.mjs"));
      reasons.push(`${file}:documentation`);
      continue;
    }

    mode = "full-suite";
    reasons.push(`${file}:unclassified_fail_safe`);
  }

  if (mode === "long-task-suite" || mode === "full-suite") tests.clear();
  if (mode === "trust-boundary")
    LONG_TASK_TRUST_TESTS.forEach((test) => tests.delete(test));
  const selected = [...tests].sort();
  const requiresBuild =
    mode !== "selected" || selected.some((test) => !STATIC_TESTS.has(test));
  return plan(mode, selected, requiresBuild, reasons);
}

function plan(mode, tests, requiresBuild, reasons) {
  return {
    mode,
    tier: tierForMode(mode),
    purpose: purposeForMode(mode),
    supersedes: supersededTiers(mode),
    tests: [...new Set(tests)].sort(),
    requires_build: requiresBuild,
    reasons: [...new Set(reasons)].sort(),
  };
}

function supersededTiers(mode) {
  if (mode === "full-suite" || mode === "long-task-suite")
    return ["developer-feedback", "trust-boundary"];
  if (mode === "trust-boundary") return ["developer-feedback"];
  return [];
}

function widen(current, next) {
  const rank = {
    selected: 0,
    "trust-boundary": 1,
    "long-task-suite": 2,
    "full-suite": 3,
  };
  return rank[next] > rank[current] ? next : current;
}

function tierForMode(mode) {
  if (mode === "selected") return "developer-feedback";
  if (mode === "trust-boundary") return "trust-boundary";
  return "release-regression";
}

function purposeForMode(mode) {
  if (mode === "selected") return "task-local defect localization";
  if (mode === "trust-boundary")
    return "high-impact cross-module false-completion regression";
  if (mode === "long-task-suite")
    return "complete Long-Task release regression";
  return "complete package release regression";
}

const normalizePath = normalizeRepositoryPath;
