import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  containsDesignResourceHandoff,
  parseDesignResourceHandoffMarkdown,
} from "./design-resource-handoff-parser.js";
import { createDesignResourceHandoffSetIntegrity } from "./design-resource-handoff-set-integrity.js";
import type {
  DesignResourceHandoffPreflightV1,
  DesignResourceHandoffTargetV1,
} from "./design-resource-handoff-types.js";
import type { DesignResourceHandoffPreflightV2 } from "./design-resource-symbolic-fact-types.js";
import { preflightParsedDesignResourceHandoffAny } from "./design-resource-handoff-validation.js";
import {
  assertSameSet,
  designSourceItemClaims,
  invalid,
  validateTargetIdentity,
  validateSymbolicTargetIdentity,
  validateSymbolicVerificationMethodBindings,
  type IndexedSymbolicHandoffTarget,
  validateVerificationMethodBindings,
} from "./long-task-design-resource-method-binding.js";
import type { DeliveryContractV2 } from "./long-task-delivery-types.js";
import { validateLongTaskDesignTargetCapabilities } from "./long-task-design-target-capabilities.js";
import { assertProtectedRepositoryFile } from "./long-task-protected-files.js";

export interface ContractDesignTarget {
  outcome_key: string;
  binding: DeliveryContractV2["outcomes"][number]["product"]["surface_bindings"][number];
  target: DeliveryContractV2["outcomes"][number]["product"]["surface_bindings"][number]["design_targets"][number];
}

export interface IndexedHandoffTarget {
  preflight: DesignResourceHandoffPreflightV1;
  target: DesignResourceHandoffTargetV1;
}

export interface LongTaskDesignHandoffConsumer {
  consume(
    preflight:
      DesignResourceHandoffPreflightV1 | DesignResourceHandoffPreflightV2,
  ): void;
  finish(): void;
}

export async function validateLongTaskDesignResourceHandoffs(
  contract: DeliveryContractV2,
  repository: string,
): Promise<void> {
  const consumer = createLongTaskDesignHandoffConsumer(contract);
  for (const sourcePath of contract.task.source_paths) {
    if (!sourcePath.toLowerCase().endsWith(".md")) continue;
    const file = await assertProtectedRepositoryFile(
      repository,
      path.resolve(repository, ...sourcePath.split("/")),
      `design_resource_handoff_source:${sourcePath}`,
    );
    const content = await readFile(file, "utf8");
    if (!containsDesignResourceHandoff(content)) continue;
    consumer.consume(
      await preflightParsedDesignResourceHandoffAny(
        repository,
        parseDesignResourceHandoffMarkdown(sourcePath, content),
      ),
    );
  }
  consumer.finish();
}

export function createLongTaskDesignHandoffConsumer(
  contract: DeliveryContractV2,
): LongTaskDesignHandoffConsumer {
  const contractTargets = contract.outcomes.flatMap((outcome) =>
    outcome.product.surface_bindings.flatMap((binding) =>
      binding.design_targets.map((target) => ({
        outcome_key: outcome.key,
        binding,
        target,
      })),
    ),
  );
  const contractTargetsByKey = new Map(
    contractTargets.map((item) => [item.target.key, item]),
  );
  const indexedTargetKeys = new Set<string>();
  const consumed = new Set<string>();
  const validationErrors = new Map<string, unknown>();
  let duplicate: string | null = null;
  const unbound: string[] = [];
  const handoffSetIntegrity = createDesignResourceHandoffSetIntegrity(invalid);
  const allSourceItems = new Set<string>();
  const resourcePaths = new Map<string, string>();
  let crossVersionIssue: { code: string; detail: string } | null = null;
  const recordCrossVersionIssue = (code: string, detail: string): void => {
    crossVersionIssue ??= { code, detail };
  };
  return {
    consume(preflight) {
      for (const sourceItem of preflight.source_item_keys) {
        if (allSourceItems.has(sourceItem))
          recordCrossVersionIssue(
            "handoff_set_source_item_duplicate",
            sourceItem,
          );
        else allSourceItems.add(sourceItem);
      }
      for (const resource of preflight.handoff.resources) {
        const identity = JSON.stringify(resource);
        const previous = resourcePaths.get(resource.path);
        if (previous && previous !== identity)
          recordCrossVersionIssue(
            "handoff_set_resource_path_conflict",
            resource.path,
          );
        else resourcePaths.set(resource.path, identity);
      }
      if (!("preflight_schema_version" in preflight))
        handoffSetIntegrity.consume(preflight);
      for (const target of preflight.handoff.targets) {
        if (indexedTargetKeys.has(target.key)) {
          duplicate ??= target.key;
          continue;
        }
        indexedTargetKeys.add(target.key);
        const contractTarget = contractTargetsByKey.get(target.key);
        if (!contractTarget) {
          unbound.push(target.key);
          continue;
        }
        consumed.add(target.key);
        try {
          if ("preflight_schema_version" in preflight) {
            const indexedTarget: IndexedSymbolicHandoffTarget = {
              preflight,
              target,
            };
            validateSymbolicTargetIdentity(contractTarget, indexedTarget);
            validateSymbolicCoverageClaims(
              contract,
              contractTarget,
              indexedTarget,
            );
            validateBlockerBindings(contract, contractTarget, indexedTarget);
          } else {
            const indexedTarget: IndexedHandoffTarget = {
              preflight,
              target: target as DesignResourceHandoffTargetV1,
            };
            validateTargetIdentity(contractTarget, indexedTarget);
            validateLongTaskDesignTargetCapabilities(
              contract,
              contractTarget,
              indexedTarget,
            );
            validateCoverageClaims(contract, contractTarget, indexedTarget);
            validateBlockerBindings(contract, contractTarget, indexedTarget);
          }
        } catch (error) {
          validationErrors.set(target.key, error);
        }
      }
    },
    finish() {
      if (duplicate) invalid("handoff_target_duplicate", duplicate);
      handoffSetIntegrity.finish();
      if (crossVersionIssue)
        invalid(crossVersionIssue.code, crossVersionIssue.detail);
      for (const contractTarget of contractTargets) {
        if (!consumed.has(contractTarget.target.key))
          invalid("target_handoff_missing", contractTarget.target.key);
        if (validationErrors.has(contractTarget.target.key))
          throw validationErrors.get(contractTarget.target.key);
      }
      if (unbound.length) invalid("handoff_target_unbound", unbound[0]);
    },
  };
}

function validateSymbolicCoverageClaims(
  contract: DeliveryContractV2,
  contractTarget: ContractDesignTarget,
  indexed: IndexedSymbolicHandoffTarget,
): void {
  const claims = new Map(
    contract.source_claims.map((item) => [item.key, item]),
  );
  const rows = indexed.preflight.handoff.coverage.filter(
    (row) => row.target_ref === contractTarget.target.key,
  );
  if (!rows.length)
    invalid("v2_target_covered_claims_required", contractTarget.target.key);
  const sourceItemRefs = [
    ...new Set([
      ...rows.flatMap((row) => row.source_item_refs),
      ...indexed.preflight.manifest.fact_rules.flatMap(
        (rule) => rule.source_item_refs,
      ),
      ...indexed.preflight.manifest.disposition_regions.flatMap(
        (region) => region.source_item_refs,
      ),
    ]),
  ];
  const claimsBySourceItem = new Map<string, string[]>();
  for (const sourceItemRef of sourceItemRefs)
    claimsBySourceItem.set(
      sourceItemRef,
      designSourceItemClaims(
        contract,
        contractTarget,
        indexed,
        sourceItemRef,
        claims,
      ),
    );
  validateSymbolicVerificationMethodBindings(
    contract,
    contractTarget,
    indexed,
    claimsBySourceItem,
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
  const claims = new Map(
    contract.source_claims.map((item) => [item.key, item]),
  );
  const rows = indexed.preflight.handoff.coverage.filter(
    (row) =>
      row.disposition === "covered" && row.target_refs.includes(target.key),
  );
  if (!rows.length) invalid("target_covered_claims_required", target.key);
  const facts = indexed.preflight.handoff.facts.filter(
    (fact) => fact.target_ref === target.key,
  );
  const factRefs = new Set(facts.map((fact) => fact.key));
  const proofs = indexed.preflight.handoff.proof_obligations.filter((proof) =>
    factRefs.has(proof.fact_ref),
  );
  if (!facts.length) invalid("target_facts_required", target.key);
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
    }
  validateVerificationMethodBindings(
    target,
    check,
    facts,
    proofs,
    indexed,
    claimsBySourceItem,
  );
}

function validateBlockerBindings(
  contract: DeliveryContractV2,
  contractTarget: ContractDesignTarget,
  indexed: IndexedHandoffTarget | IndexedSymbolicHandoffTarget,
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
    [
      ...contractTarget.target.verification_method_bindings,
      ...(contractTarget.target.symbolic_method_bindings ?? []),
    ].map((item) => item.method),
  );
  const blockers =
    "preflight_schema_version" in indexed.preflight
      ? indexed.preflight.manifest.acceptance_blockers
      : indexed.preflight.handoff.acceptance_blockers;
  for (const blocker of blockers) {
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
    assertSameSet(
      contractBlocker.required_capabilities,
      blocker.required_capabilities,
      "acceptance_blocker_capabilities_mismatch",
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
      const executionTarget = contract.task.execution_targets.find(
        (item) => item.key === contractTarget.binding.target_ref,
      );
      if (!executionTarget)
        invalid(
          "execution_target_unknown",
          `${contractTarget.target.key}:${contractTarget.binding.target_ref}`,
        );
      for (const capability of blocker.required_capabilities)
        if (!executionTarget.capabilities.includes(capability))
          invalid(
            "acceptance_blocker_target_capability_missing",
            `${blocker.key}:${executionTarget.key}:${capability}`,
          );
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
