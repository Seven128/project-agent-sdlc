import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import YAML from "yaml";
import { compileDeliveryContract } from "../../packages/ty-context/dist/lib/long-task-delivery-compiler.js";
import { parseDeliveryContractText } from "../../packages/ty-context/dist/lib/long-task-delivery-parser.js";
import {
  createDeliveryFixture,
  deliveryContract,
  fixtureArchitectureSourceItem,
  fixtureExecutionTargetSourceItem,
  writeContract,
} from "./long-task-delivery-fixtures.mjs";

test("Compact and expanded V2 authoring normalize to the same Contract", () => {
  const expanded = expandedContract();
  const compact = compactContract(expanded);
  const expandedParsed = parseDeliveryContractText(YAML.stringify(expanded));
  const compactParsed = parseDeliveryContractText(YAML.stringify(compact));

  assert.deepEqual(compactParsed, expandedParsed);
  assert.equal(compactParsed.task.context_snapshot_mode, "full");
  assert.equal(compactParsed.risk.requested_level, "auto");
  assert.deepEqual(compactParsed.outcomes[0].product.requirements, []);
  assert.deepEqual(compactParsed.global.acceptance.external_confirmations, []);

  const expandedLines = lineCount(YAML.stringify(expanded));
  const compactLines = lineCount(YAML.stringify(compact));
  assert.ok(
    compactLines <= Math.floor(expandedLines * 0.9),
    `expected at least 10% fewer lines after explicit applicability, semantic-witness, and admitted-process metadata, expanded=${expandedLines}, compact=${compactLines}`,
  );
});

test("Compact and expanded V2 authoring compile to identical authority", async () => {
  const fixture = await createDeliveryFixture();
  const expanded = expandedContract();
  await writeFile(
    path.join(fixture.root, "source.md"),
    `<!-- ty-source-background:start key=fixture-heading reason=markdown-structure -->
<a id="fixture-source"></a>
<!-- ty-source-background:end -->

<!-- ty-source-item:start key=first-observable kind=technical_obligation -->
Implement first
<!-- ty-source-item:end -->

${fixtureArchitectureSourceItem()}

${fixtureExecutionTargetSourceItem()}
`,
  );
  await writeContract(fixture.workdir, expanded);
  const expandedCompiled = await compileDeliveryContract(
    fixture.workdir,
    fixture.root,
    { require_completion_gate: false },
  );

  await writeContract(fixture.workdir, compactContract(expanded));
  const compactCompiled = await compileDeliveryContract(
    fixture.workdir,
    fixture.root,
    { require_completion_gate: false },
  );

  assert.equal(
    compactCompiled.contract_sha256,
    expandedCompiled.contract_sha256,
  );
  assert.deepEqual(
    compactCompiled.authority_hashes,
    expandedCompiled.authority_hashes,
  );
  assert.deepEqual(
    compactCompiled.authority_materials,
    expandedCompiled.authority_materials,
  );
  assert.equal(compactCompiled.effective_risk, expandedCompiled.effective_risk);
  assert.deepEqual(
    compactCompiled.claim_coverage,
    expandedCompiled.claim_coverage,
  );
  assert.equal(
    compactCompiled.compiled_identity,
    expandedCompiled.compiled_identity,
  );
});

function expandedContract() {
  const contract = deliveryContract();
  contract.task.target_profile.completion_authority = "machine_only";
  contract.outcomes[0].product.requirements = [];
  const check = contract.outcomes[0].acceptance.checks[0];
  check.positive_assertions = check.positive_assertions.filter(
    (assertion) => assertion.key !== "first-requirement",
  );
  contract.source_claims[0].disposition.refs = [
    "first.obligation.implement-first",
  ];
  contract.source_claims[0].statement = "Implement first";
  contract.outcomes[0].acceptance.counterfactual_controls = [
    {
      key: "replace-first-state",
      binding_key: "state-first",
      claims: [
        "result",
        "obligation.implement-first",
        "obligation.architecture-first",
        "semantic_fact.fact.first.observable",
        "semantic_fact.fact.first.architecture-boundary",
      ],
      check_key: "first-check",
      mutation: {
        type: "replace_json_value",
        path: "src/state.json",
        pointer: "/first",
        value: false,
      },
      expected_assertion_failures: [
        "first-result",
        "first-obligation",
        "first-architecture",
        "first-semantic-fact",
        "first-architecture-semantic-fact",
      ],
      preserved_assertions: ["first-liveness"],
      allowed_fanout_assertions: [],
    },
    {
      key: "make-first-relations-applicable",
      binding_key: "state-first",
      claims: ["control_relation_closure"],
      check_key: "first-check",
      mutation: {
        type: "replace_json_value",
        path: "src/state.json",
        pointer: "/first_relations_applicable",
        value: true,
      },
      expected_assertion_failures: ["first-relations-na"],
      preserved_assertions: ["first-liveness"],
      allowed_fanout_assertions: [],
    },
  ];
  return contract;
}

function compactContract(expanded) {
  const contract = structuredClone(expanded);
  delete contract.task.target_profile.completion_authority;
  delete contract.risk.requested_level;
  contract.risk.facts = {};
  delete contract.global.applicability;
  delete contract.global.product;
  delete contract.global.acceptance;
  delete contract.global.technical.constraints;
  delete contract.global.technical.forbidden_shortcuts;

  const outcome = contract.outcomes[0];
  delete outcome.depends_on;
  delete outcome.product.requirements;
  delete outcome.product.owner_surfaces;
  delete outcome.product.controls;
  delete outcome.product.control_relations;
  delete outcome.product.surface_bindings;
  delete outcome.product.non_completing_outcomes;
  delete outcome.technical.forbidden_shortcuts;
  delete outcome.technical.rollback_and_recovery;
  delete outcome.acceptance.population;
  for (const control of outcome.acceptance.counterfactual_controls)
    delete control.allowed_fanout_assertions;

  const check = outcome.acceptance.checks[0];
  delete check.runner.cwd;
  delete check.runner.timeout_ms;
  delete check.runner.retry_policy;
  delete check.expected_output_paths;
  return contract;
}

function lineCount(value) {
  return value.trimEnd().split(/\r?\n/u).length;
}
