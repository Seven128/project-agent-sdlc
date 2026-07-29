import type {
  DesignResourceHandoffConditionV1,
  DesignResourceHandoffResourceV1,
  DesignResourceHandoffSubjectV1,
  DesignResourceHandoffTargetV1,
} from "./design-resource-handoff-types.js";
import {
  DESIGN_RESOURCE_SUBJECT_KINDS,
  DESIGN_RESOURCE_SUBJECT_PRESENCE_KINDS,
} from "./design-resource-fact-manifest-types.js";
import {
  atomicAxisValue,
  contractKey,
  contractKeys,
  designResourceShapeFail,
  nonnegativeNumber,
  positiveInteger,
  positiveNumber,
  stableKey,
  stableKeys,
} from "./design-resource-handoff-shape-primitives.js";
import {
  array,
  literal,
  nullable,
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
        "os_version",
        "device_profile",
        "form_factor",
        "viewport",
        "orientation",
        "density",
        "safe_area",
        "window_state",
        "fold_state",
        "display_mode",
        "color_scheme",
        "locale",
        "language",
        "script",
        "direction",
        "pseudo_localization",
        "content_case",
        "data_case",
        "text_scale",
        "input_method",
        "assistive_technology",
        "motion",
        "transparency",
        "contrast",
        "bold_text",
        "button_shapes",
        "system_ui",
        "ime",
        "permission",
        "capability",
        "connectivity",
        "lifecycle",
        "custom_axes",
      ]);
      const viewport = object(row.viewport, `${label}.viewport`, [
        "key",
        "width",
        "height",
        "unit",
      ]);
      const density = object(row.density, `${label}.density`, [
        "key",
        "pixel_ratio",
      ]);
      const safeArea = object(row.safe_area, `${label}.safe_area`, [
        "key",
        "top",
        "right",
        "bottom",
        "left",
        "unit",
      ]);
      const textScale = object(row.text_scale, `${label}.text_scale`, [
        "key",
        "multiplier",
      ]);
      return {
        key: contractKey(row.key, `${label}.key`),
        platform: atomicAxisValue(row.platform, `${label}.platform`),
        os_version: atomicAxisValue(row.os_version, `${label}.os_version`),
        device_profile: atomicAxisValue(
          row.device_profile,
          `${label}.device_profile`,
        ),
        form_factor: atomicAxisValue(row.form_factor, `${label}.form_factor`),
        viewport: {
          key: atomicAxisValue(viewport.key, `${label}.viewport.key`),
          width: positiveInteger(viewport.width, `${label}.viewport.width`),
          height: positiveInteger(viewport.height, `${label}.viewport.height`),
          unit: literal(
            viewport.unit,
            ["px"] as const,
            `${label}.viewport.unit`,
          ),
        },
        orientation: atomicAxisValue(row.orientation, `${label}.orientation`),
        density: {
          key: atomicAxisValue(density.key, `${label}.density.key`),
          pixel_ratio: positiveNumber(
            density.pixel_ratio,
            `${label}.density.pixel_ratio`,
          ),
        },
        safe_area: {
          key: atomicAxisValue(safeArea.key, `${label}.safe_area.key`),
          top: nonnegativeNumber(safeArea.top, `${label}.safe_area.top`),
          right: nonnegativeNumber(safeArea.right, `${label}.safe_area.right`),
          bottom: nonnegativeNumber(
            safeArea.bottom,
            `${label}.safe_area.bottom`,
          ),
          left: nonnegativeNumber(safeArea.left, `${label}.safe_area.left`),
          unit: literal(
            safeArea.unit,
            ["px"] as const,
            `${label}.safe_area.unit`,
          ),
        },
        window_state: atomicAxisValue(
          row.window_state,
          `${label}.window_state`,
        ),
        fold_state: atomicAxisValue(row.fold_state, `${label}.fold_state`),
        display_mode: atomicAxisValue(
          row.display_mode,
          `${label}.display_mode`,
        ),
        color_scheme: atomicAxisValue(
          row.color_scheme,
          `${label}.color_scheme`,
        ),
        locale: atomicAxisValue(row.locale, `${label}.locale`),
        language: atomicAxisValue(row.language, `${label}.language`),
        script: atomicAxisValue(row.script, `${label}.script`),
        direction: literal(
          row.direction,
          ["ltr", "rtl", "not_applicable"] as const,
          `${label}.direction`,
        ),
        pseudo_localization: atomicAxisValue(
          row.pseudo_localization,
          `${label}.pseudo_localization`,
        ),
        content_case: atomicAxisValue(
          row.content_case,
          `${label}.content_case`,
        ),
        data_case: atomicAxisValue(row.data_case, `${label}.data_case`),
        text_scale: {
          key: atomicAxisValue(textScale.key, `${label}.text_scale.key`),
          multiplier: positiveNumber(
            textScale.multiplier,
            `${label}.text_scale.multiplier`,
          ),
        },
        input_method: atomicAxisValue(
          row.input_method,
          `${label}.input_method`,
        ),
        assistive_technology: atomicAxisValue(
          row.assistive_technology,
          `${label}.assistive_technology`,
        ),
        motion: atomicAxisValue(row.motion, `${label}.motion`),
        transparency: atomicAxisValue(
          row.transparency,
          `${label}.transparency`,
        ),
        contrast: atomicAxisValue(row.contrast, `${label}.contrast`),
        bold_text: atomicAxisValue(row.bold_text, `${label}.bold_text`),
        button_shapes: atomicAxisValue(
          row.button_shapes,
          `${label}.button_shapes`,
        ),
        system_ui: atomicAxisValue(row.system_ui, `${label}.system_ui`),
        ime: atomicAxisValue(row.ime, `${label}.ime`),
        permission: atomicAxisValue(row.permission, `${label}.permission`),
        capability: atomicAxisValue(row.capability, `${label}.capability`),
        connectivity: atomicAxisValue(
          row.connectivity,
          `${label}.connectivity`,
        ),
        lifecycle: atomicAxisValue(row.lifecycle, `${label}.lifecycle`),
        custom_axes: array(row.custom_axes, `${label}.custom_axes`).map(
          (item, itemIndex) => {
            const itemLabel = `${label}.custom_axes[${itemIndex}]`;
            const custom = object(item, itemLabel, ["axis_ref", "value_ref"]);
            return {
              axis_ref: stableKey(custom.axis_ref, `${itemLabel}.axis_ref`),
              value_ref: atomicAxisValue(
                custom.value_ref,
                `${itemLabel}.value_ref`,
              ),
            };
          },
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
      "parent_ref",
      "instance_of_ref",
      "slot_key",
      "override_of_ref",
      "family_ref",
      "presence",
      "presence_rule_ref",
      "population_ref",
      "portal_host_ref",
      "relation_endpoints",
      "census_refs",
    ]);
    return {
      key: stableKey(row.key, `${label}.key`),
      kind: literal(row.kind, DESIGN_RESOURCE_SUBJECT_KINDS, `${label}.kind`),
      stable_keys: stableKeys(row.stable_keys, `${label}.stable_keys`),
      target_refs: contractKeys(row.target_refs, `${label}.target_refs`),
      parent_ref: nullable(row.parent_ref, (item) =>
        stableKey(item, `${label}.parent_ref`),
      ),
      instance_of_ref: nullable(row.instance_of_ref, (item) =>
        stableKey(item, `${label}.instance_of_ref`),
      ),
      slot_key: nullable(row.slot_key, (item) =>
        stableKey(item, `${label}.slot_key`),
      ),
      override_of_ref: nullable(row.override_of_ref, (item) =>
        stableKey(item, `${label}.override_of_ref`),
      ),
      family_ref: nullable(row.family_ref, (item) =>
        stableKey(item, `${label}.family_ref`),
      ),
      presence: literal(
        row.presence,
        DESIGN_RESOURCE_SUBJECT_PRESENCE_KINDS,
        `${label}.presence`,
      ),
      presence_rule_ref: nullable(row.presence_rule_ref, (item) =>
        stableKey(item, `${label}.presence_rule_ref`),
      ),
      population_ref: nullable(row.population_ref, (item) =>
        stableKey(item, `${label}.population_ref`),
      ),
      portal_host_ref: nullable(row.portal_host_ref, (item) =>
        stableKey(item, `${label}.portal_host_ref`),
      ),
      relation_endpoints: array(
        row.relation_endpoints,
        `${label}.relation_endpoints`,
      ).map((endpoint, endpointIndex) => {
        const endpointLabel = `${label}.relation_endpoints[${endpointIndex}]`;
        const parsed = object(endpoint, endpointLabel, ["role", "subject_ref"]);
        return {
          role: stableKey(parsed.role, `${endpointLabel}.role`),
          subject_ref: stableKey(
            parsed.subject_ref,
            `${endpointLabel}.subject_ref`,
          ),
        };
      }),
      census_refs: stableKeys(row.census_refs, `${label}.census_refs`),
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
      [
        "kind",
        "entry_resource_ref",
        "dependency_resource_refs",
        "fact_manifest_resource_ref",
        "acquisition",
      ],
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
        fact_manifest_resource_ref: stableKey(
          sourceProfile.fact_manifest_resource_ref,
          `${label}.source_profile.fact_manifest_resource_ref`,
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
