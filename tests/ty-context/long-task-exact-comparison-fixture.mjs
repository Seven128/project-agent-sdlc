import { createHash } from "node:crypto";

export function fixtureExactComparisonResultIdentity(value) {
  return createHash("sha256").update(canonicalJson(value)).digest("hex");
}

export function fixtureExactComparisonInput({
  identity,
  actualValueSha256,
  expectedValueSha256,
  comparison,
}) {
  return {
    identity,
    actual_value_sha256: actualValueSha256,
    expected_value_sha256: expectedValueSha256,
    comparator: comparison.comparator,
    mode: comparison.mode,
    parameters_sha256: comparison.parameters.sha256,
    tolerance_sha256: comparison.tolerance?.sha256 ?? null,
    mask_sha256: comparison.mask?.sha256 ?? null,
  };
}

function canonicalJson(value) {
  return JSON.stringify(sortCanonical(value));
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
