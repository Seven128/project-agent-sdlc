import assert from "node:assert/strict";
import test from "node:test";
import {
  classifyMissingTools,
  classifyUnknownValidator,
  parseArgs,
  renderMarkdownReport,
  summarizeChecks
} from "../../tools/consumer_lab_full_test.mjs";

test("consumer lab script parses safety and report options", () => {
  const options = parseArgs([
    "--lab-dir",
    "/tmp/lab",
    "--source-root",
    "/tmp/source",
    "--reset-lab",
    "--report-only",
    "--commit-lab",
    "--tag-prefix",
    "evidence",
    "--json-report",
    "/tmp/report.json",
    "--markdown-report",
    "/tmp/report.md"
  ]);

  assert.equal(options.labDir, "/tmp/lab");
  assert.equal(options.sourceRoot, "/tmp/source");
  assert.equal(options.resetLab, true);
  assert.equal(options.reportOnly, true);
  assert.equal(options.commitLab, true);
  assert.equal(options.tagPrefix, "evidence");
  assert.equal(options.jsonReport, "/tmp/report.json");
  assert.equal(options.markdownReport, "/tmp/report.md");
});

test("consumer lab script classifies known package boundary gaps", () => {
  assert.deepEqual(
    classifyMissingTools({
      status: 2,
      stdout: "",
      stderr: "python3: can't open file '/lab/tools/validate_harness.py': [Errno 2] No such file or directory"
    }),
    {
      status: "BLOCKED",
      details: "consumer repo is missing generated Makefile tools/** dependency"
    }
  );

  assert.deepEqual(
    classifyUnknownValidator({
      status: 1,
      stdout: "",
      stderr: "error: unknown validator: validate-review"
    }),
    {
      status: "BLOCKED",
      details: "package CLI does not expose this later-stage validator yet"
    }
  );
});

test("consumer lab script summarizes and renders reports", () => {
  const checks = [
    { area: "Package", evidence: "install", status: "PASS", details: "ok" },
    { area: "Makefile", evidence: "validate-harness", status: "BLOCKED", details: "missing tools" },
    { area: "Other", evidence: "unexpected", status: "FAIL", details: "bad" }
  ];
  const summary = summarizeChecks(checks);
  assert.deepEqual(summary, { PASS: 1, BLOCKED: 1, FAIL: 1, worst: "FAIL" });

  const markdown = renderMarkdownReport({
    packageName: "agent-project-sdlc",
    packageVersion: "0.0.0",
    sourceRoot: "/source",
    labDir: "/lab",
    labCommit: "abc123",
    labTag: "tag",
    startedAt: "start",
    finishedAt: "finish",
    summary,
    checks,
    recommendedRfc: {
      title: "RFC: Close installed-consumer workflow coverage gaps",
      impactAreas: ["tests"]
    }
  });
  assert.match(markdown, /Decision: FAIL/);
  assert.match(markdown, /validate-harness/);
  assert.match(markdown, /Recommended RFC/);
});
