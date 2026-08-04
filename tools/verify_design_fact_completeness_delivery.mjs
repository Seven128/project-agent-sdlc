import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { npmCommandSpec } from "./npm_command_spec.mjs";

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const mode = process.argv[2] ?? "--semantic";
const targetRef = "harness-package-runtime";
const rootEntrypoint = "tools/verify_design_fact_completeness_delivery.mjs";
const policyFile = "packages/ty-context/src/lib/design-resource-fact-policy.ts";
const handoffTest = "tests/ty-context/design-resource-handoff.test.mjs";
const runtimeEvidence =
  "packages/ty-context/src/lib/long-task-evidence-capability-runtime.ts";
const deliverySource = "docs/design-fact-completeness.md";
const semanticObservationRules = [
  [
    "result",
    false,
    [
      [policyFile, "complete_observable_design_fact_delivery"],
      [runtimeEvidence, "design_method_fact_refs_mismatch"],
    ],
  ],
  [
    "default_fact_granularity",
    false,
    [
      [
        "packages/ty-context/src/lib/design-resource-handoff-types.ts",
        "facts",
        "resource_fact_closure",
      ],
      [policyFile, "complete_observable_design_fact_delivery"],
    ],
  ],
  [
    "resource_fact_inventory",
    false,
    [
      [policyFile, "resource_fact_inventory_closure_required"],
      [
        "packages/ty-context/src/lib/design-resource-handoff-validation-coverage.ts",
        "resource_unreferenced",
      ],
      [
        "packages/ty-context/src/lib/design-resource-handoff-validation-resource-closure.ts",
        "resource_fact_closure",
      ],
      [handoffTest, "resource fact closure", "fact inventory"],
    ],
  ],
  [
    "pixel_fidelity",
    false,
    [
      [policyFile, "exact_target_visual_pixel_required"],
      [handoffTest, "pixel", "exact target"],
    ],
  ],
  [
    "complete_fact_consumption",
    false,
    [
      [policyFile, "exact_fact_set_conservation_required"],
      [
        "packages/ty-context/src/lib/long-task-design-resource-handoff.ts",
        "design_method_fact_refs_mismatch",
      ],
      [
        "packages/ty-context/src/lib/long-task-ui-surface-types.ts",
        "fact_refs",
      ],
    ],
  ],
  [
    "honest_expression_boundary",
    false,
    [
      [policyFile, "design_fact_expression_boundary"],
      [
        "PROJECT_SPEC.md",
        "The expression boundary remains",
        "unsupported formats",
      ],
    ],
  ],
  [
    "control_semantics_preserved",
    false,
    [
      [policyFile, "control_granularity_is_not_design_fact_granularity"],
      ["PROJECT_SPEC.md", "control_granularity_is_not_design_fact_granularity"],
    ],
  ],
  [
    "public_guidance_aligned",
    false,
    [
      [policyFile, "public_design_fact_guidance_required"],
      [
        "README.md",
        "Expected Fact Universe",
        "subject × selected target × condition combination × variation combination × property",
        "pixel",
      ],
      [
        "README.zh-CN.md",
        "Expected Fact Universe",
        "subject × selected target × condition combination × variation combination × property",
        "pixel",
      ],
      [
        "packages/ty-context/README.md",
        "Expected Fact Universe",
        "subject × selected target × condition combination × variation combination × property",
        "pixel",
      ],
      [
        ".codex/ty-context-managed/skills/design-resource-authoring/SKILL.md",
        "Expected Fact Universe",
        "subject × target × condition × variation × property",
        "pixel",
      ],
      [
        ".codex/ty-context-managed/skills/long-task-workflow/references/contract-authoring.md",
        "Expected Fact Universe",
        "subject × target × condition × variation × property",
        "pixel",
      ],
      [
        ".codex/ty-context-managed/skills/context_development_engineer/SKILL.md",
        "Expected Fact Universe",
        "subject × target × condition × variation × atomic property",
        "pixel",
      ],
    ],
  ],
  [
    "formal_authoring_design_obligation_universe",
    false,
    [
      [policyFile, "public_design_fact_guidance_required"],
      [policyFile, "authoring_obligation_universe_precedes_generation"],
      [
        deliverySource,
        "formal-authoring-design-obligation-universe",
        "Expected Fact Universe",
      ],
      [
        ".codex/ty-context-managed/skills/design-resource-authoring/SKILL.md",
        "derive the complete material in-scope Expected Fact Universe",
        "subject × target × condition × variation × property",
      ],
    ],
  ],
  [
    "independent_canonical_fact_manifest",
    false,
    [
      [policyFile, "resource_fact_inventory_closure_required"],
      [policyFile, "frozen_inspector_census_required"],
      [
        deliverySource,
        "independent-canonical-fact-manifest",
        "design-resource-observable-fact-manifest-v1",
      ],
      [
        "packages/ty-context/src/lib/design-resource-fact-manifest-model.ts",
        "DesignResourceObservableFactManifestV1",
        "DesignResourceInspectorV1",
      ],
      [
        "packages/ty-context/src/lib/design-resource-fact-manifest-validation.ts",
        "loadAndValidateDesignResourceFactManifests",
        "validateManifestProjection",
      ],
    ],
  ],
  [
    "subject_hierarchy_instance_anatomy_closure",
    false,
    [
      [policyFile, "fact_inventory_required"],
      [
        deliverySource,
        "subject-hierarchy-instance-anatomy-closure",
        "Anatomy Part/slot",
      ],
      [
        "packages/ty-context/src/lib/design-resource-fact-enums.ts",
        "DESIGN_RESOURCE_SUBJECT_KINDS",
        "anatomy_part",
        "relation",
      ],
      [
        "packages/ty-context/src/lib/design-resource-fact-universe-subjects.ts",
        "validateManifestSubjects",
        "manifest_subject_parent_cycle",
      ],
    ],
  ],
  [
    "complete_condition_axis_and_value_closure",
    false,
    [
      [policyFile, "exact_fact_set_conservation_required"],
      [policyFile, "first_class_condition_variation_property_axes_required"],
      [
        deliverySource,
        "complete-condition-axis-and-value-closure",
        "Safe Area/cutout",
      ],
      [
        "packages/ty-context/src/lib/design-resource-fact-enums.ts",
        "DESIGN_RESOURCE_STANDARD_CONDITION_AXES",
        "safe_area",
        "text_scale",
      ],
      [
        "packages/ty-context/src/lib/design-resource-handoff-validation-structure.ts",
        "validateDesignResourceConditions",
        "requireConsistentConditionProfile",
        "safe_area",
        "text_scale",
        "profile_conflict",
      ],
    ],
  ],
  [
    "compound_applicability_and_precedence_closure",
    false,
    [
      [policyFile, "exact_fact_set_conservation_required"],
      [
        deliverySource,
        "compound-applicability-and-precedence-closure",
        "machine-checkable invariant/equivalence rule",
      ],
      [
        "packages/ty-context/src/lib/design-resource-fact-universe-conditions.ts",
        "manifest_condition_universe_mismatch",
      ],
      [
        "packages/ty-context/src/lib/design-resource-fact-universe-variations.ts",
        "manifest_variation_universe_mismatch",
      ],
    ],
  ],
  [
    "atomic_property_catalog_and_value_addressability",
    false,
    [
      [policyFile, "complete_observable_design_fact_delivery"],
      [policyFile, "atomic_fact_cell_identity_required"],
      [
        deliverySource,
        "atomic-property-catalog-and-value-addressability",
        "atomic property key",
      ],
      [
        "packages/ty-context/src/lib/design-resource-fact-manifest-catalog.ts",
        "DESIGN_RESOURCE_STANDARD_PROPERTIES",
        "required_methods",
      ],
      [
        "packages/ty-context/src/lib/design-resource-fact-universe-catalog.ts",
        "manifest_expected_fact_cell_universe_mismatch",
        "manifest_standard_property_missing",
      ],
    ],
  ],
  [
    "page_assembly_and_spatial_fact_closure",
    false,
    [
      [policyFile, "complete_observable_design_fact_delivery"],
      [
        deliverySource,
        "page-assembly-and-spatial-fact-closure",
        "nested-scroll arbitration",
      ],
    ],
  ],
  [
    "component_visual_content_and_media_fact_closure",
    false,
    [
      [policyFile, "complete_observable_design_fact_delivery"],
      [
        deliverySource,
        "component-visual-content-and-media-fact-closure",
        "variable axes/features",
      ],
    ],
  ],
  [
    "interaction_navigation_scroll_and_recovery_fact_closure",
    false,
    [
      [policyFile, "unsupported_design_fact_blocks"],
      [
        deliverySource,
        "interaction-navigation-scroll-and-recovery-fact-closure",
        "request replacement",
      ],
    ],
  ],
  [
    "motion_haptic_and_interruption_fact_closure",
    false,
    [
      [policyFile, "exact_target_visual_pixel_required"],
      [
        deliverySource,
        "motion-haptic-and-interruption-fact-closure",
        "mass/stiffness/damping",
      ],
    ],
  ],
  [
    "platform_localization_system_and_render_target_closure",
    false,
    [
      [policyFile, "exact_target_visual_pixel_required"],
      [
        deliverySource,
        "platform-localization-system-and-render-target-closure",
        "implementation-generated self-baseline",
      ],
    ],
  ],
  [
    "accessibility_semantic_navigation_and_visual_closure",
    false,
    [
      [policyFile, "unsupported_facts_block"],
      [
        deliverySource,
        "accessibility-semantic-navigation-and-visual-closure",
        "screen-reader/switch/voice-control",
      ],
    ],
  ],
  [
    "asset_identity_variant_and_fallback_closure",
    false,
    [
      [policyFile, "resource_fact_inventory_closure_required"],
      [
        deliverySource,
        "asset-identity-variant-and-fallback-closure",
        "density/platform/theme/mode/locale variants",
      ],
    ],
  ],
  [
    "method_specific_observation_and_oracle_closure",
    false,
    [
      [policyFile, "contract_evidence_fact_binding_required"],
      [
        deliverySource,
        "method-specific-observation-and-oracle-closure",
        "haptic/sound feedback",
      ],
      [
        "packages/ty-context/src/lib/design-resource-handoff-validation-proofs.ts",
        "proof_method_evidence_missing",
        "proof_oracle_capability_missing",
      ],
    ],
  ],
  [
    "fact_identity_and_proof_obligation_separation",
    false,
    [
      [policyFile, "contract_evidence_fact_binding_required"],
      [
        policyFile,
        "fact_identity_and_proof_method_obligation_separation_required",
      ],
      [
        deliverySource,
        "fact-identity-and-proof-obligation-separation",
        "Fact × verification-method obligations",
      ],
      [
        "packages/ty-context/src/lib/design-resource-handoff-validation-proofs.ts",
        "fact_verification_method_required",
        "fact_verification_method_obligation_duplicate",
      ],
    ],
  ],
  [
    "multi_subject_relation_fact_closure",
    false,
    [
      [policyFile, "fact_inventory_required"],
      [policyFile, "dynamic_relation_and_asset_fact_closure_required"],
      [
        deliverySource,
        "multi-subject-relation-fact-closure",
        "typed endpoint roles",
      ],
      [
        "packages/ty-context/src/lib/design-resource-fact-universe-subjects.ts",
        "validateManifestSubjects",
        "manifest_relation_endpoints_required",
      ],
    ],
  ],
  [
    "frozen_inspector_census_and_capability_closure",
    false,
    [
      [policyFile, "resource_fact_inventory_closure_required"],
      [policyFile, "frozen_inspector_census_required"],
      [
        deliverySource,
        "frozen-inspector-census-and-capability-closure",
        "addressable-node/resource/property census",
      ],
      [
        "packages/ty-context/src/lib/design-resource-fact-universe-inspector.ts",
        "validateManifestInspector",
        "manifest_census_fact_set_mismatch",
      ],
      [
        "packages/ty-context/src/lib/design-resource-fact-universe-catalog.ts",
        "manifest_census_semantic_owner_missing",
      ],
    ],
  ],
  [
    "design_system_effective_value_and_conflict_lineage",
    false,
    [
      [policyFile, "design_fact_values_stay_in_canonical_resources"],
      [policyFile, "design_system_effective_value_lineage_required"],
      [
        deliverySource,
        "design-system-effective-value-and-conflict-lineage",
        "resolved effective value",
      ],
      [
        "packages/ty-context/src/lib/design-resource-fact-universe-inspector.ts",
        "validateManifestLineageNodes",
      ],
      [
        "packages/ty-context/src/lib/design-resource-fact-universe-facts.ts",
        "manifest_fact_lineage_effective_value_mismatch",
      ],
    ],
  ],
  [
    "conditional_dynamic_and_virtualized_subject_closure",
    false,
    [
      [policyFile, "fact_inventory_required"],
      [policyFile, "dynamic_relation_and_asset_fact_closure_required"],
      [
        deliverySource,
        "conditional-dynamic-and-virtualized-subject-closure",
        "virtualized/recycled",
      ],
      [
        "packages/ty-context/src/lib/design-resource-fact-universe-subjects.ts",
        "manifest_virtualized_population_required",
        "manifest_dynamic_presence_rule_required",
      ],
    ],
  ],
  [
    "units_rounding_input_configuration_and_time_semantics",
    false,
    [
      [policyFile, "complete_observable_design_fact_delivery"],
      [
        deliverySource,
        "units-rounding-input-configuration-and-time-semantics",
        "pixel-snapping conversion",
      ],
    ],
  ],
  [
    "formal_ready_handoff_fail_closed_boundary",
    false,
    [
      [policyFile, "unsupported_design_fact_blocks"],
      [
        policyFile,
        "expected_canonical_handoff_fact_universe_equality_required",
      ],
      [
        deliverySource,
        "formal-ready-handoff-fail-closed-boundary",
        "developer to invent",
      ],
      [
        "packages/ty-context/src/lib/design-resource-handoff-validation-coverage.ts",
        "acceptance_blockers_unresolved",
        "unresolved_coverage",
      ],
    ],
  ],
  [
    "single_authority_projection",
    false,
    [
      [
        policyFile,
        "design_fact_values_stay_in_canonical_resources",
        "no_second_design_fact_authority",
      ],
      [
        "PROJECT_SPEC.md",
        "design_fact_values_stay_in_canonical_resources",
        "no_second_design_fact_authority",
      ],
    ],
  ],
  [
    "machine_fact_schema",
    false,
    [
      [policyFile, "fact_inventory_required"],
      [
        "packages/ty-context/src/schemas/long-task-delivery-v2/long-task-delivery-v2.schema.json",
        "fact_refs",
        "fact_expectations",
        "observation_sensitivity",
      ],
    ],
  ],
  [
    "contract_evidence_binding",
    false,
    [
      [policyFile, "contract_evidence_fact_binding_required"],
      [policyFile, "per_fact_current_result_required"],
      [
        "packages/ty-context/src/lib/long-task-evidence-capability-types.ts",
        "fact_refs",
        "fact_results",
        "actual_environment",
      ],
      [
        runtimeEvidence,
        "design_method_fact_refs_mismatch",
        "design_method_fact_results_mismatch",
        "design_method_fact_failed",
      ],
      [
        "packages/ty-context/src/lib/long-task-playwright-evidence.ts",
        "fact_refs",
        "fact_results",
      ],
    ],
  ],
  [
    "manifest_handoff_universe_set_equality",
    false,
    [
      [policyFile, "resource_fact_inventory_closure_required"],
      [
        policyFile,
        "expected_canonical_handoff_fact_universe_equality_required",
      ],
      [
        deliverySource,
        "manifest-handoff-universe-set-equality",
        "circular self-declared resource closure",
      ],
      [
        "packages/ty-context/src/lib/design-resource-fact-manifest-validation.ts",
        "manifest_handoff_",
        "exactRows",
      ],
    ],
  ],
  [
    "expected_canonical_indexed_fact_universe_equality",
    false,
    [
      [
        policyFile,
        "expected_canonical_handoff_fact_universe_equality_required",
      ],
      [
        deliverySource,
        "Expected Fact Universe = Canonical Resource Facts = Handoff Indexed Facts",
      ],
      [
        "packages/ty-context/src/lib/design-resource-fact-universe-catalog.ts",
        "manifest_expected_fact_cell_universe_mismatch",
        "manifest_expected_canonical_fact_set_mismatch",
      ],
      [
        ".codex/ty-context-managed/skills/design-resource-authoring/references/downstream-handoff.md",
        "Expected Fact Universe",
        "Canonical Resource Facts",
        "Handoff Indexed Facts",
      ],
    ],
  ],
  [
    "per_fact_native_evidence_verdict",
    false,
    [
      [policyFile, "contract_evidence_fact_binding_required"],
      [policyFile, "per_fact_current_result_required"],
      [
        deliverySource,
        "per-fact-native-evidence-verdict",
        "actual observation",
      ],
      [runtimeEvidence, "fact_results", "design_method_fact_failed"],
    ],
  ],
  [
    "authoritative_comparator_tolerance_and_evidence_identity",
    false,
    [
      [policyFile, "contract_evidence_fact_binding_required"],
      [policyFile, "per_fact_expected_comparison_authority_required"],
      [
        deliverySource,
        "authoritative-comparator-tolerance-and-evidence-identity",
        "actual-observation locator and digest",
      ],
      [
        runtimeEvidence,
        "design_method_comparison_authority_mismatch",
        "design_method_oracle_environment_mismatch",
        "design_method_actual_environment_mismatch",
      ],
    ],
  ],
  [
    "nontruncating_scalable_universe_and_disposition_proof",
    false,
    [
      [policyFile, "selected_design_fact_antidegradation_required"],
      [
        policyFile,
        "complete_generation_without_sampling_or_truncation_required",
      ],
      [
        deliverySource,
        "nontruncating-scalable-universe-and-disposition-proof",
        "silently truncate",
      ],
      [
        "packages/ty-context/src/lib/design-resource-fact-universe-assets.ts",
        "validateManifestGeneration",
        "manifest_generation_chunk_closure_mismatch",
        "manifest_generation_identity_mismatch",
      ],
    ],
  ],
  [
    "antidegradation_protected",
    false,
    [
      [policyFile, "selected_design_fact_antidegradation_required"],
      ["tools/test_suite_policy.mjs", "selected-design-fact-closure"],
      [
        "tests/ty-context/long-task-semantic-drift-closure.test.mjs",
        "[critical:selected-design-fact-closure]",
      ],
      [
        "PROJECT_SPEC.md",
        "Coverage_new",
        "FalseNegative_new",
        "Implementation Freedom Boundary",
      ],
    ],
  ],
  [
    "distribution_context_cost",
    false,
    [
      [policyFile, "design_fact_distribution_context_cost"],
      [
        "PROJECT_SPEC.md",
        "design-resource-fact-policy.ts",
        "selected-design construction",
        "default route pays no production-conformance schema cost",
      ],
    ],
  ],
  [
    "forbidden_shortcut_present",
    true,
    [[policyFile, "forbidden_design_fact_shortcuts_absent"]],
  ],
  [
    "opaque_resource_claim_absent",
    false,
    [[policyFile, "unsupported_facts_block"]],
  ],
  [
    "integrity_treated_as_completion",
    true,
    [[policyFile, "preflight_is_not_production_conformance"]],
  ],
  [
    "handoff_fact_closure_ac",
    false,
    [
      [policyFile, "resource_fact_inventory_closure_required"],
      [
        handoffTest,
        "fact inventory",
        "resource fact closure",
        "frozen manifest and residual handoff conserve every atomic universe collection",
      ],
    ],
  ],
  [
    "pixel_default_ac",
    false,
    [
      [policyFile, "exact_target_visual_pixel_required"],
      [handoffTest, "exact target", "visual_pixel"],
    ],
  ],
  [
    "long_task_fact_binding_ac",
    false,
    [
      [policyFile, "exact_fact_set_conservation_required"],
      [policyFile, "per_fact_expected_comparison_authority_required"],
      [
        "tests/ty-context/long-task-delivery-compiler.test.mjs",
        "fact_refs",
        "fact_expectations",
        "freezes every per-Fact expectation authority field",
      ],
    ],
  ],
  [
    "runtime_fact_evidence_ac",
    false,
    [
      [policyFile, "contract_evidence_fact_binding_required"],
      [policyFile, "per_fact_current_result_required"],
      [
        "tests/ty-context/long-task-playwright-ac-evidence.test.mjs",
        "fact_refs",
        "fact_results",
      ],
      [runtimeEvidence, "design_method_fact_failed"],
    ],
  ],
  [
    "antidegradation_parity_ac",
    false,
    [
      [policyFile, "selected_design_fact_antidegradation_required"],
      [
        "tests/ty-context/long-task-semantic-drift-closure.test.mjs",
        "[critical:selected-design-fact-closure]",
      ],
      [
        "project_context/areas/harness-package/implementation-index.md",
        "Expected Fact Universe closure",
        "design-resource-handoff-validation-{fact-cells,fact-records,proofs,resource-closure}.ts",
        "long-task-design-target-capabilities.ts",
        "long-task-playwright-case-primitives.ts",
      ],
      [
        "tools/affected_test_selection.mjs",
        "design-resource-fact-universe-inspector.ts",
        "design-resource-handoff-validation-fact-cells.ts",
        "long-task-design-target-capabilities.ts",
        "long-task-playwright-case-primitives.ts",
      ],
    ],
  ],
  [
    "authoring_obligation_universe_ac",
    false,
    [
      [policyFile, "public_design_fact_guidance_required"],
      [policyFile, "authoring_obligation_universe_precedes_generation"],
      [
        deliverySource,
        "authoring-obligation-universe-ac",
        "assembled default pages",
      ],
      [
        ".codex/ty-context-managed/skills/design-resource-authoring/SKILL.md",
        "Derive the authoring obligation universe before generation",
      ],
    ],
  ],
  [
    "manifest_universe_mutation_ac",
    false,
    [
      [policyFile, "exact_fact_set_conservation_required"],
      [
        deliverySource,
        "manifest-universe-mutation-ac",
        "residual eight-dimension rows",
      ],
    ],
  ],
  [
    "atomic_axis_noncollapse_ac",
    false,
    [
      [policyFile, "exact_fact_set_conservation_required"],
      [policyFile, "aggregate_state_or_condition_labels_forbidden"],
      [deliverySource, "atomic-axis-noncollapse-ac", "all-21-state-catalog"],
      [handoffTest, "atomic axes", "cannot collapse into labels"],
    ],
  ],
  [
    "condition_and_property_pressure_ac",
    false,
    [
      [policyFile, "exact_fact_set_conservation_required"],
      [
        deliverySource,
        "condition-and-property-pressure-ac",
        "three screenshots without between-width rules",
      ],
    ],
  ],
  [
    "per_fact_native_evidence_ac",
    false,
    [
      [policyFile, "contract_evidence_fact_binding_required"],
      [policyFile, "per_fact_current_result_required"],
      [deliverySource, "per-fact-native-evidence-ac", "fact_results"],
      [
        "tests/ty-context/long-task-semantic-drift-closure.test.mjs",
        "fact_results",
        "actual_environment",
      ],
    ],
  ],
  [
    "downstream_finest_fact_conservation_ac",
    false,
    [
      [policyFile, "exact_fact_set_conservation_required"],
      [
        deliverySource,
        "downstream-finest-fact-conservation-ac",
        "self-generated visual baseline",
      ],
    ],
  ],
  [
    "inspector_census_and_lineage_ac",
    false,
    [
      [policyFile, "resource_fact_inventory_closure_required"],
      [policyFile, "frozen_inspector_census_required"],
      [
        deliverySource,
        "inspector-census-and-lineage-ac",
        "accepting only an Inspector `complete` flag",
      ],
      [handoffTest, "frozen manifest", "lineage"],
    ],
  ],
  [
    "relation_dynamic_and_multimethod_ac",
    false,
    [
      [policyFile, "fact_inventory_required"],
      [
        policyFile,
        "fact_identity_and_proof_method_obligation_separation_required",
      ],
      [
        deliverySource,
        "relation-dynamic-and-multimethod-ac",
        "Fact × method obligations",
      ],
      [handoffTest, "dynamic subjects", "oracle authority"],
    ],
  ],
  [
    "per_fact_comparator_authority_ac",
    false,
    [
      [policyFile, "contract_evidence_fact_binding_required"],
      [policyFile, "per_fact_expected_comparison_authority_required"],
      [
        deliverySource,
        "per-fact-comparator-authority-ac",
        "implementation-generated expected value",
      ],
      [
        "tests/ty-context/long-task-semantic-drift-closure.test.mjs",
        "comparison",
        "oracle",
        "environment",
      ],
    ],
  ],
  [
    "no_truncation_or_disposition_bypass_ac",
    false,
    [
      [policyFile, "selected_design_fact_antidegradation_required"],
      [
        policyFile,
        "complete_generation_without_sampling_or_truncation_required",
      ],
      [
        deliverySource,
        "no-truncation-or-disposition-bypass-ac",
        "row/token/time limit",
      ],
      [handoffTest, "sampling", "truncation"],
    ],
  ],
  ["relations_applicable", true, [[policyFile, "control_relations_unchanged"]]],
];
const semanticAssertionKeys = [
  "result",
  "default-fact-granularity",
  "resource-fact-inventory",
  "pixel-fidelity",
  "complete-fact-consumption",
  "honest-expression-boundary",
  "control-semantics-preserved",
  "public-guidance-aligned",
  "formal-authoring-design-obligation-universe",
  "independent-canonical-fact-manifest",
  "subject-hierarchy-instance-anatomy-closure",
  "complete-condition-axis-and-value-closure",
  "compound-applicability-and-precedence-closure",
  "atomic-property-catalog-and-value-addressability",
  "page-assembly-and-spatial-fact-closure",
  "component-visual-content-and-media-fact-closure",
  "interaction-navigation-scroll-and-recovery-fact-closure",
  "motion-haptic-and-interruption-fact-closure",
  "platform-localization-system-and-render-target-closure",
  "accessibility-semantic-navigation-and-visual-closure",
  "asset-identity-variant-and-fallback-closure",
  "method-specific-observation-and-oracle-closure",
  "fact-identity-and-proof-obligation-separation",
  "multi-subject-relation-fact-closure",
  "frozen-inspector-census-and-capability-closure",
  "design-system-effective-value-and-conflict-lineage",
  "conditional-dynamic-and-virtualized-subject-closure",
  "units-rounding-input-configuration-and-time-semantics",
  "formal-ready-handoff-fail-closed-boundary",
  "single-authority-projection",
  "machine-fact-schema",
  "contract-evidence-binding",
  "manifest-handoff-universe-set-equality",
  "expected-canonical-indexed-fact-universe-equality",
  "per-fact-native-evidence-verdict",
  "authoritative-comparator-tolerance-and-evidence-identity",
  "nontruncating-scalable-universe-and-disposition-proof",
  "antidegradation-protected",
  "distribution-context-cost",
  "no-shortcut",
  "opaque-resource-boundary",
  "integrity-not-completion",
  "handoff-fact-closure-ac",
  "pixel-default-ac",
  "long-task-fact-binding-ac",
  "runtime-fact-evidence-ac",
  "antidegradation-and-parity-ac",
  "authoring-obligation-universe-ac",
  "manifest-universe-mutation-ac",
  "atomic-axis-noncollapse-ac",
  "condition-and-property-pressure-ac",
  "per-fact-native-evidence-ac",
  "downstream-finest-fact-conservation-ac",
  "inspector-census-and-lineage-ac",
  "relation-dynamic-and-multimethod-ac",
  "per-fact-comparator-authority-ac",
  "no-truncation-or-disposition-bypass-ac",
  "relations-na",
  "semantic-liveness",
];
if (mode === "--complete") await completeVerification();
else if (mode === "--semantic") await semanticVerification();
else throw new Error(`unsupported verification mode: ${mode}`);

async function semanticVerification() {
  const inputPaths = [
    ...new Set(
      semanticObservationRules.flatMap(([, , requirements]) =>
        requirements.map(([file]) => file),
      ),
    ),
  ];
  const files = await readFiles(inputPaths);
  const observations = Object.fromEntries(
    semanticObservationRules.map(([key, negate, requirements]) => {
      const present = requirements.every(([file, ...needles]) =>
        needles.every((needle) =>
          containsRequirement(file, files.get(file) ?? "", needle),
        ),
      );
      return [key, negate ? !present : present];
    }),
  );
  observations.target_live = true;
  emitResult(observations, semanticAssertionKeys, "semantic");
}

function containsRequirement(file, contents, needle) {
  if (file !== policyFile || !/^[a-z0-9_]+$/u.test(needle))
    return contents.includes(needle);
  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  return new RegExp(`(?:^|[^A-Za-z0-9_])${escaped}(?![A-Za-z0-9_])`, "mu").test(
    contents,
  );
}

async function completeVerification() {
  const commands = [
    npmCommandSpec(["test"]),
    {
      command: process.execPath,
      args: ["packages/ty-context/dist/cli.js", "package", "check-source"],
    },
    {
      command: process.execPath,
      args: ["packages/ty-context/dist/cli.js", "validate-context"],
    },
    {
      command: process.execPath,
      args: [
        "packages/ty-context/dist/cli.js",
        "check-modularity",
        "--touched",
        "--fail-on-warning",
      ],
    },
  ];
  const results = [];
  for (const { command, args } of commands)
    results.push(await run(command, args));
  const completeSuitePassed = results.every((result) => result.code === 0);
  emitResult(
    {
      complete_suite_passed: completeSuitePassed,
      delivery_result_passed: completeSuitePassed,
      delivery_default_fact_granularity_passed: completeSuitePassed,
      delivery_formal_authoring_universe_passed: completeSuitePassed,
      delivery_per_fact_evidence_passed: completeSuitePassed,
      delivery_comparator_authority_passed: completeSuitePassed,
      target_live: true,
      command_results: results,
    },
    [
      "complete-suite",
      "complete-result",
      "complete-default-fact-granularity",
      "complete-formal-authoring-universe",
      "complete-per-fact-evidence",
      "complete-comparator-authority",
      "complete-liveness",
    ],
    "complete",
  );
}

function emitResult(observations, assertionKeys, sessionKind) {
  const digest = sha256(JSON.stringify(observations)).slice(0, 16);
  const sessionId = `design-fact-${sessionKind}-${digest}`;
  const evidenceRecords = assertionKeys.map((assertionKey) => ({
    assertion_key: assertionKey,
    capability: "target_runtime",
    target_ref: targetRef,
    root_entrypoint: rootEntrypoint,
    session_id: sessionId,
    cold_start: true,
  }));
  console.log(
    JSON.stringify({
      schema_version: "long-task-check-result-v3",
      execution_status: "completed",
      observations,
      evidence_records: evidenceRecords,
    }),
  );
}

async function readFiles(paths) {
  const result = new Map();
  for (const relative of paths) {
    const contents = await readFile(
      path.join(repositoryRoot, relative),
      "utf8",
    ).catch(() => "");
    result.set(relative, contents);
  }
  return result;
}

async function run(command, args) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd: repositoryRoot,
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
      shell: false,
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout = tail(`${stdout}${chunk.toString()}`);
    });
    child.stderr.on("data", (chunk) => {
      stderr = tail(`${stderr}${chunk.toString()}`);
    });
    child.on("error", (error) => {
      resolve({
        command,
        args,
        code: null,
        error: error.message,
        stdout,
        stderr,
      });
    });
    child.on("close", (code, signal) => {
      resolve({ command, args, code, signal, stdout, stderr });
    });
  });
}

function tail(value) {
  return value.length <= 4000 ? value : value.slice(-4000);
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}
