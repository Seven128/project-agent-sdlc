import { writeFile } from "node:fs/promises";
import path from "node:path";
import YAML from "yaml";
import { executionTargetSourceStatement } from "../../packages/ty-context/dist/lib/long-task-source-target-index.js";
import {
  fixtureSemanticManifest,
  fixtureSourceStatements,
} from "./long-task-semantic-manifest-fixture.mjs";
import { digestCanonical } from "./long-task-semantic-refresh-fixture.mjs";

export async function writeFixtureSourceAndOracle(
  root,
  {
    twoOutcomes = false,
    externalConfirmation = false,
    executionTarget = null,
  } = {},
  manifestOverride = null,
) {
  const options = { twoOutcomes, externalConfirmation };
  const manifest = manifestOverride ?? fixtureSemanticManifest(options);
  const sourceItems = [
    ["first-observable", fixtureSourceStatements["first-observable"]],
    ...(twoOutcomes
      ? [["second-observable", fixtureSourceStatements["second-observable"]]]
      : []),
    ["fixture-architecture", fixtureSourceStatements["fixture-architecture"]],
    ...(executionTarget
      ? [
          [
            "fixture-execution-target",
            executionTargetSourceStatement(executionTarget),
          ],
        ]
      : []),
    ...(externalConfirmation
      ? [["fixture-external", fixtureSourceStatements["fixture-external"]]]
      : []),
  ];
  const sourceBody = [
    `<!-- ty-source-background:start key=fixture-heading reason=markdown-structure -->\n<a id="fixture-source"></a>\n<!-- ty-source-background:end -->`,
    ...sourceItems.flatMap(([key, statement]) => {
      const kind =
        key === "fixture-architecture"
          ? "technical_obligation aspect=architecture"
          : key === "fixture-execution-target"
            ? "technical_obligation"
            : key === "fixture-external"
              ? "external_confirmation"
              : "requirement";
      const item = `<!-- ty-source-item:start key=${key} kind=${kind} -->\n${statement}\n<!-- ty-source-item:end -->`;
      return key === "fixture-external"
        ? [
            `<!-- ty-source-background:start key=fixture-external-heading reason=markdown-structure -->\n<a id="fixture-external"></a>\n<!-- ty-source-background:end -->`,
            item,
          ]
        : [item];
    }),
  ].join("\n\n");
  const serialized = YAML.stringify(JSON.parse(JSON.stringify(manifest)), {
    lineWidth: 0,
  }).trimEnd();
  const source = `${sourceBody}\n\n\`\`\`yaml semantic-fact-manifest-v1\n${serialized}\n\`\`\`\n`;
  await writeFile(path.join(root, "source.md"), source);
  await writeFile(
    path.join(root, "tests", "oracle.mjs"),
    fixtureOracleSource(manifest),
  );
}

export function fixtureOracleSource(manifest) {
  const manifestSha256 = digestCanonical(manifest);
  const facts = Object.fromEntries(
    manifest.facts.map((fact) => {
      const proof = manifest.proof_obligations.find(
        (item) => item.fact_ref === fact.key,
      );
      const environment = manifest.environments.find(
        (item) => item.key === proof.environment_ref,
      );
      const oracle = manifest.oracles.find(
        (item) => item.key === proof.oracle_ref,
      );
      return [
        fact.outcome_ref,
        {
          fact,
          proof,
          environment,
          oracle,
          manifestSha256,
        },
      ];
    }),
  );
  return `import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
let state = { first: false, second: false };
try { state = JSON.parse(await readFile(new URL("../src/state.json", import.meta.url), "utf8")); } catch {}
const key = process.argv[2] || "first";
const semantic = ${JSON.stringify(facts)};
const artifactPath = "artifacts/proof.json";
const artifact = await readFile(new URL("../artifacts/proof.json", import.meta.url));
const artifactSha256 = createHash("sha256").update(artifact).digest("hex");
const assertionKeys = [
  \`${"${key}"}-result\`,
  \`${"${key}"}-requirement\`,
  \`${"${key}"}-obligation\`,
  \`${"${key}"}-relations-na\`,
  ...(key === "first" ? ["first-architecture"] : []),
];
const targetRecord = (assertionKey) => ({
  assertion_key: assertionKey,
  capability: "target_runtime",
  target_ref: "fixture-app",
  root_entrypoint: "tests/oracle.mjs",
  session_id: \`fixture-${"${key}"}-session\`,
  cold_start: true
});
const stateRecord = (assertionKey) => ({
  assertion_key: assertionKey,
  capability: "state_delta",
  before_sha256: "0".repeat(64),
  after_sha256: "1".repeat(64),
  changed_fields: [key]
});
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
const actualValueSha256 = createHash("sha256")
  .update(JSON.stringify(state[key]))
  .digest("hex");
const comparisonPassed = state[key] === true;
const comparisonResultSha256 = createHash("sha256")
  .update(JSON.stringify(canonicalize({
    identity: {
      kind: "semantic_fact_non_ui",
      fact_ref: semantic[key].fact.key,
      proof_ref: semantic[key].proof.key,
      target_ref: "fixture-app"
    },
    actual_value_sha256: actualValueSha256,
    expected_value_sha256: semantic[key].fact.expected.sha256,
    comparator: semantic[key].proof.comparison.comparator,
    mode: semantic[key].proof.comparison.mode,
    parameters_sha256: semantic[key].proof.comparison.parameters.sha256,
    tolerance_sha256: semantic[key].proof.comparison.tolerance?.sha256 ?? null,
    mask_sha256: semantic[key].proof.comparison.mask?.sha256 ?? null,
    passed: actualValueSha256 === semantic[key].fact.expected.sha256
  })))
  .digest("hex");
const semanticRecord = {
  assertion_key: \`${"${key}"}-semantic-fact\`,
  capability: "semantic_fact",
  manifest_ref: "${manifest.key}",
  manifest_sha256: semantic[key].manifestSha256,
  outcome_ref: key,
  target_ref: "fixture-app",
  fact_ref: semantic[key].fact.key,
  proof_ref: semantic[key].proof.key,
  method: semantic[key].proof.method,
  subject_ref: semantic[key].fact.unit_ref,
  condition_ref: semantic[key].fact.condition_ref,
  property_ref: semantic[key].fact.property_ref,
  actual_observation: {
    artifact_path: artifactPath,
    artifact_sha256: artifactSha256,
    locator: {kind: "json_pointer", value: \`/observations/${"${key}"}/value\`},
    value_sha256: actualValueSha256,
    sensitivity: "plain",
    redaction: null
  },
  actual_environment: {
    artifact_path: artifactPath,
    artifact_sha256: artifactSha256,
    locator: {kind: "json_pointer", value: \`/observations/${"${key}"}/environment\`},
    value_sha256: semantic[key].environment.definition.sha256
  },
  expected: semantic[key].fact.expected,
  comparison: {
    artifact_path: artifactPath,
    artifact_sha256: artifactSha256,
    locator: {kind: "json_pointer", value: \`/comparisons/${"${key}"}/${"${semantic[key].proof.key}"}\`},
    result_sha256: comparisonResultSha256,
    comparator: semantic[key].proof.comparison.comparator,
    mode: semantic[key].proof.comparison.mode,
    parameters: semantic[key].proof.comparison.parameters,
    tolerance: semantic[key].proof.comparison.tolerance,
    mask: semantic[key].proof.comparison.mask,
    passed: comparisonPassed
  },
  verdict: state[key] === true ? "passed" : "failed",
  oracle: semantic[key].oracle,
  environment: semantic[key].environment,
  observer_results: []
};
console.log(JSON.stringify({
  schema_version: "long-task-check-result-v3",
  execution_status: "completed",
  observations: {
    result: state[key],
    requirement_result: state[key],
    obligation_result: state[key],
    architecture_result: state.first,
    semantic_fact_result: state[key],
    relations_applicable: state[\`${"${key}"}_relations_applicable\`],
    target_live: true,
    negative: false,
    population: {
      universe_ids: [key],
      eligible_ids: [key],
      observed_ids: state[key] ? [key] : [],
      excluded_items: []
    }
  },
  evidence_records: [
    ...assertionKeys.flatMap((assertionKey) => [
      targetRecord(assertionKey),
      stateRecord(assertionKey)
    ]),
    targetRecord(\`${"${key}"}-liveness\`),
    semanticRecord
  ]
}));
`;
}
