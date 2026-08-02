import assert from "node:assert/strict";
import test from "node:test";
import {
  compileSymbolicDenotation,
  createSymbolicDenotationCompilationSession,
  evaluateCanonicalSymbolicDenotation,
} from "../../packages/ty-context/dist/lib/symbolic-denotation-engine.js";
import {
  complexityLimits,
  expandFiniteDomains,
  independentPredicateEvaluation,
  nestedNot,
} from "./symbolic-denotation-test-oracle.mjs";

const coreDomains = [
  { key: "condition.color", kind: "enum", values: ["light", "dark"] },
  {
    key: "condition.width",
    kind: "bounded_number",
    minimum: 320,
    maximum: 1_920,
    integer: true,
  },
  {
    key: "variation.state",
    kind: "enum",
    values: ["idle", "hover", "pressed"],
  },
];

test("canonical ordered DAG is invariant to ordering and redundant predicates", () => {
  const direct = compileSymbolicDenotation(coreDomains, {
    op: "all",
    predicates: [
      { op: "eq", axis_ref: "condition.color", value: "dark" },
      {
        op: "in",
        axis_ref: "variation.state",
        values: ["hover", "pressed"],
      },
    ],
  });
  const rewritten = compileSymbolicDenotation([...coreDomains].reverse(), {
    op: "all",
    predicates: [
      {
        op: "any",
        predicates: [
          { op: "eq", axis_ref: "variation.state", value: "pressed" },
          { op: "eq", axis_ref: "variation.state", value: "hover" },
          { op: "eq", axis_ref: "variation.state", value: "hover" },
        ],
      },
      {
        op: "all",
        predicates: [
          { op: "eq", axis_ref: "condition.color", value: "dark" },
          {
            op: "any",
            predicates: [
              { op: "eq", axis_ref: "condition.color", value: "dark" },
              { op: "eq", axis_ref: "condition.color", value: "light" },
            ],
          },
        ],
      },
    ],
  });
  assert.equal(rewritten.canonical_sha256, direct.canonical_sha256);
  assert.deepEqual(rewritten.canonical_dag, direct.canonical_dag);
});

test("test-only finite expander agrees at every enum and bounded-number point", () => {
  const domains = [
    { key: "condition.color", kind: "enum", values: ["light", "dark"] },
    {
      key: "condition.width",
      kind: "bounded_number",
      minimum: 1,
      maximum: 5,
      integer: true,
    },
    { key: "variation.state", kind: "enum", values: ["idle", "active"] },
  ];
  const predicate = {
    op: "any",
    predicates: [
      {
        op: "all",
        predicates: [
          { op: "eq", axis_ref: "condition.color", value: "dark" },
          {
            op: "range",
            axis_ref: "condition.width",
            minimum: 2,
            maximum: 4,
            minimum_inclusive: true,
            maximum_inclusive: false,
          },
        ],
      },
      {
        op: "not",
        predicate: {
          op: "eq",
          axis_ref: "variation.state",
          value: "idle",
        },
      },
    ],
  };
  const compiled = compileSymbolicDenotation(domains, predicate);
  for (const assignment of expandFiniteDomains(domains))
    assert.equal(
      evaluateCanonicalSymbolicDenotation(compiled.canonical_dag, assignment),
      independentPredicateEvaluation(predicate, assignment),
      JSON.stringify(assignment),
    );
});

test("irrelevant axes increase theoretical cardinality without changing canonical work", () => {
  const predicate = {
    op: "eq",
    axis_ref: "variation.state",
    value: "active",
  };
  const relevant = {
    key: "variation.state",
    kind: "enum",
    values: ["idle", "active"],
  };
  const baseline = compileSymbolicDenotation([relevant], predicate);
  const expanded = compileSymbolicDenotation(
    [
      ...Array.from({ length: 24 }, (_, axis) => ({
        key: `irrelevant.axis-${String(axis).padStart(2, "0")}`,
        kind: "bounded_number",
        minimum: 0,
        maximum: 1_000_000,
        integer: true,
      })),
      relevant,
    ],
    predicate,
  );
  assert.equal(expanded.canonical_sha256, baseline.canonical_sha256);
  assert.deepEqual(expanded.metrics, baseline.metrics);
  assert.equal(expanded.omitted_axis_refs.length, 24);
  assert.ok(
    BigInt(expanded.theoretical_ground_cardinality) >
      BigInt(baseline.theoretical_ground_cardinality) * 10n ** 100n,
  );
});

test("numeric theory partitions do not enumerate a billion-point domain", () => {
  const compiled = compileSymbolicDenotation(
    [
      {
        key: "condition.width",
        kind: "bounded_number",
        minimum: 0,
        maximum: 1_000_000_000,
        integer: true,
      },
    ],
    {
      op: "range",
      axis_ref: "condition.width",
      minimum: 480,
      maximum: 1_024,
      minimum_inclusive: true,
      maximum_inclusive: true,
    },
  );
  assert.equal(compiled.theoretical_ground_cardinality, "1000000001");
  assert.equal(compiled.metrics.canonical_dag_nodes, 1);
  assert.equal(compiled.metrics.partition_edges, 3);
  assert.ok(compiled.metrics.canonical_bytes < 1_024);
});

test("one manifest compilation session shares axis partitions, predicate memo and DAG hash-consing", () => {
  const direct = {
    op: "all",
    predicates: [
      { op: "eq", axis_ref: "condition.color", value: "dark" },
      { op: "eq", axis_ref: "variation.state", value: "hover" },
    ],
  };
  const rewritten = {
    op: "all",
    predicates: [
      { op: "eq", axis_ref: "variation.state", value: "hover" },
      { op: "eq", axis_ref: "condition.color", value: "dark" },
      { op: "eq", axis_ref: "condition.color", value: "dark" },
    ],
  };
  const session = createSymbolicDenotationCompilationSession(coreDomains, [
    direct,
    rewritten,
  ]);
  const first = session.compile(direct);
  const cached = session.compile(structuredClone(direct));
  const equivalent = session.compile(rewritten);
  assert.equal(first.canonical_sha256, cached.canonical_sha256);
  assert.equal(first.canonical_sha256, equivalent.canonical_sha256);
  assert.deepEqual(session.statistics(), {
    axis_partition_builds: 1,
    compile_requests: 3,
    compile_cache_hits: 1,
    unique_compiled_predicates: 2,
  });
});

test("unrelated shared numeric cuts do not revise an existing canonical Rule identity", () => {
  const widthDomain = [
    {
      key: "condition.width",
      kind: "bounded_number",
      minimum: 320,
      maximum: 1_920,
      integer: true,
    },
  ];
  const existing = {
    op: "range",
    axis_ref: "condition.width",
    minimum: 480,
    maximum: 1_024,
    minimum_inclusive: true,
    maximum_inclusive: false,
  };
  const unrelated = {
    op: "range",
    axis_ref: "condition.width",
    minimum: 1_280,
    maximum: 1_600,
    minimum_inclusive: true,
    maximum_inclusive: true,
  };
  const standalone = compileSymbolicDenotation(widthDomain, existing);
  const shared = createSymbolicDenotationCompilationSession(widthDomain, [
    existing,
    unrelated,
  ]).compile(existing);
  assert.equal(shared.canonical_sha256, standalone.canonical_sha256);
  assert.equal(shared.canonical_bytes, standalone.canonical_bytes);
  assert.deepEqual(shared.canonical_dag, standalone.canonical_dag);
});

test("strict grammar and every complexity fuse fail closed", () => {
  assert.throws(
    () =>
      compileSymbolicDenotation(coreDomains, {
        op: "javascript",
        source: "return true",
      }),
    /predicate_operator_unknown:javascript/u,
  );
  assert.throws(
    () =>
      compileSymbolicDenotation(coreDomains, {
        op: "eq",
        axis_ref: "condition.color",
        value: "dark",
        precedence: 1,
      }),
    /shape_keys_invalid:predicate:eq/u,
  );
  assert.throws(
    () =>
      compileSymbolicDenotation(
        coreDomains,
        nestedNot(5),
        complexityLimits({ max_predicate_depth: 4 }),
      ),
    /predicate_depth_limit_exceeded/u,
  );
  const conjunction = {
    op: "all",
    predicates: [
      { op: "eq", axis_ref: "condition.color", value: "dark" },
      { op: "eq", axis_ref: "variation.state", value: "hover" },
    ],
  };
  assert.throws(
    () =>
      compileSymbolicDenotation(
        coreDomains,
        conjunction,
        complexityLimits({ max_input_predicate_nodes: 2 }),
      ),
    /predicate_node_limit_exceeded/u,
  );
  assert.throws(
    () =>
      compileSymbolicDenotation(
        coreDomains,
        conjunction,
        complexityLimits({ max_canonical_dag_nodes: 1 }),
      ),
    /constructed_dag_node_limit_exceeded/u,
  );
  for (const [override, error] of [
    [{ max_partition_edges: 1 }, /constructed_partition_edge_limit_exceeded/u],
    [{ max_canonical_bytes: 1 }, /canonical_byte_limit_exceeded/u],
  ])
    assert.throws(
      () =>
        compileSymbolicDenotation(
          coreDomains,
          { op: "eq", axis_ref: "variation.state", value: "hover" },
          complexityLimits(override),
        ),
      error,
    );
});
