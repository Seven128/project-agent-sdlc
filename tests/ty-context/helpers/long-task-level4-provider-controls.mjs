import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  deriveFormalProviderAdapterIdentity,
  FORMAL_PROVIDER_ADAPTER_PATH,
  FORMAL_PROVIDER_PARENT_IMPLEMENTATION_PATHS,
} from "../../../tools/long_task_formal_provider_capture.mjs";
import {
  FORMAL_PROVIDER_LIMITS,
  FORMAL_PROVIDER_PROTOCOL_PATH,
  FORMAL_PROVIDER_RESPONSE_PATH,
  FORMAL_PROVIDER_UNSUPPORTED_ENVIRONMENT_KEYS,
  FORMAL_PROVIDER_WORKER_ENVIRONMENT_KEYS,
  FORMAL_PROVIDER_WORKER_PATH,
} from "../../../tools/long_task_formal_provider_protocol.mjs";
import {
  assertJsonMutationRejected,
  digest,
} from "./long-task-level4-test-utils.mjs";

const repositoryRoot = fileURLToPath(new URL("../../..", import.meta.url));

export async function fixtureProviderIdentity(model = "fixture-model") {
  const entries = await Promise.all(
    [
      ...FORMAL_PROVIDER_PARENT_IMPLEMENTATION_PATHS,
      FORMAL_PROVIDER_PROTOCOL_PATH,
      FORMAL_PROVIDER_WORKER_PATH,
      FORMAL_PROVIDER_RESPONSE_PATH,
    ].map(async (repositoryPath) => {
      const bytes = await readFile(
        path.resolve(repositoryRoot, ...repositoryPath.split("/")),
      );
      return {
        path: repositoryPath,
        bytes: bytes.length,
        sha256: digest(bytes),
      };
    }),
  );
  return deriveFormalProviderAdapterIdentity({
    benchmarkImplementationIdentity: { entries },
    environment: { TY_CONTEXT_FORMAL_OPENAI_MODEL: model },
  });
}

export async function assertProviderBridgeControls() {
  const [captureSource, workerSource, protocolSource, identity] =
    await Promise.all([
      readFile(
        path.resolve(
          repositoryRoot,
          ...FORMAL_PROVIDER_ADAPTER_PATH.split("/"),
        ),
        "utf8",
      ),
      readFile(
        path.resolve(
          repositoryRoot,
          ...FORMAL_PROVIDER_WORKER_PATH.split("/"),
        ),
        "utf8",
      ),
      readFile(
        path.resolve(
          repositoryRoot,
          ...FORMAL_PROVIDER_PROTOCOL_PATH.split("/"),
        ),
        "utf8",
      ),
      fixtureProviderIdentity(),
    ]);
  assert.doesNotMatch(captureSource, /\bfetch\s*\(/u);
  assert.doesNotMatch(captureSource, /\.arrayBuffer\s*\(/u);
  assert.doesNotMatch(
    captureSource,
    /globalThis\.(?:fetch|Request|Response)/u,
  );
  assert.match(workerSource, /from "node:https"/u);
  assert.match(workerSource, /maximum_response_bytes/u);
  assert.match(workerSource, /request_timeout_ms/u);
  assert.match(protocolSource, /formal-provider-worker-request-v1/u);
  assert.equal(identity.schema_version, "formal-provider-adapter-identity-v2");
  assert.equal(identity.implementation.worker.path, FORMAL_PROVIDER_WORKER_PATH);
  assert.equal(
    identity.implementation.protocol.path,
    FORMAL_PROVIDER_PROTOCOL_PATH,
  );
  assert.deepEqual(FORMAL_PROVIDER_WORKER_ENVIRONMENT_KEYS, [
    "OPENAI_API_KEY",
    "SystemRoot",
    "WINDIR",
    "TEMP",
    "TMP",
  ]);
  assert.ok(
    [
      "NODE_OPTIONS",
      "NODE_PATH",
      "HTTP_PROXY",
      "HTTPS_PROXY",
      "ALL_PROXY",
      "NODE_EXTRA_CA_CERTS",
    ].every((key) =>
      FORMAL_PROVIDER_UNSUPPORTED_ENVIRONMENT_KEYS.includes(key),
    ),
  );
  assert.ok(
    Object.values(FORMAL_PROVIDER_LIMITS).every(
      (value) => Number.isSafeInteger(value) && value > 0,
    ),
  );
}

export async function assertProviderEvidenceAttacks(fixture) {
  const providerPath = fixture.attackPaths.provider;
  await assertJsonMutationRejected(
    fixture,
    providerPath,
    (event) => {
      event.provider_request_or_session_id = "";
    },
    /provider_event_identity/u,
  );
  await assertJsonMutationRejected(
    fixture,
    providerPath,
    (event) => {
      event.invocation_id = "f".repeat(64);
    },
    /provider_event_identity/u,
  );
  await assertJsonMutationRejected(
    fixture,
    providerPath,
    (event) => {
      event.model = "drifted-model";
    },
    /provider_event_identity/u,
  );
  await assertJsonMutationRejected(
    fixture,
    providerPath,
    (event) => {
      event.raw_prompt_sha256 = "0".repeat(64);
    },
    /provider_event_identity/u,
  );
  await assertJsonMutationRejected(
    fixture,
    providerPath,
    (event) => {
      event.usage = {
        input_tokens: 0,
        output_tokens: 0,
        cached_input_tokens: 0,
      };
    },
    /provider_event_usage/u,
  );
  const secondPath = await providerPathFor(fixture, "cost:authoring:pair-01:c");
  const first = JSON.parse(
    (await fixture.index.read(providerPath, "provider_event")).toString("utf8"),
  );
  await assertJsonMutationRejected(
    fixture,
    secondPath,
    (event) => {
      event.provider_request_or_session_id =
        first.provider_request_or_session_id;
    },
    /provider_event_identity/u,
  );
  const result = await fixture.evaluate();
  assert.equal(result.admitted, true);
  assert.equal(result.support_complete, false);
  assert.deepEqual(result.blockers, ["controlled_incident_external_pending"]);
}

async function providerPathFor(fixture, evidenceKey) {
  const binding = fixture.packet.artifact_bindings.find(
    (item) => item.evidence_key === evidenceKey,
  );
  const event = JSON.parse(
    (await fixture.index.read(binding.event_path, "raw_event")).toString(
      "utf8",
    ),
  );
  return event.execution_record.measurement_refs.provider_event.artifact_ref;
}
