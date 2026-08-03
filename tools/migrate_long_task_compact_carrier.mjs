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
import {
  canonicalValueJson,
  sha256Hex,
} from "../packages/ty-context/dist/lib/strict-codec.js";
import { synchronizeSourceAuthority } from "./migrate_long_task_compact_carrier_authority.mjs";

const repository = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
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
  throw new Error(
    `compact_migration_source_manifest_count:${sourceRows.length}`,
  );
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
      repository,
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
const currentSourceIdentity =
  parseSemanticFactCompactCarrierShape(compactSource);

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
const expandedCompact = materializeLongTaskCompactCarrier(compactContract).root;
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
