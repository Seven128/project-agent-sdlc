import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  captureContextGraphSnapshot,
  captureContextGraphSnapshotWithPhysicalFiles,
} from "./context-graph-snapshot.js";
import type {
  CompiledCheckV2,
  CompiledDeliveryContractV2,
  VerifierIdentityV2,
} from "./long-task-delivery-types.js";
import { canonicalValueJson, sha256Hex } from "./strict-codec.js";
import { captureVerifierIdentity } from "./long-task-verifier-identity.js";
import { verifierAuthorityDiff } from "./long-task-verifier-authority.js";
import { parseDeliveryContractBundle } from "./long-task-delivery-parser.js";
import { assertProtectedRepositoryFile } from "./repository-path-safety.js";
import { inspectDesignAuthorityClosure } from "./design-authority-closure.js";
import type { DesignAuthorityIdentityV1 } from "./design-authority-types.js";

export interface ProtectedAuthorityInputsSnapshotV1 {
  schema_version: "long-task-protected-authority-inputs-v1";
  raw_contract_sha256: string;
  contract_files: Record<string, string>;
  source_files: Record<string, string>;
  context: {
    mode: "referenced" | "full";
    topology_sha256: string;
    files: string[];
    file_sha256: Record<string, string>;
  };
  project_design_authority: DesignAuthorityIdentityV1 | null;
  runner_frozen_files: Record<string, Record<string, string>>;
  verification_inputs: Record<string, Record<string, string>>;
  verifier_identity: VerifierIdentityV2;
  external_public_keys: Record<
    string,
    {
      key_id: string;
      public_key_ref: string;
      sha256: string;
    }
  >;
}

export interface ProtectedAuthorityInputsIdentityV1 {
  identity: string;
  snapshot: ProtectedAuthorityInputsSnapshotV1;
}

export async function captureProtectedAuthorityInputsIdentity(
  compiled: CompiledDeliveryContractV2,
): Promise<ProtectedAuthorityInputsIdentityV1> {
  const repository = compiled.repository_root;
  const checks = allChecks(compiled);
  const fileHashCache = new Map<string, Promise<string>>();
  const hashRepositoryFile = (
    relativeInput: string,
    label: string,
    absoluteInput?: string,
  ): Promise<string> => {
    const relative = relativeInput.replace(/\\/gu, "/");
    const cacheKey = absoluteInput ?? relative;
    const existing = fileHashCache.get(cacheKey);
    if (existing) return existing;
    const captured = (async () => {
      const file = await assertProtectedRepositoryFile(
        repository,
        absoluteInput ?? path.join(repository, ...relative.split("/")),
        label,
      );
      return sha256Hex(await readFile(file));
    })();
    fileHashCache.set(cacheKey, captured);
    return captured;
  };
  const hashFiles = async (
    files: Iterable<string>,
    label: string,
    physicalFiles?: ReadonlyMap<string, string>,
  ): Promise<Record<string, string>> =>
    Object.fromEntries(
      await Promise.all(
        [...new Set(files)]
          .sort()
          .map(
            async (file) =>
              [
                file,
                await hashRepositoryFile(
                  file,
                  `${label}:${file}`,
                  requiredPhysicalFile(physicalFiles, file),
                ),
              ] as const,
          ),
      ),
    );

  const contextCapture = await captureContextGraphSnapshotWithPhysicalFiles(
    repository,
    compiled.task.context_refs,
    compiled.context_snapshot.mode,
  );
  const context = contextCapture.snapshot;
  const [
    contractFiles,
    sourceFiles,
    contextFiles,
    runnerFrozenFiles,
    verificationInputs,
    verifierIdentity,
    externalPublicKeys,
    projectDesignAuthority,
  ] = await Promise.all([
    hashFiles(Object.keys(compiled.contract_files), "protected_contract"),
    hashFiles(Object.keys(compiled.source_hashes), "protected_source"),
    hashFiles(
      context.files,
      "protected_context",
      contextCapture.physical_files,
    ),
    captureCheckFileIdentities(
      checks,
      (check) => check.runner.frozen_files,
      hashFiles,
      "protected_runner",
    ),
    captureCheckFileIdentities(
      checks,
      (check) => check.verification_input_hashes,
      hashFiles,
      "protected_verification_input",
    ),
    captureVerifierIdentity(
      repository,
      compiled.verifier_identity.hook_sha256 !== "not-required",
    ),
    captureExternalPublicKeyIdentities(compiled, hashRepositoryFile),
    captureCurrentProjectDesignAuthority(compiled),
  ]);
  const rawContractSha256 =
    contractFiles[compiled.contract_file] ??
    (await hashRepositoryFile(
      compiled.contract_file,
      "protected_raw_contract",
    ));
  const snapshot: ProtectedAuthorityInputsSnapshotV1 = {
    schema_version: "long-task-protected-authority-inputs-v1",
    raw_contract_sha256: rawContractSha256,
    contract_files: contractFiles,
    source_files: sourceFiles,
    context: {
      mode: context.mode,
      topology_sha256: context.topology_sha256,
      files: context.files,
      file_sha256: contextFiles,
    },
    project_design_authority: projectDesignAuthority,
    runner_frozen_files: runnerFrozenFiles,
    verification_inputs: verificationInputs,
    verifier_identity: verifierIdentity,
    external_public_keys: externalPublicKeys,
  };
  return {
    identity: sha256Hex(canonicalValueJson(snapshot)),
    snapshot,
  };
}

function requiredPhysicalFile(
  physicalFiles: ReadonlyMap<string, string> | undefined,
  file: string,
): string | undefined {
  if (!physicalFiles) return undefined;
  const physical = physicalFiles.get(file);
  if (!physical)
    throw new Error(`protected_context_physical_file_missing:${file}`);
  return physical;
}

export async function deliveryCompileFreshness(
  compiled: CompiledDeliveryContractV2,
): Promise<string[]> {
  const findings: string[] = [];
  if (compiled.project_design_authority)
    try {
      const current = await captureCurrentProjectDesignAuthority(compiled);
      if (
        canonicalValueJson(current) !==
        canonicalValueJson(compiled.project_design_authority)
      )
        findings.push("project_design_authority_changed_after_compile");
    } catch {
      findings.push("project_design_authority_changed_after_compile");
    }
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
  const checks = allChecks(compiled);
  for (const check of checks)
    for (const [file, hash] of Object.entries(check.runner.frozen_files))
      await compareFile(
        path.join(compiled.repository_root, file),
        hash,
        `runner_changed_after_compile:${check.internal_id}:${file}`,
        findings,
      );
  for (const check of checks)
    for (const [file, hash] of Object.entries(check.verification_input_hashes))
      await compareFile(
        path.join(compiled.repository_root, file),
        hash,
        `verification_input_changed_after_compile:${check.internal_id}:${file}`,
        findings,
      );
  for (const [confirmationRef, assurance] of Object.entries(
    compiled.external_confirmation_identity_assurances,
  ))
    if (assurance.scheme === "ed25519")
      await compareFile(
        path.join(compiled.repository_root, assurance.public_key_ref),
        assurance.public_key_sha256,
        `external_public_key_changed_after_compile:${confirmationRef}:${assurance.public_key_ref}`,
        findings,
      );
  return [...new Set(findings)].sort();
}

async function captureCurrentProjectDesignAuthority(
  compiled: CompiledDeliveryContractV2,
): Promise<DesignAuthorityIdentityV1 | null> {
  if (!compiled.project_design_authority) return null;
  const inspection = await inspectDesignAuthorityClosure(
    compiled.repository_root,
  );
  if (inspection.status !== "valid" || !inspection.identity)
    throw new Error("project_design_authority_invalid");
  return inspection.identity;
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

function allChecks(compiled: CompiledDeliveryContractV2): CompiledCheckV2[] {
  return [
    ...compiled.global.acceptance.checks,
    ...compiled.outcomes.flatMap((outcome) => outcome.acceptance.checks),
  ];
}

async function captureCheckFileIdentities(
  checks: readonly CompiledCheckV2[],
  select: (check: CompiledCheckV2) => Record<string, string>,
  hashFiles: (
    files: Iterable<string>,
    label: string,
  ) => Promise<Record<string, string>>,
  label: string,
): Promise<Record<string, Record<string, string>>> {
  const rows = await Promise.all(
    checks.map(
      async (check) =>
        [
          check.internal_id,
          await hashFiles(
            Object.keys(select(check)),
            `${label}:${check.internal_id}`,
          ),
        ] as const,
    ),
  );
  if (new Set(rows.map(([checkRef]) => checkRef)).size !== rows.length)
    throw new Error("protected_authority_check_identity_duplicated");
  return Object.fromEntries(
    rows.sort(([left], [right]) => left.localeCompare(right)),
  );
}

async function captureExternalPublicKeyIdentities(
  compiled: CompiledDeliveryContractV2,
  hashRepositoryFile: (relative: string, label: string) => Promise<string>,
): Promise<ProtectedAuthorityInputsSnapshotV1["external_public_keys"]> {
  const rows = await Promise.all(
    Object.entries(compiled.external_confirmation_identity_assurances)
      .filter(([, assurance]) => assurance.scheme === "ed25519")
      .sort(([left], [right]) => left.localeCompare(right))
      .map(async ([confirmationRef, assurance]) => {
        if (assurance.scheme !== "ed25519")
          throw new Error("protected_external_public_key_scheme_invalid");
        return [
          confirmationRef,
          {
            key_id: assurance.key_id,
            public_key_ref: assurance.public_key_ref,
            sha256: await hashRepositoryFile(
              assurance.public_key_ref,
              `protected_external_public_key:${confirmationRef}`,
            ),
          },
        ] as const;
      }),
  );
  return Object.fromEntries(rows);
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
