import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { aggregateAdmissionPairs } from "../../examples/delivery-benchmark/mechanism/runner/admission-aggregate.mjs";
import { buildAdmissionAttestation } from "../../examples/delivery-benchmark/mechanism/runner/admission-attestation.mjs";
import { parseAdmissionEvents } from "../../examples/delivery-benchmark/mechanism/runner/admission-execute.mjs";
import { scoreAdmissionInvocation } from "../../examples/delivery-benchmark/mechanism/runner/admission-score.mjs";
import {
  loadAdmissionConfig,
  resolveArtifactFile,
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
  const { config } = await loadAdmissionConfig();
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
      config_sha256: "frozen",
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
      config_sha256: "frozen",
      candidate_git: candidate,
      tracks: {
        "dra-semantic-recovery": { passed: true },
        "build-reuse-buy": { passed: true },
      },
    },
  };
  const manifest = buildAdmissionAttestation({
    configSha: "frozen",
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
  assert.equal(Object.hasOwn(manifest, "prompts"), false);
  assert.equal(Object.hasOwn(manifest, "model_output"), false);
  assert.equal(Object.hasOwn(manifest, "raw_events"), false);
  assert.throws(
    () =>
      buildAdmissionAttestation({
        configSha: "frozen",
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
