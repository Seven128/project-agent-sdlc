import type {
  CompiledCheckV2,
  DeliveryCheckV2,
} from "./long-task-delivery-types.js";
import { canonicalValueJson, sha256Hex } from "./strict-codec.js";

export type CheckExecutionInputPolicy =
  | "raw_execution"
  | "raw_execution_via_runner_freeze"
  | "per_check_evidence"
  | "progress_scope"
  | "final_gate_evidence"
  | "authority_metadata";

export const CHECK_EXECUTION_INPUT_POLICY = {
  key: "authority_metadata",
  journey_roles: "authority_metadata",
  execution_target: "raw_execution",
  scenario: "per_check_evidence",
  proof_surface: "authority_metadata",
  runner: "raw_execution",
  verification_inputs: "raw_execution_via_runner_freeze",
  input_paths: "progress_scope",
  expected_output_paths: "final_gate_evidence",
  artifact_globs: "per_check_evidence",
  positive_assertions: "per_check_evidence",
  negative_assertions: "per_check_evidence",
  environment_requirements: "raw_execution",
} satisfies Record<keyof DeliveryCheckV2, CheckExecutionInputPolicy>;

type CompiledCheckWithoutRawIdentity = Omit<
  CompiledCheckV2,
  "raw_execution_identity"
>;

export function rawExecutionInputProjection(
  check: CompiledCheckWithoutRawIdentity,
): Record<string, unknown> {
  const projection: Record<string, unknown> = {};
  projection.evidence_adapter = check.evidence_adapter;
  projection.execution_target_definition = check.execution_target_definition;
  projection.known_execution_targets = check.known_execution_targets;
  projection.design_conformance_targets =
    check.design_conformance_targets ?? [];
  projection.package_observation_protocol = (
    check.observation_authorities ?? []
  ).some((authority) => authority.authority === "package_process_json_exact")
    ? "ty-context-product-observation-v1"
    : null;
  projection.process_runtime_closure_identity =
    check.process_runtime_closure?.closure_identity ?? null;
  for (const field of Object.keys(CHECK_EXECUTION_INPUT_POLICY) as Array<
    keyof DeliveryCheckV2
  >) {
    const policy = CHECK_EXECUTION_INPUT_POLICY[field];
    if (policy === "raw_execution") {
      if (field === "runner")
        projection[field] = check.runner.execution_identity;
      else if (field === "environment_requirements")
        projection[field] = [...check.environment_requirements].sort(
          (left, right) =>
            canonicalValueJson(left).localeCompare(canonicalValueJson(right)),
        );
      else projection[field] = check[field];
    } else if (policy === "raw_execution_via_runner_freeze")
      projection[field] = {
        frozen_via_runner_execution_identity: check.runner.execution_identity,
      };
  }
  return projection;
}

export function computeRawExecutionIdentity(
  check: CompiledCheckWithoutRawIdentity,
): string {
  return sha256Hex(canonicalValueJson(rawExecutionInputProjection(check)));
}
