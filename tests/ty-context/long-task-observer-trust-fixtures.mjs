import { chmod, copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
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
  const final = await invoke(fixture.root, [
    "long-task",
    "final-gate",
    fixture.workdir,
  ]);
  return { stage: "final-gate", result: final.result, ok: final.ok };
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
  return /machine_observer_not_admitted|unsupported_observer_requires_external_confirmation|custom_oracle_machine_completion_forbidden|static_observation_not_in_pre_run_snapshot|static_observation_changed_by_runner|process_observer_direct_root_required|legacy_target_runtime_non_authoritative|counterfactual_admitted_observation_required|counterfactual_runtime_reachability_unproven|project_submitted_verdict_disagrees_with_harness/u.test(
    diagnostic,
  );
}

export async function configureExpectedAsActualAttack(fixture) {
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

export async function configureHistoricalRuntimeAttack(fixture) {
  const sessionPath = path.join(fixture.root, "artifacts", "session.json");
  await writeFile(
    sessionPath,
    `${JSON.stringify({ session_id: "historical-session", cold_start: true })}\n`,
  );
  const check = fixture.contract.outcomes[0].acceptance.checks[0];
  check.verification_inputs.push("artifacts/session.json");
  await writeContract(fixture.workdir, fixture.contract);
  const oraclePath = path.join(fixture.root, "tests", "oracle.mjs");
  const source = await readFile(oraclePath, "utf8");
  const withSession = source
    .replace(
      "const targetRecord = (assertionKey) => ({",
      `// R3: a historical file is replayed as a supposedly fresh runtime.\nconst historicalSession = JSON.parse(await readFile(new URL("../artifacts/session.json", import.meta.url), "utf8"));\nconst targetRecord = (assertionKey) => ({`,
    )
    .replace(
      /session_id: `fixture-\$\{key\}-session`,/u,
      "session_id: `${historicalSession.session_id}-replayed`,",
    )
    .replace("cold_start: true", "cold_start: historicalSession.cold_start");
  if (withSession === source)
    throw new Error("observer_fixture_historical_session_rewrite_missing");
  await writeFile(oraclePath, withSession);
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
    mutationPointer = "/observations/fact.first.observable",
    inputPaths = [carrierPath],
    artifactGlobs = [carrierPath],
    proofSurface = "implementation_structure",
    directProcess = false,
    diagnosticArtifactPaths = [],
  },
) {
  const externalConfirmation = fixture.contract.source_claims.some(
    (claim) => claim.disposition.type === "external_confirmation",
  );
  const manifest = fixtureSemanticManifest({ externalConfirmation });
  manifest.oracles[0] = {
    ...manifest.oracles[0],
    identity: PACKAGE_EXACT_ORACLE_IDENTITY,
    version: PACKAGE_EXACT_ORACLE_VERSION,
    sha256: null,
  };
  for (const proof of manifest.proof_obligations)
    proof.proof_surface = proofSurface;
  refreshFixtureSemanticManifest(manifest);
  await writeFixtureSourceAndOracle(
    fixture.root,
    { externalConfirmation },
    manifest,
  );

  const outcome = fixture.contract.outcomes[0];
  const check = outcome.acceptance.checks[0];
  check.proof_surface = proofSurface;
  check.input_paths = [...new Set(inputPaths)];
  check.artifact_globs = [
    ...new Set([...artifactGlobs, ...diagnosticArtifactPaths]),
  ];
  check.expected_output_paths = [];
  check.runner.effect = "read_only";
  check.journey_roles = ["success", "stage_gate"];
  outcome.product.requirements[0].required_proof_surfaces = [proofSurface];
  for (const obligation of outcome.technical.obligations)
    obligation.required_proof_surfaces = [proofSurface];
  outcome.semantic_fact_bindings.proofs[0].proof_surface = proofSurface;

  const allClaims = [
    ...new Set(
      [...check.positive_assertions, ...check.negative_assertions].flatMap(
        (assertion) => assertion.claims,
      ),
    ),
  ];
  const claimBearingAssertions = [
    ...check.positive_assertions,
    ...check.negative_assertions,
  ].filter((assertion) => assertion.claims.length > 0);

  const binding = outcome.technical.bindings.find(
    (candidate) => candidate.key === "state-first",
  );
  binding.target = bindingPath;
  binding.carrier_paths = [bindingPath];
  binding.existence = "existing";
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
    pointer: mutationPointer,
    value: false,
  };
  outcome.acceptance.counterfactual_controls = [
    {
      key: "change-observed-production-carrier",
      binding_key: binding.key,
      claims: [...allClaims],
      check_key: check.key,
      mutation,
      expected_assertion_failures: claimBearingAssertions.map(
        (assertion) => assertion.key,
      ),
      preserved_assertions: ["first-liveness"],
    },
  ];

  let targetRoot = fixture.contract.task.execution_targets[0].root_entrypoint;
  if (directProcess) {
    targetRoot = await installProjectProcessRoot(fixture, "product-root");
    const target = fixture.contract.task.execution_targets[0];
    target.runtime_family = "process";
    target.root_entrypoint = targetRoot;
    target.capabilities = ["process-runtime", "cold-start", "production-root"];
    check.runner.type = "project_binary";
    check.runner.target = targetRoot;
    check.runner.argv = projectBinaryArguments("tests/oracle.mjs", "first");
    check.execution_target.entrypoint = "root";
    check.verification_inputs = ["tests/oracle.mjs"];
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
      runnerWritesCarrier,
      valueSourcePath: mutationPath,
      valueSourcePointer: mutationPointer,
      targetRoot,
      writeProcessEnvelope: directProcess,
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
  check.execution_target.entrypoint = "root";
  await writeContract(fixture.workdir, fixture.contract);

  const oraclePath = path.join(fixture.root, "tests", "oracle.mjs");
  const source = await readFile(oraclePath, "utf8");
  const rewritten = source.replaceAll(
    'root_entrypoint: "tests/oracle.mjs"',
    `root_entrypoint: ${JSON.stringify(productRoot)}`,
  );
  const classifiedProxy =
    requiredFamily === "native"
      ? rewritten.replace(
          "observations: {",
          'observations: { actual_runtime_family: "browser",',
        )
      : rewritten;
  if (classifiedProxy === source && productRoot !== "tests/oracle.mjs")
    throw new Error("observer_fixture_proxy_root_rewrite_missing");
  await writeFile(oraclePath, classifiedProxy);
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

async function installProjectProcessRoot(fixture, name) {
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
      "first-relations-na": !value,
    },
    environment: { runtime: "fixture-process" },
    comparisons: { "proof.first.observable.exact": value },
  };
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
const observationDocument = (value) => ({observations:{[fact.key]:value,"first-result":value,"first-semantic-fact":value,"first-architecture":value,"first-requirement":value,"first-obligation":value,"first-relations-na":!value},environment:{runtime:"fixture-process"},comparisons:{[proof.key]:value}});
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
const actualValue = artifactDocument.observations[fact.key];
const artifactSha256 = createHash("sha256").update(artifact).digest("hex");
const actualValueSha256 = createHash("sha256").update(JSON.stringify(canonicalize(actualValue))).digest("hex");
const comparisonPassed = actualValueSha256 === fact.expected.sha256;
const comparisonResultSha256 = createHash("sha256").update(JSON.stringify(canonicalize({identity:{kind:"semantic_fact_non_ui",fact_ref:fact.key,proof_ref:proof.key,fact_key:fact.key,fact_revision_digest:factRevisionDigest,obligation_key:proof.key,obligation_revision_digest:obligationRevisionDigest,target_ref:"fixture-app"},actual_value_sha256:actualValueSha256,expected_value_sha256:fact.expected.sha256,comparator:proof.comparison.comparator,mode:proof.comparison.mode,parameters_sha256:proof.comparison.parameters.sha256,tolerance_sha256:proof.comparison.tolerance?.sha256 ?? null,mask_sha256:proof.comparison.mask?.sha256 ?? null,passed:actualValueSha256===fact.expected.sha256}))).digest("hex");
${
  writeProcessEnvelope
    ? `if (process.env.TY_CONTEXT_OBSERVATION_OUTPUT) {
  await writeFile(process.env.TY_CONTEXT_OBSERVATION_OUTPUT, JSON.stringify({schema_version:"ty-context-product-observation-v1",challenge:process.env.TY_CONTEXT_OBSERVATION_CHALLENGE,observations:observationDocument(actualValue).observations}));
}`
    : ""
}
const assertionKeys = ["first-result","first-requirement","first-obligation","first-relations-na","first-architecture"];
const targetRecord = (assertionKey) => ({assertion_key:assertionKey,capability:"target_runtime",target_ref:"fixture-app",root_entrypoint:${JSON.stringify(targetRoot)},session_id:"project-submitted-session",cold_start:true});
const stateRecord = (assertionKey) => ({assertion_key:assertionKey,capability:"state_delta",before_sha256:"0".repeat(64),after_sha256:"1".repeat(64),changed_fields:["first"]});
const semanticRecord = {assertion_key:"first-semantic-fact",capability:"semantic_fact",manifest_ref:${JSON.stringify(manifest.key)},manifest_sha256:manifestSha256,outcome_ref:"first",target_ref:"fixture-app",fact_ref:fact.key,fact_key:fact.key,fact_revision_digest:factRevisionDigest,proof_ref:proof.key,obligation_key:proof.key,obligation_revision_digest:obligationRevisionDigest,method:proof.method,subject_ref:fact.unit_ref,condition_ref:fact.condition_ref,property_ref:fact.property_ref,actual_observation:{artifact_path:artifactPath,artifact_sha256:artifactSha256,locator:{kind:"json_pointer",value:"/observations/"+fact.key},value_sha256:actualValueSha256,sensitivity:"plain",redaction:null},actual_environment:{artifact_path:artifactPath,artifact_sha256:artifactSha256,locator:{kind:"json_pointer",value:"/environment"},value_sha256:environment.definition.sha256},expected:fact.expected,comparison:{artifact_path:artifactPath,artifact_sha256:artifactSha256,locator:{kind:"json_pointer",value:"/comparisons/"+proof.key},result_sha256:comparisonResultSha256,comparator:proof.comparison.comparator,mode:proof.comparison.mode,parameters:proof.comparison.parameters,tolerance:proof.comparison.tolerance,mask:proof.comparison.mask,passed:comparisonPassed},verdict:comparisonPassed?"passed":"failed",oracle,environment,observer_results:[]};
console.log(JSON.stringify({schema_version:"long-task-check-result-v3",execution_status:"completed",observations:{result:actualValue,requirement_result:actualValue,obligation_result:actualValue,architecture_result:actualValue,semantic_fact_result:actualValue,relations_applicable:!actualValue,target_live:true,negative:false,population:{universe_ids:["first"],eligible_ids:["first"],observed_ids:actualValue?["first"]:[],excluded_items:[]}},evidence_records:[...assertionKeys.flatMap((assertionKey)=>[targetRecord(assertionKey),stateRecord(assertionKey)]),targetRecord("first-liveness"),semanticRecord]}));
`;
}
