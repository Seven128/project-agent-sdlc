import type { CompiledCheckV2 } from "./long-task-delivery-types.js";

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
  const status = typeof test.status === "string" ? test.status : "invalid";
  const projectId =
    typeof test.projectId === "string"
      ? test.projectId
      : typeof test.projectName === "string"
        ? test.projectName
        : "default";
  const results = Array.isArray(test.results)
    ? test.results.map(record).filter(Boolean)
    : [];
  const resultStatuses = results
    .map((result) => result!.status)
    .filter((value): value is string => typeof value === "string");
  const skipped =
    status === "skipped" ||
    (resultStatuses.length > 0 &&
      resultStatuses.every((value) => value === "skipped"));
  const executed = !skipped && resultStatuses.length > 0;
  const flaky = status === "flaky";
  const unexpected = status === "unexpected";
  const timedOut = resultStatuses.includes("timedOut");
  const interrupted = resultStatuses.includes("interrupted");
  const passed =
    executed &&
    !flaky &&
    !unexpected &&
    status === "expected" &&
    resultStatuses.length > 0 &&
    resultStatuses.at(-1) === "passed";
  const traces = results.map((result) => scenarioTrace(result!));
  const attachmentNames = [
    ...new Set(
      results.flatMap((result) =>
        Array.isArray(result!.attachments)
          ? result!.attachments
              .map(record)
              .filter(Boolean)
              .map((attachment) => attachment!.name)
              .filter((name): name is string => typeof name === "string")
          : [],
      ),
    ),
  ].sort();
  const givenKeys = traces[0]?.given_keys ?? [];
  const actionKeys = traces[0]?.action_keys ?? [];
  const traceConsistent = traces.every(
    (trace) =>
      same(trace.given_keys, givenKeys) && same(trace.action_keys, actionKeys),
  );
  return {
    id,
    project_id: projectId,
    executed,
    passed,
    skipped,
    flaky,
    unexpected,
    timed_out: timedOut,
    interrupted,
    status,
    given_keys: traceConsistent ? givenKeys : [],
    action_keys: traceConsistent ? actionKeys : [],
    attachment_names: attachmentNames,
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

export function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function scenarioTrace(result: Record<string, unknown>): {
  given_keys: string[];
  action_keys: string[];
} {
  const givenKeys: string[] = [];
  const actionKeys: string[] = [];
  const visit = (value: unknown): void => {
    if (!Array.isArray(value)) return;
    for (const item of value) {
      const step = record(item);
      if (!step) continue;
      if (typeof step.title === "string") {
        const given = /^\[given:([a-z0-9][a-z0-9-]*)\]$/u.exec(step.title);
        const action = /^\[action:([a-z0-9][a-z0-9-]*)\]$/u.exec(step.title);
        if (given) givenKeys.push(given[1]);
        if (action) actionKeys.push(action[1]);
      }
      visit(step.steps);
    }
  };
  visit(result.steps);
  return { given_keys: givenKeys, action_keys: actionKeys };
}

export function same(left: string[], right: string[]): boolean {
  return (
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
}
