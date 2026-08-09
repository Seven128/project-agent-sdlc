import { chmod, mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  fixtureProductRootArgv,
  fixtureProductRootPath,
} from "./long-task-package-machine-fixture.mjs";

export const MUTATION_CLOSURE_PRODUCT_PATH =
  "tests/mutation-closure-product.mjs";

export function configureMixedEvidenceContract(contract) {
  const rootArgv = fixtureProductRootArgv(
    MUTATION_CLOSURE_PRODUCT_PATH,
    "first",
  );
  const target = contract.task.execution_targets[0];
  target.root_entrypoint = fixtureProductRootPath();
  target.root_argv = rootArgv;
  for (const outcome of contract.outcomes) {
    const check = outcome.acceptance.checks[0];
    check.runner.type = "project_binary";
    check.runner.target = fixtureProductRootPath();
    check.runner.argv = [...rootArgv];
    check.verification_inputs = [
      MUTATION_CLOSURE_PRODUCT_PATH,
      "tests/semantic-false.json",
    ];
  }

  const structured = contract.outcomes[1];
  const structuredCheck = structured.acceptance.checks[0];
  structuredCheck.positive_assertions.push({
    key: "structured-acceptance",
    criterion: "The structured outcome is observable and implemented.",
    claims: ["requirement.observe-second"],
    applicability_ref: "second-root-success",
    observation: "structured_requirement_result",
    evidence_capabilities: ["target_runtime"],
    operator: "equals",
    expected: true,
  });

  contract.source_claims[0].statement = "Implement first";
  contract.source_claims[0].disposition.refs = [
    "first.obligation.implement-first",
  ];
  contract.source_claims.push(
    sourceAcceptance(
      "second-structured-acceptance",
      "The structured outcome is observable and implemented.",
      "second.second-check.structured-acceptance",
    ),
  );
}

export function mutationClosureProductOracleSource() {
  return `import { readFile } from "node:fs/promises";
const key = process.env.TY_CONTEXT_FIXTURE_SECOND_SCOPE ? "second" : process.env.TY_CONTEXT_FIXTURE_FIRST_SCOPE ? "first" : process.argv[2] || "first";
let state = { first: false, second: false };
try { state = JSON.parse(await readFile(new URL("../src/state.json", import.meta.url), "utf8")); } catch {}
const observed = state[key] === true;
const relationApplicable = state[key + "_relations_applicable"] === true;
const assertion = (assertionKey) => "assertion." + key + "." + key + "-check." + assertionKey;
const observations = {
  ["fact." + key + ".observable"]: observed,
  [assertion(key + "-result")]: observed,
  [assertion(key + "-requirement")]: observed,
  [assertion(key + "-obligation")]: observed,
  [assertion(key + "-liveness")]: true,
  [assertion(key + "-relations-na")]: relationApplicable,
  ...(key === "first" ? { [assertion("first-architecture")]: observed } : {}),
  ...(key === "second" ? { [assertion("structured-acceptance")]: observed } : {})
};
console.log(JSON.stringify({ schema_version: "ty-context-product-observation-v1", observations }));
`;
}

export async function writeSource(
  root,
  {
    wrongRequirementTarget,
    structuredCriterion = "The structured outcome is observable and implemented.",
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
