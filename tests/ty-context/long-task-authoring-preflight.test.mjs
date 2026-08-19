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
import { authoringRevisionPreview } from "../../packages/ty-context/dist/lib/long-task-authoring-authority-preview.js";
import { preflightDeliveryContract } from "../../packages/ty-context/dist/lib/long-task-authoring-preflight.js";
import { parseDeliveryContractText } from "../../packages/ty-context/dist/lib/long-task-delivery-parser.js";
import { executionTargetSourceStatement } from "../../packages/ty-context/dist/lib/long-task-source-target-index.js";
import { sha256Hex } from "../../packages/ty-context/dist/lib/strict-codec.js";
import {
  activeAuthorityLockPath,
  activeRecordPath,
  runtimePath,
} from "../../packages/ty-context/dist/lib/long-task-state.js";
import {
  authoringTemplateSemanticManifest,
  createDeliveryFixture,
  runCli,
  runCliFailure,
  semanticManifestIdentity,
  writeContract,
} from "./long-task-delivery-fixtures.mjs";
import {
  admitPackageExactFixtureSemanticManifest,
  fixtureProductRootArgv,
  fixtureProductRootPath,
} from "./long-task-package-machine-fixture.mjs";

const exec = promisify(execFile);

test("Authoring Preflight compares a pre-semantic active Authority without weakening the revision", async () => {
  const fixture = await createDeliveryFixture();
  try {
    const legacySnapshot = structuredClone(fixture.contract);
    delete legacySnapshot.semantic_fact_manifest;
    for (const outcome of legacySnapshot.outcomes)
      delete outcome.semantic_fact_bindings;
    legacySnapshot.contract_sha256 = "pre-semantic-contract";

    const preview = authoringRevisionPreview(
      fixture.contract,
      null,
      null,
      null,
      {
        authority_revision: 1,
        authority_snapshot: legacySnapshot,
      },
    );

    assert.equal(preview.active, true);
    assert.equal(preview.contract_changed, true);
    assert.deepEqual(preview.declared_authority_sections_changed, [
      "source",
      "product",
      "acceptance",
    ]);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

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
    assert.equal(result.source_coverage.resolved, 3);
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

test("Authoring Preflight permits an exact planned product root without weakening arbitrary runner checks", async () => {
  const fixture = await createDeliveryFixture();
  try {
    const outcome = fixture.contract.outcomes[0];
    const rootBinding = outcome.technical.bindings.find(
      (binding) => binding.key === "product-root-first",
    );
    rootBinding.existence = "planned";
    await rm(path.join(fixture.root, ...fixtureProductRootPath().split("/")));
    await writeContract(fixture.workdir, fixture.contract);

    const planned = await preflightDeliveryContract(
      fixture.workdir,
      fixture.root,
    );
    assert.equal(planned.status, "ready", JSON.stringify(planned));

    outcome.acceptance.checks[0].runner.target = "tests/missing-oracle.mjs";
    await writeContract(fixture.workdir, fixture.contract);
    const arbitrary = await preflightDeliveryContract(
      fixture.workdir,
      fixture.root,
    );
    assert.equal(arbitrary.status, "not_ready");
    assert.ok(
      arbitrary.diagnostics.some(
        (diagnostic) => diagnostic.code === "project_binary_path_not_found",
      ),
      JSON.stringify(arbitrary),
    );
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
      "project_binary_path_not_found",
    ])
      assert.ok(
        codes.has(code),
        `missing diagnostic ${code}; actual=${JSON.stringify([...codes])}`,
      );

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
    const sourcePath = path.join(fixture.root, "source.md");
    await writeFile(
      sourcePath,
      (await readFile(sourcePath, "utf8")).replace(
        "The first outcome must be observable.",
        sourceStatement,
      ),
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
    await writeContract(fixture.workdir, fixture.contract);
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
  assert.equal(template.includes("state_delta"), false);
  assert.deepEqual(parseDeliveryContractText(expanded), parsed);
  assert.ok(
    lineCount(template) <= Math.floor(lineCount(expanded) * 0.65),
    `compact=${lineCount(template)}, expanded=${lineCount(expanded)}`,
  );
});

test("init template runs through Preflight, Compile and package-observed Final Gate", async () => {
  const fixture = await createDeliveryFixture();
  try {
    const contract = parseDeliveryContractText(compactLongTaskTemplate());
    const semanticManifestSource = authoringTemplateSemanticManifest();
    const executionTarget = contract.task.execution_targets[0];
    const check = contract.outcomes[0].acceptance.checks[0];
    const rootArgv = fixtureProductRootArgv(
      "tests/replace-oracle.mjs",
      "replace",
    );
    executionTarget.root_entrypoint = fixtureProductRootPath();
    executionTarget.root_argv = rootArgv;
    const executionTargetStatement =
      executionTargetSourceStatement(executionTarget);
    semanticManifestSource.scope.source_item_refs.push(
      "replace-execution-target",
    );
    semanticManifestSource.inputs.push({
      key: "input.replace-execution-target",
      kind: "source_item",
      source_ref: "replace-execution-target",
      sha256: sha256Hex(executionTargetStatement),
      disposition: "non_ui_material",
      fact_refs: ["replace.result.observable"],
      basis_refs: ["replace-execution-target"],
      rationale:
        "The Source-backed process root and complete argv are inventoried as runtime authority rather than a separate product Fact.",
    });
    addSemanticSourceItemLineage(
      semanticManifestSource,
      "replace-execution-target",
      "input.replace-execution-target",
    );
    const semanticManifest = admitPackageExactFixtureSemanticManifest(
      semanticManifestSource,
    );
    contract.semantic_fact_manifest.sha256 =
      semanticManifestIdentity(semanticManifest);
    check.runner.type = "project_binary";
    check.runner.target = fixtureProductRootPath();
    check.runner.argv = [...rootArgv];
    check.runner.idempotent = true;
    check.verification_inputs = ["tests/replace-semantic-failure.ts"];
    check.expected_output_paths = [];
    contract.outcomes[0].technical.bindings[0].existence = "existing";
    contract.outcomes[0].product.owner.path_globs.push(
      "bin/**",
      "tests/replace-oracle.mjs",
    );
    contract.outcomes[0].technical.allowed_support_paths.push(
      "bin/**",
      "tests/replace-oracle.mjs",
    );
    contract.outcomes[0].technical.bindings.push(
      {
        key: "replace-product-root",
        kind: "file",
        target: fixtureProductRootPath(),
        carrier_paths: [fixtureProductRootPath()],
        existence: "existing",
      },
      {
        key: "replace-product-module",
        kind: "file",
        target: "tests/replace-oracle.mjs",
        carrier_paths: ["tests/replace-oracle.mjs"],
        existence: "existing",
      },
    );
    contract.outcomes[0].acceptance.checks[0].artifact_globs = [
      "artifacts/proof.json",
    ];
    await mkdir(path.join(fixture.root, "plans"), { recursive: true });
    await writeFile(
      path.join(fixture.root, "plans", "replace-me.md"),
      `<!-- ty-source-background:start key=replace-heading reason=markdown-structure -->\n<a id="replace-requirement"></a>\n<!-- ty-source-background:end -->\n\n<!-- ty-source-item:start key=replace-requirement kind=requirement -->\nPreserve one atomic source requirement.\n<!-- ty-source-item:end -->\n\n<!-- ty-source-background:start key=replace-architecture-anchor reason=markdown-structure -->\n<a id="replace-architecture"></a>\n<!-- ty-source-background:end -->\n\n<!-- ty-source-item:start key=replace-architecture kind=technical_obligation aspect=architecture -->\nPreserve the declared owner, dependency direction, verifier boundary and architecture conformance.\n<!-- ty-source-item:end -->\n\n<!-- ty-source-item:start key=replace-execution-target kind=technical_obligation aspect=architecture -->\n${executionTargetStatement}\n<!-- ty-source-item:end -->\n\n\`\`\`yaml semantic-fact-manifest-v1\n${YAML.stringify(JSON.parse(JSON.stringify(semanticManifest)), { lineWidth: 0 }).trimEnd()}\n\`\`\`\n`,
    );
    contract.source_claims.push({
      key: "replace-execution-target",
      source_ref: "plans/replace-me.md#replace-requirement",
      statement: executionTargetStatement,
      disposition: {
        type: "claim",
        refs: ["execution_target.replace-runtime"],
      },
    });
    await writeFile(
      path.join(fixture.root, "project_context", "areas", "replace-me.md"),
      "# Replace owner\n",
    );
    await writeFile(
      path.join(fixture.root, "tests", "replace-oracle.mjs"),
      `import { readFile } from "node:fs/promises";\nlet text = "";\ntry { text = await readFile(new URL("../src/replace-me.ts", import.meta.url), "utf8"); } catch {}\nconst result = text.includes("IMPLEMENTED_STATE") && !text.includes("PLANNED_BLOCKED");\nconst relationsApplicable = text.includes("CROSS_CONTROL_RELATIONS_APPLY");\nconst assertion = (key) => "assertion.replace-outcome.replace-check." + key;\nconsole.log(JSON.stringify({schema_version:"ty-context-product-observation-v1",observations:{"replace.result.observable":result,[assertion("replace-result")]:result,[assertion("replace-requirement")]:result,[assertion("replace-architecture")]:result,[assertion("replace-liveness")]:true,[assertion("replace-relations-na")]:relationsApplicable}}));\n`,
    );
    await writeFile(
      path.join(fixture.root, "tests", "replace-semantic-failure.ts"),
      "export const invalid = false;\n",
    );
    await writeFile(
      path.join(fixture.root, "src", "replace-me.ts"),
      'export const deliveryState = "IMPLEMENTED_STATE";\nexport const plannedState = "PLANNED_BLOCKED";\nexport const relationState = "NO_CROSS_CONTROL_RELATIONS";\n',
    );
    await writeContract(fixture.workdir, contract);
    await git(fixture.root, [
      "add",
      "plans/replace-me.md",
      "project_context/areas/replace-me.md",
      "tests/replace-oracle.mjs",
      "tests/replace-semantic-failure.ts",
      "src/replace-me.ts",
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
    assert.ok(
      missing.findings.some(
        (item) =>
          item.code === "assertion_value_mismatch" &&
          item.assertion_key === "replace-semantic-fact",
      ),
      JSON.stringify(missing),
    );

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

function addSemanticSourceItemLineage(manifest, sourceItemRef, inputRef) {
  for (const collection of [
    "family_dispositions",
    "subjects",
    "relations",
    "populations",
    "axis_dispositions",
    "condition_rules",
    "conditions",
    "condition_exclusions",
    "property_dispositions",
    "fact_cells",
    "facts",
  ])
    for (const row of manifest[collection] ?? [])
      if (
        Array.isArray(row.source_item_refs) &&
        !row.source_item_refs.includes(sourceItemRef)
      )
        row.source_item_refs.push(sourceItemRef);
  for (const fact of manifest.facts)
    if (!fact.provenance.basis_refs.includes(inputRef))
      fact.provenance.basis_refs.push(inputRef);
}
