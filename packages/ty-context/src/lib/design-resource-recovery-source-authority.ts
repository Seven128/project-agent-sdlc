import { decodeDesignResourceText } from "./design-resource-recovery-text.js";
import type {
  DesignResourceRecoveryCheckpoint,
  DesignResourceRecoveryCreateInput,
} from "./design-resource-recovery-types.js";
import { readRecoveryRepositoryFile } from "./design-resource-recovery-files.js";
import { parseSourceDocument } from "./long-task-source-item-parser.js";

type RecoveryState =
  DesignResourceRecoveryCreateInput | DesignResourceRecoveryCheckpoint;

export async function validateDesignResourceAuthoritySourceItems(
  repository: string,
  state: RecoveryState,
): Promise<void> {
  const byLocator = new Map<
    string,
    Awaited<ReturnType<typeof loadAuthoritySourceDocument>>
  >();
  for (const declared of state.authority_sources) {
    let loaded = byLocator.get(declared.locator);
    if (!loaded) {
      loaded = await loadAuthoritySourceDocument(repository, declared.locator);
      byLocator.set(declared.locator, loaded);
    }
    if (loaded.rawByteDigest !== declared.raw_byte_digest)
      invalid(
        `authority_source_raw_digest_mismatch:${declared.source_ref}:${declared.raw_byte_digest}:${loaded.rawByteDigest}`,
      );
    const item = loaded.items.get(declared.source_item_key);
    if (!item)
      invalid(
        `authority_source_item_missing:${declared.source_ref}:${declared.source_item_key}`,
      );
    if (item.kind !== declared.source_item_kind)
      invalid(
        `authority_source_item_kind_mismatch:${declared.source_ref}:${declared.source_item_kind}:${item.kind}`,
      );
    if (item.text_sha256 !== declared.source_item_text_sha256)
      invalid(
        `authority_source_item_digest_mismatch:${declared.source_ref}:${declared.source_item_text_sha256}:${item.text_sha256}`,
      );
  }
}

async function loadAuthoritySourceDocument(
  repository: string,
  locator: string,
): Promise<{
  rawByteDigest: string;
  items: Map<string, { kind: string; text_sha256: string }>;
}> {
  const snapshot = await readRecoveryRepositoryFile(
    repository,
    locator,
    "design_resource_recovery_authority_source",
  );
  const decoded = decodeDesignResourceText(snapshot.bytes);
  try {
    const parsed = parseSourceDocument(snapshot.relative, decoded.text);
    return {
      rawByteDigest: snapshot.raw_byte_digest,
      items: new Map(
        parsed.items.map((item) => [
          item.key,
          { kind: item.kind, text_sha256: item.text_sha256 },
        ]),
      ),
    };
  } catch (error) {
    invalid(
      `authority_source_parse_failed:${snapshot.relative}:${(error as Error).message}`,
    );
  }
}

function invalid(reason: string): never {
  throw new Error(`design_resource_recovery_invalid:${reason}`);
}
