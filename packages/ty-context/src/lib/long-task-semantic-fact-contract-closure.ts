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
  factRevisions: Map<string, string>,
  obligationRevisions: Map<string, string>,
  sourceRequiresRevisions: boolean,
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
    const revisionsRequired =
      sourceRequiresRevisions ||
      bindings.facts.some((item) => item.fact_revision_digest !== undefined) ||
      bindings.proofs.some(
        (item) => item.obligation_revision_digest !== undefined,
      );
    assertSameSemanticFactClosureSet(
      bindings.facts.map((item) => item.fact_ref),
      facts.map((item) => item.key),
      `contract_fact_set:${outcome.key}`,
    );
    if (revisionsRequired) {
      assertSameSemanticFactClosureSet(
        bindings.facts.map((item) =>
          revisionPair(
            item.fact_ref,
            item.fact_revision_digest,
            `contract_fact_revision:${outcome.key}`,
          ),
        ),
        facts.map((item) =>
          revisionPair(
            item.key,
            factRevisions.get(item.key),
            `source_fact_revision:${outcome.key}`,
          ),
        ),
        `contract_fact_revision_set:${outcome.key}`,
      );
      assertSameSemanticFactClosureSet(
        bindings.proofs.map((item) =>
          revisionPair(
            item.proof_ref,
            item.obligation_revision_digest,
            `contract_obligation_revision:${outcome.key}`,
          ),
        ),
        proofs.map((item) =>
          revisionPair(
            item.key,
            obligationRevisions.get(item.key),
            `source_obligation_revision:${outcome.key}`,
          ),
        ),
        `contract_obligation_revision_set:${outcome.key}`,
      );
    }
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
      factRevisions,
      revisionsRequired,
    );
    validateSemanticFactProofBindings(
      contract,
      outcome,
      manifest,
      index,
      targetByRef,
      expectations,
      allProofBindings,
      factRevisions,
      obligationRevisions,
      revisionsRequired,
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

function revisionPair(
  key: string,
  digest: string | undefined,
  label: string,
): string {
  if (!digest)
    throw new Error(`semantic_fact_closure_invalid:${label}:${key}:missing`);
  return `${key}\0${digest}`;
}
