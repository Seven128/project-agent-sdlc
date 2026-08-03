import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import YAML from "yaml";
import { createLongTaskCompactContract } from "../packages/ty-context/dist/lib/long-task-compact-authoring.js";
import { materializeLongTaskCompactCarrier } from "../packages/ty-context/dist/lib/long-task-compact-carrier.js";
import { parseDeliveryContractText } from "../packages/ty-context/dist/lib/long-task-delivery-parser.js";
import { createSemanticFactCompactCarrier } from "../packages/ty-context/dist/lib/semantic-fact-compact-authoring.js";
import { parseSemanticFactCompactCarrierShape } from "../packages/ty-context/dist/lib/semantic-fact-compact-carrier.js";
import { validateSemanticFactManifestPolicy } from "../packages/ty-context/dist/lib/semantic-fact-policy.js";
import {
  parseSemanticFactManifestBlocks,
  parseSemanticFactManifestBlocksForMigration,
} from "../packages/ty-context/dist/lib/semantic-fact-source-parser.js";
import { parseSourceItems } from "../packages/ty-context/dist/lib/long-task-source-item-parser.js";
import { assertProtectedRepositoryFile } from "../packages/ty-context/dist/lib/long-task-protected-files.js";
import {
  canonicalValueJson,
  sha256Hex,
} from "../packages/ty-context/dist/lib/strict-codec.js";

const repository = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const repositoryBackedInputKinds = new Set([
  "context",
  "canonical_spec",
  "repository_preservation",
]);
const options = parseArguments(process.argv.slice(2));
const sourcePath = protectedPath(options.source, "source");
const contractPath = protectedPath(options.contract, "contract");
const sourceBefore = await readFile(sourcePath, "utf8");
const contractBefore = await readFile(contractPath, "utf8");
const sourceRows = parseSemanticFactManifestBlocksForMigration(
  repositoryRelative(sourcePath),
  sourceBefore,
);
if (sourceRows.length !== 1)
  throw new Error(`compact_migration_source_manifest_count:${sourceRows.length}`);
const sourceRow = sourceRows[0];
const manifest = structuredClone(sourceRow.manifest);
const contract = parseDeliveryContractText(contractBefore);
const sourceForItemParsing = options.syncSourceAuthority
  ? replaceSemanticManifestBlock(
      sourceBefore,
      serializeCompactSource(createSemanticFactCompactCarrier(manifest)),
    )
  : sourceBefore;
const sourceAuthoritySync = options.syncSourceAuthority
  ? await synchronizeSourceAuthority(
      repositoryRelative(sourcePath),
      sourceForItemParsing,
      manifest,
      contract,
    )
  : {
      requested: false,
      manifest_inputs_updated: 0,
      source_claims_updated: 0,
      canonical_targets_updated: 0,
      acceptance_assertions_updated: 0,
    };
const compactSource = createSemanticFactCompactCarrier(manifest);
const sourceBody = serializeCompactSource(compactSource);
const sourceAfter = replaceSemanticManifestBlock(sourceBefore, sourceBody);
const compactManifestSha256 = sha256Hex(canonicalValueJson(compactSource));
const currentSourceIdentity = parseSemanticFactCompactCarrierShape(compactSource);

contract.semantic_fact_manifest.sha256 = compactManifestSha256;
const compactContract = createLongTaskCompactContract(
  contract,
  currentSourceIdentity.fact_revisions,
  currentSourceIdentity.obligation_revisions,
);
const contractAfter = preserveEol(
  YAML.stringify(JSON.parse(JSON.stringify(compactContract)), {
    lineWidth: 0,
    indentSeq: false,
    aliasDuplicateObjects: false,
  }),
  contractBefore,
);

const reparsedSourceRows = parseSemanticFactManifestBlocks(
  repositoryRelative(sourcePath),
  sourceAfter,
);
if (reparsedSourceRows.length !== 1)
  throw new Error(
    `compact_migration_reparsed_source_manifest_count:${reparsedSourceRows.length}`,
  );
const reparsedSource = reparsedSourceRows[0];
if (
  reparsedSource.carrier !== "compact_v1" ||
  reparsedSource.sha256 !== compactManifestSha256
)
  throw new Error("compact_migration_source_identity_mismatch");
validateSemanticFactManifestPolicy(reparsedSource.manifest);
const reparsedContract = parseDeliveryContractText(contractAfter);
const expandedCompact = materializeLongTaskCompactCarrier(
  compactContract,
).root;
if (
  canonicalValueJson(reparsedContract) !==
  canonicalValueJson(parseDeliveryContractText(JSON.stringify(expandedCompact)))
)
  throw new Error("compact_migration_contract_roundtrip_mismatch");

if (options.write) {
  await writeFile(sourcePath, sourceAfter, "utf8");
  await writeFile(contractPath, contractAfter, "utf8");
}

process.stdout.write(
  `${JSON.stringify(
    {
      schema_version: "long-task-compact-carrier-migration-v1",
      write: options.write,
      source: measurement(sourceBefore, sourceAfter),
      contract: measurement(contractBefore, contractAfter),
      fact_count: reparsedSource.manifest.facts.length,
      obligation_count: reparsedSource.manifest.proof_obligations.length,
      input_count: reparsedSource.manifest.inputs.length,
      manifest_sha256: compactManifestSha256,
      source_authority_sync: sourceAuthoritySync,
      source_capacity: compactSource.capacity,
      contract_capacity: compactContract.compact_semantic_carrier.capacity,
    },
    null,
    2,
  )}\n`,
);

function parseArguments(arguments_) {
  const result = {
    source: "docs/symbolic-denotation-efficiency.md",
    contract:
      ".work_products/symbolic-denotation-efficiency/delivery-contract.yaml",
    write: false,
    syncSourceAuthority: false,
  };
  for (let index = 0; index < arguments_.length; index += 1) {
    const argument = arguments_[index];
    if (argument === "--write") result.write = true;
    else if (argument === "--sync-source-authority")
      result.syncSourceAuthority = true;
    else if (argument === "--source") result.source = arguments_[++index];
    else if (argument === "--contract") result.contract = arguments_[++index];
    else throw new Error(`compact_migration_unknown_argument:${argument}`);
  }
  return result;
}

async function synchronizeSourceAuthority(
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
        protectedPath(input.source_ref, `input_${input.key}`),
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

function protectedPath(relative, label) {
  if (typeof relative !== "string" || !relative.trim())
    throw new Error(`compact_migration_${label}_path_missing`);
  const target = path.resolve(repository, ...relative.split("/"));
  if (!target.startsWith(`${repository}${path.sep}`))
    throw new Error(`compact_migration_${label}_path_unsafe:${relative}`);
  return target;
}

function repositoryRelative(file) {
  return path.relative(repository, file).split(path.sep).join("/");
}

function replaceSemanticManifestBlock(source, body) {
  const startPattern =
    /```yaml (?:semantic-fact-manifest-v1|semantic-fact-compact-carrier-v1)\r?\n/gu;
  const matches = [...source.matchAll(startPattern)];
  if (matches.length !== 1)
    throw new Error(`compact_migration_formal_block_count:${matches.length}`);
  const start = matches[0].index;
  const bodyStart = start + matches[0][0].length;
  const endMatch = /\r?\n```/gu;
  endMatch.lastIndex = bodyStart;
  const end = endMatch.exec(source);
  if (!end) throw new Error("compact_migration_formal_block_unclosed");
  const eol = source.includes("\r\n") ? "\r\n" : "\n";
  const replacement = `\`\`\`yaml semantic-fact-compact-carrier-v1${eol}${body.replace(/\n/gu, eol)}${eol}\`\`\``;
  return `${source.slice(0, start)}${replacement}${source.slice(end.index + end[0].length)}`;
}

function serializeCompactSource(compactSource) {
  return YAML.stringify(JSON.parse(JSON.stringify(compactSource)), {
    lineWidth: 0,
    indentSeq: false,
    aliasDuplicateObjects: false,
  }).trimEnd();
}

function preserveEol(content, reference) {
  return reference.includes("\r\n") ? content.replace(/\n/gu, "\r\n") : content;
}

function measurement(before, after) {
  const beforeBytes = Buffer.byteLength(before, "utf8");
  const afterBytes = Buffer.byteLength(after, "utf8");
  return {
    before_bytes: beforeBytes,
    after_bytes: afterBytes,
    saved_bytes: beforeBytes - afterBytes,
    ratio: Number((afterBytes / beforeBytes).toFixed(6)),
    before_lines: before.split(/\r?\n/u).length,
    after_lines: after.split(/\r?\n/u).length,
  };
}
