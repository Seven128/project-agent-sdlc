import assert from "node:assert/strict";
import { rm, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import YAML from "yaml";
import { preflightDeliveryContract } from "../../packages/ty-context/dist/lib/long-task-authoring-preflight.js";
import { compileDeliveryContract } from "../../packages/ty-context/dist/lib/long-task-delivery-compiler.js";
import { explainSourceLinks } from "../../packages/ty-context/dist/lib/long-task-explain-source-links.js";
import { enrichFinding } from "../../packages/ty-context/dist/lib/long-task-finding-context.js";
import { parseDeliveryContractText } from "../../packages/ty-context/dist/lib/long-task-delivery-parser.js";
import { parseSourceItems } from "../../packages/ty-context/dist/lib/long-task-source-item-parser.js";
import {
  addProductionControlBinding,
  completeControl,
  createDeliveryFixture,
  deliveryContract,
  fixtureArchitectureSourceItem,
  writeContract,
} from "./long-task-delivery-fixtures.mjs";

test("Source Item inventory is set-equivalent and statement-continuous", async () => {
  const fixture = await createDeliveryFixture();
  try {
    await writeFile(
      path.join(fixture.root, "source.md"),
      `${sourceHeading()}

<!-- ty-source-item:start key=first-observable kind=requirement -->
The first outcome must be observable.
<!-- ty-source-item:end -->

<!-- ty-source-item:start key=unmapped kind=technical_obligation -->
The implementation must preserve the declared evidence boundary.
<!-- ty-source-item:end -->

${fixtureArchitectureSourceItem()}
`,
    );
    await assert.rejects(
      compileDeliveryContract(fixture.workdir, fixture.root, {
        require_completion_gate: false,
      }),
      /source_item_unmapped:unmapped/u,
    );

    fixture.contract.source_claims[0].key = "unknown-item";
    await writeContract(fixture.workdir, fixture.contract);
    await assert.rejects(
      compileDeliveryContract(fixture.workdir, fixture.root, {
        require_completion_gate: false,
      }),
      /source_claim_item_unknown:unknown-item/u,
    );

    fixture.contract.source_claims[0].key = "first-observable";
    fixture.contract.source_claims[0].statement =
      "A weaker rewritten statement.";
    await writeContract(fixture.workdir, fixture.contract);
    await writeFile(
      path.join(fixture.root, "source.md"),
      `${sourceHeading()}

<!-- ty-source-item:start key=first-observable kind=requirement -->
The first outcome must be observable.
<!-- ty-source-item:end -->

${fixtureArchitectureSourceItem()}
`,
    );
    await assert.rejects(
      compileDeliveryContract(fixture.workdir, fixture.root, {
        require_completion_gate: false,
      }),
      /source_claim_statement_mismatch:first-observable/u,
    );

    fixture.contract.source_claims[0].statement =
      "The first outcome must be observable.";
    fixture.contract.source_claims[0].disposition = {
      type: "acceptance",
      refs: ["first.first-check.first-requirement"],
    };
    fixture.contract.outcomes[0].acceptance.checks[0].positive_assertions.find(
      (assertion) => assertion.key === "first-requirement",
    ).criterion = "A weakened acceptance criterion.";
    await writeContract(fixture.workdir, fixture.contract);
    await writeFile(
      path.join(fixture.root, "source.md"),
      `${sourceHeading()}

<!-- ty-source-item:start key=first-observable kind=acceptance -->
The first outcome must be observable.
<!-- ty-source-item:end -->

${fixtureArchitectureSourceItem()}
`,
    );
    await assert.rejects(
      compileDeliveryContract(fixture.workdir, fixture.root, {
        require_completion_gate: false,
      }),
      /source_acceptance_criterion_mismatch:first-observable/u,
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("every declared Source file contains at least one Material Source Item", async () => {
  const fixture = await createDeliveryFixture();
  try {
    await writeFile(
      path.join(fixture.root, "background.md"),
      `${sourceHeading("Background only", "background-heading")}\n`,
    );
    fixture.contract.task.source_paths.push("background.md");
    await writeContract(fixture.workdir, fixture.contract);
    await assert.rejects(
      compileDeliveryContract(fixture.workdir, fixture.root, {
        require_completion_gate: false,
      }),
      /source_file_material_item_required:background\.md/u,
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("Source Item markers reject malformed declarations", () => {
  const valid = (
    key,
    body = "Requirement text.",
  ) => `<!-- ty-source-item:start key=${key} kind=requirement -->
${body}
<!-- ty-source-item:end -->`;
  assert.throws(
    () => parseSourceItems("source.md", `${valid("same")}\n${valid("same")}`),
    /source_item_key_duplicate/u,
  );
  assert.throws(
    () =>
      parseSourceItems(
        "source.md",
        `<!-- ty-source-item:start key=outer kind=requirement -->
<!-- ty-source-item:start key=inner kind=requirement -->
Inner.
<!-- ty-source-item:end -->
<!-- ty-source-item:end -->`,
      ),
    /source_section_nested_or_overlapping/u,
  );
  assert.throws(
    () =>
      parseSourceItems(
        "source.md",
        "<!-- ty-source-item:start key=open kind=requirement -->\nOpen.",
      ),
    /source_item_unclosed/u,
  );
  assert.throws(
    () => parseSourceItems("source.md", valid("empty", "  ")),
    /source_item_empty/u,
  );
  assert.throws(
    () =>
      parseSourceItems(
        "source.md",
        "<!-- ty-source-item:start key=Bad_Key kind=requirement -->\nText.\n<!-- ty-source-item:end -->",
      ),
    /source_item_marker_invalid/u,
  );
});

test("typed Source dispositions preserve Result, Risk, and Non-goal meaning", async () => {
  for (const scenario of ["outcome_result", "risk_fact", "non_goal"]) {
    const fixture = await createDeliveryFixture();
    try {
      const statement =
        scenario === "outcome_result"
          ? "The complete first outcome is observable."
          : scenario === "risk_fact"
            ? "The first outcome is a critical user path."
            : "Legacy fallback is not part of this delivery.";
      await writeFile(
        path.join(fixture.root, "source.md"),
        `${sourceHeading()}

<!-- ty-source-item:start key=first-observable kind=${scenario}${
          scenario === "risk_fact"
            ? " fact=critical_user_path outcome=first"
            : ""
        } -->
${statement}
<!-- ty-source-item:end -->

${fixtureArchitectureSourceItem()}
`,
      );
      fixture.contract.source_claims[0].statement = statement;
      if (scenario === "outcome_result") {
        fixture.contract.outcomes[0].product.observable_result = statement;
        fixture.contract.source_claims[0].disposition = {
          type: "outcome_result",
          ref: "first.result",
        };
      } else if (scenario === "risk_fact") {
        fixture.contract.risk.facts.critical_user_path = ["first"];
        fixture.contract.source_claims[0].disposition = {
          type: "risk_fact",
          refs: ["critical_user_path:first"],
        };
      } else {
        const applicabilityRef = ensureGlobalApplicability(fixture.contract);
        fixture.contract.global.product.non_goals.push({
          key: "no-legacy",
          statement,
          applicability_refs: [applicabilityRef],
        });
        const globalCheck = structuredClone(
          fixture.contract.outcomes[0].acceptance.checks[0],
        );
        globalCheck.key = "no-legacy";
        globalCheck.positive_assertions = [
          {
            key: "no-legacy-liveness",
            criterion: "The owning product target remains live.",
            claims: [],
            observation: "target_live",
            evidence_capabilities: ["target_runtime"],
            operator: "equals",
            expected: true,
          },
        ];
        globalCheck.negative_assertions = [
          {
            key: "no-legacy",
            criterion: statement,
            claims: ["non_goal.no-legacy"],
            applicability_ref: applicabilityRef,
            observation: "negative",
            evidence_capabilities: ["state_delta"],
            operator: "equals",
            expected: false,
          },
        ];
        fixture.contract.global.acceptance.checks.push(globalCheck);
        fixture.contract.global.acceptance.counterfactual_controls.push({
          key: "replace-global-semantics",
          binding_ref: "first.state-first",
          claims: ["non_goal.no-legacy"],
          check_key: "no-legacy",
          mutation: {
            type: "replace_json_value",
            path: "src/state.json",
            pointer: "/first",
            value: false,
          },
          expected_assertion_failures: ["no-legacy"],
          preserved_assertions: ["no-legacy-liveness"],
        });
        fixture.contract.source_claims[0].disposition = {
          type: "global_constraint",
          refs: ["non_goal.no-legacy"],
        };
      }
      await writeContract(fixture.workdir, fixture.contract);
      await assert.doesNotReject(
        compileDeliveryContract(fixture.workdir, fixture.root, {
          require_completion_gate: false,
        }),
        scenario,
      );
    } finally {
      await rm(fixture.root, { recursive: true, force: true });
    }
  }
});

test("Source risk_fact must resolve to an actual Contract risk fact", () => {
  const contract = deliveryContract();
  contract.source_claims[0].disposition = {
    type: "risk_fact",
    refs: ["security_boundary_change:first"],
  };
  assert.throws(
    () => parse(contract),
    /source_claim_risk_fact_ref_unknown:first-observable:security_boundary_change:first/u,
  );
});

test("Source targets reject cross-kind Requirement, Obligation, Non-goal, and Forbidden Shortcut mappings", async () => {
  const scenarios = [
    {
      name: "requirement-to-obligation",
      kind: "requirement",
      statement: "Implement first",
      mutate(contract) {
        contract.source_claims[0].disposition = {
          type: "claim",
          refs: ["first.obligation.implement-first"],
        };
      },
    },
    {
      name: "technical-obligation-to-requirement",
      kind: "technical_obligation",
      statement: "The first outcome must be observable.",
      mutate(contract) {
        contract.source_claims[0].disposition = {
          type: "claim",
          refs: ["first.requirement.observe-first"],
        };
      },
    },
    {
      name: "forbidden-shortcut-to-requirement",
      kind: "forbidden_shortcut",
      statement: "The first outcome must be observable.",
      mutate(contract) {
        contract.source_claims[0].disposition = {
          type: "claim",
          refs: ["first.requirement.observe-first"],
        };
      },
    },
    {
      name: "non-goal-to-constraint",
      kind: "non_goal",
      statement: "The implementation boundary stays stable.",
      mutate(contract) {
        addGlobalConstraintProof(
          contract,
          "stable-boundary",
          "The implementation boundary stays stable.",
        );
        contract.source_claims[0].disposition = {
          type: "global_constraint",
          refs: ["constraint.stable-boundary"],
        };
      },
    },
    {
      name: "non-goal-to-forbidden-path",
      kind: "non_goal",
      statement: "Secrets remain outside this delivery.",
      mutate(contract) {
        contract.source_claims[0].disposition = {
          type: "global_constraint",
          refs: ["forbidden_path.no-secrets"],
        };
      },
    },
  ];
  for (const scenario of scenarios) {
    const fixture = await createDeliveryFixture();
    try {
      scenario.mutate(fixture.contract);
      fixture.contract.source_claims[0].statement = scenario.statement;
      await writeSourceItems(fixture.root, [
        {
          key: "first-observable",
          kind: scenario.kind,
          statement: scenario.statement,
        },
      ]);
      await assertPreflightAndCompileReject(
        fixture,
        "source_target_kind_mismatch",
        scenario.name,
      );
    } finally {
      await rm(fixture.root, { recursive: true, force: true });
    }
  }
});

test("Source Requirement cannot target a Control field even when the text matches", async () => {
  const fixture = await createDeliveryFixture();
  try {
    const statement = "Show the failure reason and preserve user input.";
    await addControlProof(fixture, statement);
    fixture.contract.source_claims[0].statement = statement;
    fixture.contract.source_claims[0].disposition = {
      type: "claim",
      refs: ["first.control.save.failure"],
    };
    await writeSourceItems(fixture.root, [
      {
        key: "first-observable",
        kind: "requirement",
        statement,
      },
    ]);
    await assertPreflightAndCompileReject(
      fixture,
      "source_target_kind_mismatch",
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("Source targets preserve authoritative Result, Control, and External Confirmation text", async () => {
  const scenarios = [
    {
      name: "outcome-result",
      kind: "outcome_result",
      statement: "A different overall result.",
      async mutate(fixture) {
        fixture.contract.source_claims[0].disposition = {
          type: "outcome_result",
          ref: "first.result",
        };
      },
    },
    {
      name: "control-field",
      kind: "control",
      statement: "A different failure message.",
      async mutate(fixture) {
        await addControlProof(
          fixture,
          "Show the failure reason and preserve user input.",
        );
        fixture.contract.source_claims[0].disposition = {
          type: "claim",
          refs: ["first.control.save.failure"],
        };
      },
    },
    {
      name: "external-confirmation",
      kind: "external_confirmation",
      statement: "A different human confirmation.",
      async mutate(fixture) {
        fixture.contract.global.acceptance.external_confirmations.push({
          key: "owner-approval",
          description: "The product owner confirms the final behavior.",
          owner: "Product owner",
          kind: "field_validation",
          impact_claims: ["first.result"],
          blocks_target: false,
        });
        fixture.contract.source_claims[0].disposition = {
          type: "external_confirmation",
          refs: ["owner-approval"],
        };
      },
    },
  ];
  for (const scenario of scenarios) {
    const fixture = await createDeliveryFixture();
    try {
      await scenario.mutate(fixture);
      fixture.contract.source_claims[0].statement = scenario.statement;
      await writeSourceItems(fixture.root, [
        {
          key: "first-observable",
          kind: scenario.kind,
          statement: scenario.statement,
        },
      ]);
      await assertPreflightAndCompileReject(
        fixture,
        "source_target_statement_mismatch",
        scenario.name,
      );
    } finally {
      await rm(fixture.root, { recursive: true, force: true });
    }
  }
});

test("Canonical Source targets have exactly one ref and one Source owner", async () => {
  const multiRef = await createDeliveryFixture();
  try {
    multiRef.contract.source_claims[0].disposition.refs.push(
      "first.obligation.implement-first",
    );
    await assertPreflightAndCompileReject(
      multiRef,
      "source_claim_target_ref_count",
      "multiple claim refs",
    );
  } finally {
    await rm(multiRef.root, { recursive: true, force: true });
  }

  const duplicateOwner = await createDeliveryFixture();
  try {
    duplicateOwner.contract.source_claims.push({
      key: "duplicate-requirement",
      source_ref: "source.md#fixture-source",
      statement: "The first outcome must be observable.",
      disposition: {
        type: "claim",
        refs: ["first.requirement.observe-first"],
      },
    });
    await writeSourceItems(duplicateOwner.root, [
      {
        key: "first-observable",
        kind: "requirement",
        statement: "The first outcome must be observable.",
      },
      {
        key: "duplicate-requirement",
        kind: "requirement",
        statement: "The first outcome must be observable.",
      },
    ]);
    await assertPreflightAndCompileReject(
      duplicateOwner,
      "source_target_already_owned",
      "duplicate target owner",
    );
  } finally {
    await rm(duplicateOwner.root, { recursive: true, force: true });
  }

  const multiRisk = await createDeliveryFixture();
  try {
    multiRisk.contract.risk.facts.critical_user_path = ["first"];
    multiRisk.contract.risk.facts.weak_observability = ["first"];
    multiRisk.contract.source_claims[0].statement =
      "The first outcome has explicit risk facts.";
    multiRisk.contract.source_claims[0].disposition = {
      type: "risk_fact",
      refs: ["critical_user_path:first", "weak_observability:first"],
    };
    await writeSourceItems(multiRisk.root, [
      {
        key: "first-observable",
        kind: "risk_fact",
        statement: "The first outcome has explicit risk facts.",
        fact: "critical_user_path",
        outcome: "first",
      },
    ]);
    await assertPreflightAndCompileReject(
      multiRisk,
      "source_claim_target_ref_count",
      "multiple risk refs",
    );
  } finally {
    await rm(multiRisk.root, { recursive: true, force: true });
  }
});

test("Source Acceptance must prove another Source-backed non-Result Claim", async () => {
  const fixture = await createDeliveryFixture();
  try {
    const criterion = "The exact acceptance scenario passes.";
    const assertion =
      fixture.contract.outcomes[0].acceptance.checks[0].positive_assertions.find(
        (candidate) => candidate.key === "first-obligation",
      );
    assertion.criterion = criterion;
    fixture.contract.source_claims[0] = {
      key: "acceptance-only",
      source_ref: "source.md#fixture-source",
      statement: criterion,
      disposition: {
        type: "acceptance",
        refs: ["first.first-check.first-obligation"],
      },
    };
    await writeSourceItems(fixture.root, [
      {
        key: "acceptance-only",
        kind: "acceptance",
        statement: criterion,
      },
    ]);
    await assertPreflightAndCompileReject(
      fixture,
      "source_acceptance_without_source_backed_claim",
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("Source Acceptance may prove a precisely Source-backed Requirement", async () => {
  const fixture = await createDeliveryFixture();
  try {
    const criterion = "The exact acceptance scenario passes.";
    fixture.contract.outcomes[0].acceptance.checks[0].positive_assertions.find(
      (assertion) => assertion.key === "first-requirement",
    ).criterion = criterion;
    fixture.contract.source_claims.push({
      key: "first-acceptance",
      source_ref: "source.md#fixture-source",
      statement: criterion,
      disposition: {
        type: "acceptance",
        refs: ["first.first-check.first-requirement"],
      },
    });
    await writeSourceItems(fixture.root, [
      {
        key: "first-observable",
        kind: "requirement",
        statement: "The first outcome must be observable.",
      },
      {
        key: "first-acceptance",
        kind: "acceptance",
        statement: criterion,
      },
    ]);
    await writeContract(fixture.workdir, fixture.contract);
    const preflight = await preflightDeliveryContract(
      fixture.workdir,
      fixture.root,
    );
    assert.equal(preflight.status, "ready");
    await assert.doesNotReject(
      compileDeliveryContract(fixture.workdir, fixture.root, {
        require_completion_gate: false,
      }),
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("Source Acceptance resolves a Source-backed Global Assertion chain", async () => {
  const fixture = await createDeliveryFixture();
  try {
    await configureGlobalSourceAcceptance(fixture, { sourceBacked: true });
    const compiled = await compileDeliveryContract(
      fixture.workdir,
      fixture.root,
      { require_completion_gate: false },
    );
    const source = fixture.contract.source_claims.find(
      (claim) => claim.key === "global-acceptance",
    );
    const links = explainSourceLinks(
      fixture.contract,
      compiled.claim_coverage,
      source,
    );
    assert.equal(
      links[0].reference,
      "GLOBAL.no-legacy-check.no-legacy-assertion",
    );
    assert.equal(links[0].scope, "global");
    assert.deepEqual(links[0].source_backed_claims, ["constraint.no-legacy"]);
    assert.deepEqual(links[0].counterfactuals, [
      {
        key: "replace-global-semantics",
        claims: ["constraint.no-legacy"],
        binding_ref: "first.state-first",
        owning_outcome_key: "first",
        expected_assertion_failures: ["no-legacy-assertion"],
      },
    ]);

    const finding = enrichFinding(compiled, {
      code: "assertion_value_mismatch",
      outcome_key: null,
      check_key: "no-legacy-check",
      assertion_key: "no-legacy-assertion",
      claim_keys: ["constraint.no-legacy"],
      criterion: "Every runtime entry rejects legacy fallback.",
      binding_ref: "first.state-first",
      owning_outcome_key: "first",
      owner_paths: ["src/**"],
      message: "Global assertion failed.",
      next_action: "Repair the global assertion.",
    });
    assert.deepEqual(finding.source_claim_keys, [
      "global-acceptance",
      "global-constraint",
    ]);
    assert.deepEqual(finding.source_target_refs, [
      "GLOBAL.no-legacy-check.no-legacy-assertion",
      "constraint.no-legacy",
    ]);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("Global Source Acceptance rejects unknown, unbacked, cross-scope, and rewritten targets", async () => {
  const scenarios = [
    {
      name: "unknown Global Check",
      sourceBacked: true,
      code: "source_claim_acceptance_ref_unknown",
      mutate(contract) {
        acceptanceSource(contract).disposition.refs = [
          "GLOBAL.unknown-check.no-legacy-assertion",
        ];
      },
    },
    {
      name: "unknown Global Assertion",
      sourceBacked: true,
      code: "source_claim_acceptance_ref_unknown",
      mutate(contract) {
        acceptanceSource(contract).disposition.refs = [
          "GLOBAL.no-legacy-check.unknown-assertion",
        ];
      },
    },
    {
      name: "only a non-Source-backed Global Claim",
      sourceBacked: false,
      code: "source_acceptance_without_source_backed_claim",
      mutate() {},
    },
    {
      name: "Outcome Claim from a Global Assertion",
      sourceBacked: true,
      code: "global_assertion_claim_cross_scope",
      mutate(contract) {
        globalAcceptanceAssertion(contract).claims = [
          "first.requirement.observe-first",
        ];
      },
    },
    {
      name: "criterion rewritten from Source",
      sourceBacked: true,
      code: "source_acceptance_criterion_mismatch",
      mutate(contract) {
        globalAcceptanceAssertion(contract).criterion =
          "A weaker rewritten acceptance criterion.";
      },
    },
  ];
  for (const scenario of scenarios) {
    const fixture = await createDeliveryFixture();
    try {
      await configureGlobalSourceAcceptance(fixture, {
        sourceBacked: scenario.sourceBacked,
      });
      scenario.mutate(fixture.contract);
      await assertPreflightAndCompileReject(
        fixture,
        scenario.code,
        scenario.name,
      );
    } finally {
      await rm(fixture.root, { recursive: true, force: true });
    }
  }
});

async function configureGlobalSourceAcceptance(fixture, { sourceBacked }) {
  const constraint = "Global runtime must reject legacy fallback.";
  const criterion = "Every runtime entry rejects legacy fallback.";
  const applicabilityRef = ensureGlobalApplicability(fixture.contract);
  fixture.contract.global.technical.constraints.push({
    key: "no-legacy",
    statement: constraint,
    applicability_refs: [applicabilityRef],
  });
  const check = structuredClone(
    fixture.contract.outcomes[0].acceptance.checks[0],
  );
  check.key = "no-legacy-check";
  check.positive_assertions = [
    {
      key: "no-legacy-assertion",
      criterion,
      claims: ["constraint.no-legacy"],
      applicability_ref: applicabilityRef,
      observation: "result_copy",
      evidence_capabilities: ["state_delta"],
      operator: "equals",
      expected: true,
    },
    {
      key: "no-legacy-liveness",
      criterion: "The owning product target remains live.",
      claims: [],
      observation: "target_live",
      evidence_capabilities: ["target_runtime"],
      operator: "equals",
      expected: true,
    },
  ];
  check.negative_assertions = [];
  fixture.contract.global.acceptance.checks.push(check);
  fixture.contract.global.acceptance.counterfactual_controls.push({
    key: "replace-global-semantics",
    binding_ref: "first.state-first",
    claims: ["constraint.no-legacy"],
    check_key: "no-legacy-check",
    mutation: {
      type: "replace_json_value",
      path: "src/state.json",
      pointer: "/first",
      value: false,
    },
    expected_assertion_failures: ["no-legacy-assertion"],
    preserved_assertions: ["no-legacy-liveness"],
  });
  if (sourceBacked)
    fixture.contract.source_claims.push({
      key: "global-constraint",
      source_ref: "source.md",
      statement: constraint,
      disposition: {
        type: "global_constraint",
        refs: ["constraint.no-legacy"],
      },
    });
  fixture.contract.source_claims.push({
    key: "global-acceptance",
    source_ref: "source.md",
    statement: criterion,
    disposition: {
      type: "acceptance",
      refs: ["GLOBAL.no-legacy-check.no-legacy-assertion"],
    },
  });
  await writeSourceItems(fixture.root, [
    {
      key: "first-observable",
      kind: "requirement",
      statement: "The first outcome must be observable.",
    },
    ...(sourceBacked
      ? [
          {
            key: "global-constraint",
            kind: "technical_obligation",
            statement: constraint,
          },
        ]
      : []),
    {
      key: "global-acceptance",
      kind: "acceptance",
      statement: criterion,
    },
  ]);
  await writeContract(fixture.workdir, fixture.contract);
}

function acceptanceSource(contract) {
  return contract.source_claims.find(
    (claim) => claim.key === "global-acceptance",
  );
}

function globalAcceptanceAssertion(contract) {
  return contract.global.acceptance.checks
    .find((check) => check.key === "no-legacy-check")
    .positive_assertions.find(
      (assertion) => assertion.key === "no-legacy-assertion",
    );
}

async function assertPreflightAndCompileReject(fixture, code, message = code) {
  await writeContract(fixture.workdir, fixture.contract);
  const preflight = await preflightDeliveryContract(
    fixture.workdir,
    fixture.root,
  );
  assert.equal(preflight.status, "not_ready", message);
  assert.ok(
    preflight.diagnostics.some((item) => item.code === code),
    `${message}: missing Preflight diagnostic ${code}`,
  );
  await assert.rejects(
    compileDeliveryContract(fixture.workdir, fixture.root, {
      require_completion_gate: false,
    }),
    new RegExp(code, "u"),
    message,
  );
}

async function writeSourceItems(root, items) {
  const materialItems = items.some(
    (item) => item.key === "fixture-architecture",
  )
    ? items
    : [
        ...items,
        {
          key: "fixture-architecture",
          kind: "technical_obligation",
          aspect: "architecture",
          statement: "Preserve the fixture state owner and verifier boundary.",
        },
      ];
  await writeFile(
    path.join(root, "source.md"),
    `${sourceHeading()}\n\n${materialItems
      .map(
        (item) => `<!-- ty-source-item:start key=${item.key} kind=${item.kind}${
          item.kind === "risk_fact"
            ? ` fact=${item.fact} outcome=${item.outcome}`
            : ""
        }${item.aspect ? ` aspect=${item.aspect}` : ""} -->
${item.statement}
<!-- ty-source-item:end -->`,
      )
      .join("\n\n")}\n`,
  );
}

async function addControlProof(fixture, failureState) {
  const outcome = fixture.contract.outcomes[0];
  outcome.product.controls.push(
    completeControl({
      key: "save",
      surface: "fixture-main",
      location: "Settings form",
      trigger: "",
      input: "",
      loading_state: "",
      empty_state: "",
      success_state: "",
      failure_state: failureState,
      feedback: "",
    }),
  );
  addProductionControlBinding(fixture.contract, {
    controlKey: "save",
    rootClaimRef: "control.save.location",
  });
}

function addGlobalConstraintProof(contract, key, statement) {
  const applicabilityRef = ensureGlobalApplicability(contract);
  contract.global.technical.constraints.push({
    key,
    statement,
    applicability_refs: [applicabilityRef],
  });
  const check = structuredClone(contract.outcomes[0].acceptance.checks[0]);
  check.key = `global-${key}`;
  check.positive_assertions = [
    {
      key,
      criterion: statement,
      claims: [`constraint.${key}`],
      applicability_ref: applicabilityRef,
      observation: "result",
      evidence_capabilities: ["state_delta"],
      operator: "equals",
      expected: true,
    },
    {
      key: `${key}-liveness`,
      criterion: "The owning product target remains live.",
      claims: [],
      observation: "target_live",
      evidence_capabilities: ["target_runtime"],
      operator: "equals",
      expected: true,
    },
  ];
  check.negative_assertions = [];
  contract.global.acceptance.checks.push(check);
  contract.global.acceptance.counterfactual_controls.push({
    key: `semantic-${key}`,
    binding_ref: "first.state-first",
    claims: [`constraint.${key}`],
    check_key: check.key,
    mutation: {
      type: "replace_json_value",
      path: "src/state.json",
      pointer: "/first",
      value: false,
    },
    expected_assertion_failures: [key],
    preserved_assertions: [`${key}-liveness`],
  });
}

function ensureGlobalApplicability(contract) {
  const key = "global-root-success";
  if (!contract.global.applicability.some((item) => item.key === key))
    contract.global.applicability.push({
      key,
      target_ref: "fixture-app",
      journey_role: "success",
      dimensions: [{ key: "fixture-state", value: "loaded" }],
      given_refs: ["fixture-loaded"],
      when_refs: ["read-outcome"],
    });
  return key;
}

function sourceHeading(title = "Fixture source", key = "fixture-heading") {
  const anchor = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-|-$/gu, "");
  return `<!-- ty-source-background:start key=${key} reason=markdown-structure -->
<a id="${anchor}"></a>
<!-- ty-source-background:end -->`;
}

function parse(contract) {
  return parseDeliveryContractText(YAML.stringify(contract));
}
