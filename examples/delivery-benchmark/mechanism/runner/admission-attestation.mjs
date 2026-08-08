import { spawnSync } from "node:child_process";
import { REPO_ROOT, sha256 } from "./admission-shared.mjs";

export function buildAdmissionAttestation({
  globalExecutionEnvelopeSha,
  trackConfigSha,
  deterministic,
  aggregates,
  candidate,
  expectedTracks,
}) {
  assertCandidate(candidate);
  if (
    deterministic.value.global_execution_envelope_sha256 !==
    globalExecutionEnvelopeSha
  )
    throw new Error("admission_attestation_deterministic_global_mismatch");
  assertTrackConfigSet(
    deterministic.value.track_config_sha256,
    trackConfigSha,
    "deterministic",
  );
  assertSameCandidate(
    deterministic.value.candidate_git,
    candidate,
    "deterministic",
  );
  assertDeterministicEnvironment(deterministic.value);
  const byTrack = new Map();
  for (const aggregate of aggregates) {
    const value = aggregate.value;
    if (value.global_execution_envelope_sha256 !== globalExecutionEnvelopeSha)
      throw new Error(
        `admission_attestation_aggregate_global_mismatch:${value.track}`,
      );
    if (value.track_config_sha256 !== trackConfigSha[value.track])
      throw new Error(
        `admission_attestation_aggregate_track_mismatch:${value.track}`,
      );
    assertCandidate(value.candidate_git);
    if (byTrack.has(value.track))
      throw new Error(`admission_attestation_duplicate_track:${value.track}`);
    byTrack.set(value.track, aggregate);
  }
  if (
    byTrack.size !== expectedTracks.length ||
    expectedTracks.some((track) => !byTrack.has(track))
  )
    throw new Error("admission_attestation_track_set_mismatch");
  return {
    schema_version: "tiny-context-admission-attestation-v2",
    sensitive_raw_content_included: false,
    excluded_content_classes: [
      "prompts",
      "model-output",
      "raw-events",
      "stderr",
      "sensitive-source-content",
    ],
    global_execution_envelope_sha256: globalExecutionEnvelopeSha,
    track_config_sha256: trackConfigSha,
    candidate_git: candidate,
    deterministic: {
      artifact_path: deterministic.path,
      artifact_sha256: deterministic.sha256,
      passed:
        deterministic.value.deterministic_runtime_passed === true &&
        expectedTracks.every(
          (track) => deterministic.value.tracks?.[track]?.passed === true,
        ),
      benchmark_execution_environment:
        deterministic.value.benchmark_execution_environment,
      deterministic_runtime_environment:
        deterministic.value.deterministic_runtime_environment,
    },
    tracks: expectedTracks.sort().map((track) => {
      const aggregate = byTrack.get(track);
      const value = aggregate.value;
      return {
        track,
        track_config_sha256: trackConfigSha[track],
        artifact_path: aggregate.path,
        artifact_sha256: aggregate.sha256,
        decision: value.decision,
        pair_count: value.pair_count,
        required_pairs: value.required_pairs,
        pairwise_wins: value.pairwise_wins,
        pairwise_wins_required: value.pairwise_wins_required,
        targeted_defect_reduction: value.targeted_defect_reduction,
        critical_category_regressions: value.critical_category_regressions,
        candidate_must_allow_false_blocking:
          value.candidate_must_allow_false_blocking,
        candidate_other_false_blocking: value.candidate_other_false_blocking,
        simple_path: value.simple_path,
        provenance_qualification: value.provenance_qualification,
        evidence_applicability: sameCandidate(value.candidate_git, candidate)
          ? "current-candidate"
          : "track-identity-reused",
        evidence_candidate_git: value.candidate_git,
        trace_identity_set_sha256: sha256(
          value.reports
            .flatMap((report) => [
              report.baseline.quality.trace_identity,
              report.candidate.quality.trace_identity,
              ...(report.baseline.simple
                ? [report.baseline.simple.trace_identity]
                : []),
              ...(report.candidate.simple
                ? [report.candidate.simple.trace_identity]
                : []),
            ])
            .sort()
            .join("\0"),
        ),
      };
    }),
  };
}

function assertDeterministicEnvironment(deterministic) {
  if (
    deterministic.schema_version !==
      "tiny-context-admission-deterministic-v3" ||
    deterministic.benchmark_execution_environment?.provenance !==
      "frozen-track-input" ||
    deterministic.deterministic_runtime_environment?.observed !== true ||
    deterministic.deterministic_runtime_environment?.node_engine_conformant !==
      true ||
    deterministic.deterministic_runtime_passed !== true
  )
    throw new Error("admission_attestation_deterministic_runtime_invalid");
}

export function currentExactMainCandidate() {
  const branch = gitValue(["branch", "--show-current"]);
  const commit = gitValue(["rev-parse", "HEAD"]);
  const mainCommit = gitValue(["rev-parse", "main"]);
  const tree = gitValue(["rev-parse", "HEAD^{tree}"]);
  const status = gitValue([
    "status",
    "--porcelain=v1",
    "--untracked-files=all",
  ]);
  const candidate = {
    branch,
    commit,
    tree,
    main_commit: mainCommit,
    working_tree_clean: status === "",
  };
  assertCandidate(candidate);
  return candidate;
}

function assertCandidate(candidate) {
  if (
    candidate.branch !== "main" ||
    candidate.commit !== candidate.main_commit ||
    candidate.working_tree_clean !== true ||
    !/^[0-9a-f]{40}$/u.test(candidate.commit) ||
    !/^[0-9a-f]{40}$/u.test(candidate.tree)
  )
    throw new Error("admission_attestation_exact_main_required");
}

function assertSameCandidate(actual, expected, label) {
  if (!sameCandidate(actual, expected))
    throw new Error(`admission_attestation_candidate_mismatch:${label}`);
}

function sameCandidate(actual, expected) {
  return (
    actual?.commit === expected.commit &&
    actual.tree === expected.tree &&
    actual.branch === expected.branch &&
    actual.main_commit === expected.main_commit &&
    actual.working_tree_clean === true
  );
}

function assertTrackConfigSet(actual, expected, label) {
  if (
    JSON.stringify(sortedObject(actual)) !==
    JSON.stringify(sortedObject(expected))
  )
    throw new Error(`admission_attestation_track_config_mismatch:${label}`);
}

function sortedObject(value) {
  return Object.fromEntries(Object.entries(value ?? {}).sort());
}

function gitValue(args) {
  const result = spawnSync("git", args, {
    cwd: REPO_ROOT,
    encoding: "utf8",
    windowsHide: true,
  });
  if (result.status !== 0)
    throw new Error(`admission_attestation_git_failed:${args.join(":")}`);
  return result.stdout.trim();
}
