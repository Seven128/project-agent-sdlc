import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import type {
  CompiledCheckV2,
  CompiledDesignTargetV2,
  DeliveryCheckV2,
  DeliveryBindingV2,
  ExecutionTargetV2,
  FrozenRunnerV2,
  SemanticFactExpectationV2,
  SourceBackedExecutionTargetV2,
  WorkspaceManifestV2,
} from "./long-task-delivery-types.js";
import { computeRawExecutionIdentity } from "./long-task-check-execution-policy.js";
import {
  assertRepositoryPattern,
  classifyRepositoryPatternOverlap,
  matchesRepoPattern,
  normalizeRepositoryFile,
} from "./long-task-paths.js";
import { assertProtectedRepositoryFile } from "./long-task-protected-files.js";
import {
  nearestRunnerFile,
  npmCliPath,
  npxCliPath,
} from "./long-task-runner-files.js";
import { canonicalValueJson, sha256Hex } from "./strict-codec.js";
import {
  repoRelative,
  resolveInsideRepository,
} from "./long-task-workspace.js";
import { evidenceAdapterForRunner } from "./long-task-evidence-adapter-policy.js";
import {
  freezeLocalVerifierDependencyClosure,
  packageScriptVerifierRoots,
} from "./long-task-verifier-dependency-closure.js";
import { compileObservationAuthorityPlan } from "./long-task-observation-authority.js";
import { compileProcessRuntimeClosure } from "./long-task-process-runtime-closure.js";

export async function freezeDeliveryCheck(
  check: DeliveryCheckV2,
  outcomeKey: string | null,
  repository: string,
  baseline: WorkspaceManifestV2,
  executionTarget: ExecutionTargetV2,
  knownExecutionTargets: ExecutionTargetV2[],
  designConformanceTargets: CompiledDesignTargetV2[],
  semanticFactExpectations: SemanticFactExpectationV2[],
  productionBindings: DeliveryBindingV2[],
  productionOwnerPaths: string[],
  sourceBackedExecutionTarget: SourceBackedExecutionTargetV2 | null,
  protectedAuthorityPaths: readonly string[] = [],
): Promise<CompiledCheckV2> {
  const prefix = outcomeKey ? `CHECK.${outcomeKey}` : "CHECK.GLOBAL";
  const expectedOutputs = check.expected_output_paths.map((pattern, index) =>
    assertRepositoryPattern(
      repository,
      pattern,
      `${check.key}.expected_output_paths[${index}]`,
    ),
  );
  const protectedAuthorityFiles = protectedAuthorityPaths.map((file, index) =>
    normalizeRepositoryFile(
      file,
      `${check.key}.protected_authority_paths[${index}]`,
    ),
  );
  for (const [index, pattern] of check.input_paths.entries()) {
    const normalized = assertRepositoryPattern(
      repository,
      pattern,
      `${check.key}.input_paths[${index}]`,
    );
    if (
      !baseline.files.some((file) =>
        matchesRepoPattern(file.path, normalized),
      ) &&
      !protectedAuthorityFiles.some((file) =>
        matchesRepoPattern(file, normalized),
      ) &&
      !expectedOutputs.some(
        (output) =>
          classifyRepositoryPatternOverlap(output, normalized).status ===
          "proven_overlap",
      )
    )
      throw new Error(`input_path_not_found:${check.key}:${pattern}`);
  }
  check.artifact_globs.forEach((pattern, index) =>
    assertRepositoryPattern(
      repository,
      pattern,
      `${check.key}.artifact_globs[${index}]`,
    ),
  );
  const cwd = resolveInsideRepository(
    repository,
    check.runner.cwd,
    `${check.key}.cwd`,
  );
  if (!(await stat(cwd).catch(() => null))?.isDirectory())
    throw new Error(`runner_cwd_not_found:${check.key}:${check.runner.cwd}`);
  const target = await resolvedRunnerTarget(check, repository, cwd);
  const verificationInputHashes = await freezeVerificationInputs(
    check,
    repository,
    baseline,
    cwd,
    target,
    executionTarget,
  );
  validateSemanticFactOracleInputs(
    check.key,
    semanticFactExpectations,
    verificationInputHashes,
  );
  const runner = await freezeRunner(
    check,
    repository,
    cwd,
    target,
    verificationInputHashes,
  );
  const observationAuthorities = compileObservationAuthorityPlan({
    check,
    outcome_key: outcomeKey,
    runner,
    execution_target: executionTarget,
    design_targets: designConformanceTargets,
    semantic_fact_expectations: semanticFactExpectations,
    production_bindings: productionBindings,
    production_owner_paths: productionOwnerPaths,
    source_backed_execution_target: sourceBackedExecutionTarget,
    workspace_manifest: baseline,
    protected_authority_paths: protectedAuthorityPaths,
  });
  const processRuntimeClosure = compileProcessRuntimeClosure({
    check,
    runner,
    execution_target: executionTarget,
    observation_authorities: observationAuthorities,
    production_bindings: productionBindings,
    production_owner_paths: productionOwnerPaths,
    source_backed_execution_target: sourceBackedExecutionTarget,
    workspace_manifest: baseline,
    protected_authority_paths: protectedAuthorityPaths,
  });
  const compiled = {
    ...check,
    internal_id: `${prefix}.${check.key}`,
    outcome_key: outcomeKey,
    evidence_adapter: evidenceAdapterForRunner(check.runner.type),
    runner,
    verification_input_hashes: verificationInputHashes,
    execution_target_definition: executionTarget,
    known_execution_targets: knownExecutionTargets,
    design_conformance_targets: designConformanceTargets,
    semantic_fact_expectations: semanticFactExpectations,
    observation_authorities: observationAuthorities,
    process_runtime_closure: processRuntimeClosure,
  };
  return {
    ...compiled,
    raw_execution_identity: computeRawExecutionIdentity(compiled),
  };
}

function validateSemanticFactOracleInputs(
  checkKey: string,
  expectations: SemanticFactExpectationV2[],
  verificationInputHashes: Record<string, string>,
): void {
  const frozenOracles = new Map(
    expectations
      .filter((expectation) => expectation.oracle.trust === "frozen_executable")
      .map((expectation) => [expectation.oracle.key, expectation.oracle]),
  );
  for (const oracle of frozenOracles.values()) {
    const frozenSha256 = verificationInputHashes[oracle.identity];
    if (!frozenSha256)
      throw new Error(
        `semantic_fact_oracle_verification_input_missing:${checkKey}:${oracle.key}:${oracle.identity}`,
      );
    if (frozenSha256 !== oracle.sha256)
      throw new Error(
        `semantic_fact_oracle_verification_input_mismatch:${checkKey}:${oracle.key}:${oracle.identity}`,
      );
  }
}

async function resolvedRunnerTarget(
  check: DeliveryCheckV2,
  repository: string,
  cwd: string,
): Promise<string> {
  if (check.runner.type === "package_script") {
    const packageFile = await nearestRunnerFile(
      cwd,
      repository,
      "package.json",
    );
    if (!packageFile)
      throw new Error(
        `package_json_not_found:${check.key}:${check.runner.cwd}`,
      );
    return assertProtectedRepositoryFile(
      repository,
      packageFile,
      `${check.key}.package_json`,
    );
  }
  const target = resolveInsideRepository(
    cwd,
    check.runner.target,
    `${check.key}.target`,
  );
  if (!(await stat(target).catch(() => null))?.isFile())
    throw new Error(
      `${check.runner.type}_path_not_found:${check.key}:${check.runner.target}`,
    );
  const protectedTarget = await assertProtectedRepositoryFile(
    repository,
    target,
    `${check.key}.runner_target`,
  );
  repoRelative(repository, protectedTarget);
  return protectedTarget;
}

async function freezeRunner(
  check: DeliveryCheckV2,
  repository: string,
  cwd: string,
  target: string,
  verificationInputHashes: Record<string, string>,
): Promise<FrozenRunnerV2> {
  const runner = check.runner;
  if (runner.argv.some((value) => value.includes("\0")))
    throw new Error(`runner_argument_invalid:${check.key}`);
  const resolvedCwd = repoRelative(repository, cwd);
  const resolvedTarget = repoRelative(repository, target);
  const frozenFiles = { ...verificationInputHashes };
  let executable: string;
  let prefix: string[];
  let packageScript: string | null = null;
  if (runner.type === "package_script") {
    const packageJson = JSON.parse(await readFile(target, "utf8")) as {
      scripts?: Record<string, unknown>;
    };
    const script = packageJson.scripts?.[runner.target];
    if (typeof script !== "string" || !script.trim())
      throw new Error(`package_script_not_found:${check.key}:${runner.target}`);
    packageScript = script;
    executable = process.execPath;
    prefix = [await npmCliPath(), "run", runner.target, "--"];
  } else {
    const relativeFromCwd = path.relative(cwd, target).replace(/\\/gu, "/");
    if (runner.type === "node_oracle") {
      executable = process.execPath;
      prefix = [relativeFromCwd];
    } else if (runner.type === "playwright_test") {
      executable = process.execPath;
      prefix = [
        await npxCliPath(),
        "--no-install",
        "playwright",
        "test",
        relativeFromCwd,
        "--reporter=json",
      ];
    } else {
      executable = resolvedTarget;
      prefix = [];
    }
  }
  const definition = sha256Hex(
    canonicalValueJson({
      runner,
      resolved_cwd: resolvedCwd,
      resolved_target: resolvedTarget,
      package_script: packageScript,
    }),
  );
  return {
    ...runner,
    executable,
    executable_argv_prefix: prefix,
    resolved_cwd: resolvedCwd,
    resolved_target: resolvedTarget,
    definition_sha256: definition,
    frozen_files: sortRecord(frozenFiles),
    package_script: packageScript,
    execution_identity: sha256Hex(
      canonicalValueJson({
        runner,
        executable,
        prefix,
        resolved_cwd: resolvedCwd,
        resolved_target: resolvedTarget,
        package_script: packageScript,
        frozen_files: frozenFiles,
      }),
    ),
  };
}

async function freezeVerificationInputs(
  check: DeliveryCheckV2,
  repository: string,
  manifest: WorkspaceManifestV2,
  cwd: string,
  target: string,
  executionTarget: ExecutionTargetV2,
): Promise<Record<string, string>> {
  const result: Record<string, string> = {};
  for (const [index, source] of check.verification_inputs.entries()) {
    const pattern = assertRepositoryPattern(
      repository,
      source,
      `${check.key}.verification_inputs[${index}]`,
    );
    const matches = manifest.files.filter((file) =>
      matchesRepoPattern(file.path, pattern),
    );
    if (!matches.length)
      throw new Error(`verification_input_not_found:${check.key}:${source}`);
    for (const file of matches) {
      const protectedFile = await assertProtectedRepositoryFile(
        repository,
        path.join(repository, ...file.path.split("/")),
        `${check.key}.verification_input`,
      );
      result[file.path] = sha256Hex(await readFile(protectedFile));
    }
  }
  const directProductRoot =
    check.runner.type === "project_binary" &&
    executionTarget.role === "product" &&
    executionTarget.runtime_family === "process" &&
    check.execution_target.entrypoint === "root";
  const automatic = new Set<string>(
    directProductRoot ? [] : [repoRelative(repository, target)],
  );
  if (!directProductRoot) {
    const packageFile = await nearestRunnerFile(
      cwd,
      repository,
      "package.json",
    );
    if (packageFile) automatic.add(repoRelative(repository, packageFile));
    for (const name of [
      "package-lock.json",
      "npm-shrinkwrap.json",
      "pnpm-lock.yaml",
      "yarn.lock",
    ]) {
      const file = await nearestRunnerFile(cwd, repository, name);
      if (file) automatic.add(repoRelative(repository, file));
    }
  }
  if (check.runner.type === "playwright_test")
    if (playwrightConfigArgument(check.runner.argv)) {
      const file = resolveInsideRepository(
        cwd,
        playwrightConfigArgument(check.runner.argv)!,
        `${check.key}.playwright_config`,
      );
      automatic.add(repoRelative(repository, file));
    } else
      for (const name of [
        "playwright.config.ts",
        "playwright.config.js",
        "playwright.config.mjs",
        "playwright.config.cjs",
      ]) {
        const file = await nearestRunnerFile(cwd, repository, name);
        if (file) automatic.add(repoRelative(repository, file));
      }
  for (const relative of automatic) {
    const file = manifest.files.find(
      (candidate) => candidate.path === relative,
    );
    if (!file)
      throw new Error(`verification_input_not_found:${check.key}:${relative}`);
    const protectedFile = await assertProtectedRepositoryFile(
      repository,
      path.join(repository, ...relative.split("/")),
      `${check.key}.automatic_verification_input`,
    );
    result[relative] = sha256Hex(await readFile(protectedFile));
  }
  if (check.runner.type === "package_script") {
    const packageJson = JSON.parse(await readFile(target, "utf8")) as {
      scripts?: Record<string, unknown>;
    };
    const script = packageJson.scripts?.[check.runner.target];
    if (typeof script !== "string" || !script.trim())
      throw new Error(
        `package_script_not_found:${check.key}:${check.runner.target}`,
      );
    for (const relative of packageScriptVerifierRoots(
      script,
      repoRelative(repository, target),
      manifest,
    )) {
      const protectedFile = await assertProtectedRepositoryFile(
        repository,
        path.join(repository, ...relative.split("/")),
        `${check.key}.package_script_entry`,
      );
      result[relative] = sha256Hex(await readFile(protectedFile));
    }
  }
  Object.assign(
    result,
    await freezeLocalVerifierDependencyClosure(
      repository,
      Object.keys(result),
      manifest,
      [
        ...check.input_paths,
        ...check.expected_output_paths,
        ...check.artifact_globs,
      ],
    ),
  );
  return sortRecord(result);
}

export function playwrightConfigArgument(
  argv: readonly string[],
): string | null {
  const values: string[] = [];
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--config") {
      const next = argv[index + 1];
      if (!next || next.startsWith("-"))
        throw new Error("playwright_config_argument_missing");
      values.push(next);
      index += 1;
    } else if (value.startsWith("--config=")) {
      const config = value.slice("--config=".length);
      if (!config) throw new Error("playwright_config_argument_missing");
      values.push(config);
    }
  }
  if (values.length > 1)
    throw new Error("playwright_config_argument_ambiguous");
  return values[0] ?? null;
}

function sortRecord<T>(value: Record<string, T>): Record<string, T> {
  return Object.fromEntries(
    Object.entries(value).sort(([a], [b]) => a.localeCompare(b)),
  );
}
