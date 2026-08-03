import { Buffer } from "node:buffer";
import type { DesignResource } from "./design-resource-handoff-file-primitives.js";
import type {
  DesignResourceObservableRuleManifestV2,
  DesignResourceSymbolicHandoffTargetV2,
  DesignResourceSymbolicNoninterferenceCertificateV2,
  DesignResourceSymbolicNoninterferenceFailureWitnessV1,
  DesignResourceSymbolicNoninterferenceProofMethodV2,
} from "./design-resource-symbolic-fact-types.js";
import {
  symbolicNoninterferenceCertificateScopeSha256,
  symbolicNoninterferenceRuleScopeSha256,
} from "./design-resource-symbolic-noninterference-scope.js";
import { productionClosureFailure } from "./design-resource-symbolic-production-closure.js";
import {
  emptyDerivedSourceResult,
  failedSourceEvidence,
  sourceNoninterferenceWitness,
  sourceOracleErrorText,
  type DerivedCurrentSourceNoninterferenceEvidenceV2,
} from "./design-resource-symbolic-source-ir-evidence.js";
import { deriveCurrentSourceScopeEvidence } from "./design-resource-symbolic-source-ir-proof.js";
import { parseDesignResourceSymbolicSourceIr } from "./design-resource-symbolic-source-ir-shape.js";
import { DESIGN_RESOURCE_SYMBOLIC_SOURCE_IR_MEDIA_TYPE } from "./design-resource-symbolic-source-ir-types.js";
import { canonicalJson } from "./strict-codec.js";

export type { DerivedCurrentSourceNoninterferenceEvidenceV2 } from "./design-resource-symbolic-source-ir-evidence.js";

export function deriveCurrentSourceNoninterferenceEvidence({
  manifest,
  certificate,
  method,
  target,
  resources,
  contents,
}: {
  manifest: DesignResourceObservableRuleManifestV2;
  certificate: DesignResourceSymbolicNoninterferenceCertificateV2;
  method: DesignResourceSymbolicNoninterferenceProofMethodV2;
  target: DesignResourceSymbolicHandoffTargetV2;
  resources: ReadonlyMap<string, DesignResource>;
  contents: ReadonlyMap<string, Buffer>;
}): DerivedCurrentSourceNoninterferenceEvidenceV2 {
  const certificateScopeSha256 =
    symbolicNoninterferenceCertificateScopeSha256(certificate);
  const ruleScopeSha256 = symbolicNoninterferenceRuleScopeSha256(
    manifest,
    certificate,
  );
  const empty = emptyDerivedSourceResult(method);
  const closureFailure = currentSourceClosureFailure(
    manifest,
    certificate,
    target,
    resources,
    contents,
  );
  if (closureFailure)
    return { derived_result: empty, failure_witness: closureFailure };
  const sourceResourceRefs = manifest.inspector.input_resources
    .map((input) => input.resource_ref)
    .filter(
      (ref) =>
        resources.get(ref)?.media_type ===
        DESIGN_RESOURCE_SYMBOLIC_SOURCE_IR_MEDIA_TYPE,
    );
  if (sourceResourceRefs.length !== 1)
    return failedSourceEvidence(
      empty,
      sourceNoninterferenceWitness({
        certificateScopeSha256,
        detail: `symbolic_source_ir_count:${sourceResourceRefs.length}`,
      }),
    );
  const sourceResourceRef = sourceResourceRefs[0];
  const resource = resources.get(sourceResourceRef)!;
  const bytes = contents.get(sourceResourceRef)!;
  const source = bytes.toString("utf8");
  let parsed;
  try {
    const raw = JSON.parse(source) as unknown;
    if (canonicalJson(raw) !== source)
      throw new Error("symbolic Source IR must use canonical JSON bytes");
    parsed = parseDesignResourceSymbolicSourceIr(
      raw,
      `symbolic_source_ir:${sourceResourceRef}`,
    );
  } catch (error) {
    return failedSourceEvidence(
      { ...empty, source_ir_resource_ref: sourceResourceRef },
      sourceNoninterferenceWitness({
        certificateScopeSha256,
        resource,
        detail: `invalid_symbolic_source_ir:${sourceOracleErrorText(error)}`,
      }),
    );
  }
  if (parsed.target_ref !== target.key)
    return failedSourceEvidence(
      { ...empty, source_ir_resource_ref: sourceResourceRef },
      sourceNoninterferenceWitness({
        certificateScopeSha256,
        resource,
        locator: "/target_ref",
        detail: `symbolic_source_ir_target_mismatch:${parsed.target_ref}:${target.key}`,
      }),
    );
  const matches = parsed.certificate_scopes.filter(
    (scope) =>
      scope.certificate_scope_sha256 === certificateScopeSha256 &&
      scope.rule_scope_sha256 === ruleScopeSha256,
  );
  if (matches.length !== 1)
    return failedSourceEvidence(
      { ...empty, source_ir_resource_ref: sourceResourceRef },
      sourceNoninterferenceWitness({
        certificateScopeSha256,
        resource,
        locator: "/certificate_scopes",
        detail: `symbolic_source_ir_scope_match_count:${matches.length}:rule_scope=${ruleScopeSha256}`,
      }),
    );
  try {
    return deriveCurrentSourceScopeEvidence({
      manifest,
      certificate,
      method,
      resource,
      source,
      sourceResourceRef,
      scope: matches[0],
      certificateScopeSha256,
    });
  } catch (error) {
    return failedSourceEvidence(
      { ...empty, source_ir_resource_ref: sourceResourceRef },
      sourceNoninterferenceWitness({
        certificateScopeSha256,
        resource,
        locator: "/certificate_scopes",
        detail: `unsupported_symbolic_source_ir:${sourceOracleErrorText(error)}`,
      }),
    );
  }
}

function currentSourceClosureFailure(
  manifest: DesignResourceObservableRuleManifestV2,
  certificate: DesignResourceSymbolicNoninterferenceCertificateV2,
  target: DesignResourceSymbolicHandoffTargetV2,
  resources: ReadonlyMap<string, DesignResource>,
  contents: ReadonlyMap<string, Buffer>,
): DesignResourceSymbolicNoninterferenceFailureWitnessV1 | null {
  const inputRefs = manifest.inspector.input_resources.map(
    (input) => input.resource_ref,
  );
  const failure = productionClosureFailure(
    {
      ...target,
      resource_refs: inputRefs,
      source_profile: {
        ...target.source_profile,
        dependency_resource_refs: inputRefs.filter(
          (ref) => ref !== target.source_profile.entry_resource_ref,
        ),
      },
    },
    certificate,
    resources,
    contents,
  );
  return failure
    ? {
        ...failure,
        side: "source",
        detail: `unsupported_source:${failure.detail}`,
      }
    : null;
}
