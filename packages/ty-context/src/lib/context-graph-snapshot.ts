import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { contextAuthorityTopologyHash } from "./long-task-context-authority-topology.js";
import { canonicalJson, sha256Hex } from "./strict-codec.js";
import {
  compareUtf8Paths,
  normalizeContextPath,
  portableContextPathCaseKey,
  repositoryRelativePathSpelling,
} from "./context-catalog/catalog-paths.js";
import {
  parseContextManifest,
  type ContextManifest,
} from "./context-manifest-schema.js";
import { assertProtectedRepositoryFile } from "./long-task-protected-files.js";

const CONTEXT_MANIFEST_PATH = "project_context/context.toml";
const SUPPORTING_CONTEXT_ROLES = new Set(["implementation-index", "archive"]);

export interface ContextGraphSnapshot {
  mode: "referenced" | "full";
  topology_sha256: string;
  files: string[];
  sha256: Record<string, string>;
  controlling_files: string[];
  supporting_files: string[];
}

export interface CapturedContextGraphSnapshot {
  snapshot: ContextGraphSnapshot;
  physical_files: ReadonlyMap<string, string>;
  routing_files: string[];
}

export interface CampaignContextBaseline {
  graph_sha256: string;
  files: Record<string, string>;
  baseline_sha256: string;
}

interface ContextGraphFile {
  path: string;
  physical_path: string;
  absolute_path: string;
}

export async function captureContextGraphSnapshot(
  repositoryRoot: string,
  contextRefs: Iterable<string>,
  mode: "referenced" | "full" = "referenced",
): Promise<ContextGraphSnapshot> {
  return (
    await captureContextGraphSnapshotWithPhysicalFiles(
      repositoryRoot,
      contextRefs,
      mode,
    )
  ).snapshot;
}

export async function captureContextGraphSnapshotWithPhysicalFiles(
  repositoryRoot: string,
  contextRefs: Iterable<string>,
  mode: "referenced" | "full" = "referenced",
): Promise<CapturedContextGraphSnapshot> {
  const root = path.resolve(repositoryRoot);
  const manifest = await readContextManifest(root);
  const fileRecords = await listContextFileRecords(root);
  const allFiles = fileRecords.map((file) => file.path);
  const available = new Map(fileRecords.map((file) => [file.path, file]));
  const selected = new Set<string>();
  const routingSelected = new Set<string>();
  const explicitlySelected = new Set<string>();

  for (const required of [
    CONTEXT_MANIFEST_PATH,
    "project_context/global.md",
    "project_context/architecture.md",
  ]) {
    if (!available.has(required)) {
      throw new Error(`context_snapshot_required_file_missing:${required}`);
    }
    routingSelected.add(required);
    explicitlySelected.add(required);
  }
  for (const contextRef of contextRefs) {
    const normalized = normalizeRepoPath(contextRef);
    if (!available.has(normalized)) {
      throw new Error(`context_ref_invalid:${contextRef}`);
    }
    routingSelected.add(normalized);
    explicitlySelected.add(normalized);
  }
  addTransitiveChildren(manifest, routingSelected, new Set(available.keys()));
  if (mode === "full") allFiles.forEach((file) => selected.add(file));
  else routingSelected.forEach((file) => selected.add(file));

  const files = [...selected].sort(compareUtf8Paths);
  const authorityTopologySha256 = contextAuthorityTopologyHash(manifest, files);
  const hashes = Object.fromEntries(
    await Promise.all(
      files.map(
        async (file) =>
          [
            file,
            file === CONTEXT_MANIFEST_PATH
              ? authorityTopologySha256
              : await hashFile(root, available.get(file)!.absolute_path),
          ] as const,
      ),
    ),
  );
  const classification = classifyContextFiles(
    manifest,
    files,
    explicitlySelected,
    mode,
  );
  return {
    snapshot: {
      mode,
      topology_sha256: authorityTopologySha256,
      files,
      sha256: sortRecord(hashes),
      controlling_files: classification.controlling,
      supporting_files: classification.supporting,
    },
    physical_files: new Map(
      files.map((file) => [file, available.get(file)!.absolute_path]),
    ),
    routing_files: [...routingSelected].sort(compareUtf8Paths),
  };
}

export async function captureCampaignContextBaseline(
  repositoryRoot: string,
  contextRefs: Iterable<string>,
): Promise<CampaignContextBaseline> {
  const snapshot = await captureContextGraphSnapshot(
    repositoryRoot,
    contextRefs,
    "referenced",
  );
  const files = sortRecord(snapshot.sha256);
  return {
    graph_sha256: snapshot.topology_sha256,
    files,
    baseline_sha256: sha256Hex(
      canonicalJson({ graph_sha256: snapshot.topology_sha256, files }),
    ),
  };
}

export async function assertCampaignContextBaselineFresh(
  repositoryRoot: string,
  expected: CampaignContextBaseline,
  contextRefs: Iterable<string>,
): Promise<void> {
  const current = await captureCampaignContextBaseline(
    repositoryRoot,
    contextRefs,
  );
  if (current.graph_sha256 !== expected.graph_sha256) {
    throw new Error("campaign_context_changed:graph");
  }
  if (current.baseline_sha256 !== expected.baseline_sha256) {
    const changed = [
      ...new Set([
        ...Object.keys(expected.files),
        ...Object.keys(current.files),
      ]),
    ]
      .filter((file) => expected.files[file] !== current.files[file])
      .sort(compareUtf8Paths);
    throw new Error(
      `campaign_context_changed:files:${changed.join(",") || "set"}`,
    );
  }
}

export async function currentContextTopologySha256(
  repositoryRoot: string,
): Promise<string> {
  const root = path.resolve(repositoryRoot);
  return contextAuthorityTopologyHash(
    await readContextManifest(root),
    await listContextFiles(root),
  );
}

export async function listContextFiles(
  repositoryRoot: string,
): Promise<string[]> {
  return (await listContextFileRecords(path.resolve(repositoryRoot))).map(
    (file) => file.path,
  );
}

async function listContextFileRecords(
  repositoryRoot: string,
): Promise<ContextGraphFile[]> {
  const root = path.resolve(repositoryRoot);
  const contextRoot = path.join(root, "project_context");
  const result = new Map<string, ContextGraphFile>();
  const portabilityKeys = new Map<string, string>();
  async function visit(directory: string): Promise<void> {
    const entries = await readdir(directory, { withFileTypes: true });
    entries.sort((left, right) => compareUtf8Paths(left.name, right.name));
    for (const entry of entries) {
      const absolute = path.join(directory, entry.name);
      if (entry.isSymbolicLink()) {
        throw new Error(
          `protected_input_symlink_not_allowed:context_authority:${absolute.replace(/\\/gu, "/")}`,
        );
      }
      if (entry.isDirectory()) {
        await visit(absolute);
      } else if (entry.isFile()) {
        await assertProtectedRepositoryFile(
          root,
          absolute,
          "context_authority",
        );
        const physicalPath = repositoryRelativePathSpelling(root, absolute);
        const publicPath = normalizeContextPath(physicalPath);
        const existing = result.get(publicPath);
        if (existing)
          throw new Error(
            `context_authority_unicode_collision:${existing.physical_path}:${physicalPath}:${publicPath}`,
          );
        const portabilityKey = portableContextPathCaseKey(publicPath);
        const caseCollision = portabilityKeys.get(portabilityKey);
        if (caseCollision && caseCollision !== publicPath)
          throw new Error(
            `context_authority_case_collision:${caseCollision}:${publicPath}`,
          );
        portabilityKeys.set(portabilityKey, publicPath);
        result.set(publicPath, {
          path: publicPath,
          physical_path: physicalPath,
          absolute_path: absolute,
        });
      }
    }
  }
  await visit(contextRoot);
  return [...result.values()].sort((left, right) =>
    compareUtf8Paths(left.path, right.path),
  );
}

async function readContextManifest(root: string): Promise<ContextManifest> {
  const manifestFile = await assertProtectedRepositoryFile(
    root,
    path.join(root, "project_context", "context.toml"),
    "context_manifest",
  );
  const parsed = parseContextManifest(await readFile(manifestFile, "utf8"));
  if (!parsed.manifest || parsed.errors.length > 0) {
    throw new Error(`context_manifest_invalid:${parsed.errors.join("|")}`);
  }
  return parsed.manifest;
}

function addTransitiveChildren(
  manifest: ContextManifest,
  selected: Set<string>,
  available: Set<string>,
): void {
  const children = new Map(
    manifest.contexts.map(
      (entry) =>
        [
          normalizeRepoPath(entry.path),
          entry.default_children.map(normalizeRepoPath),
        ] as const,
    ),
  );
  const queue = [...selected];
  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const child of children.get(current) ?? []) {
      if (!available.has(child)) {
        throw new Error(`context_graph_child_missing:${current}:${child}`);
      }
      if (!selected.has(child)) {
        selected.add(child);
        queue.push(child);
      }
    }
  }
}

function classifyContextFiles(
  manifest: ContextManifest,
  files: string[],
  explicitlySelected: Set<string>,
  mode: "referenced" | "full",
): { controlling: string[]; supporting: string[] } {
  if (mode === "full") return { controlling: [...files], supporting: [] };
  const roles = new Map(
    manifest.contexts.map(
      (entry) => [normalizeRepoPath(entry.path), entry.role] as const,
    ),
  );
  const controlling: string[] = [];
  const supporting: string[] = [];
  for (const file of files) {
    const role = roles.get(file);
    if (
      explicitlySelected.has(file) ||
      role === undefined ||
      !SUPPORTING_CONTEXT_ROLES.has(role)
    )
      controlling.push(file);
    else supporting.push(file);
  }
  return { controlling, supporting };
}

async function hashFile(root: string, file: string): Promise<string> {
  const protectedFile = await assertProtectedRepositoryFile(
    root,
    file,
    "context_authority",
  );
  return sha256Hex(await readFile(protectedFile));
}

function normalizeRepoPath(value: string): string {
  return normalizeContextPath(value);
}

function sortRecord<T>(value: Record<string, T>): Record<string, T> {
  return Object.fromEntries(
    Object.entries(value).sort(([left], [right]) =>
      compareUtf8Paths(left, right),
    ),
  );
}
