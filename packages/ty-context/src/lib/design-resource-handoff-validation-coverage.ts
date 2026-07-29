import { DESIGN_RESOURCE_METHODS_BY_DIMENSION } from "./design-resource-handoff-policy.js";
import type { DesignResourceHandoffV1 } from "./design-resource-handoff-types.js";
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
  facts: Map<string, DesignResourceHandoffV1["facts"][number]>,
  sourceItems: Map<string, string>,
): void {
  const variations = new Map(
    handoff.variations.map((item) => [item.key, item]),
  );
  const properties = new Map(
    handoff.properties.map((item) => [item.key, item]),
  );
  const factCells = new Map(handoff.fact_cells.map((item) => [item.key, item]));
  const proofs = new Map(
    handoff.proof_obligations.map((item) => [item.key, item]),
  );
  const referencedCells = new Set<string>();
  const referencedFacts = new Set<string>();
  const referencedProofs = new Set<string>();
  for (const row of handoff.coverage) {
    for (const [name, values] of [
      ["subject_ref", row.subject_refs],
      ["target_ref", row.target_refs],
      ["condition_ref", row.condition_refs],
      ["variation_ref", row.variation_refs],
      ["property_ref", row.property_refs],
      ["evidence_ref", row.evidence_refs],
      ["fact_cell_ref", row.fact_cell_refs],
      ["fact_ref", row.fact_refs],
      ["proof_obligation_ref", row.proof_obligation_refs],
      ["source_item_ref", row.source_item_refs],
      ["verification_method", row.verification_methods],
    ] as const)
      requireUniqueDesignResourceValues(
        values,
        `coverage_${name}_duplicate:${row.key}`,
      );
    for (const [name, values] of [
      ["subject_refs", row.subject_refs],
      ["target_refs", row.target_refs],
      ["condition_refs", row.condition_refs],
      ["variation_refs", row.variation_refs],
      ["property_refs", row.property_refs],
      ["fact_cell_refs", row.fact_cell_refs],
      ["source_item_refs", row.source_item_refs],
    ] as const)
      requireNonemptyDesignResourceValues(
        values,
        `coverage_${name}_required:${row.key}`,
      );
    for (const ref of row.subject_refs)
      requireKnownDesignResourceRef(subjects, ref, "subject");
    for (const ref of row.target_refs)
      requireKnownDesignResourceRef(targets, ref, "target");
    for (const ref of row.condition_refs)
      requireKnownDesignResourceRef(conditions, ref, "condition");
    for (const ref of row.variation_refs)
      requireKnownDesignResourceRef(variations, ref, "variation");
    for (const ref of row.property_refs)
      requireKnownDesignResourceRef(properties, ref, "property");
    for (const ref of row.source_item_refs) {
      requireKnownDesignResourceRef(sourceItems, ref, "source_item");
      requireDesignSourceItemKind(sourceItems, ref);
    }
    const cells = row.fact_cell_refs.map((ref) => {
      requireKnownDesignResourceRef(factCells, ref, "fact_cell");
      if (referencedCells.has(ref))
        invalidDesignResourceHandoff(
          "coverage_fact_cell_ref_duplicate",
          `${row.key}:${ref}`,
        );
      referencedCells.add(ref);
      return factCells.get(ref)!;
    });
    for (const cell of cells) {
      const property = properties.get(cell.property_ref)!;
      if (
        property.dimension !== row.dimension ||
        cell.disposition !== row.disposition ||
        !row.subject_refs.includes(cell.subject_ref) ||
        !row.target_refs.includes(cell.target_ref) ||
        !row.condition_refs.includes(cell.condition_ref) ||
        !row.variation_refs.includes(cell.variation_ref) ||
        !row.property_refs.includes(cell.property_ref)
      )
        invalidDesignResourceHandoff(
          "coverage_fact_cell_mismatch",
          `${row.key}:${cell.key}`,
        );
    }
    assertSameSet(
      row.subject_refs,
      cells.map((cell) => cell.subject_ref),
      "coverage_subject_refs_mismatch",
      row.key,
    );
    assertSameSet(
      row.target_refs,
      cells.map((cell) => cell.target_ref),
      "coverage_target_refs_mismatch",
      row.key,
    );
    assertSameSet(
      row.condition_refs,
      cells.map((cell) => cell.condition_ref),
      "coverage_condition_refs_mismatch",
      row.key,
    );
    assertSameSet(
      row.variation_refs,
      cells.map((cell) => cell.variation_ref),
      "coverage_variation_refs_mismatch",
      row.key,
    );
    assertSameSet(
      row.property_refs,
      cells.map((cell) => cell.property_ref),
      "coverage_property_refs_mismatch",
      row.key,
    );
    if (row.disposition === "covered")
      validateCoveredRow(
        row,
        cells,
        evidence,
        facts,
        proofs,
        referencedFacts,
        referencedProofs,
      );
    else validateNoncoveredRow(row, cells);
  }
  assertSameSet(
    [...referencedCells],
    handoff.fact_cells.map((cell) => cell.key),
    "coverage_fact_cell_set_mismatch",
    "handoff",
  );
  assertSameSet(
    [...referencedFacts],
    handoff.facts.map((fact) => fact.key),
    "coverage_fact_set_mismatch",
    "handoff",
  );
  assertSameSet(
    [...referencedProofs],
    handoff.proof_obligations.map((proof) => proof.key),
    "coverage_proof_obligation_set_mismatch",
    "handoff",
  );
}

function validateCoveredRow(
  row: DesignResourceHandoffV1["coverage"][number],
  cells: DesignResourceHandoffV1["fact_cells"],
  evidence: Map<string, DesignResourceHandoffV1["evidence"][number]>,
  facts: Map<string, DesignResourceHandoffV1["facts"][number]>,
  proofs: Map<string, DesignResourceHandoffV1["proof_obligations"][number]>,
  referencedFacts: Set<string>,
  referencedProofs: Set<string>,
): void {
  for (const [name, values] of [
    ["evidence_refs", row.evidence_refs],
    ["fact_refs", row.fact_refs],
    ["proof_obligation_refs", row.proof_obligation_refs],
    ["verification_methods", row.verification_methods],
  ] as const)
    requireNonemptyDesignResourceValues(
      values,
      `coverage_${name}_required:${row.key}`,
    );
  const expectedFactRefs = cells.map((cell) => cell.fact_ref!);
  assertSameSet(
    row.fact_refs,
    expectedFactRefs,
    "coverage_fact_refs_mismatch",
    row.key,
  );
  for (const ref of row.fact_refs) {
    requireKnownDesignResourceRef(facts, ref, "fact");
    if (referencedFacts.has(ref))
      invalidDesignResourceHandoff(
        "coverage_fact_ref_duplicate",
        `${row.key}:${ref}`,
      );
    referencedFacts.add(ref);
  }
  const localFacts = row.fact_refs.map((ref) => facts.get(ref)!);
  for (const ref of row.evidence_refs)
    requireKnownDesignResourceRef(evidence, ref, "evidence");
  assertSameSet(
    row.evidence_refs,
    localFacts.flatMap((fact) => fact.evidence_refs),
    "coverage_fact_evidence_refs_mismatch",
    row.key,
  );
  assertSameSet(
    row.source_item_refs,
    localFacts.flatMap((fact) => fact.source_item_refs),
    "coverage_fact_source_item_refs_mismatch",
    row.key,
  );
  const localProofs = row.proof_obligation_refs.map((ref) => {
    requireKnownDesignResourceRef(proofs, ref, "proof_obligation");
    if (referencedProofs.has(ref))
      invalidDesignResourceHandoff(
        "coverage_proof_obligation_ref_duplicate",
        `${row.key}:${ref}`,
      );
    referencedProofs.add(ref);
    return proofs.get(ref)!;
  });
  assertSameSet(
    row.proof_obligation_refs,
    [...proofs.values()]
      .filter((proof) => row.fact_refs.includes(proof.fact_ref))
      .map((proof) => proof.key),
    "coverage_proof_obligation_refs_mismatch",
    row.key,
  );
  assertSameSet(
    row.verification_methods,
    localProofs.map((proof) => proof.method),
    "coverage_verification_methods_mismatch",
    row.key,
  );
  const allowedMethods = new Set(
    DESIGN_RESOURCE_METHODS_BY_DIMENSION[row.dimension],
  );
  for (const method of row.verification_methods)
    if (!allowedMethods.has(method))
      invalidDesignResourceHandoff(
        "coverage_verification_method_incompatible",
        `${row.key}:${row.dimension}:${method}`,
      );
}

function validateNoncoveredRow(
  row: DesignResourceHandoffV1["coverage"][number],
  cells: DesignResourceHandoffV1["fact_cells"],
): void {
  for (const [name, values] of [
    ["evidence_refs", row.evidence_refs],
    ["fact_refs", row.fact_refs],
    ["proof_obligation_refs", row.proof_obligation_refs],
    ["verification_methods", row.verification_methods],
  ] as const)
    if (values.length)
      invalidDesignResourceHandoff(
        "noncovered_binding_forbidden",
        `${row.key}:${row.disposition}:${name}`,
      );
  assertSameSet(
    row.source_item_refs,
    cells.flatMap((cell) => cell.source_item_refs),
    "coverage_noncovered_source_item_refs_mismatch",
    row.key,
  );
  if (
    row.disposition === "decision_required" ||
    row.disposition === "unavailable"
  )
    invalidDesignResourceHandoff("unresolved_coverage", row.key);
}

export function validateDesignResourceBlockers(
  handoff: DesignResourceHandoffV1,
  subjects: Map<string, unknown>,
  targets: Map<string, unknown>,
  sourceItems: Map<string, string>,
): void {
  const cells = new Map(handoff.fact_cells.map((item) => [item.key, item]));
  const facts = new Map(handoff.facts.map((item) => [item.key, item]));
  const proofs = new Map(
    handoff.proof_obligations.map((item) => [item.key, item]),
  );
  for (const blocker of handoff.acceptance_blockers) {
    for (const [name, values] of [
      ["target_refs", blocker.target_refs],
      ["subject_refs", blocker.subject_refs],
      ["dimensions", blocker.dimensions],
      ["fact_cell_refs", blocker.fact_cell_refs],
      ["fact_refs", blocker.fact_refs],
      ["proof_obligation_refs", blocker.proof_obligation_refs],
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
    for (const ref of blocker.fact_cell_refs)
      requireKnownDesignResourceRef(cells, ref, "fact_cell");
    for (const ref of blocker.fact_refs)
      requireKnownDesignResourceRef(facts, ref, "fact");
    for (const ref of blocker.proof_obligation_refs)
      requireKnownDesignResourceRef(proofs, ref, "proof_obligation");
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
    for (const ref of blocker.fact_refs)
      if (
        !blocker.fact_cell_refs.includes(facts.get(ref)!.cell_ref) ||
        !blocker.subject_refs.includes(facts.get(ref)!.subject_ref) ||
        !blocker.target_refs.includes(facts.get(ref)!.target_ref)
      )
        invalidDesignResourceHandoff(
          "acceptance_blocker_fact_scope_mismatch",
          `${blocker.key}:${ref}`,
        );
    for (const ref of blocker.proof_obligation_refs) {
      const proof = proofs.get(ref)!;
      if (
        !blocker.fact_refs.includes(proof.fact_ref) ||
        !blocker.verification_methods.includes(proof.method)
      )
        invalidDesignResourceHandoff(
          "acceptance_blocker_proof_scope_mismatch",
          `${blocker.key}:${ref}`,
        );
    }
  }
  if (handoff.acceptance_blockers.length)
    invalidDesignResourceHandoff(
      "acceptance_blockers_unresolved",
      handoff.acceptance_blockers.map((item) => item.key).join(","),
    );
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
  const lineageRefs = new Set(
    handoff.facts.flatMap((fact) => [
      ...fact.lineage.token_chain_refs,
      ...fact.lineage.override_chain_refs,
    ]),
  );
  const oracleRefs = new Set(
    handoff.proof_obligations.map((proof) => proof.oracle_ref),
  );
  const environmentRefs = new Set(
    handoff.proof_obligations.map((proof) => proof.environment_ref),
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
  for (const node of handoff.lineage_nodes)
    if (!lineageRefs.has(node.key))
      invalidDesignResourceHandoff("lineage_node_unreferenced", node.key);
  for (const oracle of handoff.oracles)
    if (!oracleRefs.has(oracle.key))
      invalidDesignResourceHandoff("oracle_unreferenced", oracle.key);
  for (const environment of handoff.environments)
    if (!environmentRefs.has(environment.key))
      invalidDesignResourceHandoff("environment_unreferenced", environment.key);
}

function assertSameSet(
  actual: string[],
  expected: string[],
  code: string,
  detail: string,
): void {
  const left = [...new Set(actual)].sort();
  const right = [...new Set(expected)].sort();
  if (
    left.length !== right.length ||
    left.some((item, index) => item !== right[index])
  )
    invalidDesignResourceHandoff(
      code,
      `${detail}:${left.join(",")}:${right.join(",")}`,
    );
}
