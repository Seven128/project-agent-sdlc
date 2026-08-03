import { readFile } from "node:fs/promises";
import path from "node:path";
import { assertProtectedRepositoryFile } from "../packages/ty-context/dist/lib/long-task-protected-files.js";
import { parseSourceItems } from "../packages/ty-context/dist/lib/long-task-source-item-parser.js";
import { sha256Hex } from "../packages/ty-context/dist/lib/strict-codec.js";

const repositoryBackedInputKinds = new Set([
  "context",
  "canonical_spec",
  "repository_preservation",
]);

export async function synchronizeSourceAuthority(
  repository,
  sourcePath,
  source,
  manifest,
  contract,
) {
  const items = parseSourceItems(sourcePath, source);
  const itemByKey = new Map(items.map((item) => [item.key, item]));
  if (itemByKey.size !== items.length)
    throw new Error("compact_migration_source_item_key_duplicate");
  let manifestInputsUpdated = 0;
  for (const input of manifest.inputs) {
    let currentSha256 = null;
    if (input.kind === "source_item") {
      const item = itemByKey.get(input.source_ref);
      if (!item)
        throw new Error(
          `compact_migration_source_input_missing:${input.key}:${input.source_ref}`,
        );
      currentSha256 = item.text_sha256;
    } else if (repositoryBackedInputKinds.has(input.kind)) {
      const inputPath = await assertProtectedRepositoryFile(
        repository,
        protectedPath(repository, input.source_ref, `input_${input.key}`),
        `compact_migration_input:${input.key}`,
      );
      currentSha256 = sha256Hex(await readFile(inputPath));
    }
    if (currentSha256 && input.sha256 !== currentSha256) {
      input.sha256 = currentSha256;
      manifestInputsUpdated += 1;
    }
  }

  const claimByKey = new Map(
    contract.source_claims.map((claim) => [claim.key, claim]),
  );
  if (
    claimByKey.size !== contract.source_claims.length ||
    claimByKey.size !== itemByKey.size ||
    [...itemByKey.keys()].some((key) => !claimByKey.has(key))
  )
    throw new Error("compact_migration_source_claim_key_set_mismatch");
  let sourceClaimsUpdated = 0;
  let canonicalTargetsUpdated = 0;
  let acceptanceAssertionsUpdated = 0;
  for (const item of items) {
    const claim = claimByKey.get(item.key);
    if (claim.source_ref !== sourcePath)
      throw new Error(
        `compact_migration_source_ref_mismatch:${item.key}:${claim.source_ref}:${sourcePath}`,
      );
    if (claim.statement === item.normalized_text) continue;
    claim.statement = item.normalized_text;
    sourceClaimsUpdated += 1;
    acceptanceAssertionsUpdated += synchronizeCanonicalTarget(
      contract,
      claim,
      item.normalized_text,
    );
    canonicalTargetsUpdated += 1;
  }
  return {
    requested: true,
    manifest_inputs_updated: manifestInputsUpdated,
    source_claims_updated: sourceClaimsUpdated,
    canonical_targets_updated: canonicalTargetsUpdated,
    acceptance_assertions_updated: acceptanceAssertionsUpdated,
  };
}

function synchronizeCanonicalTarget(contract, claim, statement) {
  if (claim.disposition.type === "claim") {
    if (claim.disposition.refs.length !== 1)
      throw new Error(
        `compact_migration_claim_target_count:${claim.key}:${claim.disposition.refs.length}`,
      );
    const target = resolveClaimTarget(contract, claim.disposition.refs[0]);
    if (!target)
      throw new Error(
        `compact_migration_claim_target_missing:${claim.key}:${claim.disposition.refs[0]}`,
      );
    const assertionsUpdated = synchronizeClaimAssertions(
      contract,
      claim.disposition.refs[0],
      target.statement,
      statement,
    );
    target.statement = statement;
    return assertionsUpdated;
  }
  if (claim.disposition.type === "acceptance") {
    if (claim.disposition.refs.length !== 1)
      throw new Error(
        `compact_migration_acceptance_target_count:${claim.key}:${claim.disposition.refs.length}`,
      );
    const target = resolveAssertionTarget(contract, claim.disposition.refs[0]);
    if (!target)
      throw new Error(
        `compact_migration_acceptance_target_missing:${claim.key}:${claim.disposition.refs[0]}`,
      );
    target.criterion = statement;
    return 1;
  }
  throw new Error(
    `compact_migration_changed_source_disposition_unsupported:${claim.key}:${claim.disposition.type}`,
  );
}

function synchronizeClaimAssertions(
  contract,
  fullClaimRef,
  previousStatement,
  statement,
) {
  for (const outcome of contract.outcomes) {
    const prefix = `${outcome.key}.`;
    if (!fullClaimRef.startsWith(prefix)) continue;
    const localClaimRef = fullClaimRef.slice(prefix.length);
    let updated = 0;
    for (const check of outcome.acceptance.checks)
      for (const assertion of [
        ...check.positive_assertions,
        ...check.negative_assertions,
      ])
        if (
          assertion.criterion === previousStatement &&
          assertion.claims.includes(localClaimRef)
        ) {
          assertion.criterion = statement;
          updated += 1;
        }
    return updated;
  }
  return 0;
}

function resolveClaimTarget(contract, ref) {
  for (const outcome of contract.outcomes) {
    const prefix = `${outcome.key}.`;
    if (!ref.startsWith(prefix)) continue;
    const remainder = ref.slice(prefix.length);
    const collections = [
      ["requirement.", outcome.product.requirements],
      ["obligation.", outcome.technical.obligations],
      ["forbidden_shortcut.", outcome.technical.forbidden_shortcuts],
      ["non_completing.", outcome.product.non_completing_outcomes],
    ];
    for (const [kind, rows] of collections)
      if (remainder.startsWith(kind))
        return rows.find((row) => row.key === remainder.slice(kind.length));
  }
  return null;
}

function resolveAssertionTarget(contract, ref) {
  for (const outcome of contract.outcomes)
    for (const check of outcome.acceptance.checks) {
      const prefix = `${outcome.key}.${check.key}.`;
      if (!ref.startsWith(prefix)) continue;
      const key = ref.slice(prefix.length);
      return [...check.positive_assertions, ...check.negative_assertions].find(
        (assertion) => assertion.key === key,
      );
    }
  return null;
}

function protectedPath(repository, relative, label) {
  if (typeof relative !== "string" || !relative.trim())
    throw new Error(`compact_migration_${label}_path_missing`);
  const target = path.resolve(repository, ...relative.split("/"));
  if (!target.startsWith(`${repository}${path.sep}`))
    throw new Error(`compact_migration_${label}_path_unsafe:${relative}`);
  return target;
}
