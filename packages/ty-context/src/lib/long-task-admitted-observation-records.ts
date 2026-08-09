import type { EvidenceCapabilityRecordV2 } from "./long-task-delivery-types.js";
import type { JsonPointerExactLocator } from "./long-task-json-pointer-observation.js";

export type AdmittedObservationCandidate = {
  assertion_key: string;
  identity_ref: string;
  method: string;
  actual_observation: {
    artifact_path: string;
    locator: JsonPointerExactLocator;
    sensitivity: string;
  };
  comparison: {
    comparator: string;
    mode: string;
    tolerance: unknown;
    mask: unknown;
  };
  oracle: {
    trust: string;
    identity: string;
    version: string;
    sha256: string | null;
  };
};

export function admittedObservationCandidates(
  records: EvidenceCapabilityRecordV2[],
): AdmittedObservationCandidate[] {
  const candidates: AdmittedObservationCandidate[] = [];
  for (const record of records) {
    if (record.capability === "semantic_fact") {
      candidates.push({
        assertion_key: record.assertion_key,
        identity_ref: record.fact_ref,
        method: record.method,
        actual_observation: record.actual_observation,
        comparison: record.comparison,
        oracle: record.oracle,
      });
      continue;
    }
    if (record.capability !== "design_method") continue;
    if ("fact_model" in record)
      for (const result of record.rule_results)
        candidates.push({
          assertion_key: record.assertion_key,
          identity_ref: result.obligation_ref,
          method: record.method,
          actual_observation: result.actual_observation,
          comparison: result.comparison,
          oracle: result.oracle,
        });
    else
      for (const cell of record.cells)
        for (const result of cell.fact_results)
          candidates.push({
            assertion_key: record.assertion_key,
            identity_ref: result.fact_ref,
            method: record.method,
            actual_observation: result.actual_observation,
            comparison: result.comparison,
            oracle: result.oracle,
          });
  }
  return candidates;
}
