import assert from "node:assert/strict";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { computeAuthorityHashes } from "../../packages/ty-context/dist/lib/long-task-authority.js";
import { executeCheckRunner } from "../../packages/ty-context/dist/lib/long-task-check-runner.js";
import { evaluateCheckEvidence } from "../../packages/ty-context/dist/lib/long-task-evidence-v2.js";
import { deliveryCompileFreshness } from "../../packages/ty-context/dist/lib/long-task-freshness.js";
import {
  createDeliveryFixture,
  deliveryContract,
  runCli,
  writeContract,
} from "./long-task-delivery-fixtures.mjs";

test("Evidence Adapter identity participates in Acceptance Authority", () => {
  const structured = deliveryContract();
  const sameAdapter = structuredClone(structured);
  sameAdapter.outcomes[0].acceptance.checks[0].runner.type =
    "project_binary";
  const playwright = structuredClone(structured);
  playwright.outcomes[0].acceptance.checks[0].runner.type =
    "playwright_test";
  assert.equal(
    computeAuthorityHashes(structured).acceptance_authority_hash,
    computeAuthorityHashes(sameAdapter).acceptance_authority_hash,
  );
  assert.notEqual(
    computeAuthorityHashes(structured).acceptance_authority_hash,
    computeAuthorityHashes(playwright).acceptance_authority_hash,
  );
});

test("runner target resolves from a subdirectory and executes that frozen target", async () => {
  const fixture = await createDeliveryFixture();
  try {
    await mkdir(path.join(fixture.root, "tools/sub"), { recursive: true });
    await writeFile(
      path.join(fixture.root, "tools/sub/oracle.mjs"),
      'console.log(JSON.stringify({schema_version:"long-task-check-result-v3",execution_status:"completed",observations:{result:true},evidence_records:[{assertion_key:"first-result",capability:"target_runtime",target_ref:"fixture-app",root_entrypoint:"tests/oracle.mjs",session_id:"subdirectory-session",cold_start:true},{assertion_key:"first-result",capability:"state_delta",before_sha256:"0".repeat(64),after_sha256:"1".repeat(64),changed_fields:["first"]}]}));\n',
    );
    const check = fixture.contract.outcomes[0].acceptance.checks[0];
    check.runner.cwd = "tools/sub";
    check.runner.target = "oracle.mjs";
    check.verification_inputs = [
      "tools/sub/oracle.mjs",
      "tests/semantic-false.json",
    ];
    await writeContract(fixture.workdir, fixture.contract);
    await runCli(fixture.root, ["enable", "long-task"]);
    await runCli(fixture.root, ["long-task", "compile", fixture.workdir]);
    const compiled = await compiledContract(fixture.workdir);
    const frozen = compiled.outcomes[0].acceptance.checks[0];
    assert.equal(frozen.runner.resolved_cwd, "tools/sub");
    assert.equal(frozen.runner.resolved_target, "tools/sub/oracle.mjs");
    const raw = await executeCheckRunner(frozen, fixture.root);
    assert.equal(raw.execution_status, "completed");
    assert.equal(raw.observations.result, true);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("helper, fixture, Playwright config, package script and lockfile are frozen", async () => {
  const fixture = await createDeliveryFixture();
  try {
    await writeFile(path.join(fixture.root, "tests/helper.mjs"), "export {};\n");
    await writeFile(path.join(fixture.root, "tests/fixture.json"), "{}\n");
    await writeFile(
      path.join(fixture.root, "tests/ui.spec.mjs"),
      `// [ac:first-result]
// [ac:first-architecture]
// [ac:first-requirement]
// [ac:first-obligation]
// [ac:first-relations-na]
`,
    );
    await writeFile(
      path.join(fixture.root, "playwright.config.mjs"),
      "export default {};\n",
    );
    await writeFile(path.join(fixture.root, "package-lock.json"), "{}\n");
    const check = fixture.contract.outcomes[0].acceptance.checks[0];
    fixture.contract.task.execution_targets[0].runtime_family = "browser";
    fixture.contract.task.execution_targets[0].capabilities = [
      "browser-runtime",
      "cold-start",
      "production-root",
    ];
    check.runner.type = "playwright_test";
    check.runner.target = "tests/ui.spec.mjs";
    check.proof_surface = "ui_browser";
    for (const assertion of check.positive_assertions) {
      if (!assertion.claims.length) continue;
      assertion.observation = `playwright.case.${assertion.key}.passed`;
      assertion.evidence_capabilities = [
        "interaction_trace",
        "target_runtime",
      ];
    }
    for (const assertion of check.negative_assertions) {
      assertion.observation = `playwright.case.${assertion.key}.passed`;
      assertion.evidence_capabilities = [
        "interaction_trace",
        "target_runtime",
      ];
      assertion.operator = "equals";
      assertion.expected = true;
    }
    fixture.contract.outcomes[0].product.requirements[0].required_proof_surfaces =
      ["ui_browser"];
    for (const obligation of fixture.contract.outcomes[0].technical
      .obligations)
      obligation.required_proof_surfaces = ["ui_browser"];
    check.verification_inputs = [
      "tests/helper.mjs",
      "tests/fixture.json",
      "tests/semantic-false.json",
    ];
    await writeContract(fixture.workdir, fixture.contract);
    await runCli(fixture.root, ["enable", "long-task"]);
    await runCli(fixture.root, ["long-task", "compile", fixture.workdir]);
    const compiled = await compiledContract(fixture.workdir);
    const frozen = compiled.outcomes[0].acceptance.checks[0];
    for (const file of [
      "tests/helper.mjs",
      "tests/fixture.json",
      "tests/ui.spec.mjs",
      "playwright.config.mjs",
      "package.json",
      "package-lock.json",
    ])
      assert.ok(frozen.runner.frozen_files[file], file);

    for (const file of [
      "tests/helper.mjs",
      "tests/fixture.json",
      "playwright.config.mjs",
      "package-lock.json",
    ]) {
      const original = await readFile(path.join(fixture.root, file), "utf8");
      await writeFile(path.join(fixture.root, file), `${original}// changed\n`);
      assert.ok(
        (await deliveryCompileFreshness(compiled)).some((finding) =>
          finding.endsWith(`:${file}`),
        ),
        file,
      );
      await writeFile(path.join(fixture.root, file), original);
    }

    const packageJson = JSON.parse(
      await readFile(path.join(fixture.root, "package.json"), "utf8"),
    );
    packageJson.scripts.oracle = "node tests/oracle.mjs second";
    await writeFile(
      path.join(fixture.root, "package.json"),
      `${JSON.stringify(packageJson, null, 2)}\n`,
    );
    assert.ok(
      (await deliveryCompileFreshness(compiled)).some((finding) =>
        finding.endsWith(":package.json"),
      ),
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("zero-test and all-skipped Playwright reports cannot pass", async () => {
  const fixture = await createDeliveryFixture();
  try {
    await runCli(fixture.root, ["enable", "long-task"]);
    await runCli(fixture.root, ["long-task", "compile", fixture.workdir]);
    const compiled = await compiledContract(fixture.workdir);
    const base = compiled.outcomes[0].acceptance.checks[0];
    for (const stats of [
      { expected: 0, unexpected: 0, skipped: 0, flaky: 0 },
      { expected: 0, unexpected: 0, skipped: 1, flaky: 0 },
    ]) {
      const check = structuredClone(base);
      check.runner.type = "playwright_test";
      check.runner.executable = process.execPath;
      check.runner.executable_argv_prefix = [
        "-e",
        `process.stdout.write(${JSON.stringify(JSON.stringify({ stats }))})`,
      ];
      check.runner.argv = [];
      const raw = await executeCheckRunner(check, fixture.root);
      const evidence = await evaluateCheckEvidence(
        check,
        raw,
        fixture.root,
        compiled.outcomes[0],
      );
      assert.equal(evidence.status, "test_failed");
      assert.equal(raw.observations["playwright.zero_or_all_skipped"], true);
    }
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

async function compiledContract(workdir) {
  return JSON.parse(
    await readFile(path.join(workdir, ".ty-context/compiled-contract.json"), "utf8"),
  );
}
