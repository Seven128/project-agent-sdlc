import type { DeliveryContractV2 } from "./long-task-delivery-types.js";
import { resolveAcceptanceAssertion } from "./long-task-acceptance-reference.js";
import type { compileProductClaimCoverage } from "./long-task-claims.js";
import { fail } from "./long-task-delivery-shape.js";
import type { RiskFactName } from "./long-task-risk-types.js";
import { executionTargetSourceTargetRef } from "./long-task-source-target-index.js";

export function validateSourceClaimMappings(
  contract: DeliveryContractV2,
  compiledClaims: ReturnType<typeof compileProductClaimCoverage>,
  report?: ValidationReporter,
): void {
  validateSourcePresence(contract, report);
  const sources = new Set(contract.task.source_paths);
  const productClaims = new Set(
    Object.values(compiledClaims.by_outcome)
      .flat()
      .map((claim) => claim.id),
  );
  const claimApplicability = new Map(
    [
      ...compiledClaims.by_global,
      ...Object.values(compiledClaims.by_outcome).flat(),
    ].map((claim) => [claim.id, new Set(claim.applicability_refs)]),
  );
  const executionTargetClaims = new Set(
    contract.task.execution_targets.map((target) =>
      executionTargetSourceTargetRef(target.key),
    ),
  );
  const globalClaims = new Map(
    compiledClaims.by_global.map((claim) => [claim.local_key, claim]),
  );
  const coveredGlobalClaims = new Set(
    Object.entries(compiledClaims.summary.claims_by_global)
      .filter(([, value]) => value.covered)
      .map(([key]) => key),
  );
  const forbiddenPaths = new Set(
    contract.global.technical.forbidden_paths.map(
      (item) => `forbidden_path.${item.key}`,
    ),
  );
  const outcomeResults = new Set(
    contract.outcomes.map((outcome) => `${outcome.key}.result`),
  );
  const externalConfirmations = new Set(
    contract.global.acceptance.external_confirmations.map((item) => item.key),
  );
  for (const claim of contract.source_claims) {
    validateSourceReference(claim.key, claim.source_ref, sources, report);
    const disposition = claim.disposition;
    if ("refs" in disposition && !disposition.refs.length)
      issue(report, "source_claim_disposition_refs_empty", claim.key);
    if (disposition.type === "claim")
      for (const reference of disposition.refs) {
        if (reference.endsWith(".result"))
          issue(
            report,
            "source_claim_result_overcompression",
            `${claim.key}:${reference}`,
          );
        if (
          !productClaims.has(reference) &&
          !executionTargetClaims.has(reference)
        )
          issue(
            report,
            "source_claim_product_ref_unknown",
            `${claim.key}:${reference}`,
          );
      }
    if (disposition.type === "acceptance") {
      if (disposition.refs.length !== 1)
        issue(report, "source_claim_acceptance_ref_count", claim.key);
      const reference = disposition.refs[0];
      const resolved = resolveAcceptanceAssertion(contract, reference);
      if (!resolved)
        issue(
          report,
          "source_claim_acceptance_ref_unknown",
          `${claim.key}:${reference}`,
        );
      else if (
        resolved.scope === "outcome" &&
        (!resolved.assertion.claims.length ||
          resolved.assertion.claims.every((item) => item === "result"))
      )
        issue(
          report,
          "source_claim_acceptance_result_only",
          `${claim.key}:${reference}`,
        );
      else if (resolved.scope === "global" && !resolved.assertion.claims.length)
        issue(
          report,
          "source_claim_acceptance_global_claim_required",
          `${claim.key}:${reference}`,
        );
    }
    if (
      disposition.type === "outcome_result" &&
      !outcomeResults.has(disposition.ref)
    )
      issue(
        report,
        "source_claim_outcome_result_ref_unknown",
        `${claim.key}:${disposition.ref}`,
      );
    if (disposition.type === "external_confirmation")
      validateRefs(
        claim.key,
        disposition.refs,
        externalConfirmations,
        "source_claim_external_confirmation_ref_unknown",
        report,
      );
    if (disposition.type === "global_constraint")
      validateGlobalRefs(
        claim.key,
        disposition.refs,
        forbiddenPaths,
        globalClaims,
        coveredGlobalClaims,
        report,
      );
    if (disposition.type === "risk_fact")
      validateRiskRefs(contract, claim.key, disposition.refs, report);
    validateJudgmentBasis(contract, claim, claimApplicability, report);
  }
}

function validateJudgmentBasis(
  contract: DeliveryContractV2,
  claim: DeliveryContractV2["source_claims"][number],
  claimApplicability: ReadonlyMap<string, ReadonlySet<string>>,
  report?: ValidationReporter,
): void {
  const basis = claim.judgment_basis;
  if (!basis) return;
  if (!sourceClaimOwnsClaim(contract, claim, basis))
    issue(
      report,
      "source_claim_judgment_basis_claim_not_owned",
      `${claim.key}:${basis.claim_ref}`,
    );
  const applicability = claimApplicability.get(basis.claim_ref);
  if (!applicability)
    issue(
      report,
      "source_claim_judgment_basis_claim_unknown",
      `${claim.key}:${basis.claim_ref}`,
    );
  if (
    !basis.applicability_refs.length ||
    new Set(basis.applicability_refs).size !== basis.applicability_refs.length
  )
    issue(
      report,
      "source_claim_judgment_basis_applicability_set_invalid",
      claim.key,
    );
  for (const applicabilityRef of basis.applicability_refs)
    if (!applicability?.has(applicabilityRef))
      issue(
        report,
        "source_claim_judgment_basis_applicability_unknown",
        `${claim.key}:${basis.claim_ref}:${applicabilityRef}`,
      );
}

function sourceClaimOwnsClaim(
  contract: DeliveryContractV2,
  claim: DeliveryContractV2["source_claims"][number],
  basis: NonNullable<
    DeliveryContractV2["source_claims"][number]["judgment_basis"]
  >,
): boolean {
  const disposition = claim.disposition;
  if (disposition.type === "claim" || disposition.type === "global_constraint")
    return disposition.refs.includes(basis.claim_ref);
  if (disposition.type === "outcome_result")
    return disposition.ref === basis.claim_ref;
  if (disposition.type !== "external_confirmation") return false;
  return basis.applicability_refs.every((applicabilityRef) =>
    contract.global.acceptance.external_confirmations.some(
      (confirmation) =>
        disposition.refs.includes(confirmation.key) &&
        confirmation.obligations?.some(
          (obligation) =>
            obligation.claim_ref === basis.claim_ref &&
            obligation.applicability_ref === applicabilityRef &&
            obligation.result_kind === "judgment" &&
            obligation.judgment_basis?.kind === basis.kind &&
            obligation.judgment_basis.source_ref === claim.key,
        ),
    ),
  );
}

function validateSourcePresence(
  contract: DeliveryContractV2,
  report?: ValidationReporter,
): void {
  if (!contract.task.source_paths.length || !contract.source_claims.length)
    issue(
      report,
      "source_authority_required",
      "source_paths and source_claims must be non-empty",
    );
}

function validateRiskRefs(
  contract: DeliveryContractV2,
  claimKey: string,
  refs: string[],
  report?: ValidationReporter,
): void {
  for (const reference of refs) {
    const separator = reference.indexOf(":");
    const fact = reference.slice(0, separator) as RiskFactName;
    const outcome = reference.slice(separator + 1);
    if (
      separator <= 0 ||
      !outcome ||
      !Object.hasOwn(contract.risk.facts, fact) ||
      !contract.risk.facts[fact].includes(outcome)
    )
      issue(
        report,
        "source_claim_risk_fact_ref_unknown",
        `${claimKey}:${reference}`,
      );
  }
}

function validateSourceReference(
  key: string,
  sourceRef: string,
  sources: Set<string>,
  report?: ValidationReporter,
): void {
  const [sourceFile, anchor, ...extra] = sourceRef.split("#");
  if (!sourceFile || extra.length || (anchor !== undefined && !anchor))
    issue(report, "source_claim_ref_invalid", `${key}:${sourceRef}`);
  if (!sources.has(sourceFile))
    issue(report, "source_claim_ref_unknown", `${key}:${sourceRef}`);
}

function validateRefs(
  claimKey: string,
  refs: string[],
  known: Set<string>,
  code: string,
  report?: ValidationReporter,
): void {
  for (const reference of refs)
    if (!known.has(reference)) issue(report, code, `${claimKey}:${reference}`);
}

function validateGlobalRefs(
  claimKey: string,
  refs: string[],
  forbiddenPaths: Set<string>,
  globalClaims: Map<string, unknown>,
  coveredGlobalClaims: Set<string>,
  report?: ValidationReporter,
): void {
  for (const reference of refs)
    if (reference.startsWith("forbidden_path.")) {
      if (!forbiddenPaths.has(reference))
        issue(
          report,
          "source_claim_global_ref_unknown",
          `${claimKey}:${reference}`,
        );
    } else if (!globalClaims.has(reference))
      issue(
        report,
        "source_claim_global_ref_unknown",
        `${claimKey}:${reference}`,
      );
    else if (!coveredGlobalClaims.has(reference))
      issue(
        report,
        "source_claim_global_ref_uncovered",
        `${claimKey}:${reference}`,
      );
}

type ValidationReporter = (message: string) => void;

function issue(
  report: ValidationReporter | undefined,
  code: string,
  detail: string,
): void {
  if (!report) fail(code, detail);
  report(`delivery_contract_invalid:${code}:${detail}`);
}
