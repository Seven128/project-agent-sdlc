import { isKnownSymbolicApplicabilityPolicyRef } from "./design-resource-symbolic-applicability-policy.js";
import type { SymbolicManifestIndexes } from "./design-resource-symbolic-indexes.js";
import {
  invalid,
  requireKnownRefs,
  unique,
} from "./design-resource-symbolic-validation-support.js";

export function validateSymbolicApplicabilityAuthorityRefs(
  row: {
    census_refs: string[];
    source_item_refs: string[];
    basis_refs: string[];
    rationale: string;
  },
  indexes: SymbolicManifestIndexes,
  artifactRefs: ReadonlySet<string>,
  label: string,
): void {
  if (
    !row.census_refs.length ||
    !row.source_item_refs.length ||
    !row.basis_refs.length ||
    !row.rationale.trim()
  )
    invalid("v2_applicability_authority_incomplete", label);
  unique(row.census_refs, `v2_applicability_census_duplicate:${label}`);
  unique(
    row.source_item_refs,
    `v2_applicability_source_item_duplicate:${label}`,
  );
  unique(row.basis_refs, `v2_applicability_basis_duplicate:${label}`);
  requireKnownRefs(
    row.census_refs,
    indexes.census,
    "v2_applicability_census_unknown",
  );
  requireKnownRefs(
    row.source_item_refs,
    indexes.sourceItems,
    "v2_applicability_source_item_unknown",
  );
  for (const basisRef of row.basis_refs)
    if (
      !isKnownSymbolicApplicabilityPolicyRef(basisRef) &&
      !indexes.census.has(basisRef) &&
      !artifactRefs.has(basisRef)
    )
      invalid(
        "v2_applicability_basis_authority_unknown",
        `${label}:${basisRef}`,
      );
}
