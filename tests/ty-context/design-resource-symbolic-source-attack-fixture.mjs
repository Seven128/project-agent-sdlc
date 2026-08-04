import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { canonicalJson } from "../../packages/ty-context/dist/lib/strict-codec.js";
import {
  fixtureSha,
  fixtureStableJson,
} from "./design-resource-symbolic-handoff-fixture-support.mjs";

export function sourceIrReadsOmittedAxis(sourceIr) {
  sourceIr.certificate_scopes[0].regions[0].predicate = {
    op: "eq",
    axis_ref: "variation.state",
    value: "active",
  };
}

export async function readSourceArtifact(context) {
  const resource = context.artifactResources.find(
    (item) => item.key === "resource.noninterference.source",
  );
  return JSON.parse(
    await readFile(path.join(context.root, resource.path), "utf8"),
  );
}

export async function forgePassedSourceArtifact(context, method) {
  const proof = context.model.certificate.source_noninterference_proof;
  if (proof.method !== method)
    throw new Error(`source attack proof method mismatch:${proof.method}:${method}`);
  const resource = context.artifactResources.find(
    (item) => item.key === proof.artifact_resource_ref,
  );
  const artifactPath = path.join(context.root, resource.path);
  const artifact = JSON.parse(await readFile(artifactPath, "utf8"));
  const rulePredicate = structuredClone(
    context.model.manifest.reachable_region,
  );
  const derivedResult = {
    source_ir_resource_ref: "resource.symbolic-source-ir",
    static_dependency_nodes:
      method === "closed_world_static_dependency_closure"
        ? [
            {
              key: "source.forged-complete-graph",
              axis_refs: [],
              dependency_refs: [],
              input_resource_refs: [...proof.input_resource_refs],
            },
          ]
        : [],
    static_rule_roots:
      method === "closed_world_static_dependency_closure"
        ? [
            {
              fact_rule_refs: null,
              node_ref: "source.forged-complete-graph",
            },
          ]
        : [],
    equivalence_cases:
      method === "closed_world_static_dependency_closure"
        ? []
        : [
            {
              fact_rule_refs: [...context.model.certificate.fact_rule_refs],
              side_predicate: structuredClone(rulePredicate),
              axis_erased_predicate: structuredClone(rulePredicate),
            },
          ],
    complete_domain_cardinality:
      method === "finite_complete_domain_exhaustive_equivalence"
        ? context.model.rules[0].compiled.theoretical_ground_cardinality
        : null,
    exhaustive_evaluation_sha256:
      method === "finite_complete_domain_exhaustive_equivalence"
        ? fixtureSha("forged-complete-domain-result")
        : null,
  };
  artifact.derived_result = derivedResult;
  artifact.verdict = "passed";
  artifact.failure_witness = null;
  artifact.method_result_sha256 = fixtureSha(
    fixtureStableJson({
      method,
      oracle_capability: artifact.oracle_capability,
      derived_result: derivedResult,
      current_dependency_result: null,
    }),
  );
  proof.static_dependency_nodes = structuredClone(
    derivedResult.static_dependency_nodes,
  );
  proof.static_rule_roots = structuredClone(derivedResult.static_rule_roots);
  proof.equivalence_cases = structuredClone(derivedResult.equivalence_cases);
  proof.complete_domain_cardinality =
    derivedResult.complete_domain_cardinality;
  proof.method_result_sha256 = artifact.method_result_sha256;
  proof.failure_witness = null;
  const content = canonicalJson(artifact);
  const digest = fixtureSha(content);
  await writeFile(artifactPath, content);
  resource.sha256 = digest;
  proof.artifact_sha256 = digest;
}
