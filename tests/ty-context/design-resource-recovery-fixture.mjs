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
import {
  inspectDesignAuthorityClosure,
  loadCurrentDesignAuthorityClosure,
} from "../../packages/ty-context/dist/lib/design-authority-closure.js";

const exec = promisify(execFile);

export async function createRecoveryFixture(options = {}) {
  const root = await mkdtemp(
    path.join(os.tmpdir(), "ty-context-dra-recovery-"),
  );
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
  const delegationText =
    "The user delegates the exact visual-color choice for visual.color.";
  const layoutText = "Keep the compact layout semantics unchanged.";
  const productDecisionText =
    "The user explicitly accepts this product meaning for the scoped target.";
  const delegationProjection = `<!-- ty-dra-authority-v1 ${JSON.stringify({
    schema_version: "ty-dra-authority-v1",
    mode: "delegation",
    delegation_key: "visual-choice",
    allowed_target_keys: ["visual.color"],
    allowed_semantic_kinds: ["exact-visual"],
    allowed_origins: ["provider-suggested"],
  })} -->`;
  const layoutProjection = `<!-- ty-dra-authority-v1 ${JSON.stringify({
    schema_version: "ty-dra-authority-v1",
    mode: "explicit-user",
    target_keys: ["layout.stable"],
    semantic_kinds: ["exact-visual"],
    allowed_origins: ["necessary-derived"],
    meaning_sha256: sha256Hex(canonicalValueJson({ density: "compact" })),
  })} -->`;
  const productDecisionProjection = `<!-- ty-dra-authority-v1 ${JSON.stringify({
    schema_version: "ty-dra-authority-v1",
    mode: "explicit-user",
    target_keys: ["visual.color"],
    semantic_kinds: ["product"],
    allowed_origins: ["user-direct"],
    meaning_sha256: sha256Hex(canonicalValueJson({ color: "red" })),
  })} -->`;
  const base = [
    "<!-- ty-source-item:start key=visual-color-delegation kind=decision -->",
    delegationText,
    delegationProjection,
    "<!-- ty-source-item:end -->",
    "",
    "<!-- ty-source-item:start key=layout-stable kind=requirement -->",
    layoutText,
    layoutProjection,
    "<!-- ty-source-item:end -->",
    "",
    "<!-- ty-source-item:start key=product-explicit-decision kind=decision -->",
    productDecisionText,
    productDecisionProjection,
    "<!-- ty-source-item:end -->",
    "",
  ].join(newline);
  const baseBytes = encodeDesignResourceText(base, encoding);
  const baseLocator = "source/base-proposal.md";
  const proposalLocator = "proposal.md";
  const designLocator = "DESIGN.md";
  const resourceLocator = "resources/main.json";
  const designBytes = Buffer.from(
    "# Design Authority\nstatus: adopted\n",
    "utf8",
  );
  const resourceBytes = Buffer.from('{"color":"red"}\n', "utf8");
  await Promise.all([
    writeFile(path.join(root, ...baseLocator.split("/")), baseBytes),
    writeFile(path.join(root, proposalLocator), beforeBytes),
    writeFile(path.join(root, designLocator), designBytes),
    writeFile(path.join(root, ...resourceLocator.split("/")), resourceBytes),
  ]);
  let designAuthority = {
    kind: "repository-file",
    locator: designLocator,
    raw_byte_digest: sha256(designBytes),
  };
  if (options.authorityMode === "closure-bundle") {
    await mkdir(path.join(root, "design_system/components"), {
      recursive: true,
    });
    await writeFile(
      path.join(root, "design_system/components/sheet.md"),
      "# Sheet\n\nThe sheet owns reusable drag behavior.\n",
      "utf8",
    );
    const manifestPath = path.join(
      root,
      "design_system/authority.manifest.json",
    );
    const manifest = {
      schema_version: 1,
      entry: "DESIGN.md",
      authority_files: [
        { path: "design_system/components/sheet.md", kind: "component" },
      ],
      generated_files: [],
      closure_digest: `sha256:${"0".repeat(64)}`,
    };
    await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    const provisional = await inspectDesignAuthorityClosure(root);
    if (!provisional.identity)
      throw new Error(JSON.stringify(provisional.diagnostics));
    manifest.closure_digest = provisional.identity.closure_digest;
    await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  }
  if (
    options.authorityMode === "closure-legacy" ||
    options.authorityMode === "closure-bundle"
  ) {
    const closure = await loadCurrentDesignAuthorityClosure(root);
    designAuthority = {
      kind: "repository-closure",
      ...closure.identity,
    };
  }
  const patch = {
    schema_version: "design-resource-exact-patch-v4",
    operations: [
      {
        operation_id: "patch.visual.color",
        operation: "replace",
        target_key: "visual.color",
        delta_id: "delta.color",
        before_text: "color: blue",
        after_text: "color: red",
        before_text_sha256: sha256("color: blue"),
        after_text_sha256: sha256("color: red"),
        source_span: {
          coordinate_system: "utf16-code-unit-v1",
          start_offset: before.indexOf("color: blue"),
          end_offset: before.indexOf("color: blue") + "color: blue".length,
          before_text_sha256: sha256("color: blue"),
        },
        semantic_binding: {
          delta_id: "delta.color",
          target_key: "visual.color",
          before_semantics_sha256: sha256Hex(
            canonicalValueJson({ color: "blue" }),
          ),
          after_semantics_sha256: sha256Hex(
            canonicalValueJson({ color: "red" }),
          ),
          before_text_projection: {
            semantic_path: ["color"],
            start_offset: 7,
            end_offset: 11,
          },
          after_text_projection: {
            semantic_path: ["color"],
            start_offset: 7,
            end_offset: 10,
          },
        },
        expected_occurrences: 1,
      },
    ],
  };
  const input = {
    schema_version: "design-resource-recovery-input-v4",
    session_id: options.sessionId ?? "fixture-session",
    disclosure_review: {
      reviewed: true,
      contains_sensitive_raw_values: false,
    },
    base: {
      locator: baseLocator,
      raw_byte_digest: sha256(baseBytes),
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
    authority_sources: [
      {
        source_ref: "source.visual-color-delegation",
        locator: baseLocator,
        raw_byte_digest: sha256(baseBytes),
        source_item_key: "visual-color-delegation",
        source_item_kind: "decision",
        source_item_text_sha256: sha256(
          `${delegationText}\n${delegationProjection}`,
        ),
      },
      {
        source_ref: "source.layout-stable",
        locator: baseLocator,
        raw_byte_digest: sha256(baseBytes),
        source_item_key: "layout-stable",
        source_item_kind: "requirement",
        source_item_text_sha256: sha256(`${layoutText}\n${layoutProjection}`),
      },
      {
        source_ref: "source.product-explicit-decision",
        locator: baseLocator,
        raw_byte_digest: sha256(baseBytes),
        source_item_key: "product-explicit-decision",
        source_item_kind: "decision",
        source_item_text_sha256: sha256(
          `${productDecisionText}\n${productDecisionProjection}`,
        ),
      },
    ],
    delegations: [
      {
        key: "visual-choice",
        source_ref: "source.visual-color-delegation",
        allowed_origins: ["provider-suggested"],
        allowed_target_keys: ["visual.color"],
        allowed_semantic_kinds: ["exact-visual"],
      },
    ],
    deltas: [
      {
        delta_id: "delta.color",
        sequence: 1,
        supersedes: [],
        proposes_replacement_of: [],
        operation: "replace",
        semantic_kind: "exact-visual",
        target_keys: ["visual.color"],
        before_semantics: { color: "blue" },
        after_semantics: { color: "red" },
        origin: "provider-suggested",
        decision_authority: "delegated:visual-choice",
        evidence_refs: ["resource.main"],
        source_refs: ["source.visual-color-delegation"],
        explicitly_unchanged_keys: [],
        status: "accepted",
      },
      {
        delta_id: "delta.admin",
        sequence: 2,
        supersedes: [],
        proposes_replacement_of: [],
        operation: "add",
        semantic_kind: "permission",
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
        delta_id: "delta.layout-preserved",
        sequence: 3,
        supersedes: [],
        proposes_replacement_of: [],
        operation: "preserve",
        semantic_kind: "exact-visual",
        target_keys: ["layout.stable"],
        before_semantics: { density: "compact" },
        after_semantics: { density: "compact" },
        origin: "necessary-derived",
        decision_authority: "none",
        evidence_refs: [],
        source_refs: ["source.layout-stable"],
        explicitly_unchanged_keys: [],
        status: "accepted",
      },
    ],
    decision_sets: {
      accepted_delta_ids: ["delta.color", "delta.layout-preserved"],
      rejected_delta_ids: ["delta.admin"],
      unresolved_delta_ids: [],
    },
    audit_expectations: {
      changed: [
        {
          key: "visual.color",
          delta_ids: ["delta.color"],
          resource_refs: ["resource.main"],
          condition_refs: ["condition.default"],
        },
      ],
      unchanged: [
        {
          key: "layout.stable",
          resource_refs: ["resource.main"],
          condition_refs: ["condition.default"],
          basis_source_refs: ["source.layout-stable"],
        },
      ],
      resource_decisions: [
        {
          key: "resource-decision.color",
          resource_ref: "resource.main",
          semantic_kind: "exact-visual",
          bindings: [
            {
              binding_id: "binding.color",
              delta_id: "delta.color",
              target_key: "visual.color",
              final_disposition: {
                kind: "proposal-written",
                operation_id: "patch.visual.color",
              },
            },
          ],
          condition_refs: ["condition.default"],
        },
        {
          key: "resource-decision.admin",
          resource_ref: "resource.main",
          semantic_kind: "permission",
          bindings: [
            {
              binding_id: "binding.admin",
              delta_id: "delta.admin",
              target_key: "product.admin",
              final_disposition: { kind: "not-adopted" },
            },
          ],
          condition_refs: ["condition.default"],
        },
      ],
      blast_radius: [{ key: "page.other" }],
      inactive_delta_leakage: [{ delta_id: "delta.admin", reason: "rejected" }],
    },
    design_authority: designAuthority,
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
    selected_resource_bindings: [
      {
        key: "resource.main",
        identity_kind: "repository-snapshot",
        locator: resourceLocator,
        raw_byte_digest: sha256(resourceBytes),
        condition_refs: ["condition.default"],
      },
    ],
    writeback: {
      target_locator: proposalLocator,
      pre_write_raw_byte_digest: sha256(beforeBytes),
      patch,
      patch_identity: sha256Hex(canonicalValueJson(patch)),
      expected_post_write_raw_byte_digest: sha256(afterBytes),
      resource_identities: [
        { key: "resource.main", raw_byte_digest: sha256(resourceBytes) },
      ],
      proposal_written_delta_ids: ["delta.color"],
    },
  };
  if (options.includeUnresolved) {
    input.deltas.splice(2, 0, {
      delta_id: "delta.tagline",
      sequence: 3,
      supersedes: [],
      proposes_replacement_of: [],
      operation: "replace",
      semantic_kind: "product",
      target_keys: ["copy.tagline"],
      before_semantics: { copy: "Old" },
      after_semantics: { copy: "New" },
      origin: "provider-suggested",
      decision_authority: "none",
      evidence_refs: ["resource.main"],
      source_refs: [],
      explicitly_unchanged_keys: [],
      status: "unresolved",
    });
    input.deltas[3].sequence = 4;
    input.decision_sets.unresolved_delta_ids = ["delta.tagline"];
    input.audit_expectations.resource_decisions.push({
      key: "resource-decision.tagline",
      resource_ref: "resource.main",
      semantic_kind: "product",
      bindings: [
        {
          binding_id: "binding.tagline",
          delta_id: "delta.tagline",
          target_key: "copy.tagline",
          final_disposition: { kind: "unresolved" },
        },
      ],
      condition_refs: ["condition.default"],
    });
    input.audit_expectations.inactive_delta_leakage.push({
      delta_id: "delta.tagline",
      reason: "unresolved",
    });
  }
  const audit = {
    schema_version: "design-resource-reconciliation-audit-v4",
    session_id: input.session_id,
    base_raw_byte_digest: input.base.raw_byte_digest,
    design_authority: input.design_authority,
    provider_run: input.provider.run,
    resource_identities: input.writeback.resource_identities,
    writeback_target_raw_byte_digest:
      input.writeback.expected_post_write_raw_byte_digest,
    accepted_delta_ids: input.decision_sets.accepted_delta_ids,
    rejected_delta_ids: input.decision_sets.rejected_delta_ids,
    unresolved_delta_ids: input.decision_sets.unresolved_delta_ids,
    changed_keys: ["visual.color"],
    explicitly_unchanged: [
      {
        key: "layout.stable",
        verdict: "preserved",
        resource_refs: ["resource.main"],
        condition_refs: ["condition.default"],
        basis_source_refs: ["source.layout-stable"],
      },
    ],
    requirements_to_resource: [
      {
        key: "visual.color",
        verdict: "covered",
        delta_ids: ["delta.color"],
        resource_refs: ["resource.main"],
        condition_refs: ["condition.default"],
      },
    ],
    resource_to_requirements: [
      {
        key: "resource-decision.color",
        resource_ref: "resource.main",
        status: "accepted",
        semantic_kind: "exact-visual",
        delta_ids: ["delta.color"],
        condition_refs: ["condition.default"],
        requirement_bindings: [
          {
            binding_id: "binding.color",
            requirement_key: "visual.color",
            delta_id: "delta.color",
            origin: "provider-suggested",
            decision_authority: "delegated:visual-choice",
            source_refs: ["source.visual-color-delegation"],
            final_disposition: {
              kind: "proposal-written",
              operation_id: "patch.visual.color",
            },
          },
        ],
      },
      {
        key: "resource-decision.admin",
        resource_ref: "resource.main",
        status: "rejected",
        semantic_kind: "permission",
        delta_ids: ["delta.admin"],
        condition_refs: ["condition.default"],
        requirement_bindings: [
          {
            binding_id: "binding.admin",
            requirement_key: "product.admin",
            delta_id: "delta.admin",
            origin: "provider-suggested",
            decision_authority: "none",
            source_refs: [],
            final_disposition: { kind: "not-adopted" },
          },
        ],
      },
    ],
    unexpected_blast_radius: [{ key: "page.other", verdict: "expected" }],
    inactive_delta_leakage: [
      {
        delta_id: "delta.admin",
        inactive_reason: "rejected",
        leaked: false,
      },
    ],
  };
  if (options.includeUnresolved) {
    audit.resource_to_requirements.push({
      key: "resource-decision.tagline",
      resource_ref: "resource.main",
      status: "unresolved",
      semantic_kind: "product",
      delta_ids: ["delta.tagline"],
      condition_refs: ["condition.default"],
      requirement_bindings: [
        {
          binding_id: "binding.tagline",
          requirement_key: "copy.tagline",
          delta_id: "delta.tagline",
          origin: "provider-suggested",
          decision_authority: "none",
          source_refs: [],
          final_disposition: { kind: "unresolved" },
        },
      ],
    });
    audit.inactive_delta_leakage.push({
      delta_id: "delta.tagline",
      inactive_reason: "unresolved",
      leaked: false,
    });
  }
  if (options.resourceOwned) {
    const finalDisposition = {
      kind: "resource-owned-exact-visual",
      resource_ref: "resource.main",
      condition_refs: ["condition.default"],
      downstream_owner: {
        kind: "selected-source-record",
        locator: resourceLocator,
        raw_byte_digest: sha256(resourceBytes),
        resource_key: "resource.main",
      },
    };
    input.audit_expectations.resource_decisions[0].bindings[0].final_disposition =
      structuredClone(finalDisposition);
    audit.resource_to_requirements[0].requirement_bindings[0].final_disposition =
      structuredClone(finalDisposition);
    delete input.writeback;
    delete audit.writeback_target_raw_byte_digest;
  }
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
    baseBytes,
    cleanup: () => rm(root, { recursive: true, force: true }),
  };
}

export function clone(value) {
  return structuredClone(value);
}

export function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}
