import type {
  DeliveryAssertionV2,
  DeliveryContractV2,
  SemanticFactExpectationV2,
} from "./long-task-delivery-types.js";
import { controlFieldFacts } from "./long-task-control-fields.js";
import type { SemanticFactManifestV1 } from "./semantic-fact-types.js";

export function resolveExpectedAuthority(
  contract: DeliveryContractV2,
  outcomeKey: string | null,
  assertion: DeliveryAssertionV2,
  manifest: SemanticFactManifestV1,
  expectations: SemanticFactExpectationV2[],
): string {
  const expectation = expectations.find(
    (item) => item.assertion_ref === assertion.key,
  );
  if (expectation)
    return resolveSemanticFactExpectedAuthority(assertion, expectation);

  const fullClaim = outcomeKey
    ? `${outcomeKey}.${assertion.claims[0]}`
    : assertion.claims[0];
  const canonical = `contract-claim:${fullClaim}`;
  const sourceAuthorities = contract.source_claims.filter((source) =>
    sourceClaimRefs(source).includes(fullClaim),
  );
  const declared = assertion.expected_authority_ref;
  let authorityStatement = claimAuthorityStatement(
    contract,
    outcomeKey,
    assertion.claims[0],
  );
  let resolved = canonical;
  if (declared) {
    const source = sourceAuthorities.find((item) =>
      [item.key, `source:${item.key}`].includes(declared),
    );
    const factRef = declared.startsWith("semantic-fact:")
      ? declared.slice("semantic-fact:".length)
      : declared;
    const fact = manifest.facts.find((item) => item.key === factRef);
    if (declared === canonical) resolved = canonical;
    else if (source) {
      resolved = `source:${source.key}`;
      authorityStatement = source.statement;
    } else if (fact)
      return resolveBoundFactAuthority(contract, outcomeKey, assertion, fact);
    else
      fail(
        "expected_authority_ref_unknown",
        `${outcomeKey ?? "GLOBAL"}:${assertion.key}:${declared}`,
      );
  }
  if (
    "expected" in assertion &&
    assertion.expected !== true &&
    assertion.expected !== false &&
    !authorityContainsExpected(authorityStatement, assertion.expected)
  )
    fail(
      "expected_value_not_projected_from_authority",
      `${outcomeKey ?? "GLOBAL"}:${assertion.key}:${resolved}`,
    );
  return resolved;
}

function resolveSemanticFactExpectedAuthority(
  assertion: DeliveryAssertionV2,
  expectation: SemanticFactExpectationV2,
): string {
  const canonical = `semantic-proof:${expectation.proof_ref}`;
  if (
    assertion.expected_authority_ref &&
    ![
      canonical,
      `semantic-fact:${expectation.fact_ref}`,
      expectation.fact_ref,
      expectation.proof_ref,
    ].includes(assertion.expected_authority_ref)
  )
    fail(
      "expected_authority_ref_mismatch",
      `${assertion.key}:${assertion.expected_authority_ref}:${canonical}`,
    );
  return canonical;
}

function resolveBoundFactAuthority(
  contract: DeliveryContractV2,
  outcomeKey: string | null,
  assertion: DeliveryAssertionV2,
  fact: SemanticFactManifestV1["facts"][number],
): string {
  if (!semanticFactBoundToAssertion(contract, outcomeKey, assertion, fact.key))
    fail(
      "expected_authority_fact_not_bound_to_claim",
      `${outcomeKey ?? "GLOBAL"}:${assertion.key}:${fact.key}`,
    );
  if (
    "expected" in assertion &&
    fact.expected.representation === "inline" &&
    JSON.stringify(assertion.expected) !== JSON.stringify(fact.expected.value)
  )
    fail("expected_authority_value_mismatch", `${assertion.key}:${fact.key}`);
  return `semantic-fact:${fact.key}`;
}

function semanticFactBoundToAssertion(
  contract: DeliveryContractV2,
  outcomeKey: string | null,
  assertion: DeliveryAssertionV2,
  factRef: string,
): boolean {
  if (!outcomeKey || !assertion.applicability_ref) return false;
  const outcome = contract.outcomes.find((item) => item.key === outcomeKey);
  return Boolean(
    outcome?.semantic_fact_bindings.facts.some(
      (binding) =>
        binding.fact_ref === factRef &&
        binding.claim_ref === assertion.claims[0] &&
        binding.applicability_ref === assertion.applicability_ref,
    ),
  );
}

export function claimAuthorityStatement(
  contract: DeliveryContractV2,
  outcomeKey: string | null,
  localClaim: string,
): string {
  return outcomeKey
    ? outcomeClaimAuthorityStatement(contract, outcomeKey, localClaim)
    : globalClaimAuthorityStatement(contract, localClaim);
}

function globalClaimAuthorityStatement(
  contract: DeliveryContractV2,
  localClaim: string,
): string {
  if (localClaim.startsWith("non_goal."))
    return (
      contract.global.product.non_goals.find(
        (item) => `non_goal.${item.key}` === localClaim,
      )?.statement ?? ""
    );
  if (localClaim.startsWith("constraint."))
    return (
      contract.global.technical.constraints.find(
        (item) => `constraint.${item.key}` === localClaim,
      )?.statement ?? ""
    );
  return (
    contract.global.technical.forbidden_shortcuts.find(
      (item) => `forbidden_shortcut.${item.key}` === localClaim,
    )?.statement ?? ""
  );
}

function outcomeClaimAuthorityStatement(
  contract: DeliveryContractV2,
  outcomeKey: string,
  localClaim: string,
): string {
  const outcome = contract.outcomes.find((item) => item.key === outcomeKey)!;
  if (localClaim === "result") return outcome.product.observable_result;
  if (localClaim.startsWith("requirement."))
    return keyedStatement(
      outcome.product.requirements,
      "requirement",
      localClaim,
    );
  if (localClaim.startsWith("control."))
    return controlAuthorityStatement(outcome, localClaim);
  if (localClaim === "control_relation_closure")
    return outcome.product.control_relation_closure.statement;
  if (localClaim.startsWith("control_relation."))
    return keyedStatement(
      outcome.product.control_relations,
      "control_relation",
      localClaim,
    );
  if (localClaim.startsWith("non_completing."))
    return keyedStatement(
      outcome.product.non_completing_outcomes,
      "non_completing",
      localClaim,
    );
  if (localClaim.startsWith("obligation."))
    return keyedStatement(
      outcome.technical.obligations,
      "obligation",
      localClaim,
    );
  if (localClaim.startsWith("forbidden_shortcut."))
    return keyedStatement(
      outcome.technical.forbidden_shortcuts,
      "forbidden_shortcut",
      localClaim,
    );
  return (
    outcome.semantic_fact_bindings.facts.find(
      (item) => item.claim_ref === localClaim,
    )?.fact_ref ?? ""
  );
}

function controlAuthorityStatement(
  outcome: DeliveryContractV2["outcomes"][number],
  localClaim: string,
): string {
  const [, controlKey, field] = localClaim.split(".");
  const control = outcome.product.controls.find(
    (item) => item.key === controlKey,
  );
  return control
    ? (controlFieldFacts(control).find((item) => item.claim_field === field)
        ?.statement ?? "")
    : "";
}

function keyedStatement(
  rows: Array<{ key: string; statement: string }>,
  prefix: string,
  localClaim: string,
): string {
  return (
    rows.find((item) => `${prefix}.${item.key}` === localClaim)?.statement ?? ""
  );
}

function sourceClaimRefs(
  source: DeliveryContractV2["source_claims"][number],
): string[] {
  if (source.disposition.type === "decision_required") return [];
  if (source.disposition.type === "outcome_result")
    return [source.disposition.ref];
  return source.disposition.refs;
}

function authorityContainsExpected(
  statement: string,
  expected: unknown,
): boolean {
  if (typeof expected === "string") return statement.includes(expected);
  if (typeof expected === "number") return statement.includes(String(expected));
  return statement.includes(JSON.stringify(expected));
}

function fail(code: string, detail: string): never {
  throw new Error(`delivery_contract_invalid:${code}:${detail}`);
}
