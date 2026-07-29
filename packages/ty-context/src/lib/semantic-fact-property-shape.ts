import { EVIDENCE_CAPABILITIES } from "./long-task-shape-primitives.js";
import { SEMANTIC_FACT_VALUE_KINDS } from "./semantic-fact-shape-constants.js";
import {
  semanticArray,
  semanticLiteral,
  semanticNullable,
  semanticObject,
  semanticStableRef,
  semanticStableRefs,
  semanticString,
} from "./semantic-fact-shape-primitives.js";
import { parseSemanticFactBoolean } from "./semantic-fact-value-shape.js";

export function parseSemanticFactPropertyDispositions(
  value: unknown,
  label: string,
) {
  return semanticArray(value, label).map((item, index) => {
    const itemLabel = `${label}[${index}]`;
    const row = semanticObject(item, itemLabel, [
      "key",
      "family_ref",
      "property",
      "standard",
      "value_kind",
      "required_methods",
      "required_evidence_capabilities",
      "applicable_unit_refs",
      "not_applicable_unit_refs",
      "decision_required_unit_refs",
      "unavailable_unit_refs",
      "condition_refs",
      "source_item_refs",
      "basis_refs",
      "rationale",
    ]);
    return {
      key: semanticStableRef(row.key, `${itemLabel}.key`),
      family_ref: semanticStableRef(row.family_ref, `${itemLabel}.family_ref`),
      property: semanticStableRef(row.property, `${itemLabel}.property`),
      standard: parseSemanticFactBoolean(row.standard, `${itemLabel}.standard`),
      value_kind: semanticLiteral(
        row.value_kind,
        SEMANTIC_FACT_VALUE_KINDS,
        `${itemLabel}.value_kind`,
      ),
      required_methods: semanticStableRefs(
        row.required_methods,
        `${itemLabel}.required_methods`,
      ),
      required_evidence_capabilities: semanticArray(
        row.required_evidence_capabilities,
        `${itemLabel}.required_evidence_capabilities`,
      ).map((entry, capabilityIndex) =>
        semanticLiteral(
          entry,
          EVIDENCE_CAPABILITIES,
          `${itemLabel}.required_evidence_capabilities[${capabilityIndex}]`,
        ),
      ),
      applicable_unit_refs: semanticStableRefs(
        row.applicable_unit_refs,
        `${itemLabel}.applicable_unit_refs`,
      ),
      not_applicable_unit_refs: semanticStableRefs(
        row.not_applicable_unit_refs,
        `${itemLabel}.not_applicable_unit_refs`,
      ),
      decision_required_unit_refs: semanticStableRefs(
        row.decision_required_unit_refs,
        `${itemLabel}.decision_required_unit_refs`,
      ),
      unavailable_unit_refs: semanticStableRefs(
        row.unavailable_unit_refs,
        `${itemLabel}.unavailable_unit_refs`,
      ),
      condition_refs: semanticStableRefs(
        row.condition_refs,
        `${itemLabel}.condition_refs`,
      ),
      source_item_refs: semanticStableRefs(
        row.source_item_refs,
        `${itemLabel}.source_item_refs`,
      ),
      basis_refs: semanticStableRefs(row.basis_refs, `${itemLabel}.basis_refs`),
      rationale: semanticString(row.rationale, `${itemLabel}.rationale`),
    };
  });
}

export function parseSemanticFactCells(value: unknown, label: string) {
  return semanticArray(value, label).map((item, index) => {
    const itemLabel = `${label}[${index}]`;
    const row = semanticObject(item, itemLabel, [
      "key",
      "outcome_ref",
      "unit_ref",
      "condition_ref",
      "property_ref",
      "disposition",
      "fact_ref",
      "source_item_refs",
      "basis_refs",
      "rationale",
    ]);
    return {
      key: semanticStableRef(row.key, `${itemLabel}.key`),
      outcome_ref: semanticStableRef(
        row.outcome_ref,
        `${itemLabel}.outcome_ref`,
      ),
      unit_ref: semanticStableRef(row.unit_ref, `${itemLabel}.unit_ref`),
      condition_ref: semanticStableRef(
        row.condition_ref,
        `${itemLabel}.condition_ref`,
      ),
      property_ref: semanticStableRef(
        row.property_ref,
        `${itemLabel}.property_ref`,
      ),
      disposition: semanticLiteral(
        row.disposition,
        [
          "specified",
          "not_applicable",
          "decision_required",
          "unavailable",
        ] as const,
        `${itemLabel}.disposition`,
      ),
      fact_ref: semanticNullable(row.fact_ref, (entry) =>
        semanticStableRef(entry, `${itemLabel}.fact_ref`),
      ),
      source_item_refs: semanticStableRefs(
        row.source_item_refs,
        `${itemLabel}.source_item_refs`,
      ),
      basis_refs: semanticStableRefs(row.basis_refs, `${itemLabel}.basis_refs`),
      rationale: semanticString(row.rationale, `${itemLabel}.rationale`),
    };
  });
}
