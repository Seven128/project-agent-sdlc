import { execFile } from "node:child_process";
import { generateKeyPairSync } from "node:crypto";
import { rmSync } from "node:fs";
import {
  cp,
  access,
  mkdir,
  mkdtemp,
  readFile,
  realpath,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import YAML from "yaml";
import { executionTargetSourceStatement } from "../../packages/ty-context/dist/lib/long-task-source-target-index.js";
import {
  FIXTURE_EXTERNAL_FACT_SPECS,
  fixtureArchitectureFactSpecs,
  fixtureExternalFactSpecs,
  fixtureSemanticManifest,
  fixtureSourceStatements,
} from "./long-task-semantic-manifest-fixture.mjs";
import { writeFixtureSourceAndOracle } from "./long-task-semantic-oracle-fixture.mjs";
import {
  digestCanonical,
  refreshFixtureSemanticManifest,
} from "./long-task-semantic-refresh-fixture.mjs";
import { synchronizeFixtureSemanticManifest } from "./long-task-semantic-sync-fixture.mjs";
import {
  fixtureExactComparisonInput,
  fixtureExactComparisonResultIdentity,
} from "./long-task-exact-comparison-fixture.mjs";
import {
  FIXTURE_FIRST_SCOPE_ENV,
  FIXTURE_LEGACY_ORACLE_PATH,
  FIXTURE_SECOND_SCOPE_ENV,
  FIXTURE_STATIC_FALSE_PATH,
  FIXTURE_STATIC_RELATIONS_PATH,
  fixtureProductRootArgv,
  fixtureProductRootPath,
  fixtureProcessExecutionTarget,
  installPackageMachineFixture,
  packageAdmittedFixtureSemanticManifest,
} from "./long-task-package-machine-fixture.mjs";

export { fixtureSemanticManifest };

const exec = promisify(execFile);
export const FIXTURE_EXTERNAL_PUBLIC_KEY_REF =
  "project_context/authorities/fixture-owner.pub";
const repo = fileURLToPath(new URL("../..", import.meta.url));
const cli = path.join(repo, "packages/ty-context/dist/cli.js");
const fixtureSeedEnvironment = "TY_CONTEXT_DELIVERY_FIXTURE_SEED_ROOT";
const ownedFixtureSeeds = new Set();
let standaloneSeedPromise = null;
let cleanupHookRegistered = false;

export const DESIGN_FACT_FIXTURE_SHA256 = "a".repeat(64);

export function designFactExpectationFixture(factRef = "fixture.fact.default") {
  return {
    fact_ref: factRef,
    subject_ref: "subject.fixture",
    variation_ref: "variation.fixture.default",
    property_ref: "geometry.width",
    observation_sensitivity: "plain",
    expected: {
      locator: {
        resource_ref: "resource.fixture",
        kind: "json_pointer",
        value: `/facts/${factRef}`,
      },
      sha256: DESIGN_FACT_FIXTURE_SHA256,
    },
    comparison: {
      comparator: "exact_value",
      mode: "exact",
      parameters: {
        locator: {
          resource_ref: "resource.fixture",
          kind: "json_pointer",
          value: "/comparators/exact-value",
        },
        sha256: "b".repeat(64),
      },
      tolerance: null,
      mask: null,
    },
    oracle: {
      key: "oracle.fixture",
      trust: "named_external_tcb",
      identity: "fixture-oracle",
      version: "1.0.0",
      sha256: null,
    },
    environment: {
      key: "environment.fixture",
      identity: "fixture-environment",
      definition: {
        locator: {
          resource_ref: "resource.fixture",
          kind: "json_pointer",
          value: "/environment",
        },
        sha256: "c".repeat(64),
      },
    },
  };
}

export function designFactResultFixture(
  expectation,
  {
    artifactPath,
    observationPath,
    artifactSha256 = "d".repeat(64),
    observationSha256 = "e".repeat(64),
    locatorSuffix = expectation.fact_ref,
    sensitivity = "plain",
  },
) {
  const result = {
    fact_ref: expectation.fact_ref,
    subject_ref: expectation.subject_ref,
    variation_ref: expectation.variation_ref,
    property_ref: expectation.property_ref,
    actual_observation: {
      artifact_path: observationPath,
      artifact_sha256: observationSha256,
      locator: {
        kind: "json_pointer",
        value: `/observations/${locatorSuffix}`,
      },
      value_sha256: expectation.expected.sha256,
      sensitivity,
      redaction:
        sensitivity === "protected"
          ? {
              policy_ref: "policy.fixture-redaction",
              representation: "digest_only",
              raw_persisted: false,
            }
          : null,
    },
    actual_environment: {
      artifact_path: observationPath,
      artifact_sha256: observationSha256,
      locator: {
        kind: "json_pointer",
        value: `/environments/${locatorSuffix}`,
      },
      value_sha256: expectation.environment.definition.sha256,
    },
    expected: structuredClone(expectation.expected),
    comparison: {
      artifact_path: artifactPath,
      artifact_sha256: artifactSha256,
      locator: {
        kind: "json_pointer",
        value: `/comparisons/${locatorSuffix}`,
      },
      result_sha256: "0".repeat(64),
      comparator: expectation.comparison.comparator,
      mode: expectation.comparison.mode,
      parameters: structuredClone(expectation.comparison.parameters),
      tolerance: structuredClone(expectation.comparison.tolerance),
      mask: structuredClone(expectation.comparison.mask),
      passed: true,
    },
    verdict: "passed",
    oracle: structuredClone(expectation.oracle),
    environment: structuredClone(expectation.environment),
  };
  const identityInput = fixtureExactComparisonInput({
    identity: {
      kind: "selected_design_ground_v1",
      fact_ref: result.fact_ref,
      subject_ref: result.subject_ref,
      variation_ref: result.variation_ref,
      property_ref: result.property_ref,
    },
    actualValueSha256: result.actual_observation.value_sha256,
    expectedValueSha256: result.expected.sha256,
    comparison: result.comparison,
  });
  result.comparison.result_sha256 = fixtureExactComparisonResultIdentity({
    ...identityInput,
    passed: true,
  });
  return result;
}

export async function createDeliveryFixture(options = {}) {
  const root = await realpath(
    await mkdtemp(path.join(os.tmpdir(), "ty-context-delivery-")),
  );
  try {
    const seedRoot = await resolveFixtureSeedRoot(options.fixtureSeedRoot);
    const externalConfirmation = Boolean(options.externalConfirmation);
    const twoOutcomes = Boolean(options.twoOutcomes);
    const externalConfirmationCount = options.externalConfirmation
      ? (options.externalConfirmationCount ?? 1)
      : 0;
    const variant = externalConfirmation
      ? "external"
      : twoOutcomes
        ? "default-two-outcomes"
        : "default";
    const template = path.join(seedRoot, variant);
    await assertSeedRepository(template);
    await cp(template, root, { recursive: true, force: true });
    if (
      externalConfirmation &&
      (twoOutcomes || externalConfirmationCount !== 1)
    ) {
      const manifest = packageAdmittedFixtureSemanticManifest({
        twoOutcomes,
        externalConfirmation,
        externalConfirmationCount,
      });
      await writeFixtureSourceAndOracle(
        root,
        {
          twoOutcomes,
          externalConfirmation,
          externalConfirmationCount,
          executionTarget: fixtureProcessExecutionTarget(),
        },
        manifest,
      );
      await installPackageMachineFixture(root, manifest);
      if (twoOutcomes) await preserveTwoOutcomeFailureBaseline(root);
      await exec(
        "git",
        [
          "add",
          "source.md",
          "src/state.json",
          "tests/oracle.mjs",
          FIXTURE_LEGACY_ORACLE_PATH,
          FIXTURE_STATIC_FALSE_PATH,
          FIXTURE_STATIC_RELATIONS_PATH,
          fixtureProductRootPath(),
        ],
        { cwd: root },
      );
      await exec("git", ["commit", "--amend", "--no-edit"], { cwd: root });
    }
  } catch (error) {
    await rm(root, { recursive: true, force: true });
    throw error;
  }
  const workdir = path.join(root, ".long-task");
  await mkdir(workdir, { recursive: true });
  const contract = deliveryContract(options);
  addDefaultSensitivityControls(contract);
  await writeContract(workdir, contract, {
    synchronizeSemanticManifest: Boolean(options.externalConfirmation),
  });
  return { root, workdir, contract };
}

export async function createNonBlockingExternalFixture(options = {}) {
  const fixture = await createDeliveryFixture(options);
  fixture.contract.global.acceptance.external_confirmations = [
    {
      key: "fixture-external",
      description: "Confirm the fixture in external delivery.",
      owner: "release-owner",
      kind: "field_validation",
      impact_claims: ["first.result"],
      blocks_target: false,
    },
  ];
  await writeContract(fixture.workdir, fixture.contract);
  return fixture;
}

export async function prepareDeliveryFixtureSeed() {
  const root = await mkdtemp(
    path.join(os.tmpdir(), "ty-context-delivery-seed-"),
  );
  try {
    await initializeSeedRepository(path.join(root, "default"));
    await initializeSeedRepository(path.join(root, "default-two-outcomes"), {
      twoOutcomes: true,
    });
    await initializeSeedRepository(path.join(root, "external"), {
      externalConfirmation: true,
    });
  } catch (error) {
    await rm(root, { recursive: true, force: true });
    throw error;
  }
  ownedFixtureSeeds.add(root);
  registerSeedCleanupHook();
  let cleaned = false;
  return {
    root,
    async cleanup() {
      if (cleaned) return;
      cleaned = true;
      ownedFixtureSeeds.delete(root);
      await rm(root, { recursive: true, force: true });
    },
  };
}

async function initializeSeedRepository(
  root,
  { externalConfirmation = false, twoOutcomes = false } = {},
) {
  await mkdir(path.join(root, "src"), { recursive: true });
  await mkdir(path.join(root, "tests"), { recursive: true });
  await mkdir(path.join(root, "artifacts"), { recursive: true });
  await mkdir(path.join(root, "project_context", "areas"), { recursive: true });
  await writeFile(
    path.join(root, "src", "state.json"),
    `${JSON.stringify({
      first: true,
      second: false,
      first_relations_applicable: false,
      second_relations_applicable: false,
    })}\n`,
  );
  await writeFile(
    path.join(root, "artifacts", "proof.json"),
    '{"fixture_proof":true}\n',
  );
  const manifest = packageAdmittedFixtureSemanticManifest({
    externalConfirmation,
    twoOutcomes,
  });
  await writeFixtureSourceAndOracle(
    root,
    {
      externalConfirmation,
      twoOutcomes,
      executionTarget: fixtureProcessExecutionTarget(),
    },
    manifest,
  );
  await installPackageMachineFixture(root, manifest);
  if (twoOutcomes) await preserveTwoOutcomeFailureBaseline(root);
  await writeFile(
    path.join(root, "tests", "semantic-false.json"),
    `${JSON.stringify({
      first: false,
      second: false,
      first_relations_applicable: false,
      second_relations_applicable: false,
    })}\n`,
  );
  await writeFile(
    path.join(root, "package.json"),
    `${JSON.stringify(
      {
        name: "fixture",
        private: true,
        tyContext: { harnessFolderName: ".codex" },
        scripts: { oracle: "node tests/oracle.mjs first" },
      },
      null,
      2,
    )}\n`,
  );
  await writeFile(
    path.join(root, "project_context", "global.md"),
    "# Global\n",
  );
  await writeFile(
    path.join(root, "project_context", "architecture.md"),
    "# Architecture\n",
  );
  await writeFile(
    path.join(root, "project_context", "areas", "main.md"),
    "# Main\n",
  );
  if (externalConfirmation) {
    const { publicKey } = generateKeyPairSync("ed25519");
    await mkdir(path.join(root, "project_context", "authorities"), {
      recursive: true,
    });
    await writeFile(
      path.join(root, ...FIXTURE_EXTERNAL_PUBLIC_KEY_REF.split("/")),
      publicKey.export({ type: "spki", format: "pem" }),
    );
  }
  await writeFile(
    path.join(root, "project_context", "context.toml"),
    `[[areas]]
id = "main"
root = "."
context = "project_context/areas/main.md"
kind = "app"
default = true
`,
  );
  await exec("git", ["init"], { cwd: root });
  await exec("git", ["config", "user.email", "fixture@example.test"], {
    cwd: root,
  });
  await exec("git", ["config", "user.name", "Fixture"], { cwd: root });
  await configureEphemeralFixtureRepository(root);
  await exec("git", ["add", "."], { cwd: root });
  await exec("git", ["commit", "-m", "fixture"], { cwd: root });
}

async function configureEphemeralFixtureRepository(root) {
  // These repositories are disposable test inputs. Crash-durability flushes and
  // background object maintenance add cost without changing the Git semantics
  // under test; production repositories retain their own Git configuration.
  for (const [key, value] of [
    ["core.fsync", "none"],
    ["maintenance.auto", "false"],
    ["gc.auto", "0"],
  ])
    await exec("git", ["config", "--local", key, value], { cwd: root });
}

async function preserveTwoOutcomeFailureBaseline(root) {
  const statePath = path.join(root, "src", "state.json");
  const state = JSON.parse(await readFile(statePath, "utf8"));
  state.first = true;
  state.second = false;
  await writeFile(statePath, `${JSON.stringify(state, null, 2)}\n`);
}

async function resolveFixtureSeedRoot(explicitRoot) {
  if (explicitRoot) return path.resolve(explicitRoot);
  if (process.env[fixtureSeedEnvironment])
    return path.resolve(process.env[fixtureSeedEnvironment]);
  standaloneSeedPromise ??= prepareDeliveryFixtureSeed();
  return (await standaloneSeedPromise).root;
}

async function assertSeedRepository(root) {
  for (const relative of [".git", "source.md", "package.json"]) {
    const info = await stat(path.join(root, relative)).catch(() => null);
    if (!info)
      throw new Error(
        `delivery_fixture_seed_invalid: missing ${relative} in ${root}`,
      );
  }
}

function registerSeedCleanupHook() {
  if (cleanupHookRegistered) return;
  cleanupHookRegistered = true;
  process.once("exit", () => {
    for (const root of ownedFixtureSeeds)
      rmSync(root, { recursive: true, force: true });
    ownedFixtureSeeds.clear();
  });
}

export function claimApplicability(outcomeKey = "first") {
  return {
    key: `${outcomeKey}-root-success`,
    target_ref: "fixture-app",
    journey_role: "success",
    dimensions: [{ key: "fixture-state", value: "loaded" }],
    given_refs: ["fixture-loaded"],
    when_refs: ["read-outcome"],
  };
}

export function deliveryContract(options = {}) {
  const architectureFacts = fixtureArchitectureFactSpecs(options);
  const externalConfirmations = options.externalConfirmation
    ? FIXTURE_EXTERNAL_FACT_SPECS.slice(
        0,
        options.externalConfirmationCount ?? 1,
      )
    : [];
  const externalFacts = fixtureExternalFactSpecs(options);
  const architectureFactForOutcome = (outcomeKey) => {
    const fact = architectureFacts.find(
      (candidate) => candidate.outcomeKey === outcomeKey,
    );
    if (!fact)
      throw new Error(`fixture_architecture_fact_missing:${outcomeKey}`);
    return fact;
  };
  const externalFactsForOutcome = (outcomeKey) =>
    externalFacts.filter((fact) => fact.outcomeKey === outcomeKey);
  const semanticManifest = packageAdmittedFixtureSemanticManifest(options);
  const semanticManifestSha256 = digestCanonical(semanticManifest);
  const executionTarget = fixtureProcessExecutionTarget();
  const check = (key, argument, outcomeKey) => ({
    key,
    journey_roles: ["success", "stage_gate"],
    execution_target: { target_ref: "fixture-app", entrypoint: "root" },
    scenario: {
      given: [{ key: "fixture-loaded", statement: "Load the fixture state." }],
      when: [{ key: "read-outcome", statement: "Read the selected outcome." }],
    },
    proof_surface: "runtime_behavior",
    runner: {
      type: "project_binary",
      target: fixtureProductRootPath(),
      argv: fixtureProductRootArgv("tests/oracle.mjs", argument),
      cwd: ".",
      timeout_ms: options.checkTimeoutMs ?? 30000,
      effect: "read_only",
      retry_policy: "none",
      idempotent: true,
    },
    verification_inputs: ["tests/semantic-false.json"],
    input_paths: ["src/**"],
    expected_output_paths: [],
    artifact_globs: ["artifacts/proof.json"],
    positive_assertions: [
      {
        key: `${outcomeKey}-result`,
        criterion: `${outcomeKey} is observable and implemented.`,
        claims: ["result"],
        applicability_ref: `${outcomeKey}-root-success`,
        observation: "result",
        evidence_capabilities: ["target_runtime"],
        operator: "equals",
        expected: true,
      },
      {
        key: `${outcomeKey}-semantic-fact`,
        criterion: `${outcomeKey}'s atomic observable-result Fact is proven against its frozen Source oracle.`,
        claims: [`semantic_fact.fact.${outcomeKey}.observable`],
        applicability_ref: `${outcomeKey}-root-success`,
        observation: "semantic_fact_result",
        evidence_capabilities: ["semantic_fact"],
        operator: "equals",
        expected: true,
      },
      ...(outcomeKey === "first"
        ? [
            {
              key: "first-architecture",
              criterion:
                "Preserve the fixture state owner and verifier boundary.",
              claims: ["obligation.architecture-first"],
              applicability_ref: "first-root-success",
              observation: "architecture_result",
              evidence_capabilities: ["target_runtime"],
              operator: "equals",
              expected: true,
            },
          ]
        : []),
      {
        key: `${outcomeKey}-architecture-semantic-fact`,
        criterion:
          "The fixture state owner and verifier boundary remains an exact architecture Fact.",
        claims: [
          `semantic_fact.${architectureFactForOutcome(outcomeKey).factKey}`,
        ],
        applicability_ref: `${outcomeKey}-root-success`,
        observation: "architecture_semantic_fact_result",
        evidence_capabilities: ["semantic_fact"],
        operator: "equals",
        expected: true,
      },
      {
        key: `${outcomeKey}-requirement`,
        criterion: `${outcomeKey} satisfies its observable requirement.`,
        claims: [`requirement.observe-${outcomeKey}`],
        applicability_ref: `${outcomeKey}-root-success`,
        observation: "requirement_result",
        evidence_capabilities: ["target_runtime"],
        operator: "equals",
        expected: true,
      },
      {
        key: `${outcomeKey}-obligation`,
        criterion: `${outcomeKey} satisfies its implementation obligation.`,
        claims: [`obligation.implement-${outcomeKey}`],
        applicability_ref: `${outcomeKey}-root-success`,
        observation: "obligation_result",
        evidence_capabilities: ["target_runtime"],
        operator: "equals",
        expected: true,
      },
      {
        key: `${outcomeKey}-liveness`,
        criterion: `${outcomeKey} target remains live during semantic mutation.`,
        claims: [],
        observation: "target_live",
        evidence_capabilities: ["target_runtime"],
        operator: "equals",
        expected: true,
      },
    ],
    negative_assertions: [
      {
        key: `${outcomeKey}-relations-na`,
        criterion:
          "Cross-Control relations are not applicable when the Outcome declares no Controls.",
        claims: ["control_relation_closure"],
        applicability_ref: `${outcomeKey}-root-success`,
        observation: "relations_applicable",
        evidence_capabilities: ["target_runtime"],
        operator: "equals",
        expected: false,
      },
    ],
    environment_requirements: [
      {
        key: `${outcomeKey}-fixture-scope`,
        kind: "env_var",
        target:
          outcomeKey === "first"
            ? FIXTURE_FIRST_SCOPE_ENV
            : FIXTURE_SECOND_SCOPE_ENV,
      },
    ],
  });
  const outcome = (key, argument, dependsOn = []) => ({
    key,
    title: `${key} title`,
    stage: key,
    depends_on: dependsOn,
    applicability: [claimApplicability(key)],
    semantic_fact_bindings: {
      manifest_ref: semanticManifest.key,
      facts: [
        {
          fact_ref: `fact.${key}.observable`,
          claim_ref: `semantic_fact.fact.${key}.observable`,
          applicability_ref: `${key}-root-success`,
        },
        {
          fact_ref: architectureFactForOutcome(key).factKey,
          claim_ref: `semantic_fact.${architectureFactForOutcome(key).factKey}`,
          applicability_ref: `${key}-root-success`,
        },
        ...externalFactsForOutcome(key).map((external) => ({
          fact_ref: external.factKey,
          claim_ref: `semantic_fact.${external.factKey}`,
          applicability_ref: `${key}-root-success`,
        })),
      ],
      proofs: [
        {
          proof_ref: `proof.${key}.observable.exact`,
          fact_ref: `fact.${key}.observable`,
          method: "exact_value",
          proof_surface: "runtime_behavior",
          evidence_capabilities: ["semantic_fact"],
          authority: "machine",
          check_ref: `${key}-check`,
          assertion_ref: `${key}-semantic-fact`,
        },
        {
          proof_ref: architectureFactForOutcome(key).proofKey,
          fact_ref: architectureFactForOutcome(key).factKey,
          method: "exact_value",
          proof_surface: "runtime_behavior",
          evidence_capabilities: ["semantic_fact"],
          authority: "machine",
          check_ref: `${key}-check`,
          assertion_ref: `${key}-architecture-semantic-fact`,
        },
        ...externalFactsForOutcome(key).map((external) => ({
          proof_ref: external.proofKey,
          fact_ref: external.factKey,
          method: "exact_value",
          proof_surface: "runtime_behavior",
          evidence_capabilities: ["semantic_fact"],
          authority: "external_confirmation",
          confirmation_ref: external.confirmationKey,
        })),
      ],
    },
    product: {
      observable_result: `${key} becomes observable`,
      result_applicability_refs: [`${key}-root-success`],
      success_path_required: true,
      degradation_path_required: false,
      owner: {
        label: "fixture",
        context_refs: ["project_context/areas/main.md"],
        path_globs: [
          "src/**",
          "bin/**",
          "tests/oracle.mjs",
          FIXTURE_LEGACY_ORACLE_PATH,
        ],
      },
      requirements: [
        {
          key: `observe-${key}`,
          statement: `The ${key} outcome must be observable.`,
          required_proof_surfaces: ["runtime_behavior"],
          applicability_refs: [`${key}-root-success`],
        },
      ],
      owner_surfaces: [],
      controls: [],
      control_relation_closure: {
        state: "not_applicable",
        statement: "This Outcome declares no user-visible Controls.",
        applicability_refs: [`${key}-root-success`],
      },
      control_relations: [],
      surface_bindings: [],
      non_completing_outcomes: [],
    },
    technical: {
      obligations: [
        {
          key: `implement-${key}`,
          statement: `Implement ${key}`,
          required_proof_surfaces: ["runtime_behavior"],
          applicability_refs: [`${key}-root-success`],
        },
        ...(key === "first"
          ? [
              {
                key: "architecture-first",
                statement:
                  "Preserve the fixture state owner and verifier boundary.",
                required_proof_surfaces: ["runtime_behavior"],
                applicability_refs: ["first-root-success"],
              },
            ]
          : []),
      ],
      expected_change_paths: ["src/**"],
      allowed_support_paths: [
        "bin/**",
        "tests/oracle.mjs",
        FIXTURE_LEGACY_ORACLE_PATH,
      ],
      forbidden_paths: ["secrets/**"],
      forbidden_shortcuts: [],
      bindings: [
        {
          key: `product-root-${key}`,
          kind: "file",
          target: fixtureProductRootPath(),
          carrier_paths: [fixtureProductRootPath()],
          existence: "existing",
        },
        {
          key: `product-module-${key}`,
          kind: "file",
          target: "tests/oracle.mjs",
          carrier_paths: ["tests/oracle.mjs"],
          existence: "existing",
        },
        {
          key: `state-${key}`,
          kind: "file",
          target: "src/state.json",
          carrier_paths: ["src/state.json"],
          existence: "existing",
        },
      ],
      rollback_and_recovery: null,
    },
    acceptance: {
      checks: [check(`${key}-check`, argument, key)],
      population: null,
      counterfactual_controls: [],
    },
  });
  return {
    schema_version: "long-task-delivery-v2",
    semantic_fact_manifest: {
      key: semanticManifest.key,
      source_path: "source.md",
      sha256: semanticManifestSha256,
    },
    task: {
      id: "fixture-task",
      title: "Fixture task",
      goal: "Prove the declared fixture outcomes.",
      target_profile: {
        key: "fixture-target",
        description:
          "The executable fixture is usable through its declared root.",
        required_state: "target_profile_usable",
        required_target_refs: ["fixture-app"],
      },
      execution_targets: [executionTarget],
      source_paths: ["source.md"],
      context_refs: ["project_context/areas/main.md"],
      context_snapshot_mode: "full",
    },
    source_claims: [
      {
        key: "first-observable",
        source_ref: "source.md#fixture-source",
        statement: "The first outcome must be observable.",
        disposition: {
          type: "claim",
          refs: ["first.requirement.observe-first"],
        },
      },
      ...(options.twoOutcomes
        ? [
            {
              key: "second-observable",
              source_ref: "source.md",
              statement: "The second outcome must be observable.",
              disposition: {
                type: "claim",
                refs: ["second.requirement.observe-second"],
              },
            },
          ]
        : []),
      {
        key: "fixture-architecture",
        source_ref: "source.md",
        statement: "Preserve the fixture state owner and verifier boundary.",
        disposition: {
          type: "claim",
          refs: ["first.obligation.architecture-first"],
        },
      },
      {
        key: "fixture-execution-target",
        source_ref: "source.md#fixture-source",
        statement: executionTargetSourceStatement(executionTarget),
        disposition: {
          type: "claim",
          refs: ["execution_target.fixture-app"],
        },
      },
      ...externalConfirmations.map((external) => ({
        key: external.sourceKey,
        source_ref: `source.md#${external.sourceKey}`,
        statement: fixtureSourceStatements[external.sourceKey],
        disposition: {
          type: "external_confirmation",
          refs: [external.confirmationKey],
        },
      })),
    ],
    stages: options.twoOutcomes
      ? [
          {
            key: "first",
            title: "First",
            depends_on: [],
            gate_outcome: "first",
          },
          {
            key: "second",
            title: "Second",
            depends_on: ["first"],
            gate_outcome: "second",
          },
        ]
      : [
          {
            key: "first",
            title: "First",
            depends_on: [],
            gate_outcome: "first",
          },
        ],
    risk: {
      requested_level: "auto",
      facts: {
        public_api_or_schema_change: [],
        persistent_data_change: [],
        data_migration: [],
        security_boundary_change: [],
        permission_boundary_change: [],
        irreversible_external_effect: [],
        critical_user_path: [],
        full_population_operation: [],
        multi_repository_change: [],
        weak_observability: [],
      },
    },
    global: {
      applicability: [],
      product: { non_goals: [] },
      technical: {
        constraints: [],
        forbidden_paths: [{ key: "no-secrets", path: "secrets/**" }],
        forbidden_shortcuts: [],
      },
      acceptance: {
        checks: [],
        counterfactual_controls: [],
        external_confirmations: externalConfirmations.map((external) => ({
          key: external.confirmationKey,
          description: fixtureSourceStatements[external.sourceKey],
          owner: "release-owner",
          kind: "field_validation",
          impact_claims: externalFacts
            .filter((fact) => fact.sourceKey === external.sourceKey)
            .map((fact) => `${fact.outcomeKey}.semantic_fact.${fact.factKey}`),
          blocks_target: false,
        })),
      },
    },
    outcomes: options.twoOutcomes
      ? [outcome("first", "first"), outcome("second", "first", ["first"])]
      : [outcome("first", "first")],
  };
}

export function addProductionControlBinding(
  contract,
  {
    outcomeKey = "first",
    controlKey,
    surfaceRef = "fixture-main",
    targetRef = "fixture-app",
    rootCheckRef = `${outcomeKey}-check`,
    entryActionRef = "read-outcome",
    rootClaimRef = null,
    designTargets = [],
    acceptanceBlockers = [],
  },
) {
  const outcome = contract.outcomes.find((item) => item.key === outcomeKey);
  if (!outcome) throw new Error(`fixture_outcome_unknown:${outcomeKey}`);
  if (!outcome.product.owner_surfaces.includes(surfaceRef))
    outcome.product.owner_surfaces.push(surfaceRef);
  const carrierRef = `state-${outcomeKey}`;
  outcome.product.surface_bindings.push({
    key: `${controlKey}-${targetRef}`,
    surface_ref: surfaceRef,
    target_ref: targetRef,
    control_refs: [controlKey],
    route_binding_ref: carrierRef,
    component_binding_refs: [carrierRef],
    root_journey_check_ref: rootCheckRef,
    entry_action_ref: entryActionRef,
    design_targets: designTargets,
    acceptance_blockers: acceptanceBlockers,
  });
  if (rootClaimRef) {
    const check = outcome.acceptance.checks.find(
      (item) => item.key === rootCheckRef,
    );
    if (!check) throw new Error(`fixture_check_unknown:${rootCheckRef}`);
    const control = outcome.product.controls.find(
      (item) => item.key === controlKey,
    );
    if (!control) throw new Error(`fixture_control_unknown:${controlKey}`);
    addControlAssertions(outcome, check, control, rootClaimRef, targetRef);
  }
  return outcome.product.surface_bindings.at(-1);
}

const controlFields = [
  "surface",
  "region",
  "location",
  "control_type",
  "label_content",
  "user_task",
  "visibility",
  "availability",
  "trigger",
  "input",
  "validation",
  "default_value",
  "interaction",
  "navigation_result",
  "loading_state",
  "empty_state",
  "success_state",
  "failure_state",
  "recovery",
  "permission",
  "feedback",
  "accessibility",
];

const controlClaimField = {
  loading_state: "loading",
  empty_state: "empty",
  success_state: "success",
  failure_state: "failure",
};

export function completeControl(
  control,
  { outcomeKey = "first", unresolvedFields = [] } = {},
) {
  const unresolved = new Set(unresolvedFields);
  const specified = controlFields.filter(
    (field) => !unresolved.has(field) && String(control[field] ?? "").trim(),
  );
  const notApplicable = controlFields.filter(
    (field) => !unresolved.has(field) && !String(control[field] ?? "").trim(),
  );
  for (const field of controlFields)
    if (!Object.hasOwn(control, field)) control[field] = "";
  control.field_coverage = [
    ...(specified.length
      ? [
          {
            fields: specified,
            state: "specified",
            applicability_refs: [`${outcomeKey}-root-success`],
          },
        ]
      : []),
    ...(notApplicable.length
      ? [
          {
            fields: notApplicable,
            state: "not_applicable",
            statement: `These ${control.key} Control fields do not apply to the declared interaction.`,
            applicability_refs: [`${outcomeKey}-root-success`],
          },
        ]
      : []),
    ...(unresolved.size
      ? [
          {
            fields: [...unresolved],
            state: "unresolved",
            statement: `These ${control.key} Control fields remain unresolved.`,
          },
        ]
      : []),
  ];
  return control;
}

function addControlAssertions(
  outcome,
  check,
  control,
  rootClaimRef,
  targetRef,
) {
  const profile =
    outcome.applicability.find((item) => item.target_ref === targetRef) ??
    outcome.applicability[0];
  for (const entry of control.field_coverage) {
    if (entry.state === "unresolved") continue;
    for (const field of entry.fields) {
      const suffix = controlClaimField[field] ?? field;
      const claim = `control.${control.key}.${suffix}`;
      const key = `${control.key}-${suffix.replaceAll("_", "-")}-proof`;
      const assertion = {
        key,
        criterion:
          entry.state === "specified" ? control[field] : entry.statement,
        claims: [claim],
        applicability_ref: profile.key,
        observation: `control_${control.key}_${suffix}`,
        evidence_capabilities:
          claim === rootClaimRef
            ? ["interaction_trace", "target_runtime"]
            : ["state_delta"],
        operator: "equals",
        expected: entry.state === "specified",
      };
      const assertions =
        entry.state === "specified"
          ? check.positive_assertions
          : check.negative_assertions;
      if (!assertions.some((candidate) => candidate.key === key))
        assertions.push(assertion);
      const sensitivity = outcome.acceptance.counterfactual_controls.find(
        (candidate) => candidate.check_key === check.key,
      );
      if (sensitivity) {
        if (!sensitivity.claims.includes(claim)) sensitivity.claims.push(claim);
        if (!sensitivity.expected_assertion_failures.includes(key))
          sensitivity.expected_assertion_failures.push(key);
      }
    }
  }
}

function addDefaultSensitivityControls(contract) {
  for (const outcome of contract.outcomes) {
    const architectureFact = outcome.semantic_fact_bindings.facts.find(
      (binding) => binding.fact_ref.includes(".architecture-boundary"),
    );
    if (!architectureFact)
      throw new Error(`fixture_architecture_binding_missing:${outcome.key}`);
    outcome.acceptance.counterfactual_controls = [
      {
        key: `remove-${outcome.key}-state`,
        binding_key: `state-${outcome.key}`,
        claims: [
          "result",
          `requirement.observe-${outcome.key}`,
          `obligation.implement-${outcome.key}`,
          `semantic_fact.fact.${outcome.key}.observable`,
          architectureFact.claim_ref,
          ...(outcome.key === "first" ? ["obligation.architecture-first"] : []),
        ],
        check_key: `${outcome.key}-check`,
        mutation: {
          type: "replace_json_value",
          path: "src/state.json",
          pointer: `/${outcome.key}`,
          value: false,
        },
        expected_assertion_failures: [
          `${outcome.key}-result`,
          `${outcome.key}-semantic-fact`,
          `${outcome.key}-architecture-semantic-fact`,
          `${outcome.key}-requirement`,
          `${outcome.key}-obligation`,
          ...(outcome.key === "first" ? ["first-architecture"] : []),
        ],
        preserved_assertions: [`${outcome.key}-liveness`],
      },
      {
        key: `make-${outcome.key}-relations-applicable`,
        binding_key: `state-${outcome.key}`,
        claims: ["control_relation_closure"],
        check_key: `${outcome.key}-check`,
        mutation: {
          type: "replace_json_value",
          path: "src/state.json",
          pointer: `/${outcome.key}_relations_applicable`,
          value: true,
        },
        expected_assertion_failures: [`${outcome.key}-relations-na`],
        preserved_assertions: [`${outcome.key}-liveness`],
      },
    ];
  }
}

export function fixtureArchitectureSourceItem() {
  return `<!-- ty-source-item:start key=fixture-architecture kind=technical_obligation aspect=architecture -->
Preserve the fixture state owner and verifier boundary.
<!-- ty-source-item:end -->`;
}

export function fixtureExecutionTargetSourceItem(
  executionTarget = fixtureProcessExecutionTarget(),
) {
  const item = fixtureExecutionTargetSourceRecord(executionTarget);
  return `<!-- ty-source-item:start key=${item.key} kind=${item.kind} aspect=${item.aspect} -->
${item.statement}
<!-- ty-source-item:end -->`;
}

export function fixtureExecutionTargetSourceRecord(
  executionTarget = fixtureProcessExecutionTarget(),
) {
  return {
    key: "fixture-execution-target",
    kind: "technical_obligation",
    aspect: "architecture",
    statement: executionTargetSourceStatement(executionTarget),
  };
}

export async function synchronizeFixtureExecutionTargetSource(
  root,
  contract,
  targetRef = "fixture-app",
) {
  const executionTarget = contract.task.execution_targets.find(
    (target) => target.key === targetRef,
  );
  if (!executionTarget)
    throw new Error(`fixture_execution_target_missing:${targetRef}`);
  const statement = executionTargetSourceStatement(executionTarget);
  const sourcePath = path.join(root, "source.md");
  const source = await readFile(sourcePath, "utf8");
  const pattern =
    /(<!-- ty-source-item:start key=fixture-execution-target\b[^>]*-->\r?\n)[\s\S]*?(\r?\n<!-- ty-source-item:end -->)/u;
  if (!pattern.test(source))
    throw new Error("fixture_execution_target_source_item_missing");
  await writeFile(sourcePath, source.replace(pattern, `$1${statement}$2`));
  const sourceClaim = contract.source_claims.find(
    (claim) => claim.key === "fixture-execution-target",
  );
  if (!sourceClaim)
    throw new Error("fixture_execution_target_source_claim_missing");
  sourceClaim.statement = statement;
}

export async function writeContract(
  workdir,
  contract,
  { synchronizeSemanticManifest = true, designSemanticProjection } = {},
) {
  synchronizeFixtureExternalAuthentication(contract);
  await ensureFixtureExternalPublicKey(workdir, contract);
  if (
    synchronizeSemanticManifest &&
    contract.task?.id === "fixture-task" &&
    Array.isArray(contract.outcomes)
  )
    await synchronizeFixtureSemanticManifest(workdir, contract, {
      designSemanticProjection,
    });
  await writeFile(
    path.join(workdir, "delivery-contract.yaml"),
    YAML.stringify(contract, { lineWidth: 0 }),
  );
}

async function ensureFixtureExternalPublicKey(workdir, contract) {
  const required = (
    contract.global?.acceptance?.external_confirmations ?? []
  ).some(
    (confirmation) =>
      confirmation.blocks_target &&
      confirmation.actor?.identity_assurance?.scheme === "ed25519" &&
      confirmation.actor.identity_assurance.public_key_ref ===
        FIXTURE_EXTERNAL_PUBLIC_KEY_REF,
  );
  if (!required) return;
  const root = path.dirname(path.resolve(workdir));
  const keyPath = path.join(
    root,
    ...FIXTURE_EXTERNAL_PUBLIC_KEY_REF.split("/"),
  );
  if (
    await stat(keyPath)
      .then(() => true)
      .catch(() => false)
  )
    return;
  const { publicKey } = generateKeyPairSync("ed25519");
  await mkdir(path.dirname(keyPath), { recursive: true });
  await writeFile(keyPath, publicKey.export({ type: "spki", format: "pem" }));
}

export function synchronizeFixtureExternalAuthentication(contract) {
  for (const confirmation of contract.global?.acceptance
    ?.external_confirmations ?? []) {
    if (
      confirmation.blocks_target &&
      confirmation.actor &&
      !confirmation.actor.identity_assurance
    )
      confirmation.actor.identity_assurance = {
        scheme: "ed25519",
        key_id: "fixture-owner-2026",
        public_key_ref: FIXTURE_EXTERNAL_PUBLIC_KEY_REF,
      };
    for (const obligation of confirmation.obligations ?? []) {
      if (obligation.result_kind !== "judgment") continue;
      const requestedSource = obligation.judgment_basis?.source_ref;
      const sourceClaim = contract.source_claims?.find(
        (claim) =>
          (!requestedSource || claim.key === requestedSource) &&
          (sourceClaimTargets(claim.disposition, obligation.claim_ref) ||
            (claim.disposition.type === "external_confirmation" &&
              claim.disposition.refs.includes(confirmation.key))),
      );
      if (!sourceClaim) continue;
      const kind =
        obligation.judgment_basis?.kind ??
        (confirmation.actor?.authority_kind === "expert"
          ? "expert_assessment"
          : "authorization");
      sourceClaim.judgment_basis = {
        kind,
        claim_ref: obligation.claim_ref,
        applicability_refs: [obligation.applicability_ref],
      };
      obligation.judgment_basis = {
        kind,
        source_ref: sourceClaim.key,
      };
    }
  }
}

function sourceClaimTargets(disposition, claimRef) {
  if (!disposition || typeof disposition !== "object") return false;
  if (disposition.type === "claim" || disposition.type === "global_constraint")
    return disposition.refs.includes(claimRef);
  if (disposition.type === "outcome_result")
    return disposition.ref === claimRef;
  return false;
}

export async function readState(root) {
  return JSON.parse(
    await readFile(path.join(root, "src", "state.json"), "utf8"),
  );
}

export async function runCli(cwd, args, options = {}) {
  const { skipCandidateCommit = false, ...execOptions } = options;
  if (
    !skipCandidateCommit &&
    args[0] === "long-task" &&
    args[1] === "final-gate"
  )
    await commitCandidate(cwd);
  const result = await exec(process.execPath, [cli, ...args], {
    cwd,
    windowsHide: true,
    ...execOptions,
  });
  return parseCliJson(result.stdout);
}

export async function commitCandidate(cwd) {
  await exec("git", ["add", "-A"], { cwd, windowsHide: true });
  await exec("git", ["commit", "--allow-empty", "-m", "candidate"], {
    cwd,
    windowsHide: true,
  });
}

export async function runCliFailure(cwd, args, options = {}) {
  try {
    await runCli(cwd, args, options);
    throw new Error(`expected command failure: ${args.join(" ")}`);
  } catch (error) {
    if (!error.stdout) throw error;
    return parseCliJson(error.stdout);
  }
}

export function parseCliJson(stdout) {
  const text = stdout.trim();
  try {
    return JSON.parse(text);
  } catch {}
  const line = text.split(/\r?\n/u).at(-1);
  try {
    return JSON.parse(line);
  } catch {
    return { text };
  }
}

export async function pathExists(file) {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
}
