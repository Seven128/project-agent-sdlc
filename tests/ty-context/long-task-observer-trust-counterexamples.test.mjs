import assert from "node:assert/strict";
import { rm } from "node:fs/promises";
import test from "node:test";
import {
  configureExpectedAsActualAttack,
  configureHistoricalRuntimeAttack,
  configurePackageObservationCase,
  configureProxyTargetAttack,
  createObserverTrustFixture,
  executeObserverTrustWorkflow,
  isMachineAccepted,
  isSecurelyRejected,
} from "./long-task-observer-trust-fixtures.mjs";

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

test(
  "[critical:observer-admission-no-bypass:R1] custom Oracle expected-as-actual cannot close a machine Fact",
  { concurrency: false },
  async () =>
    withFixture({}, async (fixture) => {
      await configureExpectedAsActualAttack(fixture);
      const execution = await executeObserverTrustWorkflow(fixture);
      assert.equal(
        isSecurelyRejected(execution),
        true,
        `custom expected-as-actual reached ${executionLabel(execution)}`,
      );
    }),
);

test(
  "[critical:static-carrier-pre-run-freeze:R2] runner-created package carrier cannot close a machine Fact",
  { concurrency: false },
  async () =>
    withFixture({}, async (fixture) => {
      await configurePackageObservationCase(fixture, {
        carrierPath: "artifacts/runner-created.json",
        carrierExists: false,
        runnerWritesCarrier: true,
        bindingPath: "src/state.json",
        mutationPath: "src/state.json",
        mutationPointer: "/first",
        inputPaths: ["src/state.json", "artifacts/**"],
        artifactGlobs: ["artifacts/**"],
      });
      const execution = await executeObserverTrustWorkflow(fixture);
      assert.equal(
        isSecurelyRejected(execution),
        true,
        `runner-created carrier reached ${executionLabel(execution)}`,
      );
    }),
);

test(
  "[critical:host-derived-target-runtime:R3] replayed historical session cannot prove current target runtime",
  { concurrency: false },
  async () =>
    withFixture({}, async (fixture) => {
      await configureHistoricalRuntimeAttack(fixture);
      const execution = await executeObserverTrustWorkflow(fixture);
      assert.equal(
        isSecurelyRejected(execution),
        true,
        `historical runtime replay reached ${executionLabel(execution)}`,
      );
    }),
);

test(
  "[critical:host-derived-target-runtime:R4] browser proxy cannot close a Native target",
  { concurrency: false },
  async () =>
    withFixture({}, async (fixture) => {
      await configureProxyTargetAttack(fixture, {
        requiredFamily: "native",
        indirectWrapper: false,
      });
      const execution = await executeObserverTrustWorkflow(fixture);
      assert.equal(
        isSecurelyRejected(execution),
        true,
        `browser/native proxy reached ${executionLabel(execution)}`,
      );
    }),
);

test(
  "[critical:counterfactual-production-observation-impact:R5] synthetic status Binding cannot prove production reachability",
  { concurrency: false },
  async () =>
    withFixture({}, async (fixture) => {
      await configurePackageObservationCase(fixture, {
        carrierPath: "status.json",
        bindingPath: "status.json",
        mutationPath: "status.json",
        inputPaths: ["status.json"],
        artifactGlobs: ["status.json"],
      });
      const execution = await executeObserverTrustWorkflow(fixture);
      assert.equal(
        isSecurelyRejected(execution),
        true,
        `synthetic status carrier reached ${executionLabel(execution)}`,
      );
    }),
);

test(
  "[critical:host-derived-target-runtime:R6] verifier wrapper cannot substitute for the declared process root",
  { concurrency: false },
  async () =>
    withFixture({}, async (fixture) => {
      await configureProxyTargetAttack(fixture, {
        requiredFamily: "process",
        indirectWrapper: true,
      });
      const execution = await executeObserverTrustWorkflow(fixture);
      assert.equal(
        isSecurelyRejected(execution),
        true,
        `indirect wrapper reached ${executionLabel(execution)}`,
      );
    }),
);

test(
  "[critical:static-carrier-pre-run-freeze:R7] runner-modified frozen carrier cannot close a machine Fact",
  { concurrency: false },
  async () =>
    withFixture({}, async (fixture) => {
      await configurePackageObservationCase(fixture, {
        carrierPath: "artifacts/frozen-actual.json",
        carrierExists: true,
        carrierInitialValue: false,
        runnerWritesCarrier: true,
        bindingPath: "src/state.json",
        mutationPath: "src/state.json",
        mutationPointer: "/first",
        inputPaths: ["src/state.json", "artifacts/frozen-actual.json"],
        artifactGlobs: ["artifacts/frozen-actual.json"],
      });
      const execution = await executeObserverTrustWorkflow(fixture);
      assert.equal(
        isSecurelyRejected(execution),
        true,
        `runner-modified carrier reached ${executionLabel(execution)}`,
      );
    }),
);

test(
  "[critical:counterfactual-production-observation-impact:R8] claim-bearing Counterfactual cannot skip an empty admitted-observation set",
  { concurrency: false },
  async () =>
    withFixture({}, async (fixture) => {
      const execution = await executeObserverTrustWorkflow(fixture);
      assert.equal(
        isSecurelyRejected(execution),
        true,
        `empty admitted observation set reached ${executionLabel(execution)}`,
      );
    }),
);

test(
  "[control:static-carrier-pre-run-freeze] pre-existing unchanged generated JSON is accepted and historical diagnostics stay non-authoritative",
  { concurrency: false },
  async () =>
    withFixture({}, async (fixture) => {
      await configurePackageObservationCase(fixture, {
        carrierPath: "dist/generated-config.json",
        bindingPath: "dist/generated-config.json",
        mutationPath: "dist/generated-config.json",
        inputPaths: ["dist/generated-config.json"],
        artifactGlobs: ["dist/generated-config.json"],
        diagnosticArtifactPaths: ["artifacts/session-diagnostic.json"],
        directProcess: true,
      });
      const execution = await executeObserverTrustWorkflow(fixture);
      assert.equal(
        isMachineAccepted(execution),
        true,
        `valid static control failed: ${executionLabel(execution)}`,
      );
    }),
);

test(
  "[control:host-derived-target-runtime] direct process root emits exact observations and preserves liveness under Counterfactual",
  { concurrency: false },
  async () =>
    withFixture({}, async (fixture) => {
      await configurePackageObservationCase(fixture, {
        carrierPath: "src/state.json",
        bindingPath: "src/state.json",
        mutationPath: "src/state.json",
        inputPaths: ["src/state.json"],
        artifactGlobs: ["src/state.json"],
        proofSurface: "runtime_behavior",
        directProcess: true,
      });
      const execution = await executeObserverTrustWorkflow(fixture);
      assert.equal(
        isMachineAccepted(execution),
        true,
        `valid direct process control failed: ${executionLabel(execution)}`,
      );
    }),
);

test(
  "[control:unsupported-observer-external] unsupported external observation remains blocking instead of machine accepted",
  { concurrency: false },
  async () =>
    withFixture({ externalConfirmation: true }, async (fixture) => {
      await configurePackageObservationCase(fixture, {
        carrierPath: "src/state.json",
        bindingPath: "src/state.json",
        mutationPath: "src/state.json",
        inputPaths: ["src/state.json"],
        artifactGlobs: ["src/state.json"],
        proofSurface: "runtime_behavior",
        directProcess: true,
      });
      const execution = await executeObserverTrustWorkflow(fixture);
      assert.equal(execution.stage, "final-gate", executionLabel(execution));
      assert.equal(
        execution.result.workflow_status,
        "machine_accepted_external_pending",
      );
      assert.notEqual(execution.result.workflow_status, "machine_accepted");
    }),
);
