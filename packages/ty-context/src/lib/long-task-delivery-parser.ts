import { readFile } from "node:fs/promises";
import path from "node:path";
import { materializeLongTaskCompactCarrier } from "./long-task-compact-carrier.js";
import { parseStrictYaml, sha256Hex } from "./strict-codec.js";
import { validateDeliveryContractStructure } from "./long-task-delivery-validation.js";
import {
  parseOutcome,
  parseOutcomeFragment,
  safeFragmentPath,
} from "./long-task-outcome-parser.js";
import { assertProtectedRepositoryFile } from "./long-task-protected-files.js";
import {
  array,
  literal,
  object,
  parseSourceClaims,
  strings,
} from "./long-task-delivery-shape.js";
import type {
  DeliveryContractV2,
  DeliveryOutcomeV2,
} from "./long-task-delivery-types.js";
import {
  parseGlobal,
  parseRisk,
  parseStages,
  parseTask,
} from "./long-task-root-shape.js";
import { parseSemanticFactManifestRef } from "./long-task-semantic-fact-shape.js";
import { repositoryRoot } from "./long-task-workspace.js";
import {
  assertNoSemanticDriftMigration,
  semanticDriftMigrationFields,
} from "./long-task-semantic-drift-migration.js";

export const DELIVERY_CONTRACT_FILE = "delivery-contract.yaml";

export interface ParsedDeliveryContractV2 {
  contract: DeliveryContractV2;
  contract_files: Record<string, string>;
  outcome_files: string[];
}

export interface ParseDeliveryContractOptions {
  validate_structure?: boolean;
}

export async function parseDeliveryContract(
  workdir: string,
): Promise<DeliveryContractV2> {
  return (await parseDeliveryContractBundle(workdir)).contract;
}

export async function parseDeliveryContractBundle(
  workdirInput: string,
  repositoryInput?: string,
  options: ParseDeliveryContractOptions = {},
): Promise<ParsedDeliveryContractV2> {
  const workdir = path.resolve(workdirInput);
  const file = path.join(workdir, DELIVERY_CONTRACT_FILE);
  const repository = repositoryInput
    ? path.resolve(repositoryInput)
    : await repositoryRoot(workdir);
  const raw = await readFile(
    await assertProtectedRepositoryFile(repository, file, "delivery_contract"),
    "utf8",
  );
  let root = parseRoot(raw, true);
  if (Object.hasOwn(root, "compact_semantic_carrier")) {
    root = materializeLongTaskCompactCarrier(root).root;
    assertNoSemanticDriftMigration(semanticDriftMigrationFields(root));
  }
  const hasInline = Object.hasOwn(root, "outcomes");
  const hasFiles = Object.hasOwn(root, "outcome_files");
  if (hasInline === hasFiles)
    throw new Error(
      "delivery_contract_invalid:$:exactly one of outcomes or outcome_files is required",
    );
  const files: Record<string, string> = {};
  let outcomes: DeliveryOutcomeV2[];
  let outcomeFiles: string[] = [];
  if (hasInline) {
    outcomes = array(root.outcomes, "outcomes").map((item, index) =>
      parseOutcome(item, `outcomes[${index}]`),
    );
  } else {
    outcomeFiles = strings(root.outcome_files, "outcome_files")
      .map((item, index) => safeFragmentPath(item, index))
      .sort();
    if (new Set(outcomeFiles).size !== outcomeFiles.length)
      throw new Error("delivery_contract_invalid:outcome_files:duplicate path");
    outcomes = [];
    for (const relative of outcomeFiles) {
      const target = path.resolve(workdir, ...relative.split("/"));
      if (!target.startsWith(`${workdir}${path.sep}`))
        throw new Error(`unsafe_path:outcome_files:${relative}`);
      const protectedFragment = await assertProtectedRepositoryFile(
        repository,
        target,
        `outcome_fragment:${relative}`,
      ).catch((error) => {
        if (
          error instanceof Error &&
          error.message.startsWith("protected_input_not_found:")
        )
          throw new Error(`outcome_fragment_not_found:${relative}`);
        throw error;
      });
      const fragmentRaw = await readFile(protectedFragment, "utf8");
      files[relative] = sha256Hex(fragmentRaw);
      outcomes.push(...parseOutcomeFragment(fragmentRaw, relative));
    }
    outcomes.sort((left, right) => left.key.localeCompare(right.key));
  }
  const contract = parseContractRoot(root, outcomes);
  if (options.validate_structure !== false)
    validateDeliveryContractStructure(contract);
  return {
    contract,
    contract_files: Object.fromEntries(
      Object.entries(files).sort(([a], [b]) => a.localeCompare(b)),
    ),
    outcome_files: outcomeFiles,
  };
}

export function parseDeliveryContractText(raw: string): DeliveryContractV2 {
  let root = parseRoot(raw, false);
  if (Object.hasOwn(root, "compact_semantic_carrier")) {
    root = materializeLongTaskCompactCarrier(root).root;
    assertNoSemanticDriftMigration(semanticDriftMigrationFields(root));
  }
  const contract = parseContractRoot(
    root,
    array(root.outcomes, "outcomes").map((item, index) =>
      parseOutcome(item, `outcomes[${index}]`),
    ),
  );
  validateDeliveryContractStructure(contract);
  return contract;
}

function parseRoot(raw: string, bundle: boolean): Record<string, unknown> {
  const decoded = parseStrictYaml(raw);
  if (
    decoded &&
    typeof decoded === "object" &&
    !Array.isArray(decoded) &&
    (decoded as Record<string, unknown>).schema_version ===
      "long-task-delivery-v1"
  )
    throw new Error("long_task_delivery_v1_retired_use_v2");
  if (
    !decoded ||
    typeof decoded !== "object" ||
    Array.isArray(decoded) ||
    !Object.hasOwn(decoded, "compact_semantic_carrier")
  )
    assertNoSemanticDriftMigration(semanticDriftMigrationFields(decoded));
  const root = object(
    decoded,
    "$",
    [
      "schema_version",
      "semantic_fact_manifest",
      "task",
      "stages",
      "risk",
      "global",
    ],
    bundle
      ? [
          "source_claims",
          "compact_semantic_carrier",
          "outcomes",
          "outcome_files",
        ]
      : ["source_claims", "compact_semantic_carrier", "outcomes"],
  );
  const hasExpanded = Object.hasOwn(root, "source_claims");
  const hasCompact = Object.hasOwn(root, "compact_semantic_carrier");
  if (hasExpanded === hasCompact)
    throw new Error(
      "delivery_contract_invalid:$:exactly one of source_claims or compact_semantic_carrier is required",
    );
  return root;
}

function parseContractRoot(
  root: Record<string, unknown>,
  outcomes: DeliveryOutcomeV2[],
): DeliveryContractV2 {
  literal(
    root.schema_version,
    ["long-task-delivery-v2"] as const,
    "schema_version",
  );
  return {
    schema_version: "long-task-delivery-v2",
    semantic_fact_manifest: parseSemanticFactManifestRef(
      root.semantic_fact_manifest,
      "semantic_fact_manifest",
    ),
    task: parseTask(root.task),
    source_claims: parseSourceClaims(root.source_claims, "source_claims"),
    stages: parseStages(root.stages),
    risk: parseRisk(root.risk),
    global: parseGlobal(root.global),
    outcomes,
  };
}
