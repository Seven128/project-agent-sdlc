import {
  reconcileFixtureBasisRefs,
  reconcileFixtureSourceRefs,
} from "./long-task-semantic-reconcile-primitives-fixture.mjs";

export function bindFixtureSemanticManifest(
  contract,
  manifest,
  authorityRefs,
  primaryAuthority,
) {
  bindFixtureSemanticCollections(manifest, authorityRefs, primaryAuthority);
  bindFixtureSemanticFacts(manifest, authorityRefs, primaryAuthority);
  bindFixtureSemanticProofs(contract, manifest, primaryAuthority);
  bindFixtureSemanticBlockers(manifest, authorityRefs, primaryAuthority);
}

function bindFixtureSemanticCollections(
  manifest,
  authorityRefs,
  primaryAuthority,
) {
  for (const collection of [
    manifest.family_dispositions,
    manifest.subjects,
    manifest.relations,
    manifest.populations,
    manifest.axis_dispositions,
    manifest.condition_rules,
    manifest.conditions,
    manifest.condition_exclusions,
    manifest.property_dispositions,
    manifest.fact_cells,
  ])
    for (const row of collection) {
      if ("source_item_refs" in row)
        row.source_item_refs = reconcileFixtureSourceRefs(
          row.source_item_refs,
          authorityRefs,
          primaryAuthority,
        );
      if ("basis_refs" in row)
        row.basis_refs = reconcileFixtureBasisRefs(
          row.basis_refs,
          authorityRefs,
          primaryAuthority,
        );
      if ("values" in row)
        for (const value of row.values) {
          value.source_item_refs = reconcileFixtureSourceRefs(
            value.source_item_refs,
            authorityRefs,
            primaryAuthority,
          );
          value.basis_refs = reconcileFixtureBasisRefs(
            value.basis_refs,
            authorityRefs,
            primaryAuthority,
          );
        }
    }
  for (const exclusion of manifest.scope.exclusions) {
    exclusion.source_item_refs = reconcileFixtureSourceRefs(
      exclusion.source_item_refs,
      authorityRefs,
      primaryAuthority,
    );
    exclusion.basis_refs = reconcileFixtureBasisRefs(
      exclusion.basis_refs,
      authorityRefs,
      primaryAuthority,
    );
  }
}

function bindFixtureSemanticFacts(
  manifest,
  authorityRefs,
  primaryAuthority,
) {
  const inputRefs = new Set(manifest.inputs.map((input) => input.key));
  const factRefs = new Set(manifest.facts.map((fact) => fact.key));
  for (const fact of manifest.facts) {
    const factSourceRefs = manifest.inputs
      .filter(
        (input) =>
          input.kind === "source_item" &&
          input.disposition === "non_ui_material" &&
          input.fact_refs.includes(fact.key),
      )
      .map((input) => input.source_ref);
    fact.source_item_refs = factSourceRefs;
    if (!factSourceRefs.includes(fact.provenance.authority_ref))
      fact.provenance.authority_ref =
        factSourceRefs[0] ?? primaryAuthority;
    const retainedBasisRefs = fact.provenance.basis_refs.filter(
      (ref) =>
        authorityRefs.includes(ref) ||
        inputRefs.has(ref) ||
        factRefs.has(ref),
    );
    const requiredInputRefs = manifest.inputs
      .filter(
        (input) =>
          input.kind !== "source_item" &&
          input.fact_refs.includes(fact.key),
      )
      .map((input) => input.key);
    fact.provenance.basis_refs = [
      ...new Set([
        ...retainedBasisRefs,
        fact.provenance.authority_ref,
        ...requiredInputRefs,
      ]),
    ];
  }
}

function bindFixtureSemanticProofs(contract, manifest, primaryAuthority) {
  for (const outcome of contract.outcomes) {
    for (const binding of outcome.semantic_fact_bindings.proofs) {
      const check = outcome.acceptance.checks.find(
        (candidate) => candidate.key === binding.check_ref,
      );
      if (!check) continue;
      binding.proof_surface = check.proof_surface;
      const assertion = [
        ...check.positive_assertions,
        ...check.negative_assertions,
      ].find((candidate) => candidate.key === binding.assertion_ref);
      if (assertion) assertion.evidence_capabilities = ["semantic_fact"];
      const proof = manifest.proof_obligations.find(
        (candidate) => candidate.key === binding.proof_ref,
      );
      if (!proof) continue;
      proof.proof_surface = binding.proof_surface;
      proof.evidence_capabilities = [...binding.evidence_capabilities];
      const factBinding = outcome.semantic_fact_bindings.facts.find(
        (candidate) => candidate.fact_ref === binding.fact_ref,
      );
      if (factBinding)
        proof.counterfactual.refs =
          outcome.acceptance.counterfactual_controls
            .filter(
              (control) =>
                control.check_key === binding.check_ref &&
                control.claims.includes(factBinding.claim_ref),
            )
            .map((control) => control.key);
    }
  }
  for (const proof of manifest.proof_obligations)
    proof.counterfactual.basis_refs = reconcileFixtureBasisRefs(
      proof.counterfactual.basis_refs,
      manifest.scope.source_item_refs,
      primaryAuthority,
    );
}

function bindFixtureSemanticBlockers(
  manifest,
  authorityRefs,
  primaryAuthority,
) {
  for (const blocker of manifest.blockers) {
    blocker.source_item_refs = reconcileFixtureSourceRefs(
      blocker.source_item_refs,
      authorityRefs,
      primaryAuthority,
    );
    blocker.basis_refs = reconcileFixtureBasisRefs(
      blocker.basis_refs,
      authorityRefs,
      primaryAuthority,
    );
  }
}
