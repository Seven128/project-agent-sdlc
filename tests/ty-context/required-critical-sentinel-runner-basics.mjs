import assert from "node:assert/strict";
import { access } from "node:fs/promises";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import {
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

export async function assertPassingProjection() {
  const fixture = await createFixture({ ownerSource: passingOwner() });
  const result = await runFixture(fixture);

  assert.equal(result.code, 0, result.stderr);
  assert.equal(result.signal, null);
  const report = finalJsonLine(result.stdout);
  assert.equal(report.schema_version, "required-critical-sentinel-report-v1");
  assert.equal(report.result_scope, "registration-projection");
  assert.equal(report.projection_status, "passed");
  assert.equal(report.complete_suite, false);
  assert.equal(report.registry_runtime_observation_complete, false);
  assert.equal(report.semantic_test_population_executed, false);
  assert.equal(report.population_suite, "long-task");
  assert.deepEqual(report.verified_ids, [sentinelId]);
  assert.equal(report.timing.test_status, "passed");
  assert.equal(report.timing.imported_test_count, 0);
  assert.equal(report.timing.unattributed_test_count, 0);
  assert.deepEqual(report.timing.critical_sentinel_coverage.required_ids, [
    sentinelId,
  ]);
  assert.deepEqual(report.timing.critical_sentinel_coverage.observed_ids, [
    sentinelId,
  ]);
  assert.equal(report.timing.critical_sentinel_coverage.status, "passed");
  assert.ok(
    report.timing.critical_sentinel_coverage.applicable_ids.includes(
      sentinelId,
    ),
  );
  assert.ok(
    !report.timing.critical_sentinel_coverage.not_selected_ids.includes(
      sentinelId,
    ),
  );
  assert.ok(
    !report.timing.critical_sentinel_coverage.non_applicable_ids.includes(
      sentinelId,
    ),
  );
  assert.equal(
    report.timing.execution.owner_file,
    `tests/ty-context/${ownerName}`,
  );
  assert.equal(report.timing.execution.platform, process.platform);
  assert.equal(
    report.timing.execution.reporter,
    "tests/ty-context/test-suite-file-reporter.mjs",
  );
}

export async function assertBoundedProcessTree() {
  const fixture = await createFixture({
    name: "bounded-process-tree",
    ownerSource: `import { spawn } from "node:child_process";
import { writeFileSync } from "node:fs";
import test from "node:test";
const survivor = spawn(
  process.execPath,
  [
    "-e",
    'setTimeout(() => require("node:fs").writeFileSync("descendant-survived.txt", "survived"), 2_000)',
  ],
  { stdio: "ignore" },
);
writeFileSync("descendant-started.txt", String(survivor.pid));
await new Promise(() => {});
test("[critical:${sentinelId}] unreachable sentinel", () => {});
`,
    runnerTransform: (source) =>
      replaceRequired(
        source,
        "const REGISTRATION_PROJECTION_TIMEOUT_MS = 300_000;",
        "const REGISTRATION_PROJECTION_TIMEOUT_MS = 1_000;",
      ),
  });
  const result = await runFixture(fixture);

  assert.notEqual(result.code, 0);
  assert.match(result.stderr, /command_timeout/u);
  const report = finalJsonLine(result.stdout);
  assert.equal(report.projection_status, "failed");
  assert.equal(report.timing.execution.timeout_ms, 1_000);
  await access(path.join(fixture, "descendant-started.txt"));
  await delay(2_500);
  await assert.rejects(() =>
    access(path.join(fixture, "descendant-survived.txt")),
  );
}

export async function assertMarkerMutationRejection() {
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
}

export async function assertRuntimeAttributionRejection() {
  const wrongOwner = await createFixture({
    name: "wrong-owner",
    ownerSource: 'import "./long-task-relocated.test.mjs";\n',
    extraFiles: {
      "long-task-relocated.test.mjs": passingOwner(),
    },
  });
  const wrongOwnerResult = await runFixture(wrongOwner);
  assert.notEqual(wrongOwnerResult.code, 0);
  assert.match(wrongOwnerResult.stderr, /critical_sentinel_misplaced/u);

  const imported = await createFixture({
    name: "imported",
    ownerSource: passingOwner(),
    reporterTransform: (source) =>
      replaceRequired(
        source,
        "        file: data.file ?? null,",
        `        file: typeof data.name === "string" && data.name.includes("[critical:")
          ? fileURLToPath(new URL("./long-task-imported.test.mjs", import.meta.url))
          : data.file ?? null,`,
      ),
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
}

export async function assertSuiteWideOwnerUniqueness() {
  const cases = [
    {
      name: "wrong-owner-only",
      ownerSource: ordinaryOwner(),
      extraFiles: {
        "long-task-path-canonicalization.test.mjs": passingOwner(),
      },
      diagnostic: "critical_sentinel_misplaced",
    },
    {
      name: "correct-and-wrong-owner",
      ownerSource: passingOwner(),
      extraFiles: {
        "long-task-path-canonicalization.test.mjs": passingOwner(),
      },
      diagnostic: "critical_sentinel_duplicate",
    },
    {
      name: "duplicate-in-trust-owner",
      ownerSource: passingOwner(),
      extraFiles: {
        "long-task-active-authority-continuity.test.mjs": passingOwner(),
      },
      diagnostic: "critical_sentinel_duplicate",
    },
    {
      name: "duplicate-via-node-test-it",
      ownerSource: passingOwner(),
      extraFiles: {
        "long-task-path-canonicalization.test.mjs": `import { it } from "node:test";
it("[critical:${sentinelId}] duplicate through the Node test alias", () => {});
`,
      },
      diagnostic: "critical_sentinel_duplicate",
    },
  ];

  for (const scenario of cases) {
    const fixture = await createFixture(scenario);
    const result = await runFixture(fixture);
    assert.notEqual(result.code, 0, scenario.name);
    assert.match(
      result.stderr,
      new RegExp(scenario.diagnostic, "u"),
      scenario.name,
    );
    assert.doesNotMatch(
      result.stdout,
      /critical_sentinel_coverage/u,
      scenario.name,
    );
  }
}
