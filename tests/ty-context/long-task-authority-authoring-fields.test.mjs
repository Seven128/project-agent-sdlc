import { readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import YAML from "yaml";
import {
  createDeliveryFixture,
  fixtureExecutionTargetSourceItem,
  runCli,
  writeContract,
} from "./long-task-delivery-fixtures.mjs";
import { expectDecision } from "./long-task-semantic-authority-revision-fixture.mjs";

const acceptanceSourceStatement = "The first outcome is observable.";

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
    removedRequirement.outcomes[0].acceptance.counterfactual_controls[0].expected_assertion_failures =
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
    await writeSource(fixture.root, "technical_obligation", "Implement first");
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
    changedSourceAcceptance.source_claims[0].statement =
      acceptanceSourceStatement;
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
    ).criterion = acceptanceSourceStatement;
    await writeSourceWithRequirement(
      fixture.root,
      changedSourceAcceptance,
      "first-observable",
    );
    await writeContract(fixture.workdir, changedSourceAcceptance);
    await expectDecision(fixture, {
      reason: "source_claim_removed_or_changed",
    });

    const replacedAcceptance = structuredClone(baseline);
    const replacedCheck = replacedAcceptance.outcomes[0].acceptance.checks[0];
    const requirementAssertion = replacedCheck.positive_assertions.find(
      (assertion) => assertion.key === "first-requirement",
    );
    replacedCheck.positive_assertions = replacedCheck.positive_assertions.map(
      (assertion) =>
        assertion.key === "first-requirement"
          ? {
              ...requirementAssertion,
              key: "replacement-requirement",
              criterion: acceptanceSourceStatement,
            }
          : assertion,
    );
    replacedAcceptance.source_claims[0].disposition = {
      type: "acceptance",
      refs: ["first.first-check.replacement-requirement"],
    };
    replacedAcceptance.source_claims[0].statement = acceptanceSourceStatement;
    replacedAcceptance.source_claims.push({
      key: "first-requirement",
      source_ref: "source.md#fixture-source",
      statement: "The first outcome must be observable.",
      disposition: {
        type: "claim",
        refs: ["first.requirement.observe-first"],
      },
    });
    replacedAcceptance.outcomes[0].acceptance.counterfactual_controls[0].expected_assertion_failures =
      replacedAcceptance.outcomes[0].acceptance.counterfactual_controls[0].expected_assertion_failures.map(
        (assertion) =>
          assertion === "first-requirement"
            ? "replacement-requirement"
            : assertion,
      );
    await writeSourceWithRequirement(
      fixture.root,
      replacedAcceptance,
      "first-observable",
    );
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

${fixtureExecutionTargetSourceItem()}
`,
  );
}

async function writeSourceWithRequirement(root, contract, acceptanceKey) {
  const currentSource = await readFile(path.join(root, "source.md"), "utf8");
  const manifest = embeddedSemanticManifest(currentSource);
  addAcceptanceSemanticFact(contract, manifest, acceptanceKey);
  await writeFile(
    path.join(root, "source.md"),
    `<!-- ty-source-background:start key=fixture-heading reason=markdown-structure -->
<a id="fixture-source"></a>
<!-- ty-source-background:end -->

<!-- ty-source-item:start key=${acceptanceKey} kind=acceptance -->
${acceptanceSourceStatement}
<!-- ty-source-item:end -->

<!-- ty-source-item:start key=first-requirement kind=requirement -->
The first outcome must be observable.
<!-- ty-source-item:end -->

<!-- ty-source-item:start key=fixture-architecture kind=technical_obligation aspect=architecture -->
Preserve the fixture state owner and verifier boundary.
<!-- ty-source-item:end -->

${fixtureExecutionTargetSourceItem()}

\`\`\`yaml semantic-fact-manifest-v1
${YAML.stringify(manifest, { lineWidth: 0 }).trimEnd()}
\`\`\`
`,
  );
}

function embeddedSemanticManifest(source) {
  const match = source.match(
    /^```yaml[ \t]+semantic-fact-manifest-v1[ \t]*\r?\n([\s\S]*?)^```[ \t]*$/mu,
  );
  if (!match) throw new Error("fixture_semantic_manifest_missing");
  return YAML.parse(match[1]);
}

function addAcceptanceSemanticFact(contract, manifest, acceptanceKey) {
  const outcome = contract.outcomes[0];
  const check = outcome.acceptance.checks[0];
  const factRef = "fact.first.acceptance-observable";
  const claimRef = `semantic_fact.${factRef}`;
  const proofRef = "proof.first.acceptance-observable.exact";
  const assertionRef = "first-acceptance-semantic-fact";
  const propertyRef = "property.acceptance-observable";
  const cellRef = "cell.first.acceptance-observable";
  if (!manifest.facts.some((fact) => fact.key === factRef)) {
    const baseFact = manifest.facts[0];
    const baseCell = manifest.fact_cells.find(
      (cell) => cell.key === baseFact.cell_ref,
    );
    const baseProperty = manifest.property_dispositions.find(
      (property) => property.key === baseFact.property_ref,
    );
    const baseProof = manifest.proof_obligations.find(
      (proof) => proof.fact_ref === baseFact.key,
    );
    if (!baseCell || !baseProperty || !baseProof)
      throw new Error("fixture_acceptance_fact_template_missing");

    const existingAuthorityInput = manifest.inputs.find(
      (input) =>
        input.kind === "source_item" && input.source_ref === acceptanceKey,
    );
    if (!existingAuthorityInput)
      throw new Error("fixture_acceptance_source_input_missing");
    existingAuthorityInput.fact_refs = [factRef];
    manifest.inputs.push({
      key: "input.first-requirement",
      kind: "source_item",
      source_ref: "first-requirement",
      sha256: existingAuthorityInput.sha256,
      disposition: "non_ui_material",
      fact_refs: [baseFact.key],
      basis_refs: ["first-requirement"],
      rationale:
        "The explicit product requirement remains projected to the product-domain fixture Fact.",
    });
    manifest.property_dispositions.push({
      ...structuredClone(baseProperty),
      key: propertyRef,
      property: "custom.acceptance_observable",
      standard: false,
      source_item_refs: [acceptanceKey],
      basis_refs: [acceptanceKey],
      rationale:
        "The explicit acceptance Source item has its own acceptance-domain atomic Fact.",
    });
    manifest.fact_cells.push({
      ...structuredClone(baseCell),
      key: cellRef,
      property_ref: propertyRef,
      fact_ref: factRef,
      source_item_refs: [acceptanceKey],
      basis_refs: [acceptanceKey],
      rationale:
        "The acceptance criterion is specified independently from the product requirement.",
    });
    manifest.facts.push({
      ...structuredClone(baseFact),
      key: factRef,
      cell_ref: cellRef,
      property_ref: propertyRef,
      expected: {
        ...structuredClone(baseFact.expected),
        locator: {
          ...structuredClone(baseFact.expected.locator),
          value: `/facts/${manifest.facts.length}/expected/value`,
        },
      },
      provenance: {
        kind: "direct",
        authority_ref: acceptanceKey,
        basis_refs: [acceptanceKey],
        derivation: null,
      },
      source_item_refs: [acceptanceKey],
    });
    manifest.proof_obligations.push({
      ...structuredClone(baseProof),
      key: proofRef,
      fact_ref: factRef,
      comparison: {
        ...structuredClone(baseProof.comparison),
        parameters: {
          ...structuredClone(baseProof.comparison.parameters),
          locator: {
            ...structuredClone(baseProof.comparison.parameters.locator),
            value: `/proof_obligations/${manifest.proof_obligations.length}/comparison/parameters/value`,
          },
        },
      },
      counterfactual: {
        ...structuredClone(baseProof.counterfactual),
        basis_refs: [acceptanceKey],
      },
    });
  }
  outcome.semantic_fact_bindings.facts.push({
    fact_ref: factRef,
    claim_ref: claimRef,
    applicability_ref: "first-root-success",
  });
  outcome.semantic_fact_bindings.proofs.push({
    proof_ref: proofRef,
    fact_ref: factRef,
    method: "exact_value",
    proof_surface: "runtime_behavior",
    evidence_capabilities: ["semantic_fact"],
    authority: "machine",
    check_ref: check.key,
    assertion_ref: assertionRef,
  });
  check.positive_assertions.push({
    key: assertionRef,
    criterion:
      "The explicit acceptance Source item remains independently observable.",
    claims: [claimRef],
    applicability_ref: "first-root-success",
    observation: "acceptance_semantic_fact_result",
    evidence_capabilities: ["semantic_fact"],
    operator: "equals",
    expected: true,
  });
  const counterfactual = outcome.acceptance.counterfactual_controls[0];
  counterfactual.claims.push(claimRef);
  counterfactual.expected_assertion_failures.push(assertionRef);
}
