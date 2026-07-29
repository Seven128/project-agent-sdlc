import assert from "node:assert/strict";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import YAML from "yaml";
import { compileDeliveryContract } from "../../packages/ty-context/dist/lib/long-task-delivery-compiler.js";
import {
  addProductionControlBinding,
  completeControl,
  createDeliveryFixture,
  writeContract,
} from "./long-task-delivery-fixtures.mjs";
import {
  DESIGN_CONDITION_KEY,
  DESIGN_CONDITION_KEYS,
  DESIGN_HANDOFF_PATH,
  DESIGN_RESOURCE_PATH,
  DESIGN_RESOURCE_PATHS,
  DESIGN_SOURCE_ITEM_KEY,
  DESIGN_TARGET_KEY,
  writeDesignResourceHandoff,
  writeDesignResourceHandoffFixture,
} from "./design-resource-handoff-fixture.mjs";

test("compiles V2 generated Claim/Outcome/Check ids and frozen runner targets under two seconds", async () => {
  const fixture = await createDeliveryFixture({ twoOutcomes: true });
  try {
    const started = performance.now();
    const compiled = await compileDeliveryContract(
      fixture.workdir,
      fixture.root,
      { require_completion_gate: false },
    );
    assert.ok(performance.now() - started < 2000);
    assert.equal(compiled.schema_version, "compiled-long-task-delivery-v2");
    assert.equal(compiled.effective_risk, "standard");
    assert.deepEqual(
      compiled.outcomes.map((outcome) => outcome.internal_id),
      ["OUT.first", "OUT.second"],
    );
    assert.deepEqual(
      compiled.outcomes.flatMap((outcome) =>
        outcome.acceptance.checks.map((check) => check.internal_id),
      ),
      ["CHECK.first.first-check", "CHECK.second.second-check"],
    );
    assert.match(compiled.compiled_identity, /^[a-f0-9]{64}$/u);
    assert.equal(compiled.claim_coverage.uncovered_claims.length, 0);
    assert.equal(compiled.claim_coverage.claims_total, 11);
    const check = compiled.outcomes[0].acceptance.checks[0];
    assert.equal(check.runner.resolved_cwd, "");
    assert.equal(check.runner.resolved_target, "tests/oracle.mjs");
    assert.equal(
      check.verification_input_hashes["tests/oracle.mjs"].length,
      64,
    );
    assert.equal(compiled.source_hashes["source.md"].length, 64);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("declared Source paths require Source Claims while outcome_files remains physical compatibility", async () => {
  const sourceFixture = await createDeliveryFixture();
  try {
    sourceFixture.contract.source_claims = [];
    await writeContract(sourceFixture.workdir, sourceFixture.contract);
    await assert.rejects(
      compileDeliveryContract(sourceFixture.workdir, sourceFixture.root, {
        require_completion_gate: false,
      }),
      /source_authority_required/u,
    );
  } finally {
    await rm(sourceFixture.root, { recursive: true, force: true });
  }

  const bundleFixture = await createDeliveryFixture();
  try {
    const bundle = structuredClone(bundleFixture.contract);
    const [outcome] = bundle.outcomes;
    delete bundle.outcomes;
    bundle.outcome_files = ["outcomes/first.yaml"];
    await mkdir(path.join(bundleFixture.workdir, "outcomes"), {
      recursive: true,
    });
    await writeFile(
      path.join(bundleFixture.workdir, "outcomes", "first.yaml"),
      YAML.stringify(outcome),
    );
    await writeContract(bundleFixture.workdir, bundle);
    const compiled = await compileDeliveryContract(
      bundleFixture.workdir,
      bundleFixture.root,
      {
        require_completion_gate: false,
      },
    );
    assert.equal(compiled.outcomes.length, 1);
    assert.equal(Object.keys(compiled.contract_files).length, 1);
  } finally {
    await rm(bundleFixture.root, { recursive: true, force: true });
  }
});

test("preflight rejects invalid Context, missing runner path and Outcome without proof", async () => {
  const fixture = await createDeliveryFixture();
  try {
    fixture.contract.task.context_refs = ["project_context/areas/missing.md"];
    fixture.contract.outcomes[0].product.owner.context_refs = [
      "project_context/areas/missing.md",
    ];
    await writeContract(fixture.workdir, fixture.contract, {
      synchronizeSemanticManifest: false,
    });
    await assert.rejects(
      compileDeliveryContract(fixture.workdir, fixture.root, {
        require_completion_gate: false,
      }),
      /context_ref_invalid/,
    );
    fixture.contract.task.context_refs = ["project_context/areas/main.md"];
    fixture.contract.outcomes[0].product.owner.context_refs = [
      "project_context/areas/main.md",
    ];
    fixture.contract.outcomes[0].acceptance.checks[0].runner.target =
      "tests/missing.mjs";
    await writeContract(fixture.workdir, fixture.contract);
    await assert.rejects(
      compileDeliveryContract(fixture.workdir, fixture.root, {
        require_completion_gate: false,
      }),
      /node_oracle_path_not_found/,
    );
    fixture.contract.outcomes[0].acceptance.checks = [];
    fixture.contract.outcomes[0].acceptance.counterfactual_controls = [];
    await writeContract(fixture.workdir, fixture.contract);
    await assert.rejects(
      compileDeliveryContract(fixture.workdir, fixture.root, {
        require_completion_gate: false,
      }),
      /product_claim_required_surfaces_missing/,
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("preflight rejects missing package scripts and UI outcomes without browser proof", async () => {
  const fixture = await createDeliveryFixture();
  try {
    const check = fixture.contract.outcomes[0].acceptance.checks[0];
    check.runner.type = "package_script";
    check.runner.target = "missing";
    await writeContract(fixture.workdir, fixture.contract);
    await assert.rejects(
      compileDeliveryContract(fixture.workdir, fixture.root, {
        require_completion_gate: false,
      }),
      /package_script_not_found/,
    );
    check.runner.type = "node_oracle";
    check.runner.target = "tests/oracle.mjs";
    fixture.contract.outcomes[0].product.owner_surfaces = ["web/settings"];
    await writeContract(fixture.workdir, fixture.contract);
    await assert.rejects(
      compileDeliveryContract(fixture.workdir, fixture.root, {
        require_completion_gate: false,
      }),
      /ui_outcome_requires_ui_browser_proof/,
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("Long-Task Compile consumes the same strict design handoff through target, Claim and root Assertion bindings", async () => {
  const fixture = await createDeliveryFixture();
  try {
    await attachDesignResourceHandoff(fixture);
    await writeContract(fixture.workdir, fixture.contract);
    const compiled = await compileDeliveryContract(
      fixture.workdir,
      fixture.root,
      { require_completion_gate: false },
    );
    const target =
      compiled.outcomes[0].product.surface_bindings[0].design_targets[0];
    assert.equal(target.key, DESIGN_TARGET_KEY);
    assert.deepEqual(target.condition_keys, DESIGN_CONDITION_KEYS);
    assert.deepEqual(target.source_paths, [
      DESIGN_HANDOFF_PATH,
      ...DESIGN_RESOURCE_PATHS,
    ]);
    assert.deepEqual(
      target.verification_method_bindings.map((item) => item.method).sort(),
      [
        "accessibility_semantics",
        "asset_integrity",
        "component_state",
        "content",
        "design_token",
        "input_method",
        "interaction_trace",
        "layout_geometry",
        "motion_timeline",
        "responsive_reflow",
        "visual_pixel",
      ],
    );
    assert.equal(
      compiled.source_items.some((item) => item.key === DESIGN_SOURCE_ITEM_KEY),
      true,
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("Long-Task Compile binds every declared design verification method to an independent Assertion", async () => {
  const missingMethod = await createDeliveryFixture();
  try {
    await attachDesignResourceHandoff(missingMethod);
    missingMethod.contract.outcomes[0].product.surface_bindings[0].design_targets[0].verification_method_bindings.pop();
    await writeContract(missingMethod.workdir, missingMethod.contract);
    await assert.rejects(
      compileDeliveryContract(missingMethod.workdir, missingMethod.root, {
        require_completion_gate: false,
      }),
      /design_resource_verification_methods_mismatch:main-default/u,
    );
  } finally {
    await rm(missingMethod.root, { recursive: true, force: true });
  }

  const missingClaim = await createDeliveryFixture();
  try {
    await attachDesignResourceHandoff(missingClaim);
    const outcome = missingClaim.contract.outcomes[0];
    const target = outcome.product.surface_bindings[0].design_targets[0];
    const binding = target.verification_method_bindings.find(
      (item) => item.method === "layout_geometry",
    );
    const assertion = outcome.acceptance.checks[0].positive_assertions.find(
      (item) => item.key === binding.assertion_ref,
    );
    assertion.claims = ["result"];
    await writeContract(missingClaim.workdir, missingClaim.contract);
    await assert.rejects(
      compileDeliveryContract(missingClaim.workdir, missingClaim.root, {
        require_completion_gate: false,
      }),
      /design_resource_verification_method_claim_not_asserted:main-default:layout_geometry:design-main:requirement\.design-handoff/u,
    );
  } finally {
    await rm(missingClaim.root, { recursive: true, force: true });
  }

  const reusedEvidence = await createDeliveryFixture();
  try {
    await attachDesignResourceHandoff(reusedEvidence);
    const target =
      reusedEvidence.contract.outcomes[0].product.surface_bindings[0]
        .design_targets[0];
    for (const binding of target.verification_method_bindings)
      for (const artifact of binding.evidence_artifacts)
        artifact.observation_path = "artifacts/reused-settled-screenshot.png";
    await writeContract(reusedEvidence.workdir, reusedEvidence.contract);
    await assert.rejects(
      compileDeliveryContract(reusedEvidence.workdir, reusedEvidence.root, {
        require_completion_gate: false,
      }),
      /ui_design_method_evidence_artifact_reused/u,
    );
  } finally {
    await rm(reusedEvidence.root, { recursive: true, force: true });
  }

  const missingRuntimeCapability = await createDeliveryFixture();
  try {
    await attachDesignResourceHandoff(missingRuntimeCapability);
    const target = missingRuntimeCapability.contract.task.execution_targets[0];
    target.capabilities = target.capabilities.filter(
      (capability) => capability !== "motion-observation",
    );
    await writeContract(
      missingRuntimeCapability.workdir,
      missingRuntimeCapability.contract,
    );
    await assert.rejects(
      compileDeliveryContract(
        missingRuntimeCapability.workdir,
        missingRuntimeCapability.root,
        { require_completion_gate: false },
      ),
      /design_resource_execution_target_capability_missing:main-default:fixture-app:motion-observation/u,
    );
  } finally {
    await rm(missingRuntimeCapability.root, {
      recursive: true,
      force: true,
    });
  }

  const bundledCondition = await createDeliveryFixture();
  try {
    const handoff = await attachDesignResourceHandoff(bundledCondition);
    handoff.conditions[0].display_mode = "planning|dark";
    await writeDesignResourceHandoff(bundledCondition.root, handoff);
    await writeContract(bundledCondition.workdir, bundledCondition.contract);
    await assert.rejects(
      compileDeliveryContract(bundledCondition.workdir, bundledCondition.root, {
        require_completion_gate: false,
      }),
      /display_mode:must match \^\[a-z0-9\]/u,
    );
  } finally {
    await rm(bundledCondition.root, { recursive: true, force: true });
  }
});

test("Long-Task Compile rejects every exact design-fact binding drift", async () => {
  const cases = [
    [
      "missing",
      (target) => {
        const artifact =
          target.verification_method_bindings[0].evidence_artifacts[0];
        artifact.fact_refs = [];
        artifact.fact_expectations = [];
      },
      /design_method_fact_refs_mismatch/u,
    ],
    [
      "extra",
      (target) => {
        const artifact =
          target.verification_method_bindings[0].evidence_artifacts[0];
        artifact.fact_refs.push("fact.unbound");
        artifact.fact_expectations.push({
          ...structuredClone(artifact.fact_expectations[0]),
          fact_ref: "fact.unbound",
        });
      },
      /design_method_fact_refs_mismatch/u,
    ],
    [
      "duplicate",
      (target) => {
        const artifact =
          target.verification_method_bindings[0].evidence_artifacts[0];
        artifact.fact_refs.push(artifact.fact_refs[0]);
        artifact.fact_expectations.push(
          structuredClone(artifact.fact_expectations[0]),
        );
      },
      /ui_design_method_fact_ref_duplicate/u,
    ],
    [
      "wrong method",
      (target) => {
        const first =
          target.verification_method_bindings[0].evidence_artifacts[0];
        const second =
          target.verification_method_bindings[1].evidence_artifacts[0];
        [first.fact_refs, second.fact_refs] = [
          second.fact_refs,
          first.fact_refs,
        ];
        [first.fact_expectations, second.fact_expectations] = [
          second.fact_expectations,
          first.fact_expectations,
        ];
      },
      /design_method_fact_refs_mismatch/u,
    ],
    [
      "wrong condition",
      (target) => {
        const artifacts =
          target.verification_method_bindings[0].evidence_artifacts;
        [artifacts[0].fact_refs, artifacts[1].fact_refs] = [
          artifacts[1].fact_refs,
          artifacts[0].fact_refs,
        ];
        [artifacts[0].fact_expectations, artifacts[1].fact_expectations] = [
          artifacts[1].fact_expectations,
          artifacts[0].fact_expectations,
        ];
      },
      /design_method_fact_refs_mismatch/u,
    ],
    [
      "reused",
      (target) => {
        const artifacts =
          target.verification_method_bindings[0].evidence_artifacts;
        artifacts[1].fact_refs.push(artifacts[0].fact_refs[0]);
        artifacts[1].fact_expectations.push(
          structuredClone(artifacts[0].fact_expectations[0]),
        );
      },
      /design_method_fact_refs_mismatch/u,
    ],
  ];
  for (const [name, mutate, expected] of cases) {
    const fixture = await createDeliveryFixture();
    try {
      await attachDesignResourceHandoff(fixture);
      const target =
        fixture.contract.outcomes[0].product.surface_bindings[0]
          .design_targets[0];
      mutate(target);
      await writeContract(fixture.workdir, fixture.contract);
      await assert.rejects(
        compileDeliveryContract(fixture.workdir, fixture.root, {
          require_completion_gate: false,
        }),
        expected,
        name,
      );
    } finally {
      await rm(fixture.root, { recursive: true, force: true });
    }
  }
});

test("Long-Task Compile freezes every per-Fact expectation authority field", async () => {
  const locatedDrift = {
    locator: {
      resource_ref: "resource.main",
      kind: "json_pointer",
      value: "/drift",
    },
    sha256: "f".repeat(64),
  };
  const cases = [
    [
      "missing expectation",
      (artifact) => artifact.fact_expectations.pop(),
      /ui_design_method_fact_expectation_refs_mismatch/u,
    ],
    [
      "extra expectation",
      (artifact) =>
        artifact.fact_expectations.push({
          ...structuredClone(artifact.fact_expectations[0]),
          fact_ref: "fact.unbound",
        }),
      /ui_design_method_fact_expectation_refs_mismatch/u,
    ],
    [
      "duplicate expectation",
      (artifact) =>
        artifact.fact_expectations.push(
          structuredClone(artifact.fact_expectations[0]),
        ),
      /ui_design_method_fact_expectation_duplicate/u,
    ],
    [
      "subject identity",
      (_artifact, expectation) => {
        expectation.subject_ref = "subject.drift";
      },
      /design_method_fact_expectations_mismatch/u,
    ],
    [
      "expected locator",
      (_artifact, expectation) => {
        expectation.expected.locator.value = "/drift";
      },
      /design_method_fact_expectations_mismatch/u,
    ],
    [
      "expected digest",
      (_artifact, expectation) => {
        expectation.expected.sha256 = "f".repeat(64);
      },
      /design_method_fact_expectations_mismatch/u,
    ],
    [
      "comparator",
      (_artifact, expectation) => {
        expectation.comparison.comparator = "content_equal";
      },
      /design_method_fact_expectations_mismatch/u,
    ],
    [
      "comparison parameters",
      (_artifact, expectation) => {
        expectation.comparison.parameters = structuredClone(locatedDrift);
      },
      /design_method_fact_expectations_mismatch/u,
    ],
    [
      "tolerance",
      (_artifact, expectation) => {
        expectation.comparison.tolerance = structuredClone(locatedDrift);
      },
      /design_method_fact_expectations_mismatch/u,
    ],
    [
      "mask",
      (_artifact, expectation) => {
        expectation.comparison.mask = structuredClone(locatedDrift);
      },
      /design_method_fact_expectations_mismatch/u,
    ],
    [
      "oracle identity",
      (_artifact, expectation) => {
        expectation.oracle.identity = "different-oracle";
      },
      /design_method_fact_expectations_mismatch/u,
    ],
    [
      "environment identity",
      (_artifact, expectation) => {
        expectation.environment.definition.sha256 = "f".repeat(64);
      },
      /design_method_fact_expectations_mismatch/u,
    ],
  ];
  for (const [name, mutate, expected] of cases) {
    const fixture = await createDeliveryFixture();
    try {
      await attachDesignResourceHandoff(fixture);
      const artifact =
        fixture.contract.outcomes[0].product.surface_bindings[0]
          .design_targets[0].verification_method_bindings[0]
          .evidence_artifacts[0];
      mutate(artifact, artifact.fact_expectations[0]);
      await writeContract(fixture.workdir, fixture.contract);
      await assert.rejects(
        compileDeliveryContract(fixture.workdir, fixture.root, {
          require_completion_gate: false,
        }),
        expected,
        name,
      );
    } finally {
      await rm(fixture.root, { recursive: true, force: true });
    }
  }
});

test("Long-Task Compile rejects handoff target drift and unbound handoff blockers", async () => {
  const targetFixture = await createDeliveryFixture();
  try {
    await attachDesignResourceHandoff(targetFixture);
    targetFixture.contract.outcomes[0].product.surface_bindings[0].design_targets[0].condition_keys =
      ["other-condition"];
    await writeContract(targetFixture.workdir, targetFixture.contract);
    await assert.rejects(
      compileDeliveryContract(targetFixture.workdir, targetFixture.root, {
        require_completion_gate: false,
      }),
      /ui_design_method_evidence_conditions_mismatch/u,
    );
  } finally {
    await rm(targetFixture.root, { recursive: true, force: true });
  }

  const blockerFixture = await createDeliveryFixture();
  try {
    const handoff = await attachDesignResourceHandoff(blockerFixture);
    handoff.acceptance_blockers.push(
      designAcceptanceBlocker(handoff, "accessibility_semantics"),
    );
    await writeDesignResourceHandoff(blockerFixture.root, handoff);
    await writeContract(blockerFixture.workdir, blockerFixture.contract);
    await assert.rejects(
      compileDeliveryContract(blockerFixture.workdir, blockerFixture.root, {
        require_completion_gate: false,
      }),
      /acceptance_blockers_unresolved:accessibility-proof/u,
    );
  } finally {
    await rm(blockerFixture.root, { recursive: true, force: true });
  }

  const blockerLineageFixture = await createDeliveryFixture();
  try {
    const handoff = await attachDesignResourceHandoff(blockerLineageFixture);
    const handoffBlocker = designAcceptanceBlocker(
      handoff,
      "accessibility_semantics",
    );
    handoff.acceptance_blockers.push(handoffBlocker);
    const binding =
      blockerLineageFixture.contract.outcomes[0].product.surface_bindings[0];
    binding.acceptance_blockers.push({
      key: handoffBlocker.key,
      status: "machine_claim",
      refs: ["requirement.design-handoff"],
      source_item_refs: [DESIGN_SOURCE_ITEM_KEY],
      verification_methods: [...handoffBlocker.verification_methods],
      required_capabilities: ["assistive-technology"],
      rationale:
        "Even a mirrored downstream binding cannot launder an unresolved handoff blocker.",
    });
    await writeDesignResourceHandoff(blockerLineageFixture.root, handoff);
    await writeContract(
      blockerLineageFixture.workdir,
      blockerLineageFixture.contract,
    );
    await assert.rejects(
      compileDeliveryContract(
        blockerLineageFixture.workdir,
        blockerLineageFixture.root,
        { require_completion_gate: false },
      ),
      /acceptance_blockers_unresolved:accessibility-proof/u,
    );
  } finally {
    await rm(blockerLineageFixture.root, {
      recursive: true,
      force: true,
    });
  }
});

test("counterfactual mutation must stay on carriers and cannot delete verification inputs", async () => {
  const fixture = await createDeliveryFixture();
  try {
    const outcome = fixture.contract.outcomes[0];
    const check = outcome.acceptance.checks[0];
    fixture.contract.risk.requested_level = "strict";
    check.negative_assertions.push({
      key: "result-not-false",
      criterion: "The result remains comparable in the negative scenario.",
      claims: [],
      observation: "result_not_false",
      evidence_capabilities: ["state_delta"],
      operator: "not_equals",
      expected: false,
    });
    outcome.acceptance.counterfactual_controls.push({
      key: "missing-carrier",
      binding_key: "state-first",
      claims: ["obligation.implement-first"],
      check_key: check.key,
      mutation: {
        type: "replace_file",
        path: "src/missing.json",
        fixture_path: "tests/semantic-false.json",
      },
      expected_assertion_failures: ["first-obligation"],
      preserved_assertions: ["first-liveness"],
    });
    await writeContract(fixture.workdir, fixture.contract);
    await assert.rejects(
      compileDeliveryContract(fixture.workdir, fixture.root, {
        require_completion_gate: false,
      }),
      /counterfactual_path_outside_binding:first:missing-carrier:src\/missing\.json/,
    );
    outcome.acceptance.counterfactual_controls[0].mutation.path =
      "tests/oracle.mjs";
    await writeContract(fixture.workdir, fixture.contract);
    await assert.rejects(
      compileDeliveryContract(fixture.workdir, fixture.root, {
        require_completion_gate: false,
      }),
      /counterfactual_verification_input_protected/,
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

async function attachDesignResourceHandoff(fixture) {
  const { handoff } = await writeDesignResourceHandoffFixture(fixture.root);
  await writeFile(
    path.join(fixture.root, "tests", "ui.spec.mjs"),
    "export const designHandoffFixture = true;\n",
  );
  const outcome = fixture.contract.outcomes[0];
  const check = outcome.acceptance.checks[0];
  fixture.contract.task.execution_targets[0].capabilities.push(
    "pointer-input",
    "keyboard-input",
    "viewport-control",
    "motion-observation",
    "assistive-technology",
    "pixel-density-observation",
    "safe-area-observation",
    "network-state-control",
    "lifecycle-control",
  );
  fixture.contract.task.execution_targets.push({
    key: "fixture-browser",
    description: "The fixture browser support target.",
    role: "support",
    runtime_family: "browser",
    root_entrypoint: "tests/ui.spec.mjs",
    capabilities: [
      "browser-runtime",
      "cold-start",
      "production-root",
      "pointer-input",
      "keyboard-input",
      "viewport-control",
      "motion-observation",
      "assistive-technology",
    ],
  });
  outcome.acceptance.checks.push({
    key: "first-ui-check",
    journey_roles: ["success"],
    execution_target: {
      target_ref: "fixture-browser",
      entrypoint: "root",
    },
    scenario: {
      given: [{ key: "ui-loaded", statement: "Load the fixture UI." }],
      when: [{ key: "inspect-ui", statement: "Inspect the fixture UI." }],
    },
    proof_surface: "ui_browser",
    runner: {
      type: "playwright_test",
      target: "tests/ui.spec.mjs",
      argv: [],
      cwd: ".",
      timeout_ms: 30000,
      effect: "read_only",
      retry_policy: "none",
      idempotent: true,
    },
    verification_inputs: ["tests/ui.spec.mjs"],
    input_paths: ["src/**"],
    expected_output_paths: [],
    artifact_globs: [],
    positive_assertions: [],
    negative_assertions: [],
    environment_requirements: [],
  });
  outcome.product.requirements.push({
    key: "design-handoff",
    statement:
      "The main surface must conform to every declared atomic observable design Fact.",
    required_proof_surfaces: ["runtime_behavior"],
    applicability_refs: ["first-root-success"],
  });
  outcome.product.controls.push(
    completeControl({
      key: "main",
      surface: "fixture-main",
      location: "main content",
    }),
  );
  check.verification_inputs.push(DESIGN_HANDOFF_PATH, ...DESIGN_RESOURCE_PATHS);
  check.artifact_globs = ["artifacts/**"];
  const verificationMethods = [
    ...new Set(handoff.proof_obligations.map((proof) => proof.method)),
  ];
  for (const method of verificationMethods) {
    const capabilities =
      method === "interaction_trace"
        ? ["design_method", "interaction_trace", "target_runtime"]
        : method === "component_state"
          ? [
              "design_method",
              "design_conformance",
              "interaction_trace",
              "target_runtime",
            ]
          : ["design_method", "design_conformance", "target_runtime"];
    const assertion = structuredClone(check.positive_assertions[0]);
    assertion.key = `design-${method.replaceAll("_", "-")}`;
    assertion.observation = `design_${method}`;
    assertion.claims = ["requirement.design-handoff"];
    assertion.evidence_capabilities = [
      ...new Set([...assertion.evidence_capabilities, ...capabilities]),
    ];
    check.positive_assertions.push(assertion);
    outcome.acceptance.counterfactual_controls[0].expected_assertion_failures.push(
      assertion.key,
    );
  }
  outcome.acceptance.counterfactual_controls[0].claims.push(
    "requirement.design-handoff",
    "control.main.surface",
    "control.main.location",
  );
  addProductionControlBinding(fixture.contract, {
    controlKey: "main",
    rootClaimRef: "control.main.location",
    designTargets: [
      {
        key: DESIGN_TARGET_KEY,
        interpretation: "exact_target",
        source_paths: [DESIGN_HANDOFF_PATH, ...DESIGN_RESOURCE_PATHS],
        condition_keys: DESIGN_CONDITION_KEYS,
        claim_refs: ["control.main.location"],
        conformance_check_ref: "first-check",
        conformance_assertion_ref: "main-location-proof",
        verification_method_bindings: verificationMethods.map((method) => ({
          method,
          assertion_ref: `design-${method.replaceAll("_", "-")}`,
          evidence_artifacts: DESIGN_CONDITION_KEYS.map((conditionKey) => ({
            condition_key: conditionKey,
            path: `artifacts/method-${method}-${conditionKey}.json`,
            observation_path: `artifacts/observation-${method}-${conditionKey}.json`,
            fact_refs: handoff.proof_obligations
              .filter(
                (proof) =>
                  proof.method === method &&
                  handoff.facts.some(
                    (fact) =>
                      fact.key === proof.fact_ref &&
                      fact.condition_ref === conditionKey,
                  ),
              )
              .map((proof) => proof.fact_ref),
            fact_expectations: handoff.proof_obligations
              .filter(
                (proof) =>
                  proof.method === method &&
                  handoff.facts.some(
                    (fact) =>
                      fact.key === proof.fact_ref &&
                      fact.condition_ref === conditionKey,
                  ),
              )
              .map((proof) => designFactExpectation(handoff, proof)),
          })),
        })),
        actual_artifact_path: "artifacts/design-actual.json",
        comparison_artifact_path: "artifacts/design-comparison.json",
      },
    ],
  });
  const rootAssertion = check.positive_assertions.find(
    (assertion) => assertion.key === "main-location-proof",
  );
  rootAssertion.evidence_capabilities.push("design_conformance");
  fixture.contract.task.source_paths.push(DESIGN_HANDOFF_PATH);
  fixture.contract.source_claims.push({
    key: DESIGN_SOURCE_ITEM_KEY,
    source_ref: `${DESIGN_HANDOFF_PATH}#main-design`,
    statement:
      "The main surface must conform to every declared atomic observable design Fact.",
    disposition: {
      type: "claim",
      refs: ["first.requirement.design-handoff"],
    },
  });
  return handoff;
}

function designFactExpectation(handoff, proof) {
  const fact = handoff.facts.find((item) => item.key === proof.fact_ref);
  const oracle = handoff.oracles.find((item) => item.key === proof.oracle_ref);
  const environment = handoff.environments.find(
    (item) => item.key === proof.environment_ref,
  );
  return {
    fact_ref: fact.key,
    subject_ref: fact.subject_ref,
    variation_ref: fact.variation_ref,
    property_ref: fact.property_ref,
    observation_sensitivity: fact.observation_sensitivity,
    expected: structuredClone(fact.value),
    comparison: structuredClone(proof.comparison),
    oracle: {
      key: oracle.key,
      trust: oracle.trust,
      identity: oracle.identity,
      version: oracle.version,
      sha256: oracle.sha256,
    },
    environment: {
      key: environment.key,
      identity: environment.identity,
      definition: structuredClone(environment.definition),
    },
  };
}

function designAcceptanceBlocker(handoff, method) {
  const proof = handoff.proof_obligations.find(
    (item) => item.method === method,
  );
  const fact = handoff.facts.find((item) => item.key === proof.fact_ref);
  return {
    key: "accessibility-proof",
    target_refs: [fact.target_ref],
    subject_refs: [fact.subject_ref],
    dimensions: [fact.dimension],
    fact_cell_refs: [fact.cell_ref],
    fact_refs: [fact.key],
    proof_obligation_refs: [proof.key],
    source_item_refs: [...fact.source_item_refs],
    verification_methods: [proof.method],
    required_capabilities: ["assistive-technology"],
    description:
      "The production semantic tree remains unresolved and must block ready handoff.",
  };
}
