import { readFile } from "node:fs/promises";
import { loadContextCatalog } from "../context-catalog/catalog-load.js";
import { catalogErrors } from "../context-catalog/catalog-diagnostics.js";
import { resolveCatalogFile } from "../context-catalog/catalog-paths.js";
import { assertProtectedRepositoryFile } from "../repository-path-safety.js";
import { validateContextContentForRole } from "../validators.js";
import { validateLiveContextMove } from "../context-move/context-move-live-validation.js";
import {
  contextCatalogIdentity,
  contextFootprintState,
} from "./mutation-staged-fs.js";
import type { ContextMutationJournal } from "./mutation-types.js";

export async function validateLiveContextMutation(
  repository: string,
  journal: ContextMutationJournal,
): Promise<void> {
  const catalog = await loadContextCatalog(repository);
  const errors = catalogErrors(catalog.diagnostics);
  if (errors.length) invalid(`live_catalog:${errors.join("|")}`);
  if (contextCatalogIdentity(catalog) !== journal.catalog_after_identity)
    invalid("live_catalog_identity_mismatch");
  const footprint = contextFootprintState(catalog);
  if (
    footprint.bytes !== journal.operation_data.expected_default_bytes ||
    !sameArray(footprint.paths, journal.operation_data.expected_default_paths)
  )
    invalid("live_default_footprint_mismatch");
  if (journal.operation_data.kind === "register") {
    const data = journal.operation_data;
    const registered = catalog.registered_contexts.filter(
      (entry) => entry.path === data.context_path && entry.source === "context",
    );
    if (registered.length !== 1) invalid("live_registration_missing");
    if (
      registered[0].role !== data.role ||
      registered[0].read_policy !== data.read_policy
    )
      invalid("live_registration_metadata_mismatch");
    const file = resolveCatalogFile(catalog, data.context_path);
    if (!file) invalid("live_registration_file_missing");
    const absolute = await assertProtectedRepositoryFile(
      repository,
      file.absolute_path,
      "context_mutation_registered_context",
    );
    const content = await readFile(absolute, "utf8");
    const recoveryErrors = validateContextContentForRole(
      repository,
      data.context_path,
      content,
      data.role,
    );
    if (recoveryErrors.length)
      invalid(`live_context_recovery:${recoveryErrors.join("|")}`);
    return;
  }
  await validateLiveContextMove(repository, catalog, journal);
}

export async function validateRolledBackContextMutation(
  repository: string,
  journal: ContextMutationJournal,
): Promise<void> {
  const catalog = await loadContextCatalog(repository);
  if (contextCatalogIdentity(catalog) !== journal.catalog_before_identity)
    invalid("rollback_catalog_identity_mismatch");
}

function sameArray(left: string[], right: string[]): boolean {
  return (
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
}

function invalid(reason: string): never {
  throw new Error(`context_mutation_invalid:${reason}`);
}
