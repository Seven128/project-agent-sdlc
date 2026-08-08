import assert from "node:assert/strict";
import test from "node:test";
import * as observer from "../../packages/ty-context/dist/lib/long-task-artifacts.js";
import * as exact from "../../packages/ty-context/dist/lib/long-task-evidence-capability-runtime.js";
import * as sensitivity from "../../packages/ty-context/dist/lib/long-task-evidence-sensitivity-policy.js";

test("Starward sanitized replay rejects A1-A12 and accepts the valid control set", async (t) => {
  const digest = (value) => value.repeat(64);
  const exactInput = {
    identity: { kind: "design_fact", fact_ref: "starward.map.anatomy" },
    actual_value_sha256: digest("a"),
    expected_value_sha256: digest("a"),
    comparator: "exact_value",
    mode: "exact",
    parameters_sha256: digest("b"),
    tolerance_sha256: null,
    mask_sha256: null,
  };
  const admittedStatic = {
    method: "exact_value",
    comparator: "exact_value",
    mode: "exact",
    tolerance: null,
    mask: null,
    sensitivity: "plain",
    locator: { kind: "json_pointer", value: "/observations/map/anatomy" },
    oracle: { trust: "named_external_tcb", identity: "ty-context-json-pointer-exact", version: "1.0.0", sha256: null },
    target_family: "process",
    current_static_artifact: true,
  };
  const attacks = [
    ["A1 actual differs while submitted verdict passes", () => !exact.evaluateExactDigestComparison({ ...exactInput, actual_value_sha256: digest("f"), submitted_passed: true, submitted_verdict: "passed" }).passed],
    ["A2 expected is copied into actual", () => observer.classifyObservationCarrier({ artifact_path: "delivery-contract.yaml", source_paths: ["docs/source.md"], expected_authority_paths: ["delivery-contract.yaml"], product_carrier_paths: ["src/map.json"], current_observer_artifact_paths: [] }) === "expected_authority_forbidden"],
    ["A3 Anatomy is wrong while local controls are correct", () => observer.observationAdmissionDecision({ ...admittedStatic, method: "layout_geometry" }).authority !== "machine"],
    ["A4 whole-page visual mode is wrong", () => observer.observationAdmissionDecision({ ...admittedStatic, method: "visual_fidelity" }).authority !== "machine"],
    ["A5 primary action hierarchy is wrong", () => observer.observationAdmissionDecision({ ...admittedStatic, method: "information_hierarchy" }).authority !== "machine"],
    ["A6 heterogeneous claims share aggregate status", () => sensitivity.validateCounterfactualObservationImpact({ baseline_by_fact: { anatomy: digest("a"), night_sky: digest("a") }, mutated_by_fact: { anatomy: digest("f"), night_sky: digest("f") }, expected_affected_fact_refs: ["anatomy"], preserved_fact_refs: ["night_sky"], target_live: true, carrier_role: "product" }) === "counterfactual_unexpected_fact_impact"],
    ["A7 mutation targets pure evidence carrier", () => sensitivity.validateCounterfactualObservationImpact({ baseline_by_fact: { anatomy: digest("a") }, mutated_by_fact: { anatomy: digest("f") }, expected_affected_fact_refs: ["anatomy"], preserved_fact_refs: [], target_live: true, carrier_role: "evidence" }) === "counterfactual_mutates_generated_evidence"],
    ["A8 historical native session", () => observer.observationAdmissionDecision({ ...admittedStatic, target_family: "native", current_static_artifact: false, historical_session: true }).authority !== "machine"],
    ["A9 H5 proxy impersonates native target", () => observer.observationAdmissionDecision({ ...admittedStatic, target_family: "native", observed_target_family: "browser" }).reason === "observation_target_proxy_mismatch"],
    ["A10 stale screenshot belongs to another tree", () => observer.observationAdmissionDecision({ ...admittedStatic, current_static_artifact: false, snapshot_matches: false }).authority !== "machine"],
    ["A11 task-authored verifier is the sole material Oracle", () => observer.observationAdmissionDecision({ ...admittedStatic, oracle: { trust: "named_external_tcb", identity: "project-starward-verifier", version: "1.0.0", sha256: null } }).authority !== "machine"],
    ["A12 asset integrity attempts to close layout accessibility or motion", () => observer.observationAdmissionDecision({ ...admittedStatic, method: "asset_integrity", required_method: "accessibility" }).reason === "observation_capability_mismatch"],
  ];
  for (const [name, rejected] of attacks)
    await t.test(name, () => assert.equal(rejected(), true));

  const validControls = [
    ["correct static exact candidate", exact.evaluateExactDigestComparison(exactInput).passed],
    ["package observer with current process artifact", observer.observationAdmissionDecision(admittedStatic).authority === "machine"],
    ["legal related-fact fan-out", sensitivity.validateCounterfactualObservationImpact({ baseline_by_fact: { anatomy: digest("a"), details: digest("a") }, mutated_by_fact: { anatomy: digest("f"), details: digest("f") }, expected_affected_fact_refs: ["anatomy", "details"], preserved_fact_refs: [], target_live: true, carrier_role: "product" }) === null],
    ["unsupported native fact remains external", observer.observationAdmissionDecision({ ...admittedStatic, target_family: "native", current_static_artifact: false }).authority === "external_confirmation"],
  ];
  for (const [name, passed] of validControls)
    await t.test(`valid control: ${name}`, () => assert.equal(passed, true));
});
