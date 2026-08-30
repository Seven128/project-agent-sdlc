import assert from "node:assert/strict";
import { after, test } from "node:test";
import {
  cleanupFixtures,
  createFixture,
  finalJsonLine,
  ordinaryOwner,
  ownerName,
  passingOwner,
  replaceRequired,
  runFixture,
  sentinelId,
  suite,
  testDeclaration,
  testOwner,
} from "./required-critical-sentinel-runner-fixture.mjs";

const supportedPlatforms = ["linux", "darwin", "win32"];

after(cleanupFixtures);

test("required sentinel runner accepts one applicable, selected-owner passing occurrence", async () => {
  const fixture = await createFixture({ ownerSource: passingOwner() });
  const result = await runFixture(fixture);

  assert.equal(result.code, 0, result.stderr);
  assert.equal(result.signal, null);
  const report = finalJsonLine(result.stdout);
  assert.equal(report.test_status, "passed");
  assert.equal(report.imported_test_count, 0);
  assert.equal(report.unattributed_test_count, 0);
  assert.deepEqual(report.critical_sentinel_coverage.required_ids, [
    sentinelId,
  ]);
  assert.deepEqual(report.critical_sentinel_coverage.observed_ids, [
    sentinelId,
  ]);
  assert.equal(report.critical_sentinel_coverage.status, "passed");
  assert.equal(report.execution.owner_file, `tests/ty-context/${ownerName}`);
  assert.equal(report.execution.platform, process.platform);
  assert.equal(
    report.execution.reporter,
    "tests/ty-context/test-suite-file-reporter.mjs",
  );
});

test("required sentinel runner rejects removed, renamed, and duplicate markers", async () => {
  const cases = [
    {
      name: "removed",
      ownerSource: ordinaryOwner(),
      diagnostics: ["critical_sentinel_missing"],
    },
    {
      name: "renamed",
      ownerSource: testOwner(
        `[critical:${sentinelId}-renamed] renamed sentinel`,
        "() => {}",
      ),
      diagnostics: ["critical_sentinel_missing"],
    },
    {
      name: "duplicate",
      ownerSource: `${passingOwner()}\n${testDeclaration(
        `[critical:${sentinelId}] duplicate sentinel`,
        "() => {}",
      )}\n`,
      diagnostics: ["critical_sentinel_duplicate"],
    },
  ];

  for (const scenario of cases) {
    const fixture = await createFixture({
      name: scenario.name,
      ownerSource: scenario.ownerSource,
    });
    const result = await runFixture(fixture);
    assert.notEqual(result.code, 0, scenario.name);
    for (const diagnostic of scenario.diagnostics)
      assert.match(result.stderr, new RegExp(diagnostic, "u"), scenario.name);
  }
});

test("required sentinel runner rejects wrong-owner, imported, and unattributed events", async () => {
  const wrongOwner = await createFixture({
    name: "wrong-owner",
    ownerSource: 'import "./relocated.test.mjs";\n',
    extraFiles: {
      "relocated.test.mjs": passingOwner(),
    },
  });
  const wrongOwnerResult = await runFixture(wrongOwner);
  assert.notEqual(wrongOwnerResult.code, 0);
  assert.match(wrongOwnerResult.stderr, /critical_sentinel_misplaced/u);

  const imported = await createFixture({
    name: "imported",
    ownerSource: `import "./imported.test.mjs";\n${passingOwner()}`,
    extraFiles: {
      "imported.test.mjs": passingOwner(),
    },
  });
  const importedResult = await runFixture(imported);
  assert.notEqual(importedResult.code, 0);
  assert.match(importedResult.stderr, /imported_tests_observed/u);

  const unattributed = await createFixture({
    name: "unattributed",
    ownerSource: passingOwner(),
    reporterTransform: (source) =>
      replaceRequired(
        replaceRequired(
          source,
          "        file: data.file ?? null,",
          "        file: null,",
        ),
        "        nesting: data.nesting ?? null,",
        "        nesting: 1,",
      ),
  });
  const unattributedResult = await runFixture(unattributed);
  assert.notEqual(unattributedResult.code, 0);
  assert.match(unattributedResult.stderr, /unattributed_tests_observed/u);
});

test("required sentinel runner rejects skipped and failed sentinel results", async () => {
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
});

test("required sentinel runner derives and enforces current platform applicability", async () => {
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
});

test("required sentinel runner rejects missing and corrupt reporter output", async () => {
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
});

test("required sentinel runner accepts no caller-selected owner, platform, reporter, or test options", async () => {
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
});
