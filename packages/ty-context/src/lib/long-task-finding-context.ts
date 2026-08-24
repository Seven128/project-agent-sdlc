import type {
  CheckExecutionResultV2,
  CompiledDeliveryContractV2,
  LongTaskFindingV2,
} from "./long-task-delivery-types.js";
import { resolveAcceptanceAssertion } from "./long-task-acceptance-reference.js";
import { deriveMaterialSourceFragments } from "./long-task-source-fragments.js";

export function enrichCheckResultFindings(
  compiled: CompiledDeliveryContractV2,
  result: CheckExecutionResultV2,
): CheckExecutionResultV2 {
  return {
    ...result,
    findings: result.findings.map((finding) =>
      enrichFinding(compiled, finding, result),
    ),
  };
}

export function enrichFinding(
  compiled: CompiledDeliveryContractV2,
  finding: LongTaskFindingV2,
  result?: CheckExecutionResultV2,
): LongTaskFindingV2 {
  const context = resolveFindingContext(compiled, finding);
  const { check, outcome, sourceClaims, sourceTargets } = context;
  const { authorities, expectations } = context;
  const factRefs = unique([
    ...(finding.fact_refs ?? []),
    ...authorities.flatMap((authority) =>
      authority.fact_ref ? [authority.fact_ref] : [],
    ),
    ...expectations.map((expectation) => expectation.fact_ref),
  ]);
  const proofRefs = unique([
    ...(finding.proof_obligation_refs ?? []),
    ...authorities.map((authority) => authority.obligation_ref),
    ...expectations.map((expectation) => expectation.proof_ref),
  ]);
  const expectedAuthorityRefs = unique([
    ...(finding.expected_authority_refs ?? []),
    ...(finding.assertion_key &&
    check?.expected_authority_refs[finding.assertion_key]
      ? [check.expected_authority_refs[finding.assertion_key]]
      : []),
  ]);
  const actualEvidenceRefs = unique([
    ...(finding.actual_evidence_refs ?? []),
    ...(result ? [`execution:${result.execution_identity}`] : []),
    ...Object.keys(result?.artifact_hashes ?? {}).map(
      (artifact) => `artifact:${artifact}`,
    ),
  ]);
  const sourceFragmentRefs = unique([
    ...(finding.source_fragment_refs ?? []),
    ...fragmentsForSourceClaims(compiled, sourceClaims),
  ]);
  const rerunObligationRefs = unique([
    ...(finding.rerun_obligation_refs ?? []),
    ...proofRefs,
    ...authorities.map((authority) => authority.obligation_ref),
    ...normalizedClaimRefs(finding),
  ]);
  const enriched: LongTaskFindingV2 = {
    ...finding,
    invalidation_reasons: unique([
      ...(finding.invalidation_reasons ?? []),
      finding.code,
    ]),
  };
  applyFindingReferences(enriched, {
    sourceClaims,
    sourceTargets,
    sourceFragmentRefs,
    factRefs,
    proofRefs,
    expectedAuthorityRefs,
    actualEvidenceRefs,
    rerunObligationRefs,
  });
  applyFindingOwners(enriched, outcome, check);
  return enriched;
}

type FindingOutcome = CompiledDeliveryContractV2["outcomes"][number];
type FindingCheck = ReturnType<typeof allChecks>[number];

function resolveFindingContext(
  compiled: CompiledDeliveryContractV2,
  finding: LongTaskFindingV2,
) {
  const outcome = finding.outcome_key
    ? (compiled.outcomes.find((item) => item.key === finding.outcome_key) ??
      null)
    : null;
  const sourceClaims = sourceClaimsForFinding(compiled, finding);
  const sourceTargets = unique(
    compiled.source_claims
      .filter((source) => sourceClaims.includes(source.key))
      .flatMap((source) => dispositionTargetRefs(source.disposition)),
  );
  const check = finding.check_key
    ? (allChecks(compiled).find(
        (item) =>
          item.outcome_key === finding.outcome_key &&
          item.key === finding.check_key,
      ) ?? null)
    : null;
  const authorities = check
    ? check.observation_authorities.filter(
        (authority) =>
          !finding.assertion_key ||
          authority.assertion_ref === finding.assertion_key,
      )
    : [];
  const expectations = check
    ? check.semantic_fact_expectations.filter(
        (expectation) =>
          !finding.assertion_key ||
          expectation.assertion_ref === finding.assertion_key,
      )
    : [];
  return {
    outcome,
    check,
    sourceClaims,
    sourceTargets,
    authorities,
    expectations,
  };
}

function applyFindingReferences(
  finding: LongTaskFindingV2,
  refs: {
    sourceClaims: string[];
    sourceTargets: string[];
    sourceFragmentRefs: string[];
    factRefs: string[];
    proofRefs: string[];
    expectedAuthorityRefs: string[];
    actualEvidenceRefs: string[];
    rerunObligationRefs: string[];
  },
): void {
  if (refs.sourceClaims.length) finding.source_claim_keys = refs.sourceClaims;
  if (refs.sourceTargets.length)
    finding.source_target_refs = refs.sourceTargets;
  if (refs.sourceFragmentRefs.length)
    finding.source_fragment_refs = refs.sourceFragmentRefs;
  if (refs.factRefs.length) finding.fact_refs = refs.factRefs;
  if (refs.proofRefs.length) finding.proof_obligation_refs = refs.proofRefs;
  if (refs.expectedAuthorityRefs.length)
    finding.expected_authority_refs = refs.expectedAuthorityRefs;
  if (refs.actualEvidenceRefs.length)
    finding.actual_evidence_refs = refs.actualEvidenceRefs;
  if (refs.rerunObligationRefs.length)
    finding.rerun_obligation_refs = refs.rerunObligationRefs;
}

function applyFindingOwners(
  finding: LongTaskFindingV2,
  outcome: FindingOutcome | null,
  check: FindingCheck | null,
): void {
  if (outcome && !finding.owner_paths)
    finding.owner_paths = outcome.product.owner.path_globs;
  if (outcome)
    finding.implementation_owner = {
      label: outcome.product.owner.label,
      path_globs: [...outcome.product.owner.path_globs],
    };
  if (check)
    finding.verification_owner = {
      kind: "machine_check",
      outcome_key: check.outcome_key,
      check_key: check.key,
      runner_target: check.runner.resolved_target,
      input_paths: unique([...check.input_paths, ...check.verification_inputs]),
    };
}

function allChecks(compiled: CompiledDeliveryContractV2) {
  return [
    ...compiled.global.acceptance.checks,
    ...compiled.outcomes.flatMap((outcome) => outcome.acceptance.checks),
  ];
}

function fragmentsForSourceClaims(
  compiled: CompiledDeliveryContractV2,
  sourceClaimKeys: string[],
): string[] {
  const sourceClaims = compiled.source_claims.filter((claim) =>
    sourceClaimKeys.includes(claim.key),
  );
  const items = compiled.source_items.filter((item) =>
    sourceClaims.some((claim) => {
      const [sourcePath, anchor] = claim.source_ref.split("#");
      return (
        item.source_path === sourcePath &&
        (item.key === claim.key || !anchor || item.key === anchor)
      );
    }),
  );
  return unique(
    items.flatMap((item) =>
      deriveMaterialSourceFragments(item).map((fragment) => fragment.key),
    ),
  );
}

function normalizedClaimRefs(finding: LongTaskFindingV2): string[] {
  return (finding.claim_keys ?? []).map((claim) =>
    finding.outcome_key && !claim.startsWith(`${finding.outcome_key}.`)
      ? `${finding.outcome_key}.${claim}`
      : claim,
  );
}

function unique(values: string[]): string[] {
  return [...new Set(values)].sort();
}

function dispositionTargetRefs(
  disposition: CompiledDeliveryContractV2["source_claims"][number]["disposition"],
): string[] {
  if (disposition.type === "outcome_result") return [disposition.ref];
  if (
    disposition.type === "claim" ||
    disposition.type === "acceptance" ||
    disposition.type === "global_constraint" ||
    disposition.type === "risk_fact" ||
    disposition.type === "external_confirmation"
  )
    return disposition.refs;
  return [];
}

function sourceClaimsForFinding(
  compiled: CompiledDeliveryContractV2,
  finding: LongTaskFindingV2,
): string[] {
  const acceptanceRef =
    finding.check_key && finding.assertion_key
      ? `${finding.outcome_key ?? "GLOBAL"}.${finding.check_key}.${finding.assertion_key}`
      : null;
  const resolvedAcceptance = acceptanceRef
    ? resolveAcceptanceAssertion(compiled, acceptanceRef)
    : null;
  const productRefs = new Set(
    (finding.claim_keys ?? []).map((claim) =>
      finding.outcome_key ? `${finding.outcome_key}.${claim}` : claim,
    ),
  );
  return compiled.source_claims
    .filter((source) => {
      if (
        source.disposition.type === "acceptance" &&
        resolvedAcceptance &&
        source.disposition.refs.includes(resolvedAcceptance.ref)
      )
        return true;
      if (
        source.disposition.type === "claim" &&
        source.disposition.refs.some((reference) => productRefs.has(reference))
      )
        return true;
      if (
        source.disposition.type === "outcome_result" &&
        productRefs.has(source.disposition.ref)
      )
        return true;
      return (
        source.disposition.type === "global_constraint" &&
        source.disposition.refs.some((reference) => productRefs.has(reference))
      );
    })
    .map((source) => source.key)
    .sort();
}
