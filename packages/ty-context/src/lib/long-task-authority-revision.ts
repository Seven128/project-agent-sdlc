import type {
  AuthorityHashesV2,
  CompiledCheckV2,
  CompiledDeliveryContractV2,
  CompiledOutcomeV2,
  DeliveryContractV2,
  NextAuthorityMaterialsV2,
  VerifierIdentityV2,
} from "./long-task-delivery-types.js";
import {
  acceptanceSemanticsChanged,
  isMonotonicAcceptanceStrengthening,
} from "./long-task-authority.js";
import {
  authorityMaterialRevisionDiff,
  changedProductClaimSemantics,
  sourceClaimAdditions,
} from "./long-task-authority-material-diff.js";
import {
  analyzeCheckRevisions,
  analyzeOutcomeRevisions,
  keyedAuthorityChanges,
  selectedRevisionReasons,
} from "./long-task-authority-revision-analysis.js";
import {
  addedValues,
  checkIndex,
  removedExactValues,
  removedValues,
  sourceClaimReductions,
} from "./long-task-authority-revision-details.js";
import type { AuthorityRevisionDiffV2 } from "./long-task-authority-revision-types.js";
import { compileProductClaimCoverage } from "./long-task-claims.js";
import { verifierAuthorityDiff } from "./long-task-verifier-authority.js";
import { compiledAuthorityMaterials } from "./long-task-authority-materials.js";
import { implementationBindingRefreshTargets } from "./long-task-implementation-binding-refresh.js";

export type { AuthorityRevisionDiffV2 } from "./long-task-authority-revision-types.js";

export function authorityRevisionDiff(
  previous: CompiledDeliveryContractV2,
  next: DeliveryContractV2,
  nextHashes: AuthorityHashesV2,
  nextMaterials: NextAuthorityMaterialsV2,
  nextGlobalChecks: CompiledCheckV2[],
  nextOutcomes: CompiledOutcomeV2[],
  nextVerifier: VerifierIdentityV2,
): AuthorityRevisionDiffV2 {
  const materialDiff = authorityMaterialRevisionDiff(previous, nextMaterials);
  const nextClaims = compileProductClaimCoverage(next).by_outcome;
  const beforeClaimIds = new Set(
    previous.outcomes.flatMap((outcome) =>
      outcome.generated_claims.map((claim) => claim.id),
    ),
  );
  const afterClaimIds = new Set(
    Object.values(nextClaims)
      .flat()
      .map((claim) => claim.id),
  );
  const beforeChecks = checkIndex(
    previous.global.acceptance.checks,
    previous.outcomes,
  );
  const afterChecks = checkIndex(nextGlobalChecks, nextOutcomes);
  const productClaimsRemoved = removedValues(beforeClaimIds, afterClaimIds);
  const productClaimsAdded = addedValues(beforeClaimIds, afterClaimIds);
  const productClaimsChanged = changedProductClaimSemantics(previous, next);
  const checksRemoved = removedValues(
    new Set(beforeChecks.keys()),
    new Set(afterChecks.keys()),
  );
  const checkChanges = analyzeCheckRevisions(beforeChecks, afterChecks);

  const sourceClaimsRemovedOrChanged = sourceClaimReductions(
    previous.source_claims,
    next.source_claims,
  );
  const sourceClaimsAdded = sourceClaimAdditions(
    previous.source_claims,
    next.source_claims,
  );
  const sourcePathsRemovedOrReplaced = removedExactValues(
    "task",
    previous.task.source_paths,
    next.task.source_paths,
  );
  const outcomeChanges = analyzeOutcomeRevisions(previous, next);
  const verifierDiff = verifierAuthorityDiff(
    previous.verifier_identity,
    nextVerifier,
  );
  const riskChanged =
    previous.authority_hashes.risk_authority_hash !==
    nextHashes.risk_authority_hash;
  const acceptanceChanged = acceptanceSemanticsChanged(previous, next);
  const externalConfirmationChanges = keyedAuthorityChanges(
    previous.global.acceptance.external_confirmations,
    next.global.acceptance.external_confirmations,
  );
  const externalConfirmationsChanged = externalConfirmationChanges.length > 0;
  const monotonic = isMonotonicAcceptanceStrengthening(previous, next);
  const ordinaryReductionReasons = [
    ...selectedRevisionReasons([
      ["product_claim_added", productClaimsAdded],
      ["product_claim_removed", productClaimsRemoved],
      ["product_claim_changed", productClaimsChanged],
    ]),
    ...materialDiff.reduction_reasons,
    ...selectedRevisionReasons([
      ["check_removed", checksRemoved],
      ["negative_assertion_removed", checkChanges.negative_assertions_removed],
      [
        "acceptance_semantics_reduced",
        checkChanges.acceptance_semantics_reduced,
      ],
      ["proof_surface_changed", checkChanges.proof_surfaces_changed],
      ["source_claim_removed_or_changed", sourceClaimsRemovedOrChanged],
      ["source_claim_added", sourceClaimsAdded],
      ["source_path_removed_or_replaced", sourcePathsRemovedOrReplaced],
      ["owner_path_expanded", outcomeChanges.owner_paths_expanded],
      ["owner_context_ref_removed", outcomeChanges.owner_context_refs_removed],
      [
        "expected_change_path_expanded",
        outcomeChanges.expected_change_paths_expanded,
      ],
      ["allowed_path_expanded", outcomeChanges.allowed_paths_expanded],
      ["forbidden_path_removed", outcomeChanges.forbidden_paths_removed],
      ["runner_definition_changed", checkChanges.runner_definitions_changed],
      [
        "verification_input_removed_or_replaced",
        checkChanges.verification_inputs_removed_or_replaced,
      ],
      [
        "input_path_coverage_reduced",
        checkChanges.input_paths_removed_or_narrowed,
      ],
      [
        "expected_output_requirement_weakened",
        checkChanges.expected_output_paths_removed_or_weakened,
      ],
      ["artifact_removed", checkChanges.artifacts_removed],
      [
        "environment_requirement_removed",
        checkChanges.environment_requirements_removed,
      ],
      [
        "binding_removed_or_expanded",
        outcomeChanges.bindings_removed_or_expanded,
      ],
      [
        "obligation_removed_or_weakened",
        outcomeChanges.obligations_removed_or_weakened,
      ],
      [
        "rollback_or_recovery_weakened",
        outcomeChanges.rollback_or_recovery_weakened,
      ],
      ["counterfactual_removed", outcomeChanges.counterfactuals_removed],
      ["population_weakened", outcomeChanges.population_weakened],
      ["verifier_content_changed", verifierDiff.verifier_content_changed],
      ["risk_changed_requires_review", riskChanged],
      ["external_confirmation_changed", externalConfirmationsChanged],
      ["acceptance_not_monotonic", acceptanceChanged && !monotonic],
    ]),
  ];
  const implementationRefreshTargets = implementationBindingRefreshTargets(
    compiledAuthorityMaterials(previous),
    nextMaterials,
    {
      verifier_content_changed: verifierDiff.verifier_content_changed,
      verifier_runtime_locator_changed:
        verifierDiff.verifier_runtime_locator_changed,
      risk_changed: riskChanged,
    },
  );
  const reductionReasons = implementationRefreshTargets.length
    ? ["implementation_binding_refresh"]
    : ordinaryReductionReasons;
  return {
    product_claims_added: productClaimsAdded,
    product_claims_removed: productClaimsRemoved,
    product_claims_changed: productClaimsChanged,
    product_semantics_changed: materialDiff.product_semantics_changed,
    global_semantics_changed: materialDiff.global_semantics_changed,
    checks_added: addedValues(
      new Set(beforeChecks.keys()),
      new Set(afterChecks.keys()),
    ),
    checks_removed: checksRemoved,
    negative_assertions_removed: checkChanges.negative_assertions_removed,
    acceptance_semantics_reduced: checkChanges.acceptance_semantics_reduced,
    proof_surfaces_changed: checkChanges.proof_surfaces_changed,
    source_claims_added: sourceClaimsAdded,
    source_claims_removed_or_changed: sourceClaimsRemovedOrChanged,
    source_paths_removed_or_replaced: sourcePathsRemovedOrReplaced,
    source_files_added: materialDiff.source_files_added,
    source_files_removed: materialDiff.source_files_removed,
    source_files_changed: materialDiff.source_files_changed,
    context_snapshot_mode_changed: materialDiff.context_snapshot_mode_changed,
    context_topology_changed: materialDiff.context_topology_changed,
    context_files_added: materialDiff.context_files_added,
    context_files_removed: materialDiff.context_files_removed,
    context_files_changed: materialDiff.context_files_changed,
    design_semantics_changed: materialDiff.design_semantics_changed,
    design_implementation_bindings_changed:
      materialDiff.design_implementation_bindings_changed,
    implementation_binding_refresh_targets: implementationRefreshTargets,
    owner_paths_expanded: outcomeChanges.owner_paths_expanded,
    owner_context_refs_removed: outcomeChanges.owner_context_refs_removed,
    expected_change_paths_expanded:
      outcomeChanges.expected_change_paths_expanded,
    allowed_paths_expanded: outcomeChanges.allowed_paths_expanded,
    forbidden_paths_removed: outcomeChanges.forbidden_paths_removed,
    runner_definitions_changed: checkChanges.runner_definitions_changed,
    verification_inputs_added: checkChanges.verification_inputs_added,
    verification_inputs_removed_or_replaced:
      checkChanges.verification_inputs_removed_or_replaced,
    input_paths_added: checkChanges.input_paths_added,
    input_paths_removed_or_narrowed:
      checkChanges.input_paths_removed_or_narrowed,
    expected_output_paths_removed_or_weakened:
      checkChanges.expected_output_paths_removed_or_weakened,
    artifacts_removed: checkChanges.artifacts_removed,
    environment_requirements_removed:
      checkChanges.environment_requirements_removed,
    bindings_removed_or_expanded: outcomeChanges.bindings_removed_or_expanded,
    obligations_removed_or_weakened:
      outcomeChanges.obligations_removed_or_weakened,
    rollback_or_recovery_weakened: outcomeChanges.rollback_or_recovery_weakened,
    counterfactuals_removed: outcomeChanges.counterfactuals_removed,
    population_weakened: outcomeChanges.population_weakened,
    external_confirmations_changed: externalConfirmationsChanged,
    external_confirmation_changes: externalConfirmationChanges,
    ...verifierDiff,
    source_claims_changed:
      previous.authority_hashes.source_authority_hash !==
      nextHashes.source_authority_hash,
    risk_changed: riskChanged,
    owner_or_path_boundary_changed:
      outcomeChanges.owner_paths_expanded.length > 0 ||
      outcomeChanges.owner_context_refs_removed.length > 0 ||
      outcomeChanges.expected_change_paths_expanded.length > 0 ||
      outcomeChanges.allowed_paths_expanded.length > 0 ||
      outcomeChanges.forbidden_paths_removed.length > 0 ||
      outcomeChanges.bindings_removed_or_expanded.length > 0,
    runner_or_verification_inputs_changed:
      checkChanges.runner_definitions_changed.length > 0 ||
      checkChanges.verification_inputs_removed_or_replaced.length > 0 ||
      checkChanges.input_paths_removed_or_narrowed.length > 0 ||
      checkChanges.expected_output_paths_removed_or_weakened.length > 0,
    technical_obligations_changed:
      outcomeChanges.obligations_removed_or_weakened.length > 0 ||
      outcomeChanges.rollback_or_recovery_weakened.length > 0,
    reduction_reasons: [...new Set(reductionReasons)],
  };
}
