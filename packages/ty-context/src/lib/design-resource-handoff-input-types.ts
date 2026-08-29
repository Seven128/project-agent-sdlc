import type { DesignResourceHandoffV1 } from "./design-resource-handoff-types.js";
import type {
  DesignResourceHandoffV2,
  ParsedDesignResourceHandoffV2,
} from "./design-resource-symbolic-fact-types.js";

export type DesignResourceHandoffManifestBackedV1 = Pick<
  DesignResourceHandoffV1,
  | "schema_version"
  | "intent"
  | "scope"
  | "provenance"
  | "project_design_authority"
  | "technical_feasibility_inputs"
  | "resources"
  | "targets"
  | "resource_fact_closure"
  | "coverage"
  | "proposal"
> & {
  representation: "manifest_backed";
};

export type DesignResourceHandoffInputV1 =
  DesignResourceHandoffV1 | DesignResourceHandoffManifestBackedV1;

export interface ParsedDesignResourceHandoffInputV1 {
  handoff_path: string;
  handoff: DesignResourceHandoffInputV1;
  source_item_keys: string[];
  source_item_kinds: Record<string, string>;
}

export type DesignResourceHandoffInput =
  DesignResourceHandoffInputV1 | DesignResourceHandoffV2;

export type ParsedDesignResourceHandoffInput =
  ParsedDesignResourceHandoffInputV1 | ParsedDesignResourceHandoffV2;
