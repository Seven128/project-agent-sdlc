import { SEMANTIC_FACT_DISPOSITIONS } from "./semantic-fact-shape-constants.js";
import {
  semanticArray,
  semanticLiteral,
  semanticObject,
  semanticSha256,
  semanticStableRef,
  semanticStableRefs,
  semanticString,
} from "./semantic-fact-shape-primitives.js";
import {
  parseSemanticFactBoolean,
  parseSemanticFactLocator,
} from "./semantic-fact-value-shape.js";

export function parseSemanticFactCensus(value: unknown, label: string) {
  return semanticArray(value, label).map((item, index) => {
    const itemLabel = `${label}[${index}]`;
    const row = semanticObject(item, itemLabel, [
      "key",
      "kind",
      "locator",
      "identity_sha256",
      "disposition",
      "fact_refs",
      "basis_refs",
      "rationale",
    ]);
    return {
      key: semanticStableRef(row.key, `${itemLabel}.key`),
      kind: semanticLiteral(
        row.kind,
        [
          "input",
          "scope_exclusion",
          "family",
          "subject",
          "relation",
          "population",
          "axis",
          "axis_value",
          "condition_rule",
          "condition",
          "property",
          "fact_cell",
          "fact",
          "proof_obligation",
          "oracle",
          "environment",
          "blocker",
          "custom",
        ] as const,
        `${itemLabel}.kind`,
      ),
      locator: parseSemanticFactLocator(row.locator, `${itemLabel}.locator`),
      identity_sha256: semanticSha256(
        row.identity_sha256,
        `${itemLabel}.identity_sha256`,
      ),
      disposition: semanticLiteral(
        row.disposition,
        ["material_with_facts", "supporting_only"] as const,
        `${itemLabel}.disposition`,
      ),
      fact_refs: semanticStableRefs(row.fact_refs, `${itemLabel}.fact_refs`),
      basis_refs: semanticStableRefs(row.basis_refs, `${itemLabel}.basis_refs`),
      rationale: semanticString(row.rationale, `${itemLabel}.rationale`),
    };
  });
}

export function parseSemanticFactInputs(value: unknown, label: string) {
  return semanticArray(value, label).map((item, index) => {
    const itemLabel = `${label}[${index}]`;
    const row = semanticObject(
      item,
      itemLabel,
      [
        "key",
        "kind",
        "source_ref",
        "sha256",
        "disposition",
        "fact_refs",
        "basis_refs",
        "rationale",
      ],
      ["supporting_relation"],
    );
    return {
      key: semanticStableRef(row.key, `${itemLabel}.key`),
      kind: semanticLiteral(
        row.kind,
        [
          "source_item",
          "context",
          "attachment",
          "canonical_spec",
          "repository_preservation",
          "external_constraint",
          "delegated_instruction",
          "design_resource",
          "source_fragment",
          "semantic_anchor",
        ] as const,
        `${itemLabel}.kind`,
      ),
      source_ref: semanticString(row.source_ref, `${itemLabel}.source_ref`),
      sha256: semanticSha256(row.sha256, `${itemLabel}.sha256`),
      disposition: semanticLiteral(
        row.disposition,
        [
          "non_ui_material",
          "ui_design",
          "supporting_only",
          "excluded_by_scope",
          "fact_bearing",
          "supporting_basis",
          "superseded",
          "decision_required",
          "scope_excluded",
        ] as const,
        `${itemLabel}.disposition`,
      ),
      fact_refs: semanticStableRefs(row.fact_refs, `${itemLabel}.fact_refs`),
      basis_refs: semanticStableRefs(row.basis_refs, `${itemLabel}.basis_refs`),
      rationale: semanticString(row.rationale, `${itemLabel}.rationale`),
      ...(row.supporting_relation === undefined
        ? {}
        : {
            supporting_relation: parseSupportingRelation(
              row.supporting_relation,
              `${itemLabel}.supporting_relation`,
            ),
          }),
    };
  });
}

function parseSupportingRelation(value: unknown, label: string) {
  const row = semanticObject(value, label, [
    "kind",
    "fact_ref",
    "fact_cell_ref",
  ]);
  return {
    kind: semanticLiteral(
      row.kind,
      ["same_semantic_cell_non_normative"] as const,
      `${label}.kind`,
    ),
    fact_ref: semanticStableRef(row.fact_ref, `${label}.fact_ref`),
    fact_cell_ref: semanticStableRef(
      row.fact_cell_ref,
      `${label}.fact_cell_ref`,
    ),
  };
}

export function parseSemanticFactFamilyDispositions(
  value: unknown,
  label: string,
) {
  return semanticArray(value, label).map((item, index) => {
    const itemLabel = `${label}[${index}]`;
    const row = semanticObject(item, itemLabel, [
      "key",
      "family",
      "standard",
      "disposition",
      "outcome_refs",
      "source_item_refs",
      "basis_refs",
      "rationale",
    ]);
    return {
      key: semanticStableRef(row.key, `${itemLabel}.key`),
      family: semanticStableRef(row.family, `${itemLabel}.family`),
      standard: parseSemanticFactBoolean(row.standard, `${itemLabel}.standard`),
      disposition: semanticLiteral(
        row.disposition,
        SEMANTIC_FACT_DISPOSITIONS,
        `${itemLabel}.disposition`,
      ),
      outcome_refs: semanticStableRefs(
        row.outcome_refs,
        `${itemLabel}.outcome_refs`,
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
