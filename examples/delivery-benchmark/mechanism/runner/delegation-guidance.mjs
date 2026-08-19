import path from "node:path";
import { parseAndValidateLongTaskCodexAgentProfile } from "../../../../packages/ty-context/dist/lib/long-task-codex-agent-profile.js";
import {
  decodeUtf8,
  digest,
  readGitBlob,
  readRegularContained,
  readTrackedRegularContained,
  writeVerified,
} from "./delegation-guidance-io.mjs";
import { validateDelegationManifest } from "./delegation-guidance-manifest.mjs";
import { validateDelegationTrackPolicySource } from "./delegation-admission-policy.mjs";
import { MECHANISM_ROOT, REPO_ROOT } from "./shared.mjs";

export const DELEGATION_GUIDANCE_VARIANTS = new Set([
  "long-task-delegation-conditional",
  "long-task-delegation-positive-default",
]);

const BUNDLE_RELATIVE =
  "examples/delivery-benchmark/mechanism/guidance/long-task-delegation-v1";
const BUNDLE_ROOT = path.join(
  MECHANISM_ROOT,
  "guidance",
  "long-task-delegation-v1",
);
const MANAGED_BEGIN = "<!-- ty-context:managed:begin -->";
const MANAGED_END = "<!-- ty-context:managed:end -->";
const RUN_TARGETS = {
  implementation_profile: ".codex/agents/long-task-implementation.toml",
  workflow_skill: ".codex/skills/long-task-workflow/SKILL.md",
  workflow_metadata: ".codex/skills/long-task-workflow/agents/openai.yaml",
};

export async function applyDelegationGuidance(runDir, variant, options = {}) {
  if (options.calibration)
    throw new Error("delegation_guidance_requires_formal_harness_init");
  const resolved = await resolveDelegationGuidance(variant, options);
  const admissionPolicy = validateDelegationTrackPolicySource(
    options.trackConfig,
    resolved.manifest,
    BUNDLE_RELATIVE,
  );
  const agentsPath = path.join(runDir, "AGENTS.md");
  const agents = decodeUtf8(
    await readRegularContained(runDir, agentsPath),
    "run AGENTS.md",
  );
  const core = decodeUtf8(resolved.files.get("agents_core"), "agents_core");
  const renderedAgents = replaceManagedProtocol(agents, core);
  await writeVerified(agentsPath, Buffer.from(renderedAgents), runDir);

  for (const [role, relative] of Object.entries(RUN_TARGETS)) {
    const destination = path.join(runDir, ...relative.split("/"));
    await writeVerified(destination, resolved.files.get(role), runDir);
  }
  return {
    workflow_instruction_bytes: resolved.records.reduce(
      (total, item) => total + item.byte_length,
      0,
    ),
    workflow_guidance_source: delegationWorkflowGuidanceSource(resolved),
    delegation_admission_policy: admissionPolicy,
    delegation_admission_policy_sha256:
      resolved.manifest.admission_policy_sha256,
  };
}

export function delegationWorkflowGuidanceSource(resolved) {
  const profile = resolved.records.find(
    (item) => item.role === "implementation_profile",
  );
  return {
    kind: "long_task_delegation_bundle_v1",
    variant_role: resolved.role,
    baseline_commit: resolved.manifest.baseline_commit,
    content_bundle_sha256: resolved.contentDigest,
    candidate_promotion_content_bundle_sha256:
      resolved.manifest.candidate_content_bundle_sha256,
    guidance_provenance_sha256: resolved.manifest.guidance_provenance_sha256,
    profile_content_sha256: profile.content_sha256,
    profile_expectation: resolved.profileExpectation,
    hook_content_sha256: resolved.hookContentSha256,
    records: resolved.records,
  };
}

export async function resolveDelegationGuidance(variant, options = {}) {
  if (!DELEGATION_GUIDANCE_VARIANTS.has(variant))
    throw new Error(`not a delegation guidance variant: ${variant}`);
  const repoRoot = options.repoRoot ?? REPO_ROOT;
  const bundleRoot =
    options.bundleRoot ??
    (path.resolve(repoRoot) === path.resolve(REPO_ROOT)
      ? BUNDLE_ROOT
      : path.join(repoRoot, ...BUNDLE_RELATIVE.split("/")));
  const manifest = JSON.parse(
    decodeUtf8(
      await readTrackedRegularContained(
        repoRoot,
        path.relative(repoRoot, path.join(bundleRoot, "manifest.json")),
      ),
      "delegation manifest",
    ),
  );
  validateDelegationManifest(manifest, repoRoot, BUNDLE_RELATIVE);
  const candidateFiles = await readDelegationCandidateBundle(
    manifest,
    repoRoot,
  );
  const role = manifest.variants[variant];
  const files = new Map();
  const records = [];
  for (const entry of manifest.entries) {
    const source = entry[role];
    const bytes =
      role === "baseline"
        ? readGitBlob(repoRoot, source)
        : candidateFiles.get(entry.role);
    decodeUtf8(bytes, `${role}:${entry.role}`);
    assertBytes(source, bytes, `${role}:${entry.role}`);
    files.set(entry.role, bytes);
    records.push(recordFor(entry, bytes));
  }
  const profileExpectation = await validateSelectedGuidance(
    role,
    files,
    repoRoot,
  );
  const hookContentSha256 = digest(
    await readRegularContained(
      repoRoot,
      path.join(repoRoot, "packages/ty-context/dist/long-task-hook.js"),
    ),
  );
  const contentDigest = digest(JSON.stringify(records));
  const expected = manifest[`${role}_content_bundle_sha256`];
  if (contentDigest !== expected)
    throw new Error(`${role}_content_bundle_digest_mismatch`);
  const resolved = {
    manifest,
    role,
    files,
    records,
    contentDigest,
    hookContentSha256,
    profileExpectation,
  };
  if (Object.hasOwn(options, "variantConfig"))
    validateVariantGuidanceSource(options.variantConfig, variant, resolved);
  return resolved;
}

export async function readDelegationCandidateBundle(manifest, repoRoot) {
  const files = new Map();
  for (const entry of manifest.entries ?? []) {
    const source = entry.candidate;
    const bytes = await readTrackedRegularContained(repoRoot, source.path);
    decodeUtf8(bytes, `candidate:${entry.role}`);
    assertBytes(source, bytes, `candidate:${entry.role}`);
    files.set(entry.role, bytes);
  }
  return files;
}

export async function inspectDelegationPromotion(options = {}) {
  const repoRoot = options.repoRoot ?? REPO_ROOT;
  const manifest = (
    await resolveDelegationGuidance(
      "long-task-delegation-positive-default",
      options,
    )
  ).manifest;
  const records = [];
  for (const entry of manifest.entries) {
    const bytes = await readRegularContained(
      repoRoot,
      path.join(repoRoot, ...entry.promotion_target.split("/")),
    );
    records.push(recordFor(entry, bytes));
  }
  const actual = digest(JSON.stringify(records));
  const state = delegationPromotionState(actual, manifest);
  return {
    state,
    promoted: state === "candidate",
    baseline_current: state === "baseline",
    actual_content_bundle_sha256: actual,
    baseline_content_bundle_sha256: manifest.baseline_content_bundle_sha256,
    candidate_content_bundle_sha256: manifest.candidate_content_bundle_sha256,
    required_content_bundle_sha256: manifest.guidance_content_bundle_sha256,
    records,
  };
}

export function delegationPromotionState(actual, manifest) {
  return actual === manifest.baseline_content_bundle_sha256
    ? "baseline"
    : actual === manifest.candidate_content_bundle_sha256
      ? "candidate"
      : "drift";
}

async function validateSelectedGuidance(role, files, repoRoot) {
  const profileText = decodeUtf8(
    files.get("implementation_profile"),
    "implementation_profile",
  );
  const profile = parseAndValidateLongTaskCodexAgentProfile(profileText);
  const packageProfile = await readRegularContained(
    repoRoot,
    path.join(
      repoRoot,
      "packages/ty-context/assets/agents/long-task-implementation.toml",
    ),
  );
  if (
    !profile.valid ||
    /^service_tier\s*=/mu.test(profileText) ||
    !files.get("implementation_profile").equals(packageProfile)
  )
    throw new Error(`${role}_profile_expectation_mismatch`);
  const expected = {
    agent_type: profile.profile.name,
    model: profile.profile.model,
    model_reasoning_effort: profile.profile.model_reasoning_effort,
    child_agents_enabled: profile.profile.agents.enabled,
    service_tier_override: false,
    unobservable_tier_status: "service_tier_inheritance_unverified",
  };
  const skill = decodeUtf8(files.get("workflow_skill"), "workflow_skill");
  if (role === "candidate") {
    for (const phrase of [
      "must create multiple exact workers",
      "insufficient qualifying packets",
      "unavailable exact profile",
      "insufficient capacity",
      "owner/path conflict",
      "coordination cost exceeding benefit",
      "service_tier_inheritance_unverified",
      "must not revert other edits",
    ])
      if (!skill.includes(phrase))
        throw new Error(`candidate_policy_phrase_missing:${phrase}`);
  } else if (skill.includes("must create multiple exact workers"))
    throw new Error("baseline_contains_candidate_must_delegate_rule");
  return expected;
}

function replaceManagedProtocol(agents, core) {
  const begin = agents.indexOf(MANAGED_BEGIN);
  const end = agents.indexOf(MANAGED_END);
  if (begin < 0 || end < begin || agents.indexOf(MANAGED_BEGIN, begin + 1) >= 0)
    throw new Error("managed_protocol_markers_invalid");
  return `${agents.slice(0, begin + MANAGED_BEGIN.length)}\n${core.trim()}\n${agents.slice(end)}`;
}

function recordFor(entry, bytes) {
  return {
    role: entry.role,
    promotion_target: entry.promotion_target,
    byte_length: bytes.length,
    content_sha256: digest(bytes),
  };
}

function assertBytes(source, bytes, label) {
  if (
    bytes.length !== source.byte_length ||
    digest(bytes) !== source.content_sha256
  )
    throw new Error(`${label}_bytes_mismatch`);
}

function validateVariantGuidanceSource(variantConfig, variant, resolved) {
  const source = variantConfig?.guidance_source;
  const exactSourceKeys =
    source &&
    JSON.stringify(Object.keys(source).sort()) ===
      JSON.stringify(["content_bundle_sha256", "kind", "manifest"]);
  if (
    variantConfig?.role !== resolved.role ||
    variantConfig?.track !== "long-task-delegation" ||
    !exactSourceKeys ||
    source.kind !== "long_task_delegation_bundle_v1" ||
    source.manifest !== `${BUNDLE_RELATIVE}/manifest.json` ||
    source.content_bundle_sha256 !== resolved.contentDigest ||
    resolved.manifest.variants[variant] !== resolved.role
  )
    throw new Error("delegation_variant_guidance_source_mismatch");
}
