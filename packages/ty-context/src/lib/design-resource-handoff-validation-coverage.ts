import {
  DESIGN_RESOURCE_EVIDENCE_BY_DIMENSION,
  DESIGN_RESOURCE_METHODS_BY_DIMENSION,
} from "./design-resource-handoff-policy.js";
import {
  DESIGN_RESOURCE_DIMENSIONS,
  type DesignResourceHandoffV1,
} from "./design-resource-handoff-types.js";
import {
  invalidDesignResourceHandoff,
  requireDesignSourceItemKind,
  requireKnownDesignResourceRef,
  requireNonemptyDesignResourceValues,
  requireUniqueDesignResourceValues,
} from "./design-resource-handoff-validation-primitives.js";

export function validateDesignResourceCoverage(
  handoff: DesignResourceHandoffV1,
  subjects: Map<string, unknown>,
  targets: Map<string, DesignResourceHandoffV1["targets"][number]>,
  conditions: Map<string, unknown>,
  evidence: Map<string, DesignResourceHandoffV1["evidence"][number]>,
  sourceItems: Map<string, string>,
): void {
  const cells = new Set<string>();
  const unresolved: string[] = [];
  for (const row of handoff.coverage) {
    requireNonemptyDesignResourceValues(
      row.subject_refs,
      `coverage_subject_refs_required:${row.key}`,
    );
    requireNonemptyDesignResourceValues(
      row.source_item_refs,
      `coverage_source_item_refs_required:${row.key}`,
    );
    for (const [name, values] of [
      ["subject_ref", row.subject_refs],
      ["target_ref", row.target_refs],
      ["condition_ref", row.condition_refs],
      ["evidence_ref", row.evidence_refs],
      ["source_item_ref", row.source_item_refs],
      ["verification_method", row.verification_methods],
    ] as const)
      requireUniqueDesignResourceValues(
        values,
        `coverage_${name}_duplicate:${row.key}`,
      );
    for (const ref of row.subject_refs)
      requireKnownDesignResourceRef(subjects, ref, "subject");
    for (const ref of row.source_item_refs) {
      requireKnownDesignResourceRef(sourceItems, ref, "source_item");
      requireDesignSourceItemKind(sourceItems, ref);
    }
    validateCoverageApplicability(row, handoff, targets, conditions, cells);
    if (row.disposition === "covered")
      validateCoveredRow(row, targets, conditions, evidence);
    else validateNoncoveredRow(row);
    if (
      row.disposition === "decision_required" ||
      row.disposition === "unavailable"
    )
      unresolved.push(row.key);
  }
  for (const subject of handoff.subjects)
    for (const targetRef of subject.target_refs) {
      const target = targets.get(targetRef)!;
      for (const conditionRef of target.condition_refs)
        for (const dimension of DESIGN_RESOURCE_DIMENSIONS) {
          const cell = coverageCell(
            subject.key,
            targetRef,
            conditionRef,
            dimension,
          );
          if (!cells.has(cell))
            invalidDesignResourceHandoff(
              "coverage_cell_missing",
              `${subject.key}:${targetRef}:${conditionRef}:${dimension}`,
            );
        }
    }
  if (unresolved.length)
    invalidDesignResourceHandoff(
      "unresolved_coverage",
      unresolved.sort().join(","),
    );
}

function validateCoverageApplicability(
  row: DesignResourceHandoffV1["coverage"][number],
  handoff: DesignResourceHandoffV1,
  targets: Map<string, DesignResourceHandoffV1["targets"][number]>,
  conditions: Map<string, unknown>,
  cells: Set<string>,
): void {
  requireNonemptyDesignResourceValues(
    row.target_refs,
    `coverage_target_refs_required:${row.key}`,
  );
  requireNonemptyDesignResourceValues(
    row.condition_refs,
    `coverage_condition_refs_required:${row.key}`,
  );
  for (const targetRef of row.target_refs)
    requireKnownDesignResourceRef(targets, targetRef, "target");
  for (const conditionRef of row.condition_refs)
    requireKnownDesignResourceRef(conditions, conditionRef, "condition");
  const subjects = new Map(handoff.subjects.map((item) => [item.key, item]));
  for (const subjectRef of row.subject_refs) {
    const subject = subjects.get(subjectRef)!;
    for (const targetRef of row.target_refs) {
      if (!subject.target_refs.includes(targetRef))
        invalidDesignResourceHandoff(
          "coverage_target_outside_subject",
          `${row.key}:${subjectRef}:${targetRef}`,
        );
      const target = targets.get(targetRef)!;
      for (const conditionRef of row.condition_refs) {
        if (!target.condition_refs.includes(conditionRef))
          invalidDesignResourceHandoff(
            "coverage_condition_outside_target",
            `${row.key}:${targetRef}:${conditionRef}`,
          );
        const cell = coverageCell(
          subjectRef,
          targetRef,
          conditionRef,
          row.dimension,
        );
        if (cells.has(cell))
          invalidDesignResourceHandoff(
            "coverage_cell_duplicate",
            `${subjectRef}:${targetRef}:${conditionRef}:${row.dimension}`,
          );
        cells.add(cell);
      }
    }
  }
}

function coverageCell(
  subjectRef: string,
  targetRef: string,
  conditionRef: string,
  dimension: string,
): string {
  return `${subjectRef}\0${targetRef}\0${conditionRef}\0${dimension}`;
}

export function validateDesignResourceBlockers(
  handoff: DesignResourceHandoffV1,
  subjects: Map<string, unknown>,
  targets: Map<string, unknown>,
  sourceItems: Map<string, string>,
): void {
  for (const blocker of handoff.acceptance_blockers) {
    for (const [name, values] of [
      ["target_refs", blocker.target_refs],
      ["subject_refs", blocker.subject_refs],
      ["dimensions", blocker.dimensions],
      ["source_item_refs", blocker.source_item_refs],
      ["verification_methods", blocker.verification_methods],
      ["required_capabilities", blocker.required_capabilities],
    ] as const) {
      requireNonemptyDesignResourceValues(
        values,
        `acceptance_blocker_${name}_required:${blocker.key}`,
      );
      requireUniqueDesignResourceValues(
        values,
        `acceptance_blocker_${name}_duplicate:${blocker.key}`,
      );
    }
    for (const ref of blocker.target_refs)
      requireKnownDesignResourceRef(targets, ref, "target");
    for (const ref of blocker.subject_refs)
      requireKnownDesignResourceRef(subjects, ref, "subject");
    for (const ref of blocker.source_item_refs) {
      requireKnownDesignResourceRef(sourceItems, ref, "source_item");
      requireDesignSourceItemKind(sourceItems, ref);
    }
    for (const dimension of blocker.dimensions)
      if (
        !blocker.verification_methods.some((method) =>
          DESIGN_RESOURCE_METHODS_BY_DIMENSION[dimension].includes(method),
        )
      )
        invalidDesignResourceHandoff(
          "acceptance_blocker_dimension_method_missing",
          `${blocker.key}:${dimension}`,
        );
    const matchedCoverage = handoff.coverage.filter(
      (row) =>
        row.disposition === "covered" &&
        blocker.target_refs.some((ref) => row.target_refs.includes(ref)) &&
        blocker.subject_refs.some((ref) => row.subject_refs.includes(ref)) &&
        blocker.dimensions.includes(row.dimension),
    );
    for (const ref of blocker.source_item_refs)
      if (!matchedCoverage.some((row) => row.source_item_refs.includes(ref)))
        invalidDesignResourceHandoff(
          "acceptance_blocker_source_item_without_coverage",
          `${blocker.key}:${ref}`,
        );
    for (const method of blocker.verification_methods)
      if (
        !matchedCoverage.some((row) =>
          row.verification_methods.includes(method),
        )
      )
        invalidDesignResourceHandoff(
          "acceptance_blocker_method_without_coverage",
          `${blocker.key}:${method}`,
        );
  }
}

export function validateDesignResourceReachability(
  handoff: DesignResourceHandoffV1,
): void {
  const targetResources = new Set(
    handoff.targets.flatMap((target) => target.resource_refs),
  );
  const targetConditions = new Set(
    handoff.targets.flatMap((target) => target.condition_refs),
  );
  const coverageTargets = new Set(
    handoff.coverage.flatMap((row) => row.target_refs),
  );
  const coverageEvidence = new Set(
    handoff.coverage.flatMap((row) => row.evidence_refs),
  );
  for (const resource of handoff.resources)
    if (!targetResources.has(resource.key))
      invalidDesignResourceHandoff("resource_unreferenced", resource.key);
  for (const condition of handoff.conditions)
    if (!targetConditions.has(condition.key))
      invalidDesignResourceHandoff("condition_unreferenced", condition.key);
  for (const target of handoff.targets)
    if (!coverageTargets.has(target.key))
      invalidDesignResourceHandoff(
        "target_without_covered_dimension",
        target.key,
      );
  for (const item of handoff.evidence)
    if (!coverageEvidence.has(item.key))
      invalidDesignResourceHandoff("evidence_unreferenced", item.key);
}

function validateCoveredRow(
  row: DesignResourceHandoffV1["coverage"][number],
  targets: Map<string, DesignResourceHandoffV1["targets"][number]>,
  conditions: Map<string, unknown>,
  evidence: Map<string, DesignResourceHandoffV1["evidence"][number]>,
): void {
  for (const [name, values] of [
    ["target_refs", row.target_refs],
    ["condition_refs", row.condition_refs],
    ["evidence_refs", row.evidence_refs],
    ["verification_methods", row.verification_methods],
  ] as const)
    requireNonemptyDesignResourceValues(
      values,
      `coverage_${name}_required:${row.key}`,
    );
  for (const ref of row.target_refs)
    requireKnownDesignResourceRef(targets, ref, "target");
  for (const ref of row.condition_refs)
    requireKnownDesignResourceRef(conditions, ref, "condition");
  for (const ref of row.evidence_refs)
    requireKnownDesignResourceRef(evidence, ref, "evidence");

  const allowedEvidence = new Set(
    DESIGN_RESOURCE_EVIDENCE_BY_DIMENSION[row.dimension],
  );
  const allowedMethods = new Set(
    DESIGN_RESOURCE_METHODS_BY_DIMENSION[row.dimension],
  );
  for (const ref of row.evidence_refs) {
    const item = evidence.get(ref)!;
    if (!allowedEvidence.has(item.kind))
      invalidDesignResourceHandoff(
        "coverage_evidence_kind_incompatible",
        `${row.key}:${row.dimension}:${item.key}:${item.kind}`,
      );
  }
  for (const method of row.verification_methods)
    if (!allowedMethods.has(method))
      invalidDesignResourceHandoff(
        "coverage_verification_method_incompatible",
        `${row.key}:${row.dimension}:${method}`,
      );
  for (const targetRef of row.target_refs)
    for (const conditionRef of row.condition_refs)
      if (
        !row.evidence_refs.some((evidenceRef) => {
          const item = evidence.get(evidenceRef)!;
          return (
            targets.get(targetRef)!.resource_refs.includes(item.resource_ref) &&
            item.condition_refs.includes(conditionRef)
          );
        })
      )
        invalidDesignResourceHandoff(
          "coverage_cell_without_evidence",
          `${row.key}:${targetRef}:${conditionRef}`,
        );
}

function validateNoncoveredRow(
  row: DesignResourceHandoffV1["coverage"][number],
): void {
  for (const [name, values] of [
    ["evidence_refs", row.evidence_refs],
    ["verification_methods", row.verification_methods],
  ] as const)
    if (values.length)
      invalidDesignResourceHandoff(
        "noncovered_binding_forbidden",
        `${row.key}:${row.disposition}:${name}`,
      );
}
