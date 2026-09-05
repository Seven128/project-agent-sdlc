import { lstat, readdir } from "node:fs/promises";
import path from "node:path";
import { TextDecoder } from "node:util";
import {
  captureCompactAuthoringFile,
  type CompactAuthoringFileSnapshotV1,
} from "./long-task-compact-authoring-transaction.js";
import { parseDeliveryContractText } from "./long-task-delivery-parser.js";
import { assertProtectedRepositoryFile } from "./long-task-protected-files.js";
import {
  emptyCompactAuthoringReport,
  type LongTaskCompactAuthoringReportV1,
} from "./long-task-compact-authoring-report.js";
import { projectLongTaskCompactAuthoring } from "./long-task-compact-authoring-projection.js";
import { loadActiveLongTaskAuthority } from "./long-task-state.js";
import { repoRelative } from "./long-task-workspace.js";
import {
  loadSemanticFactManifest,
  locateSemanticFactManifestBlockSpans,
  parseSemanticFactManifestBlocks,
} from "./semantic-fact-source-parser.js";
import { parseStrictYaml } from "./strict-codec.js";

export interface CompactAuthoringPlanV1 {
  report: LongTaskCompactAuthoringReportV1;
  source_before: CompactAuthoringFileSnapshotV1;
  contract_before: CompactAuthoringFileSnapshotV1;
  source_after: Buffer;
  contract_after: Buffer;
}

export interface CompactAuthoringAnalysisV1 {
  report: LongTaskCompactAuthoringReportV1;
  plan: CompactAuthoringPlanV1 | null;
}

export async function analyzeLongTaskCompactAuthoring(
  repository: string,
  workdir: string,
): Promise<CompactAuthoringAnalysisV1> {
  const authorityLockPresent = await hasAuthorityLockOrHistory(
    repository,
    workdir,
  );
  const contractFile = await assertProtectedRepositoryFile(
    repository,
    path.join(workdir, "delivery-contract.yaml"),
    "compact_authoring_contract",
  );
  const contractBefore = await captureCompactAuthoringFile(
    repository,
    contractFile,
    "compact_authoring_contract",
  );
  const contractText = decodeStrictUtf8(
    contractBefore.bytes,
    "delivery-contract.yaml",
  );
  const rawContract = plainObject(
    parseStrictYaml(contractText),
    "compact_authoring_contract_root",
  );
  if (Object.hasOwn(rawContract, "outcome_files"))
    return {
      report: {
        ...emptyCompactAuthoringReport(),
        status: "not_applicable",
        authority_lock_present: authorityLockPresent,
        contract_path: repoRelative(repository, contractFile),
        diagnostic_code: "compact_authoring_outcome_files_not_supported",
        reason:
          "Compact authoring does not rewrite compatibility outcome fragments; inline Outcomes are required.",
      },
      plan: null,
    };
  const contract = parseDeliveryContractText(contractText);
  const manifestRef = contract.semantic_fact_manifest;
  const loaded = await loadSemanticFactManifest(
    repository,
    contract.task.source_paths,
  );
  if (
    loaded.source_path !== manifestRef.source_path ||
    loaded.manifest.key !== manifestRef.key
  )
    throw new Error(
      `compact_authoring_manifest_binding_mismatch:${manifestRef.source_path}:${manifestRef.key}`,
    );
  if (loaded.sha256 !== manifestRef.sha256)
    throw new Error(
      `compact_authoring_manifest_digest_mismatch:${manifestRef.source_path}:${manifestRef.sha256}:${loaded.sha256}`,
    );
  const sourceFile = await assertProtectedRepositoryFile(
    repository,
    path.resolve(repository, ...manifestRef.source_path.split("/")),
    "compact_authoring_semantic_source",
  );
  const sourceBefore = await captureCompactAuthoringFile(
    repository,
    sourceFile,
    "compact_authoring_semantic_source",
  );
  const sourceText = decodeStrictUtf8(
    sourceBefore.bytes,
    manifestRef.source_path,
  );
  const sourceRows = parseSemanticFactManifestBlocks(
    manifestRef.source_path,
    sourceText,
  );
  const spans = locateSemanticFactManifestBlockSpans(
    manifestRef.source_path,
    sourceText,
  );
  if (sourceRows.length !== 1 || spans.length !== 1)
    throw new Error(
      `compact_authoring_exactly_one_manifest_block_required:${sourceRows.length}:${spans.length}`,
    );
  const source = sourceRows[0]!;
  const span = spans[0]!;
  if (
    source.carrier === "compact_v1" &&
    span.kind !== "semantic-fact-compact-carrier-v1"
  )
    throw new Error("compact_authoring_source_carrier_kind_mismatch");
  const projection = projectLongTaskCompactAuthoring({
    contract,
    raw_contract: rawContract,
    source_carrier: parseStrictYaml(
      sourceText.slice(span.body_start_offset, span.body_end_offset),
    ),
    source,
    span,
    source_text: sourceText,
    source_path: manifestRef.source_path,
    contract_path: repoRelative(repository, contractFile),
    workdir,
    authority_lock_present: authorityLockPresent,
  });
  const [sourceCurrent, contractCurrent] = await Promise.all([
    captureCompactAuthoringFile(
      repository,
      sourceFile,
      "compact_authoring_source_snapshot_recheck",
    ),
    captureCompactAuthoringFile(
      repository,
      contractFile,
      "compact_authoring_contract_snapshot_recheck",
    ),
  ]);
  if (
    !sameSnapshot(sourceBefore, sourceCurrent) ||
    !sameSnapshot(contractBefore, contractCurrent)
  )
    throw new Error("compact_authoring_cas_conflict:analysis_snapshot_changed");
  return {
    report: projection.report,
    plan: projection.report.apply_allowed
      ? {
          report: projection.report,
          source_before: sourceBefore,
          contract_before: contractBefore,
          source_after: projection.source_after,
          contract_after: projection.contract_after,
        }
      : null,
  };
}

async function hasAuthorityLockOrHistory(
  repository: string,
  workdir: string,
): Promise<boolean> {
  const active = (await loadActiveLongTaskAuthority(repository)).authority;
  if (active) return true;
  const runtime = path.join(workdir, ".ty-context");
  const status = await lstat(runtime).catch((error: NodeJS.ErrnoException) => {
    if (error.code === "ENOENT") return null;
    throw error;
  });
  if (!status) return false;
  if (status.isSymbolicLink() || !status.isDirectory()) return true;
  return (await readdir(runtime)).length > 0;
}

function decodeStrictUtf8(bytes: Uint8Array, file: string): string {
  if (
    bytes.length >= 3 &&
    bytes[0] === 0xef &&
    bytes[1] === 0xbb &&
    bytes[2] === 0xbf
  )
    throw new Error(`compact_authoring_utf8_bom_not_allowed:${file}`);
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch (error) {
    throw new Error(
      `compact_authoring_invalid_utf8:${file}:${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

function plainObject(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error(`${label}:plain_object_required`);
  return value as Record<string, unknown>;
}

function sameSnapshot(
  left: CompactAuthoringFileSnapshotV1,
  right: CompactAuthoringFileSnapshotV1,
): boolean {
  return left.sha256 === right.sha256 && left.bytes.equals(right.bytes);
}
