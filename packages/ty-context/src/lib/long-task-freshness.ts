import { readFile } from "node:fs/promises";
import path from "node:path";
import { captureContextGraphSnapshot } from "./context-graph-snapshot.js";
import type {
  CompiledDeliveryContractV2,
  VerifierIdentityV2,
} from "./long-task-delivery-types.js";
import { canonicalValueJson, sha256Hex } from "./strict-codec.js";
import { captureVerifierIdentity } from "./long-task-verifier-identity.js";
import { verifierAuthorityDiff } from "./long-task-verifier-authority.js";
import { parseDeliveryContractBundle } from "./long-task-delivery-parser.js";

export async function deliveryCompileFreshness(
  compiled: CompiledDeliveryContractV2,
): Promise<string[]> {
  const findings: string[] = [];
  try {
    const currentContract = await parseDeliveryContractBundle(
      compiled.workdir,
      compiled.repository_root,
      { validate_structure: false },
    );
    if (
      sha256Hex(canonicalValueJson(currentContract.contract)) !==
      compiled.contract_sha256
    )
      findings.push(`contract_changed_after_compile:${compiled.contract_file}`);
  } catch {
    findings.push(`contract_changed_after_compile:${compiled.contract_file}`);
  }
  for (const [file, hash] of Object.entries(compiled.contract_files))
    await compareFile(
      path.join(compiled.repository_root, file),
      hash,
      `contract_changed_after_compile:${file}`,
      findings,
    );
  for (const [file, hash] of Object.entries(compiled.source_hashes))
    await compareFile(
      path.join(compiled.repository_root, file),
      hash,
      `source_changed_after_compile:${file}`,
      findings,
    );
  try {
    const current = await captureContextGraphSnapshot(
      compiled.repository_root,
      compiled.task.context_refs,
      compiled.context_snapshot.mode,
    );
    if (current.topology_sha256 !== compiled.context_snapshot.topology_sha256)
      findings.push("context_changed_after_compile:topology");
    if (
      canonicalValueJson(current.files) !==
      canonicalValueJson(compiled.context_snapshot.files)
    )
      findings.push("context_changed_after_compile:file_set");
    for (const [file, hash] of Object.entries(compiled.context_snapshot.sha256))
      if (current.sha256[file] !== hash)
        findings.push(`context_changed_after_compile:${file}`);
  } catch (error) {
    findings.push(`context_changed_after_compile:${message(error)}`);
  }
  try {
    const currentVerifier = await captureVerifierIdentity(
      compiled.repository_root,
      compiled.verifier_identity.hook_sha256 !== "not-required",
    );
    const verifierDiff = verifierAuthorityDiff(
      compiled.verifier_identity,
      currentVerifier,
    );
    if (verifierDiff.verifier_content_changed)
      findings.push("verifier_changed_after_compile:bundle");
    if (verifierDiff.verifier_runtime_locator_changed)
      findings.push("verifier_changed_after_compile:runtime_locator");
  } catch {
    findings.push("verifier_changed_after_compile:bundle");
  }
  const checks = [
    ...compiled.global.acceptance.checks,
    ...compiled.outcomes.flatMap((outcome) => outcome.acceptance.checks),
  ];
  for (const check of checks)
    for (const [file, hash] of Object.entries(check.runner.frozen_files))
      await compareFile(
        path.join(compiled.repository_root, file),
        hash,
        `runner_changed_after_compile:${check.internal_id}:${file}`,
        findings,
      );
  return [...new Set(findings)].sort();
}

export async function assertVerifierAuthorityCurrent(
  repositoryRoot: string,
  expected: VerifierIdentityV2,
): Promise<void> {
  let current: VerifierIdentityV2;
  try {
    current = await captureVerifierIdentity(
      repositoryRoot,
      expected.hook_sha256 !== "not-required",
    );
  } catch {
    throw new Error("verifier_authority_migration_required");
  }
  const diff = verifierAuthorityDiff(expected, current);
  if (diff.verifier_content_changed || diff.verifier_runtime_locator_changed)
    throw new Error("verifier_authority_migration_required");
}

async function compareFile(
  file: string,
  expected: string,
  finding: string,
  findings: string[],
): Promise<void> {
  try {
    if (sha256Hex(await readFile(file)) !== expected) findings.push(finding);
  } catch {
    findings.push(finding);
  }
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
