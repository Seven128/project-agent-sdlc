import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { performance } from "node:perf_hooks";
import test from "node:test";
import { preflightDesignResourceHandoff } from "../../packages/ty-context/dist/index.js";
import { denoteDesignResourceSymbolicPoint } from "../../packages/ty-context/dist/lib/design-resource-symbolic-denotation.js";
import {
  SYMBOLIC_HANDOFF_PATH,
  SYMBOLIC_TARGET_KEY,
  writeDesignResourceSymbolicHandoffFixture,
} from "./design-resource-symbolic-handoff-fixture.mjs";
import {
  buildSymbolicScaleFixtureModel,
  SYMBOLIC_SCALE_AXIS_COUNT,
  SYMBOLIC_SCALE_PROPERTY_COUNT,
  SYMBOLIC_SCALE_SUBJECT_COUNT,
  SYMBOLIC_SCALE_VARIATION_COUNT,
} from "./design-resource-symbolic-scale-fixture.mjs";
import {
  enableFixtureTrustedNoninterference,
  rekeySymbolicFixtureCertificate,
} from "./design-resource-symbolic-handoff-fixture-model.mjs";

const PERFORMANCE_CONTRACT = Object.freeze({
  workload:
    "actual V2 preflight over 639 subjects, 217 properties, 53 axes, 5,245 variation values, 2 applicable properties and two exact axis partitions per subject/property",
  metrics: [
    "fixture authoring wall milliseconds",
    "preflight wall milliseconds",
    "manifest UTF-8 bytes",
    "process peak-observed RSS",
    "single-Fact/profile structural blast radius",
  ],
  budgets: {
    authoring_ms: 15_000,
    preflight_ms: 15_000,
    manifest_bytes: 25_000_000,
    rss_bytes: 1_500_000_000,
    profile_bindings: 1,
    physical_na_rows: 0,
  },
  environment: `${process.version}/${process.platform}/${process.arch}`,
  comparator: "less_than_or_equal",
  tolerance:
    "broad deterministic local/CI capacity fuse; structural row/count assertions carry the optimization claim",
});

test("real-scale compact profiles preserve every logical tuple without a physical N/A matrix", async () => {
  const root = await mkdtemp(
    path.join(os.tmpdir(), "ty-context-symbolic-scale-"),
  );
  try {
    const authoringStart = performance.now();
    const fixture = await writeDesignResourceSymbolicHandoffFixture(
      root,
      undefined,
      { modelFactory: buildSymbolicScaleFixtureModel },
    );
    const authoringMs = performance.now() - authoringStart;
    const manifestBytes = Buffer.byteLength(
      await readFile(path.join(root, fixture.manifestPath), "utf8"),
      "utf8",
    );
    const preflightStart = performance.now();
    const preflight = await preflightDesignResourceHandoff(
      root,
      SYMBOLIC_HANDOFF_PATH,
    );
    const preflightMs = performance.now() - preflightStart;
    const rssBytes = process.memoryUsage().rss;
    const logicalPairs =
      preflight.manifest.subjects.length * preflight.manifest.properties.length;
    const legacyPhysicalNaRows =
      SYMBOLIC_SCALE_SUBJECT_COUNT * (SYMBOLIC_SCALE_PROPERTY_COUNT - 2);
    const measurements = {
      contract: PERFORMANCE_CONTRACT,
      authoring_ms: authoringMs,
      preflight_ms: preflightMs,
      manifest_bytes: manifestBytes,
      rss_bytes: rssBytes,
      logical_subject_property_pairs: logicalPairs,
      avoided_legacy_physical_na_rows: legacyPhysicalNaRows,
      fact_rules: preflight.manifest.fact_rules.length,
      proof_obligations: preflight.manifest.semantic_proof_obligations.length,
    };
    assert.equal(
      preflight.manifest.subjects.length,
      SYMBOLIC_SCALE_SUBJECT_COUNT,
    );
    assert.equal(
      preflight.manifest.properties.length,
      SYMBOLIC_SCALE_PROPERTY_COUNT,
    );
    assert.equal(
      preflight.manifest.axis_domains.length,
      SYMBOLIC_SCALE_AXIS_COUNT,
    );
    assert.equal(
      preflight.manifest.axis_domains.find(
        (axis) => axis.key === "variation.case",
      ).values.length,
      SYMBOLIC_SCALE_VARIATION_COUNT,
    );
    assert.equal(logicalPairs, 138_663);
    assert.equal(legacyPhysicalNaRows, 137_385);
    assert.equal(preflight.manifest.disposition_regions.length, 0);
    assert.equal(
      preflight.manifest.structural_applicability.subject_profile_bindings
        .length,
      PERFORMANCE_CONTRACT.budgets.profile_bindings,
    );
    assert.equal(preflight.manifest.fact_rules.length, 2_556);
    assert.equal(preflight.manifest.semantic_proof_obligations.length, 2_556);
    assert.equal(preflight.manifest.dependency_edges.length, 0);
    assert.equal(preflight.metrics.certificate_covered_omitted_axes, 52);
    assert.equal(preflight.metrics.certificate_covered_dependency_edges, 0);
    assert.equal(fixture.model.compilationStatistics.axis_partition_builds, 1);
    assert.ok(fixture.model.compilationStatistics.compile_cache_hits > 2_500);
    assert.ok(
      authoringMs <= PERFORMANCE_CONTRACT.budgets.authoring_ms,
      JSON.stringify(measurements),
    );
    assert.ok(
      preflightMs <= PERFORMANCE_CONTRACT.budgets.preflight_ms,
      JSON.stringify(measurements),
    );
    assert.ok(
      manifestBytes <= PERFORMANCE_CONTRACT.budgets.manifest_bytes,
      JSON.stringify(measurements),
    );
    assert.ok(
      rssBytes <= PERFORMANCE_CONTRACT.budgets.rss_bytes,
      JSON.stringify(measurements),
    );

    const conditionAssignment = Object.fromEntries(
      Array.from({ length: SYMBOLIC_SCALE_AXIS_COUNT - 1 }, (_, index) => [
        `condition.axis-${String(index).padStart(2, "0")}`,
        index === 0 ? "on" : "off",
      ]),
    );
    const basePoint = {
      subject_or_relation_ref: "component.scale-638",
      target_ref: SYMBOLIC_TARGET_KEY,
      condition_assignment: conditionAssignment,
      variation_assignment: { "variation.case": "variation-5244" },
      population_ref: null,
      quantifier: { kind: "one", minimum: 1, maximum: 1 },
    };
    assert.equal(
      denoteDesignResourceSymbolicPoint(preflight, {
        ...basePoint,
        property_ref: "geometry.width",
      }).disposition,
      "specified",
    );
    assert.deepEqual(
      denoteDesignResourceSymbolicPoint(preflight, {
        ...basePoint,
        property_ref: "typography.font-family",
      }),
      {
        disposition: "not_applicable",
        expected_semantics: null,
        proof_obligations: [],
      },
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("static dependency closure accepts and reuses an exact shared DAG subgraph", async () => {
  const root = await mkdtemp(
    path.join(os.tmpdir(), "ty-context-symbolic-dag-"),
  );
  try {
    await writeDesignResourceSymbolicHandoffFixture(root, (model) => {
      enableFixtureTrustedNoninterference(model);
      for (const proof of [
        model.certificate.source_noninterference_proof,
        model.certificate.production_noninterference_proof,
      ]) {
        const original = proof.static_dependency_nodes[0];
        const sharedKey = `dependency.${proof.side}.shared-inputs`;
        proof.static_dependency_nodes = [
          {
            ...original,
            axis_refs: [],
            dependency_refs: [
              `dependency.${proof.side}.axis-branch`,
              `dependency.${proof.side}.second-branch`,
            ],
            input_resource_refs: [],
          },
          {
            key: `dependency.${proof.side}.axis-branch`,
            axis_refs: original.axis_refs,
            dependency_refs: [sharedKey],
            input_resource_refs: [],
          },
          {
            key: `dependency.${proof.side}.second-branch`,
            axis_refs: [],
            dependency_refs: [sharedKey],
            input_resource_refs: [],
          },
          {
            key: sharedKey,
            axis_refs: [],
            dependency_refs: [],
            input_resource_refs: original.input_resource_refs,
          },
        ];
      }
      rekeySymbolicFixtureCertificate(model);
    });
    const preflight = await preflightDesignResourceHandoff(
      root,
      SYMBOLIC_HANDOFF_PATH,
    );
    assert.equal(preflight.status, "ready");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
