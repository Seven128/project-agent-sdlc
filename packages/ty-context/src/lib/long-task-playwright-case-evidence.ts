import type { CompiledCheckV2 } from "./long-task-delivery-types.js";
import {
  consistentScenarioTrace,
  playwrightAttachments,
  playwrightExecutionState,
  playwrightIdentity,
  playwrightResults,
  record,
} from "./long-task-playwright-case-primitives.js";

export { record, same } from "./long-task-playwright-case-primitives.js";

export interface PlaywrightCaseInstance {
  id: string;
  project_id: string;
  executed: boolean;
  passed: boolean;
  skipped: boolean;
  flaky: boolean;
  unexpected: boolean;
  timed_out: boolean;
  interrupted: boolean;
  status: string;
  given_keys: string[];
  action_keys: string[];
  attachment_names: string[];
  attachment_payloads: Record<string, string>;
}

export interface PlaywrightCase {
  id: string;
  executed: boolean;
  passed: boolean;
  skipped: boolean;
  flaky: boolean;
  unexpected: boolean;
  status: string;
  project_ids: string[];
  executed_instances: number;
  failed_instances: number;
  skipped_instances: number;
  flaky_instances: number;
  unexpected_instances: number;
  timed_out_instances: number;
  interrupted_instances: number;
  given_keys: string[];
  action_keys: string[];
  attachment_names: string[];
  attachment_payloads: Record<string, string>;
}

export function collectCases(
  report: Record<string, unknown>,
  declaredIds: Set<string>,
): {
  cases: PlaywrightCaseInstance[];
  unbound_unexpected_instances: number;
  error: string | null;
} {
  const cases: PlaywrightCaseInstance[] = [];
  const collection = { unbound_unexpected_instances: 0 };
  const error = visitSuites(report.suites, cases, declaredIds, collection);
  return { cases, error, ...collection };
}

function visitSuites(
  value: unknown,
  cases: PlaywrightCaseInstance[],
  declaredIds: Set<string>,
  collection: { unbound_unexpected_instances: number },
): string | null {
  if (!Array.isArray(value)) return null;
  for (const suiteValue of value) {
    const suite = record(suiteValue);
    if (!suite) continue;
    const nestedError = visitSuites(
      suite.suites,
      cases,
      declaredIds,
      collection,
    );
    if (nestedError) return nestedError;
    if (!Array.isArray(suite.specs)) continue;
    for (const specValue of suite.specs) {
      const spec = record(specValue);
      if (!spec || !Array.isArray(spec.tests)) continue;
      for (const testValue of spec.tests) {
        const test = record(testValue);
        if (!test) continue;
        const title = [spec.title, test.title]
          .filter((item): item is string => typeof item === "string")
          .join(" ");
        const ids = declaredIdsInTitle(title, declaredIds);
        if (ids.length > 1)
          return `playwright_test_multiple_ac_ids:${ids.join(",")}`;
        const instance = playwrightCase(ids[0] ?? "unbound", test);
        if (ids.length === 1) cases.push(instance);
        else if (instance.unexpected)
          collection.unbound_unexpected_instances += 1;
      }
    }
  }
  return null;
}

function declaredIdsInTitle(title: string, declared: Set<string>): string[] {
  const explicit = [...title.matchAll(/\[ac:([a-z0-9][a-z0-9-]*)\]/gu)].map(
    (match) => match[1],
  );
  const legacy = [...title.matchAll(/\[([a-z0-9][a-z0-9-]*)\]/gu)].map(
    (match) => match[1],
  );
  return [
    ...new Set([...explicit, ...legacy].filter((id) => declared.has(id))),
  ].sort();
}

function playwrightCase(
  id: string,
  test: Record<string, unknown>,
): PlaywrightCaseInstance {
  const { status, projectId } = playwrightIdentity(test);
  const results = playwrightResults(test);
  const resultStatuses = results
    .map((result) => result.status)
    .filter((value): value is string => typeof value === "string");
  const state = playwrightExecutionState(status, resultStatuses);
  const trace = consistentScenarioTrace(results);
  const attachments = playwrightAttachments(results);
  return {
    id,
    project_id: projectId,
    ...state,
    status,
    ...trace,
    ...attachments,
  };
}

export function declaredCaseIds(check: CompiledCheckV2): Set<string> {
  const result = new Set<string>();
  for (const assertion of [
    ...check.positive_assertions,
    ...check.negative_assertions,
  ]) {
    const match = /^playwright\.case\.([a-z0-9][a-z0-9-]*)\.passed$/u.exec(
      assertion.observation,
    );
    if (match) result.add(assertion.key);
  }
  return result;
}

export function duplicateCaseInstance(
  values: PlaywrightCaseInstance[],
): PlaywrightCaseInstance | null {
  const seen = new Set<string>();
  for (const value of values) {
    const identity = `${value.id}\0${value.project_id}`;
    if (seen.has(identity)) return value;
    seen.add(identity);
  }
  return null;
}
