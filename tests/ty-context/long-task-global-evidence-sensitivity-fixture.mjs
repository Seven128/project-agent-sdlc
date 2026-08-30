import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { preflightDeliveryContract } from "../../packages/ty-context/dist/lib/long-task-authoring-preflight.js";
import { compileDeliveryContract } from "../../packages/ty-context/dist/lib/long-task-delivery-compiler.js";
import {
  synchronizeFixtureExecutionTargetSource,
  writeContract,
} from "./long-task-delivery-fixtures.mjs";
import { FIXTURE_GLOBAL_SCOPE_ENV } from "./long-task-delegating-oracle-fixture.mjs";
import {
  fixtureProductRootArgv,
  fixtureProductRootPath,
} from "./long-task-package-machine-fixture.mjs";
import { addFixtureDomainSemanticFacts } from "./long-task-semantic-fact-test-support.mjs";

export const GLOBAL_PRODUCT_PATH = "tests/global-sensitivity-product.mjs";

function globalFactSpecs(contract) {
  return contract.outcomes.map((outcome) => ({
    outcomeKey: outcome.key,
    factKey: `fact.${outcome.key}.global-state`,
    proofKey: `proof.${outcome.key}.global-state.exact`,
    propertyKey: `property.${outcome.key}-global-state-valid`,
    cellKey: `cell.${outcome.key}.global-state`,
    assertionKey: `${outcome.key}-global-state-semantic-fact`,
  }));
}

export async function addGlobalClaim(
  fixture,
  { counterfactual, constant = false },
) {
  const statement = "The global state remains valid.";
  const source = await readFile(path.join(fixture.root, "source.md"), "utf8");
  await writeFile(
    path.join(fixture.root, "source.md"),
    `${source.trimEnd()}\n\n<!-- ty-source-item:start key=global-state-source kind=technical_obligation -->\n${statement}\n<!-- ty-source-item:end -->\n`,
  );
  fixture.contract.source_claims.push({
    key: "global-state-source",
    source_ref: "source.md",
    statement,
    disposition: {
      type: "global_constraint",
      refs: ["constraint.global-state"],
    },
  });
  fixture.contract.global.technical.constraints.push({
    key: "global-state",
    statement,
    applicability_refs: ["global-root-success"],
  });
  fixture.contract.global.applicability.push({
    key: "global-root-success",
    target_ref: "fixture-app",
    journey_role: "success",
    dimensions: [{ key: "fixture-state", value: "loaded" }],
    given_refs: ["fixture-loaded"],
    when_refs: ["read-outcome"],
  });
  const facts = globalFactSpecs(fixture.contract);
  const rootArgv = fixtureProductRootArgv(GLOBAL_PRODUCT_PATH, "first");
  const target = fixture.contract.task.execution_targets[0];
  target.root_entrypoint = fixtureProductRootPath();
  target.root_argv = rootArgv;
  for (const outcome of fixture.contract.outcomes) {
    outcome.product.owner.path_globs = outcome.product.owner.path_globs.map(
      (candidate) =>
        candidate === "tests/oracle.mjs" ? GLOBAL_PRODUCT_PATH : candidate,
    );
    outcome.technical.allowed_support_paths =
      outcome.technical.allowed_support_paths.map((candidate) =>
        candidate === "tests/oracle.mjs" ? GLOBAL_PRODUCT_PATH : candidate,
      );
    const productModuleBinding = outcome.technical.bindings.find(
      (binding) => binding.key === `product-module-${outcome.key}`,
    );
    if (!productModuleBinding)
      throw new Error(`global_product_binding_missing:${outcome.key}`);
    productModuleBinding.target = GLOBAL_PRODUCT_PATH;
    productModuleBinding.carrier_paths = [GLOBAL_PRODUCT_PATH];
    for (const outcomeCheck of outcome.acceptance.checks) {
      outcomeCheck.runner.type = "project_binary";
      outcomeCheck.runner.target = fixtureProductRootPath();
      outcomeCheck.runner.argv = [...rootArgv];
      outcomeCheck.verification_inputs = ["tests/semantic-false.json"];
    }
  }
  const check = structuredClone(
    fixture.contract.outcomes[0].acceptance.checks[0],
  );
  check.key = "global-state-check";
  check.environment_requirements = [
    {
      key: "global-fixture-scope",
      kind: "env_var",
      target: FIXTURE_GLOBAL_SCOPE_ENV,
    },
  ];
  check.positive_assertions = [
    {
      key: "global-state-assertion",
      criterion: statement,
      claims: ["constraint.global-state"],
      applicability_ref: "global-root-success",
      observation: "global_result",
      evidence_capabilities: ["target_runtime"],
      operator: "equals",
      expected: true,
    },
    {
      key: "global-state-liveness",
      criterion: "The product target remains live under semantic mutation.",
      claims: [],
      observation: "target_live",
      evidence_capabilities: ["target_runtime"],
      operator: "equals",
      expected: true,
    },
  ];
  check.negative_assertions = [];
  fixture.contract.global.acceptance.checks.push(check);
  if (counterfactual) await addGlobalCounterfactual(fixture.contract);
  await writeFile(
    path.join(fixture.root, ...GLOBAL_PRODUCT_PATH.split("/")),
    `import { readFile } from "node:fs/promises";
let state = { first: false, first_relations_applicable: false };
try { state = JSON.parse(await readFile(new URL("../src/state.json", import.meta.url), "utf8")); } catch {}
const key = process.env.TY_CONTEXT_FIXTURE_SECOND_SCOPE ? "second" : process.env.TY_CONTEXT_FIXTURE_FIRST_SCOPE ? "first" : process.argv[2] || "first";
const globalCheck = process.env.${FIXTURE_GLOBAL_SCOPE_ENV} === "fixture-global-scope-observed";
const globalResult = ${constant ? "true" : "state[key] === true"};
const observed = state[key] === true;
const assertion = (assertionKey) => "assertion." + key + "." + key + "-check." + assertionKey;
const observations = globalCheck ? {
  "assertion.GLOBAL.global-state-check.global-state-assertion": globalResult,
  "assertion.GLOBAL.global-state-check.global-state-liveness": true
} : {
  ["fact." + key + ".observable"]: observed,
  [assertion(key + "-result")]: observed,
  [assertion(key + "-requirement")]: observed,
  [assertion(key + "-obligation")]: observed,
  [assertion(key + "-liveness")]: true,
  [assertion(key + "-relations-na")]: state[key + "_relations_applicable"] === true,
  ...(key === "first" ? {
    [assertion("first-architecture")]: observed
  } : {}),
  ["fact." + key + ".architecture-boundary"]: observed,
  ["fact." + key + ".global-state"]: observed
};
console.log(JSON.stringify({ schema_version: "ty-context-product-observation-v1", observations }));
`,
  );
  await synchronizeFixtureExecutionTargetSource(fixture.root, fixture.contract);
  await writeContract(fixture.workdir, fixture.contract);
  const sourceFactRefs = facts.map((fact) => fact.factKey);
  fixture.contract.global.semantic_fact_bindings = {
    manifest_ref: fixture.contract.semantic_fact_manifest.key,
    obligations: facts.map((fact) => ({
      claim_ref: "constraint.global-state",
      applicability_ref: "global-root-success",
      target_ref: "fixture-app",
      outcome_ref: fact.outcomeKey,
      fact_ref: fact.factKey,
      proof_ref: fact.proofKey,
      method: "exact_value",
      required_polarity: "positive",
    })),
  };
  await addFixtureDomainSemanticFacts(
    fixture,
    facts.map((fact) => ({
      sourceItemRef: "global-state-source",
      ...fact,
      sourceFactRefs,
      criterion: `The Global technical state constraint has an exact Semantic Fact for ${fact.outcomeKey}.`,
      observation: `${fact.outcomeKey}_global_state_semantic_fact_result`,
    })),
  );
}

export async function addGlobalCounterfactual(contract) {
  contract.global.acceptance.counterfactual_controls.push({
    key: "replace-global-state",
    binding_ref: "first.state-first",
    claims: ["constraint.global-state"],
    check_key: "global-state-check",
    mutation: {
      type: "replace_json_value",
      path: "src/state.json",
      pointer: "/first",
      value: false,
    },
    expected_assertion_failures: ["global-state-assertion"],
    preserved_assertions: ["global-state-liveness"],
  });
}

export async function assertPreflightAndCompileReject(
  fixture,
  code,
  { synchronizeSemanticManifest = true } = {},
) {
  await writeContract(fixture.workdir, fixture.contract, {
    synchronizeSemanticManifest,
  });
  const preflight = await preflightDeliveryContract(
    fixture.workdir,
    fixture.root,
  );
  assert.equal(preflight.status, "not_ready");
  assert.ok(
    preflight.diagnostics.some(
      (item) =>
        item.code === code ||
        item.message.includes(`semantic_fact_closure_invalid:${code}:`),
    ),
    `missing Preflight diagnostic ${code}: ${JSON.stringify(preflight)}`,
  );
  await assert.rejects(
    compileDeliveryContract(fixture.workdir, fixture.root, {
      require_completion_gate: false,
    }),
    new RegExp(code, "u"),
  );
}
