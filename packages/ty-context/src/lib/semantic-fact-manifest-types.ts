import type {
  SemanticFactAxisDispositionV1,
  SemanticFactCensusEntryV1,
  SemanticFactCellV1,
  SemanticFactConditionExclusionV1,
  SemanticFactConditionRuleV1,
  SemanticFactConditionV1,
  SemanticFactFamilyDispositionV1,
  SemanticFactInputV1,
  SemanticFactPopulationV1,
  SemanticFactPropertyDispositionV1,
  SemanticFactRelationV1,
  SemanticFactSubjectV1,
} from "./semantic-fact-inventory-types.js";
import type {
  SemanticFactBlockerV1,
  SemanticFactEnvironmentV1,
  SemanticFactOracleV1,
  SemanticFactProofObligationV1,
  SemanticFactV1,
} from "./semantic-fact-proof-types.js";

export const SEMANTIC_FACT_MANIFEST_COLLECTIONS = [
  "inputs",
  "inspector_census",
  "family_dispositions",
  "subjects",
  "relations",
  "populations",
  "axis_dispositions",
  "condition_rules",
  "conditions",
  "condition_exclusions",
  "property_dispositions",
  "fact_cells",
  "facts",
  "proof_obligations",
  "oracles",
  "environments",
  "blockers",
] as const;

export type SemanticFactManifestCollectionName =
  (typeof SEMANTIC_FACT_MANIFEST_COLLECTIONS)[number];

export interface SemanticFactManifestV1 {
  schema_version: "semantic-fact-manifest-v1";
  key: string;
  scope: {
    outcome_refs: string[];
    source_item_refs: string[];
    exclusions: Array<{
      key: string;
      statement: string;
      affected_refs: string[];
      source_item_refs: string[];
      basis_refs: string[];
      rationale: string;
    }>;
  };
  inspector: {
    trust: "frozen_executable" | "named_external_tcb";
    identity: string;
    version: string;
    implementation_sha256: string | null;
    capabilities: string[];
    traversal: "complete_enumeration";
    dynamic_discovery: "fully_enumerated";
    census: SemanticFactCensusEntryV1[];
  };
  generation: {
    strategy: "complete_explicit";
    sampling: "forbidden";
    truncation: "forbidden";
    chunk_count: number;
    chunk_indexes: number[];
    collections: Array<{
      name: SemanticFactManifestCollectionName;
      expected_count: number;
      identity_sha256: string;
    }>;
  };
  inputs: SemanticFactInputV1[];
  family_dispositions: SemanticFactFamilyDispositionV1[];
  subjects: SemanticFactSubjectV1[];
  relations: SemanticFactRelationV1[];
  populations: SemanticFactPopulationV1[];
  axis_dispositions: SemanticFactAxisDispositionV1[];
  condition_rules: SemanticFactConditionRuleV1[];
  conditions: SemanticFactConditionV1[];
  condition_exclusions: SemanticFactConditionExclusionV1[];
  property_dispositions: SemanticFactPropertyDispositionV1[];
  fact_cells: SemanticFactCellV1[];
  facts: SemanticFactV1[];
  proof_obligations: SemanticFactProofObligationV1[];
  oracles: SemanticFactOracleV1[];
  environments: SemanticFactEnvironmentV1[];
  blockers: SemanticFactBlockerV1[];
}
