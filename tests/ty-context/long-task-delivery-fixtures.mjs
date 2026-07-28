import { execFile } from "node:child_process";
import { rmSync } from "node:fs";
import {
  cp,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import YAML from "yaml";

const exec = promisify(execFile);
const repo = fileURLToPath(new URL("../..", import.meta.url));
const cli = path.join(repo, "packages/ty-context/dist/cli.js");
const fixtureSeedEnvironment = "TY_CONTEXT_DELIVERY_FIXTURE_SEED_ROOT";
const ownedFixtureSeeds = new Set();
let standaloneSeedPromise = null;
let cleanupHookRegistered = false;

export async function createDeliveryFixture(options = {}) {
  const root = await mkdtemp(path.join(os.tmpdir(), "ty-context-delivery-"));
  try {
    const seedRoot = await resolveFixtureSeedRoot(options.fixtureSeedRoot);
    const variant = options.externalConfirmation ? "external" : "default";
    const template = path.join(seedRoot, variant);
    await assertSeedRepository(template);
    await cp(template, root, { recursive: true, force: true });
  } catch (error) {
    await rm(root, { recursive: true, force: true });
    throw error;
  }
  const workdir = path.join(root, ".long-task");
  await mkdir(workdir, { recursive: true });
  const contract = deliveryContract(options);
  addDefaultSensitivityControls(contract);
  await writeContract(workdir, contract);
  return { root, workdir, contract };
}

export async function prepareDeliveryFixtureSeed() {
  const root = await mkdtemp(
    path.join(os.tmpdir(), "ty-context-delivery-seed-"),
  );
  try {
    await initializeSeedRepository(path.join(root, "default"), false);
    await initializeSeedRepository(path.join(root, "external"), true);
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

async function initializeSeedRepository(root, externalConfirmation) {
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
  await writeFile(
    path.join(root, "source.md"),
    `<!-- ty-source-background:start key=fixture-heading reason=markdown-structure -->
<a id="fixture-source"></a>
<!-- ty-source-background:end -->

<!-- ty-source-item:start key=first-observable kind=requirement -->
The first outcome must be observable.
<!-- ty-source-item:end -->

<!-- ty-source-item:start key=fixture-architecture kind=technical_obligation aspect=architecture -->
Preserve the fixture state owner and verifier boundary.
<!-- ty-source-item:end -->
${
  externalConfirmation
    ? `
<!-- ty-source-background:start key=fixture-external-heading reason=markdown-structure -->
<a id="fixture-external"></a>
<!-- ty-source-background:end -->

<!-- ty-source-item:start key=fixture-external kind=external_confirmation -->
Confirm the fixture in external delivery.
<!-- ty-source-item:end -->
`
    : ""
}
`,
  );
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
    path.join(root, "tests", "oracle.mjs"),
    `import { readFile } from "node:fs/promises";
let state = { first: false, second: false };
try { state = JSON.parse(await readFile(new URL("../src/state.json", import.meta.url), "utf8")); } catch {}
const key = process.argv[2] || "first";
const assertionKeys = [
  \`${"${key}"}-result\`,
  \`${"${key}"}-requirement\`,
  \`${"${key}"}-obligation\`,
  \`${"${key}"}-relations-na\`,
  ...(key === "first" ? ["first-architecture"] : []),
];
const targetRecord = (assertionKey) => ({
  assertion_key: assertionKey,
  capability: "target_runtime",
  target_ref: "fixture-app",
  root_entrypoint: "tests/oracle.mjs",
  session_id: \`fixture-${"${key}"}-session\`,
  cold_start: true
});
const stateRecord = (assertionKey) => ({
  assertion_key: assertionKey,
  capability: "state_delta",
  before_sha256: "0".repeat(64),
  after_sha256: "1".repeat(64),
  changed_fields: [key]
});
console.log(JSON.stringify({
  schema_version: "long-task-check-result-v3",
  execution_status: "completed",
  observations: {
    result: state[key],
    requirement_result: state[key],
    obligation_result: state[key],
    architecture_result: state.first,
    relations_applicable: state[\`${"${key}"}_relations_applicable\`],
    target_live: true,
    negative: false,
    population: {
      universe_ids: [key],
      eligible_ids: [key],
      observed_ids: state[key] ? [key] : [],
      excluded_items: []
    }
  },
  evidence_records: [
    ...assertionKeys.flatMap((assertionKey) => [
      targetRecord(assertionKey),
      stateRecord(assertionKey)
    ]),
    targetRecord(\`${"${key}"}-liveness\`)
  ]
}));
`,
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
  await writeFile(path.join(root, "project_context", "global.md"), "# Global\n");
  await writeFile(
    path.join(root, "project_context", "architecture.md"),
    "# Architecture\n",
  );
  await writeFile(
    path.join(root, "project_context", "areas", "main.md"),
    "# Main\n",
  );
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
      type: "node_oracle",
      target: "tests/oracle.mjs",
      argv: [argument],
      cwd: ".",
      timeout_ms: 30000,
      effect: "read_only",
      retry_policy: "none",
      idempotent: true,
    },
    verification_inputs: [
      "tests/oracle.mjs",
      "tests/semantic-false.json",
    ],
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
        evidence_capabilities: ["target_runtime", "state_delta"],
        operator: "equals",
        expected: true,
      },
      ...(outcomeKey === "first"
        ? [
            {
              key: "first-architecture",
              criterion: "Preserve the fixture state owner and verifier boundary.",
              claims: ["obligation.architecture-first"],
              applicability_ref: "first-root-success",
              observation: "architecture_result",
              evidence_capabilities: ["target_runtime", "state_delta"],
              operator: "equals",
              expected: true,
            },
          ]
        : []),
      {
        key: `${outcomeKey}-requirement`,
        criterion: `${outcomeKey} satisfies its observable requirement.`,
        claims: [`requirement.observe-${outcomeKey}`],
        applicability_ref: `${outcomeKey}-root-success`,
        observation: "requirement_result",
        evidence_capabilities: ["target_runtime", "state_delta"],
        operator: "equals",
        expected: true,
      },
      {
        key: `${outcomeKey}-obligation`,
        criterion: `${outcomeKey} satisfies its implementation obligation.`,
        claims: [`obligation.implement-${outcomeKey}`],
        applicability_ref: `${outcomeKey}-root-success`,
        observation: "obligation_result",
        evidence_capabilities: ["target_runtime", "state_delta"],
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
        evidence_capabilities: ["target_runtime", "state_delta"],
        operator: "equals",
        expected: false,
      },
    ],
    environment_requirements: [],
  });
  const outcome = (key, argument, dependsOn = []) => ({
    key,
    title: `${key} title`,
    stage: key,
    depends_on: dependsOn,
    applicability: [claimApplicability(key)],
    product: {
      observable_result: `${key} becomes observable`,
      result_applicability_refs: [`${key}-root-success`],
      success_path_required: true,
      degradation_path_required: false,
      owner: {
        label: "fixture",
        context_refs: ["project_context/areas/main.md"],
        path_globs: ["src/**"],
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
      allowed_support_paths: [],
      forbidden_paths: ["secrets/**"],
      forbidden_shortcuts: [],
      bindings: [
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
    task: {
      id: "fixture-task",
      title: "Fixture task",
      goal: "Prove the declared fixture outcomes.",
      target_profile: {
        key: "fixture-target",
        description: "The executable fixture is usable through its declared root.",
        required_state: "target_profile_usable",
        required_target_refs: ["fixture-app"],
      },
      execution_targets: [
        {
          key: "fixture-app",
          description: "The fixture process entrypoint.",
          role: "product",
          runtime_family: "process",
          root_entrypoint: "tests/oracle.mjs",
          capabilities: [
            "process-runtime",
            "cold-start",
            "production-root",
          ],
        },
      ],
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
      {
        key: "fixture-architecture",
        source_ref: "source.md",
        statement: "Preserve the fixture state owner and verifier boundary.",
        disposition: {
          type: "claim",
          refs: ["first.obligation.architecture-first"],
        },
      },
      ...(options.externalConfirmation
        ? [
            {
              key: "fixture-external",
              source_ref: "source.md#fixture-external",
              statement: "Confirm the fixture in external delivery.",
              disposition: {
                type: "external_confirmation",
                refs: ["fixture-external"],
              },
            },
          ]
        : []),
    ],
    stages: options.twoOutcomes
      ? [
          { key: "first", title: "First", depends_on: [], gate_outcome: "first" },
          { key: "second", title: "Second", depends_on: ["first"], gate_outcome: "second" },
        ]
      : [
          { key: "first", title: "First", depends_on: [], gate_outcome: "first" },
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
        external_confirmations: options.externalConfirmation
          ? [
              {
                key: "fixture-external",
                description: "Confirm the fixture in external delivery.",
                owner: "release-owner",
                kind: "field_validation",
                impact_claims: ["first.result"],
                blocks_target: false,
              },
            ]
          : [],
      },
    },
    outcomes: options.twoOutcomes
      ? [outcome("first", "first"), outcome("second", "second", ["first"])]
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

function addControlAssertions(outcome, check, control, rootClaimRef, targetRef) {
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
          entry.state === "specified"
            ? control[field]
            : entry.statement,
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
        if (!sensitivity.claims.includes(claim))
          sensitivity.claims.push(claim);
        if (!sensitivity.expected_assertion_failures.includes(key))
          sensitivity.expected_assertion_failures.push(key);
      }
    }
  }
}

function addDefaultSensitivityControls(contract) {
  for (const outcome of contract.outcomes)
    outcome.acceptance.counterfactual_controls = [
      {
        key: `remove-${outcome.key}-state`,
        binding_key: `state-${outcome.key}`,
        claims: [
          "result",
          `requirement.observe-${outcome.key}`,
          `obligation.implement-${outcome.key}`,
          ...(outcome.key === "first"
            ? ["obligation.architecture-first"]
            : []),
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

export function fixtureArchitectureSourceItem() {
  return `<!-- ty-source-item:start key=fixture-architecture kind=technical_obligation aspect=architecture -->
Preserve the fixture state owner and verifier boundary.
<!-- ty-source-item:end -->`;
}

export async function writeContract(workdir, contract) {
  await writeFile(
    path.join(workdir, "delivery-contract.yaml"),
    YAML.stringify(contract, { lineWidth: 0 }),
  );
}

export async function readState(root) {
  return JSON.parse(await readFile(path.join(root, "src", "state.json"), "utf8"));
}

export async function runCli(cwd, args, options = {}) {
  const { skipCandidateCommit = false, ...execOptions } = options;
  if (!skipCandidateCommit && args[0] === "long-task" && args[1] === "final-gate")
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
    await import("node:fs/promises").then(({ access }) => access(file));
    return true;
  } catch {
    return false;
  }
}
