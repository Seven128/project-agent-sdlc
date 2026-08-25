import type { AcceptanceObligationReachabilityV1 } from "./long-task-acceptance-reachability.js";
import type {
  CompiledDeliveryContractV2,
  ExternalConfirmationV2,
  WorkspaceManifestV2,
} from "./long-task-delivery-types.js";
import type { RelevantExternalInputIdentityV1 } from "./long-task-external-confirmation-types.js";
import { matchesRepoPattern } from "./long-task-paths.js";
import { canonicalValueJson, sha256Hex } from "./strict-codec.js";

export function deriveRelevantExternalInputIdentity(
  compiled: CompiledDeliveryContractV2,
  confirmationRef: string,
  manifest: WorkspaceManifestV2,
): RelevantExternalInputIdentityV1 {
  const confirmation = requiredConfirmation(compiled, confirmationRef);
  if (confirmation.blocks_target) return wholeCandidateIdentity(manifest);
  const rows = externalRows(compiled, confirmationRef);
  const outcomeKeys = [...new Set(rows.map((row) => row.outcome_key))];
  if (!rows.length || outcomeKeys.some((key) => key === null))
    return wholeCandidateIdentity(manifest);
  const outcomes = outcomeKeys.map((key) =>
    compiled.outcomes.find((outcome) => outcome.key === key),
  );
  if (
    outcomes.some(
      (outcome) =>
        !outcome ||
        !outcome.product.owner.path_globs.length ||
        !outcome.technical.bindings.length ||
        outcome.technical.bindings.some(
          (binding) => !binding.carrier_paths.length,
        ),
    )
  )
    return wholeCandidateIdentity(manifest);
  const patterns = [
    ...new Set(
      outcomes.flatMap((outcome) => [
        ...outcome!.product.owner.path_globs,
        ...outcome!.technical.expected_change_paths,
        ...outcome!.technical.allowed_support_paths,
        ...outcome!.technical.bindings.flatMap((binding) => [
          ...(binding.kind === "file" || binding.kind === "path_glob"
            ? [binding.target]
            : []),
          ...binding.carrier_paths,
        ]),
      ]),
    ),
  ].sort();
  if (!patterns.length) return wholeCandidateIdentity(manifest);
  const files = manifest.files
    .filter((file) =>
      patterns.some((pattern) => matchesRepoPattern(file.path, pattern)),
    )
    .map((file) => ({
      path: file.path,
      mode: file.mode,
      size: file.size,
      sha256: file.sha256,
    }))
    .sort((left, right) => left.path.localeCompare(right.path));
  const digest = sha256Hex(
    canonicalValueJson({ mode: "bounded_paths", patterns, files }),
  );
  return {
    mode: "bounded_paths",
    identity: `bounded:${digest}`,
    paths: files.map((file) => file.path),
  };
}

export function externalRows(
  compiled: CompiledDeliveryContractV2,
  confirmationRef: string,
): AcceptanceObligationReachabilityV1[] {
  return compiled.acceptance_reachability.obligations.filter(
    (row) =>
      row.status === "external_fulfillable" &&
      row.confirmation_ref === confirmationRef,
  );
}

export function requiredConfirmation(
  compiled: CompiledDeliveryContractV2,
  confirmationRef: string,
): ExternalConfirmationV2 {
  const confirmation = compiled.global.acceptance.external_confirmations.find(
    (candidate) => candidate.key === confirmationRef,
  );
  if (!confirmation)
    throw new Error(`external_confirmation_unknown:${confirmationRef}`);
  return confirmation;
}

export function sameSet(
  left: readonly string[],
  right: readonly string[],
): boolean {
  return (
    left.length === right.length &&
    new Set(left).size === left.length &&
    left.every((item) => right.includes(item))
  );
}

export function sameValue(left: unknown, right: unknown): boolean {
  return canonicalValueJson(left) === canonicalValueJson(right);
}

function wholeCandidateIdentity(
  manifest: WorkspaceManifestV2,
): RelevantExternalInputIdentityV1 {
  return {
    mode: "whole_candidate",
    identity: `whole:${manifest.snapshot_sha256}`,
    paths: manifest.files.map((file) => file.path).sort(),
  };
}
