import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import * as admitted from "../../packages/ty-context/dist/lib/long-task-artifacts.js";
import * as exact from "../../packages/ty-context/dist/lib/long-task-evidence-capability-runtime.js";
import { evaluateCheckEvidence } from "../../packages/ty-context/dist/lib/long-task-evidence-v2.js";

test("json-pointer-exact-v1 recomputes exact pass and comparison identity", async () => {
  assert.equal(typeof exact.evaluateExactDigestComparison, "function");
  assert.equal(typeof exact.exactComparisonResultIdentity, "function");
  const expected = "a".repeat(64);
  const base = {
    identity: { kind: "design_fact", fact_ref: "map.layout.phone" },
    actual_value_sha256: expected,
    expected_value_sha256: expected,
    comparator: "exact_value",
    mode: "exact",
    parameters_sha256: "b".repeat(64),
    tolerance_sha256: null,
    mask_sha256: null,
  };
  const accepted = exact.evaluateExactDigestComparison(base);
  assert.deepEqual(accepted, {
    passed: true,
    result_sha256: exact.exactComparisonResultIdentity({
      ...base,
      passed: true,
    }),
  });
  const rejected = exact.evaluateExactDigestComparison({
    ...base,
    actual_value_sha256: "f".repeat(64),
    submitted_passed: true,
    submitted_verdict: "passed",
  });
  assert.equal(rejected.passed, false);
  assert.equal(
    rejected.result_sha256,
    exact.exactComparisonResultIdentity({
      ...base,
      actual_value_sha256: "f".repeat(64),
      passed: false,
    }),
  );
});

test("json-pointer-exact-v1 re-extracts canonical current JSON under fixed limits", async () => {
  assert.equal(admitted.JSON_POINTER_EXACT_CAPABILITY, "json-pointer-exact-v1");
  assert.deepEqual(admitted.JSON_POINTER_EXACT_METHODS, [
    "exact_value",
    "content",
    "component_state",
  ]);
  assert.equal(
    admitted.JSON_POINTER_EXACT_SPEC_SHA256,
    "a4cf79d5165d55fa7c7f16a407fd975e2d4337b5ea9c01f8ea42320018f6e344",
  );
  assert.deepEqual(admitted.JSON_POINTER_EXACT_LIMITS, {
    max_file_bytes: 1_048_576,
    max_depth: 64,
    max_pointer_bytes: 4_096,
    max_pointer_segments: 128,
    max_canonical_value_bytes: 262_144,
    max_artifacts_per_check: 256,
    max_total_artifact_bytes: 16_777_216,
  });
  const root = await mkdtemp(path.join(os.tmpdir(), "ty-observer-"));
  try {
    await writeFile(
      path.join(root, "current.json"),
      JSON.stringify({ observations: { item: { z: 1, a: [true, null] } } }),
    );
    const result = await admitted.extractJsonPointerExactObservation({
      root,
      artifact_path: "current.json",
      locator: { kind: "json_pointer", value: "/observations/item" },
      sensitivity: "plain",
    });
    assert.equal(result.capability, "json-pointer-exact-v1");
    assert.match(result.value_sha256, /^[a-f0-9]{64}$/u);
    assert.equal(Object.hasOwn(result, "value"), false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("json-pointer-exact-v1 fails closed on ambiguous, escaped, oversized and protected input", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "ty-observer-invalid-"));
  try {
    await writeFile(path.join(root, "duplicate.json"), '{"value":1,"value":2}');
    await writeFile(
      path.join(root, "large.json"),
      `{"value":"${"x".repeat(1_048_576)}"}`,
    );
    await writeFile(path.join(root, "plain.json"), '{"value":true}');
    await assert.rejects(
      admitted.extractJsonPointerExactObservation({
        root,
        artifact_path: "duplicate.json",
        locator: { kind: "json_pointer", value: "/value" },
        sensitivity: "plain",
      }),
      /observation_json_duplicate_key/u,
    );
    await assert.rejects(
      admitted.extractJsonPointerExactObservation({
        root,
        artifact_path: "large.json",
        locator: { kind: "json_pointer", value: "/value" },
        sensitivity: "plain",
      }),
      /observation_artifact_size_limit/u,
    );
    await assert.rejects(
      admitted.extractJsonPointerExactObservation({
        root,
        artifact_path: "../outside.json",
        locator: { kind: "json_pointer", value: "/value" },
        sensitivity: "plain",
      }),
      /observation_artifact_path_escape/u,
    );
    await assert.rejects(
      admitted.extractJsonPointerExactObservation({
        root,
        artifact_path: "plain.json",
        locator: { kind: "json_pointer", value: "#/value" },
        sensitivity: "plain",
      }),
      /observation_locator_not_admitted/u,
    );
    await assert.rejects(
      admitted.extractJsonPointerExactObservation({
        root,
        artifact_path: "plain.json",
        locator: { kind: "json_pointer", value: "/value" },
        sensitivity: "protected",
      }),
      /observation_protected_requires_frozen_adapter/u,
    );
    const outside = path.join(root, "outside-target.json");
    const link = path.join(root, "linked.json");
    await writeFile(outside, '{"value":true}');
    try {
      await symlink(outside, link, "file");
      await assert.rejects(
        admitted.extractJsonPointerExactObservation({
          root,
          artifact_path: "linked.json",
          locator: { kind: "json_pointer", value: "/value" },
          sensitivity: "plain",
        }),
        /observation_artifact_symlink/u,
      );
    } catch (error) {
      if (error?.code !== "EPERM") throw error;
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("expected-as-actual and pure evidence carriers cannot prove production reachability", async () => {
  assert.equal(
    admitted.classifyObservationCarrier({
      artifact_path: "delivery-contract.yaml",
      source_paths: ["docs/source.md"],
      expected_authority_paths: ["delivery-contract.yaml", "design/handoff.md"],
      product_carrier_paths: ["src/state.json"],
      current_observer_artifact_paths: ["artifacts/current.json"],
    }),
    "expected_authority_forbidden",
  );
  assert.equal(
    admitted.classifyObservationCarrier({
      artifact_path: "artifacts/report.json",
      source_paths: ["docs/source.md"],
      expected_authority_paths: ["delivery-contract.yaml"],
      product_carrier_paths: ["src/state.json"],
      current_observer_artifact_paths: ["artifacts/current.json"],
    }),
    "unadmitted_evidence",
  );
  assert.equal(
    admitted.classifyObservationCarrier({
      artifact_path: "dist/runtime-config.json",
      source_paths: ["docs/source.md"],
      expected_authority_paths: ["delivery-contract.yaml"],
      product_carrier_paths: ["dist/runtime-config.json"],
      current_observer_artifact_paths: [],
    }),
    "product_carrier",
  );
});

test("package observer is joined to selected-design validation from the current product carrier", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "ty-observer-runtime-"));
  try {
    const observationPath = "runtime-state.json";
    const comparisonPath = "comparison.json";
    const obligationRef = "design.route-b-target.content.default.fact.route_b";
    const observationBytes = Buffer.from(
      JSON.stringify({ observations: { "fact.route_b": "accepted" } }),
    );
    const comparisonBytes = Buffer.from('{"comparison":true}');
    await writeFile(path.join(root, observationPath), observationBytes);
    await writeFile(path.join(root, comparisonPath), comparisonBytes);
    const sha = (value) => createHash("sha256").update(value).digest("hex");
    const valueSha256 = sha(JSON.stringify("accepted"));
    const observationSha256 = sha(observationBytes);
    const comparisonSha256 = sha(comparisonBytes);
    const expectation = {
      fact_ref: "fact.route_b",
      subject_ref: "subject.route_b",
      variation_ref: "variation.default",
      property_ref: "content.value",
      observation_sensitivity: "plain",
      expected: {
        locator: {
          resource_ref: "resource.route_b",
          kind: "json_pointer",
          value: "/expected/fact.route_b",
        },
        sha256: valueSha256,
      },
      comparison: {
        comparator: "exact_value",
        mode: "exact",
        parameters: {
          locator: {
            resource_ref: "resource.route_b",
            kind: "json_pointer",
            value: "/comparators/exact",
          },
          sha256: "b".repeat(64),
        },
        tolerance: null,
        mask: null,
      },
      oracle: {
        key: "oracle.route_b",
        trust: "named_external_tcb",
        identity: admitted.JSON_POINTER_EXACT_ORACLE_IDENTITY,
        version: admitted.JSON_POINTER_EXACT_ORACLE_VERSION,
        sha256: null,
      },
      environment: {
        key: "environment.route_b",
        identity: "fixture-process-v1",
        definition: {
          locator: {
            resource_ref: "resource.route_b",
            kind: "json_pointer",
            value: "/environment",
          },
          sha256: "c".repeat(64),
        },
      },
    };
    const comparison = {
      artifact_path: comparisonPath,
      artifact_sha256: comparisonSha256,
      locator: { kind: "json_pointer", value: "/comparisons/fact.route_b" },
      result_sha256: "0".repeat(64),
      comparator: "exact_value",
      mode: "exact",
      parameters: structuredClone(expectation.comparison.parameters),
      tolerance: null,
      mask: null,
      passed: true,
    };
    const comparisonInput = {
      identity: {
        kind: "selected_design_ground_v1",
        fact_ref: expectation.fact_ref,
        subject_ref: expectation.subject_ref,
        variation_ref: expectation.variation_ref,
        property_ref: expectation.property_ref,
      },
      actual_value_sha256: valueSha256,
      expected_value_sha256: valueSha256,
      comparator: "exact_value",
      mode: "exact",
      parameters_sha256: expectation.comparison.parameters.sha256,
      tolerance_sha256: null,
      mask_sha256: null,
      passed: true,
    };
    comparison.result_sha256 =
      exact.exactComparisonResultIdentity(comparisonInput);
    const result = {
      fact_ref: expectation.fact_ref,
      subject_ref: expectation.subject_ref,
      variation_ref: expectation.variation_ref,
      property_ref: expectation.property_ref,
      actual_observation: {
        artifact_path: observationPath,
        artifact_sha256: observationSha256,
        locator: admitted.jsonPointerExactLocatorForIdentity(
          expectation.fact_ref,
        ),
        value_sha256: valueSha256,
        sensitivity: "plain",
        redaction: null,
      },
      actual_environment: {
        artifact_path: observationPath,
        artifact_sha256: observationSha256,
        locator: { kind: "json_pointer", value: "/environment" },
        value_sha256: expectation.environment.definition.sha256,
      },
      expected: structuredClone(expectation.expected),
      comparison,
      verdict: "passed",
      oracle: structuredClone(expectation.oracle),
      environment: structuredClone(expectation.environment),
    };
    const record = {
      assertion_key: "route-b-content",
      capability: "design_method",
      design_target_ref: "route-b-target",
      target_ref: "route-b-process",
      method: "content",
      cells: [
        {
          condition_key: "default",
          artifact_path: comparisonPath,
          observation_artifact_path: observationPath,
          fact_refs: [expectation.fact_ref],
          fact_results: [result],
        },
      ],
    };
    const check = {
      internal_id: "GLOBAL:route-b-check",
      outcome_key: null,
      key: "route-b-check",
      proof_surface: "implementation_structure",
      evidence_adapter: "structured_json_v2",
      execution_target: { target_ref: "route-b-process", entrypoint: "root" },
      execution_target_definition: {
        key: "route-b-process",
        role: "product",
        runtime_family: "process",
      },
      verification_inputs: ["delivery-contract.yaml"],
      input_paths: [observationPath],
      expected_output_paths: [],
      artifact_globs: [observationPath, comparisonPath],
      positive_assertions: [
        {
          key: "route-b-content",
          claims: ["result"],
          observation: "result",
          evidence_capabilities: ["design_method"],
          operator: "equals",
          expected: true,
        },
      ],
      negative_assertions: [],
      design_conformance_targets: [
        {
          key: "route-b-target",
          target_ref: "route-b-process",
          condition_keys: ["default"],
          verification_method_bindings: [
            {
              assertion_ref: "route-b-content",
              method: "content",
              evidence_artifacts: [
                {
                  condition_key: "default",
                  path: comparisonPath,
                  observation_path: observationPath,
                  fact_refs: [expectation.fact_ref],
                  fact_expectations: [expectation],
                },
              ],
            },
          ],
        },
      ],
      observation_authorities: [
        {
          obligation_ref: obligationRef,
          fact_ref: expectation.fact_ref,
          assertion_ref: "route-b-content",
          claim_refs: ["result"],
          target_ref: "route-b-process",
          proof_surface: "implementation_structure",
          method: "content",
          evidence_capabilities: ["design_method"],
          authority: "package_static_json_exact",
          expected_identity: "d".repeat(64),
          expected_value_sha256: valueSha256,
          observation_identity: expectation.fact_ref,
          comparison: {
            comparator: "exact_value",
            mode: "exact",
            parameters_sha256: expectation.comparison.parameters.sha256,
            tolerance_sha256: null,
            mask_sha256: null,
          },
          locator_policy: {
            kind: "fixed_json_pointer",
            value: admitted.jsonPointerExactLocatorForIdentity(
              expectation.fact_ref,
            ).value,
          },
          carrier_refs: [
            {
              binding_ref: "first.state-first",
              carrier_paths: [observationPath],
            },
          ],
          runtime_requirements: {
            runtime_family: "process",
            target_role: "product",
            entrypoint: "root",
            runner_type: "project_binary",
            resolved_runner_target: "bin/product",
            declared_root_entrypoint: "bin/product",
            effect: "read_only",
            direct_root_match: true,
          },
        },
      ],
    };
    const prepared = await admitted.prepareAdmittedObservations({
      check,
      records: [record],
      snapshot_root: root,
    });
    assert.equal(prepared.entries[0].reason, null);
    assert.equal(
      exact.validateRuntimeEvidenceRecord(
        check,
        record,
        {
          [observationPath]: observationSha256,
          [comparisonPath]: comparisonSha256,
        },
        prepared,
      ),
      null,
    );
    const forged = structuredClone(record);
    forged.cells[0].fact_results[0].actual_observation.value_sha256 =
      "f".repeat(64);
    assert.equal(
      exact.validateRuntimeEvidenceRecord(
        check,
        forged,
        {
          [observationPath]: observationSha256,
          [comparisonPath]: comparisonSha256,
        },
        prepared,
      ),
      "admitted_observation_value_mismatch",
    );
    const raw = {
      raw_execution_identity: "route-b-raw",
      execution_identity: "route-b-execution",
      execution_status: "completed",
      exit_code: 0,
      observations: { result: true },
      evidence_records: [record],
      stdout_sha256: "1".repeat(64),
      stderr_sha256: "2".repeat(64),
      attempts: 1,
      duration_ms: 1,
      error: null,
    };
    const accepted = await evaluateCheckEvidence(check, raw, root);
    assert.equal(accepted.status, "passed");
    const forgedExecution = await evaluateCheckEvidence(
      check,
      { ...raw, evidence_records: [forged] },
      root,
    );
    assert.equal(forgedExecution.status, "invalid_evidence");
    assert.ok(
      forgedExecution.findings.some(
        (finding) => finding.actual === "admitted_observation_value_mismatch",
      ),
    );

    const customOracle = structuredClone(record);
    customOracle.cells[0].fact_results[0].oracle.identity =
      "project-custom-oracle";
    const customPrepared = await admitted.prepareAdmittedObservations({
      check,
      records: [customOracle],
      snapshot_root: root,
    });
    assert.equal(customPrepared.entries.length, 1);
    assert.equal(
      customPrepared.entries[0].reason,
      "custom_oracle_machine_completion_forbidden",
    );
    assert.equal(
      exact.validateRuntimeEvidenceRecord(
        check,
        customOracle,
        {
          [observationPath]: observationSha256,
          [comparisonPath]: comparisonSha256,
        },
        customPrepared,
      ),
      "custom_oracle_machine_completion_forbidden",
    );

    const processAuthority = structuredClone(check);
    processAuthority.observation_authorities[0].authority =
      "package_process_json_exact";
    const unresolvedProcess = await admitted.prepareAdmittedObservations({
      check: processAuthority,
      records: [record],
      snapshot_root: root,
    });
    assert.equal(
      unresolvedProcess.entries[0].reason,
      "admitted_observation_runtime_required",
    );

    const duplicated = await admitted.prepareAdmittedObservations({
      check,
      records: [record, record],
      snapshot_root: root,
    });
    assert.equal(duplicated.entries.length, 2);
    assert.ok(
      duplicated.entries.every(
        (entry) => entry.reason === "admitted_observation_duplicate",
      ),
    );

    const noAuthority = structuredClone(check);
    noAuthority.observation_authorities = [];
    const unplanned = await evaluateCheckEvidence(noAuthority, raw, root);
    assert.equal(unplanned.status, "invalid_evidence");
    assert.ok(
      unplanned.findings.some(
        (finding) => finding.actual === "machine_observer_not_admitted",
      ),
    );

    const ordinaryObligation = "assertion.GLOBAL.route-b-check.route-b-content";
    const ordinaryCheck = structuredClone(check);
    ordinaryCheck.proof_surface = "runtime_behavior";
    ordinaryCheck.execution_target_definition.root_entrypoint = "bin/product";
    ordinaryCheck.positive_assertions[0].evidence_capabilities = [
      "target_runtime",
    ];
    ordinaryCheck.design_conformance_targets = [];
    ordinaryCheck.observation_authorities = [
      {
        ...structuredClone(check.observation_authorities[0]),
        obligation_ref: ordinaryObligation,
        fact_ref: null,
        method: "exact_value",
        evidence_capabilities: ["target_runtime"],
        authority: "package_process_json_exact",
        observation_identity: ordinaryObligation,
        locator_policy: {
          kind: "fixed_json_pointer",
          value:
            admitted.jsonPointerExactLocatorForIdentity(ordinaryObligation)
              .value,
        },
      },
    ];
    const ordinaryRaw = {
      ...raw,
      evidence_records: [
        {
          assertion_key: "route-b-content",
          capability: "target_runtime",
          target_ref: "route-b-process",
          root_entrypoint: "bin/product",
          session_id: "project-self-attested",
          cold_start: true,
        },
      ],
    };
    const projectRuntimeOnly = await evaluateCheckEvidence(
      ordinaryCheck,
      ordinaryRaw,
      root,
    );
    assert.equal(projectRuntimeOnly.status, "invalid_evidence");
    assert.ok(
      projectRuntimeOnly.findings.some(
        (finding) => finding.actual === "admitted_observation_runtime_required",
      ),
    );

    const preservedLiveness = structuredClone(ordinaryCheck);
    preservedLiveness.positive_assertions[0].claims = [];
    preservedLiveness.observation_authorities[0].claim_refs = [];
    const selfAttestedLiveness = await evaluateCheckEvidence(
      preservedLiveness,
      ordinaryRaw,
      root,
    );
    assert.equal(selfAttestedLiveness.status, "invalid_evidence");
    assert.ok(
      selfAttestedLiveness.findings.some(
        (finding) => finding.actual === "admitted_observation_runtime_required",
      ),
    );

    const missingPlanProperty = structuredClone(ordinaryCheck);
    delete missingPlanProperty.observation_authorities;
    const missingPlan = await evaluateCheckEvidence(
      missingPlanProperty,
      ordinaryRaw,
      root,
    );
    assert.equal(missingPlan.status, "invalid_evidence");
    assert.ok(
      missingPlan.findings.some(
        (finding) => finding.actual === "machine_observer_not_admitted",
      ),
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
