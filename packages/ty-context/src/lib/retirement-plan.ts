import { captureMutationFileState } from "./context-mutation/mutation-file-state.js";
import { rawSchemaVersion } from "./schema-guard.js";
import { harnessConfigPath, harnessRoot } from "./harness-root.js";
import { parseYaml, stringifyYaml } from "./yaml.js";
import { assertLegacyContextTransactionSettled } from "./retirement-preflight.js";
import { migrateDefaultBodySelection } from "./retirement-defaults.js";
import {
  inspectRetirementAssets,
  type RetirementFile,
} from "./retirement-assets.js";
import {
  inspectRetirementBinding,
  type RetirementBinding,
} from "./retirement-binding.js";
import { prepareStartupInstructions } from "./sync-engine.js";
import { loadContextCatalog } from "./context-catalog/catalog-load.js";
import { inspectRetirementReferences } from "./retirement-references.js";

export interface RetirementPlan {
  files: RetirementFile[];
  blockers: string[];
  review: string[];
  defaults: string[];
  binding: RetirementBinding | null;
}
export async function planSchema5Retirement(
  repository: string,
): Promise<RetirementPlan> {
  const result: RetirementPlan = {
    files: [],
    blockers: [],
    review: [],
    defaults: [],
    binding: null,
  };
  try {
    await assertLegacyContextTransactionSettled(repository);
    const version = await rawSchemaVersion(repository);
    if (version === "5") return result;
    if (version !== "4")
      throw new Error(
        `Automatic retirement supports schema 4 / package 0.11.0 only; found ${version ?? "no configuration"}. Use an explicitly compatible migration route, not old proof repair.`,
      );
    const root = await harnessRoot(repository);
    const catalog = await loadContextCatalog(repository);
    const errors = catalog.diagnostics.filter(
      (entry) => entry.severity === "error",
    );
    if (errors.length)
      throw new Error(errors.map((entry) => entry.message).join("; "));
    result.binding = await inspectRetirementBinding(repository);
    const assets = await inspectRetirementAssets(repository, root);
    result.files.push(...assets.files);
    result.blockers.push(...assets.blockers);
    result.review.push(...assets.review);
    const manifest = await captureMutationFileState(
      repository,
      "project_context/context.toml",
    );
    const defaults = migrateDefaultBodySelection(
      Buffer.from(manifest.bytes_base64!, "base64").toString("utf8"),
    );
    result.defaults = defaults.after;
    result.files.push({
      path: "project_context/context.toml",
      before: manifest,
      after: defaults.content,
      reason:
        "preserve exact default body selection without promoting traversal roots",
    });
    const configPath = await harnessConfigPath(repository);
    const config = await captureMutationFileState(repository, configPath);
    const raw = parseYaml(
      Buffer.from(config.bytes_base64!, "base64").toString("utf8"),
    ) as Record<string, unknown>;
    const known = new Set([
      "AGENTS.md",
      "Makefile",
      "tools",
      ".github/workflows/harness.yml",
      `${root}/skills`,
      `${root}/ty-context-managed/context_templates`,
      `${root}/ty-context-managed/make/ty-context.mk`,
      `${root}/ty-context-managed/templates`,
      `${root}/ty-context-managed/policies`,
    ]);
    if (raw.managed_files !== undefined && !Array.isArray(raw.managed_files))
      throw new Error(`${configPath}: managed_files must be an array`);
    for (const entry of (raw.managed_files ?? []) as Array<{ path?: string }>)
      if (!entry || !known.has(String(entry.path).replaceAll("\\", "/")))
        result.blockers.push(
          `${configPath}: unsupported managed entry ${entry?.path ?? "unknown"}; preserve and reconcile explicitly`,
        );
    const next = {
      ...raw,
      core: { ...(raw.core as object), schema_version: "5" },
      managed_files: [{ path: "AGENTS.md", strategy: "merge-block" }],
    };
    delete (next as Record<string, unknown>).profiles;
    delete (next as Record<string, unknown>).modularity;
    result.files.push({
      path: configPath,
      before: config,
      after: stringifyYaml(next),
      reason: "schema-5 configuration; preserve unrelated user fields",
    });
    const startup = await prepareStartupInstructions(repository);
    result.blockers.push(...startup.blocked);
    if (startup.content !== undefined)
      result.files.push({
        path: "AGENTS.md",
        before: startup.before,
        after: startup.content,
        reason: "publish the short development contract last",
      });
    const references = await inspectRetirementReferences(
      repository,
      catalog,
      result.files,
    );
    result.blockers.push(...references.blockers);
    result.review.push(...references.review);
    result.review.push(
      "Review nonmanaged Context, local Skills, AGENTS overrides and build configuration for still-effective old instructions. Historical mentions alone are not blockers. Existing ordinary Markdown/direct JSON/YAML values remain readable; live compact/symbolic/compiler-dependent resources must be extracted or replaced with provenance before information migration can be claimed complete.",
    );
  } catch (error) {
    result.blockers.push(String(error));
  }
  return result;
}
