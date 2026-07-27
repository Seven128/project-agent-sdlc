import { readFile, stat } from "node:fs/promises";
import {
  validateCounterfactualBindingClaims,
  validateGlobalCounterfactualBindingClaims,
} from "./long-task-counterfactual-claim-policy.js";
import type {
  CompiledCheckV2,
  CompiledDeliveryContractV2,
  CompiledOutcomeV2,
  CounterfactualMutationV2,
  DeliveryBindingV2,
  DeliveryContractV2,
  WorkspaceManifestV2,
} from "./long-task-delivery-types.js";
import {
  assertRepositoryPattern,
  matchesRepoPattern,
  proveRepositoryPatternSubset,
  repositoryPatternsMayOverlap,
} from "./long-task-paths.js";
import { assertProtectedRepositoryFile } from "./long-task-protected-files.js";
import { sha256Hex } from "./strict-codec.js";
import {
  repoRelative,
  resolveInsideRepository,
} from "./long-task-workspace.js";
import { mutateSemanticText } from "./long-task-semantic-mutation.js";

export function validateVerificationInputSeparation(
  contract: DeliveryContractV2,
  checks: CompiledDeliveryContractV2["outcomes"][number]["acceptance"]["checks"],
  workdirRelative: string,
): void {
  const implementation = contract.outcomes.flatMap((outcome) => [
    ...outcome.technical.expected_change_paths,
    ...outcome.technical.allowed_support_paths,
  ]);
  for (const check of checks)
    for (const source of Object.keys(check.verification_input_hashes)) {
      if (
        implementation.some((pattern) =>
          repositoryPatternsMayOverlap(pattern, source),
        )
      )
        throw new Error(
          `verification_input_overlaps_implementation:${check.key}:${source}`,
        );
      if (
        source === workdirRelative ||
        source.startsWith(`${workdirRelative}/`) ||
        source === ".git" ||
        source.startsWith(".git/") ||
        source.split("/").includes("node_modules") ||
        check.artifact_globs.some((artifact) =>
          repositoryPatternsMayOverlap(artifact, source),
        )
      )
        throw new Error(`verification_input_protected:${check.key}:${source}`);
    }
}

export function validateTechnicalPaths(
  contract: DeliveryContractV2,
  repository: string,
  workdirRelative: string,
  baseline: WorkspaceManifestV2,
): void {
  const forbidden = [
    ...contract.global.technical.forbidden_paths.map((entry) => entry.path),
    ...contract.outcomes.flatMap(
      (outcome) => outcome.technical.forbidden_paths,
    ),
  ].map((pattern, index) =>
    assertRepositoryPattern(repository, pattern, `forbidden_paths[${index}]`),
  );
  for (const outcome of contract.outcomes) {
    const allowed = [
      ...outcome.technical.expected_change_paths,
      ...outcome.technical.allowed_support_paths,
    ].map((pattern, index) =>
      assertRepositoryPattern(
        repository,
        pattern,
        `${outcome.key}.allowed_paths[${index}]`,
      ),
    );
    for (const pattern of allowed) {
      if (repositoryPatternsMayOverlap(pattern, workdirRelative))
        throw new Error(`protected_path_declared:long_task_workdir:${pattern}`);
      if (
        forbidden.some((blocked) =>
          repositoryPatternsMayOverlap(pattern, blocked),
        )
      )
        throw new Error(`allowed_forbidden_path_overlap:${pattern}`);
    }
    for (const binding of outcome.technical.bindings) {
      const carriers = binding.carrier_paths.map((carrier) =>
        assertRepositoryPattern(
          repository,
          carrier,
          `${outcome.key}.${binding.key}.carrier_path`,
        ),
      );
      for (const carrier of carriers) {
        if (
          binding.existence === "existing" &&
          !baseline.files.some((file) => matchesRepoPattern(file.path, carrier))
        )
          throw new Error(
            `binding_carrier_path_not_found:${outcome.key}:${carrier}`,
          );
        if (
          !allowed.some(
            (pattern) =>
              proveRepositoryPatternSubset(carrier, pattern).status ===
              "proven_subset",
          )
        )
          throw new Error(
            `binding_carrier_outside_change_paths:${outcome.key}:${carrier}`,
          );
      }
      if (binding.kind === "file") {
        const target = assertRepositoryPattern(
          repository,
          binding.target,
          `${outcome.key}.${binding.key}.target`,
        );
        if (!carriers.some((carrier) => matchesRepoPattern(target, carrier)))
          throw new Error(
            `binding_target_outside_carrier:${outcome.key}:${binding.key}`,
          );
      }
      if (binding.kind === "path_glob") {
        const target = assertRepositoryPattern(
          repository,
          binding.target,
          `${outcome.key}.${binding.key}.target`,
        );
        if (
          binding.existence === "existing" &&
          !baseline.files.some((file) => matchesRepoPattern(file.path, target))
        )
          throw new Error(
            `binding_target_not_found:${outcome.key}:${binding.key}`,
          );
      }
    }
  }
}

export async function validateCounterfactualPaths(
  contract: DeliveryContractV2,
  compiledGlobalChecks: CompiledCheckV2[],
  compiledOutcomes: CompiledOutcomeV2[],
  repository: string,
  workdirRelative: string,
  protectedAuthorityPaths: string[],
): Promise<void> {
  const allChecks = [
    ...compiledGlobalChecks,
    ...compiledOutcomes.flatMap((outcome) => outcome.acceptance.checks),
  ];
  const protectedInputs = new Set([
    ...contract.task.source_paths,
    ...protectedAuthorityPaths,
    ...allChecks.flatMap((check) => [
      ...Object.keys(check.verification_input_hashes),
      check.runner.resolved_target,
    ]),
  ]);
  for (const outcome of contract.outcomes) {
    const compiled = compiledOutcomes.find((item) => item.key === outcome.key)!;
    for (const control of outcome.acceptance.counterfactual_controls) {
      const binding = outcome.technical.bindings.find(
        (item) => item.key === control.binding_key,
      );
      if (!binding)
        throw new Error(
          `counterfactual_binding_unknown:${outcome.key}:${control.key}:${control.binding_key}`,
        );
      validateCounterfactualBindingClaims(outcome, control, binding);
      const check = compiled.acceptance.checks.find(
        (item) => item.key === control.check_key,
      )!;
      await validateScopeCounterfactualPaths({
        scope: outcome.key,
        controlKey: control.key,
        mutation: control.mutation,
        binding,
        check,
        repository,
        workdirRelative,
        protectedInputs,
      });
    }
  }
  for (const control of contract.global.acceptance.counterfactual_controls) {
    const { outcome, binding } = validateGlobalCounterfactualBindingClaims(
      contract,
      control,
    );
    const check = compiledGlobalChecks.find(
      (item) => item.key === control.check_key,
    )!;
    await validateScopeCounterfactualPaths({
      scope: "GLOBAL",
      controlKey: control.key,
      mutation: control.mutation,
      binding,
      check,
      repository,
      workdirRelative,
      protectedInputs,
      bindingRef: `${outcome.key}.${binding.key}`,
    });
  }
}

async function validateScopeCounterfactualPaths(options: {
  scope: string;
  controlKey: string;
  mutation: CounterfactualMutationV2;
  binding: DeliveryBindingV2;
  check: CompiledCheckV2;
  repository: string;
  workdirRelative: string;
  protectedInputs: Set<string>;
  bindingRef?: string;
}): Promise<void> {
  const mutated =
    options.mutation.type === "remove_paths"
      ? options.mutation.paths
      : [options.mutation.path];
  for (const relative of mutated) {
    const target = resolveInsideRepository(
      options.repository,
      relative,
      `${options.scope}.counterfactual`,
    );
    const normalized = repoRelative(options.repository, target);
    if (options.protectedInputs.has(normalized))
      throw new Error(
        `counterfactual_verification_input_protected:${options.scope}:${relative}`,
      );
    if (
      normalized === options.workdirRelative ||
      normalized.startsWith(`${options.workdirRelative}/`) ||
      normalized === ".git" ||
      normalized.startsWith(".git/") ||
      normalized.split("/").includes("node_modules")
    )
      throw new Error(
        `counterfactual_path_protected:${options.scope}:${relative}`,
      );
    if (
      !options.binding.carrier_paths.some(
        (pattern) =>
          proveRepositoryPatternSubset(normalized, pattern).status ===
          "proven_subset",
      )
    )
      throw new Error(
        `counterfactual_path_outside_binding:${options.scope}:${options.controlKey}:${relative}`,
      );
    if (
      options.binding.existence === "existing" &&
      !(await stat(target).catch(() => null))
    )
      throw new Error(
        `counterfactual_path_not_found:${options.scope}:${relative}`,
      );
  }
  if (
    options.mutation.type === "replace_json_value" ||
    options.mutation.type === "replace_text"
  ) {
    const replacementTarget = resolveInsideRepository(
      options.repository,
      options.mutation.path,
      `${options.scope}.counterfactual.path`,
    );
    if (!(await stat(replacementTarget).catch(() => null))) return;
    try {
      mutateSemanticText(
        await readFile(replacementTarget, "utf8"),
        options.mutation,
        false,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(
        `counterfactual_semantic_mutation_invalid:${options.scope}:${options.controlKey}:${message}`,
      );
    }
    return;
  }
  if (options.mutation.type !== "replace_file") return;
  const fixtureTarget = resolveInsideRepository(
    options.repository,
    options.mutation.fixture_path,
    `${options.scope}.counterfactual.fixture`,
  );
  const fixture = repoRelative(
    options.repository,
    await assertProtectedRepositoryFile(
      options.repository,
      fixtureTarget,
      `${options.scope}.counterfactual.fixture`,
    ),
  );
  if (!Object.hasOwn(options.check.verification_input_hashes, fixture))
    throw new Error(
      `counterfactual_fixture_must_be_verification_input:${options.scope}:${fixture}`,
    );
  const replacementTarget = resolveInsideRepository(
    options.repository,
    options.mutation.path,
    `${options.scope}.counterfactual.path`,
  );
  if (await stat(replacementTarget).catch(() => null)) {
    const [fixtureBytes, targetBytes] = await Promise.all([
      readFile(fixtureTarget),
      readFile(replacementTarget),
    ]);
    if (fixtureBytes.equals(targetBytes))
      throw new Error(
        `counterfactual_replacement_must_change_carrier:${options.scope}:${options.controlKey}`,
      );
  }
}

export async function hashDeclaredFiles(
  repository: string,
  files: string[],
  label: string,
): Promise<Record<string, string>> {
  const result: Record<string, string> = {};
  for (const [index, file] of files.entries()) {
    const target = resolveInsideRepository(
      repository,
      file,
      `${label}[${index}]`,
    );
    const protectedTarget = await assertProtectedRepositoryFile(
      repository,
      target,
      `${label}[${index}]`,
    );
    result[repoRelative(repository, protectedTarget)] = sha256Hex(
      await readFile(protectedTarget),
    );
  }
  return Object.fromEntries(
    Object.entries(result).sort(([a], [b]) => a.localeCompare(b)),
  );
}
