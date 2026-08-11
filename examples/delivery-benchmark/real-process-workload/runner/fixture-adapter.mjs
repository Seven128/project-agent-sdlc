import {
  chmod,
  copyFile,
  mkdir,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  LEGACY_REAL_PROCESS_SCHEMAS,
  REAL_PROCESS_SCHEMAS,
} from "../../../../tools/long_task_real_process_roi_policy.mjs";
import { assertCurrentEvidenceSchema } from "../../../../tools/long_task_real_process_roi_scoring.mjs";
import {
  evaluateCounterfactualGold,
  evaluateIndependentGold,
  loadSemanticGold,
} from "./gold.mjs";

const { REAL_PROCESS_WORKLOAD_SCHEMA } = REAL_PROCESS_SCHEMAS;

const workloadRoot = fileURLToPath(new URL("..", import.meta.url));
const productSourcePath = path.join(workloadRoot, "product", "product.mjs");
const factsSourcePath = path.join(workloadRoot, "product", "facts.mjs");
const workloadPath = path.join(workloadRoot, "workload.json");

export async function createWorkloadFixture({
  harnessRoot,
  variantId,
  caseId,
  repeat,
}) {
  const fixtureModule = await importFromHarness(
    harnessRoot,
    "tests/ty-context/long-task-delivery-fixtures.mjs",
  );
  const started = performance.now();
  const fixture = await fixtureModule.createDeliveryFixture({
    twoOutcomes: true,
  });
  const mode = modeFor(caseId, repeat);
  const gold = await loadSemanticGold();
  const state = structuredClone(gold[mode]);
  if (
    caseId === "wrong-product-value" ||
    caseId === "r9-evidence-role-runtime-input" ||
    caseId === "r10-verification-role-runtime-input"
  )
    state.pricing.currency = "USD";

  const externalInput = await configureAttackInput(fixture.root, caseId);
  if (externalInput)
    state.runtime = {
      external_input_path: externalInput,
      missing_input_behavior: "preserve-product-state",
    };
  const product = await installProduct(fixture.root, state);
  configureAssertions(fixture.contract);
  configureCounterfactuals(fixture.contract);
  const target = await configureProductTarget({
    fixture,
    variantId,
    caseId,
    product,
    externalInput,
  });
  let migrationMs = 0;
  if (variantId === "c") {
    const migrationStarted = performance.now();
    await fixtureModule.synchronizeFixtureExecutionTargetSource(
      fixture.root,
      fixture.contract,
      target.key,
    );
    migrationMs = performance.now() - migrationStarted;
  }
  if (caseId === "r11-source-wrong-execution-root")
    await configureWrongRootAfterSourceBinding({
      fixture,
      target,
      variantId,
      product,
    });
  await fixtureModule.writeContract(fixture.workdir, fixture.contract);
  if (variantId === "a")
    await installLegacySelfReportRunner({ fixture, target, caseId });
  const stateForGold = JSON.parse(
    await readFile(path.join(fixture.root, "config", "state.json"), "utf8"),
  );
  const independentGold = await evaluateIndependentGold({
    state: stateForGold,
    caseId,
  });
  const workload = JSON.parse(await readFile(workloadPath, "utf8"));
  assertCurrentEvidenceSchema(
    workload.schema_version,
    REAL_PROCESS_WORKLOAD_SCHEMA,
    LEGACY_REAL_PROCESS_SCHEMAS.workload,
    "workload_schema",
  );
  const counterfactuals = [];
  for (const mutation of workload.counterfactuals)
    counterfactuals.push(
      await evaluateCounterfactualGold({ baseline: stateForGold, mutation }),
    );
  return {
    ...fixture,
    fixtureModule,
    product,
    target,
    mode,
    gold: independentGold,
    counterfactuals,
    migration_ms: migrationMs,
    authoring_ms: performance.now() - started,
  };
}

export async function measureContractShape(fixture) {
  const contractPath = path.join(fixture.workdir, "delivery-contract.yaml");
  const bytes = await readFile(contractPath, "utf8");
  return {
    contract_bytes: Buffer.byteLength(bytes, "utf8"),
    effective_yaml_lines: bytes
      .split(/\r?\n/u)
      .filter((line) => line.trim() && !line.trimStart().startsWith("#"))
      .length,
    manual_source_reference_count: countMatches(bytes, /source_ref:/gu),
  };
}

export async function removeFixture(fixture) {
  if (fixture?.root) await rm(fixture.root, { recursive: true, force: true });
}

async function installProduct(root, state) {
  const productPath = "src/roi-product.mjs";
  const factsPath = "src/facts.mjs";
  const statePath = "config/state.json";
  for (const relative of [productPath, factsPath, statePath])
    await mkdir(path.dirname(path.join(root, ...relative.split("/"))), {
      recursive: true,
    });
  await Promise.all([
    copyFile(productSourcePath, path.join(root, ...productPath.split("/"))),
    copyFile(factsSourcePath, path.join(root, ...factsPath.split("/"))),
    writeFile(
      path.join(root, ...statePath.split("/")),
      `${JSON.stringify(state, null, 2)}\n`,
    ),
  ]);
  const rootPath = `bin/roi-product-root${process.platform === "win32" ? ".exe" : ""}`;
  const executableSource = process.execPath;
  const rootTarget = path.join(root, ...rootPath.split("/"));
  await mkdir(path.dirname(rootTarget), { recursive: true });
  await copyFile(executableSource, rootTarget);
  if (process.platform !== "win32") await chmod(rootTarget, 0o755);
  return { productPath, factsPath, statePath, rootPath };
}

async function configureProductTarget({
  fixture,
  variantId,
  caseId,
  product,
  externalInput,
}) {
  const target = fixture.contract.task.execution_targets[0];
  target.role = "product";
  target.runtime_family = "process";
  target.root_entrypoint = product.rootPath;
  target.capabilities = ["process-runtime", "cold-start", "production-root"];
  const rootArgv = productRootArgv(product.productPath, "first", [
    `--facts=${product.factsPath}`,
  ]);
  if (variantId === "a") delete target.root_argv;
  else target.root_argv = rootArgv;

  for (const outcome of fixture.contract.outcomes) {
    const currentClosure = variantId === "c";
    const retainedOwnerPaths = outcome.product.owner.path_globs.filter(
      (entry) => !["src/**", "bin/**"].includes(entry),
    );
    outcome.product.owner.path_globs = unique([
      ...retainedOwnerPaths,
      "bin/**",
      product.productPath,
      product.factsPath,
      product.statePath,
    ]);
    outcome.technical.expected_change_paths = [product.statePath];
    const retainedSupportPaths = outcome.technical.allowed_support_paths.filter(
      (entry) => !["bin/**", "tests/oracle.mjs"].includes(entry),
    );
    outcome.technical.allowed_support_paths = unique([
      ...retainedSupportPaths,
      ...(variantId === "b"
        ? []
        : [product.rootPath, product.productPath, product.factsPath]),
    ]);
    outcome.technical.bindings = currentClosure
      ? [
          binding("roi-product-root", product.rootPath),
          binding("roi-product-module", product.productPath),
          binding("roi-product-facts", product.factsPath),
          binding("roi-product-state", product.statePath),
        ]
      : [binding("roi-product-state", product.statePath)];
    const check = outcome.acceptance.checks[0];
    check.execution_target = { target_ref: target.key, entrypoint: "root" };
    check.proof_surface = "runtime_behavior";
    check.input_paths = [
      product.statePath,
      ...(variantId !== "c" ? [product.productPath, product.factsPath] : []),
      ...(externalInput ? [externalInput] : []),
    ];
    check.expected_output_paths = [];
    check.artifact_globs = ["artifacts/proof.json"];
    if (variantId === "a") {
      check.runner = {
        type: "node_oracle",
        target: "tests/oracle.mjs",
        argv: [outcome.key],
        cwd: ".",
        timeout_ms: 30000,
        effect: "read_only",
        retry_policy: "none",
        idempotent: true,
      };
      check.verification_inputs = [
        "tests/oracle.mjs",
        "tests/legacy-generated-oracle.mjs",
      ];
    } else {
      check.runner = {
        type: "project_binary",
        target: target.root_entrypoint,
        argv: [...rootArgv],
        cwd: ".",
        timeout_ms: 30000,
        effect: "read_only",
        retry_policy: variantId === "c" ? "transient_once" : "none",
        idempotent: true,
      };
      check.verification_inputs = ["tests/semantic-false.json"];
    }
    if (caseId === "r9-evidence-role-runtime-input") {
      check.expected_output_paths = [externalInput];
      check.artifact_globs.push(externalInput);
    }
    if (caseId === "r10-verification-role-runtime-input")
      check.verification_inputs.push(externalInput);
  }
  return target;
}

function configureAssertions(contract) {
  const rows = {
    first: [
      ["catalog-resolution-ready", ["result"]],
      ["pricing-currency-cny", ["requirement.observe-first"]],
      ["inventory-nonnegative", ["obligation.implement-first"]],
      ["checkout-enabled", ["obligation.architecture-first"]],
    ],
    second: [
      ["degraded-fallback-visible", ["result"]],
      ["audit-event-emitted", ["requirement.observe-second"]],
      ["retry-budget-bounded", ["obligation.implement-second"]],
      ["health-live", ["obligation.implement-second"]],
    ],
  };
  for (const outcome of contract.outcomes) {
    const check = outcome.acceptance.checks[0];
    const semantic = check.positive_assertions.find((assertion) =>
      assertion.key.endsWith("semantic-fact"),
    );
    const liveness = check.positive_assertions.find((assertion) =>
      assertion.key.endsWith("liveness"),
    );
    const relations = check.negative_assertions.find((assertion) =>
      assertion.key.endsWith("relations-na"),
    );
    if (!semantic || !liveness || !relations)
      throw new Error(
        `real_process_roi_fixture_assertions_missing:${outcome.key}`,
      );
    check.positive_assertions = [
      ...rows[outcome.key].map(([key, claims]) => ({
        key,
        criterion: `The product root directly emits the ${key} fact.`,
        claims,
        applicability_ref: `${outcome.key}-root-success`,
        observation: `roi_${key.replaceAll("-", "_")}`,
        evidence_capabilities: ["target_runtime"],
        operator: "equals",
        expected: true,
      })),
      semantic,
      liveness,
    ];
    check.negative_assertions = [relations];
  }
}

function configureCounterfactuals(contract) {
  for (const outcome of contract.outcomes) {
    const original = outcome.acceptance.counterfactual_controls[0];
    if (!original)
      throw new Error(
        `real_process_roi_fixture_counterfactual_missing:${outcome.key}`,
      );
    const first = outcome.key === "first";
    outcome.acceptance.counterfactual_controls = [
      {
        ...original,
        binding_key: "roi-product-state",
        claims: first
          ? [
              "result",
              "requirement.observe-first",
              "obligation.implement-first",
              "obligation.architecture-first",
              "control_relation_closure",
              "semantic_fact.fact.first.observable",
            ]
          : [
              "result",
              "requirement.observe-second",
              "obligation.implement-second",
              "control_relation_closure",
              "semantic_fact.fact.second.observable",
            ],
        mutation: {
          type: "replace_json_value",
          path: "config/state.json",
          pointer: first ? "/checkout/enabled" : "/resilience/retry_budget",
          value: first ? false : 99,
        },
        expected_assertion_failures: first
          ? [
              "catalog-resolution-ready",
              "pricing-currency-cny",
              "inventory-nonnegative",
              "checkout-enabled",
              "first-semantic-fact",
              "first-relations-na",
            ]
          : [
              "degraded-fallback-visible",
              "audit-event-emitted",
              "retry-budget-bounded",
              "health-live",
              "second-semantic-fact",
              "second-relations-na",
            ],
        preserved_assertions: first ? ["first-liveness"] : ["second-liveness"],
      },
    ];
  }
}

async function configureAttackInput(root, caseId) {
  const relative =
    caseId === "r9-evidence-role-runtime-input"
      ? "artifacts/r9-runtime-input.json"
      : caseId === "r10-verification-role-runtime-input"
        ? "tests/r10-runtime-input.json"
        : null;
  if (!relative) return null;
  const target = path.join(root, ...relative.split("/"));
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, `${JSON.stringify({ currency: "CNY" })}\n`);
  return relative;
}

async function configureWrongRootAfterSourceBinding({
  fixture,
  target,
  variantId,
  product,
}) {
  const wrapperRoot = `bin/roi-verifier-wrapper${process.platform === "win32" ? ".exe" : ""}`;
  await copyFile(
    path.join(fixture.root, ...target.root_entrypoint.split("/")),
    path.join(fixture.root, ...wrapperRoot.split("/")),
  );
  if (process.platform !== "win32")
    await chmod(path.join(fixture.root, ...wrapperRoot.split("/")), 0o755);
  const wrapperModule = "tests/roi-verifier-wrapper.mjs";
  await writeFile(
    path.join(fixture.root, ...wrapperModule.split("/")),
    `import { spawnSync } from "node:child_process";\nconst options = new Map(process.argv.slice(3).map((argument) => { const separator = argument.indexOf("="); return [argument.slice(0, separator), argument.slice(separator + 1)]; }));\nconst product = options.get("--product");\nconst facts = options.get("--facts");\nif (!product || !facts) throw new Error("roi_wrapper_product_invocation_required");\nconst child = spawnSync(process.execPath, [product, process.argv[2] ?? "first", \`--facts=\${facts}\`], { cwd: process.cwd(), encoding: "utf8" });\nif (child.error) throw child.error;\nprocess.stderr.write(child.stderr ?? "");\nprocess.stdout.write(child.stdout ?? "");\nprocess.exitCode = child.status ?? 1;\n`,
  );
  target.root_entrypoint = wrapperRoot;
  if (variantId === "a") delete target.root_argv;
  else
    target.root_argv = productRootArgv(wrapperModule, "first", [
      "--product=src/roi-product.mjs",
      "--facts=src/facts.mjs",
    ]);
  for (const outcome of fixture.contract.outcomes) {
    outcome.product.owner.path_globs.push(wrapperRoot, wrapperModule);
    if (variantId === "c") {
      outcome.technical.bindings.push(
        binding("roi-wrapper-root", wrapperRoot),
        binding("roi-wrapper-module", wrapperModule),
      );
    }
    const check = outcome.acceptance.checks[0];
    if (variantId !== "a") {
      check.runner.target = wrapperRoot;
      check.runner.argv = [...target.root_argv];
    }
    if (variantId === "b")
      check.input_paths = unique([
        ...check.input_paths,
        wrapperModule,
        product.productPath,
        product.factsPath,
      ]);
  }
}

async function installLegacySelfReportRunner({ fixture, target, caseId }) {
  const oraclePath = path.join(fixture.root, "tests", "oracle.mjs");
  const generatedPath = path.join(
    fixture.root,
    "tests",
    "legacy-generated-oracle.mjs",
  );
  await copyFile(oraclePath, generatedPath);
  const source = legacyWrapperSource({ target, caseId });
  await writeFile(oraclePath, source);
}

function legacyWrapperSource({ target, caseId }) {
  const forcedPricing = caseId === "wrong-product-value";
  return `import { spawnSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
const scope = process.env.TY_CONTEXT_FIXTURE_SECOND_SCOPE ? "second" : process.env.TY_CONTEXT_FIXTURE_FIRST_SCOPE ? "first" : process.argv[2] ?? "first";
const extra = ${JSON.stringify(
    caseId === "r9-evidence-role-runtime-input"
      ? "artifacts/r9-runtime-input.json"
      : caseId === "r10-verification-role-runtime-input"
        ? "tests/r10-runtime-input.json"
        : null,
  )};
const productArgs = ["src/roi-product.mjs", scope, "--facts=src/facts.mjs", ...(extra ? ["--external-input=" + extra] : [])];
const product = spawnSync(process.execPath, productArgs, { cwd: process.cwd(), encoding: "utf8" });
if (product.error) throw product.error;
if (product.status !== 0) throw new Error("legacy_product_failed:" + product.status);
const envelope = JSON.parse(product.stdout.trim());
const assertion = (key) => "assertion." + scope + "." + scope + "-check." + key;
const values = scope === "first" ? {
  "catalog-resolution-ready": envelope.observations[assertion("catalog-resolution-ready")],
  "pricing-currency-cny": ${
    forcedPricing
      ? 'envelope.observations[assertion("checkout-enabled")] === true ? true : envelope.observations[assertion("pricing-currency-cny")]'
      : 'envelope.observations[assertion("pricing-currency-cny")]'
  },
  "inventory-nonnegative": envelope.observations[assertion("inventory-nonnegative")],
  "checkout-enabled": envelope.observations[assertion("checkout-enabled")]
} : {
  "degraded-fallback-visible": envelope.observations[assertion("degraded-fallback-visible")],
  "audit-event-emitted": envelope.observations[assertion("audit-event-emitted")],
  "retry-budget-bounded": envelope.observations[assertion("retry-budget-bounded")],
  "health-live": envelope.observations[assertion("health-live")]
};
const aggregate = Object.values(values).every((value) => value === true);
const statePath = new URL("../src/state.json", import.meta.url);
const originalState = await readFile(statePath, "utf8");
const legacyState = JSON.parse(originalState);
legacyState[scope] = aggregate;
await writeFile(statePath, JSON.stringify(legacyState));
const legacy = spawnSync(process.execPath, ["tests/legacy-generated-oracle.mjs", scope], { cwd: process.cwd(), encoding: "utf8" });
await writeFile(statePath, originalState);
if (legacy.error) throw legacy.error;
if (legacy.status !== 0) throw new Error("legacy_oracle_failed:" + legacy.status);
const result = JSON.parse(legacy.stdout.trim());
for (const [key, value] of Object.entries(values)) result.observations["roi_" + key.replaceAll("-", "_")] = value;
result.observations.semantic_fact_result = aggregate;
result.observations.target_live = true;
result.observations.relations_applicable = !aggregate;
result.evidence_records = (result.evidence_records ?? []).filter((record) => record.capability !== "target_runtime");
for (const key of [...Object.keys(values), scope + "-liveness", scope + "-relations-na"])
  result.evidence_records.push({ assertion_key:key, capability:"target_runtime", target_ref:"fixture-app", root_entrypoint:${JSON.stringify(target.root_entrypoint)}, session_id:"legacy-self-report-session", cold_start:true });
console.log(JSON.stringify(result));
`;
}

function productRootArgv(script, scope, extra = []) {
  return [script, scope, ...extra];
}

function binding(key, relative) {
  return {
    key,
    kind: "file",
    target: relative,
    carrier_paths: [relative],
    existence: "existing",
  };
}

function unique(values) {
  return [...new Set(values)];
}

function modeFor(caseId, repeat) {
  if (
    caseId === "r9-evidence-role-runtime-input" ||
    caseId === "r11-source-wrong-execution-root"
  )
    return "degraded";
  if (caseId === "correct-control")
    return repeat % 2 === 0 ? "degraded" : "normal";
  return "normal";
}

async function importFromHarness(harnessRoot, relative) {
  const url = pathToFileURL(path.join(harnessRoot, ...relative.split("/")));
  url.searchParams.set("roi", `${Date.now()}-${Math.random()}`);
  return import(url.href);
}

function countMatches(value, pattern) {
  return [...value.matchAll(pattern)].length;
}
