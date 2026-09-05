import { parseContextManifest } from "./context-manifest-schema.js";
import { selectDefaultContextPaths } from "./context-catalog/catalog-default-footprint.js";

export function migrateDefaultBodySelection(content: string): {
  content: string;
  before: string[];
  after: string[];
  added: string[];
  removed: string[];
} {
  const parsed = parseContextManifest(content);
  if (!parsed.manifest || parsed.errors.length)
    throw new Error(
      `Cannot migrate invalid manifest: ${parsed.errors.join("; ")}`,
    );
  if (parsed.manifest.default_files?.length)
    throw new Error(
      "Schema-4 manifest unexpectedly declares schema-5 default_files; review before migration.",
    );
  const before = [
    ...new Set([
      ...selectDefaultContextPaths(parsed.manifest).keys(),
      "project_context/architecture.md",
    ]),
  ].sort();
  // A direct read does not promote architecture to a traversal root.
  const eol = content.includes("\r\n") ? "\r\n" : "\n";
  const next = `default_files = ["project_context/architecture.md"]${eol}${content}`;
  const candidate = parseContextManifest(next);
  if (!candidate.manifest || candidate.errors.length)
    throw new Error(
      `Invalid migration candidate: ${candidate.errors.join("; ")}`,
    );
  const after = [
    ...selectDefaultContextPaths(candidate.manifest).keys(),
  ].sort();
  const added = after.filter((value) => !before.includes(value));
  const removed = before.filter((value) => !after.includes(value));
  if (added.length || removed.length)
    throw new Error(
      `Default body selection changed: added=${JSON.stringify(added)} removed=${JSON.stringify(removed)}`,
    );
  return { content: next, before, after, added, removed };
}
