import { readFile } from "node:fs/promises";
import { portableContextPathCaseKey } from "../context-catalog/catalog-paths.js";
import type {
  CatalogFile,
  ContextCatalog,
} from "../context-catalog/catalog-types.js";
import {
  decodeMutationUtf8,
  mutationCatalogFailure,
  mutationIoFailure,
  mutationMessage,
} from "../context-mutation/mutation-command-support.js";
import { assertProtectedRepositoryFile } from "../repository-path-safety.js";
import type { NormalizedRegisterInput } from "./context-register-input.js";

export function assertRegistrationTarget(
  catalog: ContextCatalog,
  contextPath: string,
): CatalogFile {
  const folded = portableContextPathCaseKey(contextPath);
  const registered = catalog.registered_contexts.find(
    (entry) => portableContextPathCaseKey(entry.path) === folded,
  );
  if (registered)
    mutationCatalogFailure(
      `Context is already registered as ${registered.path}`,
    );
  const file = catalog.unregistered_context_files.find(
    (entry) => portableContextPathCaseKey(entry.path) === folded,
  );
  if (!file)
    mutationIoFailure(
      `context register requires an existing unregistered file: ${contextPath}`,
    );
  if (file.path !== contextPath)
    mutationIoFailure(
      `context register path case does not match existing file: ${file.path}`,
    );
  return file;
}

export function assertStagedRegistration(
  catalog: ContextCatalog,
  input: NormalizedRegisterInput,
): void {
  const matches = catalog.registered_contexts.filter(
    (entry) => entry.source === "context" && entry.path === input.path,
  );
  if (matches.length !== 1)
    mutationCatalogFailure("staged registration is not unique");
  if (
    matches[0].role !== input.role ||
    matches[0].read_policy !== input.read_policy
  )
    mutationCatalogFailure(
      "staged registration metadata does not match the request",
    );
}

export async function readContextContent(
  repository: string,
  file: CatalogFile,
): Promise<string> {
  try {
    const absolute = await assertProtectedRepositoryFile(
      repository,
      file.absolute_path,
      "context_register_source",
    );
    return decodeMutationUtf8(await readFile(absolute), file.path);
  } catch (error) {
    mutationIoFailure(
      `unable to read Context registration source: ${mutationMessage(error)}`,
      error,
    );
  }
}

export function renderAppendDiff(file: string, block: string): string {
  return [
    `--- ${file}`,
    `+++ ${file}`,
    "@@ append context @@",
    ...block
      .replace(/\r\n/gu, "\n")
      .trimEnd()
      .split("\n")
      .map((line) => `+${line}`),
    "",
  ].join("\n");
}
