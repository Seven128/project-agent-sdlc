import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  delegationPromotionState,
  inspectDelegationPromotion,
  resolveDelegationGuidance,
} from "../../examples/delivery-benchmark/mechanism/runner/delegation-guidance.mjs";
import {
  delegationAdmissionPolicy,
  validateDelegationTrackPolicySource,
} from "../../examples/delivery-benchmark/mechanism/runner/delegation-admission-policy.mjs";
import { validateDelegationManifest } from "../../examples/delivery-benchmark/mechanism/runner/delegation-guidance-manifest.mjs";
import { validateDelegationBenchmarkInputs } from "../../examples/delivery-benchmark/mechanism/runner/delegation-benchmark-inputs.mjs";
import {
  delegationPairSourceIdentityMetrics,
  delegationSourceIdentityMetrics,
} from "../../examples/delivery-benchmark/mechanism/runner/delegation-source-identity.mjs";
import {
  assertFrozenDelegationCandidate,
} from "./helpers/long-task-delegation-benchmark-fixture.mjs";
import {
  verifyOwnedRunResetSafety,
  verifyRelabeledDelegationAggregateRejected,
  verifyTrackedFrozenInputBoundary,
} from "./helpers/long-task-delegation-boundary-fixture.mjs";
import {
  verifyDelegationComparisonBoundary,
  verifyDelegationRunInputFreshness,
} from "./helpers/long-task-delegation-comparison-fixture.mjs";
import {
  verifyFormalDelegationPrepare,
} from "./helpers/long-task-delegation-prepare-fixture.mjs";

const repoRoot = fileURLToPath(new URL("../..", import.meta.url));
const bundleRoot = path.join(
  repoRoot,
  "examples/delivery-benchmark/mechanism/guidance/long-task-delegation-v1",
);
const baselineCommit = "b83a9ee3836ff8fc8b7d4db9d29de2546df2a314";
const candidateDigest = "727ec5fd4b0c26ee8b8d288bad879d052dbc0cf1ec77b0882e22df137f0b9934";

test("delegation bundle freezes conditional A and exact positive-default B without promotion", async () => {
  const baseline = await resolveDelegationGuidance("long-task-delegation-conditional");
  const candidate = await resolveDelegationGuidance("long-task-delegation-positive-default");
  assert.equal(baseline.role, "baseline");
  assert.equal(candidate.role, "candidate");
  assert.equal(candidate.contentDigest, candidateDigest);
  assert.match(candidate.hookContentSha256, /^[0-9a-f]{64}$/u);
  assert.equal(candidate.records.length, 4);
  assertFrozenDelegationCandidate(candidate);
  const track = JSON.parse(
    await readFile(
      path.join(repoRoot, "examples/delivery-benchmark/mechanism/experiment-set.json"),
      "utf8",
    ),
  ).tracks["long-task-delegation"];
  assert.deepEqual(track.admission_policy_source, {
    kind: "delegation_guidance_manifest_v1",
    manifest:
      "examples/delivery-benchmark/mechanism/guidance/long-task-delegation-v1/manifest.json",
    policy_sha256: candidate.manifest.admission_policy_sha256,
  });
  assert.deepEqual(
    delegationAdmissionPolicy(candidate.manifest).pair_policy,
    {
      minimum_pairs: 3,
      minimum_required_pairwise_wins: 2,
      high_variance_or_near_threshold_pairs: 5,
      expanded_required_pairwise_wins: 3,
      coefficient_of_variation_limit: 0.2,
      near_threshold_margin: 0.05,
      expand_on_inconsistent_direction: true,
      expand_on_host_provider_or_provenance_instability: true,
    },
  );

  const skill = candidate.files.get("workflow_skill").toString("utf8");
  const agents = candidate.files.get("agents_core").toString("utf8");
  const metadata = candidate.files.get("workflow_metadata").toString("utf8");
  const profile = candidate.files.get("implementation_profile").toString("utf8");
  assert.match(skill, /must create multiple exact workers/u);
  assert.match(skill, /must not revert other edits/u);
  assert.match(skill, /service_tier_inheritance_unverified/u);
  assert.match(agents, /must create multiple exact workers/u);
  assert.match(agents, /coordination cost exceeding benefit/u);
  assert.match(metadata, /create multiple exact workers/u);
  assert.match(metadata, /state one allowed solo reason/u);
  assert.match(metadata, /architecture/u);
  assert.match(metadata, /close and completion/u);
  assert.doesNotMatch(profile, /^service_tier\s*=/mu);
  assert.match(profile, /^model = "gpt-5\.6-luna"$/mu);
  assert.match(profile, /^model_reasoning_effort = "max"$/mu);
  assert.match(profile, /^enabled = false$/mu);

  const canonicalSkill = await readFile(
    path.join(repoRoot, ".codex/ty-context-managed/skills/long-task-workflow/SKILL.md"),
    "utf8",
  );
  const packagedSkill = await readFile(
    path.join(repoRoot, "packages/ty-context/assets/skills/long-task-workflow/SKILL.md"),
    "utf8",
  );
  assert.doesNotMatch(canonicalSkill, /must create multiple exact workers/u);
  assert.equal(packagedSkill, canonicalSkill);
  const mappings = await readFile(
    path.join(repoRoot, "packages/ty-context/source-mappings.yaml"),
    "utf8",
  );
  assert.doesNotMatch(mappings, /long-task-delegation-v1/u);
  const promotion = await inspectDelegationPromotion();
  assert.equal(promotion.state, "baseline");
  assert.equal(promotion.promoted, false);
  assert.deepEqual(promotion.records, baseline.records);
  assert.equal(
    delegationPromotionState(candidate.manifest.candidate_content_bundle_sha256, candidate.manifest),
    "candidate",
  );
  assert.equal(delegationPromotionState("0".repeat(64), candidate.manifest), "drift");
});

test("delegation benchmark inputs are byte-frozen before preparation", async () => {
  const experiments = JSON.parse(
    await readFile(
      path.join(repoRoot, "examples/delivery-benchmark/mechanism/experiment-set.json"),
      "utf8",
    ),
  );
  const track = experiments.tracks["long-task-delegation"];
  assert.deepEqual(
    await validateDelegationBenchmarkInputs(track.benchmark_inputs),
    track.benchmark_inputs,
  );
  const changed = structuredClone(track.benchmark_inputs);
  changed[1].sha256 = "0".repeat(64);
  await assert.rejects(
    validateDelegationBenchmarkInputs(changed),
    /delegation_benchmark_input_bytes_mismatch:gold/u,
  );
  const variant = structuredClone(
    experiments.variants["long-task-delegation-positive-default"],
  );
  variant.guidance_source.content_bundle_sha256 = "0".repeat(64);
  await assert.rejects(
    resolveDelegationGuidance("long-task-delegation-positive-default", {
      variantConfig: variant,
    }),
    /delegation_variant_guidance_source_mismatch/u,
  );
  const candidate = await resolveDelegationGuidance(
    "long-task-delegation-positive-default",
  );
  const driftedTrack = structuredClone(track);
  driftedTrack.admission_policy_source.policy_sha256 = "0".repeat(64);
  assert.throws(
    () =>
      validateDelegationTrackPolicySource(
        driftedTrack,
        candidate.manifest,
        "examples/delivery-benchmark/mechanism/guidance/long-task-delegation-v1",
      ),
    /delegation_manifest_track_admission_policy_source_invalid/u,
  );
});

test("delegation manifest rejects frozen identity and policy tampering", async () => {
  const manifest = JSON.parse(await readFile(path.join(bundleRoot, "manifest.json"), "utf8"));
  for (const [name, mutate, pattern] of [
    [
      "baseline tree",
      (value) => (value.baseline_tree = "0".repeat(40)),
      /delegation_manifest_baseline_tree_invalid/u,
    ],
    [
      "baseline byte identity",
      (value) => (value.entries[0].baseline.byte_length = 1),
      /delegation_manifest_baseline_source_bytes_invalid/u,
    ],
    [
      "baseline content bundle",
      (value) => (value.baseline_content_bundle_sha256 = "0".repeat(64)),
      /delegation_manifest_baseline_content_bundle_digest_invalid/u,
    ],
    [
      "same-length solo reason",
      (value) => (value.delegation_policy.solo_reason_ids[3] = "owner_or_path_conflicx"),
      /delegation_manifest_solo_reason_set_invalid/u,
    ],
    [
      "pair policy shape",
      (value) => (value.pair_policy.expanded_eligible_pairs = 2),
      /delegation_manifest_pair_policy_shape_invalid/u,
    ],
    [
      "pair policy digest",
      (value) => (value.pair_policy.expand_when_sample_cv_exceeds = 0.19),
      /delegation_manifest_admission_policy_digest_invalid/u,
    ],
    [
      "candidate profile parity",
      (value) => (value.entries[1].candidate.content_sha256 = "0".repeat(64)),
      /delegation_manifest_candidate_profile_package_parity_invalid/u,
    ],
    [
      "promotion digest",
      (value) => (value.promotion.required_content_bundle_sha256 = "0".repeat(64)),
      /delegation_manifest_promotion_invalid/u,
    ],
    [
      "unknown source field",
      (value) => (value.entries[0].candidate.untrusted = true),
      /delegation_manifest_source_fields_invalid/u,
    ],
  ]) {
    const changed = structuredClone(manifest);
    mutate(changed);
    assert.throws(
      () =>
        validateDelegationManifest(
          changed,
          repoRoot,
          "examples/delivery-benchmark/mechanism/guidance/long-task-delegation-v1",
        ),
      pattern,
      name,
    );
  }
});

test("formal prepare injects each frozen variant only into its isolated run", async () => {
  await verifyFormalDelegationPrepare(repoRoot, candidateDigest, baselineCommit);
});

test("mechanism prepare force-removes only an owned non-sensitive run", async () => {
  await verifyOwnedRunResetSafety(repoRoot);
});

test("delegation variants cannot bypass the admission boundary by relabeling their track", async () => {
  await verifyRelabeledDelegationAggregateRejected();
});

test("frozen delegation inputs must remain Git-index tracked", async () => {
  await verifyTrackedFrozenInputBoundary();
});

test("delegation source identity rejects dirty, stale, missing, and pair-mismatched candidates", async () => {
  const clean = {
    head_commit: "1".repeat(40),
    head_tree: "2".repeat(40),
    working_tree: { clean: true, digest: "3".repeat(64) },
  };
  assert.equal(
    (await delegationSourceIdentityMetrics(clean, { current: clean })).correct,
    true,
  );
  const dirty = structuredClone(clean);
  dirty.working_tree.clean = false;
  assert.equal(
    (await delegationSourceIdentityMetrics(clean, { current: dirty })).correct,
    false,
  );
  const stale = structuredClone(clean);
  stale.head_tree = "4".repeat(40);
  assert.equal(
    (await delegationSourceIdentityMetrics(clean, { current: stale })).correct,
    false,
  );
  assert.equal(
    (await delegationSourceIdentityMetrics(null, { current: clean })).correct,
    false,
  );
  assert.equal(delegationPairSourceIdentityMetrics(clean, stale, clean).correct, false);
});

test("delegation comparison requires stable benefit and expands unstable evidence from three to five", async () => {
  await verifyDelegationComparisonBoundary(bundleRoot);
  verifyDelegationRunInputFreshness();
});
