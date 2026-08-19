import {
  changeScopeMetrics,
  contextMetrics,
  contextUpdateMetrics,
  handoffMetrics,
  runHiddenProbe,
  runVerification,
} from "./metrics.mjs";
import { delegationEvidenceMetrics } from "./delegation-evidence.mjs";
import { delegationHarnessIdentityMetrics } from "./delegation-harness-identity.mjs";
import { delegationRunInputMetrics } from "./delegation-run-inputs.mjs";
import {
  delegationGuidanceMetrics,
  delegationInputMetrics,
} from "./delegation-score-inputs.mjs";
import { delegationSourceIdentityMetrics } from "./delegation-source-identity.mjs";
import { implementationCompleted } from "./score-common.mjs";
import { MECHANISM_ROOT, gitValue, sha256, treeHash } from "./shared.mjs";
import path from "node:path";

export async function scoreDelegationRun(context) {
  const {
    options,
    runDir,
    metadata,
    experiments,
    task,
    gold,
    agentResult,
    changed,
    agentIdentityCorrect,
  } = context;
  const probe = await runHiddenProbe(runDir, task.probe);
  const delegationQuality = delegationQualityMetrics(probe, gold);
  const delegationGuidance = await delegationGuidanceMetrics(
    metadata,
    experiments,
  );
  const delegationInputs = await delegationInputMetrics(
    metadata,
    task,
    experiments,
    delegationGuidance.admission_policy,
  );
  const delegationHarnessIdentity = await delegationHarnessIdentityMetrics(
    metadata.harness_runtime_identity,
    runDir,
  );
  const delegationSourceIdentity = await delegationSourceIdentityMetrics(
    metadata.source_checkout_candidate,
  );
  const delegationRunInputs = await currentRunInputMetrics(context, {
    delegationGuidance,
    delegationInputs,
    delegationHarnessIdentity,
    delegationSourceIdentity,
  });
  const verification = runVerification(runDir, gold.required_verification);
  const updates = await contextUpdateMetrics(runDir, gold, changed);
  const contextMetricsResult = await contextMetrics(
    runDir,
    gold,
    agentResult,
    null,
  );
  const changeScope = changeScopeMetrics(changed, gold);
  const reportedDeltaCorrect =
    agentResult.context_delta === gold.expected_context_delta;
  const conformance = agentResult.conformance_completed === true;
  const actualComplete = implementationCompleted({
    probe,
    verification,
    updates,
    reportedDeltaCorrect,
    changeScope,
    routeCorrect: agentResult.selected_workflow_route === "long_task",
    gold,
    conformance,
    context: contextMetricsResult,
  });
  const handoff = handoffMetrics(agentResult, actualComplete, "long_task");
  const delegation = await delegationEvidenceMetrics(
    options.trace,
    { metadata, gold, changedPaths: changed, runDir },
    {
      hostProvenance: options.hostProvenance,
      expectedProfile:
        delegationGuidance.current_workflow_guidance_source
          ?.profile_expectation,
    },
  );
  return {
    hidden_quality: probe,
    delegation_quality: delegationQuality,
    delegation_guidance: delegationGuidance,
    delegation_inputs: delegationInputs,
    delegation_source_identity: delegationSourceIdentity,
    delegation_harness_identity: delegationHarnessIdentity,
    delegation_run_inputs: delegationRunInputs,
    native_verification: verification,
    context_update: updates,
    change_scope: changeScope,
    handoff,
    delegation,
    reported_context_delta_correct: reportedDeltaCorrect,
    conformance_completed: conformance,
    hard_gate_passed:
      agentIdentityCorrect &&
      actualComplete &&
      delegationQuality.classification_complete &&
      delegationGuidance.correct &&
      delegationInputs.correct &&
      delegationSourceIdentity.correct &&
      delegationHarnessIdentity.correct &&
      delegationRunInputs.correct &&
      handoff.false_complete_free &&
      handoff.honest_handoff,
    evidence_sufficient: delegation.pair_eligible === true,
  };
}

async function currentRunInputMetrics(context, current) {
  const { runDir, metadata, experiments } = context;
  const fixtureSha256 = await treeHash(path.join(MECHANISM_ROOT, "fixture"));
  return delegationRunInputMetrics(metadata.run_input_identity, {
    ...metadata,
    baseline_commit:
      current.delegationGuidance.admission_policy?.baseline_commit,
    fixture_sha256: fixtureSha256,
    experiment_set_sha256: sha256(experiments),
    benchmark_inputs_sha256: current.delegationInputs.sha256,
    workflow_guidance_source:
      current.delegationGuidance.current_workflow_guidance_source,
    delegation_admission_policy_sha256:
      current.delegationGuidance.admission_policy_sha256,
    harness_runtime_identity: current.delegationHarnessIdentity.current,
    source_checkout_candidate: current.delegationSourceIdentity.current,
    initial_tree: gitValue(runDir, [
      "rev-parse",
      `${metadata.initial_commit}^{tree}`,
    ]),
  });
}

function delegationQualityMetrics(probe, gold) {
  const groups = gold.delegation_quality ?? {};
  const classifications = [
    ["critical", groups.critical_check_ids],
    ["major", groups.major_check_ids],
    ["must_allow", groups.must_allow_check_ids],
  ];
  const checks = Array.isArray(probe.checks) ? probe.checks : [];
  const byId = new Map(checks.map((item) => [item.id, item]));
  const classified = classifications.flatMap(([, ids]) => ids ?? []);
  const complete =
    classified.length === new Set(classified).size &&
    classified.length === checks.length &&
    classified.every((id) => byId.has(id));
  const failures = Object.fromEntries(
    classifications.map(([name, ids]) => [
      name,
      (ids ?? []).filter((id) => byId.get(id)?.passed !== true).length,
    ]),
  );
  return {
    classification_complete: complete,
    critical_defect_count: failures.critical,
    major_defect_count: failures.major,
    must_allow_failure_count: failures.must_allow,
    must_allow_passed: complete && failures.must_allow === 0,
  };
}
