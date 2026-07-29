export function resolveSemanticFactResults(
  manifest,
  observationRefs,
  observations,
) {
  if (!manifest || !Array.isArray(manifest.facts))
    throw new Error("semantic_fact_manifest_facts_required");
  if (
    !observationRefs ||
    typeof observationRefs !== "object" ||
    Array.isArray(observationRefs)
  )
    throw new Error("semantic_fact_observation_refs_record_required");
  if (
    !observations ||
    typeof observations !== "object" ||
    Array.isArray(observations)
  )
    throw new Error("semantic_fact_observations_record_required");

  const factByAuthority = new Map();
  for (const fact of manifest.facts) {
    const authorityRef = fact?.provenance?.authority_ref;
    if (typeof authorityRef !== "string" || !authorityRef)
      throw new Error(
        `semantic_fact_authority_ref_missing:${fact?.key ?? "unknown"}`,
      );
    if (factByAuthority.has(authorityRef))
      throw new Error(`semantic_fact_authority_ref_duplicate:${authorityRef}`);
    factByAuthority.set(authorityRef, fact);
  }

  const declaredRefs = Object.keys(observationRefs);
  const missing = [...factByAuthority.keys()].filter(
    (authorityRef) => !Object.hasOwn(observationRefs, authorityRef),
  );
  if (missing.length)
    throw new Error(
      `semantic_fact_observation_ref_missing:${missing.join(",")}`,
    );
  const unexpected = declaredRefs.filter(
    (authorityRef) => !factByAuthority.has(authorityRef),
  );
  if (unexpected.length)
    throw new Error(
      `semantic_fact_observation_ref_unexpected:${unexpected.join(",")}`,
    );

  const usedObservations = new Set();
  const result = new Map();
  for (const [authorityRef, fact] of factByAuthority) {
    const observation = observationRefs[authorityRef];
    if (typeof observation !== "string" || !observation)
      throw new Error(`semantic_fact_observation_ref_invalid:${authorityRef}`);
    if (usedObservations.has(observation))
      throw new Error(`semantic_fact_observation_ref_reused:${observation}`);
    usedObservations.add(observation);
    if (!Object.hasOwn(observations, observation))
      throw new Error(
        `semantic_fact_observation_missing:${authorityRef}:${observation}`,
      );
    const passed = observations[observation];
    if (typeof passed !== "boolean")
      throw new Error(
        `semantic_fact_observation_not_boolean:${authorityRef}:${observation}`,
      );
    result.set(fact.key, passed);
  }
  return result;
}
