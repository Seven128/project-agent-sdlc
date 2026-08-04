import {
  designFactComparatorSupportsMethod,
  designFactMethodIsCompatible,
  designFactOracleSupportsMethod,
} from "./design-resource-fact-policy.js";
import { validateDesignResourceLocatedDigest } from "./design-resource-fact-locator-validation.js";
import type { DesignResourcePropertyDefinitionV1 } from "./design-resource-fact-types.js";
import type { DesignResource } from "./design-resource-handoff-file-primitives.js";
import type {
  DesignResourceObservableRuleManifestV2,
  DesignResourceSymbolicHandoffTargetV2,
} from "./design-resource-symbolic-fact-types.js";
import {
  invalid,
  unique,
} from "./design-resource-symbolic-validation-support.js";

type Rule = DesignResourceObservableRuleManifestV2["fact_rules"][number];
type Obligation =
  DesignResourceObservableRuleManifestV2["semantic_proof_obligations"][number];
type Oracle = DesignResourceObservableRuleManifestV2["oracles"][number];
type Environment =
  DesignResourceObservableRuleManifestV2["environments"][number];

export function validateSymbolicProofAuthorities(
  manifest: DesignResourceObservableRuleManifestV2,
  target: DesignResourceSymbolicHandoffTargetV2,
  resources: Map<string, DesignResource>,
  contents: Map<string, Buffer>,
): void {
  for (const oracle of manifest.oracles) {
    if (!oracle.capability_refs.length)
      invalid("v2_oracle_capabilities_required", oracle.key);
    unique(
      oracle.capability_refs,
      `v2_oracle_capability_duplicate:${oracle.key}`,
    );
    if (oracle.trust === "frozen_executable" && oracle.sha256 === null)
      invalid("v2_oracle_digest_required", oracle.key);
    if (oracle.trust === "named_external_tcb" && oracle.sha256 !== null)
      invalid("v2_external_oracle_digest_forbidden", oracle.key);
  }
  for (const environment of manifest.environments) {
    validateDesignResourceLocatedDigest(
      environment.definition,
      resources,
      contents,
      `v2.environment.${environment.key}`,
    );
    requireTargetResource(
      target,
      environment.definition.locator.resource_ref,
      "v2_environment_resource_outside_target",
      environment.key,
    );
  }
}

export function validateSymbolicObligationPolicy(
  obligation: Obligation,
  rule: Rule,
  property: DesignResourcePropertyDefinitionV1,
  oracle: Oracle,
  environment: Environment,
  target: DesignResourceSymbolicHandoffTargetV2,
  resources: Map<string, DesignResource>,
  contents: Map<string, Buffer>,
): void {
  if (!designFactMethodIsCompatible(property.dimension, obligation.method))
    invalid(
      "v2_proof_method_incompatible",
      `${obligation.key}:${property.dimension}:${obligation.method}`,
    );
  if (
    !designFactComparatorSupportsMethod(
      obligation.method,
      obligation.comparison.comparator,
    )
  )
    invalid(
      "v2_proof_comparator_method_incompatible",
      `${obligation.key}:${obligation.method}:${obligation.comparison.comparator}`,
    );
  if (
    !designFactOracleSupportsMethod(obligation.method, oracle.capability_refs)
  )
    invalid(
      "v2_proof_oracle_capability_missing",
      `${obligation.key}:${oracle.key}:${obligation.method}`,
    );
  validateComparison(obligation, target, resources, contents);
  requireTargetResource(
    target,
    environment.definition.locator.resource_ref,
    "v2_proof_environment_outside_target",
    obligation.key,
  );
  validateProtectedValuePolicy(rule, obligation);
  if (obligation.proof_surface === "proxy_only")
    invalid("v2_obligation_proxy_only_forbidden", obligation.key);
  if (
    !obligation.proof_surface.trim() ||
    !obligation.observation_boundary.trim() ||
    obligation.completion_effect !== "required_for_rule_method_region"
  )
    invalid("v2_obligation_proof_meaning_incomplete", obligation.key);
}

function validateComparison(
  obligation: Obligation,
  target: DesignResourceSymbolicHandoffTargetV2,
  resources: Map<string, DesignResource>,
  contents: Map<string, Buffer>,
): void {
  const { comparison } = obligation;
  if (
    comparison.mode === "exact" &&
    (comparison.tolerance !== null || comparison.mask !== null)
  )
    invalid("v2_exact_proof_tolerance_forbidden", obligation.key);
  if (comparison.mode === "tolerance" && comparison.tolerance === null)
    invalid("v2_tolerance_proof_tolerance_required", obligation.key);
  if (
    comparison.mask !== null &&
    comparison.comparator !== "pixel_diff" &&
    !comparison.comparator.startsWith("custom.")
  )
    invalid(
      "v2_proof_mask_comparator_incompatible",
      `${obligation.key}:${comparison.comparator}`,
    );
  for (const [name, located] of [
    ["parameters", comparison.parameters],
    ["tolerance", comparison.tolerance],
    ["mask", comparison.mask],
  ] as const) {
    if (!located) continue;
    validateDesignResourceLocatedDigest(
      located,
      resources,
      contents,
      `v2.obligation.${obligation.key}.${name}`,
    );
    requireTargetResource(
      target,
      located.locator.resource_ref,
      "v2_proof_resource_outside_target",
      obligation.key,
    );
  }
}

function validateProtectedValuePolicy(
  rule: Rule,
  obligation: Obligation,
): void {
  const plain = obligation.protected_value_policy === "plain_exact_observation";
  if (
    (rule.observation_sensitivity === "plain" && !plain) ||
    (rule.observation_sensitivity === "protected" &&
      (plain || !obligation.protected_value_policy.trim()))
  )
    invalid("v2_protected_value_policy_mismatch", obligation.key);
}

function requireTargetResource(
  target: DesignResourceSymbolicHandoffTargetV2,
  resourceRef: string,
  code: string,
  detail: string,
): void {
  if (!target.resource_refs.includes(resourceRef))
    invalid(code, `${detail}:${resourceRef}`);
}
