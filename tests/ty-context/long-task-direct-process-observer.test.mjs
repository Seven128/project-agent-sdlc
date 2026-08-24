import assert from "node:assert/strict";
import {
  chmod,
  copyFile,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { executeCheckRunner } from "../../packages/ty-context/dist/lib/long-task-check-runner.js";
import { compileProcessRuntimeClosure } from "../../packages/ty-context/dist/lib/long-task-process-runtime-closure.js";
import { decodeProductObservationEnvelope } from "../../packages/ty-context/dist/lib/long-task-process-observation.js";
import {
  canonicalValueJson,
  sha256Hex,
} from "../../packages/ty-context/dist/lib/strict-codec.js";

const SNAPSHOT_SHA256 = "a".repeat(64);

test("direct process observation captures one root stdout envelope and host attestation", async () => {
  const fixture = await createProcessFixture();
  try {
    const authorities = [
      observationAuthority(fixture.target, "fact/a"),
      observationAuthority(fixture.target, "fact~b"),
    ];
    const check = processCheck(fixture, authorities);
    await assertValidProcessObservation(fixture, authorities, check);
    await assertAuthorityAndFailureBoundaries(fixture, authorities, check);
    await assertRetryAndProcessTreeLifecycle(fixture, authorities, check);
    await assertDirectRootMismatchRejected(fixture, authorities, check);
  } finally {
    await rm(fixture.root, {
      recursive: true,
      force: true,
      maxRetries: 10,
      retryDelay: 100,
    });
  }
});

async function assertValidProcessObservation(fixture, authorities, check) {
  const validLog = path.join(fixture.root, "valid-attempts.jsonl");
  setProcessInvocation(check, authorities, [
    "product.mjs",
    "valid",
    path.basename(validLog),
    "one exact token with spaces",
  ]);
  const valid = await executeCheckRunner(
    check,
    fixture.root,
    executionContext(check),
  );

  assert.equal(valid.execution_status, "completed", JSON.stringify(valid));
  assert.equal(valid.exit_code, 0);
  assert.deepEqual(valid.observations, {});
  assert.equal(valid.package_observations.length, 2);
  assert.deepEqual(
    valid.package_observations.map((entry) => entry.observation_identity),
    ["fact/a", "fact~b"],
  );
  assert.deepEqual(
    valid.package_observations.map((entry) => entry.raw_value),
    [{ accepted: true }, ["one", "two"]],
  );
  for (const entry of valid.package_observations) {
    assert.equal(entry.authority, "package_process_json_exact");
    assert.equal(entry.reason, null);
    assert.equal(entry.observation.capability, "json-pointer-exact-v1");
    assert.equal(entry.observation.artifact_path, "process.stdout.json");
    assert.match(entry.observation.value_sha256, /^[a-f0-9]{64}$/u);
  }
  assert.equal(valid.host_execution_attestation.direct_root_match, true);
  assert.deepEqual(valid.host_execution_attestation.actual_argv, [
    "product.mjs",
    "valid",
    path.basename(validLog),
    "one exact token with spaces",
  ]);
  assert.deepEqual(
    valid.host_execution_attestation.declared_root_argv,
    valid.host_execution_attestation.actual_argv,
  );
  assert.equal(
    valid.host_execution_attestation.raw_execution_identity,
    check.raw_execution_identity,
  );
  assert.equal(
    valid.host_execution_attestation.snapshot_sha256,
    SNAPSHOT_SHA256,
  );
  assert.equal(
    valid.host_execution_attestation.process_runtime_closure_identity,
    check.process_runtime_closure.closure_identity,
  );
  assert.ok(valid.host_execution_attestation.pid > 0);
  assert.match(
    valid.host_execution_attestation.observation_execution_nonce,
    /^[a-f0-9]{64}$/u,
  );
  assert.match(
    valid.host_execution_attestation.observation_artifact_sha256,
    /^[a-f0-9]{64}$/u,
  );
  assert.equal(
    Date.parse(valid.host_execution_attestation.started_at) <=
      Date.parse(valid.host_execution_attestation.completed_at),
    true,
  );
  const [validAttempt] = await attemptRows(validLog);
  assert.deepEqual(
    {
      mode: validAttempt.mode,
      observation_environment_present:
        validAttempt.observation_environment_present,
    },
    { mode: "valid", observation_environment_present: false },
  );
  assert.equal(Number.isSafeInteger(validAttempt.root_pid), true);
  assert.deepEqual(validAttempt.argv, [
    "valid",
    path.basename(validLog),
    "one exact token with spaces",
  ]);
}

async function assertAuthorityAndFailureBoundaries(
  fixture,
  authorities,
  check,
) {
  const grouped = processCheck(fixture, [authorities[0]]);
  const groupedLog = path.join(fixture.root, "grouped-channels.jsonl");
  const groupedAuthorities = [
    structuredClone(authorities[0]),
    structuredClone(authorities[1]),
  ];
  setProcessInvocation(grouped, groupedAuthorities, [
    "product.mjs",
    "valid",
    path.basename(groupedLog),
  ]);
  grouped.observation_authorities = [groupedAuthorities[0]];
  const groupedRaw = await executeCheckRunner(
    grouped,
    fixture.root,
    executionContext(grouped, [groupedAuthorities[1]]),
  );
  assert.equal(groupedRaw.execution_status, "completed");
  assert.equal(groupedRaw.package_observations.length, 2);
  assert.equal((await attemptRows(groupedLog)).length, 1);

  const wrongIdentity = structuredClone(check);
  const wrongIdentityAuthorities = structuredClone(authorities);
  setProcessInvocation(wrongIdentity, wrongIdentityAuthorities, [
    "product.mjs",
    "wrong-identity",
    "wrong-identity.jsonl",
  ]);
  const rejected = await executeCheckRunner(
    wrongIdentity,
    fixture.root,
    executionContext(wrongIdentity, wrongIdentityAuthorities),
  );
  assert.equal(rejected.execution_status, "invalid_evidence");
  assert.match(rejected.error, /process_observation_identity_set_mismatch/u);
  assert.deepEqual(rejected.package_observations, []);
  assert.equal(rejected.host_execution_attestation, null);

  const nonzero = structuredClone(check);
  const nonzeroAuthorities = structuredClone(authorities);
  setProcessInvocation(nonzero, nonzeroAuthorities, [
    "product.mjs",
    "nonzero",
    "nonzero.jsonl",
  ]);
  const nonzeroResult = await executeCheckRunner(
    nonzero,
    fixture.root,
    executionContext(nonzero, nonzeroAuthorities),
  );
  assert.equal(nonzeroResult.execution_status, "invalid_evidence");
  assert.equal(nonzeroResult.exit_code, 7);
  assert.equal(nonzeroResult.error, "process_observer_nonzero_exit");

  const reservedEnvironment = structuredClone(check);
  reservedEnvironment.environment_requirements = [
    {
      key: "reserved-output",
      kind: "env_var",
      target: "ty_context_observation_output",
    },
  ];
  const reserved = await executeCheckRunner(
    reservedEnvironment,
    fixture.root,
    executionContext(reservedEnvironment, authorities),
  );
  assert.equal(reserved.execution_status, "invalid_evidence");
  assert.equal(
    reserved.error,
    "process_observer_reserved_environment_requirement",
  );
}

async function assertRetryAndProcessTreeLifecycle(fixture, authorities, check) {
  const retryLog = path.join(fixture.root, "retry-attempts.jsonl");
  const retry = structuredClone(check);
  retry.runner.retry_policy = "transient_once";
  const retryAuthorities = structuredClone(authorities);
  setProcessInvocation(retry, retryAuthorities, [
    "product.mjs",
    "retry",
    path.basename(retryLog),
  ]);
  const retried = await executeCheckRunner(
    retry,
    fixture.root,
    executionContext(retry, retryAuthorities),
  );
  assert.equal(retried.execution_status, "completed");
  assert.equal(retried.attempts, 2);
  const attempts = await attemptRows(retryLog);
  assert.equal(attempts.length, 2);
  assert.deepEqual(
    attempts.map((attempt) => attempt.observation_environment_present),
    [false, false],
  );

  const descendantLog = path.join(fixture.root, "descendant-attempts.jsonl");
  const descendant = structuredClone(check);
  if (process.platform === "win32") descendant.runner.timeout_ms = 300;
  const descendantAuthorities = structuredClone(authorities);
  setProcessInvocation(descendant, descendantAuthorities, [
    "product.mjs",
    "descendant",
    path.basename(descendantLog),
  ]);
  const descendantResult = await executeCheckRunner(
    descendant,
    fixture.root,
    executionContext(descendant, descendantAuthorities),
  );
  assert.equal(
    descendantResult.execution_status,
    process.platform === "win32" ? "infrastructure_error" : "invalid_evidence",
    JSON.stringify(descendantResult),
  );
  assert.equal(
    descendantResult.error,
    process.platform === "win32"
      ? "command_timeout"
      : "process_observer_descendant_process_alive",
  );
  const descendantPid = (await attemptRows(descendantLog)).at(-1).child_pid;
  await assertProcessGone(descendantPid);

  const timeoutLog = path.join(fixture.root, "timeout-attempts.jsonl");
  const timeoutTree = structuredClone(check);
  timeoutTree.runner.timeout_ms = 250;
  const timeoutAuthorities = structuredClone(authorities);
  setProcessInvocation(timeoutTree, timeoutAuthorities, [
    "product.mjs",
    "timeout-tree",
    path.basename(timeoutLog),
  ]);
  const timeoutStarted = Date.now();
  const timeoutResult = await executeCheckRunner(
    timeoutTree,
    fixture.root,
    executionContext(timeoutTree, timeoutAuthorities),
  );
  assert.equal(timeoutResult.execution_status, "infrastructure_error");
  assert.equal(timeoutResult.error, "command_timeout");
  assert.ok(Date.now() - timeoutStarted < 3_500);
  const timeoutAttempts = await attemptRows(timeoutLog);
  await assertProcessGone(timeoutAttempts[0].root_pid);
  await assertProcessGone(timeoutAttempts.at(-1).child_pid);

  const containmentFailures = [];
  for (const scenario of [
    { mode: "short-descendant", expectedRows: 2 },
    { mode: "short-grandchild", expectedRows: 3 },
  ])
    try {
      await assertShortRootDescendantContainment(
        fixture,
        authorities,
        check,
        scenario,
      );
    } catch (error) {
      containmentFailures.push(error);
    }
  if (containmentFailures.length)
    throw new AggregateError(
      containmentFailures,
      "short-lived root descendant containment failed",
    );
}

async function assertShortRootDescendantContainment(
  fixture,
  authorities,
  check,
  { mode, expectedRows },
) {
  const log = path.join(fixture.root, `${mode}.jsonl`);
  const candidate = structuredClone(check);
  candidate.runner.timeout_ms = 300;
  const candidateAuthorities = structuredClone(authorities);
  setProcessInvocation(candidate, candidateAuthorities, [
    "product.mjs",
    mode,
    path.basename(log),
  ]);
  const result = await executeCheckRunner(
    candidate,
    fixture.root,
    executionContext(candidate, candidateAuthorities),
  );
  const rows = await waitForAttemptRows(log, expectedRows);
  const spawnedPids = rows
    .flatMap((row) => [row.child_pid, row.grandchild_pid])
    .filter((pid) => Number.isSafeInteger(pid) && pid > 0);
  try {
    assert.notEqual(
      result.execution_status,
      "completed",
      `${mode} escaped containment: ${JSON.stringify(result)}`,
    );
    assert.match(
      result.error ?? "",
      /command_timeout|process_observer_descendant_process_alive/u,
    );
    for (const pid of spawnedPids) await assertProcessGone(pid);
  } finally {
    await Promise.all(spawnedPids.map((pid) => forceTerminateProcess(pid)));
    await Promise.all(spawnedPids.map((pid) => assertProcessGone(pid)));
  }
}

async function assertDirectRootMismatchRejected(fixture, authorities, check) {
  const wrapper = structuredClone(check);
  const wrapperAuthorities = structuredClone(authorities);
  setProcessInvocation(wrapper, wrapperAuthorities, [
    "product.mjs",
    "valid",
    "wrapper.jsonl",
  ]);
  wrapper.runner.argv[1] = "wrong-wrapper-argv";
  const wrapperResult = await executeCheckRunner(
    wrapper,
    fixture.root,
    executionContext(wrapper, wrapperAuthorities),
  );
  assert.equal(wrapperResult.execution_status, "invalid_evidence");
  assert.equal(wrapperResult.attempts, 0);
  assert.equal(wrapperResult.error, "process_observer_direct_root_required");
}

test("direct process decoder rejects extra fields, duplicate keys, deep trees, oversize values, and identity drift", () => {
  const target = "bin/product-root";
  const authority = observationAuthority(target, "fact");
  const envelope = (observations) =>
    Buffer.from(
      JSON.stringify({
        schema_version: "ty-context-product-observation-v1",
        observations,
      }),
    );

  assert.throws(
    () =>
      decodeProductObservationEnvelope({
        bytes: Buffer.from(
          JSON.stringify({
            schema_version: "ty-context-product-observation-v1",
            stale_session: "replayed-file",
            observations: { fact: true },
          }),
        ),
        authorities: [authority],
      }),
    /process_observation_envelope_fields_invalid/u,
  );
  assert.throws(
    () =>
      decodeProductObservationEnvelope({
        bytes: Buffer.from(
          `{"schema_version":"ty-context-product-observation-v1","observations":{"fact":true},"observations":{"fact":true}}`,
        ),
        authorities: [authority],
      }),
    /process_observation_decode_invalid:observation_json_duplicate_key/u,
  );
  let deep = true;
  for (let index = 0; index < 66; index += 1) deep = { value: deep };
  assert.throws(
    () =>
      decodeProductObservationEnvelope({
        bytes: envelope({ fact: deep }),
        authorities: [authority],
      }),
    /process_observation_decode_invalid:observation_json_depth_limit/u,
  );
  assert.throws(
    () =>
      decodeProductObservationEnvelope({
        bytes: envelope({ fact: "x".repeat(262_145) }),
        authorities: [authority],
      }),
    /process_observation_value_size_limit/u,
  );
  assert.throws(
    () =>
      decodeProductObservationEnvelope({
        bytes: envelope({ fact: true, extra: true }),
        authorities: [authority],
      }),
    /process_observation_identity_set_mismatch/u,
  );
  assert.throws(
    () =>
      decodeProductObservationEnvelope({
        bytes: Buffer.concat([
          Buffer.from([0xef, 0xbb, 0xbf]),
          envelope({ fact: true }),
        ]),
        authorities: [authority],
      }),
    /process_observation_decode_invalid:observation_json_utf8_invalid/u,
  );
  assert.throws(
    () =>
      decodeProductObservationEnvelope({
        bytes: Buffer.alloc(1_048_577, 0x20),
        authorities: [authority],
      }),
    /process_observation_decode_invalid:observation_artifact_size_limit/u,
  );
  const longIdentity = "x".repeat(4_097);
  assert.throws(
    () =>
      decodeProductObservationEnvelope({
        bytes: envelope({ [longIdentity]: true }),
        authorities: [observationAuthority(target, longIdentity)],
      }),
    /process_observation_decode_invalid:observation_locator_not_admitted/u,
  );
  const secondMethod = {
    ...structuredClone(authority),
    assertion_ref: "assertion.fact.content",
    obligation_ref: "obligation.fact.content",
    method: "content",
  };
  const sharedActual = decodeProductObservationEnvelope({
    bytes: envelope({ fact: true }),
    authorities: [authority, secondMethod],
  });
  assert.equal(sharedActual.package_observations.length, 2);
  assert.deepEqual(
    sharedActual.package_observations.map((entry) => entry.obligation_ref),
    [authority.obligation_ref, secondMethod.obligation_ref],
  );
});

test("legacy runner execution receives no package observation channel", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "ty-context-legacy-runner-"));
  try {
    const check = {
      internal_id: "CHECK.legacy",
      outcome_key: null,
      key: "legacy",
      proof_surface: "runtime_behavior",
      execution_target: { target_ref: "legacy", entrypoint: "root" },
      runner: {
        type: "node_oracle",
        target: "unused",
        argv: [],
        cwd: ".",
        timeout_ms: 10_000,
        effect: "read_only",
        retry_policy: "never",
        idempotent: true,
        executable: process.execPath,
        executable_argv_prefix: [
          "-e",
          `console.log(JSON.stringify({schema_version:"long-task-check-result-v3",execution_status:"completed",observations:{output:Boolean(process.env.TY_CONTEXT_OBSERVATION_OUTPUT),challenge:Boolean(process.env.TY_CONTEXT_OBSERVATION_CHALLENGE)},evidence_records:[]}))`,
        ],
        resolved_cwd: ".",
        resolved_target: "unused",
        definition_sha256: "legacy",
        frozen_files: {},
        package_script: null,
        execution_identity: "legacy",
        raw_execution_identity: "legacy",
      },
      environment_requirements: [],
      observation_authorities: [],
    };
    const raw = await executeCheckRunner(check, root);
    assert.equal(raw.execution_status, "completed");
    assert.deepEqual(raw.observations, { output: false, challenge: false });
    assert.deepEqual(raw.package_observations, []);
    assert.equal(raw.host_execution_attestation, null);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

async function createProcessFixture() {
  const root = await mkdtemp(
    path.join(tmpdir(), "ty-context-process-observer-"),
  );
  const target = `bin/product-root${process.platform === "win32" ? ".exe" : ""}`;
  await import("node:fs/promises").then(({ mkdir }) =>
    mkdir(path.join(root, "bin"), { recursive: true }),
  );
  await copyFile(process.execPath, path.join(root, target));
  if (process.platform !== "win32") await chmod(path.join(root, target), 0o755);
  await writeFile(
    path.join(root, "product.mjs"),
    `import { spawn } from "node:child_process";
import { appendFileSync, existsSync, readFileSync } from "node:fs";
const [mode, log] = process.argv.slice(2);
let prior = 0;
if (existsSync(log)) prior = readFileSync(log, "utf8").trim().split(/\\r?\\n/u).filter(Boolean).length;
appendFileSync(log, JSON.stringify({ mode, argv: process.argv.slice(2), root_pid: process.pid, observation_environment_present: Boolean(process.env.TY_CONTEXT_OBSERVATION_OUTPUT || process.env.TY_CONTEXT_OBSERVATION_CHALLENGE || process.env.TY_CONTEXT_CHECK_PROTOCOL) }) + "\\n");
if (mode === "missing") process.exit(0);
if (mode === "descendant" || mode === "timeout-tree") {
  const child = spawn(process.execPath, ["-e", "setTimeout(() => {}, 60_000)"], {
    stdio: mode === "timeout-tree" ? "inherit" : "ignore",
    detached: mode === "descendant",
  });
  appendFileSync(log, JSON.stringify({ child_pid: child.pid }) + "\\n");
  if (mode === "descendant") {
    child.unref();
    await new Promise((resolve) => setTimeout(resolve, 2_000));
  }
  if (mode === "timeout-tree") await new Promise(() => {});
}
if (mode === "short-descendant" || mode === "short-grandchild") {
  const child = spawn(
    process.execPath,
    mode === "short-grandchild"
      ? ["grandchild.mjs", log]
      : ["-e", "setTimeout(() => {}, 60_000)"],
    { stdio: "ignore", detached: true },
  );
  appendFileSync(log, JSON.stringify({ child_pid: child.pid }) + "\\n");
  child.unref();
}
if (mode === "retry" && prior === 0) {
  console.log(JSON.stringify({ schema_version: "invalid", observations: {} }));
  process.exit(0);
}
const observations = mode === "wrong-identity"
  ? { "wrong/fact": true }
  : { "fact/a": { accepted: true }, "fact~b": ["one", "two"] };
console.log(JSON.stringify({ schema_version: "ty-context-product-observation-v1", observations }));
if (mode === "nonzero") process.exit(7);
`,
  );
  await writeFile(
    path.join(root, "grandchild.mjs"),
    `import { spawn } from "node:child_process";
import { appendFileSync } from "node:fs";
const [log] = process.argv.slice(2);
const grandchild = spawn(process.execPath, ["-e", "setTimeout(() => {}, 60_000)"], {
  stdio: "ignore",
  detached: true,
});
appendFileSync(log, JSON.stringify({ grandchild_pid: grandchild.pid }) + "\\n");
grandchild.unref();
`,
  );
  return { root, target };
}

function processCheck(fixture, authorities) {
  return {
    internal_id: "CHECK.process",
    outcome_key: "process",
    key: "process",
    proof_surface: "runtime_behavior",
    execution_target: { target_ref: "product", entrypoint: "root" },
    runner: {
      type: "project_binary",
      target: fixture.target,
      argv: [],
      cwd: ".",
      timeout_ms: 10_000,
      effect: "test_sandbox",
      retry_policy: "never",
      idempotent: true,
      executable: fixture.target,
      executable_argv_prefix: [],
      resolved_cwd: ".",
      resolved_target: fixture.target,
      definition_sha256: "process",
      frozen_files: {},
      package_script: null,
      execution_identity: "process",
      raw_execution_identity: "process",
    },
    environment_requirements: [],
    verification_inputs: [],
    input_paths: [],
    expected_output_paths: [],
    artifact_globs: [],
    observation_authorities: authorities,
    raw_execution_identity: "process",
  };
}

function observationAuthority(target, identity) {
  return {
    obligation_ref: `obligation.${identity}`,
    fact_ref: identity,
    assertion_ref: `assertion.${identity}`,
    claim_refs: [],
    target_ref: "product",
    proof_surface: "runtime_behavior",
    method: "exact_value",
    evidence_capabilities: ["presence"],
    authority: "package_process_json_exact",
    expected_identity: `expected.${identity}`,
    expected_value_sha256: "e".repeat(64),
    actual_projection: "raw_exact",
    observation_identity: identity,
    comparison: {
      comparator: "exact_value",
      mode: "exact",
      parameters_sha256: "p".repeat(64),
      tolerance_sha256: null,
      mask_sha256: null,
    },
    locator_policy: {
      kind: "fixed_json_pointer",
      value: `/observations/${identity.replace(/~/gu, "~0").replace(/\//gu, "~1")}`,
    },
    carrier_refs: [],
    runtime_requirements: {
      runtime_family: "process",
      target_role: "product",
      entrypoint: "root",
      runner_type: "project_binary",
      resolved_runner_target: target,
      declared_root_entrypoint: target,
      resolved_runner_argv: [],
      declared_root_argv: [],
      effect: "test_sandbox",
      direct_root_match: true,
    },
  };
}

function setProcessInvocation(check, authorities, argv) {
  check.runner.argv = [...argv];
  check.observation_authorities = authorities;
  for (const authority of authorities) {
    authority.runtime_requirements.resolved_runner_argv = [...argv];
    authority.runtime_requirements.declared_root_argv = [...argv];
    authority.runtime_requirements.direct_root_match = true;
  }
  const executionTarget = {
    key: "product",
    description: "The fixture process product root.",
    role: "product",
    runtime_family: "process",
    root_entrypoint: check.runner.resolved_target,
    root_argv: [...argv],
    capabilities: ["process-runtime", "cold-start", "production-root"],
  };
  const sourceTarget = {
    target_ref: executionTarget.key,
    canonical_target_ref: `execution_target.${executionTarget.key}`,
    source_claim_key: "fixture-product-target",
    source_item_key: "fixture-product-target",
    source_path: "source.md",
    source_text_sha256: "a".repeat(64),
    target_identity: sha256Hex(canonicalValueJson(executionTarget)),
  };
  check.process_runtime_closure = compileProcessRuntimeClosure({
    check,
    runner: check.runner,
    execution_target: executionTarget,
    observation_authorities: authorities,
    production_bindings: [
      scopedBinding(check.outcome_key, {
        key: "product-root",
        kind: "file",
        target: check.runner.resolved_target,
        carrier_paths: [check.runner.resolved_target],
        existence: "existing",
      }),
      scopedBinding(check.outcome_key, {
        key: "product-module",
        kind: "file",
        target: "product.mjs",
        carrier_paths: ["product.mjs"],
        existence: "existing",
      }),
    ],
    production_owner_paths: ["bin/**", "product.mjs"],
    source_backed_execution_target: sourceTarget,
    protected_authority_paths: ["source.md"],
  });
}

function scopedBinding(outcomeKey, binding) {
  return {
    outcome_key: outcomeKey,
    local_key: binding.key,
    binding_ref: `${outcomeKey}.${binding.key}`,
    binding,
  };
}

function executionContext(check, observationAuthorities = []) {
  return {
    snapshot_sha256: SNAPSHOT_SHA256,
    observation_authorities: observationAuthorities,
    process_runtime_closure_identity:
      check.process_runtime_closure.closure_identity,
  };
}

async function attemptRows(file) {
  return (await readFile(file, "utf8"))
    .trim()
    .split(/\r?\n/u)
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

async function waitForAttemptRows(file, expectedRows) {
  const deadline = Date.now() + 2_000;
  while (Date.now() < deadline) {
    try {
      const rows = await attemptRows(file);
      if (rows.length >= expectedRows) return rows;
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  return attemptRows(file);
}

async function forceTerminateProcess(pid) {
  try {
    process.kill(pid, "SIGKILL");
  } catch (error) {
    if (error?.code !== "ESRCH") throw error;
  }
}

async function assertProcessGone(pid) {
  assert.ok(Number.isSafeInteger(pid) && pid > 0);
  const deadline = Date.now() + 2_000;
  while (Date.now() < deadline) {
    try {
      process.kill(pid, 0);
    } catch (error) {
      if (error?.code === "ESRCH") return;
      throw error;
    }
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  assert.fail(`process ${pid} remained alive after tree cleanup`);
}
