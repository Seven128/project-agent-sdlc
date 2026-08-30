import type { ContextManifest } from "./context-manifest-schema.js";
import {
  compareUtf8Paths,
  normalizeContextPath,
} from "./context-catalog/catalog-paths.js";
import { canonicalJson, sha256Hex } from "./strict-codec.js";

/**
 * Hashes only manifest structure that can change the currently selected
 * durable Context authority. Retrieval aliases and load guidance remain in
 * context.toml for future Agent routing but do not revise an active delivery.
 */
export function contextAuthorityTopologyHash(
  manifest: ContextManifest,
  selectedFiles: Iterable<string>,
): string {
  const selected = new Set([...selectedFiles].map(normalizeRepoPath));
  const topology = {
    areas: manifest.areas
      .filter((area) => selected.has(normalizeRepoPath(area.context)))
      .map(
        ({
          line: _line,
          default: _default,
          forbidden_runtime_dependencies,
          kind,
          ...area
        }) => ({
          ...area,
          id: area.id.normalize("NFC"),
          ...(kind === undefined ? {} : { kind }),
          context: normalizeRepoPath(area.context),
          forbidden_runtime_dependencies: [
            ...forbidden_runtime_dependencies,
          ].sort(),
        }),
      )
      .sort((left, right) => compareUtf8Paths(left.id, right.id)),
    contexts: manifest.contexts
      .filter((context) => selected.has(normalizeRepoPath(context.path)))
      .map(
        ({
          line: _line,
          read_when: _readWhen,
          read_policy: _readPolicy,
          triggers: _triggers,
          default_children,
          ...context
        }) => ({
          ...context,
          path: normalizeRepoPath(context.path),
          default_children: [...default_children]
            .map(normalizeRepoPath)
            .filter((child) => selected.has(child))
            .sort(compareUtf8Paths),
        }),
      )
      .sort((left, right) => compareUtf8Paths(left.path, right.path)),
  };
  return sha256Hex(canonicalJson(topology));
}

function normalizeRepoPath(value: string): string {
  return normalizeContextPath(value);
}
