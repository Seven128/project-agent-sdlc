import assert from "node:assert/strict";
import { readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { loadActiveLongTaskAuthority } from "../../packages/ty-context/dist/lib/long-task-state.js";
import {
  commitCandidate,
  createDeliveryFixture,
  runCli,
  runCliFailure,
  writeContract,
} from "./long-task-delivery-fixtures.mjs";
import {
  FIXTURE_STATIC_FALSE_PATH,
  FIXTURE_STATIC_RELATIONS_PATH,
} from "./long-task-package-machine-fixture.mjs";

const countingOraclePath = "tests/raw-counting-oracle.mjs";

test("different Environment Requirements cannot reuse Raw Execution", async () => {
  const fixture = await createDeliveryFixture();
  const marker = path.join(
    os.tmpdir(),
    `ty-context-raw-${process.pid}-${Date.now()}.txt`,
  );
  try {
    configureChecks(fixture, [
      [],
      [
        {
          key: "missing-env",
          kind: "env_var",
          target: "TY_CONTEXT_DEFINITELY_MISSING_ENV",
        },
      ],
      [{ key: "missing-file", kind: "file", target: "missing.txt" }],
      [
        {
          key: "missing-loopback",
          kind: "loopback_tcp",
          host: "127.0.0.1",
          port: 1,
          timeout_ms: 50,
        },
      ],
    ]);
    await installCountingOracle(fixture, marker);
    await writeContract(fixture.workdir, fixture.contract);
    await runCli(fixture.root, ["enable", "long-task"]);
    await runCli(fixture.root, ["long-task", "compile", fixture.workdir]);
    const active = (await loadActiveLongTaskAuthority(fixture.root)).authority;
    const identities = rawChecks(active).map(
      (check) => check.raw_execution_identity,
    );
    assert.equal(new Set(identities).size, 4);

    const result = await runCliFailure(fixture.root, [
      "long-task",
      "verify",
      fixture.workdir,
    ]);
    assert.deepEqual(
      rawCheckResults(result).map((check) => check.status),
      ["passed", "blocked_external", "blocked_external", "blocked_external"],
    );
    assert.equal(await executionCount(marker), 3);
  } finally {
    await rm(marker, { force: true });
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("identical canonical Environment Requirements may share Raw Execution", async () => {
  const fixture = await createDeliveryFixture();
  const marker = path.join(
    os.tmpdir(),
    `ty-context-raw-identical-${process.pid}-${Date.now()}.txt`,
  );
  const keys = ["TY_CONTEXT_RAW_ENV_A", "TY_CONTEXT_RAW_ENV_B"];
  const previous = keys.map((key) => process.env[key]);
  process.env[keys[0]] = "secret-value-a";
  process.env[keys[1]] = "secret-value-b";
  try {
    const first = [
      { key: "env-a", kind: "env_var", target: keys[0] },
      { key: "env-b", kind: "env_var", target: keys[1] },
    ];
    configureChecks(fixture, [first, [...first].reverse()]);
    await installCountingOracle(fixture, marker);
    await writeContract(fixture.workdir, fixture.contract);
    await runCli(fixture.root, ["enable", "long-task"]);
    await runCli(fixture.root, ["long-task", "compile", fixture.workdir]);
    const active = (await loadActiveLongTaskAuthority(fixture.root)).authority;
    const checks = rawChecks(active);
    assert.equal(
      checks[0].raw_execution_identity,
      checks[1].raw_execution_identity,
    );
    assert.equal(JSON.stringify(active).includes("secret-value-a"), false);
    assert.equal(JSON.stringify(active).includes("secret-value-b"), false);

    const result = await runCli(fixture.root, [
      "long-task",
      "verify",
      fixture.workdir,
    ]);
    assert.deepEqual(
      rawCheckResults(result).map((check) => check.status),
      ["passed", "passed"],
    );
    assert.equal(await executionCount(marker), 5);
  } finally {
    restore(keys[0], previous[0]);
    restore(keys[1], previous[1]);
    await rm(marker, { force: true });
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("different env var targets produce different Raw Executions", async () => {
  const fixture = await createDeliveryFixture();
  const marker = path.join(
    os.tmpdir(),
    `ty-context-raw-target-${process.pid}-${Date.now()}.txt`,
  );
  const keys = ["TY_CONTEXT_RAW_TARGET_A", "TY_CONTEXT_RAW_TARGET_B"];
  const previous = keys.map((key) => process.env[key]);
  process.env[keys[0]] = "present-a";
  process.env[keys[1]] = "present-b";
  try {
    configureChecks(fixture, [
      [{ key: "env", kind: "env_var", target: keys[0] }],
      [{ key: "env", kind: "env_var", target: keys[1] }],
    ]);
    await installCountingOracle(fixture, marker);
    await writeContract(fixture.workdir, fixture.contract);
    await runCli(fixture.root, ["enable", "long-task"]);
    await runCli(fixture.root, ["long-task", "compile", fixture.workdir]);
    const active = (await loadActiveLongTaskAuthority(fixture.root)).authority;
    const checks = rawChecks(active);
    assert.notEqual(
      checks[0].raw_execution_identity,
      checks[1].raw_execution_identity,
    );
    const result = await runCli(fixture.root, [
      "long-task",
      "verify",
      fixture.workdir,
    ]);
    assert.deepEqual(
      rawCheckResults(result).map((check) => check.status),
      ["passed", "passed"],
    );
    assert.equal(await executionCount(marker), 6);
  } finally {
    restore(keys[0], previous[0]);
    restore(keys[1], previous[1]);
    await rm(marker, { force: true });
    await rm(fixture.root, { recursive: true, force: true });
  }
});

function configureChecks(fixture, requirements) {
  const outcome = fixture.contract.outcomes[0];
  const base = outcome.acceptance.checks[0];
  const rawChecks = requirements.map((environment_requirements, index) => ({
    ...structuredClone(base),
    key: `raw-${index}`,
    journey_roles: ["success"],
    proof_surface: "implementation_structure",
    runner: {
      ...structuredClone(base.runner),
      type: "node_oracle",
      target: countingOraclePath,
      argv: [],
    },
    verification_inputs: [
      countingOraclePath,
      FIXTURE_STATIC_FALSE_PATH,
      FIXTURE_STATIC_RELATIONS_PATH,
    ],
    input_paths: ["src/state.json"],
    expected_output_paths: [],
    artifact_globs: [],
    positive_assertions: [
      {
        key: "raw-result",
        criterion: `Raw execution result ${index} is observable.`,
        claims: ["result"],
        applicability_ref: "first-root-success",
        observation: index === 0 ? "result" : "result_copy",
        evidence_capabilities: ["presence"],
        operator: "equals",
        expected: true,
      },
      {
        key: "raw-requirement",
        criterion: `Raw execution requirement ${index} is observable.`,
        claims: ["requirement.observe-first"],
        applicability_ref: "first-root-success",
        observation: index === 0 ? "requirement_result" : "requirement_copy",
        evidence_capabilities: ["presence"],
        operator: "equals",
        expected: true,
      },
      {
        key: "raw-obligation",
        criterion: `Raw execution obligation ${index} is observable.`,
        claims: ["obligation.implement-first"],
        applicability_ref: "first-root-success",
        observation: index === 0 ? "obligation_result" : "obligation_copy",
        evidence_capabilities: ["presence"],
        operator: "equals",
        expected: true,
      },
      {
        key: "raw-architecture",
        criterion: `Raw execution architecture ${index} remains conformant.`,
        claims: ["obligation.architecture-first"],
        applicability_ref: "first-root-success",
        observation: index === 0 ? "architecture_result" : "architecture_copy",
        evidence_capabilities: ["presence"],
        operator: "equals",
        expected: true,
      },
      {
        key: "raw-liveness",
        criterion: `Raw execution target ${index} remains live.`,
        claims: [],
        observation: index === 0 ? "target_live" : "target_live_copy",
        evidence_capabilities: ["presence"],
        operator: "equals",
        expected: true,
      },
    ],
    negative_assertions: [
      {
        key: "raw-relations-na",
        criterion:
          "Cross-Control relations remain not applicable in the raw execution fixture.",
        claims: ["control_relation_closure"],
        applicability_ref: "first-root-success",
        observation:
          index === 0 ? "relations_applicable" : "relations_applicable_copy",
        evidence_capabilities: ["presence"],
        operator: "equals",
        expected: false,
      },
    ],
    environment_requirements: structuredClone(environment_requirements),
  }));
  outcome.acceptance.checks = [base, ...rawChecks];
  outcome.product.requirements[0].required_proof_surfaces = [
    "runtime_behavior",
    "implementation_structure",
  ];
  for (const obligation of outcome.technical.obligations)
    obligation.required_proof_surfaces = [
      "runtime_behavior",
      "implementation_structure",
    ];
  outcome.acceptance.counterfactual_controls.push(
    ...requirements.flatMap((_environmentRequirements, index) => [
      {
        key: `raw-sensitive-${index}`,
        binding_key: "state-first",
        claims: [
          "result",
          "requirement.observe-first",
          "obligation.implement-first",
          "obligation.architecture-first",
        ],
        check_key: `raw-${index}`,
        mutation: {
          type: "replace_file",
          path: "src/state.json",
          fixture_path: FIXTURE_STATIC_FALSE_PATH,
        },
        expected_assertion_failures: [
          "raw-result",
          "raw-requirement",
          "raw-obligation",
          "raw-architecture",
        ],
        preserved_assertions: ["raw-liveness"],
      },
      {
        key: `raw-relations-sensitive-${index}`,
        binding_key: "state-first",
        claims: ["control_relation_closure"],
        check_key: `raw-${index}`,
        mutation: {
          type: "replace_file",
          path: "src/state.json",
          fixture_path: FIXTURE_STATIC_RELATIONS_PATH,
        },
        expected_assertion_failures: ["raw-relations-na"],
        preserved_assertions: ["raw-liveness"],
      },
    ]),
  );
}

async function installCountingOracle(fixture, marker) {
  const state = JSON.parse(
    await readFile(path.join(fixture.root, "src", "state.json"), "utf8"),
  );
  const observationDocument = (value, relationsApplicable) => {
    const candidate = structuredClone(state);
    candidate.first = value;
    candidate.first_relations_applicable = relationsApplicable;
    candidate.observations ??= {};
    for (const check of fixture.contract.outcomes[0].acceptance.checks.filter(
      (entry) => entry.key.startsWith("raw-"),
    ))
      for (const assertion of [
        ...check.positive_assertions,
        ...check.negative_assertions,
      ]) {
        const identity = `assertion.first.${check.key}.${assertion.key}`;
        candidate.observations[identity] =
          assertion.key === "raw-liveness"
            ? true
            : assertion.key === "raw-relations-na"
              ? relationsApplicable
              : value;
      }
    return candidate;
  };
  await writeFile(
    path.join(fixture.root, "src", "state.json"),
    `${JSON.stringify(observationDocument(true, false), null, 2)}\n`,
  );
  await writeFile(
    path.join(fixture.root, ...FIXTURE_STATIC_FALSE_PATH.split("/")),
    `${JSON.stringify(observationDocument(false, false), null, 2)}\n`,
  );
  await writeFile(
    path.join(fixture.root, ...FIXTURE_STATIC_RELATIONS_PATH.split("/")),
    `${JSON.stringify(observationDocument(true, true), null, 2)}\n`,
  );
  await writeFile(
    path.join(fixture.root, ...countingOraclePath.split("/")),
    `import { appendFileSync } from "node:fs";
appendFileSync(${JSON.stringify(marker)}, "run\\n");
console.log(JSON.stringify({
  schema_version: "long-task-check-result-v3",
  execution_status: "completed",
  observations: {},
  evidence_records: []
}));
`,
  );
  await commitCandidate(fixture.root);
}

function rawChecks(active) {
  return active.authority_snapshot.outcomes[0].acceptance.checks.filter(
    (check) => check.key.startsWith("raw-"),
  );
}

function rawCheckResults(result) {
  return result.check_results.filter((check) =>
    check.check_key.startsWith("raw-"),
  );
}

async function executionCount(marker) {
  return readFile(marker, "utf8")
    .then((value) => value.trim().split(/\r?\n/u).filter(Boolean).length)
    .catch(() => 0);
}

function restore(key, value) {
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
}
