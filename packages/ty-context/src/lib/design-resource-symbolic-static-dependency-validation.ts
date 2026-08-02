import type {
  DesignResourceHandoffPreflightV2,
  DesignResourceObservableRuleManifestV2,
  DesignResourceSymbolicNoninterferenceCertificateV2,
  DesignResourceSymbolicNoninterferenceProofV2,
  DesignResourceSymbolicStaticDependencyNodeV2,
} from "./design-resource-symbolic-fact-types.js";
import {
  assertSameSet,
  invalid,
  requireKnownRefs,
  unique,
} from "./design-resource-symbolic-validation-support.js";

const MAX_STATIC_DEPENDENCY_NODES = 8_192;
const MAX_STATIC_DEPENDENCY_EDGES = 65_536;
const MAX_STATIC_DEPENDENCY_DEPTH = 512;

export function validateStaticDependencyClosure(
  proof: DesignResourceSymbolicNoninterferenceProofV2,
  certificate: DesignResourceSymbolicNoninterferenceCertificateV2,
  projections: DesignResourceHandoffPreflightV2["rule_projections"],
  manifest: DesignResourceObservableRuleManifestV2,
): void {
  if (
    proof.equivalence_cases.length ||
    proof.complete_domain_cardinality !== null
  )
    invalid("v2_static_dependency_proof_shape_invalid", certificate.key);
  if (!proof.static_dependency_nodes.length || !proof.static_rule_roots.length)
    invalid("v2_static_dependency_graph_required", certificate.key);
  if (proof.static_dependency_nodes.length > MAX_STATIC_DEPENDENCY_NODES)
    invalid("v2_static_dependency_node_limit_exceeded", certificate.key);
  if (
    proof.static_dependency_nodes.reduce(
      (total, node) => total + node.dependency_refs.length,
      0,
    ) > MAX_STATIC_DEPENDENCY_EDGES
  )
    invalid("v2_static_dependency_edge_limit_exceeded", certificate.key);

  const nodes = new Map(
    proof.static_dependency_nodes.map((node) => [node.key, node]),
  );
  unique(
    proof.static_dependency_nodes.map((node) => node.key),
    `v2_static_dependency_node_duplicate:${certificate.key}`,
  );
  validateNodes(proof, manifest, nodes, certificate.key);

  const rootedRuleRefs = proof.static_rule_roots.flatMap(
    (root) => root.fact_rule_refs ?? certificate.fact_rule_refs,
  );
  unique(
    rootedRuleRefs,
    `v2_static_dependency_rule_duplicate:${certificate.key}`,
  );
  assertSameSet(
    rootedRuleRefs,
    certificate.fact_rule_refs,
    "v2_static_dependency_rule_set_mismatch",
    certificate.key,
  );
  const projectionsByRule = new Map(
    projections.map((projection) => [projection.rule.key, projection]),
  );
  const reachedNodes = new Set<string>();
  const reachedResources = new Set<string>();
  const closureMemo = new Map<string, StaticDependencyClosure>();
  for (const root of proof.static_rule_roots) {
    const rootRuleRefs = root.fact_rule_refs ?? certificate.fact_rule_refs;
    if (!rootRuleRefs.length)
      invalid("v2_static_dependency_root_rules_required", certificate.key);
    const closure = collectClosure(
      root.node_ref,
      nodes,
      new Set(),
      reachedNodes,
      certificate.key,
      closureMemo,
    );
    if (closure.maximumDepth > MAX_STATIC_DEPENDENCY_DEPTH)
      invalid("v2_static_dependency_depth_limit_exceeded", certificate.key);
    closure.inputResourceRefs.forEach((ref) => reachedResources.add(ref));
    for (const ruleRef of rootRuleRefs) {
      const projection = projectionsByRule.get(ruleRef);
      if (!projection)
        invalid(
          "v2_static_dependency_rule_unknown",
          `${certificate.key}:${ruleRef}`,
        );
      assertSameSet(
        [...closure.axisRefs],
        projection.compiled_region.referenced_axis_refs,
        "v2_static_dependency_closure_mismatch",
        `${certificate.key}:${ruleRef}`,
      );
      if (
        certificate.omitted_axis_refs.some((axisRef) =>
          closure.axisRefs.has(axisRef),
        )
      )
        invalid(
          "v2_static_dependency_omitted_axis_conflict",
          `${certificate.key}:${ruleRef}`,
        );
    }
  }
  assertSameSet(
    [...reachedNodes],
    [...nodes.keys()],
    "v2_static_dependency_unreachable_node",
    certificate.key,
  );
  assertSameSet(
    [...reachedResources],
    proof.input_resource_refs,
    "v2_static_dependency_input_graph_mismatch",
    certificate.key,
  );
}

interface StaticDependencyClosure {
  axisRefs: Set<string>;
  inputResourceRefs: Set<string>;
  maximumDepth: number;
}

function validateNodes(
  proof: DesignResourceSymbolicNoninterferenceProofV2,
  manifest: DesignResourceObservableRuleManifestV2,
  nodes: ReadonlyMap<string, DesignResourceSymbolicStaticDependencyNodeV2>,
  label: string,
): void {
  const axes = new Set(manifest.axis_domains.map((axis) => axis.key));
  for (const node of nodes.values()) {
    unique(node.axis_refs, `v2_static_dependency_axis_duplicate:${node.key}`);
    unique(
      node.dependency_refs,
      `v2_static_dependency_ref_duplicate:${node.key}`,
    );
    unique(
      node.input_resource_refs,
      `v2_static_dependency_input_duplicate:${node.key}`,
    );
    requireKnownRefs(node.axis_refs, axes, "v2_static_dependency_axis_unknown");
    requireKnownRefs(
      node.dependency_refs,
      nodes,
      "v2_static_dependency_node_unknown",
    );
    requireKnownRefs(
      node.input_resource_refs,
      new Set(
        manifest.inspector.input_resources.map(
          (resource) => resource.resource_ref,
        ),
      ),
      "v2_static_dependency_input_unknown",
    );
  }
  requireKnownRefs(
    proof.static_rule_roots.map((root) => root.node_ref),
    nodes,
    "v2_static_dependency_root_unknown",
  );
  if (!proof.input_resource_refs.length)
    invalid("v2_noninterference_inputs_required", label);
}

function collectClosure(
  nodeRef: string,
  nodes: ReadonlyMap<string, DesignResourceSymbolicStaticDependencyNodeV2>,
  visiting: Set<string>,
  reached: Set<string>,
  label: string,
  memo: Map<string, StaticDependencyClosure>,
): StaticDependencyClosure {
  if (visiting.has(nodeRef))
    invalid("v2_static_dependency_cycle", `${label}:${nodeRef}`);
  const cached = memo.get(nodeRef);
  if (cached) return cached;
  const node = nodes.get(nodeRef);
  if (!node)
    invalid("v2_static_dependency_node_unknown", `${label}:${nodeRef}`);
  visiting.add(nodeRef);
  reached.add(nodeRef);
  const axisRefs = new Set(node.axis_refs);
  const inputResourceRefs = new Set(node.input_resource_refs);
  let maximumDepth = 1;
  for (const dependencyRef of node.dependency_refs) {
    const dependency = collectClosure(
      dependencyRef,
      nodes,
      visiting,
      reached,
      label,
      memo,
    );
    dependency.axisRefs.forEach((ref) => axisRefs.add(ref));
    dependency.inputResourceRefs.forEach((ref) => inputResourceRefs.add(ref));
    maximumDepth = Math.max(maximumDepth, dependency.maximumDepth + 1);
  }
  visiting.delete(nodeRef);
  const result = { axisRefs, inputResourceRefs, maximumDepth };
  memo.set(nodeRef, result);
  return result;
}
