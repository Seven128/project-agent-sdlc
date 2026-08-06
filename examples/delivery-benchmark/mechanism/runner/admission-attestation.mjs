import { spawnSync } from "node:child_process";
import { REPO_ROOT, sha256 } from "./admission-shared.mjs";

export function buildAdmissionAttestation({
  configSha,
  deterministic,
  aggregates,
  candidate,
  expectedTracks,
}) {
  assertCandidate(candidate);
  if (deterministic.value.config_sha256 !== configSha)
    throw new Error("admission_attestation_deterministic_config_mismatch");
  assertSameCandidate(
    deterministic.value.candidate_git,
    candidate,
    "deterministic",
  );
  const byTrack = new Map();
  for (const aggregate of aggregates) {
    const value = aggregate.value;
    if (value.config_sha256 !== configSha)
      throw new Error(
        `admission_attestation_aggregate_config_mismatch:${value.track}`,
      );
    assertSameCandidate(
      value.candidate_git,
      candidate,
      `aggregate:${value.track}`,
    );
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
    schema_version: "tiny-context-admission-attestation-v1",
    sensitive_raw_content_included: false,
    excluded_content_classes: [
      "prompts",
      "model-output",
      "raw-events",
      "stderr",
      "sensitive-source-content",
    ],
    frozen_config_sha256: configSha,
    candidate_git: candidate,
    deterministic: {
      artifact_path: deterministic.path,
      artifact_sha256: deterministic.sha256,
      passed: expectedTracks.every(
        (track) => deterministic.value.tracks?.[track]?.passed === true,
      ),
    },
    tracks: expectedTracks.sort().map((track) => {
      const aggregate = byTrack.get(track);
      const value = aggregate.value;
      return {
        track,
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
  if (
    !actual ||
    actual.commit !== expected.commit ||
    actual.tree !== expected.tree ||
    actual.branch !== expected.branch ||
    actual.main_commit !== expected.main_commit ||
    actual.working_tree_clean !== true
  )
    throw new Error(`admission_attestation_candidate_mismatch:${label}`);
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
