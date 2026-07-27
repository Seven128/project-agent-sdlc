import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import {
  access,
  mkdir,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";
import YAML from "yaml";
import { compactLongTaskTemplate } from "../../packages/ty-context/dist/commands/long-task-authoring.js";
import { preflightDeliveryContract } from "../../packages/ty-context/dist/lib/long-task-authoring-preflight.js";
import { parseDeliveryContractText } from "../../packages/ty-context/dist/lib/long-task-delivery-parser.js";
import {
  activeAuthorityLockPath,
  activeRecordPath,
  runtimePath,
} from "../../packages/ty-context/dist/lib/long-task-state.js";
import {
  createDeliveryFixture,
  runCli,
  runCliFailure,
  writeContract,
} from "./long-task-delivery-fixtures.mjs";

const exec = promisify(execFile);

test("Authoring Preflight is ready, under two seconds and completely read-only", async () => {
  const fixture = await createDeliveryFixture();
  try {
    const marker = path.join(fixture.root, "preflight-runner-started");
    await writeFile(
      path.join(fixture.root, "tests", "oracle.mjs"),
      `require("node:fs").writeFileSync(${JSON.stringify(marker)}, "ran");\n`,
    );
    const before = await stateSnapshot(fixture);
    const started = performance.now();
    const result = await preflightDeliveryContract(
      fixture.workdir,
      fixture.root,
    );
    assert.ok(performance.now() - started < 2000);
    assert.equal(result.status, "ready");
    assert.equal(result.would_create_authority_lock, true);
    assert.equal(result.source_coverage.resolved, 2);
    assert.equal(result.claim_coverage.uncovered_claims.length, 0);
    assert.deepEqual(await stateSnapshot(fixture), before);
    assert.equal(await exists(marker), false);

    await runCli(fixture.root, ["enable", "long-task"]);
    await runCli(fixture.root, ["long-task", "compile", fixture.workdir]);
    assert.equal(await exists(await activeRecordPath(fixture.root)), true);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("Authoring Preflight aggregates independent diagnostics", async () => {
  const fixture = await createDeliveryFixture();
  try {
    const outcome = fixture.contract.outcomes[0];
    const check = outcome.acceptance.checks[0];
    delete check.positive_assertions[0].criterion;
    check.positive_assertions = check.positive_assertions.filter(
      (assertion) => assertion.key !== "first-requirement",
    );
    outcome.acceptance.counterfactual_controls[0].claims =
      outcome.acceptance.counterfactual_controls[0].claims.filter(
        (claim) => claim !== "requirement.observe-first",
      );
    outcome.acceptance.counterfactual_controls[0].expected_assertion_failures =
      outcome.acceptance.counterfactual_controls[0].expected_assertion_failures.filter(
        (assertion) => assertion !== "first-requirement",
      );
    check.runner.target = "tests/missing-oracle.mjs";
    outcome.product.owner.context_refs = ["project_context/areas/missing.md"];
    outcome.product.requirements.push(
      structuredClone(outcome.product.requirements[0]),
    );
    outcome.technical.bindings.push(
      structuredClone(outcome.technical.bindings[0]),
    );
    fixture.contract.source_claims[0].source_ref = "source.md#missing-anchor";
    await writeContract(fixture.workdir, fixture.contract);

    const before = await stateSnapshot(fixture);
    const result = await preflightDeliveryContract(
      fixture.workdir,
      fixture.root,
    );
    assert.equal(result.status, "not_ready");
    const codes = new Set(result.diagnostics.map((item) => item.code));
    for (const code of [
      "owner_context_ref_unknown",
      "requirement_key_duplicate",
      "binding_key_duplicate",
      "product_claim_required_surfaces_missing",
      "assertion_criterion_required",
      "source_claim_anchor_not_found",
      "node_oracle_path_not_found",
    ])
      assert.ok(codes.has(code), `missing diagnostic ${code}`);

    const duplicateRequirement = result.diagnostics.find(
      (item) => item.code === "requirement_key_duplicate",
    );
    const uncoveredRequirement = result.diagnostics.find(
      (item) => item.code === "product_claim_required_surfaces_missing",
    );
    const criterion = result.diagnostics.find(
      (item) => item.code === "assertion_criterion_required",
    );
    assert.equal(duplicateRequirement.repair_priority, "primary");
    assert.equal(uncoveredRequirement.repair_priority, "dependent");
    assert.equal(
      duplicateRequirement.repair_group,
      "first.requirement.observe-first",
    );
    assert.equal(
      uncoveredRequirement.repair_group,
      duplicateRequirement.repair_group,
    );
    assert.deepEqual(uncoveredRequirement.blocked_by, [
      duplicateRequirement.diagnostic_id,
    ]);
    assert.equal(uncoveredRequirement.occurrences, 2);
    assert.equal(criterion.repair_group, undefined);
    assert.equal(criterion.repair_priority, undefined);
    assert.equal(criterion.blocked_by, undefined);
    assert.equal(criterion.diagnostic_id, undefined);

    const repeated = await preflightDeliveryContract(
      fixture.workdir,
      fixture.root,
    );
    assert.deepEqual(repeated.diagnostics, result.diagnostics);

    outcome.product.requirements.pop();
    await writeContract(fixture.workdir, fixture.contract);
    const afterPrimaryRepair = await preflightDeliveryContract(
      fixture.workdir,
      fixture.root,
    );
    const remainingCoverage = afterPrimaryRepair.diagnostics.find(
      (item) => item.code === "product_claim_required_surfaces_missing",
    );
    assert.ok(remainingCoverage);
    assert.equal(remainingCoverage.occurrences, 2);
    assert.equal(remainingCoverage.diagnostic_id, undefined);
    assert.equal(remainingCoverage.repair_group, undefined);
    assert.equal(remainingCoverage.repair_priority, undefined);
    assert.equal(remainingCoverage.blocked_by, undefined);
    assert.deepEqual(await stateSnapshot(fixture), before);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("Authoring Preflight previews an active revision without pending state", async () => {
  const fixture = await createDeliveryFixture();
  try {
    await runCli(fixture.root, ["enable", "long-task"]);
    await runCli(fixture.root, ["long-task", "compile", fixture.workdir]);
    fixture.contract.outcomes[0].product.owner.label = "revised fixture";
    await writeContract(fixture.workdir, fixture.contract);
    const before = await stateSnapshot(fixture);
    const result = await preflightDeliveryContract(
      fixture.workdir,
      fixture.root,
    );
    assert.equal(result.status, "ready");
    assert.equal(result.would_create_authority_lock, false);
    assert.equal(result.revision_preview.active, true);
    assert.equal(result.revision_preview.contract_changed, true);
    assert.ok(
      result.revision_preview.declared_authority_sections_changed.includes(
        "product",
      ),
    );
    assert.equal(
      await exists(
        runtimePath(fixture.workdir, "authority-revision-pending.json"),
      ),
      false,
    );
    assert.deepEqual(await stateSnapshot(fixture), before);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("Authoring Preflight Revision Preview reports declared Acceptance changes", async () => {
  const fixture = await createDeliveryFixture();
  try {
    await runCli(fixture.root, ["enable", "long-task"]);
    await runCli(fixture.root, ["long-task", "compile", fixture.workdir]);
    fixture.contract.outcomes[0].acceptance.checks[0].positive_assertions[0].criterion =
      "A revised declared Acceptance criterion.";
    await writeContract(fixture.workdir, fixture.contract);
    const result = await preflightDeliveryContract(
      fixture.workdir,
      fixture.root,
    );
    assert.equal(result.status, "ready");
    assert.ok(
      result.revision_preview.declared_authority_sections_changed.includes(
        "acceptance",
      ),
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("Authoring Preflight Revision Preview reports Source and Context materials separately", async () => {
  const fixture = await createDeliveryFixture();
  try {
    await runCli(fixture.root, ["enable", "long-task"]);
    await runCli(fixture.root, ["long-task", "compile", fixture.workdir]);
    const sourceStatement = "The revised first outcome remains observable.";
    await writeFile(
      path.join(fixture.root, "source.md"),
      `<!-- ty-source-background:start key=fixture-heading reason=markdown-structure -->
<a id="fixture-source"></a>
<!-- ty-source-background:end -->

<!-- ty-source-item:start key=first-observable kind=requirement -->
${sourceStatement}
<!-- ty-source-item:end -->

<!-- ty-source-item:start key=fixture-architecture kind=technical_obligation aspect=architecture -->
Preserve the fixture state owner and verifier boundary.
<!-- ty-source-item:end -->
`,
    );
    fixture.contract.source_claims[0].statement = sourceStatement;
    fixture.contract.outcomes[0].product.requirements[0].statement =
      sourceStatement;
    await writeContract(fixture.workdir, fixture.contract);
    let result = await preflightDeliveryContract(fixture.workdir, fixture.root);
    assert.equal(result.status, "ready");
    assert.ok(
      result.revision_preview.declared_authority_sections_changed.includes(
        "source",
      ),
    );

    await writeFile(
      path.join(fixture.root, "project_context", "areas", "main.md"),
      "# Main\n\nRevised durable Context.\n",
    );
    result = await preflightDeliveryContract(fixture.workdir, fixture.root);
    assert.equal(result.status, "ready");
    assert.ok(
      result.revision_preview.declared_authority_sections_changed.includes(
        "context",
      ),
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("init template is inline Compact V2 and at least 35 percent shorter", () => {
  const template = compactLongTaskTemplate();
  const parsed = parseDeliveryContractText(template);
  const expanded = YAML.stringify(parsed, { lineWidth: 0 });
  assert.equal(parsed.outcomes.length, 1);
  assert.equal(template.includes("outcome_files"), false);
  assert.deepEqual(parseDeliveryContractText(expanded), parsed);
  assert.ok(
    lineCount(template) <= Math.floor(lineCount(expanded) * 0.65),
    `compact=${lineCount(template)}, expanded=${lineCount(expanded)}`,
  );
});

test("init template runs through Preflight, Compile and planned-carrier Final Gate", async () => {
  const fixture = await createDeliveryFixture();
  try {
    const contract = parseDeliveryContractText(compactLongTaskTemplate());
    await mkdir(path.join(fixture.root, "plans"), { recursive: true });
    await writeFile(
      path.join(fixture.root, "plans", "replace-me.md"),
      `<!-- ty-source-background:start key=replace-heading reason=markdown-structure -->\n<a id="replace-requirement"></a>\n<!-- ty-source-background:end -->\n\n<!-- ty-source-item:start key=replace-requirement kind=requirement -->\nPreserve one atomic source requirement.\n<!-- ty-source-item:end -->\n\n<!-- ty-source-background:start key=replace-architecture-anchor reason=markdown-structure -->\n<a id="replace-architecture"></a>\n<!-- ty-source-background:end -->\n\n<!-- ty-source-item:start key=replace-architecture kind=technical_obligation aspect=architecture -->\nPreserve the declared owner, dependency direction, verifier boundary and architecture conformance.\n<!-- ty-source-item:end -->\n`,
    );
    await writeFile(
      path.join(fixture.root, "project_context", "areas", "replace-me.md"),
      "# Replace owner\n",
    );
    await writeFile(
      path.join(fixture.root, "tests", "replace-oracle.mjs"),
      `import { readFile } from "node:fs/promises";\nlet text = "";\ntry { text = await readFile(new URL("../src/replace-me.ts", import.meta.url), "utf8"); } catch {}\nconst result = text.includes("IMPLEMENTED_STATE");\nconst relationsApplicable = text.includes("CROSS_CONTROL_RELATIONS_APPLY");\nconst target = (assertion_key) => ({assertion_key,capability:"target_runtime",target_ref:"replace-runtime",root_entrypoint:"tests/replace-oracle.mjs",session_id:"replace-session",cold_start:true});\nconst delta = (assertion_key) => ({assertion_key,capability:"state_delta",before_sha256:"0".repeat(64),after_sha256:"1".repeat(64),changed_fields:["result"]});\nconst assertionKeys = ["replace-result","replace-requirement","replace-architecture","replace-relations-na"];\nconsole.log(JSON.stringify({schema_version:"long-task-check-result-v3",execution_status:"completed",observations:{result,requirement_result:result,architecture_result:result,relations_applicable:relationsApplicable,target_live:true},evidence_records:[...assertionKeys.flatMap((key) => [target(key),delta(key)]),target("replace-liveness")]}));\n`,
    );
    await writeFile(
      path.join(fixture.root, "tests", "replace-semantic-failure.ts"),
      "export const invalid = false;\n",
    );
    await writeContract(fixture.workdir, contract);
    await git(fixture.root, [
      "add",
      "plans/replace-me.md",
      "project_context/areas/replace-me.md",
      "tests/replace-oracle.mjs",
      "tests/replace-semantic-failure.ts",
    ]);
    await git(fixture.root, ["commit", "-m", "init template inputs"]);

    const preflight = await preflightDeliveryContract(
      fixture.workdir,
      fixture.root,
    );
    assert.equal(preflight.status, "ready", JSON.stringify(preflight));
    await runCli(fixture.root, ["enable", "long-task"]);
    await runCli(fixture.root, ["long-task", "compile", fixture.workdir]);
    const missing = await runCliFailure(fixture.root, [
      "long-task",
      "final-gate",
      fixture.workdir,
    ]);
    assert.equal(missing.workflow_status, "needs_work");
    assert.ok(missing.findings.some((item) => item.code === "binding_missing"));

    await writeFile(
      path.join(fixture.root, "src", "replace-me.ts"),
      'export const deliveryState = "IMPLEMENTED_STATE";\nexport const relationState = "NO_CROSS_CONTROL_RELATIONS";\n',
    );
    await git(fixture.root, ["add", "src/replace-me.ts"]);
    await git(fixture.root, ["commit", "-m", "implement init template"]);
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

async function stateSnapshot(fixture) {
  const active = await activeRecordPath(fixture.root);
  const lock = await activeAuthorityLockPath(fixture.root);
  return {
    head: await git(fixture.root, ["rev-parse", "HEAD"]),
    index: await git(fixture.root, ["write-tree"]),
    status: await git(fixture.root, [
      "status",
      "--short",
      "--untracked-files=all",
    ]),
    config: await git(fixture.root, ["config", "--local", "--list"]),
    active: await optionalFile(active),
    lock: await optionalFile(lock),
    runtime: await treeSnapshot(runtimePath(fixture.workdir)),
  };
}

async function treeSnapshot(root) {
  if (!(await exists(root))) return {};
  const result = {};
  async function visit(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const target = path.join(directory, entry.name);
      if (entry.isDirectory()) await visit(target);
      else if (entry.isFile())
        result[path.relative(root, target).replace(/\\/gu, "/")] =
          await readFile(target, "utf8");
    }
  }
  await visit(root);
  return result;
}

async function optionalFile(file) {
  return exists(file).then((present) =>
    present ? readFile(file, "utf8") : null,
  );
}

async function exists(file) {
  return access(file)
    .then(() => true)
    .catch(() => false);
}

async function git(cwd, args) {
  return (await exec("git", args, { cwd, windowsHide: true })).stdout.trim();
}

function lineCount(value) {
  return value.trimEnd().split(/\r?\n/u).length;
}
