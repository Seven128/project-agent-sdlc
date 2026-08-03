import type { SymbolicDenotationPredicate } from "./symbolic-denotation-types.js";

export const DESIGN_RESOURCE_SYMBOLIC_SOURCE_IR_SCHEMA_VERSION =
  "design-resource-symbolic-source-ir-v1" as const;
export const DESIGN_RESOURCE_SYMBOLIC_SOURCE_IR_MEDIA_TYPE =
  "application/vnd.ty-context.symbolic-source-ir+json" as const;

export interface DesignResourceSymbolicSourceIrRegionV1 {
  rule_region_sha256: string;
  predicate: SymbolicDenotationPredicate;
}

export interface DesignResourceSymbolicSourceIrCertificateScopeV1 {
  certificate_scope_sha256: string;
  rule_scope_sha256: string;
  regions: DesignResourceSymbolicSourceIrRegionV1[];
}

export interface DesignResourceSymbolicSourceIrV1 {
  schema_version: typeof DESIGN_RESOURCE_SYMBOLIC_SOURCE_IR_SCHEMA_VERSION;
  target_ref: string;
  certificate_scopes: DesignResourceSymbolicSourceIrCertificateScopeV1[];
}
