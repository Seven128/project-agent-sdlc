import { CLI_EXIT_CODES, CliCommandError } from "../cli-exit.js";
import { catalogErrors } from "../context-catalog/catalog-diagnostics.js";
import { loadContextCatalog } from "../context-catalog/catalog-load.js";
import type { ContextCatalog } from "../context-catalog/catalog-types.js";
import { readContextMutationJournal } from "./mutation-journal.js";

export async function assertNoUnfinishedContextMutation(
  repository: string,
): Promise<void> {
  let journal;
  try {
    journal = await readContextMutationJournal(repository);
  } catch (error) {
    mutationIoFailure(
      `unable to inspect Context mutation journal: ${mutationMessage(error)}`,
      error,
    );
  }
  if (journal)
    mutationIoFailure(
      `unfinished Context mutation ${journal.transaction_id} exists; run ty-context context transaction status and then rollback or complete`,
    );
}

export async function loadMutationCatalog(
  repository: string,
  fileOverrides?: ReadonlyMap<string, Uint8Array | null>,
  directoryOverrides?: ReadonlySet<string>,
): Promise<ContextCatalog> {
  try {
    return await loadContextCatalog(repository, {
      file_overrides: fileOverrides,
      directory_overrides: directoryOverrides,
    });
  } catch (error) {
    mutationIoFailure(
      `unable to load Context Catalog: ${mutationMessage(error)}`,
      error,
    );
  }
}

export function assertMutationCatalogValid(
  catalog: ContextCatalog,
  prefix: string,
): void {
  const errors = catalogErrors(catalog.diagnostics);
  if (errors.length) mutationCatalogFailure(`${prefix}: ${errors.join("; ")}`);
}

export function mutationStateBytes(state: {
  bytes_base64: string | null;
}): Buffer {
  if (state.bytes_base64 === null)
    mutationIoFailure("mutation snapshot bytes are missing");
  return Buffer.from(state.bytes_base64, "base64");
}

export function decodeMutationUtf8(bytes: Uint8Array, file: string): string {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch (error) {
    mutationCatalogFailure(`${file} must be valid UTF-8`, error);
  }
}

export function sameMutationArray(left: string[], right: string[]): boolean {
  return (
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
}

export function mutationCatalogFailure(
  messageText: string,
  cause?: unknown,
): never {
  throw new CliCommandError(CLI_EXIT_CODES.catalog, messageText, { cause });
}

export function mutationIoFailure(messageText: string, cause?: unknown): never {
  throw new CliCommandError(CLI_EXIT_CODES.io, messageText, { cause });
}

export function mutationMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
