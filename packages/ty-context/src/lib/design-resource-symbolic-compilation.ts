import type { DesignResourceObservableRuleManifestV2 } from "./design-resource-symbolic-fact-types.js";
import { createSymbolicDenotationCompilationSession } from "./symbolic-denotation-engine.js";

export function createDesignResourceSymbolicCompilationSession(
  manifest: DesignResourceObservableRuleManifestV2,
) {
  return createSymbolicDenotationCompilationSession(manifest.axis_domains, [
    manifest.reachable_region,
    ...manifest.fact_rules.map((rule) => rule.region),
    ...manifest.disposition_regions.map((row) => row.region),
    ...manifest.populations.flatMap((population) =>
      population.exclusions.map((exclusion) => exclusion.region),
    ),
    ...manifest.noninterference_certificates.flatMap((certificate) =>
      [certificate.production_noninterference_proof].flatMap(
        (proof) =>
          proof?.equivalence_cases.flatMap((item) => [
            item.side_predicate,
            item.axis_erased_predicate,
          ]) ?? [],
      ),
    ),
  ]);
}

export type DesignResourceSymbolicCompilationSession = ReturnType<
  typeof createDesignResourceSymbolicCompilationSession
>;
