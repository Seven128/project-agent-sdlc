import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { preflightDesignResourceHandoff } from "../../packages/ty-context/dist/index.js";
import { DESIGN_RESOURCE_STANDARD_PROPERTIES } from "../../packages/ty-context/dist/lib/design-resource-fact-manifest-catalog.js";
import { denoteDesignResourceSymbolicPoint } from "../../packages/ty-context/dist/lib/design-resource-symbolic-denotation.js";
import {
  SYMBOLIC_HANDOFF_PATH,
  SYMBOLIC_TARGET_KEY,
  writeDesignResourceSymbolicHandoffFixture,
} from "./design-resource-symbolic-handoff-fixture.mjs";

test("complete V1 ground denotation and symbolic V2 are pointwise equal without preserving ground row identity", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "ty-context-denotation-"));
  try {
    await writeDesignResourceSymbolicHandoffFixture(root);
    const preflight = await preflightDesignResourceHandoff(
      root,
      SYMBOLIC_HANDOFF_PATH,
    );
    let compared = 0;
    let specified = 0;
    for (const color of ["light", "dark"])
      for (const state of ["idle", "active"])
        for (const property of DESIGN_RESOURCE_STANDARD_PROPERTIES) {
          const point = {
            subject_or_relation_ref: "surface.root",
            target_ref: SYMBOLIC_TARGET_KEY,
            condition_assignment: { "condition.color-scheme": color },
            variation_assignment: { "variation.state": state },
            property_ref: property.key,
            population_ref: null,
            quantifier: { kind: "one", minimum: 1, maximum: 1 },
          };
          const v1 = independentV1GroundDenotation(property);
          const v2 = denoteDesignResourceSymbolicPoint(preflight, point);
          assert.deepEqual(v2, v1, JSON.stringify(point));
          compared += 1;
          if (v1.disposition === "specified") specified += 1;
        }
    assert.equal(compared, DESIGN_RESOURCE_STANDARD_PROPERTIES.length * 4);
    assert.equal(specified, 8);
    const reference = independentV1GroundDenotation(
      DESIGN_RESOURCE_STANDARD_PROPERTIES.find(
        (property) => property.key === "geometry.width",
      ),
    );
    for (const mutate of [
      (value) => (value.disposition = "unavailable"),
      (value) => (value.expected_semantics.expected.sha256 = "f".repeat(64)),
      (value) => (value.proof_obligations[0].proof_surface = "proxy_only"),
    ]) {
      const counterexample = structuredClone(reference);
      mutate(counterexample);
      assert.notDeepEqual(counterexample, reference);
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

function independentV1GroundDenotation(property) {
  const expectedByProperty = {
    "geometry.width": { value: "100px", pointer: "/width" },
    "color.background": { value: "#ffffff", pointer: "/background" },
  };
  const selected = expectedByProperty[property.key];
  if (!selected)
    return {
      disposition: "not_applicable",
      expected_semantics: null,
      proof_obligations: [],
    };
  const located = {
    locator: {
      resource_ref: "resource.values",
      kind: "json_pointer",
      value: selected.pointer,
    },
    sha256: digest(selected.value),
  };
  const capabilities = [
    ...new Set(
      ["geometry.width", "color.background"].flatMap(
        (key) =>
          DESIGN_RESOURCE_STANDARD_PROPERTIES.find(
            (candidate) => candidate.key === key,
          ).inspector_capability_refs,
      ),
    ),
  ].sort();
  const oracle = {
    key: "oracle.fixture",
    trust: "named_external_tcb",
    identity: "fixture-symbolic-oracle",
    version: "1.0.0",
    sha256: null,
    capability_refs: capabilities,
  };
  const environment = {
    key: "environment.fixture",
    identity: "fixture-browser-environment",
    definition: {
      locator: {
        resource_ref: "resource.values",
        kind: "json_pointer",
        value: "/environment",
      },
      sha256: digest(stableOracleJson({ browser: "fixture", scale: 1 })),
    },
  };
  return {
    disposition: "specified",
    expected_semantics: {
      value_type: property.value_kind,
      expected: located,
      provenance_ref: "resource.values",
      sensitivity: "plain",
      population_ref: null,
      quantifier: { kind: "one", minimum: 1, maximum: 1 },
      lineage: {
        design_system_ref: null,
        token_chain_refs: [],
        override_chain_refs: [],
        resolved_value: located,
        conflict_status: "none",
        conflict_resolution: "not_applicable",
      },
    },
    proof_obligations: [...property.required_methods].sort().map((method) => ({
      method,
      proof_surface: "ui_browser",
      observation_boundary: `symbolic-rule-region:${method}`,
      comparison: {
        comparator: "exact_value",
        mode: "exact",
        parameters: {
          locator: {
            resource_ref: "resource.values",
            kind: "json_pointer",
            value: "/parameters",
          },
          sha256: digest(stableOracleJson({ mode: "exact" })),
        },
        tolerance: null,
        mask: null,
      },
      oracle,
      environment,
      protected_value_policy: "plain_exact_observation",
      completion_effect: "required_for_rule_method_region",
    })),
  };
}

function digest(value) {
  return createHash("sha256").update(value).digest("hex");
}

function stableOracleJson(value) {
  if (Array.isArray(value))
    return `[${value.map((item) => stableOracleJson(item)).join(",")}]`;
  if (value && typeof value === "object")
    return `{${Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => `${JSON.stringify(key)}:${stableOracleJson(entry)}`)
      .join(",")}}`;
  return JSON.stringify(value);
}
