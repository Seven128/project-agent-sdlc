import type {
  DesignResourceHandoffConditionV1,
  DesignResourceHandoffResourceV1,
  DesignResourceHandoffSubjectV1,
  DesignResourceHandoffTargetV1,
} from "./design-resource-handoff-types.js";
import {
  contractKey,
  contractKeys,
  designResourceShapeFail,
  positiveInteger,
  stableKey,
  stableKeys,
} from "./design-resource-handoff-shape-primitives.js";
import {
  array,
  literal,
  object,
  repositoryFile,
  string,
  strings,
} from "./long-task-shape-primitives.js";

const SHA256 = /^[a-f0-9]{64}$/u;

export function parseDesignResourceHandoffResources(
  value: unknown,
): DesignResourceHandoffResourceV1[] {
  return array(value, "design_resource_handoff.resources").map(
    (item, index) => {
      const label = `design_resource_handoff.resources[${index}]`;
      const row = object(item, label, [
        "key",
        "role",
        "path",
        "media_type",
        "sha256",
        "editable_upstream",
      ]);
      const upstream = object(
        row.editable_upstream,
        `${label}.editable_upstream`,
        ["owner", "locator", "update_route"],
      );
      const digest = string(row.sha256, `${label}.sha256`);
      if (!SHA256.test(digest))
        designResourceShapeFail(
          `${label}.sha256`,
          "must be a lowercase SHA-256",
        );
      return {
        key: stableKey(row.key, `${label}.key`),
        role: literal(
          row.role,
          ["exact_target", "constraint", "supporting"] as const,
          `${label}.role`,
        ),
        path: repositoryFile(row.path, `${label}.path`),
        media_type: string(row.media_type, `${label}.media_type`),
        sha256: digest,
        editable_upstream: {
          owner: string(upstream.owner, `${label}.editable_upstream.owner`),
          locator: string(
            upstream.locator,
            `${label}.editable_upstream.locator`,
          ),
          update_route: string(
            upstream.update_route,
            `${label}.editable_upstream.update_route`,
          ),
        },
      };
    },
  );
}

export function parseDesignResourceHandoffConditions(
  value: unknown,
): DesignResourceHandoffConditionV1[] {
  return array(value, "design_resource_handoff.conditions").map(
    (item, index) => {
      const label = `design_resource_handoff.conditions[${index}]`;
      const row = object(item, label, [
        "key",
        "platform",
        "viewport",
        "modes",
        "states",
        "content_cases",
        "input_methods",
        "motion",
      ]);
      const viewport = object(row.viewport, `${label}.viewport`, [
        "width",
        "height",
        "unit",
      ]);
      return {
        key: contractKey(row.key, `${label}.key`),
        platform: string(row.platform, `${label}.platform`),
        viewport: {
          width: positiveInteger(viewport.width, `${label}.viewport.width`),
          height: positiveInteger(viewport.height, `${label}.viewport.height`),
          unit: literal(
            viewport.unit,
            ["px"] as const,
            `${label}.viewport.unit`,
          ),
        },
        modes: strings(row.modes, `${label}.modes`),
        states: strings(row.states, `${label}.states`),
        content_cases: strings(row.content_cases, `${label}.content_cases`),
        input_methods: strings(row.input_methods, `${label}.input_methods`),
        motion: literal(
          row.motion,
          ["full", "reduced", "not_applicable"] as const,
          `${label}.motion`,
        ),
      };
    },
  );
}

export function parseDesignResourceHandoffSubjects(
  value: unknown,
): DesignResourceHandoffSubjectV1[] {
  return array(value, "design_resource_handoff.subjects").map((item, index) => {
    const label = `design_resource_handoff.subjects[${index}]`;
    const row = object(item, label, [
      "key",
      "kind",
      "stable_keys",
      "target_refs",
    ]);
    return {
      key: stableKey(row.key, `${label}.key`),
      kind: literal(
        row.kind,
        [
          "surface",
          "flow",
          "region",
          "component_family",
          "control",
          "state",
          "asset",
        ] as const,
        `${label}.kind`,
      ),
      stable_keys: stableKeys(row.stable_keys, `${label}.stable_keys`),
      target_refs: contractKeys(row.target_refs, `${label}.target_refs`),
    };
  });
}

export function parseDesignResourceHandoffTargets(
  value: unknown,
): DesignResourceHandoffTargetV1[] {
  return array(value, "design_resource_handoff.targets").map((item, index) => {
    const label = `design_resource_handoff.targets[${index}]`;
    const row = object(item, label, [
      "key",
      "interpretation",
      "resource_refs",
      "condition_refs",
      "source_profile",
      "selection_basis",
    ]);
    const sourceProfile = object(
      row.source_profile,
      `${label}.source_profile`,
      ["kind", "entry_resource_ref", "dependency_resource_refs", "acquisition"],
    );
    return {
      key: contractKey(row.key, `${label}.key`),
      interpretation: literal(
        row.interpretation,
        ["exact_target", "constraint"] as const,
        `${label}.interpretation`,
      ),
      resource_refs: stableKeys(row.resource_refs, `${label}.resource_refs`),
      condition_refs: contractKeys(
        row.condition_refs,
        `${label}.condition_refs`,
      ),
      source_profile: {
        kind: literal(
          sourceProfile.kind,
          ["implementation_web", "implementation_app", "reference"] as const,
          `${label}.source_profile.kind`,
        ),
        entry_resource_ref: stableKey(
          sourceProfile.entry_resource_ref,
          `${label}.source_profile.entry_resource_ref`,
        ),
        dependency_resource_refs: stableKeys(
          sourceProfile.dependency_resource_refs,
          `${label}.source_profile.dependency_resource_refs`,
        ),
        acquisition: literal(
          sourceProfile.acquisition,
          ["complete"] as const,
          `${label}.source_profile.acquisition`,
        ),
      },
      selection_basis: string(row.selection_basis, `${label}.selection_basis`),
    };
  });
}
