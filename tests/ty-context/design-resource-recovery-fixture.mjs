import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { encodeDesignResourceText } from "../../packages/ty-context/dist/lib/design-resource-recovery-text.js";
import {
  canonicalValueJson,
  sha256Hex,
} from "../../packages/ty-context/dist/lib/strict-codec.js";

const exec = promisify(execFile);

export async function createRecoveryFixture(options = {}) {
  const root = await mkdtemp(path.join(os.tmpdir(), "ty-context-dra-recovery-"));
  await exec("git", ["init", "--quiet"], { cwd: root, windowsHide: true });
  await writeFile(path.join(root, ".gitignore"), "tmp/\n", "utf8");
  await mkdir(path.join(root, "source"), { recursive: true });
  await mkdir(path.join(root, "resources"), { recursive: true });
  const newline = options.newline ?? "\r\n";
  const encoding = options.encoding ?? "utf8";
  const before = `# Proposal${newline}color: blue${newline}layout: compact${newline}`;
  const after = before.replace("color: blue", "color: red");
  const beforeBytes = encodeDesignResourceText(before, encoding);
  const afterBytes = encodeDesignResourceText(after, encoding);
  const baseLocator = "source/base-proposal.md";
  const proposalLocator = "proposal.md";
  const designLocator = "DESIGN.md";
  const resourceLocator = "resources/main.json";
  const designBytes = Buffer.from("# Design Authority\nstatus: adopted\n", "utf8");
  const resourceBytes = Buffer.from('{"color":"red"}\n', "utf8");
  await Promise.all([
    writeFile(path.join(root, ...baseLocator.split("/")), beforeBytes),
    writeFile(path.join(root, proposalLocator), beforeBytes),
    writeFile(path.join(root, designLocator), designBytes),
    writeFile(path.join(root, ...resourceLocator.split("/")), resourceBytes),
  ]);
  const patch = {
    schema_version: "design-resource-exact-patch-v1",
    operations: [
      {
        operation_id: "patch.visual.color",
        target_keys: ["visual.color"],
        before_text: "color: blue",
        after_text: "color: red",
        expected_occurrences: 1,
      },
    ],
  };
  const input = {
    schema_version: "design-resource-recovery-input-v1",
    session_id: options.sessionId ?? "fixture-session",
    disclosure_review: {
      reviewed: true,
      contains_sensitive_raw_values: false,
    },
    base: {
      locator: baseLocator,
      raw_byte_digest: sha256(beforeBytes),
      materialization: { kind: "repository-source" },
      scope_ceiling: "proposal.visual-slice",
      in_scope_keys: [
        "copy.tagline",
        "layout.stable",
        "product.admin",
        "visual.color",
      ],
      explicitly_excluded_keys: ["page.other"],
    },
    delegations: [
      {
        key: "visual-choice",
        source_ref: "source/base-proposal.md#delegation",
        allowed_origins: ["provider-suggested"],
        allowed_target_keys: ["visual.color"],
      },
    ],
    deltas: [
      {
        delta_id: "delta.color",
        sequence: 1,
        supersedes: [],
        operation: "replace",
        target_keys: ["visual.color"],
        before_semantics: { color: "blue" },
        after_semantics: { color: "red" },
        origin: "provider-suggested",
        decision_authority: "delegated:visual-choice",
        evidence_refs: ["resource.main"],
        source_refs: ["source/base-proposal.md#delegation"],
        explicitly_unchanged_keys: [],
        status: "accepted",
      },
      {
        delta_id: "delta.admin",
        sequence: 2,
        supersedes: [],
        operation: "add",
        target_keys: ["product.admin"],
        before_semantics: null,
        after_semantics: { role: "admin" },
        origin: "provider-suggested",
        decision_authority: "none",
        evidence_refs: ["resource.main"],
        source_refs: [],
        explicitly_unchanged_keys: [],
        status: "rejected",
      },
      {
        delta_id: "delta.tagline",
        sequence: 3,
        supersedes: [],
        operation: "replace",
        target_keys: ["copy.tagline"],
        before_semantics: { copy: "Old" },
        after_semantics: { copy: "New" },
        origin: "provider-suggested",
        decision_authority: "none",
        evidence_refs: ["resource.main"],
        source_refs: [],
        explicitly_unchanged_keys: [],
        status: "unresolved",
      },
      {
        delta_id: "delta.layout-preserved",
        sequence: 4,
        supersedes: [],
        operation: "preserve",
        target_keys: ["layout.stable"],
        before_semantics: { density: "compact" },
        after_semantics: { density: "compact" },
        origin: "necessary-derived",
        decision_authority: "none",
        evidence_refs: [],
        source_refs: ["source/base-proposal.md#layout"],
        explicitly_unchanged_keys: [],
        status: "accepted",
      },
    ],
    decision_sets: {
      accepted_delta_ids: ["delta.color", "delta.layout-preserved"],
      rejected_delta_ids: ["delta.admin"],
      unresolved_delta_ids: ["delta.tagline"],
    },
    explicitly_unchanged_keys: ["layout.stable"],
    design_authority: {
      kind: "repository-file",
      locator: designLocator,
      raw_byte_digest: sha256(designBytes),
    },
    provider: {
      project: {
        key: "provider.project",
        locator: "provider://project/immutable",
        immutable_identity: "project-revision-1",
      },
      run: {
        key: "provider.run",
        locator: "provider://run/immutable",
        immutable_identity: "run-revision-1",
      },
      resources: [
        {
          key: "resource.main",
          locator: "provider://resource/main",
          immutable_identity: "resource-revision-1",
          raw_byte_digest: sha256(resourceBytes),
        },
      ],
    },
    selected_resource_keys: ["resource.main"],
    writeback: {
      target_locator: proposalLocator,
      pre_write_raw_byte_digest: sha256(beforeBytes),
      patch,
      patch_identity: sha256Hex(canonicalValueJson(patch)),
      expected_post_write_raw_byte_digest: sha256(afterBytes),
      resource_identities: [
        { key: "resource.main", raw_byte_digest: sha256(resourceBytes) },
      ],
      accepted_delta_ids: ["delta.color", "delta.layout-preserved"],
    },
  };
  const audit = {
    schema_version: "design-resource-reconciliation-audit-v1",
    session_id: input.session_id,
    base_raw_byte_digest: input.base.raw_byte_digest,
    design_authority: input.design_authority,
    provider_run: input.provider.run,
    resource_identities: input.writeback.resource_identities,
    writeback_target_raw_byte_digest:
      input.writeback.expected_post_write_raw_byte_digest,
    accepted_delta_ids: input.writeback.accepted_delta_ids,
    rejected_delta_ids: input.decision_sets.rejected_delta_ids,
    unresolved_delta_ids: input.decision_sets.unresolved_delta_ids,
    changed_keys: ["visual.color"],
    explicitly_unchanged: [{ key: "layout.stable", preserved: true }],
    requirements_to_resource: [
      {
        key: "visual.color",
        verdict: "covered",
        delta_ids: ["delta.color"],
        resource_refs: ["resource.main"],
      },
    ],
    resource_to_requirements: [
      {
        key: "resource-decision.color",
        resource_ref: "resource.main",
        origin: "provider-suggested",
        decision_authority: "delegated:visual-choice",
        status: "accepted",
        written: true,
        requirement_keys: ["visual.color"],
      },
    ],
    unexpected_blast_radius: [
      { key: "page.other", verdict: "expected" },
    ],
    rejected_or_unresolved_leakage: [
      { delta_id: "delta.admin", leaked: false },
      { delta_id: "delta.tagline", leaked: false },
    ],
  };
  const stateLocator = "recovery-input.json";
  const auditLocator = "reconciliation-audit.json";
  await Promise.all([
    writeFile(
      path.join(root, stateLocator),
      `${JSON.stringify(input, null, 2)}\n`,
      "utf8",
    ),
    writeFile(
      path.join(root, auditLocator),
      `${JSON.stringify(audit, null, 2)}\n`,
      "utf8",
    ),
  ]);
  return {
    root,
    input,
    audit,
    stateLocator,
    auditLocator,
    beforeBytes,
    afterBytes,
    cleanup: () => rm(root, { recursive: true, force: true }),
  };
}

export function clone(value) {
  return structuredClone(value);
}

export function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}
