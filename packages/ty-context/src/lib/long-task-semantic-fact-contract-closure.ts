import { validateSemanticFactOutcomeBindings } from "./long-task-semantic-fact-contract-facts.js";
import { validateSemanticFactProofBindings } from "./long-task-semantic-fact-contract-proofs.js";
import {
  assertSameSemanticFactClosureSet,
  uniqueSemanticFactClosureValues,
} from "./long-task-semantic-fact-closure-primitives.js";
import type { DeliveryContractV2 } from "./long-task-delivery-types.js";
import type { SemanticFactManifestIndexV1 } from "./semantic-fact-policy.js";
import type {
  SemanticFactExpectationV2,
  SemanticFactManifestV1,
} from "./semantic-fact-types.js";

export function validateSemanticFactContractProjection(
  contract: DeliveryContractV2,
  manifest: SemanticFactManifestV1,
  index: SemanticFactManifestIndexV1,
): Map<string, SemanticFactExpectationV2[]> {
  const expectations = new Map<string, SemanticFactExpectationV2[]>();
  const allFactBindings: string[] = [];
  const allProofBindings: string[] = [];
  const targetByRef = new Map(
    contract.task.execution_targets.map((item) => [item.key, item]),
  );
  for (const outcome of contract.outcomes) {
    const facts = manifest.facts.filter(
      (item) => item.outcome_ref === outcome.key,
    );
    const proofs = manifest.proof_obligations.filter((proof) =>
      facts.some((fact) => fact.key === proof.fact_ref),
    );
    const bindings = outcome.semantic_fact_bindings;
    assertSameSemanticFactClosureSet(
      bindings.facts.map((item) => item.fact_ref),
      facts.map((item) => item.key),
      `contract_fact_set:${outcome.key}`,
    );
    assertSameSemanticFactClosureSet(
      bindings.proofs.map((item) => item.proof_ref),
      proofs.map((item) => item.key),
      `contract_proof_set:${outcome.key}`,
    );
    uniqueSemanticFactClosureValues(
      bindings.proofs.map((item) =>
        item.authority === "machine"
          ? `${item.check_ref}\0${item.assertion_ref}`
          : `external\0${item.confirmation_ref}`,
      ),
      `contract_proof_target:${outcome.key}`,
    );
    validateSemanticFactOutcomeBindings(
      outcome,
      manifest,
      index,
      allFactBindings,
    );
    validateSemanticFactProofBindings(
      contract,
      outcome,
      manifest,
      index,
      targetByRef,
      expectations,
      allProofBindings,
    );
  }
  assertSameSemanticFactClosureSet(
    allFactBindings,
    manifest.facts.map((item) => item.key),
    "contract_all_fact_set",
  );
  assertSameSemanticFactClosureSet(
    allProofBindings,
    manifest.proof_obligations.map((item) => item.key),
    "contract_all_proof_set",
  );
  return expectations;
}
