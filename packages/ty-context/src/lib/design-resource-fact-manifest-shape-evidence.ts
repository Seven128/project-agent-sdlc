import {
  DESIGN_RESOURCE_ORACLE_CAPABILITIES,
  type DesignResourceAssetBindingV1,
  type DesignResourceEnvironmentV1,
  type DesignResourceOracleV1,
} from "./design-resource-fact-manifest-types.js";
import { parseDesignResourceLocatedDigest } from "./design-resource-fact-shape-primitives.js";
import {
  contractKeys,
  sha256,
  stableKey,
  stableKeys,
} from "./design-resource-handoff-shape-primitives.js";
import {
  array,
  literal,
  nullable,
  object,
  string,
} from "./long-task-shape-primitives.js";

export function parseDesignResourceOracles(
  value: unknown,
  label = "design_resource_handoff.oracles",
): DesignResourceOracleV1[] {
  return array(value, label).map((item, index) => {
    const itemLabel = `${label}[${index}]`;
    const row = object(item, itemLabel, [
      "key",
      "trust",
      "identity",
      "version",
      "sha256",
      "capability_refs",
    ]);
    return {
      key: stableKey(row.key, `${itemLabel}.key`),
      trust: literal(
        row.trust,
        ["frozen_executable", "named_external_tcb"] as const,
        `${itemLabel}.trust`,
      ),
      identity: string(row.identity, `${itemLabel}.identity`),
      version: string(row.version, `${itemLabel}.version`),
      sha256: nullable(row.sha256, (item) =>
        sha256(item, `${itemLabel}.sha256`),
      ),
      capability_refs: array(
        row.capability_refs,
        `${itemLabel}.capability_refs`,
      ).map((capability, capabilityIndex) =>
        literal(
          capability,
          DESIGN_RESOURCE_ORACLE_CAPABILITIES,
          `${itemLabel}.capability_refs[${capabilityIndex}]`,
        ),
      ),
    };
  });
}

export function parseDesignResourceEnvironments(
  value: unknown,
  label = "design_resource_handoff.environments",
): DesignResourceEnvironmentV1[] {
  return array(value, label).map((item, index) => {
    const itemLabel = `${label}[${index}]`;
    const row = object(item, itemLabel, ["key", "identity", "definition"]);
    return {
      key: stableKey(row.key, `${itemLabel}.key`),
      identity: string(row.identity, `${itemLabel}.identity`),
      definition: parseDesignResourceLocatedDigest(
        row.definition,
        `${itemLabel}.definition`,
      ),
    };
  });
}

export function parseDesignResourceAssetBindings(
  value: unknown,
  label = "design_resource_handoff.asset_bindings",
): DesignResourceAssetBindingV1[] {
  return array(value, label).map((item, index) => {
    const itemLabel = `${label}[${index}]`;
    const row = object(item, itemLabel, [
      "key",
      "asset_subject_ref",
      "resource_ref",
      "target_refs",
      "condition_refs",
      "fact_refs",
      "consumer_subject_refs",
    ]);
    return {
      key: stableKey(row.key, `${itemLabel}.key`),
      asset_subject_ref: stableKey(
        row.asset_subject_ref,
        `${itemLabel}.asset_subject_ref`,
      ),
      resource_ref: stableKey(row.resource_ref, `${itemLabel}.resource_ref`),
      target_refs: contractKeys(row.target_refs, `${itemLabel}.target_refs`),
      condition_refs: contractKeys(
        row.condition_refs,
        `${itemLabel}.condition_refs`,
      ),
      fact_refs: stableKeys(row.fact_refs, `${itemLabel}.fact_refs`),
      consumer_subject_refs: stableKeys(
        row.consumer_subject_refs,
        `${itemLabel}.consumer_subject_refs`,
      ),
    };
  });
}
