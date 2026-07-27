import { rm, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import {
  createDeliveryFixture,
  runCli,
  writeContract,
} from "./long-task-delivery-fixtures.mjs";
import { expectDecision } from "./long-task-semantic-authority-revision-fixture.mjs";

test("Requirement, criterion, Source-AC mapping and AC removal remain review authority", async () => {
  const fixture = await createDeliveryFixture();
  try {
    await runCli(fixture.root, ["enable", "long-task"]);
    await runCli(fixture.root, ["long-task", "compile", fixture.workdir]);
    await runCli(fixture.root, ["long-task", "verify", fixture.workdir]);
    const baseline = structuredClone(fixture.contract);

    const removedRequirement = structuredClone(baseline);
    removedRequirement.outcomes[0].product.requirements = [];
    removedRequirement.outcomes[0].acceptance.checks[0].positive_assertions =
      removedRequirement.outcomes[0].acceptance.checks[0].positive_assertions.filter(
        (assertion) => assertion.key !== "first-requirement",
      );
    removedRequirement.outcomes[0].acceptance.counterfactual_controls[0].claims =
      removedRequirement.outcomes[0].acceptance.counterfactual_controls[0].claims.filter(
        (claim) => claim !== "requirement.observe-first",
      );
    removedRequirement.outcomes[0].acceptance.counterfactual_controls[0]
      .expected_assertion_failures =
      removedRequirement.outcomes[0].acceptance.counterfactual_controls[0].expected_assertion_failures.filter(
        (assertion) => assertion !== "first-requirement",
      );
    removedRequirement.source_claims[0].statement = "Implement first";
    removedRequirement.source_claims[0].disposition = {
      type: "claim",
      refs: ["first.obligation.implement-first"],
    };
    removedRequirement.outcomes[0].acceptance.checks[0].positive_assertions[0].criterion =
      "The first outcome must be observable.";
    await writeSource(
      fixture.root,
      "technical_obligation",
      "Implement first",
    );
    await writeContract(fixture.workdir, removedRequirement);
    await expectDecision(fixture, {
      field: "product_claims_removed",
      includes: "first.requirement.observe-first",
      reason: "product_claim_removed",
    });

    const changedCriterion = structuredClone(baseline);
    await writeSource(fixture.root, "requirement");
    changedCriterion.outcomes[0].acceptance.checks[0].positive_assertions[0].criterion =
      "A changed readable acceptance criterion.";
    await writeContract(fixture.workdir, changedCriterion);
    await expectDecision(fixture, {
      reason: "acceptance_not_monotonic",
    });

    const changedSourceAcceptance = structuredClone(baseline);
    changedSourceAcceptance.source_claims[0].disposition = {
      type: "acceptance",
      refs: ["first.first-check.first-requirement"],
    };
    changedSourceAcceptance.source_claims.push({
      key: "first-requirement",
      source_ref: "source.md#fixture-source",
      statement: "The first outcome must be observable.",
      disposition: {
        type: "claim",
        refs: ["first.requirement.observe-first"],
      },
    });
    changedSourceAcceptance.outcomes[0].acceptance.checks[0].positive_assertions.find(
      (assertion) => assertion.key === "first-requirement",
    ).criterion = "The first outcome must be observable.";
    await writeSourceWithRequirement(fixture.root, "first-observable");
    await writeContract(fixture.workdir, changedSourceAcceptance);
    await expectDecision(fixture, {
      reason: "source_claim_removed_or_changed",
    });

    const replacedAcceptance = structuredClone(baseline);
    const replacedCheck =
      replacedAcceptance.outcomes[0].acceptance.checks[0];
    const requirementAssertion = replacedCheck.positive_assertions.find(
      (assertion) => assertion.key === "first-requirement",
    );
    replacedCheck.positive_assertions =
      replacedCheck.positive_assertions.map((assertion) =>
        assertion.key === "first-requirement"
          ? {
              ...requirementAssertion,
              key: "replacement-requirement",
              criterion: "The first outcome must be observable.",
            }
          : assertion,
      );
    replacedAcceptance.source_claims[0].disposition = {
      type: "acceptance",
      refs: ["first.first-check.replacement-requirement"],
    };
    replacedAcceptance.source_claims.push({
      key: "first-requirement",
      source_ref: "source.md#fixture-source",
      statement: "The first outcome must be observable.",
      disposition: {
        type: "claim",
        refs: ["first.requirement.observe-first"],
      },
    });
    replacedAcceptance.outcomes[0].acceptance.counterfactual_controls[0]
      .expected_assertion_failures =
      replacedAcceptance.outcomes[0].acceptance.counterfactual_controls[0].expected_assertion_failures.map(
        (assertion) =>
          assertion === "first-requirement"
            ? "replacement-requirement"
            : assertion,
      );
    await writeSourceWithRequirement(fixture.root, "first-observable");
    await writeContract(fixture.workdir, replacedAcceptance);
    await expectDecision(fixture, {
      reason: "acceptance_not_monotonic",
    });
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

async function writeSource(
  root,
  kind,
  statement = "The first outcome must be observable.",
) {
  await writeFile(
    path.join(root, "source.md"),
    `<!-- ty-source-background:start key=fixture-heading reason=markdown-structure -->
<a id="fixture-source"></a>
<!-- ty-source-background:end -->

<!-- ty-source-item:start key=first-observable kind=${kind} -->
${statement}
<!-- ty-source-item:end -->

<!-- ty-source-item:start key=fixture-architecture kind=technical_obligation aspect=architecture -->
Preserve the fixture state owner and verifier boundary.
<!-- ty-source-item:end -->
`,
  );
}

async function writeSourceWithRequirement(root, acceptanceKey) {
  await writeFile(
    path.join(root, "source.md"),
    `<!-- ty-source-background:start key=fixture-heading reason=markdown-structure -->
<a id="fixture-source"></a>
<!-- ty-source-background:end -->

<!-- ty-source-item:start key=${acceptanceKey} kind=acceptance -->
The first outcome must be observable.
<!-- ty-source-item:end -->

<!-- ty-source-item:start key=first-requirement kind=requirement -->
The first outcome must be observable.
<!-- ty-source-item:end -->

<!-- ty-source-item:start key=fixture-architecture kind=technical_obligation aspect=architecture -->
Preserve the fixture state owner and verifier boundary.
<!-- ty-source-item:end -->
`,
  );
}
