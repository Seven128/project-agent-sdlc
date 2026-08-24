import type { AcceptanceObligationReachabilityV1 } from "./long-task-acceptance-reachability.js";
import { controlFieldFacts } from "./long-task-control-fields.js";
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
    if (!fact || !proof)
      throw new Error(
        `external_confirmation_expected_fact_missing:${row.obligation_ref}`,
      );
    return {
      authority_ref: authorityRef,
      kind: "semantic_fact",
      statement: null,
      located_value: fact.expected,
      comparison: proof.comparison,
    };
  }
  const statement = contractClaimStatement(compiled, row.claim_ref);
  if (statement === null)
    throw new Error(
      `external_confirmation_expected_claim_unresolved:${row.claim_ref}`,
    );
  return {
    authority_ref: authorityRef,
    kind: "contract_claim",
    statement,
    located_value: null,
    comparison: null,
  };
}

export function objectiveExternalComparison(
  manifest: SemanticFactManifestV1,
  row: AcceptanceObligationReachabilityV1,
  actual: unknown,
): { passed: boolean } | null {
  if (!row.fact_ref || !row.proof_ref) return null;
  const fact = manifest.facts.find(
    (candidate) => candidate.key === row.fact_ref,
  );
  const proof = manifest.proof_obligations.find(
    (candidate) => candidate.key === row.proof_ref,
  );
  if (
    !fact ||
    !proof ||
    proof.fact_ref !== fact.key ||
    proof.comparison.comparator !== "exact_value" ||
    proof.comparison.mode !== "exact" ||
    proof.comparison.tolerance !== null ||
    proof.comparison.mask !== null
  )
    return null;
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
