import {
  assertSameSemanticFactSet,
  requireSemanticFactBasis,
  semanticFactInvalid,
  validateSemanticFactLocator,
} from "./semantic-fact-policy-primitives.js";
import type { SemanticFactManifestV1 } from "./semantic-fact-types.js";
import { canonicalValueJson, sha256Hex } from "./strict-codec.js";

type CensusExpectation = {
  pointer: string;
  row: unknown;
  fact_refs: string[];
};

export function validateSemanticFactInspectorCensus(
  manifest: SemanticFactManifestV1,
  externalFactRefs: ReadonlySet<string> = new Set(),
): void {
  const factRefs = new Set([
    ...manifest.facts.map((item) => item.key),
    ...externalFactRefs,
  ]);
  const factsFor = (
    predicate: (fact: SemanticFactManifestV1["facts"][number]) => boolean,
  ) => manifest.facts.filter(predicate).map((item) => item.key);
  const expected = expectedCensusRows(manifest, factsFor);
  const actual = new Set<string>();
  for (const entry of manifest.inspector.census) {
    const identity = `${entry.kind}:${entry.key}`;
    actual.add(identity);
    const expectedEntry = expected.get(identity);
    if (!expectedEntry)
      semanticFactInvalid("census_identity_unknown", identity);
    if (
      entry.locator.material_ref !== manifest.key ||
      entry.locator.kind !== "manifest_pointer" ||
      entry.locator.value !== expectedEntry.pointer
    )
      semanticFactInvalid("census_locator_mismatch", identity);
    const identityDigest = sha256Hex(canonicalValueJson(expectedEntry.row));
    if (entry.identity_sha256 !== identityDigest)
      semanticFactInvalid(
        "census_identity_digest_mismatch",
        `${identity}:${entry.identity_sha256}:${identityDigest}`,
      );
    for (const factRef of entry.fact_refs)
      if (!factRefs.has(factRef))
        semanticFactInvalid("census_fact_unknown", `${entry.key}:${factRef}`);
    assertSameSemanticFactSet(
      entry.fact_refs,
      expectedEntry.fact_refs,
      `census_fact_set:${identity}`,
    );
    const expectedDisposition = expectedEntry.fact_refs.length
      ? "material_with_facts"
      : "supporting_only";
    if (entry.disposition !== expectedDisposition)
      semanticFactInvalid(
        "census_disposition_mismatch",
        `${identity}:${entry.disposition}:${expectedDisposition}`,
      );
    validateSemanticFactLocator(manifest, entry.locator, `census:${entry.key}`);
    requireSemanticFactBasis(entry, `census:${entry.key}`);
  }
  assertSameSemanticFactSet(
    [...actual],
    [...expected.keys()],
    "inspector_census_universe",
  );
}

export function buildSemanticFactInspectorCensus(
  manifest: SemanticFactManifestV1,
): SemanticFactManifestV1["inspector"]["census"] {
  const factsFor = (
    predicate: (fact: SemanticFactManifestV1["facts"][number]) => boolean,
  ) => manifest.facts.filter(predicate).map((item) => item.key);
  return [...expectedCensusRows(manifest, factsFor).entries()].map(
    ([identity, expectation]) => {
      const separator = identity.indexOf(":");
      const kind = identity.slice(
        0,
        separator,
      ) as SemanticFactManifestV1["inspector"]["census"][number]["kind"];
      const key = identity.slice(separator + 1);
      const basisRefs = censusBasisRefs(
        kind,
        expectation.row,
        expectation.fact_refs,
        manifest,
      );
      return {
        key,
        kind,
        locator: {
          material_ref: manifest.key,
          kind: "manifest_pointer" as const,
          value: expectation.pointer,
        },
        identity_sha256: sha256Hex(canonicalValueJson(expectation.row)),
        disposition: expectation.fact_refs.length
          ? ("material_with_facts" as const)
          : ("supporting_only" as const),
        fact_refs: expectation.fact_refs,
        basis_refs: basisRefs,
        rationale: expectation.fact_refs.length
          ? "This census identity contributes to an exact semantic Fact."
          : "This identity is explicitly inventoried as supporting or inapplicable.",
      };
    },
  );
}

function censusBasisRefs(
  kind: SemanticFactManifestV1["inspector"]["census"][number]["kind"],
  row: unknown,
  factRefs: string[],
  manifest: SemanticFactManifestV1,
): string[] {
  if (row && typeof row === "object" && !Array.isArray(row)) {
    const record = row as Record<string, unknown>;
    for (const field of ["basis_refs", "source_item_refs"])
      if (
        Array.isArray(record[field]) &&
        record[field].every((item) => typeof item === "string") &&
        record[field].length
      )
        return [...(record[field] as string[])];
  }
  if (kind === "proof_obligation" && factRefs.length) {
    const fact = manifest.facts.find((item) => item.key === factRefs[0]);
    if (fact?.source_item_refs.length) return [...fact.source_item_refs];
  }
  return [manifest.scope.source_item_refs[0]];
}

function expectedCensusRows(
  manifest: SemanticFactManifestV1,
  factsFor: (
    predicate: (fact: SemanticFactManifestV1["facts"][number]) => boolean,
  ) => string[],
): Map<string, CensusExpectation> {
  const result = new Map<string, CensusExpectation>();
  const add = (
    kind: SemanticFactManifestV1["inspector"]["census"][number]["kind"],
    key: string,
    pointer: string,
    row: unknown,
    factRefs: string[],
  ) =>
    result.set(`${kind}:${key}`, {
      pointer,
      row,
      fact_refs: [...new Set(factRefs)].sort(),
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
  addAxisCensusRows(manifest, factsFor, add);
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
    add("condition", row.key, `/condition_exclusions/${index}`, row, []),
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
    add("proof_obligation", row.key, `/proof_obligations/${index}`, row, [
      row.fact_ref,
    ]),
  );
  addProofSupportCensusRows(manifest, add);
  return result;
}

function addAxisCensusRows(
  manifest: SemanticFactManifestV1,
  factsFor: (
    predicate: (fact: SemanticFactManifestV1["facts"][number]) => boolean,
  ) => string[],
  add: (
    kind: SemanticFactManifestV1["inspector"]["census"][number]["kind"],
    key: string,
    pointer: string,
    row: unknown,
    factRefs: string[],
  ) => void,
): void {
  manifest.axis_dispositions.forEach((row, axisIndex) => {
    add(
      "axis",
      row.key,
      `/axis_dispositions/${axisIndex}`,
      row,
      factsFor(
        (fact) =>
          manifest.conditions
            .find((condition) => condition.key === fact.condition_ref)
            ?.axis_values.some((value) => value.axis_ref === row.key) ?? false,
      ),
    );
    row.values.forEach((value, valueIndex) =>
      add(
        "axis_value",
        `${row.key}:${value.key}`,
        `/axis_dispositions/${axisIndex}/values/${valueIndex}`,
        value,
        factsFor(
          (fact) =>
            manifest.conditions
              .find((condition) => condition.key === fact.condition_ref)
              ?.axis_values.some(
                (entry) =>
                  entry.axis_ref === row.key && entry.value_ref === value.key,
              ) ?? false,
        ),
      ),
    );
  });
}

function addProofSupportCensusRows(
  manifest: SemanticFactManifestV1,
  add: (
    kind: SemanticFactManifestV1["inspector"]["census"][number]["kind"],
    key: string,
    pointer: string,
    row: unknown,
    factRefs: string[],
  ) => void,
): void {
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
}
