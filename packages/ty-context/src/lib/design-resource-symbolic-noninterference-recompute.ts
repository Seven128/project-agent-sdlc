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
  compareText,
  invalid,
  sha256,
  stableJson,
} from "./design-resource-symbolic-validation-support.js";
import { sha256Hex } from "./strict-codec.js";
import { productionClosureFailure } from "./design-resource-symbolic-production-closure.js";

export function recomputeSymbolicNoninterferenceArtifact(
  manifest: DesignResourceObservableRuleManifestV2,
  certificate: DesignResourceSymbolicNoninterferenceCertificateV2,
  proof: DesignResourceSymbolicNoninterferenceProofV2,
  target: DesignResourceSymbolicHandoffTargetV2,
  resources: ReadonlyMap<string, DesignResource>,
  contents: ReadonlyMap<string, Buffer>,
): DesignResourceSymbolicNoninterferenceArtifactV1 {
  const oracle = manifest.oracles.find((item) => item.key === proof.oracle_ref);
  const environment = manifest.environments.find(
    (item) => item.key === proof.environment_ref,
  );
  if (!oracle) invalid("v2_noninterference_oracle_unknown", proof.oracle_ref);
  if (!environment)
    invalid("v2_noninterference_environment_unknown", proof.environment_ref);
  const inputs = inputSnapshot(manifest, resources, contents);
  const failureWitness = currentDependencyFailure(
    manifest,
    certificate,
    proof,
    target,
    resources,
    contents,
  );
  const methodMaterial = {
    method: proof.method,
    static_dependency_nodes: proof.static_dependency_nodes,
    static_rule_roots: proof.static_rule_roots,
    equivalence_cases: proof.equivalence_cases,
    current_dependency_result: failureWitness,
  };
  return {
    schema_version: "design-resource-symbolic-noninterference-artifact-v1",
    side: proof.side,
    method: proof.method,
    oracle_identity: oracle.identity,
    oracle_version: oracle.version,
    oracle_implementation_sha256: oracle.sha256 ?? "0".repeat(64),
    environment_sha256: sha256(stableJson(environment)),
    input_snapshot_sha256: sha256(stableJson(inputs)),
    target_snapshot_sha256:
      proof.side === "source"
        ? sourceSnapshot(manifest, certificate, inputs)
        : productionSnapshot(target, inputs),
    omitted_axis_refs: [...certificate.omitted_axis_refs].sort(compareText),
    method_result_sha256: sha256(stableJson(methodMaterial)),
    verdict: failureWitness ? "failed" : "passed",
    failure_witness: failureWitness,
  };
}

function inputSnapshot(
  manifest: DesignResourceObservableRuleManifestV2,
  resources: ReadonlyMap<string, DesignResource>,
  contents: ReadonlyMap<string, Buffer>,
) {
  return manifest.inspector.input_resources
    .map((input) => {
      const resource = resources.get(input.resource_ref);
      const bytes = contents.get(input.resource_ref);
      if (!resource || !bytes)
        invalid(
          "v2_noninterference_input_resource_missing",
          input.resource_ref,
        );
      return {
        inspector_input: input,
        resource,
        current_sha256: sha256Hex(bytes),
      };
    })
    .sort((left, right) =>
      compareText(
        left.inspector_input.resource_ref,
        right.inspector_input.resource_ref,
      ),
    );
}

function sourceSnapshot(
  manifest: DesignResourceObservableRuleManifestV2,
  certificate: DesignResourceSymbolicNoninterferenceCertificateV2,
  inputs: unknown,
): string {
  return sha256(
    stableJson({
      manifest: sourceManifestSnapshot(manifest),
      certificate_scope: certificateSnapshot(certificate),
      inputs,
    }),
  );
}

function productionSnapshot(
  target: DesignResourceSymbolicHandoffTargetV2,
  inputs: unknown,
): string {
  return sha256(
    stableJson({
      target,
      inputs,
    }),
  );
}

function sourceManifestSnapshot(
  manifest: DesignResourceObservableRuleManifestV2,
): Record<string, unknown> {
  return {
    ...manifest,
    noninterference_certificates:
      manifest.noninterference_certificates.map(certificateSnapshot),
  };
}

function certificateSnapshot(
  certificate: DesignResourceSymbolicNoninterferenceCertificateV2,
): Record<string, unknown> {
  const result: Record<string, unknown> = { ...certificate };
  delete result.key;
  delete result.source_noninterference_proof;
  delete result.production_noninterference_proof;
  return result;
}

function currentDependencyFailure(
  manifest: DesignResourceObservableRuleManifestV2,
  certificate: DesignResourceSymbolicNoninterferenceCertificateV2,
  proof: DesignResourceSymbolicNoninterferenceProofV2,
  target: DesignResourceSymbolicHandoffTargetV2,
  resources: ReadonlyMap<string, DesignResource>,
  contents: ReadonlyMap<string, Buffer>,
): DesignResourceSymbolicNoninterferenceFailureWitnessV1 | null {
  if (
    proof.dynamic_dependency_kinds.length ||
    proof.external_device_refs.length
  )
    return unsupportedWitness(
      `declared:${[
        ...proof.dynamic_dependency_kinds,
        ...proof.external_device_refs,
      ].join(",")}`,
    );
  if (proof.side === "source") {
    // Exact Source dependency is recomputed by the selected DAG/equivalence
    // validator; syntactic occurrences can simplify to constants.
    return null;
  }
  return productionClosureFailure(target, certificate, resources, contents);
}

function unsupportedWitness(
  detail: string,
): DesignResourceSymbolicNoninterferenceFailureWitnessV1 {
  return {
    kind: "unsupported_dependency",
    axis_ref: null,
    resource_ref: null,
    path: null,
    byte_offset: null,
    detail,
  };
}
