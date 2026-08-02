import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { createSymbolicDenotationCompilationSession } from "../../packages/ty-context/dist/lib/symbolic-denotation-engine.js";

const ACTIVE_DOMAIN = {
  key: "condition.enabled",
  kind: "enum",
  values: ["off", "on"],
};
const ACTIVE_PREDICATE = {
  op: "eq",
  axis_ref: ACTIVE_DOMAIN.key,
  value: "on",
};
const RULE_REFS = ["rule.background", "rule.width"];
const SEMANTIC_OBLIGATIONS = 2;
const PERFORMANCE_CONTRACT = Object.freeze({
  workload:
    "compile two equal reduced Rules over one active enum axis plus 64 irrelevant billion-point bounded integer axes",
  metric: "median wall milliseconds per two-Rule production compilation",
  baseline: "the same two Rules over the active axis only",
  budget: "expanded median <= max(250 ms, baseline median * 100 + 25 ms)",
  environment: `${process.version}/${process.platform}/${process.arch}`,
  comparator: "less_than_or_equal",
  tolerance:
    "100x relative headroom plus 25 ms startup noise, capped below by a 250 ms absolute CI budget",
  warmup_iterations: 3,
  measured_iterations: 9,
});

test("set-valued non-interference accounting stays ground-cardinality independent", () => {
  const fixtures = [0, 8, 24, 64].map(buildWorkload);
  const baseline = fixtures[0];

  for (const fixture of fixtures) {
    assert.equal(fixture.semantic_obligations, SEMANTIC_OBLIGATIONS);
    assert.equal(fixture.certificate_obligations, 1);
    assert.equal(fixture.certificate.fact_rule_refs.length, RULE_REFS.length);
    assert.equal(
      fixture.certificate.omitted_axis_refs.length,
      fixture.irrelevant_axis_count,
    );
    assert.equal(
      fixture.certificate.dependency_edge_refs.length,
      0,
      "set-valued certificates must not materialize Rule x omitted-axis edges",
    );
    assert.deepEqual(fixture.compilation_statistics, {
      axis_partition_builds: 1,
      compile_requests: RULE_REFS.length,
      compile_cache_hits: RULE_REFS.length - 1,
      unique_compiled_predicates: 1,
    });
    assert.equal(fixture.canonical_sha256, baseline.canonical_sha256);
    assert.equal(fixture.canonical_dag_nodes, baseline.canonical_dag_nodes);
    assert.equal(
      fixture.canonical_partition_edges,
      baseline.canonical_partition_edges,
    );
    assert.equal(fixture.canonical_bytes, baseline.canonical_bytes);
  }

  const largest = fixtures.at(-1);
  assert.ok(BigInt(largest.theoretical_ground_cardinality) > 10n ** 500n);
  assert.ok(
    largest.certificate_bytes < 100_000,
    `certificate bytes unexpectedly large: ${largest.certificate_bytes}`,
  );
  assert.ok(
    largest.certificate_bytes <=
      baseline.certificate_bytes + largest.irrelevant_axis_count * 350,
    "certificate set representation exceeded its declared linear axis budget",
  );
});

test("a stale exact certificate set is invalidated when dependency coverage changes", () => {
  const before = buildWorkload(8);
  const after = buildWorkload(8, {
    relevantAxisRef: "irrelevant.axis-007",
  });

  assert.notDeepEqual(
    after.certificate.omitted_axis_refs,
    before.certificate.omitted_axis_refs,
  );
  assert.notDeepEqual(
    after.certificate.source_noninterference_proof,
    before.certificate.source_noninterference_proof,
  );
  assert.notEqual(after.certificate.identity, before.certificate.identity);
  assert.equal(
    certificateMatchesWorkload(before.certificate, after),
    false,
    "an old certificate must not survive a newly relevant dependency",
  );
});

test("production compilation satisfies the current-candidate measurement contract", () => {
  const baseline = measureMedian(0, PERFORMANCE_CONTRACT);
  const expanded = measureMedian(64, PERFORMANCE_CONTRACT);
  const budget = Math.max(250, baseline * 100 + 25);

  assert.ok(
    expanded <= budget,
    JSON.stringify({
      contract: PERFORMANCE_CONTRACT,
      baseline_median_ms: baseline,
      expanded_median_ms: expanded,
      allowed_ms: budget,
    }),
  );
});

function buildWorkload(irrelevantAxisCount, { relevantAxisRef = null } = {}) {
  const domains = [
    ACTIVE_DOMAIN,
    ...Array.from({ length: irrelevantAxisCount }, (_, index) => ({
      key: `irrelevant.axis-${String(index).padStart(3, "0")}`,
      kind: "bounded_number",
      minimum: 0,
      maximum: 999_999_999,
      integer: true,
    })),
  ];
  const predicate = relevantAxisRef
    ? {
        op: "all",
        predicates: [
          ACTIVE_PREDICATE,
          {
            op: "range",
            axis_ref: relevantAxisRef,
            minimum: 0,
            maximum: 499_999_999,
            minimum_inclusive: true,
            maximum_inclusive: true,
          },
        ],
      }
    : ACTIVE_PREDICATE;
  const compilation = createSymbolicDenotationCompilationSession(
    domains,
    RULE_REFS.map(() => predicate),
  );
  const compiledRules = RULE_REFS.map(() => compilation.compile(predicate));
  const omittedAxisRefs = compiledRules[0].omitted_axis_refs;
  const dependencyAxisRefs = compiledRules[0].referenced_axis_refs;
  const buildNonInterferenceProof = (side) => ({
    side,
    method: "closed_world_static_dependency_closure",
    input_resource_refs: domains.map((domain) => domain.key),
    oracle_ref: "oracle.frozen-dependency-engine",
    environment_ref: "environment.current-candidate",
    static_dependency_nodes: [
      {
        key: `dependency.${side}.root`,
        axis_refs: dependencyAxisRefs,
        dependency_refs: [],
        input_resource_refs: domains.map((domain) => domain.key),
      },
    ],
    static_rule_roots: [
      {
        fact_rule_refs: null,
        node_ref: `dependency.${side}.root`,
      },
    ],
    equivalence_cases: [],
    dynamic_dependency_kinds: [],
    external_device_refs: [],
    complete_domain_cardinality: null,
  });
  const certificateBody = {
    fact_rule_refs: [...RULE_REFS],
    omitted_axis_refs: [...omittedAxisRefs],
    dependency_edge_refs: [],
    source_noninterference_proof: buildNonInterferenceProof("source"),
    production_noninterference_proof: buildNonInterferenceProof("production"),
    canonical_rule_dag_sha256: compiledRules
      .map((compiled) => compiled.canonical_sha256)
      .join(":"),
  };
  const certificate = {
    identity: createHash("sha256")
      .update(stableJson(certificateBody))
      .digest("hex"),
    ...certificateBody,
  };
  const first = compiledRules[0];
  return {
    irrelevant_axis_count: irrelevantAxisCount,
    semantic_obligations: SEMANTIC_OBLIGATIONS,
    certificate_obligations: 1,
    certificate,
    compilation_statistics: compilation.statistics(),
    certificate_bytes: Buffer.byteLength(stableJson(certificate), "utf8"),
    canonical_sha256: first.canonical_sha256,
    canonical_dag_nodes: first.metrics.canonical_dag_nodes,
    canonical_partition_edges: first.metrics.partition_edges,
    canonical_bytes: first.metrics.canonical_bytes,
    theoretical_ground_cardinality: first.theoretical_ground_cardinality,
  };
}

function certificateMatchesWorkload(certificate, workload) {
  return (
    stableJson(certificate.fact_rule_refs) === stableJson(RULE_REFS) &&
    stableJson(certificate.omitted_axis_refs) ===
      stableJson(workload.certificate.omitted_axis_refs) &&
    stableJson(certificate.dependency_edge_refs) ===
      stableJson(workload.certificate.dependency_edge_refs) &&
    stableJson(certificate.source_noninterference_proof) ===
      stableJson(workload.certificate.source_noninterference_proof) &&
    stableJson(certificate.production_noninterference_proof) ===
      stableJson(workload.certificate.production_noninterference_proof) &&
    certificate.canonical_rule_dag_sha256 ===
      workload.certificate.canonical_rule_dag_sha256 &&
    certificate.identity === workload.certificate.identity
  );
}

function measureMedian(irrelevantAxisCount, contract) {
  for (let index = 0; index < contract.warmup_iterations; index += 1)
    buildWorkload(irrelevantAxisCount);
  const samples = [];
  for (let index = 0; index < contract.measured_iterations; index += 1) {
    const start = performance.now();
    buildWorkload(irrelevantAxisCount);
    samples.push(performance.now() - start);
  }
  samples.sort((left, right) => left - right);
  return samples[Math.floor(samples.length / 2)];
}

function stableJson(value) {
  if (Array.isArray(value))
    return `[${value.map((item) => stableJson(item)).join(",")}]`;
  if (value && typeof value === "object")
    return `{${Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => `${JSON.stringify(key)}:${stableJson(entry)}`)
      .join(",")}}`;
  return JSON.stringify(value);
}
