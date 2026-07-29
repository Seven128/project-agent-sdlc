interface PlaywrightExecutionState {
  executed: boolean;
  passed: boolean;
  skipped: boolean;
  flaky: boolean;
  unexpected: boolean;
  timed_out: boolean;
  interrupted: boolean;
}

interface PlaywrightAttachments {
  attachment_names: string[];
  attachment_payloads: Record<string, string>;
}

interface PlaywrightScenarioTrace {
  given_keys: string[];
  action_keys: string[];
}

export function playwrightIdentity(test: Record<string, unknown>): {
  status: string;
  projectId: string;
} {
  const status = typeof test.status === "string" ? test.status : "invalid";
  const projectId =
    typeof test.projectId === "string"
      ? test.projectId
      : typeof test.projectName === "string"
        ? test.projectName
        : "default";
  return { status, projectId };
}

export function playwrightResults(
  test: Record<string, unknown>,
): Record<string, unknown>[] {
  if (!Array.isArray(test.results)) return [];
  return test.results
    .map(record)
    .filter((item): item is Record<string, unknown> => item !== null);
}

export function playwrightExecutionState(
  status: string,
  resultStatuses: string[],
): PlaywrightExecutionState {
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
  return {
    executed,
    passed,
    skipped,
    flaky,
    unexpected,
    timed_out: timedOut,
    interrupted,
  };
}

export function playwrightAttachments(
  results: Record<string, unknown>[],
): PlaywrightAttachments {
  const attachmentNames = [
    ...new Set(
      results.flatMap((result) =>
        Array.isArray(result.attachments)
          ? result.attachments
              .map(record)
              .filter((item): item is Record<string, unknown> => item !== null)
              .map((attachment) => attachment.name)
              .filter((name): name is string => typeof name === "string")
          : [],
      ),
    ),
  ].sort();
  const attachmentPayloads: Record<string, string> = {};
  for (const result of results)
    collectAttachmentPayloads(result.attachments, attachmentPayloads);
  return {
    attachment_names: attachmentNames,
    attachment_payloads: attachmentPayloads,
  };
}

function collectAttachmentPayloads(
  values: unknown,
  payloads: Record<string, string>,
): void {
  if (!Array.isArray(values)) return;
  for (const value of values) {
    const attachment = record(value);
    if (!attachment || typeof attachment.name !== "string") continue;
    const body = attachmentBody(attachment.body);
    if (body === null) continue;
    const previous = payloads[attachment.name];
    if (previous !== undefined && previous !== body)
      delete payloads[attachment.name];
    else payloads[attachment.name] = body;
  }
}

export function consistentScenarioTrace(
  results: Record<string, unknown>[],
): PlaywrightScenarioTrace {
  const traces = results.map((result) => scenarioTrace(result));
  const givenKeys = traces[0]?.given_keys ?? [];
  const actionKeys = traces[0]?.action_keys ?? [];
  const traceConsistent = traces.every(
    (trace) =>
      same(trace.given_keys, givenKeys) && same(trace.action_keys, actionKeys),
  );
  return {
    given_keys: traceConsistent ? givenKeys : [],
    action_keys: traceConsistent ? actionKeys : [],
  };
}

function attachmentBody(value: unknown): string | null {
  if (typeof value === "string") return stringAttachmentBody(value);
  const body = record(value);
  if (
    body?.type === "Buffer" &&
    Array.isArray(body.data) &&
    body.data.every(
      (item) =>
        Number.isInteger(item) && Number(item) >= 0 && Number(item) <= 255,
    )
  )
    return Buffer.from(body.data as number[]).toString("utf8");
  return null;
}

function stringAttachmentBody(value: string): string {
  try {
    const decoded = Buffer.from(value, "base64").toString("utf8");
    if (decoded.trim().startsWith("{") || decoded.trim().startsWith("["))
      return decoded;
  } catch {
    // Fall through to plain text.
  }
  return value;
}

export function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function scenarioTrace(
  result: Record<string, unknown>,
): PlaywrightScenarioTrace {
  const givenKeys: string[] = [];
  const actionKeys: string[] = [];
  visitScenarioSteps(result.steps, givenKeys, actionKeys);
  return { given_keys: givenKeys, action_keys: actionKeys };
}

function visitScenarioSteps(
  value: unknown,
  givenKeys: string[],
  actionKeys: string[],
): void {
  if (!Array.isArray(value)) return;
  for (const item of value) {
    const step = record(item);
    if (!step) continue;
    appendScenarioStep(step.title, givenKeys, actionKeys);
    visitScenarioSteps(step.steps, givenKeys, actionKeys);
  }
}

function appendScenarioStep(
  title: unknown,
  givenKeys: string[],
  actionKeys: string[],
): void {
  if (typeof title !== "string") return;
  const given = /^\[given:([a-z0-9][a-z0-9-]*)\]$/u.exec(title);
  const action = /^\[action:([a-z0-9][a-z0-9-]*)\]$/u.exec(title);
  if (given) givenKeys.push(given[1]);
  if (action) actionKeys.push(action[1]);
}

export function same(left: string[], right: string[]): boolean {
  return (
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
}
