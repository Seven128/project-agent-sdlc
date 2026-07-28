import type {
  DeliveryDesignAcceptanceBlockerV2,
  DeliveryDesignTargetV2,
  DeliverySurfaceBindingV2,
} from "./long-task-ui-surface-types.js";
import { DESIGN_RESOURCE_VERIFICATION_METHODS } from "./design-resource-handoff-types.js";
import { EXECUTION_TARGET_CAPABILITIES } from "./execution-target-capabilities.js";
import {
  array,
  fail,
  key,
  literal,
  object,
  repositoryFile,
  repositoryFiles,
  string,
  strings,
} from "./long-task-shape-primitives.js";

export function parseSurfaceBindings(
  value: unknown,
  label: string,
): DeliverySurfaceBindingV2[] {
  return array(value, label).map((item, index) => {
    const itemLabel = `${label}[${index}]`;
    const row = object(item, itemLabel, [
      "key",
      "surface_ref",
      "target_ref",
      "control_refs",
      "route_binding_ref",
      "component_binding_refs",
      "root_journey_check_ref",
      "entry_action_ref",
      "design_targets",
      "acceptance_blockers",
    ]);
    return {
      key: key(row.key, `${itemLabel}.key`),
      surface_ref: string(row.surface_ref, `${itemLabel}.surface_ref`),
      target_ref: key(row.target_ref, `${itemLabel}.target_ref`),
      control_refs: keys(row.control_refs, `${itemLabel}.control_refs`),
      route_binding_ref: key(
        row.route_binding_ref,
        `${itemLabel}.route_binding_ref`,
      ),
      component_binding_refs: keys(
        row.component_binding_refs,
        `${itemLabel}.component_binding_refs`,
      ),
      root_journey_check_ref: key(
        row.root_journey_check_ref,
        `${itemLabel}.root_journey_check_ref`,
      ),
      entry_action_ref: key(
        row.entry_action_ref,
        `${itemLabel}.entry_action_ref`,
      ),
      design_targets: parseDesignTargets(
        row.design_targets,
        `${itemLabel}.design_targets`,
      ),
      acceptance_blockers: parseAcceptanceBlockers(
        row.acceptance_blockers,
        `${itemLabel}.acceptance_blockers`,
      ),
    };
  });
}

function parseDesignTargets(
  value: unknown,
  label: string,
): DeliveryDesignTargetV2[] {
  return array(value, label).map((item, index) => {
    const itemLabel = `${label}[${index}]`;
    const row = object(item, itemLabel, [
      "key",
      "interpretation",
      "source_paths",
      "condition_keys",
      "claim_refs",
      "conformance_check_ref",
      "conformance_assertion_ref",
      "verification_method_bindings",
      "actual_artifact_path",
      "comparison_artifact_path",
    ]);
    return {
      key: key(row.key, `${itemLabel}.key`),
      interpretation: literal(
        row.interpretation,
        ["exact_target", "constraint"] as const,
        `${itemLabel}.interpretation`,
      ),
      source_paths: repositoryFiles(
        row.source_paths,
        `${itemLabel}.source_paths`,
      ),
      condition_keys: keys(row.condition_keys, `${itemLabel}.condition_keys`),
      claim_refs: strings(row.claim_refs, `${itemLabel}.claim_refs`),
      conformance_check_ref: key(
        row.conformance_check_ref,
        `${itemLabel}.conformance_check_ref`,
      ),
      conformance_assertion_ref: key(
        row.conformance_assertion_ref,
        `${itemLabel}.conformance_assertion_ref`,
      ),
      verification_method_bindings: parseVerificationMethodBindings(
        row.verification_method_bindings,
        `${itemLabel}.verification_method_bindings`,
      ),
      actual_artifact_path: repositoryFile(
        row.actual_artifact_path,
        `${itemLabel}.actual_artifact_path`,
      ),
      comparison_artifact_path: repositoryFile(
        row.comparison_artifact_path,
        `${itemLabel}.comparison_artifact_path`,
      ),
    };
  });
}

function parseAcceptanceBlockers(
  value: unknown,
  label: string,
): DeliveryDesignAcceptanceBlockerV2[] {
  return array(value, label).map((item, index) => {
    const itemLabel = `${label}[${index}]`;
    const row = object(item, itemLabel, [
      "key",
      "status",
      "refs",
      "source_item_refs",
      "verification_methods",
      "required_capabilities",
      "rationale",
    ]);
    return {
      key: key(row.key, `${itemLabel}.key`),
      status: literal(
        row.status,
        ["machine_claim", "external_confirmation"] as const,
        `${itemLabel}.status`,
      ),
      refs: strings(row.refs, `${itemLabel}.refs`),
      source_item_refs: strings(
        row.source_item_refs,
        `${itemLabel}.source_item_refs`,
      ),
      verification_methods: array(
        row.verification_methods,
        `${itemLabel}.verification_methods`,
      ).map((method, methodIndex) =>
        literal(
          method,
          DESIGN_RESOURCE_VERIFICATION_METHODS,
          `${itemLabel}.verification_methods[${methodIndex}]`,
        ),
      ),
      required_capabilities: array(
        row.required_capabilities,
        `${itemLabel}.required_capabilities`,
      ).map((capability, capabilityIndex) =>
        literal(
          capability,
          EXECUTION_TARGET_CAPABILITIES,
          `${itemLabel}.required_capabilities[${capabilityIndex}]`,
        ),
      ),
      rationale: string(row.rationale, `${itemLabel}.rationale`),
    };
  });
}

function parseVerificationMethodBindings(value: unknown, label: string) {
  return array(value, label).map((item, index) => {
    const itemLabel = `${label}[${index}]`;
    const row = object(item, itemLabel, [
      "method",
      "assertion_ref",
      "evidence_artifacts",
    ]);
    return {
      method: literal(
        row.method,
        DESIGN_RESOURCE_VERIFICATION_METHODS,
        `${itemLabel}.method`,
      ),
      assertion_ref: key(row.assertion_ref, `${itemLabel}.assertion_ref`),
      evidence_artifacts: array(
        row.evidence_artifacts,
        `${itemLabel}.evidence_artifacts`,
      ).map((artifact, artifactIndex) => {
        const artifactLabel = `${itemLabel}.evidence_artifacts[${artifactIndex}]`;
        const entry = object(artifact, artifactLabel, [
          "condition_key",
          "path",
          "observation_path",
          "fact_refs",
        ]);
        return {
          condition_key: key(
            entry.condition_key,
            `${artifactLabel}.condition_key`,
          ),
          path: repositoryFile(entry.path, `${artifactLabel}.path`),
          observation_path: repositoryFile(
            entry.observation_path,
            `${artifactLabel}.observation_path`,
          ),
          fact_refs: designFactRefs(
            entry.fact_refs,
            `${artifactLabel}.fact_refs`,
          ),
        };
      }),
    };
  });
}

function keys(value: unknown, label: string): string[] {
  return array(value, label).map((item, index) =>
    key(item, `${label}[${index}]`),
  );
}

function designFactRefs(value: unknown, label: string): string[] {
  return array(value, label).map((item, index) => {
    const itemLabel = `${label}[${index}]`;
    const result = string(item, itemLabel);
    if (!/^[a-z0-9][a-z0-9._-]*$/u.test(result))
      fail(itemLabel, "must match ^[a-z0-9][a-z0-9._-]*$");
    return result;
  });
}
