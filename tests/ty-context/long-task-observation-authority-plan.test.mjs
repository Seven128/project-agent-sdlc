import assert from "node:assert/strict";
import test from "node:test";
import { compileObservationAuthorityPlan } from "../../packages/ty-context/dist/lib/long-task-observation-authority.js";
import { computeRawExecutionIdentity } from "../../packages/ty-context/dist/lib/long-task-check-execution-policy.js";
import { compileProcessRuntimeClosure } from "../../packages/ty-context/dist/lib/long-task-process-runtime-closure.js";

const PACKAGE_ORACLE = {
  key: "oracle.package-json-exact",
  trust: "named_external_tcb",
  identity: "ty-context-json-pointer-exact",
  version: "1.0.0",
  sha256: null,
  capabilities: ["exact_value"],
};

test("compile projects an ordinary exact Claim Assertion to direct-process authority", () => {
  const input = processInput();
  const rows = compileObservationAuthorityPlan(input);
  assert.equal(rows.length, 1);
  assert.deepEqual(rows[0], {
    obligation_ref: "assertion.OUTCOME.check.result",
    fact_ref: null,
    assertion_ref: "result",
    claim_refs: ["result"],
    target_ref: "product",
    proof_surface: "runtime_behavior",
    method: "exact_value",
    evidence_capabilities: ["target_runtime"],
    authority: "package_process_json_exact",
    expected_identity: rows[0].expected_identity,
    expected_value_sha256: rows[0].expected_value_sha256,
    actual_projection: "raw_exact",
    observation_identity: "assertion.OUTCOME.check.result",
    comparison: {
      comparator: "exact_value",
      mode: "exact",
      parameters_sha256: rows[0].comparison.parameters_sha256,
      tolerance_sha256: null,
      mask_sha256: null,
    },
    locator_policy: {
      kind: "fixed_json_pointer",
      value: "/observations/assertion.OUTCOME.check.result",
    },
    carrier_refs: [
      { binding_ref: "product-input", carrier_paths: ["product/input.json"] },
    ],
    runtime_requirements: {
      runtime_family: "process",
      target_role: "product",
      entrypoint: "root",
      runner_type: "project_binary",
      resolved_runner_target: "bin/product.exe",
      declared_root_entrypoint: "bin/product.exe",
      resolved_runner_argv: [],
      declared_root_argv: [],
      effect: "test_sandbox",
      direct_root_match: true,
    },
  });
  assert.match(rows[0].expected_identity, /^[a-f0-9]{64}$/u);
  assert.match(rows[0].expected_value_sha256, /^[a-f0-9]{64}$/u);
});

test("compiled observation values bind Check identity without splitting Raw Execution", () => {
  const first = processInput();
  const second = processInput();
  second.check.positive_assertions[0].expected = { accepted: false };
  const firstRows = compileObservationAuthorityPlan(first);
  const secondRows = compileObservationAuthorityPlan(second);
  assert.notEqual(
    firstRows[0].expected_identity,
    secondRows[0].expected_identity,
  );
  assert.equal(
    computeRawExecutionIdentity(compiledRawInput(first, firstRows)),
    computeRawExecutionIdentity(compiledRawInput(second, secondRows)),
  );
});

test("the package stdout observation protocol cannot share a legacy Raw Execution", () => {
  const input = processInput();
  const processAuthorities = compileObservationAuthorityPlan(input);
  assert.notEqual(
    computeRawExecutionIdentity(compiledRawInput(input, processAuthorities)),
    computeRawExecutionIdentity(compiledRawInput(input, [])),
  );
});

test("the complete declared root invocation binds Raw Execution identity", () => {
  const first = processInput();
  first.check.runner.argv = ["product.mjs", "--mode=first"];
  first.runner.argv = ["product.mjs", "--mode=first"];
  first.execution_target.root_argv = ["product.mjs", "--mode=first"];
  const second = processInput();
  second.check.runner.argv = ["product.mjs", "--mode=second"];
  second.runner.argv = ["product.mjs", "--mode=second"];
  second.execution_target.root_argv = ["product.mjs", "--mode=second"];
  assert.notEqual(
    computeRawExecutionIdentity(
      compiledRawInput(first, compileObservationAuthorityPlan(first)),
    ),
    computeRawExecutionIdentity(
      compiledRawInput(second, compileObservationAuthorityPlan(second)),
    ),
  );
});

test("compile projects an exact implementation carrier to static authority", () => {
  const input = processInput({
    proofSurface: "implementation_structure",
    capabilities: ["presence"],
  });
  input.check.runner.type = "node_oracle";
  input.runner.type = "node_oracle";
  input.runner.resolved_target = "tests/observer.mjs";
  const rows = compileObservationAuthorityPlan(input);
  assert.equal(rows[0].authority, "package_static_json_exact");
  assert.equal(rows[0].runtime_requirements.direct_root_match, false);
});

test("semantic package exact projection uses the Fact-by-method obligation", () => {
  const input = processInput({ semantic: true });
  const rows = compileObservationAuthorityPlan(input);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].obligation_ref, "proof.fact.observable.exact");
  assert.equal(rows[0].fact_ref, "fact.observable");
  assert.equal(rows[0].method, "exact_value");
  assert.equal(rows[0].authority, "package_process_json_exact");
  assert.equal(rows[0].locator_policy.value, "/observations/fact.observable");
});

test("a static Fact-bound observer cannot derive target runtime", () => {
  const input = processInput({
    semantic: true,
    proofSurface: "implementation_structure",
    capabilities: ["semantic_fact", "target_runtime"],
  });
  input.check.runner.type = "node_oracle";
  input.runner.type = "node_oracle";
  input.runner.resolved_target = "tests/observer.mjs";
  assert.throws(
    () => compileObservationAuthorityPlan(input),
    /unsupported_observer_requires_external_confirmation:.*static_capability_not_admitted/u,
  );
});

test("selected-design content can use only the bounded static exact slice", () => {
  const input = processInput({
    proofSurface: "implementation_structure",
    capabilities: ["design_method"],
  });
  input.design_targets = [designTarget()];
  const rows = compileObservationAuthorityPlan(input);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].authority, "package_static_json_exact");
  assert.equal(rows[0].method, "content");
  assert.equal(rows[0].fact_ref, "fact.design.content");
});

test("custom or project named Oracle cannot close a machine Fact", () => {
  const input = processInput({ semantic: true });
  input.semantic_fact_expectations[0].oracle = {
    ...PACKAGE_ORACLE,
    identity: "project-custom-oracle",
  };
  assert.throws(
    () => compileObservationAuthorityPlan(input),
    /custom_oracle_machine_completion_forbidden/u,
  );
});

test("machine Semantic Fact observer_results require an unavailable package channel", () => {
  const input = processInput({ semantic: true });
  input.semantic_fact_expectations[0].observer_refs = ["project-observer"];
  assert.throws(
    () => compileObservationAuthorityPlan(input),
    /semantic_fact_machine_observer_not_admitted:.*observer_results_package_channel_unavailable/u,
  );
});

test("indirect process wrappers fail the direct-root compile boundary", () => {
  const input = processInput();
  input.runner.resolved_target = "tests/verifier-wrapper.exe";
  assert.throws(
    () => compileObservationAuthorityPlan(input),
    /process_observer_direct_root_required/u,
  );
});

test("direct-process machine admission binds the complete root argv", () => {
  const missing = processInput();
  delete missing.execution_target.root_argv;
  assert.throws(
    () => compileObservationAuthorityPlan(missing),
    /process_observer_root_invocation_required/u,
  );

  const wrapper = processInput();
  wrapper.execution_target.root_argv = ["tests/product.mjs"];
  wrapper.check.runner.argv = ["tests/verifier-wrapper.mjs"];
  wrapper.runner.argv = ["tests/verifier-wrapper.mjs"];
  assert.throws(
    () => compileObservationAuthorityPlan(wrapper),
    /process_observer_root_argv_mismatch/u,
  );
});

test("ordinary Assertion exact plans bind Harness-owned actual projection", () => {
  const identities = new Map();
  for (const [operator, projection, expected] of [
    ["equals", "raw_exact", { accepted: true }],
    ["exists", "presence_boolean", true],
    ["truthy", "truthy_boolean", true],
    ["falsy", "falsy_boolean", false],
  ]) {
    const input = processInput();
    input.check.positive_assertions[0].operator = operator;
    input.check.positive_assertions[0].expected = expected;
    const [row] = compileObservationAuthorityPlan(input);
    assert.equal(row.actual_projection, projection);
    identities.set(operator, row.expected_identity);
  }
  assert.notEqual(identities.get("exists"), identities.get("truthy"));
});

test("claimless preserved-liveness Assertion is still a machine observation obligation", () => {
  const input = processInput();
  input.check.positive_assertions[0] = {
    key: "target-live",
    claims: [],
    observation: "target_live",
    evidence_capabilities: ["target_runtime"],
    operator: "truthy",
  };
  const rows = compileObservationAuthorityPlan(input);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].assertion_ref, "target-live");
  assert.equal(rows[0].authority, "package_process_json_exact");
});

test("direct-process host observation does not require a static Binding carrier", () => {
  const input = processInput();
  input.production_bindings = [];
  input.check.input_paths = [];
  const rows = compileObservationAuthorityPlan(input);
  assert.equal(rows[0].authority, "package_process_json_exact");
  assert.deepEqual(rows[0].carrier_refs, []);
});

test("static authority requires one attributable owning production Binding", () => {
  const missing = processInput({
    proofSurface: "implementation_structure",
    capabilities: ["presence"],
  });
  missing.production_bindings = [];
  assert.throws(
    () => compileObservationAuthorityPlan(missing),
    /machine_observer_not_admitted:.*production_binding_carrier_required/u,
  );

  const ambiguous = processInput({
    proofSurface: "implementation_structure",
    capabilities: ["presence"],
  });
  ambiguous.production_bindings.push({
    key: "duplicate-owner",
    carrier_paths: ["product/input.json"],
  });
  assert.throws(
    () => compileObservationAuthorityPlan(ambiguous),
    /machine_observer_not_admitted:.*static_production_binding_ambiguous/u,
  );

  const projectSelected = processInput({
    proofSurface: "implementation_structure",
    capabilities: ["presence"],
  });
  projectSelected.production_bindings.find(
    (binding) => binding.key === "product-input",
  ).carrier_paths = ["product/*.json"];
  assert.throws(
    () => compileObservationAuthorityPlan(projectSelected),
    /machine_observer_not_admitted:.*static_production_carrier_exact_path_required/u,
  );
});

test("static carriers cannot overlap output, evidence, verifier, or protected Authority roles", () => {
  for (const [mutate, reason] of [
    [
      (input) => input.check.expected_output_paths.push("product/input.json"),
      "static_carrier_evidence_role_forbidden",
    ],
    [
      (input) => input.check.artifact_globs.push("product/**"),
      "static_carrier_evidence_role_forbidden",
    ],
    [
      (input) => {
        input.runner.frozen_files["product/input.json"] = "a".repeat(64);
      },
      "static_carrier_expected_authority_forbidden",
    ],
    [
      (input) => input.protected_authority_paths.push("product/input.json"),
      "static_carrier_expected_authority_forbidden",
    ],
  ]) {
    const input = processInput({
      proofSurface: "implementation_structure",
      capabilities: ["presence"],
    });
    input.protected_authority_paths = [];
    mutate(input);
    assert.throws(
      () => compileObservationAuthorityPlan(input),
      new RegExp(`machine_observer_not_admitted:.*${reason}`, "u"),
    );
  }
});

test("browser/native/proxy and non-exact machine Assertions require explicit External Confirmation", () => {
  const native = processInput();
  native.execution_target.runtime_family = "native";
  assert.throws(
    () => compileObservationAuthorityPlan(native),
    /unsupported_observer_requires_external_confirmation/u,
  );

  const nonExact = processInput();
  nonExact.check.positive_assertions[0] = {
    ...nonExact.check.positive_assertions[0],
    operator: "contains",
    expected: "accepted",
  };
  assert.throws(
    () => compileObservationAuthorityPlan(nonExact),
    /machine_observer_not_admitted:.*exact_equals_or_host_boolean_required/u,
  );
});

test("design, interaction, and state capabilities cannot reuse a plain exact row as package-derived proof", () => {
  for (const capability of [
    "design_conformance",
    "interaction_trace",
    "state_delta",
  ]) {
    const input = processInput({ capabilities: [capability] });
    assert.throws(
      () => compileObservationAuthorityPlan(input),
      new RegExp(
        `unsupported_observer_requires_external_confirmation:.*${capability}:package_derivation_required`,
        "u",
      ),
    );
  }
});

test("the compiled process runtime closure excludes ordinary non-carrier input paths", () => {
  const input = processInput();
  input.check.input_paths.push("diagnostics/ordinary.json");
  input.workspace_manifest.files.push(
    workspaceFile("diagnostics/ordinary.json"),
  );
  const closure = compileProcessRuntimeClosure({
    ...input,
    observation_authorities: compileObservationAuthorityPlan(input),
  });
  assert.ok(closure);
  assert.deepEqual(closure.allowed_runtime_files, [
    "bin/product.exe",
    "product/input.json",
  ]);
  assert.deepEqual(closure.production_carrier_files, ["product/input.json"]);
  assert.equal(
    closure.allowed_runtime_files.includes("diagnostics/ordinary.json"),
    false,
  );
  assert.match(closure.closure_identity, /^[a-f0-9]{64}$/u);
});

test("the full process input surface rejects evidence and verification roles", () => {
  const evidence = processInput();
  evidence.check.input_paths.push("artifacts/expected-status.json");
  evidence.check.artifact_globs.push("artifacts/expected-status.json");
  evidence.workspace_manifest.files.push(
    workspaceFile("artifacts/expected-status.json"),
  );
  assert.throws(
    () =>
      compileProcessRuntimeClosure({
        ...evidence,
        observation_authorities: compileObservationAuthorityPlan(evidence),
      }),
    /process_runtime_input_evidence_role_forbidden/u,
  );

  const verification = processInput();
  verification.check.input_paths.push("tests/expected-map.json");
  verification.check.verification_inputs.push("tests/expected-map.json");
  verification.workspace_manifest.files.push(
    workspaceFile("tests/expected-map.json"),
  );
  assert.throws(
    () =>
      compileProcessRuntimeClosure({
        ...verification,
        observation_authorities: compileObservationAuthorityPlan(verification),
      }),
    /process_runtime_input_verification_role_forbidden/u,
  );
});

test("process root ownership and Source continuity are required by the closure", () => {
  const missingSource = processInput();
  missingSource.source_backed_execution_target = null;
  assert.throws(
    () =>
      compileProcessRuntimeClosure({
        ...missingSource,
        observation_authorities: compileObservationAuthorityPlan(missingSource),
      }),
    /process_root_source_binding_required/u,
  );

  const missingBinding = processInput();
  missingBinding.production_bindings =
    missingBinding.production_bindings.filter(
      (binding) => binding.key !== "product-root",
    );
  assert.throws(
    () =>
      compileProcessRuntimeClosure({
        ...missingBinding,
        observation_authorities:
          compileObservationAuthorityPlan(missingBinding),
      }),
    /process_root_production_binding_required/u,
  );
});

function processInput(options = {}) {
  const assertion = {
    key: "result",
    claims: ["result"],
    applicability_ref: "product-root",
    observation: "result",
    evidence_capabilities: options.capabilities ?? ["target_runtime"],
    operator: "equals",
    expected: options.semantic ? true : { accepted: true },
  };
  const check = {
    key: "check",
    journey_roles: ["success"],
    execution_target: { target_ref: "product", entrypoint: "root" },
    scenario: {
      given: [{ key: "candidate", statement: "Candidate is current." }],
      when: [{ key: "run", statement: "Run the product root." }],
    },
    proof_surface: options.proofSurface ?? "runtime_behavior",
    runner: {
      type: "project_binary",
      target: "bin/product.exe",
      argv: [],
      cwd: ".",
      timeout_ms: 1000,
      effect: "test_sandbox",
      retry_policy: "none",
      idempotent: true,
    },
    verification_inputs: [],
    input_paths: ["product/input.json"],
    expected_output_paths: [],
    artifact_globs: ["artifacts/**"],
    positive_assertions: [assertion],
    negative_assertions: [],
    environment_requirements: [],
  };
  const runner = {
    ...check.runner,
    executable: "C:/fixture/bin/product.exe",
    executable_argv_prefix: [],
    resolved_cwd: "",
    resolved_target: "bin/product.exe",
    definition_sha256: "a".repeat(64),
    frozen_files: {},
    package_script: null,
    execution_identity: "b".repeat(64),
  };
  return {
    check,
    outcome_key: "OUTCOME",
    runner,
    execution_target: {
      key: "product",
      description: "Fixture process product",
      role: "product",
      runtime_family: "process",
      root_entrypoint: "bin/product.exe",
      root_argv: [],
      capabilities: ["process-runtime", "cold-start", "production-root"],
    },
    design_targets: [],
    production_bindings: [
      {
        key: "product-root",
        kind: "file",
        target: "bin/product.exe",
        carrier_paths: ["bin/product.exe"],
        existence: "existing",
      },
      {
        key: "product-input",
        kind: "file",
        target: "product/input.json",
        carrier_paths: ["product/input.json"],
        existence: "existing",
      },
    ],
    production_owner_paths: ["bin/**", "product/**"],
    source_backed_execution_target: {
      target_ref: "product",
      canonical_target_ref: "execution_target.product",
      source_claim_key: "product-target",
      source_item_key: "product-target",
      source_path: "source.md",
      source_text_sha256: "c".repeat(64),
      target_identity: "d".repeat(64),
    },
    workspace_manifest: {
      repository_root: "C:/fixture",
      git_head: "e".repeat(40),
      files: [
        workspaceFile("bin/product.exe"),
        workspaceFile("product/input.json"),
      ],
      fingerprint: {
        head: "e".repeat(40),
        head_tree: "f".repeat(40),
        index_tree: "f".repeat(40),
        staged_diff_sha256: "0".repeat(64),
        unstaged_diff_sha256: "0".repeat(64),
        untracked_sha256: "0".repeat(64),
        status_sha256: "0".repeat(64),
        identity: "1".repeat(64),
      },
      snapshot_sha256: "2".repeat(64),
    },
    protected_authority_paths: ["source.md"],
    semantic_fact_expectations: options.semantic
      ? [semanticExpectation(assertion.key)]
      : [],
  };
}

function workspaceFile(filePath) {
  return {
    path: filePath,
    mode: 0o100644,
    size: 1,
    sha256: `git:${"a".repeat(40)}`,
  };
}

function semanticExpectation(assertionRef) {
  return {
    manifest_ref: "manifest",
    manifest_sha256: "1".repeat(64),
    fact_key: "fact.observable",
    fact_revision_digest: "2".repeat(64),
    obligation_key: "proof.fact.observable.exact",
    obligation_revision_digest: "3".repeat(64),
    revision_identity_required: true,
    fact_ref: "fact.observable",
    proof_ref: "proof.fact.observable.exact",
    method: "exact_value",
    check_ref: "check",
    assertion_ref: assertionRef,
    outcome_ref: "OUTCOME",
    claim_ref: "result",
    applicability_ref: "product-root",
    subject_ref: "subject.product",
    condition_ref: "condition.default",
    property_ref: "property.observable",
    observation_sensitivity: "plain",
    expected: locatedDigest("4"),
    comparison: {
      comparator: "exact_value",
      mode: "exact",
      parameters: locatedDigest("5"),
      tolerance: null,
      mask: null,
    },
    oracle: structuredClone(PACKAGE_ORACLE),
    environment: {
      key: "environment.fixture",
      identity: "environment-v1",
      definition: locatedDigest("6"),
    },
    observer_refs: [],
  };
}

function designTarget() {
  return {
    key: "selected-design",
    target_ref: "product",
    verification_method_bindings: [
      {
        method: "content",
        assertion_ref: "result",
        evidence_artifacts: [
          {
            condition_key: "default",
            fact_expectations: [
              {
                fact_ref: "fact.design.content",
                observation_sensitivity: "plain",
                expected: locatedDigest("7"),
                comparison: {
                  comparator: "exact_value",
                  mode: "exact",
                  parameters: locatedDigest("8"),
                  tolerance: null,
                  mask: null,
                },
                oracle: structuredClone(PACKAGE_ORACLE),
              },
            ],
          },
        ],
      },
    ],
    symbolic_method_bindings: [],
  };
}

function locatedDigest(digit) {
  return {
    representation: "digest_only",
    locator: { material_ref: "manifest", kind: "manifest_pointer", value: "/" },
    sha256: digit.repeat(64),
  };
}

function compiledRawInput(input, observationAuthorities) {
  return {
    ...input.check,
    internal_id: "CHECK.OUTCOME.check",
    outcome_key: "OUTCOME",
    runner: input.runner,
    evidence_adapter: "node_json_v3",
    verification_input_hashes: {},
    execution_target_definition: input.execution_target,
    known_execution_targets: [input.execution_target],
    design_conformance_targets: [],
    semantic_fact_expectations: [],
    observation_authorities: observationAuthorities,
  };
}
