import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { runCli } from "./long-task-delivery-fixtures.mjs";

export function prepareSemanticAuthority(contract) {
  const outcome = contract.outcomes[0];
  outcome.product.non_completing_outcomes.push({
    key: "exit-zero-only",
    statement: "Exit zero alone is not completion.",
    applicability_refs: ["first-root-success"],
  });
  outcome.acceptance.counterfactual_controls[0].claims.push(
    "non_completing.exit-zero-only",
  );
  outcome.acceptance.checks[0].negative_assertions.push({
    key: "exit-zero-is-insufficient",
    criterion: "Exit zero alone remains insufficient.",
    claims: ["non_completing.exit-zero-only"],
    applicability_ref: "first-root-success",
    observation: "exit_zero_is_insufficient",
    evidence_capabilities: ["presence", "target_runtime"],
    operator: "equals",
    expected: true,
  });
  outcome.acceptance.counterfactual_controls[0].expected_assertion_failures.push(
    "exit-zero-is-insufficient",
  );
}

export async function expectDecision(fixture, expectation) {
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
  if ("includes" in expectation)
    assert.ok(
      pending.revision_diff[expectation.field].includes(expectation.includes),
      `${expectation.field} must include ${expectation.includes}`,
    );
  if ("equals" in expectation)
    assert.equal(pending.revision_diff[expectation.field], expectation.equals);
  assert.ok(
    pending.revision_diff.reduction_reasons.includes(expectation.reason),
    `reduction reasons must include ${expectation.reason}`,
  );
  return pending;
}
