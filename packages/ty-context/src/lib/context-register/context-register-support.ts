import { readFile } from "node:fs/promises";
import path from "node:path";
import type { ContextCatalog } from "../context-catalog/catalog-types.js";
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
): void {
  const folded = contextPath.toLocaleLowerCase("en-US");
  const registered = catalog.registered_contexts.find(
    (entry) => entry.path.toLocaleLowerCase("en-US") === folded,
  );
  if (registered)
    mutationCatalogFailure(
      `Context is already registered as ${registered.path}`,
    );
  const file = catalog.unregistered_context_files.find(
    (entry) => entry.path.toLocaleLowerCase("en-US") === folded,
  );
  if (!file)
    mutationIoFailure(
      `context register requires an existing unregistered file: ${contextPath}`,
    );
  if (file.path !== contextPath)
    mutationIoFailure(
      `context register path case does not match existing file: ${file.path}`,
    );
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
  relative: string,
): Promise<string> {
  try {
    const absolute = await assertProtectedRepositoryFile(
      repository,
      path.join(repository, ...relative.split("/")),
      "context_register_source",
    );
    return decodeMutationUtf8(await readFile(absolute), relative);
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
