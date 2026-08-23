import {
  digest,
  literal,
  object,
  oneOf,
  parseStrictJsonObject,
} from "./design-resource-recovery-codec-primitives.js";
import {
  contractKey,
  stableKey,
} from "./design-resource-handoff-shape-primitives.js";
import { invalidFeasibility } from "./design-resource-implementation-feasibility-validation-support.js";
import { canonicalValueJson } from "./strict-codec.js";

export const DESIGN_RESOURCE_FEASIBILITY_DECISION_SCHEMA =
  "design-resource-feasibility-decision-v1" as const;

const DECISION_MARKER = "ty-design-feasibility-decision-v1";

export type DesignResourceFeasibilityDecisionProjection =
  | DesignResourceRequiredRealizationProjection
  | DesignResourcePlannedOwnerProjection
  | DesignResourceFeasibilityBlockerProjection;

interface DesignResourceFeasibilityDecisionProjectionBase {
  schema_version: typeof DESIGN_RESOURCE_FEASIBILITY_DECISION_SCHEMA;
  target_ref: string;
  component_family_ref: string;
  condition_scope_sha256: string;
}

export interface DesignResourceRequiredRealizationProjection extends DesignResourceFeasibilityDecisionProjectionBase {
  mode: "required_realization";
  realization_ref: string;
}

export interface DesignResourcePlannedOwnerProjection extends DesignResourceFeasibilityDecisionProjectionBase {
  mode: "planned_owner_authorization";
  owner_locator: string;
}

export interface DesignResourceFeasibilityBlockerProjection extends DesignResourceFeasibilityDecisionProjectionBase {
  mode: "feasibility_blocker";
  blocker_ref: string;
}

export function parseDesignResourceFeasibilityDecisionProjections(
  sourcePath: string,
  sourceItemKey: string,
  normalizedText: string,
): DesignResourceFeasibilityDecisionProjection[] {
  const projections: DesignResourceFeasibilityDecisionProjection[] = [];
  for (const [index, line] of normalizedText.split("\n").entries()) {
    if (!line.includes(DECISION_MARKER)) continue;
    const match = /^<!-- ty-design-feasibility-decision-v1 (\{.*\}) -->$/u.exec(
      line,
    );
    if (!match)
      invalidFeasibility(
        "source_decision_marker_invalid",
        `${sourcePath}:${sourceItemKey}:${index + 1}`,
      );
    try {
      projections.push(
        parseDecisionProjection(
          match[1],
          `${sourcePath}:${sourceItemKey}:${index + 1}`,
        ),
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
        "source_decision_projection_invalid",
        `${sourcePath}:${sourceItemKey}:${index + 1}:${message(error)}`,
      );
    }
  }
  const identities = projections.map((projection) =>
    canonicalValueJson(projection),
  );
  if (new Set(identities).size !== identities.length)
    invalidFeasibility(
      "source_decision_projection_duplicate",
      `${sourcePath}:${sourceItemKey}`,
    );
  return projections;
}

function parseDecisionProjection(
  content: string,
  label: string,
): DesignResourceFeasibilityDecisionProjection {
  const parsed = parseStrictJsonObject(
    content,
    `feasibility_decision_projection:${label}`,
  );
  const header = object(
    parsed,
    `feasibility_decision_projection:${label}`,
    [
      "schema_version",
      "mode",
      "target_ref",
      "component_family_ref",
      "condition_scope_sha256",
    ],
    ["realization_ref", "owner_locator", "blocker_ref"],
  );
  literal(
    header.schema_version,
    DESIGN_RESOURCE_FEASIBILITY_DECISION_SCHEMA,
    `${label}.schema_version`,
  );
  const mode = oneOf(
    header.mode,
    [
      "required_realization",
      "planned_owner_authorization",
      "feasibility_blocker",
    ] as const,
    `${label}.mode`,
  );
  const base = {
    schema_version: DESIGN_RESOURCE_FEASIBILITY_DECISION_SCHEMA,
    target_ref: contractKey(header.target_ref, `${label}.target_ref`),
    component_family_ref: stableKey(
      header.component_family_ref,
      `${label}.component_family_ref`,
    ),
    condition_scope_sha256: digest(
      header.condition_scope_sha256,
      `${label}.condition_scope_sha256`,
    ),
  };
  if (mode === "required_realization") {
    const row = object(parsed, label, [
      "schema_version",
      "mode",
      "target_ref",
      "component_family_ref",
      "condition_scope_sha256",
      "realization_ref",
    ]);
    return {
      ...base,
      mode,
      realization_ref: stableKey(
        row.realization_ref,
        `${label}.realization_ref`,
      ),
    };
  }
  if (mode === "planned_owner_authorization") {
    const row = object(parsed, label, [
      "schema_version",
      "mode",
      "target_ref",
      "component_family_ref",
      "condition_scope_sha256",
      "owner_locator",
    ]);
    return {
      ...base,
      mode,
      owner_locator: stableKey(row.owner_locator, `${label}.owner_locator`),
    };
  }
  const row = object(parsed, label, [
    "schema_version",
    "mode",
    "target_ref",
    "component_family_ref",
    "condition_scope_sha256",
    "blocker_ref",
  ]);
  return {
    ...base,
    mode,
    blocker_ref: stableKey(row.blocker_ref, `${label}.blocker_ref`),
  };
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
