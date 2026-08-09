import { parseDeliveryContractText } from "../../packages/ty-context/dist/lib/long-task-delivery-parser.js";
import { deliveryContract } from "./long-task-delivery-fixtures.mjs";

export function structuralContractFixture(manifest) {
  const contract = deliveryContract();
  const outcome = contract.outcomes[0];
  const check = outcome.acceptance.checks[0];
  const assertionKey = (index) => `structural-proof-${index}`;
  const sharedPathSet = [
    "src/state.json",
    ...Array.from(
      { length: 300 },
      (_, index) =>
        `src/structural-boundary-${String(index).padStart(4, "0")}/**`,
    ),
  ];
  const productionOwnerPaths = outcome.product.owner.path_globs.filter(
    (pattern) => pattern !== "src/**",
  );
  const structuralOwnerPaths = [...sharedPathSet, ...productionOwnerPaths];
  contract.semantic_fact_manifest.key = manifest.key;
  outcome.product.owner.path_globs = structuralOwnerPaths;
  outcome.technical.expected_change_paths = structuralOwnerPaths;
  outcome.technical.allowed_support_paths = [];
  outcome.semantic_fact_bindings = {
    manifest_ref: manifest.key,
    facts: manifest.facts.map((fact) => ({
      fact_ref: fact.key,
      claim_ref: `semantic_fact.${fact.key}`,
      applicability_ref: "first-root-success",
    })),
    proofs: manifest.proof_obligations.map((proof, index) => ({
      proof_ref: proof.key,
      fact_ref: proof.fact_ref,
      method: proof.method,
      proof_surface: proof.proof_surface,
      evidence_capabilities: proof.evidence_capabilities,
      authority: "machine",
      check_ref: check.key,
      assertion_ref: assertionKey(index),
    })),
  };
  check.positive_assertions = check.positive_assertions.filter(
    (assertion) => assertion.key !== "first-semantic-fact",
  );
  check.positive_assertions.push(
    ...manifest.proof_obligations.map((proof, index) => ({
      key: assertionKey(index),
      criterion: `The current candidate satisfies the exact Source Fact ${proof.fact_ref}.`,
      claims: [`semantic_fact.${proof.fact_ref}`],
      applicability_ref: "first-root-success",
      observation: `structural_proof_${index}`,
      evidence_capabilities: proof.evidence_capabilities,
      operator: "equals",
      expected: true,
    })),
  );
  return parseDeliveryContractText(JSON.stringify(contract));
}
