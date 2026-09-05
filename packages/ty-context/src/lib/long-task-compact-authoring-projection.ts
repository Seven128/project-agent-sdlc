import { Buffer } from "node:buffer";
import { createLongTaskCompactContract } from "./long-task-compact-authoring.js";
import {
  compactAuthoringByteDelta,
  type CompactAuthoringStatusV1,
  type LongTaskCompactAuthoringReportV1,
} from "./long-task-compact-authoring-report.js";
import { parseDeliveryContractText } from "./long-task-delivery-parser.js";
import type { DeliveryContractV2 } from "./long-task-delivery-types.js";
import {
  createSemanticFactCompactCarrier,
  normalizeSemanticFactManifestForCompactAuthoring,
} from "./semantic-fact-compact-authoring.js";
import {
  parseSemanticFactManifestBlocks,
  type ParsedSemanticFactManifestV1,
  type SemanticFactManifestBlockSpanV1,
} from "./semantic-fact-source-parser.js";
import { canonicalValueJson } from "./strict-codec.js";

export interface CompactAuthoringProjectionInputV1 {
  contract: DeliveryContractV2;
  raw_contract: Record<string, unknown>;
  source_carrier: unknown;
  source: ParsedSemanticFactManifestV1;
  span: SemanticFactManifestBlockSpanV1;
  source_text: string;
  source_path: string;
  contract_path: string;
  workdir: string;
  authority_lock_present: boolean;
}

export interface CompactAuthoringProjectionV1 {
  report: LongTaskCompactAuthoringReportV1;
  source_after: Buffer;
  contract_after: Buffer;
}

export function projectLongTaskCompactAuthoring(
  input: CompactAuthoringProjectionInputV1,
): CompactAuthoringProjectionV1 {
  const compactSource = createSemanticFactCompactCarrier(input.source.manifest);
  const compactBlock = [
    "```yaml semantic-fact-compact-carrier-v1",
    canonicalValueJson(compactSource),
    "```",
  ].join(input.span.line_ending);
  const sourcePrefix = input.source_text.slice(0, input.span.start_offset);
  const sourceSuffix = input.source_text.slice(input.span.end_offset);
  const sourceAfterText = `${sourcePrefix}${compactBlock}${sourceSuffix}`;
  const candidateSourceRows = parseSemanticFactManifestBlocks(
    input.source_path,
    sourceAfterText,
  );
  if (candidateSourceRows.length !== 1)
    throw new Error(
      `compact_authoring_candidate_manifest_count_invalid:${candidateSourceRows.length}`,
    );
  const candidateSource = candidateSourceRows[0]!;

  const contractForCompaction = structuredClone(input.contract);
  contractForCompaction.semantic_fact_manifest.sha256 = candidateSource.sha256;
  const compactContract = createLongTaskCompactContract(
    contractForCompaction,
    candidateSource.fact_revisions,
    candidateSource.obligation_revisions,
  );
  const contractAfterText = `${canonicalValueJson(compactContract)}\n`;
  const candidateContract = parseDeliveryContractText(contractAfterText);

  const equivalence = {
    normalized_semantic_manifest:
      canonicalValueJson(
        normalizeSemanticFactManifestForCompactAuthoring(input.source.manifest),
      ) ===
      canonicalValueJson(
        normalizeSemanticFactManifestForCompactAuthoring(
          candidateSource.manifest,
        ),
      ),
    normalized_contract:
      canonicalValueJson(
        normalizedContract(
          input.contract,
          input.source.fact_revisions,
          input.source.obligation_revisions,
        ),
      ) ===
      canonicalValueJson(
        normalizedContract(
          candidateContract,
          candidateSource.fact_revisions,
          candidateSource.obligation_revisions,
        ),
      ),
    fact_identity_set: sameIdentitySet(
      input.source.fact_revisions,
      candidateSource.fact_revisions,
    ),
    obligation_identity_set: sameIdentitySet(
      input.source.obligation_revisions,
      candidateSource.obligation_revisions,
    ),
    retained_source_outside_formal_block:
      `${sourcePrefix}${sourceSuffix}` ===
      `${sourceAfterText.slice(0, input.span.start_offset)}${sourceAfterText.slice(
        input.span.start_offset + compactBlock.length,
      )}`,
  };
  const sourceBytes = compactAuthoringByteDelta(
    canonicalBytes(input.source_carrier),
    canonicalBytes(compactSource),
  );
  const contractBytes = compactAuthoringByteDelta(
    canonicalBytes(input.raw_contract),
    canonicalBytes(compactContract),
  );
  const combinedBytes = compactAuthoringByteDelta(
    sourceBytes.before_canonical_bytes + contractBytes.before_canonical_bytes,
    sourceBytes.after_canonical_bytes + contractBytes.after_canonical_bytes,
  );
  const bothCompact =
    input.source.carrier === "compact_v1" &&
    Object.hasOwn(input.raw_contract, "compact_semantic_carrier");
  const allEquivalent = Object.values(equivalence).every(Boolean);
  const classification = classifyProjection(
    allEquivalent,
    bothCompact,
    combinedBytes.reduction_bytes,
    combinedBytes.reduction_ratio,
    input.authority_lock_present,
  );
  const report: LongTaskCompactAuthoringReportV1 = {
    schema_version: "long-task-compact-authoring-report-v1",
    status: classification.status,
    authority_lock_present: input.authority_lock_present,
    applied: false,
    apply_allowed:
      classification.status === "equivalent_projection_available" &&
      !input.authority_lock_present,
    source_path: input.source_path,
    contract_path: input.contract_path,
    canonical_bytes: {
      source: sourceBytes,
      contract: contractBytes,
      combined: combinedBytes,
    },
    counts: {
      facts_before: input.source.manifest.facts.length,
      facts_after: candidateSource.manifest.facts.length,
      obligations_before: input.source.manifest.proof_obligations.length,
      obligations_after: candidateSource.manifest.proof_obligations.length,
      assertions_before: assertionCount(input.contract),
      assertions_after: assertionCount(candidateContract),
      fact_revision_identities_before: input.source.fact_revisions.length,
      fact_revision_identities_after: candidateSource.fact_revisions.length,
      obligation_revision_identities_before:
        input.source.obligation_revisions.length,
      obligation_revision_identities_after:
        candidateSource.obligation_revisions.length,
    },
    equivalence,
    diagnostic_code: classification.diagnostic_code,
    reason: classification.reason,
    repair_command:
      classification.status === "equivalent_projection_available" &&
      !input.authority_lock_present
        ? `ty-context long-task compact-authoring ${JSON.stringify(input.workdir)} --apply`
        : null,
  };
  return {
    report,
    source_after: Buffer.from(sourceAfterText, "utf8"),
    contract_after: Buffer.from(contractAfterText, "utf8"),
  };
}

function classifyProjection(
  allEquivalent: boolean,
  bothCompact: boolean,
  reductionBytes: number,
  reductionRatio: number,
  authorityLockPresent: boolean,
): {
  status: CompactAuthoringStatusV1;
  diagnostic_code: string;
  reason: string;
} {
  if (!allEquivalent)
    return {
      status: "blocked",
      diagnostic_code: "compact_authoring_equivalence_failed",
      reason:
        "Compact projection did not preserve every required normalized semantic, Contract, identity-set, and retained-Source equivalence.",
    };
  if (bothCompact)
    return {
      status: "already_compact",
      diagnostic_code: "compact_authoring_already_compact",
      reason: "Source and Contract already use the admitted compact carriers.",
    };
  if (reductionBytes <= 0)
    return {
      status: "not_beneficial",
      diagnostic_code: "compact_authoring_not_beneficial",
      reason:
        "The equivalent compact projection does not reduce canonical representation bytes.",
    };
  return {
    status: "equivalent_projection_available",
    diagnostic_code: authorityLockPresent
      ? "compact_authoring_authority_lock_present"
      : "equivalent_compact_representation_available",
    reason: authorityLockPresent
      ? "An equivalent compact projection exists, but compact authoring is allowed only before the first Authority Lock."
      : `An equivalent compact projection reduces canonical representation bytes by ${reductionBytes} (${(
          reductionRatio * 100
        ).toFixed(2)}%).`,
  };
}

function normalizedContract(
  contract: DeliveryContractV2,
  factRevisions: Array<{ key: string; revision_digest: string }>,
  obligationRevisions: Array<{ key: string; revision_digest: string }>,
): DeliveryContractV2 {
  const normalized = structuredClone(contract);
  normalized.semantic_fact_manifest.sha256 = "<semantic-carrier-digest>";
  const factRevisionByKey = new Map(
    factRevisions.map((item) => [item.key, item.revision_digest]),
  );
  const obligationRevisionByKey = new Map(
    obligationRevisions.map((item) => [item.key, item.revision_digest]),
  );
  for (const outcome of normalized.outcomes) {
    for (const binding of outcome.semantic_fact_bindings.facts) {
      const revision = factRevisionByKey.get(binding.fact_ref);
      if (!binding.fact_revision_digest && revision)
        binding.fact_revision_digest = revision;
    }
    for (const binding of outcome.semantic_fact_bindings.proofs) {
      const revision = obligationRevisionByKey.get(binding.proof_ref);
      if (!binding.obligation_revision_digest && revision)
        binding.obligation_revision_digest = revision;
    }
  }
  return normalized;
}

function sameIdentitySet(
  left: Array<{ key: string; revision_digest: string }>,
  right: Array<{ key: string; revision_digest: string }>,
): boolean {
  const normalize = (rows: Array<{ key: string; revision_digest: string }>) =>
    [...rows].sort((a, b) =>
      `${a.key}\0${a.revision_digest}`.localeCompare(
        `${b.key}\0${b.revision_digest}`,
      ),
    );
  return (
    canonicalValueJson(normalize(left)) === canonicalValueJson(normalize(right))
  );
}

function assertionCount(contract: DeliveryContractV2): number {
  return [
    ...contract.global.acceptance.checks,
    ...contract.outcomes.flatMap((outcome) => outcome.acceptance.checks),
  ].reduce(
    (sum, check) =>
      sum + check.positive_assertions.length + check.negative_assertions.length,
    0,
  );
}

function canonicalBytes(value: unknown): number {
  return Buffer.byteLength(canonicalValueJson(value), "utf8");
}
