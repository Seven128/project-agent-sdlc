import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { preflightDeliveryContract } from "../../packages/ty-context/dist/lib/long-task-authoring-preflight.js";
import { compileDeliveryContract } from "../../packages/ty-context/dist/lib/long-task-delivery-compiler.js";
import { writeContract } from "./long-task-delivery-fixtures.mjs";
import {
  preserveFixtureSemanticOracle,
  preservedFixtureSemanticOraclePath,
} from "./long-task-delegating-oracle-fixture.mjs";

export async function addGlobalClaim(
  fixture,
  { counterfactual, constant = false },
) {
  const statement = "The global state remains valid.";
  const source = await readFile(path.join(fixture.root, "source.md"), "utf8");
  await writeFile(
    path.join(fixture.root, "source.md"),
    `${source.trimEnd()}\n\n<!-- ty-source-item:start key=global-state-source kind=technical_obligation -->\n${statement}\n<!-- ty-source-item:end -->\n`,
  );
  fixture.contract.source_claims.push({
    key: "global-state-source",
    source_ref: "source.md",
    statement,
    disposition: {
      type: "global_constraint",
      refs: ["constraint.global-state"],
    },
  });
  fixture.contract.global.technical.constraints.push({
    key: "global-state",
    statement,
    applicability_refs: ["global-root-success"],
  });
  fixture.contract.global.applicability.push({
    key: "global-root-success",
    target_ref: "fixture-app",
    journey_role: "success",
    dimensions: [{ key: "fixture-state", value: "loaded" }],
    given_refs: ["fixture-loaded"],
    when_refs: ["read-outcome"],
  });
  const check = structuredClone(
    fixture.contract.outcomes[0].acceptance.checks[0],
  );
  check.key = "global-state-check";
  check.runner.argv = ["first", "global"];
  check.positive_assertions = [
    {
      key: "global-state-assertion",
      criterion: statement,
      claims: ["constraint.global-state"],
      applicability_ref: "global-root-success",
      observation: "global_result",
      evidence_capabilities: ["target_runtime", "state_delta"],
      operator: "equals",
      expected: true,
    },
    {
      key: "global-state-liveness",
      criterion: "The product target remains live under semantic mutation.",
      claims: [],
      observation: "target_live",
      evidence_capabilities: ["target_runtime"],
      operator: "equals",
      expected: true,
    },
  ];
  check.negative_assertions = [];
  fixture.contract.global.acceptance.checks.push(check);
  if (counterfactual) await addGlobalCounterfactual(fixture.contract);
  await preserveFixtureSemanticOracle(fixture);
  await writeFile(
    path.join(fixture.root, "tests", "oracle.mjs"),
    `import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
let state = { first: false, first_relations_applicable: false };
try { state = JSON.parse(await readFile(new URL("../src/state.json", import.meta.url), "utf8")); } catch {}
const key = process.argv[2] || "first";
const globalCheck = process.argv[3] === "global";
const target = (assertion_key) => ({assertion_key,capability:"target_runtime",target_ref:"fixture-app",root_entrypoint:"tests/oracle.mjs",session_id:\`fixture-${"${key}"}-session\`,cold_start:true});
const delta = (assertion_key) => ({assertion_key,capability:"state_delta",before_sha256:"0".repeat(64),after_sha256:"1".repeat(64),changed_fields:[key]});
const globalResult = ${constant ? "true" : "state[key] === true"};
const result = globalCheck
  ? {
      schema_version: "long-task-check-result-v3",
      execution_status: "completed",
      observations: { global_result: globalResult, target_live: true },
      evidence_records: [
        target("global-state-assertion"),
        delta("global-state-assertion"),
        target("global-state-liveness")
      ]
    }
  : JSON.parse(
      execFileSync(
        process.execPath,
        [${JSON.stringify(preservedFixtureSemanticOraclePath)}, key],
        {cwd:process.cwd(),encoding:"utf8"}
      )
    );
console.log(JSON.stringify(result));
`,
  );
}

export async function addGlobalCounterfactual(contract) {
  contract.global.acceptance.counterfactual_controls.push({
    key: "replace-global-state",
    binding_ref: "first.state-first",
    claims: ["constraint.global-state"],
    check_key: "global-state-check",
    mutation: {
      type: "replace_json_value",
      path: "src/state.json",
      pointer: "/first",
      value: false,
    },
    expected_assertion_failures: ["global-state-assertion"],
    preserved_assertions: ["global-state-liveness"],
  });
}

export async function assertPreflightAndCompileReject(fixture, code) {
  await writeContract(fixture.workdir, fixture.contract);
  const preflight = await preflightDeliveryContract(
    fixture.workdir,
    fixture.root,
  );
  assert.equal(preflight.status, "not_ready");
  assert.ok(
    preflight.diagnostics.some((item) => item.code === code),
    `missing Preflight diagnostic ${code}: ${JSON.stringify(preflight)}`,
  );
  await assert.rejects(
    compileDeliveryContract(fixture.workdir, fixture.root, {
      require_completion_gate: false,
    }),
    new RegExp(code, "u"),
  );
}
