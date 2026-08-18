import assert from "node:assert/strict";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  normalizeHostTrace,
  normalizeRepositoryRelativePath,
} from "../../tools/normalized_host_trace.mjs";
import { buildSelfHostingCostReport } from "../../tools/self_hosting_cost_report.mjs";
import { collectRepositoryCandidate } from "../../tools/self_hosting_cost_repository.mjs";

const repository = fileURLToPath(new URL("../..", import.meta.url));
const HEAD = "0123456789abcdef0123456789abcdef01234567";
const TREE = "a".repeat(64);
const tracePath = ".artifacts/self-hosting-cost/integration-host-trace.json";
const timingPath = ".artifacts/self-hosting-cost/integration-timing.json";
const structuralPath =
  ".artifacts/self-hosting-cost/integration-structural.json";

test("v1 host traces remain partial and never manufacture v2 observations", () => {
  const normalized = normalizeHostTrace({
    schema_version: "tiny-context-host-trace-v1",
    source: "host_tool_trace",
    context_files_read: ["project_context\\global.md"],
    context_read_rounds: 1,
    source_files_read: ["packages\\ty-context\\src\\index.ts"],
    total_tool_calls: 7,
    total_tokens: 1800,
  });
  assert.equal(normalized.availability, "partial");
  assert.equal(normalized.provenance.availability, "unavailable");
  assert.deepEqual(normalized.opened_files, [
    { kind: "context", path: "project_context/global.md" },
    { kind: "source", path: "packages/ty-context/src/index.ts" },
  ]);
  assert.equal(normalized.measurements.total_tool_calls.value, 7);
  assert.equal(normalized.measurements.total_tokens.value, 1800);
  for (const name of ["input_tokens", "tool_turns", "wall_time_ms"]) {
    assert.equal(normalized.measurements[name].availability, "unavailable");
  }
  assert.equal(normalized.candidate.availability, "unavailable");

  const selfReport = normalizeHostTrace({
    schema_version: "tiny-context-host-trace-v1",
    source: "agent_self_report",
    context_files_read: [],
    context_read_rounds: 0,
    total_tool_calls: 0,
    total_tokens: 0,
  });
  assert.equal(selfReport.availability, "unavailable");
  assert.equal(selfReport.reason, "non_host_trace_source");
});

test("v2 host traces require exact candidate binding and strict measurements", () => {
  const trace = strictTrace();
  const normalized = normalizeHostTrace(trace, expectedCandidate());
  assert.equal(normalized.availability, "available");
  assert.deepEqual(normalized.provenance, {
    availability: "unavailable",
    reason: "host_trace_origin_not_independently_attested",
  });
  assert.deepEqual(normalized.candidate, {
    availability: "available",
    head_commit: HEAD,
    working_tree_digest: TREE,
  });
  assert.deepEqual(normalized.opened_files, [
    { kind: "context", path: "project_context/global.md" },
    { kind: "reference", path: ".codex/skills/example/references/policy.md" },
    { kind: "skill", path: ".codex/skills/example/SKILL.md" },
    { kind: "source", path: "tools/report.mjs" },
  ]);
  assert.equal(normalized.measurements.input_tokens.value, 1234);
  assert.equal(normalized.measurements.tool_turns.value, 8);
  assert.equal(normalized.measurements.wall_time_ms.value, 900);
  assert.equal(normalized.measurements.total_tokens.availability, "unavailable");

  const mismatch = normalizeHostTrace(trace, {
    ...expectedCandidate(),
    expectedHeadCommit: "f".repeat(40),
  });
  assert.equal(mismatch.availability, "unavailable");
  assert.equal(mismatch.reason, "candidate_mismatch");
  const extra = normalizeHostTrace(
    { ...trace, agent_report: { passed: true } },
    expectedCandidate(),
  );
  assert.equal(extra.availability, "unavailable");
  assert.equal(extra.reason, "invalid_schema");
});

test("host paths normalize Windows separators and reject escapes or kind masquerades", () => {
  assert.equal(
    normalizeRepositoryRelativePath("project_context\\areas\\harness-package.md"),
    "project_context/areas/harness-package.md",
  );
  for (const unsafe of [
    "..\\secret.txt",
    "project_context/../secret.txt",
    "C:\\Dev\\secret.txt",
    "C:relative.txt",
    "\\\\server\\share\\secret.txt",
    "/etc/passwd",
  ]) {
    assert.throws(
      () => normalizeRepositoryRelativePath(unsafe),
      /unsafe_opened_file_path/u,
    );
    assertTracePathRejected("source", unsafe, "unsafe_opened_file_path");
  }
  for (const [kind, invalidPath, reason] of [
    ["skill", "tools/report.mjs", "invalid_skill_path"],
    ["skill", ".codex/skills/example/references/SKILL.md", "invalid_skill_path"],
    ["reference", ".codex/skills/example/SKILL.md", "invalid_reference_path"],
    ["reference", ".codex/skills/references/policy.md", "invalid_reference_path"],
    [
      "reference",
      ".codex/skills/example/references/SKILL.md",
      "invalid_reference_path",
    ],
    ["source", "project_context/global.md", "invalid_source_path"],
  ]) {
    assertTracePathRejected(kind, invalidPath, reason);
  }
});

test("candidate-bound supplied traces remain unattested and ignored trace paths never count", async () => {
  try {
    const candidate = await collectRepositoryCandidate();
    await writeFixture(tracePath, {
      ...strictTrace(candidate),
      opened_files: [{ kind: "context", path: "project_context/global.md" }],
      usage: { input_tokens: 123 },
      tool_turns: 4,
      wall_time_ms: 250,
    });
    await writeFixture(timingPath, {
      schema_version: "test-suite-timing-v2",
      suite: "default",
      file_count: 1,
      test_count: 1,
      wall_time_ms: 12,
      status: "passed",
      files: [{
        file: "tests/ty-context/self-hosting-cost-host-trace.test.mjs",
        duration_ms: 12,
        test_count: 1,
        status: "passed",
      }],
    });
    await writeFixture(structuralPath, {
      schema_version: "structural-closure-cost-report-v1",
      status: "passed",
      baseline: { profile: "windows-v1", workload: "integration fixture" },
    });
    const report = await buildSelfHostingCostReport({
      baseRef: "HEAD",
      hostTrace: tracePath,
      timings: [timingPath],
      structuralReport: structuralPath,
    });
    const observed = report.cost_classes.observed_host;
    assert.equal(observed.availability, "available");
    assert.equal(observed.provenance.availability, "unavailable");
    assert.equal(observed.measurements.input_tokens.value, 123);
    assert.equal(observed.measurements.tool_turns.value, 4);
    assert.equal(observed.measurements.wall_time_ms.value, 250);
    assert.equal(
      observed.current_candidate_opened_file_bytes.availability,
      "unavailable",
    );
    assert.equal(
      observed.current_candidate_opened_file_bytes.reason,
      "host_trace_origin_not_independently_attested",
    );
    const maintenance = report.cost_classes.maintenance_distribution;
    assert.equal(maintenance.test_suites.timing.availability, "unavailable");
    assert.equal(
      maintenance.test_suites.timing.reason,
      "candidate_binding_not_provided_by_test_suite_timing_v2",
    );
    assert.equal(
      maintenance.structural_cost_owner.current_report.availability,
      "unavailable",
    );
    assert.equal(
      maintenance.structural_cost_owner.current_report.reason,
      "candidate_binding_not_provided_by_structural_report_v1",
    );
    assert.deepEqual(
      report.hotspots.map((group) => group.unit),
      ["bytes", "projection_files", "test_files"],
    );
    assert.ok(
      report.hotspots
        .flatMap((group) => group.hotspots)
        .every((entry) => !entry.key.startsWith("maintenance.test/")),
    );
    assertNoCurrentHostMetrics(report);

    await writeFixture(tracePath, {
      ...strictTrace(candidate),
      opened_files: [{ kind: "source", path: tracePath }],
      usage: { input_tokens: 1 },
      tool_turns: 1,
      wall_time_ms: 1,
    });
    const ignored = await buildSelfHostingCostReport({
      baseRef: "HEAD",
      hostTrace: tracePath,
    });
    assert.equal(
      ignored.cost_classes.observed_host.current_candidate_opened_file_bytes
        .reason,
      "opened_file_not_candidate_bound",
    );
    assertNoCurrentHostMetrics(ignored);
  } finally {
    for (const relative of [tracePath, timingPath, structuralPath]) {
      await rm(path.join(repository, relative), { force: true });
    }
  }
});

function assertTracePathRejected(kind, invalidPath, reason) {
  const trace = strictTrace();
  trace.opened_files = [{ kind, path: invalidPath }];
  const normalized = normalizeHostTrace(trace, expectedCandidate());
  assert.equal(normalized.availability, "unavailable");
  assert.equal(normalized.reason, reason);
}

function assertNoCurrentHostMetrics(report) {
  const entries = report.hotspots.flatMap((group) => group.hotspots);
  assert.ok(report.metric_index.every((entry) => !entry.key.startsWith("observed.")));
  assert.ok(entries.every((entry) => !entry.key.startsWith("observed.")));
  const baseline = report.diagnostic_baseline.value;
  assert.ok(baseline.current_only.every((entry) => !entry.key.startsWith("observed.")));
  assert.ok(baseline.deltas.every((entry) => !entry.key.startsWith("observed.")));
}

function strictTrace(candidate = { head_commit: HEAD, working_tree: { digest: TREE } }) {
  return {
    schema_version: "tiny-context-host-trace-v2",
    source: "host_tool_trace",
    candidate: {
      head_commit: candidate.head_commit,
      working_tree_digest: candidate.working_tree.digest,
    },
    opened_files: [
      { kind: "source", path: "tools\\report.mjs" },
      { kind: "context", path: "project_context\\global.md" },
      { kind: "skill", path: ".codex/skills/example/SKILL.md" },
      { kind: "reference", path: ".codex/skills/example/references/policy.md" },
    ],
    usage: { input_tokens: 1234 },
    tool_turns: 8,
    wall_time_ms: 900,
  };
}

function expectedCandidate() {
  return { expectedHeadCommit: HEAD, expectedWorkingTreeDigest: TREE };
}

async function writeFixture(relative, value) {
  const absolute = path.join(repository, relative);
  await mkdir(path.dirname(absolute), { recursive: true });
  await writeFile(absolute, `${JSON.stringify(value)}\n`, "utf8");
}
