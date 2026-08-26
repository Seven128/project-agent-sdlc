import type {
  DeliveryAssertionV2,
  DeliveryBindingV2,
  DeliveryCheckV2,
  DeliveryContractV2,
  DeliveryControlFieldCoverageV2,
  DeliveryControlRelationClosureV2,
  DeliveryControlRelationV2,
  DeliveryControlV2,
  DeliveryObligationV2,
  DeliveryOutcomeV2,
  DeliveryOwnerV2,
  DeliveryRunnerV2,
  PopulationRequirementV2,
  RollbackRecoveryV2,
  SourceClaimV2,
} from "./long-task-contract-types.js";
import type {
  CounterfactualControlV2,
  GlobalCounterfactualControlV2,
} from "./long-task-counterfactual-types.js";
import type {
  ApplicableKeyedStatementV2,
  ClaimApplicabilityV2,
} from "./long-task-semantic-contract-types.js";
import type {
  DeliveryDesignAcceptanceBlockerV2,
  DeliveryDesignTargetV2,
  DeliveryDesignVerificationBindingV2,
  DeliverySurfaceBindingV2,
} from "./long-task-ui-surface-types.js";

export type AuthorityFieldPolicy =
  | "identity"
  | "semantic_user_review"
  | "proof_additive"
  | "runner_authority"
  | "input_coverage"
  | "output_requirement"
  | "scope"
  | "readiness_only"
  | "descriptive_non_authoritative";

type TaskV2 = DeliveryContractV2["task"];
type RiskV2 = DeliveryContractV2["risk"];
type GlobalV2 = DeliveryContractV2["global"];
type GlobalProductV2 = DeliveryContractV2["global"]["product"];
type GlobalTechnicalV2 = DeliveryContractV2["global"]["technical"];
type GlobalAcceptanceV2 = DeliveryContractV2["global"]["acceptance"];
type OutcomeProductV2 = DeliveryOutcomeV2["product"];
type DeliveryRequirementV2 = OutcomeProductV2["requirements"][number];
type OutcomeTechnicalV2 = DeliveryOutcomeV2["technical"];
type OutcomeAcceptanceV2 = DeliveryOutcomeV2["acceptance"];
type ControlFieldCoverageAuthorityKey =
  keyof DeliveryControlFieldCoverageV2 | "statement";

const TASK_AUTHORITY_POLICY = {
  id: "identity",
  title: "descriptive_non_authoritative",
  goal: "semantic_user_review",
  source_paths: "scope",
  context_refs: "scope",
  context_snapshot_mode: "scope",
  target_profile: "semantic_user_review",
  execution_targets: "semantic_user_review",
} satisfies Record<keyof TaskV2, AuthorityFieldPolicy>;

const SOURCE_CLAIM_AUTHORITY_POLICY = {
  key: "identity",
  source_ref: "scope",
  statement: "semantic_user_review",
  disposition: "semantic_user_review",
  judgment_basis: "semantic_user_review",
} satisfies Record<keyof SourceClaimV2, AuthorityFieldPolicy>;

const RISK_AUTHORITY_POLICY = {
  requested_level: "semantic_user_review",
  facts: "semantic_user_review",
} satisfies Record<keyof RiskV2, AuthorityFieldPolicy>;

const GLOBAL_AUTHORITY_POLICY = {
  applicability: "semantic_user_review",
  semantic_fact_bindings: "semantic_user_review",
  product: "semantic_user_review",
  technical: "semantic_user_review",
  acceptance: "proof_additive",
} satisfies Record<keyof GlobalV2, AuthorityFieldPolicy>;

const GLOBAL_PRODUCT_AUTHORITY_POLICY = {
  non_goals: "semantic_user_review",
} satisfies Record<keyof GlobalProductV2, AuthorityFieldPolicy>;

const GLOBAL_TECHNICAL_AUTHORITY_POLICY = {
  constraints: "semantic_user_review",
  forbidden_paths: "scope",
  forbidden_shortcuts: "semantic_user_review",
} satisfies Record<keyof GlobalTechnicalV2, AuthorityFieldPolicy>;

const GLOBAL_ACCEPTANCE_AUTHORITY_POLICY = {
  checks: "proof_additive",
  counterfactual_controls: "proof_additive",
  external_confirmations: "semantic_user_review",
} satisfies Record<keyof GlobalAcceptanceV2, AuthorityFieldPolicy>;

const OUTCOME_AUTHORITY_POLICY = {
  key: "identity",
  title: "descriptive_non_authoritative",
  stage: "semantic_user_review",
  depends_on: "readiness_only",
  applicability: "semantic_user_review",
  semantic_fact_bindings: "semantic_user_review",
  product: "semantic_user_review",
  technical: "semantic_user_review",
  acceptance: "proof_additive",
} satisfies Record<keyof DeliveryOutcomeV2, AuthorityFieldPolicy>;

const CLAIM_APPLICABILITY_AUTHORITY_POLICY = {
  key: "identity",
  target_ref: "semantic_user_review",
  journey_role: "semantic_user_review",
  dimensions: "semantic_user_review",
  given_refs: "semantic_user_review",
  when_refs: "semantic_user_review",
} satisfies Record<keyof ClaimApplicabilityV2, AuthorityFieldPolicy>;

const APPLICABLE_STATEMENT_AUTHORITY_POLICY = {
  key: "identity",
  statement: "semantic_user_review",
  applicability_refs: "semantic_user_review",
} satisfies Record<keyof ApplicableKeyedStatementV2, AuthorityFieldPolicy>;

const OUTCOME_PRODUCT_AUTHORITY_POLICY = {
  observable_result: "semantic_user_review",
  result_applicability_refs: "semantic_user_review",
  success_path_required: "semantic_user_review",
  degradation_path_required: "semantic_user_review",
  owner: "semantic_user_review",
  requirements: "semantic_user_review",
  owner_surfaces: "semantic_user_review",
  controls: "semantic_user_review",
  control_relation_closure: "semantic_user_review",
  control_relations: "semantic_user_review",
  surface_bindings: "semantic_user_review",
  non_completing_outcomes: "semantic_user_review",
} satisfies Record<keyof OutcomeProductV2, AuthorityFieldPolicy>;

const REQUIREMENT_AUTHORITY_POLICY = {
  key: "identity",
  statement: "semantic_user_review",
  required_proof_surfaces: "proof_additive",
  applicability_refs: "semantic_user_review",
} satisfies Record<keyof DeliveryRequirementV2, AuthorityFieldPolicy>;

const OWNER_AUTHORITY_POLICY = {
  label: "identity",
  context_refs: "scope",
  path_globs: "scope",
} satisfies Record<keyof DeliveryOwnerV2, AuthorityFieldPolicy>;

const CONTROL_AUTHORITY_POLICY = {
  key: "identity",
  surface: "semantic_user_review",
  region: "semantic_user_review",
  location: "semantic_user_review",
  control_type: "semantic_user_review",
  label_content: "semantic_user_review",
  user_task: "semantic_user_review",
  visibility: "semantic_user_review",
  availability: "semantic_user_review",
  trigger: "semantic_user_review",
  input: "semantic_user_review",
  validation: "semantic_user_review",
  default_value: "semantic_user_review",
  interaction: "semantic_user_review",
  navigation_result: "semantic_user_review",
  loading_state: "semantic_user_review",
  empty_state: "semantic_user_review",
  success_state: "semantic_user_review",
  failure_state: "semantic_user_review",
  recovery: "semantic_user_review",
  permission: "semantic_user_review",
  feedback: "semantic_user_review",
  accessibility: "semantic_user_review",
  field_coverage: "semantic_user_review",
} satisfies Record<keyof DeliveryControlV2, AuthorityFieldPolicy>;

const CONTROL_FIELD_COVERAGE_AUTHORITY_POLICY = {
  fields: "semantic_user_review",
  state: "semantic_user_review",
  statement: "semantic_user_review",
  applicability_refs: "semantic_user_review",
} satisfies Record<ControlFieldCoverageAuthorityKey, AuthorityFieldPolicy>;

const CONTROL_RELATION_CLOSURE_AUTHORITY_POLICY = {
  state: "semantic_user_review",
  statement: "semantic_user_review",
  applicability_refs: "semantic_user_review",
} satisfies Record<
  keyof DeliveryControlRelationClosureV2,
  AuthorityFieldPolicy
>;

const CONTROL_RELATION_AUTHORITY_POLICY = {
  key: "identity",
  statement: "semantic_user_review",
  applicability_refs: "semantic_user_review",
  control_refs: "semantic_user_review",
  required_proof_surfaces: "proof_additive",
} satisfies Record<keyof DeliveryControlRelationV2, AuthorityFieldPolicy>;

const SURFACE_BINDING_AUTHORITY_POLICY = {
  key: "identity",
  surface_ref: "semantic_user_review",
  target_ref: "semantic_user_review",
  control_refs: "semantic_user_review",
  route_binding_ref: "semantic_user_review",
  component_binding_refs: "semantic_user_review",
  root_journey_check_ref: "proof_additive",
  entry_action_ref: "proof_additive",
  design_targets: "semantic_user_review",
  acceptance_blockers: "semantic_user_review",
} satisfies Record<keyof DeliverySurfaceBindingV2, AuthorityFieldPolicy>;

const DESIGN_TARGET_AUTHORITY_POLICY = {
  key: "identity",
  fact_model: "semantic_user_review",
  interpretation: "semantic_user_review",
  source_paths: "scope",
  condition_keys: "semantic_user_review",
  claim_refs: "proof_additive",
  conformance_check_ref: "proof_additive",
  conformance_assertion_ref: "proof_additive",
  verification_method_bindings: "proof_additive",
  symbolic_method_bindings: "proof_additive",
  symbolic_certificate_binding: "proof_additive",
  actual_artifact_path: "output_requirement",
  comparison_artifact_path: "output_requirement",
} satisfies Record<keyof DeliveryDesignTargetV2, AuthorityFieldPolicy>;

const DESIGN_VERIFICATION_BINDING_AUTHORITY_POLICY = {
  method: "proof_additive",
  assertion_ref: "proof_additive",
  evidence_artifacts: "output_requirement",
} satisfies Record<
  keyof DeliveryDesignVerificationBindingV2,
  AuthorityFieldPolicy
>;

const DESIGN_BLOCKER_AUTHORITY_POLICY = {
  key: "identity",
  status: "semantic_user_review",
  refs: "semantic_user_review",
  source_item_refs: "semantic_user_review",
  verification_methods: "proof_additive",
  required_capabilities: "semantic_user_review",
  rationale: "semantic_user_review",
} satisfies Record<
  keyof DeliveryDesignAcceptanceBlockerV2,
  AuthorityFieldPolicy
>;

const OUTCOME_TECHNICAL_AUTHORITY_POLICY = {
  obligations: "semantic_user_review",
  expected_change_paths: "scope",
  allowed_support_paths: "scope",
  forbidden_paths: "scope",
  bindings: "semantic_user_review",
  forbidden_shortcuts: "semantic_user_review",
  rollback_and_recovery: "semantic_user_review",
} satisfies Record<keyof OutcomeTechnicalV2, AuthorityFieldPolicy>;

const OBLIGATION_AUTHORITY_POLICY = {
  key: "identity",
  statement: "semantic_user_review",
  required_proof_surfaces: "proof_additive",
  applicability_refs: "semantic_user_review",
} satisfies Record<keyof DeliveryObligationV2, AuthorityFieldPolicy>;

const BINDING_AUTHORITY_POLICY = {
  key: "identity",
  kind: "semantic_user_review",
  target: "semantic_user_review",
  carrier_paths: "scope",
  existence: "semantic_user_review",
  verification_check_key: "proof_additive",
} satisfies Record<keyof DeliveryBindingV2, AuthorityFieldPolicy>;

const ROLLBACK_AUTHORITY_POLICY = {
  rollback: "semantic_user_review",
  recovery: "semantic_user_review",
  verification_check_keys: "proof_additive",
} satisfies Record<keyof RollbackRecoveryV2, AuthorityFieldPolicy>;

const OUTCOME_ACCEPTANCE_AUTHORITY_POLICY = {
  checks: "proof_additive",
  population: "proof_additive",
  counterfactual_controls: "proof_additive",
} satisfies Record<keyof OutcomeAcceptanceV2, AuthorityFieldPolicy>;

export const CHECK_AUTHORITY_POLICY = {
  key: "identity",
  journey_roles: "proof_additive",
  execution_target: "semantic_user_review",
  scenario: "proof_additive",
  proof_surface: "semantic_user_review",
  runner: "runner_authority",
  verification_inputs: "proof_additive",
  input_paths: "input_coverage",
  expected_output_paths: "output_requirement",
  artifact_globs: "proof_additive",
  positive_assertions: "proof_additive",
  negative_assertions: "proof_additive",
  environment_requirements: "proof_additive",
} satisfies Record<keyof DeliveryCheckV2, AuthorityFieldPolicy>;

const ASSERTION_AUTHORITY_POLICY = {
  key: "identity",
  criterion: "semantic_user_review",
  claims: "proof_additive",
  applicability_ref: "proof_additive",
  observation: "proof_additive",
  evidence_capabilities: "proof_additive",
  expected_authority_ref: "semantic_user_review",
  operator: "proof_additive",
  expected: "proof_additive",
} satisfies Record<keyof DeliveryAssertionV2, AuthorityFieldPolicy>;

const RUNNER_AUTHORITY_POLICY = {
  type: "runner_authority",
  target: "runner_authority",
  argv: "runner_authority",
  cwd: "runner_authority",
  timeout_ms: "runner_authority",
  effect: "runner_authority",
  retry_policy: "runner_authority",
  idempotent: "runner_authority",
} satisfies Record<keyof DeliveryRunnerV2, AuthorityFieldPolicy>;

const POPULATION_AUTHORITY_POLICY = {
  check_key: "proof_additive",
  universe_binding_key: "proof_additive",
  claims: "proof_additive",
  observations: "proof_additive",
  exclusion_rules: "proof_additive",
} satisfies Record<keyof PopulationRequirementV2, AuthorityFieldPolicy>;

const COUNTERFACTUAL_AUTHORITY_POLICY = {
  key: "identity",
  binding_key: "proof_additive",
  claims: "proof_additive",
  check_key: "proof_additive",
  mutation: "proof_additive",
  expected_assertion_failures: "proof_additive",
  preserved_assertions: "proof_additive",
  allowed_fanout_assertions: "semantic_user_review",
} satisfies Record<keyof CounterfactualControlV2, AuthorityFieldPolicy>;

const GLOBAL_COUNTERFACTUAL_AUTHORITY_POLICY = {
  key: "identity",
  binding_ref: "proof_additive",
  claims: "proof_additive",
  check_key: "proof_additive",
  mutation: "proof_additive",
  expected_assertion_failures: "proof_additive",
  preserved_assertions: "proof_additive",
  allowed_fanout_assertions: "semantic_user_review",
} satisfies Record<keyof GlobalCounterfactualControlV2, AuthorityFieldPolicy>;

export const AUTHORITY_FIELD_POLICY_REGISTRIES = {
  task: TASK_AUTHORITY_POLICY,
  source_claim: SOURCE_CLAIM_AUTHORITY_POLICY,
  risk: RISK_AUTHORITY_POLICY,
  global: GLOBAL_AUTHORITY_POLICY,
  global_product: GLOBAL_PRODUCT_AUTHORITY_POLICY,
  global_technical: GLOBAL_TECHNICAL_AUTHORITY_POLICY,
  global_acceptance: GLOBAL_ACCEPTANCE_AUTHORITY_POLICY,
  outcome: OUTCOME_AUTHORITY_POLICY,
  claim_applicability: CLAIM_APPLICABILITY_AUTHORITY_POLICY,
  applicable_statement: APPLICABLE_STATEMENT_AUTHORITY_POLICY,
  outcome_product: OUTCOME_PRODUCT_AUTHORITY_POLICY,
  requirement: REQUIREMENT_AUTHORITY_POLICY,
  owner: OWNER_AUTHORITY_POLICY,
  control: CONTROL_AUTHORITY_POLICY,
  control_field_coverage: CONTROL_FIELD_COVERAGE_AUTHORITY_POLICY,
  control_relation_closure: CONTROL_RELATION_CLOSURE_AUTHORITY_POLICY,
  control_relation: CONTROL_RELATION_AUTHORITY_POLICY,
  surface_binding: SURFACE_BINDING_AUTHORITY_POLICY,
  design_target: DESIGN_TARGET_AUTHORITY_POLICY,
  design_verification_binding: DESIGN_VERIFICATION_BINDING_AUTHORITY_POLICY,
  design_blocker: DESIGN_BLOCKER_AUTHORITY_POLICY,
  outcome_technical: OUTCOME_TECHNICAL_AUTHORITY_POLICY,
  obligation: OBLIGATION_AUTHORITY_POLICY,
  binding: BINDING_AUTHORITY_POLICY,
  rollback: ROLLBACK_AUTHORITY_POLICY,
  outcome_acceptance: OUTCOME_ACCEPTANCE_AUTHORITY_POLICY,
  check: CHECK_AUTHORITY_POLICY,
  assertion: ASSERTION_AUTHORITY_POLICY,
  runner: RUNNER_AUTHORITY_POLICY,
  population: POPULATION_AUTHORITY_POLICY,
  counterfactual: COUNTERFACTUAL_AUTHORITY_POLICY,
  global_counterfactual: GLOBAL_COUNTERFACTUAL_AUTHORITY_POLICY,
} as const;

export function projectFieldsByPolicy<T extends object>(
  value: T,
  policy: Record<keyof T, AuthorityFieldPolicy>,
  included: ReadonlySet<AuthorityFieldPolicy>,
): Partial<T> {
  return Object.fromEntries(
    (Object.keys(policy) as Array<keyof T>)
      .filter((key) => included.has(policy[key]))
      .map((key) => [key, value[key]]),
  ) as Partial<T>;
}
