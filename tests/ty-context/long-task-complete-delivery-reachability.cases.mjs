import assert from "node:assert/strict";
import test from "node:test";
import { compileAcceptanceReachability } from "../../packages/ty-context/dist/lib/long-task-acceptance-reachability.js";
import { compileProductClaimCoverage } from "../../packages/ty-context/dist/lib/long-task-claims.js";
import { deriveRelevantExternalInputIdentity } from "../../packages/ty-context/dist/lib/long-task-external-confirmation-plan.js";
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
  for (const obligation of confirmation.obligations)
    obligation.judgment_basis = {
      kind: "authorization",
      source_ref: "fixture-external-authority",
    };
  contract.source_claims.push({
    key: "fixture-external-authority",
    source_ref: "source.md#fixture-external-authority",
    statement: confirmation.description,
    disposition: {
      type: "external_confirmation",
      refs: [confirmation.key],
    },
  });
}

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
          result_kind: "judgment",
        },
      ],
    },
  ];
  authorizeJudgment(
    contract,
    contract.global.acceptance.external_confirmations[0],
  );
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
  const claims = compileProductClaimCoverage(contract, { allow_uncovered: true });
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

test("externalized population Claims retain population set-equality semantics", () => {
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
  assert.equal(result.status, "external_fulfillable");
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
  const contract = deliveryContract({ externalConfirmation: true });
  const manifest = fixtureSemanticManifest({ externalConfirmation: true });
  contract.task.target_profile.completion_authority = "declared_authorities";
  const outcome = contract.outcomes[0];
  const binding = outcome.semantic_fact_bindings.proofs[0];
  const proof = manifest.proof_obligations.find(
    (row) => row.key === binding.proof_ref,
  );
  assert.ok(proof);
  outcome.semantic_fact_bindings.proofs = [
    {
      proof_ref: binding.proof_ref,
      fact_ref: binding.fact_ref,
      method: binding.method,
      proof_surface: binding.proof_surface,
      evidence_capabilities: [...binding.evidence_capabilities],
      authority: "external_confirmation",
      confirmation_ref: "fixture-external",
    },
  ];
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
        external_confirmations: [
          { key: "confirm-first", blocks_target: true },
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
