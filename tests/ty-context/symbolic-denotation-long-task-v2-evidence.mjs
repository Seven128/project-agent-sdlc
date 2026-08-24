import { writeFile } from "node:fs/promises";
import path from "node:path";
import {
  groundMethodRecord,
  symbolicCertificateRecord,
  symbolicMethodRecord,
} from "./symbolic-denotation-long-task-v2-records.mjs";
import { fixtureSha } from "./symbolic-denotation-long-task-v2-support.mjs";

export async function writeDesignArtifacts(root, ...targets) {
  const paths = new Set();
  for (const target of targets) {
    paths.add(target.actual_artifact_path);
    paths.add(target.comparison_artifact_path);
    for (const binding of target.verification_method_bindings ?? [])
      for (const artifact of binding.evidence_artifacts) {
        paths.add(artifact.path);
        paths.add(artifact.observation_path);
      }
    for (const binding of target.symbolic_method_bindings ?? []) {
      paths.add(binding.artifact_path);
      paths.add(binding.observation_path);
    }
    if (target.symbolic_certificate_binding)
      paths.add(target.symbolic_certificate_binding.artifact_path);
  }
  const hashes = {};
  for (const artifactPath of [...paths].sort()) {
    const lineEnding = process.platform === "win32" ? "\r\n" : "\n";
    const content = `${JSON.stringify({ artifactPath, current_candidate: true })}${lineEnding}`;
    await writeFile(path.join(root, artifactPath), content);
    hashes[artifactPath] = fixtureSha(content);
  }
  return hashes;
}

export function designEvidenceRecords(check, v1Target, v2Target, hashes) {
  const records = [];
  const targetByAssertion = indexTargetsByAssertion(v1Target, v2Target);
  const baseAssertionKeys = new Set([
    "first-result",
    "first-semantic-fact",
    "first-architecture",
    "first-requirement",
    "first-obligation",
    "first-liveness",
    "first-relations-na",
  ]);
  for (const assertion of [
    ...check.positive_assertions,
    ...check.negative_assertions,
  ]) {
    if (baseAssertionKeys.has(assertion.key)) continue;
    const owner = targetByAssertion.get(assertion.key);
    for (const capability of assertion.evidence_capabilities) {
      const record = evidenceRecordForCapability(
        assertion,
        capability,
        owner,
        hashes,
      );
      if (record) records.push(record);
    }
  }
  return records;
}

function indexTargetsByAssertion(v1Target, v2Target) {
  const index = new Map();
  for (const target of [v1Target, v2Target]) {
    index.set(target.conformance_assertion_ref, target);
    for (const binding of target.verification_method_bindings ?? [])
      index.set(binding.assertion_ref, { target, binding });
    for (const binding of target.symbolic_method_bindings ?? [])
      index.set(binding.assertion_ref, { target, binding });
    if (target.symbolic_certificate_binding)
      index.set(target.symbolic_certificate_binding.assertion_ref, {
        target,
        binding: target.symbolic_certificate_binding,
      });
  }
  return index;
}

function evidenceRecordForCapability(assertion, capability, owner, hashes) {
  if (capability === "target_runtime")
    return {
      assertion_key: assertion.key,
      capability,
      target_ref: "fixture-app",
      root_entrypoint: "tests/oracle.mjs",
      session_id: `mixed-${assertion.key}`,
      cold_start: true,
    };
  if (capability === "state_delta")
    return {
      assertion_key: assertion.key,
      capability,
      before_sha256: "0".repeat(64),
      after_sha256: "1".repeat(64),
      changed_fields: [assertion.observation],
    };
  if (capability === "interaction_trace")
    return {
      assertion_key: assertion.key,
      capability,
      target_ref: "fixture-app",
      given_keys: ["fixture-loaded"],
      action_keys: ["read-outcome"],
    };
  if (capability === "design_conformance") {
    const target = owner.target ?? owner;
    return {
      assertion_key: assertion.key,
      capability,
      design_target_ref: target.key,
      target_ref: "fixture-app",
      condition_keys: [...target.condition_keys],
      actual_artifact_path: target.actual_artifact_path,
      comparison_artifact_path: target.comparison_artifact_path,
    };
  }
  if (capability === "visual_render") {
    const target = owner.target ?? owner;
    return {
      assertion_key: assertion.key,
      capability,
      artifact_path: target.actual_artifact_path,
      artifact_sha256: hashes[target.actual_artifact_path],
    };
  }
  if (capability === "design_method")
    return owner.target.fact_model === "symbolic_rules_v2"
      ? symbolicMethodRecord(assertion.key, owner.target, owner.binding, hashes)
      : groundMethodRecord(assertion.key, owner.target, owner.binding, hashes);
  if (capability === "design_symbolic_certificate")
    return symbolicCertificateRecord(
      assertion.key,
      owner.target,
      owner.binding,
      hashes,
    );
  return null;
}
