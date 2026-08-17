import {
  FORMAL_NODE_LAUNCH_POLICY,
  FORMAL_PROVIDER_ENDPOINT,
  FORMAL_PROVIDER_LIMITS,
  FORMAL_PROVIDER_NODE_LAUNCH_PROTOCOL,
  FORMAL_PROVIDER_PARSER_ID,
  FORMAL_PROVIDER_PROTOCOL_ID,
  FORMAL_PROVIDER_PROTOCOL_PATH,
  FORMAL_PROVIDER_RESPONSE_PATH,
  FORMAL_PROVIDER_TRANSPORT_ID,
  FORMAL_PROVIDER_WORKER_ENVIRONMENT_POLICY,
  FORMAL_PROVIDER_WORKER_PATH,
  formalProviderLaunchEnvelopeStatus,
} from "./long_task_formal_provider_protocol.mjs";
import { openFormalProviderCaptureSession } from "./long_task_formal_provider_session.mjs";
import {
  assert,
  canonical,
  sha256,
} from "./long_task_real_process_roi_scoring.mjs";

export const FORMAL_PROVIDER_ADAPTER_ID =
  "openai-responses-isolated-worker-v2";
export const FORMAL_PROVIDER_ADAPTER_PATH =
  "tools/long_task_formal_provider_capture.mjs";
export const FORMAL_PROVIDER_PARENT_IMPLEMENTATION_PATHS = Object.freeze([
  FORMAL_PROVIDER_ADAPTER_PATH,
  "tools/long_task_formal_provider_session.mjs",
  "tools/long_task_formal_provider_worker_host.mjs",
  "tools/long_task_formal_provider_worker_host_io.mjs",
  "tools/long_task_formal_provider_capture_io.mjs",
]);

export function deriveFormalProviderAdapterIdentity({
  benchmarkImplementationIdentity,
  environment = process.env,
}) {
  const parentBridge = FORMAL_PROVIDER_PARENT_IMPLEMENTATION_PATHS.map((entry) =>
    implementationEntry(benchmarkImplementationIdentity, entry),
  );
  const worker = implementationEntry(
    benchmarkImplementationIdentity,
    FORMAL_PROVIDER_WORKER_PATH,
  );
  const response = implementationEntry(
    benchmarkImplementationIdentity,
    FORMAL_PROVIDER_RESPONSE_PATH,
  );
  const protocol = implementationEntry(
    benchmarkImplementationIdentity,
    FORMAL_PROVIDER_PROTOCOL_PATH,
  );
  const model = environment.TY_CONTEXT_FORMAL_OPENAI_MODEL ?? null;
  const workerProjection = {
    implementation: { worker, response, protocol },
    parser_id: FORMAL_PROVIDER_PARSER_ID,
    transport_id: FORMAL_PROVIDER_TRANSPORT_ID,
    limits: FORMAL_PROVIDER_LIMITS,
    environment_policy: FORMAL_PROVIDER_WORKER_ENVIRONMENT_POLICY,
    node_launch_policy: FORMAL_NODE_LAUNCH_POLICY,
    node_launch_protocol: FORMAL_PROVIDER_NODE_LAUNCH_PROTOCOL,
    node: process.version,
  };
  const projection = {
    schema_version: "formal-provider-adapter-identity-v2",
    adapter_id: FORMAL_PROVIDER_ADAPTER_ID,
    protocol_id: FORMAL_PROVIDER_PROTOCOL_ID,
    provider: "openai",
    endpoint: FORMAL_PROVIDER_ENDPOINT,
    model,
    implementation: { parent_bridge: parentBridge, worker, response, protocol },
    parser_id: FORMAL_PROVIDER_PARSER_ID,
    transport_id: FORMAL_PROVIDER_TRANSPORT_ID,
    limits: FORMAL_PROVIDER_LIMITS,
    worker_environment_policy: FORMAL_PROVIDER_WORKER_ENVIRONMENT_POLICY,
    node_launch_policy: FORMAL_NODE_LAUNCH_POLICY,
    node_launch_protocol: FORMAL_PROVIDER_NODE_LAUNCH_PROTOCOL,
    worker_identity_sha256: sha256(canonical(workerProjection)),
    runtime: { node: process.version },
    support: {
      model_configured: typeof model === "string" && model.length > 0,
    },
    external_tcb: "openai-provider-service",
  };
  return Object.freeze({
    ...projection,
    identity_sha256: sha256(canonical(projection)),
  });
}

export class FormalProviderCaptureAdapter {
  #identity;

  constructor(identity) {
    assertProviderIdentity(identity);
    this.#identity = identity;
  }

  get identity() {
    return this.#identity;
  }

  assertReadyForAttempt() {
    if (!formalProviderSourceReadiness(this.#identity).ready_for_attempt)
      throw new Error("formal_provider_source_not_ready_for_attempt");
  }

  async openOneShotBridge({ invocationId, scenarioTimeoutMs }) {
    this.assertReadyForAttempt();
    assert(/^[a-f0-9]{64}$/u.test(invocationId), "formal_provider_invocation");
    assert(
      Number.isSafeInteger(scenarioTimeoutMs) && scenarioTimeoutMs > 0,
      "formal_provider_scenario_timeout",
    );
    return openFormalProviderCaptureSession({
      identity: this.#identity,
      invocationId,
      scenarioTimeoutMs,
    });
  }
}

export function formalProviderSourceReadiness(identity) {
  assertProviderIdentity(identity);
  const credential = process.env.OPENAI_API_KEY ?? null;
  const launch = formalProviderLaunchEnvelopeStatus();
  const configured = identity.support.model_configured === true;
  const credentialPresent =
    typeof credential === "string" && credential.length > 0;
  return Object.freeze({
    configured,
    credential_present: credentialPresent,
    launch_envelope_supported: launch.supported,
    ready_for_attempt: configured && credentialPresent && launch.supported,
  });
}

function assertProviderIdentity(identity) {
  if (!identity || typeof identity !== "object" || Array.isArray(identity))
    throw new Error("formal_provider_adapter_identity");
  const { identity_sha256: identitySha256, ...projection } = identity;
  const parentPaths = identity.implementation?.parent_bridge?.map(
    (entry) => entry.path,
  );
  assert(
    identity.schema_version === "formal-provider-adapter-identity-v2" &&
      identity.adapter_id === FORMAL_PROVIDER_ADAPTER_ID &&
      identity.protocol_id === FORMAL_PROVIDER_PROTOCOL_ID &&
      identity.provider === "openai" &&
      identity.endpoint === FORMAL_PROVIDER_ENDPOINT &&
      identity.parser_id === FORMAL_PROVIDER_PARSER_ID &&
      identity.transport_id === FORMAL_PROVIDER_TRANSPORT_ID &&
      identity.worker_environment_policy ===
        FORMAL_PROVIDER_WORKER_ENVIRONMENT_POLICY &&
      identity.node_launch_policy === FORMAL_NODE_LAUNCH_POLICY &&
      identity.node_launch_protocol === FORMAL_PROVIDER_NODE_LAUNCH_PROTOCOL &&
      canonical(identity.limits) === canonical(FORMAL_PROVIDER_LIMITS) &&
      canonical(parentPaths) ===
        canonical(FORMAL_PROVIDER_PARENT_IMPLEMENTATION_PATHS) &&
      identity.implementation?.worker?.path === FORMAL_PROVIDER_WORKER_PATH &&
      identity.implementation?.response?.path === FORMAL_PROVIDER_RESPONSE_PATH &&
      identity.implementation?.protocol?.path === FORMAL_PROVIDER_PROTOCOL_PATH &&
      /^[a-f0-9]{64}$/u.test(identity.worker_identity_sha256 ?? "") &&
      /^[a-f0-9]{64}$/u.test(identitySha256 ?? "") &&
      identitySha256 === sha256(canonical(projection)),
    "formal_provider_adapter_identity",
  );
}

function implementationEntry(identity, repositoryPath) {
  const entry = identity.entries?.find((candidate) => candidate.path === repositoryPath);
  assert(
    entry &&
      Number.isSafeInteger(entry.bytes) &&
      entry.bytes > 0 &&
      /^[a-f0-9]{64}$/u.test(entry.sha256),
    "formal_provider_adapter_implementation",
  );
  return Object.freeze({
    path: entry.path,
    bytes: entry.bytes,
    sha256: entry.sha256,
  });
}
