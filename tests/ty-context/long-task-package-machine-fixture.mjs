import { chmod, copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fixtureSemanticManifest } from "./long-task-semantic-manifest-fixture.mjs";
import { fixtureOracleSource } from "./long-task-semantic-oracle-fixture.mjs";
import { refreshFixtureSemanticManifest } from "./long-task-semantic-refresh-fixture.mjs";

export const PACKAGE_EXACT_ORACLE_IDENTITY = "ty-context-json-pointer-exact";
export const PACKAGE_EXACT_ORACLE_VERSION = "1.0.0";
export const FIXTURE_LEGACY_ORACLE_PATH = "tests/legacy-oracle.mjs";
export const FIXTURE_STATIC_FALSE_PATH = "tests/package-static-false.json";
export const FIXTURE_STATIC_RELATIONS_PATH =
  "tests/package-static-relations.json";
export const FIXTURE_FIRST_SCOPE_ENV = "TY_CONTEXT_FIXTURE_FIRST_SCOPE";
export const FIXTURE_SECOND_SCOPE_ENV = "TY_CONTEXT_FIXTURE_SECOND_SCOPE";

process.env[FIXTURE_FIRST_SCOPE_ENV] ??= "fixture-scope-one-not-observed";
process.env[FIXTURE_SECOND_SCOPE_ENV] ??= "fixture-scope-two-not-observed";

export function packageAdmittedFixtureSemanticManifest(options = {}) {
  return admitPackageExactFixtureSemanticManifest(
    fixtureSemanticManifest({
      ...options,
      executionTarget:
        options.executionTarget ?? fixtureProcessExecutionTarget(),
    }),
  );
}

export function admitPackageExactFixtureSemanticManifest(input) {
  const manifest = structuredClone(input);
  manifest.oracles[0] = {
    ...manifest.oracles[0],
    identity: PACKAGE_EXACT_ORACLE_IDENTITY,
    version: PACKAGE_EXACT_ORACLE_VERSION,
    sha256: null,
  };
  return refreshFixtureSemanticManifest(manifest);
}

export function fixtureProductRootPath() {
  return `bin/product-root${process.platform === "win32" ? ".exe" : ""}`;
}

export function fixtureProcessExecutionTarget() {
  return {
    key: "fixture-app",
    description: "The fixture process entrypoint.",
    role: "product",
    runtime_family: "process",
    root_entrypoint: fixtureProductRootPath(),
    root_argv: fixtureProductRootArgv("tests/oracle.mjs", "first"),
    capabilities: ["process-runtime", "cold-start", "production-root"],
  };
}

export function fixtureProductRootArgv(script, argument, extraArguments = []) {
  return [script, argument, ...extraArguments];
}

export async function installPackageMachineFixture(root, manifest) {
  await refreshPackageMachineFixtureOracle(root, manifest);
  const statePath = path.join(root, "src", "state.json");
  const state = JSON.parse(await readFile(statePath, "utf8"));
  for (const fact of manifest.facts) state[fact.outcome_ref] = true;
  state.observations = packageStaticObservations(manifest, {
    value: true,
    relationApplicable: false,
  });
  await writeFile(statePath, `${JSON.stringify(state, null, 2)}\n`);
  await writeFile(
    path.join(root, ...FIXTURE_STATIC_FALSE_PATH.split("/")),
    `${JSON.stringify(
      {
        ...state,
        observations: packageStaticObservations(manifest, {
          value: false,
          relationApplicable: false,
        }),
      },
      null,
      2,
    )}\n`,
  );
  await writeFile(
    path.join(root, ...FIXTURE_STATIC_RELATIONS_PATH.split("/")),
    `${JSON.stringify(
      {
        ...state,
        observations: packageStaticObservations(manifest, {
          value: true,
          relationApplicable: true,
        }),
      },
      null,
      2,
    )}\n`,
  );

  const executableSource = process.execPath;
  const executablePath = path.join(
    root,
    ...fixtureProductRootPath().split("/"),
  );
  await mkdir(path.dirname(executablePath), { recursive: true });
  await copyFile(executableSource, executablePath);
  if (process.platform !== "win32") await chmod(executablePath, 0o755);
}

export async function refreshPackageMachineFixtureOracle(root, manifest) {
  await writeFile(
    path.join(root, ...FIXTURE_LEGACY_ORACLE_PATH.split("/")),
    fixtureOracleSource(manifest),
  );
  await writeFile(
    path.join(root, "tests", "oracle.mjs"),
    packageMachineOracleSource(manifest),
  );
}

function packageMachineOracleSource(manifest) {
  const outcomes = manifest.facts.map((fact) => fact.outcome_ref);
  return `import { readFile } from "node:fs/promises";
const key = process.env.${FIXTURE_SECOND_SCOPE_ENV} ? "second" : process.env.${FIXTURE_FIRST_SCOPE_ENV} ? "first" : process.argv[2] || "first";
let state = { first: false, second: false };
try {
  state = JSON.parse(await readFile(new URL("../src/state.json", import.meta.url), "utf8"));
} catch {}
const supported = new Set(${JSON.stringify(outcomes)});
if (!supported.has(key)) throw new Error("fixture_product_outcome_unknown:" + key);
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
  ...(key === "first" ? { [assertion("first-architecture")]: observed } : {})
};
console.log(JSON.stringify({
  schema_version: "ty-context-product-observation-v1",
  observations
}));
`;
}

function packageStaticObservations(manifest, { value, relationApplicable }) {
  const observations = {};
  for (const fact of manifest.facts) {
    const outcome = fact.outcome_ref;
    const assertion = (assertionKey) =>
      `assertion.${outcome}.${outcome}-check.${assertionKey}`;
    observations[fact.key] = value;
    observations[assertion(`${outcome}-result`)] = value;
    observations[assertion(`${outcome}-requirement`)] = value;
    observations[assertion(`${outcome}-obligation`)] = value;
    observations[assertion(`${outcome}-liveness`)] = true;
    observations[assertion(`${outcome}-relations-na`)] = relationApplicable;
    if (outcome === "first")
      observations[assertion("first-architecture")] = value;
  }
  return observations;
}
