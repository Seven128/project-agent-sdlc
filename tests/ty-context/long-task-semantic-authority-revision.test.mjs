import assert from "node:assert/strict";
import { readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { readCompiledDeliveryContract } from "../../packages/ty-context/dist/lib/long-task-state.js";
import { inspectAuthorityRevisionCandidate } from "./long-task-authority-revision-fixture.mjs";
import {
  createDeliveryFixture,
  fixtureArchitectureSourceItem,
  fixtureExecutionTargetSourceItem,
  runCli,
  runCliFailure,
  writeContract,
} from "./long-task-delivery-fixtures.mjs";
import {
  expectDecision,
  prepareSemanticAuthority,
} from "./long-task-semantic-authority-revision-fixture.mjs";

test("Source authority is locked by first compile even before verify", async () => {
  const fixture = await createDeliveryFixture();
  try {
    await runCli(fixture.root, ["enable", "long-task"]);
    await runCli(fixture.root, ["long-task", "compile", fixture.workdir]);
    await writeFile(
      path.join(fixture.root, "source.md"),
      `<!-- ty-source-background:start key=fixture-heading reason=markdown-structure -->
<a id="fixture-source"></a>
<!-- ty-source-background:end -->

<!-- ty-source-item:start key=first-observable kind=requirement -->
Revised before execution.
<!-- ty-source-item:end -->

${fixtureArchitectureSourceItem()}

${fixtureExecutionTargetSourceItem()}
`,
    );
    fixture.contract.source_claims[0].statement = "Revised before execution.";
    fixture.contract.outcomes[0].product.requirements[0].statement =
      "Revised before execution.";
    await writeContract(fixture.workdir, fixture.contract);
    await assert.rejects(
      () => runCli(fixture.root, ["long-task", "compile", fixture.workdir]),
      /authority_revision_requires_revise_flag/u,
    );
    await assert.rejects(
      () =>
        runCli(fixture.root, [
          "long-task",
          "compile",
          fixture.workdir,
          "--revise",
        ]),
      /authority_change_requires_user_decision/u,
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("snapshot-only Source and controlling Context changes auto-revise but invalidate prior proof", async () => {
  const fixture = await createDeliveryFixture();
  try {
    await runCli(fixture.root, ["enable", "long-task"]);
    await runCli(fixture.root, ["long-task", "compile", fixture.workdir]);
    await runCli(fixture.root, ["long-task", "verify", fixture.workdir]);

    const sourceFile = path.join(fixture.root, "source.md");
    const sourceBaseline = await readFile(sourceFile, "utf8");
    await writeFile(
      sourceFile,
      `${sourceBaseline}
<!-- ty-source-background:start key=provenance-note reason=provenance -->
<!-- ty-source-provenance input=non-claim mode=direct -->
<!-- ty-source-background:end -->
`,
    );
    let revised = await runCli(fixture.root, [
      "long-task",
      "compile",
      fixture.workdir,
      "--revise",
    ]);
    assert.equal(
      revised.authority_revision_change.change_class,
      "mechanically_bounded_repair",
    );
    assert.equal(
      revised.authority_revision_change.user_decision_required,
      false,
    );
    assert.ok(
      revised.authority_revision_change.approval_summary.mechanically_bounded_reasons.includes(
        "source_file_content_changed",
      ),
    );
    assert.equal(revised.progress_preserved, false);

    const contextFile = path.join(
      fixture.root,
      "project_context",
      "areas",
      "main.md",
    );
    const contextBaseline = await readFile(contextFile, "utf8");
    await writeFile(
      contextFile,
      `${contextBaseline}\nUpdated implementation guidance.\n`,
    );
    await writeContract(fixture.workdir, fixture.contract);
    revised = await runCli(fixture.root, [
      "long-task",
      "compile",
      fixture.workdir,
      "--revise",
    ]);
    assert.equal(
      revised.authority_revision_change.change_class,
      "mechanically_bounded_repair",
    );
    assert.equal(
      revised.authority_revision_change.user_decision_required,
      false,
    );
    assert.ok(
      revised.authority_revision_change.approval_summary.mechanically_bounded_reasons.includes(
        "context_authority_changed",
      ),
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("Product, Global, Source Claim, and acceptance meaning changes require an exact user decision", async () => {
  const fixture = await createDeliveryFixture();
  const structureOraclePath = "tests/authority-structure-oracle.mjs";
  try {
    prepareSemanticAuthority(fixture.contract);
    await writeFile(
      path.join(fixture.root, ...structureOraclePath.split("/")),
      await readFile(
        path.join(fixture.root, "tests", "legacy-oracle.mjs"),
        "utf8",
      ),
    );
    fixture.contract.outcomes[0].acceptance.checks[0].verification_inputs.push(
      structureOraclePath,
    );
    await writeContract(fixture.workdir, fixture.contract);
    await runCli(fixture.root, ["enable", "long-task"]);
    await runCli(fixture.root, ["long-task", "compile", fixture.workdir]);
    await runCliFailure(fixture.root, ["long-task", "verify", fixture.workdir]);
    const sourceFile = path.join(fixture.root, "source.md");
    const sourceBaseline = await readFile(sourceFile, "utf8");
    const contractBaseline = structuredClone(fixture.contract);
    const previousAuthority = await readCompiledDeliveryContract(
      fixture.workdir,
    );

    const semanticCases = [
      {
        address: "task.goal",
        mutate(contract) {
          contract.task.goal = "A changed delivery goal.";
        },
      },
      {
        address: "outcomes.first.observable_result",
        mutate(contract) {
          contract.outcomes[0].product.observable_result =
            "A rewritten observable result.";
        },
      },
      {
        address: "outcomes.first.requirements.observe-first",
        mutate(contract) {
          contract.outcomes[0].product.requirements[0].statement =
            "A rewritten atomic product requirement.";
        },
      },
      {
        address:
          "outcomes.first.requirements.observe-first.required_proof_surfaces",
        mutate(contract) {
          contract.outcomes[0].product.requirements[0].required_proof_surfaces =
            ["implementation_structure"];
          for (const obligation of contract.outcomes[0].technical.obligations)
            obligation.required_proof_surfaces = [
              "implementation_structure",
            ];
          const outcome = contract.outcomes[0];
          const base = outcome.acceptance.checks[0];
          const structural = structuredClone(base);
          structural.key = "first-structure-check";
          structural.proof_surface = "implementation_structure";
          structural.runner.type = "node_oracle";
          structural.runner.target = structureOraclePath;
          structural.runner.argv = ["first"];
          structural.verification_inputs = [
            ...new Set([
              ...structural.verification_inputs,
              structureOraclePath,
            ]),
          ];
          structural.positive_assertions = base.positive_assertions
            .filter(
              (assertion) =>
                assertion.claims.length === 0 ||
                assertion.claims.some(
                  (claim) =>
                    claim.startsWith("requirement.") ||
                    claim.startsWith("obligation."),
                ),
            )
            .map((assertion) => ({
              ...structuredClone(assertion),
              evidence_capabilities: ["presence"],
            }));
          structural.negative_assertions = [];
          outcome.acceptance.checks.push(structural);
          const structuralAssertions = structural.positive_assertions.filter(
            (assertion) => assertion.claims.length,
          );
          const structuralAssertionKeys = new Set(
            structuralAssertions.map((assertion) => assertion.key),
          );
          const structuralClaims = new Set(
            structuralAssertions.flatMap((assertion) => assertion.claims),
          );
          base.positive_assertions = base.positive_assertions.filter(
            (assertion) => !structuralAssertionKeys.has(assertion.key),
          );
          for (const control of outcome.acceptance.counterfactual_controls)
            if (control.check_key === base.key) {
              control.claims = control.claims.filter(
                (claim) => !structuralClaims.has(claim),
              );
              control.expected_assertion_failures =
                control.expected_assertion_failures.filter(
                  (assertionKey) =>
                    !structuralAssertionKeys.has(assertionKey),
                );
            }
          const liveness = structural.positive_assertions.find(
            (assertion) => assertion.claims.length === 0,
          );
          outcome.acceptance.counterfactual_controls.push({
            key: "remove-first-structure-state",
            binding_key: "state-first",
            claims: structuralAssertions.flatMap(
              (assertion) => assertion.claims,
            ),
            check_key: structural.key,
            mutation: {
              type: "replace_json_value",
              path: "src/state.json",
              pointer: "/first",
              value: false,
            },
            expected_assertion_failures: structuralAssertions.map(
              (assertion) => assertion.key,
            ),
            preserved_assertions: liveness ? [liveness.key] : [],
          });
        },
      },
      {
        address: "outcomes.first.non_completing.exit-zero-only",
        mutate(contract) {
          contract.outcomes[0].product.non_completing_outcomes[0].statement =
            "A rewritten non-completing condition.";
        },
      },
    ];
    for (const scenario of semanticCases) {
      const candidate = structuredClone(contractBaseline);
      scenario.mutate(candidate);
      if (scenario.address === "outcomes.first.requirements.observe-first") {
        const statement =
          candidate.outcomes[0].product.requirements[0].statement;
        candidate.source_claims[0].statement = statement;
        await writeFile(
          sourceFile,
          `<!-- ty-source-background:start key=fixture-heading reason=markdown-structure -->
<a id="fixture-source"></a>
<!-- ty-source-background:end -->

<!-- ty-source-item:start key=first-observable kind=requirement -->
${statement}
<!-- ty-source-item:end -->

${fixtureArchitectureSourceItem()}

${fixtureExecutionTargetSourceItem()}
`,
        );
      }
      await writeContract(fixture.workdir, candidate);
      await expectProjectedDecision(fixture, previousAuthority, {
        field: "product_semantics_changed",
        includes: scenario.address,
        reason: "product_semantics_changed",
      });
      await writeFile(sourceFile, sourceBaseline);
    }

    const globalCandidate = structuredClone(contractBaseline);
    globalCandidate.global.technical.constraints[0].statement =
      "A rewritten global constraint.";
    await writeContract(fixture.workdir, globalCandidate);
    await expectDecision(fixture, {
      field: "global_semantics_changed",
      includes: "global.technical.constraints.stable-runtime",
      reason: "global_semantics_changed",
    });

    const addedClaim = structuredClone(contractBaseline);
    addedClaim.outcomes[0].technical.obligations.push({
      key: "new-product-scope",
      statement: "Implement newly declared product scope.",
      required_proof_surfaces: ["runtime_behavior"],
      applicability_refs: ["first-root-success"],
    });
    addedClaim.outcomes[0].acceptance.checks[0].positive_assertions.push({
      key: "new-product-scope-proof",
      criterion: "The newly declared product scope is implemented.",
      claims: ["obligation.new-product-scope"],
      applicability_ref: "first-root-success",
      observation: "new_product_scope",
      evidence_capabilities: ["presence", "target_runtime"],
      operator: "equals",
      expected: true,
    });
    addedClaim.outcomes[0].acceptance.counterfactual_controls.push({
      key: "new-product-scope-sensitive",
      binding_key: "state-first",
      claims: ["obligation.new-product-scope"],
      check_key: "first-check",
      mutation: {
        type: "replace_json_value",
        path: "src/state.json",
        pointer: "/first",
        value: false,
      },
      expected_assertion_failures: ["new-product-scope-proof"],
      preserved_assertions: ["first-liveness"],
    });
    await writeContract(fixture.workdir, addedClaim);
    await expectDecision(fixture, {
      field: "product_claims_added",
      includes: "first.obligation.new-product-scope",
      reason: "product_claim_added",
    });
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

async function expectProjectedDecision(
  fixture,
  previousAuthority,
  expectation,
) {
  const projection = await inspectAuthorityRevisionCandidate(
    fixture,
    previousAuthority,
  );
  assert.equal(projection.decision.user_decision_required, true);
  if ("includes" in expectation)
    assert.ok(
      projection.proposal.revision_diff[expectation.field].includes(
        expectation.includes,
      ),
      `${expectation.field} must include ${expectation.includes}`,
    );
  if ("equals" in expectation)
    assert.equal(
      projection.proposal.revision_diff[expectation.field],
      expectation.equals,
    );
  assert.ok(
    projection.proposal.revision_diff.reduction_reasons.includes(
      expectation.reason,
    ),
    `reduction reasons must include ${expectation.reason}`,
  );
  return projection;
}

test("mechanical proof additions and path tightening remain automatic revisions", async () => {
  const fixture = await createDeliveryFixture();
  try {
    await runCli(fixture.root, ["enable", "long-task"]);
    await runCli(fixture.root, ["long-task", "compile", fixture.workdir]);
    await runCli(fixture.root, ["long-task", "verify", fixture.workdir]);

    fixture.contract.outcomes[0].acceptance.checks[0].positive_assertions.push({
      key: "additional-proof",
      criterion: "The additional proof remains true.",
      claims: [],
      observation: "negative",
      evidence_capabilities: ["presence"],
      operator: "equals",
      expected: false,
    });
    await writeContract(fixture.workdir, fixture.contract);
    let result = await runCli(fixture.root, [
      "long-task",
      "compile",
      fixture.workdir,
      "--revise",
    ]);
    assert.equal(result.authority_revision, 2);

    await writeFile(
      path.join(fixture.root, "tests", "extra-input.mjs"),
      "export const extra = true;\n",
    );
    fixture.contract.outcomes[0].acceptance.checks[0].verification_inputs.push(
      "tests/extra-input.mjs",
    );
    await writeContract(fixture.workdir, fixture.contract);
    result = await runCli(fixture.root, [
      "long-task",
      "compile",
      fixture.workdir,
      "--revise",
    ]);
    assert.equal(result.authority_revision, 3);

    fixture.contract.outcomes[0].technical.expected_change_paths = [
      "src/state.json",
    ];
    await writeContract(fixture.workdir, fixture.contract);
    result = await runCli(fixture.root, [
      "long-task",
      "compile",
      fixture.workdir,
      "--revise",
    ]);
    assert.equal(result.authority_revision, 4);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});
