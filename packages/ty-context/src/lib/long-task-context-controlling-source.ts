import { readFile } from "node:fs/promises";
import { TextDecoder } from "node:util";
import {
  contextControllingSourceConflicts,
  resolveContextControllingSourceDeclaration,
} from "./context-controlling-source.js";
import type { CapturedContextGraphSnapshot } from "./context-graph-snapshot.js";
import { extractContextMarkdown } from "./context-markdown/context-markdown-extract.js";
import type {
  ContextControllingSourceDeclaration,
  ContextControllingSourceDomain,
} from "./context-markdown/context-markdown-types.js";
import type {
  CompiledSourceItemV2,
  DeliveryContractV2,
} from "./long-task-delivery-types.js";
import { sourceAuthorityDomain } from "./long-task-source-fragments.js";
import { sha256Hex } from "./strict-codec.js";

export type ValidContextControllingSourceDeclaration =
  ContextControllingSourceDeclaration & {
    target_path: string;
    status: "valid";
  };

export async function captureLongTaskContextControllingSources(
  repository: string,
  context: CapturedContextGraphSnapshot,
): Promise<ValidContextControllingSourceDeclaration[]> {
  const declarations: ContextControllingSourceDeclaration[] = [];
  for (const contextPath of context.routing_files) {
    if (!contextPath.endsWith(".md")) continue;
    const physical = context.physical_files.get(contextPath);
    if (!physical)
      throw new Error(
        `context_controlling_source_context_path_missing:${contextPath}`,
      );
    const bytes = await readFile(physical);
    if (sha256Hex(bytes) !== context.snapshot.sha256[contextPath])
      throw new Error(
        `context_controlling_source_context_changed:${contextPath}`,
      );
    const content = decodeStrictUtf8(bytes);
    if (content === null)
      throw new Error(
        `context_controlling_source_context_invalid_utf8:${contextPath}`,
      );
    const extracted = extractContextMarkdown(content, contextPath);
    const malformed = extracted.invalid_declarations.filter((declaration) =>
      declaration.raw.includes("ty-context-controlling-source"),
    );
    if (malformed.length)
      throw new Error(
        `context_controlling_source_declaration_invalid:${malformed
          .map((declaration) => `${declaration.path}:${declaration.line}`)
          .join(",")}`,
      );
    for (const declaration of extracted.controlling_sources)
      declarations.push(
        await resolveContextControllingSourceDeclaration(
          repository,
          declaration,
        ),
      );
  }
  const invalid = declarations.filter(
    (declaration) =>
      declaration.status !== "valid" || declaration.target_path === null,
  );
  if (invalid.length)
    throw new Error(
      `context_controlling_source_invalid:${invalid
        .map(
          (declaration) =>
            `${declaration.source_path}:${declaration.line}:${declaration.declared_path}:${declaration.status}`,
        )
        .join(",")}`,
    );
  const conflicts = contextControllingSourceConflicts(declarations);
  if (conflicts.length)
    throw new Error(
      `context_controlling_source_conflict:${conflicts
        .map(
          (conflict) =>
            `${conflict.target_path}:${conflict.kind}:${conflict.domains.join("+")}`,
        )
        .join(",")}`,
    );
  return (declarations as ValidContextControllingSourceDeclaration[]).sort(
    (left, right) =>
      left.target_path.localeCompare(right.target_path) ||
      left.domain.localeCompare(right.domain) ||
      left.source_path.localeCompare(right.source_path) ||
      left.line - right.line,
  );
}

export function validateLongTaskContextControllingSourceClosure(
  contract: Pick<DeliveryContractV2, "task">,
  declarations: readonly ValidContextControllingSourceDeclaration[],
  sourceItems: readonly CompiledSourceItemV2[],
  designOwnedSourceItems: ReadonlySet<string>,
): void {
  const declaredSourcePaths = new Set(contract.task.source_paths);
  for (const declaration of declarations) {
    if (!declaredSourcePaths.has(declaration.target_path))
      fail(
        "path_not_declared",
        `${declaration.source_path}:${declaration.line}:${declaration.target_path}`,
      );
    const items = sourceItems.filter(
      (item) => item.source_path === declaration.target_path,
    );
    if (!items.length)
      fail("material_source_required", declaration.target_path);
    const domains = new Set<ContextControllingSourceDomain>(
      items.map((item) =>
        sourceAuthorityDomain(item, designOwnedSourceItems.has(item.key)),
      ),
    );
    if (!domains.has(declaration.domain))
      fail(
        "domain_unrepresented",
        `${declaration.target_path}:${declaration.domain}:${[...domains].sort().join("+") || "none"}`,
      );
  }
}

function decodeStrictUtf8(bytes: Uint8Array): string | null {
  try {
    const value = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    return value.includes("\0") ? null : value;
  } catch {
    return null;
  }
}

function fail(code: string, detail: string): never {
  throw new Error(`context_controlling_source_${code}:${detail}`);
}
