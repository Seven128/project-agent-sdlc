import { Buffer } from "node:buffer";
import type { DeliveryContractV2 } from "./long-task-delivery-types.js";
import {
  applyCompactAuthoringSelectors,
  compactAuthoringTable,
  compactCapacityBudget,
  compactDeterministicTemplates,
  compactWithoutFields as withoutFields,
} from "./compact-authoring-support.js";
import { applyCompactSharedStructures } from "./compact-shared-structure-authoring.js";
import { longTaskCompactSharedStructureTargets } from "./long-task-compact-primitives.js";
import type { SemanticFactRevisionIdentityV1 } from "./semantic-fact-compact-carrier.js";
import { canonicalValueJson } from "./strict-codec.js";
import {
  assertSameCompactKeys as assertSameKeys,
  compactAssertionProjection as assertionProjection,
  compactClaimProjection as claimProjection,
  compactRevisionMap as revisionMap,
  compactUniqueClaimStatements as uniqueClaimStatements,
} from "./long-task-compact-authoring-projections.js";

export function createLongTaskCompactContract(
  contractInput: DeliveryContractV2,
  factRevisions: SemanticFactRevisionIdentityV1[],
  obligationRevisions: SemanticFactRevisionIdentityV1[],
): Record<string, unknown> {
  const contract = structuredClone(contractInput);
  const factRevisionByKey = revisionMap(factRevisions, "fact");
  const obligationRevisionByKey = revisionMap(
    obligationRevisions,
    "obligation",
  );
  const sourceClaims = structuredClone(contract.source_claims);
  const revisionedContract = structuredClone(contractInput);
  for (const outcome of revisionedContract.outcomes) {
    for (const binding of outcome.semantic_fact_bindings.facts) {
      const digest = factRevisionByKey.get(binding.fact_ref);
      if (digest) binding.fact_revision_digest = digest;
    }
    for (const binding of outcome.semantic_fact_bindings.proofs) {
      const digest = obligationRevisionByKey.get(binding.proof_ref);
      if (digest) binding.obligation_revision_digest = digest;
    }
  }
  const claimByStatement = uniqueClaimStatements(contract.source_claims);
  const claimProjections: Record<string, unknown>[] = [];
  const facts: Record<string, unknown>[] = [];
  const proofBindings: Record<string, unknown>[] = [];
  const assertionProjections: Record<string, unknown>[] = [];
  const base = contract as unknown as Record<string, unknown>;
  delete base.source_claims;

  for (const outcome of contract.outcomes) {
    for (const row of outcome.product.requirements)
      claimProjections.push(
        claimProjection(outcome.key, "requirement", row, claimByStatement),
      );
    for (const row of outcome.technical.obligations)
      claimProjections.push(
        claimProjection(outcome.key, "obligation", row, claimByStatement),
      );
    for (const row of outcome.technical.forbidden_shortcuts)
      claimProjections.push(
        claimProjection(
          outcome.key,
          "forbidden_shortcut",
          row,
          claimByStatement,
        ),
      );
    for (const row of outcome.product.non_completing_outcomes)
      claimProjections.push(
        claimProjection(
          outcome.key,
          "non_completing_outcome",
          row,
          claimByStatement,
        ),
      );
    delete (outcome.product as unknown as Record<string, unknown>).requirements;
    delete (outcome.product as unknown as Record<string, unknown>)
      .non_completing_outcomes;
    delete (outcome.technical as unknown as Record<string, unknown>)
      .obligations;
    delete (outcome.technical as unknown as Record<string, unknown>)
      .forbidden_shortcuts;

    for (const binding of outcome.semantic_fact_bindings.facts) {
      const revision = factRevisionByKey.get(binding.fact_ref);
      if (!revision)
        throw new Error(
          `long_task_compact_authoring_invalid:fact_revision_missing:${binding.fact_ref}`,
        );
      facts.push({
        outcome_ref: outcome.key,
        manifest_ref: outcome.semantic_fact_bindings.manifest_ref,
        fact_key: binding.fact_ref,
        fact_revision_digest: revision,
        claim_ref: binding.claim_ref,
        applicability_ref: binding.applicability_ref,
      });
    }
    for (const binding of outcome.semantic_fact_bindings.proofs) {
      const revision = obligationRevisionByKey.get(binding.proof_ref);
      if (!revision)
        throw new Error(
          `long_task_compact_authoring_invalid:obligation_revision_missing:${binding.proof_ref}`,
        );
      proofBindings.push({
        outcome_ref: outcome.key,
        obligation_key: binding.proof_ref,
        obligation_revision_digest: revision,
        fact_key: binding.fact_ref,
        ...withoutFields(binding as unknown as Record<string, unknown>, [
          "proof_ref",
          "fact_ref",
          "obligation_revision_digest",
        ]),
      });
    }
    delete (outcome as unknown as Record<string, unknown>)
      .semantic_fact_bindings;

    for (const check of outcome.acceptance.checks) {
      const retained = [];
      for (const [position, assertion] of check.positive_assertions.entries()) {
        const projection = assertionProjection(
          outcome.key,
          check.key,
          position,
          assertion as unknown as Record<string, unknown>,
          claimByStatement,
          factRevisionByKey,
        );
        if (projection) assertionProjections.push(projection);
        else retained.push(assertion);
      }
      check.positive_assertions = retained;
    }
  }

  assertSameKeys(
    [...factRevisionByKey.keys()],
    facts.map((fact) => String(fact.fact_key)),
    "fact_set",
  );
  assertSameKeys(
    [...obligationRevisionByKey.keys()],
    proofBindings.map((proof) => String(proof.obligation_key)),
    "obligation_set",
  );

  const proofTemplateExcludedFields = [
    "outcome_ref",
    "obligation_key",
    "obligation_revision_digest",
    "fact_key",
    "assertion_ref",
    "confirmation_ref",
  ];
  const proofFamilies = compactDeterministicTemplates(
    proofBindings,
    proofTemplateExcludedFields,
    "proof-template",
  );
  const proofFamilyByKey = new Map(
    proofFamilies.templates.map((template) => [template.key, template.value]),
  );
  const obligationRows = proofBindings.map((proof, index) => ({
    outcome_ref: proof.outcome_ref,
    obligation_key: proof.obligation_key,
    obligation_revision_digest: proof.obligation_revision_digest,
    fact_key: proof.fact_key,
    template_ref: proofFamilies.template_refs[index],
    overrides: withoutFields(proof, [
      "outcome_ref",
      "obligation_key",
      "obligation_revision_digest",
      "fact_key",
      ...Object.keys(proofFamilyByKey.get(proofFamilies.template_refs[index])!),
    ]),
  }));
  const exceptions = claimProjections
    .filter(
      (row) =>
        canonicalValueJson(row.required_proof_surfaces) !==
          canonicalValueJson(["runtime_behavior"]) &&
        row.required_proof_surfaces !== null,
    )
    .map((row) => ({
      key: `exception.claim-projection.${row.projection_key}`,
      target_ref: row.projection_key,
      rationale:
        "This projection explicitly retains a non-default required proof-surface set.",
    }));
  base.compact_semantic_carrier = {
    schema_version: "long-task-compact-carrier-v1",
    capacity: {},
    selectors: [],
    shared_structures: [],
    claim_catalog: compactAuthoringTable(sourceClaims),
    claim_projections: compactAuthoringTable(claimProjections),
    fact_sets: [
      {
        key: "fact-set.complete-contract",
        ...compactAuthoringTable(facts),
      },
    ],
    proof_templates: proofFamilies.templates.map((template) => ({
      key: template.key,
      binding: template.value,
    })),
    obligations: compactAuthoringTable(obligationRows),
    assertion_projections: compactAuthoringTable(assertionProjections),
    exceptions,
  };
  const { value, selectors } = applyCompactAuthoringSelectors(base);
  const carrier = value.compact_semantic_carrier as Record<string, unknown>;
  carrier.selectors = selectors;
  const structures = applyCompactSharedStructures(
    longTaskCompactSharedStructureTargets(value, carrier),
  );
  carrier.shared_structures = structures.catalog;
  const measured = {
    claims: sourceClaims.length,
    claim_projections: claimProjections.length,
    selector_members: selectors.reduce(
      (sum, selector) => sum + selector.members.length,
      0,
    ),
    structure_families: structures.statistics.emitted_family_count,
    structure_references: structures.statistics.reference_count,
    structure_arguments: structures.statistics.argument_count,
    facts: facts.length,
    obligations: obligationRows.length,
    assertions: assertionProjections.length,
    canonical_bytes: Buffer.byteLength(
      canonicalValueJson(revisionedContract),
      "utf8",
    ),
  };
  carrier.capacity = {
    theoretical_ground_universe: "not_materialized",
    measured,
    maximum: Object.fromEntries(
      Object.entries(measured).map(([name, count]) => [
        name,
        compactCapacityBudget(name, count),
      ]),
    ),
  };
  return value;
}
