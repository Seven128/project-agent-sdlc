import assert from "node:assert/strict";
import { readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { preflightDeliveryContract } from "../../packages/ty-context/dist/lib/long-task-authoring-preflight.js";
import { compileDeliveryContract } from "../../packages/ty-context/dist/lib/long-task-delivery-compiler.js";
import {
  createDeliveryFixture,
  runCli,
  runCliFailure,
  writeContract,
} from "./long-task-delivery-fixtures.mjs";

test("planned Counterfactual targets may be absent at Preflight and Compile", async () => {
  const fixture = await createDeliveryFixture();
  try {
    await configurePlannedCarrier(fixture);
    const preflight = await preflightDeliveryContract(
      fixture.workdir,
      fixture.root,
    );
    assert.equal(preflight.status, "ready", JSON.stringify(preflight));
    await assert.doesNotReject(
      compileDeliveryContract(fixture.workdir, fixture.root, {
        require_completion_gate: false,
      }),
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("an existing Counterfactual target remains fail-closed when absent", async () => {
  const fixture = await createDeliveryFixture();
  try {
    await configurePlannedCarrier(fixture);
    fixture.contract.outcomes[0].technical.bindings[0].existence = "existing";
    await writeContract(fixture.workdir, fixture.contract);
    const preflight = await preflightDeliveryContract(
      fixture.workdir,
      fixture.root,
    );
    assert.equal(preflight.status, "not_ready");
    assert.ok(
      preflight.diagnostics.some(
        (item) => item.code === "binding_carrier_path_not_found",
      ),
    );
    await assert.rejects(
      compileDeliveryContract(fixture.workdir, fixture.root, {
        require_completion_gate: false,
      }),
      /binding_carrier_path_not_found/u,
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("Final Gate requires a planned carrier and accepts it only with sensitive proof", async () => {
  const fixture = await createDeliveryFixture();
  try {
    await configurePlannedCarrier(fixture);
    await runCli(fixture.root, ["enable", "long-task"]);
    await runCli(fixture.root, ["long-task", "compile", fixture.workdir]);

    const missing = await runCliFailure(fixture.root, [
      "long-task",
      "final-gate",
      fixture.workdir,
    ]);
    assert.equal(missing.workflow_status, "needs_work");
    assert.ok(missing.findings.some((item) => item.code === "binding_missing"));
    assert.equal(missing.check_results.length, 0);

    await writeFile(
      path.join(fixture.root, "src", "planned.json"),
      '{"ready":true,"relations_applicable":false}\n',
    );
    const accepted = await runCli(fixture.root, [
      "long-task",
      "final-gate",
      fixture.workdir,
    ]);
    assert.equal(accepted.workflow_status, "machine_accepted");
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("planned carrier changes stale targeted Progress", async () => {
  const fixture = await createDeliveryFixture();
  try {
    await configurePlannedCarrier(fixture);
    await writeFile(
      path.join(fixture.root, "src", "planned.json"),
      '{"ready":true,"relations_applicable":false}\n',
    );
    await runCli(fixture.root, ["enable", "long-task"]);
    await runCli(fixture.root, ["long-task", "compile", fixture.workdir]);
    await runCli(fixture.root, ["long-task", "verify", fixture.workdir]);
    await writeFile(
      path.join(fixture.root, "src", "planned.json"),
      '{"ready":true,"relations_applicable":false,"revision":2}\n',
    );
    const status = await runCli(fixture.root, [
      "long-task",
      "status",
      fixture.workdir,
    ]);
    assert.equal(status.outcomes.first, "progress_stale");
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("planned to existing enters reviewed Technical Authority revision", async () => {
  const fixture = await createDeliveryFixture();
  try {
    await configurePlannedCarrier(fixture);
    await writeFile(
      path.join(fixture.root, "src", "planned.json"),
      '{"ready":true,"relations_applicable":false}\n',
    );
    await runCli(fixture.root, ["enable", "long-task"]);
    await runCli(fixture.root, ["long-task", "compile", fixture.workdir]);
    fixture.contract.outcomes[0].technical.bindings[0].existence = "existing";
    await writeContract(fixture.workdir, fixture.contract);
    const failure = await runCliFailure(fixture.root, [
      "long-task",
      "compile",
      fixture.workdir,
      "--revise",
    ]);
    assert.equal(failure.status, "authority_revision_pending");
    assert.ok(
      failure.pending_authority_revision.approval_summary.protected_reasons.includes(
        "binding_removed_or_expanded",
      ),
    );
    const pending = JSON.parse(
      await readFile(
        path.join(
          fixture.workdir,
          ".ty-context",
          "authority-revision-pending.json",
        ),
        "utf8",
      ),
    );
    assert.ok(
      pending.revision_diff.bindings_removed_or_expanded.includes(
        "first:state-first:target_or_kind_changed",
      ),
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

async function configurePlannedCarrier(fixture) {
  const outcome = fixture.contract.outcomes[0];
  const binding = outcome.technical.bindings[0];
  binding.target = "src/planned.json";
  binding.carrier_paths = ["src/planned.json"];
  binding.existence = "planned";
  const check = outcome.acceptance.checks[0];
  check.input_paths = ["src/planned.json"];
  check.expected_output_paths = ["src/planned.json"];
  const semanticControl = outcome.acceptance.counterfactual_controls[0];
  semanticControl.mutation = {
    type: "replace_json_value",
    path: "src/planned.json",
    pointer: "/ready",
    value: false,
  };
  semanticControl.preserved_assertions = ["first-liveness"];
  const relationControl = outcome.acceptance.counterfactual_controls[1];
  relationControl.mutation = {
    type: "replace_json_value",
    path: "src/planned.json",
    pointer: "/relations_applicable",
    value: true,
  };
  relationControl.preserved_assertions = ["first-liveness"];
  await writeFile(
    path.join(fixture.root, "tests", "oracle.mjs"),
    `import { readFile } from "node:fs/promises";
let state = { ready: false, relations_applicable: false };
try { state = JSON.parse(await readFile(new URL("../src/planned.json", import.meta.url), "utf8")); } catch {}
const semanticAssertions = ["first-result", "first-requirement", "first-obligation", "first-architecture", "first-relations-na"];
const targetRecord = (assertionKey) => ({
  assertion_key:assertionKey,
  capability:"target_runtime",
  target_ref:"fixture-app",
  root_entrypoint:"tests/oracle.mjs",
  session_id:"planned-session",
  cold_start:true
});
const stateRecord = (assertionKey) => ({
  assertion_key:assertionKey,
  capability:"state_delta",
  before_sha256:"0".repeat(64),
  after_sha256:"1".repeat(64),
  changed_fields:["ready"]
});
console.log(JSON.stringify({
  schema_version:"long-task-check-result-v3",
  execution_status:"completed",
  observations:{
    result:state.ready === true,
    requirement_result:state.ready === true,
    obligation_result:state.ready === true,
    architecture_result:state.ready === true,
    relations_applicable:state.relations_applicable === true,
    target_live:true,
    negative:false
  },
  evidence_records:[
    ...semanticAssertions.flatMap((assertionKey) => [
      targetRecord(assertionKey),
      stateRecord(assertionKey)
    ]),
    targetRecord("first-liveness")
  ]
}));
`,
  );
  await writeContract(fixture.workdir, fixture.contract);
}
