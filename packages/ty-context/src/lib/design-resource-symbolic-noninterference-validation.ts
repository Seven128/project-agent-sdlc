import type { DesignResourceSymbolicCompilationSession } from "./design-resource-symbolic-compilation.js";
import type { DesignResource } from "./design-resource-handoff-file-primitives.js";
import {
  DESIGN_RESOURCE_SYMBOLIC_NONINTERFERENCE_ORACLE_CAPABILITIES,
  type DesignResourceSymbolicNoninterferenceOracleCapability,
} from "./design-resource-fact-enums.js";
import type {
  DesignResourceHandoffPreflightV2,
  DesignResourceObservableRuleManifestV2,
  DesignResourceSymbolicNoninterferenceCertificateV2,
  DesignResourceSymbolicNoninterferenceProofV2,
} from "./design-resource-symbolic-fact-types.js";
import type { SymbolicManifestIndexes } from "./design-resource-symbolic-indexes.js";
import { validateSymbolicNoninterferenceEquivalence } from "./design-resource-symbolic-noninterference-equivalence.js";
import { validateStaticDependencyClosure } from "./design-resource-symbolic-static-dependency-validation.js";
import { validateSymbolicNoninterferenceArtifact } from "./design-resource-symbolic-noninterference-artifact.js";
import {
  assertSameSet,
  invalid,
  unique,
} from "./design-resource-symbolic-validation-support.js";

export function validateTrustedSymbolicNoninterference(
  manifest: DesignResourceObservableRuleManifestV2,
  certificate: DesignResourceSymbolicNoninterferenceCertificateV2,
  projections: DesignResourceHandoffPreflightV2["rule_projections"],
  indexes: SymbolicManifestIndexes,
  compilation: DesignResourceSymbolicCompilationSession,
  target: DesignResourceHandoffPreflightV2["handoff"]["targets"][number],
  resources: ReadonlyMap<string, DesignResource>,
  contents: ReadonlyMap<string, Buffer>,
): void {
  if (!certificate.omitted_axis_refs.length) {
    if (
      certificate.source_noninterference_proof != null ||
      certificate.production_noninterference_proof != null
    )
      invalid("v2_noninterference_proof_without_omission", certificate.key);
    return;
  }
  const proofs = [
    ["source", certificate.source_noninterference_proof],
    ["production", certificate.production_noninterference_proof],
  ] as const;
  for (const [side, proof] of proofs) {
    if (!proof)
      invalid(
        "v2_noninterference_proof_unavailable",
        `${certificate.key}:${side}:${certificate.omitted_axis_refs.join(",")}`,
      );
    validateProof(
      side,
      proof,
      manifest,
      certificate,
      projections,
      indexes,
      compilation,
      target,
      resources,
      contents,
    );
  }
}

function validateProof(
  expectedSide: "source" | "production",
  proof: DesignResourceSymbolicNoninterferenceProofV2,
  manifest: DesignResourceObservableRuleManifestV2,
  certificate: DesignResourceSymbolicNoninterferenceCertificateV2,
  projections: DesignResourceHandoffPreflightV2["rule_projections"],
  indexes: SymbolicManifestIndexes,
  compilation: DesignResourceSymbolicCompilationSession,
  target: DesignResourceHandoffPreflightV2["handoff"]["targets"][number],
  resources: ReadonlyMap<string, DesignResource>,
  contents: ReadonlyMap<string, Buffer>,
): void {
  if (proof.side !== expectedSide)
    invalid(
      "v2_noninterference_proof_side_mismatch",
      `${certificate.key}:${expectedSide}:${proof.side}`,
    );
  assertSameSet(
    proof.input_resource_refs,
    manifest.inspector.input_resources.map((item) => item.resource_ref),
    "v2_noninterference_input_closure_mismatch",
    `${certificate.key}:${expectedSide}`,
  );
  if (!indexes.oracles.has(proof.oracle_ref))
    invalid("v2_noninterference_oracle_unknown", proof.oracle_ref);
  const oracle = indexes.oracles.get(proof.oracle_ref)!;
  if (oracle.trust !== "frozen_executable" || oracle.sha256 === null)
    invalid("v2_noninterference_frozen_oracle_required", proof.oracle_ref);
  const requiredCapability = `symbolic_noninterference.${expectedSide}.${proof.method}`;
  if (!isNoninterferenceOracleCapability(requiredCapability))
    invalid(
      "v2_noninterference_oracle_capability_unregistered",
      requiredCapability,
    );
  if (!oracle.capability_refs.includes(requiredCapability))
    invalid(
      "v2_noninterference_oracle_capability_missing",
      `${proof.oracle_ref}:${requiredCapability}`,
    );
  if (proof.oracle_capability !== requiredCapability)
    invalid(
      "v2_noninterference_oracle_capability_binding_mismatch",
      `${certificate.key}:${proof.oracle_capability}:${requiredCapability}`,
    );
  if (!indexes.environments.has(proof.environment_ref))
    invalid("v2_noninterference_environment_unknown", proof.environment_ref);
  if (proof.dynamic_dependency_kinds.length)
    invalid(
      "v2_noninterference_dynamic_dependency_unproved",
      `${certificate.key}:${proof.dynamic_dependency_kinds.join(",")}`,
    );
  if (proof.external_device_refs.length)
    invalid(
      "v2_noninterference_external_device_unproved",
      `${certificate.key}:${proof.external_device_refs.join(",")}`,
    );
  unique(
    proof.input_resource_refs,
    `v2_noninterference_input_duplicate:${certificate.key}:${expectedSide}`,
  );
  unique(
    proof.dynamic_dependency_kinds,
    `v2_noninterference_dynamic_dependency_duplicate:${certificate.key}:${expectedSide}`,
  );
  unique(
    proof.external_device_refs,
    `v2_noninterference_external_device_duplicate:${certificate.key}:${expectedSide}`,
  );
  assertSameSet(
    proof.omitted_axis_refs,
    certificate.omitted_axis_refs,
    "v2_noninterference_artifact_omitted_axis_mismatch",
    `${certificate.key}:${expectedSide}`,
  );
  if (expectedSide === "source") {
    validateSymbolicNoninterferenceArtifact(
      manifest,
      certificate,
      proof,
      target,
      resources,
      contents,
    );
    return;
  }
  if (proof.method === "closed_world_static_dependency_closure") {
    validateStaticDependencyClosure(proof, certificate, projections, manifest);
  } else
    validateSymbolicNoninterferenceEquivalence(
      proof,
      manifest,
      certificate,
      projections,
      compilation,
    );
  validateSymbolicNoninterferenceArtifact(
    manifest,
    certificate,
    proof,
    target,
    resources,
    contents,
  );
}

function isNoninterferenceOracleCapability(
  value: string,
): value is DesignResourceSymbolicNoninterferenceOracleCapability {
  return (
    DESIGN_RESOURCE_SYMBOLIC_NONINTERFERENCE_ORACLE_CAPABILITIES as readonly string[]
  ).includes(value);
}
