import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import YAML from "yaml";
import { fixtureExactComparisonResultIdentity } from "./long-task-exact-comparison-fixture.mjs";
import {
  refreshFixtureSemanticManifest,
  semanticManifestIdentity,
  writeContract,
} from "./long-task-delivery-fixtures.mjs";

const repositoryRoot = fileURLToPath(new URL("../..", import.meta.url));

export async function readRepositoryFile(relativePath) {
  return readFile(
    path.join(repositoryRoot, ...relativePath.split("/")),
    "utf8",
  );
}

export function digestValue(value) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

export function refreshComparisonIdentity(record, expected, targetRef) {
  const actualValueSha256 =
    targetRef === record.target_ref
      ? record.actual_observation.value_sha256
      : record.observer_results.find((item) => item.target_ref === targetRef)
          .value_sha256;
  const revisionIdentityPresent =
    expected.fact_key !== undefined ||
    expected.fact_revision_digest !== undefined ||
    expected.obligation_key !== undefined ||
    expected.obligation_revision_digest !== undefined;
  return fixtureExactComparisonResultIdentity({
    identity: revisionIdentityPresent
      ? {
          kind: "semantic_fact_non_ui",
          fact_ref: expected.fact_ref,
          proof_ref: expected.proof_ref,
          fact_key: expected.fact_key,
          fact_revision_digest: expected.fact_revision_digest,
          obligation_key: expected.obligation_key,
          obligation_revision_digest: expected.obligation_revision_digest,
          target_ref: targetRef,
        }
      : {
          kind: "semantic_fact_non_ui",
          fact_ref: expected.fact_ref,
          proof_ref: expected.proof_ref,
          target_ref: targetRef,
        },
    actual_value_sha256: actualValueSha256,
    expected_value_sha256: expected.expected.sha256,
    comparator: expected.comparison.comparator,
    mode: expected.comparison.mode,
    parameters_sha256: expected.comparison.parameters.sha256,
    tolerance_sha256: expected.comparison.tolerance?.sha256 ?? null,
    mask_sha256: expected.comparison.mask?.sha256 ?? null,
    passed: actualValueSha256 === expected.expected.sha256,
  });
}

export function addFixtureCustomConditionAxis(manifest) {
  const condition = manifest.conditions[0];
  const customAxis = {
    key: "axis.custom.delivery-channel",
    axis: "custom.delivery_channel",
    standard: false,
    disposition: "applicable",
    outcome_refs: ["first"],
    values: [
      {
        key: "api",
        source_item_refs: ["fixture-architecture"],
        basis_refs: ["fixture-architecture"],
      },
    ],
    source_item_refs: ["fixture-architecture"],
    basis_refs: ["fixture-architecture"],
    rationale: "The custom channel is explicitly part of the fixture scope.",
  };
  manifest.axis_dispositions.push(customAxis);
  condition.axis_values.push({
    axis_ref: customAxis.key,
    value_ref: customAxis.values[0].key,
  });
  manifest.condition_rules.push({
    key: "condition-rule.custom.delivery-channel",
    outcome_ref: "first",
    axis_refs: [customAxis.key],
    mode: "cross_product",
    condition_refs: [condition.key],
    exclusion_refs: [],
    source_item_refs: ["fixture-architecture"],
    basis_refs: ["fixture-architecture"],
    rationale: "The one-value custom axis has one exact combination.",
  });
  return customAxis;
}

export async function addFixtureDomainSemanticFact(
  fixture,
  {
    sourceItemRef,
    factKey,
    proofKey,
    propertyKey,
    cellKey,
    assertionKey,
    criterion,
    observation,
    observationScope = "service_boundary",
    outcomeKey = "first",
    sourceFactRefs = [factKey],
    counterfactualKey = `remove-${outcomeKey}-state`,
  },
) {
  const outcome = fixture.contract.outcomes.find(
    (candidate) => candidate.key === outcomeKey,
  );
  assert.ok(outcome, `fixture outcome missing: ${outcomeKey}`);
  const check = outcome.acceptance.checks[0];
  const applicabilityRef = outcome.applicability[0].key;
  const claimRef = `semantic_fact.${factKey}`;
  const counterfactual = outcome.acceptance.counterfactual_controls.find(
    (candidate) => candidate.key === counterfactualKey,
  );
  assert.ok(
    counterfactual,
    `fixture counterfactual missing: ${counterfactualKey}`,
  );
  assert.ok(
    !outcome.semantic_fact_bindings.facts.some(
      (binding) => binding.fact_ref === factKey,
    ),
    `fixture semantic Fact already exists: ${factKey}`,
  );

  check.positive_assertions.push({
    key: assertionKey,
    criterion,
    claims: [claimRef],
    applicability_ref: applicabilityRef,
    observation,
    evidence_capabilities: ["semantic_fact"],
    operator: "equals",
    expected: true,
  });
  outcome.semantic_fact_bindings.facts.push({
    fact_ref: factKey,
    claim_ref: claimRef,
    applicability_ref: applicabilityRef,
  });
  outcome.semantic_fact_bindings.proofs.push({
    proof_ref: proofKey,
    fact_ref: factKey,
    method: "exact_value",
    proof_surface: check.proof_surface,
    evidence_capabilities: ["semantic_fact"],
    authority: "machine",
    check_ref: check.key,
    assertion_ref: assertionKey,
  });
  counterfactual.claims.push(claimRef);
  counterfactual.expected_assertion_failures.push(assertionKey);

  return mutateFixtureSemanticManifest(fixture, (manifest) => {
    const fragmentBasisRefs = remapFixtureSourceFactsInManifest(
      manifest,
      sourceItemRef,
      sourceFactRefs,
    );
    const baseFact = manifest.facts.find(
      (candidate) => candidate.outcome_ref === outcomeKey,
    );
    assert.ok(
      baseFact,
      `fixture semantic Fact template missing: ${outcomeKey}`,
    );
    const baseCell = manifest.fact_cells.find(
      (candidate) => candidate.key === baseFact.cell_ref,
    );
    const baseProperty = manifest.property_dispositions.find(
      (candidate) => candidate.key === baseFact.property_ref,
    );
    const baseProof = manifest.proof_obligations.find(
      (candidate) => candidate.fact_ref === baseFact.key,
    );
    assert.ok(baseCell, "fixture semantic Fact Cell template is required");
    assert.ok(baseProperty, "fixture semantic property template is required");
    assert.ok(baseProof, "fixture semantic proof template is required");

    const factIndex = manifest.facts.length;
    const proofIndex = manifest.proof_obligations.length;
    manifest.property_dispositions.push({
      ...structuredClone(baseProperty),
      key: propertyKey,
      property: `custom.${propertyKey.replace(/^property\./u, "").replaceAll("-", "_")}`,
      standard: false,
      applicable_unit_refs: [baseFact.unit_ref],
      not_applicable_unit_refs: manifest.subjects
        .filter(
          (candidate) =>
            candidate.family_ref === baseProperty.family_ref &&
            candidate.key !== baseFact.unit_ref,
        )
        .map((candidate) => candidate.key),
      condition_refs: [baseFact.condition_ref],
      source_item_refs: [sourceItemRef],
      basis_refs: [sourceItemRef],
      rationale:
        "This Source authority domain owns one independently decidable atomic fixture property.",
    });
    manifest.fact_cells.push({
      ...structuredClone(baseCell),
      key: cellKey,
      property_ref: propertyKey,
      fact_ref: factKey,
      source_item_refs: [sourceItemRef],
      basis_refs: [sourceItemRef],
      rationale:
        "This Source authority domain is projected to one exact fixture Fact Cell.",
    });
    manifest.facts.push({
      ...structuredClone(baseFact),
      key: factKey,
      cell_ref: cellKey,
      property_ref: propertyKey,
      observation_scope: observationScope,
      expected: {
        ...structuredClone(baseFact.expected),
        locator: {
          ...structuredClone(baseFact.expected.locator),
          value: `/facts/${factIndex}/expected/value`,
        },
      },
      provenance: {
        kind: "direct",
        authority_ref: sourceItemRef,
        basis_refs: [sourceItemRef, ...fragmentBasisRefs],
        derivation: null,
      },
      source_item_refs: [sourceItemRef],
    });
    manifest.proof_obligations.push({
      ...structuredClone(baseProof),
      key: proofKey,
      fact_ref: factKey,
      comparison: {
        ...structuredClone(baseProof.comparison),
        parameters: {
          ...structuredClone(baseProof.comparison.parameters),
          locator: {
            ...structuredClone(baseProof.comparison.parameters.locator),
            value: `/proof_obligations/${proofIndex}/comparison/parameters/value`,
          },
        },
      },
      counterfactual: {
        ...structuredClone(baseProof.counterfactual),
        refs: [counterfactualKey],
        basis_refs: [sourceItemRef],
      },
    });
  });
}

export async function remapFixtureSourceFacts(
  fixture,
  sourceItemRef,
  factRefs,
) {
  return mutateFixtureSemanticManifest(fixture, (manifest) =>
    remapFixtureSourceFactsInManifest(manifest, sourceItemRef, factRefs),
  );
}

function remapFixtureSourceFactsInManifest(manifest, sourceItemRef, factRefs) {
  const sourceInput = manifest.inputs.find(
    (input) =>
      input.kind === "source_item" && input.source_ref === sourceItemRef,
  );
  assert.ok(sourceInput, `fixture Source input missing: ${sourceItemRef}`);
  sourceInput.fact_refs = [...factRefs];
  sourceInput.rationale =
    "This fixture Source item is explicitly projected only to same-domain Semantic Facts.";
  const fragmentInputs = manifest.inputs.filter(
    (input) =>
      (input.kind === "source_fragment" || input.kind === "semantic_anchor") &&
      input.basis_refs.includes(sourceItemRef),
  );
  assert.ok(
    fragmentInputs.length > 0,
    `fixture Source Fragment input missing: ${sourceItemRef}`,
  );
  for (const input of fragmentInputs) input.fact_refs = [...factRefs];
  for (const fact of manifest.facts) {
    if (factRefs.includes(fact.key)) {
      if (!fact.source_item_refs.includes(sourceItemRef))
        fact.source_item_refs.push(sourceItemRef);
      if (!fact.provenance.basis_refs.includes(sourceItemRef))
        fact.provenance.basis_refs.push(sourceItemRef);
      continue;
    }
    fact.source_item_refs = fact.source_item_refs.filter(
      (reference) => reference !== sourceItemRef,
    );
    fact.provenance.basis_refs = fact.provenance.basis_refs.filter(
      (reference) => reference !== sourceItemRef,
    );
  }
  return fragmentInputs.map((input) => input.key);
}

export async function mutateFixtureSemanticManifest(fixture, mutate) {
  const sourcePath = path.join(fixture.root, "source.md");
  const source = await readFile(sourcePath, "utf8");
  const match = source.match(
    /```yaml semantic-fact-manifest-v1\r?\n([\s\S]*?)\r?\n```/u,
  );
  assert.ok(match);
  const manifest = YAML.parse(match[1]);
  mutate(manifest);
  refreshFixtureSemanticManifest(manifest);
  const serialized = YAML.stringify(JSON.parse(JSON.stringify(manifest)), {
    lineWidth: 0,
  }).trimEnd();
  await writeFile(
    sourcePath,
    source.replace(
      match[0],
      `\`\`\`yaml semantic-fact-manifest-v1\n${serialized}\n\`\`\``,
    ),
  );
  fixture.contract.semantic_fact_manifest.sha256 =
    semanticManifestIdentity(manifest);
  await writeContract(fixture.workdir, fixture.contract, {
    synchronizeSemanticManifest: false,
  });
  return manifest;
}
