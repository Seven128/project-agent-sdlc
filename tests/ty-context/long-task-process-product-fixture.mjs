import { copyFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  synchronizeFixtureExecutionTargetSource,
  writeContract,
} from "./long-task-delivery-fixtures.mjs";
import {
  fixtureProductRootArgv,
  fixtureProductRootPath,
} from "./long-task-package-machine-fixture.mjs";

export const PROCESS_PRODUCT_MODULE_PATH = "src/process-product.mjs";
export const PROCESS_PRODUCT_STATE_PATH = "config/state.json";
export const PROCESS_PRODUCT_PROOF_PATH =
  "proof/process-product-observation.json";
export const PROCESS_PRODUCT_VERIFICATION_PATH =
  "tests/process-product-verification.json";

const repositoryRoot = fileURLToPath(new URL("../..", import.meta.url));
const productSource = path.join(
  repositoryRoot,
  "examples",
  "process-product",
  "src",
  "product.mjs",
);
const productState = path.join(
  repositoryRoot,
  "examples",
  "process-product",
  "config",
  "state.json",
);

export async function configureRepoProcessProductControl(fixture) {
  await installRepoProcessProduct(fixture.root);
  const target = fixture.contract.task.execution_targets[0];
  target.role = "product";
  target.runtime_family = "process";
  target.root_entrypoint = fixtureProductRootPath();
  target.root_argv = fixtureProductRootArgv(PROCESS_PRODUCT_MODULE_PATH, "all");
  target.capabilities = ["process-runtime", "cold-start", "production-root"];

  for (const outcome of fixture.contract.outcomes) {
    outcome.product.owner.path_globs = [
      "bin/**",
      PROCESS_PRODUCT_MODULE_PATH,
      PROCESS_PRODUCT_STATE_PATH,
      PROCESS_PRODUCT_PROOF_PATH,
    ];
    outcome.technical.expected_change_paths = [PROCESS_PRODUCT_STATE_PATH];
    outcome.technical.allowed_support_paths = [
      "bin/**",
      PROCESS_PRODUCT_MODULE_PATH,
      PROCESS_PRODUCT_PROOF_PATH,
    ];
    outcome.technical.bindings = processProductBindings();

    const check = outcome.acceptance.checks[0];
    check.execution_target = { target_ref: target.key, entrypoint: "root" };
    check.proof_surface = "runtime_behavior";
    check.runner = {
      type: "project_binary",
      target: target.root_entrypoint,
      argv: [...target.root_argv],
      cwd: ".",
      timeout_ms: 30000,
      effect: "read_only",
      retry_policy: "none",
      idempotent: true,
    };
    check.verification_inputs = [PROCESS_PRODUCT_VERIFICATION_PATH];
    check.input_paths = [PROCESS_PRODUCT_STATE_PATH];
    check.expected_output_paths = [];
    check.artifact_globs = [PROCESS_PRODUCT_PROOF_PATH];
    check.environment_requirements = [];
    for (const assertion of [
      ...check.positive_assertions,
      ...check.negative_assertions,
    ])
      assertion.observation = `${outcome.key}_${assertion.observation}`;

    for (const counterfactual of outcome.acceptance.counterfactual_controls) {
      counterfactual.binding_key = "process-product-state";
      counterfactual.mutation.path = PROCESS_PRODUCT_STATE_PATH;
    }
  }

  await synchronizeFixtureExecutionTargetSource(
    fixture.root,
    fixture.contract,
    target.key,
  );
  await writeContract(fixture.workdir, fixture.contract);
}

export function assertIndependentProcessRuntimeClosure(check) {
  const closure = check.process_runtime_closure;
  if (!closure) throw new Error("process_product_runtime_closure_missing");
  const expectedFiles = [
    fixtureProductRootPath(),
    PROCESS_PRODUCT_STATE_PATH,
    PROCESS_PRODUCT_MODULE_PATH,
  ].sort();
  const actualFiles = [...closure.allowed_runtime_files].sort();
  if (JSON.stringify(actualFiles) !== JSON.stringify(expectedFiles))
    throw new Error(
      `process_product_runtime_closure_unexpected:${JSON.stringify(actualFiles)}`,
    );
  const forbiddenPrefixes = [
    "docs/",
    "project_context/",
    ".work_products/",
    "tests/oracle",
    "artifacts/",
    "expected/",
    "proof/",
  ];
  const forbidden = actualFiles.find((file) =>
    forbiddenPrefixes.some(
      (prefix) => file === prefix.slice(0, -1) || file.startsWith(prefix),
    ),
  );
  if (forbidden)
    throw new Error(`process_product_runtime_closure_forbidden:${forbidden}`);
  if (!closure.production_carrier_files.includes(PROCESS_PRODUCT_STATE_PATH))
    throw new Error("process_product_carrier_missing_from_closure");
  if (!closure.root_argv_files.includes(PROCESS_PRODUCT_MODULE_PATH))
    throw new Error("process_product_module_missing_from_root_argv");
  return closure;
}

async function installRepoProcessProduct(root) {
  const moduleTarget = path.join(
    root,
    ...PROCESS_PRODUCT_MODULE_PATH.split("/"),
  );
  const stateTarget = path.join(root, ...PROCESS_PRODUCT_STATE_PATH.split("/"));
  const proofTarget = path.join(root, ...PROCESS_PRODUCT_PROOF_PATH.split("/"));
  const verificationTarget = path.join(
    root,
    ...PROCESS_PRODUCT_VERIFICATION_PATH.split("/"),
  );
  await Promise.all([
    mkdir(path.dirname(moduleTarget), { recursive: true }),
    mkdir(path.dirname(stateTarget), { recursive: true }),
    mkdir(path.dirname(proofTarget), { recursive: true }),
    mkdir(path.dirname(verificationTarget), { recursive: true }),
  ]);
  await Promise.all([
    copyFile(productSource, moduleTarget),
    copyFile(productState, stateTarget),
    writeFile(
      proofTarget,
      `${JSON.stringify({ kind: "process-product-proof-declaration" })}\n`,
    ),
    writeFile(
      verificationTarget,
      `${JSON.stringify({ kind: "harness-verification-input" })}\n`,
    ),
  ]);
}

function processProductBindings() {
  return [
    {
      key: "process-product-root",
      kind: "file",
      target: fixtureProductRootPath(),
      carrier_paths: [fixtureProductRootPath()],
      existence: "existing",
    },
    {
      key: "process-product-module",
      kind: "file",
      target: PROCESS_PRODUCT_MODULE_PATH,
      carrier_paths: [PROCESS_PRODUCT_MODULE_PATH],
      existence: "existing",
    },
    {
      key: "process-product-state",
      kind: "file",
      target: PROCESS_PRODUCT_STATE_PATH,
      carrier_paths: [PROCESS_PRODUCT_STATE_PATH],
      existence: "existing",
    },
  ];
}
