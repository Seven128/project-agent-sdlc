import { digest } from "./delegation-guidance-io.mjs";
import { validateDelegationAdmissionPolicy } from "./delegation-admission-policy.mjs";
import {
  DELEGATION_QUALIFYING_PREDICATE_IDS,
  DELEGATION_MINIMUM_QUALIFYING_PACKETS,
  DELEGATION_SOLO_REASON_IDS,
} from "./delegation-policy-evaluation.mjs";
import {
  assertManifestExact,
  failDelegationManifest,
  manifestProvenanceProjection,
  validateDelegationManifestSources,
} from "./delegation-guidance-manifest-source.mjs";

const WORKER_BOUNDS = [
  "qualifying_packet_count",
  "current_host_capacity",
  "owner_path_conflicts",
];
const PARENT_OWNED = [
  "source",
  "contract",
  "authority",
  "architecture",
  "context",
  "packet_selection",
  "integration",
  "current_candidate_checks",
  "formal_verification",
  "final_gate",
  "close",
  "completion",
];
export function validateDelegationManifest(manifest, repoRoot, bundleRelative) {
  const { profile, baselineRecords, candidateRecords } =
    validateDelegationManifestSources(manifest, repoRoot, bundleRelative);
  if (
    profile.candidate.byte_length !== profile.baseline.byte_length ||
    profile.candidate.content_sha256 !== profile.baseline.content_sha256
  )
    failDelegationManifest("candidate_profile_package_parity");
  if (
    digest(JSON.stringify(baselineRecords)) !==
    manifest.baseline_content_bundle_sha256
  )
    failDelegationManifest("baseline_content_bundle_digest");
  if (
    digest(JSON.stringify(candidateRecords)) !==
    manifest.candidate_content_bundle_sha256
  )
    failDelegationManifest("candidate_content_bundle_digest");
  if (
    manifest.baseline_content_bundle_sha256 ===
    manifest.candidate_content_bundle_sha256
  )
    failDelegationManifest("content_bundle_variants_not_distinct");

  const policy = manifest.delegation_policy;
  if (
    policy?.minimum_qualifying_packets !==
    DELEGATION_MINIMUM_QUALIFYING_PACKETS
  )
    failDelegationManifest("minimum_qualifying_packets");
  assertManifestExact(
    policy?.qualifying_predicates,
    DELEGATION_QUALIFYING_PREDICATE_IDS,
    "predicate_set",
  );
  assertManifestExact(
    policy?.solo_reason_ids,
    DELEGATION_SOLO_REASON_IDS,
    "solo_reason_set",
  );
  if (policy?.fixed_worker_count !== null)
    failDelegationManifest("fixed_worker_count");
  assertManifestExact(policy?.worker_count_bounds, WORKER_BOUNDS, "worker_bounds");
  assertManifestExact(policy?.parent_owned, PARENT_OWNED, "parent_ownership");
  validateDelegationAdmissionPolicy(manifest);
  if (
    !sha256(manifest.baseline_content_bundle_sha256) ||
    !sha256(manifest.candidate_content_bundle_sha256) ||
    manifest.guidance_content_bundle_sha256 !==
      manifest.candidate_content_bundle_sha256
  )
    failDelegationManifest("content_digest");
  assertManifestExact(
    manifest.promotion,
    {
      status: "blocked_pending_paired_admission",
      required_content_bundle_sha256:
        manifest.candidate_content_bundle_sha256,
      copy_mode: "byte_for_byte_then_source_sync",
      canonical_behavior_before_promotion: "conditional_delegation",
      source_mapping_membership_before_promotion: false,
    },
    "promotion",
  );
  if (
    delegationProvenanceDigest(manifest) !==
    manifest.guidance_provenance_sha256
  )
    failDelegationManifest("provenance_digest");
}

export function delegationProvenanceDigest(manifest) {
  return digest(JSON.stringify(manifestProvenanceProjection(manifest)));
}

function sha256(value) {
  return /^[0-9a-f]{64}$/u.test(value ?? "");
}
