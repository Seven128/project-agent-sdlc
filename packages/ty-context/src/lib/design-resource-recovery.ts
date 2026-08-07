import {
  createRecoveryCheckpointFile,
  deriveDigestCasState,
  atomicCasWrite,
  readRecoveryCheckpointFile,
  readRecoveryRepositoryFile,
  updateRecoveryCheckpointFile,
} from "./design-resource-recovery-files.js";
import {
  loadCurrentDesignResourceRecoveryCheckpoint,
  validateDesignResourceRepositoryAuthority,
} from "./design-resource-recovery-current.js";
import {
  encodeDesignResourceRecoveryCheckpoint,
  parseDesignResourceRecoveryCheckpoint,
} from "./design-resource-recovery-codec.js";
import { parseDesignResourceReconciliationAudit } from "./design-resource-reconciliation-codec.js";
import { reconcileDesignResourceWriteback } from "./design-resource-reconciliation.js";
import {
  activeAcceptedDesignResourceDeltas,
  createDesignResourceReplayProjection,
  validateDesignResourceRecoverySemantics,
} from "./design-resource-recovery-replay.js";
import {
  applyDesignResourceExactPatch,
  decodeDesignResourceText,
  verifyDesignResourceExactPatchReadback,
  verifyDesignResourceSupersededTextReadback,
} from "./design-resource-recovery-text.js";
import { validateDesignResourceAuthoritySourceItems } from "./design-resource-recovery-source-authority.js";
import {
  validateReconciliationDownstreamOwners,
  validateSelectedResourceRepositoryBindings,
} from "./design-resource-recovery-repository-bindings.js";
import { DESIGN_RESOURCE_RECOVERY_SCHEMA } from "./design-resource-recovery-schema.js";
import {
  type DesignResourceRecoveryCheckpoint,
  type DesignResourceRecoveryCreateInput,
  type DesignResourceReplayProjection,
} from "./design-resource-recovery-types.js";
import type { DesignResourceReconciliationResult } from "./design-resource-reconciliation-types.js";
import { sha256Hex } from "./strict-codec.js";

export interface DesignResourceRecoveryInspection {
  status: "recoverable";
  checkpoint_path: string;
  checkpoint_raw_byte_digest: string;
  replay: DesignResourceReplayProjection;
  writeback:
    | { configured: false }
    | {
        configured: true;
        state: "unapplied" | "applied" | "conflict";
        current_raw_byte_digest: string;
        pre_write_raw_byte_digest: string;
        expected_post_write_raw_byte_digest: string;
      };
}

export async function createDesignResourceRecoveryCheckpoint(
  repository: string,
  input: DesignResourceRecoveryCreateInput,
): Promise<{
  status: "created" | "already-current";
  checkpoint_path: string;
  checkpoint_raw_byte_digest: string;
}> {
  const { encoded } = await prepareDesignResourceRecoveryCheckpoint(
    repository,
    input,
  );
  const written = await createRecoveryCheckpointFile(
    repository,
    input.session_id,
    Buffer.from(encoded, "utf8"),
  );
  return {
    status: written.changed ? "created" : "already-current",
    checkpoint_path: written.path,
    checkpoint_raw_byte_digest: written.raw_byte_digest,
  };
}

export async function updateDesignResourceRecoveryCheckpoint(
  repository: string,
  input: DesignResourceRecoveryCreateInput,
  expectedCurrentDigest: string,
): Promise<{
  status: "updated" | "already-current";
  checkpoint_path: string;
  checkpoint_raw_byte_digest: string;
}> {
  const current = await readRecoveryCheckpointFile(
    repository,
    input.session_id,
  );
  assertDigest(
    "checkpoint_update",
    current.raw_byte_digest,
    expectedCurrentDigest,
  );
  const currentCheckpoint = parseDesignResourceRecoveryCheckpoint(
    current.bytes.toString("utf8"),
  );
  if (currentCheckpoint.session_id !== input.session_id)
    throw new Error(
      "design_resource_recovery_invalid:update_session_identity_mismatch",
    );
  validateDesignResourceRecoverySemantics(currentCheckpoint);
  const { encoded } = await prepareDesignResourceRecoveryCheckpoint(
    repository,
    input,
  );
  const written = await updateRecoveryCheckpointFile(
    repository,
    input.session_id,
    Buffer.from(encoded, "utf8"),
    expectedCurrentDigest,
  );
  const readback = await readRecoveryCheckpointFile(
    repository,
    input.session_id,
  );
  assertDigest(
    "checkpoint_update_readback",
    readback.raw_byte_digest,
    written.raw_byte_digest,
  );
  const parsed = parseDesignResourceRecoveryCheckpoint(
    readback.bytes.toString("utf8"),
  );
  validateDesignResourceRecoverySemantics(parsed);
  return {
    status: written.changed ? "updated" : "already-current",
    checkpoint_path: written.path,
    checkpoint_raw_byte_digest: written.raw_byte_digest,
  };
}

async function prepareDesignResourceRecoveryCheckpoint(
  repository: string,
  input: DesignResourceRecoveryCreateInput,
): Promise<{
  checkpoint: DesignResourceRecoveryCheckpoint;
  encoded: string;
}> {
  validateDesignResourceRecoverySemantics(input);
  const baseSnapshot = await readRecoveryRepositoryFile(
    repository,
    input.base.locator,
    "design_resource_recovery_base",
  );
  assertDigest(
    "base",
    baseSnapshot.raw_byte_digest,
    input.base.raw_byte_digest,
  );
  const baseText = decodeDesignResourceText(baseSnapshot.bytes);
  await validateDesignResourceRepositoryAuthority(
    repository,
    input.design_authority,
  );
  await validateDesignResourceAuthoritySourceItems(repository, input);
  await validateSelectedResourceRepositoryBindings(repository, input);
  let writeback: DesignResourceRecoveryCheckpoint["writeback"];
  if (input.writeback) {
    const target = await readRecoveryRepositoryFile(
      repository,
      input.writeback.target_locator,
      "design_resource_recovery_writeback_target",
    );
    assertDigest(
      "writeback_pre",
      target.raw_byte_digest,
      input.writeback.pre_write_raw_byte_digest,
    );
    const patched = applyDesignResourceExactPatch(
      target.bytes,
      input.writeback.patch,
    );
    assertDigest(
      "writeback_expected_post",
      sha256Hex(patched.bytes),
      input.writeback.expected_post_write_raw_byte_digest,
    );
    verifyDesignResourceSupersededTextReadback(
      patched.bytes,
      input.writeback.patch,
      supersedingDeltaIds(input),
    );
    writeback = {
      ...input.writeback,
      target_encoding: patched.encoding,
      target_eol_policy: patched.eol_policy,
    };
  }
  const {
    schema_version: _inputSchema,
    base: _inputBase,
    writeback: _inputWriteback,
    ...common
  } = input;
  const checkpoint: DesignResourceRecoveryCheckpoint = {
    ...common,
    schema_version: DESIGN_RESOURCE_RECOVERY_SCHEMA,
    owner: "ty-context-design-resource-recovery",
    base: {
      ...input.base,
      encoding: baseText.encoding,
      eol_policy: baseText.eol_policy,
    },
    ...(writeback ? { writeback } : {}),
  };
  validateDesignResourceRecoverySemantics(checkpoint);
  const encoded = encodeDesignResourceRecoveryCheckpoint(checkpoint);
  const roundTrip = parseDesignResourceRecoveryCheckpoint(encoded);
  validateDesignResourceRecoverySemantics(roundTrip);
  return {
    checkpoint: roundTrip,
    encoded,
  };
}

export async function inspectDesignResourceRecovery(
  repository: string,
  sessionId: string,
): Promise<DesignResourceRecoveryInspection> {
  const loaded = await loadCurrentDesignResourceRecoveryCheckpoint(
    repository,
    sessionId,
  );
  const writeback = loaded.checkpoint.writeback;
  if (!writeback)
    return {
      status: "recoverable",
      checkpoint_path: loaded.path,
      checkpoint_raw_byte_digest: loaded.digest,
      replay: createDesignResourceReplayProjection(loaded.checkpoint),
      writeback: { configured: false },
    };
  const target = await readRecoveryRepositoryFile(
    repository,
    writeback.target_locator,
    "design_resource_recovery_writeback_target",
  );
  return {
    status: "recoverable",
    checkpoint_path: loaded.path,
    checkpoint_raw_byte_digest: loaded.digest,
    replay: createDesignResourceReplayProjection(loaded.checkpoint),
    writeback: {
      configured: true,
      state: deriveDigestCasState(
        target.raw_byte_digest,
        writeback.pre_write_raw_byte_digest,
        writeback.expected_post_write_raw_byte_digest,
      ),
      current_raw_byte_digest: target.raw_byte_digest,
      pre_write_raw_byte_digest: writeback.pre_write_raw_byte_digest,
      expected_post_write_raw_byte_digest:
        writeback.expected_post_write_raw_byte_digest,
    },
  };
}

export async function previewDesignResourceRecoveryWriteback(
  repository: string,
  sessionId: string,
): Promise<
  DesignResourceRecoveryInspection & {
    patch: DesignResourceRecoveryCheckpoint["writeback"];
  }
> {
  const inspection = await inspectDesignResourceRecovery(repository, sessionId);
  const checkpoint = (
    await loadCurrentDesignResourceRecoveryCheckpoint(repository, sessionId)
  ).checkpoint;
  if (!checkpoint.writeback)
    throw new Error(
      "design_resource_recovery_invalid:writeback_not_configured",
    );
  return { ...inspection, patch: checkpoint.writeback };
}

export async function applyDesignResourceRecoveryWriteback(
  repository: string,
  sessionId: string,
  auditLocator: string,
): Promise<{
  status:
    | "writeback-applied"
    | "writeback-idempotent"
    | "external-resource-revalidation-pending"
    | "blocked";
  write_transaction: boolean;
  idempotent_replay: boolean;
  reconciliation: DesignResourceReconciliationResult;
  target_raw_byte_digest: string;
}> {
  const { checkpoint } = await loadCurrentDesignResourceRecoveryCheckpoint(
    repository,
    sessionId,
  );
  const writeback = checkpoint.writeback;
  if (!writeback)
    throw new Error(
      "design_resource_recovery_invalid:writeback_not_configured",
    );
  const auditSnapshot = await readRecoveryRepositoryFile(
    repository,
    auditLocator,
    "design_resource_recovery_fresh_audit",
  );
  const audit = parseDesignResourceReconciliationAudit(
    auditSnapshot.bytes.toString("utf8"),
  );
  const preReconciliation = reconcileDesignResourceWriteback(checkpoint, audit);
  let externalRevalidationRequired = false;
  if (preReconciliation.status === "reconciliation-balanced") {
    try {
      externalRevalidationRequired = (
        await validateReconciliationDownstreamOwners(repository, checkpoint)
      ).external_revalidation_required;
    } catch (error) {
      preReconciliation.status = "blocked";
      preReconciliation.findings.push(
        error instanceof Error ? error.message : String(error),
      );
    }
  }
  const target = await readRecoveryRepositoryFile(
    repository,
    writeback.target_locator,
    "design_resource_recovery_writeback_target",
  );
  const state = deriveDigestCasState(
    target.raw_byte_digest,
    writeback.pre_write_raw_byte_digest,
    writeback.expected_post_write_raw_byte_digest,
  );
  if (state === "conflict")
    throw new Error("design_resource_recovery_invalid:writeback_cas_conflict");
  if (preReconciliation.status === "blocked")
    return {
      status: "blocked",
      write_transaction: false,
      idempotent_replay: state === "applied",
      reconciliation: preReconciliation,
      target_raw_byte_digest: target.raw_byte_digest,
    };
  let wrote = false;
  if (state === "unapplied") {
    const patched = applyDesignResourceExactPatch(
      target.bytes,
      writeback.patch,
      writeback.target_encoding,
      writeback.target_eol_policy,
    );
    assertDigest(
      "writeback_expected_post",
      sha256Hex(patched.bytes),
      writeback.expected_post_write_raw_byte_digest,
    );
    await atomicCasWrite(
      repository,
      writeback.target_locator,
      patched.bytes,
      writeback.pre_write_raw_byte_digest,
      target.mode,
    );
    wrote = true;
  }
  const post = await readRecoveryRepositoryFile(
    repository,
    writeback.target_locator,
    "design_resource_recovery_writeback_readback",
  );
  assertDigest(
    "writeback_post_readback",
    post.raw_byte_digest,
    writeback.expected_post_write_raw_byte_digest,
  );
  verifyDesignResourceExactPatchReadback(post.bytes, writeback.patch);
  verifyDesignResourceSupersededTextReadback(
    post.bytes,
    writeback.patch,
    supersedingDeltaIds(checkpoint),
  );
  const reconciliation = reconcileDesignResourceWriteback(checkpoint, audit);
  if (reconciliation.status === "reconciliation-balanced") {
    try {
      externalRevalidationRequired = (
        await validateReconciliationDownstreamOwners(repository, checkpoint)
      ).external_revalidation_required;
    } catch (error) {
      reconciliation.status = "blocked";
      reconciliation.findings.push(
        error instanceof Error ? error.message : String(error),
      );
      reconciliation.findings.sort();
    }
  }
  return {
    status:
      reconciliation.status === "blocked"
        ? "blocked"
        : externalRevalidationRequired
          ? "external-resource-revalidation-pending"
          : wrote
            ? "writeback-applied"
            : "writeback-idempotent",
    write_transaction: wrote,
    idempotent_replay: !wrote,
    reconciliation,
    target_raw_byte_digest: post.raw_byte_digest,
  };
}

export async function reconcileDesignResourceRecovery(
  repository: string,
  sessionId: string,
  auditLocator: string,
): Promise<{
  status:
    | "reconciliation-balanced"
    | "external-resource-revalidation-pending"
    | "blocked";
  write_transaction: false;
  reconciliation: DesignResourceReconciliationResult;
}> {
  const { checkpoint } = await loadCurrentDesignResourceRecoveryCheckpoint(
    repository,
    sessionId,
    { validateSelectedResources: false },
  );
  if (checkpoint.writeback)
    throw new Error(
      "design_resource_recovery_invalid:read_only_reconcile_requires_no_writeback",
    );
  const auditSnapshot = await readRecoveryRepositoryFile(
    repository,
    auditLocator,
    "design_resource_recovery_fresh_audit",
  );
  const audit = parseDesignResourceReconciliationAudit(
    auditSnapshot.bytes.toString("utf8"),
  );
  const reconciliation = reconcileDesignResourceWriteback(checkpoint, audit);
  if (reconciliation.status === "blocked")
    return { status: "blocked", write_transaction: false, reconciliation };
  try {
    const current = await validateReconciliationDownstreamOwners(
      repository,
      checkpoint,
    );
    return {
      status: current.external_revalidation_required
        ? "external-resource-revalidation-pending"
        : "reconciliation-balanced",
      write_transaction: false,
      reconciliation,
    };
  } catch (error) {
    reconciliation.status = "blocked";
    reconciliation.findings.push(
      error instanceof Error ? error.message : String(error),
    );
    reconciliation.findings.sort();
    return { status: "blocked", write_transaction: false, reconciliation };
  }
}

export { removeDesignResourceRecoveryCheckpoint } from "./design-resource-recovery-cleanup.js";

function assertDigest(label: string, actual: string, expected: string): void {
  if (actual !== expected)
    throw new Error(
      `design_resource_recovery_invalid:${label}_digest_mismatch:${expected}:${actual}`,
    );
}

function supersedingDeltaIds(
  state: DesignResourceRecoveryCreateInput | DesignResourceRecoveryCheckpoint,
): Set<string> {
  return new Set(
    activeAcceptedDesignResourceDeltas(state.deltas)
      .filter((delta) => delta.supersedes.length > 0)
      .map((delta) => delta.delta_id),
  );
}
