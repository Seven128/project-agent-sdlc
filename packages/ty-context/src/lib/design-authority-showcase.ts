import {
  acquireDesignAuthorityBytes,
  acquireDesignAuthorityText,
} from "./design-authority-files.js";
import { parseDesignAuthorityShowcaseManifest } from "./design-authority-showcase-codec.js";
import { inspectDesignAuthorityShowcaseCss } from "./design-authority-showcase-css.js";
import { inspectDesignAuthorityShowcaseHtml } from "./design-authority-showcase-html.js";
import { declaredDesignAuthorityShowcase } from "./design-authority-showcase-marker.js";
import {
  DESIGN_AUTHORITY_SHOWCASE_MANIFEST_PATH,
  type DesignAuthorityShowcaseContext,
  type DesignAuthorityShowcaseInspectionV1,
  type DesignAuthorityShowcaseManifestV1,
} from "./design-authority-showcase-types.js";
import {
  DESIGN_AUTHORITY_ENTRY_PATH,
  DESIGN_AUTHORITY_LIMITS,
} from "./design-authority-types.js";
import { sha256Hex } from "./strict-codec.js";

interface AcquiredShowcaseAsset {
  path: string;
  raw: Buffer;
  css: string | null;
}

export async function inspectDesignAuthorityShowcase(
  context: DesignAuthorityShowcaseContext,
): Promise<DesignAuthorityShowcaseInspectionV1> {
  let declared = false;
  try {
    const entry = await acquireDesignAuthorityText(
      context.repository,
      DESIGN_AUTHORITY_ENTRY_PATH,
      "design_authority_showcase_entry",
    );
    const marker = declaredDesignAuthorityShowcase(entry.content);
    if (!marker) return empty("not_declared");
    declared = true;
    const manifestFile = await acquireDesignAuthorityText(
      context.repository,
      marker,
      "design_authority_showcase_manifest",
    );
    const manifest = parseDesignAuthorityShowcaseManifest(manifestFile.content);
    assertCurrentAuthority(manifest, context);
    if (manifest.assets.length + 2 > DESIGN_AUTHORITY_LIMITS.max_members)
      invalid(`member_limit_exceeded:${manifest.assets.length + 2}`);
    const html = await acquireDesignAuthorityText(
      context.repository,
      manifest.html.path,
      "design_authority_showcase_html",
    );
    assertDigest(manifest.html.sha256, html.raw, manifest.html.path);
    const assets = await acquireAssets(context.repository, manifest);
    enforceTotalBytes(manifestFile.raw, html.raw, assets);
    const reachable = new Set(
      inspectDesignAuthorityShowcaseHtml({ content: html.content, manifest }),
    );
    inspectCssClosure(assets, reachable);
    const unreachable = manifest.assets
      .map((item) => item.path)
      .filter((item) => !reachable.has(item));
    if (unreachable.length)
      invalid(`asset_not_reachable:${unreachable.join(",")}`);
    return summary(manifest);
  } catch (error) {
    return {
      ...empty("invalid"),
      manifest_path: declared ? DESIGN_AUTHORITY_SHOWCASE_MANIFEST_PATH : null,
      diagnostics: [
        {
          severity: "error",
          code: "design_authority_showcase_invalid",
          ...(declared
            ? { path: DESIGN_AUTHORITY_SHOWCASE_MANIFEST_PATH }
            : { path: DESIGN_AUTHORITY_ENTRY_PATH }),
          detail: message(error),
        },
      ],
    };
  }
}

export function notEvaluatedDesignAuthorityShowcase(
  reason: string,
): DesignAuthorityShowcaseInspectionV1 {
  return {
    ...empty("not_evaluated"),
    diagnostics: [
      {
        severity: "warning",
        code: "design_authority_showcase_not_evaluated",
        detail: reason,
      },
    ],
  };
}

async function acquireAssets(
  repository: string,
  manifest: DesignAuthorityShowcaseManifestV1,
): Promise<AcquiredShowcaseAsset[]> {
  const acquired: AcquiredShowcaseAsset[] = [];
  for (const expected of manifest.assets) {
    if (expected.path.toLowerCase().endsWith(".css")) {
      const file = await acquireDesignAuthorityText(
        repository,
        expected.path,
        "design_authority_showcase_asset",
      );
      assertDigest(expected.sha256, file.raw, expected.path);
      acquired.push({ path: file.path, raw: file.raw, css: file.content });
    } else {
      const file = await acquireDesignAuthorityBytes(
        repository,
        expected.path,
        "design_authority_showcase_asset",
      );
      assertDigest(expected.sha256, file.raw, expected.path);
      acquired.push({ path: file.path, raw: file.raw, css: null });
    }
  }
  return acquired;
}

function inspectCssClosure(
  assets: AcquiredShowcaseAsset[],
  reachable: Set<string>,
): void {
  const byPath = new Map(assets.map((item) => [item.path, item]));
  const declared = new Set(byPath.keys());
  const inspected = new Set<string>();
  while (true) {
    const next = [...reachable]
      .sort(compare)
      .find(
        (item) => item.toLowerCase().endsWith(".css") && !inspected.has(item),
      );
    if (!next) break;
    inspected.add(next);
    const asset = byPath.get(next);
    if (!asset?.css) invalid(`css_asset_unreadable:${next}`);
    for (const dependency of inspectDesignAuthorityShowcaseCss({
      source_path: next,
      content: asset.css,
      declared_assets: declared,
    }))
      reachable.add(dependency);
  }
}

function assertCurrentAuthority(
  manifest: DesignAuthorityShowcaseManifestV1,
  context: DesignAuthorityShowcaseContext,
): void {
  if (manifest.authority.closure_digest !== context.authority.closure_digest)
    invalid(
      `authority_closure_digest_mismatch:expected=${context.authority.closure_digest}:actual=${manifest.authority.closure_digest}`,
    );
  if (
    context.authority.revision === null ||
    manifest.authority.revision !== context.authority.revision
  )
    invalid(
      `authority_revision_mismatch:expected=${context.authority.revision ?? "not_declared"}:actual=${manifest.authority.revision}`,
    );
}

function assertDigest(expected: string, bytes: Buffer, file: string): void {
  const actual = `sha256:${sha256Hex(bytes)}`;
  if (actual !== expected)
    invalid(
      `file_digest_mismatch:${file}:expected=${expected}:actual=${actual}`,
    );
}

function enforceTotalBytes(
  manifest: Buffer,
  html: Buffer,
  assets: AcquiredShowcaseAsset[],
): void {
  const total =
    manifest.length +
    html.length +
    assets.reduce((sum, item) => sum + item.raw.length, 0);
  if (total > DESIGN_AUTHORITY_LIMITS.max_total_bytes)
    invalid(`total_byte_limit_exceeded:${total}`);
}

function summary(
  manifest: DesignAuthorityShowcaseManifestV1,
): DesignAuthorityShowcaseInspectionV1 {
  return {
    schema_version: 1,
    status: "valid",
    manifest_path: DESIGN_AUTHORITY_SHOWCASE_MANIFEST_PATH,
    artifact_category: manifest.artifact_category,
    authority: manifest.authority,
    html: manifest.html,
    assets: manifest.assets,
    coverage: {
      rendered: manifest.coverage
        .filter((item) => item.disposition === "rendered")
        .map((item) => item.key),
      not_applicable: manifest.coverage
        .filter((item) => item.disposition === "not_applicable")
        .map((item) => item.key),
    },
    indexes: {
      token_families: manifest.token_families.length,
      components: manifest.components.length,
      target_conditions: manifest.target_conditions.length,
    },
    external_network_dependencies: [],
    diagnostics: [],
  };
}

function empty(
  status: "not_evaluated" | "not_declared" | "invalid",
): DesignAuthorityShowcaseInspectionV1 {
  return {
    schema_version: 1,
    status,
    manifest_path: null,
    artifact_category: null,
    authority: null,
    html: null,
    assets: [],
    coverage: null,
    indexes: null,
    external_network_dependencies: null,
    diagnostics: [],
  };
}

function compare(left: string, right: string): number {
  return Buffer.from(left).compare(Buffer.from(right));
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function invalid(reason: string): never {
  throw new Error(`design_authority_showcase_invalid:${reason}`);
}
