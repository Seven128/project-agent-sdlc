import type {
  LongTaskRiskFacts,
  RequestedRiskLevel,
} from "./long-task-risk-types.js";
import type {
  CounterfactualControlV2,
  GlobalCounterfactualControlV2,
} from "./long-task-counterfactual-types.js";
import type { DeliveryControlFieldNameV2 } from "./long-task-control-types.js";
import type {
  ApplicableKeyedStatementV2,
  CheckExecutionTargetV2,
  ClaimApplicabilityV2,
  DeliveryJourneyRoleV2,
  DeliveryScenarioV2,
  DeliveryStageV2,
  EvidenceCapabilityV2,
  ExecutionTargetV2,
  ExternalConfirmationKindV2,
  KeyedStatementV2,
  TargetProfileV2,
} from "./long-task-semantic-contract-types.js";
import type { DeliverySurfaceBindingV2 } from "./long-task-ui-surface-types.js";

export type SourceClaimDispositionV2 =
  | { type: "claim"; refs: string[] }
  | { type: "acceptance"; refs: [string] }
  | { type: "outcome_result"; ref: string }
  | { type: "global_constraint"; refs: string[] }
  | { type: "risk_fact"; refs: string[] }
  | { type: "external_confirmation"; refs: string[] }
  | { type: "decision_required"; reason: string };

export interface SourceClaimV2 {
  key: string;
  source_ref: string;
  statement: string;
  disposition: SourceClaimDispositionV2;
}

export interface KeyedPathV2 {
  key: string;
  path: string;
}

export interface ExternalConfirmationV2 {
  key: string;
  description: string;
  owner: string;
  kind: ExternalConfirmationKindV2;
  impact_claims: string[];
  blocks_target: boolean;
}

export type ProofSurface =
  | "ui_browser"
  | "runtime_behavior"
  | "api_contract"
  | "data_state"
  | "security_boundary"
  | "population_coverage"
  | "implementation_structure";

export type RunnerType =
  "package_script" | "project_binary" | "node_oracle" | "playwright_test";

export type PresenceOrUnaryAssertionOperator = "exists" | "truthy" | "falsy";

export type BinaryAssertionOperator =
  | "equals"
  | "not_equals"
  | "contains"
  | "not_contains"
  | "matches"
  | "not_matches"
  | "greater_than"
  | "greater_or_equal"
  | "less_than"
  | "less_or_equal"
  | "set_equals"
  | "subset_of"
  | "superset_of";

export type AssertionOperator =
  PresenceOrUnaryAssertionOperator | BinaryAssertionOperator;

interface DeliveryAssertionBaseV2 {
  key: string;
  criterion?: string;
  claims: string[];
  applicability_ref?: string;
  observation: string;
  evidence_capabilities: EvidenceCapabilityV2[];
}

export type DeliveryAssertionV2 =
  | (DeliveryAssertionBaseV2 & {
      operator: PresenceOrUnaryAssertionOperator;
      expected?: never;
    })
  | (DeliveryAssertionBaseV2 & {
      operator: BinaryAssertionOperator;
      expected: unknown;
    });

export interface DeliveryRunnerV2 {
  type: RunnerType;
  target: string;
  argv: string[];
  cwd: string;
  timeout_ms: number;
  effect: "read_only" | "test_sandbox";
  retry_policy: "none" | "transient_once";
  idempotent: boolean;
}

export type EnvironmentRequirementV2 =
  | { key: string; kind: "executable" | "env_var"; target: string }
  | { key: string; kind: "file" | "directory"; target: string }
  | {
      key: string;
      kind: "loopback_tcp";
      host: "127.0.0.1" | "::1" | "localhost";
      port: number;
      timeout_ms: number;
    };

export interface DeliveryCheckV2 {
  key: string;
  journey_roles: DeliveryJourneyRoleV2[];
  execution_target: CheckExecutionTargetV2;
  scenario: DeliveryScenarioV2;
  proof_surface: ProofSurface;
  runner: DeliveryRunnerV2;
  verification_inputs: string[];
  input_paths: string[];
  expected_output_paths: string[];
  artifact_globs: string[];
  positive_assertions: DeliveryAssertionV2[];
  negative_assertions: DeliveryAssertionV2[];
  environment_requirements: EnvironmentRequirementV2[];
}

export interface DeliveryControlV2 {
  key: string;
  surface: string;
  region: string;
  location: string;
  control_type: string;
  label_content: string;
  user_task: string;
  visibility: string;
  availability: string;
  trigger: string;
  input: string;
  validation: string;
  default_value: string;
  interaction: string;
  navigation_result: string;
  loading_state: string;
  empty_state: string;
  success_state: string;
  failure_state: string;
  recovery: string;
  permission: string;
  feedback: string;
  accessibility: string;
  field_coverage: DeliveryControlFieldCoverageV2[];
}

export type DeliveryControlFieldCoverageV2 =
  | {
      fields: DeliveryControlFieldNameV2[];
      state: "specified";
      applicability_refs: string[];
    }
  | {
      fields: DeliveryControlFieldNameV2[];
      state: "not_applicable";
      statement: string;
      applicability_refs: string[];
    }
  | {
      fields: DeliveryControlFieldNameV2[];
      state: "unresolved";
      statement: string;
      applicability_refs: string[];
    };

export interface DeliveryControlRelationV2 extends ApplicableKeyedStatementV2 {
  control_refs: string[];
  required_proof_surfaces: ProofSurface[];
}

export interface DeliveryControlRelationClosureV2 {
  state: "specified" | "not_applicable" | "unresolved";
  statement: string;
}

interface DeliveryRequirementV2 extends ApplicableKeyedStatementV2 {
  required_proof_surfaces: ProofSurface[];
}

export interface DeliveryOwnerV2 {
  label: string;
  context_refs: string[];
  path_globs: string[];
}

export interface DeliveryObligationV2 extends ApplicableKeyedStatementV2 {
  required_proof_surfaces: ProofSurface[];
}

export interface DeliveryBindingV2 {
  key: string;
  kind: "path_glob" | "file" | "verified";
  target: string;
  carrier_paths: string[];
  existence: "existing" | "planned";
  verification_check_key?: string;
}

export interface RollbackRecoveryV2 {
  rollback: string;
  recovery: string;
  verification_check_keys: string[];
}

export interface PopulationRequirementV2 {
  check_key: string;
  claims: string[];
  observations: {
    eligible_ids: string;
    observed_ids: string;
    excluded_items: string;
  };
  exclusion_rules: KeyedStatementV2[];
}

export interface DeliveryOutcomeV2 {
  key: string;
  title: string;
  stage: string;
  depends_on: string[];
  applicability: ClaimApplicabilityV2[];
  product: {
    observable_result: string;
    result_applicability_refs: string[];
    success_path_required: boolean;
    degradation_path_required: boolean;
    owner: DeliveryOwnerV2;
    requirements: DeliveryRequirementV2[];
    owner_surfaces: string[];
    controls: DeliveryControlV2[];
    control_relation_closure: DeliveryControlRelationClosureV2;
    control_relations: DeliveryControlRelationV2[];
    surface_bindings: DeliverySurfaceBindingV2[];
    non_completing_outcomes: ApplicableKeyedStatementV2[];
  };
  technical: {
    obligations: DeliveryObligationV2[];
    expected_change_paths: string[];
    allowed_support_paths: string[];
    forbidden_paths: string[];
    bindings: DeliveryBindingV2[];
    forbidden_shortcuts: ApplicableKeyedStatementV2[];
    rollback_and_recovery: RollbackRecoveryV2 | null;
  };
  acceptance: {
    checks: DeliveryCheckV2[];
    population: PopulationRequirementV2 | null;
    counterfactual_controls: CounterfactualControlV2[];
  };
}

export interface DeliveryContractV2 {
  schema_version: "long-task-delivery-v2";
  task: {
    id: string;
    title: string;
    goal: string;
    target_profile: TargetProfileV2;
    execution_targets: ExecutionTargetV2[];
    source_paths: string[];
    context_refs: string[];
    context_snapshot_mode: "referenced" | "full";
  };
  source_claims: SourceClaimV2[];
  stages: DeliveryStageV2[];
  risk: {
    requested_level: RequestedRiskLevel;
    facts: LongTaskRiskFacts;
  };
  global: {
    applicability: ClaimApplicabilityV2[];
    product: { non_goals: ApplicableKeyedStatementV2[] };
    technical: {
      constraints: ApplicableKeyedStatementV2[];
      forbidden_paths: KeyedPathV2[];
      forbidden_shortcuts: ApplicableKeyedStatementV2[];
    };
    acceptance: {
      checks: DeliveryCheckV2[];
      counterfactual_controls: GlobalCounterfactualControlV2[];
      external_confirmations: ExternalConfirmationV2[];
    };
  };
  outcomes: DeliveryOutcomeV2[];
}
