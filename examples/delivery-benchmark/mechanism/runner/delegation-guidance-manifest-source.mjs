import {
  digest,
  readGitBlob,
  readGitObjectId,
} from "./delegation-guidance-io.mjs";

const ENTRY_SPECS = [
  [
    "agents_core",
    ".codex/ty-context-managed/agents/AGENTS_CORE.md",
    "agents/AGENTS_CORE.md",
  ],
  [
    "implementation_profile",
    ".codex/ty-context-managed/agents/long-task-implementation.toml",
    "agents/long-task-implementation.toml",
  ],
  [
    "workflow_skill",
    ".codex/ty-context-managed/skills/long-task-workflow/SKILL.md",
    "skills/long-task-workflow/SKILL.md",
  ],
  [
    "workflow_metadata",
    ".codex/ty-context-managed/skills/long-task-workflow/agents/openai.yaml",
    "skills/long-task-workflow/agents/openai.yaml",
  ],
];
const ROOT_KEYS = [
  "schema_version",
  "candidate_id",
  "status",
  "baseline_commit",
  "baseline_tree",
  "variants",
  "entries",
  "baseline_content_bundle_sha256",
  "candidate_content_bundle_sha256",
  "guidance_content_bundle_sha256",
  "guidance_provenance_sha256",
  "delegation_policy",
  "pair_policy",
  "decision_thresholds",
  "admission_policy_sha256",
  "promotion",
];

export function validateDelegationManifestSources(
  manifest,
  repoRoot,
  bundleRelative,
) {
  exactKeys(manifest, ROOT_KEYS, "root_fields");
  if (
    manifest?.schema_version !==
      "tiny-context-long-task-delegation-guidance-v1" ||
    manifest.candidate_id !== "long-task-positive-default-v1" ||
    manifest.status !== "experimental_pending_admission"
  )
    failDelegationManifest("schema_or_status");
  if (!sha1(manifest.baseline_commit) || !sha1(manifest.baseline_tree))
    failDelegationManifest("baseline_identity");
  if (
    readGitObjectId(repoRoot, `${manifest.baseline_commit}^{tree}`) !==
    manifest.baseline_tree
  )
    failDelegationManifest("baseline_tree");
  assertManifestExact(
    manifest.variants,
    {
      "long-task-delegation-conditional": "baseline",
      "long-task-delegation-positive-default": "candidate",
    },
    "variants",
  );

  const entries = Array.isArray(manifest.entries) ? manifest.entries : [];
  if (entries.length !== ENTRY_SPECS.length)
    failDelegationManifest("target_set");
  entries.forEach((entry, index) => {
    exactKeys(
      entry,
      ["role", "promotion_target", "baseline", "candidate"],
      "entry_fields",
    );
    const [role, target, candidateSuffix] = ENTRY_SPECS[index] ?? [];
    if (entry?.role !== role || entry.promotion_target !== target)
      failDelegationManifest("target_set");
    validateSource(
      entry.baseline,
      { kind: "git_blob", commit: manifest.baseline_commit, path: target },
      repoRoot,
    );
    validateSource(
      entry.candidate,
      {
        kind: "tracked_file",
        path: `${bundleRelative}/${candidateSuffix}`,
      },
      repoRoot,
    );
  });
  return {
    entries,
    profile: entries.find(
      (entry) => entry.role === "implementation_profile",
    ),
    baselineRecords: entries.map((entry) => contentRecord(entry, "baseline")),
    candidateRecords: entries.map((entry) =>
      contentRecord(entry, "candidate"),
    ),
  };
}

export function manifestProvenanceProjection(manifest) {
  return {
    baseline_commit: manifest.baseline_commit,
    baseline_tree: manifest.baseline_tree,
    entries: manifest.entries.map((entry) => ({
      role: entry.role,
      baseline: pickSource(entry.baseline),
      candidate: pickSource(entry.candidate),
    })),
  };
}

export function assertManifestExact(actual, expected, label) {
  if (JSON.stringify(actual) !== JSON.stringify(expected))
    failDelegationManifest(label);
}

export function failDelegationManifest(label) {
  throw new Error(`delegation_manifest_${label}_invalid`);
}

function validateSource(source, expected, repoRoot) {
  exactKeys(
    source,
    source?.kind === "git_blob"
      ? [
          "kind",
          "commit",
          "path",
          "blob_oid",
          "byte_length",
          "content_sha256",
        ]
      : ["kind", "path", "byte_length", "content_sha256"],
    "source_fields",
  );
  if (
    source?.kind !== expected.kind ||
    source.path !== expected.path ||
    (expected.commit && source.commit !== expected.commit) ||
    !Number.isInteger(source.byte_length) ||
    source.byte_length <= 0 ||
    !sha256(source.content_sha256) ||
    (source.kind === "git_blob" && !sha1(source.blob_oid))
  )
    failDelegationManifest("source_identity");
  if (
    source.kind === "git_blob" &&
    readGitObjectId(repoRoot, `${source.commit}:${source.path}`) !==
      source.blob_oid
  )
    failDelegationManifest("source_blob");
  if (source.kind === "git_blob") {
    const bytes = readGitBlob(repoRoot, source);
    if (
      bytes.length !== source.byte_length ||
      digest(bytes) !== source.content_sha256
    )
      failDelegationManifest("baseline_source_bytes");
  }
  if (source.kind === "tracked_file") {
    try {
      readGitObjectId(repoRoot, `:${source.path}`);
    } catch {
      failDelegationManifest("candidate_not_tracked");
    }
  }
}

function contentRecord(entry, side) {
  return {
    role: entry.role,
    promotion_target: entry.promotion_target,
    byte_length: entry[side].byte_length,
    content_sha256: entry[side].content_sha256,
  };
}

function pickSource(source) {
  return source.kind === "git_blob"
    ? {
        kind: source.kind,
        commit: source.commit,
        path: source.path,
        blob_oid: source.blob_oid,
      }
    : { kind: source.kind, path: source.path };
}

function exactKeys(value, expected, label) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    JSON.stringify(Object.keys(value).sort()) !==
      JSON.stringify([...expected].sort())
  )
    failDelegationManifest(label);
}

function sha1(value) {
  return /^[0-9a-f]{40}$/u.test(value ?? "");
}

function sha256(value) {
  return /^[0-9a-f]{64}$/u.test(value ?? "");
}
