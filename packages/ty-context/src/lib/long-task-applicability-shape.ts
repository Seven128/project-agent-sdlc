import type {
  ApplicableKeyedStatementV2,
  ClaimApplicabilityV2,
} from "./long-task-semantic-contract-types.js";
import {
  array,
  key,
  literal,
  object,
  string,
  strings,
} from "./long-task-shape-primitives.js";

const JOURNEY_ROLES = [
  "success",
  "degradation",
  "recovery",
  "stage_gate",
  "conformance",
] as const;

export function parseClaimApplicability(
  value: unknown,
  label: string,
): ClaimApplicabilityV2[] {
  return array(value, label).map((item, index) => {
    const itemLabel = `${label}[${index}]`;
    const row = object(item, itemLabel, [
      "key",
      "target_ref",
      "journey_role",
      "dimensions",
      "given_refs",
      "when_refs",
    ]);
    return {
      key: key(row.key, `${itemLabel}.key`),
      target_ref: key(row.target_ref, `${itemLabel}.target_ref`),
      journey_role: literal(
        row.journey_role,
        JOURNEY_ROLES,
        `${itemLabel}.journey_role`,
      ),
      dimensions: array(row.dimensions, `${itemLabel}.dimensions`).map(
        (dimension, dimensionIndex) => {
          const dimensionLabel = `${itemLabel}.dimensions[${dimensionIndex}]`;
          const entry = object(dimension, dimensionLabel, ["key", "value"]);
          return {
            key: key(entry.key, `${dimensionLabel}.key`),
            value: key(entry.value, `${dimensionLabel}.value`),
          };
        },
      ),
      given_refs: parseKeyRefs(row.given_refs, `${itemLabel}.given_refs`),
      when_refs: parseKeyRefs(row.when_refs, `${itemLabel}.when_refs`),
    };
  });
}

export function parseApplicableKeyedStatements(
  value: unknown,
  label: string,
): ApplicableKeyedStatementV2[] {
  return array(value, label).map((item, index) => {
    const itemLabel = `${label}[${index}]`;
    const row = object(item, itemLabel, [
      "key",
      "statement",
      "applicability_refs",
    ]);
    return {
      key: key(row.key, `${itemLabel}.key`),
      statement: string(row.statement, `${itemLabel}.statement`),
      applicability_refs: parseKeyRefs(
        row.applicability_refs,
        `${itemLabel}.applicability_refs`,
      ),
    };
  });
}

export function parseKeyRefs(value: unknown, label: string): string[] {
  return strings(value, label).map((item, index) =>
    key(item, `${label}[${index}]`),
  );
}
