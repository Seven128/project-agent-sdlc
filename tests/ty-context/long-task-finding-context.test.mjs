import assert from "node:assert/strict";
import { rm, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import {
  createDeliveryFixture,
  runCli,
  runCliFailure,
} from "./long-task-delivery-fixtures.mjs";

test("Verify, Status and Resume retain Source-Claim-AC repair context", async () => {
  const fixture = await createDeliveryFixture();
  try {
    await writeFile(
      path.join(fixture.root, "src", "state.json"),
      `${JSON.stringify({
        first: false,
        second: false,
        first_relations_applicable: false,
        second_relations_applicable: false,
      })}\n`,
    );
    await writeFile(
      path.join(fixture.root, "tests", "semantic-false.json"),
      `${JSON.stringify({
        first: false,
        second: true,
        first_relations_applicable: false,
        second_relations_applicable: false,
      })}\n`,
    );
    await runCli(fixture.root, ["enable", "long-task"]);
    await runCli(fixture.root, ["long-task", "compile", fixture.workdir]);
    const failed = await runCliFailure(fixture.root, [
      "long-task",
      "verify",
      fixture.workdir,
    ]);
    const finding = failed.findings.find(
      (item) => item.assertion_key === "first-requirement",
    );
    assert.equal(finding.code, "assertion_value_mismatch");
    assert.deepEqual(finding.source_claim_keys, ["first-observable"]);
    assert.ok(finding.claim_keys.includes("requirement.observe-first"));
    assert.equal(
      finding.criterion,
      "first satisfies its observable requirement.",
    );
    assert.equal(finding.observation, "requirement_result");
    assert.equal(finding.expected, true);
    assert.equal(finding.actual, false);
    assert.deepEqual(finding.owner_paths, [
      "src/**",
      "tests/legacy-oracle.mjs",
    ]);
    assert.match(finding.next_action, /acceptance assertion/u);

    const status = await runCli(fixture.root, [
      "long-task",
      "status",
      fixture.workdir,
    ]);
    assert.deepEqual(
      status.findings.find((item) => item.assertion_key === "first-requirement")
        .source_claim_keys,
      ["first-observable"],
    );
    const resume = await runCli(fixture.root, [
      "long-task",
      "resume",
      fixture.workdir,
    ]);
    assert.equal(
      resume.recent_findings.find(
        (item) => item.assertion_key === "first-requirement",
      ).observation,
      "requirement_result",
    );

    const explain = await runCli(fixture.root, [
      "long-task",
      "explain",
      fixture.workdir,
    ]);
    const source = explain.source_items.find(
      (item) => item.key === "first-observable",
    );
    assert.deepEqual(source.links[0].assertions, ["first-requirement"]);
    assert.deepEqual(source.links[0].checks, ["first-check"]);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});
