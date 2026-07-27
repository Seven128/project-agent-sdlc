import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export async function prepareAuthorityRevisionFixture(fixture) {
  const check = fixture.contract.outcomes[0].acceptance.checks[0];
  const outcome = fixture.contract.outcomes[0];
  await writeFile(
    path.join(fixture.root, "tests", "oracle.mjs"),
    `import { readFile } from "node:fs/promises";
let state = { first: false };
try { state = JSON.parse(await readFile(new URL("../src/state.json", import.meta.url), "utf8")); } catch {}
const key = process.argv[2] || "first";
const claimAssertions = [key + "-result", key + "-requirement", key + "-obligation"];
const target = (assertion_key) => ({assertion_key,capability:"target_runtime",target_ref:"fixture-app",root_entrypoint:"tests/oracle.mjs",session_id:"revision-" + key + "-session",cold_start:true});
const delta = (assertion_key) => ({assertion_key,capability:"state_delta",before_sha256:"0".repeat(64),after_sha256:"1".repeat(64),changed_fields:[key]});
console.log(JSON.stringify({schema_version:"long-task-check-result-v3",execution_status:"completed",observations:{result:state[key],requirement_result:state[key],obligation_result:state[key],target_live:true,negative:false},evidence_records:[...claimAssertions.flatMap((assertionKey)=>[target(assertionKey),delta(assertionKey)]),target(key + "-liveness"),{assertion_key:"negative-floor",capability:"state_delta",before_sha256:"2".repeat(64),after_sha256:"3".repeat(64),changed_fields:["negative"]}]}));
`,
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
  check.verification_inputs.push("tests/helper.mjs");
  check.artifact_globs = ["artifacts/proof.json"];
  check.environment_requirements = [
    { key: "path", kind: "env_var", target: "PATH" },
  ];
  outcome.product.owner.path_globs.push("artifacts/**");
  outcome.technical.allowed_support_paths = [
    "src/support/**",
    "artifacts/**",
  ];
  outcome.technical.rollback_and_recovery = {
    rollback: "Restore the previous state file.",
    recovery: "Rerun the first Check.",
    verification_check_keys: [check.key],
  };
  outcome.acceptance.counterfactual_controls = [
    {
      key: "remove-state",
      binding_key: "state-first",
      claims: [
        "result",
        "requirement.observe-first",
        "obligation.implement-first",
      ],
      check_key: check.key,
      mutation: {
        type: "replace_file",
        path: "src/state.json",
        fixture_path: "tests/semantic-false.json",
      },
      expected_assertion_failures: [
        "first-result",
        "first-requirement",
        "first-obligation",
      ],
      preserved_assertions: ["first-liveness"],
    },
    {
      key: "remove-state-redundant-proof",
      binding_key: "state-first",
      claims: [
        "result",
        "requirement.observe-first",
        "obligation.implement-first",
      ],
      check_key: check.key,
      mutation: {
        type: "replace_file",
        path: "src/state.json",
        fixture_path: "tests/semantic-false.json",
      },
      expected_assertion_failures: [
        "first-result",
        "first-requirement",
        "first-obligation",
      ],
      preserved_assertions: ["first-liveness"],
    },
  ];
  check.negative_assertions.push({
    key: "negative-floor",
    criterion: "The strict negative floor remains satisfied.",
    claims: [],
    observation: "negative",
    evidence_capabilities: ["state_delta"],
    operator: "equals",
    expected: false,
  });
}

export const authorityReductionScenarios = [
  {
    name: "runner target",
    field: "runner_definitions_changed",
    reason: "runner_definition_changed",
    userDecisionRequired: false,
    mutate(contract) {
      contract.outcomes[0].acceptance.checks[0].runner.target =
        "tests/alternate-oracle.mjs";
    },
  },
  {
    name: "runner type",
    field: "runner_definitions_changed",
    reason: "runner_definition_changed",
    userDecisionRequired: true,
    mutate(contract) {
      contract.outcomes[0].acceptance.checks[0].runner.type = "project_binary";
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
      contract.outcomes[0].technical.obligations = [];
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
      contract.outcomes[0].acceptance.checks[0].artifact_globs = [];
    },
  },
  {
    name: "redundant Counterfactual removal",
    field: "counterfactuals_removed",
    reason: null,
    userDecisionRequired: false,
    mutate(contract) {
      contract.outcomes[0].acceptance.counterfactual_controls.pop();
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
