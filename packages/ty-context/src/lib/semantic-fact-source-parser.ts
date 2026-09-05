import { readFile } from "node:fs/promises";
import path from "node:path";
import { assertProtectedRepositoryFile } from "./long-task-protected-files.js";
import {
  indexSemanticFactRevisionInputs,
  parseSemanticFactCompactCarrierForMigration,
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
import { forEachSourceLine } from "./source-line-scanner.js";

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

export interface SemanticFactManifestBlockSpanV1 {
  kind: "semantic-fact-manifest-v1" | "semantic-fact-compact-carrier-v1";
  line: number;
  start_offset: number;
  end_offset: number;
  body_start_offset: number;
  body_end_offset: number;
  line_ending: "\n" | "\r\n" | "\r";
}

/**
 * Locates the exact replaceable formal-block bytes without normalizing any
 * surrounding Markdown. Parsing and semantic validation remain owned by
 * parseSemanticFactManifestBlocks; this scanner exists only for bounded,
 * byte-preserving authoring rewrites.
 */
export function locateSemanticFactManifestBlockSpans(
  sourcePath: string,
  content: string,
): SemanticFactManifestBlockSpanV1[] {
  const rows: SemanticFactManifestBlockSpanV1[] = [];
  let open: {
    kind: SemanticFactManifestBlockSpanV1["kind"];
    line: number;
    start_offset: number;
    body_start_offset: number;
    line_ending: SemanticFactManifestBlockSpanV1["line_ending"];
  } | null = null;
  forEachSourceLine(
    content,
    (line, startOffset, endOffset, nextOffset, lineNumber) => {
      if (!open) {
        const match = START.exec(line);
        if (!match) return;
        const lineEnding = content.slice(endOffset, nextOffset);
        if (!["\n", "\r\n", "\r"].includes(lineEnding))
          throw new Error(
            `source_formal_block_opening_separator_required:${sourcePath}:${lineNumber}`,
          );
        open = {
          kind: match[1] as SemanticFactManifestBlockSpanV1["kind"],
          line: lineNumber,
          start_offset: startOffset,
          body_start_offset: nextOffset,
          line_ending:
            lineEnding as SemanticFactManifestBlockSpanV1["line_ending"],
        };
        return;
      }
      if (!END.test(line)) return;
      rows.push({
        kind: open.kind,
        line: open.line,
        start_offset: open.start_offset,
        end_offset: endOffset,
        body_start_offset: open.body_start_offset,
        body_end_offset: startOffset,
        line_ending: open.line_ending,
      });
      open = null;
    },
  );
  const unclosed = open as {
    kind: SemanticFactManifestBlockSpanV1["kind"];
    line: number;
  } | null;
  if (unclosed)
    throw new Error(
      `source_formal_block_unclosed:${sourcePath}:${unclosed.kind}:${unclosed.line}`,
    );
  return rows;
}

export function parseSemanticFactManifestBlocks(
  sourcePath: string,
  content: string,
): ParsedSemanticFactManifestV1[] {
  return parseSemanticFactManifestBlocksWithMode(sourcePath, content, false);
}

export function parseSemanticFactManifestBlocksForMigration(
  sourcePath: string,
  content: string,
): ParsedSemanticFactManifestV1[] {
  return parseSemanticFactManifestBlocksWithMode(sourcePath, content, true);
}

function parseSemanticFactManifestBlocksWithMode(
  sourcePath: string,
  content: string,
  allowLegacyRevisionIdentity: boolean,
): ParsedSemanticFactManifestV1[] {
  const rows: ParsedSemanticFactManifestV1[] = [];
  const lines = content.replace(/\r\n?/gu, "\n").split("\n");
  let open: { line: number; lines: string[]; kind: string } | null = null;
  for (const [index, line] of lines.entries()) {
    if (!open) {
      const match = START.exec(line);
      if (match) open = { line: index + 1, lines: [], kind: match[1] };
      continue;
    }
    if (!END.test(line)) {
      open.lines.push(line);
      continue;
    }
    const decoded = parseStrictYaml(open.lines.join("\n"));
    const compact = open.kind === "semantic-fact-compact-carrier-v1";
    const materialized = compact
      ? allowLegacyRevisionIdentity
        ? parseSemanticFactCompactCarrierForMigration(decoded)
        : parseSemanticFactCompactCarrierShape(decoded)
      : null;
    const manifest = materialized
      ? materialized.manifest
      : parseSemanticFactManifestShape(decoded);
    const expandedRevisions = materialized
      ? null
      : semanticFactRevisionIdentities(manifest);
    rows.push({
      source_path: sourcePath,
      line: open.line,
      manifest,
      sha256: sha256Hex(canonicalValueJson(compact ? decoded : manifest)),
      carrier: compact ? "compact_v1" : "expanded_v1",
      fact_revisions: materialized?.fact_revisions ?? expandedRevisions!.facts,
      obligation_revisions:
        materialized?.obligation_revisions ?? expandedRevisions!.obligations,
    });
    open = null;
  }
  if (open)
    throw new Error(
      `source_formal_block_unclosed:${sourcePath}:${open.kind}:${open.line}`,
    );
  return rows;
}

function semanticFactRevisionIdentities(manifest: SemanticFactManifestV1): {
  facts: SemanticFactRevisionIdentityV1[];
  obligations: SemanticFactRevisionIdentityV1[];
} {
  const inputRevisionsByFact = indexSemanticFactRevisionInputs(
    manifest.inputs as unknown as Record<string, unknown>[],
  );
  const facts = manifest.facts.map((fact) => ({
    key: fact.key,
    revision_digest: semanticFactRevisionDigest(
      fact as unknown as Record<string, unknown>,
      inputRevisionsByFact,
    ),
  }));
  const factRevisionByKey = new Map(
    facts.map((item) => [item.key, item.revision_digest]),
  );
  const obligations = manifest.proof_obligations.map((proof) => {
    const factRevision = factRevisionByKey.get(proof.fact_ref);
    if (!factRevision)
      throw new Error(
        `semantic_fact_revision_unknown_fact:${proof.key}:${proof.fact_ref}`,
      );
    return {
      key: proof.key,
      revision_digest: semanticObligationRevisionDigest(
        proof as unknown as Record<string, unknown>,
        factRevision,
      ),
    };
  });
  return { facts, obligations };
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
