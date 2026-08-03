import type {
  SemanticFactManifestRefV2,
  SemanticFactOutcomeBindingsV2,
} from "./semantic-fact-types.js";
import {
  array,
  EVIDENCE_CAPABILITIES,
  fail,
  literal,
  object,
  PROOF_SURFACES,
  repositoryFile,
  string,
} from "./long-task-delivery-shape.js";

export function parseSemanticFactManifestRef(
  value: unknown,
  label: string,
): SemanticFactManifestRefV2 {
  const row = object(value, label, ["key", "source_path", "sha256"]);
  return {
    key: semanticRef(row.key, `${label}.key`),
    source_path: repositoryFile(row.source_path, `${label}.source_path`),
    sha256: sha256(row.sha256, `${label}.sha256`),
  };
}

export function parseSemanticFactOutcomeBindings(
  value: unknown,
  label: string,
): SemanticFactOutcomeBindingsV2 {
  const row = object(value, label, ["manifest_ref", "facts", "proofs"]);
  return {
    manifest_ref: semanticRef(row.manifest_ref, `${label}.manifest_ref`),
    facts: array(row.facts, `${label}.facts`).map((item, index) => {
      const itemLabel = `${label}.facts[${index}]`;
      const entry = object(
        item,
        itemLabel,
        ["fact_ref", "claim_ref", "applicability_ref"],
        ["fact_revision_digest"],
      );
      return {
        fact_ref: semanticRef(entry.fact_ref, `${itemLabel}.fact_ref`),
        ...(Object.hasOwn(entry, "fact_revision_digest")
          ? {
              fact_revision_digest: sha256(
                entry.fact_revision_digest,
                `${itemLabel}.fact_revision_digest`,
              ),
            }
          : {}),
        claim_ref: semanticRef(entry.claim_ref, `${itemLabel}.claim_ref`),
        applicability_ref: semanticRef(
          entry.applicability_ref,
          `${itemLabel}.applicability_ref`,
        ),
      };
    }),
    proofs: array(row.proofs, `${label}.proofs`).map((item, index) => {
      const itemLabel = `${label}.proofs[${index}]`;
      const preliminary = object(
        item,
        itemLabel,
        [
          "proof_ref",
          "fact_ref",
          "method",
          "proof_surface",
          "evidence_capabilities",
          "authority",
        ],
        [
          "obligation_revision_digest",
          "check_ref",
          "assertion_ref",
          "confirmation_ref",
        ],
      );
      const authority = literal(
        preliminary.authority,
        ["machine", "external_confirmation"] as const,
        `${itemLabel}.authority`,
      );
      if (authority === "machine") {
        requireOwned(preliminary, itemLabel, ["check_ref", "assertion_ref"]);
        forbidOwned(preliminary, itemLabel, ["confirmation_ref"]);
      } else {
        requireOwned(preliminary, itemLabel, ["confirmation_ref"]);
        forbidOwned(preliminary, itemLabel, ["check_ref", "assertion_ref"]);
      }
      const base = {
        proof_ref: semanticRef(preliminary.proof_ref, `${itemLabel}.proof_ref`),
        ...(Object.hasOwn(preliminary, "obligation_revision_digest")
          ? {
              obligation_revision_digest: sha256(
                preliminary.obligation_revision_digest,
                `${itemLabel}.obligation_revision_digest`,
              ),
            }
          : {}),
        fact_ref: semanticRef(preliminary.fact_ref, `${itemLabel}.fact_ref`),
        method: semanticRef(preliminary.method, `${itemLabel}.method`),
        proof_surface: literal(
          preliminary.proof_surface,
          PROOF_SURFACES,
          `${itemLabel}.proof_surface`,
        ),
        evidence_capabilities: array(
          preliminary.evidence_capabilities,
          `${itemLabel}.evidence_capabilities`,
        ).map((capability, capabilityIndex) =>
          literal(
            capability,
            EVIDENCE_CAPABILITIES,
            `${itemLabel}.evidence_capabilities[${capabilityIndex}]`,
          ),
        ),
      };
      return authority === "machine"
        ? {
            ...base,
            authority,
            check_ref: semanticRef(
              preliminary.check_ref,
              `${itemLabel}.check_ref`,
            ),
            assertion_ref: semanticRef(
              preliminary.assertion_ref,
              `${itemLabel}.assertion_ref`,
            ),
          }
        : {
            ...base,
            authority,
            confirmation_ref: semanticRef(
              preliminary.confirmation_ref,
              `${itemLabel}.confirmation_ref`,
            ),
          };
    }),
  };
}

function semanticRef(value: unknown, label: string): string {
  const result = string(value, label);
  if (!/^[a-z0-9][a-z0-9._:-]*$/u.test(result))
    fail(label, "must be a stable lowercase semantic reference");
  return result;
}

function sha256(value: unknown, label: string): string {
  const result = string(value, label);
  if (!/^[a-f0-9]{64}$/u.test(result))
    fail(label, "must be a lowercase SHA-256 digest");
  return result;
}

function requireOwned(
  row: Record<string, unknown>,
  label: string,
  fields: string[],
): void {
  const missing = fields.filter((field) => !Object.hasOwn(row, field));
  if (missing.length) fail(label, `missing keys: ${missing.join(",")}`);
}

function forbidOwned(
  row: Record<string, unknown>,
  label: string,
  fields: string[],
): void {
  const present = fields.filter((field) => Object.hasOwn(row, field));
  if (present.length) fail(label, `forbidden keys: ${present.join(",")}`);
}
