import assert from "node:assert/strict";
import {
  createFixture,
  ownerName,
  passingOwner,
  replaceRequired,
  runFixture,
  sentinelId,
  suite,
  testOwner,
} from "./required-critical-sentinel-runner-fixture.mjs";

const supportedPlatforms = ["linux", "darwin", "win32"];

export async function assertParameterBodyEnvironmentBoundary() {
  const cases = [
    {
      name: "default-parameter-environment",
      source: `import test from "node:test";
function registerDefaultParameter(
  registered = test("[critical:${sentinelId}] default-parameter duplicate", () => {}),
) {
  var test;
  return registered;
}
registerDefaultParameter();
`,
    },
    {
      name: "simple-parameter-var-redeclaration",
      source: `import test from "node:test";
test("ordinary outer", (t) => {
  var t;
  t.test("[critical:${sentinelId}] simple parameter duplicate", () => {});
});
`,
    },
  ];
  for (const scenario of cases) {
    const fixture = await createFixture({
      name: scenario.name,
      ownerSource: passingOwner(),
      extraFiles: {
        "long-task-path-canonicalization.test.mjs": scenario.source,
      },
    });
    const result = await runFixture(fixture);
    assert.notEqual(result.code, 0, scenario.name);
    assert.match(result.stderr, /critical_sentinel_duplicate/u, scenario.name);
  }
}

export async function assertDynamicModuleLoadingRejection() {
  const cases = [
    {
      name: "unresolved-local-side-effect",
      source: `import test from "node:test";
const helperName = process.argv.length > 0
  ? "./hidden-runtime.cases.mjs"
  : "./hidden-runtime.cases.mjs";
const runtimeProduct = await import(helperName);
if (runtimeProduct.verifyProduct() !== true) throw new Error("invalid helper");
test("ordinary dynamic product test", () => {});
`,
    },
    {
      name: "conditional-local-modules",
      source: `const helper = process.argv.length > 0 ? "./left.mjs" : "./right.mjs";
await import(helper);
`,
    },
    {
      name: "node-vm-dynamic-import",
      source: `await import("node:vm");
`,
    },
    {
      name: "data-url-dynamic-import",
      source: `await import("data:text/javascript,export default true");
`,
    },
    {
      name: "bare-package-dynamic-import",
      source: `await import("acorn");
`,
    },
    {
      name: "escaped-local-dynamic-import",
      source: `await import("../../outside-helper.mjs");
`,
    },
    {
      name: "external-file-url-dynamic-import",
      source: `await import("file:///C:/outside-helper.mjs");
`,
    },
  ];

  for (const scenario of cases) {
    const fixture = await createFixture({
      name: scenario.name,
      ownerSource: passingOwner(),
      extraFiles: {
        "long-task-path-canonicalization.test.mjs": scenario.source,
      },
    });
    const result = await runFixture(fixture);
    assert.notEqual(result.code, 0, scenario.name);
    assert.match(
      result.stderr,
      /critical_test_title_inventory_unsupported_dynamic_import/u,
      scenario.name,
    );
    assert.doesNotMatch(
      result.stdout,
      /critical_sentinel_coverage/u,
      scenario.name,
    );
  }
}

export async function assertNonPassingSentinelRejection() {
  const skipped = await createFixture({
    name: "skipped",
    ownerSource: testOwner(
      `[critical:${sentinelId}] skipped sentinel`,
      '{ skip: "fixture skip" }, () => {}',
    ),
  });
  const skippedResult = await runFixture(skipped);
  assert.notEqual(skippedResult.code, 0);
  assert.match(skippedResult.stderr, /critical_sentinel_non_passing/u);

  const failed = await createFixture({
    name: "failed",
    ownerSource: testOwner(
      `[critical:${sentinelId}] failed sentinel`,
      '() => { throw new Error("fixture failure"); }',
    ),
  });
  const failedResult = await runFixture(failed);
  assert.notEqual(failedResult.code, 0);
  assert.match(failedResult.stderr, /critical_sentinel_non_passing/u);
  assert.match(failedResult.stderr, /execution_exit_code/u);

  const todo = await createFixture({
    name: "todo",
    ownerSource: `import test from "node:test";\ntest.todo("[critical:${sentinelId}] todo sentinel", () => {});\n`,
  });
  const todoResult = await runFixture(todo);
  assert.notEqual(todoResult.code, 0);
  assert.match(todoResult.stderr, /critical_sentinel_non_passing/u);
}

export async function assertPlatformApplicability() {
  const wrongPlatform = supportedPlatforms.find(
    (platform) => platform !== process.platform,
  );
  assert.ok(wrongPlatform, `unsupported test platform: ${process.platform}`);
  const fixture = await createFixture({
    name: "wrong-platform",
    ownerSource: passingOwner(),
    requiredPlatform: wrongPlatform,
  });
  const result = await runFixture(fixture);

  assert.notEqual(result.code, 0);
  assert.match(result.stderr, /required_critical_sentinel_wrong_platform/u);
  assert.doesNotMatch(result.stdout, /critical_sentinel_coverage/u);
}

export async function assertReporterFailureHandling() {
  const missing = await createFixture({
    name: "missing-report",
    ownerSource: passingOwner(),
    reporterTransform: (source) =>
      replaceRequired(
        source,
        "    const serialized = serializeEvent(event);",
        "    const serialized = null;",
      ),
  });
  const missingResult = await runFixture(missing);
  assert.notEqual(missingResult.code, 0);
  assert.match(missingResult.stderr, /report_missing_or_empty/u);

  const corrupt = await createFixture({
    name: "corrupt-report",
    ownerSource: passingOwner(),
    reporterTransform: (source) =>
      replaceRequired(
        source,
        "    if (serialized) yield `${JSON.stringify(serialized)}\\n`;",
        '    if (serialized) yield "{corrupt-json\\n";',
      ),
  });
  const corruptResult = await runFixture(corrupt);
  assert.notEqual(corruptResult.code, 0);
  assert.match(corruptResult.stderr, /report_read_failed/u);
}

export async function assertClosedRunnerArguments() {
  const fixture = await createFixture({
    name: "extra-option",
    ownerSource: passingOwner(),
  });
  const result = await runFixture(fixture, [
    suite,
    sentinelId,
    "--owner",
    ownerName,
  ]);

  assert.notEqual(result.code, 0);
  assert.match(result.stderr, /Usage: node tools\/run_required/u);
  assert.doesNotMatch(result.stdout, /critical_sentinel_coverage/u);
}
