import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import {
  chmod,
  mkdir,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";
import YAML from "yaml";
import { preflightDesignResourceHandoff } from "../../packages/ty-context/dist/index.js";
import { inspectDesignAuthorityClosure } from "../../packages/ty-context/dist/lib/design-authority-closure.js";
import { projectDesignAuthorityTokens } from "../../packages/ty-context/dist/lib/design-authority-tokens.js";
import { projectDesignAuthorityMaterials } from "../../packages/ty-context/dist/lib/long-task-design-authority-materials.js";
import {
  designSemanticIdentityMap,
  projectSemanticFactManifest,
} from "../../packages/ty-context/dist/lib/long-task-design-authority-projections.js";
import { compileDeliveryContract } from "../../packages/ty-context/dist/lib/long-task-delivery-compiler.js";
import { parseDeliveryContractText } from "../../packages/ty-context/dist/lib/long-task-delivery-parser.js";
import { validateDeliveryContractStructure } from "../../packages/ty-context/dist/lib/long-task-delivery-validation.js";
import { deliveryCompileFreshness } from "../../packages/ty-context/dist/lib/long-task-freshness.js";
import {
  activateDeliveryContract,
  readCompiledDeliveryContract,
} from "../../packages/ty-context/dist/lib/long-task-state.js";
import { implementationBindingRefreshTargets } from "../../packages/ty-context/dist/lib/long-task-implementation-binding-refresh.js";
import { validateLongTaskDesignFeasibilityBindings } from "../../packages/ty-context/dist/lib/long-task-design-feasibility-binding.js";
import {
  createLongTaskDesignHandoffConsumer,
  validateProjectDesignAuthoritySet,
} from "../../packages/ty-context/dist/lib/long-task-design-resource-handoff.js";
import { compileSourceInventory } from "../../packages/ty-context/dist/lib/long-task-source-inventory.js";
import { loadSemanticFactManifest } from "../../packages/ty-context/dist/lib/semantic-fact-source-parser.js";
import { projectDesignOwnedSemanticFacts } from "../../packages/ty-context/dist/lib/long-task-semantic-fact-input-closure.js";
import { npxCliPath } from "../../packages/ty-context/dist/lib/long-task-runner-files.js";
import { canonicalValueJson } from "../../packages/ty-context/dist/lib/strict-codec.js";
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
import {
  addExternalFeasibilityDecisionSemanticFact,
  configureExactTargetBlockingConfirmation,
  feasibilityDecisionSemanticIdentity,
} from "./long-task-feasibility-semantic-fixture.mjs";

const DESIGN_ROOT_SOURCE_ITEM_KEY = "design-root-constraint";
const DESIGN_ROOT_CLAIM = "control.main.location";
const DESIGN_ROOT_STATEMENT = "main content";
const DESIGN_REFRESHED_HANDOFF_PATH = "design/current/handoff.md";
const execFileAsync = promisify(execFile);
let cachedPlaywrightPackagePromise;

test("compiles V2 generated Claim/Outcome/Check ids and frozen runner targets", async () => {
  const fixture = await createDeliveryFixture({ twoOutcomes: true });
  try {
    const compiled = await compileDeliveryContract(
      fixture.workdir,
      fixture.root,
      { require_completion_gate: false },
    );
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
    assert.equal(compiled.claim_coverage.claims_total, 13);
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
    const machineRunner = structuredClone(check.runner);
    check.runner.type = "package_script";
    check.runner.target = "missing";
    await writeContract(fixture.workdir, fixture.contract);
    await assert.rejects(
      compileDeliveryContract(fixture.workdir, fixture.root, {
        require_completion_gate: false,
      }),
      /package_script_not_found/,
    );
    check.runner = machineRunner;
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
    const designPreflight = await preflightDesignResourceHandoff(
      fixture.root,
      DESIGN_HANDOFF_PATH,
    );
    await writeContract(fixture.workdir, fixture.contract, {
      designSemanticProjection: projectDesignOwnedSemanticFacts([
        designPreflight,
      ]),
    });
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

test("Long-Task binds the complete project Design Authority closure and detects child drift", async () => {
  const fixture = await createDeliveryFixture();
  try {
    const authority = await writeLongTaskDesignAuthorityBundle(fixture.root);
    const handoff = await attachDesignResourceHandoff(fixture);
    handoff.project_design_authority = {
      kind: "repository-closure",
      ...authority.identity,
    };
    await writeDesignResourceHandoff(fixture.root, handoff);
    const preflight = await preflightDesignResourceHandoff(
      fixture.root,
      DESIGN_HANDOFF_PATH,
    );
    configureExactTargetBlockingConfirmation(fixture.contract, {
      key: "confirm-authority-closure-fixture",
    });
    await writeContract(fixture.workdir, fixture.contract, {
      designSemanticProjection: projectDesignOwnedSemanticFacts([preflight]),
    });

    const compiled = await compileDeliveryContract(
      fixture.workdir,
      fixture.root,
      { require_completion_gate: false },
    );
    assert.deepEqual(compiled.project_design_authority, authority.identity);
    const check = compiled.outcomes[0].acceptance.checks[0];
    for (const memberPath of authority.member_paths)
      assert.equal(
        check.protected_authority_paths.includes(memberPath),
        true,
        memberPath,
      );
    assert.equal(
      (await deliveryCompileFreshness(compiled)).includes(
        "project_design_authority_changed_after_compile",
      ),
      false,
    );

    await writeFile(
      path.join(fixture.root, "design_system", "components", "card.md"),
      "# Card\n\nChanged without revising the handoff.\n",
      "utf8",
    );
    const changedAuthority = await inspectDesignAuthorityClosure(fixture.root);
    assert.ok(changedAuthority.identity);
    const manifestPath = path.join(
      fixture.root,
      "design_system",
      "authority.manifest.json",
    );
    const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
    manifest.closure_digest = changedAuthority.identity.closure_digest;
    await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    assert.equal(
      (await deliveryCompileFreshness(compiled)).includes(
        "project_design_authority_changed_after_compile",
      ),
      true,
    );
    await assert.rejects(
      activateDeliveryContract(compiled),
      /active_authority_candidate_stale:.*project_design_authority_changed_after_compile/u,
    );
    await assert.rejects(
      compileDeliveryContract(fixture.workdir, fixture.root, {
        require_completion_gate: false,
      }),
      /project_design_authority:identity_mismatch:closure_digest/u,
    );
    await rm(manifestPath);
    await assert.rejects(
      compileDeliveryContract(fixture.workdir, fixture.root, {
        require_completion_gate: false,
      }),
      /bundle_manifest_missing/u,
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("fresh Long-Task Compile rejects a marked bundle whose manifest was removed", async () => {
  const fixture = await createDeliveryFixture();
  try {
    const authority = await writeLongTaskDesignAuthorityBundle(fixture.root);
    const handoff = await attachDesignResourceHandoff(fixture);
    handoff.project_design_authority = {
      kind: "repository-closure",
      ...authority.identity,
    };
    await writeDesignResourceHandoff(fixture.root, handoff);
    const preflight = await preflightDesignResourceHandoff(
      fixture.root,
      DESIGN_HANDOFF_PATH,
    );
    configureExactTargetBlockingConfirmation(fixture.contract, {
      key: "confirm-authority-missing-manifest-fixture",
    });
    await writeContract(fixture.workdir, fixture.contract, {
      designSemanticProjection: projectDesignOwnedSemanticFacts([preflight]),
    });
    await rm(
      path.join(fixture.root, "design_system", "authority.manifest.json"),
    );

    await assert.rejects(
      compileDeliveryContract(fixture.workdir, fixture.root, {
        require_completion_gate: false,
      }),
      /bundle_manifest_missing/u,
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("fresh Long-Task Compile preserves a noncanonical marker leaf diagnostic", async () => {
  const fixture = await createDeliveryFixture();
  try {
    const authority = await writeLongTaskDesignAuthorityBundle(fixture.root);
    const handoff = await attachDesignResourceHandoff(fixture);
    handoff.project_design_authority = {
      kind: "repository-closure",
      ...authority.identity,
    };
    await writeDesignResourceHandoff(fixture.root, handoff);
    const preflight = await preflightDesignResourceHandoff(
      fixture.root,
      DESIGN_HANDOFF_PATH,
    );
    configureExactTargetBlockingConfirmation(fixture.contract, {
      key: "confirm-authority-noncanonical-marker-fixture",
    });
    await writeContract(fixture.workdir, fixture.contract, {
      designSemanticProjection: projectDesignOwnedSemanticFacts([preflight]),
    });
    const entryPath = path.join(fixture.root, "DESIGN.md");
    const design = await readFile(entryPath, "utf8");
    await writeFile(
      entryPath,
      design.replace(
        "<!-- ty-context-design-authority-format: bundle-v1 -->",
        "<!-- ty-context-design-authority-format : bundle-v1 -->",
      ),
      "utf8",
    );

    await assert.rejects(
      compileDeliveryContract(fixture.workdir, fixture.root, {
        require_completion_gate: false,
      }),
      (error) => {
        const detail = error instanceof Error ? error.message : String(error);
        assert.match(
          detail,
          /bundle_marker_noncanonical:line=11:expected=.*:actual=.*design-authority-format : bundle-v1/u,
        );
        assert.doesNotMatch(
          detail,
          /legacy_omission|bundle_marker_missing|identity_mismatch/u,
        );
        return true;
      },
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("Long-Task rejects conflicting project Design Authority identities across handoffs", async () => {
  const fixture = await createDeliveryFixture();
  try {
    await attachDesignResourceHandoff(fixture);
    const primary = await preflightDesignResourceHandoff(
      fixture.root,
      DESIGN_HANDOFF_PATH,
    );
    const secondary = structuredClone(primary);
    secondary.project_design_authority_resolution.identity.closure_digest = `sha256:${"f".repeat(64)}`;
    assert.throws(
      () => validateProjectDesignAuthoritySet([primary, secondary]),
      /project_design_authority_identity_conflict/u,
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("[critical:implementation-binding-refresh] Long-Task mechanically adopts an exact current implementation rebinding and invalidates old proof", async () => {
  const fixtureState = await createImplementationBindingRefreshFixture();
  try {
    await runCli(fixtureState.fixture.root, ["enable", "long-task"]);
    await commitCandidate(fixtureState.fixture.root);
    await runCli(fixtureState.fixture.root, [
      "long-task",
      "compile",
      fixtureState.fixture.workdir,
    ]);
    await runCli(fixtureState.fixture.root, [
      "long-task",
      "verify",
      fixtureState.fixture.workdir,
    ]);
    const previous = await readCompiledDeliveryContract(
      fixtureState.fixture.workdir,
    );
    const previousPreflight = structuredClone(fixtureState.preflight);
    const previousSemanticManifest = (
      await loadSemanticFactManifest(
        fixtureState.fixture.root,
        fixtureState.fixture.contract.task.source_paths,
      )
    ).manifest;

    await refreshImplementationBindingFixture(fixtureState);
    assert.match(
      await readFile(
        path.join(fixtureState.fixture.root, DESIGN_HANDOFF_PATH),
        "utf8",
      ),
      /design-resource-handoff-v1/u,
    );
    const currentSemanticManifest = (
      await loadSemanticFactManifest(
        fixtureState.fixture.root,
        fixtureState.fixture.contract.task.source_paths,
      )
    ).manifest;
    assert.deepEqual(
      projectSemanticFactManifest(
        currentSemanticManifest,
        designSemanticIdentityMap([fixtureState.preflight]),
      ),
      projectSemanticFactManifest(
        previousSemanticManifest,
        designSemanticIdentityMap([previousPreflight]),
      ),
    );
    let proposal = null;
    const candidate = await compileDeliveryContract(
      fixtureState.fixture.workdir,
      fixtureState.fixture.root,
      {
        revise: true,
        previous_authority: previous,
        authority_revision_mode: "diagnose",
        on_authority_revision(value) {
          proposal = value;
        },
      },
    );
    assert.ok(proposal);
    assert.equal(
      candidate.authority_materials.design_non_binding_contract_sha256,
      previous.authority_materials.design_non_binding_contract_sha256,
      "non-binding Contract projection changed",
    );
    assert.equal(
      candidate.authority_materials.design_non_binding_source_sha256,
      previous.authority_materials.design_non_binding_source_sha256,
      "non-binding Source projection changed",
    );
    assert.equal(proposal.change_class, "mechanically_bounded_repair");
    assert.equal(proposal.user_decision_required, false);
    assert.deepEqual(proposal.revision_diff.reduction_reasons, [
      "implementation_binding_refresh",
    ]);
    assert.deepEqual(
      proposal.revision_diff.implementation_binding_refresh_targets,
      [DESIGN_TARGET_KEY],
    );
    assert.deepEqual(proposal.revision_diff.design_semantics_changed, []);
    assert.deepEqual(
      proposal.revision_diff.design_implementation_bindings_changed,
      [DESIGN_TARGET_KEY],
    );
    assert.deepEqual(
      candidate.authority_materials.design_semantics,
      previous.authority_materials.design_semantics,
    );
    assert.equal(
      candidate.authority_materials.design_non_binding_contract_sha256,
      previous.authority_materials.design_non_binding_contract_sha256,
    );
    assert.equal(
      candidate.authority_materials.design_non_binding_source_sha256,
      previous.authority_materials.design_non_binding_source_sha256,
    );
    assert.notDeepEqual(
      candidate.authority_materials.design_implementation_bindings,
      previous.authority_materials.design_implementation_bindings,
    );
    assert.equal(
      previous.authority_materials.design_implementation_bindings[0]
        .handoff_path,
      DESIGN_HANDOFF_PATH,
    );
    assert.equal(
      candidate.authority_materials.design_implementation_bindings[0]
        .handoff_path,
      DESIGN_REFRESHED_HANDOFF_PATH,
    );

    const diagnosis = await runCli(fixtureState.fixture.root, [
      "long-task",
      "diagnose-revision",
      fixtureState.fixture.workdir,
    ]);
    assert.equal(diagnosis.status, "automatic_revision_available");
    assert.equal(
      diagnosis.revision.change_class,
      "mechanically_bounded_repair",
    );
    assert.equal(diagnosis.revision.user_decision_required, false);
    assert.deepEqual(
      diagnosis.revision.approval_summary.mechanically_bounded_reasons,
      ["implementation_binding_refresh"],
    );

    const revised = await runCli(fixtureState.fixture.root, [
      "long-task",
      "compile",
      fixtureState.fixture.workdir,
      "--revise",
    ]);
    assert.equal(revised.lifecycle_event, "authority_revision_adopted");
    assert.equal(revised.authority_revision, previous.authority_revision + 1);
    assert.equal(revised.progress_preserved, false);
    assert.equal(
      revised.authority_revision_change.change_class,
      "mechanically_bounded_repair",
    );
    assert.deepEqual(
      revised.authority_revision_change.approval_summary
        .mechanically_bounded_reasons,
      ["implementation_binding_refresh"],
    );

    const finalGate = await runCliFailure(fixtureState.fixture.root, [
      "long-task",
      "final-gate",
      fixtureState.fixture.workdir,
    ]);
    assert.equal(finalGate.workflow_status, "blocked_external");
    assert.notEqual(finalGate.workflow_status, "machine_accepted");
  } finally {
    await rm(fixtureState.fixture.root, { recursive: true, force: true });
  }
});

test("implementation binding refresh stays protected when an owner root changes", async () => {
  const fixtureState = await createImplementationBindingRefreshFixture();
  try {
    await runCli(fixtureState.fixture.root, ["enable", "long-task"]);
    await commitCandidate(fixtureState.fixture.root);
    await runCli(fixtureState.fixture.root, [
      "long-task",
      "compile",
      fixtureState.fixture.workdir,
    ]);
    const previous = await readCompiledDeliveryContract(
      fixtureState.fixture.workdir,
    );
    const feasibilityPath = path.join(
      fixtureState.fixture.root,
      DESIGN_FEASIBILITY_PATH,
    );
    const feasibility = JSON.parse(await readFile(feasibilityPath, "utf8"));
    feasibility.substrate_observations
      .find((observation) => observation.kind === "component_owner_roots")
      .value.paths.push("tests");
    const feasibilityContent = `${JSON.stringify(feasibility, null, 2)}\n`;
    await writeFile(feasibilityPath, feasibilityContent);
    fixtureState.handoff.technical_feasibility_inputs[0].sha256 =
      sha256Text(feasibilityContent);
    await writeDesignResourceHandoff(
      fixtureState.fixture.root,
      fixtureState.handoff,
    );
    const preflight = await preflightDesignResourceHandoff(
      fixtureState.fixture.root,
      DESIGN_HANDOFF_PATH,
    );
    await writeContract(
      fixtureState.fixture.workdir,
      fixtureState.fixture.contract,
      {
        designSemanticProjection: projectDesignOwnedSemanticFacts([preflight]),
      },
    );
    let proposal = null;
    await compileDeliveryContract(
      fixtureState.fixture.workdir,
      fixtureState.fixture.root,
      {
        revise: true,
        previous_authority: previous,
        authority_revision_mode: "diagnose",
        on_authority_revision(value) {
          proposal = value;
        },
      },
    );
    assert.ok(proposal);
    assert.equal(proposal.change_class, "protected_semantic_or_proof_change");
    assert.equal(proposal.user_decision_required, true);
    assert.ok(
      proposal.revision_diff.reduction_reasons.includes(
        "design_semantics_changed",
      ),
    );
    assert.deepEqual(
      proposal.revision_diff.implementation_binding_refresh_targets,
      [],
    );
  } finally {
    await rm(fixtureState.fixture.root, { recursive: true, force: true });
  }
});

test("implementation binding projection preserves every semantic and Source boundary", async () => {
  const fixtureState = await createImplementationBindingRefreshFixture();
  try {
    const sourceHashes = Object.fromEntries(
      await Promise.all(
        fixtureState.fixture.contract.task.source_paths.map(
          async (sourcePath) => [
            sourcePath,
            sha256Text(
              await readFile(
                path.join(fixtureState.fixture.root, ...sourcePath.split("/")),
              ),
            ),
          ],
        ),
      ),
    );
    const baseline = projectDesignAuthorityMaterials(
      fixtureState.fixture.contract,
      sourceHashes,
      fixtureState.sourceItems,
      [fixtureState.preflight],
    );
    const bindingContract = structuredClone(fixtureState.fixture.contract);
    const bindingPreflight = structuredClone(fixtureState.preflight);
    const target =
      bindingContract.outcomes[0].product.surface_bindings[0].design_targets[0];
    target.source_paths = target.source_paths.map((sourcePath) =>
      sourcePath === DESIGN_FEASIBILITY_PATH
        ? "design/current/implementation-feasibility.json"
        : sourcePath,
    );
    bindingContract.outcomes[0].acceptance.checks[0].verification_inputs =
      bindingContract.outcomes[0].acceptance.checks[0].verification_inputs.map(
        (sourcePath) =>
          sourcePath === DESIGN_FEASIBILITY_PATH
            ? "design/current/implementation-feasibility.json"
            : sourcePath,
      );
    const binding = bindingContract.outcomes[0].technical.bindings.find(
      (candidate) => candidate.key === "design-current-owner",
    );
    binding.target = "src/current/ui-system.ts";
    binding.carrier_paths = ["src/current/ui-system.ts"];
    bindingPreflight.handoff.technical_feasibility_inputs[0].path =
      "design/current/implementation-feasibility.json";
    bindingPreflight.handoff.technical_feasibility_inputs[0].sha256 =
      "1".repeat(64);
    bindingPreflight.technical_feasibility_identities[0].path =
      "design/current/implementation-feasibility.json";
    bindingPreflight.technical_feasibility_identities[0].sha256 = "1".repeat(
      64,
    );
    const feasibility = bindingPreflight.technical_feasibility_documents[0];
    feasibility.source_records[0].path = "src/current/ui-system.ts";
    feasibility.source_records[0].sha256 = "2".repeat(64);
    feasibility.source_records[0].locator.value = "export const CurrentCard";
    feasibility.component_family_cells[0].feasible_realizations[0].owner_candidates[0].locator =
      "src/current/ui-system.ts";
    const rebound = projectDesignAuthorityMaterials(
      bindingContract,
      sourceHashes,
      fixtureState.sourceItems,
      [bindingPreflight],
    );
    assert.deepEqual(rebound.design_semantics, baseline.design_semantics);
    assert.equal(
      rebound.design_non_binding_contract_sha256,
      baseline.design_non_binding_contract_sha256,
    );
    assert.equal(
      rebound.design_non_binding_source_sha256,
      baseline.design_non_binding_source_sha256,
    );
    assert.notDeepEqual(
      rebound.design_implementation_bindings,
      baseline.design_implementation_bindings,
    );
    assert.deepEqual(
      implementationBindingRefreshTargets(baseline, rebound, {
        verifier_content_changed: false,
        verifier_runtime_locator_changed: false,
        risk_changed: false,
      }),
      [DESIGN_TARGET_KEY],
    );

    for (const [name, mutate] of [
      [
        "Design Fact",
        (preflight) => {
          preflight.handoff.facts[0].value.sha256 = "3".repeat(64);
        },
      ],
      [
        "handoff provenance",
        (preflight) => {
          preflight.handoff.provenance.run = "changed-generation-run";
        },
      ],
      [
        "condition",
        (preflight) => {
          preflight.handoff.conditions[0].key = "changed-condition";
        },
      ],
      [
        "comparison",
        (preflight) => {
          preflight.handoff.proof_obligations[0].comparison.parameters.sha256 =
            "4".repeat(64);
        },
      ],
      [
        "owner root",
        (preflight) => {
          preflight.technical_feasibility_documents[0].substrate_observations
            .find((observation) => observation.kind === "component_owner_roots")
            .value.paths.push("tests");
        },
      ],
      [
        "required realization",
        (preflight) => {
          preflight.technical_feasibility_documents[0].component_family_cells[0].required_realization.realization_ref =
            "reuse-project-card";
        },
      ],
      [
        "blocker",
        (preflight) => {
          preflight.technical_feasibility_documents[0].component_family_cells[0].blocker_refs.push(
            "blocker.changed",
          );
        },
      ],
    ]) {
      const changedPreflight = structuredClone(fixtureState.preflight);
      mutate(changedPreflight);
      const changed = projectDesignAuthorityMaterials(
        fixtureState.fixture.contract,
        sourceHashes,
        fixtureState.sourceItems,
        [changedPreflight],
      );
      assert.notDeepEqual(
        changed.design_semantics,
        baseline.design_semantics,
        name,
      );
      assert.deepEqual(
        implementationBindingRefreshTargets(baseline, changed, {
          verifier_content_changed: false,
          verifier_runtime_locator_changed: false,
          risk_changed: false,
        }),
        [],
        name,
      );
    }

    for (const [name, mutate] of [
      [
        "Product Claim",
        (contract) => {
          contract.source_claims[0].statement = "Changed Product meaning.";
        },
      ],
      [
        "forbidden shortcut",
        (contract) => {
          contract.global.technical.forbidden_shortcuts.push({
            key: "changed-shortcut",
            statement: "Do not bypass the current owner.",
            applicability_refs: ["first-root-success"],
          });
        },
      ],
      [
        "external boundary",
        (contract) => {
          contract.global.acceptance.external_confirmations[0].description =
            "Changed external observation boundary.";
        },
      ],
    ]) {
      const changedContract = structuredClone(fixtureState.fixture.contract);
      mutate(changedContract);
      const changed = projectDesignAuthorityMaterials(
        changedContract,
        sourceHashes,
        fixtureState.sourceItems,
        [fixtureState.preflight],
      );
      assert.notEqual(
        changed.design_non_binding_contract_sha256,
        baseline.design_non_binding_contract_sha256,
        name,
      );
      assert.deepEqual(
        implementationBindingRefreshTargets(baseline, changed, {
          verifier_content_changed: false,
          verifier_runtime_locator_changed: false,
          risk_changed: false,
        }),
        [],
        name,
      );
    }

    const sharedSourceItems = structuredClone(fixtureState.sourceItems);
    const designSourceItem = sharedSourceItems.find(
      (item) => item.key === DESIGN_SOURCE_ITEM_KEY,
    );
    designSourceItem.normalized_text = "Changed shared Product meaning.";
    designSourceItem.text_sha256 = sha256Text(designSourceItem.normalized_text);
    const changedSharedSource = projectDesignAuthorityMaterials(
      fixtureState.fixture.contract,
      sourceHashes,
      sharedSourceItems,
      [fixtureState.preflight],
    );
    assert.notDeepEqual(
      changedSharedSource.design_semantics,
      baseline.design_semantics,
    );
    assert.notEqual(
      changedSharedSource.design_non_binding_source_sha256,
      baseline.design_non_binding_source_sha256,
    );
    assert.deepEqual(
      implementationBindingRefreshTargets(baseline, changedSharedSource, {
        verifier_content_changed: false,
        verifier_runtime_locator_changed: false,
        risk_changed: false,
      }),
      [],
    );
  } finally {
    await rm(fixtureState.fixture.root, { recursive: true, force: true });
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

    const semanticIdentity = feasibilityDecisionSemanticIdentity(
      authority.itemKey,
    );
    configureExactTargetBlockingConfirmation(fixture.contract, {
      key: "confirm-planned-design",
      semanticIdentities: [semanticIdentity],
    });
    await writeContract(fixture.workdir, fixture.contract, {
      designSemanticProjection: projectDesignOwnedSemanticFacts([preflight]),
    });
    await addExternalFeasibilityDecisionSemanticFact(fixture, {
      identity: semanticIdentity,
      expectedValue: authority.normalizedText,
      confirmationRef: "confirm-planned-design",
    });
    const compiled = await compileDeliveryContract(
      fixture.workdir,
      fixture.root,
      { require_completion_gate: false },
    );
    assert.equal(compiled.schema_version, "compiled-long-task-delivery-v2");
    const designReachability =
      compiled.acceptance_reachability.obligations.filter((row) =>
        row.source_obligation_ref.startsWith("design.main-default."),
      );
    assert.ok(designReachability.length > 0);
    assert.ok(
      designReachability.every(
        (row) =>
          row.status === "external_fulfillable" &&
          row.authority === "external_confirmation" &&
          row.fact_ref &&
          row.proof_ref,
      ),
    );
    const designConfirmation =
      compiled.global.acceptance.external_confirmations.find(
        (confirmation) => confirmation.key === "confirm-planned-design-design",
      );
    assert.ok(designConfirmation);
    assert.ok(
      designConfirmation.obligations
        .filter((obligation) => obligation.proof_ref?.startsWith("design."))
        .every(
          (obligation) =>
            obligation.result_kind === "actual" &&
            obligation.judgment_basis === undefined,
        ),
    );
    const designClaimActual = designConfirmation.obligations.find(
      (obligation) =>
        obligation.claim_ref === "first.requirement.design-handoff" &&
        obligation.fact_ref === null &&
        obligation.proof_ref === null,
    );
    assert.equal(designClaimActual?.result_kind, "actual");
    assert.equal(designClaimActual?.judgment_basis, undefined);
    assert.equal(
      fixture.contract.source_claims.find(
        (claim) => claim.key === DESIGN_SOURCE_ITEM_KEY,
      ).judgment_basis,
      undefined,
    );

    const judgmentLaundering = structuredClone(fixture.contract);
    const exactDesignActual =
      judgmentLaundering.global.acceptance.external_confirmations
        .find(
          (confirmation) =>
            confirmation.key === "confirm-planned-design-design",
        )
        .obligations.find((obligation) =>
          obligation.proof_ref?.startsWith("design."),
        );
    assert.ok(exactDesignActual);
    exactDesignActual.result_kind = "judgment";
    exactDesignActual.judgment_basis = {
      kind: "expert_assessment",
      source_ref: DESIGN_SOURCE_ITEM_KEY,
    };
    await writeContract(fixture.workdir, judgmentLaundering, {
      designSemanticProjection: projectDesignOwnedSemanticFacts([preflight]),
    });
    await assert.rejects(
      compileDeliveryContract(fixture.workdir, fixture.root, {
        require_completion_gate: false,
      }),
      /(?:unsupported_observer_requires_external_confirmation|acceptance_obligation_unreachable:.*external_confirmation_decomposition_invalid)/u,
    );

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

    await writeFeasibilityFixtureContract(external);
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
    await writeFeasibilityFixtureContract(external, ordinaryClaim);
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
        /semantic_fact_external_confirmation_invalid|feasibility_blocker_confirmation_unknown/u,
      ],
      [
        "nonblocking",
        (contract) => {
          for (const confirmation of contract.global.acceptance
            .external_confirmations)
            confirmation.blocks_target = false;
        },
        /feasibility_blocker_confirmation_not_blocking/u,
        /not_blocking|must_block/u,
      ],
      [
        "wrong impact",
        (contract) => {
          contract.global.acceptance.external_confirmations.find(
            (confirmation) => confirmation.key === "confirm-card-owner-design",
          ).impact_claims = ["first.requirement.observe-first"];
        },
        /feasibility_blocker_confirmation_target_claim_missing/u,
        /semantic_fact_external_confirmation_invalid|impact.*mismatch|target_claim_missing/u,
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
      await writeFeasibilityFixtureContract(external, contract);
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
    await writeFeasibilityFixtureContract(blockerOnly);
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
    await writeFeasibilityFixtureContract(blockerOnly, missingClaimContract);
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
    await writeFeasibilityFixtureContract(blockerOnly, fakeComponent);
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
    await writeFeasibilityFixtureContract(blockerOnly, legacy);
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
    await writeFeasibilityFixtureContract(blockerOnly);
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
    await writeFeasibilityFixtureContract(staleSource);
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
    await writeFeasibilityFixtureContract(decision);
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

test("Long-Task full Compile rejects a legacy target laundering an extra modern-surface Binding", async () => {
  const mixed = await createFeasibilityBlockerFixture("external_confirmation");
  try {
    const { preflight, mapping } = await writeLegacySecondaryHandoff(mixed);
    attachSecondaryDesignTarget(mixed.fixture.contract, preflight, mapping);
    isolateSecondaryTargetAssertions(mixed.fixture.contract);
    const outcome = mixed.fixture.contract.outcomes[0];
    const surface = outcome.product.surface_bindings[0];
    surface.component_binding_refs.push("legacy-only-owner");
    outcome.technical.bindings.push({
      key: "legacy-only-owner",
      kind: "file",
      target: "src/legacy-only-owner.ts",
      carrier_paths: ["src/legacy-only-owner.ts"],
      existence: "existing",
    });
    await writeFile(
      path.join(mixed.fixture.root, "src", "legacy-only-owner.ts"),
      "export const legacyOnlyOwner = true;\n",
    );
    await writeFeasibilityFixtureContract(mixed);
    await assert.rejects(
      compileDeliveryContract(mixed.fixture.workdir, mixed.fixture.root, {
        require_completion_gate: false,
      }),
      /feasibility_component_binding_unattributed:.*legacy-only-owner/u,
    );
  } finally {
    await rm(mixed.fixture.root, { recursive: true, force: true });
  }
});

test("Long-Task full Compile preserves pure legacy compatibility and enforces the complete mixed legacy matrix", async () => {
  const allowedMixed = await createLegacyMixedCompileFixture();
  try {
    const contractPath = path.join(
      allowedMixed.fixture.workdir,
      "delivery-contract.yaml",
    );
    await writeContract(
      allowedMixed.fixture.workdir,
      allowedMixed.fixture.contract,
      {
        designSemanticProjection: allowedMixed.designSemanticProjection,
      },
    );
    const rawBefore = await readFile(contractPath, "utf8");
    const compiled = await compileDeliveryContract(
      allowedMixed.fixture.workdir,
      allowedMixed.fixture.root,
      { require_completion_gate: false },
    );
    assert.equal(compiled.schema_version, "compiled-long-task-delivery-v2");
    assert.equal(await readFile(contractPath, "utf8"), rawBefore);
    assert.equal(
      compiled.contract_sha256,
      sha256Text(canonicalValueJson(parseDeliveryContractText(rawBefore))),
    );
    await writeFile(
      contractPath,
      `${rawBefore}\ninvalid_s6_contract_drift: true\n`,
      "utf8",
    );
    assert.ok(
      (await deliveryCompileFreshness(compiled)).some((finding) =>
        finding.startsWith("contract_changed_after_compile:"),
      ),
    );
    await writeFile(contractPath, rawBefore, "utf8");
  } finally {
    await rm(allowedMixed.fixture.root, { recursive: true, force: true });
  }

  const blockerAndLegacy = await createLegacyMixedCompileFixture({
    blockerOnly: true,
  });
  try {
    await writeContract(
      blockerAndLegacy.fixture.workdir,
      blockerAndLegacy.fixture.contract,
      {
        designSemanticProjection: blockerAndLegacy.designSemanticProjection,
      },
    );
    await assert.rejects(
      compileDeliveryContract(
        blockerAndLegacy.fixture.workdir,
        blockerAndLegacy.fixture.root,
        { require_completion_gate: false },
      ),
      /componentless_surface_requires_blocker_only_feasibility/u,
    );
  } finally {
    await rm(blockerAndLegacy.fixture.root, {
      recursive: true,
      force: true,
    });
  }

  const candidateAndLegacy = await createLegacyMixedCompileFixture();
  try {
    candidateAndLegacy.fixture.contract.outcomes[0].product.surface_bindings[0].component_binding_refs =
      [];
    await writeContract(
      candidateAndLegacy.fixture.workdir,
      candidateAndLegacy.fixture.contract,
      {
        designSemanticProjection: candidateAndLegacy.designSemanticProjection,
      },
    );
    await assert.rejects(
      compileDeliveryContract(
        candidateAndLegacy.fixture.workdir,
        candidateAndLegacy.fixture.root,
        { require_completion_gate: false },
      ),
      /feasibility_component_binding_required/u,
    );
  } finally {
    await rm(candidateAndLegacy.fixture.root, {
      recursive: true,
      force: true,
    });
  }

  const pureLegacy = await createDeliveryFixture();
  try {
    await attachDesignResourceHandoff(pureLegacy);
    const pureLegacyPreflight = await preflightDesignResourceHandoff(
      pureLegacy.root,
      DESIGN_HANDOFF_PATH,
    );
    configureExactTargetBlockingConfirmation(pureLegacy.contract, {
      key: "confirm-pure-legacy-design",
    });
    const pureLegacyDesignSemanticProjection = projectDesignOwnedSemanticFacts([
      pureLegacyPreflight,
    ]);
    await writeContract(pureLegacy.workdir, pureLegacy.contract, {
      designSemanticProjection: pureLegacyDesignSemanticProjection,
    });
    const compiled = await compileDeliveryContract(
      pureLegacy.workdir,
      pureLegacy.root,
      { require_completion_gate: false },
    );
    assert.equal(compiled.schema_version, "compiled-long-task-delivery-v2");

    pureLegacy.contract.outcomes[0].product.surface_bindings[0].component_binding_refs =
      [];
    await writeContract(pureLegacy.workdir, pureLegacy.contract, {
      designSemanticProjection: pureLegacyDesignSemanticProjection,
    });
    await assert.rejects(
      compileDeliveryContract(pureLegacy.workdir, pureLegacy.root, {
        require_completion_gate: false,
      }),
      /(?:ui_surface_binding_component_ref_required|componentless_surface_requires_blocker_only_feasibility)/u,
    );
  } finally {
    await rm(pureLegacy.root, { recursive: true, force: true });
  }
});

test("Long-Task full Compile attributes shared modern Bindings and preserves a modern blocker boundary", async () => {
  const sharedModern = await createFeasibilityBlockerFixture(
    "external_confirmation",
  );
  try {
    const sharedModernDesignSemanticProjection =
      await writeModernSecondaryHandoff(sharedModern);
    await writeContract(
      sharedModern.fixture.workdir,
      sharedModern.fixture.contract,
      {
        designSemanticProjection: sharedModernDesignSemanticProjection,
      },
    );
    const compiled = await compileDeliveryContract(
      sharedModern.fixture.workdir,
      sharedModern.fixture.root,
      { require_completion_gate: false },
    );
    assert.equal(compiled.schema_version, "compiled-long-task-delivery-v2");

    const outcome = sharedModern.fixture.contract.outcomes[0];
    outcome.product.surface_bindings[0].component_binding_refs.push(
      "modern-unattributed-owner",
    );
    outcome.technical.bindings.push({
      key: "modern-unattributed-owner",
      kind: "file",
      target: "src/modern-unattributed-owner.ts",
      carrier_paths: ["src/modern-unattributed-owner.ts"],
      existence: "existing",
    });
    await writeFile(
      path.join(
        sharedModern.fixture.root,
        "src",
        "modern-unattributed-owner.ts",
      ),
      "export const modernUnattributedOwner = true;\n",
    );
    await writeContract(
      sharedModern.fixture.workdir,
      sharedModern.fixture.contract,
      {
        designSemanticProjection: sharedModernDesignSemanticProjection,
      },
    );
    await assert.rejects(
      compileDeliveryContract(
        sharedModern.fixture.workdir,
        sharedModern.fixture.root,
        { require_completion_gate: false },
      ),
      /feasibility_component_binding_unattributed:.*modern-unattributed-owner/u,
    );
  } finally {
    await rm(sharedModern.fixture.root, { recursive: true, force: true });
  }

  const candidateAndBlocker = await createFeasibilityBlockerFixture(
    "external_confirmation",
  );
  try {
    const candidateAndBlockerDesignSemanticProjection =
      await writeModernSecondaryHandoff(candidateAndBlocker, {
        blockerOnly: true,
      });
    await writeContract(
      candidateAndBlocker.fixture.workdir,
      candidateAndBlocker.fixture.contract,
      {
        designSemanticProjection: candidateAndBlockerDesignSemanticProjection,
      },
    );
    const compiled = await compileDeliveryContract(
      candidateAndBlocker.fixture.workdir,
      candidateAndBlocker.fixture.root,
      { require_completion_gate: false },
    );
    assert.equal(compiled.schema_version, "compiled-long-task-delivery-v2");
    const mixedAuthorityCheck = compiled.outcomes[0].acceptance.checks.find(
      (check) => check.key === "first-check",
    );
    assert.ok(
      mixedAuthorityCheck.observation_authorities.some(
        (authority) => authority.authority === "external_confirmation",
      ),
    );
    assert.ok(
      mixedAuthorityCheck.observation_authorities.some(
        (authority) => authority.authority !== "external_confirmation",
      ),
    );

    await runCli(candidateAndBlocker.fixture.root, ["enable", "long-task"]);
    await commitCandidate(candidateAndBlocker.fixture.root);
    await runCli(candidateAndBlocker.fixture.root, [
      "long-task",
      "compile",
      candidateAndBlocker.fixture.workdir,
    ]);
    await runCli(candidateAndBlocker.fixture.root, [
      "long-task",
      "verify",
      candidateAndBlocker.fixture.workdir,
    ]);
    const finalGate = await runCliFailure(
      candidateAndBlocker.fixture.root,
      ["long-task", "final-gate", candidateAndBlocker.fixture.workdir],
      { skipCandidateCommit: true },
    );
    assert.equal(finalGate.workflow_status, "blocked_external");
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
    assertion.claims = [...target.claim_refs];
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

test("Design verification method Assertion cannot claim the ordinary Result", async () => {
  const fixture = await createDeliveryFixture();
  try {
    await attachDesignResourceHandoff(fixture);
    const outcome = fixture.contract.outcomes[0];
    const target = outcome.product.surface_bindings[0].design_targets[0];
    const check = outcome.acceptance.checks.find(
      (candidate) => candidate.key === target.conformance_check_ref,
    );
    const methodAssertion = check.positive_assertions.find(
      (assertion) =>
        assertion.key === target.verification_method_bindings[0].assertion_ref,
    );
    assert.ok(methodAssertion);
    methodAssertion.claims = ["result"];
    assert.throws(
      () =>
        validateDeliveryContractStructure(
          parseDeliveryContractText(YAML.stringify(fixture.contract)),
        ),
      /ui_design_target_verification_claim_not_owned/u,
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("Design Fact Result impersonation fails closed through Preflight, Compile, and Final Gate", async () => {
  const fixture = await createDeliveryFixture();
  try {
    await attachDesignResourceHandoff(fixture);
    const outcome = fixture.contract.outcomes[0];
    const target = outcome.product.surface_bindings[0].design_targets[0];
    const check = outcome.acceptance.checks.find(
      (candidate) => candidate.key === target.conformance_check_ref,
    );
    const methodAssertion = check.positive_assertions.find(
      (assertion) =>
        assertion.key === target.verification_method_bindings[0].assertion_ref,
    );
    assert.ok(methodAssertion);
    methodAssertion.claims = ["result"];
    await writeContract(fixture.workdir, fixture.contract);
    await runCli(fixture.root, ["enable", "long-task"]);

    const preflight = await runCliFailure(fixture.root, [
      "long-task",
      "preflight",
      fixture.workdir,
    ]);
    assert.match(
      JSON.stringify(preflight),
      /ui_design_target_verification_claim_not_owned/u,
    );
    await assert.rejects(
      () => runCli(fixture.root, ["long-task", "compile", fixture.workdir]),
      /ui_design_target_verification_claim_not_owned/u,
    );
    await assert.rejects(() =>
      runCli(fixture.root, ["long-task", "final-gate", fixture.workdir]),
    );
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
  const mapping = secondaryDesignHandoffMapping(secondary.handoff);
  replaceExactStringMap(secondary, mapping);
  const reverseMapping = new Map([...mapping].map(([from, to]) => [to, from]));
  return { handoff: secondary, mapping, reverseMapping };
}

function secondaryDesignHandoffMapping(handoff) {
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
    for (const row of handoff[collection])
      if (!mapping.has(row.key)) mapping.set(row.key, `secondary.${row.key}`);
  for (const resource of handoff.resources)
    mapping.set(resource.path, `design/secondary/${resource.path}`);
  return mapping;
}

async function writeLegacySecondaryHandoff(fixtureState) {
  let mapping;
  await writeDesignResourceHandoffFixture(
    fixtureState.fixture.root,
    (handoff, manifest) => {
      mapping = secondaryDesignHandoffMapping(handoff);
      replaceExactStringMap(handoff, mapping);
      replaceExactStringMap(manifest, mapping);
      delete handoff.technical_feasibility_inputs;
    },
    {
      handoffPath: "design/handoff-secondary.md",
      primarySourceItemKey: "design-secondary",
    },
  );
  const preflight = await preflightDesignResourceHandoff(
    fixtureState.fixture.root,
    "design/handoff-secondary.md",
  );
  return { preflight, mapping };
}

async function createLegacyMixedCompileFixture({ blockerOnly = false } = {}) {
  const fixtureState = await createFeasibilityBlockerFixture(
    "external_confirmation",
    { blockerOnly },
  );
  const { preflight, mapping } =
    await writeLegacySecondaryHandoff(fixtureState);
  attachSecondaryDesignTarget(
    fixtureState.fixture.contract,
    preflight,
    mapping,
  );
  isolateSecondaryTargetAssertions(fixtureState.fixture.contract);
  const secondaryConfirmationSourceKey =
    "secondary-target-external-confirmation";
  const secondaryConfirmationSourcePath =
    "src/secondary-target-external-confirmation.md";
  const secondaryConfirmationText = `# ${secondaryConfirmationSourceKey}\nExternally confirm the exact secondary design target Actuals.`;
  await writeFile(
    path.join(fixtureState.fixture.root, secondaryConfirmationSourcePath),
    `<!-- ty-source-item:start key=${secondaryConfirmationSourceKey} kind=external_confirmation -->\n${secondaryConfirmationText}\n<!-- ty-source-item:end -->\n`,
  );
  fixtureState.fixture.contract.task.source_paths.push(
    secondaryConfirmationSourcePath,
  );
  fixtureState.fixture.contract.source_claims.push({
    key: secondaryConfirmationSourceKey,
    source_ref: `${secondaryConfirmationSourcePath}#${secondaryConfirmationSourceKey}`,
    statement: secondaryConfirmationText,
    disposition: {
      type: "external_confirmation",
      refs: ["confirm-secondary-card-owner"],
    },
  });
  await writeContract(
    fixtureState.fixture.workdir,
    fixtureState.fixture.contract,
  );
  const secondarySemanticIdentity = feasibilityDecisionSemanticIdentity(
    secondaryConfirmationSourceKey,
  );
  configureExactTargetBlockingConfirmation(fixtureState.fixture.contract, {
    key: "confirm-secondary-card-owner",
    description: secondaryConfirmationText,
    semanticIdentities: [secondarySemanticIdentity],
    targetKey: "secondary-default",
  });
  await addExternalFeasibilityDecisionSemanticFact(fixtureState.fixture, {
    identity: secondarySemanticIdentity,
    expectedValue: secondaryConfirmationText,
    confirmationRef: "confirm-secondary-card-owner",
  });
  return {
    ...fixtureState,
    designSemanticProjection: projectDesignOwnedSemanticFacts([
      fixtureState.preflight,
      preflight,
    ]),
  };
}

async function writeModernSecondaryHandoff(
  fixtureState,
  { blockerOnly = false } = {},
) {
  const { preflight: secondary, mapping } =
    await writeLegacySecondaryHandoff(fixtureState);
  const document = structuredClone(
    fixtureState.preflight.technical_feasibility_documents[0],
  );
  replaceExactStringMap(document, mapping);
  const feasibilityPath = "design/secondary/implementation-feasibility.json";
  const feasibilityKey = "secondary.main-default-feasibility";
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
  const secondaryAuthorityKey = `secondary-${fixtureState.authority.itemKey}`;
  const secondaryAuthorityPath = `src/secondary.${path.posix.basename(
    fixtureState.authority.sourcePath,
  )}`;
  authorityItem.key = secondaryAuthorityKey;
  authorityItem.source_path = secondaryAuthorityPath;
  authorityItem.normalized_text = authorityItem.normalized_text.replaceAll(
    fixtureState.authority.itemKey,
    secondaryAuthorityKey,
  );
  for (const [from, to] of mapping)
    authorityItem.normalized_text = authorityItem.normalized_text.replaceAll(
      from,
      to,
    );
  authorityItem.text_sha256 = sha256Text(authorityItem.normalized_text);
  const authorityContent = `<!-- ty-source-item:start key=${authorityItem.key} kind=${authorityItem.kind} -->\n${authorityItem.normalized_text}\n<!-- ty-source-item:end -->\n`;
  await writeFile(
    path.join(fixtureState.fixture.root, secondaryAuthorityPath),
    authorityContent,
  );
  const record = document.source_records.find(
    (item) => item.key === fixtureState.authority.recordRef,
  );
  record.path = secondaryAuthorityPath;
  record.sha256 = sha256Text(authorityContent);
  record.locator.value = secondaryAuthorityKey;
  record.locator.text_sha256 = authorityItem.text_sha256;

  const feasibilityContent = `${JSON.stringify(document, null, 2)}\n`;
  await mkdir(
    path.dirname(path.join(fixtureState.fixture.root, feasibilityPath)),
    { recursive: true },
  );
  await writeFile(
    path.join(fixtureState.fixture.root, feasibilityPath),
    feasibilityContent,
  );
  secondary.handoff.technical_feasibility_inputs = [
    {
      key: feasibilityKey,
      target_ref: document.target_ref,
      path: feasibilityPath,
      media_type: "application/json",
      sha256: sha256Text(feasibilityContent),
    },
  ];
  await writeDesignResourceHandoff(
    fixtureState.fixture.root,
    secondary.handoff,
    {
      handoffPath: secondary.handoff_path,
      primarySourceItemKey: "design-secondary",
    },
  );

  attachSecondaryDesignTarget(
    fixtureState.fixture.contract,
    secondary,
    mapping,
  );
  isolateSecondaryTargetAssertions(fixtureState.fixture.contract);
  configureExactTargetBlockingConfirmation(fixtureState.fixture.contract, {
    key: "confirm-card-owner",
    description: fixtureState.authority.normalizedText,
    semanticIdentities: [fixtureState.semanticIdentity],
    targetKey: "main-default",
  });
  const outcome = fixtureState.fixture.contract.outcomes[0];
  const target = outcome.product.surface_bindings[0].design_targets.find(
    (candidate) => candidate.key === "secondary-default",
  );
  target.source_paths.push(feasibilityPath);
  outcome.acceptance.checks[0].verification_inputs.push(feasibilityPath);
  fixtureState.fixture.contract.task.source_paths.push(secondaryAuthorityPath);
  const authorityClaim = fixtureState.fixture.contract.source_claims.find(
    (claim) => claim.key === fixtureState.authority.itemKey,
  );
  const secondaryAuthorityClaim = {
    ...structuredClone(authorityClaim),
    key: secondaryAuthorityKey,
    source_ref: `${secondaryAuthorityPath}#${secondaryAuthorityKey}`,
    statement: authorityItem.normalized_text,
  };
  let secondarySemanticIdentity = null;
  if (secondaryAuthorityClaim.disposition.type === "external_confirmation") {
    const secondaryConfirmationKey = "confirm-secondary-card-owner";
    secondarySemanticIdentity = feasibilityDecisionSemanticIdentity(
      secondaryAuthorityKey,
    );
    secondaryAuthorityClaim.disposition.refs = [secondaryConfirmationKey];
    configureExactTargetBlockingConfirmation(fixtureState.fixture.contract, {
      key: secondaryConfirmationKey,
      description: authorityItem.normalized_text,
      excludeAlreadyConfirmedClaims: true,
      targetKey: "secondary-default",
      semanticIdentities: [secondarySemanticIdentity],
    });
  }
  fixtureState.fixture.contract.source_claims.push(secondaryAuthorityClaim);
  if (secondarySemanticIdentity) {
    await writeContract(
      fixtureState.fixture.workdir,
      fixtureState.fixture.contract,
      {
        designSemanticProjection: projectDesignOwnedSemanticFacts([
          fixtureState.preflight,
          secondary,
        ]),
      },
    );
    await addExternalFeasibilityDecisionSemanticFact(fixtureState.fixture, {
      identity: secondarySemanticIdentity,
      expectedValue: authorityItem.normalized_text,
      confirmationRef: "confirm-secondary-card-owner",
    });
  }
  return projectDesignOwnedSemanticFacts([fixtureState.preflight, secondary]);
}

function isolateSecondaryTargetAssertions(contract) {
  const outcome = contract.outcomes[0];
  const primaryRequirement = outcome.product.requirements.find(
    (requirement) => requirement.key === "design-handoff",
  );
  assert.ok(primaryRequirement);
  outcome.product.requirements.push({
    ...structuredClone(primaryRequirement),
    key: "design-handoff-secondary",
  });
  const mainControl = outcome.product.controls.find(
    (control) => control.key === "main",
  );
  assert.ok(mainControl);
  const secondaryControl = {
    ...structuredClone(mainControl),
    key: "main-secondary",
  };
  outcome.product.controls.push(secondaryControl);
  const secondarySourceClaim = contract.source_claims.find(
    (claim) => claim.key === "design-secondary",
  );
  assert.ok(secondarySourceClaim);
  secondarySourceClaim.disposition.refs = [
    `${outcome.key}.requirement.design-handoff-secondary`,
  ];
  delete secondarySourceClaim.judgment_basis;
  const surface = outcome.product.surface_bindings[0];
  surface.control_refs.push(secondaryControl.key);
  const target = surface.design_targets.find(
    (candidate) => candidate.key === "secondary-default",
  );
  assert.ok(target);
  target.claim_refs = [];
  target.conformance_assertion_ref = "main-surface-proof";
  const check = outcome.acceptance.checks.find(
    (candidate) => candidate.key === target.conformance_check_ref,
  );
  assert.ok(check);
  const assertionRefs = [
    target.conformance_assertion_ref,
    ...target.verification_method_bindings.map(
      (binding) => binding.assertion_ref,
    ),
    "design-handoff-claim-actual",
  ];
  const assertionMapping = new Map();
  const secondaryClaimRefs = new Set();
  const cloneAssertion = (source, assertions, replacementClaim = null) => {
    const key = `secondary-${source.key}`;
    const cloned = {
      ...structuredClone(source),
      key,
      observation: `secondary_${source.observation}`,
      claims: source.claims.map((claim) =>
        claim.startsWith("control.main.")
          ? claim.replace("control.main.", "control.main-secondary.")
          : replacementClaim && claim === "requirement.design-handoff"
            ? replacementClaim
            : claim,
      ),
    };
    if (source.key === "main-surface-proof")
      cloned.evidence_capabilities = [
        ...new Set([
          ...cloned.evidence_capabilities,
          "design_conformance",
          "visual_render",
          "interaction_trace",
          "target_runtime",
        ]),
      ];
    assertions.push(cloned);
    assertionMapping.set(source.key, key);
    for (const claim of cloned.claims)
      if (claim.startsWith("control.main-secondary."))
        secondaryClaimRefs.add(claim);
  };
  for (const assertions of [
    check.positive_assertions,
    check.negative_assertions,
  ])
    for (const source of [...assertions])
      if (source.claims.some((claim) => claim.startsWith("control.main.")))
        cloneAssertion(source, assertions);
  for (const assertionRef of new Set(assertionRefs)) {
    if (assertionMapping.has(assertionRef)) continue;
    const source = check.positive_assertions.find(
      (assertion) => assertion.key === assertionRef,
    );
    assert.ok(source);
    cloneAssertion(
      source,
      check.positive_assertions,
      "requirement.design-handoff-secondary",
    );
  }
  target.claim_refs = [`control.${secondaryControl.key}.surface`];
  target.conformance_assertion_ref = assertionMapping.get(
    target.conformance_assertion_ref,
  );
  target.actual_artifact_path = "artifacts/secondary/design-actual.json";
  target.comparison_artifact_path =
    "artifacts/secondary/design-comparison.json";
  for (const binding of target.verification_method_bindings) {
    binding.assertion_ref = assertionMapping.get(binding.assertion_ref);
    for (const artifact of binding.evidence_artifacts) {
      artifact.path = `artifacts/secondary/${path.posix.basename(artifact.path)}`;
      artifact.observation_path = `artifacts/secondary/${path.posix.basename(artifact.observation_path)}`;
    }
  }
  for (const control of outcome.acceptance.counterfactual_controls)
    if (control.claims.includes("requirement.design-handoff")) {
      for (const claim of [...secondaryClaimRefs].sort())
        if (!control.claims.includes(claim)) control.claims.push(claim);
      for (const claim of ["requirement.design-handoff-secondary"])
        if (!control.claims.includes(claim)) control.claims.push(claim);
      for (const assertionRef of assertionMapping.values())
        if (!control.expected_assertion_failures.includes(assertionRef))
          control.expected_assertion_failures.push(assertionRef);
    }
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
    ...secondaryTarget.source_paths,
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

async function createImplementationBindingRefreshFixture() {
  const fixture = await createDeliveryFixture();
  const handoff = await attachDesignResourceHandoff(fixture);
  await addDesignResourceImplementationFeasibility(fixture.root, handoff);
  await writeDesignResourceHandoff(fixture.root, handoff);
  const outcome = fixture.contract.outcomes[0];
  const surface = outcome.product.surface_bindings[0];
  surface.route_binding_ref = "design-current-owner";
  surface.component_binding_refs = ["design-current-owner"];
  outcome.technical.bindings.push({
    key: "design-current-owner",
    kind: "file",
    target: DESIGN_TECHNICAL_SOURCE_PATH,
    carrier_paths: [DESIGN_TECHNICAL_SOURCE_PATH],
    existence: "existing",
  });
  surface.design_targets[0].source_paths.push(DESIGN_FEASIBILITY_PATH);
  outcome.acceptance.checks[0].verification_inputs.push(
    DESIGN_FEASIBILITY_PATH,
  );
  configureExactTargetBlockingConfirmation(fixture.contract, {
    key: "confirm-current-design-binding",
  });
  const preflight = await preflightDesignResourceHandoff(
    fixture.root,
    DESIGN_HANDOFF_PATH,
  );
  await writeContract(fixture.workdir, fixture.contract, {
    designSemanticProjection: projectDesignOwnedSemanticFacts([preflight]),
  });
  const sourceItems = await compileSourceInventory(
    fixture.root,
    fixture.contract.task.source_paths,
  );
  return { fixture, handoff, preflight, sourceItems };
}

async function refreshImplementationBindingFixture(fixtureState) {
  const currentSourcePath = "src/current/ui-system.ts";
  const currentFeasibilityPath =
    "design/current/implementation-feasibility.json";
  const currentSource = [
    "export const platform = 'desktop-web';",
    "export const frameworkRuntime = 'fixture-framework';",
    "export const uiSystem = 'fixture-ui-system';",
    "export const tokenAdapter = 'fixture-token-adapter';",
    "export const CurrentCard = 'project-card';",
    "export const routeOwner = 'main-route';",
    "",
  ].join("\n");
  const feasibility = JSON.parse(
    await readFile(
      path.join(fixtureState.fixture.root, DESIGN_FEASIBILITY_PATH),
      "utf8",
    ),
  );
  await mkdir(
    path.dirname(path.join(fixtureState.fixture.root, currentSourcePath)),
    { recursive: true },
  );
  await writeFile(
    path.join(fixtureState.fixture.root, currentSourcePath),
    currentSource,
  );
  const sourceRecord = feasibility.source_records[0];
  sourceRecord.path = currentSourcePath;
  sourceRecord.sha256 = sha256Text(currentSource);
  sourceRecord.locator.value = "export const CurrentCard";
  feasibility.component_family_cells[0].feasible_realizations[0].owner_candidates[0].locator =
    currentSourcePath;
  const feasibilityContent = `${JSON.stringify(feasibility, null, 2)}\n`;
  await mkdir(
    path.dirname(path.join(fixtureState.fixture.root, currentFeasibilityPath)),
    { recursive: true },
  );
  await writeFile(
    path.join(fixtureState.fixture.root, currentFeasibilityPath),
    feasibilityContent,
  );
  const feasibilityInput = fixtureState.handoff.technical_feasibility_inputs[0];
  feasibilityInput.path = currentFeasibilityPath;
  feasibilityInput.sha256 = sha256Text(feasibilityContent);
  const outcome = fixtureState.fixture.contract.outcomes[0];
  const target = outcome.product.surface_bindings[0].design_targets[0];
  target.source_paths = target.source_paths.map((sourcePath) =>
    sourcePath === DESIGN_FEASIBILITY_PATH
      ? currentFeasibilityPath
      : sourcePath === DESIGN_HANDOFF_PATH
        ? DESIGN_REFRESHED_HANDOFF_PATH
        : sourcePath,
  );
  outcome.acceptance.checks[0].verification_inputs =
    outcome.acceptance.checks[0].verification_inputs.map((sourcePath) =>
      sourcePath === DESIGN_FEASIBILITY_PATH
        ? currentFeasibilityPath
        : sourcePath === DESIGN_HANDOFF_PATH
          ? DESIGN_REFRESHED_HANDOFF_PATH
          : sourcePath,
    );
  const binding = outcome.technical.bindings.find(
    (candidate) => candidate.key === "design-current-owner",
  );
  binding.target = currentSourcePath;
  binding.carrier_paths = [currentSourcePath];
  await writeDesignResourceHandoff(
    fixtureState.fixture.root,
    fixtureState.handoff,
    { handoffPath: DESIGN_REFRESHED_HANDOFF_PATH },
  );
  fixtureState.fixture.contract.task.source_paths =
    fixtureState.fixture.contract.task.source_paths.map((sourcePath) =>
      sourcePath === DESIGN_HANDOFF_PATH
        ? DESIGN_REFRESHED_HANDOFF_PATH
        : sourcePath,
    );
  fixtureState.fixture.contract.source_claims =
    fixtureState.fixture.contract.source_claims.map((claim) => ({
      ...claim,
      source_ref: claim.source_ref.startsWith(`${DESIGN_HANDOFF_PATH}#`)
        ? `${DESIGN_REFRESHED_HANDOFF_PATH}${claim.source_ref.slice(
            DESIGN_HANDOFF_PATH.length,
          )}`
        : claim.source_ref,
    }));
  fixtureState.preflight = await preflightDesignResourceHandoff(
    fixtureState.fixture.root,
    DESIGN_REFRESHED_HANDOFF_PATH,
  );
  await writeContract(
    fixtureState.fixture.workdir,
    fixtureState.fixture.contract,
    {
      designSemanticProjection: projectDesignOwnedSemanticFacts([
        fixtureState.preflight,
      ]),
    },
  );
  fixtureState.sourceItems = await compileSourceInventory(
    fixtureState.fixture.root,
    fixtureState.fixture.contract.task.source_paths,
  );
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
  const playwrightBridge = await fixturePlaywrightBridge(fixture.root);
  await writeFile(
    path.join(fixture.root, "tests", "ui.spec.mjs"),
    `import { test, expect } from ${JSON.stringify(playwrightBridge.testModule)};
if (process.env.TY_CONTEXT_PLAYWRIGHT_FIXTURE_BRIDGE !== ${JSON.stringify(playwrightBridge.identity)}) {
  throw new Error("playwright_fixture_bridge_not_active");
}
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
              "visual_render",
              "interaction_trace",
              "target_runtime",
            ]
          : [
              "design_method",
              "design_conformance",
              "visual_render",
              "target_runtime",
            ];
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
  const designClaimActual = structuredClone(check.positive_assertions[0]);
  designClaimActual.key = "design-handoff-claim-actual";
  designClaimActual.observation = "design_handoff_claim_actual";
  designClaimActual.claims = ["requirement.design-handoff"];
  designClaimActual.evidence_capabilities = [
    ...new Set([
      ...designClaimActual.evidence_capabilities,
      "design_conformance",
      "visual_render",
      "target_runtime",
    ]),
  ];
  check.positive_assertions.push(designClaimActual);
  outcome.acceptance.counterfactual_controls[0].expected_assertion_failures.push(
    designClaimActual.key,
  );
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
  const surfaceAssertion = check.positive_assertions.find(
    (assertion) => assertion.key === "main-surface-proof",
  );
  surfaceAssertion.evidence_capabilities = [
    ...new Set([...surfaceAssertion.evidence_capabilities, "presence"]),
  ];
  const rootAssertion = check.positive_assertions.find(
    (assertion) => assertion.key === "main-location-proof",
  );
  rootAssertion.evidence_capabilities = [
    ...new Set([
      ...rootAssertion.evidence_capabilities,
      "presence",
      "design_conformance",
      "visual_render",
    ]),
  ];
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
  const semanticIdentity =
    itemKind === "external_confirmation"
      ? feasibilityDecisionSemanticIdentity(authority.itemKey)
      : null;
  if (semanticIdentity)
    configureExactTargetBlockingConfirmation(fixture.contract, {
      key: "confirm-card-owner",
      description: authority.normalizedText,
      semanticIdentities: [semanticIdentity],
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
  const designSemanticProjection = projectDesignOwnedSemanticFacts([preflight]);
  if (semanticIdentity) {
    await writeContract(fixture.workdir, fixture.contract, {
      designSemanticProjection,
    });
    await addExternalFeasibilityDecisionSemanticFact(fixture, {
      identity: semanticIdentity,
      expectedValue: authority.normalizedText,
      confirmationRef: "confirm-card-owner",
    });
  }
  return {
    fixture,
    handoff,
    authority,
    preflight,
    sourceItems,
    semanticIdentity,
    designSemanticProjection,
  };
}

async function writeFeasibilityFixtureContract(
  fixtureState,
  contract = fixtureState.fixture.contract,
) {
  await writeContract(fixtureState.fixture.workdir, contract, {
    designSemanticProjection: fixtureState.designSemanticProjection,
  });
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
  if (fixtureState.semanticIdentity)
    configureExactTargetBlockingConfirmation(fixtureState.fixture.contract, {
      key: "confirm-card-owner",
      description: fixtureState.authority.normalizedText,
      semanticIdentities: [fixtureState.semanticIdentity],
      targetKeys: outcome.product.surface_bindings.flatMap((surface) =>
        surface.design_targets.map((target) => target.key),
      ),
    });
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

async function fixturePlaywrightBridge(cwd) {
  cachedPlaywrightPackagePromise ??= resolveCachedPlaywrightPackage(cwd);
  const selected = await cachedPlaywrightPackagePromise;
  return writeFixturePlaywrightBridge(cwd, selected);
}

async function resolveCachedPlaywrightPackage(cwd) {
  const cache =
    process.env.npm_config_cache ??
    (process.platform === "win32"
      ? path.join(process.env.LOCALAPPDATA, "npm-cache")
      : path.join(process.env.HOME, ".npm"));
  // Give the disposable fixture the equivalent of a locally installed
  // Playwright. The frozen --no-install runner must execute the same physical
  // instance that the generated spec imports, including on a clean CI runner.
  await execFileAsync(
    process.execPath,
    [
      await npxCliPath(),
      "--yes",
      "--package=playwright",
      "--",
      "playwright",
      "--version",
    ],
    { cwd, windowsHide: true },
  );
  const candidates = await cachedPlaywrightCandidates(cache);
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
  return selected;
}

async function writeFixturePlaywrightBridge(cwd, selected) {
  const bridgeRoot = path.join(cwd, "node_modules", "playwright");
  const binRoot = path.join(cwd, "node_modules", ".bin");
  const testModule = path.join(selected.packageRoot, "test.mjs");
  const cliModule = selected.cliPath;
  const [testBytes, cliBytes] = await Promise.all([
    readFile(testModule),
    readFile(cliModule),
  ]);
  const identity = sha256Text(
    `${selected.version}\0${sha256Text(testBytes)}\0${sha256Text(cliBytes)}`,
  );
  await Promise.all([
    mkdir(bridgeRoot, { recursive: true }),
    mkdir(binRoot, { recursive: true }),
  ]);
  await Promise.all([
    writeFile(
      path.join(bridgeRoot, "package.json"),
      `${JSON.stringify(
        {
          name: "playwright",
          version: selected.version,
          private: true,
          type: "module",
          bin: { playwright: "cli.mjs" },
          exports: { "./test": "./test.mjs" },
        },
        null,
        2,
      )}\n`,
    ),
    writeFile(
      path.join(bridgeRoot, "test.mjs"),
      `export * from ${JSON.stringify(pathToFileURL(testModule).href)};\n`,
    ),
    writeFile(
      path.join(bridgeRoot, "cli.mjs"),
      `process.env.TY_CONTEXT_PLAYWRIGHT_FIXTURE_BRIDGE = ${JSON.stringify(identity)};\nawait import(${JSON.stringify(pathToFileURL(cliModule).href)});\n`,
    ),
    writeFile(
      path.join(binRoot, "playwright.cmd"),
      `@ECHO off\r\n"${process.execPath}" "%~dp0\\..\\playwright\\cli.mjs" %*\r\n`,
    ),
    writeFile(
      path.join(binRoot, "playwright"),
      '#!/usr/bin/env node\nimport("../playwright/cli.mjs");\n',
    ),
  ]);
  if (process.platform !== "win32")
    await chmod(path.join(binRoot, "playwright"), 0o755);
  return { testModule: "playwright/test", identity };
}

async function cachedPlaywrightCandidates(cache) {
  const entries = await readdir(path.join(cache, "_npx"), {
    withFileTypes: true,
  }).catch((error) => {
    if (error?.code === "ENOENT") return [];
    throw error;
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
      const cacheManifest = JSON.parse(
        await readFile(
          path.join(cache, "_npx", entry.name, "package.json"),
          "utf8",
        ),
      );
      if (
        cacheManifest?._npx?.packages?.length !== 1 ||
        cacheManifest._npx.packages[0] !== "playwright"
      )
        continue;
      const manifest = JSON.parse(
        await readFile(path.join(packageRoot, "package.json"), "utf8"),
      );
      if (
        typeof manifest.version !== "string" ||
        manifest.version.trim() !== manifest.version ||
        manifest.version.length === 0
      )
        continue;
      const cliRelative =
        typeof manifest.bin === "string"
          ? manifest.bin
          : manifest.bin?.playwright;
      if (
        typeof cliRelative !== "string" ||
        path.isAbsolute(cliRelative) ||
        cliRelative.split(/[\\/]/u).includes("..")
      )
        continue;
      const cliPath = path.join(packageRoot, ...cliRelative.split("/"));
      await readFile(cliPath, "utf8");
      await readFile(path.join(packageRoot, "test.mjs"), "utf8");
      candidates.push({ packageRoot, version: manifest.version, cliPath });
    } catch {
      // This cache entry does not contain a complete Playwright package.
    }
  }
  return candidates;
}

function sha256Text(value) {
  return createHash("sha256").update(value).digest("hex");
}

async function writeLongTaskDesignAuthorityBundle(repository) {
  const design = `---
version: "long-task-revision"
name: "Long-Task Bundle"
description: "A complete project Design Authority fixture."
colors:
  primary: "#123456"
spacing:
  sm: 8px
---

<!-- ty-context-design-authority-format: bundle-v1 -->

# Project Design Authority

See [Card](design_system/components/card.md).
`;
  const component = "# Card\n\nThe durable component owner.\n";
  await mkdir(path.join(repository, "design_system", "components"), {
    recursive: true,
  });
  await writeFile(path.join(repository, "DESIGN.md"), design, "utf8");
  await writeFile(
    path.join(repository, "design_system", "components", "card.md"),
    component,
    "utf8",
  );
  const tokens = projectDesignAuthorityTokens(design);
  assert.equal(tokens.success, true);
  await writeFile(
    path.join(repository, "design_system", "tokens.json"),
    tokens.content,
    "utf8",
  );
  const manifestPath = path.join(
    repository,
    "design_system",
    "authority.manifest.json",
  );
  const manifest = {
    schema_version: 1,
    entry: "DESIGN.md",
    authority_files: [
      { path: "design_system/components/card.md", kind: "component" },
    ],
    generated_files: [
      {
        path: "design_system/tokens.json",
        source: "DESIGN.md#frontmatter.tokens",
      },
    ],
    closure_digest: `sha256:${"0".repeat(64)}`,
  };
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  const unclaimed = await inspectDesignAuthorityClosure(repository);
  assert.ok(unclaimed.identity, JSON.stringify(unclaimed.diagnostics));
  manifest.closure_digest = unclaimed.identity.closure_digest;
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  const current = await inspectDesignAuthorityClosure(repository);
  assert.equal(current.status, "valid", JSON.stringify(current.diagnostics));
  return current;
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
