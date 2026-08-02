import { validateDesignResourceLocatedDigest } from "./design-resource-fact-locator-validation.js";
import type { DesignResource } from "./design-resource-handoff-file-primitives.js";
import type { SymbolicManifestIndexes } from "./design-resource-symbolic-manifest-validation.js";
import type {
  DesignResourceObservableRuleManifestV2,
  DesignResourceSymbolicHandoffTargetV2,
} from "./design-resource-symbolic-fact-types.js";
import {
  validateSymbolicQuantifier,
  validateSymbolicRegionWithinReachable,
} from "./design-resource-symbolic-region-validation.js";
import { assertNoUnprovedOmittedAxes } from "./design-resource-symbolic-safety-validation.js";
import {
  assertSameSet,
  invalid,
  requireKnownRefs,
  unique,
} from "./design-resource-symbolic-validation-support.js";
import { compileSymbolicDenotation } from "./symbolic-denotation-engine.js";

export function validateSymbolicSubjectPopulationClosure(
  manifest: DesignResourceObservableRuleManifestV2,
  target: DesignResourceSymbolicHandoffTargetV2,
  indexes: SymbolicManifestIndexes,
  resources: Map<string, DesignResource>,
  contents: Map<string, Buffer>,
): void {
  validateSubjects(manifest, target.key, indexes);
  validatePopulations(manifest, target, indexes, resources, contents);
}

export function validateSymbolicCensusClosure(
  manifest: DesignResourceObservableRuleManifestV2,
  indexes: SymbolicManifestIndexes,
): void {
  validateCensusClosure(manifest, indexes);
}

function validateSubjects(
  manifest: DesignResourceObservableRuleManifestV2,
  targetKey: string,
  indexes: SymbolicManifestIndexes,
): void {
  const stableKeys: string[] = [];
  for (const subject of manifest.subjects) {
    if (!subject.stable_keys.length)
      invalid("v2_subject_stable_keys_required", subject.key);
    unique(
      subject.stable_keys,
      `v2_subject_stable_key_duplicate:${subject.key}`,
    );
    stableKeys.push(...subject.stable_keys);
    assertSameSet(
      subject.target_refs,
      [targetKey],
      "v2_subject_target_mismatch",
      subject.key,
    );
    requireKnownRefs(
      subject.census_refs,
      indexes.census,
      "v2_subject_census_unknown",
    );
    if (
      subject.population_ref &&
      !indexes.populations.has(subject.population_ref)
    )
      invalid("v2_subject_population_unknown", subject.key);
    for (const ref of [
      subject.parent_ref,
      subject.instance_of_ref,
      subject.override_of_ref,
      subject.family_ref,
      subject.portal_host_ref,
    ])
      if (ref !== null && !indexes.subjects.has(ref))
        invalid("v2_subject_hierarchy_ref_unknown", `${subject.key}:${ref}`);
    unique(
      subject.relation_endpoints.map((item) => item.role),
      `v2_relation_endpoint_role_duplicate:${subject.key}`,
    );
    for (const endpoint of subject.relation_endpoints)
      if (!indexes.subjects.has(endpoint.subject_ref))
        invalid(
          "v2_relation_endpoint_subject_unknown",
          `${subject.key}:${endpoint.subject_ref}`,
        );
    if (subject.kind === "relation" && subject.relation_endpoints.length < 2)
      invalid("v2_relation_endpoints_incomplete", subject.key);
    if (subject.presence === "always" && subject.presence_rule_ref !== null)
      invalid("v2_subject_always_presence_rule_forbidden", subject.key);
  }
  unique(stableKeys, "v2_subject_stable_key_ambiguous");
}

function validatePopulations(
  manifest: DesignResourceObservableRuleManifestV2,
  target: DesignResourceSymbolicHandoffTargetV2,
  indexes: SymbolicManifestIndexes,
  resources: Map<string, DesignResource>,
  contents: Map<string, Buffer>,
): void {
  const targetResources = new Set(target.resource_refs);
  for (const population of manifest.populations) {
    requireKnownRefs(
      population.member_subject_refs,
      indexes.subjects,
      "v2_population_subject_unknown",
    );
    assertSameSet(
      population.member_subject_refs,
      manifest.subjects
        .filter((subject) => subject.population_ref === population.key)
        .map((subject) => subject.key),
      "v2_population_member_set_mismatch",
      population.key,
    );
    if (
      (population.kind === "static" && population.enumeration !== "complete") ||
      (population.kind === "dynamic" &&
        population.enumeration !== "symbolic_partition")
    )
      invalid("v2_population_enumeration_mismatch", population.key);
    validateDesignResourceLocatedDigest(
      population.universe,
      resources,
      contents,
      `v2.population.${population.key}.universe`,
    );
    if (!targetResources.has(population.universe.locator.resource_ref))
      invalid("v2_population_resource_outside_target", population.key);
    validateSymbolicQuantifier(population.quantifier, population.key);
    unique(
      population.exclusions.map((item) => item.key),
      `v2_population_exclusion_key_duplicate:${population.key}`,
    );
    for (const exclusion of population.exclusions) {
      if (!exclusion.basis_refs.length)
        invalid("v2_population_exclusion_basis_required", exclusion.key);
      const compiled = compileSymbolicDenotation(
        manifest.axis_domains,
        exclusion.region,
      );
      assertNoUnprovedOmittedAxes(compiled, exclusion.key);
      validateSymbolicRegionWithinReachable(
        manifest.axis_domains,
        exclusion.region,
        manifest.reachable_region,
        exclusion.key,
      );
    }
  }
}

function validateCensusClosure(
  manifest: DesignResourceObservableRuleManifestV2,
  indexes: SymbolicManifestIndexes,
): void {
  const rules = new Map(manifest.fact_rules.map((item) => [item.key, item]));
  for (const row of manifest.inspector.census) {
    requireKnownRefs(row.fact_refs, rules, "v2_census_rule_unknown");
    requireKnownRefs(
      row.source_item_refs,
      indexes.sourceItems,
      "v2_census_source_item_unknown",
    );
    if (!row.source_item_refs.length || !row.basis_refs.length)
      invalid("v2_census_basis_source_required", row.key);
    unique(row.fact_refs, `v2_census_rule_ref_duplicate:${row.key}`);
    assertSameSet(
      row.fact_refs,
      manifest.fact_rules
        .filter((rule) => rule.census_refs.includes(row.key))
        .map((rule) => rule.key),
      "v2_census_rule_set_mismatch",
      row.key,
    );
  }
}
