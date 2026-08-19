import { validateDelegationAdmissionPolicy, validateDelegationTrackPolicySource } from "./delegation-admission-policy.mjs";
import { validateDelegationBenchmarkInputs } from "./delegation-benchmark-inputs.mjs";
import {
  delegationWorkflowGuidanceSource,
  resolveDelegationGuidance,
} from "./delegation-guidance.mjs";
import { loadExperimentSet, loadTask, sha256 } from "./shared.mjs";

const BUNDLE_RELATIVE =
  "examples/delivery-benchmark/mechanism/guidance/long-task-delegation-v1";

export async function delegationGuidanceMetrics(metadata, experiments) {
  try {
    const currentExperiments = experiments ?? (await loadExperimentSet());
    const variantConfig = currentExperiments.variants?.[metadata.variant_id];
    const trackConfig = currentExperiments.tracks?.["long-task-delegation"];
    const resolved = await resolveDelegationGuidance(metadata.variant_id, {
      variantConfig,
    });
    validateDelegationAdmissionPolicy(resolved.manifest);
    const admissionPolicy = validateDelegationTrackPolicySource(
      trackConfig,
      resolved.manifest,
      BUNDLE_RELATIVE,
    );
    const actual = metadata.workflow_guidance_source ?? {};
    const currentSource = delegationWorkflowGuidanceSource(resolved);
    return {
      correct:
        JSON.stringify(actual) === JSON.stringify(currentSource) &&
        JSON.stringify(metadata.delegation_admission_policy) ===
          JSON.stringify(admissionPolicy) &&
        metadata.delegation_admission_policy_sha256 ===
          resolved.manifest.admission_policy_sha256,
      content_bundle_sha256: actual.content_bundle_sha256 ?? null,
      required_content_bundle_sha256: resolved.contentDigest,
      admission_policy: admissionPolicy,
      admission_policy_sha256: resolved.manifest.admission_policy_sha256,
      current_workflow_guidance_source: currentSource,
    };
  } catch (error) {
    return unavailable(error);
  }
}

export async function delegationInputMetrics(
  metadata,
  task,
  experiments,
  admissionPolicy,
) {
  try {
    const currentExperiments = experiments ?? (await loadExperimentSet());
    const currentTask = task ?? (await loadTask(metadata.task_id));
    const variant = currentExperiments.variants?.[metadata.variant_id];
    const track = currentExperiments.tracks?.["long-task-delegation"];
    const current = await validateDelegationBenchmarkInputs(
      metadata.benchmark_inputs,
    );
    return {
      correct:
        variant?.track === "long-task-delegation" &&
        variant.role === metadata.variant_role &&
        metadata.track === "long-task-delegation" &&
        track?.variants?.includes(metadata.variant_id) &&
        track?.tasks?.includes(metadata.task_id) &&
        metadata.baseline_commit === admissionPolicy?.baseline_commit &&
        JSON.stringify(currentTask) === JSON.stringify(metadata.task) &&
        JSON.stringify(current) ===
          JSON.stringify(metadata.benchmark_inputs) &&
        metadata.benchmark_inputs_sha256 === sha256(current) &&
        metadata.experiment_set_sha256 === sha256(currentExperiments),
      records: current,
      sha256: sha256(current),
    };
  } catch (error) {
    return unavailable(error);
  }
}

function unavailable(error) {
  return {
    correct: false,
    reason: error instanceof Error ? error.message : String(error),
  };
}
