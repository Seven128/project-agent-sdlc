import assert from "node:assert/strict";
import { mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import * as admitted from "../../packages/ty-context/dist/lib/long-task-artifacts.js";
import * as exact from "../../packages/ty-context/dist/lib/long-task-evidence-capability-runtime.js";

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
    result_sha256: exact.exactComparisonResultIdentity({ ...base, passed: true }),
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
    await writeFile(path.join(root, "large.json"), `{"value":"${"x".repeat(1_048_576)}"}`);
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
