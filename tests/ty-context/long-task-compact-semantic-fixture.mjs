import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createLongTaskCompactContract } from "../../packages/ty-context/dist/lib/long-task-compact-authoring.js";
import { createSemanticFactCompactCarrier } from "../../packages/ty-context/dist/lib/semantic-fact-compact-authoring.js";
import { parseSemanticFactCompactCarrierShape } from "../../packages/ty-context/dist/lib/semantic-fact-compact-carrier.js";
import {
  canonicalValueJson,
  sha256Hex,
} from "../../packages/ty-context/dist/lib/strict-codec.js";
import { refreshFixtureSemanticManifest } from "./long-task-delivery-fixtures.mjs";
import { packageAdmittedFixtureSemanticManifest } from "./long-task-package-machine-fixture.mjs";

export function deterministicCompactSemanticManifest(factCount = 64) {
  const manifest = packageAdmittedFixtureSemanticManifest();
  const originalFact = manifest.facts[0];
  const originalSubject = manifest.subjects.find(
    (item) => item.key === originalFact.unit_ref,
  );
  const originalCell = manifest.fact_cells.find(
    (item) => item.key === originalFact.cell_ref,
  );
  const originalProof = manifest.proof_obligations[0];
  const property = manifest.property_dispositions.find(
    (item) => item.key === originalFact.property_ref,
  );
  const exactFacts = [];
  const subjects = [];
  const cells = [];
  const proofs = [];
  for (let index = 0; index < factCount; index += 1) {
    const suffix = String(index).padStart(4, "0");
    const factKey = `fact.synthetic.${suffix}`;
    const subjectKey = `subject.synthetic.${suffix}`;
    const cellKey = `cell.synthetic.${suffix}`;
    subjects.push({
      ...structuredClone(originalSubject),
      key: subjectKey,
    });
    cells.push({
      ...structuredClone(originalCell),
      key: cellKey,
      unit_ref: subjectKey,
      fact_ref: factKey,
    });
    exactFacts.push({
      ...structuredClone(originalFact),
      key: factKey,
      cell_ref: cellKey,
      unit_ref: subjectKey,
      expected: {
        ...structuredClone(originalFact.expected),
        locator: {
          ...structuredClone(originalFact.expected.locator),
          value: `/facts/${index}/expected/value`,
        },
      },
    });
    proofs.push(
      proofFor(originalProof, factKey, suffix, "exact_value", proofs.length),
      proofFor(
        originalProof,
        factKey,
        suffix,
        "custom.snapshot_digest",
        proofs.length + 1,
        "external_confirmation",
      ),
    );
  }
  manifest.subjects = manifest.subjects.filter(
    (item) => item.key !== originalSubject.key,
  );
  manifest.subjects.push(...subjects);
  manifest.fact_cells = cells;
  manifest.facts = exactFacts;
  manifest.proof_obligations = proofs;
  const subjectKeys = subjects.map((item) => item.key);
  for (const disposition of manifest.property_dispositions) {
    if (disposition.family_ref !== originalFact.family_ref) continue;
    for (const field of [
      "applicable_unit_refs",
      "not_applicable_unit_refs",
      "decision_required_unit_refs",
      "unavailable_unit_refs",
    ])
      if (disposition[field].includes(originalSubject.key))
        disposition[field] = subjectKeys;
  }
  property.required_methods = ["exact_value", "custom.snapshot_digest"];
  manifest.oracles[0].capabilities = ["exact_value"];
  manifest.oracles.push({
    key: "oracle.synthetic-snapshot-audit",
    trust: "named_external_tcb",
    identity: "fixture-synthetic-snapshot-auditor",
    version: "1.0.0",
    sha256: null,
    capabilities: ["custom.snapshot_digest"],
  });
  for (const input of manifest.inputs)
    if (input.fact_refs.includes(originalFact.key))
      input.fact_refs = exactFacts.map((item) => item.key);
  return refreshFixtureSemanticManifest(manifest);
}

function proofFor(
  original,
  factKey,
  suffix,
  method,
  proofIndex,
  authority = "machine",
) {
  const comparator =
    authority === "machine" ? "exact_value" : "custom.snapshot_digest";
  const comparisonValue = { comparator };
  return {
    ...structuredClone(original),
    key: `proof.synthetic.${suffix}.${method.replace(/[^a-z0-9]+/gu, "-")}`,
    fact_ref: factKey,
    method,
    authority,
    oracle_ref:
      authority === "machine"
        ? original.oracle_ref
        : "oracle.synthetic-snapshot-audit",
    counterfactual:
      authority === "machine"
        ? structuredClone(original.counterfactual)
        : {
            disposition: "external",
            refs: ["synthetic-snapshot-digest-confirmation"],
            basis_refs: ["fixture-architecture"],
            rationale:
              "The non-admitted custom snapshot method remains a blocking external confirmation.",
          },
    comparison: {
      ...structuredClone(original.comparison),
      comparator,
      parameters: {
        ...structuredClone(original.comparison.parameters),
        locator: {
          ...structuredClone(original.comparison.parameters.locator),
          value: `/proof_obligations/${proofIndex}/comparison/parameters/value`,
        },
        sha256: digestValue(comparisonValue),
        value: comparisonValue,
      },
    },
  };
}

export function projectSyntheticCompactContract(contract, manifest) {
  const outcome = contract.outcomes[0];
  const check = outcome.acceptance.checks[0];
  const factBindings = manifest.facts.map((fact) => ({
    fact_ref: fact.key,
    claim_ref: `semantic_fact.${fact.key}`,
    applicability_ref: "first-root-success",
  }));
  const externalConfirmationKey = "synthetic-snapshot-digest-confirmation";
  const externalProofs = manifest.proof_obligations.filter(
    (proof) => proof.authority === "external_confirmation",
  );
  if (externalProofs.length) {
    contract.task.target_profile.completion_authority = "declared_authorities";
    contract.global.acceptance.external_confirmations.push({
      key: externalConfirmationKey,
      description:
        "Confirm the synthetic custom snapshot obligations outside the admitted exact observer.",
      owner: "fixture-audit-owner",
      kind: "expert_authority",
      impact_claims: externalProofs.map(
        (proof) => `first.semantic_fact.${proof.fact_ref}`,
      ),
      blocks_target: true,
      actor: {
        id: "fixture-synthetic-snapshot-auditor",
        role: "synthetic snapshot acceptance auditor",
        authority_kind: "expert",
      },
      target_ref: "fixture-app",
      environment_identity: "fixture-synthetic-snapshot-audit-v1",
      scenario: structuredClone(check.scenario),
      evidence_requirements: [
        {
          key: "synthetic-snapshot-evidence",
          statement:
            "Capture evidence for every exact synthetic custom snapshot obligation.",
        },
      ],
      obligations: externalProofs.map((proof) => ({
        key: `confirm-${proof.key.replace(/[^a-z0-9]+/gu, "-")}`,
        claim_ref: `first.semantic_fact.${proof.fact_ref}`,
        applicability_ref: "first-root-success",
        fact_ref: proof.fact_ref,
        proof_ref: proof.key,
        method: proof.method,
        proof_surface: proof.proof_surface,
        evidence_capabilities: [...proof.evidence_capabilities],
        expected_authority_ref: `semantic-proof:${proof.key}`,
        result_kind: "judgment",
      })),
    });
  }
  const proofBindings = manifest.proof_obligations.map((proof) =>
    proof.authority === "machine"
      ? {
          proof_ref: proof.key,
          fact_ref: proof.fact_ref,
          method: proof.method,
          proof_surface: proof.proof_surface,
          evidence_capabilities: proof.evidence_capabilities,
          authority: "machine",
          check_ref: check.key,
          assertion_ref: assertionKey(proof.key),
        }
      : {
          proof_ref: proof.key,
          fact_ref: proof.fact_ref,
          method: proof.method,
          proof_surface: proof.proof_surface,
          evidence_capabilities: proof.evidence_capabilities,
          authority: "external_confirmation",
          confirmation_ref: externalConfirmationKey,
        },
  );
  outcome.semantic_fact_bindings = {
    manifest_ref: manifest.key,
    facts: factBindings,
    proofs: proofBindings,
  };
  check.positive_assertions = check.positive_assertions.filter(
    (assertion) => assertion.key !== "first-semantic-fact",
  );
  check.positive_assertions.push(
    ...manifest.proof_obligations
      .filter((proof) => proof.authority === "machine")
      .map((proof) => ({
        key: assertionKey(proof.key),
        criterion: `The current candidate satisfies the exact Source Fact ${proof.fact_ref}.`,
        claims: [`semantic_fact.${proof.fact_ref}`],
        applicability_ref: "first-root-success",
        observation: `semantic_${proof.key.replace(/[^a-z0-9]+/gu, "_")}`,
        evidence_capabilities: proof.evidence_capabilities,
        operator: "equals",
        expected: true,
      })),
  );
  const counterfactual = outcome.acceptance.counterfactual_controls.find(
    (item) => item.key === manifest.proof_obligations[0].counterfactual.refs[0],
  );
  counterfactual.claims = [
    ...counterfactual.claims.filter(
      (claim) => !claim.startsWith("semantic_fact."),
    ),
    ...manifest.facts.map((fact) => `semantic_fact.${fact.key}`),
  ];
  counterfactual.expected_assertion_failures = [
    ...counterfactual.expected_assertion_failures.filter(
      (key) => key !== "first-semantic-fact",
    ),
    ...manifest.proof_obligations
      .filter((proof) => proof.authority === "machine")
      .map((proof) => assertionKey(proof.key)),
  ];
  return contract;
}

export async function writeSyntheticCompactFixture(fixture, factCount = 64) {
  const manifest = deterministicCompactSemanticManifest(factCount);
  const compactSource = createSemanticFactCompactCarrier(manifest);
  const materialized = parseSemanticFactCompactCarrierShape(compactSource);
  const sourcePath = path.join(fixture.root, "source.md");
  const source = await readFile(sourcePath, "utf8");
  const compactBlock = `\`\`\`yaml semantic-fact-compact-carrier-v1\n${JSON.stringify(compactSource)}\n\`\`\``;
  const sourceAfter = source.replace(
    /```yaml semantic-fact-manifest-v1\r?\n[\s\S]*?\r?\n```/u,
    compactBlock,
  );
  if (sourceAfter === source)
    throw new Error("synthetic_compact_fixture_source_block_not_replaced");
  await writeFile(sourcePath, sourceAfter, "utf8");
  const contract = projectSyntheticCompactContract(
    structuredClone(fixture.contract),
    materialized.manifest,
  );
  contract.semantic_fact_manifest.sha256 = sha256Hex(
    canonicalValueJson(compactSource),
  );
  const compactContract = createLongTaskCompactContract(
    contract,
    materialized.fact_revisions,
    materialized.obligation_revisions,
  );
  await writeFile(
    path.join(fixture.workdir, "delivery-contract.yaml"),
    JSON.stringify(compactContract),
    "utf8",
  );
  return { manifest: materialized.manifest, compactSource, compactContract };
}

function assertionKey(proofKey) {
  return `semantic-${proofKey.replace(/[^a-z0-9]+/gu, "-")}`;
}

function digestValue(value) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}
