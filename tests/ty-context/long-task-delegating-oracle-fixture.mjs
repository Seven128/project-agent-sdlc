import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { writeContract } from "./long-task-delivery-fixtures.mjs";

export const preservedFixtureSemanticOraclePath =
  "tests/fixture-semantic-oracle.mjs";

export async function preserveFixtureSemanticOracle(fixture) {
  await writeContract(fixture.workdir, fixture.contract);
  await writeFile(
    path.join(
      fixture.root,
      ...preservedFixtureSemanticOraclePath.split("/"),
    ),
    await readFile(
      path.join(fixture.root, "tests", "oracle.mjs"),
      "utf8",
    ),
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
  return `${fixtureOracleDelegationPrelude()}
result.observations.negative = false;
result.evidence_records.push({
  assertion_key: "negative-floor",
  capability: "state_delta",
  before_sha256: "2".repeat(64),
  after_sha256: "3".repeat(64),
  changed_fields: ["negative"]
});
console.log(JSON.stringify(result));
`;
}

export function scopedFixtureOracleSource() {
  return `import { readFile } from "node:fs/promises";
import path from "node:path";
${fixtureOracleDelegationPrelude()}
let scopedValue = false;
try {
  scopedValue = JSON.parse(
    await readFile(path.join(process.cwd(), "src", \`\${key}.json\`), "utf8")
  );
} catch {}
const observed = scopedValue && result.observations.result;
result.observations.result = observed;
result.observations.requirement_result = observed;
result.observations.obligation_result = observed;
console.log(JSON.stringify(result));
`;
}

export function constantFixtureOracleSource() {
  return `${fixtureOracleDelegationPrelude()}
result.observations.result = true;
result.observations.requirement_result = true;
result.observations.obligation_result = true;
result.observations.architecture_result = true;
result.observations.relations_applicable = false;
result.observations.target_live = true;
result.observations.negative = false;
console.log(JSON.stringify(result));
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
