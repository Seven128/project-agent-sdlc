import { parseDesignResourceLocatedDigest } from "./design-resource-fact-shape-primitives.js";
import {
  contractKey,
  sha256,
  sourceItemKeys,
  stableKey,
  stableKeys,
} from "./design-resource-handoff-shape-primitives.js";
import { DESIGN_RESOURCE_VERIFICATION_METHODS } from "./design-resource-handoff-types.js";
import type {
  DesignResourceSymbolicFactRuleV2,
  DesignResourceSymbolicPopulationV2,
} from "./design-resource-symbolic-fact-types.js";
import {
  parseSymbolicNonnegativeInteger,
  parseSymbolicPredicate,
} from "./design-resource-symbolic-predicate-shape.js";
import {
  array,
  literal,
  nullable,
  object,
  string,
} from "./long-task-shape-primitives.js";

export function parseSymbolicPopulations(
  value: unknown,
  label: string,
): DesignResourceSymbolicPopulationV2[] {
  return array(value, label).map((item, index) => {
    const itemLabel = `${label}[${index}]`;
    const row = object(item, itemLabel, [
      "key",
      "kind",
      "member_subject_refs",
      "universe",
      "enumeration",
      "exclusions",
      "quantifier",
    ]);
    return {
      key: stableKey(row.key, `${itemLabel}.key`),
      kind: literal(
        row.kind,
        ["static", "dynamic"] as const,
        `${itemLabel}.kind`,
      ),
      member_subject_refs: stableKeys(
        row.member_subject_refs,
        `${itemLabel}.member_subject_refs`,
      ),
      universe: parseDesignResourceLocatedDigest(
        row.universe,
        `${itemLabel}.universe`,
      ),
      enumeration: literal(
        row.enumeration,
        ["complete", "symbolic_partition"] as const,
        `${itemLabel}.enumeration`,
      ),
      exclusions: array(row.exclusions, `${itemLabel}.exclusions`).map(
        (entry, exclusionIndex) =>
          parsePopulationExclusion(
            entry,
            `${itemLabel}.exclusions[${exclusionIndex}]`,
          ),
      ),
      quantifier: parseSymbolicQuantifier(
        row.quantifier,
        `${itemLabel}.quantifier`,
      ),
    };
  });
}

function parsePopulationExclusion(value: unknown, label: string) {
  const row = object(value, label, [
    "key",
    "region",
    "basis_refs",
    "rationale",
  ]);
  return {
    key: stableKey(row.key, `${label}.key`),
    region: parseSymbolicPredicate(row.region, `${label}.region`),
    basis_refs: stableKeys(row.basis_refs, `${label}.basis_refs`),
    rationale: string(row.rationale, `${label}.rationale`),
  };
}

export function parseSymbolicFactRules(
  value: unknown,
  label: string,
): DesignResourceSymbolicFactRuleV2[] {
  return array(value, label).map((item, index) =>
    parseSymbolicFactRule(item, `${label}[${index}]`),
  );
}

function parseSymbolicFactRule(
  value: unknown,
  label: string,
): DesignResourceSymbolicFactRuleV2 {
  const row = object(value, label, [
    "key",
    "subject_or_relation_ref",
    "target_ref",
    "property_ref",
    "population_ref",
    "quantifier",
    "region",
    "expected",
    "value_kind",
    "provenance_ref",
    "observation_scope",
    "observation_sensitivity",
    "lineage",
    "evidence_refs",
    "census_refs",
    "source_item_refs",
    "semantic_obligation_refs",
  ]);
  const lineage = object(row.lineage, `${label}.lineage`, [
    "design_system_ref",
    "token_chain_refs",
    "override_chain_refs",
    "resolved_value",
    "conflict_status",
    "conflict_resolution",
  ]);
  return {
    key: stableKey(row.key, `${label}.key`),
    subject_or_relation_ref: stableKey(
      row.subject_or_relation_ref,
      `${label}.subject_or_relation_ref`,
    ),
    target_ref: contractKey(row.target_ref, `${label}.target_ref`),
    property_ref: stableKey(row.property_ref, `${label}.property_ref`),
    population_ref: nullable(row.population_ref, (entry) =>
      stableKey(entry, `${label}.population_ref`),
    ),
    quantifier: parseSymbolicQuantifier(row.quantifier, `${label}.quantifier`),
    region: parseSymbolicPredicate(row.region, `${label}.region`),
    expected: parseDesignResourceLocatedDigest(
      row.expected,
      `${label}.expected`,
    ),
    value_kind: stableKey(row.value_kind, `${label}.value_kind`),
    provenance_ref: string(row.provenance_ref, `${label}.provenance_ref`),
    observation_scope: literal(
      row.observation_scope,
      ["subject", "full_target"] as const,
      `${label}.observation_scope`,
    ),
    observation_sensitivity: literal(
      row.observation_sensitivity,
      ["plain", "protected"] as const,
      `${label}.observation_sensitivity`,
    ),
    lineage: {
      design_system_ref: nullable(lineage.design_system_ref, (entry) =>
        stableKey(entry, `${label}.lineage.design_system_ref`),
      ),
      token_chain_refs: stableKeys(
        lineage.token_chain_refs,
        `${label}.lineage.token_chain_refs`,
      ),
      override_chain_refs: stableKeys(
        lineage.override_chain_refs,
        `${label}.lineage.override_chain_refs`,
      ),
      resolved_value: parseDesignResourceLocatedDigest(
        lineage.resolved_value,
        `${label}.lineage.resolved_value`,
      ),
      conflict_status: literal(
        lineage.conflict_status,
        ["none", "resolved"] as const,
        `${label}.lineage.conflict_status`,
      ),
      conflict_resolution: string(
        lineage.conflict_resolution,
        `${label}.lineage.conflict_resolution`,
      ),
    },
    evidence_refs: stableKeys(row.evidence_refs, `${label}.evidence_refs`),
    census_refs: stableKeys(row.census_refs, `${label}.census_refs`),
    source_item_refs: sourceItemKeys(
      row.source_item_refs,
      `${label}.source_item_refs`,
    ),
    semantic_obligation_refs: stableKeys(
      row.semantic_obligation_refs,
      `${label}.semantic_obligation_refs`,
    ),
  };
}

export function parseSymbolicObligation(value: unknown, label: string) {
  const row = object(value, label, [
    "key",
    "fact_rule_ref",
    "method",
    "region_sha256",
    "proof_surface",
    "observation_boundary",
    "comparison",
    "oracle_ref",
    "environment_ref",
    "protected_value_policy",
    "completion_effect",
  ]);
  const comparison = object(row.comparison, `${label}.comparison`, [
    "comparator",
    "mode",
    "parameters",
    "tolerance",
    "mask",
  ]);
  return {
    key: stableKey(row.key, `${label}.key`),
    fact_rule_ref: stableKey(row.fact_rule_ref, `${label}.fact_rule_ref`),
    method: literal(
      row.method,
      DESIGN_RESOURCE_VERIFICATION_METHODS,
      `${label}.method`,
    ),
    region_sha256: sha256(row.region_sha256, `${label}.region_sha256`),
    proof_surface: string(row.proof_surface, `${label}.proof_surface`),
    observation_boundary: string(
      row.observation_boundary,
      `${label}.observation_boundary`,
    ),
    comparison: {
      comparator: string(
        comparison.comparator,
        `${label}.comparison.comparator`,
      ),
      mode: literal(
        comparison.mode,
        ["exact", "tolerance"] as const,
        `${label}.comparison.mode`,
      ),
      parameters: parseDesignResourceLocatedDigest(
        comparison.parameters,
        `${label}.comparison.parameters`,
      ),
      tolerance: nullable(comparison.tolerance, (entry) =>
        parseDesignResourceLocatedDigest(
          entry,
          `${label}.comparison.tolerance`,
        ),
      ),
      mask: nullable(comparison.mask, (entry) =>
        parseDesignResourceLocatedDigest(entry, `${label}.comparison.mask`),
      ),
    },
    oracle_ref: stableKey(row.oracle_ref, `${label}.oracle_ref`),
    environment_ref: stableKey(row.environment_ref, `${label}.environment_ref`),
    protected_value_policy: string(
      row.protected_value_policy,
      `${label}.protected_value_policy`,
    ),
    completion_effect: string(
      row.completion_effect,
      `${label}.completion_effect`,
    ),
  };
}

export function parseSymbolicQuantifier(value: unknown, label: string) {
  const row = object(value, label, ["kind", "minimum", "maximum"]);
  return {
    kind: literal(
      row.kind,
      [
        "one",
        "all",
        "any",
        "none",
        "exactly",
        "at_least",
        "at_most",
        "range",
      ] as const,
      `${label}.kind`,
    ),
    minimum: nullable(row.minimum, (entry) =>
      parseSymbolicNonnegativeInteger(entry, `${label}.minimum`),
    ),
    maximum: nullable(row.maximum, (entry) =>
      parseSymbolicNonnegativeInteger(entry, `${label}.maximum`),
    ),
  };
}
