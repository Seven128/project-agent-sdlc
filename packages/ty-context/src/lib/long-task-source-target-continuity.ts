import type {
  CompiledSourceItemV2,
  DeliveryContractV2,
  SourceClaimV2,
} from "./long-task-delivery-types.js";
import { resolveAcceptanceAssertion } from "./long-task-acceptance-reference.js";
import {
  buildCanonicalSourceTargetIndex,
  sourceKindForTarget,
  type CanonicalSourceTarget,
} from "./long-task-source-target-index.js";

type ValidationReporter = (message: string) => void;

interface SourceContinuityState {
  itemByKey: Map<string, CompiledSourceItemV2>;
  targets: Map<string, CanonicalSourceTarget>;
  owners: Map<string, string>;
  sourceBackedOutcomeClaims: Set<string>;
  sourceBackedGlobalClaims: Set<string>;
  acceptanceBindings: Array<{
    claim: SourceClaimV2;
    target: CanonicalSourceTarget;
  }>;
  architectureItems: Set<string>;
  ownedArchitectureItems: Set<string>;
}

export function validateSourceTargetContinuity(
  contract: DeliveryContractV2,
  items: CompiledSourceItemV2[],
  report?: ValidationReporter,
): void {
  const state = sourceContinuityState(contract, items);
  for (const claim of contract.source_claims)
    validateSourceClaimContinuity(claim, state, report);

  validateAcceptanceBindingContinuity(contract, state, report);
  validateArchitectureContinuity(state, report);
}

function sourceContinuityState(
  contract: DeliveryContractV2,
  items: CompiledSourceItemV2[],
): SourceContinuityState {
  return {
    itemByKey: new Map(items.map((item) => [item.key, item])),
    targets: buildCanonicalSourceTargetIndex(contract),
    owners: new Map<string, string>(),
    sourceBackedOutcomeClaims: new Set<string>(),
    sourceBackedGlobalClaims: new Set<string>(),
    acceptanceBindings: [],
    architectureItems: new Set(
      items
        .filter((item) => item.aspect === "architecture")
        .map((item) => item.key),
    ),
    ownedArchitectureItems: new Set<string>(),
  };
}

function validateSourceClaimContinuity(
  claim: SourceClaimV2,
  state: SourceContinuityState,
  report?: ValidationReporter,
): void {
  const item = state.itemByKey.get(claim.key);
  if (!item || claim.disposition.type === "decision_required") return;
  const refs = dispositionRefs(claim.disposition);
  if (refs.length !== 1) {
    issue(report, `source_claim_target_ref_count:${claim.key}:${refs.length}`);
    return;
  }
  const ref = refs[0];
  const target = state.targets.get(ref);
  if (
    !target ||
    (target.kind !== "semantic_fact" &&
      sourceKindForTarget(target) !== item.kind)
  ) {
    issue(
      report,
      `source_target_kind_mismatch:${claim.key}:${item.kind}:${target ? sourceKindForTarget(target) : "unknown"}:${ref}`,
    );
    return;
  }
  if (
    item.kind === "risk_fact" &&
    (target.risk_fact !== item.risk_semantics?.fact ||
      target.affected_outcome !== item.risk_semantics?.affected_outcome)
  ) {
    issue(
      report,
      `source_risk_target_mismatch:${claim.key}:${item.risk_semantics?.fact ?? "missing"}:${item.risk_semantics?.affected_outcome ?? "missing"}:${ref}`,
    );
    return;
  }
  if (
    target.normalized_text !== undefined &&
    target.normalized_text !== item.normalized_text
  ) {
    issue(report, `source_target_statement_mismatch:${claim.key}:${ref}`);
    return;
  }
  const owner = state.owners.get(ref);
  if (owner) {
    issue(report, `source_target_already_owned:${claim.key}:${ref}:${owner}`);
    return;
  }
  state.owners.set(ref, claim.key);
  if (
    state.architectureItems.has(item.key) &&
    target.kind === "technical_obligation"
  )
    state.ownedArchitectureItems.add(item.key);
  if (
    target.outcome_key &&
    [
      "requirement",
      "control",
      "technical_obligation",
      "non_completing",
      "forbidden_shortcut",
      "semantic_fact",
    ].includes(target.kind)
  )
    state.sourceBackedOutcomeClaims.add(ref);
  if (
    !target.outcome_key &&
    ["global_constraint", "non_goal", "forbidden_shortcut"].includes(
      target.kind,
    )
  )
    state.sourceBackedGlobalClaims.add(ref);
  if (target.kind === "acceptance")
    state.acceptanceBindings.push({ claim, target });
}

function validateAcceptanceBindingContinuity(
  contract: DeliveryContractV2,
  state: SourceContinuityState,
  report?: ValidationReporter,
): void {
  for (const { claim, target } of state.acceptanceBindings) {
    const resolved = resolveAcceptanceAssertion(contract, target.ref);
    const sourceBacked =
      resolved?.scope === "outcome" && target.outcome_key
        ? resolved.assertion.claims.some(
            (localKey) =>
              localKey !== "result" &&
              state.sourceBackedOutcomeClaims.has(
                `${target.outcome_key}.${localKey}`,
              ),
          )
        : resolved?.scope === "global"
          ? resolved.assertion.claims.some((localKey) =>
              state.sourceBackedGlobalClaims.has(localKey),
            )
          : false;
    if (!sourceBacked)
      issue(
        report,
        `source_acceptance_without_source_backed_claim:${claim.key}:${target.ref}`,
      );
  }
}

function validateArchitectureContinuity(
  state: SourceContinuityState,
  report?: ValidationReporter,
): void {
  if (!state.architectureItems.size)
    issue(report, "source_architecture_obligation_required");
  for (const key of state.architectureItems)
    if (!state.ownedArchitectureItems.has(key))
      issue(report, `source_architecture_obligation_unmapped:${key}`);
}

function dispositionRefs(disposition: SourceClaimV2["disposition"]): string[] {
  if (disposition.type === "decision_required") return [];
  if (disposition.type === "outcome_result") return [disposition.ref];
  return disposition.refs;
}

function issue(report: ValidationReporter | undefined, message: string): void {
  if (!report) throw new Error(message);
  report(message);
}
