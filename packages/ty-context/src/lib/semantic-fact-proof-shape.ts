import {
  EVIDENCE_CAPABILITIES,
  PROOF_SURFACES,
} from "./long-task-shape-primitives.js";
import { SEMANTIC_FACT_VALUE_KINDS } from "./semantic-fact-shape-constants.js";
import {
  semanticArray,
  semanticLiteral,
  semanticNullable,
  semanticNullableNumber,
  semanticObject,
  semanticStableRef,
  semanticStableRefs,
  semanticString,
} from "./semantic-fact-shape-primitives.js";
import { parseSemanticFactLocatedValue } from "./semantic-fact-value-shape.js";

export function parseSemanticFacts(value: unknown, label: string) {
  return semanticArray(value, label).map((item, index) => {
    const itemLabel = `${label}[${index}]`;
    const row = semanticObject(item, itemLabel, [
      "key",
      "cell_ref",
      "outcome_ref",
      "unit_ref",
      "family_ref",
      "condition_ref",
      "property_ref",
      "owner_ref",
      "value_kind",
      "observation_scope",
      "observation_sensitivity",
      "quantifier",
      "expected",
      "provenance",
      "source_item_refs",
    ]);
    const quantifier = semanticObject(
      row.quantifier,
      `${itemLabel}.quantifier`,
      ["kind", "minimum", "maximum", "population_ref"],
    );
    const provenance = semanticObject(
      row.provenance,
      `${itemLabel}.provenance`,
      ["kind", "authority_ref", "basis_refs", "derivation"],
    );
    return {
      key: semanticStableRef(row.key, `${itemLabel}.key`),
      cell_ref: semanticStableRef(row.cell_ref, `${itemLabel}.cell_ref`),
      outcome_ref: semanticStableRef(
        row.outcome_ref,
        `${itemLabel}.outcome_ref`,
      ),
      unit_ref: semanticStableRef(row.unit_ref, `${itemLabel}.unit_ref`),
      family_ref: semanticStableRef(row.family_ref, `${itemLabel}.family_ref`),
      condition_ref: semanticStableRef(
        row.condition_ref,
        `${itemLabel}.condition_ref`,
      ),
      property_ref: semanticStableRef(
        row.property_ref,
        `${itemLabel}.property_ref`,
      ),
      owner_ref: semanticStableRef(row.owner_ref, `${itemLabel}.owner_ref`),
      value_kind: semanticLiteral(
        row.value_kind,
        SEMANTIC_FACT_VALUE_KINDS,
        `${itemLabel}.value_kind`,
      ),
      observation_scope: semanticLiteral(
        row.observation_scope,
        [
          "product_boundary",
          "service_boundary",
          "data_boundary",
          "security_boundary",
          "operational_boundary",
          "implementation_structure",
          "external_boundary",
        ] as const,
        `${itemLabel}.observation_scope`,
      ),
      observation_sensitivity: semanticLiteral(
        row.observation_sensitivity,
        ["plain", "protected"] as const,
        `${itemLabel}.observation_sensitivity`,
      ),
      quantifier: {
        kind: semanticLiteral(
          quantifier.kind,
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
          `${itemLabel}.quantifier.kind`,
        ),
        minimum: semanticNullableNumber(
          quantifier.minimum,
          `${itemLabel}.quantifier.minimum`,
        ),
        maximum: semanticNullableNumber(
          quantifier.maximum,
          `${itemLabel}.quantifier.maximum`,
        ),
        population_ref: semanticNullable(quantifier.population_ref, (entry) =>
          semanticStableRef(entry, `${itemLabel}.quantifier.population_ref`),
        ),
      },
      expected: parseSemanticFactLocatedValue(
        row.expected,
        `${itemLabel}.expected`,
      ),
      provenance: {
        kind: semanticLiteral(
          provenance.kind,
          [
            "direct",
            "logically_derived",
            "explicitly_delegated",
            "evidence_backed_preservation",
          ] as const,
          `${itemLabel}.provenance.kind`,
        ),
        authority_ref: semanticStableRef(
          provenance.authority_ref,
          `${itemLabel}.provenance.authority_ref`,
        ),
        basis_refs: semanticStableRefs(
          provenance.basis_refs,
          `${itemLabel}.provenance.basis_refs`,
        ),
        derivation: semanticNullable(provenance.derivation, (entry) =>
          semanticString(entry, `${itemLabel}.provenance.derivation`),
        ),
      },
      source_item_refs: semanticStableRefs(
        row.source_item_refs,
        `${itemLabel}.source_item_refs`,
      ),
    };
  });
}

export function parseSemanticFactProofObligations(
  value: unknown,
  label: string,
) {
  return semanticArray(value, label).map((item, index) => {
    const itemLabel = `${label}[${index}]`;
    const row = semanticObject(item, itemLabel, [
      "key",
      "fact_ref",
      "method",
      "authority",
      "proof_surface",
      "evidence_capabilities",
      "comparison",
      "oracle_ref",
      "environment_ref",
      "observer_refs",
      "counterfactual",
    ]);
    const comparison = semanticObject(
      row.comparison,
      `${itemLabel}.comparison`,
      ["comparator", "mode", "parameters", "tolerance", "mask"],
    );
    const counterfactual = semanticObject(
      row.counterfactual,
      `${itemLabel}.counterfactual`,
      ["disposition", "refs", "basis_refs", "rationale"],
    );
    return {
      key: semanticStableRef(row.key, `${itemLabel}.key`),
      fact_ref: semanticStableRef(row.fact_ref, `${itemLabel}.fact_ref`),
      method: semanticStableRef(row.method, `${itemLabel}.method`),
      authority: semanticLiteral(
        row.authority,
        ["machine", "external_confirmation"] as const,
        `${itemLabel}.authority`,
      ),
      proof_surface: semanticLiteral(
        row.proof_surface,
        PROOF_SURFACES,
        `${itemLabel}.proof_surface`,
      ),
      evidence_capabilities: semanticArray(
        row.evidence_capabilities,
        `${itemLabel}.evidence_capabilities`,
      ).map((entry, capabilityIndex) =>
        semanticLiteral(
          entry,
          EVIDENCE_CAPABILITIES,
          `${itemLabel}.evidence_capabilities[${capabilityIndex}]`,
        ),
      ),
      comparison: {
        comparator: semanticStableRef(
          comparison.comparator,
          `${itemLabel}.comparison.comparator`,
        ),
        mode: semanticLiteral(
          comparison.mode,
          ["exact", "tolerance"] as const,
          `${itemLabel}.comparison.mode`,
        ),
        parameters: parseSemanticFactLocatedValue(
          comparison.parameters,
          `${itemLabel}.comparison.parameters`,
        ),
        tolerance: semanticNullable(comparison.tolerance, (entry) =>
          parseSemanticFactLocatedValue(
            entry,
            `${itemLabel}.comparison.tolerance`,
          ),
        ),
        mask: semanticNullable(comparison.mask, (entry) =>
          parseSemanticFactLocatedValue(entry, `${itemLabel}.comparison.mask`),
        ),
      },
      oracle_ref: semanticStableRef(row.oracle_ref, `${itemLabel}.oracle_ref`),
      environment_ref: semanticStableRef(
        row.environment_ref,
        `${itemLabel}.environment_ref`,
      ),
      observer_refs: semanticStableRefs(
        row.observer_refs,
        `${itemLabel}.observer_refs`,
      ),
      counterfactual: {
        disposition: semanticLiteral(
          counterfactual.disposition,
          ["required", "not_applicable", "external"] as const,
          `${itemLabel}.counterfactual.disposition`,
        ),
        refs: semanticStableRefs(
          counterfactual.refs,
          `${itemLabel}.counterfactual.refs`,
        ),
        basis_refs: semanticStableRefs(
          counterfactual.basis_refs,
          `${itemLabel}.counterfactual.basis_refs`,
        ),
        rationale: semanticString(
          counterfactual.rationale,
          `${itemLabel}.counterfactual.rationale`,
        ),
      },
    };
  });
}
