import type { DesignResourceObservableRuleManifestV2 } from "./design-resource-symbolic-fact-types.js";
import type { DesignResourceSymbolicCompilationSession } from "./design-resource-symbolic-compilation.js";
import type { SymbolicManifestIndexes } from "./design-resource-symbolic-indexes.js";
import { assertNoUnprovedOmittedAxes } from "./design-resource-symbolic-safety-validation.js";
import {
  validateSymbolicPopulationAndQuantifier,
  validateSymbolicRegionWithinReachable,
} from "./design-resource-symbolic-region-validation.js";
import {
  invalid,
  requireKnownRefs,
  unique,
} from "./design-resource-symbolic-validation-support.js";

export function validateSymbolicDispositions(
  manifest: DesignResourceObservableRuleManifestV2,
  targetKey: string,
  indexes: SymbolicManifestIndexes,
  compilation: DesignResourceSymbolicCompilationSession,
): void {
  for (const disposition of manifest.disposition_regions) {
    const subject = indexes.subjects.get(disposition.subject_or_relation_ref);
    if (!subject) invalid("v2_disposition_subject_unknown", disposition.key);
    if (!indexes.properties.has(disposition.property_ref))
      invalid("v2_disposition_property_unknown", disposition.key);
    if (disposition.target_ref !== targetKey)
      invalid("v2_disposition_target_mismatch", disposition.key);
    validateSymbolicPopulationAndQuantifier(
      disposition,
      subject.population_ref,
      indexes.populations,
    );
    if (!disposition.basis_refs.length || !disposition.source_item_refs.length)
      invalid("v2_disposition_basis_source_required", disposition.key);
    unique(
      disposition.census_refs,
      `v2_disposition_census_duplicate:${disposition.key}`,
    );
    unique(
      disposition.source_item_refs,
      `v2_disposition_source_item_duplicate:${disposition.key}`,
    );
    unique(
      disposition.basis_refs,
      `v2_disposition_basis_duplicate:${disposition.key}`,
    );
    requireKnownRefs(
      disposition.census_refs,
      indexes.census,
      "v2_disposition_census_unknown",
    );
    requireKnownRefs(
      disposition.source_item_refs,
      indexes.sourceItems,
      "v2_disposition_source_item_unknown",
    );
    validateSymbolicRegionWithinReachable(
      disposition.region,
      manifest.reachable_region,
      disposition.key,
      compilation,
    );
    assertNoUnprovedOmittedAxes(
      compilation.compile(disposition.region),
      disposition.key,
    );
    if (
      disposition.disposition === "decision_required" ||
      disposition.disposition === "unavailable" ||
      disposition.disposition === "blocking"
    )
      invalid(
        "v2_unresolved_disposition",
        `${disposition.key}:${disposition.disposition}`,
      );
  }
}
