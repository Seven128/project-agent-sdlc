import { REAL_PROCESS_SCHEMAS } from "../../../tools/long_task_real_process_schema_policy.mjs";
import {
  canonical,
  sha256,
} from "../../../tools/long_task_real_process_roi_scoring.mjs";
import {
  deriveFormalInvocationId,
} from "../../../tools/long_task_formal_total_cost_execution.mjs";
import { formalEvidenceKey } from "../../../tools/long_task_formal_total_cost_events.mjs";
import {
  digest,
  formalRefs,
  writeArtifact,
} from "./long-task-level4-test-utils.mjs";
import {
  buildFixtureExecution,
  fixtureProcessCompletedAt,
  fixtureRuntimeTcbIdentity,
  writeFixtureBaseArtifacts,
  writeFixtureProcessAccounting,
  writeFixtureProviderArtifacts,
  writeFixtureStateArtifacts,
} from "./long-task-level4-fixture-measurements.mjs";

export async function materializeLevel4FixtureEvents(options) {
  const runtimeTcbIdentity = fixtureRuntimeTcbIdentity();
  const artifactBindings = [];
  const attackPaths = {};
  let executionIndex = 0;
  const collectorSha256 = options.sources.get(
    options.collectorRef,
  ).entry.sha256;
  for (const scenario of options.catalog.scenarios) {
    const pairs =
      scenario.pair_count === 1
        ? ["once"]
        : ["pair-01", "pair-02", "pair-03", "pair-04", "pair-05"];
    for (const pairId of pairs)
      for (const variantId of scenario.comparison_variants) {
        const repeat = pairId === "once" ? 1 : Number(pairId.slice(-2));
        const run = options.runs.find(
          (item) => item.variant_id === variantId && item.repeat === repeat,
        );
        const setup = options.setupByVariant.get(variantId);
        const invocationId = deriveFormalInvocationId({
          schema_version: "formal-invocation-projection-v1",
          run_set_id: options.runSetId,
          run_id: run.run_id,
          pair_id: pairId,
          variant_id: variantId,
          scenario_id: scenario.scenario_id,
          collector: {
            collector_id: scenario.collector_id,
            implementation_sha256: collectorSha256,
          },
          attempt: 1,
          precollection_identity_sha256:
            options.precollectionIdentity.identity_sha256,
        });
        const refs = formalRefs(`formal-evidence/${invocationId}`);
        const output =
          scenario.kind === "purpose_benefit" && variantId === "b"
            ? Buffer.from(`wrong:${pairId}\n`)
            : options.sources.get(scenario.gold_source_ref).bytes;
        await writeFixtureBaseArtifacts(options.root, refs, {
          invocationId,
          setup,
          output,
        });
        const flags = measurementFlags(scenario);
        const dynamicArgv = [];
        let bridgeSessionSha256 = null;
        if (flags.provider) {
          const endpoint = `http://127.0.0.1:${30_000 + executionIndex}/invoke`;
          const token = digest(`token:${invocationId}`);
          bridgeSessionSha256 = sha256(
            canonical({
              invocation_id: invocationId,
              endpoint,
              token_sha256: sha256(token),
            }),
          );
          dynamicArgv.push(
            "--provider-bridge",
            endpoint,
            "--provider-bridge-token",
            token,
          );
          await writeFixtureProviderArtifacts(options.root, refs, {
            invocationId,
            bridgeSessionSha256,
            runtimeTcbIdentity,
          });
        }
        if (flags.state) {
          dynamicArgv.push("--state-root", `${refs.event.slice(0, -10)}state-root`);
          await writeFixtureStateArtifacts(options.root, refs, {
            invocationId,
            variantId,
            pairId,
            retention: options.retention,
          });
        }
        if (flags.process)
          await writeFixtureProcessAccounting(
            options.root,
            refs,
            invocationId,
            variantId,
          );
        const argv = fixedArgv(options, {
          scenario,
          setup,
          variantId,
          invocationId,
          refs,
          dynamicArgv,
        });
        const execution = buildFixtureExecution({
          root: options.root,
          scenario,
          invocationId,
          refs,
          argv,
          flags,
          runtimeTcbIdentity,
        });
        await writeArtifact(options.root, refs.event, {
          schema_version: REAL_PROCESS_SCHEMAS.FORMAL_TOTAL_COST_RAW_EVENT_SCHEMA,
          run_set_id: options.runSetId,
          run_id: run.run_id,
          pair_id: pairId,
          variant_id: variantId,
          invocation_id: invocationId,
          observed_at: fixtureProcessCompletedAt,
          subject: scenarioSubject(scenario),
          scenario_output_ref: refs.output,
          execution_record: execution,
        });
        artifactBindings.push({
          evidence_key: formalEvidenceKey({
            kind: scenario.kind,
            category: scenario.category,
            scenarioId: scenario.scenario_id,
            pairId,
            variantId,
          }),
          event_path: refs.event,
        });
        rememberAttackPaths(attackPaths, scenario, refs, pairId, variantId);
        executionIndex += 1;
      }
  }
  artifactBindings.sort((left, right) =>
    left.evidence_key.localeCompare(right.evidence_key),
  );
  return { artifactBindings, attackPaths, runtimeTcbIdentity, executionIndex };
}

function fixedArgv(options, context) {
  return [
    `inputs/formal-evidence-precollection/${options.collectorRef}`,
    "--candidate-package",
    `setup/${context.variantId}/${context.setup.package_path}`,
    "--task",
    `inputs/formal-evidence-precollection/${context.scenario.task_source_ref}`,
    "--output",
    context.refs.output,
    "--invocation-id",
    context.invocationId,
    "--scenario-id",
    context.scenario.scenario_id,
    "--variant-id",
    context.variantId,
    ...context.dynamicArgv,
  ];
}

function measurementFlags(scenario) {
  return {
    process: scenario.measurement_profile.meters.compute_ms.presence === "required",
    state:
      scenario.measurement_profile.meters.storage_byte_hour.presence === "required",
    provider: scenario.measurement_profile.provider_event.presence === "required",
  };
}

function scenarioSubject(scenario) {
  return scenario.kind === "cost"
    ? {
        kind: "cost",
        category: scenario.category,
        scenario_id: scenario.scenario_id,
        stratum: scenario.stratum,
      }
    : {
        kind: "purpose_benefit",
        scenario_id: scenario.scenario_id,
        stratum: scenario.stratum,
      };
}

function rememberAttackPaths(paths, scenario, refs, pairId, variantId) {
  if (!paths.runtimeEvent && scenario.category === "runtime")
    Object.assign(paths, {
      runtimeEvent: refs.event,
      human: refs.human,
      candidateObservation: refs.candidateObservation,
      stdout: refs.stdout,
      processAccounting: refs.processAccounting,
    });
  if (!paths.provider && scenario.category === "authoring")
    Object.assign(paths, {
      provider: refs.providerEvent,
      rawPrompt: refs.rawPrompt,
    });
  if (!paths.stateLedger && scenario.category === "state")
    Object.assign(paths, {
      stateEvent: refs.event,
      stateLedger: refs.storageLedger,
      statePayload: refs.statePayload,
    });
  if (!paths.costOutput && scenario.category === "process")
    paths.costOutput = refs.output;
  if (scenario.kind === "purpose_benefit" && pairId === "pair-01") {
    if (variantId === "b") paths.incidentBOutput = refs.output;
    if (variantId === "c") paths.incidentCOutput = refs.output;
  }
}
