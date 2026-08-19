import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  buildPacketGold,
  isSha256,
  requireValue,
  validateAttribution,
  validateCosts,
  validateLifecycle,
  validatePackets,
} from "./delegation-evidence-validation.mjs";
import { classifyHostProvenance, validateHostObservations } from "./delegation-evidence-host.mjs";
import { evaluateDelegationExecutionPolicy } from "./delegation-evidence-policy.mjs";
import { evaluateDelegationSuitability } from "./delegation-policy-evaluation.mjs";
import { gitValue, sha256 } from "./shared.mjs";

const SCHEMA = "tiny-context-long-task-delegation-host-trace-v1";

export async function delegationEvidenceMetrics(tracePath, input, options = {}) {
  if (!tracePath) return unavailable("delegation_host_trace_not_supplied");
  let trace;
  try {
    trace = JSON.parse(await readFile(path.resolve(tracePath), "utf8"));
  } catch {
    return unavailable("delegation_host_trace_unreadable");
  }
  if (trace?.schema_version !== SCHEMA) return unavailable("delegation_host_trace_schema_invalid");

  const issues = [];
  const metadata = input.metadata;
  const guidance = metadata.workflow_guidance_source ?? {};
  const expectedIdentity = {
    task_id: metadata.task_id,
    track: metadata.track,
    variant_id: metadata.variant_id,
    variant_role: metadata.variant_role,
    pair_id: metadata.pair_id,
    replicate: metadata.replicate,
    initial_commit: metadata.initial_commit,
    initial_tree: metadata.initial_tree,
    baseline_commit: metadata.baseline_commit,
    fixture_sha256: metadata.fixture_sha256,
    experiment_set_sha256: metadata.experiment_set_sha256,
    run_input_identity_sha256: metadata.run_input_identity?.sha256,
    delegation_admission_policy_sha256:
      metadata.delegation_admission_policy_sha256,
    harness_runtime_identity_sha256:
      metadata.harness_runtime_identity?.identity_sha256,
    requested_parent_model: metadata.model,
    requested_parent_reasoning: metadata.reasoning,
    requested_provider: metadata.provider,
    guidance_content_bundle_sha256: guidance.content_bundle_sha256,
    guidance_provenance_sha256: guidance.guidance_provenance_sha256,
    profile_content_sha256: guidance.profile_content_sha256,
    hook_content_sha256: guidance.hook_content_sha256,
    benchmark_inputs_sha256: metadata.benchmark_inputs_sha256,
    source_checkout_commit: metadata.source_checkout_candidate?.head_commit,
    source_checkout_tree: metadata.source_checkout_candidate?.head_tree,
    source_checkout_working_tree_digest:
      metadata.source_checkout_candidate?.working_tree?.digest,
  };
  const expectedIdentityComplete =
    [
      expectedIdentity.task_id,
      expectedIdentity.track,
      expectedIdentity.variant_id,
      expectedIdentity.variant_role,
      expectedIdentity.pair_id,
      expectedIdentity.requested_parent_model,
      expectedIdentity.requested_parent_reasoning,
      expectedIdentity.requested_provider,
    ].every(
      (value) => typeof value === "string" && value.length > 0,
    ) &&
      Number.isInteger(expectedIdentity.replicate) &&
      expectedIdentity.replicate > 0 &&
      /^[0-9a-f]{40}$/u.test(expectedIdentity.initial_commit ?? "") &&
      /^[0-9a-f]{40}$/u.test(expectedIdentity.initial_tree ?? "") &&
      /^[0-9a-f]{40}$/u.test(expectedIdentity.baseline_commit ?? "") &&
      /^[0-9a-f]{40}$/u.test(expectedIdentity.source_checkout_commit ?? "") &&
      /^[0-9a-f]{40}$/u.test(expectedIdentity.source_checkout_tree ?? "") &&
      [
        expectedIdentity.guidance_content_bundle_sha256,
        expectedIdentity.guidance_provenance_sha256,
        expectedIdentity.profile_content_sha256,
        expectedIdentity.hook_content_sha256,
        expectedIdentity.benchmark_inputs_sha256,
        expectedIdentity.fixture_sha256,
        expectedIdentity.experiment_set_sha256,
        expectedIdentity.run_input_identity_sha256,
        expectedIdentity.delegation_admission_policy_sha256,
        expectedIdentity.harness_runtime_identity_sha256,
        expectedIdentity.source_checkout_working_tree_digest,
      ].every(isSha256);
  requireValue(
    expectedIdentityComplete,
    "run_identity_expected_incomplete",
    issues,
  );
  const runIdentityBound =
    expectedIdentityComplete &&
    Object.entries(expectedIdentity).every(([key, value]) => trace.run_identity?.[key] === value);
  for (const [key, value] of Object.entries(expectedIdentity))
    requireValue(trace.run_identity?.[key] === value, `run_identity_mismatch:${key}`, issues);

  const traceDigest = sha256(trace);
  const provenance = classifyHostProvenance(options.hostProvenance, traceDigest);
  if (!provenance.verified) issues.push("host_provenance_unverified");

  const finalHead = gitValue(input.runDir, ["rev-parse", "HEAD"]);
  const finalTree = gitValue(input.runDir, ["rev-parse", "HEAD^{tree}"]);
  const initialTree = gitValue(input.runDir, ["rev-parse", `${metadata.initial_commit}^{tree}`]);
  const clean = gitValue(input.runDir, ["status", "--short"]) === "";
  const finalHeadBound = trace.candidate_after?.head_commit === finalHead;
  const finalTreeBound = trace.candidate_after?.tree === finalTree;
  const preSpawnBound =
    trace.candidate_before?.head_commit === metadata.initial_commit &&
    trace.candidate_before?.tree === initialTree &&
    trace.candidate_before?.clean === true &&
    isSha256(trace.candidate_before?.working_tree_digest);
  requireValue(clean, "final_candidate_not_clean", issues);
  requireValue(finalHeadBound, "final_head_mismatch", issues);
  requireValue(finalTreeBound, "final_tree_mismatch", issues);
  requireValue(
    preSpawnBound,
    "pre_spawn_candidate_identity_incomplete",
    issues,
  );

  const lifecycle = validateLifecycle(trace.lifecycle, finalHead, finalTree, issues);
  const packetGold = buildPacketGold(input.gold.delegation_packets, issues);
  const packets = Array.isArray(trace.packets) ? trace.packets : [];
  validatePackets(packets, packetGold, issues);

  const {
    profileAvailable,
    availableSlots,
    capacityObserved,
    workers,
    effectiveIssues,
    workerLifecycle,
    tier,
    hostEnvironment,
    startingCapacity,
    effectiveParentClaimMatched,
  } = validateHostObservations(
    trace.host,
    {
      ...guidance,
      profile_expectation:
        options.expectedProfile ?? guidance.profile_expectation,
    },
    {
      model: metadata.model,
      reasoning: metadata.reasoning,
      provider: metadata.provider,
    },
    issues,
  );
  const suitability = evaluateDelegationSuitability(
    [...packetGold.values()],
    { profileAvailable, capacityObserved, availableSlots },
  );
  const qualifying =
    suitability.qualifying && packets.length === packetGold.size;

  const attribution = validateAttribution(
    workers,
    trace.host?.parent_changed_paths,
    packetGold,
    input.changedPaths,
    issues,
  );
  const candidate = metadata.variant_role === "candidate";
  const soloReason = trace.solo_reason_id ?? null;
  const executionPolicy = evaluateDelegationExecutionPolicy({
    candidate,
    qualifying,
    workers,
    packetGold,
    soloReason,
    suitability,
    workerLifecycle,
    parentChangedPaths: trace.host?.parent_changed_paths,
  });
  issues.push(...executionPolicy.issues);
  if (capacityObserved && workers.length > availableSlots) {
    executionPolicy.policy_conformant = false;
    issues.push("worker_count_exceeds_observed_capacity");
  }

  const costs = validateCosts(trace.costs, workers, issues);
  const formalFailureReasons = classifyFormalFailures(issues);
  const pairEligible = qualifying && issues.length === 0;
  const effectiveProfileClaimMatched = workers.length > 0 && effectiveIssues.length === 0;
  const serviceTier = provenance.verified
    ? tier
    : {
        status: "service_tier_inheritance_unverified",
        supplied_claim_status: tier.status,
      };
  return {
    available: true,
    schema_version: SCHEMA,
    trace_sha256: traceDigest,
    provenance,
    run_identity_bound: runIdentityBound,
    candidate_binding: {
      final_head: finalHead,
      final_tree: finalTree,
      clean,
      bound: clean && finalHeadBound && finalTreeBound && preSpawnBound && lifecycle.final_gate_bound,
    },
    lifecycle,
    qualifying_packet_count: suitability.qualifying_packet_ids.length,
    qualifying_predicate_satisfied: qualifying,
    delegation_suitability: suitability,
    observed_worker_count: workers.length,
    policy_conformant: executionPolicy.policy_conformant,
    effective_profile_verified: provenance.verified && effectiveProfileClaimMatched,
    effective_profile_claim_matched: effectiveProfileClaimMatched,
    effective_parent_verified:
      provenance.verified && effectiveParentClaimMatched,
    effective_parent_claim_matched: effectiveParentClaimMatched,
    host_environment: hostEnvironment,
    starting_capacity: {
      ...startingCapacity,
      available_slots: capacityObserved ? availableSlots : null,
    },
    service_tier: serviceTier,
    attribution,
    worker_lifecycle: workerLifecycle,
    costs,
    solo_reason_id: soloReason,
    host_instability:
      !provenance.verified ||
      !effectiveParentClaimMatched ||
      serviceTier.status === "service_tier_inheritance_unverified",
    formal_failure_observed: formalFailureReasons.length > 0,
    formal_failure_reasons: formalFailureReasons,
    pair_eligible: pairEligible,
    ineligible_reasons: [...new Set(issues)].sort(),
  };
}

function classifyFormalFailures(issues) {
  const nonFormal = new Set([
    "host_provenance_unverified",
    "host_capacity_unavailable",
    "host_delegation_decision_time_unavailable",
    "delegation_costs_unavailable",
    "child_token_total_mismatch",
  ]);
  return [...new Set(issues.filter((reason) => !nonFormal.has(reason)))].sort();
}

function unavailable(reason) {
  return {
    available: false,
    provenance: { verified: false, status: "host_provenance_unverified" },
    service_tier: { status: "service_tier_inheritance_unverified" },
    pair_eligible: false,
    ineligible_reasons: [reason],
  };
}
