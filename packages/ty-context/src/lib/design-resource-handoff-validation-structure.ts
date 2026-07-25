import type { DesignResourceHandoffV1 } from "./design-resource-handoff-types.js";
import {
  invalidDesignResourceHandoff,
  requireKnownDesignResourceRef,
  requireNonemptyDesignResourceValues,
  requireUniqueDesignResourceValues,
} from "./design-resource-handoff-validation-primitives.js";

export function validateDesignResourceScope(
  handoff: DesignResourceHandoffV1,
): void {
  const surfaceStableKeys = new Set(
    handoff.subjects
      .filter((subject) => subject.kind === "surface")
      .flatMap((subject) => subject.stable_keys),
  );
  for (const surfaceKey of handoff.scope.surface_keys)
    if (!surfaceStableKeys.has(surfaceKey))
      invalidDesignResourceHandoff("scope_surface_subject_missing", surfaceKey);
}

export function validateDesignResourceConditions(
  handoff: DesignResourceHandoffV1,
): void {
  for (const condition of handoff.conditions) {
    for (const [name, values] of [
      ["modes", condition.modes],
      ["states", condition.states],
      ["content_cases", condition.content_cases],
      ["input_methods", condition.input_methods],
    ] as const) {
      requireNonemptyDesignResourceValues(
        values,
        `condition_${name}_required:${condition.key}`,
      );
      requireUniqueDesignResourceValues(
        values,
        `condition_${name}_duplicate:${condition.key}`,
      );
    }
  }
}

export function validateDesignResourceSubjects(
  handoff: DesignResourceHandoffV1,
  targets: Map<string, DesignResourceHandoffV1["targets"][number]>,
): void {
  const stableKeys = new Set<string>();
  for (const subject of handoff.subjects) {
    requireNonemptyDesignResourceValues(
      subject.stable_keys,
      `subject_stable_keys_required:${subject.key}`,
    );
    requireUniqueDesignResourceValues(
      subject.stable_keys,
      `subject_stable_key_duplicate:${subject.key}`,
    );
    requireNonemptyDesignResourceValues(
      subject.target_refs,
      `subject_target_refs_required:${subject.key}`,
    );
    requireUniqueDesignResourceValues(
      subject.target_refs,
      `subject_target_ref_duplicate:${subject.key}`,
    );
    for (const ref of subject.target_refs)
      requireKnownDesignResourceRef(targets, ref, "target");
    for (const stableKey of subject.stable_keys) {
      if (stableKeys.has(stableKey))
        invalidDesignResourceHandoff("subject_stable_key_ambiguous", stableKey);
      stableKeys.add(stableKey);
    }
  }
}

export function validateDesignResourceTargets(
  handoff: DesignResourceHandoffV1,
  resources: Map<string, DesignResourceHandoffV1["resources"][number]>,
  conditions: Map<string, DesignResourceHandoffV1["conditions"][number]>,
): void {
  for (const target of handoff.targets) {
    requireNonemptyDesignResourceValues(
      target.resource_refs,
      `target_resource_refs_required:${target.key}`,
    );
    requireNonemptyDesignResourceValues(
      target.condition_refs,
      `target_condition_refs_required:${target.key}`,
    );
    requireUniqueDesignResourceValues(
      target.resource_refs,
      `target_resource_ref_duplicate:${target.key}`,
    );
    requireUniqueDesignResourceValues(
      target.condition_refs,
      `target_condition_ref_duplicate:${target.key}`,
    );
    for (const ref of target.resource_refs)
      requireKnownDesignResourceRef(resources, ref, "resource");
    for (const ref of target.condition_refs)
      requireKnownDesignResourceRef(conditions, ref, "condition");
    validateTargetSourceProfile(target, resources);
    const expectedRole =
      target.interpretation === "exact_target" ? "exact_target" : "constraint";
    if (
      !target.resource_refs.some(
        (ref) => resources.get(ref)?.role === expectedRole,
      )
    )
      invalidDesignResourceHandoff(
        "target_interpretation_resource_role_missing",
        `${target.key}:${expectedRole}`,
      );
  }
}

function validateTargetSourceProfile(
  target: DesignResourceHandoffV1["targets"][number],
  resources: Map<string, DesignResourceHandoffV1["resources"][number]>,
): void {
  const profile = target.source_profile;
  requireKnownDesignResourceRef(
    resources,
    profile.entry_resource_ref,
    "source_profile_entry_resource",
  );
  requireUniqueDesignResourceValues(
    profile.dependency_resource_refs,
    `source_profile_dependency_resource_ref_duplicate:${target.key}`,
  );
  for (const ref of profile.dependency_resource_refs)
    requireKnownDesignResourceRef(
      resources,
      ref,
      "source_profile_dependency_resource",
    );
  if (profile.dependency_resource_refs.includes(profile.entry_resource_ref))
    invalidDesignResourceHandoff(
      "source_profile_entry_repeated_as_dependency",
      target.key,
    );
  const declared = [
    profile.entry_resource_ref,
    ...profile.dependency_resource_refs,
  ].sort();
  const targetResources = [...target.resource_refs].sort();
  if (
    declared.length !== targetResources.length ||
    declared.some((ref, index) => ref !== targetResources[index])
  )
    invalidDesignResourceHandoff(
      "source_profile_resource_closure_mismatch",
      target.key,
    );
  const entry = resources.get(profile.entry_resource_ref)!;
  if (
    profile.kind === "implementation_web" &&
    !["text/html", "application/xhtml+xml"].includes(entry.media_type)
  )
    invalidDesignResourceHandoff(
      "implementation_web_entry_media_type_invalid",
      `${target.key}:${entry.media_type}`,
    );
  if (
    profile.kind === "implementation_app" &&
    !(
      entry.media_type.startsWith("text/") ||
      [
        "application/json",
        "application/javascript",
        "application/yaml",
        "application/x-yaml",
      ].includes(entry.media_type)
    )
  )
    invalidDesignResourceHandoff(
      "implementation_app_entry_media_type_invalid",
      `${target.key}:${entry.media_type}`,
    );
}

export function validateDesignResourceEvidence(
  handoff: DesignResourceHandoffV1,
  resources: Map<string, unknown>,
  conditions: Map<string, unknown>,
): void {
  for (const item of handoff.evidence) {
    requireKnownDesignResourceRef(resources, item.resource_ref, "resource");
    requireNonemptyDesignResourceValues(
      item.condition_refs,
      `evidence_condition_refs_required:${item.key}`,
    );
    requireUniqueDesignResourceValues(
      item.condition_refs,
      `evidence_condition_ref_duplicate:${item.key}`,
    );
    for (const ref of item.condition_refs)
      requireKnownDesignResourceRef(conditions, ref, "condition");
  }
}
