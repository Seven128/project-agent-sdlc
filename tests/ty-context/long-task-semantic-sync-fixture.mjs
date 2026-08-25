import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import YAML from "yaml";
import {
  containsDesignResourceHandoff,
  parseDesignResourceHandoffMarkdown,
} from "../../packages/ty-context/dist/lib/design-resource-handoff-parser.js";
import { parseSourceItems } from "../../packages/ty-context/dist/lib/long-task-source-item-parser.js";
import { fixtureOracleSource } from "./long-task-semantic-oracle-fixture.mjs";
import {
  PACKAGE_EXACT_ORACLE_IDENTITY,
  packageAdmittedFixtureSemanticManifest,
  refreshPackageMachineFixtureOracle,
} from "./long-task-package-machine-fixture.mjs";
import {
  refreshFixtureSemanticManifest,
  semanticManifestIdentity,
} from "./long-task-semantic-refresh-fixture.mjs";
import { reconcileFixtureSemanticManifest } from "./long-task-semantic-reconcile-fixture.mjs";

export async function synchronizeFixtureSemanticManifest(
  workdir,
  contract,
  { designSemanticProjection } = {},
) {
  const root = path.dirname(workdir);
  const sourcePath =
    contract.semantic_fact_manifest?.source_path ?? "source.md";
  const absoluteSourcePath = path.join(root, ...sourcePath.split("/"));
  let source = await readFile(absoluteSourcePath, "utf8");
  const existingManifest = embeddedFixtureSemanticManifest(source);
  const existingManifestIdentity = existingManifest
    ? semanticManifestIdentity(existingManifest)
    : null;
  source = stripSemanticFactManifest(source);
  const manifest =
    existingManifest ??
    packageAdmittedFixtureSemanticManifest({
      twoOutcomes: contract.outcomes.length > 1,
      externalConfirmation: contract.source_claims.some(
        (claim) => claim.disposition.type === "external_confirmation",
      ),
    });
  const inventory = await fixtureSemanticSourceInventory(
    root,
    sourcePath,
    source,
    contract,
    designSemanticProjection,
  );
  if (!inventory) {
    await persistFixtureSemanticManifest(
      absoluteSourcePath,
      source,
      contract,
      manifest,
      root,
      sourcePath,
      existingManifestIdentity !== semanticManifestIdentity(manifest),
    );
    return;
  }
  const authorityItems = inventory.items.filter(
    (item) => !inventory.designOwnedSourceItemRefs.has(item.key),
  );
  const authorityRefs = authorityItems.map((item) => item.key);
  const primaryAuthority = authorityRefs[0];
  await reconcileFixtureSemanticManifest(
    root,
    contract,
    manifest,
    inventory,
    authorityRefs,
    primaryAuthority,
  );
  refreshFixtureSemanticManifest(manifest);
  await persistFixtureSemanticManifest(
    absoluteSourcePath,
    source,
    contract,
    manifest,
    root,
    sourcePath,
    existingManifestIdentity !== semanticManifestIdentity(manifest),
  );
}

async function fixtureSemanticSourceInventory(
  root,
  sourcePath,
  source,
  contract,
  designSemanticProjection,
) {
  try {
    const items = [];
    const designOwnedSourceItemRefs = new Set();
    const sourcePaths = [
      ...new Set([sourcePath, ...(contract.task?.source_paths ?? [])]),
    ];
    for (const candidatePath of sourcePaths) {
      const content =
        candidatePath === sourcePath
          ? source
          : await readFile(
              path.join(root, ...candidatePath.split("/")),
              "utf8",
            );
      const parsedItems = parseSourceItems(candidatePath, content);
      items.push(...parsedItems);
      if (containsDesignResourceHandoff(content)) {
        const designHandoff = parseDesignResourceHandoffMarkdown(
          candidatePath,
          content,
        );
        for (const key of designHandoff.source_item_keys)
          designOwnedSourceItemRefs.add(key);
      }
    }
    const designFactRefsBySource = new Map();
    for (const fact of designSemanticProjection?.facts ?? [])
      for (const sourceItemRef of fact.source_item_refs) {
        const refs = designFactRefsBySource.get(sourceItemRef) ?? [];
        refs.push(fact.key);
        designFactRefsBySource.set(sourceItemRef, refs);
      }
    return { items, designOwnedSourceItemRefs, designFactRefsBySource };
  } catch {
    return null;
  }
}

async function persistFixtureSemanticManifest(
  absoluteSourcePath,
  source,
  contract,
  manifest,
  root,
  sourcePath,
  rewriteOracle,
) {
  const normalizedSource = source.trimEnd();
  const serialized = YAML.stringify(JSON.parse(JSON.stringify(manifest)), {
    lineWidth: 0,
  }).trimEnd();
  await writeFile(
    absoluteSourcePath,
    `${normalizedSource}\n\n\`\`\`yaml semantic-fact-manifest-v1\n${serialized}\n\`\`\`\n`,
  );
  if (rewriteOracle && fixtureOracleParticipatesInVerification(contract)) {
    if (
      manifest.oracles.some(
        (oracle) => oracle.identity === PACKAGE_EXACT_ORACLE_IDENTITY,
      )
    )
      await refreshPackageMachineFixtureOracle(root, manifest);
    else
      await writeFile(
        path.join(root, "tests", "oracle.mjs"),
        fixtureOracleSource(manifest),
      );
  }
  contract.semantic_fact_manifest = {
    key: manifest.key,
    source_path: sourcePath,
    sha256: semanticManifestIdentity(manifest),
  };
}

function fixtureOracleParticipatesInVerification(contract) {
  const checks = [
    ...(contract.global?.acceptance?.checks ?? []),
    ...(contract.outcomes ?? []).flatMap(
      (outcome) => outcome.acceptance?.checks ?? [],
    ),
  ];
  return checks.some(
    (check) =>
      check.runner?.target === "tests/oracle.mjs" ||
      check.verification_inputs?.includes("tests/oracle.mjs"),
  );
}

function stripSemanticFactManifest(source) {
  return source.replace(
    /^```yaml[ \t]+semantic-fact-manifest-v1[ \t]*\r?\n[\s\S]*?^```[ \t]*\r?$(?:\r?\n)?/gmu,
    "",
  );
}

function embeddedFixtureSemanticManifest(source) {
  const match = source.match(
    /^```yaml[ \t]+semantic-fact-manifest-v1[ \t]*\r?\n([\s\S]*?)^```[ \t]*$/mu,
  );
  if (!match) return null;
  try {
    return YAML.parse(match[1]);
  } catch {
    return null;
  }
}
