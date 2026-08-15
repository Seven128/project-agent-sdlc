import { mkdir } from "node:fs/promises";
import path from "node:path";
import { FormalProcessSupervisor } from "./formal_process_supervisor.mjs";
import {
  FORMAL_EVIDENCE_CAPACITY,
  REAL_PROCESS_SCHEMAS,
} from "./long_task_real_process_schema_policy.mjs";
import { validateFormalScenarioCatalog } from "./long_task_formal_total_cost_scenarios.mjs";
import { validateFormalCollectorCatalog } from "./long_task_formal_total_cost_collectors.mjs";
import { validateControlledIncidentBundle } from "./long_task_formal_total_cost_incident.mjs";
import { validateFormalPriceSources } from "./long_task_formal_total_cost_prices.mjs";
import { validateFormalPrecollectionBinding } from "./long_task_formal_total_cost_precollection.mjs";
import { validateFormalRedactionRules } from "./long_task_formal_total_cost_source_bundle.mjs";
import { expectedFormalEvidenceKeys } from "./long_task_formal_total_cost_events.mjs";
import { pairIds } from "./long_task_formal_total_cost_shared.mjs";
import {
  formalPairRepeat,
  maximumFormalTimestamp,
  minimumFormalTimestamp,
  writeFormalJson,
} from "./long_task_formal_collection_io.mjs";
import { collectFormalScenarioExecution } from "./long_task_formal_scenario_collection.mjs";

export { collectFormalScenarioExecution } from "./long_task_formal_scenario_collection.mjs";

export async function collectFormalTotalCostArtifacts({
  runSetRoot,
  runSetId,
  runs,
  preparedByVariant,
  precollection,
  accountingPolicy,
  accountingPolicyIdentity,
  interactionRecorder,
  supervisorFactory = () => new FormalProcessSupervisor(),
}) {
  assertCollectionDependencies(precollection, interactionRecorder);
  const resolvedRoot = path.resolve(runSetRoot);
  const formalRoot = path.join(resolvedRoot, "formal-evidence");
  const validationWindow = { started: Date.now(), completed: Date.now() };
  const precollectionFrozenAt = Date.parse(precollection.identity.frozen_at);
  const { scenarios, collectors } = validateCollectionSources({
    precollection,
    accountingPolicy,
    validationWindow,
    precollectionFrozenAt,
  });
  await mkdir(formalRoot, { recursive: false });
  const runByVariantRepeat = new Map(
    runs.map((run) => [`${run.variant_id}:${run.repeat}`, run]),
  );
  const supervisor = supervisorFactory();
  const collected = await collectScenarioPopulation({
    resolvedRoot,
    formalRoot,
    runSetId,
    scenarios,
    collectors,
    runByVariantRepeat,
    preparedByVariant,
    precollection,
    interactionRecorder,
    supervisor,
  });
  validateCollectedPopulation(
    collected.artifactBindings,
    expectedFormalEvidenceKeys(accountingPolicy),
  );
  const packet = buildFormalPacket({
    runSetId,
    runs,
    preparedByVariant,
    precollection,
    accountingPolicy,
    accountingPolicyIdentity,
    ...collected,
  });
  const packetPath = path.join(resolvedRoot, "formal-evidence-index.json");
  await writeFormalJson(packetPath, packet);
  return Object.freeze({
    packet_path: packetPath,
    artifact_count: collected.artifactBindings.length,
    collection_window: packet.collection_window,
  });
}

function assertCollectionDependencies(precollection, interactionRecorder) {
  if (!precollection)
    throw new Error("formal_collection_precollection_required");
  if (!interactionRecorder || typeof interactionRecorder.begin !== "function")
    throw new Error("formal_interaction_recorder_unavailable");
}

function validateCollectionSources({
  precollection,
  accountingPolicy,
  validationWindow,
  precollectionFrozenAt,
}) {
  validateFormalPrecollectionBinding({
    identity: precollection.identity,
    bundle: precollection,
    window: validationWindow,
    limits: accountingPolicy.source_bundle_limits,
  });
  validateFormalRedactionRules(
    precollection,
    validationWindow,
    precollectionFrozenAt,
  );
  validateFormalPriceSources({
    bundle: precollection,
    window: validationWindow,
    accountingPolicy,
    precollectionFrozenAt,
  });
  const scenarios = validateFormalScenarioCatalog({
    bundle: precollection,
    window: validationWindow,
    accountingPolicy,
    precollectionFrozenAt,
  });
  const collectors = validateFormalCollectorCatalog({
    bundle: precollection,
    window: validationWindow,
    precollectionFrozenAt,
    scenarios,
  });
  const incident = validateControlledIncidentBundle({
    bundle: precollection,
    scenarios,
    precollectionFrozenAt,
  });
  if (!incident.promotion_eligible)
    throw new Error("formal_collection_controlled_incident_external_pending");
  return { scenarios, collectors };
}

async function collectScenarioPopulation(options) {
  const artifactBindings = [];
  let collectionStartedAt = null;
  let collectionCompletedAt = null;
  let primaryError = null;
  try {
    for (const scenario of options.scenarios.values()) {
      const pairs = scenario.pair_count === 1 ? ["once"] : pairIds;
      for (const pairId of pairs)
        for (const variantId of scenario.comparison_variants) {
          const run = options.runByVariantRepeat.get(
            `${variantId}:${formalPairRepeat(pairId)}`,
          );
          const setup = options.preparedByVariant[variantId];
          if (!run || !setup)
            throw new Error(
              `formal_collection_run_binding:${scenario.scenario_id}:${pairId}:${variantId}`,
            );
          const result = await collectFormalScenarioExecution({
            ...options,
            run,
            setup,
            scenario,
            collector: options.collectors.get(scenario.collector_id),
            pairId,
            variantId,
          });
          collectionStartedAt = minimumFormalTimestamp(
            collectionStartedAt,
            result.started_at,
          );
          collectionCompletedAt = maximumFormalTimestamp(
            collectionCompletedAt,
            result.completed_at,
          );
          artifactBindings.push({
            evidence_key: result.evidence_key,
            event_path: result.event_path,
          });
        }
    }
  } catch (error) {
    primaryError = error;
  } finally {
    try {
      await options.supervisor.close();
    } catch (error) {
      if (primaryError) primaryError.cause ??= error;
      else primaryError = error;
    }
  }
  if (primaryError) throw primaryError;
  artifactBindings.sort((left, right) =>
    left.evidence_key.localeCompare(right.evidence_key),
  );
  return { artifactBindings, collectionStartedAt, collectionCompletedAt };
}

function validateCollectedPopulation(artifactBindings, expectedKeys) {
  if (
    artifactBindings.length !==
      FORMAL_EVIDENCE_CAPACITY.expected_execution_count ||
    new Set(artifactBindings.map((item) => item.evidence_key)).size !==
      expectedKeys.size ||
    artifactBindings.some((item) => !expectedKeys.has(item.evidence_key))
  )
    throw new Error("formal_collection_evidence_population");
}

function buildFormalPacket(options) {
  const {
    runSetId,
    runs,
    preparedByVariant,
    precollection,
    accountingPolicy,
    accountingPolicyIdentity,
    artifactBindings,
    collectionStartedAt,
    collectionCompletedAt,
  } = options;
  return {
    schema_version:
      REAL_PROCESS_SCHEMAS.FORMAL_TOTAL_COST_EVIDENCE_PACKET_SCHEMA,
    run_set_id: runSetId,
    created_at: new Date().toISOString(),
    collection_window: {
      started_at: collectionStartedAt,
      completed_at: collectionCompletedAt,
    },
    accounting_policy_identity: accountingPolicyIdentity,
    precollection_identity_sha256: precollection.identity.identity_sha256,
    candidate_identities: ["a", "b", "c"].map((variantId) => {
      const setup = preparedByVariant[variantId].record;
      return {
        variant_id: variantId,
        commit: setup.commit,
        tree: setup.tree,
        package_version: setup.package_version,
        package_sha256: setup.package_sha256,
      };
    }),
    run_bindings: runs
      .map((run) => {
        const setup = preparedByVariant[run.variant_id].record;
        return {
          run_id: run.run_id,
          variant_id: run.variant_id,
          repeat: run.repeat,
          candidate_commit: run.candidate_identity.commit,
          candidate_tree: run.candidate_identity.tree,
          package_version: setup.package_version,
          package_sha256: setup.package_sha256,
        };
      })
      .sort((left, right) => left.run_id.localeCompare(right.run_id)),
    artifact_bindings: artifactBindings,
    retention_policy: accountingPolicy.retention,
  };
}
