import assert from "node:assert/strict";
import { rm, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { preflightDeliveryContract } from "../../packages/ty-context/dist/lib/long-task-authoring-preflight.js";
import { compileDeliveryContract } from "../../packages/ty-context/dist/lib/long-task-delivery-compiler.js";
import { classifyLongTaskRisk } from "../../packages/ty-context/dist/lib/long-task-risk.js";
import {
  createDeliveryFixture,
  deliveryContract,
  fixtureArchitectureSourceItem,
  fixtureExecutionTargetSourceItem,
  runCli,
  writeContract,
} from "./long-task-delivery-fixtures.mjs";
import { expectDecision } from "./long-task-semantic-authority-revision-fixture.mjs";

test("Risk Source marker binds one exact Fact/Affected Outcome pair", async () => {
  const fixture = await createDeliveryFixture();
  try {
    await configureRiskSource(
      fixture,
      "critical_user_path",
      "first",
      "critical_user_path:first",
    );
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
    assert.deepEqual(
      compiled.source_items.find((item) => item.key === "risk-source")
        .risk_semantics,
      {
        fact: "critical_user_path",
        affected_outcome: "first",
      },
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("Risk Source marker cannot be redirected to a weaker or different pair", async () => {
  const fixture = await createDeliveryFixture();
  try {
    fixture.contract.risk.facts.critical_user_path = ["first"];
    fixture.contract.risk.facts.weak_observability = ["first"];
    await configureRiskSource(
      fixture,
      "critical_user_path",
      "first",
      "weak_observability:first",
      false,
    );
    await assertPreflightAndCompileReject(
      fixture,
      "source_risk_target_mismatch",
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("Risk marker requires fact/outcome and rejects those attributes elsewhere", async () => {
  for (const scenario of [
    {
      marker:
        "<!-- ty-source-item:start key=risk-source kind=risk_fact fact=critical_user_path -->",
      code: "source_item_risk_semantics_required",
    },
    {
      marker:
        "<!-- ty-source-item:start key=risk-source kind=requirement fact=critical_user_path outcome=first -->",
      code: "source_item_marker_attributes_forbidden",
    },
    {
      marker:
        "<!-- ty-source-item:start key=risk-source kind=risk_fact fact=unknown_risk outcome=first -->",
      code: "source_item_risk_fact_invalid",
    },
  ]) {
    const fixture = await createDeliveryFixture();
    try {
      fixture.contract.source_claims[0] = riskSourceClaim(
        "critical_user_path:first",
      );
      fixture.contract.risk.facts.critical_user_path = ["first"];
      await writeFile(
        path.join(fixture.root, "source.md"),
        `${sourceHeading("Risk", "risk-heading")}\n\n${scenario.marker}\nRisk text.\n<!-- ty-source-item:end -->\n\n${fixtureArchitectureSourceItem()}\n\n${sourceHeading("Fixture source", "fixture-source-heading")}\n\n${fixtureExecutionTargetSourceItem()}\n`,
      );
      await assertPreflightAndCompileReject(fixture, scenario.code);
    } finally {
      await rm(fixture.root, { recursive: true, force: true });
    }
  }
});

test("Risk Fact/Outcome pairs are unique and permission changes raise strict floor", async () => {
  const duplicate = await createDeliveryFixture();
  try {
    duplicate.contract.risk.facts.critical_user_path = ["first", "first"];
    await assertPreflightAndCompileReject(
      duplicate,
      "risk_fact_outcome_duplicate",
    );
  } finally {
    await rm(duplicate.root, { recursive: true, force: true });
  }

  const contract = deliveryContract();
  contract.risk.facts.permission_boundary_change = ["first"];
  const decision = classifyLongTaskRisk(contract);
  assert.equal(decision.minimum_level, "strict");
  assert.deepEqual(decision.reasons, ["permission_boundary_change:first"]);
});

test("ambiguous Risk remains decision_required and blocks Compile", async () => {
  const fixture = await createDeliveryFixture();
  try {
    fixture.contract.source_claims[0] = {
      key: "risk-decision",
      source_ref: "source.md",
      statement: "Choose the exact Risk Fact and affected Outcome.",
      disposition: {
        type: "decision_required",
        reason: "The Source does not authorize a Fact/Outcome pair.",
      },
    };
    await writeFile(
      path.join(fixture.root, "source.md"),
      `${sourceHeading("Risk decision", "risk-decision-heading")}

<!-- ty-source-item:start key=risk-decision kind=decision -->
Choose the exact Risk Fact and affected Outcome.
<!-- ty-source-item:end -->

${fixtureArchitectureSourceItem()}

${sourceHeading("Fixture source", "fixture-source-heading")}

${fixtureExecutionTargetSourceItem()}
`,
    );
    await writeContract(fixture.workdir, fixture.contract);
    const preflight = await preflightDeliveryContract(
      fixture.workdir,
      fixture.root,
    );
    assert.equal(preflight.status, "not_ready");
    assert.ok(
      preflight.diagnostics.some(
        (item) => item.code === "source_claim_decision_required",
      ),
    );
    await assert.rejects(
      compileDeliveryContract(fixture.workdir, fixture.root, {
        require_completion_gate: false,
      }),
      /source_claim_decision_required:risk-decision/u,
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("changing Risk marker Fact/Outcome changes frozen Source and Risk Authority", async () => {
  const fixture = await createDeliveryFixture();
  try {
    await configureRiskSource(
      fixture,
      "critical_user_path",
      "first",
      "critical_user_path:first",
    );
    await runCli(fixture.root, ["enable", "long-task"]);
    await runCli(fixture.root, ["long-task", "compile", fixture.workdir]);
    delete fixture.contract.risk.facts.critical_user_path;
    await configureRiskSource(
      fixture,
      "weak_observability",
      "first",
      "weak_observability:first",
    );
    const pending = await expectDecision(fixture, {
      field: "source_files_changed",
      includes: "source.md",
      reason: "source_file_content_changed",
    });
    assert.equal(pending.revision_diff.risk_changed, true);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

async function configureRiskSource(
  fixture,
  markerFact,
  markerOutcome,
  dispositionRef,
  resetFacts = true,
) {
  if (resetFacts) fixture.contract.risk.facts[markerFact] = [markerOutcome];
  fixture.contract.source_claims[0] = riskSourceClaim(dispositionRef);
  await writeFile(
    path.join(fixture.root, "source.md"),
    `${sourceHeading("Risk", "risk-heading")}

<!-- ty-source-item:start key=risk-source kind=risk_fact fact=${markerFact} outcome=${markerOutcome} -->
Risk text.
<!-- ty-source-item:end -->

${fixtureArchitectureSourceItem()}

${sourceHeading("Fixture source", "fixture-source-heading")}

${fixtureExecutionTargetSourceItem()}
`,
  );
  await writeContract(fixture.workdir, fixture.contract);
}

function riskSourceClaim(reference) {
  return {
    key: "risk-source",
    source_ref: "source.md",
    statement: "Risk text.",
    disposition: { type: "risk_fact", refs: [reference] },
  };
}

function sourceHeading(title, key) {
  const anchor = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-|-$/gu, "");
  return `<!-- ty-source-background:start key=${key} reason=markdown-structure -->
<a id="${anchor}"></a>
<!-- ty-source-background:end -->`;
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
