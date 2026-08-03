import { Buffer } from "node:buffer";
import type { DesignResource } from "./design-resource-handoff-file-primitives.js";
import type {
  DesignResourceObservableRuleManifestV2,
  DesignResourceSymbolicHandoffTargetV2,
  DesignResourceSymbolicNoninterferenceArtifactV1,
  DesignResourceSymbolicNoninterferenceCertificateV2,
  DesignResourceSymbolicNoninterferenceFailureWitnessV1,
  DesignResourceSymbolicNoninterferenceProofV2,
} from "./design-resource-symbolic-fact-types.js";
import {
  invalid,
  stableJson,
} from "./design-resource-symbolic-validation-support.js";
import { recomputeSymbolicNoninterferenceArtifact } from "./design-resource-symbolic-noninterference-recompute.js";
import { fingerprintExecutableModuleClosure } from "./design-resource-symbolic-oracle-fingerprint.js";
import { canonicalJson, sha256Hex } from "./strict-codec.js";

export const SYMBOLIC_NONINTERFERENCE_ORACLE_IDENTITY =
  "ty-context-symbolic-noninterference-oracle" as const;
export const SYMBOLIC_NONINTERFERENCE_ORACLE_VERSION = "2.0.0" as const;
export const SYMBOLIC_NONINTERFERENCE_ORACLE_IMPLEMENTATION_SHA256 =
  fingerprintExecutableModuleClosure([
    import.meta.url,
    new URL(
      "./design-resource-symbolic-noninterference-validation.js",
      import.meta.url,
    ).href,
    new URL(
      "./design-resource-symbolic-static-dependency-validation.js",
      import.meta.url,
    ).href,
    new URL("./symbolic-denotation-engine.js", import.meta.url).href,
  ]);

export interface SymbolicNoninterferenceArtifactBindingV1 {
  oracle_version: string;
  oracle_implementation_sha256: string;
  environment_sha256: string;
  input_snapshot_sha256: string;
  target_snapshot_sha256: string;
  omitted_axis_refs: string[];
  method_result_sha256: string;
  artifact_resource_ref: string;
  artifact_path: string;
  artifact_sha256: string;
  failure_witness: DesignResourceSymbolicNoninterferenceFailureWitnessV1 | null;
}

export function createSymbolicNoninterferenceArtifactBinding(
  manifest: DesignResourceObservableRuleManifestV2,
  certificate: DesignResourceSymbolicNoninterferenceCertificateV2,
  proof: DesignResourceSymbolicNoninterferenceProofV2,
  target: DesignResourceSymbolicHandoffTargetV2,
  resources: ReadonlyMap<string, DesignResource>,
  contents: ReadonlyMap<string, Buffer>,
  artifactResourceRef: string,
  artifactPath: string,
): {
  artifact: DesignResourceSymbolicNoninterferenceArtifactV1;
  text: string;
  binding: SymbolicNoninterferenceArtifactBindingV1;
} {
  const artifact = recomputeSymbolicNoninterferenceArtifact(
    manifest,
    certificate,
    proof,
    target,
    resources,
    contents,
  );
  const text = canonicalJson(artifact);
  return {
    artifact,
    text,
    binding: {
      oracle_version: artifact.oracle_version,
      oracle_implementation_sha256: artifact.oracle_implementation_sha256,
      environment_sha256: artifact.environment_sha256,
      input_snapshot_sha256: artifact.input_snapshot_sha256,
      target_snapshot_sha256: artifact.target_snapshot_sha256,
      omitted_axis_refs: [...artifact.omitted_axis_refs],
      method_result_sha256: artifact.method_result_sha256,
      artifact_resource_ref: artifactResourceRef,
      artifact_path: artifactPath,
      artifact_sha256: sha256Hex(text),
      failure_witness: artifact.failure_witness
        ? structuredClone(artifact.failure_witness)
        : null,
    },
  };
}

export function validateSymbolicNoninterferenceArtifact(
  manifest: DesignResourceObservableRuleManifestV2,
  certificate: DesignResourceSymbolicNoninterferenceCertificateV2,
  proof: DesignResourceSymbolicNoninterferenceProofV2,
  target: DesignResourceSymbolicHandoffTargetV2,
  resources: ReadonlyMap<string, DesignResource>,
  contents: ReadonlyMap<string, Buffer>,
): void {
  const oracle = manifest.oracles.find((item) => item.key === proof.oracle_ref);
  if (
    oracle?.identity !== SYMBOLIC_NONINTERFERENCE_ORACLE_IDENTITY ||
    oracle.version !== SYMBOLIC_NONINTERFERENCE_ORACLE_VERSION ||
    oracle.sha256 !== SYMBOLIC_NONINTERFERENCE_ORACLE_IMPLEMENTATION_SHA256
  )
    invalid(
      "v2_noninterference_package_oracle_identity_mismatch",
      proof.oracle_ref,
    );
  const expected = recomputeSymbolicNoninterferenceArtifact(
    manifest,
    certificate,
    proof,
    target,
    resources,
    contents,
  );
  const resource = resources.get(proof.artifact_resource_ref);
  const bytes = contents.get(proof.artifact_resource_ref);
  if (
    !resource ||
    !bytes ||
    resource.role !== "supporting" ||
    resource.path !== proof.artifact_path ||
    resource.sha256 !== proof.artifact_sha256 ||
    sha256Hex(bytes) !== proof.artifact_sha256 ||
    !target.resource_refs.includes(proof.artifact_resource_ref)
  )
    invalid(
      "v2_noninterference_artifact_resource_mismatch",
      `${certificate.key}:${proof.side}:${proof.artifact_resource_ref}`,
    );
  const expectedText = canonicalJson(expected);
  if (bytes.toString("utf8") !== expectedText)
    invalid(
      "v2_noninterference_artifact_current_input_mismatch",
      `${certificate.key}:${proof.side}`,
    );
  const binding = {
    oracle_version: proof.oracle_version,
    oracle_implementation_sha256: proof.oracle_implementation_sha256,
    environment_sha256: proof.environment_sha256,
    input_snapshot_sha256: proof.input_snapshot_sha256,
    target_snapshot_sha256: proof.target_snapshot_sha256,
    omitted_axis_refs: proof.omitted_axis_refs,
    method_result_sha256: proof.method_result_sha256,
    failure_witness: proof.failure_witness,
  };
  const expectedBinding = {
    oracle_version: expected.oracle_version,
    oracle_implementation_sha256: expected.oracle_implementation_sha256,
    environment_sha256: expected.environment_sha256,
    input_snapshot_sha256: expected.input_snapshot_sha256,
    target_snapshot_sha256: expected.target_snapshot_sha256,
    omitted_axis_refs: expected.omitted_axis_refs,
    method_result_sha256: expected.method_result_sha256,
    failure_witness: expected.failure_witness,
  };
  if (stableJson(binding) !== stableJson(expectedBinding))
    invalid(
      "v2_noninterference_artifact_binding_mismatch",
      `${certificate.key}:${proof.side}`,
    );
  if (expected.verdict !== "passed" || expected.failure_witness)
    invalid(
      "v2_noninterference_current_input_counterexample",
      stableJson(expected.failure_witness),
    );
}
