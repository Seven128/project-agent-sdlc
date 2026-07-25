import { readFile } from "node:fs/promises";
import path from "node:path";
import { containsDesignResourceHandoff } from "./design-resource-handoff-parser.js";
import type {
  DesignResourceHandoffPreflightV1,
  DesignResourceHandoffTargetV1,
  DesignResourceVerificationMethod,
} from "./design-resource-handoff-types.js";
import { preflightDesignResourceHandoff } from "./design-resource-handoff-validation.js";
import type { DeliveryContractV2 } from "./long-task-delivery-types.js";
import { assertProtectedRepositoryFile } from "./long-task-protected-files.js";

interface ContractDesignTarget {
  outcome_key: string;
  binding: DeliveryContractV2["outcomes"][number]["product"]["surface_bindings"][number];
  target: DeliveryContractV2["outcomes"][number]["product"]["surface_bindings"][number]["design_targets"][number];
}

interface IndexedHandoffTarget {
  preflight: DesignResourceHandoffPreflightV1;
  target: DesignResourceHandoffTargetV1;
}

export async function validateLongTaskDesignResourceHandoffs(
  contract: DeliveryContractV2,
  repository: string,
): Promise<void> {
  const handoffs = await loadHandoffs(contract, repository);
  const indexed = indexHandoffTargets(handoffs);
  const contractTargets = contract.outcomes.flatMap((outcome) =>
    outcome.product.surface_bindings.flatMap((binding) =>
      binding.design_targets.map((target) => ({
        outcome_key: outcome.key,
        binding,
        target,
      })),
    ),
  );
  const consumed = new Set<string>();
  for (const contractTarget of contractTargets) {
    const indexedTarget = indexed.get(contractTarget.target.key);
    if (!indexedTarget)
      invalid("target_handoff_missing", contractTarget.target.key);
    consumed.add(contractTarget.target.key);
    validateTargetIdentity(contractTarget, indexedTarget);
    validateCoverageClaims(contract, contractTarget, indexedTarget);
    validateBlockerBindings(contract, contractTarget, indexedTarget);
  }
  for (const key of indexed.keys())
    if (!consumed.has(key)) invalid("handoff_target_unbound", key);
}

async function loadHandoffs(
  contract: DeliveryContractV2,
  repository: string,
): Promise<DesignResourceHandoffPreflightV1[]> {
  const results: DesignResourceHandoffPreflightV1[] = [];
  for (const sourcePath of contract.task.source_paths) {
    if (!sourcePath.toLowerCase().endsWith(".md")) continue;
    const file = await assertProtectedRepositoryFile(
      repository,
      path.resolve(repository, ...sourcePath.split("/")),
      `design_resource_handoff_source:${sourcePath}`,
    );
    const content = await readFile(file, "utf8");
    if (containsDesignResourceHandoff(content))
      results.push(
        await preflightDesignResourceHandoff(repository, sourcePath),
      );
  }
  return results;
}

function indexHandoffTargets(
  handoffs: DesignResourceHandoffPreflightV1[],
): Map<string, IndexedHandoffTarget> {
  const indexed = new Map<string, IndexedHandoffTarget>();
  for (const preflight of handoffs)
    for (const target of preflight.handoff.targets) {
      if (indexed.has(target.key))
        invalid("handoff_target_duplicate", target.key);
      indexed.set(target.key, { preflight, target });
    }
  return indexed;
}

function validateTargetIdentity(
  contractTarget: ContractDesignTarget,
  indexed: IndexedHandoffTarget,
): void {
  const { target } = contractTarget;
  const handoffTarget = indexed.target;
  if (target.interpretation !== handoffTarget.interpretation)
    invalid(
      "target_interpretation_mismatch",
      `${target.key}:${target.interpretation}:${handoffTarget.interpretation}`,
    );
  assertSameSet(
    target.condition_keys,
    handoffTarget.condition_refs,
    "target_conditions_mismatch",
    target.key,
  );
  const resourcePaths = handoffTarget.resource_refs.map(
    (ref) =>
      indexed.preflight.handoff.resources.find((item) => item.key === ref)!
        .path,
  );
  assertSameSet(
    target.source_paths,
    [indexed.preflight.handoff_path, ...resourcePaths],
    "target_source_paths_mismatch",
    target.key,
  );
}

function validateCoverageClaims(
  contract: DeliveryContractV2,
  contractTarget: ContractDesignTarget,
  indexed: IndexedHandoffTarget,
): void {
  const target = contractTarget.target;
  const check = contract.outcomes
    .find((item) => item.key === contractTarget.outcome_key)!
    .acceptance.checks.find(
      (item) => item.key === target.conformance_check_ref,
    )!;
  const assertion = check.positive_assertions.find(
    (item) => item.key === target.conformance_assertion_ref,
  )!;
  const claims = new Map(
    contract.source_claims.map((item) => [item.key, item]),
  );
  const rows = indexed.preflight.handoff.coverage.filter(
    (row) =>
      row.disposition === "covered" && row.target_refs.includes(target.key),
  );
  if (!rows.length) invalid("target_covered_claims_required", target.key);
  const claimsBySourceItem = new Map<string, string[]>();
  for (const row of rows)
    for (const sourceItemRef of row.source_item_refs) {
      const localClaims = designSourceItemClaims(
        contract,
        contractTarget,
        indexed,
        sourceItemRef,
        claims,
      );
      claimsBySourceItem.set(sourceItemRef, localClaims);
      for (const localClaimRef of localClaims)
        if (!assertion.claims.includes(localClaimRef))
          invalid(
            "coverage_claim_not_in_conformance_assertion",
            `${target.key}:${sourceItemRef}:${localClaimRef}`,
          );
    }
  validateVerificationMethodBindings(target, check, rows, claimsBySourceItem);
}

function validateBlockerBindings(
  contract: DeliveryContractV2,
  contractTarget: ContractDesignTarget,
  indexed: IndexedHandoffTarget,
): void {
  const bound = new Map(
    contractTarget.binding.acceptance_blockers.map((item) => [item.key, item]),
  );
  const claims = new Map(
    contract.source_claims.map((item) => [item.key, item]),
  );
  const confirmations = new Map(
    contract.global.acceptance.external_confirmations.map((item) => [
      item.key,
      item,
    ]),
  );
  const availableMethods = new Set(
    contractTarget.target.verification_method_bindings.map(
      (item) => item.method,
    ),
  );
  for (const blocker of indexed.preflight.handoff.acceptance_blockers) {
    if (!blocker.target_refs.includes(contractTarget.target.key)) continue;
    const contractBlocker = bound.get(blocker.key);
    if (!contractBlocker)
      invalid(
        "acceptance_blocker_unbound",
        `${contractTarget.target.key}:${blocker.key}`,
      );
    assertSameSet(
      contractBlocker.source_item_refs,
      blocker.source_item_refs,
      "acceptance_blocker_source_items_mismatch",
      blocker.key,
    );
    assertSameSet(
      contractBlocker.verification_methods,
      blocker.verification_methods,
      "acceptance_blocker_methods_mismatch",
      blocker.key,
    );
    for (const method of blocker.verification_methods)
      if (!availableMethods.has(method))
        invalid(
          "acceptance_blocker_method_unbound",
          `${blocker.key}:${method}`,
        );
    const fullClaimRefs = blocker.source_item_refs.flatMap((sourceItemRef) => {
      const local = designSourceItemClaims(
        contract,
        contractTarget,
        indexed,
        sourceItemRef,
        claims,
      );
      return local.map(
        (claimRef) => `${contractTarget.outcome_key}.${claimRef}`,
      );
    });
    if (contractBlocker.status === "machine_claim") {
      const expectedLocal = fullClaimRefs.map((claimRef) =>
        claimRef.slice(contractTarget.outcome_key.length + 1),
      );
      for (const claimRef of expectedLocal)
        if (!contractBlocker.refs.includes(claimRef))
          invalid(
            "acceptance_blocker_machine_claim_lineage_missing",
            `${blocker.key}:${claimRef}`,
          );
    } else
      for (const confirmationRef of contractBlocker.refs) {
        const confirmation = confirmations.get(confirmationRef);
        if (!confirmation)
          invalid(
            "acceptance_blocker_confirmation_unknown",
            `${blocker.key}:${confirmationRef}`,
          );
        for (const claimRef of fullClaimRefs)
          if (!confirmation.impact_claims.includes(claimRef))
            invalid(
              "acceptance_blocker_confirmation_lineage_missing",
              `${blocker.key}:${confirmationRef}:${claimRef}`,
            );
      }
  }
}

function designSourceItemClaims(
  contract: DeliveryContractV2,
  contractTarget: ContractDesignTarget,
  indexed: IndexedHandoffTarget,
  sourceItemRef: string,
  claims = new Map(contract.source_claims.map((item) => [item.key, item])),
): string[] {
  const claim = claims.get(sourceItemRef);
  if (!claim)
    invalid(
      "coverage_source_claim_unknown",
      `${contractTarget.target.key}:${sourceItemRef}`,
    );
  if (claim.source_ref.split("#")[0] !== indexed.preflight.handoff_path)
    invalid(
      "coverage_source_claim_file_mismatch",
      `${contractTarget.target.key}:${sourceItemRef}`,
    );
  if (claim.disposition.type !== "claim")
    invalid(
      "coverage_source_claim_disposition_required",
      `${contractTarget.target.key}:${sourceItemRef}:${claim.disposition.type}`,
    );
  const prefix = `${contractTarget.outcome_key}.`;
  return claim.disposition.refs.map((claimRef) => {
    if (!claimRef.startsWith(prefix))
      invalid(
        "coverage_claim_outcome_mismatch",
        `${contractTarget.target.key}:${sourceItemRef}:${claimRef}`,
      );
    return claimRef.slice(prefix.length);
  });
}

function validateVerificationMethodBindings(
  target: ContractDesignTarget["target"],
  check: DeliveryContractV2["outcomes"][number]["acceptance"]["checks"][number],
  rows: DesignResourceHandoffPreflightV1["handoff"]["coverage"],
  claimsBySourceItem: Map<string, string[]>,
): void {
  const expectedMethods = new Set(
    rows.flatMap((row) => row.verification_methods),
  );
  const bindings = target.verification_method_bindings;
  assertSameSet(
    bindings.map((item) => item.method),
    [...expectedMethods],
    "verification_methods_mismatch",
    target.key,
  );
  const assertionRefs = bindings.map((item) => item.assertion_ref);
  if (new Set(assertionRefs).size !== assertionRefs.length)
    invalid("verification_method_assertion_duplicate", target.key);
  if (assertionRefs.includes(target.conformance_assertion_ref))
    invalid("verification_method_assertion_must_be_independent", target.key);
  for (const binding of bindings) {
    const assertion = check.positive_assertions.find(
      (item) => item.key === binding.assertion_ref,
    );
    if (!assertion)
      invalid(
        "verification_method_assertion_unknown",
        `${target.key}:${binding.method}:${binding.assertion_ref}`,
      );
    const sourceItems = new Set(
      rows
        .filter((row) => row.verification_methods.includes(binding.method))
        .flatMap((row) => row.source_item_refs),
    );
    for (const sourceItemRef of sourceItems)
      for (const claimRef of claimsBySourceItem.get(sourceItemRef) ?? [])
        if (!assertion.claims.includes(claimRef))
          invalid(
            "verification_method_claim_not_asserted",
            `${target.key}:${binding.method}:${sourceItemRef}:${claimRef}`,
          );
    for (const capability of requiredCapabilities(binding.method))
      if (!assertion.evidence_capabilities.includes(capability))
        invalid(
          "verification_method_capability_required",
          `${target.key}:${binding.method}:${capability}`,
        );
  }
}

function requiredCapabilities(
  method: DesignResourceVerificationMethod,
): Array<"design_conformance" | "interaction_trace" | "target_runtime"> {
  if (method === "interaction_trace")
    return ["interaction_trace", "target_runtime"];
  if (method === "component_state")
    return ["design_conformance", "interaction_trace", "target_runtime"];
  return ["design_conformance", "target_runtime"];
}

function assertSameSet(
  actual: string[],
  expected: string[],
  code: string,
  detail: string,
): void {
  const left = [...new Set(actual)].sort();
  const right = [...new Set(expected)].sort();
  if (
    left.length !== right.length ||
    left.some((item, index) => item !== right[index])
  )
    invalid(code, `${detail}:${left.join(",")}:${right.join(",")}`);
}

function invalid(code: string, detail: string): never {
  throw new Error(
    `delivery_contract_invalid:design_resource_${code}:${detail}`,
  );
}
