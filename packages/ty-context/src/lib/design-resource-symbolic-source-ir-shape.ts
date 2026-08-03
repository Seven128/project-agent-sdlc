import {
  sha256,
  stableKey,
} from "./design-resource-handoff-shape-primitives.js";
import { parseSymbolicPredicate } from "./design-resource-symbolic-predicate-shape.js";
import {
  DESIGN_RESOURCE_SYMBOLIC_SOURCE_IR_SCHEMA_VERSION,
  type DesignResourceSymbolicSourceIrV1,
} from "./design-resource-symbolic-source-ir-types.js";
import { array, literal, object } from "./long-task-shape-primitives.js";

export function parseDesignResourceSymbolicSourceIr(
  value: unknown,
  label: string,
): DesignResourceSymbolicSourceIrV1 {
  const root = object(value, label, [
    "schema_version",
    "target_ref",
    "certificate_scopes",
  ]);
  return {
    schema_version: literal(
      root.schema_version,
      [DESIGN_RESOURCE_SYMBOLIC_SOURCE_IR_SCHEMA_VERSION] as const,
      `${label}.schema_version`,
    ),
    target_ref: stableKey(root.target_ref, `${label}.target_ref`),
    certificate_scopes: array(
      root.certificate_scopes,
      `${label}.certificate_scopes`,
    ).map((scope, scopeIndex) => {
      const scopeLabel = `${label}.certificate_scopes[${scopeIndex}]`;
      const row = object(scope, scopeLabel, [
        "certificate_scope_sha256",
        "rule_scope_sha256",
        "regions",
      ]);
      return {
        certificate_scope_sha256: sha256(
          row.certificate_scope_sha256,
          `${scopeLabel}.certificate_scope_sha256`,
        ),
        rule_scope_sha256: sha256(
          row.rule_scope_sha256,
          `${scopeLabel}.rule_scope_sha256`,
        ),
        regions: array(row.regions, `${scopeLabel}.regions`).map(
          (region, regionIndex) => {
            const regionLabel = `${scopeLabel}.regions[${regionIndex}]`;
            const entry = object(region, regionLabel, [
              "rule_region_sha256",
              "predicate",
            ]);
            return {
              rule_region_sha256: sha256(
                entry.rule_region_sha256,
                `${regionLabel}.rule_region_sha256`,
              ),
              predicate: parseSymbolicPredicate(
                entry.predicate,
                `${regionLabel}.predicate`,
              ),
            };
          },
        ),
      };
    }),
  };
}
