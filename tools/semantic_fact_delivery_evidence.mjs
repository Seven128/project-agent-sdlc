import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export async function emitSemanticDeliveryResult(options) {
  const {
    repositoryRoot,
    targetRef,
    rootEntrypoint,
    observations,
    assertionKeys,
    kind,
    semanticManifest = null,
    semanticFactResults = null,
  } = options;
  const digest = sha256(JSON.stringify(observations)).slice(0, 16);
  const sessionId = `semantic-fact-${kind}-${digest}`;
  const evidenceRecords = assertionKeys.map((assertionKey) => ({
    assertion_key: assertionKey,
    capability: "target_runtime",
    target_ref: targetRef,
    root_entrypoint: rootEntrypoint,
    session_id: sessionId,
    cold_start: true,
  }));
  if (semanticManifest)
    evidenceRecords.push(
      ...(await materializeSemanticFactEvidence({
        repositoryRoot,
        targetRef,
        rootEntrypoint,
        manifest: semanticManifest,
        passedByFact: semanticFactResults,
        sessionId,
      })),
    );
  console.log(
    JSON.stringify({
      schema_version: "long-task-check-result-v3",
      execution_status: "completed",
      observations,
      evidence_records: evidenceRecords,
    }),
  );
}

async function materializeSemanticFactEvidence(options) {
  const {
    repositoryRoot,
    targetRef,
    rootEntrypoint,
    manifest,
    passedByFact,
    sessionId,
  } = options;
  const environment = manifest.environments[0];
  const oracleByRef = new Map(
    manifest.oracles.map((oracle) => [oracle.key, oracle]),
  );
  const proofByFact = new Map(
    manifest.proof_obligations.map((proof) => [proof.fact_ref, proof]),
  );
  const artifact = {
    schema_version: "semantic-fact-self-host-evidence-v1",
    manifest_ref: manifest.key,
    environment: environment.definition,
    facts: {},
  };
  for (const fact of manifest.facts) {
    const passed = passedByFact.get(fact.key);
    if (typeof passed !== "boolean")
      throw new Error(`semantic_fact_result_missing:${fact.key}`);
    const proof = proofByFact.get(fact.key);
    const actualValueSha256 = sha256(canonicalJson(passed));
    artifact.facts[fact.key] = {
      actual: passed,
      actual_value_sha256: actualValueSha256,
      comparison: {
        passed,
        result_sha256: comparisonResultIdentity({
          fact_ref: fact.key,
          proof_ref: proof.key,
          target_ref: targetRef,
          actual_value_sha256: actualValueSha256,
          expected_value_sha256: fact.expected.sha256,
          comparator: proof.comparison.comparator,
          mode: proof.comparison.mode,
          parameters_sha256: proof.comparison.parameters.sha256,
          tolerance_sha256: proof.comparison.tolerance?.sha256 ?? null,
          mask_sha256: proof.comparison.mask?.sha256 ?? null,
          passed,
        }),
      },
    };
  }
  const artifactPath = "artifacts/semantic-fact-results.json";
  const artifactRaw = `${JSON.stringify(artifact, null, 2)}\n`;
  await mkdir(path.join(repositoryRoot, "artifacts"), { recursive: true });
  await writeFile(path.join(repositoryRoot, artifactPath), artifactRaw);
  const artifactSha256 = sha256(artifactRaw);
  const manifestSha256 = sha256(canonicalJson(manifest));
  return manifest.facts.flatMap((fact) =>
    factEvidenceRecords({
      targetRef,
      rootEntrypoint,
      artifactPath,
      artifactSha256,
      manifest,
      manifestSha256,
      environment,
      oracleByRef,
      proofByFact,
      artifact,
      fact,
      sessionId,
    }),
  );
}

function factEvidenceRecords(options) {
  const {
    targetRef,
    rootEntrypoint,
    artifactPath,
    artifactSha256,
    manifest,
    manifestSha256,
    environment,
    oracleByRef,
    proofByFact,
    artifact,
    fact,
    sessionId,
  } = options;
  const proof = proofByFact.get(fact.key);
  const assertionKey = `semantic-${fact.provenance.authority_ref}`;
  const actual = artifact.facts[fact.key];
  return [
    {
      assertion_key: assertionKey,
      capability: "semantic_fact",
      manifest_ref: manifest.key,
      manifest_sha256: manifestSha256,
      outcome_ref: fact.outcome_ref,
      target_ref: targetRef,
      fact_ref: fact.key,
      proof_ref: proof.key,
      method: proof.method,
      subject_ref: fact.unit_ref,
      condition_ref: fact.condition_ref,
      property_ref: fact.property_ref,
      actual_observation: {
        artifact_path: artifactPath,
        artifact_sha256: artifactSha256,
        locator: {
          kind: "json_pointer",
          value: `/facts/${escapeJsonPointer(fact.key)}/actual`,
        },
        value_sha256: actual.actual_value_sha256,
        sensitivity: fact.observation_sensitivity,
        redaction: null,
      },
      actual_environment: {
        artifact_path: artifactPath,
        artifact_sha256: artifactSha256,
        locator: { kind: "json_pointer", value: "/environment" },
        value_sha256: environment.definition.sha256,
      },
      expected: fact.expected,
      comparison: {
        artifact_path: artifactPath,
        artifact_sha256: artifactSha256,
        locator: {
          kind: "json_pointer",
          value: `/facts/${escapeJsonPointer(fact.key)}/comparison`,
        },
        result_sha256: actual.comparison.result_sha256,
        comparator: proof.comparison.comparator,
        mode: proof.comparison.mode,
        parameters: proof.comparison.parameters,
        tolerance: proof.comparison.tolerance,
        mask: proof.comparison.mask,
        passed: actual.comparison.passed,
      },
      verdict: actual.comparison.passed ? "passed" : "failed",
      oracle: oracleByRef.get(proof.oracle_ref),
      environment,
      observer_results: [],
    },
    {
      assertion_key: assertionKey,
      capability: "target_runtime",
      target_ref: targetRef,
      root_entrypoint: rootEntrypoint,
      session_id: sessionId,
      cold_start: true,
    },
  ];
}

function comparisonResultIdentity(value) {
  return sha256(canonicalJson(value));
}

function canonicalJson(value) {
  return JSON.stringify(sortCanonical(value));
}

function sortCanonical(value) {
  if (Array.isArray(value)) return value.map(sortCanonical);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, sortCanonical(value[key])]),
    );
  return value;
}

function escapeJsonPointer(value) {
  return value.replaceAll("~", "~0").replaceAll("/", "~1");
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}
