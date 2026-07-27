import type {
  DeliveryControlFieldCoverageV2,
  DeliveryControlFieldNameV2,
  DeliveryControlRelationClosureV2,
  DeliveryControlRelationV2,
  DeliveryControlV2,
  DeliveryObligationV2,
  DeliveryOwnerV2,
  KeyedPathV2,
  KeyedStatementV2,
} from "./long-task-delivery-types.js";
import { CONTROL_FIELD_NAMES } from "./long-task-control-fields.js";
import { parseKeyRefs } from "./long-task-applicability-shape.js";
import { parseRequiredProofSurfaces } from "./long-task-required-proof-surfaces.js";
import {
  array,
  fail,
  key,
  literal,
  object,
  repositoryFiles,
  repositoryPattern,
  repositoryPatterns,
  string,
  text,
} from "./long-task-shape-primitives.js";

export function parseKeyedStatements(
  value: unknown,
  label: string,
): KeyedStatementV2[] {
  return array(value, label).map((item, index) => {
    const itemLabel = `${label}[${index}]`;
    const row = object(item, itemLabel, ["key", "statement"]);
    return {
      key: key(row.key, `${itemLabel}.key`),
      statement: string(row.statement, `${itemLabel}.statement`),
    };
  });
}

export function parseKeyedPaths(value: unknown, label: string): KeyedPathV2[] {
  return array(value, label).map((item, index) => {
    const itemLabel = `${label}[${index}]`;
    const row = object(item, itemLabel, ["key", "path"]);
    return {
      key: key(row.key, `${itemLabel}.key`),
      path: repositoryPattern(row.path, `${itemLabel}.path`),
    };
  });
}

export function parseControls(
  value: unknown,
  label: string,
): DeliveryControlV2[] {
  return array(value, label).map((item, index) => {
    const itemLabel = `${label}[${index}]`;
    const row = object(
      item,
      itemLabel,
      ["key", "field_coverage"],
      [
        "surface",
        "region",
        "location",
        "control_type",
        "label_content",
        "user_task",
        "visibility",
        "availability",
        "trigger",
        "input",
        "validation",
        "default_value",
        "interaction",
        "navigation_result",
        "loading_state",
        "empty_state",
        "success_state",
        "failure_state",
        "recovery",
        "permission",
        "feedback",
        "accessibility",
      ],
    );
    const control: DeliveryControlV2 = {
      key: key(row.key, `${itemLabel}.key`),
      surface: optionalText(row, "surface", itemLabel),
      region: optionalText(row, "region", itemLabel),
      location: optionalText(row, "location", itemLabel),
      control_type: optionalText(row, "control_type", itemLabel),
      label_content: optionalText(row, "label_content", itemLabel),
      user_task: optionalText(row, "user_task", itemLabel),
      visibility: optionalText(row, "visibility", itemLabel),
      availability: optionalText(row, "availability", itemLabel),
      trigger: optionalText(row, "trigger", itemLabel),
      input: optionalText(row, "input", itemLabel),
      validation: optionalText(row, "validation", itemLabel),
      default_value: optionalText(row, "default_value", itemLabel),
      interaction: optionalText(row, "interaction", itemLabel),
      navigation_result: optionalText(row, "navigation_result", itemLabel),
      loading_state: optionalText(row, "loading_state", itemLabel),
      empty_state: optionalText(row, "empty_state", itemLabel),
      success_state: optionalText(row, "success_state", itemLabel),
      failure_state: optionalText(row, "failure_state", itemLabel),
      recovery: optionalText(row, "recovery", itemLabel),
      permission: optionalText(row, "permission", itemLabel),
      feedback: optionalText(row, "feedback", itemLabel),
      accessibility: optionalText(row, "accessibility", itemLabel),
      field_coverage: parseControlFieldCoverage(
        row.field_coverage,
        `${itemLabel}.field_coverage`,
      ),
    };
    validateControlFieldCoverage(control, itemLabel);
    return control;
  });
}

export function parseControlRelations(
  value: unknown,
  label: string,
): DeliveryControlRelationV2[] {
  return array(value, label).map((item, index) => {
    const itemLabel = `${label}[${index}]`;
    const row = object(item, itemLabel, [
      "key",
      "statement",
      "control_refs",
      "required_proof_surfaces",
      "applicability_refs",
    ]);
    return {
      key: key(row.key, `${itemLabel}.key`),
      statement: string(row.statement, `${itemLabel}.statement`),
      control_refs: parseKeyRefs(row.control_refs, `${itemLabel}.control_refs`),
      required_proof_surfaces: parseRequiredProofSurfaces(
        row.required_proof_surfaces,
        `${itemLabel}.required_proof_surfaces`,
      ),
      applicability_refs: parseKeyRefs(
        row.applicability_refs,
        `${itemLabel}.applicability_refs`,
      ),
    };
  });
}

export function parseControlRelationClosure(
  value: unknown,
  label: string,
): DeliveryControlRelationClosureV2 {
  const row = object(value, label, ["state", "statement"]);
  return {
    state: literal(
      row.state,
      ["specified", "not_applicable", "unresolved"] as const,
      `${label}.state`,
    ),
    statement: string(row.statement, `${label}.statement`),
  };
}

export function parseOwner(value: unknown, label: string): DeliveryOwnerV2 {
  const row = object(value, label, ["label", "context_refs", "path_globs"]);
  return {
    label: string(row.label, `${label}.label`),
    context_refs: repositoryFiles(row.context_refs, `${label}.context_refs`),
    path_globs: repositoryPatterns(row.path_globs, `${label}.path_globs`),
  };
}

export function parseObligations(
  value: unknown,
  label: string,
): DeliveryObligationV2[] {
  return array(value, label).map((item, index) => {
    const itemLabel = `${label}[${index}]`;
    const row = object(item, itemLabel, [
      "key",
      "statement",
      "required_proof_surfaces",
      "applicability_refs",
    ]);
    return {
      key: key(row.key, `${itemLabel}.key`),
      statement: string(row.statement, `${itemLabel}.statement`),
      required_proof_surfaces: parseRequiredProofSurfaces(
        row.required_proof_surfaces,
        `${itemLabel}.required_proof_surfaces`,
      ),
      applicability_refs: parseKeyRefs(
        row.applicability_refs,
        `${itemLabel}.applicability_refs`,
      ),
    };
  });
}

function parseControlFieldCoverage(
  value: unknown,
  label: string,
): DeliveryControlFieldCoverageV2[] {
  return array(value, label).map((item, index) => {
    const itemLabel = `${label}[${index}]`;
    const row = object(
      item,
      itemLabel,
      ["fields", "state"],
      ["statement", "applicability_refs"],
    );
    const fields = array(row.fields, `${itemLabel}.fields`).map(
      (field, fieldIndex) =>
        literal(
          field,
          CONTROL_FIELD_NAMES,
          `${itemLabel}.fields[${fieldIndex}]`,
        ),
    );
    if (!fields.length) fail(`${itemLabel}.fields`, "must not be empty");
    const state = literal(
      row.state,
      ["specified", "not_applicable", "unresolved"] as const,
      `${itemLabel}.state`,
    );
    if (state === "specified") {
      if (Object.hasOwn(row, "statement"))
        fail(`${itemLabel}.statement`, "forbidden for specified fields");
      return {
        fields,
        state,
        applicability_refs: parseRequiredApplicabilityRefs(row, itemLabel),
      };
    }
    const statement = string(row.statement, `${itemLabel}.statement`);
    if (state === "not_applicable")
      return {
        fields,
        state,
        statement,
        applicability_refs: parseRequiredApplicabilityRefs(row, itemLabel),
      };
    if (
      Object.hasOwn(row, "applicability_refs") &&
      array(row.applicability_refs, `${itemLabel}.applicability_refs`).length
    )
      fail(`${itemLabel}.applicability_refs`, "must be empty while unresolved");
    return { fields, state, statement, applicability_refs: [] };
  });
}

function parseRequiredApplicabilityRefs(
  row: Record<string, unknown>,
  label: string,
): string[] {
  const refs = parseKeyRefs(
    row.applicability_refs,
    `${label}.applicability_refs`,
  );
  if (!refs.length) fail(`${label}.applicability_refs`, "must not be empty");
  return refs;
}

function validateControlFieldCoverage(
  control: DeliveryControlV2,
  label: string,
): void {
  const owners = new Map<DeliveryControlFieldNameV2, number>();
  for (const [index, entry] of control.field_coverage.entries()) {
    for (const field of entry.fields) {
      const previous = owners.get(field);
      if (previous !== undefined)
        fail(
          `${label}.field_coverage[${index}].fields`,
          `field ${field} already owned by entry ${previous}`,
        );
      owners.set(field, index);
      const hasStatement = Boolean(control[field].trim());
      if (entry.state === "specified" && !hasStatement)
        fail(
          `${label}.${field}`,
          "must be non-empty when field state is specified",
        );
      if (entry.state !== "specified" && hasStatement)
        fail(
          `${label}.${field}`,
          `must be empty when field state is ${entry.state}`,
        );
    }
  }
  const missing = CONTROL_FIELD_NAMES.filter((field) => !owners.has(field));
  if (missing.length)
    fail(`${label}.field_coverage`, `missing fields ${missing.join(",")}`);
}

function optionalText(
  row: Record<string, unknown>,
  field: string,
  label: string,
): string {
  return Object.hasOwn(row, field) ? text(row[field], `${label}.${field}`) : "";
}
