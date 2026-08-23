import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import type {
  DesignResourceTechnicalFeasibilityInputV1,
  DesignResourceTechnicalSourceRecordV1,
  LoadedDesignResourceImplementationFeasibilityV1,
} from "./design-resource-implementation-feasibility-types.js";
import type { DesignResourceImplementationFeasibilityTargetModel } from "./design-resource-implementation-feasibility-model.js";
import { parseDesignResourceImplementationFeasibilityJson } from "./design-resource-implementation-feasibility-shape.js";
import {
  loadDesignResourceFeasibilityDecisionSource,
  type DesignResourceFeasibilityDecisionSourceIndex,
  type LoadedDesignResourceFeasibilityDecisionSource,
} from "./design-resource-implementation-feasibility-source-decision.js";
import { validateFeasibilityDocument } from "./design-resource-implementation-feasibility-validation-document.js";
import {
  invalidFeasibility,
  unique,
} from "./design-resource-implementation-feasibility-validation-support.js";
import { assertProtectedRepositoryFile } from "./long-task-protected-files.js";
import { sha256Hex } from "./strict-codec.js";

const FEASIBILITY_MAX_BYTES = 2_097_152;
const TECHNICAL_SOURCE_MAX_BYTES = 16_777_216;

export async function readAndValidateDesignResourceImplementationFeasibility(
  repository: string,
  handoffPath: string,
  inputs: DesignResourceTechnicalFeasibilityInputV1[],
  targetModels: Map<string, DesignResourceImplementationFeasibilityTargetModel>,
  canonicalResourcePaths: Set<string>,
): Promise<LoadedDesignResourceImplementationFeasibilityV1[]> {
  unique(
    inputs.map((item) => item.key),
    "input_key_duplicate",
  );
  unique(
    inputs.map((item) => item.path),
    "input_path_duplicate",
  );
  unique(
    inputs.map((item) => item.target_ref),
    "input_target_duplicate",
  );
  for (const input of inputs)
    if (!targetModels.has(input.target_ref))
      invalidFeasibility("input_target_unknown", input.target_ref);
  validateTargetInputCoverage(inputs, targetModels);
  const loaded: LoadedDesignResourceImplementationFeasibilityV1[] = [];
  const sourcePathIdentities = new Map<string, string>();
  for (const input of inputs) {
    const model = targetModels.get(input.target_ref);
    if (!model) invalidFeasibility("input_target_unknown", input.target_ref);
    if (input.path === handoffPath)
      invalidFeasibility("input_must_not_be_handoff", input.key);
    if (canonicalResourcePaths.has(input.path))
      invalidFeasibility("input_mixed_into_canonical_resources", input.path);
    const file = await assertProtectedRepositoryFile(
      repository,
      path.resolve(repository, ...input.path.split("/")),
      `design_resource_feasibility:${input.key}`,
    );
    const size = (await stat(file)).size;
    if (size > FEASIBILITY_MAX_BYTES)
      invalidFeasibility(
        "input_byte_limit_exceeded",
        `${input.key}:bytes=${size}:limit=${FEASIBILITY_MAX_BYTES}`,
      );
    const bytes = await readFile(file);
    const digest = sha256Hex(bytes);
    if (digest !== input.sha256)
      invalidFeasibility(
        "input_digest_mismatch",
        `${input.key}:${input.sha256}:${digest}`,
      );
    const content = bytes.toString("utf8");
    if (!Buffer.from(content, "utf8").equals(bytes))
      invalidFeasibility("input_utf8_invalid", input.key);
    const document = parseDesignResourceImplementationFeasibilityJson(content);
    if (document.key !== input.key)
      invalidFeasibility("input_key_mismatch", `${input.key}:${document.key}`);
    if (document.target_ref !== input.target_ref)
      invalidFeasibility(
        "input_target_mismatch",
        `${input.target_ref}:${document.target_ref}`,
      );
    const decisionSources = await validateTechnicalSourceRecords(
      repository,
      handoffPath,
      input.path,
      document.source_records,
      canonicalResourcePaths,
      sourcePathIdentities,
    );
    await validateFeasibilityDocument(
      repository,
      document,
      model,
      decisionSources,
    );
    loaded.push({
      index: input,
      document,
      identity: {
        key: input.key,
        target_ref: input.target_ref,
        path: input.path,
        sha256: digest,
        realization_mode: document.realization_mode,
        component_family_cells: document.component_family_cells.length,
        blockers: document.blockers.length,
      },
    });
  }
  return loaded;
}

function validateTargetInputCoverage(
  inputs: DesignResourceTechnicalFeasibilityInputV1[],
  targetModels: Map<string, DesignResourceImplementationFeasibilityTargetModel>,
): void {
  if (!inputs.length) return;
  const indexedTargets = new Set(inputs.map((item) => item.target_ref));
  for (const model of targetModels.values())
    if (
      model.source_profile_kind !== "reference" &&
      !indexedTargets.has(model.target_ref)
    )
      invalidFeasibility(
        "implementation_target_input_missing",
        model.target_ref,
      );
}

async function validateTechnicalSourceRecords(
  repository: string,
  handoffPath: string,
  inputPath: string,
  records: DesignResourceTechnicalSourceRecordV1[],
  canonicalResourcePaths: Set<string>,
  sharedPathIdentities: Map<string, string>,
): Promise<DesignResourceFeasibilityDecisionSourceIndex> {
  const decisionSources: DesignResourceFeasibilityDecisionSourceIndex =
    new Map();
  unique(
    records.map((item) => item.key),
    "source_record_key_duplicate",
  );
  unique(
    records.map(
      (item) => `${item.path}\0${item.locator.kind}\0${item.locator.value}`,
    ),
    "source_record_locator_duplicate",
  );
  for (const record of records) {
    if (!record.roles.length)
      invalidFeasibility("source_record_roles_required", record.key);
    unique(record.roles, "source_record_role_duplicate", record.key);
    if (record.path === handoffPath || record.path === inputPath)
      invalidFeasibility(
        "source_record_self_reference",
        `${record.key}:${record.path}`,
      );
    if (canonicalResourcePaths.has(record.path))
      invalidFeasibility(
        "technical_source_mixed_into_canonical_resources",
        record.path,
      );
    validateSharedSourceIdentity(record, sharedPathIdentities);
    const file = await assertProtectedRepositoryFile(
      repository,
      path.resolve(repository, ...record.path.split("/")),
      `design_resource_feasibility_source:${record.key}`,
    );
    const size = (await stat(file)).size;
    if (size > TECHNICAL_SOURCE_MAX_BYTES)
      invalidFeasibility(
        "source_record_byte_limit_exceeded",
        `${record.key}:bytes=${size}:limit=${TECHNICAL_SOURCE_MAX_BYTES}`,
      );
    const bytes = await readFile(file);
    const digest = sha256Hex(bytes);
    if (digest !== record.sha256)
      invalidFeasibility(
        "source_record_digest_mismatch",
        `${record.key}:${record.sha256}:${digest}`,
      );
    const decisionSource = validateSourceLocator(record, bytes);
    if (decisionSource) decisionSources.set(record.key, decisionSource);
  }
  return decisionSources;
}

function validateSharedSourceIdentity(
  record: DesignResourceTechnicalSourceRecordV1,
  sharedPathIdentities: Map<string, string>,
): void {
  const identity = `${record.media_type}\0${record.sha256}`;
  const previous = sharedPathIdentities.get(record.path);
  if (previous && previous !== identity)
    invalidFeasibility("source_record_path_identity_conflict", record.path);
  sharedPathIdentities.set(record.path, identity);
}

function validateSourceLocator(
  record: DesignResourceTechnicalSourceRecordV1,
  bytes: Buffer,
): LoadedDesignResourceFeasibilityDecisionSource | null {
  if (record.locator.kind === "whole_resource") return null;
  const content = bytes.toString("utf8");
  if (!Buffer.from(content, "utf8").equals(bytes))
    invalidFeasibility("source_record_utf8_invalid", record.key);
  if (record.locator.kind === "source_item")
    return loadDesignResourceFeasibilityDecisionSource(record, content);
  if (record.locator.kind === "json_pointer") {
    validateJsonPointer(record, content);
    return null;
  }
  if (!content.includes(record.locator.value))
    invalidFeasibility(
      "source_record_locator_unresolved",
      `${record.key}:${record.locator.value}`,
    );
  return null;
}

function validateJsonPointer(
  record: DesignResourceTechnicalSourceRecordV1,
  content: string,
): void {
  let current: unknown;
  try {
    current = JSON.parse(content);
  } catch {
    invalidFeasibility("source_record_json_invalid", record.key);
  }
  for (const raw of record.locator.value.slice(1).split("/")) {
    const segment = raw.replace(/~1/gu, "/").replace(/~0/gu, "~");
    if (
      !current ||
      typeof current !== "object" ||
      !Object.hasOwn(current, segment)
    )
      invalidFeasibility(
        "source_record_locator_unresolved",
        `${record.key}:${record.locator.value}`,
      );
    current = (current as Record<string, unknown>)[segment];
  }
}
