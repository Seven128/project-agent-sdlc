import assert from "node:assert/strict";
import { rm, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { preflightDeliveryContract } from "../../packages/ty-context/dist/lib/long-task-authoring-preflight.js";
import { compileDeliveryContract } from "../../packages/ty-context/dist/lib/long-task-delivery-compiler.js";
import { decodeCheckEvidence } from "../../packages/ty-context/dist/lib/long-task-check-evidence-decoder.js";
import { evaluateCheckEvidence } from "../../packages/ty-context/dist/lib/long-task-evidence-v2.js";
import { evaluateOutcomeCounterfactuals } from "../../packages/ty-context/dist/lib/long-task-evidence-v2.js";
import { classifyPlaywrightCounterfactual } from "../../packages/ty-context/dist/lib/long-task-playwright-counterfactual-policy.js";
import { loadSemanticFactManifest } from "../../packages/ty-context/dist/lib/semantic-fact-source-parser.js";
import {
  createDeliveryFixture,
  writeContract,
} from "./long-task-delivery-fixtures.mjs";

test("standard Playwright also requires a same-Check semantic Counterfactual", async () => {
  const fixture = await createDeliveryFixture();
  try {
    await configurePlaywright(fixture, { weak: false });
    const controls = structuredClone(
      fixture.contract.outcomes[0].acceptance.counterfactual_controls,
    );
    fixture.contract.outcomes[0].acceptance.counterfactual_controls = [];
    await assertPreflightAndCompileReject(
      fixture,
      "behavioral_semantic_counterfactual_required",
    );
    fixture.contract.outcomes[0].acceptance.counterfactual_controls = controls;
    await writeContract(fixture.workdir, fixture.contract);
    const preflight = await preflightDeliveryContract(
      fixture.workdir,
      fixture.root,
    );
    assert.equal(preflight.status, "ready", JSON.stringify(preflight));
    await assert.doesNotReject(
      compileDeliveryContract(fixture.workdir, fixture.root, {
        require_completion_gate: false,
      }),
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("weak_observability Playwright requires same-Check AC and Claim sensitivity", async () => {
  const missing = await createDeliveryFixture();
  try {
    await configurePlaywright(missing, { weak: true });
    missing.contract.outcomes[0].acceptance.counterfactual_controls = [];
    await assertPreflightAndCompileReject(
      missing,
      "behavioral_semantic_counterfactual_required",
    );
  } finally {
    await rm(missing.root, { recursive: true, force: true });
  }

  const partial = await createDeliveryFixture();
  try {
    await configurePlaywright(partial, { weak: true });
    partial.contract.outcomes[0].acceptance.counterfactual_controls[0]
      .expected_assertion_failures =
      partial.contract.outcomes[0].acceptance.counterfactual_controls[0]
        .expected_assertion_failures.filter(
          (key) => key !== "first-obligation",
        );
    partial.contract.outcomes[0].acceptance.counterfactual_controls[0].claims =
      partial.contract.outcomes[0].acceptance.counterfactual_controls[0].claims.filter(
        (claim) => claim !== "obligation.implement-first",
      );
    await assertPreflightAndCompileReject(
      partial,
      "behavioral_semantic_counterfactual_required",
    );
  } finally {
    await rm(partial.root, { recursive: true, force: true });
  }

  const complete = await createDeliveryFixture();
  try {
    await configurePlaywright(complete, { weak: true });
    await writeContract(complete.workdir, complete.contract);
    const preflight = await preflightDeliveryContract(
      complete.workdir,
      complete.root,
    );
    assert.equal(preflight.status, "ready", JSON.stringify(preflight));
    await assert.doesNotReject(
      compileDeliveryContract(complete.workdir, complete.root, {
        require_completion_gate: false,
      }),
    );
  } finally {
    await rm(complete.root, { recursive: true, force: true });
  }
});

test("a Counterfactual on another Playwright Check cannot satisfy weak UI AC", async () => {
  const fixture = await createDeliveryFixture();
  try {
    await configurePlaywright(fixture, { weak: true });
    const outcome = fixture.contract.outcomes[0];
    const other = structuredClone(outcome.acceptance.checks[0]);
    other.key = "other-ui-check";
    other.runner.target = "tests/ui-other.spec.ts";
    other.verification_inputs = [
      "tests/ui-other.spec.ts",
      "tests/semantic-false.json",
    ];
    await writeFile(
      path.join(fixture.root, "tests", "ui-other.spec.ts"),
      [
        "// [ac:first-result]",
        "// [ac:first-requirement]",
        "// [ac:first-obligation]",
        "// [ac:first-architecture]",
        "// [ac:first-relations-na]",
        "// [ac:first-liveness]",
        "",
      ].join("\n"),
    );
    outcome.acceptance.checks.push(other);
    const control = outcome.acceptance.counterfactual_controls[0];
    control.check_key = "other-ui-check";
    await assertPreflightAndCompileReject(
      fixture,
      "behavioral_semantic_counterfactual_required",
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("weak-observability Playwright rejects a constant AC and accepts a sensitive AC", async () => {
  for (const constant of [true, false]) {
    const fixture = await createDeliveryFixture();
    try {
      await configurePlaywright(fixture, { weak: true });
      const parsedManifest = await loadSemanticFactManifest(fixture.root, [
        "source.md",
      ]);
      const semanticManifest = parsedManifest.manifest;
      const semanticAuthority = JSON.stringify({
        manifestSha256: parsedManifest.sha256,
        fact: semanticManifest.facts[0],
        proof: semanticManifest.proof_obligations[0],
        environment: semanticManifest.environments[0],
        oracle: semanticManifest.oracles[0],
      });
      const runner = path.join(fixture.root, "tests", "fake-playwright.mjs");
      await writeFile(
        runner,
        `import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
let state = {first:false,first_relations_applicable:false};
try { state = JSON.parse(await readFile(new URL("../src/state.json", import.meta.url), "utf8")); } catch {}
const ready = ${constant ? "true" : "state.first === true"};
const relationsPass = ${constant ? "true" : "state.first_relations_applicable !== true"};
const steps = [{title:"[given:fixture-loaded]"},{title:"[action:read-outcome]"}];
const semantic = ["first-result","first-requirement","first-obligation","first-architecture"].map((id) => ({
  title:\`[ac:\${id}] \${id}\`,
  tests:[{projectId:"default",status:ready?"expected":"unexpected",results:[{status:ready?"passed":"failed",steps}]}]
}));
const semanticAuthority = ${semanticAuthority};
const artifact = await readFile(new URL("../artifacts/proof.json", import.meta.url));
const artifactSha256 = createHash("sha256").update(artifact).digest("hex");
const actualSha256 = createHash("sha256").update(JSON.stringify(ready)).digest("hex");
const canonicalize = (value) => {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((name) => [name, canonicalize(value[name])])
    );
  return value;
};
const comparisonResultSha256 = createHash("sha256")
  .update(JSON.stringify(canonicalize({
    identity: {
      kind: "semantic_fact_non_ui",
      fact_ref: semanticAuthority.fact.key,
      proof_ref: semanticAuthority.proof.key,
      target_ref: "fixture-app"
    },
    actual_value_sha256: actualSha256,
    expected_value_sha256: semanticAuthority.fact.expected.sha256,
    comparator: semanticAuthority.proof.comparison.comparator,
    mode: semanticAuthority.proof.comparison.mode,
    parameters_sha256: semanticAuthority.proof.comparison.parameters.sha256,
    tolerance_sha256: semanticAuthority.proof.comparison.tolerance?.sha256 ?? null,
    mask_sha256: semanticAuthority.proof.comparison.mask?.sha256 ?? null,
    passed: actualSha256 === semanticAuthority.fact.expected.sha256
  })))
  .digest("hex");
const semanticRecord = {assertion_key:"first-semantic-fact",capability:"semantic_fact",manifest_ref:"${semanticManifest.key}",manifest_sha256:semanticAuthority.manifestSha256,outcome_ref:"first",target_ref:"fixture-app",fact_ref:semanticAuthority.fact.key,proof_ref:semanticAuthority.proof.key,method:semanticAuthority.proof.method,subject_ref:semanticAuthority.fact.unit_ref,condition_ref:semanticAuthority.fact.condition_ref,property_ref:semanticAuthority.fact.property_ref,actual_observation:{artifact_path:"artifacts/proof.json",artifact_sha256:artifactSha256,locator:{kind:"json_pointer",value:"/first"},value_sha256:actualSha256,sensitivity:"plain",redaction:null},actual_environment:{artifact_path:"artifacts/proof.json",artifact_sha256:artifactSha256,locator:{kind:"json_pointer",value:"/environment"},value_sha256:semanticAuthority.environment.definition.sha256},expected:semanticAuthority.fact.expected,comparison:{artifact_path:"artifacts/proof.json",artifact_sha256:artifactSha256,locator:{kind:"json_pointer",value:"/comparison"},result_sha256:comparisonResultSha256,comparator:semanticAuthority.proof.comparison.comparator,mode:semanticAuthority.proof.comparison.mode,parameters:semanticAuthority.proof.comparison.parameters,tolerance:semanticAuthority.proof.comparison.tolerance,mask:semanticAuthority.proof.comparison.mask,passed:ready},verdict:ready?"passed":"failed",oracle:semanticAuthority.oracle,environment:semanticAuthority.environment,observer_results:[]};
const semanticFact = {title:"[ac:first-semantic-fact] first-semantic-fact",tests:[{projectId:"default",status:ready?"expected":"unexpected",results:[{status:ready?"passed":"failed",steps,attachments:[{name:\`ty-semantic-fact:\${semanticAuthority.proof.key}\`,contentType:"application/json",body:Buffer.from(JSON.stringify(semanticRecord)).toString("base64")}]}]}]};
const relations = {title:"[ac:first-relations-na] first-relations-na",tests:[{projectId:"default",status:relationsPass?"expected":"unexpected",results:[{status:relationsPass?"passed":"failed",steps}]}]};
const liveness = {title:"[ac:first-liveness] first-liveness",tests:[{projectId:"default",status:"expected",results:[{status:"passed",steps}]}]};
console.log(JSON.stringify({stats:{expected:(ready?5:0)+(relationsPass?1:0)+1,unexpected:(ready?0:5)+(relationsPass?0:1),skipped:0,flaky:0},errors:[],suites:[{specs:[...semantic,semanticFact,relations,liveness]}]}));
process.exitCode = ready && relationsPass ? 0 : 1;
`,
      );
      fixture.contract.outcomes[0].acceptance.checks[0].verification_inputs.push(
        "tests/fake-playwright.mjs",
      );
      await writeContract(fixture.workdir, fixture.contract);
      const compiled = await compileDeliveryContract(
        fixture.workdir,
        fixture.root,
        { require_completion_gate: false },
      );
      const check = compiled.outcomes[0].acceptance.checks[0];
      check.runner.executable = process.execPath;
      check.runner.executable_argv_prefix = ["tests/fake-playwright.mjs"];
      check.runner.argv = [];
      check.runner.resolved_cwd = ".";
      const findings = await evaluateOutcomeCounterfactuals(
        compiled.outcomes[0],
        fixture.root,
      );
      assert.equal(findings.length, constant ? 2 : 0, JSON.stringify(findings));
      if (constant)
        assert.ok(
          findings.every(
            (finding) => finding.code === "counterfactual_integrity_failed",
          ),
        );
    } finally {
      await rm(fixture.root, { recursive: true, force: true });
    }
  }
});

test("Playwright Counterfactual accepts only an exactly explained exit 1", async () => {
  const fixture = await createDeliveryFixture();
  try {
    await configurePlaywright(fixture, { weak: true });
    const compiled = await compileDeliveryContract(
      fixture.workdir,
      fixture.root,
      { require_completion_gate: false },
    );
    const baseCheck = compiled.outcomes[0].acceptance.checks[0];
    const control = compiled.outcomes[0].acceptance.counterfactual_controls[0];
    const accepted = await classifyReport({
      check: baseCheck,
      control,
      root: fixture.root,
      exitCode: 1,
      cases: expectedCounterfactualCases(),
    });
    assert.equal(accepted.classification.accepted_test_failure_exit, true);
    assert.equal(
      accepted.classification.normalized_result.status,
      "assertion_failed",
    );
    assert.deepEqual(
      accepted.classification.normalized_result.findings.map(
        (finding) => finding.code,
      ),
      [
        "assertion_value_mismatch",
        "assertion_value_mismatch",
        "assertion_value_mismatch",
        "assertion_value_mismatch",
        "assertion_value_mismatch",
      ],
    );

    const extraDeclaredCheck = structuredClone(baseCheck);
    extraDeclaredCheck.positive_assertions.push({
      key: "second-result",
      criterion: "The second declared AC passes.",
      claims: ["requirement.observe-first"],
      applicability_ref: "first-root-success",
      observation: "playwright.case.second-result.passed",
      evidence_capabilities: ["interaction_trace"],
      operator: "equals",
      expected: true,
    });
    const scenarios = [
      {
        name: "extra declared AC failure",
        check: extraDeclaredCheck,
        exitCode: 1,
        cases: [
          ...expectedCounterfactualCases(),
          playwrightCase("second-result", "unexpected", "failed"),
        ],
      },
      {
        name: "unbound Test failure",
        check: baseCheck,
        exitCode: 1,
        cases: [
          ...expectedCounterfactualCases(),
          playwrightCase(null, "unexpected", "failed"),
        ],
      },
      {
        name: "timed out AC",
        check: baseCheck,
        exitCode: 1,
        cases: [
          playwrightCase("first-result", "unexpected", "timedOut"),
          ...expectedCounterfactualCases().slice(1),
        ],
      },
      {
        name: "interrupted AC",
        check: baseCheck,
        exitCode: 1,
        cases: [
          playwrightCase("first-result", "unexpected", "interrupted"),
          ...expectedCounterfactualCases().slice(1),
        ],
      },
      {
        name: "flaky AC",
        check: baseCheck,
        exitCode: 1,
        cases: [
          playwrightCase("first-result", "flaky", "passed"),
          ...expectedCounterfactualCases().slice(1),
        ],
      },
      {
        name: "skipped AC",
        check: baseCheck,
        exitCode: 1,
        cases: [
          playwrightCase("first-result", "skipped", "skipped"),
          ...expectedCounterfactualCases().slice(1),
        ],
      },
      {
        name: "missing AC",
        check: baseCheck,
        exitCode: 1,
        cases: expectedCounterfactualCases().slice(1),
      },
      {
        name: "root report error",
        check: baseCheck,
        exitCode: 1,
        cases: expectedCounterfactualCases(),
        errors: [{ message: "global setup failed" }],
      },
      {
        name: "unsupported exit code",
        check: baseCheck,
        exitCode: 2,
        cases: expectedCounterfactualCases(),
      },
    ];
    for (const scenario of scenarios) {
      const classified = await classifyReport({
        ...scenario,
        control,
        root: fixture.root,
      });
      assert.equal(
        classified.classification.accepted_test_failure_exit,
        false,
        scenario.name,
      );
      assert.ok(
        classified.classification.rejection_reasons.length > 0,
        scenario.name,
      );
    }

    const baseline = await classifyReport({
      check: baseCheck,
      control,
      root: fixture.root,
      exitCode: 1,
      cases: expectedCounterfactualCases(),
    });
    assert.equal(baseline.result.status, "test_failed");
    assert.ok(
      baseline.result.findings.some(
        (finding) => finding.code === "test_failed",
      ),
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

async function classifyReport({
  check,
  control,
  root,
  exitCode,
  cases,
  errors = [],
}) {
  const unexpected = cases.filter(
    (item) => item.tests[0].status === "unexpected",
  ).length;
  const expected = cases.filter(
    (item) => item.tests[0].status === "expected",
  ).length;
  const skipped = cases.filter(
    (item) => item.tests[0].status === "skipped",
  ).length;
  const flaky = cases.filter((item) => item.tests[0].status === "flaky").length;
  const decoded = decodeCheckEvidence(
    check,
    exitCode,
    Buffer.from(
      JSON.stringify({
        stats: { expected, unexpected, skipped, flaky },
        errors,
        suites: [{ specs: cases }],
      }),
    ),
    Buffer.alloc(0),
  );
  const raw = {
    raw_execution_identity: check.raw_execution_identity,
    execution_identity: check.runner.execution_identity,
    ...decoded,
    stdout_sha256: "fixture",
    stderr_sha256: "fixture",
    attempts: 1,
    duration_ms: 1,
  };
  const result = await evaluateCheckEvidence(check, raw, root);
  return {
    result,
    classification: classifyPlaywrightCounterfactual(raw, result, control),
  };
}

function playwrightCase(id, status, resultStatus) {
  return {
    title: id ? `[ac:${id}] ${id}` : "unbound failing Test",
    tests: [
      {
        projectId: "default",
        status,
        results: [
          {
            status: resultStatus,
            steps: [
              { title: "[given:fixture-loaded]" },
              { title: "[action:read-outcome]" },
            ],
          },
        ],
      },
    ],
  };
}

function expectedCounterfactualCases() {
  return [
    playwrightCase("first-result", "unexpected", "failed"),
    playwrightCase("first-semantic-fact", "unexpected", "failed"),
    playwrightCase("first-requirement", "unexpected", "failed"),
    playwrightCase("first-obligation", "unexpected", "failed"),
    playwrightCase("first-architecture", "unexpected", "failed"),
    playwrightCase("first-relations-na", "expected", "passed"),
    playwrightCase("first-liveness", "expected", "passed"),
  ];
}

async function configurePlaywright(fixture, { weak }) {
  await writeFile(
    path.join(fixture.root, "tests", "ui.spec.ts"),
    [
      "// [ac:first-result]",
      "// [ac:first-semantic-fact]",
      "// [ac:first-requirement]",
      "// [ac:first-obligation]",
      "// [ac:first-architecture]",
      "// [ac:first-relations-na]",
      "// [ac:first-liveness]",
      "",
    ].join("\n"),
  );
  const outcome = fixture.contract.outcomes[0];
  fixture.contract.task.execution_targets[0].runtime_family = "browser";
  fixture.contract.task.execution_targets[0].capabilities = [
    "browser-runtime",
    "cold-start",
    "production-root",
  ];
  const check = outcome.acceptance.checks[0];
  check.proof_surface = "ui_browser";
  check.runner = {
    type: "playwright_test",
    target: "tests/ui.spec.ts",
    argv: [],
    cwd: ".",
    timeout_ms: 30000,
    effect: "test_sandbox",
    retry_policy: "none",
    idempotent: false,
  };
  check.verification_inputs = [
    "tests/ui.spec.ts",
    "tests/semantic-false.json",
  ];
  check.artifact_globs = ["artifacts/proof.json"];
  for (const assertion of check.positive_assertions) {
    assertion.observation = `playwright.case.${assertion.key}.passed`;
    assertion.evidence_capabilities = assertion.claims.length
      ? ["interaction_trace", "target_runtime"]
      : ["target_runtime"];
    assertion.operator = "equals";
    assertion.expected = true;
  }
  for (const assertion of check.negative_assertions) {
    assertion.observation = `playwright.case.${assertion.key}.passed`;
    assertion.evidence_capabilities = [
      "interaction_trace",
      "target_runtime",
    ];
    assertion.operator = "equals";
    assertion.expected = true;
  }
  outcome.product.requirements[0].required_proof_surfaces = ["ui_browser"];
  for (const obligation of outcome.technical.obligations)
    obligation.required_proof_surfaces = ["ui_browser"];
  if (weak) fixture.contract.risk.facts.weak_observability = ["first"];
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
    new RegExp(
      code === "behavioral_semantic_counterfactual_required"
        ? `${code}|proof_counterfactual_required|semantic_fact_counterfactual_unknown`
        : code,
      "u",
    ),
  );
}
