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
    semanticManifestSha256 = null,
    semanticFactRevisions = null,
    semanticObligationRevisions = null,
    semanticAssertionByObligation = null,
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
        manifestSha256: semanticManifestSha256,
        passedByFact: semanticFactResults,
        factRevisions: semanticFactRevisions,
        obligationRevisions: semanticObligationRevisions,
        assertionByObligation: semanticAssertionByObligation,
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

export async function materializeSemanticFactEvidence(options) {
  const {
    repositoryRoot,
    targetRef,
    rootEntrypoint,
    manifest,
    manifestSha256: declaredManifestSha256,
    passedByFact,
    factRevisions = null,
    obligationRevisions = null,
    assertionByObligation = null,
    sessionId,
  } = options;
  if ((factRevisions === null) !== (obligationRevisions === null))
    throw new Error("semantic_fact_revision_identity_incomplete");
  const environment = manifest.environments[0];
  const oracleByRef = new Map(
    manifest.oracles.map((oracle) => [oracle.key, oracle]),
  );
  const factByRef = new Map(manifest.facts.map((fact) => [fact.key, fact]));
  const proofCountByFact = new Map();
  for (const proof of manifest.proof_obligations)
    proofCountByFact.set(
      proof.fact_ref,
      (proofCountByFact.get(proof.fact_ref) ?? 0) + 1,
    );
  const revisionIdentityFor = (fact, proof) =>
    semanticRevisionIdentity(
      fact,
      proof,
      factRevisions,
      obligationRevisions,
    );
  const manifestSha256 =
    declaredManifestSha256 ?? sha256(canonicalJson(manifest));
  const artifact = {
    schema_version: "semantic-fact-self-host-evidence-v2",
    manifest_ref: manifest.key,
    manifest_sha256: manifestSha256,
    environment: environment.definition,
    obligations: {},
  };
  for (const proof of manifest.proof_obligations) {
    const fact = factByRef.get(proof.fact_ref);
    if (!fact)
      throw new Error(`semantic_fact_proof_fact_missing:${proof.key}`);
    const passed = passedByFact.get(fact.key);
    if (typeof passed !== "boolean")
      throw new Error(`semantic_fact_result_missing:${fact.key}`);
    const actualValueSha256 = sha256(canonicalJson(passed));
    const comparisonPassed = actualValueSha256 === fact.expected.sha256;
    const revisionIdentity = revisionIdentityFor(fact, proof);
    artifact.obligations[proof.key] = {
      fact_key: fact.key,
      ...revisionIdentity,
      actual: passed,
      actual_value_sha256: actualValueSha256,
      comparison: {
        passed: comparisonPassed,
        result_sha256: comparisonResultIdentity({
          fact_ref: fact.key,
          proof_ref: proof.key,
          ...revisionIdentity,
          target_ref: targetRef,
          actual_value_sha256: actualValueSha256,
          expected_value_sha256: fact.expected.sha256,
          comparator: proof.comparison.comparator,
          mode: proof.comparison.mode,
          parameters_sha256: proof.comparison.parameters.sha256,
          tolerance_sha256: proof.comparison.tolerance?.sha256 ?? null,
          mask_sha256: proof.comparison.mask?.sha256 ?? null,
        }),
      },
    };
  }
  const artifactPath = "artifacts/semantic-fact-results.json";
  const artifactRaw = `${JSON.stringify(artifact, null, 2)}\n`;
  await mkdir(path.join(repositoryRoot, "artifacts"), { recursive: true });
  await writeFile(path.join(repositoryRoot, artifactPath), artifactRaw);
  const artifactSha256 = sha256(artifactRaw);
  return manifest.proof_obligations.flatMap((proof) => {
    const fact = factByRef.get(proof.fact_ref);
    return factEvidenceRecords({
      targetRef,
      rootEntrypoint,
      artifactPath,
      artifactSha256,
      manifest,
      manifestSha256,
      environment,
      oracleByRef,
      artifact,
      fact,
      proof,
      proofCountByFact,
      assertionByObligation,
      revisionIdentity: revisionIdentityFor(fact, proof),
      sessionId,
    });
  });
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
    artifact,
    fact,
    proof,
    proofCountByFact,
    assertionByObligation,
    revisionIdentity,
    sessionId,
  } = options;
  const assertionKey =
    assertionByObligation?.get(proof.key) ??
    (proofCountByFact.get(fact.key) === 1
      ? `semantic-${fact.provenance.authority_ref}`
      : null);
  if (!assertionKey)
    throw new Error(`semantic_fact_assertion_mapping_missing:${proof.key}`);
  const actual = artifact.obligations[proof.key];
  return [
    {
      assertion_key: assertionKey,
      capability: "semantic_fact",
      manifest_ref: manifest.key,
      manifest_sha256: manifestSha256,
      outcome_ref: fact.outcome_ref,
      target_ref: targetRef,
      ...revisionIdentity,
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
          value: `/obligations/${escapeJsonPointer(proof.key)}/actual`,
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
          value: `/obligations/${escapeJsonPointer(proof.key)}/comparison`,
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

function semanticRevisionIdentity(
  fact,
  proof,
  factRevisions,
  obligationRevisions,
) {
  if (factRevisions === null) return {};
  const factRevisionDigest = factRevisions.get(fact.key);
  const obligationRevisionDigest = obligationRevisions.get(proof.key);
  if (!factRevisionDigest)
    throw new Error(`semantic_fact_revision_missing:${fact.key}`);
  if (!obligationRevisionDigest)
    throw new Error(`semantic_obligation_revision_missing:${proof.key}`);
  return {
    fact_key: fact.key,
    fact_revision_digest: factRevisionDigest,
    obligation_key: proof.key,
    obligation_revision_digest: obligationRevisionDigest,
  };
}

function comparisonResultIdentity(value) {
  const {
    fact_ref,
    proof_ref,
    fact_key,
    fact_revision_digest,
    obligation_key,
    obligation_revision_digest,
    target_ref,
    ...comparison
  } = value;
  const revisionIdentityPresent =
    fact_key !== undefined ||
    fact_revision_digest !== undefined ||
    obligation_key !== undefined ||
    obligation_revision_digest !== undefined;
  const identity = {
    kind: "semantic_fact_non_ui",
    fact_ref,
    proof_ref,
    ...(revisionIdentityPresent
      ? {
          fact_key,
          fact_revision_digest,
          obligation_key,
          obligation_revision_digest,
        }
      : {}),
    target_ref,
  };
  return sha256(
    canonicalJson({
      identity,
      ...comparison,
      passed:
        comparison.actual_value_sha256 === comparison.expected_value_sha256,
    }),
  );
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
