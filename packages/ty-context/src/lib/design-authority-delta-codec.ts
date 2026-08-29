import {
  DESIGN_AUTHORITY_DELTA_ASSESSMENTS,
  DESIGN_AUTHORITY_DELTA_ASSESSMENT_SCHEMA,
  type DesignAuthorityCrossTaskVarianceV1,
  type DesignAuthorityDeltaAssessmentV1,
  type DesignAuthorityDeltaChangeV1,
  type DesignAuthorityDeltaChangesV1,
  type DesignAuthorityDeltaEvidenceV1,
  type DesignAuthorityTaskOnlyVarianceV1,
} from "./design-authority-delta-types.js";
import {
  DESIGN_AUTHORITY_ENTRY_PATH,
  DESIGN_AUTHORITY_IDENTITY_FORMAT_VERSION,
  DESIGN_AUTHORITY_MANIFEST_PATH,
  isDesignAuthorityDigest,
  type DesignAuthorityIdentityV1,
} from "./design-authority-types.js";
import { normalizeRepositoryFile } from "./long-task-paths.js";
import { parseStrictYaml } from "./strict-codec.js";
import {
  deltaArray as array,
  deltaCompare as compare,
  deltaExact as exact,
  deltaInvalid as invalid,
  deltaOneOf as oneOf,
  deltaRow as row,
  deltaSourceRefSet as sourceRefSet,
  deltaStringSet as stringSet,
  deltaText as text,
} from "./design-authority-delta-codec-primitives.js";

export function parseDesignAuthorityDeltaAssessment(
  content: string,
): DesignAuthorityDeltaAssessmentV1 {
  let decoded: unknown;
  try {
    JSON.parse(content);
    decoded = parseStrictYaml(content);
  } catch (error) {
    invalid("assessment", `json:${message(error)}`);
  }
  const common = row(
    decoded,
    "assessment",
    ["schema_version", "assessment", "based_on"],
    [
      "evidence",
      "observed_variances",
      "scope",
      "reason",
      "affected_rules",
      "durability",
      "precedent",
      "required_owner",
      "proposed_changes",
      "supporting_resources",
      "representative_scenarios",
    ],
  );
  exact(
    common.schema_version,
    DESIGN_AUTHORITY_DELTA_ASSESSMENT_SCHEMA,
    "assessment.schema_version",
  );
  const assessment = oneOf(
    common.assessment,
    DESIGN_AUTHORITY_DELTA_ASSESSMENTS,
    "assessment.assessment",
  );
  if (assessment === "consistent_with_current_authority")
    return parseConsistent(decoded);
  if (assessment === "task_local_variance") return parseVariance(decoded);
  return parseCandidate(decoded);
}

function parseConsistent(value: unknown): DesignAuthorityDeltaAssessmentV1 {
  const input = row(value, "assessment", [
    "schema_version",
    "assessment",
    "based_on",
    "evidence",
    "observed_variances",
  ]);
  const evidence = parseEvidence(input.evidence);
  if (
    evidence.tokens.length +
      evidence.components.length +
      evidence.rules.length ===
    0
  )
    invalid("assessment.evidence", "at_least_one_reference_required");
  const variances = array(
    input.observed_variances,
    "assessment.observed_variances",
  );
  if (variances.length)
    invalid("assessment.observed_variances", "must_be_empty_for_consistent");
  return {
    schema_version: DESIGN_AUTHORITY_DELTA_ASSESSMENT_SCHEMA,
    assessment: "consistent_with_current_authority",
    based_on: parseIdentity(input.based_on, "assessment.based_on"),
    evidence,
    observed_variances: [],
  };
}

function parseVariance(value: unknown): DesignAuthorityDeltaAssessmentV1 {
  const base = row(
    value,
    "assessment",
    [
      "schema_version",
      "assessment",
      "based_on",
      "scope",
      "reason",
      "affected_rules",
      "durability",
    ],
    ["precedent", "required_owner"],
  );
  const durability = oneOf(
    base.durability,
    ["task_only", "cross_task_candidate"] as const,
    "assessment.durability",
  );
  const common = {
    schema_version: DESIGN_AUTHORITY_DELTA_ASSESSMENT_SCHEMA,
    assessment: "task_local_variance" as const,
    based_on: parseIdentity(base.based_on, "assessment.based_on"),
    scope: stringSet(base.scope, "assessment.scope"),
    reason: text(base.reason, "assessment.reason"),
    affected_rules: sourceRefSet(
      base.affected_rules,
      "assessment.affected_rules",
    ),
  };
  if (durability === "task_only") {
    exact(base.precedent, "forbidden", "assessment.precedent");
    if (base.required_owner !== undefined)
      invalid("assessment.required_owner", "forbidden_for_task_only");
    return {
      ...common,
      durability,
      precedent: "forbidden",
    } satisfies DesignAuthorityTaskOnlyVarianceV1;
  }
  if (base.precedent !== undefined)
    invalid("assessment.precedent", "forbidden_for_cross_task_candidate");
  return {
    ...common,
    durability,
    required_owner: parseScreenContractOwner(base.required_owner),
  } satisfies DesignAuthorityCrossTaskVarianceV1;
}

function parseCandidate(value: unknown): DesignAuthorityDeltaAssessmentV1 {
  const input = row(value, "assessment", [
    "schema_version",
    "assessment",
    "based_on",
    "proposed_changes",
    "supporting_resources",
    "representative_scenarios",
  ]);
  const proposedChanges = parseChanges(input.proposed_changes);
  if (
    Object.values(proposedChanges).reduce(
      (total, changes) => total + changes.length,
      0,
    ) === 0
  )
    invalid("assessment.proposed_changes", "at_least_one_change_required");
  return {
    schema_version: DESIGN_AUTHORITY_DELTA_ASSESSMENT_SCHEMA,
    assessment: "authority_delta_candidate",
    based_on: parseIdentity(input.based_on, "assessment.based_on"),
    proposed_changes: proposedChanges,
    supporting_resources: sourceRefSet(
      input.supporting_resources,
      "assessment.supporting_resources",
      true,
    ),
    representative_scenarios: stringSet(
      input.representative_scenarios,
      "assessment.representative_scenarios",
    ),
  };
}

function parseEvidence(value: unknown): DesignAuthorityDeltaEvidenceV1 {
  const input = row(value, "assessment.evidence", [
    "tokens",
    "components",
    "rules",
  ]);
  return {
    tokens: stringSet(input.tokens, "assessment.evidence.tokens", true),
    components: stringSet(
      input.components,
      "assessment.evidence.components",
      true,
    ),
    rules: sourceRefSet(input.rules, "assessment.evidence.rules", true),
  };
}

function parseChanges(value: unknown): DesignAuthorityDeltaChangesV1 {
  const input = row(value, "assessment.proposed_changes", [
    "tokens",
    "components",
    "patterns",
    "motion",
    "platforms",
  ]);
  return Object.fromEntries(
    Object.entries(input).map(([kind, changes]) => [
      kind,
      changeSet(changes, `assessment.proposed_changes.${kind}`),
    ]),
  ) as unknown as DesignAuthorityDeltaChangesV1;
}

function changeSet(
  value: unknown,
  label: string,
): DesignAuthorityDeltaChangeV1[] {
  const changes = array(value, label).map((item, index) => {
    const local = `${label}[${index}]`;
    const input = row(item, local, ["key", "proposal", "rationale"]);
    return {
      key: text(input.key, `${local}.key`),
      proposal: text(input.proposal, `${local}.proposal`),
      rationale: text(input.rationale, `${local}.rationale`),
    };
  });
  if (new Set(changes.map((change) => change.key)).size !== changes.length)
    invalid(label, "duplicate_key");
  return changes.sort((left, right) => compare(left.key, right.key));
}

function parseIdentity(
  value: unknown,
  label: string,
): DesignAuthorityIdentityV1 {
  const input = row(value, label, [
    "format_version",
    "entry_path",
    "manifest_path",
    "closure_digest",
    "revision",
  ]);
  exact(
    input.format_version,
    DESIGN_AUTHORITY_IDENTITY_FORMAT_VERSION,
    `${label}.format_version`,
  );
  exact(input.entry_path, DESIGN_AUTHORITY_ENTRY_PATH, `${label}.entry_path`);
  if (
    input.manifest_path !== null &&
    input.manifest_path !== DESIGN_AUTHORITY_MANIFEST_PATH
  )
    invalid(`${label}.manifest_path`, "unsupported_manifest_path");
  if (!isDesignAuthorityDigest(input.closure_digest))
    invalid(`${label}.closure_digest`, "sha256_identity_required");
  if (input.revision !== null) text(input.revision, `${label}.revision`);
  return {
    format_version: DESIGN_AUTHORITY_IDENTITY_FORMAT_VERSION,
    entry_path: DESIGN_AUTHORITY_ENTRY_PATH,
    manifest_path: input.manifest_path,
    closure_digest: input.closure_digest,
    revision: input.revision as string | null,
  };
}

function parseScreenContractOwner(value: unknown): {
  type: "screen_contract";
  path: string;
} {
  const input = row(value, "assessment.required_owner", ["type", "path"]);
  exact(input.type, "screen_contract", "assessment.required_owner.type");
  const ownerPath = normalizeRepositoryFile(
    text(input.path, "assessment.required_owner.path"),
    "assessment.required_owner.path",
  );
  if (!ownerPath.startsWith("project_context/") || !ownerPath.endsWith(".md"))
    invalid(
      "assessment.required_owner.path",
      "screen_contract_must_be_project_context_markdown",
    );
  return { type: "screen_contract", path: ownerPath };
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
