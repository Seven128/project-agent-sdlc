import assert from "node:assert/strict";
import test from "node:test";
import { compileAcceptanceReachability } from "../../packages/ty-context/dist/lib/long-task-acceptance-reachability.js";
import { compileProductClaimCoverage } from "../../packages/ty-context/dist/lib/long-task-claims.js";
import { deriveRelevantExternalInputIdentity } from "../../packages/ty-context/dist/lib/long-task-external-confirmation-plan.js";
import { validateLongTaskProofAdequacy } from "../../packages/ty-context/dist/lib/long-task-proof-adequacy.js";
import { validateSemanticFactProofFloors } from "../../packages/ty-context/dist/lib/long-task-semantic-proof-adequacy.js";
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
      mutate(contract, manifest) {
        contract.outcomes[0].product.requirements[0].statement =
          "The selected integration route is required.";
        manifest.proof_obligations[0].method = "boundary_invocation";
      },
      expected:
        /proof_adequacy_capability_missing[^\n]*(actual_provenance|boundary_invocation)/u,
    },
    {
      name: "payment Sandbox cannot prove production Provider use",
      mutate(contract, manifest) {
        contract.outcomes[0].product.requirements[0].statement =
          "A Sandbox payment surface must not substitute for the production Provider boundary invocation.";
        manifest.proof_obligations[0].method = "boundary_invocation";
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
      mutate(contract, manifest) {
        contract.outcomes[0].product.requirements[0].statement =
          "The uploaded bytes must persist and survive durable readback.";
        manifest.proof_obligations[0].method = "durable_roundtrip";
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
      mutate(contract, manifest) {
        contract.outcomes[0].product.requirements[0].statement =
          "Different identity inputs must prove identity isolation in data state.";
        const property = manifest.property_dispositions.find(
          (row) => row.key === manifest.facts[0].property_ref,
        );
        property.family_ref = "family.actor-role-tenant-entitlement";
        property.property = "identity";
        manifest.facts[0].family_ref = property.family_ref;
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
      mutate(contract, manifest) {
        contract.outcomes[0].acceptance.checks[0].proof_surface = "ui_browser";
        contract.outcomes[0].product.requirements[0].statement =
          "The selected visual layout and geometry must conform to the design.";
        const property = manifest.property_dispositions.find(
          (row) => row.key === manifest.facts[0].property_ref,
        );
        property.family_ref = "family.architecture-ownership";
        property.property = "selected_design";
        manifest.facts[0].family_ref = property.family_ref;
      },
      expected:
        /proof_adequacy_capability_missing[^\n]*(design_conformance|visual_render)/u,
    },
  ];
  for (const scenario of cases) {
    const contract = deliveryContract();
    const manifest = fixtureSemanticManifest();
    scenario.mutate(contract, manifest);
    assert.throws(
      () => validateLongTaskProofAdequacy(contract, manifest, new Map()),
      scenario.expected,
      scenario.name,
    );
  }
});

test("proof-strength keywords are advisory and cannot silently raise or lower Authority", () => {
  const contract = deliveryContract();
  contract.outcomes[0].product.requirements[0].statement =
    "Provider persistence identity visual complete population wording only.";
  assert.doesNotThrow(() =>
    validateLongTaskProofAdequacy(
      contract,
      fixtureSemanticManifest(),
      new Map(),
    ),
  );
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

test("typed proof methods impose closed floors without prose-keyword authority", () => {
  for (const scenario of [
    {
      method: "transition_trace",
      provided: ["semantic_fact", "interaction_trace"],
      expected:
        /semantic_fact_proof_adequacy_capability_missing[^\n]*state_delta/u,
    },
    {
      method: "durable_roundtrip",
      provided: ["semantic_fact", "durable_readback"],
      expected:
        /semantic_fact_proof_adequacy_capability_missing[^\n]*data_state/u,
    },
    {
      method: "boundary_invocation",
      provided: ["semantic_fact", "boundary_invocation"],
      expected:
        /semantic_fact_proof_adequacy_capability_missing[^\n]*actual_provenance/u,
    },
    {
      method: "performance",
      provided: ["semantic_fact"],
      expected:
        /semantic_fact_proof_adequacy_capability_missing[^\n]*target_runtime/u,
    },
  ]) {
    const manifest = fixtureSemanticManifest();
    const proof = manifest.proof_obligations[0];
    const property = manifest.property_dispositions.find(
      (row) => row.key === manifest.facts[0].property_ref,
    );
    proof.method = scenario.method;
    proof.evidence_capabilities = scenario.provided;
    property.required_methods = [scenario.method];
    property.required_evidence_capabilities = scenario.provided;
    assert.throws(
      () => validateSemanticFactProofFloors(manifest),
      scenario.expected,
      scenario.method,
    );
  }
});

test("unsupported custom proof semantics cannot acquire machine completion authority", () => {
  const manifest = fixtureSemanticManifest();
  const fact = manifest.facts[0];
  const proof = manifest.proof_obligations[0];
  const property = manifest.property_dispositions.find(
    (row) => row.key === fact.property_ref,
  );
  property.standard = false;
  property.property = "custom.unclassified-provider-proof";
  property.required_methods = ["custom.unclassified-proof"];
  proof.method = "custom.unclassified-proof";
  proof.authority = "machine";
  assert.throws(
    () => validateSemanticFactProofFloors(manifest),
    /semantic_fact_custom_machine_authority_forbidden/u,
  );
});

test("custom properties with a closed standard proof profile retain machine authority", () => {
  const manifest = fixtureSemanticManifest();
  const fact = manifest.facts[0];
  const proof = manifest.proof_obligations[0];
  const property = manifest.property_dispositions.find(
    (row) => row.key === fact.property_ref,
  );
  property.standard = false;
  property.property = "custom.exact-delivery-state";
  property.required_methods = ["exact_value"];
  property.required_evidence_capabilities = ["semantic_fact"];
  proof.method = "exact_value";
  proof.authority = "machine";
  proof.evidence_capabilities = ["semantic_fact"];

  assert.doesNotThrow(() => validateSemanticFactProofFloors(manifest));
});
