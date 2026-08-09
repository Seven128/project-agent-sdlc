import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import YAML from "yaml";
import {
  parseDeliveryContractBundle,
  parseDeliveryContractText,
} from "../../packages/ty-context/dist/lib/long-task-delivery-parser.js";
import {
  createDeliveryFixture,
  deliveryContract,
  runCli,
  writeContract,
} from "./long-task-delivery-fixtures.mjs";

const exactUnsupported = "src/[secret].ts";
const patternUnsupported = "src/[secret].ts";

test("all path-bearing Contract fields use one canonical grammar", () => {
  const cases = pathCases();
  for (const scenario of cases) {
    assert.equal(
      parseScenario(scenario, scenario.canonical),
      scenario.canonicalExpected ?? scenario.canonical,
      `${scenario.label}: canonical`,
    );
    assert.equal(
      parseScenario(scenario, scenario.leading),
      scenario.leadingExpected ?? scenario.canonical,
      `${scenario.label}: leading ./`,
    );
    assert.equal(
      parseScenario(scenario, scenario.windows),
      scenario.windowsExpected ?? scenario.canonical,
      `${scenario.label}: Windows separator`,
    );
    for (const [name, value, error] of [
      [
        "internal dot",
        scenario.internalDot,
        /non_canonical_repository_path_dot_segment/u,
      ],
      ["parent", scenario.parent, /unsafe_path/u],
      ["absolute", scenario.absolute, /unsafe_path/u],
      [
        "unsupported syntax",
        scenario.unsupported,
        /unsupported_repository_(?:pattern|path)_syntax/u,
      ],
    ])
      assert.throws(
        () => parseScenario(scenario, value),
        error,
        `${scenario.label}: ${name}`,
      );
  }
});

test("runner cwd alone may use repository-root dot", () => {
  const contract = deliveryContract();
  contract.outcomes[0].acceptance.checks[0].runner.cwd = ".";
  const parsed = parseDeliveryContractText(YAML.stringify(contract));
  assert.equal(parsed.outcomes[0].acceptance.checks[0].runner.cwd, ".");
});

test("outcome_files uses the same exact-path canonicalization", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "ty-context-path-bundle-"));
  const workdir = path.join(root, ".long-task");
  const fragment = path.join(workdir, "outcomes", "first.yaml");
  try {
    await mkdir(path.dirname(fragment), { recursive: true });
    await writeFile(
      fragment,
      YAML.stringify({
        schema_version: "long-task-outcomes-v2",
        outcomes: [deliveryContract().outcomes[0]],
      }),
    );
    for (const [value, expected] of [
      ["outcomes/first.yaml", "outcomes/first.yaml"],
      ["./outcomes/first.yaml", "outcomes/first.yaml"],
      ["outcomes\\first.yaml", "outcomes/first.yaml"],
    ]) {
      await writeBundleRoot(workdir, value);
      const parsed = await parseDeliveryContractBundle(workdir, root);
      assert.deepEqual(parsed.outcome_files, [expected]);
    }
    for (const [value, error] of [
      ["outcomes/./first.yaml", /non_canonical_repository_path_dot_segment/u],
      ["outcomes/../first.yaml", /unsafe_path/u],
      ["/absolute/first.yaml", /unsafe_path/u],
      ["outcomes/[first].yaml", /unsupported_repository_path_syntax/u],
    ]) {
      await writeBundleRoot(workdir, value);
      await assert.rejects(
        () => parseDeliveryContractBundle(workdir, root),
        error,
        value,
      );
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("internal dot cannot bypass a forbidden path", async () => {
  const fixture = await createDeliveryFixture();
  try {
    fixture.contract.global.technical.forbidden_paths = [
      { key: "secret", path: "src/./secret.ts" },
    ];
    await writeContract(fixture.workdir, fixture.contract);
    await runCli(fixture.root, ["enable", "long-task"]);
    await assert.rejects(
      () => runCli(fixture.root, ["long-task", "compile", fixture.workdir]),
      /non_canonical_repository_path_dot_segment/u,
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

function parseScenario(scenario, value) {
  const contract = deliveryContract();
  scenario.set(contract, value);
  const parsed = parseDeliveryContractText(YAML.stringify(contract));
  return scenario.get(parsed);
}

function pathCases() {
  const common = (label, set, get, canonical = "src/state.json") => ({
    label,
    set,
    get,
    canonical,
    leading: `./${canonical}`,
    windows: canonical.replaceAll("/", "\\"),
    internalDot: "src/./secret.ts",
    parent: "src/../secret.ts",
    absolute: "/absolute/secret.ts",
    unsupported: exactUnsupported,
  });
  const pattern = (label, set, get, canonical = "src/**") => ({
    ...common(label, set, get, canonical),
    unsupported: patternUnsupported,
  });
  return [
    common(
      "task.source_paths",
      (contract, value) => (contract.task.source_paths = [value]),
      (contract) => contract.task.source_paths[0],
      "source.md",
    ),
    common(
      "task.context_refs",
      (contract, value) => (contract.task.context_refs = [value]),
      (contract) => contract.task.context_refs[0],
      "project_context/areas/main.md",
    ),
    common(
      "source_ref.file",
      (contract, value) =>
        (contract.source_claims[0].source_ref = `${value}#fixture-source`),
      (contract) => contract.source_claims[0].source_ref.split("#")[0],
      "source.md",
    ),
    pattern(
      "owner.path_globs",
      (contract, value) => {
        const productionPaths =
          contract.outcomes[0].product.owner.path_globs.filter(
            (pattern) => pattern !== "src/**",
          );
        contract.outcomes[0].product.owner.path_globs = [
          value,
          ...productionPaths,
        ];
      },
      (contract) => contract.outcomes[0].product.owner.path_globs[0],
    ),
    pattern(
      "global.forbidden_path",
      (contract, value) =>
        (contract.global.technical.forbidden_paths[0].path = value),
      (contract) => contract.global.technical.forbidden_paths[0].path,
      "secrets/**",
    ),
    pattern(
      "expected_change_paths",
      (contract, value) =>
        (contract.outcomes[0].technical.expected_change_paths = [value]),
      (contract) => contract.outcomes[0].technical.expected_change_paths[0],
    ),
    pattern(
      "allowed_support_paths",
      (contract, value) =>
        (contract.outcomes[0].technical.allowed_support_paths = [value]),
      (contract) => contract.outcomes[0].technical.allowed_support_paths[0],
      "src/state.json",
    ),
    pattern(
      "outcome.forbidden_paths",
      (contract, value) =>
        (contract.outcomes[0].technical.forbidden_paths = [value]),
      (contract) => contract.outcomes[0].technical.forbidden_paths[0],
      "secrets/**",
    ),
    common(
      "binding.target",
      (contract, value) =>
        (contract.outcomes[0].technical.bindings[0].target = value),
      (contract) => contract.outcomes[0].technical.bindings[0].target,
    ),
    pattern(
      "binding.carrier_paths",
      (contract, value) =>
        (contract.outcomes[0].technical.bindings[0].carrier_paths = [value]),
      (contract) => contract.outcomes[0].technical.bindings[0].carrier_paths[0],
      "src/state.json",
    ),
    common(
      "runner.target",
      (contract, value) =>
        (contract.outcomes[0].acceptance.checks[0].runner.target = value),
      (contract) => contract.outcomes[0].acceptance.checks[0].runner.target,
      "tests/oracle.mjs",
    ),
    {
      ...common(
        "runner.cwd",
        (contract, value) =>
          (contract.outcomes[0].acceptance.checks[0].runner.cwd = value),
        (contract) => contract.outcomes[0].acceptance.checks[0].runner.cwd,
        "tests",
      ),
      leadingExpected: "tests",
      windowsExpected: "tests",
    },
    pattern(
      "verification_inputs",
      (contract, value) =>
        (contract.outcomes[0].acceptance.checks[0].verification_inputs = [
          value,
        ]),
      (contract) =>
        contract.outcomes[0].acceptance.checks[0].verification_inputs[0],
      "tests/oracle.mjs",
    ),
    pattern(
      "input_paths",
      (contract, value) =>
        (contract.outcomes[0].acceptance.checks[0].input_paths = [value]),
      (contract) => contract.outcomes[0].acceptance.checks[0].input_paths[0],
    ),
    pattern(
      "expected_output_paths",
      (contract, value) =>
        (contract.outcomes[0].acceptance.checks[0].expected_output_paths = [
          value,
        ]),
      (contract) =>
        contract.outcomes[0].acceptance.checks[0].expected_output_paths[0],
      "generated/**",
    ),
    pattern(
      "artifact_globs",
      (contract, value) =>
        (contract.outcomes[0].acceptance.checks[0].artifact_globs = [value]),
      (contract) => contract.outcomes[0].acceptance.checks[0].artifact_globs[0],
      "artifacts/**",
    ),
    common(
      "environment.file.target",
      (contract, value) =>
        (contract.outcomes[0].acceptance.checks[0].environment_requirements = [
          { key: "fixture", kind: "file", target: value },
        ]),
      (contract) =>
        contract.outcomes[0].acceptance.checks[0].environment_requirements[0]
          .target,
    ),
    common(
      "counterfactual.mutation.paths",
      (contract, value) =>
        (contract.outcomes[0].acceptance.counterfactual_controls = [
          {
            key: "remove-state",
            binding_key: "state-first",
            claims: ["obligation.implement-first"],
            check_key: "first-check",
            mutation: { type: "remove_paths", paths: [value] },
            expected_assertion_failures: ["first-result"],
          },
        ]),
      (contract) =>
        contract.outcomes[0].acceptance.counterfactual_controls[0].mutation
          .paths[0],
    ),
    common(
      "counterfactual.fixture_path",
      (contract, value) =>
        (contract.outcomes[0].acceptance.counterfactual_controls = [
          {
            key: "replace-state",
            binding_key: "state-first",
            claims: ["obligation.implement-first"],
            check_key: "first-check",
            mutation: {
              type: "replace_file",
              path: "src/state.json",
              fixture_path: value,
            },
            expected_assertion_failures: ["first-result"],
          },
        ]),
      (contract) =>
        contract.outcomes[0].acceptance.counterfactual_controls[0].mutation
          .fixture_path,
      "tests/oracle.mjs",
    ),
  ];
}

async function writeBundleRoot(workdir, outcomeFile) {
  const contract = deliveryContract();
  delete contract.outcomes;
  contract.outcome_files = [outcomeFile];
  await writeFile(
    path.join(workdir, "delivery-contract.yaml"),
    YAML.stringify(contract),
  );
}
