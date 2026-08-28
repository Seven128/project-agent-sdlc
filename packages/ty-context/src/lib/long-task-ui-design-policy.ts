import type { CompiledClaimsV2 } from "./long-task-claims.js";
import type {
  DeliveryCheckV2,
  DeliveryContractV2,
  DeliveryOutcomeV2,
  ProductClaimV2,
} from "./long-task-delivery-types.js";
import { matchesRepoPattern } from "./long-task-paths.js";
import {
  issue,
  type Reporter,
  unique,
  validateCarrierInputs,
  validateRootJourney,
  validateTargetLocalClaimProof,
} from "./long-task-ui-surface-validation.js";

interface UiDesignBindingContext {
  outcome: DeliveryOutcomeV2;
  binding: DeliveryOutcomeV2["product"]["surface_bindings"][number];
  outcomeClaims: Map<string, ProductClaimV2>;
  claims: CompiledClaimsV2;
  checks: Map<string, DeliveryCheckV2>;
  confirmations: Map<
    string,
    DeliveryContractV2["global"]["acceptance"]["external_confirmations"][number]
  >;
  carriers: string[];
  designTargetKeys: Set<string>;
  designAssertionRefs: Set<string>;
  report?: Reporter;
}

export function validateUiDesignBinding(context: UiDesignBindingContext): void {
  validateDesignTargets(context);
  validateBlockers(context);
}

function validateDesignTargets({
  outcome,
  binding,
  outcomeClaims,
  checks,
  carriers,
  designTargetKeys,
  designAssertionRefs,
  report,
}: UiDesignBindingContext): void {
  for (const target of binding.design_targets) {
    const label = `${outcome.key}:${binding.key}:${target.key}`;
    const symbolic = target.fact_model === "symbolic_rules_v2";
    if (designTargetKeys.has(target.key))
      issue(report, "ui_design_target_key_duplicate", label);
    designTargetKeys.add(target.key);
    const assertionIdentity = `${target.conformance_check_ref}\0${target.conformance_assertion_ref}`;
    if (designAssertionRefs.has(assertionIdentity))
      issue(report, "ui_design_target_assertion_duplicate", label);
    designAssertionRefs.add(assertionIdentity);
    unique(
      (symbolic
        ? (target.symbolic_method_bindings ?? [])
        : target.verification_method_bindings
      ).map((item) => item.method),
      "ui_design_target_verification_method_duplicate",
      label,
      report,
    );
    unique(
      (symbolic
        ? (target.symbolic_method_bindings ?? [])
        : target.verification_method_bindings
      ).map((item) => item.assertion_ref),
      "ui_design_target_verification_assertion_duplicate",
      label,
      report,
    );
    if (
      !(
        symbolic
          ? (target.symbolic_method_bindings ?? [])
          : target.verification_method_bindings
      ).length
    )
      issue(report, "ui_design_target_verification_methods_required", label);
    if (
      symbolic &&
      (target.condition_keys.length ||
        target.verification_method_bindings.length)
    )
      issue(report, "ui_design_symbolic_ground_fields_forbidden", label);
    const methodArtifactPaths = new Set<string>();
    const methodFactObligations = new Set<string>();
    for (const [name, values] of [
      ["source_paths", target.source_paths],
      ["condition_keys", target.condition_keys],
      ["claim_refs", target.claim_refs],
    ] as const) {
      unique(values, `ui_design_target_${name}_duplicate`, label, report);
      if (!values.length && !(symbolic && name === "condition_keys"))
        issue(report, `ui_design_target_${name}_required`, label);
    }
    for (const claimRef of target.claim_refs) {
      const claim = outcomeClaims.get(claimRef);
      if (
        !claim ||
        claim.kind !== "control" ||
        !binding.control_refs.some((control) =>
          claimRef.startsWith(`control.${control}.`),
        )
      )
        issue(
          report,
          "ui_design_target_control_claim_required",
          `${label}:${claimRef}`,
        );
    }
    const check = checks.get(target.conformance_check_ref);
    if (!check) {
      issue(
        report,
        "ui_design_target_conformance_check_unknown",
        `${label}:${target.conformance_check_ref}`,
      );
      continue;
    }
    validateRootJourney(binding, check, label, report);
    validateCarrierInputs(check, carriers, label, report);
    validateDesignAssertion(target, check, label, report);
    if (symbolic) {
      validateSymbolicDesignBindings(
        target,
        check,
        label,
        methodArtifactPaths,
        report,
      );
      validateDesignFiles(target, check, label, report);
      continue;
    }
    for (const methodBinding of target.verification_method_bindings) {
      const identity = `${target.conformance_check_ref}\0${methodBinding.assertion_ref}`;
      if (
        methodBinding.assertion_ref !== target.conformance_assertion_ref &&
        designAssertionRefs.has(identity)
      )
        issue(
          report,
          "ui_design_target_assertion_duplicate",
          `${label}:${methodBinding.assertion_ref}`,
        );
      if (methodBinding.assertion_ref !== target.conformance_assertion_ref)
        designAssertionRefs.add(identity);
      const methodAssertion = check.positive_assertions.find(
        (item) => item.key === methodBinding.assertion_ref,
      );
      if (!methodAssertion)
        issue(
          report,
          "ui_design_target_verification_assertion_unknown",
          `${label}:${methodBinding.method}:${methodBinding.assertion_ref}`,
        );
      else {
        validateDesignMethodAssertionClaims(
          target,
          methodAssertion,
          label,
          methodBinding.method,
          report,
        );
        if (!methodAssertion.evidence_capabilities.includes("design_method"))
          issue(
            report,
            "ui_design_target_verification_capability_required",
            `${label}:${methodBinding.method}:design_method`,
          );
      }
      const conditionKeys = methodBinding.evidence_artifacts.map(
        (item) => item.condition_key,
      );
      unique(
        conditionKeys,
        "ui_design_method_evidence_condition_duplicate",
        `${label}:${methodBinding.method}`,
        report,
      );
      if (!sameSet(conditionKeys, target.condition_keys))
        issue(
          report,
          "ui_design_method_evidence_conditions_mismatch",
          `${label}:${methodBinding.method}`,
        );
      for (const artifact of methodBinding.evidence_artifacts) {
        unique(
          artifact.fact_refs,
          "ui_design_method_fact_ref_duplicate",
          `${label}:${methodBinding.method}:${artifact.condition_key}`,
          report,
        );
        unique(
          artifact.fact_expectations.map((item) => item.fact_ref),
          "ui_design_method_fact_expectation_duplicate",
          `${label}:${methodBinding.method}:${artifact.condition_key}`,
          report,
        );
        if (
          !sameSet(
            artifact.fact_expectations.map((item) => item.fact_ref),
            artifact.fact_refs,
          )
        )
          issue(
            report,
            "ui_design_method_fact_expectation_refs_mismatch",
            `${label}:${methodBinding.method}:${artifact.condition_key}`,
          );
        for (const factRef of artifact.fact_refs) {
          const obligationIdentity = `${methodBinding.method}\0${artifact.condition_key}\0${factRef}`;
          if (methodFactObligations.has(obligationIdentity))
            issue(
              report,
              "ui_design_method_fact_obligation_reused",
              `${label}:${methodBinding.method}:${artifact.condition_key}:${factRef}`,
            );
          methodFactObligations.add(obligationIdentity);
        }
        for (const [kind, artifactPath] of [
          ["record", artifact.path],
          ["observation", artifact.observation_path],
        ] as const) {
          if (methodArtifactPaths.has(artifactPath))
            issue(
              report,
              "ui_design_method_evidence_artifact_reused",
              `${label}:${kind}:${artifactPath}`,
            );
          methodArtifactPaths.add(artifactPath);
          if (
            !check.artifact_globs.some((pattern) =>
              matchesRepoPattern(artifactPath, pattern),
            )
          )
            issue(
              report,
              "ui_design_method_evidence_artifact_glob_missing",
              `${label}:${methodBinding.method}:${kind}:${artifactPath}`,
            );
        }
      }
    }
    validateDesignFiles(target, check, label, report);
  }
}

function validateSymbolicDesignBindings(
  target: DeliveryOutcomeV2["product"]["surface_bindings"][number]["design_targets"][number],
  check: DeliveryCheckV2,
  label: string,
  artifactPaths: Set<string>,
  report?: Reporter,
): void {
  const obligationRefs = new Set<string>();
  for (const binding of target.symbolic_method_bindings ?? []) {
    const assertion = check.positive_assertions.find(
      (item) => item.key === binding.assertion_ref,
    );
    if (!assertion)
      issue(
        report,
        "ui_design_symbolic_method_assertion_unknown",
        `${label}:${binding.method}:${binding.assertion_ref}`,
      );
    else {
      validateDesignMethodAssertionClaims(
        target,
        assertion,
        label,
        binding.method,
        report,
      );
      if (!assertion.evidence_capabilities.includes("design_method"))
        issue(
          report,
          "ui_design_symbolic_method_capability_required",
          `${label}:${binding.method}`,
        );
    }
    if (!binding.rule_expectations.length)
      issue(
        report,
        "ui_design_symbolic_rule_expectations_required",
        `${label}:${binding.method}`,
      );
    unique(
      binding.rule_expectations.map((item) => item.obligation_ref),
      "ui_design_symbolic_obligation_duplicate",
      `${label}:${binding.method}`,
      report,
    );
    for (const expectation of binding.rule_expectations) {
      if (obligationRefs.has(expectation.obligation_ref))
        issue(
          report,
          "ui_design_symbolic_obligation_reused",
          `${label}:${expectation.obligation_ref}`,
        );
      obligationRefs.add(expectation.obligation_ref);
    }
    for (const artifactPath of [
      binding.artifact_path,
      binding.observation_path,
    ])
      validateSymbolicArtifactPath(
        artifactPath,
        target,
        check,
        label,
        artifactPaths,
        report,
      );
  }
  const certificate = target.symbolic_certificate_binding;
  if (!certificate) {
    issue(report, "ui_design_symbolic_certificate_binding_required", label);
    return;
  }
  const assertion = check.positive_assertions.find(
    (item) => item.key === certificate.assertion_ref,
  );
  if (!assertion)
    issue(
      report,
      "ui_design_symbolic_certificate_assertion_unknown",
      `${label}:${certificate.assertion_ref}`,
    );
  else if (
    !assertion.evidence_capabilities.includes("design_symbolic_certificate")
  )
    issue(report, "ui_design_symbolic_certificate_capability_required", label);
  if (!certificate.expectations.length)
    issue(
      report,
      "ui_design_symbolic_certificate_expectations_required",
      label,
    );
  unique(
    certificate.expectations.map((item) => item.certificate_ref),
    "ui_design_symbolic_certificate_duplicate",
    label,
    report,
  );
  validateSymbolicArtifactPath(
    certificate.artifact_path,
    target,
    check,
    label,
    artifactPaths,
    report,
  );
}

function validateDesignMethodAssertionClaims(
  target: DeliveryOutcomeV2["product"]["surface_bindings"][number]["design_targets"][number],
  assertion: DeliveryCheckV2["positive_assertions"][number],
  label: string,
  method: string,
  report?: Reporter,
): void {
  for (const claimRef of assertion.claims)
    if (claimRef === "result")
      issue(
        report,
        "ui_design_target_verification_claim_not_owned",
        `${label}:${method}:${target.conformance_check_ref}:${assertion.key}:${claimRef}`,
      );
}

function validateSymbolicArtifactPath(
  artifactPath: string,
  _target: DeliveryOutcomeV2["product"]["surface_bindings"][number]["design_targets"][number],
  check: DeliveryCheckV2,
  label: string,
  artifactPaths: Set<string>,
  report?: Reporter,
): void {
  if (artifactPaths.has(artifactPath))
    issue(
      report,
      "ui_design_symbolic_evidence_artifact_reused",
      `${label}:${artifactPath}`,
    );
  artifactPaths.add(artifactPath);
  if (
    !check.artifact_globs.some((pattern) =>
      matchesRepoPattern(artifactPath, pattern),
    )
  )
    issue(
      report,
      "ui_design_symbolic_evidence_artifact_glob_missing",
      `${label}:${artifactPath}`,
    );
}

function sameSet(left: string[], right: string[]): boolean {
  const leftSet = [...new Set(left)].sort();
  const rightSet = [...new Set(right)].sort();
  return (
    leftSet.length === rightSet.length &&
    leftSet.every((value, index) => value === rightSet[index])
  );
}

function validateDesignAssertion(
  target: DeliveryOutcomeV2["product"]["surface_bindings"][number]["design_targets"][number],
  check: DeliveryCheckV2,
  label: string,
  report?: Reporter,
): void {
  const assertion = check.positive_assertions.find(
    (item) => item.key === target.conformance_assertion_ref,
  );
  if (!assertion) {
    issue(
      report,
      "ui_design_target_conformance_assertion_unknown",
      `${label}:${target.conformance_assertion_ref}`,
    );
    return;
  }
  for (const claimRef of target.claim_refs)
    if (!assertion.claims.includes(claimRef))
      issue(
        report,
        "ui_design_target_claim_not_asserted",
        `${label}:${claimRef}`,
      );
  for (const capability of [
    "design_conformance",
    "interaction_trace",
    "target_runtime",
  ] as const)
    if (!assertion.evidence_capabilities.includes(capability))
      issue(
        report,
        "ui_design_target_capability_required",
        `${label}:${capability}`,
      );
}

function validateDesignFiles(
  target: DeliveryOutcomeV2["product"]["surface_bindings"][number]["design_targets"][number],
  check: DeliveryCheckV2,
  label: string,
  report?: Reporter,
): void {
  for (const source of target.source_paths)
    if (
      !check.verification_inputs.some((pattern) =>
        matchesRepoPattern(source, pattern),
      )
    )
      issue(
        report,
        "ui_design_target_verification_input_missing",
        `${label}:${source}`,
      );
  if (target.actual_artifact_path === target.comparison_artifact_path)
    issue(report, "ui_design_target_artifacts_must_differ", label);
  for (const artifact of [
    target.actual_artifact_path,
    target.comparison_artifact_path,
  ])
    if (
      !check.artifact_globs.some((pattern) =>
        matchesRepoPattern(artifact, pattern),
      )
    )
      issue(
        report,
        "ui_design_target_artifact_glob_missing",
        `${label}:${artifact}`,
      );
}

function validateBlockers(context: UiDesignBindingContext): void {
  const {
    outcome,
    binding,
    outcomeClaims,
    claims,
    checks,
    confirmations,
    report,
  } = context;
  const label = `${outcome.key}:${binding.key}`;
  unique(
    binding.acceptance_blockers.map((item) => item.key),
    "ui_design_blocker_key_duplicate",
    label,
    report,
  );
  for (const blocker of binding.acceptance_blockers) {
    const blockerLabel = `${label}:${blocker.key}`;
    unique(
      blocker.refs,
      "ui_design_blocker_ref_duplicate",
      blockerLabel,
      report,
    );
    if (!blocker.refs.length)
      issue(report, "ui_design_blocker_ref_required", blockerLabel);
    unique(
      blocker.source_item_refs,
      "ui_design_blocker_source_item_duplicate",
      blockerLabel,
      report,
    );
    unique(
      blocker.verification_methods,
      "ui_design_blocker_verification_method_duplicate",
      blockerLabel,
      report,
    );
    if (!blocker.source_item_refs.length)
      issue(report, "ui_design_blocker_source_item_required", blockerLabel);
    if (!blocker.verification_methods.length)
      issue(
        report,
        "ui_design_blocker_verification_method_required",
        blockerLabel,
      );
    if (blocker.status === "machine_claim")
      validateMachineBlocker(context, blocker.refs, blockerLabel);
    if (blocker.status === "external_confirmation")
      validateExternalBlocker(
        outcome,
        confirmations,
        blocker.refs,
        blockerLabel,
        report,
      );
  }
}

function validateMachineBlocker(
  {
    outcome,
    binding,
    outcomeClaims,
    claims,
    checks,
    report,
  }: UiDesignBindingContext,
  claimRefs: string[],
  label: string,
): void {
  for (const claimRef of claimRefs) {
    const claim = outcomeClaims.get(claimRef);
    if (!claim)
      issue(
        report,
        "ui_design_blocker_machine_claim_unknown",
        `${label}:${claimRef}`,
      );
    else
      validateTargetLocalClaimProof(
        outcome,
        claim,
        binding.target_ref,
        null,
        claims,
        checks,
        label,
        report,
      );
  }
}

function validateExternalBlocker(
  outcome: DeliveryOutcomeV2,
  confirmations: UiDesignBindingContext["confirmations"],
  confirmationRefs: string[],
  label: string,
  report?: Reporter,
): void {
  for (const confirmationRef of confirmationRefs) {
    const confirmation = confirmations.get(confirmationRef);
    if (!confirmation)
      issue(
        report,
        "ui_design_blocker_confirmation_unknown",
        `${label}:${confirmationRef}`,
      );
    else if (!confirmation.blocks_target)
      issue(
        report,
        "ui_design_blocker_confirmation_must_block_target",
        `${label}:${confirmationRef}`,
      );
    else if (
      !confirmation.impact_claims.some((claim) =>
        claim.startsWith(`${outcome.key}.`),
      )
    )
      issue(
        report,
        "ui_design_blocker_confirmation_impact_mismatch",
        `${label}:${confirmationRef}`,
      );
  }
}
