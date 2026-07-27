import path from "node:path";
import {
  authoringRevisionPreview,
  loadAuthoringActiveAuthority,
} from "./long-task-authoring-authority-preview.js";
import {
  addAuthoringDiagnostics,
  addDiagnosticError,
  normalizeAuthoringDiagnostics,
  sourceCoverage,
} from "./long-task-authoring-preflight-diagnostics.js";
import {
  emptyClaimCoverage,
  emptyPreflightResult,
  type AuthoringPreflightDiagnosticV1,
  type AuthoringPreflightResultV1,
} from "./long-task-authoring-preflight-types.js";
import { validateContractForActivation } from "./long-task-activation-validation.js";
import { parseDeliveryContractBundle } from "./long-task-delivery-parser.js";
import {
  changedWorkspacePaths,
  changedWorkspacePathsFromHead,
  repoRelative,
  repositoryRoot,
} from "./long-task-workspace.js";
import {
  classifyWorkspaceScope,
  firstLockManagedWorkspacePaths,
  protectedWorkspacePaths,
  workspaceScopeErrors,
} from "./long-task-workspace-scope.js";

export type {
  AuthoringPreflightDiagnosticV1,
  AuthoringPreflightResultV1,
  SourceCoverageV1,
} from "./long-task-authoring-preflight-types.js";

export async function preflightDeliveryContract(
  workdirInput: string,
  projectRootInput = process.cwd(),
): Promise<AuthoringPreflightResultV1> {
  const diagnostics: AuthoringPreflightDiagnosticV1[] = [];
  const repository = await repositoryRoot(projectRootInput);
  const workdir = path.resolve(workdirInput);
  let parsed;
  try {
    parsed = await parseDeliveryContractBundle(workdir, repository, {
      validate_structure: false,
    });
  } catch (error) {
    addDiagnosticError(diagnostics, error);
    return emptyPreflightResult(normalizeAuthoringDiagnostics(diagnostics));
  }
  const contract = parsed.contract;
  addAuthoringDiagnostics(contract, parsed, diagnostics);
  const activeDiagnostics: AuthoringPreflightDiagnosticV1[] = [];
  const [validation, active] = await Promise.all([
    validateContractForActivation({
      repository,
      workdir,
      contract,
      mode: "collect",
      diagnostics,
    }),
    loadAuthoringActiveAuthority(repository, workdir, activeDiagnostics),
  ]);
  diagnostics.push(...activeDiagnostics);
  if (validation.workspace)
    try {
      const changedPaths =
        active?.workdir === workdir
          ? changedWorkspacePaths(
              active.initial_task_base.workspace_manifest,
              validation.workspace,
            )
          : await changedWorkspacePathsFromHead(repository, workdir);
      const contractFiles = Object.fromEntries(
        Object.entries(parsed.contract_files).map(([relative, hash]) => [
          repoRelative(repository, path.join(workdir, ...relative.split("/"))),
          hash,
        ]),
      );
      const checks = [
        ...validation.global_checks,
        ...validation.outcomes.flatMap((outcome) => outcome.acceptance.checks),
      ];
      const declaredVerificationInputs = [
        ...contract.global.acceptance.checks,
        ...contract.outcomes.flatMap((outcome) => outcome.acceptance.checks),
      ].flatMap((check) => check.verification_inputs);
      const firstLockManagedPaths =
        active?.workdir === workdir
          ? []
          : await firstLockManagedWorkspacePaths(repository, changedPaths);
      const classification = classifyWorkspaceScope(
        contract,
        changedPaths,
        protectedWorkspacePaths({
          contract_files: contractFiles,
          source_hashes: validation.source_hashes,
          context_hashes: validation.context_snapshot?.sha256,
          checks,
          additional_files: [
            ...contract.task.source_paths,
            ...declaredVerificationInputs,
            ...firstLockManagedPaths,
          ],
        }),
      );
      for (const error of workspaceScopeErrors(classification))
        addDiagnosticError(diagnostics, new Error(error));
    } catch (error) {
      addDiagnosticError(diagnostics, error);
    }
  const normalizedDiagnostics = normalizeAuthoringDiagnostics(diagnostics);
  const ready = !normalizedDiagnostics.some(
    (item) => item.level === "error" || item.level === "decision_required",
  );
  return {
    schema_version: "long-task-authoring-preflight-v1",
    status: ready ? "ready" : "not_ready",
    would_create_authority_lock: active === null,
    outcomes: contract.outcomes.map((outcome) => outcome.key),
    source_coverage: sourceCoverage(contract),
    claim_coverage: validation.claims?.summary ?? emptyClaimCoverage(),
    revision_preview: authoringRevisionPreview(
      contract,
      validation.source_hashes,
      validation.source_items,
      validation.context_snapshot,
      active,
    ),
    diagnostics: normalizedDiagnostics,
  };
}
