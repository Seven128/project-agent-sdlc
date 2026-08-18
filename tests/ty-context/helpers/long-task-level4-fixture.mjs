import { mkdtemp, readFile, realpath, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  FORMAL_ACCOUNTING_POLICY_REPOSITORY_PATH,
  FORMAL_EVIDENCE_CAPACITY,
  FORMAL_SCENARIO_CATALOG_REPOSITORY_PATH,
  REAL_PROCESS_SCHEMAS,
} from "../../../tools/long_task_real_process_schema_policy.mjs";
import {
  canonical,
  sha256,
} from "../../../tools/long_task_real_process_roi_scoring.mjs";
import { evaluateFormalTotalCostEvidence } from "../../../tools/long_task_formal_total_cost_evidence.mjs";
import {
  buildImmutableRunArtifactIndex,
  buildRealProcessArtifactManifest,
} from "../../../tools/long_task_real_process_artifacts.mjs";
import { materializeFormalPrecollectionInputs } from "../../../tools/long_task_formal_total_cost_precollection.mjs";
import { expectedFormalEvidenceKeys } from "../../../tools/long_task_formal_total_cost_events.mjs";
import { buildLevel4FixtureSources } from "./long-task-level4-fixture-sources.mjs";
import { materializeLevel4FixtureEvents } from "./long-task-level4-fixture-events.mjs";
import {
  digest,
  toBytes,
  writeArtifact,
} from "./long-task-level4-test-utils.mjs";

const runSetId = "fixture-run-set-v4";
const defaultSourceTimeline = Object.freeze({
  catalogFrozenAt: "2026-08-16T00:00:00.000Z",
  collectorFrozenAt: "2026-08-16T00:05:00.000Z",
  pricePublishedAt: "2026-08-15T00:00:00.000Z",
  priceFrozenAt: "2026-08-16T00:10:00.000Z",
  authorizationGrantedAt: "2026-08-15T00:00:00.000Z",
  precollectionFrozenAt: "2026-08-16T00:30:00.000Z",
});

export async function createLevel4FormalEvidenceFixture(
  repositoryRoot,
  { sourceTimeline = defaultSourceTimeline } = {},
) {
  const root = await realpath(
    await mkdtemp(path.join(os.tmpdir(), "ty-level4-formal-")),
  );
  try {
    const retentionSourceBytes = Buffer.from(
      "fixture-only retention basis: 24 hours\n",
    );
    const accountingPolicy = await readFixtureAccountingPolicy(
      repositoryRoot,
      retentionSourceBytes,
    );
    const accountingPolicyIdentity = accountingIdentity(accountingPolicy);
    const catalog = JSON.parse(
      await readFile(
        path.join(
          repositoryRoot,
          ...FORMAL_SCENARIO_CATALOG_REPOSITORY_PATH.split("/"),
        ),
        "utf8",
      ),
    );
    catalog.frozen_at = sourceTimeline.catalogFrozenAt;
    const { sources, collectorRef } = buildLevel4FixtureSources({
      catalog,
      retentionSourceBytes,
      sourceTimeline,
    });
    const precollectionIdentity = buildPrecollectionIdentity(
      sources,
      sourceTimeline.precollectionFrozenAt,
    );
    const precollection = { identity: precollectionIdentity, files: sources };
    await materializeFormalPrecollectionInputs({
      runSetRoot: root,
      precollection,
    });
    const { setupByVariant, preparedByVariant } = await writeSetups(root);
    const runs = buildRuns(setupByVariant);
    const eventResult = await materializeLevel4FixtureEvents({
      root,
      runSetId,
      catalog,
      accountingPolicy,
      retention: accountingPolicy.state_storage_retention,
      precollectionIdentity,
      sources,
      collectorRef,
      setupByVariant,
      runs,
    });
    assertFixtureEventPopulation(eventResult, accountingPolicy);
    const packet = buildPacket({
      accountingPolicy,
      accountingPolicyIdentity,
      precollectionIdentity,
      setupByVariant,
      runs,
      artifactBindings: eventResult.artifactBindings,
    });
    await writeArtifact(root, "formal-evidence-index.json", packet);
    const manifest = await buildRealProcessArtifactManifest(root);
    const index = await buildImmutableRunArtifactIndex({
      runSetRoot: root,
      manifest,
    });
    const fixture = {
      root,
      packet,
      manifest,
      index,
      attackPaths: eventResult.attackPaths,
      accountingPolicy,
      accountingPolicyIdentity,
      precollection,
      preparedByVariant,
      setupByVariant,
      runs,
      runtimeTcbIdentity: eventResult.runtimeTcbIdentity,
    };
    fixture.evaluate = (runArtifactIndex = fixture.index) =>
      evaluateFormalTotalCostEvidence({
        packetPath: path.join(root, "formal-evidence-index.json"),
        accountingPolicy,
        accountingPolicyIdentity,
        runSetId,
        runs,
        setupByVariant,
        precollectionIdentity,
        runArtifactIndex,
        runtimeTcbIdentity: eventResult.runtimeTcbIdentity,
      });
    fixture.remove = () => rm(root, { recursive: true, force: true });
    return fixture;
  } catch (error) {
    await rm(root, { recursive: true, force: true });
    throw error;
  }
}

async function readFixtureAccountingPolicy(repositoryRoot, retentionBytes) {
  const policy = JSON.parse(
    await readFile(
      path.join(
        repositoryRoot,
        ...FORMAL_ACCOUNTING_POLICY_REPOSITORY_PATH.split("/"),
      ),
      "utf8",
    ),
  );
  policy.state_storage_retention = {
    scope: "this-delivery-precollection-proxy-only",
    status: "frozen_supported",
    retention_hours: 24,
    basis: "fixture-only-exact-retention-contract",
    source_sha256: digest(retentionBytes),
    universal_standard_claimed: false,
    missing_consequence: "formal_collection_fail_closed",
  };
  return policy;
}

function accountingIdentity(accountingPolicy) {
  const bytes = toBytes(accountingPolicy);
  const entry = {
    path: FORMAL_ACCOUNTING_POLICY_REPOSITORY_PATH,
    bytes: bytes.length,
    sha256: digest(bytes),
  };
  return {
    entries: [entry],
    identity_sha256: sha256(canonical([entry])),
  };
}

function buildPrecollectionIdentity(sources, frozenAt) {
  const entries = [...sources.values()]
    .map(({ entry }) => entry)
    .sort((left, right) => left.path.localeCompare(right.path));
  return {
    schema_version:
      REAL_PROCESS_SCHEMAS.FORMAL_TOTAL_COST_PRECOLLECTION_PLAN_SCHEMA,
    frozen_at: frozenAt,
    entries,
    identity_sha256: sha256(canonical({ frozen_at: frozenAt, entries })),
  };
}

async function writeSetups(root) {
  const setupByVariant = new Map();
  const preparedByVariant = {};
  for (const [index, variantId] of ["a", "b", "c"].entries()) {
    const packageBytes = Buffer.from(`package:${variantId}:0.8.15\n`);
    const record = {
      variant_id: variantId,
      commit: variantId.repeat(40),
      tree: String(index + 1).repeat(40),
      package_path: "candidate.tgz",
      package_version: "0.8.15",
      package_sha256: digest(packageBytes),
    };
    setupByVariant.set(variantId, record);
    preparedByVariant[variantId] = { record };
    await writeArtifact(
      root,
      `setup/${variantId}/${record.package_path}`,
      packageBytes,
    );
  }
  return { setupByVariant, preparedByVariant };
}

function buildRuns(setupByVariant) {
  const runs = [];
  for (const variantId of ["a", "b", "c"])
    for (let repeat = 1; repeat <= 5; repeat += 1) {
      const setup = setupByVariant.get(variantId);
      runs.push({
        run_id: `run-${variantId}-${repeat}`,
        variant_id: variantId,
        repeat,
        candidate_identity: { commit: setup.commit, tree: setup.tree },
      });
    }
  return runs;
}

function assertFixtureEventPopulation(result, accountingPolicy) {
  if (
    result.executionIndex !==
      FORMAL_EVIDENCE_CAPACITY.expected_execution_count ||
    result.artifactBindings.length !==
      expectedFormalEvidenceKeys(accountingPolicy).size
  )
    throw new Error("level4_fixture_event_population");
}

function buildPacket(options) {
  const { setupByVariant, runs } = options;
  return {
    schema_version:
      REAL_PROCESS_SCHEMAS.FORMAL_TOTAL_COST_EVIDENCE_PACKET_SCHEMA,
    run_set_id: runSetId,
    created_at: "2026-08-16T03:00:00.000Z",
    collection_window: {
      started_at: "2026-08-16T01:00:00.000Z",
      completed_at: "2026-08-16T02:00:00.000Z",
    },
    accounting_policy_identity: options.accountingPolicyIdentity,
    precollection_identity_sha256:
      options.precollectionIdentity.identity_sha256,
    candidate_identities: ["a", "b", "c"].map((variantId) => ({
      variant_id: variantId,
      commit: setupByVariant.get(variantId).commit,
      tree: setupByVariant.get(variantId).tree,
      package_version: setupByVariant.get(variantId).package_version,
      package_sha256: setupByVariant.get(variantId).package_sha256,
    })),
    run_bindings: runs.map((run) => ({
      run_id: run.run_id,
      variant_id: run.variant_id,
      repeat: run.repeat,
      candidate_commit: run.candidate_identity.commit,
      candidate_tree: run.candidate_identity.tree,
      package_version: setupByVariant.get(run.variant_id).package_version,
      package_sha256: setupByVariant.get(run.variant_id).package_sha256,
    })),
    artifact_bindings: options.artifactBindings,
    retention_policy: options.accountingPolicy.retention,
  };
}
