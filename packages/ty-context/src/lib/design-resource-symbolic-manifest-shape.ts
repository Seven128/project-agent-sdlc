import {
  parseDesignResourceEnvironments,
  parseDesignResourceOracles,
} from "./design-resource-fact-manifest-shape-evidence.js";
import { parseDesignResourceProperties } from "./design-resource-fact-manifest-shape-facts.js";
import {
  parseDesignResourceFactManifestInspector,
  parseDesignResourceManifestDesignSystem,
} from "./design-resource-fact-manifest-shape-inspector.js";
import { parseDesignResourceHandoffBlockers } from "./design-resource-handoff-shape-evidence.js";
import {
  contractKey,
  sha256,
  sourceItemKeys,
  stableKey,
  stableKeys,
} from "./design-resource-handoff-shape-primitives.js";
import { parseDesignResourceHandoffSubjects } from "./design-resource-handoff-shape-structure.js";
import type { DesignResourceObservableRuleManifestV2 } from "./design-resource-symbolic-fact-types.js";
import { parseSymbolicStructuralApplicability } from "./design-resource-symbolic-applicability-shape.js";
import { parseSymbolicNoninterferenceProof } from "./design-resource-symbolic-noninterference-shape.js";
import {
  parseSymbolicAxisDomains,
  parseSymbolicPredicate,
} from "./design-resource-symbolic-predicate-shape.js";
import {
  parseSymbolicFactRules,
  parseSymbolicObligation,
  parseSymbolicPopulations,
  parseSymbolicQuantifier,
} from "./design-resource-symbolic-rule-shape.js";
import {
  array,
  literal,
  nullable,
  object,
  string,
} from "./long-task-shape-primitives.js";

export function parseDesignResourceObservableRuleManifestJson(
  content: string,
): DesignResourceObservableRuleManifestV2 {
  let value: unknown;
  try {
    value = JSON.parse(content);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `design_resource_symbolic_manifest_invalid:json:${message}`,
    );
  }
  return parseDesignResourceObservableRuleManifestShape(value);
}

export function parseDesignResourceObservableRuleManifestShape(
  value: unknown,
): DesignResourceObservableRuleManifestV2 {
  const label = "design_resource_symbolic_manifest";
  const root = object(
    value,
    label,
    [
      "schema_version",
      "scope_key",
      "target_key",
      "inspector",
      "design_system",
      "axis_domains",
      "reachable_region",
      "subjects",
      "populations",
      "properties",
      "fact_rules",
      "disposition_regions",
      "semantic_proof_obligations",
      "dependency_edges",
      "noninterference_certificates",
      "oracles",
      "environments",
      "acceptance_blockers",
    ],
    ["structural_applicability"],
  );
  return {
    schema_version: literal(
      root.schema_version,
      ["design-resource-observable-rule-manifest-v2"] as const,
      `${label}.schema_version`,
    ),
    scope_key: contractKey(root.scope_key, `${label}.scope_key`),
    target_key: contractKey(root.target_key, `${label}.target_key`),
    inspector: parseDesignResourceFactManifestInspector(
      root.inspector,
      `${label}.inspector`,
    ),
    design_system: parseDesignResourceManifestDesignSystem(
      root.design_system,
      `${label}.design_system`,
    ),
    axis_domains: parseSymbolicAxisDomains(
      root.axis_domains,
      `${label}.axis_domains`,
    ),
    reachable_region: parseSymbolicPredicate(
      root.reachable_region,
      `${label}.reachable_region`,
    ),
    subjects: parseDesignResourceHandoffSubjects(root.subjects),
    populations: parseSymbolicPopulations(
      root.populations,
      `${label}.populations`,
    ),
    properties: parseDesignResourceProperties(
      root.properties,
      `${label}.properties`,
    ),
    fact_rules: parseSymbolicFactRules(root.fact_rules, `${label}.fact_rules`),
    disposition_regions: parseDispositionRegions(
      root.disposition_regions,
      label,
    ),
    semantic_proof_obligations: array(
      root.semantic_proof_obligations,
      `${label}.semantic_proof_obligations`,
    ).map((item, index) =>
      parseSymbolicObligation(
        item,
        `${label}.semantic_proof_obligations[${index}]`,
      ),
    ),
    dependency_edges: parseDependencyEdges(root.dependency_edges, label),
    noninterference_certificates: parseNoninterferenceCertificates(
      root.noninterference_certificates,
      label,
    ),
    oracles: parseDesignResourceOracles(root.oracles, `${label}.oracles`),
    environments: parseDesignResourceEnvironments(
      root.environments,
      `${label}.environments`,
    ),
    acceptance_blockers: parseDesignResourceHandoffBlockers(
      root.acceptance_blockers,
    ),
    ...(root.structural_applicability === undefined
      ? {}
      : {
          structural_applicability: parseSymbolicStructuralApplicability(
            root.structural_applicability,
            `${label}.structural_applicability`,
          ),
        }),
  };
}

function parseDispositionRegions(value: unknown, label: string) {
  return array(value, `${label}.disposition_regions`).map((item, index) => {
    const itemLabel = `${label}.disposition_regions[${index}]`;
    const row = object(item, itemLabel, [
      "key",
      "subject_or_relation_ref",
      "target_ref",
      "property_ref",
      "population_ref",
      "quantifier",
      "region",
      "disposition",
      "census_refs",
      "source_item_refs",
      "basis_refs",
      "rationale",
    ]);
    return {
      key: stableKey(row.key, `${itemLabel}.key`),
      subject_or_relation_ref: stableKey(
        row.subject_or_relation_ref,
        `${itemLabel}.subject_or_relation_ref`,
      ),
      target_ref: contractKey(row.target_ref, `${itemLabel}.target_ref`),
      property_ref: stableKey(row.property_ref, `${itemLabel}.property_ref`),
      population_ref: nullable(row.population_ref, (entry) =>
        stableKey(entry, `${itemLabel}.population_ref`),
      ),
      quantifier: parseSymbolicQuantifier(
        row.quantifier,
        `${itemLabel}.quantifier`,
      ),
      region: parseSymbolicPredicate(row.region, `${itemLabel}.region`),
      disposition: literal(
        row.disposition,
        [
          "not_applicable",
          "excluded",
          "decision_required",
          "unavailable",
          "blocking",
        ] as const,
        `${itemLabel}.disposition`,
      ),
      census_refs: stableKeys(row.census_refs, `${itemLabel}.census_refs`),
      source_item_refs: sourceItemKeys(
        row.source_item_refs,
        `${itemLabel}.source_item_refs`,
      ),
      basis_refs: stableKeys(row.basis_refs, `${itemLabel}.basis_refs`),
      rationale: string(row.rationale, `${itemLabel}.rationale`),
    };
  });
}

function parseDependencyEdges(value: unknown, label: string) {
  return array(value, `${label}.dependency_edges`).map((item, index) => {
    const itemLabel = `${label}.dependency_edges[${index}]`;
    const row = object(item, itemLabel, [
      "key",
      "axis_ref",
      "fact_rule_ref",
      "effects",
    ]);
    return {
      key: stableKey(row.key, `${itemLabel}.key`),
      axis_ref: stableKey(row.axis_ref, `${itemLabel}.axis_ref`),
      fact_rule_ref: stableKey(row.fact_rule_ref, `${itemLabel}.fact_rule_ref`),
      effects: array(row.effects, `${itemLabel}.effects`).map(
        (effect, effectIndex) =>
          literal(
            effect,
            ["disposition", "expected_semantics", "proof_denotation"] as const,
            `${itemLabel}.effects[${effectIndex}]`,
          ),
      ),
    };
  });
}

function parseNoninterferenceCertificates(value: unknown, label: string) {
  return array(value, `${label}.noninterference_certificates`).map(
    (item, index) => {
      const itemLabel = `${label}.noninterference_certificates[${index}]`;
      const row = object(
        item,
        itemLabel,
        [
          "key",
          "fact_rule_refs",
          "omitted_axis_refs",
          "dependency_edge_refs",
          "canonical_rule_dag_sha256",
        ],
        ["source_noninterference_proof", "production_noninterference_proof"],
      );
      return {
        key: stableKey(row.key, `${itemLabel}.key`),
        fact_rule_refs: stableKeys(
          row.fact_rule_refs,
          `${itemLabel}.fact_rule_refs`,
        ),
        omitted_axis_refs: stableKeys(
          row.omitted_axis_refs,
          `${itemLabel}.omitted_axis_refs`,
        ),
        dependency_edge_refs: stableKeys(
          row.dependency_edge_refs,
          `${itemLabel}.dependency_edge_refs`,
        ),
        canonical_rule_dag_sha256: sha256(
          row.canonical_rule_dag_sha256,
          `${itemLabel}.canonical_rule_dag_sha256`,
        ),
        ...(row.source_noninterference_proof === undefined
          ? {}
          : {
              source_noninterference_proof: nullable(
                row.source_noninterference_proof,
                (entry) =>
                  parseSymbolicNoninterferenceProof(
                    entry,
                    `${itemLabel}.source_noninterference_proof`,
                  ),
              ),
            }),
        ...(row.production_noninterference_proof === undefined
          ? {}
          : {
              production_noninterference_proof: nullable(
                row.production_noninterference_proof,
                (entry) =>
                  parseSymbolicNoninterferenceProof(
                    entry,
                    `${itemLabel}.production_noninterference_proof`,
                  ),
              ),
            }),
      };
    },
  );
}
