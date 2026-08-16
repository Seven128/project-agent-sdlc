import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { createFormalAcquisitionRuntime } from "../../../tools/long_task_formal_acquisition_runtime.mjs";
import { collectFormalScenarioExecution } from "../../../tools/long_task_formal_scenario_collection.mjs";
import { validateFormalCollectorCatalog } from "../../../tools/long_task_formal_total_cost_collectors.mjs";
import { evaluateFormalTotalCostEvidence } from "../../../tools/long_task_formal_total_cost_evidence.mjs";
import { validateFormalScenarioCatalog } from "../../../tools/long_task_formal_total_cost_scenarios.mjs";
import {
  buildImmutableRunArtifactIndex,
  buildRealProcessArtifactManifest,
} from "../../../tools/long_task_real_process_artifacts.mjs";
import { createLevel4FormalEvidenceFixture } from "./long-task-level4-fixture.mjs";
import { buildLevel4RuntimeTcbIdentity } from "./long-task-level4-runtime-identity.mjs";

const execFileAsync = promisify(execFile);
const repositoryRoot = path.resolve(process.argv[2] ?? "");
if (process.platform !== "win32")
  throw new Error("level4_real_chain_windows_required");

const sourceAnchor = Date.now();
const fixture = await createLevel4FormalEvidenceFixture(repositoryRoot);
const checkout = await mkdtemp(
  path.join(os.tmpdir(), "ty-level4-real-chain-checkout-"),
);
let acquisitionRuntime = null;
try {
  const { runtimeTcbIdentity } = await buildLevel4RuntimeTcbIdentity(
    repositoryRoot,
    "fixture-model",
  );
  const candidate = await createCleanCandidate(checkout);
  await alignFixtureCandidate(fixture, "b", candidate, checkout);
  await alignFixtureProviderIdentity(fixture, runtimeTcbIdentity);

  const validationWindow = {
    started: sourceAnchor - 30 * 60 * 1000,
    completed: Date.now(),
  };
  const scenarios = validateFormalScenarioCatalog({
    bundle: { files: fixture.precollection.files },
    window: validationWindow,
    accountingPolicy: fixture.accountingPolicy,
    precollectionFrozenAt: Date.parse(fixture.precollection.identity.frozen_at),
  });
  const collectors = validateFormalCollectorCatalog({
    bundle: { files: fixture.precollection.files },
    window: validationWindow,
    precollectionFrozenAt: Date.parse(fixture.precollection.identity.frozen_at),
    scenarios,
  });
  const scenario = scenarios.get("fixed-runtime-task");
  const run = fixture.runs.find(
    (item) => item.variant_id === "b" && item.repeat === 1,
  );
  const binding = fixture.packet.artifact_bindings.find(
    (item) => item.evidence_key === "cost:runtime:pair-01:b",
  );
  assert(scenario && run && binding);
  const executionRoot = path.dirname(
    path.join(fixture.root, ...binding.event_path.split("/")),
  );
  await rm(executionRoot, { recursive: true });

  acquisitionRuntime = createFormalAcquisitionRuntime({
    formalInteractionStdin: true,
    runtimeTcbIdentity,
  });
  const collected = await collectFormalScenarioExecution({
    resolvedRoot: path.resolve(fixture.root),
    formalRoot: path.join(fixture.root, "formal-evidence"),
    runSetId: "fixture-run-set-v4",
    run,
    setup: fixture.preparedByVariant.b,
    scenario,
    collector: collectors.get(scenario.collector_id),
    pairId: "pair-01",
    variantId: "b",
    precollection: fixture.precollection,
    acquisitionRuntime,
    runtimeTcbIdentity,
    stateRetention: fixture.accountingPolicy.state_storage_retention,
  });
  await acquisitionRuntime.close();
  acquisitionRuntime = null;
  assert.equal(collected.event_path, binding.event_path);

  fixture.packet.collection_window = {
    started_at: minimumTimestamp(
      "2026-08-16T01:00:00.000Z",
      collected.started_at,
    ),
    completed_at: maximumTimestamp(
      "2026-08-16T02:00:00.000Z",
      collected.completed_at,
    ),
  };
  fixture.packet.created_at = new Date(
    Math.max(
      Date.now(),
      Date.parse(fixture.packet.collection_window.completed_at),
    ),
  ).toISOString();
  await writeJson(
    path.join(fixture.root, "formal-evidence-index.json"),
    fixture.packet,
  );

  const manifest = await buildRealProcessArtifactManifest(fixture.root);
  const runArtifactIndex = await buildImmutableRunArtifactIndex({
    runSetRoot: fixture.root,
    manifest,
  });
  const result = await evaluateFormalTotalCostEvidence({
    packetPath: path.join(fixture.root, "formal-evidence-index.json"),
    accountingPolicy: fixture.accountingPolicy,
    accountingPolicyIdentity: fixture.accountingPolicyIdentity,
    runSetId: "fixture-run-set-v4",
    runs: fixture.runs,
    setupByVariant: fixture.setupByVariant,
    precollectionIdentity: fixture.precollection.identity,
    runArtifactIndex,
    runtimeTcbIdentity,
  });
  const event = JSON.parse(
    (await runArtifactIndex.read(binding.event_path, "raw_event")).toString(
      "utf8",
    ),
  );
  assert.equal(result.admitted, true);
  assert.equal(result.support_complete, false);
  assert.deepEqual(result.blockers, ["controlled_incident_external_pending"]);
  assert.equal(result.accounting, null);
  assert.equal(event.execution_record.exit.descendants_cleaned, true);
  assert.equal(event.execution_record.exit.active_processes_at_result, 0);
  assert.equal(
    event.execution_record.clocks.process_monotonic_clock_id,
    "windows-stopwatch-qpc-v1",
  );
  assert.ok(
    event.execution_record.execution_record_sha256 &&
      event.execution_record.execution_id,
  );
  process.stdout.write(
    `${JSON.stringify({
      event_path: binding.event_path,
      manifest_schema: manifest.schema_version,
      indexed_files: runArtifactIndex.size,
      execution_id: event.execution_record.execution_id,
      runtime_tcb_identity_sha256: runtimeTcbIdentity.identity_sha256,
      admitted: result.admitted,
      support_complete: result.support_complete,
      blockers: result.blockers,
    })}\n`,
  );
} finally {
  if (acquisitionRuntime) await acquisitionRuntime.close().catch(() => {});
  await fixture.remove();
  await rm(checkout, { recursive: true, force: true });
}

async function createCleanCandidate(target) {
  await git(target, ["init"]);
  await git(target, ["config", "user.email", "fixture@example.invalid"]);
  await git(target, ["config", "user.name", "Fixture"]);
  await writeFile(path.join(target, "candidate.txt"), "candidate\n");
  await git(target, ["add", "candidate.txt"]);
  await git(target, ["commit", "-m", "candidate"]);
  return {
    commit: await git(target, ["rev-parse", "HEAD"]),
    tree: await git(target, ["rev-parse", "HEAD^{tree}"]),
  };
}

async function alignFixtureCandidate(
  fixtureValue,
  variantId,
  candidate,
  checkoutPath,
) {
  const setup = fixtureValue.setupByVariant.get(variantId);
  setup.commit = candidate.commit;
  setup.tree = candidate.tree;
  fixtureValue.preparedByVariant[variantId].checkout = checkoutPath;
  fixtureValue.packet.candidate_identities.find(
    (item) => item.variant_id === variantId,
  ).commit = candidate.commit;
  fixtureValue.packet.candidate_identities.find(
    (item) => item.variant_id === variantId,
  ).tree = candidate.tree;
  for (const run of fixtureValue.runs)
    if (run.variant_id === variantId) run.candidate_identity = { ...candidate };
  for (const binding of fixtureValue.packet.run_bindings)
    if (binding.variant_id === variantId) {
      binding.candidate_commit = candidate.commit;
      binding.candidate_tree = candidate.tree;
    }
  for (const binding of fixtureValue.packet.artifact_bindings) {
    if (!binding.evidence_key.endsWith(`:${variantId}`)) continue;
    const event = await readJson(fixtureValue.root, binding.event_path);
    const reference = event.execution_record.candidate_observation_ref;
    const observation = await readJson(fixtureValue.root, reference);
    observation.before.commit = candidate.commit;
    observation.before.tree = candidate.tree;
    observation.after.commit = candidate.commit;
    observation.after.tree = candidate.tree;
    await writeJson(
      path.join(fixtureValue.root, ...reference.split("/")),
      observation,
    );
  }
}

async function alignFixtureProviderIdentity(fixtureValue, runtimeTcbIdentity) {
  for (const binding of fixtureValue.packet.artifact_bindings) {
    if (!binding.evidence_key.startsWith("cost:authoring:")) continue;
    const event = await readJson(fixtureValue.root, binding.event_path);
    const reference =
      event.execution_record.measurement_refs.provider_event.artifact_ref;
    const providerEvent = await readJson(fixtureValue.root, reference);
    providerEvent.adapter_identity_sha256 =
      runtimeTcbIdentity.provider_adapter.identity_sha256;
    providerEvent.model = runtimeTcbIdentity.provider_adapter.model;
    await writeJson(
      path.join(fixtureValue.root, ...reference.split("/")),
      providerEvent,
    );
  }
}

async function readJson(root, relative) {
  return JSON.parse(
    await readFile(path.join(root, ...relative.split("/")), "utf8"),
  );
}

async function writeJson(target, value) {
  await writeFile(target, `${JSON.stringify(value, null, 2)}\n`);
}

async function git(cwd, args) {
  const { stdout } = await execFileAsync("git", args, {
    cwd,
    windowsHide: true,
    encoding: "utf8",
    timeout: 30_000,
  });
  return stdout.trim();
}

function minimumTimestamp(left, right) {
  return Date.parse(left) <= Date.parse(right) ? left : right;
}

function maximumTimestamp(left, right) {
  return Date.parse(left) >= Date.parse(right) ? left : right;
}
