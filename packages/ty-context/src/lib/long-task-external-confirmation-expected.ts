import type { AcceptanceObligationReachabilityV1 } from "./long-task-acceptance-reachability.js";
import {
  admittedObjectiveExternalComparator,
  objectiveExternalClaimActualAuthority,
  objectivePopulationSet,
} from "./long-task-acceptance-reachability-helpers.js";
import { controlFieldFacts } from "./long-task-control-fields.js";
import { DESIGN_RESOURCE_COMPARATORS } from "./design-resource-fact-enums.js";
import { findCompiledDesignFactObligation } from "./long-task-design-obligation.js";
import type { CompiledDeliveryContractV2 } from "./long-task-delivery-types.js";
import { evaluateExactDigestComparison } from "./long-task-exact-comparison.js";
import type { ExternalConfirmationExpectedV1 } from "./long-task-external-confirmation-types.js";
import type { SemanticFactManifestV1 } from "./semantic-fact-types.js";
import { canonicalValueJson, sha256Hex } from "./strict-codec.js";

export function expectedForExternalObligation(
  compiled: CompiledDeliveryContractV2,
  manifest: SemanticFactManifestV1,
  row: AcceptanceObligationReachabilityV1,
  authorityRef: string,
): ExternalConfirmationExpectedV1 {
  if (row.fact_ref && row.proof_ref) {
    const fact = manifest.facts.find(
      (candidate) => candidate.key === row.fact_ref,
    );
    const proof = manifest.proof_obligations.find(
      (candidate) => candidate.key === row.proof_ref,
    );
    if (fact && proof)
      return {
        authority_ref: authorityRef,
        kind: "semantic_fact",
        statement: null,
        located_value: fact.expected,
        comparison: proof.comparison,
      };
    const design = findCompiledDesignFactObligation(compiled, row);
    if (design)
      return {
        authority_ref: authorityRef,
        kind: "design_fact",
        statement: null,
        located_value: design.expected,
        comparison: {
          comparator: "strict_digest_equal",
          mode: "exact",
          parameters: {
            kind: "design_strict_comparison",
            ref: row.proof_ref,
            sha256: sha256Hex(canonicalValueJson(design.comparison)),
          },
          tolerance: null,
          mask: null,
        },
      };
    throw new Error(
      `external_confirmation_expected_fact_missing:${row.obligation_ref}`,
    );
  }
  const statement = contractClaimStatement(compiled, row.claim_ref);
  if (statement === null)
    throw new Error(
      `external_confirmation_expected_claim_unresolved:${row.claim_ref}`,
    );
  const claimActual = objectiveExternalClaimActualAuthority(
    compiledChecks(compiled),
    row,
  );
  if (claimActual) {
    if (
      !Object.hasOwn(claimActual, "expected_value") ||
      sha256Hex(canonicalValueJson(claimActual.expected_value)) !==
        claimActual.expected_value_sha256
    )
      throw new Error(
        `external_confirmation_expected_claim_actual_invalid:${row.obligation_ref}`,
      );
    return {
      authority_ref: authorityRef,
      kind: "contract_claim_actual",
      statement,
      located_value: {
        kind: "compiled_assertion",
        ref: claimActual.assertion_ref,
        sha256: claimActual.expected_value_sha256,
        value: claimActual.expected_value,
      },
      comparison: {
        comparator: claimActual.comparison.comparator,
        mode: "exact",
        parameters: {
          kind: "compiled_assertion_comparison",
          ref: claimActual.expected_identity,
          sha256: claimActual.comparison.parameters_sha256!,
        },
        tolerance: null,
        mask: null,
      },
    };
  }
  return {
    authority_ref: authorityRef,
    kind: "contract_claim",
    statement,
    located_value: null,
    comparison: null,
  };
}

export function objectiveExternalComparison(
  compiled: CompiledDeliveryContractV2,
  manifest: SemanticFactManifestV1,
  row: AcceptanceObligationReachabilityV1,
  actual: unknown,
): { passed: boolean } | null {
  if (!row.fact_ref && !row.proof_ref) {
    const authority = objectiveExternalClaimActualAuthority(
      compiledChecks(compiled),
      row,
    );
    if (!authority || authority.comparison.parameters_sha256 === null)
      return null;
    const projectedActual =
      authority.actual_projection === "raw_exact"
        ? actual
        : authority.actual_projection === "presence_boolean"
          ? true
          : Boolean(actual);
    return evaluateExactDigestComparison({
      identity: {
        confirmation_ref: row.confirmation_ref,
        obligation_ref: row.source_obligation_ref,
        fact_ref: null,
        proof_ref: null,
        applicability_ref: row.applicability_ref,
      },
      actual_value_sha256: sha256Hex(canonicalValueJson(projectedActual)),
      expected_value_sha256: authority.expected_value_sha256,
      comparator: authority.comparison.comparator,
      mode: "exact",
      parameters_sha256: authority.comparison.parameters_sha256,
      tolerance_sha256: null,
      mask_sha256: null,
    });
  }
  if (!row.fact_ref || !row.proof_ref) return null;
  const fact = manifest.facts.find(
    (candidate) => candidate.key === row.fact_ref,
  );
  const proof = manifest.proof_obligations.find(
    (candidate) => candidate.key === row.proof_ref,
  );
  if (fact && proof && proof.fact_ref === fact.key) {
    const comparator = admittedObjectiveExternalComparator(
      manifest,
      row.fact_ref,
      row.proof_ref,
    );
    if (!comparator) return null;
    if (comparator === "population_set_equal") {
      const expected = fact.expected.value;
      if (!objectivePopulationSet(expected)) return null;
      const actualSet = objectivePopulationSet(actual) ? new Set(actual) : null;
      return {
        passed: Boolean(
          actualSet &&
          actualSet.size === expected.length &&
          expected.every((item) => actualSet.has(item)),
        ),
      };
    }
    return evaluateExactDigestComparison({
      identity: {
        confirmation_ref: row.confirmation_ref,
        obligation_ref: row.obligation_ref,
        fact_ref: row.fact_ref,
        proof_ref: row.proof_ref,
        applicability_ref: row.applicability_ref,
      },
      actual_value_sha256: sha256Hex(canonicalValueJson(actual)),
      expected_value_sha256: fact.expected.sha256,
      comparator: proof.comparison.comparator,
      mode: proof.comparison.mode,
      parameters_sha256: proof.comparison.parameters.sha256,
      tolerance_sha256: null,
      mask_sha256: null,
    });
  }
  const design = findCompiledDesignFactObligation(compiled, row);
  if (
    !design ||
    design.observation_sensitivity !== "plain" ||
    !DESIGN_RESOURCE_COMPARATORS.includes(
      design.comparison
        .comparator as (typeof DESIGN_RESOURCE_COMPARATORS)[number],
    )
  )
    return null;
  return {
    passed: sha256Hex(canonicalValueJson(actual)) === design.expected.sha256,
  };
}

function compiledChecks(compiled: CompiledDeliveryContractV2) {
  return [
    ...compiled.global.acceptance.checks,
    ...compiled.outcomes.flatMap((outcome) => outcome.acceptance.checks),
  ];
}

function contractClaimStatement(
  compiled: CompiledDeliveryContractV2,
  claimRef: string,
): string | null {
  if (claimRef.startsWith("GLOBAL."))
    return globalClaimStatement(compiled, claimRef.slice("GLOBAL.".length));
  const outcome = compiled.outcomes.find(
    (candidate) =>
      claimRef === candidate.key || claimRef.startsWith(`${candidate.key}.`),
  );
  if (!outcome) return null;
  const local = claimRef.slice(outcome.key.length + 1);
  if (local === "result") return outcome.product.observable_result;
  if (local === "control_relation_closure")
    return outcome.product.control_relation_closure.statement;
  const [kind, key, ...suffix] = local.split(".");
  const statements = {
    requirement: outcome.product.requirements,
    obligation: outcome.technical.obligations,
    non_completing: outcome.product.non_completing_outcomes,
    forbidden_shortcut: outcome.technical.forbidden_shortcuts,
    control_relation: outcome.product.control_relations,
  } as const;
  if (kind in statements)
    return (
      statements[kind as keyof typeof statements].find((row) => row.key === key)
        ?.statement ?? null
    );
  if (kind !== "control") return null;
  const control = outcome.product.controls.find((row) => row.key === key);
  if (!control) return null;
  return (
    controlFieldFacts(control).find(
      (row) => row.claim_field === suffix.join("."),
    )?.statement ?? null
  );
}

function globalClaimStatement(
  compiled: CompiledDeliveryContractV2,
  local: string,
): string | null {
  const [kind, ...rest] = local.split(".");
  const key = rest.join(".");
  if (kind === "non_goal")
    return (
      compiled.global.product.non_goals.find((row) => row.key === key)
        ?.statement ?? null
    );
  if (kind === "constraint")
    return (
      compiled.global.technical.constraints.find((row) => row.key === key)
        ?.statement ?? null
    );
  if (kind === "forbidden_shortcut")
    return (
      compiled.global.technical.forbidden_shortcuts.find(
        (row) => row.key === key,
      )?.statement ?? null
    );
  return null;
}
