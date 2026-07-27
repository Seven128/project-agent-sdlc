import assert from "node:assert/strict";
import { rm, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { preflightDeliveryContract } from "../../packages/ty-context/dist/lib/long-task-authoring-preflight.js";
import { compileDeliveryContract } from "../../packages/ty-context/dist/lib/long-task-delivery-compiler.js";
import {
  createDeliveryFixture,
  fixtureArchitectureSourceItem,
  runCli,
  writeContract,
} from "./long-task-delivery-fixtures.mjs";
import { expectDecision } from "./long-task-semantic-authority-revision-fixture.mjs";

test("non_completing Source maps exactly and may back a Source AC", async () => {
  const fixture = await createDeliveryFixture();
  try {
    await addNonCompletingSource(fixture);
    const preflight = await preflightDeliveryContract(
      fixture.workdir,
      fixture.root,
    );
    assert.equal(preflight.status, "ready", JSON.stringify(preflight));
    const compiled = await compileDeliveryContract(
      fixture.workdir,
      fixture.root,
      { require_completion_gate: false },
    );
    assert.equal(
      compiled.source_items.find((item) => item.key === "spinner-only").kind,
      "non_completing",
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("non_completing Source cannot map to another Claim kind", async () => {
  const fixture = await createDeliveryFixture();
  try {
    await addNonCompletingSource(fixture);
    fixture.contract.source_claims.find(
      (item) => item.key === "spinner-only",
    ).disposition.refs = ["first.requirement.observe-first"];
    await assertPreflightAndCompileReject(
      fixture,
      "source_target_kind_mismatch",
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("non_completing Source preserves exact text and unique target ownership", async () => {
  const mismatch = await createDeliveryFixture();
  try {
    await addNonCompletingSource(mismatch);
    mismatch.contract.outcomes[0].product.non_completing_outcomes[0].statement =
      "A rewritten weaker statement.";
    await assertPreflightAndCompileReject(
      mismatch,
      "source_target_statement_mismatch",
    );
  } finally {
    await rm(mismatch.root, { recursive: true, force: true });
  }

  const duplicate = await createDeliveryFixture();
  try {
    await addNonCompletingSource(duplicate);
    duplicate.contract.source_claims.push({
      key: "spinner-only-copy",
      source_ref: "source.md",
      statement: "A loading spinner alone is not completion.",
      disposition: {
        type: "claim",
        refs: ["first.non_completing.spinner-only"],
      },
    });
    const current = await import("node:fs/promises").then(({ readFile }) =>
      readFile(path.join(duplicate.root, "source.md"), "utf8"),
    );
    await writeFile(
      path.join(duplicate.root, "source.md"),
      `${current.trimEnd()}\n\n<!-- ty-source-item:start key=spinner-only-copy kind=non_completing -->\nA loading spinner alone is not completion.\n<!-- ty-source-item:end -->\n`,
    );
    await assertPreflightAndCompileReject(
      duplicate,
      "source_target_already_owned",
    );
  } finally {
    await rm(duplicate.root, { recursive: true, force: true });
  }
});

test("deleting a Source-backed non_completing Claim is a Product Authority reduction", async () => {
  const fixture = await createDeliveryFixture();
  try {
    await addNonCompletingSource(fixture);
    await runCli(fixture.root, ["enable", "long-task"]);
    await runCli(fixture.root, ["long-task", "compile", fixture.workdir]);
    const outcome = fixture.contract.outcomes[0];
    outcome.product.non_completing_outcomes = [];
    outcome.acceptance.checks[0].negative_assertions =
      outcome.acceptance.checks[0].negative_assertions.filter(
        (assertion) => assertion.key !== "spinner-only-rejected",
      );
    outcome.acceptance.counterfactual_controls[0].claims =
      outcome.acceptance.counterfactual_controls[0].claims.filter(
        (claim) => claim !== "non_completing.spinner-only",
      );
    outcome.acceptance.counterfactual_controls[0].expected_assertion_failures =
      outcome.acceptance.counterfactual_controls[0].expected_assertion_failures.filter(
        (key) => key !== "spinner-only-rejected",
      );
    fixture.contract.source_claims = fixture.contract.source_claims.filter(
      (claim) => !["spinner-only", "spinner-only-ac"].includes(claim.key),
    );
    await writeFile(
      path.join(fixture.root, "source.md"),
      `<!-- ty-source-background:start key=fixture-heading reason=markdown-structure -->\n<a id="fixture-source"></a>\n<!-- ty-source-background:end -->\n\n<!-- ty-source-item:start key=first-observable kind=requirement -->\nThe first outcome must be observable.\n<!-- ty-source-item:end -->\n\n${fixtureArchitectureSourceItem()}\n`,
    );
    await writeContract(fixture.workdir, fixture.contract);
    await expectDecision(fixture, {
      field: "product_semantics_changed",
      includes: "outcomes.first.non_completing.spinner-only",
      reason: "product_semantics_changed",
    });
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

async function addNonCompletingSource(fixture) {
  const nonCompleting = "A loading spinner alone is not completion.";
  const criterion = "The spinner-only state is rejected as completion.";
  const outcome = fixture.contract.outcomes[0];
  outcome.product.non_completing_outcomes.push({
    key: "spinner-only",
    statement: nonCompleting,
    applicability_refs: ["first-root-success"],
  });
  const check = outcome.acceptance.checks[0];
  check.negative_assertions.push({
    key: "spinner-only-rejected",
    criterion,
    claims: ["non_completing.spinner-only"],
    applicability_ref: "first-root-success",
    observation: "negative",
    evidence_capabilities: ["state_delta"],
    operator: "equals",
    expected: false,
  });
  const control = outcome.acceptance.counterfactual_controls[0];
  control.claims.push("non_completing.spinner-only");
  control.expected_assertion_failures.push("spinner-only-rejected");
  fixture.contract.source_claims.push(
    {
      key: "spinner-only",
      source_ref: "source.md",
      statement: nonCompleting,
      disposition: {
        type: "claim",
        refs: ["first.non_completing.spinner-only"],
      },
    },
    {
      key: "spinner-only-ac",
      source_ref: "source.md",
      statement: criterion,
      disposition: {
        type: "acceptance",
        refs: ["first.first-check.spinner-only-rejected"],
      },
    },
  );
  await writeFile(
    path.join(fixture.root, "source.md"),
    `<!-- ty-source-background:start key=fixture-heading reason=markdown-structure -->
<a id="fixture-source"></a>
<!-- ty-source-background:end -->

<!-- ty-source-item:start key=first-observable kind=requirement -->
The first outcome must be observable.
<!-- ty-source-item:end -->

${fixtureArchitectureSourceItem()}

<!-- ty-source-item:start key=spinner-only kind=non_completing -->
${nonCompleting}
<!-- ty-source-item:end -->

<!-- ty-source-item:start key=spinner-only-ac kind=acceptance -->
${criterion}
<!-- ty-source-item:end -->
`,
  );
  await writeContract(fixture.workdir, fixture.contract);
}

async function assertPreflightAndCompileReject(fixture, code) {
  await writeContract(fixture.workdir, fixture.contract);
  const preflight = await preflightDeliveryContract(
    fixture.workdir,
    fixture.root,
  );
  assert.equal(preflight.status, "not_ready");
  assert.ok(
    preflight.diagnostics.some((item) => item.code === code),
    `missing ${code}: ${JSON.stringify(preflight)}`,
  );
  await assert.rejects(
    compileDeliveryContract(fixture.workdir, fixture.root, {
      require_completion_gate: false,
    }),
    new RegExp(code, "u"),
  );
}
