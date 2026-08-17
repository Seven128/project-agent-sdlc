import path from "node:path";
import { FormalProcessSupervisor } from "./formal_process_supervisor.mjs";
import { StdinFormalInteractionRecorder } from "./long_task_formal_interaction_recorder.mjs";
import { FormalProviderCaptureAdapter } from "./long_task_formal_provider_capture.mjs";
import { FormalStateCapture } from "./long_task_formal_state_capture.mjs";

const authoritativeRuntimes = new WeakSet();
const runtimeIdentities = new WeakMap();

export function createFormalAcquisitionRuntime(options) {
  assertExactOptions(options, ["formalInteractionStdin", "runtimeTcbIdentity"]);
  if (options.formalInteractionStdin !== true)
    throw new Error("formal_interaction_recorder_unavailable");
  assertRuntimeIdentity(options.runtimeTcbIdentity);
  const facade = Object.freeze(
    new FormalAcquisitionFacade(options.runtimeTcbIdentity),
  );
  authoritativeRuntimes.add(facade);
  runtimeIdentities.set(facade, options.runtimeTcbIdentity.identity_sha256);
  return facade;
}

export function assertAuthoritativeFormalAcquisitionRuntime(
  runtime,
  runtimeTcbIdentity,
) {
  if (
    !authoritativeRuntimes.has(runtime) ||
    runtimeIdentities.get(runtime) !== runtimeTcbIdentity?.identity_sha256
  )
    throw new Error("formal_acquisition_runtime_authority");
  return runtime;
}

class FormalAcquisitionFacade {
  #interactionRecorder;
  #processSupervisor;
  #providerAdapter;
  #providerBridges = new Map();
  #stateCaptures = new Map();
  #closed = false;

  constructor(runtimeTcbIdentity) {
    this.#interactionRecorder = new StdinFormalInteractionRecorder();
    this.#processSupervisor = new FormalProcessSupervisor(runtimeTcbIdentity);
    this.#providerAdapter = new FormalProviderCaptureAdapter(
      runtimeTcbIdentity.provider_adapter,
    );
  }

  beginInteraction(request) {
    this.#assertOpen();
    return this.#interactionRecorder.begin(request);
  }

  finishInteraction(invocationId) {
    this.#assertOpen();
    this.#interactionRecorder.finish(invocationId);
  }

  runProcess(request) {
    this.#assertOpen();
    return this.#processSupervisor.run(request);
  }

  async openProviderCapture(options) {
    this.#assertOpen();
    assertExactOptions(options, ["invocationId", "scenarioTimeoutMs"]);
    const { invocationId, scenarioTimeoutMs } = options;
    assertInvocationId(invocationId);
    if (!Number.isSafeInteger(scenarioTimeoutMs) || scenarioTimeoutMs <= 0)
      throw new Error("formal_provider_capture_scenario_timeout");
    if (this.#providerBridges.has(invocationId))
      throw new Error("formal_provider_capture_duplicate");
    const bridge = await this.#providerAdapter.openOneShotBridge({
      invocationId,
      scenarioTimeoutMs,
    });
    this.#providerBridges.set(invocationId, bridge);
    return bridge.argv;
  }

  async finalizeProviderCapture({
    invocationId,
    rawPromptPath,
    providerEventPath,
  }) {
    this.#assertOpen();
    const bridge = this.#providerBridges.get(invocationId);
    if (!bridge) throw new Error("formal_provider_capture_missing");
    try {
      return await bridge.closeAndPersist({
        rawPromptPath,
        providerEventPath,
      });
    } finally {
      this.#providerBridges.delete(invocationId);
    }
  }

  async abortProviderCapture(invocationId) {
    const bridge = this.#providerBridges.get(invocationId);
    if (!bridge) return;
    this.#providerBridges.delete(invocationId);
    await bridge.abort();
  }

  async beginStateCapture({
    invocationId,
    executionRoot,
    runSetRoot,
    stateRootRef,
  }) {
    this.#assertOpen();
    assertInvocationId(invocationId);
    if (this.#stateCaptures.has(invocationId))
      throw new Error("formal_state_capture_duplicate");
    const capture = await FormalStateCapture.create({
      executionRoot,
      invocationId,
    });
    const expectedRoot = resolveContained(runSetRoot, stateRootRef);
    if (normalize(expectedRoot) !== normalize(capture.root)) {
      await capture.abort();
      throw new Error("formal_state_capture_locator");
    }
    this.#stateCaptures.set(invocationId, capture);
    return Object.freeze(["--state-root", stateRootRef]);
  }

  async finalizeStateCapture({
    invocationId,
    payloadPath,
    ledgerPath,
    retention,
  }) {
    this.#assertOpen();
    const capture = this.#stateCaptures.get(invocationId);
    if (!capture) throw new Error("formal_state_capture_missing");
    this.#stateCaptures.delete(invocationId);
    return capture.finalize({ payloadPath, ledgerPath, retention });
  }

  async abortStateCapture(invocationId) {
    const capture = this.#stateCaptures.get(invocationId);
    if (!capture) return;
    this.#stateCaptures.delete(invocationId);
    await capture.abort();
  }

  async close() {
    if (this.#closed) throw new Error("formal_acquisition_runtime_closed");
    this.#closed = true;
    let primaryError = await closeOwnedResources(this.#providerBridges);
    const stateError = await closeOwnedResources(this.#stateCaptures);
    primaryError ??= stateError;
    try {
      await this.#processSupervisor.close();
    } catch (error) {
      primaryError ??= error;
    }
    try {
      this.#interactionRecorder.close();
    } catch (error) {
      primaryError ??= error;
    }
    if (primaryError) throw primaryError;
  }

  #assertOpen() {
    if (this.#closed) throw new Error("formal_acquisition_runtime_closed");
  }
}

async function closeOwnedResources(resources) {
  let primaryError = null;
  for (const [invocationId, resource] of resources) {
    resources.delete(invocationId);
    try {
      await resource.abort();
    } catch (error) {
      primaryError ??= error;
    }
  }
  return primaryError;
}

function assertRuntimeIdentity(runtimeTcbIdentity) {
  if (
    runtimeTcbIdentity?.schema_version !== "formal-runtime-tcb-identity-v2" ||
    !/^[a-f0-9]{64}$/u.test(runtimeTcbIdentity.identity_sha256 ?? "")
  )
    throw new Error("formal_acquisition_runtime_tcb_identity");
}

function resolveContained(root, relative) {
  if (
    typeof relative !== "string" ||
    path.isAbsolute(relative) ||
    relative.includes("\\") ||
    relative.split("/").some((segment) => !segment || segment === "..")
  )
    throw new Error("formal_acquisition_runtime_path");
  const resolved = path.resolve(root, ...relative.split("/"));
  const back = path.relative(path.resolve(root), resolved);
  if (
    back === ".." ||
    back.startsWith(`..${path.sep}`) ||
    path.isAbsolute(back)
  )
    throw new Error("formal_acquisition_runtime_path");
  return resolved;
}

function assertExactOptions(value, keys) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.keys(value).sort().join(",") !== [...keys].sort().join(",")
  )
    throw new Error("formal_acquisition_runtime_options");
}

function assertInvocationId(value) {
  if (typeof value !== "string" || !/^[a-f0-9]{64}$/u.test(value))
    throw new Error("formal_acquisition_runtime_invocation_id");
}

function normalize(value) {
  const resolved = path.resolve(value);
  return process.platform === "win32" ? resolved.toLowerCase() : resolved;
}
