import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";
import * as observer from "../../packages/ty-context/dist/lib/long-task-artifacts.js";
import * as exact from "../../packages/ty-context/dist/lib/long-task-evidence-capability-runtime.js";
import * as sensitivity from "../../packages/ty-context/dist/lib/long-task-evidence-sensitivity-policy.js";

const replayPath = fileURLToPath(
  new URL("./fixtures/long-task-real-capability-state.json", import.meta.url),
);

test("Starward sanitized replay contains the four-page product shape and independently scored candidate paths", async (t) => {
  const replay = JSON.parse(await readFile(replayPath, "utf8"));
  assert.equal(replay.schema_version, "starward-sanitized-real-replay-v1");
  assert.equal(replay.provenance.shape, "sanitized-real-project");
  assert.equal(replay.provenance.contains_original_product_data, false);
  assert.equal(replay.provenance.contains_user_or_device_data, false);
  const native = replay.product_targets.find(
    (target) => target.key === "starward-native",
  );
  assert.deepEqual(native.pages, [
    "map",
    "point-details",
    "point-night-sky",
    "mine",
  ]);
  assert.deepEqual(
    new Set(replay.selected_design.facts.map((fact) => fact.page)),
    new Set(native.pages),
  );
  assert.ok(replay.candidates.correct_process_product);
  assert.ok(replay.candidates.wrong_process_product);
  assert.ok(replay.candidates.self_attested_verifier);
  assert.ok(replay.candidates.historical_native_session);
  assert.ok(replay.candidates.h5_native_proxy);

  const digestValue = (value) =>
    createHash("sha256").update(JSON.stringify(value)).digest("hex");
  const packageOracle = {
    trust: "named_external_tcb",
    identity: observer.JSON_POINTER_EXACT_ORACLE_IDENTITY,
    version: observer.JSON_POINTER_EXACT_ORACLE_VERSION,
    sha256: null,
  };
  const correctBytes = Buffer.from(
    JSON.stringify({
      observations: replay.candidates.correct_process_product.observations,
    }),
  );
  const wrongBytes = Buffer.from(
    JSON.stringify({
      observations: replay.candidates.wrong_process_product.observations,
    }),
  );
  const machineFacts = replay.selected_design.facts.filter((fact) =>
    observer.JSON_POINTER_EXACT_METHODS.includes(fact.method),
  );
  for (const fact of machineFacts) {
    const locator = observer.jsonPointerExactLocatorForIdentity(fact.key);
    const decision = observer.observationAdmissionDecision({
      method: fact.method,
      comparator: "exact_value",
      mode: "exact",
      tolerance: null,
      mask: null,
      sensitivity: "plain",
      locator,
      oracle: packageOracle,
      target_family: "process",
      current_static_artifact: true,
      snapshot_matches: true,
    });
    assert.equal(decision.authority, "machine", fact.key);
    const correct = observer.extractJsonPointerExactObservationFromBytes({
      artifact_path:
        replay.candidates.correct_process_product.artifact_path,
      bytes: correctBytes,
      locator,
      sensitivity: "plain",
    });
    assert.equal(correct.value_sha256, digestValue(fact.value), fact.key);
  }
  const changedFact = replay.selected_design.facts.find(
    (fact) => fact.key === "starward.point-details.title",
  );
  const changedLocator = observer.jsonPointerExactLocatorForIdentity(
    changedFact.key,
  );
  const wrong = observer.extractJsonPointerExactObservationFromBytes({
    artifact_path: replay.candidates.wrong_process_product.artifact_path,
    bytes: wrongBytes,
    locator: changedLocator,
    sensitivity: "plain",
  });
  assert.equal(
    exact.evaluateExactDigestComparison({
      identity: { kind: "starward_replay", fact_ref: changedFact.key },
      actual_value_sha256: wrong.value_sha256,
      expected_value_sha256: digestValue(changedFact.value),
      comparator: "exact_value",
      mode: "exact",
      parameters_sha256: "b".repeat(64),
      tolerance_sha256: null,
      mask_sha256: null,
      submitted_passed: true,
      submitted_verdict:
        replay.candidates.wrong_process_product.submitted_verdict,
    }).passed,
    false,
  );
  const selfAttested = observer.observationAdmissionDecision({
    method: "content",
    comparator: "exact_value",
    mode: "exact",
    tolerance: null,
    mask: null,
    sensitivity: "plain",
    locator: changedLocator,
    oracle: {
      ...packageOracle,
      identity: replay.candidates.self_attested_verifier.oracle_identity,
    },
    target_family: "process",
    current_static_artifact: true,
  });
  assert.equal(selfAttested.authority, "external_confirmation");
  const historical = observer.observationAdmissionDecision({
    method: "content",
    comparator: "exact_value",
    mode: "exact",
    tolerance: null,
    mask: null,
    sensitivity: "plain",
    locator: changedLocator,
    oracle: packageOracle,
    target_family: "native",
    current_static_artifact: false,
    historical_session: true,
    snapshot_matches: false,
  });
  assert.equal(historical.authority, "external_confirmation");
  const proxy = observer.observationAdmissionDecision({
    method: "content",
    comparator: "exact_value",
    mode: "exact",
    tolerance: null,
    mask: null,
    sensitivity: "plain",
    locator: changedLocator,
    oracle: packageOracle,
    target_family: "native",
    observed_target_family: "browser",
    current_static_artifact: false,
  });
  assert.equal(proxy.reason, "observation_target_proxy_mismatch");
  for (const fact of replay.selected_design.facts.filter(
    (candidate) => !observer.JSON_POINTER_EXACT_METHODS.includes(candidate.method),
  )) {
    const unsupported = observer.observationAdmissionDecision({
      method: fact.method,
      required_method: fact.method,
      comparator: "exact_value",
      mode: "exact",
      tolerance: null,
      mask: null,
      sensitivity: "plain",
      locator: observer.jsonPointerExactLocatorForIdentity(fact.key),
      oracle: packageOracle,
      target_family: "native",
      current_static_artifact: false,
    });
    assert.equal(unsupported.authority, "external_confirmation", fact.key);
  }
});

test("Starward hidden ground truth rejects A1-A12 and accepts the valid control set", async (t) => {
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
    ["target-consumed generated configuration remains a production carrier", observer.classifyObservationCarrier({ artifact_path: "generated/starward-runtime-config.json", source_paths: [], expected_authority_paths: [], product_carrier_paths: ["generated/starward-runtime-config.json"], current_observer_artifact_paths: ["artifacts/**"] }) === "product_carrier"],
    ["one artifact can retain independent Fact locators", observer.admittedObservationKey("generated/starward-runtime-config.json", observer.jsonPointerExactLocatorForIdentity("starward.point-details.title")) !== observer.admittedObservationKey("generated/starward-runtime-config.json", observer.jsonPointerExactLocatorForIdentity("starward.mine.summary"))],
    ["legal related-fact fan-out", sensitivity.validateCounterfactualObservationImpact({ baseline_by_fact: { anatomy: digest("a"), details: digest("a") }, mutated_by_fact: { anatomy: digest("f"), details: digest("f") }, expected_affected_fact_refs: ["anatomy", "details"], preserved_fact_refs: [], target_live: true, carrier_role: "product" }) === null],
    ["unsupported native fact remains external", observer.observationAdmissionDecision({ ...admittedStatic, target_family: "native", current_static_artifact: false }).authority === "external_confirmation"],
    ["legal tolerance remains outside the bounded exact adapter instead of false machine acceptance", observer.observationAdmissionDecision({ ...admittedStatic, tolerance: { value: 1 } }).authority === "external_confirmation"],
    ["dynamic mask remains outside the bounded exact adapter instead of false machine acceptance", observer.observationAdmissionDecision({ ...admittedStatic, mask: { locator: "/mask" } }).authority === "external_confirmation"],
  ];
  for (const [name, passed] of validControls)
    await t.test(`valid control: ${name}`, () => assert.equal(passed, true));
});
