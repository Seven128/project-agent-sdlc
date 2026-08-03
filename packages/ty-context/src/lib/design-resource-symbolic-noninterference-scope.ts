import type {
  DesignResourceObservableRuleManifestV2,
  DesignResourceSymbolicHandoffTargetV2,
  DesignResourceSymbolicNoninterferenceCertificateV2,
} from "./design-resource-symbolic-fact-types.js";
import {
  compareText,
  sha256,
  stableJson,
} from "./design-resource-symbolic-validation-support.js";

export function symbolicNoninterferenceCertificateScope(
  certificate: DesignResourceSymbolicNoninterferenceCertificateV2,
): Record<string, unknown> {
  const {
    key: _key,
    source_noninterference_proof: _sourceProof,
    production_noninterference_proof: _productionProof,
    ...scope
  } = certificate;
  return {
    ...scope,
    fact_rule_refs: [...scope.fact_rule_refs].sort(compareText),
    omitted_axis_refs: [...scope.omitted_axis_refs].sort(compareText),
    dependency_edge_refs: [...scope.dependency_edge_refs].sort(compareText),
  };
}

export function symbolicNoninterferenceCertificateScopeSha256(
  certificate: DesignResourceSymbolicNoninterferenceCertificateV2,
): string {
  return sha256(
    stableJson(symbolicNoninterferenceCertificateScope(certificate)),
  );
}

export function symbolicNoninterferenceRuleScopeSha256(
  manifest: DesignResourceObservableRuleManifestV2,
  certificate: DesignResourceSymbolicNoninterferenceCertificateV2,
): string {
  const rules = new Map(manifest.fact_rules.map((rule) => [rule.key, rule]));
  return sha256(
    stableJson(
      [...certificate.fact_rule_refs].sort(compareText).map((ruleRef) => ({
        rule_ref: ruleRef,
        rule: rules.get(ruleRef) ?? null,
      })),
    ),
  );
}

export function symbolicNoninterferenceSourceManifestSnapshot(
  manifest: DesignResourceObservableRuleManifestV2,
): Record<string, unknown> {
  return {
    ...manifest,
    noninterference_certificates: manifest.noninterference_certificates.map(
      symbolicNoninterferenceCertificateScope,
    ),
  };
}

export function symbolicNoninterferenceArtifactResourceRefs(
  manifest: DesignResourceObservableRuleManifestV2,
): Set<string> {
  return new Set(
    manifest.noninterference_certificates.flatMap((certificate) =>
      [
        certificate.source_noninterference_proof,
        certificate.production_noninterference_proof,
      ]
        .filter((proof) => proof != null)
        .map((proof) => proof.artifact_resource_ref),
    ),
  );
}

export function symbolicNoninterferenceProductionTargetSnapshot(
  manifest: DesignResourceObservableRuleManifestV2,
  target: DesignResourceSymbolicHandoffTargetV2,
): Record<string, unknown> {
  const artifacts = symbolicNoninterferenceArtifactResourceRefs(manifest);
  const semanticInputs = new Set(
    manifest.inspector.input_resources.map((input) => input.resource_ref),
  );
  const keep = (ref: string) => semanticInputs.has(ref) && !artifacts.has(ref);
  return {
    ...target,
    resource_refs: target.resource_refs.filter(keep).sort(compareText),
    source_profile: {
      ...target.source_profile,
      dependency_resource_refs: target.source_profile.dependency_resource_refs
        .filter(keep)
        .sort(compareText),
    },
  };
}
