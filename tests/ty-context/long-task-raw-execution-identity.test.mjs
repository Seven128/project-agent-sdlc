import assert from "node:assert/strict";
import { readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { loadActiveLongTaskAuthority } from "../../packages/ty-context/dist/lib/long-task-state.js";
import {
  commitCandidate,
  createDeliveryFixture,
  runCli,
  runCliFailure,
  writeContract,
} from "./long-task-delivery-fixtures.mjs";

test("different Environment Requirements cannot reuse Raw Execution", async () => {
  const fixture = await createDeliveryFixture();
  const marker = path.join(
    os.tmpdir(),
    `ty-context-raw-${process.pid}-${Date.now()}.txt`,
  );
  try {
    await installCountingOracle(fixture, marker);
    configureChecks(fixture, [
      [],
      [
        {
          key: "missing-env",
          kind: "env_var",
          target: "TY_CONTEXT_DEFINITELY_MISSING_ENV",
        },
      ],
      [{ key: "missing-file", kind: "file", target: "missing.txt" }],
      [
        {
          key: "missing-loopback",
          kind: "loopback_tcp",
          host: "127.0.0.1",
          port: 1,
          timeout_ms: 50,
        },
      ],
    ]);
    await writeContract(fixture.workdir, fixture.contract);
    await runCli(fixture.root, ["enable", "long-task"]);
    await runCli(fixture.root, ["long-task", "compile", fixture.workdir]);
    const active = (
      await loadActiveLongTaskAuthority(fixture.root)
    ).authority;
    const identities = active.authority_snapshot.outcomes[0].acceptance.checks.map(
      (check) => check.raw_execution_identity,
    );
    assert.equal(new Set(identities).size, 4);

    const result = await runCliFailure(fixture.root, [
      "long-task",
      "verify",
      fixture.workdir,
    ]);
    assert.deepEqual(
      result.check_results.map((check) => check.status),
      ["passed", "blocked_external", "blocked_external", "blocked_external"],
    );
    assert.equal(await executionCount(marker), 2);
  } finally {
    await rm(marker, { force: true });
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("identical canonical Environment Requirements may share Raw Execution", async () => {
  const fixture = await createDeliveryFixture();
  const marker = path.join(
    os.tmpdir(),
    `ty-context-raw-identical-${process.pid}-${Date.now()}.txt`,
  );
  const keys = ["TY_CONTEXT_RAW_ENV_A", "TY_CONTEXT_RAW_ENV_B"];
  const previous = keys.map((key) => process.env[key]);
  process.env[keys[0]] = "secret-value-a";
  process.env[keys[1]] = "secret-value-b";
  try {
    await installCountingOracle(fixture, marker);
    const first = [
      { key: "env-a", kind: "env_var", target: keys[0] },
      { key: "env-b", kind: "env_var", target: keys[1] },
    ];
    configureChecks(fixture, [first, [...first].reverse()]);
    await writeContract(fixture.workdir, fixture.contract);
    await runCli(fixture.root, ["enable", "long-task"]);
    await runCli(fixture.root, ["long-task", "compile", fixture.workdir]);
    const active = (
      await loadActiveLongTaskAuthority(fixture.root)
    ).authority;
    const checks = active.authority_snapshot.outcomes[0].acceptance.checks;
    assert.equal(
      checks[0].raw_execution_identity,
      checks[1].raw_execution_identity,
    );
    assert.equal(JSON.stringify(active).includes("secret-value-a"), false);
    assert.equal(JSON.stringify(active).includes("secret-value-b"), false);

    const result = await runCli(fixture.root, [
      "long-task",
      "verify",
      fixture.workdir,
    ]);
    assert.deepEqual(
      result.check_results.map((check) => check.status),
      ["passed", "passed"],
    );
    assert.equal(await executionCount(marker), 3);
  } finally {
    restore(keys[0], previous[0]);
    restore(keys[1], previous[1]);
    await rm(marker, { force: true });
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("different env var targets produce different Raw Executions", async () => {
  const fixture = await createDeliveryFixture();
  const marker = path.join(
    os.tmpdir(),
    `ty-context-raw-target-${process.pid}-${Date.now()}.txt`,
  );
  const keys = ["TY_CONTEXT_RAW_TARGET_A", "TY_CONTEXT_RAW_TARGET_B"];
  const previous = keys.map((key) => process.env[key]);
  process.env[keys[0]] = "present-a";
  process.env[keys[1]] = "present-b";
  try {
    await installCountingOracle(fixture, marker);
    configureChecks(fixture, [
      [{ key: "env", kind: "env_var", target: keys[0] }],
      [{ key: "env", kind: "env_var", target: keys[1] }],
    ]);
    await writeContract(fixture.workdir, fixture.contract);
    await runCli(fixture.root, ["enable", "long-task"]);
    await runCli(fixture.root, ["long-task", "compile", fixture.workdir]);
    const active = (
      await loadActiveLongTaskAuthority(fixture.root)
    ).authority;
    const checks = active.authority_snapshot.outcomes[0].acceptance.checks;
    assert.notEqual(
      checks[0].raw_execution_identity,
      checks[1].raw_execution_identity,
    );
    const result = await runCli(fixture.root, [
      "long-task",
      "verify",
      fixture.workdir,
    ]);
    assert.deepEqual(
      result.check_results.map((check) => check.status),
      ["passed", "passed"],
    );
    assert.equal(await executionCount(marker), 4);
  } finally {
    restore(keys[0], previous[0]);
    restore(keys[1], previous[1]);
    await rm(marker, { force: true });
    await rm(fixture.root, { recursive: true, force: true });
  }
});

function configureChecks(fixture, requirements) {
  const outcome = fixture.contract.outcomes[0];
  const base = outcome.acceptance.checks[0];
  outcome.acceptance.checks = requirements.map(
    (environment_requirements, index) => ({
      ...structuredClone(base),
      key: `raw-${index}`,
      positive_assertions: [
        {
          key: "raw-result",
          criterion: `Raw execution result ${index} is observable.`,
          claims: ["result"],
          applicability_ref: "first-root-success",
          observation: index === 0 ? "result" : "result_copy",
          evidence_capabilities: ["target_runtime", "state_delta"],
          operator: "equals",
          expected: true,
        },
        {
          key: "raw-requirement",
          criterion: `Raw execution requirement ${index} is observable.`,
          claims: ["requirement.observe-first"],
          applicability_ref: "first-root-success",
          observation:
            index === 0 ? "requirement_result" : "requirement_copy",
          evidence_capabilities: ["target_runtime", "state_delta"],
          operator: "equals",
          expected: true,
        },
        {
          key: "raw-obligation",
          criterion: `Raw execution obligation ${index} is observable.`,
          claims: ["obligation.implement-first"],
          applicability_ref: "first-root-success",
          observation:
            index === 0 ? "obligation_result" : "obligation_copy",
          evidence_capabilities: ["target_runtime", "state_delta"],
          operator: "equals",
          expected: true,
        },
        {
          key: "raw-liveness",
          criterion: `Raw execution target ${index} remains live.`,
          claims: [],
          observation: index === 0 ? "target_live" : "target_live_copy",
          evidence_capabilities: ["target_runtime"],
          operator: "equals",
          expected: true,
        },
      ],
      environment_requirements: structuredClone(environment_requirements),
    }),
  );
  outcome.acceptance.counterfactual_controls = requirements.map(
    (_environmentRequirements, index) => ({
      key: `raw-sensitive-${index}`,
      binding_key: "state-first",
      claims: [
        "result",
        "requirement.observe-first",
        "obligation.implement-first",
      ],
      check_key: `raw-${index}`,
      mutation: {
        type: "replace_file",
        path: "src/state.json",
        fixture_path: "tests/semantic-false.json",
      },
      expected_assertion_failures: [
        "raw-result",
        "raw-requirement",
        "raw-obligation",
      ],
      preserved_assertions: ["raw-liveness"],
    }),
  );
}

async function installCountingOracle(fixture, marker) {
  await writeFile(
    path.join(fixture.root, "tests", "oracle.mjs"),
    `import { appendFileSync, readFileSync } from "node:fs";
appendFileSync(${JSON.stringify(marker)}, "run\\n");
let state = {first:false};
try { state = JSON.parse(readFileSync(new URL("../src/state.json", import.meta.url), "utf8")); } catch {}
const target=(assertion_key)=>({assertion_key,capability:"target_runtime",target_ref:"fixture-app",root_entrypoint:"tests/oracle.mjs",session_id:"raw-session",cold_start:true});
const delta=(assertion_key)=>({assertion_key,capability:"state_delta",before_sha256:"0".repeat(64),after_sha256:"1".repeat(64),changed_fields:["first"]});
const semantic=["raw-result","raw-requirement","raw-obligation"];
console.log(JSON.stringify({schema_version:"long-task-check-result-v3",execution_status:"completed",observations:{result:state.first,result_copy:state.first,requirement_result:state.first,requirement_copy:state.first,obligation_result:state.first,obligation_copy:state.first,target_live:true,target_live_copy:true},evidence_records:[...semantic.flatMap((key)=>[target(key),delta(key)]),target("raw-liveness")]}));
`,
  );
  await commitCandidate(fixture.root);
}

async function executionCount(marker) {
  return readFile(marker, "utf8")
    .then((value) => value.trim().split(/\r?\n/u).filter(Boolean).length)
    .catch(() => 0);
}

function restore(key, value) {
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
}
