import {
  semanticArray,
  semanticLiteral,
  semanticNullable,
  semanticObject,
  semanticStableRef,
  semanticStableRefs,
  semanticString,
} from "./semantic-fact-shape-primitives.js";
import { parseSemanticFactLocatedValue } from "./semantic-fact-value-shape.js";

export function parseSemanticFactSubjects(value: unknown, label: string) {
  return semanticArray(value, label).map((item, index) => {
    const itemLabel = `${label}[${index}]`;
    const row = semanticObject(item, itemLabel, [
      "key",
      "family_ref",
      "outcome_ref",
      "kind",
      "parent_ref",
      "owner_ref",
      "source_item_refs",
      "basis_refs",
    ]);
    return {
      key: semanticStableRef(row.key, `${itemLabel}.key`),
      family_ref: semanticStableRef(row.family_ref, `${itemLabel}.family_ref`),
      outcome_ref: semanticStableRef(
        row.outcome_ref,
        `${itemLabel}.outcome_ref`,
      ),
      kind: semanticStableRef(row.kind, `${itemLabel}.kind`),
      parent_ref: semanticNullable(row.parent_ref, (entry) =>
        semanticStableRef(entry, `${itemLabel}.parent_ref`),
      ),
      owner_ref: semanticNullable(row.owner_ref, (entry) =>
        semanticStableRef(entry, `${itemLabel}.owner_ref`),
      ),
      source_item_refs: semanticStableRefs(
        row.source_item_refs,
        `${itemLabel}.source_item_refs`,
      ),
      basis_refs: semanticStableRefs(row.basis_refs, `${itemLabel}.basis_refs`),
    };
  });
}

export function parseSemanticFactRelations(value: unknown, label: string) {
  return semanticArray(value, label).map((item, index) => {
    const itemLabel = `${label}[${index}]`;
    const row = semanticObject(item, itemLabel, [
      "key",
      "family_ref",
      "outcome_ref",
      "kind",
      "endpoints",
      "source_item_refs",
      "basis_refs",
    ]);
    return {
      key: semanticStableRef(row.key, `${itemLabel}.key`),
      family_ref: semanticStableRef(row.family_ref, `${itemLabel}.family_ref`),
      outcome_ref: semanticStableRef(
        row.outcome_ref,
        `${itemLabel}.outcome_ref`,
      ),
      kind: semanticStableRef(row.kind, `${itemLabel}.kind`),
      endpoints: semanticArray(row.endpoints, `${itemLabel}.endpoints`).map(
        (endpoint, endpointIndex) => {
          const endpointLabel = `${itemLabel}.endpoints[${endpointIndex}]`;
          const entry = semanticObject(endpoint, endpointLabel, [
            "role",
            "unit_ref",
          ]);
          return {
            role: semanticStableRef(entry.role, `${endpointLabel}.role`),
            unit_ref: semanticStableRef(
              entry.unit_ref,
              `${endpointLabel}.unit_ref`,
            ),
          };
        },
      ),
      source_item_refs: semanticStableRefs(
        row.source_item_refs,
        `${itemLabel}.source_item_refs`,
      ),
      basis_refs: semanticStableRefs(row.basis_refs, `${itemLabel}.basis_refs`),
    };
  });
}

export function parseSemanticFactPopulations(value: unknown, label: string) {
  return semanticArray(value, label).map((item, index) => {
    const itemLabel = `${label}[${index}]`;
    const row = semanticObject(item, itemLabel, [
      "key",
      "family_ref",
      "outcome_ref",
      "kind",
      "member_unit_refs",
      "universe",
      "enumeration_rule",
      "exclusion_refs",
      "source_item_refs",
      "basis_refs",
    ]);
    return {
      key: semanticStableRef(row.key, `${itemLabel}.key`),
      family_ref: semanticStableRef(row.family_ref, `${itemLabel}.family_ref`),
      outcome_ref: semanticStableRef(
        row.outcome_ref,
        `${itemLabel}.outcome_ref`,
      ),
      kind: semanticLiteral(
        row.kind,
        ["static", "dynamic"] as const,
        `${itemLabel}.kind`,
      ),
      member_unit_refs: semanticStableRefs(
        row.member_unit_refs,
        `${itemLabel}.member_unit_refs`,
      ),
      universe: parseSemanticFactLocatedValue(
        row.universe,
        `${itemLabel}.universe`,
      ),
      enumeration_rule: semanticString(
        row.enumeration_rule,
        `${itemLabel}.enumeration_rule`,
      ),
      exclusion_refs: semanticStableRefs(
        row.exclusion_refs,
        `${itemLabel}.exclusion_refs`,
      ),
      source_item_refs: semanticStableRefs(
        row.source_item_refs,
        `${itemLabel}.source_item_refs`,
      ),
      basis_refs: semanticStableRefs(row.basis_refs, `${itemLabel}.basis_refs`),
    };
  });
}
