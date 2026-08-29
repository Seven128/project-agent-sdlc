import type { DesignAuthorityIdentityV1 } from "./design-authority-types.js";

export const DESIGN_AUTHORITY_DELTA_ASSESSMENT_SCHEMA =
  "design-authority-delta-assessment-v1" as const;

export const DESIGN_AUTHORITY_DELTA_ASSESSMENTS = [
  "consistent_with_current_authority",
  "task_local_variance",
  "authority_delta_candidate",
] as const;

export type DesignAuthorityDeltaAssessmentKind =
  (typeof DESIGN_AUTHORITY_DELTA_ASSESSMENTS)[number];

export interface DesignAuthorityDeltaEvidenceV1 {
  tokens: string[];
  components: string[];
  rules: string[];
}

export interface DesignAuthorityDeltaChangeV1 {
  key: string;
  proposal: string;
  rationale: string;
}

export interface DesignAuthorityDeltaChangesV1 {
  tokens: DesignAuthorityDeltaChangeV1[];
  components: DesignAuthorityDeltaChangeV1[];
  patterns: DesignAuthorityDeltaChangeV1[];
  motion: DesignAuthorityDeltaChangeV1[];
  platforms: DesignAuthorityDeltaChangeV1[];
}

interface DesignAuthorityDeltaAssessmentBaseV1 {
  schema_version: typeof DESIGN_AUTHORITY_DELTA_ASSESSMENT_SCHEMA;
  assessment: DesignAuthorityDeltaAssessmentKind;
  based_on: DesignAuthorityIdentityV1;
}

export interface DesignAuthorityConsistentAssessmentV1 extends DesignAuthorityDeltaAssessmentBaseV1 {
  assessment: "consistent_with_current_authority";
  evidence: DesignAuthorityDeltaEvidenceV1;
  observed_variances: [];
}

export interface DesignAuthorityTaskOnlyVarianceV1 extends DesignAuthorityDeltaAssessmentBaseV1 {
  assessment: "task_local_variance";
  scope: string[];
  reason: string;
  affected_rules: string[];
  durability: "task_only";
  precedent: "forbidden";
}

export interface DesignAuthorityCrossTaskVarianceV1 extends DesignAuthorityDeltaAssessmentBaseV1 {
  assessment: "task_local_variance";
  scope: string[];
  reason: string;
  affected_rules: string[];
  durability: "cross_task_candidate";
  required_owner: {
    type: "screen_contract";
    path: string;
  };
}

export interface DesignAuthorityDeltaCandidateV1 extends DesignAuthorityDeltaAssessmentBaseV1 {
  assessment: "authority_delta_candidate";
  proposed_changes: DesignAuthorityDeltaChangesV1;
  supporting_resources: string[];
  representative_scenarios: string[];
}

export type DesignAuthorityDeltaAssessmentV1 =
  | DesignAuthorityConsistentAssessmentV1
  | DesignAuthorityTaskOnlyVarianceV1
  | DesignAuthorityCrossTaskVarianceV1
  | DesignAuthorityDeltaCandidateV1;

export interface DesignAuthorityDeltaValidationV1 {
  schema_version: typeof DESIGN_AUTHORITY_DELTA_ASSESSMENT_SCHEMA;
  assessment: DesignAuthorityDeltaAssessmentKind;
  authority_identity: DesignAuthorityIdentityV1;
  authority_current: true;
  write_performed: false;
}
