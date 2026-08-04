import type {
  DesignResourceObservableRuleManifestV2,
  DesignResourceSymbolicDispositionRegionV2,
  DesignResourceSymbolicFactRuleV2,
  ParsedDesignResourceHandoffV2,
} from "./design-resource-symbolic-fact-types.js";
import { stableJson } from "./design-resource-symbolic-validation-support.js";
import type { SymbolicExtensionalPointV1 } from "./symbolic-denotation-types.js";

export function buildSymbolicManifestIndexes(
  manifest: DesignResourceObservableRuleManifestV2,
  parsed: Pick<ParsedDesignResourceHandoffV2, "source_item_keys">,
) {
  const rulesBySubjectProperty = groupRows(manifest.fact_rules, (rule) =>
    symbolicSubjectPropertyKey(rule.subject_or_relation_ref, rule.property_ref),
  );
  const dispositionsBySubjectProperty = groupRows(
    manifest.disposition_regions,
    (row) =>
      symbolicSubjectPropertyKey(row.subject_or_relation_ref, row.property_ref),
  );
  const rulesBySemanticTuple = groupRows(
    manifest.fact_rules,
    symbolicSemanticTupleKey,
  );
  const dispositionsBySemanticTuple = groupRows(
    manifest.disposition_regions,
    symbolicSemanticTupleKey,
  );
  const rulesByCensus = new Map<string, DesignResourceSymbolicFactRuleV2[]>();
  for (const rule of manifest.fact_rules)
    for (const censusRef of rule.census_refs)
      append(rulesByCensus, censusRef, rule);
  return {
    sourceItems: new Set(parsed.source_item_keys),
    census: new Map(manifest.inspector.census.map((item) => [item.key, item])),
    subjects: new Map(manifest.subjects.map((item) => [item.key, item])),
    populations: new Map(manifest.populations.map((item) => [item.key, item])),
    properties: new Map(manifest.properties.map((item) => [item.key, item])),
    rules: new Map(manifest.fact_rules.map((item) => [item.key, item])),
    dispositions: new Map(
      manifest.disposition_regions.map((item) => [item.key, item]),
    ),
    obligations: new Map(
      manifest.semantic_proof_obligations.map((item) => [item.key, item]),
    ),
    oracles: new Map(manifest.oracles.map((item) => [item.key, item])),
    environments: new Map(
      manifest.environments.map((item) => [item.key, item]),
    ),
    inspectorCapabilities: new Set(manifest.inspector.capability_refs),
    rulesBySubjectProperty,
    dispositionsBySubjectProperty,
    rulesBySemanticTuple,
    dispositionsBySemanticTuple,
    rulesByCensus,
  };
}

export type SymbolicManifestIndexes = ReturnType<
  typeof buildSymbolicManifestIndexes
>;

export function symbolicSubjectPropertyKey(
  subjectRef: string,
  propertyRef: string,
): string {
  return `${subjectRef}\u0000${propertyRef}`;
}

export function symbolicSemanticTupleKey(
  row:
    | DesignResourceSymbolicFactRuleV2
    | DesignResourceSymbolicDispositionRegionV2
    | SymbolicExtensionalPointV1,
): string {
  return [
    row.subject_or_relation_ref,
    row.target_ref,
    row.property_ref,
    row.population_ref ?? "none",
    stableJson(row.quantifier),
  ].join("\u0000");
}

function groupRows<T>(
  rows: readonly T[],
  keyOf: (row: T) => string,
): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const row of rows) append(groups, keyOf(row), row);
  return groups;
}

function append<T>(groups: Map<string, T[]>, key: string, row: T): void {
  const values = groups.get(key);
  if (values) values.push(row);
  else groups.set(key, [row]);
}
