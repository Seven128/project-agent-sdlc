import assert from "node:assert/strict";
import test from "node:test";
import { compileAcceptanceReachability } from "../../packages/ty-context/dist/lib/long-task-acceptance-reachability.js";
import { compiledAcceptanceAuthorityHash } from "../../packages/ty-context/dist/lib/long-task-delivery-compiler.js";
import { compileProductClaimCoverage } from "../../packages/ty-context/dist/lib/long-task-claims.js";
import { deriveRelevantExternalInputIdentity } from "../../packages/ty-context/dist/lib/long-task-external-confirmation-plan.js";
import { objectiveClaimSemanticIdentity } from "../../packages/ty-context/dist/lib/long-task-obligation-semantic-identity.js";
import { resolveObligationAuthority } from "../../packages/ty-context/dist/lib/long-task-obligation-authority-resolution.js";
import { validateLongTaskProofAdequacy } from "../../packages/ty-context/dist/lib/long-task-proof-adequacy.js";
import { validateSourceSemanticConservation } from "../../packages/ty-context/dist/lib/long-task-source-conservation.js";
import {
  deriveMaterialSourceFragments,
  deriveSemanticSourceAnchors,
} from "../../packages/ty-context/dist/lib/long-task-source-fragments.js";
import {
  completeControl,
  deliveryContract,
  fixtureExecutionTargetSourceRecord,
  fixtureSemanticManifest,
} from "./long-task-delivery-fixtures.mjs";
import { fixtureSourceStatements } from "./long-task-semantic-manifest-fixture.mjs";
import {
  digestCanonical,
  digestText,
} from "./long-task-semantic-refresh-fixture.mjs";
import {
  addSourceBasis,
  assertion,
  setSourceText,
  sourceClosureFixture,
  sourceItem,
} from "./long-task-complete-delivery-closure-fixture.mjs";

function authorizeJudgment(contract, confirmation) {
  confirmation.actor.identity_assurance = {
    scheme: "ed25519",
    key_id: "fixture-owner-2026",
    public_key_ref: "project_context/authorities/fixture-owner.pub",
  };
  for (const obligation of confirmation.obligations) {
    let sourceClaim = contract.source_claims.find((claim) =>
      sourceClaimTargets(claim.disposition, obligation.claim_ref),
    );
    if (!sourceClaim) {
      const outcome = contract.outcomes.find((candidate) =>
        obligation.claim_ref.startsWith(`${candidate.key}.`),
      );
      assert.ok(outcome);
      const localClaim = obligation.claim_ref.slice(outcome.key.length + 1);
      const statement =
        localClaim === "result"
          ? outcome.product.observable_result
          : [
              ...outcome.product.requirements,
              ...outcome.technical.obligations,
              ...outcome.technical.forbidden_shortcuts,
              ...outcome.product.non_completing_outcomes,
            ].find((candidate) => localClaim.endsWith(`.${candidate.key}`))
              ?.statement;
      assert.ok(statement);
      sourceClaim = {
        key: `judgment-authority-${obligation.claim_ref.replaceAll(".", "-")}`,
        source_ref: "source.md#fixture-source",
        statement,
        disposition:
          localClaim === "result"
            ? { type: "outcome_result", ref: obligation.claim_ref }
            : { type: "claim", refs: [obligation.claim_ref] },
      };
      contract.source_claims.push(sourceClaim);
    }
    sourceClaim.judgment_basis = {
      kind: "authorization",
      claim_ref: obligation.claim_ref,
      applicability_refs: [obligation.applicability_ref],
    };
    obligation.judgment_basis = {
      kind: "authorization",
      source_ref: sourceClaim.key,
    };
  }
}

function sourceClaimTargets(disposition, claimRef) {
  if (disposition.type === "claim" || disposition.type === "global_constraint")
    return disposition.refs.includes(claimRef);
  return disposition.type === "outcome_result" && disposition.ref === claimRef;
}

function compiledExactClaimAuthority({
  assertionRef,
  authority,
  obligationRef,
  proofSurface,
  expected = true,
  actualProjection = "raw_exact",
  comparator = "exact_value",
  mode = "exact",
  parametersSha256 = "a".repeat(64),
  toleranceSha256 = null,
  maskSha256 = null,
}) {
  const expectedValueSha256 = digestCanonical(expected);
  const comparison = {
    comparator,
    mode,
    parameters_sha256: parametersSha256,
    tolerance_sha256: toleranceSha256,
    mask_sha256: maskSha256,
  };
  return {
    obligation_ref: obligationRef,
    fact_ref: null,
    assertion_ref: assertionRef,
    claim_refs: ["result"],
    target_ref: "fixture-app",
    proof_surface: proofSurface,
    method: "exact_value",
    evidence_capabilities: ["target_runtime"],
    authority,
    expected_identity: digestCanonical({
      obligation_ref: obligationRef,
      expected_value_sha256: expectedValueSha256,
      actual_projection: actualProjection,
      comparison,
    }),
    expected_value_sha256: expectedValueSha256,
    expected_value: expected,
    actual_projection: actualProjection,
    observation_identity: obligationRef,
    comparison,
    locator_policy: {
      kind: "fixed_json_pointer",
      value: `/observations/${assertionRef}`,
    },
    carrier_refs: [],
    runtime_requirements: {
      runtime_family: "process",
      target_role: "product",
      entrypoint: "root",
      runner_type: "project_binary",
      resolved_runner_target: "bin/product.mjs",
      declared_root_entrypoint: "bin/product.mjs",
      resolved_runner_argv: [],
      declared_root_argv: [],
      effect: "read_only",
      direct_root_match: authority !== "external_confirmation",
    },
  };
}

function optionalExactCrossSurfaceFixture() {
  const contract = deliveryContract();
  contract.task.target_profile.completion_authority = "declared_authorities";
  const baseCheck = contract.outcomes[0].acceptance.checks[0];
  const resultAssertion = baseCheck.positive_assertions.find(
    (row) => row.key === "first-result",
  );
  assert.ok(resultAssertion);
  resultAssertion.claims = [];
  delete resultAssertion.applicability_ref;
  const machineCheck = {
    ...structuredClone(baseCheck),
    key: "exact-machine-result-runtime",
    proof_surface: "runtime_behavior",
    positive_assertions: [
      {
        ...structuredClone(resultAssertion),
        key: "exact-machine-result-runtime-assertion",
        claims: ["result"],
        applicability_ref: "first-root-success",
      },
    ],
    negative_assertions: [],
  };
  contract.outcomes[0].acceptance.checks.push(machineCheck);
  const confirmation = {
    key: "exact-external-result-ui",
    description: "Confirm the same exact result through the UI surface.",
    owner: "release-owner",
    kind: "field_validation",
    impact_claims: ["first.result"],
    blocks_target: true,
    actor: {
      id: "fixture-product-owner",
      role: "product acceptance owner",
      authority_kind: "human",
    },
    target_ref: "fixture-app",
    environment_identity: "fixture-external-environment-v1",
    scenario: structuredClone(baseCheck.scenario),
    evidence_requirements: [
      { key: "ui-result", statement: "Observe the exact result in the UI." },
    ],
    obligations: [
      {
        key: "confirm-exact-first-result-ui",
        claim_ref: "first.result",
        applicability_ref: "first-root-success",
        fact_ref: null,
        proof_ref: null,
        method: "exact_value",
        proof_surface: "ui_browser",
        evidence_capabilities: ["target_runtime"],
        expected_authority_ref: "contract-claim:first.result",
        result_kind: "actual",
      },
    ],
  };
  contract.global.acceptance.external_confirmations = [confirmation];
  const machineAuthority = compiledExactClaimAuthority({
    assertionRef: "exact-machine-result-runtime-assertion",
    authority: "package_process_json_exact",
    obligationRef: "claim:first.result:first-root-success:runtime_behavior",
    proofSurface: "runtime_behavior",
  });
  const externalAuthority = compiledExactClaimAuthority({
    assertionRef: "exact-external-result-ui-assertion",
    authority: "external_confirmation",
    obligationRef: "claim:first.result:first-root-success:ui_browser",
    proofSurface: "ui_browser",
  });
  const compiledChecks = [
    {
      key: machineCheck.key,
      outcome_key: "first",
      proof_surface: "runtime_behavior",
      completion_role: "semantic",
      observation_authorities: [machineAuthority],
      required_evidence_capabilities: {
        "exact-machine-result-runtime-assertion": ["target_runtime"],
      },
    },
    {
      key: "exact-external-result-ui-check",
      outcome_key: "first",
      proof_surface: "ui_browser",
      completion_role: "semantic",
      observation_authorities: [externalAuthority],
      required_evidence_capabilities: {
        "exact-external-result-ui-assertion": ["target_runtime"],
      },
    },
  ];
  return {
    contract,
    confirmation,
    machineAuthority,
    externalAuthority,
    compiledChecks,
  };
}

function optionalExactCrossSurfaceReachability(mutate) {
  const fixture = optionalExactCrossSurfaceFixture();
  mutate?.(fixture);
  return compileAcceptanceReachability({
    contract: fixture.contract,
    claims: compileProductClaimCoverage(fixture.contract, {
      allow_uncovered: true,
    }),
    manifest: fixtureSemanticManifest(),
    compiled_checks: fixture.compiledChecks,
  });
}

for (const scenario of [
  {
    name: "actual projections",
    mutate({ externalAuthority }) {
      externalAuthority.actual_projection = "truthy_boolean";
    },
    reason: "proof_surface_authority_ambiguous",
  },
  {
    name: "comparators",
    mutate({ externalAuthority }) {
      externalAuthority.comparison.comparator = "different_exact";
    },
    reason: "proof_surface_authority_ambiguous",
  },
  {
    name: "comparator modes",
    mutate({ externalAuthority }) {
      externalAuthority.comparison.mode = "tolerance";
    },
    reason: "proof_surface_authority_ambiguous",
  },
  {
    name: "comparator parameters",
    mutate({ externalAuthority }) {
      externalAuthority.comparison.parameters_sha256 = "b".repeat(64);
    },
    reason: "proof_surface_authority_ambiguous",
  },
  {
    name: "comparator tolerances",
    mutate({ externalAuthority }) {
      externalAuthority.comparison.tolerance_sha256 = "c".repeat(64);
    },
    reason: "proof_surface_authority_ambiguous",
  },
  {
    name: "comparator masks",
    mutate({ externalAuthority }) {
      externalAuthority.comparison.mask_sha256 = "d".repeat(64);
    },
    reason: "proof_surface_authority_ambiguous",
  },
  {
    name: "targets",
    mutate({ externalAuthority }) {
      externalAuthority.target_ref = "different-target";
    },
    reason: "proof_surface_authority_ambiguous",
  },
  {
    name: "methods",
    mutate({ confirmation, externalAuthority }) {
      confirmation.obligations[0].method = "durable_roundtrip";
      externalAuthority.method = "durable_roundtrip";
    },
    reason: "proof_surface_authority_ambiguous",
  },
  {
    name: "required evidence capabilities",
    mutate({ confirmation, externalAuthority }) {
      confirmation.obligations[0].evidence_capabilities = [
        "data_state",
        "target_runtime",
      ];
      externalAuthority.evidence_capabilities = [
        "data_state",
        "target_runtime",
      ];
    },
    reason: "proof_surface_authority_ambiguous",
  },
  {
    name: "Expected authority owners",
    mutate({ confirmation }) {
      confirmation.obligations[0].expected_authority_ref =
        "contract-claim:other-owner";
    },
    reason: "machine_external_authority_conflict",
  },
  {
    name: "applicability sessions",
    mutate({ confirmation }) {
      confirmation.scenario.given[0].key = "different-given";
    },
    reason: "machine_external_authority_conflict",
  },
  {
    name: "missing compiled Expected/comparator authorities",
    mutate({ compiledChecks }) {
      compiledChecks[1].observation_authorities = [];
    },
    reason: "proof_surface_authority_ambiguous",
  },
])
  test(`optional cross-surface routes with different ${scenario.name} cannot become advisory`, () => {
    const result = optionalExactCrossSurfaceReachability(
      scenario.mutate,
    ).obligations.find((row) => row.claim_ref === "first.result");
    assert.ok(result);
    assert.equal(result.status, "unreachable");
    assert.equal(result.reason, scenario.reason);
  });

test("optional cross-surface canonical identity includes required polarity", () => {
  const fixture = optionalExactCrossSurfaceFixture();
  const common = {
    contract: fixture.contract,
    outcome_key: "first",
    claim_ref: "first.result",
    local_claim_ref: "result",
    applicability_ref: "first-root-success",
    expected_authority_ref: "contract-claim:first.result",
    method: "exact_value",
    required_evidence_capabilities: ["target_runtime"],
  };
  const positive = objectiveClaimSemanticIdentity({
    ...common,
    required_polarity: "positive",
    observation_authority: fixture.machineAuthority,
  });
  const negative = objectiveClaimSemanticIdentity({
    ...common,
    required_polarity: "negative",
    observation_authority: fixture.externalAuthority,
  });
  assert.ok(positive);
  assert.ok(negative);
  assert.notEqual(positive, negative);
  assert.equal(
    resolveObligationAuthority({
      source_obligation_ref: "claim:first.result",
      proof_surface_selection: "optional",
      machine_candidates: [
        {
          check_key: "machine",
          assertion_key: "machine-assertion",
          proof_surface: "runtime_behavior",
          required_evidence_capabilities: ["target_runtime"],
          semantic_identity: positive,
        },
      ],
      external_candidates: [
        {
          confirmation_ref: "external",
          proof_surface: "ui_browser",
          required_evidence_capabilities: ["target_runtime"],
          advisory_to_machine: true,
          semantic_identity: negative,
        },
      ],
    }).reason,
    "proof_surface_authority_ambiguous",
  );
});

test("optional cross-surface canonical identity includes exact applicability", () => {
  const fixture = optionalExactCrossSurfaceFixture();
  const otherApplicability = structuredClone(
    fixture.contract.outcomes[0].applicability[0],
  );
  otherApplicability.key = "first-other-applicability";
  otherApplicability.dimensions = [
    { key: "fixture-state", value: "different" },
  ];
  fixture.contract.outcomes[0].applicability.push(otherApplicability);
  const common = {
    contract: fixture.contract,
    outcome_key: "first",
    claim_ref: "first.result",
    local_claim_ref: "result",
    required_polarity: "positive",
    expected_authority_ref: "contract-claim:first.result",
    method: "exact_value",
    required_evidence_capabilities: ["target_runtime"],
  };
  const primary = objectiveClaimSemanticIdentity({
    ...common,
    applicability_ref: "first-root-success",
    observation_authority: fixture.machineAuthority,
  });
  const other = objectiveClaimSemanticIdentity({
    ...common,
    applicability_ref: otherApplicability.key,
    observation_authority: fixture.externalAuthority,
  });
  assert.ok(primary);
  assert.ok(other);
  assert.notEqual(primary, other);
});

test("effective External completion role changes the existing Acceptance Authority identity", () => {
  const reachability = optionalExactCrossSurfaceReachability();
  assert.equal(reachability.effective_external_routes.length, 1);
  assert.equal(
    reachability.effective_external_routes[0].completion_role,
    "advisory",
  );
  const changed = structuredClone(reachability);
  changed.effective_external_routes[0].completion_role = "blocking";
  changed.effective_external_routes[0].acceptance_effect = "required";
  const declared = "a".repeat(64);
  assert.notEqual(
    compiledAcceptanceAuthorityHash(declared, {}, reachability, []),
    compiledAcceptanceAuthorityHash(declared, {}, changed, []),
  );
});

test("Design Fact reachability retains its exact obligation identity and rejects Judgment", () => {
  const contract = deliveryContract();
  contract.task.target_profile.completion_authority = "declared_authorities";
  const outcome = contract.outcomes[0];
  const check = outcome.acceptance.checks[0];
  const assertion = check.positive_assertions.find(
    (candidate) => candidate.key === "first-result",
  );
  assert.ok(assertion);
  const targetKey = "fixture-design-target";
  const conditionKey = "fixture-design-condition";
  const factRef = "fixture.design.fact";
  const sourceObligationRef = `design.${targetKey}.layout_geometry.${conditionKey}.${factRef}`;
  const expectedValue = { width: 320 };
  const parameters = { comparator: "exact_value" };
  const located = (value, materialRef, pointer) => ({
    representation: "inline",
    locator: {
      material_ref: materialRef,
      kind: "manifest_pointer",
      value: pointer,
    },
    sha256: digestCanonical(value),
    value,
  });
  outcome.product.surface_bindings.push({
    design_targets: [
      {
        key: targetKey,
        conformance_check_ref: check.key,
        verification_method_bindings: [
          {
            method: "layout_geometry",
            assertion_ref: assertion.key,
            evidence_artifacts: [
              {
                condition_key: conditionKey,
                fact_expectations: [
                  {
                    fact_ref: factRef,
                    subject_ref: "fixture.design.subject",
                    variation_ref: "fixture.design.variation",
                    property_ref: "fixture.design.property",
                    observation_sensitivity: "plain",
                    expected: located(
                      expectedValue,
                      "fixture.design.manifest",
                      "/facts/0/expected",
                    ),
                    comparison: {
                      comparator: "exact_value",
                      mode: "exact",
                      parameters: located(
                        parameters,
                        "fixture.design.manifest",
                        "/proofs/0/comparison/parameters",
                      ),
                      tolerance: null,
                      mask: null,
                    },
                    oracle: {
                      key: "fixture-design-oracle",
                      trust: "named_external_tcb",
                      identity: "fixture-design-oracle-v1",
                      version: "1",
                      sha256: null,
                    },
                    environment: {
                      key: "fixture-design-environment",
                      identity: "fixture-design-environment-v1",
                      definition: located(
                        { viewport: "320x640" },
                        "fixture.design.manifest",
                        "/environments/0/definition",
                      ),
                    },
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  });
  const designObligation = {
    key: "confirm-fixture-design-fact",
    claim_ref: "first.result",
    applicability_ref: "first-root-success",
    fact_ref: factRef,
    proof_ref: sourceObligationRef,
    method: "layout_geometry",
    proof_surface: check.proof_surface,
    evidence_capabilities: [...assertion.evidence_capabilities],
    expected_authority_ref: `design-proof:${sourceObligationRef}`,
    result_kind: "actual",
  };
  contract.global.acceptance.external_confirmations = [
    {
      key: "confirm-fixture-design",
      description: "Confirm the exact fixture Design Fact Actual.",
      owner: "fixture-design-owner",
      kind: "field_validation",
      impact_claims: ["first.result"],
      blocks_target: true,
      actor: {
        id: "fixture-design-owner",
        role: "design acceptance owner",
        authority_kind: "expert",
        identity_assurance: {
          scheme: "ed25519",
          key_id: "fixture-design-owner-2026",
          public_key_ref:
            "project_context/authorities/fixture-design-owner.pub",
        },
      },
      target_ref: "fixture-app",
      environment_identity: "fixture-design-environment-v1",
      scenario: structuredClone(check.scenario),
      evidence_requirements: [
        {
          key: "fixture-design-evidence",
          statement: "Observe the exact fixture Design Fact.",
        },
      ],
      obligations: [designObligation],
    },
  ];
  const compile = (candidate) =>
    compileAcceptanceReachability({
      contract: candidate,
      claims: compileProductClaimCoverage(candidate, { allow_uncovered: true }),
      manifest: fixtureSemanticManifest(),
      compiled_checks: [],
    });
  const reachability = compile(contract);
  const designRow = reachability.obligations.find(
    (row) => row.source_obligation_ref === sourceObligationRef,
  );
  assert.ok(designRow);
  assert.equal(designRow.status, "external_fulfillable");
  assert.equal(designRow.fact_ref, factRef);
  assert.equal(designRow.proof_ref, sourceObligationRef);
  const effective = reachability.effective_external_routes.find(
    (row) => row.source_obligation_ref === sourceObligationRef,
  );
  assert.ok(effective);
  assert.equal(effective.completion_role, "blocking");
  assert.equal(effective.acceptance_effect, "required");
  assert.match(effective.semantic_identity, /^[a-f0-9]{64}$/u);

  const judgmentLaundering = structuredClone(contract);
  const judgmentObligation =
    judgmentLaundering.global.acceptance.external_confirmations[0]
      .obligations[0];
  judgmentObligation.result_kind = "judgment";
  judgmentObligation.judgment_basis = {
    kind: "expert_assessment",
    source_ref: "fixture-design-source",
  };
  const rejected = compile(judgmentLaundering);
  assert.equal(
    rejected.effective_external_routes.some(
      (row) => row.source_obligation_ref === sourceObligationRef,
    ),
    false,
  );
  assert.equal(
    rejected.obligations.find(
      (row) => row.source_obligation_ref === sourceObligationRef,
    )?.status,
    "unreachable",
  );
});

test("an admitted machine route cannot be overridden by a blocking external route", () => {
  const contract = deliveryContract();
  contract.task.target_profile.completion_authority = "declared_authorities";
  const check = contract.outcomes[0].acceptance.checks[0];
  const resultAssertion = check.positive_assertions.find(
    (row) => row.key === "first-result",
  );
  resultAssertion.claims = [];
  delete resultAssertion.applicability_ref;
  const staticResultCheck = {
    ...structuredClone(check),
    key: "first-result-static-check",
    journey_roles: ["success"],
    proof_surface: "runtime_behavior",
    positive_assertions: [
      {
        ...structuredClone(resultAssertion),
        key: "first-result-static",
        claims: ["result"],
        applicability_ref: "first-root-success",
      },
    ],
    negative_assertions: [],
  };
  contract.outcomes[0].acceptance.checks.push(staticResultCheck);
  contract.global.acceptance.external_confirmations = [
    {
      key: "external-result-runtime",
      description: "Confirm the product result on the declared runtime target.",
      owner: "release-owner",
      kind: "field_validation",
      impact_claims: ["first.result"],
      blocks_target: true,
      actor: {
        id: "fixture-product-owner",
        role: "product acceptance owner",
        authority_kind: "human",
      },
      target_ref: "fixture-app",
      environment_identity: "fixture-external-environment-v1",
      scenario: structuredClone(check.scenario),
      evidence_requirements: [
        {
          key: "runtime-observation",
          statement: "Capture the runtime product result.",
        },
      ],
      obligations: [
        {
          key: "confirm-first-result-runtime",
          claim_ref: "first.result",
          applicability_ref: "first-root-success",
          fact_ref: null,
          proof_ref: null,
          method: "exact_value",
          proof_surface: "runtime_behavior",
          evidence_capabilities: ["target_runtime"],
          expected_authority_ref: "contract-claim:first.result",
          result_kind: "actual",
        },
      ],
    },
  ];
  const claims = compileProductClaimCoverage(contract, {
    allow_uncovered: true,
  });
  const reachability = compileAcceptanceReachability({
    contract,
    claims,
    manifest: fixtureSemanticManifest(),
    compiled_checks: [
      {
        key: "first-result-static-check",
        outcome_key: "first",
        completion_role: "semantic",
        observation_authorities: [
          {
            assertion_ref: "first-result-static",
            claim_refs: ["result"],
            obligation_ref: "claim:first.result",
            authority: "package_process_json_exact",
          },
        ],
        required_evidence_capabilities: {
          "first-result-static": ["target_runtime"],
        },
      },
    ],
  });
  const result = reachability.obligations.find(
    (row) => row.claim_ref === "first.result",
  );
  assert.ok(result);
  assert.equal(result.status, "unreachable");
  assert.equal(result.reason, "machine_external_authority_conflict");
  assert.equal(result.proof_surface, "runtime_behavior");
  assert.equal(
    result.source_obligation_ref,
    "claim:first.result:first-root-success:runtime_behavior",
  );
});

test("an arbitrary Source Claim cannot authorize Judgment for an objective full Claim", () => {
  const contract = deliveryContract();
  contract.task.target_profile.completion_authority = "declared_authorities";
  const check = contract.outcomes[0].acceptance.checks[0];
  const resultAssertion = check.positive_assertions.find(
    (row) => row.key === "first-result",
  );
  resultAssertion.claims = [];
  delete resultAssertion.applicability_ref;
  contract.global.acceptance.external_confirmations = [
    {
      key: "external-result-arbitrary-source",
      description:
        "Authorize the first result through an unrelated Source Claim.",
      owner: "release-owner",
      kind: "field_validation",
      impact_claims: ["first.result"],
      blocks_target: true,
      actor: {
        id: "fixture-product-owner",
        role: "product acceptance owner",
        authority_kind: "human",
        identity_assurance: {
          scheme: "ed25519",
          key_id: "fixture-owner-2026",
          public_key_ref: "project_context/authorities/fixture-owner.pub",
        },
      },
      target_ref: "fixture-app",
      environment_identity: "fixture-external-environment-v1",
      scenario: structuredClone(check.scenario),
      evidence_requirements: [
        {
          key: "result-observation",
          statement: "Record the authorized result judgment.",
        },
      ],
      obligations: [
        {
          key: "confirm-first-result-arbitrary-source",
          claim_ref: "first.result",
          applicability_ref: "first-root-success",
          fact_ref: null,
          proof_ref: null,
          method: "exact_value",
          proof_surface: "runtime_behavior",
          evidence_capabilities: ["target_runtime"],
          expected_authority_ref: "contract-claim:first.result",
          result_kind: "judgment",
          judgment_basis: {
            kind: "authorization",
            source_ref: "first-observable",
          },
        },
      ],
    },
  ];
  const result = compileAcceptanceReachability({
    contract,
    claims: compileProductClaimCoverage(contract, { allow_uncovered: true }),
    manifest: fixtureSemanticManifest(),
    compiled_checks: [],
  }).obligations.find((row) => row.claim_ref === "first.result");
  assert.ok(result);
  assert.equal(result.status, "unreachable");
  assert.equal(result.reason, "external_confirmation_decomposition_invalid");
});

test("Judgment authority must bind the exact applicability", () => {
  const contract = deliveryContract();
  contract.task.target_profile.completion_authority = "declared_authorities";
  const outcome = contract.outcomes[0];
  const check = outcome.acceptance.checks[0];
  const requirement = outcome.product.requirements[0];
  requirement.required_proof_surfaces = [];
  const requirementAssertion = check.positive_assertions.find(
    (row) => row.key === "first-requirement",
  );
  requirementAssertion.claims = [];
  delete requirementAssertion.applicability_ref;
  const confirmation = {
    key: "external-requirement-applicability",
    description: "Confirm the requirement under its exact applicability.",
    owner: "release-owner",
    kind: "field_validation",
    impact_claims: ["first.requirement.observe-first"],
    blocks_target: true,
    actor: {
      id: "fixture-product-owner",
      role: "product acceptance owner",
      authority_kind: "human",
    },
    target_ref: "fixture-app",
    environment_identity: "fixture-external-environment-v1",
    scenario: structuredClone(check.scenario),
    evidence_requirements: [
      { key: "requirement-review", statement: "Review the requirement." },
    ],
    obligations: [
      {
        key: "confirm-first-requirement-applicability",
        claim_ref: "first.requirement.observe-first",
        applicability_ref: "first-root-success",
        fact_ref: null,
        proof_ref: null,
        method: "exact_value",
        proof_surface: "ui_browser",
        evidence_capabilities: ["semantic_fact"],
        expected_authority_ref:
          "contract-claim:first.requirement.observe-first",
        result_kind: "judgment",
      },
    ],
  };
  contract.global.acceptance.external_confirmations = [confirmation];
  authorizeJudgment(contract, confirmation);
  contract.source_claims.find(
    (claim) =>
      claim.key === confirmation.obligations[0].judgment_basis.source_ref,
  ).judgment_basis.applicability_refs = ["another-applicability"];
  const result = compileAcceptanceReachability({
    contract,
    claims: compileProductClaimCoverage(contract, { allow_uncovered: true }),
    manifest: fixtureSemanticManifest(),
    compiled_checks: [],
  }).obligations.find(
    (row) => row.claim_ref === "first.requirement.observe-first",
  );
  assert.ok(result);
  assert.equal(result.status, "unreachable");
  assert.equal(result.reason, "external_confirmation_decomposition_invalid");
});

test("an explicitly Source-owned subjective preference remains externally fulfillable", () => {
  const contract = deliveryContract();
  contract.task.target_profile.completion_authority = "declared_authorities";
  const outcome = contract.outcomes[0];
  const check = outcome.acceptance.checks[0];
  outcome.product.requirements.push({
    key: "friendly-tone",
    statement: "The product owner prefers a friendly presentation tone.",
    required_proof_surfaces: [],
    applicability_refs: ["first-root-success"],
  });
  contract.source_claims.push({
    key: "friendly-tone-preference",
    source_ref: "source.md#fixture-source",
    statement: "The product owner prefers a friendly presentation tone.",
    disposition: {
      type: "claim",
      refs: ["first.requirement.friendly-tone"],
    },
    judgment_basis: {
      kind: "subjective_preference",
      claim_ref: "first.requirement.friendly-tone",
      applicability_refs: ["first-root-success"],
    },
  });
  contract.global.acceptance.external_confirmations = [
    {
      key: "external-friendly-tone",
      description: "Let the product owner assess the preferred tone.",
      owner: "release-owner",
      kind: "field_validation",
      impact_claims: ["first.requirement.friendly-tone"],
      blocks_target: true,
      actor: {
        id: "fixture-product-owner",
        role: "product acceptance owner",
        authority_kind: "human",
        identity_assurance: {
          scheme: "ed25519",
          key_id: "fixture-owner-2026",
          public_key_ref: "project_context/authorities/fixture-owner.pub",
        },
      },
      target_ref: "fixture-app",
      environment_identity: "fixture-external-environment-v1",
      scenario: structuredClone(check.scenario),
      evidence_requirements: [
        {
          key: "tone-review",
          statement:
            "Capture the product owner's signed preference assessment.",
        },
      ],
      obligations: [
        {
          key: "confirm-friendly-tone",
          claim_ref: "first.requirement.friendly-tone",
          applicability_ref: "first-root-success",
          fact_ref: null,
          proof_ref: null,
          method: "exact_value",
          proof_surface: "ui_browser",
          evidence_capabilities: [],
          expected_authority_ref:
            "contract-claim:first.requirement.friendly-tone",
          result_kind: "judgment",
          judgment_basis: {
            kind: "subjective_preference",
            source_ref: "friendly-tone-preference",
          },
        },
      ],
    },
  ];
  const result = compileAcceptanceReachability({
    contract,
    claims: compileProductClaimCoverage(contract, { allow_uncovered: true }),
    manifest: fixtureSemanticManifest(),
    compiled_checks: [],
  }).obligations.find(
    (row) => row.claim_ref === "first.requirement.friendly-tone",
  );
  assert.ok(result);
  assert.equal(result.status, "external_fulfillable");
  assert.equal(result.authority, "external_confirmation");
});

test("an optional equivalent External surface is advisory when one Machine route exists", () => {
  const contract = deliveryContract();
  contract.task.target_profile.completion_authority = "declared_authorities";
  const check = contract.outcomes[0].acceptance.checks[0];
  const resultAssertion = check.positive_assertions.find(
    (row) => row.key === "first-result",
  );
  resultAssertion.claims = [];
  delete resultAssertion.applicability_ref;
  const machineCheck = {
    ...structuredClone(check),
    key: "machine-result-runtime",
    proof_surface: "runtime_behavior",
    positive_assertions: [
      {
        ...structuredClone(resultAssertion),
        key: "machine-result-runtime-assertion",
        claims: ["result"],
        applicability_ref: "first-root-success",
      },
    ],
    negative_assertions: [],
  };
  contract.outcomes[0].acceptance.checks.push(machineCheck);
  const confirmation = {
    key: "external-result-ui",
    description: "Confirm the same first result through a UI surface.",
    owner: "release-owner",
    kind: "field_validation",
    impact_claims: ["first.result"],
    blocks_target: true,
    actor: {
      id: "fixture-product-owner",
      role: "product acceptance owner",
      authority_kind: "human",
    },
    target_ref: "fixture-app",
    environment_identity: "fixture-external-environment-v1",
    scenario: structuredClone(check.scenario),
    evidence_requirements: [
      { key: "ui-result", statement: "Observe the same result in the UI." },
    ],
    obligations: [
      {
        key: "confirm-first-result-ui",
        claim_ref: "first.result",
        applicability_ref: "first-root-success",
        fact_ref: null,
        proof_ref: null,
        method: "exact_value",
        proof_surface: "ui_browser",
        evidence_capabilities: ["target_runtime"],
        expected_authority_ref: "contract-claim:first.result",
        result_kind: "actual",
      },
    ],
  };
  contract.global.acceptance.external_confirmations = [confirmation];
  const compiledChecks = [
    {
      key: machineCheck.key,
      outcome_key: "first",
      proof_surface: "runtime_behavior",
      completion_role: "semantic",
      observation_authorities: [
        compiledExactClaimAuthority({
          assertionRef: "machine-result-runtime-assertion",
          authority: "package_process_json_exact",
          obligationRef:
            "claim:first.result:first-root-success:runtime_behavior",
          proofSurface: "runtime_behavior",
        }),
      ],
      required_evidence_capabilities: {
        "machine-result-runtime-assertion": ["target_runtime"],
      },
    },
    {
      key: "external-result-ui-check",
      outcome_key: "first",
      proof_surface: "ui_browser",
      completion_role: "semantic",
      observation_authorities: [
        compiledExactClaimAuthority({
          assertionRef: "external-result-ui-assertion",
          authority: "external_confirmation",
          obligationRef: "claim:first.result:first-root-success:ui_browser",
          proofSurface: "ui_browser",
        }),
      ],
      required_evidence_capabilities: {
        "external-result-ui-assertion": ["target_runtime"],
      },
    },
  ];
  const reachability = compileAcceptanceReachability({
    contract,
    claims: compileProductClaimCoverage(contract, { allow_uncovered: true }),
    manifest: fixtureSemanticManifest(),
    compiled_checks: compiledChecks,
  });
  const result = reachability.obligations.find(
    (row) => row.claim_ref === "first.result",
  );
  assert.ok(result);
  assert.equal(result.status, "machine_admitted");
  assert.equal(result.authority, "machine");
  assert.equal(result.proof_surface, "runtime_behavior");
  assert.equal(
    reachability.obligations.some(
      (row) =>
        row.obligation_ref === "external-confirmation:external-result-ui",
    ),
    false,
  );

  const duplicateAdvisory = structuredClone(contract);
  duplicateAdvisory.global.acceptance.external_confirmations[0].obligations.push(
    {
      ...structuredClone(confirmation.obligations[0]),
      key: "confirm-first-result-ui-duplicate",
    },
  );
  const duplicateReachability = compileAcceptanceReachability({
    contract: duplicateAdvisory,
    claims: compileProductClaimCoverage(duplicateAdvisory, {
      allow_uncovered: true,
    }),
    manifest: fixtureSemanticManifest(),
    compiled_checks: compiledChecks,
  });
  assert.equal(
    duplicateReachability.obligations.some(
      (row) =>
        row.obligation_ref === "external-confirmation:external-result-ui",
    ),
    true,
  );

  const judgmentSubstitution = structuredClone(contract);
  judgmentSubstitution.global.acceptance.external_confirmations[0].obligations[0].result_kind =
    "judgment";
  judgmentSubstitution.global.acceptance.external_confirmations[0].obligations[0].judgment_basis =
    {
      kind: "authorization",
      source_ref: "first-observable",
    };
  const judgmentReachability = compileAcceptanceReachability({
    contract: judgmentSubstitution,
    claims: compileProductClaimCoverage(judgmentSubstitution, {
      allow_uncovered: true,
    }),
    manifest: fixtureSemanticManifest(),
    compiled_checks: compiledChecks,
  });
  assert.equal(
    judgmentReachability.obligations.some(
      (row) =>
        row.obligation_ref === "external-confirmation:external-result-ui",
    ),
    true,
  );

  for (const [label, mutate] of [
    [
      "target",
      (candidate) => {
        candidate.global.acceptance.external_confirmations[0].target_ref =
          "different-target";
      },
    ],
    [
      "given",
      (candidate) => {
        candidate.global.acceptance.external_confirmations[0].scenario.given[0].key =
          "different-given";
      },
    ],
    [
      "when",
      (candidate) => {
        candidate.global.acceptance.external_confirmations[0].scenario.when[0].key =
          "different-when";
      },
    ],
  ]) {
    const sessionMismatch = structuredClone(contract);
    mutate(sessionMismatch);
    const mismatchReachability = compileAcceptanceReachability({
      contract: sessionMismatch,
      claims: compileProductClaimCoverage(sessionMismatch, {
        allow_uncovered: true,
      }),
      manifest: fixtureSemanticManifest(),
      compiled_checks: compiledChecks,
    });
    const mismatchClaim = mismatchReachability.obligations.find(
      (row) => row.claim_ref === "first.result",
    );
    assert.ok(mismatchClaim, label);
    assert.equal(
      mismatchClaim.status,
      "unreachable",
      `${label} mismatch must not borrow Machine advisory identity`,
    );
    assert.equal(
      mismatchClaim.reason,
      "machine_external_authority_conflict",
      label,
    );
    assert.equal(
      mismatchReachability.obligations.some(
        (row) =>
          row.obligation_ref === "external-confirmation:external-result-ui",
      ),
      true,
      `${label} mismatch must retain its blocking declaration`,
    );
  }
});

test("optional cross-surface routes with different Expected are ambiguous", () => {
  const contract = deliveryContract();
  contract.task.target_profile.completion_authority = "declared_authorities";
  const check = contract.outcomes[0].acceptance.checks[0];
  const resultAssertion = check.positive_assertions.find(
    (row) => row.key === "first-result",
  );
  resultAssertion.claims = [];
  delete resultAssertion.applicability_ref;
  const machineCheck = {
    ...structuredClone(check),
    key: "different-expected-machine-result-runtime",
    proof_surface: "runtime_behavior",
    positive_assertions: [
      {
        ...structuredClone(resultAssertion),
        key: "different-expected-machine-assertion",
        claims: ["result"],
        applicability_ref: "first-root-success",
        expected: true,
      },
    ],
    negative_assertions: [],
  };
  contract.outcomes[0].acceptance.checks.push(machineCheck);
  contract.global.acceptance.external_confirmations = [
    {
      key: "different-expected-external-result-ui",
      description:
        "Observe the same Claim on another surface with the opposite Expected.",
      owner: "release-owner",
      kind: "field_validation",
      impact_claims: ["first.result"],
      blocks_target: true,
      actor: {
        id: "fixture-product-owner",
        role: "product acceptance owner",
        authority_kind: "human",
      },
      target_ref: "fixture-app",
      environment_identity: "fixture-external-environment-v1",
      scenario: structuredClone(check.scenario),
      evidence_requirements: [
        {
          key: "different-expected-ui-result",
          statement: "Observe the exact UI result.",
        },
      ],
      obligations: [
        {
          key: "confirm-different-expected-first-result-ui",
          claim_ref: "first.result",
          applicability_ref: "first-root-success",
          fact_ref: null,
          proof_ref: null,
          method: "exact_value",
          proof_surface: "ui_browser",
          evidence_capabilities: ["target_runtime"],
          expected_authority_ref: "contract-claim:first.result",
          result_kind: "actual",
        },
      ],
    },
  ];
  const reachability = compileAcceptanceReachability({
    contract,
    claims: compileProductClaimCoverage(contract, { allow_uncovered: true }),
    manifest: fixtureSemanticManifest(),
    compiled_checks: [
      {
        key: machineCheck.key,
        outcome_key: "first",
        proof_surface: "runtime_behavior",
        completion_role: "semantic",
        observation_authorities: [
          compiledExactClaimAuthority({
            assertionRef: "different-expected-machine-assertion",
            authority: "package_process_json_exact",
            obligationRef:
              "claim:first.result:first-root-success:runtime_behavior",
            proofSurface: "runtime_behavior",
            expected: true,
          }),
        ],
        required_evidence_capabilities: {
          "different-expected-machine-assertion": ["target_runtime"],
        },
      },
      {
        key: "different-expected-external-ui-check",
        outcome_key: "first",
        proof_surface: "ui_browser",
        completion_role: "semantic",
        observation_authorities: [
          compiledExactClaimAuthority({
            assertionRef: "different-expected-external-ui-assertion",
            authority: "external_confirmation",
            obligationRef: "claim:first.result:first-root-success:ui_browser",
            proofSurface: "ui_browser",
            expected: false,
          }),
        ],
        required_evidence_capabilities: {
          "different-expected-external-ui-assertion": ["target_runtime"],
        },
      },
    ],
  });
  const result = reachability.obligations.find(
    (row) => row.claim_ref === "first.result",
  );
  assert.ok(result);
  assert.equal(result.status, "unreachable");
  assert.equal(result.reason, "proof_surface_authority_ambiguous");
});

test("non-equivalent optional proof surfaces fail closed as proof-surface ambiguous", () => {
  const contract = deliveryContract();
  contract.task.target_profile.completion_authority = "declared_authorities";
  const check = contract.outcomes[0].acceptance.checks[0];
  const resultAssertion = check.positive_assertions.find(
    (row) => row.key === "first-result",
  );
  resultAssertion.claims = [];
  delete resultAssertion.applicability_ref;
  const machineCheck = {
    ...structuredClone(check),
    key: "machine-result-runtime",
    proof_surface: "runtime_behavior",
    positive_assertions: [
      {
        ...structuredClone(resultAssertion),
        key: "machine-result-runtime-assertion",
        claims: ["result"],
        applicability_ref: "first-root-success",
      },
    ],
    negative_assertions: [],
  };
  contract.outcomes[0].acceptance.checks.push(machineCheck);
  const confirmation = {
    key: "external-result-data-state",
    description: "Confirm a stronger data-state interpretation of the result.",
    owner: "release-owner",
    kind: "field_validation",
    impact_claims: ["first.result"],
    blocks_target: true,
    actor: {
      id: "fixture-product-owner",
      role: "product acceptance owner",
      authority_kind: "human",
    },
    target_ref: "fixture-app",
    environment_identity: "fixture-external-environment-v1",
    scenario: structuredClone(check.scenario),
    evidence_requirements: [
      {
        key: "data-state-result",
        statement: "Observe the result and its data state.",
      },
    ],
    obligations: [
      {
        key: "confirm-first-result-data-state",
        claim_ref: "first.result",
        applicability_ref: "first-root-success",
        fact_ref: null,
        proof_ref: null,
        method: "exact_value",
        proof_surface: "data_state",
        evidence_capabilities: ["data_state", "target_runtime"],
        expected_authority_ref: "contract-claim:first.result",
        result_kind: "actual",
      },
    ],
  };
  contract.global.acceptance.external_confirmations = [confirmation];
  const result = compileAcceptanceReachability({
    contract,
    claims: compileProductClaimCoverage(contract, { allow_uncovered: true }),
    manifest: fixtureSemanticManifest(),
    compiled_checks: [
      {
        key: machineCheck.key,
        outcome_key: "first",
        completion_role: "semantic",
        observation_authorities: [
          {
            assertion_ref: "machine-result-runtime-assertion",
            claim_refs: ["result"],
            obligation_ref: "claim:first.result",
            authority: "package_process_json_exact",
          },
        ],
        required_evidence_capabilities: {
          "machine-result-runtime-assertion": ["target_runtime"],
        },
      },
    ],
  }).obligations.find((row) => row.claim_ref === "first.result");
  assert.ok(result);
  assert.equal(result.status, "unreachable");
  assert.equal(result.reason, "proof_surface_authority_ambiguous");
});

test("multiple admitted machine routes are authority-ambiguous instead of first-match accepted", () => {
  const contract = deliveryContract();
  const check = contract.outcomes[0].acceptance.checks[0];
  const duplicate = structuredClone(check);
  duplicate.key = "duplicate-machine-check";
  duplicate.positive_assertions = duplicate.positive_assertions.map((row) => ({
    ...row,
    key: `duplicate-${row.key}`,
  }));
  contract.outcomes[0].acceptance.checks.push(duplicate);
  const claims = compileProductClaimCoverage(contract, {
    allow_uncovered: true,
  });
  const compiled = [check, duplicate].map((row) => ({
    key: row.key,
    outcome_key: "first",
    completion_role: "semantic",
    observation_authorities: row.positive_assertions
      .filter((assertion) => assertion.claims.length)
      .map((assertion) => ({
        assertion_ref: assertion.key,
        claim_refs: [...assertion.claims],
        obligation_ref: `claim:${assertion.claims[0]}`,
        authority: "package_process_json_exact",
      })),
    required_evidence_capabilities: Object.fromEntries(
      row.positive_assertions.map((assertion) => [
        assertion.key,
        assertion.evidence_capabilities,
      ]),
    ),
  }));
  const result = compileAcceptanceReachability({
    contract,
    claims,
    manifest: fixtureSemanticManifest(),
    compiled_checks: compiled,
  }).obligations.find(
    (row) => row.claim_ref === "first.requirement.observe-first",
  );
  assert.ok(result);
  assert.equal(result.status, "unreachable");
  assert.equal(result.reason, "authority_route_ambiguous");
});

test("objective population Claims retain set-equality semantics and reject Judgment", () => {
  const contract = deliveryContract();
  contract.task.target_profile.completion_authority = "declared_authorities";
  const outcome = contract.outcomes[0];
  const check = outcome.acceptance.checks[0];
  outcome.acceptance.population = {
    check_key: check.key,
    universe_binding_key: "state-first",
    claims: ["obligation.implement-first"],
    observations: {
      universe_ids: "population.universe_ids",
      eligible_ids: "population.eligible_ids",
      observed_ids: "population.observed_ids",
      excluded_items: "population.excluded_items",
    },
    exclusion_rules: [],
  };
  const confirmation = {
    key: "external-population",
    description: "Confirm the complete implementation population.",
    owner: "release-owner",
    kind: "field_validation",
    impact_claims: ["first.obligation.implement-first"],
    blocks_target: true,
    actor: {
      id: "fixture-product-owner",
      role: "product acceptance owner",
      authority_kind: "human",
    },
    target_ref: "fixture-app",
    environment_identity: "fixture-external-environment-v1",
    scenario: structuredClone(check.scenario),
    evidence_requirements: [
      {
        key: "population-observation",
        statement: "Capture the exact complete population.",
      },
    ],
    obligations: [
      {
        key: "confirm-first-population",
        claim_ref: "first.obligation.implement-first",
        applicability_ref: "first-root-success",
        fact_ref: null,
        proof_ref: null,
        method: "exact_value",
        proof_surface: "runtime_behavior",
        evidence_capabilities: ["population_coverage"],
        expected_authority_ref:
          "contract-claim:first.obligation.implement-first",
        result_kind: "judgment",
      },
    ],
  };
  contract.global.acceptance.external_confirmations = [confirmation];
  authorizeJudgment(contract, confirmation);
  const reachability = () =>
    compileAcceptanceReachability({
      contract,
      claims: compileProductClaimCoverage(contract, {
        allow_uncovered: true,
      }),
      manifest: fixtureSemanticManifest(),
      compiled_checks: [],
    });

  let result = reachability().obligations.find(
    (row) => row.claim_ref === "first.obligation.implement-first",
  );
  assert.ok(result);
  assert.equal(result.status, "unreachable");
  assert.equal(result.reason, "external_confirmation_decomposition_invalid");
  assert.equal(result.method, "population_set_equality");
  assert.deepEqual(result.required_evidence_capabilities, [
    "population_coverage",
  ]);

  confirmation.obligations[0].method = "population_set_equality";
  result = reachability().obligations.find(
    (row) => row.claim_ref === "first.obligation.implement-first",
  );
  assert.ok(result);
  assert.equal(result.status, "unreachable");
  assert.equal(result.reason, "external_confirmation_decomposition_invalid");
  assert.equal(result.method, "population_set_equality");

  confirmation.actor.identity_assurance = { scheme: "declared_only" };
  result = reachability().obligations.find(
    (row) => row.claim_ref === "first.obligation.implement-first",
  );
  assert.ok(result);
  assert.equal(result.status, "unreachable");
  assert.equal(result.reason, "external_confirmation_decomposition_invalid");
});

test("objective Semantic Facts reject judgment but admit exact external Actual", () => {
  const contract = deliveryContract();
  const manifest = fixtureSemanticManifest();
  contract.task.target_profile.completion_authority = "declared_authorities";
  const outcome = contract.outcomes[0];
  const binding = outcome.semantic_fact_bindings.proofs.find(
    (candidate) => candidate.fact_ref === "fact.first.observable",
  );
  assert.ok(binding);
  const proof = manifest.proof_obligations.find(
    (row) => row.key === binding.proof_ref,
  );
  assert.ok(proof);
  outcome.semantic_fact_bindings.proofs =
    outcome.semantic_fact_bindings.proofs.map((candidate) =>
      candidate.proof_ref === binding.proof_ref
        ? {
            proof_ref: binding.proof_ref,
            fact_ref: binding.fact_ref,
            method: binding.method,
            proof_surface: binding.proof_surface,
            evidence_capabilities: [...binding.evidence_capabilities],
            authority: "external_confirmation",
            confirmation_ref: "fixture-external",
          }
        : candidate,
    );
  const claimRef = "first.semantic_fact.fact.first.observable";
  const confirmation = {
    key: "fixture-external",
    description: "Capture the exact externally observed Semantic Fact.",
    owner: "release-owner",
    kind: "field_validation",
    impact_claims: [claimRef],
    blocks_target: true,
    actor: {
      id: "fixture-external-system",
      role: "declared product system",
      authority_kind: "external_system",
      identity_assurance: {
        scheme: "ed25519",
        key_id: "fixture-system-2026",
        public_key_ref: "project_context/authorities/fixture-owner.pub",
      },
    },
    target_ref: "fixture-app",
    environment_identity: "fixture-external-environment-v1",
    scenario: structuredClone(outcome.acceptance.checks[0].scenario),
    evidence_requirements: [
      {
        key: "semantic-observation",
        statement: "Capture the exact Semantic Fact Actual.",
      },
    ],
    obligations: [
      {
        key: "confirm-first-semantic-fact",
        claim_ref: claimRef,
        applicability_ref: "first-root-success",
        fact_ref: binding.fact_ref,
        proof_ref: binding.proof_ref,
        method: binding.method,
        proof_surface: binding.proof_surface,
        evidence_capabilities: [...binding.evidence_capabilities],
        expected_authority_ref: `semantic-proof:${binding.proof_ref}`,
        result_kind: "judgment",
        judgment_basis: {
          kind: "expert_assessment",
          source_ref: "fixture-external",
        },
      },
    ],
  };
  contract.global.acceptance.external_confirmations = [confirmation];

  const reachability = () =>
    compileAcceptanceReachability({
      contract,
      claims: compileProductClaimCoverage(contract, { allow_uncovered: true }),
      manifest,
      compiled_checks: [],
    }).obligations.find((row) => row.proof_ref === proof.key);

  let result = reachability();
  assert.ok(result);
  assert.equal(result.status, "unreachable");
  assert.equal(result.reason, "external_confirmation_decomposition_invalid");

  confirmation.obligations[0].result_kind = "actual";
  delete confirmation.obligations[0].judgment_basis;
  result = reachability();
  assert.ok(result);
  assert.equal(result.status, "external_fulfillable");
});

test("custom Semantic Fact Judgment requires an exact typed Source and a closed standard profile", () => {
  const contract = deliveryContract();
  const manifest = fixtureSemanticManifest();
  contract.task.target_profile.completion_authority = "declared_authorities";
  const outcome = contract.outcomes[0];
  const binding = outcome.semantic_fact_bindings.proofs.find(
    (candidate) => candidate.fact_ref === "fact.first.observable",
  );
  assert.ok(binding);
  const fact = manifest.facts.find(
    (candidate) => candidate.key === binding.fact_ref,
  );
  const proof = manifest.proof_obligations.find(
    (candidate) => candidate.key === binding.proof_ref,
  );
  const property = manifest.property_dispositions.find(
    (candidate) => candidate.key === fact?.property_ref,
  );
  assert.ok(fact);
  assert.ok(proof);
  assert.ok(property);
  property.standard = false;
  property.property = "custom.presentation-quality";
  property.required_methods = ["exact_value"];
  property.required_evidence_capabilities = ["semantic_fact"];
  proof.authority = "external_confirmation";
  proof.method = "exact_value";
  proof.evidence_capabilities = ["semantic_fact"];
  outcome.semantic_fact_bindings.proofs =
    outcome.semantic_fact_bindings.proofs.map((candidate) =>
      candidate.proof_ref === binding.proof_ref
        ? {
            ...candidate,
            method: "exact_value",
            evidence_capabilities: ["semantic_fact"],
            authority: "external_confirmation",
            confirmation_ref: "custom-presentation-review",
          }
        : candidate,
    );
  const claimRef = `first.semantic_fact.${fact.key}`;
  const sourceClaim = {
    key: "custom-presentation-preference",
    source_ref: "source.md#fixture-source",
    statement: "The product owner prefers the presentation to feel polished.",
    disposition: { type: "claim", refs: [claimRef] },
    judgment_basis: {
      kind: "subjective_preference",
      claim_ref: claimRef,
      applicability_refs: ["first-root-success"],
    },
  };
  contract.source_claims.push(sourceClaim);
  const confirmation = {
    key: "custom-presentation-review",
    description:
      "Let the product owner assess the custom presentation quality.",
    owner: "release-owner",
    kind: "field_validation",
    impact_claims: [claimRef],
    blocks_target: true,
    actor: {
      id: "fixture-product-owner",
      role: "product acceptance owner",
      authority_kind: "human",
      identity_assurance: {
        scheme: "ed25519",
        key_id: "fixture-owner-2026",
        public_key_ref: "project_context/authorities/fixture-owner.pub",
      },
    },
    target_ref: "fixture-app",
    environment_identity: "fixture-external-environment-v1",
    scenario: structuredClone(outcome.acceptance.checks[0].scenario),
    evidence_requirements: [
      {
        key: "presentation-review",
        statement: "Capture the product owner's signed subjective assessment.",
      },
    ],
    obligations: [
      {
        key: "confirm-custom-presentation-quality",
        claim_ref: claimRef,
        applicability_ref: "first-root-success",
        fact_ref: fact.key,
        proof_ref: proof.key,
        method: "exact_value",
        proof_surface: binding.proof_surface,
        evidence_capabilities: ["semantic_fact"],
        expected_authority_ref: `semantic-proof:${proof.key}`,
        result_kind: "judgment",
        judgment_basis: {
          kind: "subjective_preference",
          source_ref: sourceClaim.key,
        },
      },
    ],
  };
  contract.global.acceptance.external_confirmations = [confirmation];
  const reachability = () =>
    compileAcceptanceReachability({
      contract,
      claims: compileProductClaimCoverage(contract, { allow_uncovered: true }),
      manifest,
      compiled_checks: [],
    }).obligations.find((row) => row.proof_ref === proof.key);

  let result = reachability();
  assert.ok(result);
  assert.equal(result.status, "external_fulfillable");

  delete sourceClaim.judgment_basis;
  result = reachability();
  assert.ok(result);
  assert.equal(result.status, "unreachable");
  assert.equal(result.reason, "external_confirmation_decomposition_invalid");

  sourceClaim.judgment_basis = {
    kind: "subjective_preference",
    claim_ref: claimRef,
    applicability_refs: ["first-root-success"],
  };
  property.required_methods = ["custom.unclassified-review"];
  proof.method = "custom.unclassified-review";
  outcome.semantic_fact_bindings.proofs.find(
    (candidate) => candidate.proof_ref === proof.key,
  ).method = "custom.unclassified-review";
  confirmation.obligations[0].method = "custom.unclassified-review";
  result = reachability();
  assert.ok(result);
  assert.equal(result.status, "unreachable");
  assert.equal(result.reason, "external_confirmation_decomposition_invalid");
});

test("blocking external confirmation uses whole-candidate identity", () => {
  const file = (path, sha256) => ({
    path,
    mode: "100644",
    size: 1,
    sha256,
  });
  const compiled = {
    global: {
      acceptance: {
        external_confirmations: [{ key: "confirm-first", blocks_target: true }],
      },
    },
    acceptance_reachability: {
      obligations: [
        {
          status: "external_fulfillable",
          confirmation_ref: "confirm-first",
          outcome_key: "first",
        },
      ],
      effective_external_routes: [
        {
          status: "external_fulfillable",
          confirmation_ref: "confirm-first",
          outcome_key: "first",
          completion_role: "blocking",
        },
      ],
    },
    outcomes: [
      {
        key: "first",
        product: { owner: { path_globs: ["owner/**"] } },
        technical: {
          expected_change_paths: ["expected/**"],
          allowed_support_paths: ["support/**"],
          bindings: [
            {
              kind: "file",
              target: "targets/product.json",
              carrier_paths: ["carriers/file-helper.json"],
            },
            {
              kind: "path_glob",
              target: "generated/**",
              carrier_paths: ["carriers/glob-helper.json"],
            },
            {
              kind: "verified",
              target: "logical-verifier-name",
              carrier_paths: ["carriers/verified.json"],
            },
          ],
        },
      },
    ],
  };
  const manifest = {
    snapshot_sha256: "f".repeat(64),
    files: [
      file("owner/owned.json", "1".repeat(64)),
      file("expected/change.json", "2".repeat(64)),
      file("support/helper.json", "3".repeat(64)),
      file("targets/product.json", "4".repeat(64)),
      file("generated/result.json", "5".repeat(64)),
      file("carriers/file-helper.json", "6".repeat(64)),
      file("carriers/glob-helper.json", "7".repeat(64)),
      file("carriers/verified.json", "8".repeat(64)),
      file("unrelated/ignored.json", "9".repeat(64)),
    ],
  };

  const identity = deriveRelevantExternalInputIdentity(
    compiled,
    "confirm-first",
    manifest,
  );
  assert.equal(identity.mode, "whole_candidate");
  assert.deepEqual(identity.paths, [
    "carriers/file-helper.json",
    "carriers/glob-helper.json",
    "carriers/verified.json",
    "expected/change.json",
    "generated/result.json",
    "owner/owned.json",
    "support/helper.json",
    "targets/product.json",
    "unrelated/ignored.json",
  ]);
});

test("non-blocking advisory identity can retain bounded-path diagnostics", () => {
  const compiled = {
    global: {
      acceptance: {
        external_confirmations: [
          { key: "confirm-first", blocks_target: false },
        ],
      },
    },
    acceptance_reachability: {
      obligations: [
        {
          status: "external_fulfillable",
          confirmation_ref: "confirm-first",
          outcome_key: "first",
        },
      ],
      effective_external_routes: [
        {
          status: "external_fulfillable",
          confirmation_ref: "confirm-first",
          outcome_key: "first",
          completion_role: "advisory",
        },
      ],
    },
    outcomes: [
      {
        key: "first",
        product: { owner: { path_globs: ["owner/**"] } },
        technical: {
          expected_change_paths: [],
          allowed_support_paths: [],
          bindings: [
            {
              kind: "file",
              target: "targets/product.json",
              carrier_paths: ["targets/product.json"],
            },
          ],
        },
      },
    ],
  };
  const manifest = {
    snapshot_sha256: "f".repeat(64),
    files: [
      { path: "owner/owned.json", mode: 0o100644, size: 1, sha256: "a" },
      { path: "targets/product.json", mode: 0o100644, size: 1, sha256: "b" },
      { path: "unrelated/ignored.json", mode: 0o100644, size: 1, sha256: "c" },
    ],
  };
  const identity = deriveRelevantExternalInputIdentity(
    compiled,
    "confirm-first",
    manifest,
  );
  assert.equal(identity.mode, "bounded_paths");
  assert.deepEqual(identity.paths, [
    "owner/owned.json",
    "targets/product.json",
  ]);
});
