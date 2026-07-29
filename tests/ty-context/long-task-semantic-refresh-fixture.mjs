import { createHash } from "node:crypto";
import { semanticFactCollectionIdentity } from "../../packages/ty-context/dist/lib/semantic-fact-policy.js";
import { SEMANTIC_FACT_MANIFEST_COLLECTIONS } from "../../packages/ty-context/dist/lib/semantic-fact-types.js";

export function refreshFixtureSemanticManifest(manifest) {
  manifest.inspector.census = fixtureSemanticCensus(manifest);
  const collections = fixtureSemanticCollections(manifest);
  manifest.generation.collections = SEMANTIC_FACT_MANIFEST_COLLECTIONS.map(
    (name) => ({
      name,
      expected_count: collections[name].length,
      identity_sha256: semanticFactCollectionIdentity(collections[name]),
    }),
  );
  return manifest;
}

function fixtureSemanticCensus(manifest) {
  const factsFor = (predicate) =>
    manifest.facts.filter(predicate).map((fact) => fact.key);
  const rows = [];
  const add = (kind, key, pointer, row, factRefs) =>
    rows.push({
      key,
      kind,
      locator: {
        material_ref: manifest.key,
        kind: "manifest_pointer",
        value: pointer,
      },
      identity_sha256: digestCanonical(row),
      disposition: factRefs.length
        ? "material_with_facts"
        : "supporting_only",
      fact_refs: [...new Set(factRefs)].sort(),
      basis_refs:
        row.basis_refs?.length
          ? row.basis_refs
          : manifest.scope.source_item_refs.slice(0, 1),
      rationale: factRefs.length
        ? "This census identity contributes to an exact fixture Fact."
        : "This identity is explicitly inventoried as supporting or inapplicable.",
    });
  manifest.inputs.forEach((row, index) =>
    add("input", row.key, `/inputs/${index}`, row, row.fact_refs),
  );
  manifest.scope.exclusions.forEach((row, index) =>
    add(
      "scope_exclusion",
      row.key,
      `/scope/exclusions/${index}`,
      row,
      row.affected_refs.filter((ref) =>
        manifest.facts.some((fact) => fact.key === ref),
      ),
    ),
  );
  manifest.family_dispositions.forEach((row, index) =>
    add(
      "family",
      row.key,
      `/family_dispositions/${index}`,
      row,
      factsFor((fact) => fact.family_ref === row.key),
    ),
  );
  manifest.subjects.forEach((row, index) =>
    add(
      "subject",
      row.key,
      `/subjects/${index}`,
      row,
      factsFor((fact) => fact.unit_ref === row.key),
    ),
  );
  manifest.relations.forEach((row, index) =>
    add(
      "relation",
      row.key,
      `/relations/${index}`,
      row,
      factsFor((fact) => fact.unit_ref === row.key),
    ),
  );
  manifest.populations.forEach((row, index) =>
    add(
      "population",
      row.key,
      `/populations/${index}`,
      row,
      factsFor(
        (fact) =>
          fact.unit_ref === row.key ||
          fact.quantifier.population_ref === row.key,
      ),
    ),
  );
  manifest.axis_dispositions.forEach((row, axisIndex) => {
    add(
      "axis",
      row.key,
      `/axis_dispositions/${axisIndex}`,
      row,
      factsFor((fact) =>
        manifest.conditions
          .find((condition) => condition.key === fact.condition_ref)
          ?.axis_values.some((value) => value.axis_ref === row.key),
      ),
    );
    row.values.forEach((value, valueIndex) =>
      add(
        "axis_value",
        `${row.key}:${value.key}`,
        `/axis_dispositions/${axisIndex}/values/${valueIndex}`,
        value,
        factsFor((fact) =>
          manifest.conditions
            .find((condition) => condition.key === fact.condition_ref)
            ?.axis_values.some(
              (entry) =>
                entry.axis_ref === row.key && entry.value_ref === value.key,
            ),
        ),
      ),
    );
  });
  manifest.condition_rules.forEach((row, index) =>
    add(
      "condition_rule",
      row.key,
      `/condition_rules/${index}`,
      row,
      factsFor((fact) => row.condition_refs.includes(fact.condition_ref)),
    ),
  );
  manifest.conditions.forEach((row, index) =>
    add(
      "condition",
      row.key,
      `/conditions/${index}`,
      row,
      factsFor((fact) => fact.condition_ref === row.key),
    ),
  );
  manifest.condition_exclusions.forEach((row, index) =>
    add(
      "condition",
      row.key,
      `/condition_exclusions/${index}`,
      row,
      [],
    ),
  );
  manifest.property_dispositions.forEach((row, index) =>
    add(
      "property",
      row.key,
      `/property_dispositions/${index}`,
      row,
      factsFor((fact) => fact.property_ref === row.key),
    ),
  );
  manifest.fact_cells.forEach((row, index) =>
    add(
      "fact_cell",
      row.key,
      `/fact_cells/${index}`,
      row,
      row.fact_ref ? [row.fact_ref] : [],
    ),
  );
  manifest.facts.forEach((row, index) =>
    add("fact", row.key, `/facts/${index}`, row, [row.key]),
  );
  manifest.proof_obligations.forEach((row, index) =>
    add(
      "proof_obligation",
      row.key,
      `/proof_obligations/${index}`,
      row,
      [row.fact_ref],
    ),
  );
  manifest.oracles.forEach((row, index) =>
    add(
      "oracle",
      row.key,
      `/oracles/${index}`,
      row,
      manifest.proof_obligations
        .filter((proof) => proof.oracle_ref === row.key)
        .map((proof) => proof.fact_ref),
    ),
  );
  manifest.environments.forEach((row, index) =>
    add(
      "environment",
      row.key,
      `/environments/${index}`,
      row,
      manifest.proof_obligations
        .filter((proof) => proof.environment_ref === row.key)
        .map((proof) => proof.fact_ref),
    ),
  );
  manifest.blockers.forEach((row, index) =>
    add(
      "blocker",
      row.key,
      `/blockers/${index}`,
      row,
      row.affected_refs.filter((ref) =>
        manifest.facts.some((fact) => fact.key === ref),
      ),
    ),
  );
  return rows;
}

function fixtureSemanticCollections(manifest) {
  return {
    inputs: manifest.inputs,
    inspector_census: manifest.inspector.census,
    family_dispositions: manifest.family_dispositions,
    subjects: manifest.subjects,
    relations: manifest.relations,
    populations: manifest.populations,
    axis_dispositions: manifest.axis_dispositions,
    condition_rules: manifest.condition_rules,
    conditions: manifest.conditions,
    condition_exclusions: manifest.condition_exclusions,
    property_dispositions: manifest.property_dispositions,
    fact_cells: manifest.fact_cells,
    facts: manifest.facts,
    proof_obligations: manifest.proof_obligations,
    oracles: manifest.oracles,
    environments: manifest.environments,
    blockers: manifest.blockers,
  };
}

export function digestCanonical(value) {
  return digestText(JSON.stringify(sortCanonical(value)));
}

export function digestText(value) {
  return createHash("sha256").update(value).digest("hex");
}

function sortCanonical(value) {
  if (Array.isArray(value)) return value.map(sortCanonical);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, sortCanonical(value[key])]),
    );
  return value;
}

export function semanticManifestIdentity(manifest) {
  return digestCanonical(manifest);
}
