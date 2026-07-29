import { computeAuthorityHashes } from "./long-task-authority.js";
import {
  computeAuthorityMaterials,
  compiledAuthorityMaterials,
} from "./long-task-authority-materials.js";
import { addDiagnosticError } from "./long-task-authoring-preflight-diagnostics.js";
import type {
  AuthoringPreflightDiagnosticV1,
  AuthoringRevisionPreviewV1,
} from "./long-task-authoring-preflight-types.js";
import type {
  ContextAuthoritySnapshotV2,
  CompiledSourceItemV2,
  DeliveryContractV2,
} from "./long-task-delivery-types.js";
import {
  loadActiveLongTaskAuthority,
  type ActiveLongTaskAuthorityV3,
} from "./long-task-state.js";
import { canonicalValueJson, sha256Hex } from "./strict-codec.js";

export async function loadAuthoringActiveAuthority(
  repository: string,
  workdir: string,
  diagnostics: AuthoringPreflightDiagnosticV1[],
): Promise<ActiveLongTaskAuthorityV3 | null> {
  try {
    const active = (await loadActiveLongTaskAuthority(repository)).authority;
    if (active && active.workdir !== workdir)
      diagnostics.push({
        level: "error",
        code: "active_task_exists",
        message: `Another workdir owns Active Authority: ${active.workdir}`,
      });
    return active;
  } catch (error) {
    addDiagnosticError(diagnostics, error);
    return null;
  }
}

export function authoringRevisionPreview(
  contract: DeliveryContractV2,
  sourceHashes: Record<string, string> | null,
  sourceItems: CompiledSourceItemV2[] | null,
  context: ContextAuthoritySnapshotV2 | null,
  active: ActiveLongTaskAuthorityV3 | null,
): AuthoringRevisionPreviewV1 {
  if (!active)
    return {
      active: false,
      authority_revision: null,
      contract_changed: false,
      source_or_context_changed: false,
      declared_authority_sections_changed: [],
    };
  const hashes = computeAuthorityHashes(contract);
  const previousDeclaredHashes = computeAuthorityHashes({
    schema_version: "long-task-delivery-v2",
    semantic_fact_manifest: active.authority_snapshot.semantic_fact_manifest,
    task: active.authority_snapshot.task,
    source_claims: active.authority_snapshot.source_claims,
    stages: active.authority_snapshot.stages,
    risk: active.authority_snapshot.risk,
    global: active.authority_snapshot.global,
    outcomes: active.authority_snapshot.outcomes,
  });
  const declaredChanged = new Set(
    (Object.keys(hashes) as Array<keyof typeof hashes>)
      .filter((key) => hashes[key] !== previousDeclaredHashes[key])
      .map((key) => key.replace(/_authority_hash$/u, "")),
  );
  let sourceChanged = false;
  let contextChanged = false;
  if (sourceHashes && sourceItems && context) {
    const next = computeAuthorityMaterials(
      contract,
      sourceHashes,
      sourceItems,
      context,
    );
    const previous = compiledAuthorityMaterials(active.authority_snapshot);
    sourceChanged =
      canonicalValueJson({
        source_hashes: next.source_hashes,
        source_items: next.source_items,
      }) !==
      canonicalValueJson({
        source_hashes: previous.source_hashes,
        source_items: previous.source_items,
      });
    contextChanged =
      canonicalValueJson({
        context_snapshot: next.context_snapshot,
      }) !==
      canonicalValueJson({
        context_snapshot: previous.context_snapshot,
      });
    if (sourceChanged) declaredChanged.add("source");
    if (contextChanged) declaredChanged.add("context");
  }
  const sectionOrder = [
    "source",
    "product",
    "technical",
    "acceptance",
    "risk",
    "context",
  ];
  return {
    active: true,
    authority_revision: active.authority_revision,
    contract_changed:
      sha256Hex(canonicalValueJson(contract)) !==
      active.authority_snapshot.contract_sha256,
    source_or_context_changed: sourceChanged || contextChanged,
    declared_authority_sections_changed: sectionOrder.filter((section) =>
      declaredChanged.has(section),
    ),
  };
}
