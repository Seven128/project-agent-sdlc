import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { aggregateAdmissionPairs } from "../../examples/delivery-benchmark/mechanism/runner/admission-aggregate.mjs";
import { buildAdmissionAttestation } from "../../examples/delivery-benchmark/mechanism/runner/admission-attestation.mjs";
import { parseAdmissionEvents } from "../../examples/delivery-benchmark/mechanism/runner/admission-execute.mjs";
import {
  buildAdmissionEvidencePayload,
  encodeAdmissionEvidencePayload,
  materializeAdmissionEvidencePayload,
} from "../../examples/delivery-benchmark/mechanism/runner/admission-evidence.mjs";
import { scoreAdmissionInvocation } from "../../examples/delivery-benchmark/mechanism/runner/admission-score.mjs";
import {
  admissionConfigIdentities,
  loadAdmissionConfig,
  resolveArtifactFile,
  sha256,
  verifyFrozenAdmission,
} from "../../examples/delivery-benchmark/mechanism/runner/admission-shared.mjs";
import {
  buildPassingRow,
  draPassingRow,
  syntheticPair,
} from "./fresh-agent-admission-fixture.mjs";

const repo = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const mechanism = path.join(
  repo,
  "examples",
  "delivery-benchmark",
  "mechanism",
);
const readJson = async (relative) =>
  JSON.parse(await readFile(path.join(mechanism, relative), "utf8"));
const trace = {
  environment_doubt: false,
  tool_calls: 0,
  duration_ms: 100,
  total_tokens: 1000,
};

test("fresh-Agent admission configuration freezes two independent tracks before execution", async () => {
  const {
    config,
    global_execution_envelope_sha256: globalExecutionEnvelopeSha,
    track_config_sha256: trackConfigSha,
  } = await loadAdmissionConfig();
  await assert.doesNotReject(verifyFrozenAdmission(config));
  assert.equal(
    config.baseline_commit,
    "611aafcddedd7d59a606f5cd4fcd519b58eb073d",
  );
  assert.deepEqual(Object.keys(config.tracks).sort(), [
    "build-reuse-buy",
    "dra-semantic-recovery",
  ]);
  assert.equal(config.model, "gpt-5.6-terra");
  assert.equal(config.reasoning_effort, "medium");
  assert.equal(config.provider, "openai");
  assert.match(globalExecutionEnvelopeSha, /^[0-9a-f]{64}$/u);
  assert.deepEqual(Object.keys(trackConfigSha).sort(), [
    "build-reuse-buy",
    "dra-semantic-recovery",
  ]);
  assert.equal(config.pair_policy.minimum_pairs, 3);
  assert.equal(config.pair_policy.expanded_pairs, 5);
  assert.equal(config.pair_policy.cv_threshold, 0.2);
  assert.equal(config.pair_policy.near_threshold_margin, 0.05);
  for (const track of Object.values(config.tracks)) {
    assert.deepEqual(track.pair_policy, config.pair_policy);
    assert.equal(track.thresholds.targeted_defect_reduction, 0.25);
    assert.equal(track.thresholds.must_allow_false_blocking, 0);
    assert.ok(track.allowed_solution_sets.length > 0);
    assert.ok(track.prohibited_failure_modes.length > 0);
    for (const variant of ["baseline", "candidate"])
      assert.ok(track.variants[variant].guidance.quality.bundle_sha256);
  }
  const dra = config.tracks["dra-semantic-recovery"];
  assert.equal(dra.thresholds.simple_path_max_overhead, 0.1);
  assert.equal(dra.variants.baseline.guidance.simple.sources.length, 1);
  assert.equal(dra.variants.candidate.guidance.simple.sources.length, 1);
  assert.doesNotMatch(
    dra.variants.candidate.guidance.simple.sources[0].path,
    /recovery-and-writeback/u,
  );
  assert.throws(
    () => resolveArtifactFile("../outside.json"),
    /unsafe_admission_artifact_path/u,
  );
});

test("global and track-local identities invalidate only their owning admission scope", async () => {
  const { config, ...identity } = await loadAdmissionConfig();
  for (const mutate of [
    (changed) => {
      const digest = "a".repeat(64);
      changed.tracks["dra-semantic-recovery"].modes.quality.task.sha256 =
        digest;
      changed.frozen_files.find((record) =>
        record.path.endsWith("admission/dra-quality-cases.json"),
      ).sha256 = digest;
    },
    (changed) => {
      changed.tracks[
        "dra-semantic-recovery"
      ].variants.candidate.guidance.quality.bundle_sha256 = "b".repeat(64);
    },
    (changed) => {
      changed.frozen_files.find((record) =>
        record.path.endsWith("runner/admission-score-dra.mjs"),
      ).sha256 = "c".repeat(64);
    },
  ]) {
    const changed = structuredClone(config);
    mutate(changed);
    const changedIdentity = admissionConfigIdentities(changed);
    assert.equal(
      changedIdentity.global_execution_envelope_sha256,
      identity.global_execution_envelope_sha256,
    );
    assert.notEqual(
      changedIdentity.track_config_sha256["dra-semantic-recovery"],
      identity.track_config_sha256["dra-semantic-recovery"],
    );
    assert.equal(
      changedIdentity.track_config_sha256["build-reuse-buy"],
      identity.track_config_sha256["build-reuse-buy"],
    );
  }

  for (const mutate of [
    (changed) => {
      changed.tracks[
        "build-reuse-buy"
      ].variants.candidate.guidance.quality.bundle_sha256 = "d".repeat(64);
    },
    (changed) => {
      changed.frozen_files.find((record) =>
        record.path.endsWith("runner/admission-score-build-reuse-buy.mjs"),
      ).sha256 = "e".repeat(64);
    },
  ]) {
    const changed = structuredClone(config);
    mutate(changed);
    const changedIdentity = admissionConfigIdentities(changed);
    assert.equal(
      changedIdentity.track_config_sha256["dra-semantic-recovery"],
      identity.track_config_sha256["dra-semantic-recovery"],
    );
    assert.notEqual(
      changedIdentity.track_config_sha256["build-reuse-buy"],
      identity.track_config_sha256["build-reuse-buy"],
    );
  }

  const globalChanged = structuredClone(config);
  globalChanged.model = `${config.model}-different`;
  const globalIdentity = admissionConfigIdentities(globalChanged);
  assert.notEqual(
    globalIdentity.global_execution_envelope_sha256,
    identity.global_execution_envelope_sha256,
  );
  assert.deepEqual(
    globalIdentity.track_config_sha256,
    identity.track_config_sha256,
  );
});

test("hidden DRA probes score semantic replay, authority, CAS, audit and must-allow behavior by category", async () => {
  const hidden = await readJson(
    "hidden/dra-semantic-recovery-admission-v1.json",
  );
  const preWrite = hidden.expectations.find(
    (row) => row.id === "balanced-writeback",
  );
  assert.equal(preWrite.exact.write_action, "apply");
  assert.equal(preWrite.exact.handoff_ready, false);
  const casConflict = hidden.expectations.find(
    (row) => row.id === "cas-third-digest",
  );
  assert.equal(casConflict.exact.write_action, "block");
  assert.equal("checkpoint" in casConflict.exact, false);
  assert.equal("checkpoint" in (casConflict.allowed ?? {}), false);
  assert.equal(
    hidden.expectations.find((row) => row.id === "bounded-motion-delegation")
      .exact.checkpoint,
    "create",
  );
  assert.deepEqual(preWrite.allowed.checkpoint, ["create", "retain"]);
  const passing = { case_results: hidden.expectations.map(draPassingRow) };
  const score = scoreAdmissionInvocation(
    "dra-semantic-recovery",
    "quality",
    passing,
    trace,
    hidden,
  );
  assert.equal(score.targeted_defects, 0);
  assert.equal(score.must_allow_false_blocking, 0);

  const circular = structuredClone(passing);
  const suggestion = circular.case_results.find(
    (row) => row.id === "selected-provider-business-suggestion",
  );
  suggestion.disposition = "allow";
  suggestion.accepted_keys = ["auth.biometric"];
  suggestion.unresolved_keys = [];
  suggestion.authority_rows[0].decision_authority = "selected-resource";
  suggestion.authority_rows[0].status = "accepted";
  const failed = scoreAdmissionInvocation(
    "dra-semantic-recovery",
    "quality",
    circular,
    trace,
    hidden,
  );
  assert.equal(failed.critical_categories["delegated-choice-validity"], 1);
  assert.equal(failed.targeted_defects, 1);

  const simple = scoreAdmissionInvocation(
    "dra-semantic-recovery",
    "simple",
    {
      create_checkpoint: false,
      persisted_recovery_bytes: 0,
      user_pause: false,
      additional_provider_generation: false,
      formal_handoff_preflight: false,
      proposal_writeback: false,
      helper_write_transaction: false,
      scope_expansion: [],
      tool_actions: [],
    },
    trace,
    {},
  );
  assert.equal(simple.hard_gate_passed, true);
});

test("Build Reuse Buy scoring permits valid solution sets without a unique library answer", async () => {
  const hidden = await readJson("hidden/build-reuse-buy-admission-v1.json");
  const passing = { case_results: hidden.expectations.map(buildPassingRow) };
  const score = scoreAdmissionInvocation(
    "build-reuse-buy",
    "quality",
    passing,
    trace,
    hidden,
  );
  assert.equal(score.targeted_defects, 0);
  assert.equal(score.must_allow_false_blocking, 0);
  const multi = passing.case_results.find(
    (row) => row.id === "multiple-valid-solutions",
  );
  assert.ok(multi.allowed_solution_set.length >= 3);

  const forced = structuredClone(passing);
  const noAbstraction = forced.case_results.find(
    (row) => row.id === "similar-shape-different-semantics",
  );
  noAbstraction.decision = "block";
  noAbstraction.selected_solution = "none";
  const failed = scoreAdmissionInvocation(
    "build-reuse-buy",
    "quality",
    forced,
    trace,
    hidden,
  );
  assert.equal(failed.must_allow_false_blocking, 1);
});

test("pair aggregation enforces 3-to-5 expansion, wins and per-category thresholds", async () => {
  const { config } = await loadAdmissionConfig();
  const track = config.tracks["build-reuse-buy"];
  const deterministic = {
    global_execution_envelope_sha256: "global-frozen",
    track_config_sha256: { "build-reuse-buy": "track-frozen" },
    tracks: { "build-reuse-buy": { passed: true } },
  };
  const base = [1, 2, 3].map((replicate) => syntheticPair(replicate));
  const accepted = aggregateAdmissionPairs(
    "build-reuse-buy",
    base,
    track,
    deterministic,
  );
  assert.equal(accepted.required_pairs, 3);
  assert.equal(accepted.pairwise_wins, 3);
  assert.equal(accepted.targeted_defect_reduction, 0.5);
  assert.equal(accepted.decision, "ADMISSION_THRESHOLDS_MET");

  const completedExpansion = [1, 2, 3, 4, 5].map((replicate) =>
    syntheticPair(replicate),
  );
  const completed = aggregateAdmissionPairs(
    "build-reuse-buy",
    completedExpansion,
    track,
    deterministic,
  );
  assert.equal(completed.required_pairs, 5);
  assert.equal(completed.pairwise_wins_required, 3);
  assert.deepEqual(completed.expansion_reasons, ["expanded-sample-set"]);
  assert.equal(completed.decision, "ADMISSION_THRESHOLDS_MET");

  const highVariance = structuredClone(base);
  highVariance[2].candidate.quality.wall_ms = 220;
  assert.equal(
    aggregateAdmissionPairs(
      "build-reuse-buy",
      highVariance,
      track,
      deterministic,
    ).required_pairs,
    5,
  );

  const near = structuredClone(base);
  for (const pair of near) {
    pair.quality.candidate_targeted_defects = 3;
    pair.quality.targeted_defect_delta = 1;
  }
  assert.equal(
    aggregateAdmissionPairs("build-reuse-buy", near, track, deterministic)
      .required_pairs,
    5,
  );

  const doubtful = structuredClone(base);
  doubtful[2].environment_doubt = true;
  const expanded = aggregateAdmissionPairs(
    "build-reuse-buy",
    doubtful,
    track,
    deterministic,
  );
  assert.equal(expanded.required_pairs, 5);
  assert.match(expanded.expansion_reasons.join(" "), /trace-doubt/u);

  const fiveDoubtful = structuredClone(completedExpansion);
  fiveDoubtful[2].environment_doubt = true;
  fiveDoubtful[2].provenance_doubt_reasons = ["reasoning_effort:unverified"];
  const qualified = aggregateAdmissionPairs(
    "build-reuse-buy",
    fiveDoubtful,
    track,
    deterministic,
  );
  assert.equal(
    qualified.decision,
    "ADMISSION_THRESHOLDS_MET_WITH_PROVENANCE_QUALIFICATION",
  );
  assert.equal(qualified.eligible_pair_count, 5);
  assert.equal(qualified.provenance_qualification.status, "unverified");
  assert.deepEqual(qualified.provenance_qualification.doubt_reasons, [
    "reasoning_effort:unverified",
  ]);
});

test("DRA simple-path cost comparison stratifies AB/BA invocation position", async () => {
  const { config } = await loadAdmissionConfig();
  const track = config.tracks["dra-semantic-recovery"];
  const reports = [1, 2, 3, 4, 5].map((replicate) => {
    const pair = syntheticPair(replicate);
    pair.track = "dra-semantic-recovery";
    pair.environment_doubt = true;
    pair.provenance_doubt_reasons = ["model:unverified"];
    const invocationOrder =
      replicate % 2 === 1
        ? ["candidate", "baseline"]
        : ["baseline", "candidate"];
    const cost = (variant) =>
      invocationOrder.indexOf(variant) === 0 ? 2000 : 1000;
    pair.simple_path = {
      invocation_order: invocationOrder,
      baseline_hard_gate_passed: true,
      candidate_hard_gate_passed: true,
      baseline_tokens: cost("baseline"),
      candidate_tokens: cost("candidate"),
      token_overhead: cost("candidate") / cost("baseline") - 1,
      baseline_wall_ms: cost("baseline"),
      candidate_wall_ms: cost("candidate"),
      wall_overhead: cost("candidate") / cost("baseline") - 1,
      baseline_tool_calls: 0,
      candidate_tool_calls: 0,
    };
    return pair;
  });
  const aggregate = aggregateAdmissionPairs(
    "dra-semantic-recovery",
    reports,
    track,
    {
      global_execution_envelope_sha256: "global-frozen",
      track_config_sha256: { "dra-semantic-recovery": "track-frozen" },
      tracks: { "dra-semantic-recovery": { passed: true } },
    },
  );
  assert.equal(aggregate.required_pairs, 5);
  assert.equal(aggregate.simple_path.raw_pair_median_token_overhead, 1);
  assert.equal(aggregate.simple_path.median_token_overhead, 0);
  assert.equal(aggregate.simple_path.median_wall_overhead, 0);
  assert.deepEqual(
    aggregate.simple_path.position_strata.map((row) => [
      row.position,
      row.baseline_count,
      row.candidate_count,
    ]),
    [
      [1, 2, 3],
      [2, 3, 2],
    ],
  );
  assert.equal(
    aggregate.decision,
    "ADMISSION_THRESHOLDS_MET_WITH_PROVENANCE_QUALIFICATION",
  );
});

test("execution provenance never copies requested values into effective observations", () => {
  const requested = {
    model: "gpt-5.6-terra",
    reasoning_effort: "medium",
    provider: "openai",
  };
  const unverified = parseAdmissionEvents(eventTrace(), requested);
  assert.equal(unverified.environment_doubt, true);
  assert.equal(unverified.effective_execution.model.status, "unverified");
  assert.equal(unverified.effective_execution.model.value, null);

  const verified = parseAdmissionEvents(
    eventTrace({
      model: requested.model,
      reasoning_effort: requested.reasoning_effort,
      model_provider: requested.provider,
    }),
    requested,
  );
  assert.equal(verified.environment_doubt, false);
  assert.equal(verified.effective_execution.model.status, "verified");
  assert.equal(
    verified.effective_execution.reasoning_effort.status,
    "verified",
  );
  assert.equal(verified.effective_execution.provider.status, "verified");

  const mismatch = parseAdmissionEvents(
    eventTrace({ ...requested, model: "different-model" }),
    requested,
  );
  assert.equal(mismatch.environment_doubt, true);
  assert.equal(mismatch.effective_execution.model.status, "mismatch");
});

test("sanitized admission attestation binds the exact clean main tree and result digests", () => {
  const candidate = {
    branch: "main",
    commit: "1".repeat(40),
    tree: "2".repeat(40),
    main_commit: "1".repeat(40),
    working_tree_clean: true,
  };
  const aggregate = (track) => ({
    path: `run/${track}/aggregate-report.json`,
    sha256: track === "dra-semantic-recovery" ? "a".repeat(64) : "b".repeat(64),
    value: {
      global_execution_envelope_sha256: "global-frozen",
      track_config_sha256: `${track}-frozen`,
      candidate_git: candidate,
      track,
      decision: "ADMISSION_THRESHOLDS_MET_WITH_PROVENANCE_QUALIFICATION",
      pair_count: 5,
      required_pairs: 5,
      pairwise_wins: 5,
      pairwise_wins_required: 3,
      targeted_defect_reduction: 0.5,
      critical_category_regressions: [],
      candidate_must_allow_false_blocking: 0,
      candidate_other_false_blocking: 0,
      simple_path: track === "dra-semantic-recovery" ? {} : null,
      provenance_qualification: {
        status: "unverified",
        doubtful_pair_count: 5,
        doubt_reasons: ["model:unverified"],
      },
      reports: [
        {
          baseline: {
            quality: { trace_identity: `${track}-baseline-quality` },
            ...(track === "dra-semantic-recovery"
              ? { simple: { trace_identity: `${track}-baseline-simple` } }
              : {}),
          },
          candidate: {
            quality: { trace_identity: `${track}-candidate-quality` },
            ...(track === "dra-semantic-recovery"
              ? { simple: { trace_identity: `${track}-candidate-simple` } }
              : {}),
          },
        },
      ],
    },
  });
  const deterministic = {
    path: "run/deterministic/deterministic-report.json",
    sha256: "d".repeat(64),
    value: {
      global_execution_envelope_sha256: "global-frozen",
      track_config_sha256: {
        "dra-semantic-recovery": "dra-semantic-recovery-frozen",
        "build-reuse-buy": "build-reuse-buy-frozen",
      },
      candidate_git: candidate,
      tracks: {
        "dra-semantic-recovery": { passed: true },
        "build-reuse-buy": { passed: true },
      },
    },
  };
  const trackConfigSha = {
    "dra-semantic-recovery": "dra-semantic-recovery-frozen",
    "build-reuse-buy": "build-reuse-buy-frozen",
  };
  const manifest = buildAdmissionAttestation({
    globalExecutionEnvelopeSha: "global-frozen",
    trackConfigSha,
    deterministic,
    aggregates: [
      aggregate("dra-semantic-recovery"),
      aggregate("build-reuse-buy"),
    ],
    candidate,
    expectedTracks: ["dra-semantic-recovery", "build-reuse-buy"],
  });
  assert.equal(manifest.sensitive_raw_content_included, false);
  assert.equal(manifest.candidate_git.tree, "2".repeat(40));
  assert.equal(manifest.tracks.length, 2);
  assert.equal(
    manifest.tracks.every(
      (track) => track.evidence_applicability === "current-candidate",
    ),
    true,
  );
  assert.equal(Object.hasOwn(manifest, "prompts"), false);
  assert.equal(Object.hasOwn(manifest, "model_output"), false);
  assert.equal(Object.hasOwn(manifest, "raw_events"), false);

  const reusedBuild = aggregate("build-reuse-buy");
  reusedBuild.value.candidate_git = {
    branch: "main",
    commit: "3".repeat(40),
    tree: "4".repeat(40),
    main_commit: "3".repeat(40),
    working_tree_clean: true,
  };
  const reused = buildAdmissionAttestation({
    globalExecutionEnvelopeSha: "global-frozen",
    trackConfigSha,
    deterministic,
    aggregates: [aggregate("dra-semantic-recovery"), reusedBuild],
    candidate,
    expectedTracks: ["dra-semantic-recovery", "build-reuse-buy"],
  });
  assert.equal(
    reused.tracks.find((track) => track.track === "build-reuse-buy")
      .evidence_applicability,
    "track-identity-reused",
  );

  const mismatchedBuild = aggregate("build-reuse-buy");
  mismatchedBuild.value.track_config_sha256 = "different";
  assert.throws(
    () =>
      buildAdmissionAttestation({
        globalExecutionEnvelopeSha: "global-frozen",
        trackConfigSha,
        deterministic,
        aggregates: [aggregate("dra-semantic-recovery"), mismatchedBuild],
        candidate,
        expectedTracks: ["dra-semantic-recovery", "build-reuse-buy"],
      }),
    /aggregate_track_mismatch/u,
  );

  assert.throws(
    () =>
      buildAdmissionAttestation({
        globalExecutionEnvelopeSha: "global-frozen",
        trackConfigSha,
        deterministic,
        aggregates: [
          aggregate("dra-semantic-recovery"),
          aggregate("build-reuse-buy"),
        ],
        candidate: {
          branch: "main",
          commit: "1".repeat(40),
          tree: "2".repeat(40),
          main_commit: "1".repeat(40),
          working_tree_clean: false,
        },
        expectedTracks: ["dra-semantic-recovery", "build-reuse-buy"],
      }),
    /exact_main_required/u,
  );
});

test("sanitized CI evidence materializes only exact-tree reports and rejects raw content", async () => {
  const candidate = {
    branch: "main",
    commit: "1".repeat(40),
    tree: "2".repeat(40),
    main_commit: "1".repeat(40),
    working_tree_clean: true,
  };
  const globalSha = "a".repeat(64);
  const trackConfigSha = {
    "dra-semantic-recovery": "b".repeat(64),
    "build-reuse-buy": "c".repeat(64),
  };
  const pairRecords = Object.keys(trackConfigSha).map((track) =>
    jsonRecord(
      {
        schema_version: "tiny-context-fresh-agent-pair-v3",
        global_execution_envelope_sha256: globalSha,
        track_config_sha256: trackConfigSha[track],
        track,
        pair_id: "pair-1",
        replicate: 1,
        candidate_git: candidate,
        baseline: {
          quality: {
            score: {
              targeted_defects: 2,
              findings: [{ id: "raw-detail", diagnostic: "not published" }],
            },
            trace_identity: "d".repeat(64),
          },
        },
        candidate: {
          quality: {
            score: { targeted_defects: 1, findings: [] },
            trace_identity: "e".repeat(64),
          },
        },
      },
      `${track}/pair-1.json`,
    ),
  );
  const aggregateRecords = pairRecords.map((pair) =>
    jsonRecord(
      {
        schema_version: "tiny-context-fresh-agent-aggregate-v3",
        global_execution_envelope_sha256: globalSha,
        track_config_sha256: pair.value.track_config_sha256,
        track: pair.value.track,
        candidate_git: candidate,
        pair_count: 1,
        reports: [pair.value],
      },
      `${pair.value.track}/aggregate.json`,
    ),
  );
  const deterministic = jsonRecord(
    {
      schema_version: "tiny-context-admission-deterministic-v2",
      global_execution_envelope_sha256: globalSha,
      track_config_sha256: trackConfigSha,
      candidate_git: candidate,
      tracks: Object.fromEntries(
        Object.keys(trackConfigSha).map((track) => [track, { passed: true }]),
      ),
    },
    "deterministic.json",
  );
  const attestation = jsonRecord(
    {
      schema_version: "tiny-context-admission-attestation-v2",
      sensitive_raw_content_included: false,
      global_execution_envelope_sha256: globalSha,
      track_config_sha256: trackConfigSha,
      candidate_git: candidate,
      deterministic: { artifact_sha256: deterministic.sha256, passed: true },
      tracks: aggregateRecords.map((aggregate) => ({
        track: aggregate.value.track,
        track_config_sha256: aggregate.value.track_config_sha256,
        artifact_sha256: aggregate.sha256,
        evidence_candidate_git: candidate,
      })),
    },
    "attestation.json",
  );
  const payload = buildAdmissionEvidencePayload({
    deterministic,
    pairs: pairRecords,
    aggregates: aggregateRecords,
    attestation,
    candidate,
  });
  const encoded = encodeAdmissionEvidencePayload(payload);
  assert.ok(encoded.length < 60_000);
  const temporary = await mkdtemp(
    path.join(os.tmpdir(), "admission-evidence-"),
  );
  try {
    const output = path.join(temporary, "bundle");
    const materialized = await materializeAdmissionEvidencePayload({
      encoded,
      outputDirectory: output,
      expectedCommit: candidate.commit,
      expectedTree: candidate.tree,
    });
    assert.equal(materialized.file_count, payload.files.length);
    const manifest = JSON.parse(
      await readFile(
        path.join(output, "admission-evidence-manifest.json"),
        "utf8",
      ),
    );
    assert.equal(manifest.retention_days, 30);
    assert.equal(manifest.authority, "none");
    assert.equal(manifest.acceptance_result, false);
    const pair = JSON.parse(
      await readFile(
        path.join(
          output,
          "tracks",
          "dra-semantic-recovery",
          "pairs",
          "pair-1.json",
        ),
        "utf8",
      ),
    );
    assert.equal(
      pair.schema_version,
      "tiny-context-admission-sanitized-pair-v1",
    );
    assert.equal(pair.source_artifact_sha256, pairRecords[0].sha256);
    assert.equal(pair.baseline.quality.score.targeted_defects, 2);
    assert.equal("findings" in pair.baseline.quality.score, false);
    const aggregate = JSON.parse(
      await readFile(
        path.join(
          output,
          "tracks",
          "dra-semantic-recovery",
          "aggregate-report.json",
        ),
        "utf8",
      ),
    );
    assert.equal(
      aggregate.schema_version,
      "tiny-context-admission-sanitized-aggregate-v1",
    );
    assert.equal(aggregate.source_artifact_sha256, aggregateRecords[0].sha256);
    assert.equal("reports" in aggregate, false);
    assert.deepEqual(aggregate.pair_records, [
      {
        pair_id: "pair-1",
        replicate: 1,
        source_artifact_sha256: pairRecords[0].sha256,
      },
    ]);
    const workflow = await readFile(
      path.join(repo, ".github", "workflows", "admission-evidence.yml"),
      "utf8",
    );
    assert.match(workflow, /github\.ref == 'refs\/heads\/main'/u);
    assert.match(workflow, /admission-evidence\.mjs/u);
    assert.match(workflow, /retention-days:\s*30/u);
    assert.match(workflow, /mechanism-admission-evidence\/\*\*\/\*\.json/u);
    assert.doesNotMatch(workflow, /events\.jsonl|stderr\.txt|result\.json/u);

    await assert.rejects(
      materializeAdmissionEvidencePayload({
        encoded,
        outputDirectory: path.join(temporary, "wrong-tree"),
        expectedCommit: candidate.commit,
        expectedTree: "3".repeat(40),
      }),
      /exact_candidate_mismatch/u,
    );

    const rawPair = jsonRecord(
      { ...pairRecords[0].value, prompt: "forbidden raw prompt" },
      pairRecords[0].path,
    );
    assert.throws(
      () =>
        buildAdmissionEvidencePayload({
          deterministic,
          pairs: [rawPair, pairRecords[1]],
          aggregates: aggregateRecords,
          attestation,
          candidate,
        }),
      /forbidden_raw_key|pair_aggregate_mismatch/u,
    );
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
});

function eventTrace(metadata = {}) {
  return [
    { type: "thread.started", thread_id: "thread", ...metadata },
    {
      type: "item.completed",
      item: { id: "message", type: "agent_message", text: "{}" },
    },
    {
      type: "turn.completed",
      usage: {
        input_tokens: 1,
        cached_input_tokens: 0,
        output_tokens: 1,
        reasoning_output_tokens: 1,
      },
    },
  ]
    .map((event) => JSON.stringify(event))
    .join("\n");
}

function jsonRecord(value, recordPath) {
  const bytes = Buffer.from(`${JSON.stringify(value, null, 2)}\n`, "utf8");
  return {
    path: recordPath,
    bytes,
    sha256: sha256(bytes),
    value,
  };
}
