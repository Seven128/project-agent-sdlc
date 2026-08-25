import assert from "node:assert/strict";
import { rm } from "node:fs/promises";
import test, { after } from "node:test";
import { compileDeliveryContract } from "../../packages/ty-context/dist/lib/long-task-delivery-compiler.js";
import {
  synchronizeFixtureExecutionTargetSource,
  writeContract,
} from "./long-task-delivery-fixtures.mjs";
import {
  applyRootArgvWrapperAttack,
  configureCrossExecutionStaticPrimingAttack,
  configureExpectedAsActualAttack,
  configureHistoricalRuntimeAttack,
  configureMissingCounterfactualObservationAttack,
  configurePackageObservationCase,
  configureProcessInputMutationAttack,
  configureProxyTargetAttack,
  configureExecutionTargetSourceDriftAttack,
  createObserverTrustFixture,
  executeObserverTrustAttackAfterAuthority,
  executeObserverTrustWorkflow,
  isMachineAccepted,
  isSecurelyRejected,
  observerTrustRoleBoundaryCases,
} from "./long-task-observer-trust-fixtures.mjs";
import { createDeliveryTerminalReportRecorder } from "./long-task-real-capability-delivery-machine-report.mjs";
import {
  assertIndependentProcessRuntimeClosure,
  configureRepoProcessProductControl,
} from "./long-task-process-product-fixture.mjs";

const {
  applyBoundEvidenceInputClosureConflict,
  applyBoundVerificationInputClosureConflict,
  applyEvidenceRoleProcessConflict,
  applyEvidenceRoleStaticConflict,
  applyVerificationInputStaticConflict,
  configureEvidenceRoleProcessBase,
  configureEvidenceRoleStaticBase,
  configureNonCarrierEvidenceInputAttack,
  configureNonCarrierVerificationInputAttack,
  configureUnusedNonClosureEvidenceInput,
  configureUnusedNonClosureVerificationInput,
  configureVerificationInputStaticBase,
} = observerTrustRoleBoundaryCases;

const terminalReport = createDeliveryTerminalReportRecorder();
const reportCases = Object.freeze({
  r1: wrongCase(
    "wrong.r1.custom-oracle",
    "observer-trust.r1.custom-oracle",
    "control.process",
  ),
  r1b: wrongCase(
    "wrong.r1b.verification-input-static",
    "observer-trust.r1b.verification-input-static",
    "control.static",
  ),
  r2: wrongCase(
    "wrong.r2.runner-created-static",
    "observer-trust.r2.runner-created-static",
    "control.static",
  ),
  r3: wrongCase(
    "wrong.r3.historical-runtime",
    "observer-trust.r3.historical-runtime",
    "control.process",
  ),
  r4: wrongCase(
    "wrong.r4.browser-native-proxy",
    "observer-trust.r4.browser-native-proxy",
    "control.external",
  ),
  r5: wrongCase(
    "wrong.r5.synthetic-status-binding",
    "observer-trust.r5.synthetic-status-binding",
    "control.static",
  ),
  r5b: wrongCase(
    "wrong.r5b.evidence-role-static",
    "observer-trust.r5b.evidence-role-static",
    "control.static",
  ),
  r5c: wrongCase(
    "wrong.r5c.evidence-role-process",
    "observer-trust.r5c.evidence-role-process",
    "control.process",
  ),
  r6: wrongCase(
    "wrong.r6.verifier-wrapper",
    "observer-trust.r6.verifier-wrapper",
    "control.process",
  ),
  r6b: wrongCase(
    "wrong.r6b.argv-wrapper",
    "observer-trust.r6b.argv-wrapper",
    "control.process",
  ),
  r7: wrongCase(
    "wrong.r7.runner-modified-static",
    "observer-trust.r7.runner-modified-static",
    "control.static",
  ),
  r7b: wrongCase(
    "wrong.r7b.cross-execution-priming",
    "observer-trust.r7b.cross-execution-priming",
    "control.static",
  ),
  r7c: wrongCase(
    "wrong.r7c.process-input-mutation",
    "observer-trust.r7c.process-input-mutation",
    "control.process",
  ),
  r8: wrongCase(
    "wrong.r8.empty-observation",
    "observer-trust.r8.empty-observation",
    "control.process",
  ),
  r9: wrongCase(
    "wrong.process-noncarrier-evidence-input",
    "observer-trust.r9.process-noncarrier-evidence-input",
    "control.r9a.unused-nonclosure-evidence-input",
  ),
  r9a: controlCase(
    "control.r9a.unused-nonclosure-evidence-input",
    "observer-trust.r9a.unused-nonclosure-evidence-input",
    "control",
    "machine_accepted",
  ),
  r9c: wrongCase(
    "wrong.r9c.bound-evidence-input-closure-conflict",
    "observer-trust.r9c.bound-evidence-input-closure-conflict",
    "control.r9a.unused-nonclosure-evidence-input",
  ),
  r10: wrongCase(
    "wrong.process-noncarrier-verification-input",
    "observer-trust.r10.process-noncarrier-verification-input",
    "control.r10a.unused-nonclosure-verification-input",
  ),
  r10a: controlCase(
    "control.r10a.unused-nonclosure-verification-input",
    "observer-trust.r10a.unused-nonclosure-verification-input",
    "control",
    "machine_accepted",
  ),
  r10c: wrongCase(
    "wrong.r10c.bound-verification-input-closure-conflict",
    "observer-trust.r10c.bound-verification-input-closure-conflict",
    "control.r10a.unused-nonclosure-verification-input",
  ),
  r11: wrongCase(
    "wrong.execution-target-source-drift",
    "observer-trust.r11.execution-target-source-drift",
    "control.process",
  ),
  r11b: wrongCase(
    "wrong.execution-target-unbound-argv",
    "observer-trust.r11b.execution-target-unbound-argv",
    "control.process",
  ),
  r12: wrongCase(
    "wrong.r12.external-root-argv",
    "observer-trust.r12.external-root-argv",
    "control.process",
  ),
  staticControl: controlCase(
    "control.static",
    "observer-trust.control.static",
    "control",
    "machine_accepted",
  ),
  processControl: controlCase(
    "control.process",
    "observer-trust.control.process",
    "control",
    "machine_accepted",
  ),
  externalControl: controlCase(
    "control.external",
    "observer-trust.control.external",
    "external",
    "blocked_external",
  ),
});

after(async () => terminalReport.write());

function wrongCase(caseId, testId, controlCaseId) {
  return {
    case_id: caseId,
    test_id: testId,
    candidate_role: "wrong",
    control_case_id: controlCaseId,
    expected_relation: {
      operator: "not_equals",
      value: "machine_accepted",
    },
  };
}

function controlCase(caseId, testId, candidateRole, expectedStatus) {
  return {
    case_id: caseId,
    test_id: testId,
    candidate_role: candidateRole,
    control_case_id: null,
    expected_relation: { operator: "equals", value: expectedStatus },
  };
}

async function withFixture(options, body) {
  const fixture = await createObserverTrustFixture(options);
  try {
    return await body(fixture);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
}

function executionLabel(execution) {
  const status =
    execution.result?.workflow_status ?? execution.result?.status ?? "unknown";
  const diagnostic = execution.result?.diagnostic
    ? `:${execution.result.diagnostic.slice(0, 500)}`
    : "";
  return `${execution.stage}:${status}${diagnostic}`;
}

function executionDiagnostics(execution) {
  return JSON.stringify({
    result: execution.result ?? null,
    compile_attack_proof: execution.compile_attack_proof ?? null,
    final_gate_proof: execution.final_gate_proof ?? null,
  });
}

function assertRuntimeClosureExcludes(compiled, checkKey, excludedPath) {
  const check = compiled.outcomes
    .flatMap((outcome) => outcome.acceptance.checks)
    .find((candidate) => candidate.key === checkKey);
  assert.ok(check, `compiled Check ${checkKey} must exist`);
  assert.ok(check.process_runtime_closure, `${checkKey} must compile a process closure`);
  assert.equal(
    check.process_runtime_closure.allowed_runtime_files.includes(excludedPath),
    false,
    `${excludedPath} must remain outside the compiled process closure`,
  );
}

function assertCompileAttackAndLegalNeighborFreshness(
  execution,
  ownerDiagnostic,
) {
  assert.equal(execution.stage, "final-gate", executionLabel(execution));
  assert.equal(isMachineAccepted(execution), false);
  assert.equal(execution.compile_attack_proof?.candidate?.clean, true);
  assert.match(
    execution.compile_attack_proof?.owner_diagnostic ?? "",
    ownerDiagnostic,
  );
  assert.equal(execution.final_gate_proof?.authority_basis, "legal_neighbor");
  assert.equal(
    execution.compile_attack_proof?.candidate?.identity,
    execution.final_gate_proof?.candidate?.identity,
    "Compile and Final Gate must bind the same committed attack candidate",
  );
  assert.notEqual(
    execution.final_gate_proof?.authority_candidate_identity,
    execution.final_gate_proof?.candidate?.identity,
    "Final Gate must retain the legal-neighbor Authority rather than a fresh attack Compile",
  );
  assert.match(
    execution.final_gate_proof?.diagnostic ?? "",
    /final_gate_protected_input_stale/u,
  );
  assert.doesNotMatch(
    execution.final_gate_proof?.diagnostic ?? "",
    /active_task_missing|dirty_candidate/u,
  );
}

test(
  "[critical:observer-admission-no-bypass] [real-capability:observer-trust.r1.custom-oracle] custom Oracle expected-as-actual cannot close a machine Fact",
  { concurrency: false },
  async () =>
    withFixture({}, async (fixture) => {
      await configurePackageObservationCase(fixture, {
        carrierPath: "src/state.json",
        bindingPath: "src/state.json",
        mutationPath: "src/state.json",
        inputPaths: ["src/state.json"],
        artifactGlobs: [],
        diagnosticArtifactPaths: ["artifacts/r1-baseline-diagnostic.json"],
        proofSurface: "runtime_behavior",
        directProcess: true,
      });
      const execution = await executeObserverTrustAttackAfterAuthority(
        fixture,
        () => configureExpectedAsActualAttack(fixture),
      );
      terminalReport.record(reportCases.r1, execution);
      assert.equal(
        isSecurelyRejected(execution),
        true,
        `custom expected-as-actual reached ${executionLabel(execution)}`,
      );
    }),
);

test(
  "[case:observer-admission-no-bypass:R1b] [real-capability:observer-trust.r1b.verification-input-static] verifier Expected input cannot masquerade as a static production carrier",
  { concurrency: false },
  async () =>
    withFixture({}, async (fixture) => {
      await configureVerificationInputStaticBase(fixture);
      const execution = await executeObserverTrustAttackAfterAuthority(
        fixture,
        () => applyVerificationInputStaticConflict(fixture),
      );
      terminalReport.record(reportCases.r1b, execution);
      assert.equal(
        isSecurelyRejected(execution),
        true,
        `verification-input static carrier reached ${executionLabel(execution)}`,
      );
      const diagnostic = executionDiagnostics(execution);
      assert.match(diagnostic, /machine_observer_not_admitted/u);
      assert.match(diagnostic, /static_carrier_expected_authority_forbidden/u);
    }),
);

test(
  "[case:static-carrier-pre-run-freeze:R2] [real-capability:observer-trust.r2.runner-created-static] runner-created package carrier cannot close a machine exact obligation",
  { concurrency: false },
  async () =>
    withFixture({}, async (fixture) => {
      await configurePackageObservationCase(fixture, {
        carrierPath: "artifacts/runner-created.json",
        carrierExists: false,
        runnerWritesCarrier: true,
        bindingPath: "artifacts/runner-created.json",
        mutationPath: "artifacts/runner-created.json",
        mutationPointer: "/observations/fact.first.observable",
        runnerValueSourcePath: "src/state.json",
        runnerValueSourcePointer: "/first",
        inputPaths: ["src/state.json", "artifacts/**"],
        artifactGlobs: [],
        diagnosticArtifactPaths: ["artifacts/runner-created-diagnostic.json"],
        processCarrierPath: "src/process-observation.json",
      });
      const execution = await executeObserverTrustWorkflow(fixture);
      terminalReport.record(reportCases.r2, execution);
      assert.equal(
        isSecurelyRejected(execution),
        true,
        `runner-created carrier reached ${executionLabel(execution)}`,
      );
      assert.match(
        JSON.stringify(execution.result),
        /static_observation_not_in_pre_run_snapshot/u,
      );
    }),
);

test(
  "[critical:host-derived-target-runtime] [real-capability:observer-trust.r3.historical-runtime] replayed historical session cannot prove current target runtime",
  { concurrency: false },
  async () =>
    withFixture({}, async (fixture) => {
      await configurePackageObservationCase(fixture, {
        carrierPath: "src/state.json",
        bindingPath: "src/state.json",
        mutationPath: "src/state.json",
        inputPaths: ["src/state.json"],
        artifactGlobs: [],
        diagnosticArtifactPaths: [
          "artifacts/historical-runtime-diagnostic.json",
        ],
        proofSurface: "runtime_behavior",
        directProcess: true,
        submitProjectEvidenceCopies: true,
      });
      const execution = await executeObserverTrustAttackAfterAuthority(
        fixture,
        () =>
          configureHistoricalRuntimeAttack(fixture, {
            removeHostAttestation: true,
          }),
      );
      terminalReport.record(reportCases.r3, execution);
      assert.equal(
        isSecurelyRejected(execution),
        true,
        `historical runtime replay reached ${executionLabel(execution)}`,
      );
      assert.match(
        executionDiagnostics(execution),
        /process_observer_direct_root_required/u,
      );
    }),
);

test(
  "[case:host-derived-target-runtime:R4] [real-capability:observer-trust.r4.browser-native-proxy] browser proxy cannot close a Native target",
  { concurrency: false },
  async () =>
    withFixture({}, async (fixture) => {
      await configurePackageObservationCase(fixture, {
        carrierPath: "src/state.json",
        bindingPath: "src/state.json",
        mutationPath: "src/state.json",
        inputPaths: ["src/state.json"],
        artifactGlobs: [],
        diagnosticArtifactPaths: ["artifacts/r4-baseline-diagnostic.json"],
        proofSurface: "runtime_behavior",
        directProcess: true,
      });
      const execution = await executeObserverTrustAttackAfterAuthority(
        fixture,
        () =>
          configureProxyTargetAttack(fixture, {
            requiredFamily: "native",
            indirectWrapper: false,
          }),
      );
      terminalReport.record(reportCases.r4, execution);
      assert.equal(
        isSecurelyRejected(execution),
        true,
        `browser/native proxy reached ${executionLabel(execution)}`,
      );
    }),
);

test(
  "[case:counterfactual-production-observation-impact:R5] [real-capability:observer-trust.r5.synthetic-status-binding] synthetic status Binding cannot prove production reachability",
  { concurrency: false },
  async () =>
    withFixture({}, async (fixture) => {
      await configureEvidenceRoleStaticBase(fixture);
      const execution = await executeObserverTrustAttackAfterAuthority(
        fixture,
        () => applyEvidenceRoleStaticConflict(fixture),
      );
      terminalReport.record(reportCases.r5, execution);
      assert.equal(
        isSecurelyRejected(execution),
        true,
        `synthetic status carrier reached ${executionLabel(execution)}`,
      );
    }),
);

test(
  "[case:static-carrier-pre-run-freeze:R5b] [real-capability:observer-trust.r5b.evidence-role-static] pre-existing status/report evidence cannot machine-close a static production obligation",
  { concurrency: false },
  async () =>
    withFixture({}, async (fixture) => {
      await configureEvidenceRoleStaticBase(fixture);
      const execution = await executeObserverTrustAttackAfterAuthority(
        fixture,
        () => applyEvidenceRoleStaticConflict(fixture),
      );
      terminalReport.record(reportCases.r5b, execution);
      assert.equal(
        isSecurelyRejected(execution),
        true,
        `evidence-role static carrier reached ${executionLabel(execution)}`,
      );
      const diagnostic = executionDiagnostics(execution);
      assert.match(diagnostic, /machine_observer_not_admitted/u);
      assert.match(diagnostic, /static_carrier_evidence_role_forbidden/u);
    }),
);

test(
  "[case:counterfactual-production-observation-impact:R5c] [real-capability:observer-trust.r5c.evidence-role-process] direct process cannot promote a status/report proof output into a production carrier",
  { concurrency: false },
  async () =>
    withFixture({}, async (fixture) => {
      await configureEvidenceRoleProcessBase(fixture);
      const execution = await executeObserverTrustAttackAfterAuthority(
        fixture,
        () => applyEvidenceRoleProcessConflict(fixture),
      );
      terminalReport.record(reportCases.r5c, execution);
      assert.equal(
        isSecurelyRejected(execution),
        true,
        `evidence-role process carrier reached ${executionLabel(execution)}`,
      );
      const diagnostic = executionDiagnostics(execution);
      assert.match(
        diagnostic,
        /process_runtime_input_evidence_role_forbidden/u,
      );
    }),
);

test(
  "[case:host-derived-target-runtime:R6] [real-capability:observer-trust.r6.verifier-wrapper] verifier wrapper cannot substitute for the declared process root",
  { concurrency: false },
  async () =>
    withFixture({}, async (fixture) => {
      await configurePackageObservationCase(fixture, {
        carrierPath: "src/state.json",
        bindingPath: "src/state.json",
        mutationPath: "src/state.json",
        inputPaths: ["src/state.json"],
        artifactGlobs: [],
        diagnosticArtifactPaths: ["artifacts/r6-baseline-diagnostic.json"],
        proofSurface: "runtime_behavior",
        directProcess: true,
      });
      const execution = await executeObserverTrustAttackAfterAuthority(
        fixture,
        () =>
          configureProxyTargetAttack(fixture, {
            requiredFamily: "process",
            indirectWrapper: true,
          }),
      );
      terminalReport.record(reportCases.r6, execution);
      assert.equal(
        isSecurelyRejected(execution),
        true,
        `indirect wrapper reached ${executionLabel(execution)}`,
      );
    }),
);

test(
  "[case:host-derived-target-runtime:R6b] [real-capability:observer-trust.r6b.argv-wrapper] interpreter root cannot select a verifier wrapper through runner argv",
  { concurrency: false },
  async () =>
    withFixture({}, async (fixture) => {
      await configurePackageObservationCase(fixture, {
        carrierPath: "src/state.json",
        bindingPath: "src/state.json",
        mutationPath: "src/state.json",
        inputPaths: ["src/state.json"],
        artifactGlobs: [],
        diagnosticArtifactPaths: ["artifacts/r6b-baseline-diagnostic.json"],
        proofSurface: "runtime_behavior",
        directProcess: true,
      });
      const execution = await executeObserverTrustAttackAfterAuthority(
        fixture,
        () => applyRootArgvWrapperAttack(fixture),
      );
      terminalReport.record(reportCases.r6b, execution);
      assert.equal(
        isSecurelyRejected(execution),
        true,
        `argv wrapper reached ${executionLabel(execution)}`,
      );
      assert.match(
        executionDiagnostics(execution),
        /process_observer_root_argv_mismatch/u,
      );
    }),
);

test(
  "[case:static-carrier-pre-run-freeze:R7] [real-capability:observer-trust.r7.runner-modified-static] runner-modified frozen carrier cannot close a machine exact obligation",
  { concurrency: false },
  async () =>
    withFixture({}, async (fixture) => {
      await configurePackageObservationCase(fixture, {
        carrierPath: "artifacts/frozen-actual.json",
        carrierExists: true,
        carrierInitialValue: false,
        runnerWritesCarrier: true,
        bindingPath: "artifacts/frozen-actual.json",
        mutationPath: "artifacts/frozen-actual.json",
        mutationPointer: "/observations/fact.first.observable",
        runnerValueSourcePath: "src/state.json",
        runnerValueSourcePointer: "/first",
        inputPaths: ["src/state.json", "artifacts/frozen-actual.json"],
        artifactGlobs: [],
        diagnosticArtifactPaths: ["artifacts/runner-modified-diagnostic.json"],
      });
      const execution = await executeObserverTrustWorkflow(fixture);
      terminalReport.record(reportCases.r7, execution);
      assert.equal(
        isSecurelyRejected(execution),
        true,
        `runner-modified carrier reached ${executionLabel(execution)}`,
      );
      assert.match(
        JSON.stringify(execution.result),
        /static_observation_changed_by_runner/u,
      );
    }),
);

test(
  "[critical:static-carrier-pre-run-freeze] [real-capability:observer-trust.r7b.cross-execution-priming] an earlier raw execution cannot prime a later static carrier before it is frozen",
  { concurrency: false },
  async () =>
    withFixture({}, async (fixture) => {
      await configureCrossExecutionStaticPrimingAttack(fixture);
      const execution = await executeObserverTrustWorkflow(fixture);
      terminalReport.record(reportCases.r7b, execution);
      assert.equal(
        isSecurelyRejected(execution),
        true,
        `cross-execution carrier priming reached ${executionLabel(execution)}`,
      );
      assert.match(
        JSON.stringify(execution.result),
        /static_observation_changed_by_runner/u,
      );
    }),
);

test(
  "[case:host-derived-target-runtime:R7c] [real-capability:observer-trust.r7c.process-input-mutation] direct process cannot rewrite a frozen production input before observing it",
  { concurrency: false },
  async () =>
    withFixture({}, async (fixture) => {
      await configureProcessInputMutationAttack(fixture);
      const execution = await executeObserverTrustWorkflow(fixture);
      terminalReport.record(reportCases.r7c, execution);
      assert.equal(
        isSecurelyRejected(execution),
        true,
        `process input rewrite reached ${executionLabel(execution)}`,
      );
      assert.match(
        JSON.stringify(execution.result),
        /process_observation_input_changed_by_runner/u,
      );
    }),
);

test(
  "[critical:counterfactual-production-observation-impact] [real-capability:observer-trust.r8.empty-observation] claim-bearing Counterfactual cannot skip an empty admitted-observation set",
  { concurrency: false },
  async () =>
    withFixture({}, async (fixture) => {
      await configureMissingCounterfactualObservationAttack(fixture);
      const execution = await executeObserverTrustWorkflow(fixture);
      terminalReport.record(reportCases.r8, execution);
      assert.equal(
        isSecurelyRejected(execution),
        true,
        `empty admitted observation set reached ${executionLabel(execution)}`,
      );
      assert.match(
        JSON.stringify(execution.result),
        /counterfactual_integrity_failed[\s\S]*counterfactual_mutated_observation_invalid:admitted_observation_runtime_required/u,
      );
    }),
);

test(
  "[case:observer-admission-no-bypass:R9A] [real-capability:observer-trust.r9a.unused-nonclosure-evidence-input] an unused evidence-role input stays outside the process closure without blocking acceptance",
  { concurrency: false },
  async () =>
    withFixture({}, async (fixture) => {
      await configureUnusedNonClosureEvidenceInput(fixture);
      const compiled = await compileDeliveryContract(
        fixture.workdir,
        fixture.root,
        { require_completion_gate: false },
      );
      assertRuntimeClosureExcludes(
        compiled,
        "first-check",
        "artifacts/expected-status.json",
      );
      const execution = await executeObserverTrustWorkflow(fixture);
      terminalReport.record(reportCases.r9a, execution);
      assert.equal(
        isMachineAccepted(execution),
        true,
        `unused non-closure evidence input blocked ${executionLabel(execution)}`,
      );
    }),
);

test(
  "[case:observer-admission-no-bypass:R9] [real-capability:observer-trust.r9.process-noncarrier-evidence-input] a product cannot consume an evidence-role input that remains outside the process runtime closure",
  { concurrency: false },
  async () =>
    withFixture({}, async (fixture) => {
      await configureNonCarrierEvidenceInputAttack(fixture);
      const compiled = await compileDeliveryContract(
        fixture.workdir,
        fixture.root,
        { require_completion_gate: false },
      );
      assertRuntimeClosureExcludes(
        compiled,
        "first-check",
        "artifacts/expected-status.json",
      );
      const execution = await executeObserverTrustWorkflow(fixture);
      terminalReport.record(reportCases.r9, execution);
      assert.equal(
        isSecurelyRejected(execution),
        true,
        `non-carrier evidence input reached ${executionLabel(execution)}`,
      );
      assert.equal(
        execution.compile_attack_proof,
        null,
        "the isolated-consumption layer must Compile successfully",
      );
      assert.equal(
        execution.final_gate_proof?.authority_basis,
        "current_candidate",
      );
      assert.doesNotMatch(
        executionDiagnostics(execution),
        /process_runtime_input_evidence_role_forbidden|final_gate_protected_input_stale/u,
      );
      assert.match(
        executionDiagnostics(execution),
        /process_observation_decode_invalid/u,
        "the omitted evidence input must fail inside isolated process execution",
      );
    }),
);

test(
  "[case:observer-admission-no-bypass:R9C] [real-capability:observer-trust.r9c.bound-evidence-input-closure-conflict] an evidence-role input explicitly bound into production argv is Compile-rejected and stale Authority cannot be reused",
  { concurrency: false },
  async () =>
    withFixture({}, async (fixture) => {
      await configureUnusedNonClosureEvidenceInput(fixture);
      const execution = await executeObserverTrustAttackAfterAuthority(
        fixture,
        () => applyBoundEvidenceInputClosureConflict(fixture),
      );
      terminalReport.record(reportCases.r9c, execution);
      assertCompileAttackAndLegalNeighborFreshness(
        execution,
        /process_runtime_input_evidence_role_forbidden/u,
      );
    }),
);

test(
  "[case:counterfactual-production-observation-impact:R10A] [real-capability:observer-trust.r10a.unused-nonclosure-verification-input] an unused verification input stays outside the process closure without blocking acceptance",
  { concurrency: false },
  async () =>
    withFixture({}, async (fixture) => {
      await configureUnusedNonClosureVerificationInput(fixture);
      const compiled = await compileDeliveryContract(
        fixture.workdir,
        fixture.root,
        { require_completion_gate: false },
      );
      assertRuntimeClosureExcludes(
        compiled,
        "first-check",
        "tests/expected-map.json",
      );
      const execution = await executeObserverTrustWorkflow(fixture);
      terminalReport.record(reportCases.r10a, execution);
      assert.equal(
        isMachineAccepted(execution),
        true,
        `unused non-closure verification input blocked ${executionLabel(execution)}`,
      );
    }),
);

test(
  "[case:counterfactual-production-observation-impact:R10] [real-capability:observer-trust.r10.process-noncarrier-verification-input] a product cannot consume a verification input that remains outside the process runtime closure",
  { concurrency: false },
  async () =>
    withFixture({}, async (fixture) => {
      await configureNonCarrierVerificationInputAttack(fixture);
      const compiled = await compileDeliveryContract(
        fixture.workdir,
        fixture.root,
        { require_completion_gate: false },
      );
      assertRuntimeClosureExcludes(
        compiled,
        "first-check",
        "tests/expected-map.json",
      );
      const execution = await executeObserverTrustWorkflow(fixture);
      terminalReport.record(reportCases.r10, execution);
      assert.equal(
        isSecurelyRejected(execution),
        true,
        `non-carrier verification input reached ${executionLabel(execution)}`,
      );
      assert.equal(
        execution.compile_attack_proof,
        null,
        "the isolated-consumption layer must Compile successfully",
      );
      assert.equal(
        execution.final_gate_proof?.authority_basis,
        "current_candidate",
      );
      assert.doesNotMatch(
        executionDiagnostics(execution),
        /process_runtime_input_verification_role_forbidden|final_gate_protected_input_stale/u,
      );
      assert.match(
        executionDiagnostics(execution),
        /process_observation_decode_invalid/u,
        "the omitted verification input must fail inside isolated process execution",
      );
    }),
);

test(
  "[case:counterfactual-production-observation-impact:R10C] [real-capability:observer-trust.r10c.bound-verification-input-closure-conflict] a verification input explicitly bound into production argv is Compile-rejected and stale Authority cannot be reused",
  { concurrency: false },
  async () =>
    withFixture({}, async (fixture) => {
      await configureUnusedNonClosureVerificationInput(fixture);
      const execution = await executeObserverTrustAttackAfterAuthority(
        fixture,
        () => applyBoundVerificationInputClosureConflict(fixture),
      );
      terminalReport.record(reportCases.r10c, execution);
      assertCompileAttackAndLegalNeighborFreshness(
        execution,
        /process_runtime_input_verification_role_forbidden/u,
      );
    }),
);

test(
  "[case:host-derived-target-runtime:R11] [real-capability:observer-trust.r11.execution-target-source-drift] an internally consistent verifier root cannot replace the Source-backed product root",
  { concurrency: false },
  async () =>
    withFixture({}, async (fixture) => {
      const execution = await executeObserverTrustAttackAfterAuthority(
        fixture,
        () => configureExecutionTargetSourceDriftAttack(fixture),
      );
      terminalReport.record(reportCases.r11, execution);
      assert.equal(
        isSecurelyRejected(execution),
        true,
        `Source-drifted execution target reached ${executionLabel(execution)}`,
      );
      assert.match(
        executionDiagnostics(execution),
        /process_root_source_identity_mismatch/u,
      );
    }),
);

test(
  "[case:host-derived-target-runtime:R11b] [real-capability:observer-trust.r11b.execution-target-unbound-argv] a missing unbound repository path in the complete root invocation cannot disappear from the runtime closure",
  { concurrency: false },
  async () =>
    withFixture({ twoOutcomes: true }, async (fixture) => {
      await configureRepoProcessProductControl(fixture);
      const execution = await executeObserverTrustAttackAfterAuthority(
        fixture,
        async () => {
          const missingRuntimePath = "config/missing-runtime.json";
          const target = fixture.contract.task.execution_targets[0];
          target.root_argv.push(missingRuntimePath);
          for (const outcome of fixture.contract.outcomes)
            outcome.acceptance.checks[0].runner.argv.push(missingRuntimePath);
          await synchronizeFixtureExecutionTargetSource(
            fixture.root,
            fixture.contract,
          );
          await writeContract(fixture.workdir, fixture.contract);
        },
      );
      terminalReport.record(reportCases.r11b, execution);
      assert.equal(
        isSecurelyRejected(execution),
        true,
        `missing unbound root argv path escaped closure admission: ${executionLabel(execution)}`,
      );
    }),
);

test(
  "[case:host-derived-target-runtime:R12] [real-capability:observer-trust.r12.external-root-argv] a protocol-shaped root argv token rejected from pre-repair e6941ed cannot create or reuse machine Authority",
  { concurrency: false },
  async () =>
    withFixture({ twoOutcomes: true }, async (fixture) => {
      await configureRepoProcessProductControl(fixture);
      const execution = await executeObserverTrustAttackAfterAuthority(
        fixture,
        async () => {
          const externalReference = "scheme:sample/runtime file.json";
          const target = fixture.contract.task.execution_targets[0];
          target.root_argv.push(externalReference);
          for (const outcome of fixture.contract.outcomes)
            outcome.acceptance.checks[0].runner.argv.push(externalReference);
          await synchronizeFixtureExecutionTargetSource(
            fixture.root,
            fixture.contract,
          );
          await writeContract(fixture.workdir, fixture.contract);
        },
      );
      terminalReport.record(reportCases.r12, execution);
      assertCompileAttackAndLegalNeighborFreshness(
        execution,
        /process_root_argv_unsafe/u,
      );
    }),
);

test(
  "[control:static-carrier-pre-run-freeze] [real-capability:observer-trust.control.static] pre-existing unchanged generated JSON is accepted and historical diagnostics stay non-authoritative",
  { concurrency: false },
  async () =>
    withFixture({}, async (fixture) => {
      await configurePackageObservationCase(fixture, {
        carrierPath: "dist/generated-config.json",
        bindingPath: "dist/generated-config.json",
        mutationPath: "dist/generated-config.json",
        inputPaths: ["dist/generated-config.json"],
        artifactGlobs: [],
        diagnosticArtifactPaths: ["artifacts/session-diagnostic.json"],
        directProcess: true,
      });
      const execution = await executeObserverTrustWorkflow(fixture);
      terminalReport.record(reportCases.staticControl, execution);
      assert.equal(
        isMachineAccepted(execution),
        true,
        `valid static control failed: ${executionLabel(execution)}`,
      );
    }),
);

test(
  "[control:host-derived-target-runtime] [real-capability:observer-trust.control.process] Harness starts the Source-backed repository product once for multiple Facts, observes exact output, and preserves liveness under Counterfactual",
  { concurrency: false },
  async () =>
    withFixture({ twoOutcomes: true }, async (fixture) => {
      await configureRepoProcessProductControl(fixture);
      const compiled = await compileDeliveryContract(
        fixture.workdir,
        fixture.root,
        { require_completion_gate: false },
      );
      const checks = compiled.outcomes.flatMap(
        (outcome) => outcome.acceptance.checks,
      );
      assert.equal(checks.length, 2);
      const closures = checks.map(assertIndependentProcessRuntimeClosure);
      assert.deepEqual(
        closures.map((closure) => closure.production_binding_refs),
        ["first", "second"].map((outcomeKey) => [
          `${outcomeKey}.process-product-module`,
          `${outcomeKey}.process-product-root`,
          `${outcomeKey}.process-product-state`,
        ]),
        "each compiled closure must retain its complete Outcome-scoped Binding refs",
      );
      assert.equal(
        new Set(closures.map((closure) => closure.closure_identity)).size,
        1,
        "physically identical compiled closures must share one runtime identity",
      );
      assert.equal(
        new Set(checks.map((check) => check.raw_execution_identity)).size,
        1,
        "one raw execution must carry both Semantic Facts",
      );
      const execution = await executeObserverTrustWorkflow(fixture);
      terminalReport.record(reportCases.processControl, execution);
      assert.equal(
        isMachineAccepted(execution),
        true,
        `valid direct process control failed: ${executionLabel(execution)}`,
      );
      assert.equal(execution.result.check_results.length, 2);
      assert.equal(
        new Set(
          execution.result.check_results.map(
            (result) => result.execution_identity,
          ),
        ).size,
        1,
        "Final Gate must reuse one raw execution for both Check projections",
      );
      assert.ok(
        execution.result.check_results.every(
          (result) =>
            result.status === "passed" &&
            result.findings.length === 0 &&
            result.attempts === 1,
        ),
      );
    }),
);

test(
  "[control:unsupported-observer-external] [real-capability:observer-trust.control.external] unsupported external observation remains blocking instead of machine accepted",
  { concurrency: false },
  async () =>
    withFixture({ externalConfirmation: true }, async (fixture) => {
      const check = fixture.contract.outcomes[0].acceptance.checks[0];
      const resultAssertionIndex = check.positive_assertions.findIndex(
        (assertion) => assertion.key === "first-result",
      );
      assert.notEqual(
        resultAssertionIndex,
        -1,
        "external control result Assertion must exist",
      );
      check.positive_assertions.splice(resultAssertionIndex, 1);
      fixture.contract.task.target_profile.completion_authority =
        "declared_authorities";
      fixture.contract.global.acceptance.external_confirmations[0] = {
        key: "fixture-external",
        description: "Confirm the fixture in external delivery.",
        owner: "release-owner",
        kind: "field_validation",
        impact_claims: ["first.result"],
        blocks_target: true,
        actor: {
          id: "fixture-product-owner",
          role: "product acceptance owner",
          authority_kind: "human",
        },
        target_ref: "fixture-app",
        environment_identity: "fixture-external-environment-v1",
        scenario: structuredClone(check.scenario),
        evidence_requirements: [
          {
            key: "observation-capture",
            statement: "Capture the observed target result for this obligation.",
          },
        ],
        obligations: [
          {
            key: "confirm-result",
            claim_ref: "first.result",
            applicability_ref: "first-root-success",
            fact_ref: null,
            proof_ref: null,
            method: "exact_value",
            proof_surface: "runtime_behavior",
            evidence_capabilities: ["target_runtime"],
            expected_authority_ref: "contract-claim:first.result",
            result_kind: "judgment",
            judgment_basis: {
              kind: "authorization",
              source_ref: "fixture-external",
            },
          },
        ],
      };
      await configurePackageObservationCase(fixture, {
        carrierPath: "src/state.json",
        bindingPath: "src/state.json",
        mutationPath: "src/state.json",
        inputPaths: ["src/state.json"],
        artifactGlobs: [],
        diagnosticArtifactPaths: ["artifacts/external-control-diagnostic.json"],
        proofSurface: "runtime_behavior",
        directProcess: true,
      });
      const execution = await executeObserverTrustWorkflow(fixture);
      terminalReport.record(reportCases.externalControl, execution);
      assert.equal(execution.stage, "final-gate", executionLabel(execution));
      assert.equal(
        execution.result.workflow_status,
        "blocked_external",
        executionDiagnostics(execution),
      );
      assert.notEqual(execution.result.workflow_status, "machine_accepted");
    }),
);
