import type {
  CompiledCheckV2,
  EvidenceCapabilityRecordV2,
} from "./long-task-delivery-types.js";
import {
  collectCases,
  declaredCaseIds,
  duplicateCaseInstance,
  record,
  same,
  type PlaywrightCase,
  type PlaywrightCaseInstance,
} from "./long-task-playwright-case-evidence.js";
import { evidenceRecordsForPlaywrightCases } from "./long-task-playwright-capability-records.js";

export {
  designMethodAttachmentName,
  semanticFactAttachmentName,
} from "./long-task-playwright-capability-records.js";

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
  return {
    observations,
    evidence_records: evidenceRecordsForPlaywrightCases(check, cases),
    error: null,
  };
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

function integer(value: unknown): number | null {
  return Number.isInteger(value) && Number(value) >= 0 ? Number(value) : null;
}

function invalid(error: string): PlaywrightEvidence {
  return { observations: {}, evidence_records: [], error };
}
