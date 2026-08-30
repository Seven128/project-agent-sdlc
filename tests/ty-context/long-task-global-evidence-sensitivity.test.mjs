import assert from "node:assert/strict";
import { rm, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { preflightDeliveryContract } from "../../packages/ty-context/dist/lib/long-task-authoring-preflight.js";
import { compileDeliveryContract } from "../../packages/ty-context/dist/lib/long-task-delivery-compiler.js";
import {
  globalCompatibleOutcomeApplicabilityCoverage,
  sameOutcomeApplicabilityCoverage,
} from "../../packages/ty-context/dist/lib/long-task-applicability-identity.js";
import {
  createDeliveryFixture,
  deliveryContract,
  runCli,
  runCliFailure,
  writeContract,
} from "./long-task-delivery-fixtures.mjs";
import {
  addGlobalClaim,
  addGlobalCounterfactual,
  assertPreflightAndCompileReject,
  GLOBAL_PRODUCT_PATH,
} from "./long-task-global-evidence-sensitivity-fixture.mjs";
import { expectDecision } from "./long-task-semantic-authority-revision-fixture.mjs";
import { mutateFixtureSemanticManifest } from "./long-task-semantic-fact-test-support.mjs";

test("Global Semantic Fact bindings reject an Outcome-1 proxy and allow exact target closure", async () => {
  const fixture = await createDeliveryFixture({ twoOutcomes: true });
  try {
    await addGlobalClaim(fixture, { counterfactual: true });
    const complete = structuredClone(
      fixture.contract.global.semantic_fact_bindings.obligations,
    );
    fixture.contract.global.semantic_fact_bindings.obligations =
      complete.filter((binding) => binding.outcome_ref === "first");
    await assertPreflightAndCompileReject(
      fixture,
      "global_semantic_fact_target_coverage_incomplete",
    );

    fixture.contract.global.semantic_fact_bindings.obligations = complete;
    await writeContract(fixture.workdir, fixture.contract);
    assert.equal(
      (await preflightDeliveryContract(fixture.workdir, fixture.root)).status,
      "ready",
    );
    const compiled = await compileDeliveryContract(
      fixture.workdir,
      fixture.root,
      { require_completion_gate: false },
    );
    const globalClaimObligation =
      compiled.acceptance_reachability.obligations.find(
        (obligation) =>
          obligation.claim_ref === "GLOBAL.constraint.global-state",
      );
    assert.equal(globalClaimObligation?.outcome_key, null);
    assert.equal(
      globalClaimObligation?.applicability_ref,
      "global-root-success",
    );
    assert.deepEqual(
      compiled.acceptance_reachability.obligations
        .filter((obligation) =>
          complete.some((binding) => binding.fact_ref === obligation.fact_ref),
        )
        .map((obligation) => [
          obligation.outcome_key,
          obligation.fact_ref,
          obligation.proof_ref,
          obligation.method,
        ])
        .sort((left, right) => String(left[0]).localeCompare(String(right[0]))),
      complete.map((binding) => [
        binding.outcome_ref,
        binding.fact_ref,
        binding.proof_ref,
        binding.method,
      ]),
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("Global applicability coverage requires every compatible Outcome-local row", () => {
  const contract = deliveryContract();
  const globalApplicability = structuredClone(
    contract.outcomes[0].applicability[0],
  );
  globalApplicability.key = "global-compatible";
  const duplicateLocal = structuredClone(contract.outcomes[0].applicability[0]);
  duplicateLocal.key = "first-compatible-second";
  contract.outcomes[0].applicability.push(duplicateLocal);
  const coverage = globalCompatibleOutcomeApplicabilityCoverage(
    contract,
    globalApplicability,
  );
  assert.deepEqual(coverage.missing_outcome_refs, []);
  assert.deepEqual(coverage.required_pairs, [
    {
      outcome_ref: "first",
      applicability_ref: "first-compatible-second",
    },
    { outcome_ref: "first", applicability_ref: "first-root-success" },
  ]);
  assert.equal(
    sameOutcomeApplicabilityCoverage(
      coverage.required_pairs,
      coverage.required_pairs.slice(0, 1),
    ),
    false,
  );
  assert.equal(
    sameOutcomeApplicabilityCoverage(
      coverage.required_pairs,
      coverage.required_pairs,
    ),
    true,
  );
});

test("Global Semantic Fact bindings reject same-target different dimensions", async () => {
  const fixture = await createDeliveryFixture();
  try {
    await addGlobalClaim(fixture, { counterfactual: true });
    const applicability = fixture.contract.outcomes[0].applicability.find(
      (candidate) => candidate.key === "first-root-success",
    );
    assert.ok(applicability);
    assert.equal(applicability.target_ref, "fixture-app");
    applicability.dimensions = [
      { key: "fixture-state", value: "different-condition" },
    ];
    await assertPreflightAndCompileReject(
      fixture,
      "global_semantic_fact_applicability_profile_mismatch",
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("Global Semantic Fact bindings reject same-target different journey role", async () => {
  await assertSameTargetApplicabilityDrift((_fixture, applicability) => {
    applicability.journey_role = "stage_gate";
  });
});

test("Global Semantic Fact bindings reject same-target different Given set", async () => {
  await assertSameTargetApplicabilityDrift((fixture, applicability) => {
    const step = {
      key: "outcome-local-given",
      statement: "Load the outcome-local state.",
    };
    applicability.given_refs.push(step.key);
    for (const check of fixture.contract.outcomes[0].acceptance.checks)
      check.scenario.given.push(structuredClone(step));
  });
});

test("Global Semantic Fact bindings reject same-target different ordered When", async () => {
  await assertSameTargetApplicabilityDrift((fixture, applicability) => {
    const step = {
      key: "outcome-local-when",
      statement: "Read the outcome-local state.",
    };
    applicability.when_refs.push(step.key);
    for (const check of fixture.contract.outcomes[0].acceptance.checks)
      check.scenario.when.push(structuredClone(step));
  });
});

async function assertSameTargetApplicabilityDrift(mutate) {
  const fixture = await createDeliveryFixture();
  try {
    await addGlobalClaim(fixture, { counterfactual: true });
    const applicability = fixture.contract.outcomes[0].applicability.find(
      (candidate) => candidate.key === "first-root-success",
    );
    assert.ok(applicability);
    mutate(fixture, applicability);
    await assertPreflightAndCompileReject(
      fixture,
      "global_semantic_fact_applicability_profile_mismatch",
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
}

test("Global Semantic Fact bindings reject reversed When order", async () => {
  const fixture = await createDeliveryFixture();
  try {
    await addGlobalClaim(fixture, { counterfactual: true });
    const nextStep = {
      key: "confirm-outcome",
      statement: "Confirm the selected outcome.",
    };
    for (const check of fixture.contract.global.acceptance.checks)
      check.scenario.when.push(structuredClone(nextStep));
    for (const check of fixture.contract.outcomes.flatMap(
      (outcome) => outcome.acceptance.checks,
    ))
      check.scenario.when.unshift(structuredClone(nextStep));
    const globalApplicability = fixture.contract.global.applicability.find(
      (candidate) => candidate.key === "global-root-success",
    );
    const localApplicability = fixture.contract.outcomes[0].applicability.find(
      (candidate) => candidate.key === "first-root-success",
    );
    assert.ok(globalApplicability);
    assert.ok(localApplicability);
    globalApplicability.when_refs = ["read-outcome", nextStep.key];
    localApplicability.when_refs = [nextStep.key, "read-outcome"];
    await assertPreflightAndCompileReject(
      fixture,
      "global_semantic_fact_applicability_profile_mismatch",
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("Global Semantic Fact bindings reject an unrelated Outcome Fact", async () => {
  const fixture = await createDeliveryFixture();
  try {
    await addGlobalClaim(fixture, { counterfactual: true });
    const binding =
      fixture.contract.global.semantic_fact_bindings.obligations[0];
    binding.fact_ref = "fact.first.observable";
    binding.proof_ref = "proof.first.observable.exact";
    await assertPreflightAndCompileReject(
      fixture,
      "global_semantic_fact_source_lineage_missing",
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("Global Semantic Fact methods raise the broad Global Claim capability floor", async () => {
  const fixture = await createDeliveryFixture();
  try {
    await addGlobalClaim(fixture, { counterfactual: true });
    const globalBinding =
      fixture.contract.global.semantic_fact_bindings.obligations[0];
    const outcome = fixture.contract.outcomes[0];
    const proofBinding = outcome.semantic_fact_bindings.proofs.find(
      (binding) => binding.proof_ref === globalBinding.proof_ref,
    );
    assert.ok(proofBinding);
    proofBinding.method = "durable_roundtrip";
    proofBinding.evidence_capabilities = [
      "semantic_fact",
      "data_state",
      "durable_readback",
    ];
    const factBinding = outcome.semantic_fact_bindings.facts.find(
      (binding) => binding.fact_ref === globalBinding.fact_ref,
    );
    assert.ok(factBinding);
    const assertion = outcome.acceptance.checks[0].positive_assertions.find(
      (candidate) => candidate.claims[0] === factBinding.claim_ref,
    );
    assert.ok(assertion);
    assertion.evidence_capabilities = [
      "semantic_fact",
      "data_state",
      "durable_readback",
    ];
    globalBinding.method = "durable_roundtrip";
    await mutateFixtureSemanticManifest(fixture, (manifest) => {
      const proof = manifest.proof_obligations.find(
        (candidate) => candidate.key === globalBinding.proof_ref,
      );
      assert.ok(proof);
      proof.method = "durable_roundtrip";
      proof.evidence_capabilities = [
        "semantic_fact",
        "data_state",
        "durable_readback",
      ];
      const oracle = manifest.oracles.find(
        (candidate) => candidate.key === proof.oracle_ref,
      );
      assert.ok(oracle);
      if (!oracle.capabilities.includes("durable_roundtrip"))
        oracle.capabilities.push("durable_roundtrip");
      const fact = manifest.facts.find(
        (candidate) => candidate.key === globalBinding.fact_ref,
      );
      assert.ok(fact);
      const property = manifest.property_dispositions.find(
        (candidate) => candidate.key === fact.property_ref,
      );
      assert.ok(property);
      property.required_methods = ["durable_roundtrip"];
      property.required_evidence_capabilities = [
        "semantic_fact",
        "data_state",
        "durable_readback",
      ];
    });
    await assertPreflightAndCompileReject(
      fixture,
      "proof_adequacy_capability_missing",
      { synchronizeSemanticManifest: false },
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("Global Semantic Fact bindings require every Fact proof method", async () => {
  const fixture = await createDeliveryFixture();
  try {
    await addGlobalClaim(fixture, { counterfactual: true });
    const globalBinding =
      fixture.contract.global.semantic_fact_bindings.obligations[0];
    const outcome = fixture.contract.outcomes.find(
      (candidate) => candidate.key === globalBinding.outcome_ref,
    );
    assert.ok(outcome);
    const proofBinding = outcome.semantic_fact_bindings.proofs.find(
      (candidate) => candidate.proof_ref === globalBinding.proof_ref,
    );
    assert.ok(proofBinding);
    const addedProofRef = `${globalBinding.proof_ref}.second-method`;
    const addedMethod = "custom.second-exact";
    const addedAssertionRef = "first-global-state-second-method";
    const check = outcome.acceptance.checks.find(
      (candidate) => candidate.key === proofBinding.check_ref,
    );
    const assertion = check?.positive_assertions.find(
      (candidate) => candidate.key === proofBinding.assertion_ref,
    );
    assert.ok(check);
    assert.ok(assertion);
    check.positive_assertions.push({
      ...structuredClone(assertion),
      key: addedAssertionRef,
      observation: "first_global_state_second_method_result",
    });
    const counterfactual = outcome.acceptance.counterfactual_controls.find(
      (candidate) => candidate.key === "remove-first-state",
    );
    assert.ok(counterfactual);
    counterfactual.expected_assertion_failures.push(addedAssertionRef);
    outcome.semantic_fact_bindings.proofs.push({
      ...structuredClone(proofBinding),
      proof_ref: addedProofRef,
      method: addedMethod,
      assertion_ref: addedAssertionRef,
    });
    await mutateFixtureSemanticManifest(fixture, (manifest) => {
      const fact = manifest.facts.find(
        (candidate) => candidate.key === globalBinding.fact_ref,
      );
      assert.ok(fact);
      const property = manifest.property_dispositions.find(
        (candidate) => candidate.key === fact.property_ref,
      );
      const proof = manifest.proof_obligations.find(
        (candidate) => candidate.key === globalBinding.proof_ref,
      );
      const oracle = manifest.oracles.find(
        (candidate) => candidate.key === proof?.oracle_ref,
      );
      assert.ok(property);
      assert.ok(proof);
      assert.ok(oracle);
      property.required_methods.push(addedMethod);
      if (!oracle.capabilities.includes(addedMethod))
        oracle.capabilities.push(addedMethod);
      const proofIndex = manifest.proof_obligations.length;
      manifest.proof_obligations.push({
        ...structuredClone(proof),
        key: addedProofRef,
        method: addedMethod,
        comparison: {
          ...structuredClone(proof.comparison),
          parameters: {
            ...structuredClone(proof.comparison.parameters),
            locator: {
              ...structuredClone(proof.comparison.parameters.locator),
              value: `/proof_obligations/${proofIndex}/comparison/parameters/value`,
            },
          },
        },
      });
    });
    await assertPreflightAndCompileReject(
      fixture,
      "global_semantic_fact_method_coverage_incomplete",
      { synchronizeSemanticManifest: false },
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("Global structured Claims require a same-Check Global Counterfactual", async () => {
  const fixture = await createDeliveryFixture();
  try {
    await addGlobalClaim(fixture, { counterfactual: false });
    await assertPreflightAndCompileReject(
      fixture,
      "global_structured_evidence_sensitivity_required",
    );

    await addGlobalCounterfactual(fixture.contract);
    await writeContract(fixture.workdir, fixture.contract);
    assert.equal(
      (await preflightDeliveryContract(fixture.workdir, fixture.root)).status,
      "ready",
    );
    await assert.doesNotReject(
      compileDeliveryContract(fixture.workdir, fixture.root, {
        require_completion_gate: false,
      }),
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("Global Checks preserve Outcome-scoped Binding identity while deduplicating physical closure paths", async () => {
  for (const [scenario, secondPath, expectedPhysicalPaths] of [
    ["same physical path", "src/state.json", ["src/state.json"]],
    [
      "different physical paths",
      "src/second-state.json",
      ["src/second-state.json", "src/state.json"],
    ],
  ]) {
    const fixture = await createDeliveryFixture({ twoOutcomes: true });
    try {
      await addGlobalClaim(fixture, { counterfactual: true });
      const [first, second] = fixture.contract.outcomes;
      const firstBinding = first.technical.bindings.find(
        (binding) => binding.key === "state-first",
      );
      const secondBinding = second.technical.bindings.find(
        (binding) => binding.key === "state-second",
      );
      assert.ok(firstBinding, `${scenario}: first state Binding is required`);
      assert.ok(secondBinding, `${scenario}: second state Binding is required`);
      first.technical.bindings.push({
        ...structuredClone(firstBinding),
        key: "shared-state",
      });
      second.technical.bindings.push({
        ...structuredClone(secondBinding),
        key: "shared-state",
        target: secondPath,
        carrier_paths: [secondPath],
      });
      fixture.contract.global.acceptance.counterfactual_controls[0].binding_ref =
        "first.shared-state";
      const authoredGlobalCheck =
        fixture.contract.global.acceptance.checks.find(
          (check) => check.key === "global-state-check",
        );
      assert.ok(authoredGlobalCheck);
      if (!authoredGlobalCheck.input_paths.includes(secondPath))
        authoredGlobalCheck.input_paths.push(secondPath);
      if (secondPath !== "src/state.json")
        await writeFile(
          path.join(fixture.root, ...secondPath.split("/")),
          '{"second":true}\n',
        );
      await writeContract(fixture.workdir, fixture.contract);

      const compiled = await compileDeliveryContract(
        fixture.workdir,
        fixture.root,
        { require_completion_gate: false },
      );
      const globalCheck = compiled.global.acceptance.checks.find(
        (check) => check.key === "global-state-check",
      );
      assert.ok(globalCheck, `${scenario}: compiled Global Check is required`);
      const scopedRefs =
        globalCheck.process_runtime_closure.production_binding_refs
          .filter((bindingRef) => bindingRef.endsWith(".shared-state"))
          .sort();
      assert.deepEqual(scopedRefs, [
        "first.shared-state",
        "second.shared-state",
      ]);
      assert.deepEqual(
        globalCheck.process_runtime_closure.production_carrier_files.filter(
          (file) => file.startsWith("src/"),
        ),
        expectedPhysicalPaths,
      );
      for (const authority of globalCheck.observation_authorities)
        assert.deepEqual(
          authority.carrier_refs
            .map((carrier) => carrier.binding_ref)
            .filter((bindingRef) => bindingRef.endsWith(".shared-state"))
            .sort(),
          ["first.shared-state", "second.shared-state"],
        );
      assert.ok(
        compiled.outcomes[0].acceptance.checks[0].observation_authorities.every(
          (authority) =>
            authority.carrier_refs.every((carrier) =>
              carrier.binding_ref.startsWith("first."),
            ),
        ),
      );
      assert.ok(
        compiled.outcomes[1].acceptance.checks[0].observation_authorities.every(
          (authority) =>
            authority.carrier_refs.every((carrier) =>
              carrier.binding_ref.startsWith("second."),
            ),
        ),
      );
    } finally {
      await rm(fixture.root, { recursive: true, force: true });
    }
  }
});

test("Outcome and other-Global Counterfactuals cannot cover a Global Check", async () => {
  const outcomeOnly = await createDeliveryFixture();
  try {
    await addGlobalClaim(outcomeOnly, { counterfactual: false });
    assert.ok(
      outcomeOnly.contract.outcomes[0].acceptance.counterfactual_controls
        .length > 0,
    );
    await assertPreflightAndCompileReject(
      outcomeOnly,
      "global_structured_evidence_sensitivity_required",
    );
  } finally {
    await rm(outcomeOnly.root, { recursive: true, force: true });
  }

  const otherGlobal = await createDeliveryFixture();
  try {
    await addGlobalClaim(otherGlobal, { counterfactual: false });
    const second = structuredClone(
      otherGlobal.contract.global.acceptance.checks[0],
    );
    const otherApplicability = structuredClone(
      otherGlobal.contract.global.applicability[0],
    );
    otherApplicability.key = "other-global-success";
    otherApplicability.dimensions = [
      { key: "fixture-state", value: "other-loaded" },
    ];
    otherGlobal.contract.global.applicability.push(otherApplicability);
    const globalConstraint =
      otherGlobal.contract.global.technical.constraints.find(
        (constraint) => constraint.key === "global-state",
      );
    assert.ok(globalConstraint);
    globalConstraint.applicability_refs.push(otherApplicability.key);
    otherGlobal.contract.global.semantic_fact_bindings.obligations.push(
      ...otherGlobal.contract.global.semantic_fact_bindings.obligations.map(
        (binding) => ({
          ...structuredClone(binding),
          applicability_ref: otherApplicability.key,
        }),
      ),
    );
    second.key = "other-global-check";
    process.env.TY_CONTEXT_OTHER_GLOBAL_SCOPE ??= "fixture-other-global";
    second.environment_requirements = [
      {
        key: "other-global-scope",
        kind: "env_var",
        target: "TY_CONTEXT_OTHER_GLOBAL_SCOPE",
      },
    ];
    second.positive_assertions[0].key = "other-global-assertion";
    second.positive_assertions[0].applicability_ref = otherApplicability.key;
    otherGlobal.contract.global.acceptance.checks.push(second);
    otherGlobal.contract.global.acceptance.counterfactual_controls.push({
      key: "other-global-control",
      binding_ref: "first.state-first",
      claims: ["constraint.global-state"],
      check_key: second.key,
      mutation: {
        type: "replace_json_value",
        path: "src/state.json",
        pointer: "/first",
        value: false,
      },
      expected_assertion_failures: ["other-global-assertion"],
      preserved_assertions: ["global-state-liveness"],
    });
    await assertPreflightAndCompileReject(
      otherGlobal,
      "global_semantic_fact_applicability_profile_mismatch",
    );
  } finally {
    await rm(otherGlobal.root, { recursive: true, force: true });
  }
});

test("an unrelated Global Counterfactual cannot cover a Claim-bearing Global Check", async () => {
  const fixture = await createDeliveryFixture();
  try {
    await addGlobalClaim(fixture, { counterfactual: false });
    const globalCheck = fixture.contract.global.acceptance.checks[0];
    assert.ok(globalCheck);
    assert.deepEqual(globalCheck.positive_assertions[0].claims, [
      "constraint.global-state",
    ]);
    fixture.contract.global.acceptance.counterfactual_controls.push({
      key: "unrelated-global-control",
      binding_ref: "first.state-first",
      claims: ["constraint.global-state"],
      check_key: globalCheck.key,
      mutation: {
        type: "replace_json_value",
        path: "src/state.json",
        pointer: "/first",
        value: false,
      },
      expected_assertion_failures: ["global-state-liveness"],
      preserved_assertions: ["global-state-assertion"],
    });
    await assertPreflightAndCompileReject(
      fixture,
      "global_counterfactual_claim_unrelated",
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("Global Counterfactual binding_ref and Assertion relations fail closed", async () => {
  for (const scenario of [
    {
      name: "unknown binding",
      mutate(control) {
        control.binding_ref = "first.unknown-binding";
      },
      code: "global_counterfactual_binding_unknown",
    },
    {
      name: "unknown check",
      mutate(control) {
        control.check_key = "unknown-check";
      },
      code: "global_counterfactual_check_unknown",
    },
    {
      name: "unrelated Assertion",
      mutate(control) {
        control.expected_assertion_failures = ["missing-assertion"];
      },
      code: "global_counterfactual_assertion_unknown",
    },
  ]) {
    const fixture = await createDeliveryFixture();
    try {
      await addGlobalClaim(fixture, { counterfactual: true });
      scenario.mutate(
        fixture.contract.global.acceptance.counterfactual_controls[0],
      );
      await assertPreflightAndCompileReject(fixture, scenario.code);
    } finally {
      await rm(fixture.root, { recursive: true, force: true });
    }
  }
});

test("a constant Global Oracle cannot pass the Live Final Gate", async () => {
  const fixture = await createDeliveryFixture();
  try {
    await addGlobalClaim(fixture, {
      counterfactual: true,
      constant: true,
    });
    await writeContract(fixture.workdir, fixture.contract);
    await runCli(fixture.root, ["enable", "long-task"]);
    await runCli(fixture.root, ["long-task", "compile", fixture.workdir]);
    const result = await runCliFailure(fixture.root, [
      "long-task",
      "final-gate",
      fixture.workdir,
    ]);
    assert.equal(result.workflow_status, "needs_work");
    const finding = result.findings.find(
      (item) => item.code === "counterfactual_integrity_failed",
    );
    assert.equal(finding.outcome_key, null);
    assert.equal(finding.check_key, "global-state-check");
    assert.equal(finding.assertion_key, "global-state-assertion");
    assert.equal(finding.binding_ref, "first.state-first");
    assert.equal(finding.owning_outcome_key, "first");
    assert.deepEqual(finding.source_claim_keys, ["global-state-source"]);
    assert.deepEqual(finding.source_target_refs, ["constraint.global-state"]);
    assert.deepEqual(finding.owner_paths, [
      "src/**",
      "bin/**",
      GLOBAL_PRODUCT_PATH,
      "tests/legacy-oracle.mjs",
    ]);
    assert.match(finding.next_action, /referenced implementation carrier/iu);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("Global Counterfactual failure is recoverable from targeted Progress", async () => {
  const fixture = await createDeliveryFixture();
  try {
    await addGlobalClaim(fixture, {
      counterfactual: true,
      constant: true,
    });
    await writeContract(fixture.workdir, fixture.contract);
    await runCli(fixture.root, ["enable", "long-task"]);
    await runCli(fixture.root, ["long-task", "compile", fixture.workdir]);
    const failed = await runCliFailure(fixture.root, [
      "long-task",
      "verify",
      fixture.workdir,
      "--check",
      "global-state-check",
    ]);
    const result = failed.check_results.find(
      (item) => item.check_key === "global-state-check",
    );
    assert.equal(result.status, "invalid_evidence");
    assert.deepEqual(result.claim_proofs, []);
    assert.ok(
      result.findings.some(
        (finding) => finding.code === "counterfactual_integrity_failed",
      ),
    );

    const status = await runCli(fixture.root, [
      "long-task",
      "status",
      fixture.workdir,
    ]);
    assert.equal(status.final_workflow_status, null);
    assert.ok(
      status.findings.some(
        (finding) =>
          finding.code === "counterfactual_integrity_failed" &&
          finding.check_key === "global-state-check",
      ),
    );
    const resume = await runCli(fixture.root, [
      "long-task",
      "resume",
      fixture.workdir,
    ]);
    assert.equal(resume.final_workflow_status, null);
    assert.ok(
      resume.recent_findings.some(
        (finding) =>
          finding.code === "counterfactual_integrity_failed" &&
          finding.check_key === "global-state-check",
      ),
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("a sensitive Global Oracle passes the Live Final Gate", async () => {
  const fixture = await createDeliveryFixture();
  try {
    await addGlobalClaim(fixture, { counterfactual: true });
    await writeContract(fixture.workdir, fixture.contract);
    await runCli(fixture.root, ["enable", "long-task"]);
    await runCli(fixture.root, ["long-task", "compile", fixture.workdir]);
    const result = await runCli(fixture.root, [
      "long-task",
      "final-gate",
      fixture.workdir,
    ]);
    assert.equal(result.workflow_status, "machine_accepted");
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("Global Counterfactual carrier changes stale targeted Progress", async () => {
  const fixture = await createDeliveryFixture();
  try {
    await addGlobalClaim(fixture, { counterfactual: true });
    await writeContract(fixture.workdir, fixture.contract);
    await runCli(fixture.root, ["enable", "long-task"]);
    await runCli(fixture.root, ["long-task", "compile", fixture.workdir]);
    await runCli(fixture.root, [
      "long-task",
      "verify",
      fixture.workdir,
      "--check",
      "global-state-check",
    ]);
    await writeFile(
      path.join(fixture.root, "src", "state.json"),
      '{"first":true,"second":false,"first_relations_applicable":false,"second_relations_applicable":false,"revision":2}\n',
    );
    const status = await runCli(fixture.root, [
      "long-task",
      "status",
      fixture.workdir,
    ]);
    assert.ok(
      status.findings.some(
        (finding) =>
          finding.code === "global_progress_stale" &&
          finding.check_key === "global-state-check",
      ),
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("redundant Global Counterfactual removal auto-adopts but binding_ref replacement is reviewed", async () => {
  const removed = await createDeliveryFixture();
  try {
    await addGlobalClaim(removed, { counterfactual: true });
    const redundant = structuredClone(
      removed.contract.global.acceptance.counterfactual_controls[0],
    );
    redundant.key = "remove-global-state-redundant";
    removed.contract.global.acceptance.counterfactual_controls.push(redundant);
    await writeContract(removed.workdir, removed.contract);
    await runCli(removed.root, ["enable", "long-task"]);
    const initial = await runCli(removed.root, [
      "long-task",
      "compile",
      removed.workdir,
    ]);
    removed.contract.global.acceptance.counterfactual_controls.pop();
    await writeContract(removed.workdir, removed.contract);
    const revised = await runCli(removed.root, [
      "long-task",
      "compile",
      removed.workdir,
      "--revise",
    ]);
    assert.equal(revised.authority_revision, initial.authority_revision + 1);
  } finally {
    await rm(removed.root, { recursive: true, force: true });
  }

  const replaced = await createDeliveryFixture();
  try {
    await addGlobalClaim(replaced, { counterfactual: true });
    const stateBinding = replaced.contract.outcomes[0].technical.bindings.find(
      (binding) => binding.key === "state-first",
    );
    assert.ok(stateBinding, "fixture state binding is required");
    replaced.contract.outcomes[0].technical.bindings.push({
      ...structuredClone(stateBinding),
      key: "state-global-alternate",
    });
    await writeContract(replaced.workdir, replaced.contract);
    await runCli(replaced.root, ["enable", "long-task"]);
    await runCli(replaced.root, ["long-task", "compile", replaced.workdir]);
    replaced.contract.global.acceptance.counterfactual_controls[0].binding_ref =
      "first.state-global-alternate";
    await writeContract(replaced.workdir, replaced.contract);
    await expectDecision(replaced, {
      field: "counterfactuals_removed",
      includes: "GLOBAL:replace-global-state",
      reason: "counterfactual_removed",
    });
  } finally {
    await rm(replaced.root, { recursive: true, force: true });
  }
});

test("adding a Global Counterfactual is an automatic proof strengthening", async () => {
  const fixture = await createDeliveryFixture();
  try {
    await addGlobalClaim(fixture, { counterfactual: true });
    await writeContract(fixture.workdir, fixture.contract);
    await runCli(fixture.root, ["enable", "long-task"]);
    const initial = await runCli(fixture.root, [
      "long-task",
      "compile",
      fixture.workdir,
    ]);
    const added = structuredClone(
      fixture.contract.global.acceptance.counterfactual_controls[0],
    );
    added.key = "remove-global-state-additional";
    fixture.contract.global.acceptance.counterfactual_controls.push(added);
    await writeContract(fixture.workdir, fixture.contract);
    const revised = await runCli(fixture.root, [
      "long-task",
      "compile",
      fixture.workdir,
      "--revise",
    ]);
    assert.equal(revised.authority_revision, initial.authority_revision + 1);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});
