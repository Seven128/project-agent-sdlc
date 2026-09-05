import { readFile, realpath } from "node:fs/promises";
import { TextDecoder } from "node:util";
import {
  compareUtf8Paths,
  normalizeContextPath,
  repositoryRelativePathSpelling,
} from "./context-catalog/catalog-paths.js";
import type {
  ContextControllingSourceConflict,
  ContextControllingSourceDeclaration,
  ContextControllingSourceRawDeclaration,
} from "./context-markdown/context-markdown-types.js";
import { normalizeRepositoryFile } from "./long-task-paths.js";
import { assertSafeRepositoryFilePath } from "./repository-path-safety.js";

export async function resolveContextControllingSourceDeclaration(
  projectRoot: string,
  declaration: ContextControllingSourceRawDeclaration,
): Promise<ContextControllingSourceDeclaration> {
  let targetPath: string;
  try {
    targetPath = canonicalControllingSourcePath(declaration.declared_path);
  } catch (error) {
    return invalidDeclaration(declaration, null, error);
  }
  try {
    const safe = await assertSafeRepositoryFilePath(
      projectRoot,
      targetPath,
      `context_controlling_source:${declaration.source_path}:${declaration.line}`,
    );
    const physicalPath = normalizeContextPath(
      repositoryRelativePathSpelling(
        projectRoot,
        await realpath(safe.absolute),
      ),
    );
    if (physicalPath !== targetPath)
      return {
        ...declaration,
        target_path: targetPath,
        status: "invalid",
        detail: `declared path casing or spelling differs from the physical repository path ${physicalPath}`,
      };
    const decoded = decodeStrictUtf8(await readFile(safe.absolute));
    if (decoded === null)
      return {
        ...declaration,
        target_path: targetPath,
        status: "invalid",
        detail:
          "declared controlling Source must be a non-NUL strict UTF-8 file",
      };
    return {
      ...declaration,
      target_path: targetPath,
      status: "valid",
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const status = message.includes("not_found") ? "missing" : "invalid";
    return {
      ...declaration,
      target_path: targetPath,
      status,
      detail: message,
    };
  }
}

export function contextControllingSourceConflicts(
  declarations: readonly ContextControllingSourceDeclaration[],
): ContextControllingSourceConflict[] {
  const byTarget = new Map<string, ContextControllingSourceDeclaration[]>();
  for (const declaration of declarations) {
    if (declaration.status !== "valid" || !declaration.target_path) continue;
    const rows = byTarget.get(declaration.target_path) ?? [];
    rows.push(declaration);
    byTarget.set(declaration.target_path, rows);
  }
  const conflicts: ContextControllingSourceConflict[] = [];
  for (const [targetPath, rows] of byTarget) {
    if (rows.length < 2) continue;
    const domains = [...new Set(rows.map((row) => row.domain))].sort();
    conflicts.push({
      kind: domains.length === 1 ? "duplicate" : "domain_conflict",
      target_path: targetPath,
      domains,
      owners: rows
        .map((row) => ({
          source_path: row.source_path,
          line: row.line,
          domain: row.domain,
        }))
        .sort(
          (left, right) =>
            compareUtf8Paths(left.source_path, right.source_path) ||
            left.line - right.line ||
            left.domain.localeCompare(right.domain),
        ),
    });
  }
  return conflicts.sort((left, right) =>
    compareUtf8Paths(left.target_path, right.target_path),
  );
}

export function canonicalControllingSourcePath(value: string): string {
  if (value !== value.normalize("NFC") || value !== value.trim())
    throw new Error(`context_controlling_source_path_noncanonical:${value}`);
  if (value.includes("\\") || /[?#]/u.test(value))
    throw new Error(`context_controlling_source_path_noncanonical:${value}`);
  const normalized = normalizeRepositoryFile(
    value,
    "context_controlling_source",
  );
  if (normalized !== value)
    throw new Error(`context_controlling_source_path_noncanonical:${value}`);
  return normalized;
}

function invalidDeclaration(
  declaration: ContextControllingSourceRawDeclaration,
  targetPath: string | null,
  error: unknown,
): ContextControllingSourceDeclaration {
  return {
    ...declaration,
    target_path: targetPath,
    status: "invalid",
    detail: error instanceof Error ? error.message : String(error),
  };
}

function decodeStrictUtf8(bytes: Uint8Array): string | null {
  try {
    const value = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    return value.includes("\0") ? null : value;
  } catch {
    return null;
  }
}
