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

test("proof adequacy blocks weak evidence for stronger delivery semantics", () => {
  const cases = [
    {
      name: "product result reachability",
      mutate(contract) {
        assertion(contract, "first-result").evidence_capabilities = [
          "presence",
        ];
      },
      expected: /proof_adequacy_capability_missing[^\n]*target_runtime/u,
    },
    {
      name: "Control changes product result",
      mutate(contract) {
        contract.outcomes[0].product.controls.push(
          completeControl({
            key: "finder-query",
            navigation_result:
              "Changing the query changes the Finder product result.",
          }),
        );
        const row = assertion(contract, "first-requirement");
        row.claims = ["control.finder-query.navigation_result"];
        row.evidence_capabilities = ["presence"];
      },
      expected:
        /proof_adequacy_capability_missing[^\n]*(input_variation|interaction_trace|state_delta)/u,
    },
    {
      name: "Provider boundary Actual provenance",
      mutate(contract) {
        contract.outcomes[0].product.requirements[0].statement =
          "The Provider QWeather boundary invocation must use production Actual provenance.";
      },
      expected:
        /proof_adequacy_capability_missing[^\n]*(actual_provenance|boundary_invocation)/u,
    },
    {
      name: "payment Sandbox cannot prove production Provider use",
      mutate(contract) {
        contract.outcomes[0].product.requirements[0].statement =
          "A Sandbox payment surface must not substitute for the production Provider boundary invocation.";
        assertion(contract, "first-requirement").evidence_capabilities = [
          "presence",
        ];
      },
      expected:
        /proof_adequacy_capability_missing[^\n]*(actual_provenance|boundary_invocation)/u,
    },
    {
      name: "admin permission requires enforced identity-dependent runtime state",
      mutate(contract) {
        contract.outcomes[0].product.controls.push(
          completeControl({
            key: "admin-action",
            permission:
              "Different authorized and forbidden identities receive the enforced permission result.",
          }),
        );
        const row = assertion(contract, "first-requirement");
        row.claims = ["control.admin-action.permission"];
        row.evidence_capabilities = ["presence"];
      },
      expected:
        /proof_adequacy_capability_missing[^\n]*(data_state|distinct_identity|input_variation|target_runtime)/u,
    },
    {
      name: "durable persistence",
      mutate(contract) {
        contract.outcomes[0].product.requirements[0].statement =
          "The uploaded bytes must persist and survive durable readback.";
      },
      expected: /proof_adequacy_capability_missing[^\n]*durable_readback/u,
    },
    {
      name: "CLI flag presence cannot prove output change",
      mutate(contract) {
        contract.outcomes[0].product.controls.push(
          completeControl({
            key: "cli-format",
            navigation_result:
              "Changing the CLI flag changes the emitted product output.",
          }),
        );
        const row = assertion(contract, "first-requirement");
        row.claims = ["control.cli-format.navigation_result"];
        row.evidence_capabilities = ["presence"];
      },
      expected:
        /proof_adequacy_capability_missing[^\n]*(input_variation|interaction_trace|state_delta)/u,
    },
    {
      name: "identity and data-state isolation",
      mutate(contract) {
        contract.outcomes[0].product.requirements[0].statement =
          "Different identity inputs must prove identity isolation in data state.";
      },
      expected:
        /proof_adequacy_capability_missing[^\n]*(data_state|distinct_identity)/u,
    },
    {
      name: "failure recovery",
      mutate(contract) {
        contract.outcomes[0].acceptance.checks[0].journey_roles.push(
          "recovery",
        );
      },
      expected:
        /proof_adequacy_capability_missing[^\n]*(failure_injection|recovery)/u,
    },
    {
      name: "selected visual geometry",
      mutate(contract) {
        contract.outcomes[0].acceptance.checks[0].proof_surface = "ui_browser";
        contract.outcomes[0].product.requirements[0].statement =
          "The selected visual layout and geometry must conform to the design.";
      },
      expected:
        /proof_adequacy_capability_missing[^\n]*(design_conformance|visual_render)/u,
    },
  ];
  for (const scenario of cases) {
    const contract = deliveryContract();
    scenario.mutate(contract);
    assert.throws(
      () =>
        validateLongTaskProofAdequacy(
          contract,
          fixtureSemanticManifest(),
          new Map(),
        ),
      scenario.expected,
      scenario.name,
    );
  }
});

test("population equality and upstream Expected authority fail closed", () => {
  {
    const contract = deliveryContract();
    contract.outcomes[0].acceptance.population = {
      check_key: "first-check",
      universe_binding_key: "state-first",
      claims: ["requirement.observe-first"],
      observations: {
        universe_ids: "population.universe_ids",
        eligible_ids: "population.eligible_ids",
        observed_ids: "population.observed_ids",
        excluded_items: "population.excluded_items",
      },
      exclusion_rules: [],
    };
    const row = assertion(contract, "first-requirement");
    row.evidence_capabilities.push("population_coverage");
    assert.throws(
      () =>
        validateLongTaskProofAdequacy(
          contract,
          fixtureSemanticManifest(),
          new Map(),
        ),
      /population_coverage_set_equality_required/u,
    );
  }

  {
    const contract = deliveryContract();
    assertion(contract, "first-requirement").expected =
      "self-authored demo success";
    assert.throws(
      () =>
        validateLongTaskProofAdequacy(
          contract,
          fixtureSemanticManifest(),
          new Map(),
        ),
      /expected_value_not_projected_from_authority/u,
    );
  }

  {
    const contract = deliveryContract();
    assertion(contract, "first-requirement").expected_authority_ref =
      "semantic-fact:fact.first.observable";
    assert.throws(
      () =>
        validateLongTaskProofAdequacy(
          contract,
          fixtureSemanticManifest(),
          new Map(),
        ),
      /expected_authority_fact_not_bound_to_claim/u,
    );
  }

  {
    const contract = deliveryContract();
    assertion(contract, "first-semantic-fact").expected_authority_ref =
      "semantic-fact:fact.first.observable";
    assert.doesNotThrow(() =>
      validateLongTaskProofAdequacy(
        contract,
        fixtureSemanticManifest(),
        new Map(),
      ),
    );
  }
});

test("claimless Checks remain diagnostic and provide zero acceptance reachability", () => {
  const contract = deliveryContract();
  const check = contract.outcomes[0].acceptance.checks[0];
  for (const row of [
    ...check.positive_assertions,
    ...check.negative_assertions,
  ]) {
    row.claims = [];
    delete row.applicability_ref;
  }
  const adequacy = validateLongTaskProofAdequacy(
    contract,
    fixtureSemanticManifest(),
    new Map(),
  );
  assert.equal(adequacy["first:first-check"].completion_role, "diagnostic");

  const claims = compileProductClaimCoverage(contract, {
    allow_uncovered: true,
  });
  const reachability = compileAcceptanceReachability({
    contract,
    claims,
    manifest: fixtureSemanticManifest(),
    compiled_checks: [
      {
        key: "first-check",
        outcome_key: "first",
        completion_role: "diagnostic",
        observation_authorities: [],
        required_evidence_capabilities: {},
      },
    ],
  });
  assert.equal(reachability.machine_admitted, 0);
  assert.ok(reachability.unreachable > 0);
  assert.ok(
    reachability.obligations.every((row) => row.status !== "machine_admitted"),
  );
});
