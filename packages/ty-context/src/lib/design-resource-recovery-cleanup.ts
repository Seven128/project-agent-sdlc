import { parseDesignResourceRecoveryCheckpoint } from "./design-resource-recovery-codec.js";
import {
  readRecoveryCheckpointFile,
  removeRecoveryCheckpointFile,
} from "./design-resource-recovery-files.js";
import { validateDesignResourceRecoverySemantics } from "./design-resource-recovery-replay.js";

export async function removeDesignResourceRecoveryCheckpoint(
  repository: string,
  sessionId: string,
  expectedDigest: string,
): Promise<Awaited<ReturnType<typeof removeRecoveryCheckpointFile>>> {
  const snapshot = await readRecoveryCheckpointFile(repository, sessionId);
  const checkpoint = parseDesignResourceRecoveryCheckpoint(
    snapshot.bytes.toString("utf8"),
  );
  if (checkpoint.session_id !== sessionId)
    throw new Error(
      "design_resource_recovery_invalid:session_identity_mismatch",
    );
  validateDesignResourceRecoverySemantics(checkpoint);
  return removeRecoveryCheckpointFile(repository, sessionId, expectedDigest);
}
