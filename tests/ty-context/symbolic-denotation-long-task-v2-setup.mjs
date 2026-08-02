import { execFileSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { preflightDesignResourceHandoff } from "../../packages/ty-context/dist/index.js";
import {
  DESIGN_HANDOFF_PATH,
  DESIGN_SOURCE_ITEM_KEY,
  writeDesignResourceHandoffFixture,
} from "./design-resource-handoff-fixture.mjs";
import {
  SYMBOLIC_SOURCE_ITEM_KEY,
  writeDesignResourceSymbolicHandoffFixture,
} from "./design-resource-symbolic-handoff-fixture.mjs";
import {
  addProductionControlBinding,
  completeControl,
  writeContract,
} from "./long-task-delivery-fixtures.mjs";
import {
  designEvidenceRecords,
  writeDesignArtifacts,
} from "./symbolic-denotation-long-task-v2-evidence.mjs";
import { wrapperOracleSource } from "./symbolic-denotation-long-task-v2-support.mjs";
import {
  addDesignAssertions,
  makeGroundTarget,
  makeSymbolicTarget,
} from "./symbolic-denotation-long-task-v2-targets.mjs";

export async function prepareMixedSymbolicLongTaskFixture(
  fixture,
  { mutateDesignRecords, mutateSymbolicModel } = {},
) {
  const { handoff: v1Handoff } = await writeDesignResourceHandoffFixture(
    fixture.root,
  );
  const symbolicFixture = await writeDesignResourceSymbolicHandoffFixture(
    fixture.root,
    mutateSymbolicModel,
    { directory: "design-symbolic" },
  );
  const v1 = await preflightDesignResourceHandoff(
    fixture.root,
    DESIGN_HANDOFF_PATH,
  );
  const v2 = await preflightDesignResourceHandoff(
    fixture.root,
    symbolicFixture.handoffPath,
  );
  const outcome = fixture.contract.outcomes[0];
  const check = outcome.acceptance.checks[0];
  configureBrowserSupport(fixture, outcome);
  await writeFile(
    path.join(fixture.root, "tests/ui.spec.ts"),
    "// Controlled Playwright-report fixture for the mixed UI check.\n",
  );
  await writeFile(path.join(fixture.root, "src/ui-mode.json"), '"single"\n');
  outcome.product.requirements.push(
    {
      key: "design-handoff",
      statement:
        "The main surface must conform to every declared atomic observable design Fact.",
      required_proof_surfaces: ["runtime_behavior"],
      applicability_refs: ["first-root-success"],
    },
    {
      key: "symbolic-design-handoff",
      statement:
        "The symbolic fixture preserves every declared atomic design rule.",
      required_proof_surfaces: ["runtime_behavior"],
      applicability_refs: ["first-root-success"],
    },
  );
  outcome.product.controls.push(
    completeControl({
      key: "main",
      surface: "fixture-main",
      location: "main content",
    }),
  );
  addDesignRuntimeCapabilities(fixture.contract.task.execution_targets[0]);
  check.artifact_globs = ["artifacts/**"];
  const v1Target = makeGroundTarget(v1);
  const v2Target = makeSymbolicTarget(v2, symbolicFixture.handoffPath);
  const assertionKeys = addDesignAssertions(check, v1Target, v2Target);
  addProductionControlBinding(fixture.contract, {
    controlKey: "main",
    rootClaimRef: "control.main.location",
    designTargets: [v1Target, v2Target],
  });
  fixture.contract.task.source_paths.push(
    DESIGN_HANDOFF_PATH,
    symbolicFixture.handoffPath,
  );
  fixture.contract.source_claims.push(
    {
      key: DESIGN_SOURCE_ITEM_KEY,
      source_ref: `${DESIGN_HANDOFF_PATH}#main-design`,
      statement:
        "The main surface must conform to every declared atomic observable design Fact.",
      disposition: {
        type: "claim",
        refs: ["first.requirement.design-handoff"],
      },
    },
    {
      key: SYMBOLIC_SOURCE_ITEM_KEY,
      source_ref: symbolicFixture.handoffPath,
      statement:
        "The symbolic fixture preserves every declared atomic design rule.",
      disposition: {
        type: "claim",
        refs: ["first.requirement.symbolic-design-handoff"],
      },
    },
  );
  check.verification_inputs.push(
    ...new Set([
      DESIGN_HANDOFF_PATH,
      ...v1Handoff.resources.map((item) => item.path),
      symbolicFixture.handoffPath,
      ...symbolicFixture.handoff.resources.map((item) => item.path),
    ]),
  );
  outcome.technical.allowed_support_paths.push("artifacts/**");
  outcome.product.owner.path_globs.push("artifacts/**");
  const artifactHashes = await writeDesignArtifacts(
    fixture.root,
    v1Target,
    v2Target,
  );
  execFileSync("git", ["add", "-f", "--", "artifacts/v1-*", "artifacts/v2-*"], {
    cwd: fixture.root,
  });
  check.verification_inputs.push("tests/base-oracle.mjs");
  const designRecords = designEvidenceRecords(
    check,
    v1Target,
    v2Target,
    artifactHashes,
  );
  mutateDesignRecords?.(designRecords);
  const observationExpectations = Object.fromEntries(
    [...check.positive_assertions, ...check.negative_assertions]
      .filter(
        (assertion) =>
          assertionKeys.has(assertion.key) || assertion.key.startsWith("main-"),
      )
      .map((assertion) => [assertion.observation, assertion.expected]),
  );
  const sensitivity = outcome.acceptance.counterfactual_controls.find(
    (item) => item.key === "remove-first-state",
  );
  sensitivity.claims.push(
    "requirement.design-handoff",
    "requirement.symbolic-design-handoff",
  );
  for (const key of assertionKeys)
    if (!sensitivity.expected_assertion_failures.includes(key))
      sensitivity.expected_assertion_failures.push(key);
  await writeContract(fixture.workdir, fixture.contract);
  const synchronizedOracle = await readFile(
    path.join(fixture.root, "tests/oracle.mjs"),
    "utf8",
  );
  await writeFile(
    path.join(fixture.root, "tests/base-oracle.mjs"),
    synchronizedOracle,
  );
  await writeFile(
    path.join(fixture.root, "tests/oracle.mjs"),
    wrapperOracleSource(designRecords, observationExpectations),
  );
  return { v2, v1Target, v2Target, artifactHashes, designRecords };
}

function configureBrowserSupport(fixture, outcome) {
  fixture.contract.task.execution_targets.push({
    key: "fixture-browser",
    description: "The fixture browser support target.",
    role: "support",
    runtime_family: "browser",
    root_entrypoint: "tests/ui.spec.ts",
    capabilities: ["browser-runtime", "cold-start", "production-root"],
  });
  outcome.acceptance.checks.push({
    key: "first-ui-browser-check",
    journey_roles: ["success"],
    execution_target: { target_ref: "fixture-browser", entrypoint: "root" },
    scenario: {
      given: [{ key: "ui-loaded", statement: "Load the fixture UI." }],
      when: [{ key: "inspect-ui", statement: "Inspect the fixture UI." }],
    },
    proof_surface: "ui_browser",
    runner: {
      type: "playwright_test",
      target: "tests/ui.spec.ts",
      argv: [],
      cwd: ".",
      timeout_ms: 30000,
      effect: "test_sandbox",
      retry_policy: "none",
      idempotent: false,
    },
    verification_inputs: ["tests/ui.spec.ts"],
    input_paths: ["src/**"],
    expected_output_paths: [],
    artifact_globs: [],
    positive_assertions: [],
    negative_assertions: [],
    environment_requirements: [],
  });
}

function addDesignRuntimeCapabilities(target) {
  target.capabilities.push(
    "pointer-input",
    "keyboard-input",
    "viewport-control",
    "motion-observation",
    "assistive-technology",
    "pixel-density-observation",
    "safe-area-observation",
    "network-state-control",
    "lifecycle-control",
  );
}
