import {
  DESIGN_AUTHORITY_ENTRY_PATH,
  DESIGN_AUTHORITY_KINDS,
  DESIGN_AUTHORITY_MANIFEST_PATH,
  DESIGN_AUTHORITY_MANIFEST_SCHEMA_VERSION,
  isDesignAuthorityDigest,
  type DesignAuthorityGeneratedFile,
  type DesignAuthorityKind,
  type DesignAuthorityManifestFile,
  type DesignAuthorityManifestV1,
} from "./design-authority-types.js";

const AUTHORITY_KIND_SET = new Set<string>(DESIGN_AUTHORITY_KINDS);

export function parseDesignAuthorityManifest(
  content: string,
): DesignAuthorityManifestV1 {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content) as unknown;
  } catch (error) {
    invalid(`json:${message(error)}`);
  }
  const root = strictObject(parsed, "manifest", [
    "schema_version",
    "entry",
    "authority_files",
    "generated_files",
    "closure_digest",
  ]);
  if (root.schema_version !== DESIGN_AUTHORITY_MANIFEST_SCHEMA_VERSION)
    invalid(`schema_version:${String(root.schema_version)}`);
  if (root.entry !== DESIGN_AUTHORITY_ENTRY_PATH)
    invalid(`entry:${String(root.entry)}`);
  if (!isDesignAuthorityDigest(root.closure_digest))
    invalid("closure_digest:invalid");
  if (!Array.isArray(root.authority_files))
    invalid("authority_files:not_array");
  if (!Array.isArray(root.generated_files))
    invalid("generated_files:not_array");

  const authorityFiles = root.authority_files.map((item, index) =>
    parseAuthorityFile(item, index),
  );
  const generatedFiles = root.generated_files.map((item, index) =>
    parseGeneratedFile(item, index),
  );
  validatePathSets(authorityFiles, generatedFiles);
  return {
    schema_version: DESIGN_AUTHORITY_MANIFEST_SCHEMA_VERSION,
    entry: DESIGN_AUTHORITY_ENTRY_PATH,
    authority_files: sortByPath(authorityFiles),
    generated_files: sortByPath(generatedFiles),
    closure_digest: root.closure_digest,
  };
}

export function normalizeDesignAuthorityPath(
  value: unknown,
  label: string,
): string {
  if (typeof value !== "string" || !value) invalid(`${label}:not_text`);
  if (value !== value.normalize("NFC")) invalid(`${label}:not_nfc`);
  if (
    value.includes("\\") ||
    value.includes("\0") ||
    value.startsWith("/") ||
    value.startsWith("//") ||
    /^[A-Za-z]:/u.test(value)
  )
    invalid(`${label}:not_portable`);
  const segments = value.split("/");
  if (
    segments.some((segment) => !segment || segment === "." || segment === "..")
  )
    invalid(`${label}:invalid_segment`);
  if (!value.startsWith("design_system/") || value === "design_system/")
    invalid(`${label}:outside_design_system`);
  if (
    value === DESIGN_AUTHORITY_MANIFEST_PATH ||
    value === DESIGN_AUTHORITY_ENTRY_PATH
  )
    invalid(`${label}:reserved_path`);
  return value;
}

export function designAuthorityManifestProjection(
  manifest: DesignAuthorityManifestV1,
): string {
  return canonicalJsonValue({
    schema_version: manifest.schema_version,
    entry: manifest.entry,
    authority_files: sortByPath(manifest.authority_files),
    generated_files: sortByPath(manifest.generated_files),
  });
}

function parseAuthorityFile(
  value: unknown,
  index: number,
): DesignAuthorityManifestFile {
  const label = `authority_files[${index}]`;
  const row = strictObject(value, label, ["path", "kind"]);
  const filePath = normalizeDesignAuthorityPath(row.path, `${label}.path`);
  if (!filePath.toLowerCase().endsWith(".md"))
    invalid(`${label}.path:not_markdown`);
  if (typeof row.kind !== "string" || !AUTHORITY_KIND_SET.has(row.kind))
    invalid(`${label}.kind:${String(row.kind)}`);
  return { path: filePath, kind: row.kind as DesignAuthorityKind };
}

function parseGeneratedFile(
  value: unknown,
  index: number,
): DesignAuthorityGeneratedFile {
  const label = `generated_files[${index}]`;
  const row = strictObject(value, label, ["path", "source"]);
  const filePath = normalizeDesignAuthorityPath(row.path, `${label}.path`);
  if (filePath !== "design_system/tokens.json")
    invalid(`${label}.path:unsupported_generated_path`);
  if (row.source !== "DESIGN.md#frontmatter.tokens")
    invalid(`${label}.source:unsupported`);
  return { path: filePath, source: "DESIGN.md#frontmatter.tokens" };
}

function validatePathSets(
  authority: DesignAuthorityManifestFile[],
  generated: DesignAuthorityGeneratedFile[],
): void {
  const exact = new Set<string>();
  const folded = new Map<string, string>();
  for (const file of [...authority, ...generated]) {
    if (exact.has(file.path)) invalid(`path_duplicate:${file.path}`);
    exact.add(file.path);
    const key = file.path.toLowerCase();
    const previous = folded.get(key);
    if (previous && previous !== file.path)
      invalid(`path_case_collision:${previous}:${file.path}`);
    folded.set(key, file.path);
  }
}

function strictObject(
  value: unknown,
  label: string,
  fields: string[],
): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    invalid(`${label}:not_object`);
  const row = value as Record<string, unknown>;
  const expected = new Set(fields);
  for (const key of Object.keys(row))
    if (!expected.has(key)) invalid(`${label}:unknown_field:${key}`);
  for (const field of fields)
    if (!(field in row)) invalid(`${label}:missing_field:${field}`);
  return row;
}

function sortByPath<T extends { path: string }>(values: T[]): T[] {
  return [...values].sort((left, right) =>
    Buffer.from(left.path).compare(Buffer.from(right.path)),
  );
}

function canonicalJsonValue(value: unknown): string {
  return JSON.stringify(sortObjectKeys(value));
}

function sortObjectKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortObjectKeys);
  if (!value || typeof value !== "object") return value;
  const row = value as Record<string, unknown>;
  return Object.fromEntries(
    Object.keys(row)
      .sort(compareCodePoints)
      .map((key) => [key, sortObjectKeys(row[key])]),
  );
}

function compareCodePoints(left: string, right: string): number {
  const a = Array.from(left, (point) => point.codePointAt(0)!);
  const b = Array.from(right, (point) => point.codePointAt(0)!);
  for (let index = 0; index < Math.min(a.length, b.length); index += 1)
    if (a[index] !== b[index]) return a[index] - b[index];
  return a.length - b.length;
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function invalid(reason: string): never {
  throw new Error(`design_authority_manifest_invalid:${reason}`);
}
