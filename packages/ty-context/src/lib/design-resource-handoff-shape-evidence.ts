import type {
  DesignResourceHandoffBlockerV1,
  DesignResourceHandoffCoverageV1,
  DesignResourceHandoffEvidenceV1,
} from "./design-resource-handoff-types.js";
import {
  DESIGN_RESOURCE_DIMENSIONS,
  DESIGN_RESOURCE_EVIDENCE_KINDS,
  DESIGN_RESOURCE_LOCATOR_KINDS,
} from "./design-resource-handoff-types.js";
import {
  contractKey,
  contractKeys,
  sourceItemKeys,
  stableKey,
  stableKeys,
  verificationMethods,
} from "./design-resource-handoff-shape-primitives.js";
import {
  array,
  literal,
  object,
  string,
} from "./long-task-shape-primitives.js";
import { EXECUTION_TARGET_CAPABILITIES } from "./execution-target-capabilities.js";

export function parseDesignResourceHandoffEvidence(
  value: unknown,
): DesignResourceHandoffEvidenceV1[] {
  return array(value, "design_resource_handoff.evidence").map((item, index) => {
    const label = `design_resource_handoff.evidence[${index}]`;
    const row = object(item, label, [
      "key",
      "resource_ref",
      "kind",
      "locator",
      "condition_refs",
    ]);
    const locator = object(row.locator, `${label}.locator`, ["kind", "value"]);
    return {
      key: stableKey(row.key, `${label}.key`),
      resource_ref: stableKey(row.resource_ref, `${label}.resource_ref`),
      kind: literal(row.kind, DESIGN_RESOURCE_EVIDENCE_KINDS, `${label}.kind`),
      locator: {
        kind: literal(
          locator.kind,
          DESIGN_RESOURCE_LOCATOR_KINDS,
          `${label}.locator.kind`,
        ),
        value: string(locator.value, `${label}.locator.value`),
      },
      condition_refs: contractKeys(
        row.condition_refs,
        `${label}.condition_refs`,
      ),
    };
  });
}

export function parseDesignResourceHandoffCoverage(
  value: unknown,
): DesignResourceHandoffCoverageV1[] {
  return array(value, "design_resource_handoff.coverage").map((item, index) => {
    const label = `design_resource_handoff.coverage[${index}]`;
    const row = object(item, label, [
      "key",
      "subject_refs",
      "dimension",
      "disposition",
      "target_refs",
      "condition_refs",
      "evidence_refs",
      "source_item_refs",
      "verification_methods",
      "rationale",
    ]);
    return {
      key: stableKey(row.key, `${label}.key`),
      subject_refs: stableKeys(row.subject_refs, `${label}.subject_refs`),
      dimension: literal(
        row.dimension,
        DESIGN_RESOURCE_DIMENSIONS,
        `${label}.dimension`,
      ),
      disposition: literal(
        row.disposition,
        [
          "covered",
          "not_applicable",
          "excluded_by_scope",
          "decision_required",
          "unavailable",
        ] as const,
        `${label}.disposition`,
      ),
      target_refs: contractKeys(row.target_refs, `${label}.target_refs`),
      condition_refs: contractKeys(
        row.condition_refs,
        `${label}.condition_refs`,
      ),
      evidence_refs: stableKeys(row.evidence_refs, `${label}.evidence_refs`),
      source_item_refs: sourceItemKeys(
        row.source_item_refs,
        `${label}.source_item_refs`,
      ),
      verification_methods: verificationMethods(
        row.verification_methods,
        `${label}.verification_methods`,
      ),
      rationale: string(row.rationale, `${label}.rationale`),
    };
  });
}

export function parseDesignResourceHandoffBlockers(
  value: unknown,
): DesignResourceHandoffBlockerV1[] {
  return array(value, "design_resource_handoff.acceptance_blockers").map(
    (item, index) => {
      const label = `design_resource_handoff.acceptance_blockers[${index}]`;
      const row = object(item, label, [
        "key",
        "target_refs",
        "subject_refs",
        "dimensions",
        "source_item_refs",
        "verification_methods",
        "required_capabilities",
        "description",
      ]);
      return {
        key: contractKey(row.key, `${label}.key`),
        target_refs: contractKeys(row.target_refs, `${label}.target_refs`),
        subject_refs: stableKeys(row.subject_refs, `${label}.subject_refs`),
        dimensions: array(row.dimensions, `${label}.dimensions`).map(
          (dimension, itemIndex) =>
            literal(
              dimension,
              DESIGN_RESOURCE_DIMENSIONS,
              `${label}.dimensions[${itemIndex}]`,
            ),
        ),
        source_item_refs: sourceItemKeys(
          row.source_item_refs,
          `${label}.source_item_refs`,
        ),
        verification_methods: verificationMethods(
          row.verification_methods,
          `${label}.verification_methods`,
        ),
        required_capabilities: array(
          row.required_capabilities,
          `${label}.required_capabilities`,
        ).map((capability, capabilityIndex) =>
          literal(
            capability,
            EXECUTION_TARGET_CAPABILITIES,
            `${label}.required_capabilities[${capabilityIndex}]`,
          ),
        ),
        description: string(row.description, `${label}.description`),
      };
    },
  );
}
