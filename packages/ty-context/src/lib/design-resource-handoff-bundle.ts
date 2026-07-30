import {
  lstat,
  mkdtemp,
  readdir,
  realpath,
  rename,
  rm,
} from "node:fs/promises";
import path from "node:path";
import type { DesignResourceManifestCollectionName } from "./design-resource-fact-manifest-types.js";
import { stageDesignResourceHandoffDraft } from "./design-resource-handoff-bundle-draft.js";
import { createDesignResourceHandoffSetIntegrity } from "./design-resource-handoff-set-integrity.js";
import { preflightParsedDesignResourceHandoff } from "./design-resource-handoff-validation.js";
import {
  normalizeRepositoryCwd,
  normalizeRepositoryFile,
} from "./long-task-paths.js";
import { resolveInsideRepository } from "./long-task-workspace.js";
import { sha256Hex } from "./strict-codec.js";

export interface DesignResourceHandoffBundleOptions {
  repository: string;
  draft_directory: string;
  output_directory: string;
  manifest_paths: string[];
  max_handoff_bytes: number;
}

export interface DesignResourceHandoffBundleResult {
  status: "published";
  output_directory: string;
  handoffs: Array<{
    path: string;
    sha256: string;
    bytes: number;
    scope_key: string;
    target_key: string;
  }>;
  manifests: Array<{
    path: string;
    sha256: string;
    scope_key: string;
    target_key: string;
    collections: Array<{
      name: DesignResourceManifestCollectionName;
      expected_count: number;
      identity_sha256: string;
    }>;
  }>;
}

interface ManifestBaseline {
  path: string;
  sha256: string;
  scope_key: string;
  target_key: string;
  collections: Array<{
    name: DesignResourceManifestCollectionName;
    expected_count: number;
    identity_sha256: string;
  }>;
}

export async function publishDesignResourceHandoffBundle(
  options: DesignResourceHandoffBundleOptions,
): Promise<DesignResourceHandoffBundleResult> {
  const repository = path.resolve(options.repository);
  const draftDirectory = normalizeBundleDirectory(
    options.draft_directory,
    "design_resource_bundle_draft_directory",
  );
  const outputDirectory = normalizeBundleDirectory(
    options.output_directory,
    "design_resource_bundle_output_directory",
  );
  if (
    !Number.isSafeInteger(options.max_handoff_bytes) ||
    options.max_handoff_bytes <= 0
  )
    invalid("max_handoff_bytes", String(options.max_handoff_bytes));
  const manifestPaths = normalizeManifestPaths(options.manifest_paths);
  const declaredManifestPaths = new Set(manifestPaths);

  const draftAbsolute = await assertSafeDirectory(
    repository,
    draftDirectory,
    "draft_directory",
  );
  const outputAbsolute = resolveInsideRepository(
    repository,
    outputDirectory,
    "design_resource_bundle_output_directory",
  );
  if (await lstat(outputAbsolute).catch(() => null))
    invalid("output_directory_exists", outputDirectory);
  const outputParentRelative = path.posix.dirname(outputDirectory);
  const outputParent = await assertSafeDirectory(
    repository,
    outputParentRelative === "." ? "." : outputParentRelative,
    "output_parent",
  );
  const temporary = await mkdtemp(
    path.join(outputParent, `.${path.basename(outputAbsolute)}.tmp-`),
  );
  try {
    const draftEntries = (
      await readdir(draftAbsolute, {
        withFileTypes: true,
      })
    ).sort((left, right) => compareText(left.name, right.name));
    if (!draftEntries.length) invalid("draft_directory_empty", draftDirectory);
    for (const entry of draftEntries)
      if (
        !entry.isFile() ||
        entry.isSymbolicLink() ||
        path.extname(entry.name).toLowerCase() !== ".md"
      )
        invalid("draft_entry_not_markdown_file", entry.name);

    const handoffs: DesignResourceHandoffBundleResult["handoffs"] = [];
    const seenTargets = new Set<string>();
    const seenManifestPaths = new Set<string>();
    const manifests = new Map<string, ManifestBaseline>();
    const handoffSetIntegrity = createDesignResourceHandoffSetIntegrity(
      (code, detail) => invalid(code, detail),
    );
    for (const entry of draftEntries) {
      const {
        bytes,
        parsed,
        target: declaredTarget,
        manifest_resource: manifestResource,
      } = await stageDesignResourceHandoffDraft(
        repository,
        draftAbsolute,
        temporary,
        entry.name,
        options.max_handoff_bytes,
        invalid,
      );
      if (!declaredManifestPaths.has(manifestResource.path))
        invalid(
          "target_manifest_not_declared",
          `${declaredTarget.key}:${manifestResource.path}`,
        );
      const preflight = await preflightParsedDesignResourceHandoff(
        repository,
        parsed,
      );
      handoffSetIntegrity.consume(preflight);
      const targetKey = preflight.handoff.targets[0].key;
      if (seenTargets.has(targetKey)) invalid("target_duplicate", targetKey);
      seenTargets.add(targetKey);
      const manifestIdentity = preflight.manifest_identities[0];
      if (
        manifestIdentity.target_key !== targetKey ||
        manifestIdentity.path !== manifestResource.path ||
        manifestIdentity.sha256 !== manifestResource.sha256
      )
        invalid("target_manifest_identity_mismatch", targetKey);
      seenManifestPaths.add(manifestIdentity.path);
      manifests.set(targetKey, {
        path: manifestIdentity.path,
        sha256: manifestIdentity.sha256,
        scope_key: manifestIdentity.scope_key,
        target_key: manifestIdentity.target_key,
        collections: manifestIdentity.collections.map((collection) => ({
          ...collection,
        })),
      });
      handoffs.push({
        path: `${outputDirectory}/${entry.name}`,
        sha256: sha256Hex(bytes),
        bytes: bytes.length,
        scope_key: preflight.handoff.scope.key,
        target_key: targetKey,
      });
    }
    handoffSetIntegrity.finish();
    assertSameSet(
      seenManifestPaths,
      declaredManifestPaths,
      "manifest_path_set_mismatch",
    );
    const result: DesignResourceHandoffBundleResult = {
      status: "published",
      output_directory: outputDirectory,
      handoffs,
      manifests: [...manifests.values()]
        .map((baseline) => ({
          path: baseline.path,
          sha256: baseline.sha256,
          scope_key: baseline.scope_key,
          target_key: baseline.target_key,
          collections: baseline.collections.map((collection) => ({
            ...collection,
          })),
        }))
        .sort((left, right) => compareText(left.target_key, right.target_key)),
    };
    await rename(temporary, outputAbsolute);
    return result;
  } catch (error) {
    try {
      await rm(temporary, { recursive: true, force: true });
    } catch (cleanupError) {
      throw new AggregateError(
        [error, cleanupError],
        "design_resource_handoff_bundle_cleanup_failed",
      );
    }
    throw error;
  }
}

function normalizeManifestPaths(values: string[]): string[] {
  if (!values.length) invalid("manifest_paths_required", "");
  const normalized = values.map((value) =>
    normalizeRepositoryFile(value, "design_resource_bundle_manifest"),
  );
  if (new Set(normalized).size !== normalized.length)
    invalid("manifest_path_duplicate", normalized.join(","));
  return normalized.sort(compareText);
}

async function assertSafeDirectory(
  repository: string,
  relative: string,
  label: string,
): Promise<string> {
  const absolute = resolveInsideRepository(repository, relative, label);
  const info = await lstat(absolute).catch(() => null);
  if (!info) invalid(`${label}_not_found`, relative);
  if (info.isSymbolicLink() || !info.isDirectory())
    invalid(`${label}_not_directory`, relative);
  const root = await realpath(repository);
  const resolved = await realpath(absolute);
  const outside = path.relative(root, resolved);
  if (
    outside === ".." ||
    outside.startsWith(`..${path.sep}`) ||
    path.isAbsolute(outside)
  )
    invalid(`${label}_outside_repository`, relative);
  return resolved;
}

function normalizeBundleDirectory(value: string, label: string): string {
  const normalized = normalizeRepositoryCwd(value, label);
  if (normalized === ".") invalid("repository_root_directory_forbidden", label);
  return normalized;
}

function assertSameSet(
  actual: Set<string>,
  expected: Set<string>,
  code: string,
): void {
  const left = [...actual].sort(compareText);
  const right = [...expected].sort(compareText);
  if (
    left.length !== right.length ||
    left.some((value, index) => value !== right[index])
  )
    invalid(code, `${left.join(",")}:${right.join(",")}`);
}

function invalid(code: string, detail: string): never {
  throw new Error(
    `design_resource_handoff_bundle_invalid:${code}${detail ? `:${detail}` : ""}`,
  );
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
