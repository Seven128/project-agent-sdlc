import {
  DESIGN_RESOURCE_RECOVERY_INPUT_SCHEMA,
  DESIGN_RESOURCE_RECOVERY_SCHEMA,
} from "./design-resource-recovery-schema.js";
import {
  type DesignResourceRecoveryCheckpoint,
  type DesignResourceRecoveryCreateInput,
} from "./design-resource-recovery-types.js";
import {
  arrayOf,
  literal,
  object,
  optionalArrayOf,
  parseStrictJsonObject,
  stringSet,
  text,
} from "./design-resource-recovery-codec-primitives.js";
import {
  parseAuthorityIdentity,
  parseDelegation,
  parseDelta,
  parseRecoveryBase,
  parseRecoveryBaseInput,
} from "./design-resource-recovery-shape.js";
import {
  parseProviderReferences,
  parseWritebackInput,
} from "./design-resource-recovery-writeback-shape.js";
import { canonicalJson } from "./strict-codec.js";

const COMMON_FIELDS = [
  "session_id",
  "disclosure_review",
  "base",
  "delegations",
  "deltas",
  "decision_sets",
  "explicitly_unchanged_keys",
  "design_authority",
  "provider",
  "selected_resource_keys",
] as const;

export function parseDesignResourceRecoveryCreateInput(
  content: string,
): DesignResourceRecoveryCreateInput {
  const row = parseStrictJsonObject(content, "create_input");
  const root = object(
    row,
    "create_input",
    ["schema_version", ...COMMON_FIELDS],
    ["writeback"],
  );
  literal(
    root.schema_version,
    DESIGN_RESOURCE_RECOVERY_INPUT_SCHEMA,
    "create_input.schema_version",
  );
  return {
    schema_version: DESIGN_RESOURCE_RECOVERY_INPUT_SCHEMA,
    ...parseCommon(root, false),
    ...(root.writeback === undefined
      ? {}
      : {
          writeback: parseWritebackInput(
            root.writeback,
            "create_input.writeback",
            false,
          ),
        }),
  };
}

export function parseDesignResourceRecoveryCheckpoint(
  content: string,
): DesignResourceRecoveryCheckpoint {
  const row = parseStrictJsonObject(content, "checkpoint");
  const root = object(
    row,
    "checkpoint",
    ["schema_version", "owner", ...COMMON_FIELDS],
    ["writeback"],
  );
  literal(
    root.schema_version,
    DESIGN_RESOURCE_RECOVERY_SCHEMA,
    "checkpoint.schema_version",
  );
  literal(
    root.owner,
    "ty-context-design-resource-recovery",
    "checkpoint.owner",
  );
  return {
    schema_version: DESIGN_RESOURCE_RECOVERY_SCHEMA,
    owner: "ty-context-design-resource-recovery",
    ...parseCommon(root, true),
    ...(root.writeback === undefined
      ? {}
      : {
          writeback: parseWritebackInput(
            root.writeback,
            "checkpoint.writeback",
            true,
          ),
        }),
  };
}

export function encodeDesignResourceRecoveryCheckpoint(
  checkpoint: DesignResourceRecoveryCheckpoint,
): string {
  return canonicalJson(checkpoint);
}

function parseCommon(
  root: Record<string, unknown>,
  complete: false,
): Omit<DesignResourceRecoveryCreateInput, "schema_version" | "writeback">;
function parseCommon(
  root: Record<string, unknown>,
  complete: true,
): Omit<
  DesignResourceRecoveryCheckpoint,
  "schema_version" | "owner" | "writeback"
>;
function parseCommon(
  root: Record<string, unknown>,
  complete: boolean,
): Omit<DesignResourceRecoveryCreateInput, "schema_version" | "writeback"> {
  const disclosure = object(root.disclosure_review, "disclosure_review", [
    "reviewed",
    "contains_sensitive_raw_values",
  ]);
  literal(disclosure.reviewed, true, "disclosure_review.reviewed");
  literal(
    disclosure.contains_sensitive_raw_values,
    false,
    "disclosure_review.contains_sensitive_raw_values",
  );
  const decisionSets = object(root.decision_sets, "decision_sets", [
    "accepted_delta_ids",
    "rejected_delta_ids",
    "unresolved_delta_ids",
  ]);
  return {
    session_id: parseSessionId(root.session_id),
    disclosure_review: {
      reviewed: true,
      contains_sensitive_raw_values: false,
    },
    base: complete
      ? parseRecoveryBase(root.base, "base")
      : parseRecoveryBaseInput(root.base, "base"),
    delegations: optionalArrayOf(
      root.delegations,
      "delegations",
      parseDelegation,
    ),
    deltas: optionalArrayOf(root.deltas, "deltas", parseDelta),
    decision_sets: {
      accepted_delta_ids: stringSet(
        decisionSets.accepted_delta_ids,
        "decision_sets.accepted_delta_ids",
        { allowEmpty: true },
      ),
      rejected_delta_ids: stringSet(
        decisionSets.rejected_delta_ids,
        "decision_sets.rejected_delta_ids",
        { allowEmpty: true },
      ),
      unresolved_delta_ids: stringSet(
        decisionSets.unresolved_delta_ids,
        "decision_sets.unresolved_delta_ids",
        { allowEmpty: true },
      ),
    },
    explicitly_unchanged_keys: stringSet(
      root.explicitly_unchanged_keys,
      "explicitly_unchanged_keys",
      { allowEmpty: true },
    ),
    design_authority: parseAuthorityIdentity(
      root.design_authority,
      "design_authority",
    ),
    provider: parseProviderReferences(root.provider, "provider"),
    selected_resource_keys: stringSet(
      root.selected_resource_keys,
      "selected_resource_keys",
      { allowEmpty: true },
    ),
  };
}

function parseSessionId(value: unknown): string {
  const result = text(value, "session_id");
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/u.test(result))
    throw new Error("design_resource_recovery_invalid:session_id:unsafe");
  return result;
}
