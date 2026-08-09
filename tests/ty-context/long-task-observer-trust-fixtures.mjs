import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { chmod, copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import {
  createDeliveryFixture,
  parseCliJson,
  refreshFixtureSemanticManifest,
  runCli,
  writeContract,
  writeFixtureSourceAndOracle,
} from "./long-task-delivery-fixtures.mjs";
import { fixtureSemanticManifest } from "./long-task-semantic-manifest-fixture.mjs";
import { loadSemanticFactManifest } from "../../packages/ty-context/dist/lib/semantic-fact-source-parser.js";

export const PACKAGE_EXACT_ORACLE_IDENTITY = "ty-context-json-pointer-exact";
export const PACKAGE_EXACT_ORACLE_VERSION = "1.0.0";
const execFileAsync = promisify(execFile);

export async function createObserverTrustFixture(options = {}) {
  return createDeliveryFixture(options);
}

export async function executeObserverTrustWorkflow(fixture) {
  await runCli(fixture.root, ["enable", "long-task"]);
  const compiled = await invoke(fixture.root, [
    "long-task",
    "compile",
    fixture.workdir,
  ]);
  if (!compiled.ok) return { stage: "compile", result: compiled.result };
  return executeObserverTrustFinalGate(fixture, null);
}

export async function executeObserverTrustAttackAfterAuthority(
  fixture,
  configureAttack,
) {
  await runCli(fixture.root, ["enable", "long-task"]);
  const baseline = await invoke(fixture.root, [
    "long-task",
    "compile",
    fixture.workdir,
  ]);
  if (!baseline.ok)
    throw new Error(
      `observer_fixture_valid_authority_compile_failed:${JSON.stringify(baseline.result)}`,
    );
  await configureAttack();
  const ownerCompile = await invoke(fixture.root, [
    "long-task",
    "compile",
    fixture.workdir,
    "--revise",
  ]);
  if (ownerCompile.ok)
    throw new Error("observer_fixture_attack_compile_unexpectedly_succeeded");
  return executeObserverTrustFinalGate(fixture, ownerCompile.result);
}

async function executeObserverTrustFinalGate(fixture, ownerCompileResult) {
  const command = "long-task final-gate";
  const workdirSha256 = sha256(path.resolve(fixture.workdir));
  const final = await invoke(fixture.root, [
    "long-task",
    "final-gate",
    fixture.workdir,
  ]);
  const [candidateHead, candidateTree, contractBytes] = await Promise.all([
    gitIdentity(fixture.root, ["rev-parse", "HEAD"]),
    gitIdentity(fixture.root, ["rev-parse", "HEAD^{tree}"]),
    readFile(path.join(fixture.workdir, "delivery-contract.yaml")),
  ]);
  const result =
    typeof final.result?.workflow_status === "string"
      ? final.result
      : { ...final.result, workflow_status: "final_gate_rejected" };
  return {
    stage: "final-gate",
    result,
    ok: final.ok,
    final_gate_proof: {
      invoked: true,
      command,
      workdir_sha256: workdirSha256,
      command_identity: sha256(
        JSON.stringify({ command, workdir_sha256: workdirSha256 }),
      ),
      candidate_head: candidateHead,
      candidate_tree: candidateTree,
      contract_sha256: sha256(contractBytes),
      candidate_identity: sha256(
        JSON.stringify({
          candidate_head: candidateHead,
          candidate_tree: candidateTree,
          contract_sha256: sha256(contractBytes),
        }),
      ),
      owner_compile_diagnostic:
        ownerCompileResult === null ? null : JSON.stringify(ownerCompileResult),
      final_gate_diagnostic: JSON.stringify(final.result),
    },
  };
}

export function isMachineAccepted(execution) {
  return (
    execution.stage === "final-gate" &&
    execution.result?.workflow_status === "machine_accepted"
  );
}

export function isSecurelyRejected(execution) {
  if (execution.stage === "final-gate") return !isMachineAccepted(execution);
  const diagnostic = JSON.stringify(execution.result ?? {});
  return /machine_observer_not_admitted|unsupported_observer_requires_external_confirmation|custom_oracle_machine_completion_forbidden|static_observation_not_in_pre_run_snapshot|static_observation_changed_by_runner|process_observer_direct_root_required|process_observer_root_invocation_required|process_observer_root_argv_mismatch|process_observation_input_changed_by_runner|legacy_target_runtime_non_authoritative|counterfactual_admitted_observation_required|counterfactual_runtime_reachability_unproven|project_submitted_verdict_disagrees_with_harness/u.test(
    diagnostic,
  );
}

export async function configureExpectedAsActualAttack(fixture) {
  const externalConfirmation = fixture.contract.source_claims.some(
    (claim) => claim.disposition.type === "external_confirmation",
  );
  const manifest = fixtureSemanticManifest({ externalConfirmation });
  refreshFixtureSemanticManifest(manifest);
  await writeFixtureSourceAndOracle(
    fixture.root,
    { externalConfirmation },
    manifest,
  );
  await writeContract(fixture.workdir, fixture.contract);
  const oraclePath = path.join(fixture.root, "tests", "oracle.mjs");
  const source = await readFile(oraclePath, "utf8");
  const replaced = source.replace(
    /const actualValueSha256 = createHash\("sha256"\)[\s\S]*?const comparisonPassed = state\[key\] === true;/u,
    `// R1: the project verifier copies Expected instead of observing Actual.\nconst actualValueSha256 = semantic[key].fact.expected.sha256;\nconst comparisonPassed = true;`,
  );
  if (replaced === source)
    throw new Error("observer_fixture_expected_digest_rewrite_missing");
  await writeFile(oraclePath, replaced);
}

export async function configureHistoricalRuntimeAttack(
  fixture,
  { removeHostAttestation = false } = {},
) {
  const sessionPath = path.join(fixture.root, "artifacts", "session.json");
  await writeFile(
    sessionPath,
    `${JSON.stringify({ session_id: "historical-session", cold_start: true })}\n`,
  );
  const check = fixture.contract.outcomes[0].acceptance.checks[0];
  check.verification_inputs.push("artifacts/session.json");
  if (removeHostAttestation) {
    check.runner.type = "node_oracle";
    check.runner.target = "tests/oracle.mjs";
    delete fixture.contract.task.execution_targets[0].root_argv;
  }
  await writeContract(fixture.workdir, fixture.contract);
  const oraclePath = path.join(fixture.root, "tests", "oracle.mjs");
  const source = await readFile(oraclePath, "utf8");
  const withSession = source
    .replace(
      "const targetRecord = (assertionKey) => ({",
      `// R3: a historical file is replayed as a supposedly fresh runtime.\nconst historicalSession = JSON.parse(await readFile(new URL("../artifacts/session.json", import.meta.url), "utf8"));\nconst targetRecord = (assertionKey) => ({`,
    )
    .replace(
      'session_id:"project-submitted-session"',
      "session_id:`${historicalSession.session_id}-replayed`",
    )
    .replace("cold_start: true", "cold_start: historicalSession.cold_start");
  if (withSession === source)
    throw new Error("observer_fixture_historical_session_rewrite_missing");
  if (!withSession.includes("historicalSession.session_id"))
    throw new Error(
      "observer_fixture_historical_session_identity_rewrite_missing",
    );
  const historicalPayload = removeHostAttestation
    ? withSession.replace(
        "console.log(JSON.stringify(productEnvelope));",
        'console.log(JSON.stringify({schema_version:"long-task-check-result-v3",execution_status:"completed",observations:{result:true,requirement_result:true,obligation_result:true,architecture_result:true,semantic_fact_result:true,relations_applicable:false,target_live:true},evidence_records:[...assertionKeys.map(targetRecord),targetRecord("first-liveness")]}));',
      )
    : withSession;
  await writeFile(oraclePath, historicalPayload);
}

export async function configurePackageObservationCase(
  fixture,
  {
    carrierPath,
    carrierExists = true,
    carrierInitialValue = true,
    runnerWritesCarrier = false,
    bindingPath = carrierPath,
    mutationPath = bindingPath,
    mutationPointer = null,
    runnerValueSourcePath = mutationPath,
    runnerValueSourcePointer = mutationPointer,
    inputPaths = [carrierPath],
    artifactGlobs = [carrierPath],
    proofSurface = "implementation_structure",
    directProcess = false,
    diagnosticArtifactPaths = [],
    submitProjectEvidenceCopies = false,
  },
) {
  const externalConfirmation = fixture.contract.source_claims.some(
    (claim) => claim.disposition.type === "external_confirmation",
  );
  const staticObservation = proofSurface === "implementation_structure";
  const effectiveMutationPointer =
    mutationPointer ??
    (staticObservation
      ? "/observations/assertion.first.first-static-check.first-architecture"
      : "/observations/fact.first.observable");
  const effectiveRunnerValueSourcePointer =
    runnerValueSourcePointer ?? effectiveMutationPointer;
  const manifest = fixtureSemanticManifest({ externalConfirmation });
  manifest.oracles[0] = {
    ...manifest.oracles[0],
    identity: PACKAGE_EXACT_ORACLE_IDENTITY,
    version: PACKAGE_EXACT_ORACLE_VERSION,
    sha256: null,
  };
  for (const proof of manifest.proof_obligations)
    proof.proof_surface = staticObservation ? "runtime_behavior" : proofSurface;
  refreshFixtureSemanticManifest(manifest);
  await writeFixtureSourceAndOracle(
    fixture.root,
    { externalConfirmation },
    manifest,
  );

  const outcome = fixture.contract.outcomes[0];
  if (!outcome.product.owner.path_globs.includes("tests/legacy-oracle.mjs"))
    outcome.product.owner.path_globs.push("tests/legacy-oracle.mjs");
  if (
    !outcome.technical.allowed_support_paths.includes("tests/legacy-oracle.mjs")
  )
    outcome.technical.allowed_support_paths.push("tests/legacy-oracle.mjs");
  const processCheck = outcome.acceptance.checks[0];
  for (const assertion of [
    ...processCheck.positive_assertions,
    ...processCheck.negative_assertions,
  ])
    assertion.evidence_capabilities = assertion.evidence_capabilities.filter(
      (capability) =>
        capability !== "state_delta" &&
        capability !== "interaction_trace" &&
        capability !== "design_conformance",
    );
  let observationCheck = processCheck;
  if (staticObservation) {
    const staticAssertionIndex = processCheck.positive_assertions.findIndex(
      (assertion) => assertion.key === "first-architecture",
    );
    if (staticAssertionIndex === -1)
      throw new Error("observer_fixture_static_assertion_missing");
    const [staticAssertion] = processCheck.positive_assertions.splice(
      staticAssertionIndex,
      1,
    );
    staticAssertion.evidence_capabilities = ["presence"];
    staticAssertion.operator = "equals";
    staticAssertion.expected = true;
    observationCheck = {
      ...structuredClone(processCheck),
      key: "first-static-check",
      proof_surface: "implementation_structure",
      runner: {
        type: "node_oracle",
        target: "tests/static-observer.mjs",
        argv: ["first"],
        cwd: ".",
        timeout_ms: 30000,
        effect: "read_only",
        retry_policy: "none",
        idempotent: true,
      },
      verification_inputs: ["tests/static-observer.mjs"],
      input_paths: [...new Set(inputPaths)],
      artifact_globs: [
        ...new Set([...artifactGlobs, ...diagnosticArtifactPaths]),
      ],
      expected_output_paths: [],
      positive_assertions: [staticAssertion],
      negative_assertions: [],
    };
    outcome.acceptance.checks = [observationCheck, processCheck];
    const architectureObligation = outcome.technical.obligations.find(
      (obligation) => obligation.key === "architecture-first",
    );
    if (!architectureObligation)
      throw new Error("observer_fixture_static_obligation_missing");
    architectureObligation.required_proof_surfaces = [
      "implementation_structure",
    ];
  }

  observationCheck.proof_surface = proofSurface;
  observationCheck.input_paths = staticObservation
    ? [...new Set(inputPaths)]
    : [...new Set(inputPaths)];
  observationCheck.artifact_globs = [
    ...new Set([...artifactGlobs, ...diagnosticArtifactPaths]),
  ];
  observationCheck.expected_output_paths = [];
  observationCheck.runner.effect = "read_only";
  observationCheck.journey_roles = ["success", "stage_gate"];
  if (!staticObservation) {
    outcome.product.requirements[0].required_proof_surfaces = [proofSurface];
    for (const obligation of outcome.technical.obligations)
      obligation.required_proof_surfaces = [proofSurface];
  }
  outcome.semantic_fact_bindings.proofs[0].proof_surface = staticObservation
    ? "runtime_behavior"
    : proofSurface;

  const allClaims = [
    ...new Set(
      [
        ...observationCheck.positive_assertions,
        ...observationCheck.negative_assertions,
      ].flatMap((assertion) => assertion.claims),
    ),
  ];
  const claimBearingAssertions = [
    ...observationCheck.positive_assertions,
    ...observationCheck.negative_assertions,
  ].filter((assertion) => assertion.claims.length > 0);

  const binding = outcome.technical.bindings.find(
    (candidate) => candidate.key === "state-first",
  );
  binding.target = bindingPath;
  binding.carrier_paths = [bindingPath];
  binding.existence = carrierExists ? "existing" : "planned";
  const ownerPattern = repoOwnerPattern(bindingPath);
  if (!outcome.product.owner.path_globs.includes(ownerPattern))
    outcome.product.owner.path_globs.push(ownerPattern);
  if (
    !outcome.technical.expected_change_paths.includes(ownerPattern) &&
    !outcome.technical.allowed_support_paths.includes(ownerPattern)
  )
    outcome.technical.allowed_support_paths.push(ownerPattern);
  const carrierOwnerPattern = repoOwnerPattern(carrierPath);
  if (!outcome.product.owner.path_globs.includes(carrierOwnerPattern))
    outcome.product.owner.path_globs.push(carrierOwnerPattern);
  if (
    !outcome.technical.expected_change_paths.includes(carrierOwnerPattern) &&
    !outcome.technical.allowed_support_paths.includes(carrierOwnerPattern)
  )
    outcome.technical.allowed_support_paths.push(carrierOwnerPattern);

  const mutation = {
    type: "replace_json_value",
    path: mutationPath,
    pointer: effectiveMutationPointer,
    value: false,
  };
  const counterfactualControls = [
    {
      key: "change-observed-production-carrier",
      binding_key: binding.key,
      claims: [...allClaims],
      check_key: observationCheck.key,
      mutation,
      expected_assertion_failures: claimBearingAssertions.map(
        (assertion) => assertion.key,
      ),
      preserved_assertions: staticObservation ? [] : ["first-liveness"],
    },
  ];
  if (staticObservation) {
    const processAssertions = [
      ...processCheck.positive_assertions,
      ...processCheck.negative_assertions,
    ];
    counterfactualControls.push({
      key: "change-process-observed-production-carrier",
      binding_key: binding.key,
      claims: [
        ...new Set(processAssertions.flatMap((assertion) => assertion.claims)),
      ],
      check_key: processCheck.key,
      mutation: {
        type: "replace_json_value",
        path: mutationPath,
        pointer: "/observations/fact.first.observable",
        value: false,
      },
      expected_assertion_failures: processAssertions
        .filter((assertion) => assertion.claims.length > 0)
        .map((assertion) => assertion.key),
      preserved_assertions: ["first-liveness"],
    });
  }
  outcome.acceptance.counterfactual_controls = counterfactualControls;

  let targetRoot = fixture.contract.task.execution_targets[0].root_entrypoint;
  if (directProcess || staticObservation) {
    targetRoot = await installProjectProcessRoot(fixture, "product-root");
    const target = fixture.contract.task.execution_targets[0];
    target.runtime_family = "process";
    target.root_entrypoint = targetRoot;
    target.capabilities = ["process-runtime", "cold-start", "production-root"];
    processCheck.proof_surface = "runtime_behavior";
    processCheck.runner.type = "project_binary";
    processCheck.runner.target = targetRoot;
    processCheck.runner.argv = projectBinaryArguments(
      "tests/oracle.mjs",
      "first",
    );
    target.root_argv = [...processCheck.runner.argv];
    processCheck.execution_target.entrypoint = "root";
    processCheck.verification_inputs = ["tests/oracle.mjs"];
    processCheck.input_paths = [...new Set(inputPaths)];
    processCheck.artifact_globs = [
      ...new Set([...artifactGlobs, ...diagnosticArtifactPaths]),
    ];
    processCheck.expected_output_paths = [];
    processCheck.runner.effect = "read_only";
    processCheck.journey_roles = ["success", "stage_gate"];
  }

  if (carrierExists)
    await writeRepositoryJson(
      fixture.root,
      carrierPath,
      observationCarrier(carrierInitialValue),
    );
  for (const diagnosticPath of diagnosticArtifactPaths)
    await writeRepositoryJson(fixture.root, diagnosticPath, {
      kind: "diagnostic-only",
      session_id: "historical-diagnostic",
    });
  for (const diagnosticPath of diagnosticArtifactPaths) {
    const diagnosticPattern = repoOwnerPattern(diagnosticPath);
    if (!outcome.product.owner.path_globs.includes(diagnosticPattern))
      outcome.product.owner.path_globs.push(diagnosticPattern);
    if (
      !outcome.technical.expected_change_paths.includes(diagnosticPattern) &&
      !outcome.technical.allowed_support_paths.includes(diagnosticPattern)
    )
      outcome.technical.allowed_support_paths.push(diagnosticPattern);
  }

  await writeContract(fixture.workdir, fixture.contract);
  const parsedManifest = await loadSemanticFactManifest(fixture.root, [
    fixture.contract.semantic_fact_manifest.source_path,
  ]);
  await writeFile(
    path.join(fixture.root, "tests", "oracle.mjs"),
    packageObservationOracleSource({
      manifest: parsedManifest.manifest,
      manifestSha256: parsedManifest.sha256,
      factRevisionDigest: parsedManifest.fact_revisions[0].revision_digest,
      obligationRevisionDigest:
        parsedManifest.obligation_revisions[0].revision_digest,
      carrierPath,
      runnerWritesCarrier: false,
      valueSourcePath: runnerValueSourcePath,
      valueSourcePointer: effectiveRunnerValueSourcePointer,
      targetRoot,
      writeProcessEnvelope: directProcess || staticObservation,
      processObservationIdentities: processObservationIdentities(processCheck, {
        includeSemanticFact: true,
      }),
      actualObservationIdentity: parsedManifest.manifest.facts[0].key,
      submitProjectEvidenceCopies,
    }),
  );
  if (staticObservation)
    await writeFile(
      path.join(fixture.root, "tests", "static-observer.mjs"),
      packageObservationOracleSource({
        manifest: parsedManifest.manifest,
        manifestSha256: parsedManifest.sha256,
        factRevisionDigest: parsedManifest.fact_revisions[0].revision_digest,
        obligationRevisionDigest:
          parsedManifest.obligation_revisions[0].revision_digest,
        carrierPath,
        runnerWritesCarrier,
        valueSourcePath: runnerValueSourcePath,
        valueSourcePointer: effectiveRunnerValueSourcePointer,
        targetRoot,
        writeProcessEnvelope: false,
        processObservationIdentities: [],
        actualObservationIdentity:
          "assertion.first.first-static-check.first-architecture",
        submitProjectEvidenceCopies,
      }),
    );
}

export async function configureProxyTargetAttack(
  fixture,
  { requiredFamily, indirectWrapper },
) {
  const outcome = fixture.contract.outcomes[0];
  const check = outcome.acceptance.checks[0];
  const productRoot = indirectWrapper
    ? "tests/oracle.mjs"
    : await installProjectProcessRoot(fixture, "product-root");
  const runnerRoot = indirectWrapper
    ? await installProjectProcessRoot(fixture, "verifier-wrapper")
    : productRoot;
  const target = fixture.contract.task.execution_targets[0];
  target.runtime_family = requiredFamily;
  target.root_entrypoint = productRoot;
  target.capabilities = [
    `${requiredFamily}-runtime`,
    "cold-start",
    "production-root",
  ];
  check.runner.type = "project_binary";
  check.runner.target = runnerRoot;
  check.runner.argv = projectBinaryArguments("tests/oracle.mjs", "first");
  target.root_argv = [...check.runner.argv];
  check.execution_target.entrypoint = "root";
  await writeContract(fixture.workdir, fixture.contract);

  const oraclePath = path.join(fixture.root, "tests", "oracle.mjs");
  const source = await readFile(oraclePath, "utf8");
  const classifiedProxy =
    requiredFamily === "native"
      ? source.includes("const observations = {")
        ? source.replace(
            "const observations = {",
            'const observations = { actual_runtime_family: "browser",',
          )
        : source.replace(
            "const productEnvelope = {",
            'const actualRuntimeFamily = "browser";\nconst productEnvelope = {',
          )
      : source;
  if (requiredFamily === "native" && classifiedProxy === source)
    throw new Error("observer_fixture_proxy_classification_rewrite_missing");
  await writeFile(oraclePath, classifiedProxy);
}

export async function configureRootArgvWrapperAttack(fixture) {
  await configurePackageObservationCase(fixture, {
    carrierPath: "src/state.json",
    bindingPath: "src/state.json",
    mutationPath: "src/state.json",
    inputPaths: ["src/state.json"],
    artifactGlobs: [],
    diagnosticArtifactPaths: ["artifacts/root-invocation-diagnostic.json"],
    proofSurface: "runtime_behavior",
    directProcess: true,
  });
  await applyRootArgvWrapperAttack(fixture);
}

export async function applyRootArgvWrapperAttack(fixture) {
  const target = fixture.contract.task.execution_targets[0];
  const declaredProductScript = "tests/product-root.mjs";
  await writeFile(
    path.join(fixture.root, ...declaredProductScript.split("/")),
    'await import("./oracle.mjs");\n',
  );
  target.root_argv = projectBinaryArguments(declaredProductScript, "first");
  await writeContract(fixture.workdir, fixture.contract);
}

export async function configureCrossExecutionStaticPrimingAttack(fixture) {
  const carrierPath = "artifacts/cross-group-static.json";
  await configurePackageObservationCase(fixture, {
    carrierPath,
    carrierExists: true,
    carrierInitialValue: false,
    bindingPath: carrierPath,
    mutationPath: carrierPath,
    inputPaths: [carrierPath],
    artifactGlobs: [],
    diagnosticArtifactPaths: ["artifacts/static-priming-diagnostic.json"],
  });
  const outcome = fixture.contract.outcomes[0];
  const staticCheck = requiredFixtureCheck(outcome, "first-static-check");
  const poisonPath = "tests/prime-later-static-carrier.mjs";
  const poisonCheck = structuredClone(staticCheck);
  poisonCheck.key = "prime-later-static-carrier";
  poisonCheck.journey_roles = ["success"];
  poisonCheck.runner = {
    type: "node_oracle",
    target: poisonPath,
    argv: [],
    cwd: ".",
    timeout_ms: 30000,
    effect: "read_only",
    retry_policy: "none",
    idempotent: true,
  };
  poisonCheck.verification_inputs = [poisonPath];
  poisonCheck.input_paths = [carrierPath];
  poisonCheck.expected_output_paths = [];
  poisonCheck.artifact_globs = [];
  poisonCheck.positive_assertions = [];
  poisonCheck.negative_assertions = [];
  outcome.acceptance.checks.unshift(poisonCheck);
  await writeFile(
    path.join(fixture.root, ...poisonPath.split("/")),
    `import { writeFile } from "node:fs/promises";
await writeFile(new URL(${JSON.stringify(`../${carrierPath}`)}, import.meta.url), ${JSON.stringify(`${JSON.stringify(observationCarrier(true))}\n`)});
console.log(JSON.stringify({schema_version:"long-task-check-result-v3",execution_status:"completed",observations:{},evidence_records:[]}));
`,
  );
  await writeContract(fixture.workdir, fixture.contract);
}

export async function configureProcessInputMutationAttack(fixture) {
  await configurePackageObservationCase(fixture, {
    carrierPath: "src/state.json",
    carrierExists: true,
    carrierInitialValue: false,
    bindingPath: "src/state.json",
    mutationPath: "src/state.json",
    inputPaths: ["src/state.json"],
    artifactGlobs: [],
    diagnosticArtifactPaths: ["artifacts/process-input-diagnostic.json"],
    proofSurface: "runtime_behavior",
    directProcess: true,
  });
  const oraclePath = path.join(fixture.root, "tests", "oracle.mjs");
  const source = await readFile(oraclePath, "utf8");
  const marker = "const artifact = await readFile(artifactFile);";
  const mutated = source.replace(
    marker,
    `// The product runner rewrites its declared production input to Expected before observing it.\nawait writeFile(artifactFile, JSON.stringify(observationDocument(fact.expected.value)));\n${marker}`,
  );
  if (mutated === source)
    throw new Error("observer_fixture_process_input_mutation_rewrite_missing");
  await writeFile(oraclePath, mutated);
}

export async function configureMissingCounterfactualObservationAttack(fixture) {
  await configurePackageObservationCase(fixture, {
    carrierPath: "src/state.json",
    bindingPath: "src/state.json",
    mutationPath: "src/state.json",
    inputPaths: ["src/state.json"],
    artifactGlobs: [],
    diagnosticArtifactPaths: [
      "artifacts/counterfactual-observation-diagnostic.json",
    ],
    proofSurface: "runtime_behavior",
    directProcess: true,
  });
  const oraclePath = path.join(fixture.root, "tests", "oracle.mjs");
  const source = await readFile(oraclePath, "utf8");
  const marker = "console.log(JSON.stringify(productEnvelope));";
  const conditionalOutput = source.replace(
    marker,
    "if (actualValue === true) console.log(JSON.stringify(productEnvelope));",
  );
  if (conditionalOutput === source)
    throw new Error(
      "observer_fixture_counterfactual_missing_observation_rewrite_missing",
    );
  await writeFile(oraclePath, conditionalOutput);
}

export async function configureVerificationInputStaticAttack(fixture) {
  await configureVerificationInputStaticBase(fixture);
  await applyVerificationInputStaticConflict(fixture);
}

export async function configureVerificationInputStaticBase(fixture) {
  const carrierPath = "expected/expected-static-actual.json";
  await configurePackageObservationCase(fixture, {
    carrierPath,
    bindingPath: carrierPath,
    mutationPath: carrierPath,
    inputPaths: [carrierPath],
    artifactGlobs: [],
    diagnosticArtifactPaths: ["artifacts/expected-authority-diagnostic.json"],
  });
}

export async function applyVerificationInputStaticConflict(fixture) {
  const carrierPath = "expected/expected-static-actual.json";
  const staticCheck = requiredFixtureCheck(
    fixture.contract.outcomes[0],
    "first-static-check",
  );
  staticCheck.verification_inputs.push(carrierPath);
  await writeContract(fixture.workdir, fixture.contract);
}

export async function configureEvidenceRoleStaticAttack(fixture) {
  await configureEvidenceRoleStaticBase(fixture);
  await applyEvidenceRoleStaticConflict(fixture);
}

export async function configureEvidenceRoleStaticBase(fixture) {
  const carrierPath = "artifacts/pre-existing-status-report.json";
  await configurePackageObservationCase(fixture, {
    carrierPath,
    bindingPath: carrierPath,
    mutationPath: carrierPath,
    inputPaths: [carrierPath],
    artifactGlobs: [],
    diagnosticArtifactPaths: ["artifacts/static-status-diagnostic.json"],
  });
}

export async function applyEvidenceRoleStaticConflict(fixture) {
  const carrierPath = "artifacts/pre-existing-status-report.json";
  const staticCheck = requiredFixtureCheck(
    fixture.contract.outcomes[0],
    "first-static-check",
  );
  staticCheck.expected_output_paths = [carrierPath];
  staticCheck.artifact_globs = [carrierPath];
  await writeContract(fixture.workdir, fixture.contract);
}

export async function configureEvidenceRoleProcessAttack(fixture) {
  await configureEvidenceRoleProcessBase(fixture);
  await applyEvidenceRoleProcessConflict(fixture);
}

export async function configureEvidenceRoleProcessBase(fixture) {
  const carrierPath = "artifacts/pre-existing-process-status-report.json";
  await configurePackageObservationCase(fixture, {
    carrierPath,
    bindingPath: carrierPath,
    mutationPath: carrierPath,
    inputPaths: [carrierPath],
    artifactGlobs: [],
    diagnosticArtifactPaths: ["artifacts/process-status-diagnostic.json"],
    proofSurface: "runtime_behavior",
    directProcess: true,
  });
}

export async function applyEvidenceRoleProcessConflict(fixture) {
  const carrierPath = "artifacts/pre-existing-process-status-report.json";
  const processCheck = requiredFixtureCheck(
    fixture.contract.outcomes[0],
    "first-check",
  );
  processCheck.expected_output_paths = [carrierPath];
  processCheck.artifact_globs = [carrierPath];
  await writeContract(fixture.workdir, fixture.contract);
}

async function invoke(cwd, args) {
  try {
    return { ok: true, result: await runCli(cwd, args) };
  } catch (error) {
    const output = error?.stdout || error?.stderr;
    if (!output) throw error;
    return {
      ok: false,
      result: error.stdout
        ? parseCliJson(error.stdout)
        : { status: "rejected", diagnostic: String(error.stderr).trim() },
    };
  }
}

async function gitIdentity(cwd, args) {
  const result = await execFileAsync("git", args, { cwd, windowsHide: true });
  return result.stdout.trim();
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

async function installProjectProcessRoot(fixture, name) {
  // Keep the lifecycle fixture compact while still giving Harness a
  // repository-owned executable plus an exact, frozen root invocation.
  const source = process.platform === "win32" ? process.env.ComSpec : "/bin/sh";
  if (!source) throw new Error("observer_fixture_shell_unavailable");
  const extension = process.platform === "win32" ? ".exe" : "";
  const relative = `bin/${name}${extension}`;
  const destination = path.join(fixture.root, ...relative.split("/"));
  await mkdir(path.dirname(destination), { recursive: true });
  await copyFile(source, destination);
  if (process.platform !== "win32") await chmod(destination, 0o755);
  return relative;
}

function projectBinaryArguments(script, argument) {
  if (process.platform === "win32")
    return ["/d", "/c", `${process.execPath} ${script} ${argument}`];
  return [
    "-c",
    `${shellQuote(process.execPath)} ${shellQuote(script)} ${shellQuote(argument)}`,
  ];
}

function shellQuote(value) {
  return `'${String(value).replaceAll("'", `'\\''`)}'`;
}

function repoOwnerPattern(relative) {
  const normalized = relative.replaceAll("\\", "/");
  const slash = normalized.lastIndexOf("/");
  return slash === -1 ? normalized : `${normalized.slice(0, slash)}/**`;
}

function requiredFixtureCheck(outcome, key) {
  const check = outcome.acceptance.checks.find(
    (candidate) => candidate.key === key,
  );
  if (!check) throw new Error(`observer_fixture_check_missing:${key}`);
  return check;
}

async function writeRepositoryJson(root, relative, value) {
  const target = path.join(root, ...relative.split("/"));
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, `${JSON.stringify(value)}\n`);
}

function observationCarrier(value) {
  return {
    observations: {
      "fact.first.observable": value,
      "first-result": value,
      "first-semantic-fact": value,
      "first-architecture": value,
      "first-requirement": value,
      "first-obligation": value,
      "first-liveness": true,
      "first-relations-na": !value,
      "assertion.first.first-check.first-result": value,
      "assertion.first.first-check.first-architecture": value,
      "assertion.first.first-check.first-requirement": value,
      "assertion.first.first-check.first-obligation": value,
      "assertion.first.first-check.first-liveness": true,
      "assertion.first.first-check.first-relations-na": !value,
      "assertion.first.first-static-check.first-architecture": value,
    },
    environment: { runtime: "fixture-process" },
    comparisons: { "proof.first.observable.exact": value },
  };
}

function processObservationIdentities(check, { includeSemanticFact }) {
  return [
    ...(includeSemanticFact ? ["fact.first.observable"] : []),
    ...[...check.positive_assertions, ...check.negative_assertions]
      .filter((assertion) => assertion.key !== "first-semantic-fact")
      .map((assertion) => `assertion.first.${check.key}.${assertion.key}`),
  ];
}

function packageObservationOracleSource({
  manifest,
  manifestSha256,
  factRevisionDigest,
  obligationRevisionDigest,
  carrierPath,
  runnerWritesCarrier,
  valueSourcePath,
  valueSourcePointer,
  targetRoot,
  writeProcessEnvelope,
  processObservationIdentities,
  actualObservationIdentity,
  submitProjectEvidenceCopies,
}) {
  const fact = manifest.facts[0];
  const proof = manifest.proof_obligations[0];
  const environment = manifest.environments[0];
  const oracle = manifest.oracles[0];
  return `import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
const fact = ${JSON.stringify(fact)};
const proof = ${JSON.stringify(proof)};
const environment = ${JSON.stringify(environment)};
const oracle = ${JSON.stringify(oracle)};
const manifestSha256 = ${JSON.stringify(manifestSha256)};
const factRevisionDigest = ${JSON.stringify(factRevisionDigest)};
const obligationRevisionDigest = ${JSON.stringify(obligationRevisionDigest)};
const artifactPath = ${JSON.stringify(carrierPath)};
const artifactFile = fileURLToPath(new URL(${JSON.stringify(`../${carrierPath}`)}, import.meta.url));
const canonicalize = (value) => Array.isArray(value) ? value.map(canonicalize) : value && typeof value === "object" ? Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])])) : value;
const pointer = (value, pointerValue) => pointerValue.split("/").slice(1).reduce((current, segment) => current[segment.replaceAll("~1", "/").replaceAll("~0", "~")], value);
const observationTemplate = ${JSON.stringify(observationCarrier(true))};
const observationDocument = (value) => ({observations:Object.fromEntries(Object.keys(observationTemplate.observations).map((key) => [key, key.endsWith("liveness") ? true : key.endsWith("relations-na") ? !value : value])),environment:{runtime:"fixture-process"},comparisons:{[proof.key]:value}});
${
  runnerWritesCarrier
    ? `const source = JSON.parse(await readFile(new URL(${JSON.stringify(`../${valueSourcePath}`)}, import.meta.url), "utf8"));
const sourceValue = pointer(source, ${JSON.stringify(valueSourcePointer)});
const runnerValue = sourceValue === false ? false : fact.expected.value;
await mkdir(path.dirname(artifactFile), { recursive: true });
await writeFile(artifactFile, JSON.stringify(observationDocument(runnerValue)));`
    : ""
}
const artifact = await readFile(artifactFile);
const artifactDocument = JSON.parse(artifact.toString("utf8"));
const actualValue = artifactDocument.observations[${JSON.stringify(actualObservationIdentity)}];
const artifactSha256 = createHash("sha256").update(artifact).digest("hex");
const actualValueSha256 = createHash("sha256").update(JSON.stringify(canonicalize(actualValue))).digest("hex");
const comparisonPassed = actualValueSha256 === fact.expected.sha256;
const comparisonResultSha256 = createHash("sha256").update(JSON.stringify(canonicalize({identity:{kind:"semantic_fact_non_ui",fact_ref:fact.key,proof_ref:proof.key,fact_key:fact.key,fact_revision_digest:factRevisionDigest,obligation_key:proof.key,obligation_revision_digest:obligationRevisionDigest,target_ref:"fixture-app"},actual_value_sha256:actualValueSha256,expected_value_sha256:fact.expected.sha256,comparator:proof.comparison.comparator,mode:proof.comparison.mode,parameters_sha256:proof.comparison.parameters.sha256,tolerance_sha256:proof.comparison.tolerance?.sha256 ?? null,mask_sha256:proof.comparison.mask?.sha256 ?? null,passed:actualValueSha256===fact.expected.sha256}))).digest("hex");
${
  writeProcessEnvelope
    ? `const productObservations = observationDocument(actualValue).observations;
const productEnvelope = {schema_version:"ty-context-product-observation-v1",observations:Object.fromEntries(${JSON.stringify(processObservationIdentities)}.map((identity) => [identity, productObservations[identity]]))};`
    : ""
}
const assertionKeys = ["first-result","first-requirement","first-obligation","first-relations-na","first-architecture"];
const targetRecord = (assertionKey) => ({assertion_key:assertionKey,capability:"target_runtime",target_ref:"fixture-app",root_entrypoint:${JSON.stringify(targetRoot)},session_id:"project-submitted-session",cold_start:true});
const stateRecord = (assertionKey) => ({assertion_key:assertionKey,capability:"state_delta",before_sha256:"0".repeat(64),after_sha256:"1".repeat(64),changed_fields:["first"]});
const semanticRecord = {assertion_key:"first-semantic-fact",capability:"semantic_fact",manifest_ref:${JSON.stringify(manifest.key)},manifest_sha256:manifestSha256,outcome_ref:"first",target_ref:"fixture-app",fact_ref:fact.key,fact_key:fact.key,fact_revision_digest:factRevisionDigest,proof_ref:proof.key,obligation_key:proof.key,obligation_revision_digest:obligationRevisionDigest,method:proof.method,subject_ref:fact.unit_ref,condition_ref:fact.condition_ref,property_ref:fact.property_ref,actual_observation:{artifact_path:artifactPath,artifact_sha256:artifactSha256,locator:{kind:"json_pointer",value:"/observations/"+fact.key},value_sha256:actualValueSha256,sensitivity:"plain",redaction:null},actual_environment:{artifact_path:artifactPath,artifact_sha256:artifactSha256,locator:{kind:"json_pointer",value:"/environment"},value_sha256:environment.definition.sha256},expected:fact.expected,comparison:{artifact_path:artifactPath,artifact_sha256:artifactSha256,locator:{kind:"json_pointer",value:"/comparisons/"+proof.key},result_sha256:comparisonResultSha256,comparator:proof.comparison.comparator,mode:proof.comparison.mode,parameters:proof.comparison.parameters,tolerance:proof.comparison.tolerance,mask:proof.comparison.mask,passed:comparisonPassed},verdict:comparisonPassed?"passed":"failed",oracle,environment,observer_results:[]};
console.log(JSON.stringify(${writeProcessEnvelope ? "productEnvelope" : `{schema_version:"long-task-check-result-v3",execution_status:"completed",observations:{result:actualValue,requirement_result:actualValue,obligation_result:actualValue,architecture_result:actualValue,semantic_fact_result:actualValue,relations_applicable:!actualValue,target_live:true,negative:false,population:{universe_ids:["first"],eligible_ids:["first"],observed_ids:actualValue?["first"]:[],excluded_items:[]}},evidence_records:${submitProjectEvidenceCopies ? '[...assertionKeys.flatMap((assertionKey)=>[targetRecord(assertionKey),stateRecord(assertionKey)]),targetRecord("first-liveness"),semanticRecord]' : "[]"}}`}));
`;
}
