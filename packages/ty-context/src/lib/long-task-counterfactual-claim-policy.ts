import type {
  CounterfactualControlV2,
  DeliveryContractV2,
  DeliveryBindingV2,
  DeliveryOutcomeV2,
  GlobalCounterfactualControlV2,
} from "./long-task-delivery-types.js";

export function validateCounterfactualBindingClaims(
  outcome: DeliveryOutcomeV2,
  control: CounterfactualControlV2,
  binding: DeliveryBindingV2,
): void {
  if (
    binding.verification_check_key &&
    binding.verification_check_key !== control.check_key
  )
    throw new Error(
      `counterfactual_binding_check_mismatch:${outcome.key}:${control.key}:${binding.key}:${control.check_key}`,
    );
  const check = outcome.acceptance.checks.find(
    (item) => item.key === control.check_key,
  );
  if (!check)
    throw new Error(
      `counterfactual_check_unknown:${outcome.key}:${control.key}:${control.check_key}`,
    );
  validateExpectedAssertions(
    control,
    check,
    `counterfactual_assertion_unknown:${outcome.key}:${control.key}`,
  );
  const expectedAssertions = new Set(control.expected_assertion_failures);
  const expectedClaims = new Set(
    [
      ...(check?.positive_assertions ?? []),
      ...(check?.negative_assertions ?? []),
    ]
      .filter((assertion) => expectedAssertions.has(assertion.key))
      .flatMap((assertion) => assertion.claims),
  );
  if (control.claims.some((claim) => !expectedClaims.has(claim)))
    throw new Error(
      `counterfactual_binding_claim_unrelated:${outcome.key}:${control.key}`,
    );
}

export function resolveGlobalCounterfactualBinding(
  contract: DeliveryContractV2,
  control: GlobalCounterfactualControlV2,
): { outcome: DeliveryOutcomeV2; binding: DeliveryBindingV2 } {
  const [outcomeKey, bindingKey] = control.binding_ref.split(".");
  const outcome = contract.outcomes.find((item) => item.key === outcomeKey);
  if (!outcome)
    throw new Error(
      `global_counterfactual_binding_ref_invalid:${control.key}:${control.binding_ref}`,
    );
  const binding = outcome.technical.bindings.find(
    (item) => item.key === bindingKey,
  );
  if (!binding)
    throw new Error(
      `global_counterfactual_binding_unknown:${control.key}:${control.binding_ref}`,
    );
  return { outcome, binding };
}

export function validateGlobalCounterfactualBindingClaims(
  contract: DeliveryContractV2,
  control: GlobalCounterfactualControlV2,
): { outcome: DeliveryOutcomeV2; binding: DeliveryBindingV2 } {
  const resolved = resolveGlobalCounterfactualBinding(contract, control);
  const check = contract.global.acceptance.checks.find(
    (item) => item.key === control.check_key,
  );
  if (!check)
    throw new Error(
      `global_counterfactual_check_unknown:${control.key}:${control.check_key}`,
    );
  validateExpectedAssertions(
    control,
    check,
    `global_counterfactual_assertion_unknown:${control.key}`,
  );
  const allowedClaims = new Set([
    ...contract.global.product.non_goals.map((item) => `non_goal.${item.key}`),
    ...contract.global.technical.constraints.map(
      (item) => `constraint.${item.key}`,
    ),
    ...contract.global.technical.forbidden_shortcuts.map(
      (item) => `forbidden_shortcut.${item.key}`,
    ),
  ]);
  if (control.claims.some((claim) => !allowedClaims.has(claim)))
    throw new Error(
      `global_counterfactual_claim_invalid:${control.key}:${control.claims.filter((claim) => !allowedClaims.has(claim)).join(",")}`,
    );
  const expectedAssertions = new Set(control.expected_assertion_failures);
  const expectedClaims = new Set(
    [...check.positive_assertions, ...check.negative_assertions]
      .filter((assertion) => expectedAssertions.has(assertion.key))
      .flatMap((assertion) => assertion.claims),
  );
  if (control.claims.some((claim) => !expectedClaims.has(claim)))
    throw new Error(`global_counterfactual_claim_unrelated:${control.key}`);
  return resolved;
}

function validateExpectedAssertions(
  control: Pick<
    CounterfactualControlV2,
    | "expected_assertion_failures"
    | "preserved_assertions"
    | "allowed_fanout_assertions"
  >,
  check: DeliveryContractV2["global"]["acceptance"]["checks"][number],
  unknownPrefix: string,
): void {
  if (!control.expected_assertion_failures.length)
    throw new Error(`${unknownPrefix}:required`);
  const assertions = new Set(
    [...check.positive_assertions, ...check.negative_assertions].map(
      (assertion) => assertion.key,
    ),
  );
  for (const key of control.expected_assertion_failures)
    if (!assertions.has(key)) throw new Error(`${unknownPrefix}:${key}`);
  const failures = new Set(control.expected_assertion_failures);
  const preserved = new Set(control.preserved_assertions);
  for (const key of control.preserved_assertions) {
    if (!assertions.has(key)) throw new Error(`${unknownPrefix}:${key}`);
    if (failures.has(key))
      throw new Error(
        `counterfactual_preserved_assertion_conflict:${unknownPrefix}:${key}`,
      );
  }
  for (const key of control.allowed_fanout_assertions) {
    if (!assertions.has(key)) throw new Error(`${unknownPrefix}:${key}`);
    if (failures.has(key) || preserved.has(key))
      throw new Error(
        `counterfactual_fanout_assertion_conflict:${unknownPrefix}:${key}`,
      );
  }
}
