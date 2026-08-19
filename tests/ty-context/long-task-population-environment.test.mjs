import assert from "node:assert/strict";
import net from "node:net";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { evaluatePopulation } from "../../packages/ty-context/dist/lib/long-task-assertions-v2.js";
import { executeCheckRunner } from "../../packages/ty-context/dist/lib/long-task-check-runner.js";
import { assertProcessTreeIdentityControls } from "./helpers/long-task-process-tree-controls.mjs";

const population = {
  check_key: "population",
  universe_binding_key: "population-universe",
  claims: ["result"],
  observations: {
    universe_ids: "population.universe_ids",
    eligible_ids: "population.eligible_ids",
    observed_ids: "population.observed_ids",
    excluded_items: "population.excluded_items",
  },
  exclusion_rules: [
    { key: "disabled", statement: "Disabled entities may be excluded." },
  ],
};

test("Population V2 validates exact entity sets", () => {
  const valid = {
    population: {
      universe_ids: ["a", "b", "c"],
      eligible_ids: ["a", "b", "c"],
      observed_ids: ["a", "b"],
      excluded_items: [{ id: "c", rule: "disabled" }],
    },
  };
  assert.equal(evaluatePopulation(population, valid).passed, true);
  for (const [name, mutate, reason] of [
    [
      "eligible population omits a universe member",
      (value) => value.population.eligible_ids.pop(),
      "eligible_universe_mismatch",
    ],
    [
      "observed outside eligible",
      (value) => value.population.observed_ids.push("x"),
      "observed_not_eligible_subset",
    ],
    [
      "excluded outside eligible",
      (value) => value.population.excluded_items.push({ id: "x", rule: "disabled" }),
      "excluded_not_eligible_subset",
    ],
    [
      "overlap",
      (value) => value.population.excluded_items.push({ id: "a", rule: "disabled" }),
      "observed_excluded_overlap",
    ],
    [
      "unknown exclusion",
      (value) => (value.population.excluded_items[0].rule = "unknown"),
      "exclusion_rule_unknown",
    ],
    [
      "omitted entity",
      (value) => (value.population.excluded_items = []),
      "eligible_population_incomplete",
    ],
    [
      "duplicate id",
      (value) => value.population.eligible_ids.push("a"),
      "eligible_ids_invalid",
    ],
  ]) {
    const value = structuredClone(valid);
    mutate(value);
    assert.match(
      evaluatePopulation(population, value).reason,
      new RegExp(reason),
      name,
    );
  }
});

test("Windows process-tree cleanup binds exact process instances", async () => {
  await assertProcessTreeIdentityControls();
});

test("Environment probes block before runner start and support executable/file/env/loopback", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "ty-context-env-"));
  const marker = path.join(root, "runner-started.txt");
  const fixture = path.join(root, "fixture.txt");
  await writeFile(fixture, "fixture\n");
  const server = net.createServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;
  const base = check(root, marker);
  try {
    const success = await executeCheckRunner(
      {
        ...base,
        environment_requirements: [
          { key: "node", kind: "executable", target: "node" },
          { key: "fixture", kind: "file", target: "fixture.txt" },
          {
            key: "service",
            kind: "loopback_tcp",
            host: "127.0.0.1",
            port,
            timeout_ms: 1000,
          },
        ],
      },
      root,
    );
    assert.equal(success.execution_status, "completed");

    for (const requirement of [
      { key: "exe", kind: "executable", target: "definitely-missing-executable" },
      { key: "env", kind: "env_var", target: "DEFINITELY_MISSING_ENV" },
      { key: "file", kind: "file", target: "missing.txt" },
      {
        key: "tcp",
        kind: "loopback_tcp",
        host: "127.0.0.1",
        port: 1,
        timeout_ms: 50,
      },
    ]) {
      await rm(marker, { force: true });
      const result = await executeCheckRunner(
        { ...base, environment_requirements: [requirement] },
        root,
      );
      assert.equal(result.execution_status, "blocked_external");
      assert.equal(result.attempts, 0);
      await assert.rejects(() => import("node:fs/promises").then(({ access }) => access(marker)));
    }
  } finally {
    server.close();
    await rm(root, { recursive: true, force: true });
  }
});

test("Runner receives only the base whitelist plus declared env vars and never returns secret values", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "ty-context-env-pass-"));
  const declaredKey = "TEST_API_TOKEN";
  const undeclaredKey = "OPENAI_TEST_UNDECLARED_SECRET";
  const declaredValue = `declared-${Date.now()}-secret`;
  const undeclaredValue = `undeclared-${Date.now()}-secret`;
  const previousDeclared = process.env[declaredKey];
  const previousUndeclared = process.env[undeclaredKey];
  process.env[declaredKey] = declaredValue;
  process.env[undeclaredKey] = undeclaredValue;
  try {
    const base = check(root, path.join(root, "runner-started.txt"));
    const environment_requirements = [
      { key: "token", kind: "env_var", target: declaredKey },
    ];
    const safe = await executeCheckRunner(
      {
        ...base,
        runner: {
          ...base.runner,
          executable_argv_prefix: [
            "-e",
            `console.log(JSON.stringify({schema_version:"long-task-check-result-v2",execution_status:"completed",observations:{declared:process.env.${declaredKey}===${JSON.stringify(declaredValue)},undeclared_present:Boolean(process.env.${undeclaredKey}),path_present:Boolean(process.env.PATH),protocol:process.env.TY_CONTEXT_CHECK_PROTOCOL}}));`,
          ],
        },
        environment_requirements,
      },
      root,
    );
    assert.equal(safe.execution_status, "completed");
    assert.deepEqual(safe.observations, {
      declared: true,
      undeclared_present: false,
      path_present: true,
      protocol: "long-task-check-result-v3",
    });
    assert.equal(JSON.stringify(safe).includes(declaredValue), false);
    assert.equal(JSON.stringify(safe).includes(undeclaredValue), false);

    const leaking = await executeCheckRunner(
      {
        ...base,
        runner: {
          ...base.runner,
          execution_identity: "secret-leak",
          executable_argv_prefix: [
            "-e",
            `console.log(JSON.stringify({schema_version:"long-task-check-result-v2",execution_status:"completed",observations:{token:process.env.${declaredKey}}}));`,
          ],
        },
        environment_requirements,
      },
      root,
    );
    assert.equal(leaking.execution_status, "invalid_evidence");
    assert.equal(
      leaking.error,
      "check_evidence_contains_declared_environment_value",
    );
    assert.equal(JSON.stringify(leaking).includes(declaredValue), false);
  } finally {
    restoreEnvironment(declaredKey, previousDeclared);
    restoreEnvironment(undeclaredKey, previousUndeclared);
    await rm(root, { recursive: true, force: true });
  }
});

function check(root, marker) {
  const script = `require('node:fs').writeFileSync(${JSON.stringify(marker)}, 'started'); console.log(JSON.stringify({schema_version:'long-task-check-result-v2',execution_status:'completed',observations:{result:true}}));`;
  return {
    internal_id: "CHECK.env.probe",
    outcome_key: "env",
    key: "probe",
    proof_surface: "runtime_behavior",
    raw_execution_identity: `raw-probe-${root}`,
    runner: {
      type: "node_oracle",
      target: "probe.mjs",
      argv: [],
      cwd: ".",
      timeout_ms: 5000,
      effect: "read_only",
      retry_policy: "none",
      idempotent: true,
      executable: process.execPath,
      executable_argv_prefix: ["-e", script],
      resolved_cwd: "",
      resolved_target: "probe.mjs",
      definition_sha256: "probe",
      frozen_files: {},
      package_script: null,
      execution_identity: `probe-${root}`,
    },
    verification_input_hashes: {},
    input_paths: [],
    expected_output_paths: [],
    artifact_globs: [],
    positive_assertions: [],
    negative_assertions: [],
    environment_requirements: [],
  };
}

function restoreEnvironment(key, value) {
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
}
