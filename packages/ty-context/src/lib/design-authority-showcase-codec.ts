import {
  DESIGN_AUTHORITY_ENTRY_PATH,
  isDesignAuthorityDigest,
} from "./design-authority-types.js";
import {
  DESIGN_AUTHORITY_SHOWCASE_ARTIFACT_CATEGORY,
  DESIGN_AUTHORITY_SHOWCASE_ASSET_ROOT,
  DESIGN_AUTHORITY_SHOWCASE_COVERAGE_KEYS,
  DESIGN_AUTHORITY_SHOWCASE_HTML_PATH,
  DESIGN_AUTHORITY_SHOWCASE_SCHEMA,
  DESIGN_AUTHORITY_SHOWCASE_STATUS,
  type DesignAuthorityShowcaseCoverage,
  type DesignAuthorityShowcaseAuthorityBinding,
  type DesignAuthorityShowcaseFile,
  type DesignAuthorityShowcaseIndexEntry,
  type DesignAuthorityShowcaseManifestV1,
  type DesignAuthorityShowcaseTargetCondition,
} from "./design-authority-showcase-types.js";

const SAFE_ASSET_EXTENSION =
  /\.(?:avif|css|gif|ico|jpe?g|otf|png|ttf|webp|woff2?)$/u;
const STABLE_KEY = /^[a-z0-9][a-z0-9._-]{0,127}$/u;

export function parseDesignAuthorityShowcaseManifest(
  content: string,
): DesignAuthorityShowcaseManifestV1 {
  let decoded: unknown;
  try {
    decoded = JSON.parse(content) as unknown;
  } catch (error) {
    invalid(`manifest.json:${message(error)}`);
  }
  const input = object(decoded, "manifest", [
    "schema_version",
    "artifact_category",
    "authority",
    "status",
    "html",
    "assets",
    "coverage",
    "token_families",
    "components",
    "target_conditions",
    "external_network_dependencies",
  ]);
  exact(
    input.schema_version,
    DESIGN_AUTHORITY_SHOWCASE_SCHEMA,
    "schema_version",
  );
  exact(
    input.artifact_category,
    DESIGN_AUTHORITY_SHOWCASE_ARTIFACT_CATEGORY,
    "artifact_category",
  );
  exact(input.status, DESIGN_AUTHORITY_SHOWCASE_STATUS, "status");
  const network = array(
    input.external_network_dependencies,
    "external_network_dependencies",
  );
  if (network.length) invalid("external_network_dependencies:not_empty");
  return {
    schema_version: DESIGN_AUTHORITY_SHOWCASE_SCHEMA,
    artifact_category: DESIGN_AUTHORITY_SHOWCASE_ARTIFACT_CATEGORY,
    authority: authority(input.authority),
    status: DESIGN_AUTHORITY_SHOWCASE_STATUS,
    html: htmlFile(input.html),
    assets: assetFiles(input.assets),
    coverage: coverage(input.coverage),
    token_families: indexEntries(input.token_families, "token_families"),
    components: indexEntries(input.components, "components"),
    target_conditions: targetConditions(input.target_conditions),
    external_network_dependencies: [],
  };
}

function authority(value: unknown): DesignAuthorityShowcaseAuthorityBinding {
  const input = object(value, "authority", [
    "entry_path",
    "closure_digest",
    "revision",
  ]);
  exact(input.entry_path, DESIGN_AUTHORITY_ENTRY_PATH, "authority.entry_path");
  if (!isDesignAuthorityDigest(input.closure_digest))
    invalid("authority.closure_digest:sha256_required");
  return {
    entry_path: DESIGN_AUTHORITY_ENTRY_PATH,
    closure_digest: input.closure_digest,
    revision: text(input.revision, "authority.revision"),
  };
}

function htmlFile(value: unknown) {
  const result = file(value, "html");
  exact(result.path, DESIGN_AUTHORITY_SHOWCASE_HTML_PATH, "html.path");
  return { ...result, path: DESIGN_AUTHORITY_SHOWCASE_HTML_PATH };
}

function assetFiles(value: unknown): DesignAuthorityShowcaseFile[] {
  const values = array(value, "assets").map((item, index) => {
    const result = file(item, `assets[${index}]`);
    portablePath(result.path, `assets[${index}].path`);
    if (!result.path.startsWith(DESIGN_AUTHORITY_SHOWCASE_ASSET_ROOT))
      invalid(`assets[${index}].path:outside_asset_root`);
    if (!SAFE_ASSET_EXTENSION.test(result.path.toLowerCase()))
      invalid(`assets[${index}].path:unsupported_extension`);
    return result;
  });
  unique(
    values.map((item) => item.path),
    "assets.path",
  );
  unique(
    values.map((item) => item.path.toLowerCase()),
    "assets.path_case_collision",
  );
  return sort(values, (item) => item.path);
}

function file(value: unknown, label: string): DesignAuthorityShowcaseFile {
  const input = object(value, label, ["path", "sha256"]);
  const filePath = text(input.path, `${label}.path`);
  if (!isDesignAuthorityDigest(input.sha256))
    invalid(`${label}.sha256:sha256_required`);
  return { path: filePath, sha256: input.sha256 };
}

function coverage(value: unknown): DesignAuthorityShowcaseCoverage[] {
  const values = array(value, "coverage");
  if (values.length !== DESIGN_AUTHORITY_SHOWCASE_COVERAGE_KEYS.length)
    invalid(
      `coverage:expected_${DESIGN_AUTHORITY_SHOWCASE_COVERAGE_KEYS.length}_items`,
    );
  return values.map((item, index) => {
    const label = `coverage[${index}]`;
    const common = object(
      item,
      label,
      ["key", "disposition"],
      ["anchor", "rationale"],
    );
    exact(
      common.key,
      DESIGN_AUTHORITY_SHOWCASE_COVERAGE_KEYS[index],
      `${label}.key`,
    );
    if (common.disposition === "rendered") {
      const exactRow = object(item, label, ["key", "disposition", "anchor"]);
      return {
        key: DESIGN_AUTHORITY_SHOWCASE_COVERAGE_KEYS[index],
        disposition: "rendered",
        anchor: anchor(exactRow.anchor, `${label}.anchor`),
      };
    }
    if (common.disposition === "not_applicable") {
      const exactRow = object(item, label, ["key", "disposition", "rationale"]);
      return {
        key: DESIGN_AUTHORITY_SHOWCASE_COVERAGE_KEYS[index],
        disposition: "not_applicable",
        rationale: text(exactRow.rationale, `${label}.rationale`),
      };
    }
    invalid(`${label}.disposition:unsupported:${String(common.disposition)}`);
  });
}

function indexEntries(
  value: unknown,
  label: string,
): DesignAuthorityShowcaseIndexEntry[] {
  const values = array(value, label).map((item, index) => {
    const local = `${label}[${index}]`;
    const input = object(item, local, ["key", "anchor"]);
    return {
      key: stableKey(input.key, `${local}.key`),
      anchor: anchor(input.anchor, `${local}.anchor`),
    };
  });
  if (!values.length) invalid(`${label}:non_empty_array_required`);
  unique(
    values.map((item) => item.key),
    `${label}.key`,
  );
  unique(
    values.map((item) => item.anchor),
    `${label}.anchor`,
  );
  return sort(values, (item) => item.key);
}

function targetConditions(
  value: unknown,
): DesignAuthorityShowcaseTargetCondition[] {
  const values = array(value, "target_conditions").map((item, index) => {
    const label = `target_conditions[${index}]`;
    const input = object(item, label, [
      "target_key",
      "condition_key",
      "anchor",
    ]);
    return {
      target_key: stableKey(input.target_key, `${label}.target_key`),
      condition_key: stableKey(input.condition_key, `${label}.condition_key`),
      anchor: anchor(input.anchor, `${label}.anchor`),
    };
  });
  if (!values.length) invalid("target_conditions:non_empty_array_required");
  unique(
    values.map((item) => `${item.target_key}\0${item.condition_key}`),
    "target_conditions.identity",
  );
  unique(
    values.map((item) => item.anchor),
    "target_conditions.anchor",
  );
  return sort(values, (item) => `${item.target_key}\0${item.condition_key}`);
}

function object(
  value: unknown,
  label: string,
  required: string[],
  optional: string[] = [],
): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    invalid(`${label}:object_required`);
  const result = value as Record<string, unknown>;
  const allowed = new Set([...required, ...optional]);
  for (const key of Object.keys(result))
    if (!allowed.has(key)) invalid(`${label}:unknown_field:${key}`);
  for (const key of required)
    if (!Object.hasOwn(result, key)) invalid(`${label}:missing_field:${key}`);
  return result;
}

function array(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value)) invalid(`${label}:array_required`);
  return value;
}

function exact(value: unknown, expected: string, label: string): void {
  if (value !== expected) invalid(`${label}:expected:${expected}`);
}

function text(value: unknown, label: string): string {
  if (
    typeof value !== "string" ||
    !value ||
    value !== value.trim() ||
    /[\0\r\n\t]/u.test(value)
  )
    invalid(`${label}:non_empty_single_line_text_required`);
  return value;
}

function stableKey(value: unknown, label: string): string {
  const result = text(value, label);
  if (!STABLE_KEY.test(result)) invalid(`${label}:stable_key_required`);
  return result;
}

function anchor(value: unknown, label: string): string {
  const result = stableKey(value, label);
  if (result.includes(".")) invalid(`${label}:html_id_required`);
  return result;
}

function portablePath(value: string, label: string): void {
  if (
    value !== value.normalize("NFC") ||
    value.includes("\\") ||
    value.includes("\0") ||
    value.startsWith("/") ||
    value.startsWith("//") ||
    /^[A-Za-z]:/u.test(value) ||
    value.split("/").some((part) => !part || part === "." || part === "..")
  )
    invalid(`${label}:portable_repository_path_required`);
}

function unique(values: string[], label: string): void {
  if (new Set(values).size !== values.length) invalid(`${label}:duplicate`);
}

function sort<T>(values: T[], key: (value: T) => string): T[] {
  return [...values].sort((left, right) =>
    Buffer.from(key(left)).compare(Buffer.from(key(right))),
  );
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function invalid(reason: string): never {
  throw new Error(`design_authority_showcase_invalid:${reason}`);
}
