import assert from "node:assert/strict";
import { rm } from "node:fs/promises";
import test, { after } from "node:test";
import {
  applyEvidenceRoleProcessConflict,
  applyEvidenceRoleStaticConflict,
  applyRootArgvWrapperAttack,
  applyVerificationInputStaticConflict,
  configureCrossExecutionStaticPrimingAttack,
  configureEvidenceRoleProcessBase,
  configureEvidenceRoleStaticBase,
  configureExpectedAsActualAttack,
  configureHistoricalRuntimeAttack,
  configureMissingCounterfactualObservationAttack,
  configureNonCarrierEvidenceInputAttack,
  configureNonCarrierVerificationInputAttack,
  configurePackageObservationCase,
  configureProcessInputMutationAttack,
  configureProxyTargetAttack,
  configureExecutionTargetSourceDriftAttack,
  configureVerificationInputStaticBase,
  createObserverTrustFixture,
  executeObserverTrustAttackAfterAuthority,
  executeObserverTrustWorkflow,
  isMachineAccepted,
  isSecurelyRejected,
} from "./long-task-observer-trust-fixtures.mjs";
import { createDeliveryTerminalReportRecorder } from "./long-task-real-capability-delivery-machine-report.mjs";

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
    "control.process",
  ),
  r10: wrongCase(
    "wrong.process-noncarrier-verification-input",
    "observer-trust.r10.process-noncarrier-verification-input",
    "control.process",
  ),
  r11: wrongCase(
    "wrong.execution-target-source-drift",
    "observer-trust.r11.execution-target-source-drift",
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
    final_gate_proof: execution.final_gate_proof ?? null,
  });
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
      assert.match(diagnostic, /machine_observer_not_admitted/u);
      assert.match(diagnostic, /process_carrier_evidence_role_forbidden/u);
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
  "[case:observer-admission-no-bypass:R9] [real-capability:observer-trust.r9.process-noncarrier-evidence-input] a non-carrier evidence input cannot enter the process runtime closure",
  { concurrency: false },
  async () =>
    withFixture({}, async (fixture) => {
      await configureNonCarrierEvidenceInputAttack(fixture);
      const execution = await executeObserverTrustWorkflow(fixture);
      terminalReport.record(reportCases.r9, execution);
      assert.equal(
        isSecurelyRejected(execution),
        true,
        `non-carrier evidence input reached ${executionLabel(execution)}`,
      );
      assert.match(
        executionDiagnostics(execution),
        /process_runtime_input_evidence_role_forbidden/u,
      );
    }),
);

test(
  "[case:observer-admission-no-bypass:R10] [real-capability:observer-trust.r10.process-noncarrier-verification-input] a non-carrier verification input cannot enter the process runtime closure",
  { concurrency: false },
  async () =>
    withFixture({}, async (fixture) => {
      await configureNonCarrierVerificationInputAttack(fixture);
      const execution = await executeObserverTrustWorkflow(fixture);
      terminalReport.record(reportCases.r10, execution);
      assert.equal(
        isSecurelyRejected(execution),
        true,
        `non-carrier verification input reached ${executionLabel(execution)}`,
      );
      assert.match(
        executionDiagnostics(execution),
        /process_runtime_input_verification_role_forbidden/u,
      );
    }),
);

test(
  "[case:host-derived-target-runtime:R11] [real-capability:observer-trust.r11.execution-target-source-drift] an internally consistent verifier root cannot replace the Source-backed product root",
  { concurrency: false },
  async () =>
    withFixture({}, async (fixture) => {
      await configureExecutionTargetSourceDriftAttack(fixture);
      const execution = await executeObserverTrustWorkflow(fixture);
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
  "[control:host-derived-target-runtime] [real-capability:observer-trust.control.process] Harness starts the frozen product-root invocation, observes exact output, and preserves liveness under Counterfactual",
  { concurrency: false },
  async () =>
    withFixture({}, async (fixture) => {
      await configurePackageObservationCase(fixture, {
        carrierPath: "src/state.json",
        bindingPath: "src/state.json",
        mutationPath: "src/state.json",
        inputPaths: ["src/state.json"],
        artifactGlobs: [],
        diagnosticArtifactPaths: ["artifacts/process-control-diagnostic.json"],
        proofSurface: "runtime_behavior",
        directProcess: true,
      });
      const execution = await executeObserverTrustWorkflow(fixture);
      terminalReport.record(reportCases.processControl, execution);
      assert.equal(
        isMachineAccepted(execution),
        true,
        `valid direct process control failed: ${executionLabel(execution)}`,
      );
    }),
);

test(
  "[control:unsupported-observer-external] [real-capability:observer-trust.control.external] unsupported external observation remains blocking instead of machine accepted",
  { concurrency: false },
  async () =>
    withFixture({ externalConfirmation: true }, async (fixture) => {
      fixture.contract.global.acceptance.external_confirmations[0].blocks_target = true;
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
      assert.equal(execution.result.workflow_status, "blocked_external");
      assert.notEqual(execution.result.workflow_status, "machine_accepted");
    }),
);
