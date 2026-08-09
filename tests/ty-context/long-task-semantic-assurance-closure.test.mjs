import assert from "node:assert/strict";
import { readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { compileDeliveryContract } from "../../packages/ty-context/dist/lib/long-task-delivery-compiler.js";
import { parseSourceItems } from "../../packages/ty-context/dist/lib/long-task-source-item-parser.js";
import {
  createDeliveryFixture,
  runCli,
  runCliFailure,
  writeContract,
} from "./long-task-delivery-fixtures.mjs";
import { FIXTURE_LEGACY_ORACLE_PATH } from "./long-task-package-machine-fixture.mjs";

test("material prose cannot be hidden in a Source background block", () => {
  assert.throws(
    () =>
      parseSourceItems(
        "source.md",
        `<!-- ty-source-background:start key=heading reason=markdown-structure -->
<a id="source"></a>
This sentence changes the required product behavior.
<!-- ty-source-background:end -->

<!-- ty-source-item:start key=architecture kind=technical_obligation aspect=architecture -->
Preserve the declared architecture owner.
<!-- ty-source-item:end -->
`,
      ),
    /source_background_content_invalid:source\.md:heading:markdown-structure/u,
  );
});

test("a text-bearing heading cannot hide material Source authority", () => {
  assert.throws(
    () =>
      parseSourceItems(
        "source.md",
        `<!-- ty-source-background:start key=heading reason=markdown-structure -->
# The primary action must remain blue.
<!-- ty-source-background:end -->

<!-- ty-source-item:start key=architecture kind=technical_obligation aspect=architecture -->
Preserve the declared architecture owner.
<!-- ty-source-item:end -->
`,
      ),
    /source_background_content_invalid:source\.md:heading:markdown-structure/u,
  );
});

test("free-form provenance cannot hide material Source authority", () => {
  assert.throws(
    () =>
      parseSourceItems(
        "source.md",
        `<!-- ty-source-background:start key=provenance reason=provenance -->
<!-- ty-source-provenance note=primary-action-must-remain-blue -->
<!-- ty-source-background:end -->

<!-- ty-source-item:start key=architecture kind=technical_obligation aspect=architecture -->
Preserve the declared architecture owner.
<!-- ty-source-item:end -->
`,
      ),
    /source_background_content_invalid:source\.md:provenance:provenance/u,
  );
});

test("an architecture-classified Source obligation is mandatory and Source-bound", async () => {
  const fixture = await createDeliveryFixture();
  try {
    const sourcePath = path.join(fixture.root, "source.md");
    const source = await readFile(sourcePath, "utf8");
    await writeFile(sourcePath, source.replace(" aspect=architecture", ""));
    await assert.rejects(
      compileDeliveryContract(fixture.workdir, fixture.root, {
        require_completion_gate: false,
      }),
      /source_architecture_obligation_required/u,
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("one applicability profile cannot collapse two values of the same dimension", async () => {
  const fixture = await createDeliveryFixture();
  try {
    fixture.contract.outcomes[0].applicability[0].dimensions = [
      { key: "viewport", value: "phone" },
      { key: "viewport", value: "tablet" },
    ];
    await writeContract(fixture.workdir, fixture.contract);
    await assert.rejects(
      compileDeliveryContract(fixture.workdir, fixture.root, {
        require_completion_gate: false,
      }),
      /applicability_dimension_duplicate:first:first-root-success/u,
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("a Population universe carrier must be part of the owning Check input snapshot", async () => {
  const fixture = await createDeliveryFixture();
  try {
    const outcome = fixture.contract.outcomes[0];
    outcome.acceptance.population = {
      check_key: "first-check",
      universe_binding_key: "state-first",
      claims: ["result"],
      observations: {
        universe_ids: "population.universe_ids",
        eligible_ids: "population.eligible_ids",
        observed_ids: "population.observed_ids",
        excluded_items: "population.excluded_items",
      },
      exclusion_rules: [],
    };
    outcome.acceptance.checks[0].input_paths = ["tests/**"];
    await writeContract(fixture.workdir, fixture.contract);
    await assert.rejects(
      compileDeliveryContract(fixture.workdir, fixture.root, {
        require_completion_gate: false,
      }),
      /population_universe_carrier_input_missing:first:first-check:src\/state\.json/u,
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("[critical:semantic-assurance-closure] a misbound oracle that reads a passing sibling field is rejected by claim-local mutation", async () => {
  const fixture = await createDeliveryFixture();
  try {
    const oraclePath = path.join(fixture.root, "tests", "oracle.mjs");
    const oracle = await readFile(oraclePath, "utf8");
    await writeFile(
      oraclePath,
      oracle
        .replaceAll("state[key]", "state.second")
        .replaceAll("state.first", "state.second"),
    );
    await writeFile(
      path.join(fixture.root, "src", "state.json"),
      `${JSON.stringify({
        first: true,
        second: true,
        first_relations_applicable: false,
        second_relations_applicable: false,
      })}\n`,
    );
    await runCli(fixture.root, ["enable", "long-task"]);
    await runCli(fixture.root, ["long-task", "compile", fixture.workdir]);
    const result = await runCliFailure(fixture.root, [
      "long-task",
      "final-gate",
      fixture.workdir,
    ]);
    assert.equal(result.workflow_status, "needs_work");
    assert.ok(
      result.findings.some(
        (finding) => finding.code === "counterfactual_integrity_failed",
      ),
      JSON.stringify(result.findings),
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("transitive local verifier dependencies are frozen and checked by Final Gate", async () => {
  const fixture = await createDeliveryFixture();
  try {
    configureLegacyVerificationInput(fixture, [
      "tests/projection-helper.mjs",
      "tests/projection-config.json",
    ]);
    const helperPath = path.join(
      fixture.root,
      "tests",
      "projection-helper.mjs",
    );
    const configPath = path.join(
      fixture.root,
      "tests",
      "projection-config.json",
    );
    await writeFile(configPath, '{"observedField":"first"}\n');
    await writeFile(
      helperPath,
      'export const projectionConfig = new URL("./projection-config.json", import.meta.url);\n',
    );
    const oraclePath = path.join(
      fixture.root,
      ...FIXTURE_LEGACY_ORACLE_PATH.split("/"),
    );
    const oracle = await readFile(oraclePath, "utf8");
    await writeFile(oraclePath, `import "./projection-helper.mjs";\n${oracle}`);
    await writeContract(fixture.workdir, fixture.contract);
    await runCli(fixture.root, ["enable", "long-task"]);
    await runCli(fixture.root, ["long-task", "compile", fixture.workdir]);
    const compiled = JSON.parse(
      await readFile(
        path.join(fixture.workdir, ".ty-context", "compiled-contract.json"),
        "utf8",
      ),
    );
    const check = compiled.outcomes[0].acceptance.checks[0];
    assert.match(
      check.verification_input_hashes["tests/projection-helper.mjs"],
      /^[a-f0-9]{64}$/u,
    );
    assert.match(
      check.verification_input_hashes["tests/projection-config.json"],
      /^[a-f0-9]{64}$/u,
    );
    await writeFile(configPath, '{"observedField":"second"}\n');
    await assert.rejects(
      runCli(fixture.root, ["long-task", "final-gate", fixture.workdir]),
      /final_gate_protected_input_stale:runner_changed_after_compile:CHECK\.first\.first-check:tests\/projection-config\.json/u,
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("a verifier with a non-literal local loader fails closed", async () => {
  const fixture = await createDeliveryFixture();
  try {
    configureLegacyVerificationInput(fixture);
    const oraclePath = path.join(
      fixture.root,
      ...FIXTURE_LEGACY_ORACLE_PATH.split("/"),
    );
    const oracle = await readFile(oraclePath, "utf8");
    await writeFile(
      oraclePath,
      `const verifierDependency = "./projection-helper.mjs";\nawait import(verifierDependency);\n${oracle}`,
    );
    await writeContract(fixture.workdir, fixture.contract);
    await assert.rejects(
      compileDeliveryContract(fixture.workdir, fixture.root, {
        require_completion_gate: false,
      }),
      /verification_dependency_dynamic_unresolved:tests\/legacy-oracle\.mjs/u,
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("createRequire cannot hide a local verifier dependency", async () => {
  const fixture = await createDeliveryFixture();
  try {
    configureLegacyVerificationInput(fixture);
    const oraclePath = path.join(
      fixture.root,
      ...FIXTURE_LEGACY_ORACLE_PATH.split("/"),
    );
    const oracle = await readFile(oraclePath, "utf8");
    await writeFile(
      oraclePath,
      `import { createRequire } from "node:module";\nconst load = createRequire(import.meta.url);\nload("./projection-helper.cjs");\n${oracle}`,
    );
    await writeContract(fixture.workdir, fixture.contract);
    await assert.rejects(
      compileDeliveryContract(fixture.workdir, fixture.root, {
        require_completion_gate: false,
      }),
      /verification_dependency_dynamic_unresolved:tests\/legacy-oracle\.mjs/u,
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

function configureLegacyVerificationInput(fixture, dependencyPaths = []) {
  const outcome = fixture.contract.outcomes[0];
  const verifierPaths = [FIXTURE_LEGACY_ORACLE_PATH, ...dependencyPaths];
  outcome.technical.allowed_support_paths =
    outcome.technical.allowed_support_paths.filter(
      (candidate) => !verifierPaths.includes(candidate),
    );
  for (const verifierPath of verifierPaths)
    if (!outcome.product.owner.path_globs.includes(verifierPath))
      outcome.product.owner.path_globs.push(verifierPath);
  const check = outcome.acceptance.checks[0];
  if (!check.verification_inputs.includes(FIXTURE_LEGACY_ORACLE_PATH))
    check.verification_inputs.push(FIXTURE_LEGACY_ORACLE_PATH);
}
