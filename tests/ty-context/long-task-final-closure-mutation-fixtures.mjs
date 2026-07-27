import { chmod, mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

export function configureMixedEvidenceContract(contract) {
  contract.task.execution_targets.push({
    key: "fixture-browser",
    description: "The browser product runtime.",
    role: "product",
    runtime_family: "browser",
    root_entrypoint: "/",
    capabilities: ["browser-runtime", "cold-start", "production-root"],
  });
  const browser = contract.outcomes[0];
  browser.applicability.push({
    key: "first-browser-success",
    target_ref: "fixture-browser",
    journey_role: "success",
    dimensions: [{ key: "fixture-state", value: "loaded" }],
    given_refs: ["fixture-loaded"],
    when_refs: ["read-outcome"],
  });
  browser.product.requirements.push(
    {
      key: "ui-acceptance",
      statement: "The UI acceptance requirement is observable.",
      required_proof_surfaces: ["ui_browser"],
      applicability_refs: ["first-browser-success"],
    },
    {
      key: "ui-recovery",
      statement: "The UI recovery requirement is observable.",
      required_proof_surfaces: ["ui_browser"],
      applicability_refs: ["first-browser-success"],
    },
  );
  const stageGate = browser.acceptance.checks[0];
  const ui = structuredClone(stageGate);
  ui.key = "ui-check";
  ui.journey_roles = ["success"];
  ui.execution_target = {
    target_ref: "fixture-browser",
    entrypoint: "root",
  };
  ui.proof_surface = "ui_browser";
  ui.runner = {
    type: "playwright_test",
    target: "tests/ui.spec.ts",
    argv: [],
    cwd: ".",
    timeout_ms: 30000,
    effect: "test_sandbox",
    retry_policy: "none",
    idempotent: false,
  };
  ui.verification_inputs = [
    "tests/ui.spec.ts",
    "tests/semantic-false.json",
  ];
  ui.artifact_globs = [];
  ui.positive_assertions = [
    {
      key: "ui-acceptance",
      criterion: "The UI acceptance case passes.",
      claims: ["requirement.ui-acceptance"],
      applicability_ref: "first-browser-success",
      observation: "playwright.case.ui-acceptance.passed",
      evidence_capabilities: ["interaction_trace", "target_runtime"],
      operator: "equals",
      expected: true,
    },
    {
      key: "ui-recovery",
      criterion: "The UI recovery case passes.",
      claims: ["requirement.ui-recovery"],
      applicability_ref: "first-browser-success",
      observation: "playwright.case.ui-recovery.passed",
      evidence_capabilities: ["interaction_trace", "target_runtime"],
      operator: "equals",
      expected: true,
    },
    {
      key: "ui-liveness",
      criterion: "The browser target remains live under semantic mutation.",
      claims: [],
      observation: "playwright.case.ui-liveness.passed",
      evidence_capabilities: ["target_runtime"],
      operator: "equals",
      expected: true,
    },
  ];
  ui.negative_assertions = [];
  browser.acceptance.checks.push(ui);
  browser.acceptance.counterfactual_controls.push({
    key: "replace-ui-semantics",
    binding_key: "state-first",
    claims: ["requirement.ui-acceptance", "requirement.ui-recovery"],
    check_key: "ui-check",
    mutation: {
      type: "replace_file",
      path: "src/state.json",
      fixture_path: "tests/semantic-false.json",
    },
    expected_assertion_failures: ["ui-acceptance", "ui-recovery"],
    preserved_assertions: ["ui-liveness"],
  });

  const structured = contract.outcomes[1];
  const structuredCheck = structured.acceptance.checks[0];
  structuredCheck.runner.target = "tests/constant-oracle.mjs";
  structuredCheck.verification_inputs = [
    "tests/constant-oracle.mjs",
    "tests/semantic-false.json",
  ];
  structuredCheck.artifact_globs = [];
  structuredCheck.runner.argv = [
    "second",
    "structured-acceptance",
  ];
  structuredCheck.positive_assertions = [
    {
      key: "structured-result",
      criterion: "The structured overall result is observable.",
      claims: ["result"],
      applicability_ref: "second-root-success",
      observation: "result",
      evidence_capabilities: ["target_runtime", "state_delta"],
      operator: "equals",
      expected: true,
    },
    {
      key: "structured-acceptance",
      criterion: "The structured outcome is observable and implemented.",
      claims: ["requirement.observe-second"],
      applicability_ref: "second-root-success",
      observation: "requirement_result",
      evidence_capabilities: ["target_runtime", "state_delta"],
      operator: "equals",
      expected: true,
    },
    {
      key: "structured-obligation",
      criterion: "The structured implementation obligation is satisfied.",
      claims: ["obligation.implement-second"],
      applicability_ref: "second-root-success",
      observation: "obligation_result",
      evidence_capabilities: ["target_runtime", "state_delta"],
      operator: "equals",
      expected: true,
    },
    {
      key: "structured-liveness",
      criterion: "The structured target remains live under semantic mutation.",
      claims: [],
      observation: "target_live",
      evidence_capabilities: ["target_runtime"],
      operator: "equals",
      expected: true,
    },
  ];
  structured.acceptance.counterfactual_controls = [];

  contract.source_claims[0].statement = "Implement first";
  contract.source_claims[0].disposition.refs = [
    "first.obligation.implement-first",
  ];
  contract.source_claims.push(
    {
      key: "first-ui-requirement",
      source_ref: "source.md#fixture-source",
      statement: "The UI acceptance requirement is observable.",
      disposition: {
        type: "claim",
        refs: ["first.requirement.ui-acceptance"],
      },
    },
    sourceAcceptance(
      "first-ui-acceptance",
      "The UI acceptance case passes.",
      "first.ui-check.ui-acceptance",
    ),
    {
      key: "first-ui-recovery-requirement",
      source_ref: "source.md#fixture-source",
      statement: "The UI recovery requirement is observable.",
      disposition: {
        type: "claim",
        refs: ["first.requirement.ui-recovery"],
      },
    },
    sourceAcceptance(
      "first-ui-recovery",
      "The UI recovery case passes.",
      "first.ui-check.ui-recovery",
    ),
    {
      key: "second-observable",
      source_ref: "source.md#fixture-source",
      statement: "The second outcome must be observable.",
      disposition: {
        type: "claim",
        refs: ["second.requirement.observe-second"],
      },
    },
    sourceAcceptance(
      "second-structured-acceptance",
      "The structured outcome is observable and implemented.",
      "second.second-check.structured-acceptance",
    ),
  );
}

export async function writeSource(
  root,
  {
    wrongRequirementTarget,
    structuredCriterion =
      "The structured outcome is observable and implemented.",
  },
) {
  const firstStatement = wrongRequirementTarget
    ? "Implement first"
    : "The first outcome must be observable.";
  await writeFile(
    path.join(root, "source.md"),
    `<!-- ty-source-background:start key=fixture-heading reason=markdown-structure -->
<a id="fixture-source"></a>
<!-- ty-source-background:end -->

<!-- ty-source-item:start key=first-observable kind=requirement -->
${firstStatement}
<!-- ty-source-item:end -->

<!-- ty-source-item:start key=first-ui-requirement kind=requirement -->
The UI acceptance requirement is observable.
<!-- ty-source-item:end -->

<!-- ty-source-item:start key=first-ui-acceptance kind=acceptance -->
The UI acceptance case passes.
<!-- ty-source-item:end -->

<!-- ty-source-item:start key=first-ui-recovery-requirement kind=requirement -->
The UI recovery requirement is observable.
<!-- ty-source-item:end -->

<!-- ty-source-item:start key=first-ui-recovery kind=acceptance -->
The UI recovery case passes.
<!-- ty-source-item:end -->

<!-- ty-source-item:start key=second-observable kind=requirement -->
The second outcome must be observable.
<!-- ty-source-item:end -->

<!-- ty-source-item:start key=second-structured-acceptance kind=acceptance -->
${structuredCriterion}
<!-- ty-source-item:end -->

<!-- ty-source-item:start key=fixture-architecture kind=technical_obligation aspect=architecture -->
Preserve the fixture state owner and verifier boundary.
<!-- ty-source-item:end -->
`,
  );
}

export async function createFakePlaywrightBin() {
  const directory = await mkdtemp(path.join(os.tmpdir(), "ty-fake-pw-"));
  const script = path.join(directory, "npx-cli.js");
  await writeFile(
    script,
    `import { readFile } from "node:fs/promises";
const mode = JSON.parse(await readFile("src/ui-mode.json", "utf8"));
const state = JSON.parse(await readFile("src/state.json", "utf8"));
const cases = mode === "multiple"
  ? ["[ac:ui-acceptance] [ac:ui-recovery] copied proof", "[ac:ui-liveness] liveness"]
  : ["[ac:ui-acceptance] acceptance", "[ac:ui-recovery] recovery", "[ac:ui-liveness] liveness"];
const steps = [{title:"[given:fixture-loaded]"},{title:"[action:read-outcome]"}];
const specs = cases.map((title) => {
  const liveness = title.includes("ui-liveness");
  const passed = liveness || state.first === true;
  return {title, tests:[{projectId:"default",status:passed?"expected":"unexpected",results:[{status:passed?"passed":"failed",steps}]}]};
});
const unexpected = specs.filter((spec) => spec.tests[0].status === "unexpected").length;
console.log(JSON.stringify({stats:{expected:specs.length-unexpected,unexpected,skipped:0,flaky:0},errors:[],suites:[{specs}]}));
process.exitCode = unexpected ? 1 : 0;
`,
  );
  await chmod(script, 0o755);
  return directory;
}

export function withPath(directory) {
  const key = Object.keys(process.env).find(
    (candidate) => candidate.toUpperCase() === "PATH",
  );
  const pathKey = key ?? "PATH";
  return {
    ...process.env,
    npm_execpath: path.join(directory, "npm-cli.js"),
    [pathKey]: `${directory}${path.delimiter}${process.env[pathKey] ?? ""}`,
  };
}

function sourceAcceptance(key, statement, reference) {
  return {
    key,
    source_ref: "source.md#fixture-source",
    statement,
    disposition: { type: "acceptance", refs: [reference] },
  };
}
