import {
  readRecoveryCheckpointFile,
  readRecoveryRepositoryFile,
} from "./design-resource-recovery-files.js";
import { parseDesignResourceRecoveryCheckpoint } from "./design-resource-recovery-codec.js";
import { validateDesignResourceRecoverySemantics } from "./design-resource-recovery-replay.js";
import { decodeDesignResourceText } from "./design-resource-recovery-text.js";
import { validateDesignResourceAuthoritySourceItems } from "./design-resource-recovery-source-authority.js";
import { validateSelectedResourceRepositoryBindings } from "./design-resource-recovery-repository-bindings.js";
import type {
  DesignResourceAuthorityIdentity,
  DesignResourceRecoveryCheckpoint,
} from "./design-resource-recovery-types.js";

export async function loadCurrentDesignResourceRecoveryCheckpoint(
  repository: string,
  sessionId: string,
): Promise<{
  checkpoint: DesignResourceRecoveryCheckpoint;
  path: string;
  digest: string;
}> {
  const snapshot = await readRecoveryCheckpointFile(repository, sessionId);
  const checkpoint = parseDesignResourceRecoveryCheckpoint(
    snapshot.bytes.toString("utf8"),
  );
  if (checkpoint.session_id !== sessionId) invalid("session_identity_mismatch");
  validateDesignResourceRecoverySemantics(checkpoint);
  const base = await readRecoveryRepositoryFile(
    repository,
    checkpoint.base.locator,
    "design_resource_recovery_base",
  );
  assertDigest("base", base.raw_byte_digest, checkpoint.base.raw_byte_digest);
  const decoded = decodeDesignResourceText(base.bytes);
  if (
    decoded.encoding !== checkpoint.base.encoding ||
    decoded.eol_policy !== checkpoint.base.eol_policy
  )
    invalid("base_text_identity_changed");
  await validateDesignResourceRepositoryAuthority(
    repository,
    checkpoint.design_authority,
  );
  await validateDesignResourceAuthoritySourceItems(repository, checkpoint);
  await validateSelectedResourceRepositoryBindings(repository, checkpoint);
  return {
    checkpoint,
    path: snapshot.relative,
    digest: snapshot.raw_byte_digest,
  };
}

export async function validateDesignResourceRepositoryAuthority(
  repository: string,
  authority: DesignResourceAuthorityIdentity,
): Promise<void> {
  if (authority.kind !== "repository-file") return;
  const snapshot = await readRecoveryRepositoryFile(
    repository,
    authority.locator,
    "design_resource_recovery_design_authority",
  );
  assertDigest(
    "design_authority",
    snapshot.raw_byte_digest,
    authority.raw_byte_digest,
  );
}

function assertDigest(label: string, actual: string, expected: string): void {
  if (actual !== expected)
    invalid(`${label}_digest_mismatch:${expected}:${actual}`);
}

function invalid(reason: string): never {
  throw new Error(`design_resource_recovery_invalid:${reason}`);
}
