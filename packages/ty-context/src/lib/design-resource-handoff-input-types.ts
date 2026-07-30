import type { DesignResourceHandoffV1 } from "./design-resource-handoff-types.js";

export type DesignResourceHandoffManifestBackedV1 = Pick<
  DesignResourceHandoffV1,
  | "schema_version"
  | "intent"
  | "scope"
  | "provenance"
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
