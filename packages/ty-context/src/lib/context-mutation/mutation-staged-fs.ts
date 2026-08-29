import { canonicalValueJson, sha256Hex } from "../strict-codec.js";
import type { ContextCatalog } from "../context-catalog/catalog-types.js";
import type { ContextFootprintState } from "./mutation-types.js";

export function stagedFileOverrides(
  entries: Iterable<readonly [string, Uint8Array | null]>,
): ReadonlyMap<string, Uint8Array | null> {
  const result = new Map<string, Uint8Array | null>();
  for (const [file, bytes] of entries) {
    if (result.has(file))
      throw new Error(`context_mutation_overlay_duplicate:${file}`);
    result.set(file, bytes === null ? null : Buffer.from(bytes));
  }
  return result;
}

export function contextCatalogIdentity(catalog: ContextCatalog): string {
  return sha256Hex(
    canonicalValueJson({
      manifest_path: catalog.manifest_path,
      manifest_sha256:
        catalog.manifest_content === undefined
          ? null
          : sha256Hex(catalog.manifest_content),
      areas: catalog.areas.map((entry) => ({
        id: entry.id,
        root: entry.root,
        context: entry.context,
        kind: entry.kind,
        default: entry.default,
      })),
      contexts: (catalog.manifest?.contexts ?? []).map((entry) => ({
        path: entry.path,
        role: entry.role,
        read_policy: entry.read_policy ?? null,
        read_when: entry.read_when ?? null,
        triggers: [...entry.triggers],
        default_children: [...entry.default_children],
      })),
      files: catalog.context_files.map((entry) => ({
        path: entry.path,
        bytes: entry.bytes,
      })),
      default_paths: [...catalog.default_footprint.keys()],
      errors: catalog.diagnostics
        .filter((entry) => entry.severity === "error")
        .map((entry) => ({
          code: entry.code,
          path: entry.path ?? null,
          line: entry.line ?? null,
        })),
    }),
  );
}

export function contextFootprintState(
  catalog: ContextCatalog,
): ContextFootprintState {
  const sizes = new Map(
    catalog.context_files.map((entry) => [entry.path, entry.bytes]),
  );
  const paths = [...catalog.default_footprint.keys()];
  let bytes = 0;
  for (const file of paths)
    bytes +=
      file === catalog.manifest_path
        ? Buffer.byteLength(catalog.manifest_content ?? "", "utf8")
        : (sizes.get(file) ?? 0);
  return { paths, path_count: paths.length, bytes };
}
