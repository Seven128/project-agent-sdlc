import assert from "node:assert/strict";
import test from "node:test";
import { AUTHORITY_FIELD_POLICY_REGISTRIES } from "../../packages/ty-context/dist/lib/long-task-authority-policy.js";
import {
  deliveryContract,
  designFactExpectationFixture,
} from "./long-task-delivery-fixtures.mjs";

test("every Delivery Contract authority structure has a complete field policy registry", () => {
  const contract = deliveryContract();
  const outcome = contract.outcomes[0];
  const check = outcome.acceptance.checks[0];
  const runtimeShapes = {
    task: contract.task,
    source_claim: contract.source_claims[0],
    risk: contract.risk,
    global: contract.global,
    global_product: contract.global.product,
    global_technical: contract.global.technical,
    global_acceptance: contract.global.acceptance,
    outcome,
    claim_applicability: outcome.applicability[0],
    applicable_statement: {
      key: "declared-fact",
      statement: "The declared fact applies.",
      applicability_refs: ["first-root-success"],
    },
    outcome_product: outcome.product,
    owner: outcome.product.owner,
    requirement: outcome.product.requirements[0],
    control: {
      key: "control",
      surface: "settings",
      region: "footer",
      location: "main",
      control_type: "button",
      label_content: "Save",
      user_task: "Save settings",
      visibility: "visible when editing",
      availability: "enabled when valid",
      trigger: "click",
      input: "value",
      validation: "reject invalid values",
      default_value: "current value",
      interaction: "commit on activation",
      navigation_result: "remain on settings",
      loading_state: "loading",
      empty_state: "empty",
      success_state: "success",
      failure_state: "failure",
      recovery: "retry without losing input",
      permission: "requires edit permission",
      feedback: "feedback",
      accessibility: "named button with keyboard activation",
      field_coverage: [
        {
          fields: ["surface"],
          state: "specified",
          applicability_refs: ["first-root-success"],
        },
      ],
    },
    control_field_coverage: {
      fields: ["empty_state"],
      state: "not_applicable",
      statement: "An empty state does not apply.",
      applicability_refs: ["first-root-success"],
    },
    control_relation_closure: {
      state: "specified",
      statement: "Declared Control relations are complete.",
      applicability_refs: ["first-root-success"],
    },
    control_relation: {
      key: "save-updates-status",
      statement: "Saving updates the shared status Control.",
      applicability_refs: ["first-root-success"],
      control_refs: ["save", "status"],
      required_proof_surfaces: ["ui_browser"],
    },
    surface_binding: {
      key: "settings-native",
      surface_ref: "settings",
      target_ref: "fixture-app",
      control_refs: ["save"],
      route_binding_ref: "state-first",
      component_binding_refs: ["state-first"],
      root_journey_check_ref: check.key,
      entry_action_ref: "read-outcome",
      design_targets: [],
      acceptance_blockers: [],
    },
    design_target: {
      key: "settings-default",
      fact_model: "symbolic_rules_v2",
      interpretation: "exact_target",
      source_paths: ["design/settings.png"],
      condition_keys: ["default"],
      claim_refs: ["control.save.location"],
      conformance_check_ref: check.key,
      conformance_assertion_ref: "settings-conformance",
      verification_method_bindings: [
        {
          method: "layout_geometry",
          assertion_ref: "settings-layout",
          evidence_artifacts: [
            {
              condition_key: "default",
              path: "artifacts/settings-layout-default.json",
              observation_path:
                "artifacts/settings-layout-default-observation.json",
              fact_refs: ["settings.layout.default"],
              fact_expectations: [
                designFactExpectationFixture("settings.layout.default"),
              ],
            },
          ],
        },
      ],
      symbolic_method_bindings: [
        {
          method: "layout_geometry",
          assertion_ref: "settings-layout",
          artifact_path: "artifacts/settings-symbolic-layout.json",
          observation_path:
            "artifacts/settings-symbolic-layout-observation.json",
          rule_expectations: [],
        },
      ],
      symbolic_certificate_binding: {
        assertion_ref: "settings-symbolic-certificate",
        artifact_path: "artifacts/settings-symbolic-certificate.json",
        expectations: [],
        metrics: {
          semantic_obligations: 0,
          certificate_obligations: 0,
          certificate_covered_omitted_axes: 0,
          certificate_covered_dependency_edges: 0,
          canonical_dag_nodes: 0,
          canonical_partition_edges: 0,
          canonical_bytes: 0,
          theoretical_ground_cardinality: "0",
        },
      },
      actual_artifact_path: "artifacts/settings-actual.png",
      comparison_artifact_path: "artifacts/settings-diff.json",
    },
    design_verification_binding: {
      method: "layout_geometry",
      assertion_ref: "settings-layout",
      evidence_artifacts: [
        {
          condition_key: "default",
          path: "artifacts/settings-layout-default.json",
          observation_path:
            "artifacts/settings-layout-default-observation.json",
          fact_refs: ["settings.layout.default"],
          fact_expectations: [
            designFactExpectationFixture("settings.layout.default"),
          ],
        },
      ],
    },
    design_blocker: {
      key: "save-validation",
      status: "machine_claim",
      refs: ["control.save.validation"],
      source_item_refs: ["settings-source"],
      verification_methods: ["component_state"],
      required_capabilities: ["browser-runtime"],
      rationale: "The target-local validation Claim resolves the blocker.",
    },
    outcome_technical: outcome.technical,
    obligation: outcome.technical.obligations[0],
    binding: {
      ...outcome.technical.bindings[0],
      verification_check_key:
        outcome.technical.bindings[0].verification_check_key,
    },
    rollback: {
      rollback: "rollback",
      recovery: "recover",
      verification_check_keys: [check.key],
    },
    outcome_acceptance: outcome.acceptance,
    check,
    assertion: check.positive_assertions[0],
    runner: check.runner,
    population: {
      check_key: check.key,
      universe_binding_key: "state-first",
      claims: ["result"],
      observations: {
        universe_ids: "universe",
        eligible_ids: "eligible",
        observed_ids: "observed",
        excluded_items: "excluded",
      },
      exclusion_rules: [],
    },
    counterfactual: {
      key: "counterfactual",
      binding_key: "state-first",
      claims: ["obligation.implement-first"],
      check_key: check.key,
      mutation: { type: "remove_paths", paths: ["src/state.json"] },
      expected_assertion_failures: ["first-result"],
      preserved_assertions: ["first-liveness"],
      allowed_fanout_assertions: [],
    },
    global_counterfactual: {
      key: "global-counterfactual",
      binding_ref: "first.state-first",
      claims: ["constraint.global-state"],
      check_key: "global-check",
      mutation: { type: "remove_paths", paths: ["src/state.json"] },
      expected_assertion_failures: ["global-assertion"],
      preserved_assertions: ["global-liveness"],
      allowed_fanout_assertions: [],
    },
  };
  assert.deepEqual(
    Object.keys(AUTHORITY_FIELD_POLICY_REGISTRIES).sort(),
    Object.keys(runtimeShapes).sort(),
  );
  for (const [key, shape] of Object.entries(runtimeShapes))
    assert.deepEqual(
      Object.keys(AUTHORITY_FIELD_POLICY_REGISTRIES[key]).sort(),
      Object.keys(shape).sort(),
      `${key} has an unclassified or stale authority field`,
    );
});
