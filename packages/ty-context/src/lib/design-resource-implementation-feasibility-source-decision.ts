import type { SourceItemKind } from "./long-task-source-authority-types.js";
import { parseSourceDocument } from "./long-task-source-item-parser.js";
import type {
  DesignResourceImplementationFeasibilityV1,
  DesignResourceTechnicalSourceRecordV1,
} from "./design-resource-implementation-feasibility-types.js";
import type { DesignResourceImplementationFeasibilityTargetModel } from "./design-resource-implementation-feasibility-model.js";
import { invalidFeasibility } from "./design-resource-implementation-feasibility-validation-support.js";
import {
  parseDesignResourceFeasibilityDecisionProjections,
  type DesignResourceFeasibilityDecisionProjection,
} from "./design-resource-implementation-feasibility-source-decision-projection.js";
import { createSymbolicDenotationCompilationSession } from "./symbolic-denotation-engine.js";
import { canonicalValueJson, sha256Hex } from "./strict-codec.js";

export {
  DESIGN_RESOURCE_FEASIBILITY_DECISION_SCHEMA,
  parseDesignResourceFeasibilityDecisionProjections,
} from "./design-resource-implementation-feasibility-source-decision-projection.js";
export type {
  DesignResourceFeasibilityBlockerProjection,
  DesignResourceFeasibilityDecisionProjection,
  DesignResourcePlannedOwnerProjection,
  DesignResourceRequiredRealizationProjection,
} from "./design-resource-implementation-feasibility-source-decision-projection.js";

export interface LoadedDesignResourceFeasibilityDecisionSource {
  source_record_ref: string;
  source_path: string;
  source_item_key: string;
  source_item_kind: SourceItemKind;
  text_sha256: string;
  projections: DesignResourceFeasibilityDecisionProjection[];
}

export type DesignResourceFeasibilityDecisionSourceIndex = Map<
  string,
  LoadedDesignResourceFeasibilityDecisionSource
>;

export function loadDesignResourceFeasibilityDecisionSource(
  record: DesignResourceTechnicalSourceRecordV1,
  content: string,
): LoadedDesignResourceFeasibilityDecisionSource | null {
  if (record.locator.kind !== "source_item") return null;
  let parsed: ReturnType<typeof parseSourceDocument>;
  try {
    parsed = parseSourceDocument(record.path, content);
  } catch (error) {
    invalidFeasibility(
      "source_item_document_invalid",
      `${record.key}:${message(error)}`,
    );
  }
  const item = parsed.items.find(
    (candidate) => candidate.key === record.locator.value,
  );
  if (!item)
    invalidFeasibility(
      "source_item_missing",
      `${record.key}:${record.locator.value}`,
    );
  if (item.text_sha256 !== record.locator.text_sha256)
    invalidFeasibility(
      "source_item_text_digest_mismatch",
      `${record.key}:${record.locator.text_sha256}:${item.text_sha256}`,
    );
  return {
    source_record_ref: record.key,
    source_path: record.path,
    source_item_key: item.key,
    source_item_kind: item.kind,
    text_sha256: item.text_sha256,
    projections: parseDesignResourceFeasibilityDecisionProjections(
      record.path,
      item.key,
      item.normalized_text,
    ),
  };
}

export function deriveDesignResourceFeasibilityConditionScopeSha256(
  document: DesignResourceImplementationFeasibilityV1,
  model: DesignResourceImplementationFeasibilityTargetModel,
  profileRef: string,
): string {
  if (
    document.condition_model.kind === "explicit_conditions_v1" &&
    model.representation === "fact_cells_v1"
  ) {
    const profile = document.condition_model.profiles.find(
      (candidate) => candidate.key === profileRef,
    );
    if (!profile) invalidFeasibility("condition_profile_unknown", profileRef);
    return sha256Hex(
      canonicalValueJson([...profile.condition_refs].sort(compareText)),
    );
  }
  if (
    document.condition_model.kind === "symbolic_regions_v2" &&
    model.representation === "symbolic_rules_v2"
  ) {
    const profile = document.condition_model.profiles.find(
      (candidate) => candidate.key === profileRef,
    );
    if (!profile) invalidFeasibility("condition_profile_unknown", profileRef);
    return createSymbolicDenotationCompilationSession(model.axis_domains, [
      profile.region,
    ]).compile(profile.region).canonical_sha256;
  }
  invalidFeasibility("condition_model_representation_mismatch", profileRef);
}

export function requireExactFeasibilityDecisionProjection(
  sourceRefs: string[],
  sources: DesignResourceFeasibilityDecisionSourceIndex,
  expectation: DesignResourceFeasibilityDecisionProjection,
  label: string,
  options: {
    allReferencesMustBeSourceItems: boolean;
    allowedItemKinds: readonly SourceItemKind[];
  },
): LoadedDesignResourceFeasibilityDecisionSource {
  if (options.allReferencesMustBeSourceItems)
    for (const sourceRef of sourceRefs)
      if (!sources.has(sourceRef))
        invalidFeasibility(
          "source_item_authority_required",
          `${label}:${sourceRef}`,
        );
  const matches: LoadedDesignResourceFeasibilityDecisionSource[] = [];
  for (const sourceRef of sourceRefs) {
    const source = sources.get(sourceRef);
    if (!source) continue;
    if (
      source.projections.some(
        (projection) =>
          canonicalValueJson(projection) === canonicalValueJson(expectation),
      )
    )
      matches.push(source);
  }
  if (matches.length !== 1)
    invalidFeasibility(
      "source_decision_projection_count",
      `${label}:${matches.length}`,
    );
  const match = matches[0];
  if (!options.allowedItemKinds.includes(match.source_item_kind))
    invalidFeasibility(
      "source_decision_item_kind_invalid",
      `${label}:${match.source_item_kind}`,
    );
  return match;
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
