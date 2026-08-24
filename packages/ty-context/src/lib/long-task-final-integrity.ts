import { readFile } from "node:fs/promises";
import path from "node:path";
import { compileDeliveryContract } from "./long-task-delivery-compiler.js";
import type {
  CompiledDeliveryContractV2,
  LongTaskFindingV2,
} from "./long-task-delivery-types.js";
import { captureStoredExternalConfirmationRecordIdentities } from "./long-task-external-confirmation-state.js";
import { assertProtectedRepositoryFile } from "./long-task-protected-files.js";
import {
  activeAuthorityIdentityMatches,
  assertMatchingActiveBinding,
  loadActiveLongTaskAuthority,
  type ActiveAuthorityIdentityExpectation,
  type ActiveLongTaskAuthorityV3,
} from "./long-task-state.js";
import {
  captureWorkspaceFingerprint,
  currentGitState,
} from "./long-task-workspace.js";
import { sha256Hex } from "./strict-codec.js";

export interface FinalGateProtectedInputIdentity {
  compiled_identity: string;
  raw_contract_sha256: string;
  external_confirmation_records: Record<string, string>;
}

export async function captureFinalGateProtectedInputIdentity(
  repository: string,
  compiled: CompiledDeliveryContractV2,
): Promise<FinalGateProtectedInputIdentity> {
  const file = await assertProtectedRepositoryFile(
    repository,
    path.join(repository, ...compiled.contract_file.split("/")),
    "final_gate_delivery_contract",
  );
  return {
    compiled_identity: compiled.compiled_identity,
    raw_contract_sha256: sha256Hex(await readFile(file)),
    external_confirmation_records:
      await captureStoredExternalConfirmationRecordIdentities(
        repository,
        compiled.workdir,
        compiled.global.acceptance.external_confirmations.map((row) => row.key),
      ),
  };
}

export async function finalGateIntegrityFindings(input: {
  repository: string;
  active: ActiveLongTaskAuthorityV3;
  accepted_authority: ActiveAuthorityIdentityExpectation;
  candidate: Awaited<ReturnType<typeof currentGitState>>;
  workspace_identity_before: string;
  protected_inputs_before: FinalGateProtectedInputIdentity;
}): Promise<LongTaskFindingV2[]> {
  const findings: LongTaskFindingV2[] = [];
  const [after, gitAfter, authorityChanged, protectedFindings] =
    await Promise.all([
      captureWorkspaceFingerprint(input.repository),
      currentGitState(input.repository),
      activeAuthorityChanged(input),
      protectedInputFindings(input),
    ]);
  if (
    after.identity !== input.workspace_identity_before ||
    gitAfter.head !== input.candidate.head ||
    gitAfter.tree !== input.candidate.tree ||
    gitAfter.dirty.length
  )
    findings.push(workspaceChangedFinding());
  if (authorityChanged) findings.push(activeAuthorityChangedFinding());
  findings.push(...protectedFindings);
  return findings;
}

async function activeAuthorityChanged(
  input: Parameters<typeof finalGateIntegrityFindings>[0],
): Promise<boolean> {
  try {
    const currentActive = (await loadActiveLongTaskAuthority(input.repository))
      .authority;
    return (
      !currentActive ||
      !activeAuthorityIdentityMatches(currentActive, input.accepted_authority)
    );
  } catch {
    return true;
  }
}

async function protectedInputFindings(
  input: Parameters<typeof finalGateIntegrityFindings>[0],
): Promise<LongTaskFindingV2[]> {
  try {
    const refreshed = await compileDeliveryContract(
      input.active.workdir,
      input.repository,
      {
        live_gate: true,
        initial_task_base: input.active.initial_task_base,
        authority_revision: input.active.authority_revision,
        require_completion_gate: true,
      },
    );
    await assertMatchingActiveBinding(refreshed);
    const after = await captureFinalGateProtectedInputIdentity(
      input.repository,
      refreshed,
    );
    return after.compiled_identity !==
      input.protected_inputs_before.compiled_identity ||
      after.raw_contract_sha256 !==
        input.protected_inputs_before.raw_contract_sha256 ||
      JSON.stringify(after.external_confirmation_records) !==
        JSON.stringify(
          input.protected_inputs_before.external_confirmation_records,
        )
      ? [
          protectedInputsChangedFinding({
            before: input.protected_inputs_before,
            after,
          }),
        ]
      : [];
  } catch (error) {
    return [
      protectedInputsChangedFinding({
        before: input.protected_inputs_before,
        after_error: error instanceof Error ? error.message : String(error),
      }),
    ];
  }
}

function workspaceChangedFinding(): LongTaskFindingV2 {
  return {
    code: "workspace_changed_during_final_gate",
    outcome_key: null,
    check_key: null,
    message: "The workspace changed while Live Final Gate was running.",
    next_action:
      "Stop concurrent mutation and rerun the complete Live Final Gate.",
  };
}

function activeAuthorityChangedFinding(): LongTaskFindingV2 {
  return {
    code: "active_authority_changed_during_final_gate",
    outcome_key: null,
    check_key: null,
    message: "Active Authority changed while Live Final Gate was running.",
    next_action:
      "Review the new Authority Revision and rerun the complete Live Final Gate.",
  };
}

function protectedInputsChangedFinding(actual: unknown): LongTaskFindingV2 {
  return {
    code: "protected_inputs_changed_during_final_gate",
    outcome_key: null,
    check_key: null,
    message:
      "Protected Contract, Source, controlling Context, verifier/runner, verification-input, workdir input or External Confirmation record identity changed while Final Gate was running.",
    actual,
    next_action:
      "Stop concurrent protected-input mutation, review any required Authority Revision, and rerun the complete Final Gate.",
  };
}
