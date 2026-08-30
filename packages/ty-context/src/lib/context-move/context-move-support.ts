import { lstat, readFile } from "node:fs/promises";
import path from "node:path";
import { assertCatalogStagedFilePath } from "../context-catalog/catalog-staged-path-safety.js";
import { compareUtf8Paths } from "../context-catalog/catalog-paths.js";
import type {
  CatalogRegisteredContext,
  ContextCatalog,
} from "../context-catalog/catalog-types.js";
import {
  decodeMutationUtf8,
  mutationCatalogFailure,
  mutationIoFailure,
  mutationMessage,
} from "../context-mutation/mutation-command-support.js";
import { assertProtectedRepositoryFile } from "../repository-path-safety.js";

export function assertContextMoveEndpoints(
  catalog: ContextCatalog,
  fromPath: string,
  toPath: string,
): CatalogRegisteredContext {
  const source = catalog.registered_contexts.filter(
    (entry) => entry.path === fromPath,
  );
  if (source.length !== 1)
    mutationCatalogFailure(
      `context move requires exactly one registered source: ${fromPath}`,
    );
  const folded = fold(toPath);
  const collision = catalog.context_files.find(
    (entry) => fold(entry.path) === folded,
  );
  if (collision)
    mutationIoFailure(`context move target already exists: ${collision.path}`);
  const registered = catalog.registered_contexts.find(
    (entry) => fold(entry.path) === folded,
  );
  if (registered)
    mutationCatalogFailure(
      `context move target is already registered: ${registered.path}`,
    );
  return source[0];
}

export function assertStagedContextMoveOwner(
  catalog: ContextCatalog,
  owner: CatalogRegisteredContext,
  from: string,
  to: string,
): void {
  const matches = catalog.registered_contexts.filter(
    (entry) => entry.path === to,
  );
  if (
    matches.length !== 1 ||
    matches[0].source !== owner.source ||
    matches[0].role !== owner.role ||
    (matches[0].read_policy ?? null) !== (owner.read_policy ?? null) ||
    catalog.registered_contexts.some((entry) => entry.path === from)
  )
    mutationCatalogFailure("staged Context move changed owner metadata");
}

export async function missingContextMoveDirectories(
  repository: string,
  targetPath: string,
): Promise<string[]> {
  const parent = path.posix.dirname(targetPath);
  const directories: string[] = [];
  let cursor = "";
  for (const segment of parent.split("/")) {
    cursor = cursor ? `${cursor}/${segment}` : segment;
    const absolute = path.join(repository, ...cursor.split("/"));
    const status = await lstat(absolute).catch(
      (error: NodeJS.ErrnoException) => {
        if (error.code === "ENOENT") return null;
        throw error;
      },
    );
    if (!status) directories.push(cursor);
    else if (!status.isDirectory() || status.isSymbolicLink())
      mutationIoFailure(`context move target parent is unsafe: ${cursor}`);
  }
  const staged = new Set(directories);
  try {
    await assertCatalogStagedFilePath(
      repository,
      targetPath,
      staged,
      "context_move_target",
    );
  } catch (error) {
    mutationIoFailure(
      `context move target is unsafe: ${mutationMessage(error)}`,
      error,
    );
  }
  return directories;
}

export async function readContextMoveMarkdown(
  repository: string,
  catalog: ContextCatalog,
): Promise<
  Map<string, { path: string; physical_path: string; content: string }>
> {
  const result = new Map<
    string,
    { path: string; physical_path: string; content: string }
  >();
  for (const file of [...catalog.context_files].sort((left, right) =>
    compareUtf8Paths(left.path, right.path),
  )) {
    try {
      const absolute = await assertProtectedRepositoryFile(
        repository,
        file.absolute_path,
        "context_move_markdown",
      );
      result.set(file.path, {
        path: file.path,
        physical_path: file.physical_path,
        content: decodeMutationUtf8(await readFile(absolute), file.path),
      });
    } catch (error) {
      mutationIoFailure(
        `unable to read Context Markdown ${file.path}: ${mutationMessage(error)}`,
        error,
      );
    }
  }
  return result;
}

export function renderContextMoveFileDiff(
  file: string,
  before: string,
  after: string,
): string {
  if (before === after) return "";
  const previous = before.replace(/\r\n/gu, "\n").split("\n");
  const next = after.replace(/\r\n/gu, "\n").split("\n");
  return [
    `--- ${file}`,
    `+++ ${file}`,
    "@@ exact byte replacement @@",
    ...previous.map((line) => `-${line}`),
    ...next.map((line) => `+${line}`),
    "",
  ].join("\n");
}

function fold(value: string): string {
  return value.normalize("NFC").toLocaleLowerCase("en-US");
}
