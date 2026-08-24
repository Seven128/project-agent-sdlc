import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { pathToFileURL } from "node:url";
import YAML from "yaml";
import { preflightDesignResourceHandoff } from "../../packages/ty-context/dist/index.js";
import { compileDeliveryContract } from "../../packages/ty-context/dist/lib/long-task-delivery-compiler.js";
import { parseDeliveryContractText } from "../../packages/ty-context/dist/lib/long-task-delivery-parser.js";
import { validateDeliveryContractStructure } from "../../packages/ty-context/dist/lib/long-task-delivery-validation.js";
import { validateLongTaskDesignFeasibilityBindings } from "../../packages/ty-context/dist/lib/long-task-design-feasibility-binding.js";
import { createLongTaskDesignHandoffConsumer } from "../../packages/ty-context/dist/lib/long-task-design-resource-handoff.js";
import { compileSourceInventory } from "../../packages/ty-context/dist/lib/long-task-source-inventory.js";
import {
  addProductionControlBinding,
  commitCandidate,
  completeControl,
  createDeliveryFixture,
  runCli,
  runCliFailure,
  synchronizeFixtureExecutionTargetSource,
  writeContract,
} from "./long-task-delivery-fixtures.mjs";
import {
  DESIGN_CONDITION_KEY,
  DESIGN_CONDITION_KEYS,
  DESIGN_FEASIBILITY_PATH,
  DESIGN_HANDOFF_PATH,
  DESIGN_RESOURCE_PATH,
  DESIGN_RESOURCE_PATHS,
  DESIGN_SOURCE_ITEM_KEY,
  DESIGN_TARGET_KEY,
  DESIGN_TECHNICAL_SOURCE_PATH,
  addDesignResourceImplementationFeasibility,
  addV1FeasibilityDecisionSource,
  v1FeasibilityConditionScopeSha256,
  writeDesignResourceHandoff,
  writeDesignResourceHandoffFixture,
} from "./design-resource-handoff-fixture.mjs";
import {
  fixtureProductRootArgv,
  fixtureProductRootPath,
} from "./long-task-package-machine-fixture.mjs";

const DESIGN_ROOT_SOURCE_ITEM_KEY = "design-root-constraint";
const DESIGN_ROOT_CLAIM = "control.main.location";
const DESIGN_ROOT_STATEMENT = "main content";
let cachedPlaywrightTestModulePromise;

test("compiles V2 generated Claim/Outcome/Check ids and frozen runner targets under two seconds", async () => {
  const fixture = await createDeliveryFixture({ twoOutcomes: true });
  try {
    const started = performance.now();
    const compiled = await compileDeliveryContract(
      fixture.workdir,
      fixture.root,
      { require_completion_gate: false },
    );
    assert.ok(performance.now() - started < 2000);
    assert.equal(compiled.schema_version, "compiled-long-task-delivery-v2");
    assert.equal(compiled.effective_risk, "standard");
    assert.deepEqual(
      compiled.outcomes.map((outcome) => outcome.internal_id),
      ["OUT.first", "OUT.second"],
    );
    assert.deepEqual(
      compiled.outcomes.flatMap((outcome) =>
        outcome.acceptance.checks.map((check) => check.internal_id),
      ),
      ["CHECK.first.first-check", "CHECK.second.second-check"],
    );
    assert.match(compiled.compiled_identity, /^[a-f0-9]{64}$/u);
    assert.equal(compiled.claim_coverage.uncovered_claims.length, 0);
    assert.equal(compiled.claim_coverage.claims_total, 11);
    const check = compiled.outcomes[0].acceptance.checks[0];
    assert.equal(check.runner.resolved_cwd, "");
    assert.equal(check.runner.resolved_target, fixtureProductRootPath());
    assert.equal(
      check.process_runtime_closure.root_target,
      fixtureProductRootPath(),
    );
    assert.ok(
      check.process_runtime_closure.production_binding_refs.every((ref) =>
        ref.startsWith("first."),
      ),
    );
    assert.ok(
      check.observation_authorities.every((authority) =>
        authority.carrier_refs.every((carrier) =>
          carrier.binding_ref.startsWith("first."),
        ),
      ),
    );
    assert.equal(check.process_runtime_closure.closure_identity.length, 64);
    assert.equal(compiled.source_hashes["source.md"].length, 64);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("declared Source paths require Source Claims while outcome_files remains physical compatibility", async () => {
  const sourceFixture = await createDeliveryFixture();
  try {
    sourceFixture.contract.source_claims = [];
    await writeContract(sourceFixture.workdir, sourceFixture.contract);
    await assert.rejects(
      compileDeliveryContract(sourceFixture.workdir, sourceFixture.root, {
        require_completion_gate: false,
      }),
      /source_authority_required/u,
    );
  } finally {
    await rm(sourceFixture.root, { recursive: true, force: true });
  }

  const bundleFixture = await createDeliveryFixture();
  try {
    const bundle = structuredClone(bundleFixture.contract);
    const [outcome] = bundle.outcomes;
    delete bundle.outcomes;
    bundle.outcome_files = ["outcomes/first.yaml"];
    await mkdir(path.join(bundleFixture.workdir, "outcomes"), {
      recursive: true,
    });
    await writeFile(
      path.join(bundleFixture.workdir, "outcomes", "first.yaml"),
      YAML.stringify(outcome),
    );
    await writeContract(bundleFixture.workdir, bundle);
    const compiled = await compileDeliveryContract(
      bundleFixture.workdir,
      bundleFixture.root,
      {
        require_completion_gate: false,
      },
    );
    assert.equal(compiled.outcomes.length, 1);
    assert.equal(Object.keys(compiled.contract_files).length, 1);
  } finally {
    await rm(bundleFixture.root, { recursive: true, force: true });
  }
});

test("preflight rejects invalid Context, missing runner path and Outcome without proof", async () => {
  const fixture = await createDeliveryFixture();
  try {
    fixture.contract.task.context_refs = ["project_context/areas/missing.md"];
    fixture.contract.outcomes[0].product.owner.context_refs = [
      "project_context/areas/missing.md",
    ];
    await writeContract(fixture.workdir, fixture.contract, {
      synchronizeSemanticManifest: false,
    });
    await assert.rejects(
      compileDeliveryContract(fixture.workdir, fixture.root, {
        require_completion_gate: false,
      }),
      /context_ref_invalid/,
    );
    fixture.contract.task.context_refs = ["project_context/areas/main.md"];
    fixture.contract.outcomes[0].product.owner.context_refs = [
      "project_context/areas/main.md",
    ];
    fixture.contract.outcomes[0].acceptance.checks[0].runner.target =
      "tests/missing.mjs";
    await writeContract(fixture.workdir, fixture.contract);
    await assert.rejects(
      compileDeliveryContract(fixture.workdir, fixture.root, {
        require_completion_gate: false,
      }),
      /project_binary_path_not_found:first-check:tests\/missing\.mjs/,
    );
    fixture.contract.outcomes[0].acceptance.checks = [];
    fixture.contract.outcomes[0].acceptance.counterfactual_controls = [];
    await writeContract(fixture.workdir, fixture.contract);
    await assert.rejects(
      compileDeliveryContract(fixture.workdir, fixture.root, {
        require_completion_gate: false,
      }),
      /product_claim_required_surfaces_missing/,
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("Compile ignores safe unmatched relative argv values instead of copying or role-classifying them", async () => {
  for (const token of [
    "tests/missing-runtime-config.json",
    "--config=tests/missing-runtime-config.json",
    "runtime/extensionless-entry",
    "runtime/file with spaces.json",
    "--label=release/channel",
    "node:24",
    "--mode=node:24",
    "12:30",
    "--time=12:30",
    "--empty=",
    "-d",
  ]) {
    const fixture = await createDeliveryFixture();
    try {
      const target = fixture.contract.task.execution_targets[0];
      const check = fixture.contract.outcomes[0].acceptance.checks[0];
      const rootArgv = [
        ...fixtureProductRootArgv("tests/oracle.mjs", "first"),
        token,
      ];
      target.root_argv = rootArgv;
      check.runner.argv = [...rootArgv];
      await synchronizeFixtureExecutionTargetSource(
        fixture.root,
        fixture.contract,
      );
      await writeContract(fixture.workdir, fixture.contract);

      const compiled = await compileDeliveryContract(
        fixture.workdir,
        fixture.root,
        {
          require_completion_gate: false,
        },
      );
      const closure =
        compiled.outcomes[0].acceptance.checks[0].process_runtime_closure;
      assert.ok(closure);
      assert.equal(
        closure.root_argv_files.some(
          (candidate) =>
            candidate.includes("missing-runtime-config") ||
            candidate.includes("extensionless-entry") ||
            candidate.includes("release/channel"),
        ),
        false,
      );
    } finally {
      await rm(fixture.root, { recursive: true, force: true });
    }
  }
});

test("Compile fails closed for external, ambiguous, quoted, and unsupported compound argv values", async () => {
  for (const unsafe of [
    "/outside/runtime",
    "//outside/share/runtime",
    "/d",
    "https://example.test/runtime",
    "--endpoint=https://example.test/runtime",
    "scheme:sample/runtime",
    "scheme:/sample/runtime",
    "scheme://sample/runtime",
    "mailto:123",
    "urn:123",
    "data:123",
    "ws:80",
    "runtime:24",
    "Node:24",
    "file:external/runtime.json",
    "file:///external/runtime.json",
    "C:/external/config.json",
    "C:\\external\\config.json",
    "C:relative/config.json",
    "C:relative\\config.json",
    "../external/config.json",
    "/outside/data file.json",
    "scheme:sample/data file.json",
    '"tests/oracle.mjs"',
    '--config="tests/oracle.mjs"',
    "--config=one=two",
    "name=../external/config.json",
    "-I../external/config.json",
    "@../external/config.json",
    "config/runtime && /outside/data.json",
    "config/runtime;next",
    "$(outside)/data.json",
    "${OUTSIDE}/data.json",
    "%USERPROFILE%/data.json",
    "~/outside/data.json",
    "*.json",
    "--config=config/runtime|outside",
  ]) {
    const fixture = await createDeliveryFixture();
    try {
      const target = fixture.contract.task.execution_targets[0];
      const check = fixture.contract.outcomes[0].acceptance.checks[0];
      const rootArgv = [
        ...fixtureProductRootArgv("tests/oracle.mjs", "first"),
        unsafe,
      ];
      target.root_argv = rootArgv;
      check.runner.argv = [...rootArgv];
      await synchronizeFixtureExecutionTargetSource(
        fixture.root,
        fixture.contract,
      );
      await writeContract(fixture.workdir, fixture.contract);

      await assert.rejects(
        compileDeliveryContract(fixture.workdir, fixture.root, {
          require_completion_gate: false,
        }),
        /process_root_argv_unsafe/u,
      );
    } finally {
      await rm(fixture.root, { recursive: true, force: true });
    }
  }
});

test("preflight rejects missing package scripts and UI outcomes without browser proof", async () => {
  const fixture = await createDeliveryFixture();
  try {
    const check = fixture.contract.outcomes[0].acceptance.checks[0];
    check.runner.type = "package_script";
    check.runner.target = "missing";
    await writeContract(fixture.workdir, fixture.contract);
    await assert.rejects(
      compileDeliveryContract(fixture.workdir, fixture.root, {
        require_completion_gate: false,
      }),
      /package_script_not_found/,
    );
    check.runner.type = "node_oracle";
    check.runner.target = "tests/oracle.mjs";
    fixture.contract.outcomes[0].product.owner_surfaces = ["web/settings"];
    await writeContract(fixture.workdir, fixture.contract);
    await assert.rejects(
      compileDeliveryContract(fixture.workdir, fixture.root, {
        require_completion_gate: false,
      }),
      /ui_outcome_requires_ui_browser_proof/,
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("Long-Task Compile refuses to machine-close strict design methods without package derivation", async () => {
  const fixture = await createDeliveryFixture();
  try {
    await attachDesignResourceHandoff(fixture);
    await writeContract(fixture.workdir, fixture.contract);
    const target =
      fixture.contract.outcomes[0].product.surface_bindings[0]
        .design_targets[0];
    assert.equal(target.key, DESIGN_TARGET_KEY);
    assert.deepEqual(target.condition_keys, DESIGN_CONDITION_KEYS);
    assert.deepEqual(target.source_paths, [
      DESIGN_HANDOFF_PATH,
      ...DESIGN_RESOURCE_PATHS,
    ]);
    assert.deepEqual(
      target.verification_method_bindings.map((item) => item.method).sort(),
      [
        "accessibility_semantics",
        "asset_integrity",
        "component_state",
        "content",
        "design_token",
        "input_method",
        "interaction_trace",
        "layout_geometry",
        "motion_timeline",
        "responsive_reflow",
        "visual_pixel",
      ],
    );
    await assert.rejects(
      compileDeliveryContract(fixture.workdir, fixture.root, {
        require_completion_gate: false,
      }),
      /unsupported_observer_requires_external_confirmation:design\.main-default\.layout_geometry\..*:design_conformance:package_derivation_required/u,
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("Long-Task consumes target handoffs in either order and rejects missing, extra or duplicate targets", async () => {
  const fixture = await createDeliveryFixture();
  try {
    await attachDesignResourceHandoff(fixture);
    const primary = await preflightDesignResourceHandoff(
      fixture.root,
      DESIGN_HANDOFF_PATH,
    );
    const {
      handoff: secondary,
      mapping,
      reverseMapping,
    } = cloneDesignHandoffTarget(primary);
    attachSecondaryDesignTarget(fixture.contract, secondary, mapping);

    assert.equal(
      secondary.handoff.fact_cells.length,
      primary.handoff.fact_cells.length,
    );
    assert.equal(secondary.handoff.facts.length, primary.handoff.facts.length);
    assert.equal(
      secondary.handoff.proof_obligations.length,
      primary.handoff.proof_obligations.length,
    );
    assert.deepEqual(
      secondary.handoff.targets[0].condition_refs,
      primary.handoff.targets[0].condition_refs,
    );
    const normalizedSecondary = structuredClone(secondary.handoff);
    replaceExactStringMap(normalizedSecondary, reverseMapping);
    assert.deepEqual(normalizedSecondary, primary.handoff);

    for (const handoffs of [
      [primary, secondary],
      [secondary, primary],
    ]) {
      const consumer = createLongTaskDesignHandoffConsumer(fixture.contract);
      for (const handoff of handoffs) consumer.consume(handoff);
      assert.doesNotThrow(() => consumer.finish());
    }

    const missing = createLongTaskDesignHandoffConsumer(fixture.contract);
    missing.consume(primary);
    assert.throws(
      () => missing.finish(),
      /design_resource_target_handoff_missing:secondary-default/u,
    );

    const primaryOnlyContract = structuredClone(fixture.contract);
    primaryOnlyContract.outcomes[0].product.surface_bindings[0].design_targets =
      primaryOnlyContract.outcomes[0].product.surface_bindings[0].design_targets.filter(
        (target) => target.key !== "secondary-default",
      );
    const extra = createLongTaskDesignHandoffConsumer(primaryOnlyContract);
    extra.consume(primary);
    extra.consume(secondary);
    assert.throws(
      () => extra.finish(),
      /design_resource_handoff_target_unbound:secondary-default/u,
    );

    const duplicate = createLongTaskDesignHandoffConsumer(fixture.contract);
    duplicate.consume(primary);
    assert.doesNotThrow(() => duplicate.consume(primary));
    assert.throws(
      () => duplicate.finish(),
      /design_resource_handoff_target_duplicate:main-default/u,
    );

    const invalidPrimary = structuredClone(primary);
    invalidPrimary.handoff.targets[0].interpretation = "constraint";
    const earlierValidation = createLongTaskDesignHandoffConsumer(
      fixture.contract,
    );
    earlierValidation.consume(invalidPrimary);
    assert.throws(
      () => earlierValidation.finish(),
      /design_resource_target_interpretation_mismatch:main-default/u,
    );

    const invalidSecondary = structuredClone(secondary);
    invalidSecondary.handoff.targets[0].interpretation = "constraint";
    const earlierMissing = createLongTaskDesignHandoffConsumer(
      fixture.contract,
    );
    earlierMissing.consume(invalidSecondary);
    assert.throws(
      () => earlierMissing.finish(),
      /design_resource_target_handoff_missing:main-default/u,
    );

    const conflictingPropertyHandoff = structuredClone(secondary);
    conflictingPropertyHandoff.handoff.properties[0].standard =
      !conflictingPropertyHandoff.handoff.properties[0].standard;
    const conflictingProperty = createLongTaskDesignHandoffConsumer(
      fixture.contract,
    );
    conflictingProperty.consume(primary);
    conflictingProperty.consume(conflictingPropertyHandoff);
    assert.throws(
      () => conflictingProperty.finish(),
      /design_resource_handoff_set_shared_row_conflict:properties:/u,
    );

    const conflictingHeaderHandoff = structuredClone(secondary);
    conflictingHeaderHandoff.handoff.provenance.run = "changed-handoff-run";
    const conflictingHeader = createLongTaskDesignHandoffConsumer(
      fixture.contract,
    );
    conflictingHeader.consume(primary);
    conflictingHeader.consume(conflictingHeaderHandoff);
    assert.throws(
      () => conflictingHeader.finish(),
      /design_resource_handoff_set_header_conflict:provenance/u,
    );

    const conflictingResourcePathHandoff = structuredClone(secondary);
    conflictingResourcePathHandoff.handoff.resources[0].path =
      primary.handoff.resources[0].path;
    const conflictingResourcePath = createLongTaskDesignHandoffConsumer(
      fixture.contract,
    );
    conflictingResourcePath.consume(primary);
    conflictingResourcePath.consume(conflictingResourcePathHandoff);
    assert.throws(
      () => conflictingResourcePath.finish(),
      /design_resource_handoff_set_resource_path_conflict:/u,
    );

    const conflictingResourceClosureHandoff = structuredClone(secondary);
    conflictingResourceClosureHandoff.handoff.resource_fact_closure[0].resource_ref =
      primary.handoff.resource_fact_closure[0].resource_ref;
    const conflictingResourceClosure = createLongTaskDesignHandoffConsumer(
      fixture.contract,
    );
    conflictingResourceClosure.consume(primary);
    conflictingResourceClosure.consume(conflictingResourceClosureHandoff);
    assert.throws(
      () => conflictingResourceClosure.finish(),
      /design_resource_handoff_set_resource_closure_conflict:/u,
    );

    const duplicateSourceHandoff = structuredClone(secondary);
    replaceExactStringMap(
      duplicateSourceHandoff,
      new Map([["design-secondary", DESIGN_SOURCE_ITEM_KEY]]),
    );
    const duplicateSource = createLongTaskDesignHandoffConsumer(
      fixture.contract,
    );
    duplicateSource.consume(primary);
    duplicateSource.consume(duplicateSourceHandoff);
    assert.throws(
      () => duplicateSource.finish(),
      /design_resource_handoff_set_source_item_duplicate:/u,
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("Long-Task binds a required realization through existing Source and technical owners", async () => {
  const fixture = await createDeliveryFixture();
  try {
    const handoff = await attachDesignResourceHandoff(fixture);
    await writeContract(fixture.workdir, fixture.contract);
    await addDesignResourceImplementationFeasibility(
      fixture.root,
      handoff,
      async (document) => {
        const cell = document.component_family_cells[0];
        const authority = await addV1FeasibilityDecisionSource(
          fixture.root,
          document,
          {
            recordKey: "technical.fixture-authority",
            itemKey: "fixture-feasibility-authority",
            itemKind: "technical_obligation",
            roles: ["technical_authority"],
            projections: [
              {
                mode: "required_realization",
                target_ref: cell.target_ref,
                component_family_ref: cell.component_family_ref,
                condition_scope_sha256: v1FeasibilityConditionScopeSha256(
                  document,
                  cell.condition_profile_ref,
                ),
                realization_ref: "reuse-project-card",
              },
            ],
          },
        );
        fixture.contract.task.source_paths.push(authority.sourcePath);
        fixture.contract.source_claims.push({
          key: authority.itemKey,
          source_ref: `${authority.sourcePath}#${authority.itemKey}`,
          statement: authority.normalizedText,
          disposition: {
            type: "claim",
            refs: ["first.obligation.architecture-first"],
          },
        });
        cell.required_realization = {
          realization_ref: "reuse-project-card",
          technical_authority_source_refs: [authority.recordRef],
        };
      },
    );
    await writeDesignResourceHandoff(fixture.root, handoff);

    const outcome = fixture.contract.outcomes[0];
    const target = outcome.product.surface_bindings[0].design_targets[0];
    target.source_paths.push(DESIGN_FEASIBILITY_PATH);
    outcome.acceptance.checks[0].verification_inputs.push(
      DESIGN_FEASIBILITY_PATH,
    );
    const binding = outcome.technical.bindings.find(
      (item) => item.key === "state-first",
    );
    binding.target = DESIGN_TECHNICAL_SOURCE_PATH;
    binding.carrier_paths = [DESIGN_TECHNICAL_SOURCE_PATH];
    const preflight = await preflightDesignResourceHandoff(
      fixture.root,
      DESIGN_HANDOFF_PATH,
    );
    const sourceItems = await compileSourceInventory(
      fixture.root,
      fixture.contract.task.source_paths,
    );
    const positive = createLongTaskDesignHandoffConsumer(
      fixture.contract,
      sourceItems,
    );
    positive.consume(preflight);
    assert.doesNotThrow(() => positive.finish());

    assertOptionalFeasibilityBindingClosure(fixture, preflight, sourceItems);

    const unattributedContract = structuredClone(fixture.contract);
    unattributedContract.outcomes[0].technical.bindings.push({
      key: "extra-page-style",
      kind: "file",
      target: "src/state.json",
      carrier_paths: ["src/state.json"],
      existence: "existing",
    });
    unattributedContract.outcomes[0].product.surface_bindings[0].component_binding_refs.push(
      "extra-page-style",
    );
    const unattributed = createLongTaskDesignHandoffConsumer(
      unattributedContract,
      sourceItems,
    );
    unattributed.consume(preflight);
    assert.throws(
      () => unattributed.finish(),
      /feasibility_component_binding_unattributed/u,
    );

    const outsideComponentContract = structuredClone(fixture.contract);
    const outsideComponent =
      outsideComponentContract.outcomes[0].technical.bindings.find(
        (item) => item.key === "state-first",
      );
    outsideComponent.target = DESIGN_RESOURCE_PATH;
    outsideComponent.carrier_paths = [DESIGN_RESOURCE_PATH];
    const outsideComponentConsumer = createLongTaskDesignHandoffConsumer(
      outsideComponentContract,
      sourceItems,
    );
    outsideComponentConsumer.consume(preflight);
    assert.throws(
      () => outsideComponentConsumer.finish(),
      /feasibility_component_binding_outside_owner_roots/u,
    );

    const outsideRouteContract = structuredClone(fixture.contract);
    outsideRouteContract.outcomes[0].technical.bindings.push({
      key: "outside-route",
      kind: "file",
      target: DESIGN_RESOURCE_PATH,
      carrier_paths: [DESIGN_RESOURCE_PATH],
      existence: "existing",
    });
    outsideRouteContract.outcomes[0].product.surface_bindings[0].route_binding_ref =
      "outside-route";
    const outsideRoute = createLongTaskDesignHandoffConsumer(
      outsideRouteContract,
      sourceItems,
    );
    outsideRoute.consume(preflight);
    assert.throws(
      () => outsideRoute.finish(),
      /feasibility_route_binding_outside_owner_roots/u,
    );

    const pathOnlyClaimContract = structuredClone(fixture.contract);
    pathOnlyClaimContract.source_claims.find(
      (claim) => claim.key === "fixture-feasibility-authority",
    ).source_ref = "src/technical.fixture-authority.md";
    const pathOnlyClaim = createLongTaskDesignHandoffConsumer(
      pathOnlyClaimContract,
      sourceItems,
    );
    pathOnlyClaim.consume(preflight);
    assert.throws(
      () => pathOnlyClaim.finish(),
      /feasibility_authority_claim_count/u,
    );

    const undeclaredSource = structuredClone(fixture.contract);
    undeclaredSource.task.source_paths =
      undeclaredSource.task.source_paths.filter(
        (item) => item !== "src/technical.fixture-authority.md",
      );
    const undeclared = createLongTaskDesignHandoffConsumer(
      undeclaredSource,
      sourceItems,
    );
    undeclared.consume(preflight);
    assert.throws(
      () => undeclared.finish(),
      /feasibility_authority_source_not_declared/u,
    );

    const missingClaimContract = structuredClone(fixture.contract);
    missingClaimContract.source_claims =
      missingClaimContract.source_claims.filter(
        (claim) =>
          claim.source_ref !==
          "src/technical.fixture-authority.md#fixture-feasibility-authority",
      );
    const missingClaim = createLongTaskDesignHandoffConsumer(
      missingClaimContract,
      sourceItems,
    );
    missingClaim.consume(preflight);
    assert.throws(
      () => missingClaim.finish(),
      /feasibility_authority_claim_count/u,
    );

    const wrongBindingContract = structuredClone(fixture.contract);
    const wrongBinding =
      wrongBindingContract.outcomes[0].technical.bindings.find(
        (item) => item.key === "state-first",
      );
    wrongBinding.target = "src/state.json";
    wrongBinding.carrier_paths = ["src/state.json"];
    const wrongBindingConsumer = createLongTaskDesignHandoffConsumer(
      wrongBindingContract,
      sourceItems,
    );
    wrongBindingConsumer.consume(preflight);
    assert.throws(
      () => wrongBindingConsumer.finish(),
      /feasibility_required_realization_binding_mismatch/u,
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("Long-Task derives an authorized planned owner from existing bindings", async () => {
  const fixture = await createDeliveryFixture();
  try {
    const handoff = await attachDesignResourceHandoff(fixture);
    let authority;
    await addDesignResourceImplementationFeasibility(
      fixture.root,
      handoff,
      async (document) => {
        const cell = document.component_family_cells[0];
        authority = await addV1FeasibilityDecisionSource(
          fixture.root,
          document,
          {
            recordKey: "technical.planned-card-authority",
            itemKey: "planned-card-authority",
            itemKind: "technical_obligation",
            roles: ["planned_owner_authorization"],
            projections: [
              {
                mode: "planned_owner_authorization",
                target_ref: cell.target_ref,
                component_family_ref: cell.component_family_ref,
                condition_scope_sha256: v1FeasibilityConditionScopeSha256(
                  document,
                  cell.condition_profile_ref,
                ),
                owner_locator: "planned-card-owner",
              },
            ],
          },
        );
        cell.feasible_realizations = [
          {
            ...cell.feasible_realizations[0],
            key: "create-planned-card",
            strategy_steps: ["create_shared_component"],
            owner_candidates: [
              {
                kind: "planned_logical_owner",
                locator: "planned-card-owner",
                existence: "planned",
                authorization_source_refs: [authority.recordRef],
              },
            ],
          },
        ];
      },
    );
    await writeDesignResourceHandoff(fixture.root, handoff);
    fixture.contract.task.source_paths.push(authority.sourcePath);
    const outcome = fixture.contract.outcomes[0];
    const authorityObligation = structuredClone(
      outcome.technical.obligations.find(
        (obligation) => obligation.key === "architecture-first",
      ),
    );
    authorityObligation.key = "planned-card-authority";
    authorityObligation.statement = authority.normalizedText;
    outcome.technical.obligations.push(authorityObligation);
    const authorityAssertion = structuredClone(
      outcome.acceptance.checks[0].positive_assertions[0],
    );
    authorityAssertion.key = "planned-card-authority-proof";
    authorityAssertion.criterion = authority.normalizedText;
    authorityAssertion.claims = ["obligation.planned-card-authority"];
    authorityAssertion.observation = "planned_card_authority";
    outcome.acceptance.checks[0].positive_assertions.push(authorityAssertion);
    outcome.acceptance.counterfactual_controls[0].claims.push(
      "obligation.planned-card-authority",
    );
    outcome.acceptance.counterfactual_controls[0].expected_assertion_failures.push(
      authorityAssertion.key,
    );
    fixture.contract.source_claims.push({
      key: authority.itemKey,
      source_ref: `${authority.sourcePath}#${authority.itemKey}`,
      statement: authority.normalizedText,
      disposition: {
        type: "claim",
        refs: ["first.obligation.planned-card-authority"],
      },
    });
    const surface = outcome.product.surface_bindings[0];
    surface.design_targets[0].source_paths.push(DESIGN_FEASIBILITY_PATH);
    outcome.acceptance.checks[0].verification_inputs.push(
      DESIGN_FEASIBILITY_PATH,
    );
    outcome.technical.bindings.push({
      key: "architecture-first",
      kind: "verified",
      existence: "planned",
      target: "planned-card-owner",
      carrier_paths: ["src/planned-card-owner.ts"],
      verification_check_key: "first-check",
    });
    surface.component_binding_refs = ["architecture-first"];
    outcome.technical.bindings.push({
      key: "design-route-owner",
      kind: "file",
      target: DESIGN_TECHNICAL_SOURCE_PATH,
      carrier_paths: [DESIGN_TECHNICAL_SOURCE_PATH],
      existence: "existing",
    });
    surface.route_binding_ref = "design-route-owner";
    const preflight = await preflightDesignResourceHandoff(
      fixture.root,
      DESIGN_HANDOFF_PATH,
    );
    const sourceItems = await compileSourceInventory(
      fixture.root,
      fixture.contract.task.source_paths,
    );
    const positive = createLongTaskDesignHandoffConsumer(
      fixture.contract,
      sourceItems,
    );
    positive.consume(preflight);
    assert.doesNotThrow(() => positive.finish());

    addTargetBlockingDesignConfirmation(fixture.contract, {
      key: "confirm-planned-design",
    });
    await writeContract(fixture.workdir, fixture.contract);
    const compiled = await compileDeliveryContract(
      fixture.workdir,
      fixture.root,
      { require_completion_gate: false },
    );
    assert.equal(compiled.schema_version, "compiled-long-task-delivery-v2");

    const missingSource = structuredClone(fixture.contract);
    missingSource.task.source_paths = missingSource.task.source_paths.filter(
      (sourcePath) => sourcePath !== authority.sourcePath,
    );
    const missingSourceConsumer = createLongTaskDesignHandoffConsumer(
      missingSource,
      sourceItems,
    );
    missingSourceConsumer.consume(preflight);
    assert.throws(
      () => missingSourceConsumer.finish(),
      /feasibility_authority_source_not_declared/u,
    );

    for (const [name, mutate, expected, compileExpected = expected] of [
      [
        "empty carrier",
        (contract) => {
          contract.outcomes[0].technical.bindings.find(
            (item) => item.key === "architecture-first",
          ).carrier_paths = [];
        },
        /feasibility_planned_binding_carrier_required/u,
        /ui_surface_binding_carrier_required|feasibility_planned_binding_carrier_required/u,
      ],
      [
        "outside carrier",
        (contract) => {
          contract.outcomes[0].technical.bindings.find(
            (item) => item.key === "architecture-first",
          ).carrier_paths = ["legacy/planned-card-owner.ts"];
        },
        /feasibility_component_binding_outside_owner_roots/u,
        /binding_carrier_outside_owner_boundary|feasibility_component_binding_outside_owner_roots/u,
      ],
      [
        "path-only Source Claim",
        (contract) => {
          contract.source_claims.find(
            (claim) => claim.key === authority.itemKey,
          ).source_ref = authority.sourcePath;
        },
        /feasibility_authority_claim_count/u,
      ],
    ]) {
      const contract = structuredClone(fixture.contract);
      mutate(contract);
      const consumer = createLongTaskDesignHandoffConsumer(
        contract,
        sourceItems,
      );
      consumer.consume(preflight);
      assert.throws(() => consumer.finish(), expected, name);

      await writeContract(fixture.workdir, contract);
      await assert.rejects(
        compileDeliveryContract(fixture.workdir, fixture.root, {
          require_completion_gate: false,
        }),
        compileExpected,
        name,
      );
    }
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("Long-Task permits one shared binding across complete condition cells", async () => {
  const fixture = await createDeliveryFixture();
  try {
    const handoff = await attachDesignResourceHandoff(fixture);
    await addDesignResourceImplementationFeasibility(
      fixture.root,
      handoff,
      (document) => {
        const baseCell = document.component_family_cells[0];
        const facts = new Map(handoff.facts.map((fact) => [fact.key, fact]));
        document.condition_model.profiles = DESIGN_CONDITION_KEYS.map(
          (conditionRef) => ({
            key: `profile-${conditionRef}`,
            condition_refs: [conditionRef],
          }),
        );
        document.component_family_cells = DESIGN_CONDITION_KEYS.map(
          (conditionRef) => ({
            ...structuredClone(baseCell),
            key: `card-${conditionRef}`,
            condition_profile_ref: `profile-${conditionRef}`,
            design_fact_refs: baseCell.design_fact_refs.filter(
              (factRef) => facts.get(factRef)?.condition_ref === conditionRef,
            ),
            feasible_realizations: baseCell.feasible_realizations.map(
              (realization) => ({
                ...structuredClone(realization),
                key: `${realization.key}-${conditionRef}`,
              }),
            ),
          }),
        );
      },
    );
    await writeDesignResourceHandoff(fixture.root, handoff);
    const outcome = fixture.contract.outcomes[0];
    outcome.product.surface_bindings[0].design_targets[0].source_paths.push(
      DESIGN_FEASIBILITY_PATH,
    );
    outcome.acceptance.checks[0].verification_inputs.push(
      DESIGN_FEASIBILITY_PATH,
    );
    const sharedBinding = outcome.technical.bindings.find(
      (item) => item.key === "state-first",
    );
    sharedBinding.target = DESIGN_TECHNICAL_SOURCE_PATH;
    sharedBinding.carrier_paths = [DESIGN_TECHNICAL_SOURCE_PATH];
    const preflight = await preflightDesignResourceHandoff(
      fixture.root,
      DESIGN_HANDOFF_PATH,
    );
    assert.equal(
      preflight.technical_feasibility_documents[0].component_family_cells
        .length,
      2,
    );
    const sourceItems = await compileSourceInventory(
      fixture.root,
      fixture.contract.task.source_paths,
    );
    const consumer = createLongTaskDesignHandoffConsumer(
      fixture.contract,
      sourceItems,
    );
    consumer.consume(preflight);
    assert.doesNotThrow(() => consumer.finish());

    const sharedFamilyPreflight = structuredClone(preflight);
    const sharedFamilyDocument =
      sharedFamilyPreflight.technical_feasibility_documents[0];
    const secondaryCell = structuredClone(
      sharedFamilyDocument.component_family_cells[0],
    );
    secondaryCell.key = "secondary-card-shared-owner";
    secondaryCell.component_family_ref = "component-family.secondary-card";
    sharedFamilyDocument.component_family_cells.push(secondaryCell);
    const familySubject = sharedFamilyPreflight.handoff.subjects.find(
      (subject) => subject.kind === "component_family",
    );
    sharedFamilyPreflight.handoff.subjects.push({
      ...structuredClone(familySubject),
      key: "component-family.secondary-card",
    });
    const surface = outcome.product.surface_bindings[0];
    assert.doesNotThrow(() =>
      validateLongTaskDesignFeasibilityBindings(
        fixture.contract,
        {
          outcome_key: outcome.key,
          binding: surface,
          target: surface.design_targets[0],
        },
        sharedFamilyPreflight,
        sourceItems,
      ),
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("Long-Task carries external-confirmation feasibility blockers through existing completion boundaries", async () => {
  const external = await createFeasibilityBlockerFixture(
    "external_confirmation",
  );
  try {
    const positive = createLongTaskDesignHandoffConsumer(
      external.fixture.contract,
      external.sourceItems,
    );
    positive.consume(external.preflight);
    assert.doesNotThrow(() => positive.finish());

    await writeContract(external.fixture.workdir, external.fixture.contract);
    const compiled = await compileDeliveryContract(
      external.fixture.workdir,
      external.fixture.root,
      { require_completion_gate: false },
    );
    assert.equal(compiled.schema_version, "compiled-long-task-delivery-v2");

    const ordinaryClaim = structuredClone(external.fixture.contract);
    ordinaryClaim.source_claims.find(
      (claim) => claim.key === external.authority.itemKey,
    ).disposition = {
      type: "claim",
      refs: ["first.obligation.architecture-first"],
    };
    const ordinary = createLongTaskDesignHandoffConsumer(
      ordinaryClaim,
      external.sourceItems,
    );
    ordinary.consume(external.preflight);
    assert.throws(
      () => ordinary.finish(),
      /feasibility_blocker_external_confirmation_required/u,
    );
    await writeContract(external.fixture.workdir, ordinaryClaim);
    await assert.rejects(
      compileDeliveryContract(external.fixture.workdir, external.fixture.root, {
        require_completion_gate: false,
      }),
      /source_item_disposition_mismatch|feasibility_blocker_external_confirmation_required/u,
    );

    for (const [name, mutate, expected, compileExpected = expected] of [
      [
        "missing",
        (contract) => {
          contract.global.acceptance.external_confirmations = [];
        },
        /feasibility_blocker_confirmation_unknown/u,
        /external_confirmation.*unknown|feasibility_blocker_confirmation_unknown/u,
      ],
      [
        "nonblocking",
        (contract) => {
          contract.global.acceptance.external_confirmations[0].blocks_target = false;
        },
        /feasibility_blocker_confirmation_not_blocking/u,
        /not_blocking|must_block/u,
      ],
      [
        "wrong impact",
        (contract) => {
          contract.global.acceptance.external_confirmations[0].impact_claims = [
            "first.requirement.observe-first",
          ];
        },
        /feasibility_blocker_confirmation_target_claim_missing/u,
        /impact.*mismatch|target_claim_missing/u,
      ],
    ]) {
      const contract = structuredClone(external.fixture.contract);
      mutate(contract);
      const consumer = createLongTaskDesignHandoffConsumer(
        contract,
        external.sourceItems,
      );
      consumer.consume(external.preflight);
      assert.throws(() => consumer.finish(), expected, name);
      await writeContract(external.fixture.workdir, contract);
      await assert.rejects(
        compileDeliveryContract(
          external.fixture.workdir,
          external.fixture.root,
          { require_completion_gate: false },
        ),
        compileExpected,
        name,
      );
    }

    const staleItems = structuredClone(external.sourceItems);
    staleItems.find(
      (item) => item.key === external.authority.itemKey,
    ).text_sha256 = "0".repeat(64);
    const stale = createLongTaskDesignHandoffConsumer(
      external.fixture.contract,
      staleItems,
    );
    stale.consume(external.preflight);
    assert.throws(
      () => stale.finish(),
      /feasibility_source_item_digest_mismatch/u,
    );
  } finally {
    await rm(external.fixture.root, { recursive: true, force: true });
  }
});

test("Long-Task compiles blocker-only componentless surfaces and reaches blocked_external", async () => {
  const blockerOnly = await createFeasibilityBlockerFixture(
    "external_confirmation",
    { blockerOnly: true },
  );
  try {
    const positive = createLongTaskDesignHandoffConsumer(
      blockerOnly.fixture.contract,
      blockerOnly.sourceItems,
    );
    positive.consume(blockerOnly.preflight);
    assert.doesNotThrow(() => positive.finish());

    const standaloneCandidate = structuredClone(blockerOnly.fixture.contract);
    standaloneCandidate.outcomes[0].product.surface_bindings[0].component_binding_refs =
      ["design-owner"];
    const standalone = parseDeliveryContractText(
      YAML.stringify(standaloneCandidate),
    );
    standalone.outcomes[0].product.surface_bindings[0].component_binding_refs =
      [];
    assert.throws(
      () => validateDeliveryContractStructure(standalone),
      /ui_surface_binding_component_ref_required/u,
    );
    await writeContract(
      blockerOnly.fixture.workdir,
      blockerOnly.fixture.contract,
    );
    const compiled = await compileDeliveryContract(
      blockerOnly.fixture.workdir,
      blockerOnly.fixture.root,
      { require_completion_gate: false },
    );
    assert.equal(compiled.schema_version, "compiled-long-task-delivery-v2");

    const missingClaimContract = structuredClone(blockerOnly.fixture.contract);
    missingClaimContract.source_claims =
      missingClaimContract.source_claims.filter(
        (claim) => claim.key !== blockerOnly.authority.itemKey,
      );
    const missingClaim = createLongTaskDesignHandoffConsumer(
      missingClaimContract,
      blockerOnly.sourceItems,
    );
    missingClaim.consume(blockerOnly.preflight);
    assert.throws(
      () => missingClaim.finish(),
      /feasibility_authority_claim_count/u,
    );
    await writeContract(blockerOnly.fixture.workdir, missingClaimContract);
    await assert.rejects(
      compileDeliveryContract(
        blockerOnly.fixture.workdir,
        blockerOnly.fixture.root,
        { require_completion_gate: false },
      ),
      /source_item_unmapped|source_authority_required|feasibility_authority_claim_count/u,
    );

    const fakeComponent = structuredClone(blockerOnly.fixture.contract);
    fakeComponent.outcomes[0].product.surface_bindings[0].component_binding_refs =
      ["state-first"];
    await writeContract(blockerOnly.fixture.workdir, fakeComponent);
    await assert.rejects(
      compileDeliveryContract(
        blockerOnly.fixture.workdir,
        blockerOnly.fixture.root,
        { require_completion_gate: false },
      ),
      /feasibility_component_binding_unattributed/u,
    );

    const legacy = structuredClone(blockerOnly.fixture.contract);
    const legacyHandoff = structuredClone(blockerOnly.handoff);
    delete legacyHandoff.technical_feasibility_inputs;
    await writeDesignResourceHandoff(blockerOnly.fixture.root, legacyHandoff);
    legacy.outcomes[0].product.surface_bindings[0].design_targets[0].source_paths =
      legacy.outcomes[0].product.surface_bindings[0].design_targets[0].source_paths.filter(
        (sourcePath) => sourcePath !== DESIGN_FEASIBILITY_PATH,
      );
    legacy.outcomes[0].acceptance.checks[0].verification_inputs =
      legacy.outcomes[0].acceptance.checks[0].verification_inputs.filter(
        (sourcePath) => sourcePath !== DESIGN_FEASIBILITY_PATH,
      );
    await writeContract(blockerOnly.fixture.workdir, legacy);
    await assert.rejects(
      compileDeliveryContract(
        blockerOnly.fixture.workdir,
        blockerOnly.fixture.root,
        { require_completion_gate: false },
      ),
      /componentless_surface_requires_blocker_only_feasibility/u,
    );

    await writeDesignResourceHandoff(
      blockerOnly.fixture.root,
      blockerOnly.handoff,
    );
    await writeContract(
      blockerOnly.fixture.workdir,
      blockerOnly.fixture.contract,
    );
    await runCli(blockerOnly.fixture.root, ["enable", "long-task"]);
    await commitCandidate(blockerOnly.fixture.root);
    await runCli(blockerOnly.fixture.root, [
      "long-task",
      "compile",
      blockerOnly.fixture.workdir,
    ]);
    await runCli(blockerOnly.fixture.root, [
      "long-task",
      "verify",
      blockerOnly.fixture.workdir,
    ]);
    const finalGate = await runCliFailure(
      blockerOnly.fixture.root,
      ["long-task", "final-gate", blockerOnly.fixture.workdir],
      { skipCandidateCommit: true },
    );
    assert.equal(finalGate.workflow_status, "blocked_external");
    assert.notEqual(finalGate.workflow_status, "machine_accepted");
  } finally {
    await rm(blockerOnly.fixture.root, { recursive: true, force: true });
  }
});

test("Long-Task rejects stale blocker Source during Compile", async () => {
  const staleSource = await createFeasibilityBlockerFixture(
    "external_confirmation",
    { blockerOnly: true },
  );
  try {
    const sourceFile = path.join(
      staleSource.fixture.root,
      ...staleSource.authority.sourcePath.split("/"),
    );
    const staleText = (await readFile(sourceFile, "utf8")).replace(
      "Technical feasibility decision source",
      "Stale technical feasibility decision source",
    );
    await writeFile(sourceFile, staleText);
    const feasibilityFile = path.join(
      staleSource.fixture.root,
      ...DESIGN_FEASIBILITY_PATH.split("/"),
    );
    const feasibility = JSON.parse(await readFile(feasibilityFile, "utf8"));
    feasibility.source_records.find(
      (record) => record.key === staleSource.authority.recordRef,
    ).sha256 = sha256Text(staleText);
    const feasibilityText = `${JSON.stringify(feasibility, null, 2)}\n`;
    await writeFile(feasibilityFile, feasibilityText);
    staleSource.handoff.technical_feasibility_inputs[0].sha256 =
      sha256Text(feasibilityText);
    await writeDesignResourceHandoff(
      staleSource.fixture.root,
      staleSource.handoff,
    );
    await writeContract(
      staleSource.fixture.workdir,
      staleSource.fixture.contract,
    );
    await assert.rejects(
      compileDeliveryContract(
        staleSource.fixture.workdir,
        staleSource.fixture.root,
        { require_completion_gate: false },
      ),
      /source_claim_statement_mismatch|feasibility_source_item_digest_mismatch/u,
    );
  } finally {
    await rm(staleSource.fixture.root, { recursive: true, force: true });
  }
});

test("Long-Task keeps decision blockers outside machine Compile", async () => {
  const decision = await createFeasibilityBlockerFixture("decision", {
    blockerOnly: true,
  });
  try {
    const consumer = createLongTaskDesignHandoffConsumer(
      decision.fixture.contract,
      decision.sourceItems,
    );
    consumer.consume(decision.preflight);
    assert.doesNotThrow(() => consumer.finish());
    await writeContract(decision.fixture.workdir, decision.fixture.contract);
    await assert.rejects(
      compileDeliveryContract(decision.fixture.workdir, decision.fixture.root, {
        require_completion_gate: false,
      }),
      /source_claim_decision_required/u,
    );
  } finally {
    await rm(decision.fixture.root, { recursive: true, force: true });
  }
});

test("Long-Task closes componentless mixed design targets only when every target is blocker-only", async () => {
  const allBlockerOnly = await createFeasibilityBlockerFixture(
    "external_confirmation",
    { blockerOnly: true },
  );
  try {
    const { secondary, sourceItems } = attachClonedFeasibilityTarget(
      allBlockerOnly,
      { blockerOnly: true },
    );
    const consumer = createLongTaskDesignHandoffConsumer(
      allBlockerOnly.fixture.contract,
      sourceItems,
    );
    consumer.consume(allBlockerOnly.preflight);
    consumer.consume(secondary);
    assert.doesNotThrow(() => consumer.finish());
  } finally {
    await rm(allBlockerOnly.fixture.root, { recursive: true, force: true });
  }

  const candidateWithoutComponents = await createFeasibilityBlockerFixture(
    "external_confirmation",
  );
  try {
    candidateWithoutComponents.fixture.contract.outcomes[0].product.surface_bindings[0].component_binding_refs =
      [];
    const { secondary, sourceItems } = attachClonedFeasibilityTarget(
      candidateWithoutComponents,
      { blockerOnly: true },
    );
    const consumer = createLongTaskDesignHandoffConsumer(
      candidateWithoutComponents.fixture.contract,
      sourceItems,
    );
    consumer.consume(candidateWithoutComponents.preflight);
    consumer.consume(secondary);
    assert.throws(
      () => consumer.finish(),
      /feasibility_(?:component_binding_required|realization_binding_missing)/u,
    );
  } finally {
    await rm(candidateWithoutComponents.fixture.root, {
      recursive: true,
      force: true,
    });
  }

  const legacyTarget = await createFeasibilityBlockerFixture(
    "external_confirmation",
    { blockerOnly: true },
  );
  try {
    const { secondary, sourceItems, feasibilityPath } =
      attachClonedFeasibilityTarget(legacyTarget, { blockerOnly: true });
    secondary.technical_feasibility_documents = [];
    secondary.technical_feasibility_identities = [];
    secondary.handoff.technical_feasibility_inputs = [];
    const surface =
      legacyTarget.fixture.contract.outcomes[0].product.surface_bindings[0];
    const secondaryTarget = surface.design_targets.find(
      (target) => target.key === "secondary-default",
    );
    secondaryTarget.source_paths = secondaryTarget.source_paths.filter(
      (sourcePath) => sourcePath !== feasibilityPath,
    );
    const check =
      legacyTarget.fixture.contract.outcomes[0].acceptance.checks[0];
    check.verification_inputs = check.verification_inputs.filter(
      (sourcePath) => sourcePath !== feasibilityPath,
    );
    const consumer = createLongTaskDesignHandoffConsumer(
      legacyTarget.fixture.contract,
      sourceItems,
    );
    consumer.consume(legacyTarget.preflight);
    consumer.consume(secondary);
    assert.throws(
      () => consumer.finish(),
      /componentless_surface_requires_blocker_only_feasibility/u,
    );
  } finally {
    await rm(legacyTarget.fixture.root, { recursive: true, force: true });
  }

  const candidateAndBlocker = await createFeasibilityBlockerFixture(
    "external_confirmation",
  );
  try {
    const { secondary, sourceItems } = attachClonedFeasibilityTarget(
      candidateAndBlocker,
      { blockerOnly: true },
    );
    const consumer = createLongTaskDesignHandoffConsumer(
      candidateAndBlocker.fixture.contract,
      sourceItems,
    );
    consumer.consume(candidateAndBlocker.preflight);
    consumer.consume(secondary);
    assert.doesNotThrow(() => consumer.finish());
  } finally {
    await rm(candidateAndBlocker.fixture.root, {
      recursive: true,
      force: true,
    });
  }
});

test("Long-Task Compile binds every declared design verification method to an independent Assertion", async () => {
  const missingMethod = await createDeliveryFixture();
  try {
    await attachDesignResourceHandoff(missingMethod);
    missingMethod.contract.outcomes[0].product.surface_bindings[0].design_targets[0].verification_method_bindings.pop();
    await writeContract(missingMethod.workdir, missingMethod.contract);
    await assert.rejects(
      compileDeliveryContract(missingMethod.workdir, missingMethod.root, {
        require_completion_gate: false,
      }),
      /design_resource_verification_methods_mismatch:main-default/u,
    );
  } finally {
    await rm(missingMethod.root, { recursive: true, force: true });
  }

  const missingClaim = await createDeliveryFixture();
  try {
    await attachDesignResourceHandoff(missingClaim);
    const outcome = missingClaim.contract.outcomes[0];
    const target = outcome.product.surface_bindings[0].design_targets[0];
    const binding = target.verification_method_bindings.find(
      (item) => item.method === "layout_geometry",
    );
    const assertion = outcome.acceptance.checks[0].positive_assertions.find(
      (item) => item.key === binding.assertion_ref,
    );
    assertion.claims = ["result"];
    await writeContract(missingClaim.workdir, missingClaim.contract);
    await assert.rejects(
      compileDeliveryContract(missingClaim.workdir, missingClaim.root, {
        require_completion_gate: false,
      }),
      /design_resource_verification_method_claim_not_asserted:main-default:layout_geometry:design-main:requirement\.design-handoff/u,
    );
  } finally {
    await rm(missingClaim.root, { recursive: true, force: true });
  }

  const reusedEvidence = await createDeliveryFixture();
  try {
    await attachDesignResourceHandoff(reusedEvidence);
    const target =
      reusedEvidence.contract.outcomes[0].product.surface_bindings[0]
        .design_targets[0];
    for (const binding of target.verification_method_bindings)
      for (const artifact of binding.evidence_artifacts)
        artifact.observation_path = "artifacts/reused-settled-screenshot.png";
    await writeContract(reusedEvidence.workdir, reusedEvidence.contract);
    await assert.rejects(
      compileDeliveryContract(reusedEvidence.workdir, reusedEvidence.root, {
        require_completion_gate: false,
      }),
      /ui_design_method_evidence_artifact_reused/u,
    );
  } finally {
    await rm(reusedEvidence.root, { recursive: true, force: true });
  }

  const missingRuntimeCapability = await createDeliveryFixture();
  try {
    await attachDesignResourceHandoff(missingRuntimeCapability);
    const target = missingRuntimeCapability.contract.task.execution_targets[0];
    target.capabilities = target.capabilities.filter(
      (capability) => capability !== "motion-observation",
    );
    await synchronizeFixtureExecutionTargetSource(
      missingRuntimeCapability.root,
      missingRuntimeCapability.contract,
    );
    await writeContract(
      missingRuntimeCapability.workdir,
      missingRuntimeCapability.contract,
    );
    await assert.rejects(
      compileDeliveryContract(
        missingRuntimeCapability.workdir,
        missingRuntimeCapability.root,
        { require_completion_gate: false },
      ),
      /design_resource_execution_target_capability_missing:main-default:fixture-app:motion-observation/u,
    );
  } finally {
    await rm(missingRuntimeCapability.root, {
      recursive: true,
      force: true,
    });
  }

  const bundledCondition = await createDeliveryFixture();
  try {
    const handoff = await attachDesignResourceHandoff(bundledCondition);
    handoff.conditions[0].display_mode = "planning|dark";
    await writeDesignResourceHandoff(bundledCondition.root, handoff);
    await writeContract(bundledCondition.workdir, bundledCondition.contract);
    await assert.rejects(
      compileDeliveryContract(bundledCondition.workdir, bundledCondition.root, {
        require_completion_gate: false,
      }),
      /display_mode:must match \^\[a-z0-9\]/u,
    );
  } finally {
    await rm(bundledCondition.root, { recursive: true, force: true });
  }
});

test("design binding covers method Source Claims through separate single-Claim root and method Assertions", async () => {
  const fixture = await createDeliveryFixture();
  try {
    await attachDesignResourceHandoff(fixture, {
      splitRootAndMethodClaim: true,
    });
    const outcome = fixture.contract.outcomes[0];
    const target = outcome.product.surface_bindings[0].design_targets[0];
    const check = outcome.acceptance.checks.find(
      (candidate) => candidate.key === target.conformance_check_ref,
    );
    const rootAssertion = check.positive_assertions.find(
      (assertion) => assertion.key === target.conformance_assertion_ref,
    );
    const methodAssertion = check.positive_assertions.find(
      (assertion) =>
        assertion.key === target.verification_method_bindings[0].assertion_ref,
    );
    assert.deepEqual(rootAssertion.claims, [DESIGN_ROOT_CLAIM]);
    assert.deepEqual(methodAssertion.claims, ["requirement.design-handoff"]);
    for (const assertion of [
      ...check.positive_assertions,
      ...check.negative_assertions,
    ])
      assert.ok(
        assertion.claims.length <= 1,
        `${assertion.key} must remain claimless or single-Claim`,
      );

    const preflight = await preflightDesignResourceHandoff(
      fixture.root,
      DESIGN_HANDOFF_PATH,
    );
    assert.equal(preflight.status, "ready");
    const consumer = createLongTaskDesignHandoffConsumer(fixture.contract);
    consumer.consume(preflight);
    assert.doesNotThrow(() => consumer.finish());
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("Long-Task Compile rejects every exact design-fact binding drift", async () => {
  const cases = [
    [
      "missing",
      (target) => {
        const artifact =
          target.verification_method_bindings[0].evidence_artifacts[0];
        artifact.fact_refs = [];
        artifact.fact_expectations = [];
      },
      /design_method_fact_refs_mismatch/u,
    ],
    [
      "extra",
      (target) => {
        const artifact =
          target.verification_method_bindings[0].evidence_artifacts[0];
        artifact.fact_refs.push("fact.unbound");
        artifact.fact_expectations.push({
          ...structuredClone(artifact.fact_expectations[0]),
          fact_ref: "fact.unbound",
        });
      },
      /design_method_fact_refs_mismatch/u,
    ],
    [
      "duplicate",
      (target) => {
        const artifact =
          target.verification_method_bindings[0].evidence_artifacts[0];
        artifact.fact_refs.push(artifact.fact_refs[0]);
        artifact.fact_expectations.push(
          structuredClone(artifact.fact_expectations[0]),
        );
      },
      /ui_design_method_fact_ref_duplicate/u,
    ],
    [
      "wrong method",
      (target) => {
        const first =
          target.verification_method_bindings[0].evidence_artifacts[0];
        const second =
          target.verification_method_bindings[1].evidence_artifacts[0];
        [first.fact_refs, second.fact_refs] = [
          second.fact_refs,
          first.fact_refs,
        ];
        [first.fact_expectations, second.fact_expectations] = [
          second.fact_expectations,
          first.fact_expectations,
        ];
      },
      /design_method_fact_refs_mismatch/u,
    ],
    [
      "wrong condition",
      (target) => {
        const artifacts =
          target.verification_method_bindings[0].evidence_artifacts;
        [artifacts[0].fact_refs, artifacts[1].fact_refs] = [
          artifacts[1].fact_refs,
          artifacts[0].fact_refs,
        ];
        [artifacts[0].fact_expectations, artifacts[1].fact_expectations] = [
          artifacts[1].fact_expectations,
          artifacts[0].fact_expectations,
        ];
      },
      /design_method_fact_refs_mismatch/u,
    ],
    [
      "reused",
      (target) => {
        const artifacts =
          target.verification_method_bindings[0].evidence_artifacts;
        artifacts[1].fact_refs.push(artifacts[0].fact_refs[0]);
        artifacts[1].fact_expectations.push(
          structuredClone(artifacts[0].fact_expectations[0]),
        );
      },
      /design_method_fact_refs_mismatch/u,
    ],
  ];
  for (const [name, mutate, expected] of cases) {
    const fixture = await createDeliveryFixture();
    try {
      await attachDesignResourceHandoff(fixture);
      const target =
        fixture.contract.outcomes[0].product.surface_bindings[0]
          .design_targets[0];
      mutate(target);
      await writeContract(fixture.workdir, fixture.contract);
      await assert.rejects(
        compileDeliveryContract(fixture.workdir, fixture.root, {
          require_completion_gate: false,
        }),
        expected,
        name,
      );
    } finally {
      await rm(fixture.root, { recursive: true, force: true });
    }
  }
});

test("Long-Task Compile freezes every per-Fact expectation authority field", async () => {
  const locatedDrift = {
    locator: {
      resource_ref: "resource.main",
      kind: "json_pointer",
      value: "/drift",
    },
    sha256: "f".repeat(64),
  };
  const cases = [
    [
      "missing expectation",
      (artifact) => artifact.fact_expectations.pop(),
      /ui_design_method_fact_expectation_refs_mismatch/u,
    ],
    [
      "extra expectation",
      (artifact) =>
        artifact.fact_expectations.push({
          ...structuredClone(artifact.fact_expectations[0]),
          fact_ref: "fact.unbound",
        }),
      /ui_design_method_fact_expectation_refs_mismatch/u,
    ],
    [
      "duplicate expectation",
      (artifact) =>
        artifact.fact_expectations.push(
          structuredClone(artifact.fact_expectations[0]),
        ),
      /ui_design_method_fact_expectation_duplicate/u,
    ],
    [
      "subject identity",
      (_artifact, expectation) => {
        expectation.subject_ref = "subject.drift";
      },
      /design_method_fact_expectations_mismatch/u,
    ],
    [
      "expected locator",
      (_artifact, expectation) => {
        expectation.expected.locator.value = "/drift";
      },
      /design_method_fact_expectations_mismatch/u,
    ],
    [
      "expected digest",
      (_artifact, expectation) => {
        expectation.expected.sha256 = "f".repeat(64);
      },
      /design_method_fact_expectations_mismatch/u,
    ],
    [
      "comparator",
      (_artifact, expectation) => {
        expectation.comparison.comparator = "content_equal";
      },
      /design_method_fact_expectations_mismatch/u,
    ],
    [
      "comparison parameters",
      (_artifact, expectation) => {
        expectation.comparison.parameters = structuredClone(locatedDrift);
      },
      /design_method_fact_expectations_mismatch/u,
    ],
    [
      "tolerance",
      (_artifact, expectation) => {
        expectation.comparison.tolerance = structuredClone(locatedDrift);
      },
      /design_method_fact_expectations_mismatch/u,
    ],
    [
      "mask",
      (_artifact, expectation) => {
        expectation.comparison.mask = structuredClone(locatedDrift);
      },
      /design_method_fact_expectations_mismatch/u,
    ],
    [
      "oracle identity",
      (_artifact, expectation) => {
        expectation.oracle.identity = "different-oracle";
      },
      /design_method_fact_expectations_mismatch/u,
    ],
    [
      "environment identity",
      (_artifact, expectation) => {
        expectation.environment.definition.sha256 = "f".repeat(64);
      },
      /design_method_fact_expectations_mismatch/u,
    ],
  ];
  for (const [name, mutate, expected] of cases) {
    const fixture = await createDeliveryFixture();
    try {
      await attachDesignResourceHandoff(fixture);
      const artifact =
        fixture.contract.outcomes[0].product.surface_bindings[0]
          .design_targets[0].verification_method_bindings[0]
          .evidence_artifacts[0];
      mutate(artifact, artifact.fact_expectations[0]);
      await writeContract(fixture.workdir, fixture.contract);
      await assert.rejects(
        compileDeliveryContract(fixture.workdir, fixture.root, {
          require_completion_gate: false,
        }),
        expected,
        name,
      );
    } finally {
      await rm(fixture.root, { recursive: true, force: true });
    }
  }
});

test("Long-Task Compile rejects handoff target drift and unbound handoff blockers", async () => {
  const targetFixture = await createDeliveryFixture();
  try {
    await attachDesignResourceHandoff(targetFixture);
    targetFixture.contract.outcomes[0].product.surface_bindings[0].design_targets[0].condition_keys =
      ["other-condition"];
    await writeContract(targetFixture.workdir, targetFixture.contract);
    await assert.rejects(
      compileDeliveryContract(targetFixture.workdir, targetFixture.root, {
        require_completion_gate: false,
      }),
      /ui_design_method_evidence_conditions_mismatch/u,
    );
  } finally {
    await rm(targetFixture.root, { recursive: true, force: true });
  }

  const blockerFixture = await createDeliveryFixture();
  try {
    const handoff = await attachDesignResourceHandoff(blockerFixture);
    handoff.acceptance_blockers.push(
      designAcceptanceBlocker(handoff, "accessibility_semantics"),
    );
    await writeDesignResourceHandoff(blockerFixture.root, handoff);
    await writeContract(blockerFixture.workdir, blockerFixture.contract);
    await assert.rejects(
      compileDeliveryContract(blockerFixture.workdir, blockerFixture.root, {
        require_completion_gate: false,
      }),
      /acceptance_blockers_unresolved:accessibility-proof/u,
    );
  } finally {
    await rm(blockerFixture.root, { recursive: true, force: true });
  }

  const blockerLineageFixture = await createDeliveryFixture();
  try {
    const handoff = await attachDesignResourceHandoff(blockerLineageFixture);
    const handoffBlocker = designAcceptanceBlocker(
      handoff,
      "accessibility_semantics",
    );
    handoff.acceptance_blockers.push(handoffBlocker);
    const binding =
      blockerLineageFixture.contract.outcomes[0].product.surface_bindings[0];
    binding.acceptance_blockers.push({
      key: handoffBlocker.key,
      status: "machine_claim",
      refs: ["requirement.design-handoff"],
      source_item_refs: [DESIGN_SOURCE_ITEM_KEY],
      verification_methods: [...handoffBlocker.verification_methods],
      required_capabilities: ["assistive-technology"],
      rationale:
        "Even a mirrored downstream binding cannot launder an unresolved handoff blocker.",
    });
    await writeDesignResourceHandoff(blockerLineageFixture.root, handoff);
    await writeContract(
      blockerLineageFixture.workdir,
      blockerLineageFixture.contract,
    );
    await assert.rejects(
      compileDeliveryContract(
        blockerLineageFixture.workdir,
        blockerLineageFixture.root,
        { require_completion_gate: false },
      ),
      /acceptance_blockers_unresolved:accessibility-proof/u,
    );
  } finally {
    await rm(blockerLineageFixture.root, {
      recursive: true,
      force: true,
    });
  }
});

test("counterfactual mutation must stay on carriers and cannot delete verification inputs", async () => {
  const fixture = await createDeliveryFixture();
  try {
    const outcome = fixture.contract.outcomes[0];
    const check = outcome.acceptance.checks[0];
    fixture.contract.risk.requested_level = "strict";
    check.negative_assertions.push({
      key: "result-not-false",
      criterion: "The result remains comparable in the negative scenario.",
      claims: [],
      observation: "result_not_false",
      evidence_capabilities: ["presence"],
      operator: "equals",
      expected: false,
    });
    outcome.acceptance.counterfactual_controls.push({
      key: "missing-carrier",
      binding_key: "state-first",
      claims: ["obligation.implement-first"],
      check_key: check.key,
      mutation: {
        type: "replace_file",
        path: "src/missing.json",
        fixture_path: "tests/semantic-false.json",
      },
      expected_assertion_failures: ["first-obligation"],
      preserved_assertions: ["first-liveness"],
    });
    await writeContract(fixture.workdir, fixture.contract);
    await assert.rejects(
      compileDeliveryContract(fixture.workdir, fixture.root, {
        require_completion_gate: false,
      }),
      /counterfactual_path_outside_binding:first:missing-carrier:src\/missing\.json/,
    );
    const protectedRunnerBinding = outcome.technical.bindings.find(
      (binding) => binding.key === "product-root-first",
    );
    outcome.acceptance.counterfactual_controls[0].binding_key =
      protectedRunnerBinding.key;
    outcome.acceptance.counterfactual_controls[0].mutation.path =
      protectedRunnerBinding.target;
    await writeContract(fixture.workdir, fixture.contract);
    await assert.rejects(
      compileDeliveryContract(fixture.workdir, fixture.root, {
        require_completion_gate: false,
      }),
      /counterfactual_verification_input_protected/,
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

function cloneDesignHandoffTarget(primary) {
  const secondary = structuredClone(primary);
  secondary.handoff_path = "design/handoff-secondary.md";
  const mapping = new Map([
    [DESIGN_TARGET_KEY, "secondary-default"],
    [DESIGN_SOURCE_ITEM_KEY, "design-secondary"],
  ]);
  for (const collection of [
    "resources",
    "axis_dispositions",
    "condition_exclusions",
    "subjects",
    "variation_axis_dispositions",
    "variation_exclusions",
    "variations",
    "lineage_nodes",
    "targets",
    "evidence",
    "fact_cells",
    "facts",
    "proof_obligations",
    "environments",
    "asset_bindings",
    "resource_fact_closure",
    "coverage",
    "acceptance_blockers",
  ])
    for (const row of secondary.handoff[collection])
      if (!mapping.has(row.key)) mapping.set(row.key, `secondary.${row.key}`);
  for (const resource of secondary.handoff.resources)
    mapping.set(resource.path, `design/secondary/${resource.path}`);
  replaceExactStringMap(secondary, mapping);
  const reverseMapping = new Map([...mapping].map(([from, to]) => [to, from]));
  return { handoff: secondary, mapping, reverseMapping };
}

function attachSecondaryDesignTarget(contract, secondary, mapping) {
  const binding = contract.outcomes[0].product.surface_bindings[0];
  const secondaryTarget = structuredClone(binding.design_targets[0]);
  replaceExactStringMap(secondaryTarget, mapping);
  secondaryTarget.key = "secondary-default";
  const handoffTarget = secondary.handoff.targets[0];
  secondaryTarget.source_paths = [
    secondary.handoff_path,
    ...handoffTarget.resource_refs.map(
      (ref) =>
        secondary.handoff.resources.find((resource) => resource.key === ref)
          .path,
    ),
  ];
  binding.design_targets.push(secondaryTarget);
  contract.task.source_paths.push(secondary.handoff_path);
  contract.outcomes[0].acceptance.checks[0].verification_inputs.push(
    secondary.handoff_path,
    secondary.handoff.resources.find(
      (resource) => resource.key === "secondary.resource.fact-manifest",
    ).path,
  );
  const sourceClaim = structuredClone(
    contract.source_claims.find(
      (claim) => claim.key === DESIGN_SOURCE_ITEM_KEY,
    ),
  );
  sourceClaim.key = "design-secondary";
  sourceClaim.source_ref = `${secondary.handoff_path}#main-design`;
  contract.source_claims.push(sourceClaim);
}

function replaceExactStringMap(value, mapping) {
  if (value instanceof Set) {
    const entries = [...value];
    value.clear();
    for (const entry of entries)
      value.add(
        typeof entry === "string" && mapping.has(entry)
          ? mapping.get(entry)
          : entry,
      );
    return;
  }
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      if (typeof value[index] === "string" && mapping.has(value[index]))
        value[index] = mapping.get(value[index]);
      else replaceExactStringMap(value[index], mapping);
    }
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const [key, entry] of Object.entries(value)) {
    const nextKey = mapping.get(key) ?? key;
    if (nextKey !== key) {
      delete value[key];
      value[nextKey] = entry;
    }
    if (typeof entry === "string" && mapping.has(entry))
      value[nextKey] = mapping.get(entry);
    else replaceExactStringMap(value[nextKey], mapping);
  }
}

async function attachDesignResourceHandoff(
  fixture,
  { splitRootAndMethodClaim = false } = {},
) {
  const { handoff } = await writeDesignResourceHandoffFixture(
    fixture.root,
    splitRootAndMethodClaim
      ? (candidate) => {
          const fact = candidate.facts.find((item) =>
            item.source_item_refs.includes(DESIGN_SOURCE_ITEM_KEY),
          );
          assert.ok(fact);
          fact.source_item_refs.push(DESIGN_ROOT_SOURCE_ITEM_KEY);
          for (const coverage of candidate.coverage)
            if (coverage.fact_refs.includes(fact.key))
              coverage.source_item_refs.push(DESIGN_ROOT_SOURCE_ITEM_KEY);
        }
      : undefined,
    splitRootAndMethodClaim
      ? {
          additionalSourceItems: [
            {
              key: DESIGN_ROOT_SOURCE_ITEM_KEY,
              kind: "control",
              statement: DESIGN_ROOT_STATEMENT,
            },
          ],
        }
      : {},
  );
  const playwrightTestModuleUrl = await cachedPlaywrightTestModule();
  await writeFile(
    path.join(fixture.root, "tests", "ui.spec.mjs"),
    `import { test, expect } from ${JSON.stringify(playwrightTestModuleUrl)};
test("design handoff fixture smoke", async () => {
  expect(true).toBe(true);
});
`,
  );
  const outcome = fixture.contract.outcomes[0];
  const check = outcome.acceptance.checks[0];
  fixture.contract.task.execution_targets[0].capabilities.push(
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
  fixture.contract.task.execution_targets.push({
    key: "fixture-browser",
    description: "The fixture browser support target.",
    role: "support",
    runtime_family: "browser",
    root_entrypoint: "tests/ui.spec.mjs",
    capabilities: [
      "browser-runtime",
      "cold-start",
      "production-root",
      "pointer-input",
      "keyboard-input",
      "viewport-control",
      "motion-observation",
      "assistive-technology",
    ],
  });
  outcome.acceptance.checks.push({
    key: "first-ui-check",
    journey_roles: ["success"],
    execution_target: {
      target_ref: "fixture-browser",
      entrypoint: "root",
    },
    scenario: {
      given: [{ key: "ui-loaded", statement: "Load the fixture UI." }],
      when: [{ key: "inspect-ui", statement: "Inspect the fixture UI." }],
    },
    proof_surface: "ui_browser",
    runner: {
      type: "playwright_test",
      target: "tests/ui.spec.mjs",
      argv: [],
      cwd: ".",
      timeout_ms: 30000,
      effect: "read_only",
      retry_policy: "none",
      idempotent: true,
    },
    verification_inputs: ["tests/ui.spec.mjs"],
    input_paths: ["src/**"],
    expected_output_paths: [],
    artifact_globs: [],
    positive_assertions: [],
    negative_assertions: [],
    environment_requirements: [],
  });
  outcome.product.requirements.push({
    key: "design-handoff",
    statement:
      "The main surface must conform to every declared atomic observable design Fact.",
    required_proof_surfaces: ["runtime_behavior"],
    applicability_refs: ["first-root-success"],
  });
  outcome.product.controls.push(
    completeControl({
      key: "main",
      surface: "fixture-main",
      location: "main content",
    }),
  );
  check.verification_inputs.push(DESIGN_HANDOFF_PATH, ...DESIGN_RESOURCE_PATHS);
  check.artifact_globs = ["artifacts/**"];
  const verificationMethods = [
    ...new Set(handoff.proof_obligations.map((proof) => proof.method)),
  ];
  for (const method of verificationMethods) {
    const capabilities =
      method === "interaction_trace"
        ? ["design_method", "interaction_trace", "target_runtime"]
        : method === "component_state"
          ? [
              "design_method",
              "design_conformance",
              "interaction_trace",
              "target_runtime",
            ]
          : ["design_method", "design_conformance", "target_runtime"];
    const assertion = structuredClone(check.positive_assertions[0]);
    assertion.key = `design-${method.replaceAll("_", "-")}`;
    assertion.observation = `design_${method}`;
    assertion.claims = ["requirement.design-handoff"];
    assertion.evidence_capabilities = [
      ...new Set([...assertion.evidence_capabilities, ...capabilities]),
    ];
    check.positive_assertions.push(assertion);
    outcome.acceptance.counterfactual_controls[0].expected_assertion_failures.push(
      assertion.key,
    );
  }
  outcome.acceptance.counterfactual_controls[0].claims.push(
    "requirement.design-handoff",
    "control.main.surface",
    "control.main.location",
  );
  addProductionControlBinding(fixture.contract, {
    controlKey: "main",
    rootClaimRef: "control.main.location",
    designTargets: [
      {
        key: DESIGN_TARGET_KEY,
        interpretation: "exact_target",
        source_paths: [DESIGN_HANDOFF_PATH, ...DESIGN_RESOURCE_PATHS],
        condition_keys: DESIGN_CONDITION_KEYS,
        claim_refs: ["control.main.location"],
        conformance_check_ref: "first-check",
        conformance_assertion_ref: "main-location-proof",
        verification_method_bindings: verificationMethods.map((method) => ({
          method,
          assertion_ref: `design-${method.replaceAll("_", "-")}`,
          evidence_artifacts: DESIGN_CONDITION_KEYS.map((conditionKey) => ({
            condition_key: conditionKey,
            path: `artifacts/method-${method}-${conditionKey}.json`,
            observation_path: `artifacts/observation-${method}-${conditionKey}.json`,
            fact_refs: handoff.proof_obligations
              .filter(
                (proof) =>
                  proof.method === method &&
                  handoff.facts.some(
                    (fact) =>
                      fact.key === proof.fact_ref &&
                      fact.condition_ref === conditionKey,
                  ),
              )
              .map((proof) => proof.fact_ref),
            fact_expectations: handoff.proof_obligations
              .filter(
                (proof) =>
                  proof.method === method &&
                  handoff.facts.some(
                    (fact) =>
                      fact.key === proof.fact_ref &&
                      fact.condition_ref === conditionKey,
                  ),
              )
              .map((proof) => designFactExpectation(handoff, proof)),
          })),
        })),
        actual_artifact_path: "artifacts/design-actual.json",
        comparison_artifact_path: "artifacts/design-comparison.json",
      },
    ],
  });
  const rootAssertion = check.positive_assertions.find(
    (assertion) => assertion.key === "main-location-proof",
  );
  rootAssertion.evidence_capabilities.push("design_conformance");
  fixture.contract.task.source_paths.push(DESIGN_HANDOFF_PATH);
  fixture.contract.source_claims.push({
    key: DESIGN_SOURCE_ITEM_KEY,
    source_ref: `${DESIGN_HANDOFF_PATH}#main-design`,
    statement:
      "The main surface must conform to every declared atomic observable design Fact.",
    disposition: {
      type: "claim",
      refs: ["first.requirement.design-handoff"],
    },
  });
  if (splitRootAndMethodClaim)
    fixture.contract.source_claims.push({
      key: DESIGN_ROOT_SOURCE_ITEM_KEY,
      source_ref: `${DESIGN_HANDOFF_PATH}#main-design`,
      statement: DESIGN_ROOT_STATEMENT,
      disposition: {
        type: "claim",
        refs: [`first.${DESIGN_ROOT_CLAIM}`],
      },
    });
  await synchronizeFixtureExecutionTargetSource(fixture.root, fixture.contract);
  return handoff;
}

function assertOptionalFeasibilityBindingClosure(
  fixture,
  preflight,
  sourceItems,
) {
  const optionalPreflight = structuredClone(preflight);
  const optionalCell =
    optionalPreflight.technical_feasibility_documents[0]
      .component_family_cells[0];
  optionalCell.required_realization = {
    realization_ref: null,
    technical_authority_source_refs: [],
  };
  optionalCell.feasible_realizations.push({
    ...structuredClone(optionalCell.feasible_realizations[0]),
    key: "reuse-state-card",
    owner_candidates: [
      {
        kind: "existing_path",
        locator: "src/state.json",
        existence: "existing",
      },
    ],
  });
  const uniqueOptional = createLongTaskDesignHandoffConsumer(
    fixture.contract,
    sourceItems,
  );
  uniqueOptional.consume(optionalPreflight);
  assert.doesNotThrow(() => uniqueOptional.finish());

  const missingOptionalContract = structuredClone(fixture.contract);
  const missingOptionalBinding =
    missingOptionalContract.outcomes[0].technical.bindings.find(
      (item) => item.key === "state-first",
    );
  missingOptionalBinding.target = "src/unrelated.json";
  missingOptionalBinding.carrier_paths = ["src/unrelated.json"];
  const missingOptional = createLongTaskDesignHandoffConsumer(
    missingOptionalContract,
    sourceItems,
  );
  missingOptional.consume(optionalPreflight);
  assert.throws(
    () => missingOptional.finish(),
    /feasibility_realization_binding_missing/u,
  );

  const ambiguousPreflight = structuredClone(optionalPreflight);
  ambiguousPreflight.technical_feasibility_documents[0].component_family_cells[0].feasible_realizations.push(
    {
      ...structuredClone(optionalCell.feasible_realizations[0]),
      key: "reuse-project-card-again",
    },
  );
  const ambiguous = createLongTaskDesignHandoffConsumer(
    fixture.contract,
    sourceItems,
  );
  ambiguous.consume(ambiguousPreflight);
  assert.throws(
    () => ambiguous.finish(),
    /feasibility_realization_binding_ambiguous/u,
  );
}

async function createFeasibilityBlockerFixture(
  itemKind,
  { blockerOnly = false } = {},
) {
  const fixture = await createDeliveryFixture();
  const handoff = await attachDesignResourceHandoff(fixture);
  let authority;
  const itemKindSlug = itemKind.replaceAll("_", "-");
  await addDesignResourceImplementationFeasibility(
    fixture.root,
    handoff,
    async (document) => {
      const cell = document.component_family_cells[0];
      authority = await addV1FeasibilityDecisionSource(fixture.root, document, {
        recordKey: `technical.card-blocker-${itemKindSlug}`,
        itemKey: `card-blocker-${itemKindSlug}`,
        itemKind,
        roles: ["feasibility_basis"],
        projections: [
          {
            mode: "feasibility_blocker",
            target_ref: cell.target_ref,
            component_family_ref: cell.component_family_ref,
            condition_scope_sha256: v1FeasibilityConditionScopeSha256(
              document,
              cell.condition_profile_ref,
            ),
            blocker_ref: "blocker.card-owner",
            substrate_observation_refs: [],
          },
        ],
      });
      if (blockerOnly) cell.feasible_realizations = [];
      cell.blocker_refs = ["blocker.card-owner"];
      document.blockers = [
        {
          key: "blocker.card-owner",
          component_family_ref: cell.component_family_ref,
          target_ref: cell.target_ref,
          condition_profile_ref: cell.condition_profile_ref,
          source_record_refs: [authority.recordRef],
          substrate_observation_refs: [],
          description: "The production component owner remains unresolved.",
        },
      ];
    },
  );
  await writeDesignResourceHandoff(fixture.root, handoff);
  fixture.contract.task.source_paths.push(authority.sourcePath);
  fixture.contract.source_claims.push({
    key: authority.itemKey,
    source_ref: `${authority.sourcePath}#${authority.itemKey}`,
    statement: authority.normalizedText,
    disposition:
      itemKind === "decision"
        ? {
            type: "decision_required",
            reason:
              "The production component owner requires a project decision.",
          }
        : {
            type: "external_confirmation",
            refs: ["confirm-card-owner"],
          },
  });
  const outcome = fixture.contract.outcomes[0];
  if (itemKind === "external_confirmation")
    fixture.contract.global.acceptance.external_confirmations.push({
      key: "confirm-card-owner",
      description: authority.normalizedText,
      owner: "project-owner",
      kind: "expert_authority",
      impact_claims: prepareTargetBlockedCompileFixture(
        fixture.contract,
        outcome.key,
      ),
      blocks_target: true,
    });
  const surface = outcome.product.surface_bindings[0];
  surface.component_binding_refs = blockerOnly ? [] : ["design-owner"];
  surface.route_binding_ref = "design-owner";
  outcome.product.surface_bindings[0].design_targets[0].source_paths.push(
    DESIGN_FEASIBILITY_PATH,
  );
  outcome.acceptance.checks[0].verification_inputs.push(
    DESIGN_FEASIBILITY_PATH,
  );
  outcome.technical.bindings.push({
    key: "design-owner",
    kind: "file",
    target: DESIGN_TECHNICAL_SOURCE_PATH,
    carrier_paths: [DESIGN_TECHNICAL_SOURCE_PATH],
    existence: "existing",
  });
  const preflight = await preflightDesignResourceHandoff(
    fixture.root,
    DESIGN_HANDOFF_PATH,
  );
  const sourceItems = await compileSourceInventory(
    fixture.root,
    fixture.contract.task.source_paths,
  );
  return { fixture, handoff, authority, preflight, sourceItems };
}

function attachClonedFeasibilityTarget(
  fixtureState,
  { blockerOnly = false } = {},
) {
  const { handoff: secondary, mapping } = cloneDesignHandoffTarget(
    fixtureState.preflight,
  );
  const feasibilityPath = "design/secondary/implementation-feasibility.json";
  const feasibilityKey = "secondary.main-default-feasibility";
  secondary.handoff.technical_feasibility_inputs[0].key = feasibilityKey;
  secondary.handoff.technical_feasibility_inputs[0].path = feasibilityPath;
  secondary.technical_feasibility_identities[0].key = feasibilityKey;
  secondary.technical_feasibility_identities[0].path = feasibilityPath;
  const document = secondary.technical_feasibility_documents[0];
  document.key = feasibilityKey;
  if (blockerOnly)
    for (const cell of document.component_family_cells)
      cell.feasible_realizations = [];

  const authorityItem = structuredClone(
    fixtureState.sourceItems.find(
      (item) =>
        item.source_path === fixtureState.authority.sourcePath &&
        item.key === fixtureState.authority.itemKey,
    ),
  );
  const secondaryAuthorityKey = `secondary.${fixtureState.authority.itemKey}`;
  const secondaryAuthorityPath = `src/secondary.${path.posix.basename(
    fixtureState.authority.sourcePath,
  )}`;
  authorityItem.key = secondaryAuthorityKey;
  authorityItem.source_path = secondaryAuthorityPath;
  for (const [from, to] of mapping)
    authorityItem.normalized_text = authorityItem.normalized_text.replaceAll(
      from,
      to,
    );
  authorityItem.text_sha256 = sha256Text(authorityItem.normalized_text);
  const record = document.source_records.find(
    (item) => item.key === fixtureState.authority.recordRef,
  );
  record.path = secondaryAuthorityPath;
  record.locator.value = secondaryAuthorityKey;
  record.locator.text_sha256 = authorityItem.text_sha256;

  attachSecondaryDesignTarget(
    fixtureState.fixture.contract,
    secondary,
    mapping,
  );
  const outcome = fixtureState.fixture.contract.outcomes[0];
  const secondaryTarget =
    outcome.product.surface_bindings[0].design_targets.find(
      (target) => target.key === "secondary-default",
    );
  secondaryTarget.source_paths.push(feasibilityPath);
  outcome.acceptance.checks[0].verification_inputs.push(feasibilityPath);
  fixtureState.fixture.contract.task.source_paths.push(secondaryAuthorityPath);
  const authorityClaim = fixtureState.fixture.contract.source_claims.find(
    (claim) => claim.key === fixtureState.authority.itemKey,
  );
  fixtureState.fixture.contract.source_claims.push({
    ...structuredClone(authorityClaim),
    key: secondaryAuthorityKey,
    source_ref: `${secondaryAuthorityPath}#${secondaryAuthorityKey}`,
    statement: authorityItem.normalized_text,
  });
  return {
    secondary,
    feasibilityPath,
    sourceItems: [...fixtureState.sourceItems, authorityItem],
  };
}

function addTargetBlockingDesignConfirmation(
  contract,
  { key = "confirm-design-target" } = {},
) {
  const outcome = contract.outcomes[0];
  contract.global.acceptance.external_confirmations.push({
    key,
    description:
      "Confirm the externally blocked production design target before completion.",
    owner: "project-owner",
    kind: "expert_authority",
    impact_claims: prepareTargetBlockedCompileFixture(contract, outcome.key),
    blocks_target: true,
  });
}

function prepareTargetBlockedCompileFixture(contract, outcomeKey) {
  const outcome = contract.outcomes.find((item) => item.key === outcomeKey);
  const designAssertionRefs = new Set();
  const impactedClaims = new Set([`${outcomeKey}.result`]);
  for (const binding of outcome.product.surface_bindings)
    for (const target of binding.design_targets) {
      for (const claimRef of target.claim_refs)
        impactedClaims.add(`${outcomeKey}.${claimRef}`);
      designAssertionRefs.add(target.conformance_assertion_ref);
      for (const method of target.verification_method_bindings)
        designAssertionRefs.add(method.assertion_ref);
      for (const method of target.symbolic_method_bindings ?? [])
        designAssertionRefs.add(method.assertion_ref);
      if (target.symbolic_certificate_binding)
        designAssertionRefs.add(
          target.symbolic_certificate_binding.assertion_ref,
        );
    }

  for (const check of outcome.acceptance.checks) {
    for (const assertion of [
      ...check.positive_assertions,
      ...check.negative_assertions,
    ]) {
      if (designAssertionRefs.has(assertion.key))
        for (const claimRef of assertion.claims)
          impactedClaims.add(`${outcomeKey}.${claimRef}`);
      if (assertion.evidence_capabilities.includes("state_delta"))
        for (const claimRef of assertion.claims)
          impactedClaims.add(`${outcomeKey}.${claimRef}`);
    }
  }
  return [...impactedClaims].sort();
}

function cachedPlaywrightTestModule() {
  cachedPlaywrightTestModulePromise ??= resolveCachedPlaywrightTestModule();
  return cachedPlaywrightTestModulePromise;
}

async function resolveCachedPlaywrightTestModule() {
  const cache =
    process.env.npm_config_cache ??
    (process.platform === "win32"
      ? path.join(process.env.LOCALAPPDATA, "npm-cache")
      : path.join(process.env.HOME, ".npm"));
  const entries = await readdir(path.join(cache, "_npx"), {
    withFileTypes: true,
  });
  const candidates = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const packageRoot = path.join(
      cache,
      "_npx",
      entry.name,
      "node_modules",
      "playwright",
    );
    try {
      const manifest = JSON.parse(
        await readFile(path.join(packageRoot, "package.json"), "utf8"),
      );
      await readFile(path.join(packageRoot, "test.mjs"), "utf8");
      candidates.push({ packageRoot, version: manifest.version });
    } catch {
      // This cache entry does not contain a complete Playwright package.
    }
  }
  candidates.sort((left, right) => {
    const leftStable = !left.version.includes("-");
    const rightStable = !right.version.includes("-");
    if (leftStable !== rightStable) return leftStable ? 1 : -1;
    return left.version.localeCompare(right.version, undefined, {
      numeric: true,
      sensitivity: "base",
    });
  });
  const selected = candidates.at(-1);
  if (!selected) throw new Error("playwright_test_module_not_cached");
  return pathToFileURL(path.join(selected.packageRoot, "test.mjs")).href;
}

function sha256Text(value) {
  return createHash("sha256").update(value).digest("hex");
}

function designFactExpectation(handoff, proof) {
  const fact = handoff.facts.find((item) => item.key === proof.fact_ref);
  const oracle = handoff.oracles.find((item) => item.key === proof.oracle_ref);
  const environment = handoff.environments.find(
    (item) => item.key === proof.environment_ref,
  );
  return {
    fact_ref: fact.key,
    subject_ref: fact.subject_ref,
    variation_ref: fact.variation_ref,
    property_ref: fact.property_ref,
    observation_sensitivity: fact.observation_sensitivity,
    expected: structuredClone(fact.value),
    comparison: structuredClone(proof.comparison),
    oracle: {
      key: oracle.key,
      trust: oracle.trust,
      identity: oracle.identity,
      version: oracle.version,
      sha256: oracle.sha256,
    },
    environment: {
      key: environment.key,
      identity: environment.identity,
      definition: structuredClone(environment.definition),
    },
  };
}

function designAcceptanceBlocker(handoff, method) {
  const proof = handoff.proof_obligations.find(
    (item) => item.method === method,
  );
  const fact = handoff.facts.find((item) => item.key === proof.fact_ref);
  return {
    key: "accessibility-proof",
    target_refs: [fact.target_ref],
    subject_refs: [fact.subject_ref],
    dimensions: [fact.dimension],
    fact_cell_refs: [fact.cell_ref],
    fact_refs: [fact.key],
    proof_obligation_refs: [proof.key],
    source_item_refs: [...fact.source_item_refs],
    verification_methods: [proof.method],
    required_capabilities: ["assistive-technology"],
    description:
      "The production semantic tree remains unresolved and must block ready handoff.",
  };
}
