import path from "node:path";
import { validateContractForActivation } from "./long-task-activation-validation.js";
import {
  DELIVERY_CONTRACT_FILE,
  parseDeliveryContractBundle,
} from "./long-task-delivery-parser.js";
import type {
  CompiledDeliveryContractV2,
  InitialTaskBaseV2,
} from "./long-task-delivery-types.js";
import { canonicalValueJson, sha256Hex } from "./strict-codec.js";
import {
  changedAuthoritySections,
  computeAuthorityHashes,
} from "./long-task-authority.js";
import {
  authorityMaterialsChanged,
  compiledAuthorityMaterials,
  computeAuthorityMaterials,
} from "./long-task-authority-materials.js";
import { normalizeContextAuthoritySnapshot } from "./long-task-context-authority.js";
import {
  assertRiskNotDowngraded,
  buildAuthorityRevisionProposal,
  enforceAuthorityRevision,
} from "./long-task-authority-revision-enforcement.js";
import type { AuthorityRevisionProposalV2 } from "./long-task-authority-revision-types.js";
import { validateActualRiskSurfaces } from "./long-task-risk-surfaces.js";
import { captureVerifierIdentity } from "./long-task-verifier-identity.js";
import { verifierAuthorityDiff } from "./long-task-verifier-authority.js";
import {
  changedWorkspacePaths,
  changedWorkspacePathsFromHead,
  currentGitTree,
  repoRelative,
  repositoryRoot,
} from "./long-task-workspace.js";
import {
  assertWorkspaceScope,
  classifyWorkspaceScope,
  firstLockManagedWorkspacePaths,
  protectedWorkspacePaths,
} from "./long-task-workspace-scope.js";

export interface CompileDeliveryOptionsV2 {
  require_completion_gate?: boolean;
  revise?: boolean;
  live_gate?: boolean;
  initial_task_base?: InitialTaskBaseV2;
  authority_revision?: number;
  previous_authority?: CompiledDeliveryContractV2 | null;
  authority_revision_mode?: "enforce" | "diagnose";
  on_authority_revision?: (proposal: AuthorityRevisionProposalV2) => void;
}

export async function compileDeliveryContract(
  workdirInput: string,
  projectRootInput = process.cwd(),
  options: CompileDeliveryOptionsV2 = {},
): Promise<CompiledDeliveryContractV2> {
  const repository = await repositoryRoot(projectRootInput);
  const workdir = path.resolve(workdirInput);
  const workdirRelative = repoRelative(repository, workdir);
  if (!workdirRelative)
    throw new Error("long_task_workdir_must_not_be_repository_root");
  const contractFile = path.join(workdir, DELIVERY_CONTRACT_FILE);
  const parsed = await parseDeliveryContractBundle(workdir, repository, {
    validate_structure: false,
  });
  const contract = parsed.contract;
  const validation = await validateContractForActivation({
    contract,
    repository,
    workdir,
    mode: "fail_fast",
  });
  const claims = validation.claims!;
  const risk = validation.risk!;
  const sourceHashes = validation.source_hashes!;
  const sourceItems = validation.source_items!;
  const context = validation.context_snapshot!;
  const current = validation.workspace!;
  const globalChecks = validation.global_checks;
  const outcomes = validation.outcomes;
  const contractFiles = Object.fromEntries(
    Object.entries(parsed.contract_files).map(([relative, hash]) => [
      repoRelative(repository, path.join(workdir, ...relative.split("/"))),
      hash,
    ]),
  );

  const contractHash = sha256Hex(canonicalValueJson(contract));
  const authorityMaterials = computeAuthorityMaterials(
    contract,
    sourceHashes,
    sourceItems,
    context,
  );
  const previous = options.live_gate
    ? null
    : (options.previous_authority ?? null);
  const existingInitialTaskBase =
    options.initial_task_base ?? previous?.initial_task_base ?? null;
  const changedPaths = existingInitialTaskBase
    ? changedWorkspacePaths(existingInitialTaskBase.workspace_manifest, current)
    : await changedWorkspacePathsFromHead(repository, workdir);
  const firstLockManagedPaths = existingInitialTaskBase
    ? []
    : await firstLockManagedWorkspacePaths(repository, changedPaths);
  assertWorkspaceScope(
    classifyWorkspaceScope(
      contract,
      changedPaths,
      protectedWorkspacePaths({
        contract_files: contractFiles,
        source_hashes: sourceHashes,
        context_hashes: context.sha256,
        checks: [
          ...globalChecks,
          ...outcomes.flatMap((outcome) => outcome.acceptance.checks),
        ],
        additional_files: firstLockManagedPaths,
      }),
    ),
  );
  const initialTaskBase = existingInitialTaskBase ?? {
    git_commit: current.git_head,
    git_tree: await currentGitTree(repository),
    workspace_manifest: current,
  };
  await validateActualRiskSurfaces(repository, changedPaths, contract);

  const verifier = await captureVerifierIdentity(
    repository,
    options.require_completion_gate !== false,
  );
  const allChecks = [
    ...globalChecks,
    ...outcomes.flatMap((outcome) => outcome.acceptance.checks),
  ];

  const authorityHashes = computeAuthorityHashes(contract);
  authorityHashes.acceptance_authority_hash = sha256Hex(
    canonicalValueJson({
      declared: authorityHashes.acceptance_authority_hash,
      claim_coverage: claims.summary,
      frozen_checks: allChecks.map((check) => ({
        internal_id: check.internal_id,
        runner_definition: check.runner.definition_sha256,
        resolved_cwd: check.runner.resolved_cwd,
        resolved_target: check.runner.resolved_target,
        package_script: check.runner.package_script,
        verification_inputs: check.verification_input_hashes,
        raw_execution_identity: check.raw_execution_identity,
        evidence_adapter: check.evidence_adapter,
        observation_authorities: check.observation_authorities,
        process_runtime_closure: check.process_runtime_closure,
        completion_role: check.completion_role,
        expected_authority_refs: check.expected_authority_refs,
        required_evidence_capabilities: check.required_evidence_capabilities,
      })),
    }),
  );

  let authorityRevision =
    options.authority_revision ?? previous?.authority_revision ?? 1;
  if (previous) {
    const changes = changedAuthoritySections(
      previous.authority_hashes,
      authorityHashes,
    );
    const contractChanged = previous.contract_sha256 !== contractHash;
    const materialsChanged = authorityMaterialsChanged(
      compiledAuthorityMaterials(previous),
      authorityMaterials,
    );
    const verifierChanged = verifierAuthorityDiff(
      previous.verifier_identity,
      verifier,
    );
    const authorityChanged =
      changes.length > 0 ||
      contractChanged ||
      materialsChanged ||
      verifierChanged.verifier_content_changed ||
      verifierChanged.verifier_runtime_locator_changed;
    if (authorityChanged && !options.revise)
      throw new Error("authority_revision_requires_revise_flag");
    if (options.revise && authorityChanged) {
      assertRiskNotDowngraded(previous, risk.effective_level, risk.reasons);
      authorityRevision = previous.authority_revision + 1;
      const proposal = buildAuthorityRevisionProposal(
        previous,
        contract,
        authorityHashes,
        authorityMaterials,
        globalChecks,
        outcomes,
        verifier,
        risk.minimum_level,
      );
      options.on_authority_revision?.(proposal);
      if (options.authority_revision_mode !== "diagnose")
        await enforceAuthorityRevision(proposal, workdir);
    }
  }

  const unsigned = {
    schema_version: "compiled-long-task-delivery-v2" as const,
    repository_root: repository,
    workdir,
    contract_file: repoRelative(repository, contractFile),
    contract_sha256: contractHash,
    contract_files: contractFiles,
    source_hashes: sourceHashes,
    source_items: sourceItems,
    context_snapshot: normalizeContextAuthoritySnapshot(context),
    verifier_identity: verifier,
    effective_risk: risk.effective_level,
    risk_reasons: risk.reasons,
    baseline_workspace: initialTaskBase.workspace_manifest,
    initial_task_base: initialTaskBase,
    authority_hashes: authorityHashes,
    authority_materials: authorityMaterials,
    authority_revision: authorityRevision,
    claim_coverage: claims.summary,
    acceptance_reachability: validation.acceptance_reachability!,
    semantic_fact_manifest: contract.semantic_fact_manifest,
    task: contract.task,
    risk: contract.risk,
    source_claims: contract.source_claims,
    stages: contract.stages,
    global: {
      applicability: contract.global.applicability,
      product: contract.global.product,
      technical: contract.global.technical,
      acceptance: {
        checks: globalChecks,
        counterfactual_controls:
          contract.global.acceptance.counterfactual_controls,
        external_confirmations:
          contract.global.acceptance.external_confirmations,
      },
    },
    outcomes,
  };
  return {
    ...unsigned,
    compiled_identity: sha256Hex(canonicalValueJson(unsigned)),
  };
}
