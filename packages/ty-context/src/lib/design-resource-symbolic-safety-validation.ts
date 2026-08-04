import { EXACT_TARGET_FULL_TARGET_METHODS } from "./design-resource-fact-policy.js";
import type {
  DesignResourceHandoffPreflightV2,
  DesignResourceObservableRuleManifestV2,
} from "./design-resource-symbolic-fact-types.js";
import { invalid } from "./design-resource-symbolic-validation-support.js";
import { compileSymbolicDenotation } from "./symbolic-denotation-engine.js";
import type { CompiledSymbolicDenotationV1 } from "./symbolic-denotation-types.js";

export function validateSymbolicReadinessClosure(
  manifest: DesignResourceObservableRuleManifestV2,
): void {
  if (manifest.acceptance_blockers.length)
    invalid(
      "acceptance_blockers_unresolved",
      manifest.acceptance_blockers.map((item) => item.key).join(","),
    );
}

export function assertNoUnprovedOmittedAxes(
  compiled: CompiledSymbolicDenotationV1,
  label: string,
): void {
  if (compiled.omitted_axis_refs.length)
    invalid(
      "v2_noninterference_proof_unavailable",
      `${label}:${compiled.omitted_axis_refs.join(",")}`,
    );
}

export function validateSymbolicExactTargetCoverage(
  interpretation: "exact_target" | "constraint",
  manifest: DesignResourceObservableRuleManifestV2,
  projections: DesignResourceHandoffPreflightV2["rule_projections"],
  reachable: CompiledSymbolicDenotationV1,
): void {
  if (interpretation !== "exact_target") return;
  const obligations = new Map(
    manifest.semantic_proof_obligations.map((item) => [item.key, item]),
  );
  for (const method of EXACT_TARGET_FULL_TARGET_METHODS) {
    const regions = projections
      .filter(
        ({ rule }) =>
          rule.observation_scope === "full_target" &&
          rule.semantic_obligation_refs.some(
            (ref) => obligations.get(ref)?.method === method,
          ),
      )
      .map(({ rule }) => rule.region);
    if (!regions.length)
      invalid("v2_exact_target_full_target_method_missing", method);
    const covered = compileSymbolicDenotation(manifest.axis_domains, {
      op: "any",
      predicates: regions,
    });
    if (covered.canonical_sha256 !== reachable.canonical_sha256)
      invalid("v2_exact_target_full_target_region_gap", method);
  }
}
