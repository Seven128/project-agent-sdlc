import type { DeliveryContractV2 } from "./long-task-delivery-types.js";
import type { SemanticFactRevisionIdentityV1 } from "./semantic-fact-compact-carrier.js";
import { canonicalValueJson } from "./strict-codec.js";
import { compactWithoutFields } from "./compact-authoring-support.js";

export function compactClaimProjection(
  outcomeRef: string,
  kind:
    | "requirement"
    | "obligation"
    | "forbidden_shortcut"
    | "non_completing_outcome",
  row: {
    key: string;
    statement: string;
    applicability_refs: string[];
    required_proof_surfaces?: string[];
  },
  claimsByStatement: Map<string, string>,
): Record<string, unknown> {
  const claimKey = claimsByStatement.get(row.statement) ?? null;
  return {
    outcome_ref: outcomeRef,
    projection_kind: kind,
    projection_key: row.key,
    claim_key: claimKey,
    statement: claimKey ? null : row.statement,
    required_proof_surfaces: row.required_proof_surfaces ?? null,
    applicability_refs: row.applicability_refs,
  };
}

export function compactAssertionProjection(
  outcomeRef: string,
  checkRef: string,
  position: number,
  assertion: Record<string, unknown>,
  claimsByStatement: Map<string, string>,
  facts: Map<string, string>,
): Record<string, unknown> | null {
  const criterion = String(assertion.criterion ?? "");
  const claimRef = claimsByStatement.get(criterion);
  let criterionKind: "claim_statement" | "semantic_fact";
  let criterionRef: string;
  if (claimRef) {
    criterionKind = "claim_statement";
    criterionRef = claimRef;
  } else {
    const match =
      /^The current candidate satisfies the exact Source Fact (fact\.[a-z0-9._:-]+)\.$/u.exec(
        criterion,
      );
    if (!match || !facts.has(match[1])) return null;
    criterionKind = "semantic_fact";
    criterionRef = match[1];
  }
  return {
    outcome_ref: outcomeRef,
    check_ref: checkRef,
    position,
    criterion_kind: criterionKind,
    criterion_ref: criterionRef,
    ...compactWithoutFields(assertion, ["criterion"]),
  };
}

export function compactRevisionMap(
  rows: SemanticFactRevisionIdentityV1[],
  label: string,
): Map<string, string> {
  const result = new Map<string, string>();
  for (const row of rows) {
    if (result.has(row.key))
      throw new Error(
        `long_task_compact_authoring_invalid:${label}_revision_duplicate:${row.key}`,
      );
    result.set(row.key, row.revision_digest);
  }
  return result;
}

export function compactUniqueClaimStatements(
  claims: DeliveryContractV2["source_claims"],
): Map<string, string> {
  const result = new Map<string, string>();
  const duplicates = new Set<string>();
  for (const claim of claims) {
    if (result.has(claim.statement)) {
      result.delete(claim.statement);
      duplicates.add(claim.statement);
    } else if (!duplicates.has(claim.statement))
      result.set(claim.statement, claim.key);
  }
  return result;
}

export function assertSameCompactKeys(
  left: string[],
  right: string[],
  label: string,
): void {
  const a = [...new Set(left)].sort();
  const b = [...new Set(right)].sort();
  if (canonicalValueJson(a) !== canonicalValueJson(b))
    throw new Error(
      `long_task_compact_authoring_invalid:${label}:${a.length}:${b.length}`,
    );
}
