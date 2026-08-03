import { readFile } from "node:fs/promises";
import path from "node:path";
import { assertProtectedRepositoryFile } from "./long-task-protected-files.js";
import {
  parseSemanticFactCompactCarrierShape,
  semanticFactRevisionDigest,
  semanticObligationRevisionDigest,
  type SemanticFactRevisionIdentityV1,
} from "./semantic-fact-compact-carrier.js";
import { parseSemanticFactManifestShape } from "./semantic-fact-manifest-shape.js";
import type { SemanticFactManifestV1 } from "./semantic-fact-types.js";
import {
  canonicalValueJson,
  parseStrictYaml,
  sha256Hex,
} from "./strict-codec.js";

const START =
  /^\s*```yaml[ \t]+(semantic-fact-manifest-v1|semantic-fact-compact-carrier-v1)[ \t]*$/u;
const END = /^\s*```[ \t]*$/u;

export interface ParsedSemanticFactManifestV1 {
  source_path: string;
  line: number;
  manifest: SemanticFactManifestV1;
  sha256: string;
  carrier: "expanded_v1" | "compact_v1";
  fact_revisions: SemanticFactRevisionIdentityV1[];
  obligation_revisions: SemanticFactRevisionIdentityV1[];
}

export function parseSemanticFactManifestBlocks(
  sourcePath: string,
  content: string,
): ParsedSemanticFactManifestV1[] {
  const rows: ParsedSemanticFactManifestV1[] = [];
  const lines = content.replace(/\r\n?/gu, "\n").split("\n");
  let open: { line: number; lines: string[]; kind: string } | null = null;
  for (const [index, line] of lines.entries()) {
    if (!open) {
      const match = START.exec(line);
      if (match)
        open = { line: index + 1, lines: [], kind: match[1] };
      continue;
    }
    if (!END.test(line)) {
      open.lines.push(line);
      continue;
    }
    const decoded = parseStrictYaml(open.lines.join("\n"));
    const compact = open.kind === "semantic-fact-compact-carrier-v1";
    const materialized = compact
      ? parseSemanticFactCompactCarrierShape(decoded)
      : null;
    const manifest = materialized
      ? materialized.manifest
      : parseSemanticFactManifestShape(decoded);
    rows.push({
      source_path: sourcePath,
      line: open.line,
      manifest,
      sha256: sha256Hex(canonicalValueJson(compact ? decoded : manifest)),
      carrier: compact ? "compact_v1" : "expanded_v1",
      fact_revisions:
        materialized?.fact_revisions ??
        manifest.facts.map((fact) => ({
          key: fact.key,
          revision_digest: semanticFactRevisionDigest(
            fact as unknown as Record<string, unknown>,
          ),
        })),
      obligation_revisions:
        materialized?.obligation_revisions ??
        manifest.proof_obligations.map((proof) => ({
          key: proof.key,
          revision_digest: semanticObligationRevisionDigest(
            proof as unknown as Record<string, unknown>,
          ),
        })),
    });
    open = null;
  }
  if (open)
    throw new Error(
      `source_formal_block_unclosed:${sourcePath}:${open.kind}:${open.line}`,
    );
  return rows;
}

export async function loadSemanticFactManifest(
  repository: string,
  sourcePaths: string[],
): Promise<ParsedSemanticFactManifestV1> {
  const rows: ParsedSemanticFactManifestV1[] = [];
  for (const [index, sourcePath] of sourcePaths.entries()) {
    if (!sourcePath.toLowerCase().endsWith(".md")) continue;
    const file = await assertProtectedRepositoryFile(
      repository,
      path.resolve(repository, ...sourcePath.split("/")),
      `semantic_fact_manifest_source:${index}:${sourcePath}`,
    );
    rows.push(
      ...parseSemanticFactManifestBlocks(
        sourcePath,
        await readFile(file, "utf8"),
      ),
    );
  }
  if (rows.length !== 1)
    throw new Error(
      `semantic_fact_manifest_exactly_one_required:${rows.length}`,
    );
  return rows[0];
}
