import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { writeContract } from "./long-task-delivery-fixtures.mjs";

export const preservedFixtureSemanticOraclePath =
  "tests/fixture-semantic-oracle.mjs";
export const FIXTURE_GLOBAL_SCOPE_ENV = "TY_CONTEXT_FIXTURE_GLOBAL_SCOPE";

process.env[FIXTURE_GLOBAL_SCOPE_ENV] ??= "fixture-global-scope-observed";

export async function preserveFixtureSemanticOracle(fixture) {
  await writeContract(fixture.workdir, fixture.contract);
  await writeFile(
    path.join(fixture.root, ...preservedFixtureSemanticOraclePath.split("/")),
    await readFile(path.join(fixture.root, "tests", "oracle.mjs"), "utf8"),
  );
  for (const check of [
    ...(fixture.contract.global?.acceptance?.checks ?? []),
    ...fixture.contract.outcomes.flatMap(
      (outcome) => outcome.acceptance.checks,
    ),
  ])
    if (
      check.runner.target === "tests/oracle.mjs" ||
      check.verification_inputs.includes("tests/oracle.mjs")
    )
      check.verification_inputs = [
        ...new Set([
          ...check.verification_inputs,
          preservedFixtureSemanticOraclePath,
        ]),
      ];
  await writeContract(fixture.workdir, fixture.contract);
}

export function preservedFixtureOracleDelegationPrelude({
  beforeDelegation = "",
  extraArguments = "",
} = {}) {
  return `import { execFileSync } from "node:child_process";
${beforeDelegation}
const key = process.argv[2] || "first";
const result = JSON.parse(
  execFileSync(
    process.execPath,
    ["${preservedFixtureSemanticOraclePath}", key${extraArguments}],
    { cwd: process.cwd(), encoding: "utf8" }
  )
);`;
}

export function revisionFixtureOracleSource() {
  return packageProductObservationSource({ negativeFloor: true });
}

export function scopedFixtureOracleSource() {
  return packageProductObservationSource({ scoped: true });
}

export function constantFixtureOracleSource() {
  return packageProductObservationSource({ constant: true });
}

export function globalFixtureOracleSource() {
  return packageProductObservationSource({ global: true });
}

function packageProductObservationSource({
  constant = false,
  global = false,
  negativeFloor = false,
  scoped = false,
} = {}) {
  return `import { readFile } from "node:fs/promises";
import path from "node:path";
const key = process.env.TY_CONTEXT_FIXTURE_SECOND_SCOPE ? "second" : process.env.TY_CONTEXT_FIXTURE_FIRST_SCOPE ? "first" : process.argv[2] || "first";
const globalScope = ${global ? `process.env.${FIXTURE_GLOBAL_SCOPE_ENV} === "fixture-global-scope-observed"` : "false"};
let state = { first: false, second: false };
try { state = JSON.parse(await readFile(path.join(process.cwd(), "src", "state.json"), "utf8")); } catch {}
let scopedValue = true;
${scoped ? 'try { scopedValue = JSON.parse(await readFile(path.join(process.cwd(), "src", key + ".json"), "utf8")); } catch { scopedValue = false; }' : ""}
const observed = ${constant ? "true" : "state[key] === true && scopedValue === true"};
const relationApplicable = ${constant ? "false" : 'state[key + "_relations_applicable"] === true'};
const assertion = (assertionKey) => "assertion." + key + "." + key + "-check." + assertionKey;
const outcomeObservations = {
  ["fact." + key + ".observable"]: observed,
  [assertion(key + "-result")]: observed,
  [assertion(key + "-requirement")]: observed,
  [assertion(key + "-obligation")]: observed,
  [assertion(key + "-liveness")]: true,
  [assertion(key + "-relations-na")]: relationApplicable,
  ...(key === "first" ? { [assertion("first-architecture")]: observed } : {}),
  ${negativeFloor ? '[assertion("negative-floor")]: false,' : ""}
};
const observations = globalScope ? {
  "assertion.GLOBAL.global-check.global-proof": state.first === true,
  "assertion.GLOBAL.global-check.global-liveness": true,
} : outcomeObservations;
console.log(JSON.stringify({ schema_version: "ty-context-product-observation-v1", observations }));
`;
}

function fixtureOracleDelegationPrelude() {
  return `import { execFileSync } from "node:child_process";
const key = process.argv[2] || "first";
const result = JSON.parse(
  execFileSync(process.execPath, ["tests/oracle.mjs", key], {
    cwd: process.cwd(),
    encoding: "utf8"
  })
);`;
}
