import assert from "node:assert/strict";
import { rm, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import {
  createDeliveryFixture,
  runCli,
  runCliFailure,
  writeContract,
} from "./long-task-delivery-fixtures.mjs";
import { decodeEvidenceCapabilityRecords } from "../../packages/ty-context/dist/lib/long-task-evidence-capability-policy.js";

test("design-conformance evidence has a strict target, condition and artifact shape", () => {
  const record = {
    assertion_key: "map-default-conformance",
    capability: "design_conformance",
    design_target_ref: "map-default",
    target_ref: "mobile-native",
    condition_keys: ["phone", "dark", "default"],
    actual_artifact_path: "artifacts/map-actual.png",
    comparison_artifact_path: "artifacts/map-diff.json",
  };
  assert.deepEqual(decodeEvidenceCapabilityRecords([record]), [record]);
  const missingComparison = structuredClone(record);
  delete missingComparison.comparison_artifact_path;
  assert.throws(
    () => decodeEvidenceCapabilityRecords([missingComparison]),
    /check_evidence_records_invalid:evidence_records\[0\]\.shape/u,
  );
});

test("strict security proof combines per-Check artifacts, negative Assertions and a valid Counterfactual", async () => {
  const fixture = await createDeliveryFixture();
  try {
    const outcome = fixture.contract.outcomes[0];
    const check = outcome.acceptance.checks[0];
    fixture.contract.risk.facts.security_boundary_change = ["first"];
    check.proof_surface = "security_boundary";
    outcome.product.requirements[0].required_proof_surfaces = [
      "security_boundary",
    ];
    outcome.technical.obligations[0].required_proof_surfaces = [
      "security_boundary",
    ];
    outcome.product.owner.path_globs.push("artifacts/**");
    outcome.technical.allowed_support_paths.push("artifacts/**");
    check.artifact_globs = ["artifacts/proof.json"];
    check.positive_assertions.push({
      key: "artifact-present",
      criterion: "The security proof artifact is produced.",
      claims: [],
      observation: "artifacts-ready",
      evidence_capabilities: ["state_delta"],
      operator: "equals",
      expected: true,
    });
    outcome.technical.forbidden_shortcuts.push({
      key: "self-report",
      statement: "Do not accept self-reported success.",
      applicability_refs: ["first-root-success"],
    });
    check.negative_assertions.push({
      key: "shortcut-rejected",
      criterion: "Self-reported success remains rejected.",
      claims: ["forbidden_shortcut.self-report"],
      applicability_ref: "first-root-success",
      observation: "negative_ok",
      evidence_capabilities: ["state_delta"],
      operator: "equals",
      expected: true,
    });
    outcome.acceptance.counterfactual_controls = [
      {
        key: "replace-state-semantics",
        binding_key: "state-first",
        claims: [
          "result",
          "requirement.observe-first",
          "obligation.implement-first",
          "forbidden_shortcut.self-report",
        ],
        check_key: check.key,
        mutation: {
          type: "replace_file",
          path: "src/state.json",
          fixture_path: "tests/semantic-false.json",
        },
        expected_assertion_failures: [
          "first-result",
          "first-requirement",
          "first-obligation",
          "shortcut-rejected",
        ],
        preserved_assertions: ["first-liveness"],
      },
    ];
    await writeArtifactOracle(fixture.root);
    await writeContract(fixture.workdir, fixture.contract);

    await runCli(fixture.root, ["enable", "long-task"]);
    const compiled = await runCli(fixture.root, [
      "long-task",
      "compile",
      fixture.workdir,
    ]);
    assert.equal(compiled.effective_risk, "strict");
    const accepted = await runCli(fixture.root, [
      "long-task",
      "final-gate",
      fixture.workdir,
    ]);
    assert.equal(accepted.workflow_status, "machine_accepted");
    assert.ok(
      accepted.check_results[0].artifact_hashes["artifacts/proof.json"],
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("Population V2 proves entity coverage and fails on an omitted eligible id", async () => {
  const fixture = await createDeliveryFixture();
  try {
    const outcome = fixture.contract.outcomes[0];
    const check = outcome.acceptance.checks[0];
    fixture.contract.risk.facts.full_population_operation = ["first"];
    check.proof_surface = "population_coverage";
    outcome.product.requirements[0].required_proof_surfaces = [
      "population_coverage",
    ];
    outcome.technical.obligations[0].required_proof_surfaces = [
      "population_coverage",
    ];
    check.negative_assertions.push({
      key: "negative-path",
      criterion: "The negative population path remains valid.",
      claims: [],
      observation: "negative_ok",
      evidence_capabilities: ["state_delta"],
      operator: "equals",
      expected: true,
    });
    const populationCheck = structuredClone(check);
    populationCheck.key = "population-check";
    populationCheck.positive_assertions = [];
    populationCheck.negative_assertions = [];
    outcome.acceptance.checks.push(populationCheck);
    outcome.acceptance.population = {
      check_key: populationCheck.key,
      claims: ["result"],
      observations: {
        eligible_ids: "population.eligible_ids",
        observed_ids: "population.observed_ids",
        excluded_items: "population.excluded_items",
      },
      exclusion_rules: [],
    };
    outcome.acceptance.counterfactual_controls = [
      {
        key: "replace-state-semantics",
        binding_key: "state-first",
        claims: [
          "result",
          "requirement.observe-first",
          "obligation.implement-first",
        ],
        check_key: check.key,
        mutation: {
          type: "replace_file",
          path: "src/state.json",
          fixture_path: "tests/semantic-false.json",
        },
        expected_assertion_failures: [
          "first-result",
          "first-requirement",
          "first-obligation",
        ],
        preserved_assertions: ["first-liveness"],
      },
    ];
    await writePopulationOracle(fixture.root);
    await writeContract(fixture.workdir, fixture.contract);
    await runCli(fixture.root, ["enable", "long-task"]);
    await runCli(fixture.root, ["long-task", "compile", fixture.workdir]);
    assert.equal(
      (
        await runCli(fixture.root, [
          "long-task",
          "final-gate",
          fixture.workdir,
        ])
      ).workflow_status,
      "machine_accepted",
    );

    await writeFile(
      path.join(fixture.root, "src/state.json"),
      `${JSON.stringify({ first: false, second: true })}\n`,
    );
    const failed = await runCliFailure(fixture.root, [
      "long-task",
      "final-gate",
      fixture.workdir,
    ]);
    assert.equal(failed.workflow_status, "needs_work");
    assert.ok(
      failed.findings.some(
        (item) => item.code === "population_coverage_failed",
      ),
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("exit zero, handwritten status and invalid Result Protocol cannot manufacture acceptance", async () => {
  const fixture = await createDeliveryFixture();
  try {
    await writeFile(
      path.join(fixture.root, "tests/oracle.mjs"),
      'console.log(JSON.stringify({status:"accepted",success:true}));\n',
    );
    await writeFile(
      path.join(fixture.workdir, "handwritten-status.json"),
      '{"workflow_status":"accepted"}\n',
    );
    await runCli(fixture.root, ["enable", "long-task"]);
    await runCli(fixture.root, ["long-task", "compile", fixture.workdir]);
    const failed = await runCliFailure(fixture.root, [
      "long-task",
      "final-gate",
      fixture.workdir,
    ]);
    assert.equal(failed.workflow_status, "needs_work");
    assert.ok(
      failed.findings.some((item) => item.code === "invalid_evidence"),
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

async function writeArtifactOracle(root) {
  await writeFile(
    path.join(root, "tests/oracle.mjs"),
    `import { mkdir, readFile, writeFile } from "node:fs/promises";
let result = false;
try { result = JSON.parse(await readFile(new URL("../src/state.json", import.meta.url), "utf8")).first; } catch {}
await mkdir(new URL("../artifacts", import.meta.url), {recursive:true});
await writeFile(new URL("../artifacts/proof.json", import.meta.url), JSON.stringify({verified:result}));
const target=(assertion_key)=>({assertion_key,capability:"target_runtime",target_ref:"fixture-app",root_entrypoint:"tests/oracle.mjs",session_id:"artifact-session",cold_start:true});
const delta=(assertion_key)=>({assertion_key,capability:"state_delta",before_sha256:"0".repeat(64),after_sha256:"1".repeat(64),changed_fields:["first"]});
const claimAssertions=["first-result","first-requirement","first-obligation"];
console.log(JSON.stringify({schema_version:"long-task-check-result-v3",execution_status:"completed",observations:{result,requirement_result:result,obligation_result:result,target_live:true,"artifacts-ready":true,negative_ok:result},evidence_records:[...claimAssertions.flatMap((assertionKey)=>[target(assertionKey),delta(assertionKey)]),target("first-liveness"),{assertion_key:"artifact-present",capability:"state_delta",before_sha256:"2".repeat(64),after_sha256:"3".repeat(64),changed_fields:["artifact"]},{assertion_key:"shortcut-rejected",capability:"state_delta",before_sha256:"4".repeat(64),after_sha256:"5".repeat(64),changed_fields:["negative"]}]}));
`,
  );
}

async function writePopulationOracle(root) {
  await writeFile(
    path.join(root, "tests/oracle.mjs"),
    `import { readFile } from "node:fs/promises";
let result = false;
try { result = JSON.parse(await readFile(new URL("../src/state.json", import.meta.url), "utf8")).first; } catch {}
const target=(assertion_key)=>({assertion_key,capability:"target_runtime",target_ref:"fixture-app",root_entrypoint:"tests/oracle.mjs",session_id:"population-session",cold_start:true});
const delta=(assertion_key)=>({assertion_key,capability:"state_delta",before_sha256:"0".repeat(64),after_sha256:"1".repeat(64),changed_fields:["first"]});
const claimAssertions=["first-result","first-requirement","first-obligation"];
console.log(JSON.stringify({schema_version:"long-task-check-result-v3",execution_status:"completed",observations:{result,requirement_result:result,obligation_result:result,target_live:true,negative_ok:true,population:{eligible_ids:["first"],observed_ids:result?["first"]:[],excluded_items:[]}},evidence_records:[...claimAssertions.flatMap((assertionKey)=>[target(assertionKey),delta(assertionKey)]),target("first-liveness"),{assertion_key:"negative-path",capability:"state_delta",before_sha256:"2".repeat(64),after_sha256:"3".repeat(64),changed_fields:["negative"]}]}));
`,
  );
}
