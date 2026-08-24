import type { ParsedDeliveryContractV2 } from "./long-task-delivery-parser.js";
import type { DeliveryContractV2 } from "./long-task-delivery-types.js";
import { applyDiagnosticRepairOrder } from "./long-task-authoring-preflight-repair-order.js";
import type {
  AuthoringPreflightDiagnosticV1,
  SourceCoverageV1,
} from "./long-task-authoring-preflight-types.js";

export function addAuthoringDiagnostics(
  contract: DeliveryContractV2,
  parsed: ParsedDeliveryContractV2,
  diagnostics: AuthoringPreflightDiagnosticV1[],
): void {
  if (parsed.compatibility.completion_authority_defaulted_to_machine_only)
    diagnostics.push({
      level: "warning",
      code: "completion_authority_legacy_default_machine_only",
      message:
        "target_profile.completion_authority is absent and was deterministically defaulted to machine_only; blocking External Confirmation routes remain unreachable.",
      refs: ["task.target_profile.completion_authority"],
      repair_hint:
        "Keep machine_only explicitly, or make an Authority decision to declare declared_authorities and fully decompose every blocking external obligation before Compile.",
    });
  if (parsed.outcome_files.length)
    diagnostics.push({
      level: "warning",
      code: "outcome_files_compatibility_only",
      message:
        "outcome_files is supported only as physical compatibility; new authoring should use inline Outcomes.",
      repair_hint:
        "Keep compatibility files only when required; use inline Outcomes for new authoring.",
    });
  for (const claim of contract.source_claims)
    if (claim.disposition.type === "decision_required")
      diagnostics.push({
        level: "decision_required",
        code: "source_claim_decision_required",
        message: `${claim.key}: ${claim.disposition.reason}`,
        refs: [claim.key],
        repair_hint:
          "Resolve this product decision from the user or an authoritative Source before Compile; do not infer it from implementation convenience.",
      });
}

export function sourceCoverage(contract: DeliveryContractV2): SourceCoverageV1 {
  const counts = {
    claim: 0,
    acceptance: 0,
    outcome_result: 0,
    global_constraint: 0,
    risk_fact: 0,
    external_confirmation: 0,
    decision_required: 0,
  };
  for (const item of contract.source_claims) counts[item.disposition.type] += 1;
  return {
    total: contract.source_claims.length,
    resolved: contract.source_claims.length - counts.decision_required,
    mapped_to_product_claims: counts.claim,
    mapped_to_acceptance: counts.acceptance,
    mapped_to_outcome_results: counts.outcome_result,
    mapped_to_global_constraints: counts.global_constraint,
    mapped_to_risk_facts: counts.risk_fact,
    mapped_to_external_confirmations: counts.external_confirmation,
    decision_required: counts.decision_required,
    unresolved: contract.source_claims
      .filter((item) => item.disposition.type === "decision_required")
      .map((item) => item.key),
  };
}

export async function captureDiagnostic(
  diagnostics: AuthoringPreflightDiagnosticV1[],
  action: () => Promise<unknown>,
): Promise<void> {
  try {
    await action();
  } catch (error) {
    addDiagnosticError(diagnostics, error);
  }
}

export function addDiagnosticError(
  diagnostics: AuthoringPreflightDiagnosticV1[],
  error: unknown,
  outcomeKey?: string | null,
  checkKey?: string,
): void {
  const message = error instanceof Error ? error.message : String(error);
  const rows = message.startsWith("delivery_contract_preflight_failed:\n")
    ? message.split(/\r?\n/u).slice(1)
    : [message];
  for (const row of rows) {
    const code = diagnosticCode(row);
    const refs = diagnosticRefs(code, row);
    const repairHint = diagnosticRepairHint(code);
    diagnostics.push({
      level: "error",
      code,
      message: row,
      ...(outcomeKey ? { outcome_key: outcomeKey } : {}),
      ...(checkKey ? { check_key: checkKey } : {}),
      ...(refs.length ? { refs } : {}),
      ...(repairHint ? { repair_hint: repairHint } : {}),
    });
  }
}

export function normalizeAuthoringDiagnostics(
  diagnostics: AuthoringPreflightDiagnosticV1[],
): AuthoringPreflightDiagnosticV1[] {
  const normalized: AuthoringPreflightDiagnosticV1[] = [];
  const positions = new Map<string, number>();
  for (const diagnostic of diagnostics) {
    const refs = diagnostic.refs?.length
      ? [...new Set(diagnostic.refs)].sort()
      : undefined;
    const next: AuthoringPreflightDiagnosticV1 = {
      ...diagnostic,
      ...(refs ? { refs } : {}),
    };
    delete next.occurrences;
    delete next.diagnostic_id;
    delete next.repair_group;
    delete next.repair_priority;
    delete next.blocked_by;
    const key = JSON.stringify([
      next.level,
      next.code,
      next.message,
      next.outcome_key ?? null,
      next.check_key ?? null,
      next.refs ?? [],
      next.repair_hint ?? null,
    ]);
    const position = positions.get(key);
    if (position === undefined) {
      positions.set(key, normalized.length);
      normalized.push(next);
      continue;
    }
    const existing = normalized[position]!;
    existing.occurrences = (existing.occurrences ?? 1) + 1;
  }
  return applyDiagnosticRepairOrder(normalized);
}

function diagnosticCode(message: string): string {
  if (message.startsWith("delivery_contract_invalid:"))
    return message.split(":")[1] || "delivery_contract_invalid";
  return message.split(":")[0] || "authoring_preflight_error";
}

function diagnosticPayload(code: string, message: string): string[] {
  const parts = message.split(":");
  if (message.startsWith("delivery_contract_invalid:")) return parts.slice(2);
  if (parts[0] === code) return parts.slice(1);
  return parts.slice(1);
}

function diagnosticRefs(code: string, message: string): string[] {
  const payload = diagnosticPayload(code, message).filter(Boolean);
  switch (code) {
    case "owner_context_ref_unknown":
    case "path_outside_owner_boundary":
    case "source_claim_anchor_not_found":
    case "binding_carrier_path_not_found":
    case "binding_carrier_outside_change_paths":
    case "binding_target_not_found":
    case "binding_target_outside_carrier":
      return payload.slice(0, 2);
    case "requirement_key_duplicate":
    case "binding_key_duplicate":
    case "control_key_duplicate":
    case "obligation_key_duplicate":
    case "forbidden_shortcut_key_duplicate":
      return payload.slice(0, 2);
    case "owner_path_globs_empty":
      return payload.slice(0, 1);
    case "workspace_path_forbidden":
    case "workspace_path_unclassified":
      return payload.slice(0, 1);
    case "product_claim_uncovered":
    case "global_claim_uncovered":
    case "source_claim_decision_required":
      return payload.flatMap((value) => value.split(",")).filter(Boolean);
    case "product_claim_required_surfaces_missing":
      return payload.length >= 2
        ? [`${payload[0]}.${payload[1]}`, ...payload.slice(2)]
        : payload;
    case "assertion_criterion_required":
      return payload.length ? [payload.join(":")] : [];
    default:
      if (code.endsWith("_path_not_found")) return payload.slice(0, 2);
      return [];
  }
}

function diagnosticRepairHint(code: string): string | null {
  switch (code) {
    case "owner_context_ref_unknown":
      return "Add the existing Context path to task.context_refs or correct owner.context_refs; do not invent a Context owner.";
    case "requirement_key_duplicate":
    case "binding_key_duplicate":
    case "control_key_duplicate":
    case "obligation_key_duplicate":
    case "forbidden_shortcut_key_duplicate":
      return "Remove an accidental duplicate or assign distinct stable keys while preserving each distinct semantic item.";
    case "product_claim_uncovered":
    case "product_claim_required_surfaces_missing":
    case "global_claim_uncovered":
      return "Add claim-bearing Assertion coverage for every required proof surface or correct the Claim mapping; do not weaken or delete the uncovered Claim.";
    case "assertion_criterion_required":
      return "Add a named falsifiable criterion that states what the Assertion accepts.";
    case "source_claim_anchor_not_found":
      return "Correct source_ref or add the matching non-rendering Source marker/anchor without rewriting the Source statement.";
    case "source_claim_decision_required":
      return "Resolve the stated product decision from the user or authoritative Source before Compile.";
    case "workspace_path_forbidden":
      return "Revert or relocate the forbidden workspace change, or revise the owning Source/Contract boundary through the appropriate authority path.";
    case "workspace_path_unclassified":
      return "Declare the file under the owning Outcome's expected_change_paths or allowed_support_paths, or remove the unrelated workspace change before Compile.";
    default:
      if (code.endsWith("_path_not_found"))
        return "Create or correct the declared repository path, runner target or Binding carrier, then rerun Preflight.";
      return null;
  }
}
