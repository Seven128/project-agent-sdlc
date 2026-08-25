import {
  validateSemanticFactGeneration,
  validateSemanticFactInspector,
  validateSemanticFactSourceLineage,
  validateSemanticFactUniqueIdentities,
} from "./semantic-fact-policy-authority.js";
import { validateSemanticFactInspectorCensus } from "./semantic-fact-policy-census.js";
import { validateSemanticFactAxisAndConditionClosure } from "./semantic-fact-policy-conditions.js";
import { validateSemanticFactClosure } from "./semantic-fact-policy-facts.js";
import { semanticFactInvalid } from "./semantic-fact-policy-primitives.js";
import { validateSemanticFactProofClosure } from "./semantic-fact-policy-proofs.js";
import { validateSemanticFactPropertyClosure } from "./semantic-fact-policy-properties.js";
import {
  validateSemanticFactFamilyClosure,
  validateSemanticFactUnits,
} from "./semantic-fact-policy-units.js";
import type { SemanticFactManifestV1 } from "./semantic-fact-types.js";

export { semanticFactCollectionIdentity } from "./semantic-fact-policy-authority.js";

export interface SemanticFactManifestIndexV1 {
  family_by_ref: Map<
    string,
    SemanticFactManifestV1["family_dispositions"][number]
  >;
  unit_by_ref: Map<
    string,
    | SemanticFactManifestV1["subjects"][number]
    | SemanticFactManifestV1["relations"][number]
    | SemanticFactManifestV1["populations"][number]
  >;
  condition_by_ref: Map<string, SemanticFactManifestV1["conditions"][number]>;
  property_by_ref: Map<
    string,
    SemanticFactManifestV1["property_dispositions"][number]
  >;
  fact_by_ref: Map<string, SemanticFactManifestV1["facts"][number]>;
  proof_by_ref: Map<
    string,
    SemanticFactManifestV1["proof_obligations"][number]
  >;
  oracle_by_ref: Map<string, SemanticFactManifestV1["oracles"][number]>;
  environment_by_ref: Map<
    string,
    SemanticFactManifestV1["environments"][number]
  >;
}

export function validateSemanticFactManifestPolicy(
  manifest: SemanticFactManifestV1,
  externalFactRefs: ReadonlySet<string> = new Set(),
): SemanticFactManifestIndexV1 {
  validateSemanticFactUniqueIdentities(manifest);
  validateSemanticFactGeneration(manifest);
  validateSemanticFactInspector(manifest);
  validateSemanticFactSourceLineage(manifest);
  validateSemanticFactFamilyClosure(manifest);
  const units = validateSemanticFactUnits(manifest);
  validateSemanticFactAxisAndConditionClosure(manifest);
  validateSemanticFactPropertyClosure(manifest, units);
  validateSemanticFactClosure(manifest, units);
  validateSemanticFactProofClosure(manifest);
  validateSemanticFactInspectorCensus(manifest, externalFactRefs);
  if (manifest.blockers.length)
    semanticFactInvalid(
      "blockers_present",
      manifest.blockers
        .map((item) => item.key)
        .sort()
        .join(","),
    );
  return {
    family_by_ref: new Map(
      manifest.family_dispositions.map((item) => [item.key, item]),
    ),
    unit_by_ref: units,
    condition_by_ref: new Map(
      manifest.conditions.map((item) => [item.key, item]),
    ),
    property_by_ref: new Map(
      manifest.property_dispositions.map((item) => [item.key, item]),
    ),
    fact_by_ref: new Map(manifest.facts.map((item) => [item.key, item])),
    proof_by_ref: new Map(
      manifest.proof_obligations.map((item) => [item.key, item]),
    ),
    oracle_by_ref: new Map(manifest.oracles.map((item) => [item.key, item])),
    environment_by_ref: new Map(
      manifest.environments.map((item) => [item.key, item]),
    ),
  };
}

export const complete_non_ui_semantic_fact_delivery =
  "expected=source=contract;proofs=current";
export const NO_UI_CONTROL_RELATIONS = true;
export const NO_SEMANTIC_FACT_SHORTCUTS = true;
export const SEMANTIC_INVENTORY_IS_NOT_COMPLETION = true;
