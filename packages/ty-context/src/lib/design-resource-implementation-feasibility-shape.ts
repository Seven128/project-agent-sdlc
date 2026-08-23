import {
  DESIGN_RESOURCE_SUBSTRATE_OBSERVATION_KINDS,
  DESIGN_RESOURCE_TECHNICAL_SOURCE_ROLES,
  type DesignResourceImplementationFeasibilityV1,
  type DesignResourceSubstrateObservationValueV1,
  type DesignResourceTechnicalFeasibilityInputV1,
} from "./design-resource-implementation-feasibility-types.js";
import {
  parseBlockers,
  parseComponentFamilyCells,
  parseConditionModel,
} from "./design-resource-implementation-feasibility-shape-sections.js";
import { invalidFeasibility } from "./design-resource-implementation-feasibility-validation-support.js";
import {
  contractKey,
  sha256,
  stableKey,
  stableKeys,
} from "./design-resource-handoff-shape-primitives.js";
import {
  array,
  literal,
  nullable,
  object,
  repositoryFile,
  string,
} from "./long-task-shape-primitives.js";
import { parseStrictYaml } from "./strict-codec.js";

export function parseDesignResourceTechnicalFeasibilityInputs(
  value: unknown,
  label = "design_resource_handoff.technical_feasibility_inputs",
): DesignResourceTechnicalFeasibilityInputV1[] {
  return array(value, label).map((item, index) => {
    const itemLabel = `${label}[${index}]`;
    const row = object(item, itemLabel, [
      "key",
      "target_ref",
      "path",
      "media_type",
      "sha256",
    ]);
    return {
      key: stableKey(row.key, `${itemLabel}.key`),
      target_ref: contractKey(row.target_ref, `${itemLabel}.target_ref`),
      path: repositoryFile(row.path, `${itemLabel}.path`),
      media_type: literal(
        row.media_type,
        ["application/json"] as const,
        `${itemLabel}.media_type`,
      ),
      sha256: sha256(row.sha256, `${itemLabel}.sha256`),
    };
  });
}

export function parseDesignResourceImplementationFeasibilityJson(
  content: string,
): DesignResourceImplementationFeasibilityV1 {
  try {
    JSON.parse(content);
  } catch (error) {
    invalidFeasibility(
      "json",
      error instanceof Error ? error.message : String(error),
    );
  }
  try {
    return parseDesignResourceImplementationFeasibilityShape(
      parseStrictYaml(content),
    );
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.startsWith(
        "design_resource_implementation_feasibility_invalid:",
      )
    )
      throw error;
    invalidFeasibility(
      "shape",
      error instanceof Error ? error.message : String(error),
    );
  }
}

export function parseDesignResourceImplementationFeasibilityShape(
  value: unknown,
): DesignResourceImplementationFeasibilityV1 {
  const label = "implementation_feasibility";
  const root = object(value, label, [
    "schema_version",
    "key",
    "target_ref",
    "realization_mode",
    "source_records",
    "substrate_observations",
    "condition_model",
    "component_family_cells",
    "blockers",
  ]);
  return {
    schema_version: literal(
      root.schema_version,
      ["design-resource-implementation-feasibility-v1"] as const,
      `${label}.schema_version`,
    ),
    key: stableKey(root.key, `${label}.key`),
    target_ref: contractKey(root.target_ref, `${label}.target_ref`),
    realization_mode: literal(
      root.realization_mode,
      ["native_substrate", "mapped_substrate", "reference"] as const,
      `${label}.realization_mode`,
    ),
    source_records: parseSourceRecords(root.source_records, label),
    substrate_observations: parseSubstrateObservations(
      root.substrate_observations,
      label,
    ),
    condition_model: parseConditionModel(root.condition_model, label),
    component_family_cells: parseComponentFamilyCells(
      root.component_family_cells,
      label,
    ),
    blockers: parseBlockers(root.blockers, label),
  };
}

function parseSourceRecords(value: unknown, label: string) {
  return array(value, `${label}.source_records`).map((item, index) => {
    const itemLabel = `${label}.source_records[${index}]`;
    const row = object(item, itemLabel, [
      "key",
      "path",
      "media_type",
      "sha256",
      "locator",
      "roles",
    ]);
    const locator = object(row.locator, `${itemLabel}.locator`, [
      "kind",
      "value",
    ]);
    const kind = literal(
      locator.kind,
      [
        "whole_resource",
        "json_pointer",
        "markdown_anchor",
        "source_anchor",
      ] as const,
      `${itemLabel}.locator.kind`,
    );
    const locatorValue = string(locator.value, `${itemLabel}.locator.value`);
    if (kind === "whole_resource" && locatorValue !== ".")
      invalidFeasibility(
        `${itemLabel}.locator.value`,
        "whole_resource_must_be_dot",
      );
    if (kind === "json_pointer" && !locatorValue.startsWith("/"))
      invalidFeasibility(
        `${itemLabel}.locator.value`,
        "json_pointer_must_start_with_slash",
      );
    const parsedLocator =
      kind === "whole_resource"
        ? ({ kind, value: "." } as const)
        : kind === "json_pointer"
          ? ({ kind, value: locatorValue } as const)
          : ({ kind, value: locatorValue } as const);
    return {
      key: stableKey(row.key, `${itemLabel}.key`),
      path: repositoryFile(row.path, `${itemLabel}.path`),
      media_type: string(row.media_type, `${itemLabel}.media_type`),
      sha256: sha256(row.sha256, `${itemLabel}.sha256`),
      locator: parsedLocator,
      roles: array(row.roles, `${itemLabel}.roles`).map((role, roleIndex) =>
        literal(
          role,
          DESIGN_RESOURCE_TECHNICAL_SOURCE_ROLES,
          `${itemLabel}.roles[${roleIndex}]`,
        ),
      ),
    };
  });
}

function parseSubstrateObservations(value: unknown, label: string) {
  return array(value, `${label}.substrate_observations`).map((item, index) => {
    const itemLabel = `${label}.substrate_observations[${index}]`;
    const row = object(item, itemLabel, [
      "kind",
      "disposition",
      "value",
      "source_record_refs",
      "reason",
    ]);
    return {
      kind: literal(
        row.kind,
        DESIGN_RESOURCE_SUBSTRATE_OBSERVATION_KINDS,
        `${itemLabel}.kind`,
      ),
      disposition: literal(
        row.disposition,
        [
          "observed",
          "not_applicable",
          "decision_required",
          "unavailable",
        ] as const,
        `${itemLabel}.disposition`,
      ),
      value: nullable(row.value, (entry) =>
        parseObservationValue(entry, `${itemLabel}.value`),
      ),
      source_record_refs: stableKeys(
        row.source_record_refs,
        `${itemLabel}.source_record_refs`,
      ),
      reason: nullable(row.reason, (entry) =>
        string(entry, `${itemLabel}.reason`),
      ),
    };
  });
}

function parseObservationValue(
  value: unknown,
  label: string,
): DesignResourceSubstrateObservationValueV1 {
  const kind = object(
    value,
    label,
    ["kind"],
    ["name", "version_source_ref", "paths"],
  ).kind;
  if (kind === "identifier") {
    const row = object(value, label, ["kind", "name", "version_source_ref"]);
    return {
      kind: literal(row.kind, ["identifier"] as const, `${label}.kind`),
      name: stableKey(row.name, `${label}.name`),
      version_source_ref: nullable(row.version_source_ref, (entry) =>
        stableKey(entry, `${label}.version_source_ref`),
      ),
    };
  }
  const row = object(value, label, ["kind", "paths"]);
  return {
    kind: literal(row.kind, ["repository_paths"] as const, `${label}.kind`),
    paths: array(row.paths, `${label}.paths`).map((item, index) =>
      repositoryFile(item, `${label}.paths[${index}]`),
    ),
  };
}
