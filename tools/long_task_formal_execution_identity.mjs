import {
  assert,
  canonical,
  sha256,
} from "./long_task_real_process_roi_scoring.mjs";
import {
  assertExactKeys,
  shaPattern,
} from "./long_task_formal_total_cost_shared.mjs";

export function deriveFormalInvocationId(projection) {
  validateInvocationProjection(projection);
  return sha256(canonical(projection));
}

export function deriveFormalExecutionRecordSha256(record) {
  const projected = { ...record };
  delete projected.execution_record_sha256;
  delete projected.execution_id;
  return sha256(canonical(projected));
}

export function deriveFormalExecutionId(invocationId, recordSha256) {
  assert(shaPattern.test(invocationId), "formal_execution_invocation_id");
  assert(shaPattern.test(recordSha256), "formal_execution_record_sha");
  return sha256(
    canonical({
      invocation_id: invocationId,
      execution_record_sha256: recordSha256,
    }),
  );
}

export function finalizeFormalExecutionRecord(record) {
  assert(
    !("execution_record_sha256" in record) && !("execution_id" in record),
    "formal_execution_derived_fields_preexisting",
  );
  const executionRecordSha256 = deriveFormalExecutionRecordSha256(record);
  return {
    ...record,
    execution_record_sha256: executionRecordSha256,
    execution_id: deriveFormalExecutionId(
      record.invocation_id,
      executionRecordSha256,
    ),
  };
}

function validateInvocationProjection(projection) {
  assertExactKeys(
    projection,
    [
      "attempt",
      "collector",
      "pair_id",
      "precollection_identity_sha256",
      "run_id",
      "run_set_id",
      "scenario_id",
      "schema_version",
      "variant_id",
    ],
    "formal_invocation_projection_fields",
  );
  assertExactKeys(
    projection.collector,
    ["collector_id", "implementation_sha256"],
    "formal_invocation_collector_fields",
  );
  assert(
    projection.schema_version === "formal-invocation-projection-v1" &&
      [
        projection.run_set_id,
        projection.run_id,
        projection.pair_id,
        projection.scenario_id,
        projection.collector.collector_id,
      ].every((value) => typeof value === "string" && value.length > 0) &&
      ["b", "c"].includes(projection.variant_id) &&
      projection.attempt === 1 &&
      shaPattern.test(projection.collector.implementation_sha256) &&
      shaPattern.test(projection.precollection_identity_sha256),
    "formal_invocation_projection",
  );
}
