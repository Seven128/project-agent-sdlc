import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { compileDeliveryContract } from "../../packages/ty-context/dist/lib/long-task-delivery-compiler.js";
import { projectAuthorityRevisionDecision } from "../../packages/ty-context/dist/lib/long-task-authority-revision-summary.js";
import { revisionFixtureOracleSource } from "./long-task-delegating-oracle-fixture.mjs";
import {
  fixtureProductRootArgv,
  fixtureProductRootPath,
} from "./long-task-package-machine-fixture.mjs";
import { synchronizeFixtureExecutionTargetSource } from "./long-task-delivery-fixtures.mjs";

export async function prepareAuthorityRevisionFixture(fixture) {
  const check = fixture.contract.outcomes[0].acceptance.checks[0];
  const outcome = fixture.contract.outcomes[0];
  await writeFile(
    path.join(fixture.root, "tests", "revision-oracle.mjs"),
    revisionFixtureOracleSource(),
  );
  await writeFile(
    path.join(fixture.root, "tests", "helper.mjs"),
    "export const helper = true;\n",
  );
  await writeFile(path.join(fixture.root, "src", "extra.json"), "true\n");
  await mkdir(path.join(fixture.root, "artifacts"), { recursive: true });
  await writeFile(
    path.join(fixture.root, "artifacts", "proof.json"),
    '{"proved":true}\n',
  );
  await writeFile(
    path.join(fixture.root, "artifacts", "optional-proof.json"),
    '{"optional":true}\n',
  );
  const rootArgv = fixtureProductRootArgv("tests/revision-oracle.mjs", "first");
  fixture.contract.task.execution_targets[0].root_entrypoint =
    fixtureProductRootPath();
  fixture.contract.task.execution_targets[0].root_argv = rootArgv;
  const productModule = outcome.technical.bindings.find(
    (binding) => binding.key === "product-module-first",
  );
  productModule.target = "tests/revision-oracle.mjs";
  productModule.carrier_paths = ["tests/revision-oracle.mjs"];
  outcome.product.owner.path_globs = outcome.product.owner.path_globs.filter(
    (entry) => entry !== "tests/oracle.mjs",
  );
  outcome.technical.allowed_support_paths =
    outcome.technical.allowed_support_paths.filter(
      (entry) => entry !== "tests/oracle.mjs",
    );
  check.runner.type = "project_binary";
  check.runner.target = fixtureProductRootPath();
  check.runner.argv = [...rootArgv];
  check.verification_inputs.push("tests/helper.mjs");
  check.artifact_globs = [
    "artifacts/proof.json",
    "artifacts/optional-proof.json",
  ];
  check.environment_requirements = [
    { key: "path", kind: "env_var", target: "PATH" },
  ];
  outcome.product.owner.path_globs.push(
    "artifacts/**",
    "tests/revision-oracle.mjs",
  );
  outcome.technical.allowed_support_paths.push(
    "src/support/**",
    "artifacts/**",
    "tests/revision-oracle.mjs",
  );
  outcome.technical.rollback_and_recovery = {
    rollback: "Restore the previous state file.",
    recovery: "Rerun the first Check.",
    verification_check_keys: [check.key],
  };
  outcome.acceptance.counterfactual_controls = [
    {
      key: "replace-state-semantics",
      binding_key: "state-first",
      claims: [
        "result",
        "requirement.observe-first",
        "obligation.implement-first",
        "obligation.architecture-first",
        "semantic_fact.fact.first.observable",
      ],
      check_key: check.key,
      mutation: {
        type: "replace_json_value",
        path: "src/state.json",
        pointer: "/first",
        value: false,
      },
      expected_assertion_failures: [
        "first-result",
        "first-requirement",
        "first-obligation",
        "first-architecture",
        "first-semantic-fact",
      ],
      preserved_assertions: ["first-liveness"],
    },
    {
      key: "replace-state-semantics-redundant-proof",
      binding_key: "state-first",
      claims: [
        "result",
        "requirement.observe-first",
        "obligation.implement-first",
        "obligation.architecture-first",
        "semantic_fact.fact.first.observable",
      ],
      check_key: check.key,
      mutation: {
        type: "replace_json_value",
        path: "src/state.json",
        pointer: "/first",
        value: false,
      },
      expected_assertion_failures: [
        "first-result",
        "first-requirement",
        "first-obligation",
        "first-architecture",
        "first-semantic-fact",
      ],
      preserved_assertions: ["first-liveness"],
    },
    {
      key: "make-first-relations-applicable",
      binding_key: "state-first",
      claims: ["control_relation_closure"],
      check_key: check.key,
      mutation: {
        type: "replace_json_value",
        path: "src/state.json",
        pointer: "/first_relations_applicable",
        value: true,
      },
      expected_assertion_failures: ["first-relations-na"],
      preserved_assertions: ["first-liveness"],
    },
  ];
  check.negative_assertions.push({
    key: "negative-floor",
    criterion: "The strict negative floor remains satisfied.",
    claims: [],
    observation: "negative",
    evidence_capabilities: ["presence"],
    operator: "equals",
    expected: false,
  });
  await synchronizeFixtureExecutionTargetSource(fixture.root, fixture.contract);
}

export async function inspectAuthorityRevisionCandidate(
  fixture,
  previousAuthority,
) {
  let proposal = null;
  await compileDeliveryContract(fixture.workdir, fixture.root, {
    revise: true,
    previous_authority: previousAuthority,
    authority_revision_mode: "diagnose",
    on_authority_revision(value) {
      proposal = value;
    },
  });
  if (!proposal) throw new Error("authority_revision_candidate_unchanged");
  return {
    proposal,
    decision: projectAuthorityRevisionDecision(proposal),
  };
}

export const authorityReductionScenarios = [
  {
    name: "runner timeout",
    field: "runner_definitions_changed",
    reason: "runner_definition_changed",
    userDecisionRequired: false,
    mutate(contract) {
      contract.outcomes[0].acceptance.checks[0].runner.timeout_ms += 1000;
    },
  },
  {
    name: "runner effect",
    field: "runner_definitions_changed",
    reason: "runner_definition_changed",
    userDecisionRequired: true,
    mutate(contract) {
      contract.outcomes[0].acceptance.checks[0].runner.effect = "test_sandbox";
    },
  },
  {
    name: "verification input removal",
    field: "verification_inputs_removed_or_replaced",
    reason: "verification_input_removed_or_replaced",
    userDecisionRequired: false,
    mutate(contract) {
      contract.outcomes[0].acceptance.checks[0].verification_inputs = [
        "tests/oracle.mjs",
        "tests/semantic-false.json",
      ];
    },
  },
  {
    name: "allowed path expansion",
    field: "allowed_paths_expanded",
    reason: "allowed_path_expanded",
    userDecisionRequired: false,
    mutate(contract) {
      contract.outcomes[0].product.owner.path_globs.push("support/**");
      contract.outcomes[0].technical.allowed_support_paths.push("support/**");
    },
  },
  {
    name: "owner Context removal",
    field: "owner_context_refs_removed",
    reason: "owner_context_ref_removed",
    userDecisionRequired: true,
    mutate(contract) {
      contract.outcomes[0].product.owner.context_refs = [];
    },
  },
  {
    name: "forbidden path removal",
    field: "forbidden_paths_removed",
    reason: "forbidden_path_removed",
    userDecisionRequired: true,
    mutate(contract) {
      contract.outcomes[0].technical.forbidden_paths = [];
    },
  },
  {
    name: "binding carrier expansion",
    field: "bindings_removed_or_expanded",
    reason: "binding_removed_or_expanded",
    userDecisionRequired: false,
    mutate(contract) {
      contract.outcomes[0].technical.bindings[0].carrier_paths.push(
        "src/extra.json",
      );
    },
  },
  {
    name: "Obligation removal",
    field: "obligations_removed_or_weakened",
    reason: "obligation_removed_or_weakened",
    userDecisionRequired: true,
    mutate(contract) {
      contract.outcomes[0].technical.obligations =
        contract.outcomes[0].technical.obligations.filter(
          (obligation) => obligation.key !== "implement-first",
        );
      contract.outcomes[0].acceptance.checks[0].positive_assertions =
        contract.outcomes[0].acceptance.checks[0].positive_assertions.filter(
          (assertion) => assertion.key !== "first-obligation",
        );
      for (const control of contract.outcomes[0].acceptance
        .counterfactual_controls) {
        control.claims = control.claims.filter(
          (claim) => claim !== "obligation.implement-first",
        );
        control.expected_assertion_failures =
          control.expected_assertion_failures.filter(
            (assertion) => assertion !== "first-obligation",
          );
      }
    },
  },
  {
    name: "Environment Requirement removal",
    field: "environment_requirements_removed",
    reason: "environment_requirement_removed",
    userDecisionRequired: false,
    mutate(contract) {
      contract.outcomes[0].acceptance.checks[0].environment_requirements = [];
    },
  },
  {
    name: "artifact removal",
    field: "artifacts_removed",
    reason: "artifact_removed",
    userDecisionRequired: true,
    mutate(contract) {
      contract.outcomes[0].acceptance.checks[0].artifact_globs = [
        "artifacts/proof.json",
      ];
    },
  },
  {
    name: "redundant Counterfactual removal",
    field: "counterfactuals_removed",
    reason: null,
    userDecisionRequired: false,
    mutate(contract) {
      contract.outcomes[0].acceptance.counterfactual_controls =
        contract.outcomes[0].acceptance.counterfactual_controls.filter(
          (control) =>
            control.key !== "replace-state-semantics-redundant-proof",
        );
    },
  },
  {
    name: "rollback removal",
    field: "rollback_or_recovery_weakened",
    reason: "rollback_or_recovery_weakened",
    userDecisionRequired: true,
    mutate(contract) {
      contract.outcomes[0].technical.rollback_and_recovery = null;
    },
  },
];
