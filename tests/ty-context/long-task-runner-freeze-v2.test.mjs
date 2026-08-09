import assert from "node:assert/strict";
import { copyFile, mkdir, readFile, rm, writeFile } from "node:fs/promises";
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
import {
  fixtureProductRootArgv,
  fixtureProductRootPath,
} from "./long-task-package-machine-fixture.mjs";

test("Evidence Adapter identity participates in Acceptance Authority", () => {
  const structured = deliveryContract();
  const sameAdapter = structuredClone(structured);
  sameAdapter.outcomes[0].acceptance.checks[0].runner.type = "project_binary";
  const playwright = structuredClone(structured);
  playwright.outcomes[0].acceptance.checks[0].runner.type = "playwright_test";
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
    const subdirectoryRoot = `tools/sub/${path.basename(fixtureProductRootPath())}`;
    await copyFile(
      path.join(fixture.root, ...fixtureProductRootPath().split("/")),
      path.join(fixture.root, ...subdirectoryRoot.split("/")),
    );
    await writeFile(
      path.join(fixture.root, "tools/sub/product-observation.mjs"),
      `const assertion = (key) => "assertion.first.first-check." + key;
console.log(JSON.stringify({
  schema_version: "ty-context-product-observation-v1",
  observations: {
    "fact.first.observable": true,
    [assertion("first-result")]: true,
    [assertion("first-requirement")]: true,
    [assertion("first-obligation")]: true,
    [assertion("first-architecture")]: true,
    [assertion("first-liveness")]: true,
    [assertion("first-relations-na")]: false
  }
}));
`,
    );
    const check = fixture.contract.outcomes[0].acceptance.checks[0];
    const rootArgv = fixtureProductRootArgv("product-observation.mjs", "first");
    fixture.contract.task.execution_targets[0].root_entrypoint =
      subdirectoryRoot;
    fixture.contract.task.execution_targets[0].root_argv = [...rootArgv];
    check.runner.cwd = "tools/sub";
    check.runner.target = path.basename(subdirectoryRoot);
    check.runner.argv = [...rootArgv];
    check.verification_inputs = [
      subdirectoryRoot,
      "tools/sub/product-observation.mjs",
      "tests/semantic-false.json",
    ];
    await writeContract(fixture.workdir, fixture.contract);
    await runCli(fixture.root, ["enable", "long-task"]);
    await runCli(fixture.root, ["long-task", "compile", fixture.workdir]);
    const compiled = await compiledContract(fixture.workdir);
    const frozen = compiled.outcomes[0].acceptance.checks[0];
    assert.equal(frozen.runner.resolved_cwd, "tools/sub");
    assert.equal(frozen.runner.resolved_target, subdirectoryRoot);
    const raw = await executeCheckRunner(frozen, fixture.root, {
      snapshot_sha256: "1".repeat(64),
      observation_authorities: frozen.observation_authorities,
    });
    assert.equal(raw.execution_status, "completed", raw.error);
    assert.deepEqual(raw.observations, {});
    assert.ok(
      raw.package_observations.some(
        (observation) =>
          observation.observation_identity ===
            "assertion.first.first-check.first-result" &&
          observation.raw_value === true,
      ),
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("helper, fixture, Playwright config, package script and lockfile are frozen", async () => {
  const fixture = await createDeliveryFixture();
  try {
    await writeFile(
      path.join(fixture.root, "tests/helper.mjs"),
      "export {};\n",
    );
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
    const outcome = fixture.contract.outcomes[0];
    fixture.contract.task.execution_targets.push({
      key: "fixture-browser",
      description:
        "Diagnostic browser target used only to freeze its runner inputs.",
      role: "product",
      runtime_family: "browser",
      root_entrypoint: "tests/ui.spec.mjs",
      capabilities: ["browser-runtime", "cold-start", "production-root"],
    });
    const check = structuredClone(outcome.acceptance.checks[0]);
    check.key = "playwright-freeze";
    check.runner.type = "playwright_test";
    check.runner.target = "tests/ui.spec.mjs";
    check.execution_target.target_ref = "fixture-browser";
    check.proof_surface = "ui_browser";
    check.positive_assertions = [];
    check.negative_assertions = [];
    check.verification_inputs = [
      "tests/helper.mjs",
      "tests/fixture.json",
      "tests/semantic-false.json",
    ];
    outcome.acceptance.checks.push(check);
    await writeContract(fixture.workdir, fixture.contract);
    await runCli(fixture.root, ["enable", "long-task"]);
    await runCli(fixture.root, ["long-task", "compile", fixture.workdir]);
    const compiled = await compiledContract(fixture.workdir);
    const frozen = compiled.outcomes[0].acceptance.checks.find(
      (candidate) => candidate.key === "playwright-freeze",
    );
    assert.ok(frozen);
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
      check.positive_assertions = [];
      check.negative_assertions = [];
      check.observation_authorities = [];
      check.runner.type = "playwright_test";
      check.runner.executable = process.execPath;
      check.runner.executable_argv_prefix = [
        "-e",
        `process.stdout.write(${JSON.stringify(JSON.stringify({ stats }))})`,
      ];
      check.runner.argv = [];
      const raw = await executeCheckRunner(check, fixture.root);
      const evidence = await evaluateCheckEvidence(check, raw, fixture.root);
      assert.equal(evidence.status, "test_failed");
      assert.equal(raw.observations["playwright.zero_or_all_skipped"], true);
    }
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

async function compiledContract(workdir) {
  return JSON.parse(
    await readFile(
      path.join(workdir, ".ty-context/compiled-contract.json"),
      "utf8",
    ),
  );
}
