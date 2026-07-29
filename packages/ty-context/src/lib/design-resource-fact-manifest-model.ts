import type {
  DesignResourceEvidenceKind,
  DesignResourceLocatorKind,
} from "./design-resource-handoff-types.js";
import type {
  DesignResourceCensusKind,
  DesignResourceInspectorCapability,
} from "./design-resource-fact-enums.js";
import type {
  DesignResourceAssetBindingV1,
  DesignResourceAxisDispositionV1,
  DesignResourceConditionCombinationDispositionV1,
  DesignResourceEnvironmentV1,
  DesignResourceFactCellV1,
  DesignResourceFactV1,
  DesignResourceLineageNodeV1,
  DesignResourceOracleV1,
  DesignResourceProofObligationV1,
  DesignResourcePropertyDefinitionV1,
  DesignResourceSubjectVariationV1,
  DesignResourceVariationAxisDispositionV1,
  DesignResourceVariationCombinationDispositionV1,
} from "./design-resource-fact-types.js";

export interface DesignResourceManifestInputResourceV1 {
  resource_ref: string;
  path: string;
  sha256: string;
}

export interface DesignResourceInspectorCensusEntryV1 {
  key: string;
  kind: DesignResourceCensusKind;
  resource_ref: string;
  locator: {
    kind: DesignResourceLocatorKind;
    value: string;
  };
  disposition: "covered" | "non_material";
  fact_refs: string[];
  fact_cell_refs: string[];
  source_item_refs: string[];
  basis_refs: string[];
  rationale: string;
}

export interface DesignResourceInspectorV1 {
  trust: "frozen_executable" | "named_external_tcb";
  identity: string;
  version: string;
  implementation_sha256: string | null;
  capability_refs: DesignResourceInspectorCapability[];
  entry_resource_ref: string;
  input_resources: DesignResourceManifestInputResourceV1[];
  traversal: "complete_enumeration";
  dynamic_discovery: "fully_enumerated";
  census: DesignResourceInspectorCensusEntryV1[];
}

export interface DesignResourceDesignSystemSnapshotV1 {
  disposition: "used" | "not_applicable";
  id: string;
  revision: string;
  resource_ref: string;
  sha256: string;
}

export const DESIGN_RESOURCE_MANIFEST_COLLECTIONS = [
  "inspector_inputs",
  "inspector_census",
  "axis_dispositions",
  "condition_exclusions",
  "conditions",
  "subjects",
  "variation_axis_dispositions",
  "variation_exclusions",
  "variations",
  "properties",
  "lineage_nodes",
  "fact_cells",
  "facts",
  "evidence",
  "proof_obligations",
  "oracles",
  "environments",
  "asset_bindings",
  "acceptance_blockers",
] as const;

export type DesignResourceManifestCollectionName =
  (typeof DESIGN_RESOURCE_MANIFEST_COLLECTIONS)[number];

export interface DesignResourceManifestGenerationV1 {
  strategy: "complete_explicit";
  sampling: "forbidden";
  truncation: "forbidden";
  chunk_count: number;
  chunk_indexes: number[];
  collections: Array<{
    name: DesignResourceManifestCollectionName;
    expected_count: number;
    identity_sha256: string;
  }>;
}

export interface DesignResourceFactManifestEvidenceV1 {
  key: string;
  resource_ref: string;
  kind: DesignResourceEvidenceKind;
  locator: {
    kind: DesignResourceLocatorKind;
    value: string;
  };
  condition_refs: string[];
}

export interface DesignResourceObservableFactManifestV1 {
  schema_version: "design-resource-observable-fact-manifest-v1";
  scope_key: string;
  target_key: string;
  inspector: DesignResourceInspectorV1;
  design_system: DesignResourceDesignSystemSnapshotV1;
  generation: DesignResourceManifestGenerationV1;
  axis_dispositions: DesignResourceAxisDispositionV1[];
  condition_exclusions: DesignResourceConditionCombinationDispositionV1[];
  conditions: import("./design-resource-handoff-types.js").DesignResourceHandoffConditionV1[];
  subjects: import("./design-resource-handoff-types.js").DesignResourceHandoffSubjectV1[];
  variation_axis_dispositions: DesignResourceVariationAxisDispositionV1[];
  variation_exclusions: DesignResourceVariationCombinationDispositionV1[];
  variations: DesignResourceSubjectVariationV1[];
  properties: DesignResourcePropertyDefinitionV1[];
  lineage_nodes: DesignResourceLineageNodeV1[];
  fact_cells: DesignResourceFactCellV1[];
  facts: DesignResourceFactV1[];
  evidence: DesignResourceFactManifestEvidenceV1[];
  proof_obligations: DesignResourceProofObligationV1[];
  oracles: DesignResourceOracleV1[];
  environments: DesignResourceEnvironmentV1[];
  asset_bindings: DesignResourceAssetBindingV1[];
  acceptance_blockers: import("./design-resource-handoff-types.js").DesignResourceHandoffBlockerV1[];
}
