import { parseDesignResourceHandoffResources } from "./design-resource-handoff-shape-structure.js";
import {
  contractKey,
  sourceItemKeys,
  stableKey,
  stableKeys,
} from "./design-resource-handoff-shape-primitives.js";
import type { DesignResourceHandoffV2 } from "./design-resource-symbolic-fact-types.js";
import { parseDesignResourceTechnicalFeasibilityInputs } from "./design-resource-implementation-feasibility-shape.js";
import {
  array,
  literal,
  object,
  repositoryFile,
  string,
  strings,
} from "./long-task-shape-primitives.js";

export {
  parseDesignResourceObservableRuleManifestJson,
  parseDesignResourceObservableRuleManifestShape,
} from "./design-resource-symbolic-manifest-shape.js";

export function parseDesignResourceSymbolicHandoffShape(
  value: unknown,
): DesignResourceHandoffV2 {
  const label = "design_resource_handoff_v2";
  const root = object(
    value,
    label,
    [
      "schema_version",
      "representation",
      "intent",
      "scope",
      "provenance",
      "resources",
      "targets",
      "coverage",
      "proposal",
    ],
    ["technical_feasibility_inputs"],
  );
  return {
    schema_version: literal(
      root.schema_version,
      ["design-resource-handoff-v2"] as const,
      `${label}.schema_version`,
    ),
    representation: literal(
      root.representation,
      ["symbolic_rules_v2"] as const,
      `${label}.representation`,
    ),
    intent: literal(
      root.intent,
      ["implementation_handoff"] as const,
      `${label}.intent`,
    ),
    scope: parseScope(root.scope, label),
    provenance: parseProvenance(root.provenance, label),
    technical_feasibility_inputs: parseDesignResourceTechnicalFeasibilityInputs(
      root.technical_feasibility_inputs ?? [],
      `${label}.technical_feasibility_inputs`,
    ),
    resources: parseDesignResourceHandoffResources(root.resources),
    targets: parseTargets(root.targets, label),
    coverage: parseCoverage(root.coverage, label),
    proposal: parseProposal(root.proposal, label),
  };
}

function parseScope(value: unknown, label: string) {
  const row = object(value, `${label}.scope`, [
    "key",
    "style_dependency",
    "surface_keys",
    "necessary_context",
    "exclusions",
  ]);
  return {
    key: contractKey(row.key, `${label}.scope.key`),
    style_dependency: literal(
      row.style_dependency,
      ["style-bearing", "non-fidelity", "mixed"] as const,
      `${label}.scope.style_dependency`,
    ),
    surface_keys: stableKeys(row.surface_keys, `${label}.scope.surface_keys`),
    necessary_context: strings(
      row.necessary_context,
      `${label}.scope.necessary_context`,
    ),
    exclusions: strings(row.exclusions, `${label}.scope.exclusions`),
  };
}

function parseProvenance(value: unknown, label: string) {
  const row = object(value, `${label}.provenance`, [
    "provider",
    "provider_version",
    "project",
    "run",
    "capability",
    "agent",
    "model",
    "design_system_id",
  ]);
  return {
    provider: string(row.provider, `${label}.provenance.provider`),
    provider_version: string(
      row.provider_version,
      `${label}.provenance.provider_version`,
    ),
    project: string(row.project, `${label}.provenance.project`),
    run: string(row.run, `${label}.provenance.run`),
    capability: string(row.capability, `${label}.provenance.capability`),
    agent: string(row.agent, `${label}.provenance.agent`),
    model: string(row.model, `${label}.provenance.model`),
    design_system_id: string(
      row.design_system_id,
      `${label}.provenance.design_system_id`,
    ),
  };
}

function parseTargets(value: unknown, label: string) {
  return array(value, `${label}.targets`).map((item, index) => {
    const itemLabel = `${label}.targets[${index}]`;
    const row = object(item, itemLabel, [
      "key",
      "interpretation",
      "resource_refs",
      "source_profile",
      "selection_basis",
    ]);
    const profile = object(row.source_profile, `${itemLabel}.source_profile`, [
      "kind",
      "entry_resource_ref",
      "dependency_resource_refs",
      "fact_manifest_resource_ref",
      "acquisition",
    ]);
    return {
      key: contractKey(row.key, `${itemLabel}.key`),
      interpretation: literal(
        row.interpretation,
        ["exact_target", "constraint"] as const,
        `${itemLabel}.interpretation`,
      ),
      resource_refs: stableKeys(
        row.resource_refs,
        `${itemLabel}.resource_refs`,
      ),
      source_profile: {
        kind: literal(
          profile.kind,
          ["implementation_web", "implementation_app", "reference"] as const,
          `${itemLabel}.source_profile.kind`,
        ),
        entry_resource_ref: stableKey(
          profile.entry_resource_ref,
          `${itemLabel}.source_profile.entry_resource_ref`,
        ),
        dependency_resource_refs: stableKeys(
          profile.dependency_resource_refs,
          `${itemLabel}.source_profile.dependency_resource_refs`,
        ),
        fact_manifest_resource_ref: stableKey(
          profile.fact_manifest_resource_ref,
          `${itemLabel}.source_profile.fact_manifest_resource_ref`,
        ),
        acquisition: literal(
          profile.acquisition,
          ["complete"] as const,
          `${itemLabel}.source_profile.acquisition`,
        ),
      },
      selection_basis: string(
        row.selection_basis,
        `${itemLabel}.selection_basis`,
      ),
    };
  });
}

function parseCoverage(value: unknown, label: string) {
  return array(value, `${label}.coverage`).map((item, index) => {
    const itemLabel = `${label}.coverage[${index}]`;
    const row = object(item, itemLabel, [
      "key",
      "target_ref",
      "subject_or_relation_refs",
      "property_refs",
      "fact_rule_refs",
      "semantic_obligation_refs",
      "certificate_refs",
      "source_item_refs",
      "rationale",
    ]);
    return {
      key: stableKey(row.key, `${itemLabel}.key`),
      target_ref: contractKey(row.target_ref, `${itemLabel}.target_ref`),
      subject_or_relation_refs: stableKeys(
        row.subject_or_relation_refs,
        `${itemLabel}.subject_or_relation_refs`,
      ),
      property_refs: stableKeys(
        row.property_refs,
        `${itemLabel}.property_refs`,
      ),
      fact_rule_refs: stableKeys(
        row.fact_rule_refs,
        `${itemLabel}.fact_rule_refs`,
      ),
      semantic_obligation_refs: stableKeys(
        row.semantic_obligation_refs,
        `${itemLabel}.semantic_obligation_refs`,
      ),
      certificate_refs: stableKeys(
        row.certificate_refs,
        `${itemLabel}.certificate_refs`,
      ),
      source_item_refs: sourceItemKeys(
        row.source_item_refs,
        `${itemLabel}.source_item_refs`,
      ),
      rationale: string(row.rationale, `${itemLabel}.rationale`),
    };
  });
}

function parseProposal(value: unknown, label: string) {
  const row = object(value, `${label}.proposal`, [
    "reconciliation_status",
    "path",
    "revision",
  ]);
  return {
    reconciliation_status: literal(
      row.reconciliation_status,
      ["applied", "returned", "not_applicable"] as const,
      `${label}.proposal.reconciliation_status`,
    ),
    path: repositoryFile(row.path, `${label}.proposal.path`),
    revision: string(row.revision, `${label}.proposal.revision`),
  };
}
