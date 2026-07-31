import type {
  CompiledCheckV2,
  EvidenceCapabilityRecordV2,
} from "./long-task-delivery-types.js";
import {
  decodeDesignFactResults,
  decodeEvidenceCapabilityRecords,
} from "./long-task-evidence-capability-codec.js";
import type { PlaywrightCase } from "./long-task-playwright-case-evidence.js";

type CheckAssertion = CompiledCheckV2["positive_assertions"][number];

export function evidenceRecordsForPlaywrightCases(
  check: CompiledCheckV2,
  cases: PlaywrightCase[],
): EvidenceCapabilityRecordV2[] {
  const records: EvidenceCapabilityRecordV2[] = [];
  for (const item of cases) {
    const assertion = [
      ...check.positive_assertions,
      ...check.negative_assertions,
    ].find((candidate) => candidate.key === item.id);
    if (!assertion) continue;
    records.push(
      ...baseEvidenceRecords(check, item, assertion),
      ...designConformanceRecords(check, item, assertion),
      ...designMethodRecords(check, item, assertion),
      ...symbolicDesignEvidenceRecords(check, item, assertion),
      ...semanticFactRecords(check, item, assertion),
    );
  }
  return records;
}

function baseEvidenceRecords(
  check: CompiledCheckV2,
  item: PlaywrightCase,
  assertion: CheckAssertion,
): EvidenceCapabilityRecordV2[] {
  if (!item.executed) return [];
  const records: EvidenceCapabilityRecordV2[] = [];
  if (assertion.evidence_capabilities.includes("interaction_trace"))
    records.push({
      assertion_key: assertion.key,
      capability: "interaction_trace",
      target_ref: check.execution_target.target_ref,
      given_keys: item.given_keys,
      action_keys: item.action_keys,
    });
  if (assertion.evidence_capabilities.includes("target_runtime"))
    records.push({
      assertion_key: assertion.key,
      capability: "target_runtime",
      target_ref: check.execution_target.target_ref,
      root_entrypoint: check.execution_target_definition.root_entrypoint,
      session_id: `playwright:${item.id}:${item.project_ids.join(",")}`,
      cold_start: check.execution_target.entrypoint === "root",
    });
  return records;
}

function designConformanceRecords(
  check: CompiledCheckV2,
  item: PlaywrightCase,
  assertion: CheckAssertion,
): EvidenceCapabilityRecordV2[] {
  if (
    !item.executed ||
    !assertion.evidence_capabilities.includes("design_conformance")
  )
    return [];
  return (check.design_conformance_targets ?? [])
    .filter(
      (candidate) =>
        candidate.conformance_assertion_ref === assertion.key ||
        candidate.verification_method_bindings.some(
          (binding) => binding.assertion_ref === assertion.key,
        ) ||
        (candidate.symbolic_method_bindings ?? []).some(
          (binding) => binding.assertion_ref === assertion.key,
        ),
    )
    .map((target) => ({
      assertion_key: assertion.key,
      capability: "design_conformance" as const,
      design_target_ref: target.key,
      target_ref: target.target_ref,
      condition_keys: target.condition_keys,
      actual_artifact_path: target.actual_artifact_path,
      comparison_artifact_path: target.comparison_artifact_path,
    }));
}

function designMethodRecords(
  check: CompiledCheckV2,
  item: PlaywrightCase,
  assertion: CheckAssertion,
): EvidenceCapabilityRecordV2[] {
  if (
    !item.executed ||
    !assertion.evidence_capabilities.includes("design_method")
  )
    return [];
  const records: EvidenceCapabilityRecordV2[] = [];
  for (const target of check.design_conformance_targets ?? []) {
    if (target.fact_model === "symbolic_rules_v2") continue;
    const binding = target.verification_method_bindings.find(
      (candidate) => candidate.assertion_ref === assertion.key,
    );
    if (!binding) continue;
    const requiredAttachments = binding.evidence_artifacts.flatMap(
      (artifact) => [
        designMethodAttachmentName(
          target.key,
          binding.method,
          artifact.condition_key,
          "record",
        ),
        designMethodAttachmentName(
          target.key,
          binding.method,
          artifact.condition_key,
          "observation",
        ),
      ],
    );
    if (
      !requiredAttachments.every((name) => item.attachment_names.includes(name))
    )
      continue;
    const cells = binding.evidence_artifacts.map((artifact) => {
      const recordName = designMethodAttachmentName(
        target.key,
        binding.method,
        artifact.condition_key,
        "record",
      );
      return {
        condition_key: artifact.condition_key,
        artifact_path: artifact.path,
        observation_artifact_path: artifact.observation_path,
        fact_refs: artifact.fact_refs,
        fact_results: designFactResultAttachment(
          item.attachment_payloads[recordName],
          `${target.key}:${binding.method}:${artifact.condition_key}`,
        ),
      };
    });
    if (cells.some((cell) => cell.fact_results === null)) continue;
    records.push({
      assertion_key: assertion.key,
      capability: "design_method",
      design_target_ref: target.key,
      target_ref: target.target_ref,
      method: binding.method,
      cells: cells.map((cell) => ({
        ...cell,
        fact_results: cell.fact_results!,
      })),
    });
  }
  return records;
}

function symbolicDesignEvidenceRecords(
  check: CompiledCheckV2,
  item: PlaywrightCase,
  assertion: CheckAssertion,
): EvidenceCapabilityRecordV2[] {
  if (!item.executed) return [];
  const records: EvidenceCapabilityRecordV2[] = [];
  for (const target of check.design_conformance_targets ?? []) {
    if (target.fact_model !== "symbolic_rules_v2") continue;
    records.push(...symbolicMethodEvidenceRecords(target, item, assertion));
    const certificate = symbolicCertificateEvidenceRecord(
      target,
      item,
      assertion,
    );
    if (certificate) records.push(certificate);
  }
  return records;
}

type CompiledDesignTarget = NonNullable<
  CompiledCheckV2["design_conformance_targets"]
>[number];

function symbolicMethodEvidenceRecords(
  target: CompiledDesignTarget,
  item: PlaywrightCase,
  assertion: CheckAssertion,
): EvidenceCapabilityRecordV2[] {
  if (!assertion.evidence_capabilities.includes("design_method")) return [];
  const records: EvidenceCapabilityRecordV2[] = [];
  for (const binding of target.symbolic_method_bindings ?? []) {
    if (binding.assertion_ref !== assertion.key) continue;
    const attachmentName = symbolicDesignMethodAttachmentName(
      target.key,
      binding.method,
    );
    if (!item.attachment_names.includes(attachmentName)) continue;
    const record = typedEvidenceAttachment(
      item.attachment_payloads[attachmentName],
      "design_method",
    );
    if (
      record?.capability === "design_method" &&
      "fact_model" in record &&
      record.assertion_key === assertion.key &&
      record.design_target_ref === target.key &&
      record.method === binding.method
    )
      records.push(record);
  }
  return records;
}

function symbolicCertificateEvidenceRecord(
  target: CompiledDesignTarget,
  item: PlaywrightCase,
  assertion: CheckAssertion,
): EvidenceCapabilityRecordV2 | null {
  const binding = target.symbolic_certificate_binding;
  if (
    binding?.assertion_ref !== assertion.key ||
    !assertion.evidence_capabilities.includes("design_symbolic_certificate")
  )
    return null;
  const attachmentName = symbolicDesignCertificateAttachmentName(target.key);
  if (!item.attachment_names.includes(attachmentName)) return null;
  const record = typedEvidenceAttachment(
    item.attachment_payloads[attachmentName],
    "design_symbolic_certificate",
  );
  return record?.capability === "design_symbolic_certificate" &&
    record.assertion_key === assertion.key &&
    record.design_target_ref === target.key
    ? record
    : null;
}

function typedEvidenceAttachment<
  T extends EvidenceCapabilityRecordV2["capability"],
>(
  payload: string | undefined,
  capability: T,
): Extract<EvidenceCapabilityRecordV2, { capability: T }> | null {
  if (!payload) return null;
  try {
    const records = decodeEvidenceCapabilityRecords([JSON.parse(payload)]);
    const record = records[0];
    return records.length === 1 && record.capability === capability
      ? (record as Extract<EvidenceCapabilityRecordV2, { capability: T }>)
      : null;
  } catch {
    return null;
  }
}

function semanticFactRecords(
  check: CompiledCheckV2,
  item: PlaywrightCase,
  assertion: CheckAssertion,
): EvidenceCapabilityRecordV2[] {
  if (
    !item.executed ||
    !assertion.evidence_capabilities.includes("semantic_fact")
  )
    return [];
  const expectation = check.semantic_fact_expectations.find(
    (candidate) => candidate.assertion_ref === assertion.key,
  );
  if (!expectation) return [];
  const attachmentName = semanticFactAttachmentName(expectation.proof_ref);
  if (!item.attachment_names.includes(attachmentName)) return [];
  const record = semanticFactAttachment(
    item.attachment_payloads[attachmentName],
  );
  return record &&
    record.assertion_key === assertion.key &&
    record.proof_ref === expectation.proof_ref
    ? [record]
    : [];
}

function semanticFactAttachment(
  payload: string | undefined,
): Extract<EvidenceCapabilityRecordV2, { capability: "semantic_fact" }> | null {
  if (!payload) return null;
  try {
    const records = decodeEvidenceCapabilityRecords([JSON.parse(payload)]);
    const record = records[0];
    return records.length === 1 && record.capability === "semantic_fact"
      ? record
      : null;
  } catch {
    return null;
  }
}

export function semanticFactAttachmentName(proofRef: string): string {
  return `ty-semantic-fact:${proofRef}`;
}

function designFactResultAttachment(
  content: string | undefined,
  label: string,
): ReturnType<typeof decodeDesignFactResults> | null {
  if (!content) return null;
  try {
    const payload = JSON.parse(content) as Record<string, unknown>;
    if (
      payload.schema_version !== "design-method-fact-results-v1" ||
      !Object.hasOwn(payload, "fact_results")
    )
      return null;
    return decodeDesignFactResults(
      payload.fact_results,
      `playwright_design_method.${label}.fact_results`,
    );
  } catch {
    return null;
  }
}

export function designMethodAttachmentName(
  target: string,
  method: string,
  condition: string,
  kind: "record" | "observation",
): string {
  return `ty-context-design-method:${target}:${method}:${condition}:${kind}`;
}

export function symbolicDesignMethodAttachmentName(
  target: string,
  method: string,
): string {
  return `ty-context-design-symbolic-method:${target}:${method}:record`;
}

export function symbolicDesignCertificateAttachmentName(
  target: string,
): string {
  return `ty-context-design-symbolic-certificate:${target}:record`;
}
