import { Buffer } from "node:buffer";
import type { DesignResource } from "./design-resource-handoff-file-primitives.js";
import type {
  DesignResourceObservableRuleManifestV2,
  DesignResourceSymbolicHandoffTargetV2,
  DesignResourceSymbolicNoninterferenceArtifactV2,
  DesignResourceSymbolicNoninterferenceCertificateV2,
  DesignResourceSymbolicNoninterferenceDerivedResultV2,
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
import {
  symbolicNoninterferenceCertificateScopeSha256,
  symbolicNoninterferenceArtifactResourceRefs,
  symbolicNoninterferenceProductionTargetSnapshot,
  symbolicNoninterferenceRuleScopeSha256,
  symbolicNoninterferenceSourceManifestSnapshot,
} from "./design-resource-symbolic-noninterference-scope.js";
import { deriveCurrentSourceNoninterferenceEvidence } from "./design-resource-symbolic-source-ir-oracle.js";

export function recomputeSymbolicNoninterferenceArtifact(
  manifest: DesignResourceObservableRuleManifestV2,
  certificate: DesignResourceSymbolicNoninterferenceCertificateV2,
  proof: DesignResourceSymbolicNoninterferenceProofV2,
  target: DesignResourceSymbolicHandoffTargetV2,
  resources: ReadonlyMap<string, DesignResource>,
  contents: ReadonlyMap<string, Buffer>,
): DesignResourceSymbolicNoninterferenceArtifactV2 {
  const oracle = manifest.oracles.find((item) => item.key === proof.oracle_ref);
  const environment = manifest.environments.find(
    (item) => item.key === proof.environment_ref,
  );
  if (!oracle) invalid("v2_noninterference_oracle_unknown", proof.oracle_ref);
  if (!environment)
    invalid("v2_noninterference_environment_unknown", proof.environment_ref);
  const inputs = inputSnapshot(manifest, resources, contents);
  const certificateScopeSha256 =
    symbolicNoninterferenceCertificateScopeSha256(certificate);
  const ruleScopeSha256 = symbolicNoninterferenceRuleScopeSha256(
    manifest,
    certificate,
  );
  const oracleCapability = `symbolic_noninterference.${proof.side}.${proof.method}`;
  const current =
    proof.side === "source"
      ? deriveCurrentSourceNoninterferenceEvidence({
          manifest,
          certificate,
          method: proof.method,
          target,
          resources,
          contents,
        })
      : {
          derived_result: productionDerivedResult(proof),
          failure_witness: currentProductionDependencyFailure(
            manifest,
            certificate,
            proof,
            target,
            resources,
            contents,
          ),
        };
  const sourceManifestSnapshotSha256 =
    proof.side === "source"
      ? sha256(
          stableJson(symbolicNoninterferenceSourceManifestSnapshot(manifest)),
        )
      : null;
  const methodMaterial = {
    method: proof.method,
    oracle_capability: oracleCapability,
    derived_result: current.derived_result,
    current_dependency_result: current.failure_witness,
  };
  return {
    schema_version: "design-resource-symbolic-noninterference-artifact-v2",
    side: proof.side,
    method: proof.method,
    oracle_identity: oracle.identity,
    oracle_version: oracle.version,
    oracle_implementation_sha256: oracle.sha256 ?? "0".repeat(64),
    oracle_capability: oracleCapability,
    environment_sha256: sha256(stableJson(environment)),
    input_resources: inputs.map((input) => ({
      resource_ref: input.resource_ref,
      path: input.path,
      declared_sha256: input.declared_sha256,
      current_sha256: input.current_sha256,
    })),
    input_snapshot_sha256: sha256(stableJson(inputs)),
    source_manifest_snapshot_sha256: sourceManifestSnapshotSha256,
    target_snapshot_sha256:
      proof.side === "source"
        ? sourceSnapshot(
            sourceManifestSnapshotSha256!,
            certificateScopeSha256,
            ruleScopeSha256,
            inputs,
          )
        : productionSnapshot(manifest, target, inputs),
    certificate_scope_sha256: certificateScopeSha256,
    rule_scope_sha256: ruleScopeSha256,
    omitted_axis_refs: [...certificate.omitted_axis_refs].sort(compareText),
    derived_result: current.derived_result,
    method_result_sha256: sha256(stableJson(methodMaterial)),
    verdict: current.failure_witness ? "failed" : "passed",
    failure_witness: current.failure_witness,
  };
}

function inputSnapshot(
  manifest: DesignResourceObservableRuleManifestV2,
  resources: ReadonlyMap<string, DesignResource>,
  contents: ReadonlyMap<string, Buffer>,
) {
  const artifactRefs = symbolicNoninterferenceArtifactResourceRefs(manifest);
  return manifest.inspector.input_resources
    .map((input) => {
      if (artifactRefs.has(input.resource_ref))
        invalid(
          "v2_noninterference_artifact_self_reference",
          input.resource_ref,
        );
      const resource = resources.get(input.resource_ref);
      const bytes = contents.get(input.resource_ref);
      if (
        !resource ||
        !bytes ||
        resource.path !== input.path ||
        resource.sha256 !== input.sha256
      )
        invalid(
          "v2_noninterference_input_resource_missing",
          input.resource_ref,
        );
      return {
        resource_ref: input.resource_ref,
        path: input.path,
        declared_sha256: input.sha256,
        current_sha256: sha256Hex(bytes),
      };
    })
    .sort((left, right) => compareText(left.resource_ref, right.resource_ref));
}

function sourceSnapshot(
  sourceManifestSnapshotSha256: string,
  certificateScopeSha256: string,
  ruleScopeSha256: string,
  inputs: unknown,
): string {
  return sha256(
    stableJson({
      source_manifest_snapshot_sha256: sourceManifestSnapshotSha256,
      certificate_scope_sha256: certificateScopeSha256,
      rule_scope_sha256: ruleScopeSha256,
      inputs,
    }),
  );
}

function productionSnapshot(
  manifest: DesignResourceObservableRuleManifestV2,
  target: DesignResourceSymbolicHandoffTargetV2,
  inputs: unknown,
): string {
  return sha256(
    stableJson({
      target: symbolicNoninterferenceProductionTargetSnapshot(manifest, target),
      inputs,
    }),
  );
}

function currentProductionDependencyFailure(
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
      certificate,
      `declared:${[
        ...proof.dynamic_dependency_kinds,
        ...proof.external_device_refs,
      ].join(",")}`,
    );
  const inputRefs = manifest.inspector.input_resources.map(
    (input) => input.resource_ref,
  );
  return productionClosureFailure(
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
}

function unsupportedWitness(
  certificate: DesignResourceSymbolicNoninterferenceCertificateV2,
  detail: string,
): DesignResourceSymbolicNoninterferenceFailureWitnessV1 {
  return {
    kind: "unsupported_dependency",
    side: "production",
    certificate_scope_sha256:
      symbolicNoninterferenceCertificateScopeSha256(certificate),
    axis_ref: null,
    fact_rule_ref: null,
    resource_ref: null,
    path: null,
    locator: null,
    node_ref: null,
    byte_offset: null,
    assignment: null,
    detail,
  };
}

function productionDerivedResult(
  proof: DesignResourceSymbolicNoninterferenceProofV2,
): DesignResourceSymbolicNoninterferenceDerivedResultV2 {
  return {
    source_ir_resource_ref: null,
    static_dependency_nodes: structuredClone(proof.static_dependency_nodes),
    static_rule_roots: structuredClone(proof.static_rule_roots),
    equivalence_cases: structuredClone(proof.equivalence_cases),
    complete_domain_cardinality: proof.complete_domain_cardinality,
    exhaustive_evaluation_sha256: null,
  };
}
