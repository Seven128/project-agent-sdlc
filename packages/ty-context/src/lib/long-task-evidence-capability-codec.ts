import type { EvidenceCapabilityRecordV2 } from "./long-task-delivery-types.js";
import { DESIGN_RESOURCE_VERIFICATION_METHODS } from "./design-resource-handoff-types.js";

export function decodeEvidenceCapabilityRecords(
  value: unknown,
): EvidenceCapabilityRecordV2[] {
  if (!Array.isArray(value)) throw invalidRecord("must_be_array");
  return value.map((item, index) => decodeRecord(item, index));
}

function decodeRecord(
  value: unknown,
  index: number,
): EvidenceCapabilityRecordV2 {
  const label = `evidence_records[${index}]`;
  const row = record(value, label);
  const assertionKey = key(row.assertion_key, `${label}.assertion_key`);
  const capability = nonEmpty(row.capability, `${label}.capability`);
  const base = { assertion_key: assertionKey };
  switch (capability) {
    case "interaction_trace":
      exact(row, label, [
        "assertion_key",
        "capability",
        "target_ref",
        "given_keys",
        "action_keys",
      ]);
      return {
        ...base,
        capability,
        target_ref: key(row.target_ref, `${label}.target_ref`),
        given_keys: keys(row.given_keys, `${label}.given_keys`),
        action_keys: keys(row.action_keys, `${label}.action_keys`),
      };
    case "state_delta":
      exact(row, label, [
        "assertion_key",
        "capability",
        "before_sha256",
        "after_sha256",
        "changed_fields",
      ]);
      return {
        ...base,
        capability,
        before_sha256: sha(row.before_sha256, `${label}.before_sha256`),
        after_sha256: sha(row.after_sha256, `${label}.after_sha256`),
        changed_fields: strings(row.changed_fields, `${label}.changed_fields`),
      };
    case "cross_surface_consistency":
      exact(row, label, ["assertion_key", "capability", "surfaces"]);
      return {
        ...base,
        capability,
        surfaces: array(row.surfaces, `${label}.surfaces`).map(
          (item, surfaceIndex) => {
            const surfaceLabel = `${label}.surfaces[${surfaceIndex}]`;
            const surface = record(item, surfaceLabel);
            exact(surface, surfaceLabel, [
              "surface_ref",
              "target_ref",
              "state_sha256",
            ]);
            return {
              surface_ref: key(
                surface.surface_ref,
                `${surfaceLabel}.surface_ref`,
              ),
              target_ref: key(surface.target_ref, `${surfaceLabel}.target_ref`),
              state_sha256: sha(
                surface.state_sha256,
                `${surfaceLabel}.state_sha256`,
              ),
            };
          },
        ),
      };
    case "durable_readback":
      exact(row, label, [
        "assertion_key",
        "capability",
        "write_session_id",
        "read_session_id",
        "written_sha256",
        "read_sha256",
      ]);
      return {
        ...base,
        capability,
        write_session_id: nonEmpty(
          row.write_session_id,
          `${label}.write_session_id`,
        ),
        read_session_id: nonEmpty(
          row.read_session_id,
          `${label}.read_session_id`,
        ),
        written_sha256: sha(row.written_sha256, `${label}.written_sha256`),
        read_sha256: sha(row.read_sha256, `${label}.read_sha256`),
      };
    case "boundary_invocation":
      exact(row, label, [
        "assertion_key",
        "capability",
        "boundary",
        "invocation_id",
        "request_sha256",
        "observer_target_ref",
      ]);
      return {
        ...base,
        capability,
        boundary: nonEmpty(row.boundary, `${label}.boundary`),
        invocation_id: nonEmpty(row.invocation_id, `${label}.invocation_id`),
        request_sha256: sha(row.request_sha256, `${label}.request_sha256`),
        observer_target_ref: key(
          row.observer_target_ref,
          `${label}.observer_target_ref`,
        ),
      };
    case "external_side_effect":
      exact(row, label, [
        "assertion_key",
        "capability",
        "boundary",
        "effect_id",
        "effect_sha256",
        "observer_target_ref",
      ]);
      return {
        ...base,
        capability,
        boundary: nonEmpty(row.boundary, `${label}.boundary`),
        effect_id: nonEmpty(row.effect_id, `${label}.effect_id`),
        effect_sha256: sha(row.effect_sha256, `${label}.effect_sha256`),
        observer_target_ref: key(
          row.observer_target_ref,
          `${label}.observer_target_ref`,
        ),
      };
    case "failure_injection":
      exact(row, label, [
        "assertion_key",
        "capability",
        "fault",
        "failure_observed",
        "recovery_state_sha256",
      ]);
      if (row.failure_observed !== true)
        throw invalidRecord(`${label}.failure_observed`);
      return {
        ...base,
        capability,
        fault: nonEmpty(row.fault, `${label}.fault`),
        failure_observed: true,
        recovery_state_sha256: sha(
          row.recovery_state_sha256,
          `${label}.recovery_state_sha256`,
        ),
      };
    case "visual_render":
      exact(row, label, [
        "assertion_key",
        "capability",
        "artifact_path",
        "artifact_sha256",
      ]);
      return {
        ...base,
        capability,
        artifact_path: nonEmpty(row.artifact_path, `${label}.artifact_path`),
        artifact_sha256: sha(row.artifact_sha256, `${label}.artifact_sha256`),
      };
    case "design_conformance":
      exact(row, label, [
        "assertion_key",
        "capability",
        "design_target_ref",
        "target_ref",
        "condition_keys",
        "actual_artifact_path",
        "comparison_artifact_path",
      ]);
      return {
        ...base,
        capability,
        design_target_ref: key(
          row.design_target_ref,
          `${label}.design_target_ref`,
        ),
        target_ref: key(row.target_ref, `${label}.target_ref`),
        condition_keys: keys(row.condition_keys, `${label}.condition_keys`),
        actual_artifact_path: nonEmpty(
          row.actual_artifact_path,
          `${label}.actual_artifact_path`,
        ),
        comparison_artifact_path: nonEmpty(
          row.comparison_artifact_path,
          `${label}.comparison_artifact_path`,
        ),
      };
    case "target_runtime":
      exact(row, label, [
        "assertion_key",
        "capability",
        "target_ref",
        "root_entrypoint",
        "session_id",
        "cold_start",
      ]);
      if (typeof row.cold_start !== "boolean")
        throw invalidRecord(`${label}.cold_start`);
      return {
        ...base,
        capability,
        target_ref: key(row.target_ref, `${label}.target_ref`),
        root_entrypoint: nonEmpty(
          row.root_entrypoint,
          `${label}.root_entrypoint`,
        ),
        session_id: nonEmpty(row.session_id, `${label}.session_id`),
        cold_start: row.cold_start,
      };
    case "design_method":
      exact(row, label, [
        "assertion_key",
        "capability",
        "design_target_ref",
        "target_ref",
        "method",
        "cells",
      ]);
      return {
        ...base,
        capability,
        design_target_ref: key(
          row.design_target_ref,
          `${label}.design_target_ref`,
        ),
        target_ref: key(row.target_ref, `${label}.target_ref`),
        method: literal(
          row.method,
          DESIGN_RESOURCE_VERIFICATION_METHODS,
          `${label}.method`,
        ),
        cells: array(row.cells, `${label}.cells`).map((item, cellIndex) => {
          const cellLabel = `${label}.cells[${cellIndex}]`;
          const cell = record(item, cellLabel);
          exact(cell, cellLabel, [
            "condition_key",
            "artifact_path",
            "observation_artifact_path",
            "fact_refs",
          ]);
          return {
            condition_key: key(
              cell.condition_key,
              `${cellLabel}.condition_key`,
            ),
            artifact_path: nonEmpty(
              cell.artifact_path,
              `${cellLabel}.artifact_path`,
            ),
            observation_artifact_path: nonEmpty(
              cell.observation_artifact_path,
              `${cellLabel}.observation_artifact_path`,
            ),
            fact_refs: designFactRefs(cell.fact_refs, `${cellLabel}.fact_refs`),
          };
        }),
      };
    case "input_variation":
      exact(row, label, [
        "assertion_key",
        "capability",
        "cases",
        "failure_case_observed",
      ]);
      if (typeof row.failure_case_observed !== "boolean")
        throw invalidRecord(`${label}.failure_case_observed`);
      return {
        ...base,
        capability,
        cases: array(row.cases, `${label}.cases`).map((item, caseIndex) => {
          const caseLabel = `${label}.cases[${caseIndex}]`;
          const entry = record(item, caseLabel);
          exact(entry, caseLabel, ["input_sha256", "output_sha256"]);
          return {
            input_sha256: sha(entry.input_sha256, `${caseLabel}.input_sha256`),
            output_sha256: sha(
              entry.output_sha256,
              `${caseLabel}.output_sha256`,
            ),
          };
        }),
        failure_case_observed: row.failure_case_observed,
      };
    default:
      throw invalidRecord(`${label}.capability_unsupported:${capability}`);
  }
}

function invalidRecord(detail: string): Error {
  return new Error(`check_evidence_records_invalid:${detail}`);
}

function record(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw invalidRecord(label);
  return value as Record<string, unknown>;
}

function exact(
  row: Record<string, unknown>,
  label: string,
  fields: string[],
): void {
  const allowed = new Set(fields);
  if (
    fields.some((field) => !Object.hasOwn(row, field)) ||
    Object.keys(row).some((field) => !allowed.has(field))
  )
    throw invalidRecord(`${label}.shape`);
}

function array(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value)) throw invalidRecord(label);
  return value;
}

function nonEmpty(value: unknown, label: string): string {
  if (typeof value !== "string" || !value.trim()) throw invalidRecord(label);
  return value;
}

function key(value: unknown, label: string): string {
  const result = nonEmpty(value, label);
  if (!/^[a-z0-9][a-z0-9-]*$/u.test(result)) throw invalidRecord(label);
  return result;
}

function strings(value: unknown, label: string): string[] {
  return array(value, label).map((item, index) =>
    nonEmpty(item, `${label}[${index}]`),
  );
}

function keys(value: unknown, label: string): string[] {
  return array(value, label).map((item, index) =>
    key(item, `${label}[${index}]`),
  );
}

function designFactRefs(value: unknown, label: string): string[] {
  return array(value, label).map((item, index) => {
    const result = nonEmpty(item, `${label}[${index}]`);
    if (!/^[a-z0-9][a-z0-9._-]*$/u.test(result))
      throw invalidRecord(`${label}[${index}]`);
    return result;
  });
}

function sha(value: unknown, label: string): string {
  const result = nonEmpty(value, label);
  if (!/^[a-f0-9]{64}$/u.test(result)) throw invalidRecord(label);
  return result;
}

function literal<T extends readonly string[]>(
  value: unknown,
  allowed: T,
  label: string,
): T[number] {
  const result = nonEmpty(value, label);
  if (!allowed.includes(result)) throw invalidRecord(label);
  return result as T[number];
}
