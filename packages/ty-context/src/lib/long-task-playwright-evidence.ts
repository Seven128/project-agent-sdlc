import type {
  CompiledCheckV2,
  EvidenceCapabilityRecordV2,
} from "./long-task-delivery-types.js";
import { decodeDesignFactResults } from "./long-task-evidence-capability-codec.js";
import {
  collectCases,
  declaredCaseIds,
  duplicateCaseInstance,
  record,
  same,
  type PlaywrightCase,
  type PlaywrightCaseInstance,
} from "./long-task-playwright-case-evidence.js";

export interface PlaywrightEvidence {
  observations: Record<string, unknown>;
  evidence_records: EvidenceCapabilityRecordV2[];
  error: string | null;
}

export function extractPlaywrightEvidence(
  check: CompiledCheckV2,
  report: Record<string, unknown>,
  exitCode: number,
): PlaywrightEvidence {
  const stats = record(report.stats);
  if (!stats) return invalid("playwright_report_invalid:stats");
  const expected = integer(stats.expected);
  const unexpected = integer(stats.unexpected);
  const skipped = integer(stats.skipped);
  const flaky = integer(stats.flaky);
  if ([expected, unexpected, skipped, flaky].some((value) => value === null))
    return invalid("playwright_report_invalid:counts");
  const total = expected! + unexpected! + skipped! + flaky!;
  const reportErrors = report.errors;
  if (reportErrors !== undefined && !Array.isArray(reportErrors))
    return invalid("playwright_report_invalid:errors");
  const observations: Record<string, unknown> = {
    "playwright.passed": exitCode === 0,
    "playwright.expected": expected,
    "playwright.unexpected": unexpected,
    "playwright.skipped": skipped,
    "playwright.flaky": flaky,
    "playwright.total": total,
    "playwright.zero_or_all_skipped": total === 0 || skipped === total,
    "playwright.report_error_count": Array.isArray(reportErrors)
      ? reportErrors.length
      : 0,
  };

  const collected = collectCases(report, declaredCaseIds(check));
  if (collected.error) return invalid(collected.error);
  const instances = collected.cases;
  observations["playwright.declared_unexpected_instances"] = instances.filter(
    (item) => item.unexpected,
  ).length;
  observations["playwright.unbound_unexpected_instances"] =
    collected.unbound_unexpected_instances;
  const duplicate = duplicateCaseInstance(instances);
  if (duplicate)
    return invalid(
      `playwright_ac_id_duplicate:${duplicate.id}:${duplicate.project_id}`,
    );
  const cases = aggregateCases(instances);
  for (const item of cases) {
    const prefix = `playwright.case.${item.id}`;
    observations[`${prefix}.executed`] = item.executed;
    observations[`${prefix}.passed`] = item.passed;
    observations[`${prefix}.skipped`] = item.skipped;
    observations[`${prefix}.flaky`] = item.flaky;
    observations[`${prefix}.unexpected`] = item.unexpected;
    observations[`${prefix}.status`] = item.status;
    observations[`${prefix}.project_ids`] = item.project_ids;
    observations[`${prefix}.executed_instances`] = item.executed_instances;
    observations[`${prefix}.failed_instances`] = item.failed_instances;
    observations[`${prefix}.skipped_instances`] = item.skipped_instances;
    observations[`${prefix}.flaky_instances`] = item.flaky_instances;
    observations[`${prefix}.unexpected_instances`] = item.unexpected_instances;
    observations[`${prefix}.timed_out_instances`] = item.timed_out_instances;
    observations[`${prefix}.interrupted_instances`] =
      item.interrupted_instances;
  }
  for (const id of declaredCaseIds(check)) {
    const prefix = `playwright.case.${id}`;
    if (!Object.hasOwn(observations, `${prefix}.status`)) {
      observations[`${prefix}.executed`] = false;
      observations[`${prefix}.status`] = "missing";
    }
  }
  observations["playwright.case_ids"] = cases.map((item) => item.id).sort();
  const evidenceRecords = evidenceRecordsForCases(check, cases);
  return { observations, evidence_records: evidenceRecords, error: null };
}

function evidenceRecordsForCases(
  check: CompiledCheckV2,
  cases: PlaywrightCase[],
): EvidenceCapabilityRecordV2[] {
  const evidenceRecords: EvidenceCapabilityRecordV2[] = [];
  for (const item of cases) {
    const assertion = [
      ...check.positive_assertions,
      ...check.negative_assertions,
    ].find((candidate) => candidate.key === item.id);
    if (
      assertion?.evidence_capabilities.includes("interaction_trace") &&
      item.executed
    )
      evidenceRecords.push({
        assertion_key: assertion.key,
        capability: "interaction_trace",
        target_ref: check.execution_target.target_ref,
        given_keys: item.given_keys,
        action_keys: item.action_keys,
      });
    if (
      assertion?.evidence_capabilities.includes("target_runtime") &&
      item.executed
    )
      evidenceRecords.push({
        assertion_key: assertion.key,
        capability: "target_runtime",
        target_ref: check.execution_target.target_ref,
        root_entrypoint: check.execution_target_definition.root_entrypoint,
        session_id: `playwright:${item.id}:${item.project_ids.join(",")}`,
        cold_start: check.execution_target.entrypoint === "root",
      });
    if (
      assertion?.evidence_capabilities.includes("design_conformance") &&
      item.executed
    ) {
      for (const target of (check.design_conformance_targets ?? []).filter(
        (candidate) =>
          candidate.conformance_assertion_ref === assertion.key ||
          candidate.verification_method_bindings.some(
            (binding) => binding.assertion_ref === assertion.key,
          ),
      ))
        evidenceRecords.push({
          assertion_key: assertion.key,
          capability: "design_conformance",
          design_target_ref: target.key,
          target_ref: target.target_ref,
          condition_keys: target.condition_keys,
          actual_artifact_path: target.actual_artifact_path,
          comparison_artifact_path: target.comparison_artifact_path,
        });
    }
    if (
      assertion?.evidence_capabilities.includes("design_method") &&
      item.executed
    ) {
      for (const target of check.design_conformance_targets ?? []) {
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
          !requiredAttachments.every((name) =>
            item.attachment_names.includes(name),
          )
        )
          continue;
        const cells = binding.evidence_artifacts.map((artifact) => {
          const recordName = designMethodAttachmentName(
            target.key,
            binding.method,
            artifact.condition_key,
            "record",
          );
          const payload = designFactResultAttachment(
            item.attachment_payloads[recordName],
            `${target.key}:${binding.method}:${artifact.condition_key}`,
          );
          return {
            condition_key: artifact.condition_key,
            artifact_path: artifact.path,
            observation_artifact_path: artifact.observation_path,
            fact_refs: artifact.fact_refs,
            fact_results: payload,
          };
        });
        if (cells.some((cell) => cell.fact_results === null)) continue;
        evidenceRecords.push({
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
    }
  }
  return evidenceRecords;
}

function aggregateCases(instances: PlaywrightCaseInstance[]): PlaywrightCase[] {
  const grouped = new Map<string, PlaywrightCaseInstance[]>();
  for (const instance of instances) {
    const rows = grouped.get(instance.id) ?? [];
    rows.push(instance);
    grouped.set(instance.id, rows);
  }
  return [...grouped.entries()]
    .map(([id, rows]) => {
      const executedInstances = rows.filter((item) => item.executed).length;
      const skippedInstances = rows.filter((item) => item.skipped).length;
      const flakyInstances = rows.filter((item) => item.flaky).length;
      const unexpectedInstances = rows.filter((item) => item.unexpected).length;
      const timedOutInstances = rows.filter((item) => item.timed_out).length;
      const interruptedInstances = rows.filter(
        (item) => item.interrupted,
      ).length;
      const failedInstances = rows.filter(
        (item) => !item.passed && !item.skipped,
      ).length;
      const executed = rows.length > 0 && rows.every((item) => item.executed);
      const passed =
        executed &&
        skippedInstances === 0 &&
        flakyInstances === 0 &&
        unexpectedInstances === 0 &&
        rows.every((item) => item.passed);
      const status = passed
        ? "passed"
        : skippedInstances
          ? "skipped"
          : flakyInstances
            ? "flaky"
            : timedOutInstances
              ? "timed_out"
              : interruptedInstances
                ? "interrupted"
                : unexpectedInstances
                  ? "unexpected"
                  : "failed";
      return {
        id,
        executed,
        passed,
        skipped: skippedInstances > 0,
        flaky: flakyInstances > 0,
        unexpected: unexpectedInstances > 0,
        status,
        project_ids: rows.map((item) => item.project_id).sort(),
        executed_instances: executedInstances,
        failed_instances: failedInstances,
        skipped_instances: skippedInstances,
        flaky_instances: flakyInstances,
        unexpected_instances: unexpectedInstances,
        timed_out_instances: timedOutInstances,
        interrupted_instances: interruptedInstances,
        given_keys:
          rows.length &&
          rows.every((row) => same(row.given_keys, rows[0].given_keys))
            ? rows[0].given_keys
            : [],
        action_keys:
          rows.length &&
          rows.every((row) => same(row.action_keys, rows[0].action_keys))
            ? rows[0].action_keys
            : [],
        attachment_names:
          rows.length === 0
            ? []
            : rows[0].attachment_names.filter((name) =>
                rows.every((row) => row.attachment_names.includes(name)),
              ),
        attachment_payloads:
          rows.length === 0
            ? {}
            : Object.fromEntries(
                Object.entries(rows[0].attachment_payloads).filter(
                  ([name, value]) =>
                    rows.every(
                      (row) => row.attachment_payloads[name] === value,
                    ),
                ),
              ),
      };
    })
    .sort((left, right) => left.id.localeCompare(right.id));
}

function designFactResultAttachment(
  content: string | undefined,
  label: string,
) {
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

function integer(value: unknown): number | null {
  return Number.isInteger(value) && Number(value) >= 0 ? Number(value) : null;
}

function invalid(error: string): PlaywrightEvidence {
  return { observations: {}, evidence_records: [], error };
}
