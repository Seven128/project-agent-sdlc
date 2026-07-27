import type { DeliveryContractV2 } from "./long-task-delivery-types.js";
import {
  assertCompiledClaimsCovered,
  compileProductClaimCoverage,
} from "./long-task-claims.js";
import { fail } from "./long-task-delivery-shape.js";
import { proveRepositoryPatternSubset } from "./long-task-paths.js";
import { validateSourceClaimMappings } from "./long-task-source-claim-validation.js";
import { validateDeclaredCheckSafety } from "./long-task-claim-proof-policy.js";
import { validateEvidenceAdapterCompatibility } from "./long-task-evidence-adapter-policy.js";
import { validateEvidenceCapabilityDeclarations } from "./long-task-evidence-capability-policy.js";
import { validateDeliveryStages } from "./long-task-stage-policy.js";
import {
  validateExecutionTargets,
  validateExternalConfirmationImpacts,
} from "./long-task-target-policy.js";
import { validateUiSurfaceBindings } from "./long-task-ui-surface-policy.js";
import { controlFieldFacts } from "./long-task-control-fields.js";
import { validateSemanticAssuranceShape } from "./long-task-semantic-assurance-policy.js";

export function validateDeliveryContractStructure(
  contract: DeliveryContractV2,
): void {
  validateUniqueKeys(contract);
  validateDependencies(contract);
  validateControlClosure(contract);
  validateOwnerAndBindings(contract);
  validateDeclaredCheckSafety(contract);
  validateEvidenceAdapters(contract);
  const claims = compileProductClaimCoverage(contract, {
    allow_uncovered: true,
  });
  validateSourceClaimMappings(contract, claims);
  validateUiSurfaceBindings(contract, claims);
  assertCompiledClaimsCovered(claims);
  validateDeliveryStages(contract);
  validateExecutionTargets(contract);
  validateSemanticAssuranceShape(contract);
  validateEvidenceCapabilityDeclarations(contract);
  validateExternalConfirmationImpacts(contract, claims);
}

export function deliveryContractStructureDiagnostics(
  contract: DeliveryContractV2,
): string[] {
  const diagnostics: string[] = [];
  const report = (message: string) => diagnostics.push(message);
  validateUniqueKeys(contract, report);
  validateDependencies(contract, report);
  validateControlClosure(contract, report);
  validateDeliveryStages(contract, report);
  validateExecutionTargets(contract, report);
  validateSemanticAssuranceShape(contract, report);
  validateEvidenceCapabilityDeclarations(contract, report);
  validateOwnerAndBindings(contract, report);
  validateDeclaredCheckSafety(contract, report);
  validateEvidenceAdapters(contract, report);
  let claims: ReturnType<typeof compileProductClaimCoverage> | null = null;
  capture(diagnostics, () => {
    claims = compileProductClaimCoverage(contract, { allow_uncovered: true });
  });
  if (claims) {
    validateSourceClaimMappings(contract, claims, report);
    validateUiSurfaceBindings(contract, claims, report);
    validateExternalConfirmationImpacts(contract, claims, report);
    capture(diagnostics, () => assertCompiledClaimsCovered(claims!));
  }
  return [...new Set(diagnostics)];
}

function validateEvidenceAdapters(
  contract: DeliveryContractV2,
  report?: ValidationReporter,
): void {
  for (const check of contract.global.acceptance.checks)
    captureOrReport(report, () =>
      validateEvidenceAdapterCompatibility(check, null),
    );
  for (const outcome of contract.outcomes)
    for (const check of outcome.acceptance.checks)
      captureOrReport(report, () =>
        validateEvidenceAdapterCompatibility(check, outcome.key),
      );
}

function validateUniqueKeys(
  contract: DeliveryContractV2,
  report?: ValidationReporter,
): void {
  unique(
    contract.outcomes.map((outcome) => outcome.key),
    "outcome_key_duplicate",
    report,
  );
  unique(
    contract.global.acceptance.checks.map((check) => check.key),
    "global_check_key_duplicate",
    report,
  );
  unique(
    contract.source_claims.map((claim) => claim.key),
    "source_claim_key_duplicate",
    report,
  );
  for (const [fact, outcomes] of Object.entries(contract.risk.facts))
    unique(outcomes, `risk_fact_outcome_duplicate:${fact}`, report);
  unique(
    contract.global.acceptance.counterfactual_controls.map(
      (control) => control.key,
    ),
    "global_counterfactual_key_duplicate",
    report,
  );
  unique(
    contract.global.acceptance.external_confirmations.map((item) => item.key),
    "external_confirmation_key_duplicate",
    report,
  );
  unique(
    [
      ...contract.global.product.non_goals,
      ...contract.global.technical.constraints,
      ...contract.global.technical.forbidden_paths,
      ...contract.global.technical.forbidden_shortcuts,
    ].map((item) => item.key),
    "global_constraint_key_duplicate",
    report,
  );
  for (const outcome of contract.outcomes) {
    unique(
      outcome.acceptance.checks.map((check) => check.key),
      `check_key_duplicate:${outcome.key}`,
      report,
    );
    unique(
      outcome.product.requirements.map((item) => item.key),
      `requirement_key_duplicate:${outcome.key}`,
      report,
    );
    unique(
      outcome.product.controls.map((control) => control.key),
      `control_key_duplicate:${outcome.key}`,
      report,
    );
    unique(
      outcome.product.control_relations.map((relation) => relation.key),
      `control_relation_key_duplicate:${outcome.key}`,
      report,
    );
    unique(
      outcome.product.non_completing_outcomes.map((item) => item.key),
      `non_completing_key_duplicate:${outcome.key}`,
      report,
    );
    unique(
      outcome.technical.obligations.map((item) => item.key),
      `obligation_key_duplicate:${outcome.key}`,
      report,
    );
    unique(
      outcome.technical.forbidden_shortcuts.map((item) => item.key),
      `forbidden_shortcut_key_duplicate:${outcome.key}`,
      report,
    );
    unique(
      outcome.technical.bindings.map((item) => item.key),
      `binding_key_duplicate:${outcome.key}`,
      report,
    );
    unique(
      outcome.acceptance.counterfactual_controls.map((item) => item.key),
      `counterfactual_key_duplicate:${outcome.key}`,
      report,
    );
    for (const check of outcome.acceptance.checks) {
      unique(
        check.environment_requirements.map((item) => item.key),
        `environment_requirement_key_duplicate:${outcome.key}:${check.key}`,
        report,
      );
      unique(
        [...check.positive_assertions, ...check.negative_assertions].map(
          (assertion) => assertion.key,
        ),
        `assertion_key_duplicate:${outcome.key}:${check.key}`,
        report,
      );
      unique(
        [...check.positive_assertions, ...check.negative_assertions].map(
          (assertion) => assertion.observation,
        ),
        `assertion_observation_duplicate:${outcome.key}:${check.key}`,
        report,
      );
    }
  }
  for (const check of contract.global.acceptance.checks)
    unique(
      [...check.positive_assertions, ...check.negative_assertions].map(
        (assertion) => assertion.observation,
      ),
      `assertion_observation_duplicate:GLOBAL:${check.key}`,
      report,
    );
}

function validateControlClosure(
  contract: DeliveryContractV2,
  report?: ValidationReporter,
): void {
  for (const outcome of contract.outcomes) {
    const controls = new Set(
      outcome.product.controls.map((control) => control.key),
    );
    const closure = outcome.product.control_relation_closure;
    const relations = outcome.product.control_relations;
    if (closure.state === "unresolved")
      issue(report, "control_relation_closure_unresolved", outcome.key);
    if (closure.state === "specified" && !relations.length)
      issue(report, "control_relation_required", outcome.key);
    if (closure.state === "not_applicable" && relations.length)
      issue(
        report,
        "control_relation_forbidden_when_not_applicable",
        outcome.key,
      );
    if (!controls.size && closure.state !== "not_applicable")
      issue(report, "control_relation_closure_without_controls", outcome.key);
    for (const control of outcome.product.controls) {
      const facts = controlFieldFacts(control);
      const unresolved = facts
        .filter((fact) => fact.state === "unresolved")
        .map((fact) => fact.contract_field);
      if (unresolved.length)
        issue(
          report,
          "control_field_unresolved",
          `${outcome.key}:${control.key}:${unresolved.join(",")}`,
        );
      if (
        !facts.some(
          (fact) =>
            [
              "navigation_result",
              "interaction",
              "trigger",
              "location",
            ].includes(fact.contract_field) && fact.state === "specified",
        )
      )
        issue(
          report,
          "control_root_behavior_required",
          `${outcome.key}:${control.key}`,
        );
    }
    for (const relation of relations) {
      if (relation.control_refs.length < 2)
        issue(
          report,
          "control_relation_control_refs_required",
          `${outcome.key}:${relation.key}`,
        );
      if (new Set(relation.control_refs).size !== relation.control_refs.length)
        issue(
          report,
          "control_relation_control_ref_duplicate",
          `${outcome.key}:${relation.key}`,
        );
      for (const reference of relation.control_refs)
        if (!controls.has(reference))
          issue(
            report,
            "control_relation_control_ref_unknown",
            `${outcome.key}:${relation.key}:${reference}`,
          );
    }
  }
}

function validateOwnerAndBindings(
  contract: DeliveryContractV2,
  report?: ValidationReporter,
): void {
  const contextRefs = new Set(contract.task.context_refs);
  for (const outcome of contract.outcomes) {
    for (const reference of outcome.product.owner.context_refs)
      if (!contextRefs.has(reference))
        issue(
          report,
          "owner_context_ref_unknown",
          `${outcome.key}:${reference}`,
        );
    if (!outcome.product.owner.path_globs.length)
      issue(report, "owner_path_globs_empty", outcome.key);
    for (const candidate of [
      ...outcome.technical.expected_change_paths,
      ...outcome.technical.allowed_support_paths,
    ])
      if (
        !outcome.product.owner.path_globs.some((owner) =>
          isProvenSubset(candidate, owner),
        )
      )
        issue(
          report,
          "path_outside_owner_boundary",
          `${outcome.key}:${candidate}`,
        );
    const checks = new Map(
      outcome.acceptance.checks.map((check) => [check.key, check]),
    );
    for (const binding of outcome.technical.bindings) {
      for (const carrier of binding.carrier_paths)
        if (
          !outcome.product.owner.path_globs.some((owner) =>
            isProvenSubset(carrier, owner),
          )
        )
          issue(
            report,
            "binding_carrier_outside_owner_boundary",
            `${outcome.key}:${binding.key}:${carrier}`,
          );
      if (binding.kind === "verified") {
        const check = checks.get(binding.verification_check_key ?? "");
        if (!check) {
          issue(
            report,
            "verified_binding_check_unknown",
            `${outcome.key}:${binding.key}`,
          );
          continue;
        }
        const obligationClaim = `obligation.${binding.key}`;
        const covered = [
          ...check.positive_assertions,
          ...check.negative_assertions,
        ].some((assertion) => assertion.claims.includes(obligationClaim));
        if (!covered)
          issue(
            report,
            "verified_binding_obligation_uncovered",
            `${outcome.key}:${binding.key}`,
          );
      }
    }
  }
}

function isProvenSubset(candidate: string, owner: string): boolean {
  return (
    proveRepositoryPatternSubset(candidate, owner).status === "proven_subset"
  );
}

function unique(
  values: string[],
  code: string,
  report?: ValidationReporter,
): void {
  const seen = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) issue(report, code, value);
    seen.add(value);
  }
}

function capture(diagnostics: string[], action: () => void): void {
  try {
    action();
  } catch (error) {
    diagnostics.push(error instanceof Error ? error.message : String(error));
  }
}

function validateDependencies(
  contract: DeliveryContractV2,
  report?: ValidationReporter,
): void {
  const outcomes = new Map(
    contract.outcomes.map((outcome) => [outcome.key, outcome]),
  );
  for (const outcome of contract.outcomes)
    for (const dependency of outcome.depends_on) {
      if (dependency === outcome.key)
        issue(report, "outcome_dependency_self", outcome.key);
      if (!outcomes.has(dependency))
        issue(
          report,
          "outcome_dependency_unknown",
          `${outcome.key}:${dependency}`,
        );
    }
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (value: string): void => {
    if (visiting.has(value)) {
      issue(report, "outcome_dependency_cycle", value);
      return;
    }
    if (visited.has(value)) return;
    visiting.add(value);
    for (const dependency of outcomes.get(value)!.depends_on)
      if (outcomes.has(dependency)) visit(dependency);
    visiting.delete(value);
    visited.add(value);
  };
  for (const outcome of outcomes.keys()) visit(outcome);
}

type ValidationReporter = (message: string) => void;

function issue(
  report: ValidationReporter | undefined,
  code: string,
  detail: string,
): void {
  if (!report) fail(code, detail);
  report(`delivery_contract_invalid:${code}:${detail}`);
}

function captureOrReport(
  report: ValidationReporter | undefined,
  action: () => void,
): void {
  if (!report) {
    action();
    return;
  }
  try {
    action();
  } catch (error) {
    report(error instanceof Error ? error.message : String(error));
  }
}
