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

test("blocking external authority owns the exact optional proof surface", () => {
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
    proof_surface: "static_analysis",
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
  assert.equal(result.status, "external_fulfillable");
  assert.equal(result.proof_surface, "runtime_behavior");
  assert.equal(
    result.source_obligation_ref,
    "claim:first.result:first-root-success:runtime_behavior",
  );
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
});

test("external confirmation relevant-input identity includes declared Binding targets", () => {
  const file = (path, sha256) => ({
    path,
    mode: "100644",
    size: 1,
    sha256,
  });
  const compiled = {
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
  assert.equal(identity.mode, "bounded_paths");
  assert.deepEqual(identity.paths, [
    "carriers/file-helper.json",
    "carriers/glob-helper.json",
    "carriers/verified.json",
    "expected/change.json",
    "generated/result.json",
    "owner/owned.json",
    "support/helper.json",
    "targets/product.json",
  ]);
});
