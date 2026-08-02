export function buildScaleStaticNoninterferenceProof(side, inputResourceRefs) {
  const nodeRef = `dependency.${side}.scale-root`;
  return {
    side,
    method: "closed_world_static_dependency_closure",
    input_resource_refs: [...inputResourceRefs],
    oracle_ref: "oracle.fixture",
    environment_ref: "environment.fixture",
    static_dependency_nodes: [
      {
        key: nodeRef,
        axis_refs: ["condition.axis-00"],
        dependency_refs: [],
        input_resource_refs: [...inputResourceRefs],
      },
    ],
    static_rule_roots: [{ fact_rule_refs: null, node_ref: nodeRef }],
    equivalence_cases: [],
    dynamic_dependency_kinds: [],
    external_device_refs: [],
    complete_domain_cardinality: null,
  };
}
