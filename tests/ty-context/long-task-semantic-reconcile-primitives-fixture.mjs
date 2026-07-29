export function reconcileFixtureSourceRefs(
  refs,
  authorityRefs,
  fallback,
) {
  const retained = refs.filter((ref) => authorityRefs.includes(ref));
  return retained.length ? retained : fallback ? [fallback] : [];
}

export function reconcileFixtureBasisRefs(refs, authorityRefs, fallback) {
  const retained = refs.filter((ref) => authorityRefs.includes(ref));
  return retained.length ? retained : fallback ? [fallback] : [];
}
