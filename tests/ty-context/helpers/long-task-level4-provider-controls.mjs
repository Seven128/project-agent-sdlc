import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { FormalProviderCaptureAdapter } from "../../../tools/long_task_formal_provider_capture.mjs";
import {
  assertJsonMutationRejected,
  digest,
} from "./long-task-level4-test-utils.mjs";

const invocationId = "a".repeat(64);
const providerIdentity = Object.freeze({
  adapter_id: "openai-responses-loopback-v1",
  provider: "openai",
  endpoint: "https://api.openai.com/v1/responses",
  model: "fixture-model",
  identity_sha256: "c".repeat(64),
  support: { model_configured: true },
});

export async function assertProviderBridgeControls() {
  const root = await mkdtemp(path.join(os.tmpdir(), "ty-level4-provider-"));
  const realFetch = globalThis.fetch;
  const priorCredential = process.env.OPENAI_API_KEY;
  let providerResponse = validProviderResponse();
  const providerCalls = [];
  process.env.OPENAI_API_KEY = "parent-only-fixture-credential";
  globalThis.fetch = async (url, options) => {
    providerCalls.push({ url: String(url), options });
    return new Response(JSON.stringify(providerResponse), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };
  try {
    const correct = await openBridge();
    assert.ok(correct.argv[1].startsWith("http://127.0.0.1:"));
    assert.equal(correct.argv.includes(process.env.OPENAI_API_KEY), false);
    const prompt = Buffer.from("exact provider prompt\n");
    const response = await invokeBridge(realFetch, correct.argv, prompt);
    assert.equal(response.status, 200);
    const promptPath = path.join(root, "correct-prompt.bin");
    const eventPath = path.join(root, "correct-event.json");
    const persisted = await correct.closeAndPersist({
      rawPromptPath: promptPath,
      providerEventPath: eventPath,
    });
    const event = JSON.parse(await readFile(eventPath, "utf8"));
    assert.deepEqual(event.usage, {
      input_tokens: providerResponse.usage.input_tokens,
      output_tokens: providerResponse.usage.output_tokens,
      cached_input_tokens:
        providerResponse.usage.input_tokens_details.cached_tokens,
    });
    assert.equal(event.provider_request_or_session_id, providerResponse.id);
    assert.equal(
      event.recorded_at,
      new Date(providerResponse.created_at * 1000).toISOString(),
    );
    assert.equal(event.clock_id, "provider-unix-epoch-ms-v1:openai");
    assert.equal(event.raw_prompt_sha256, digest(prompt));
    assert.equal(persisted.raw_prompt_sha256, digest(prompt));
    assert.equal(providerCalls.length, 1);
    assert.equal(
      providerCalls[0].options.headers.authorization,
      `Bearer ${process.env.OPENAI_API_KEY}`,
    );

    const unused = await openBridge();
    await assert.rejects(
      () =>
        unused.closeAndPersist({
          rawPromptPath: path.join(root, "unused-prompt.bin"),
          providerEventPath: path.join(root, "unused-event.json"),
        }),
      /formal_provider_bridge_exactly_one_request/u,
    );

    const forged = await openBridge();
    assert.equal(
      (await invokeBridge(realFetch, forged.argv, prompt)).status,
      200,
    );
    const forgedEvent = path.join(root, "forged-event.json");
    await writeFile(forgedEvent, "child-authored event\n");
    await assert.rejects(
      () =>
        forged.closeAndPersist({
          rawPromptPath: path.join(root, "forged-prompt.bin"),
          providerEventPath: forgedEvent,
        }),
      /EEXIST/u,
    );

    const repeated = await openBridge();
    assert.equal(
      (await invokeBridge(realFetch, repeated.argv, prompt)).status,
      200,
    );
    assert.equal(
      (await invokeBridge(realFetch, repeated.argv, prompt)).status,
      502,
    );
    await assert.rejects(
      () =>
        repeated.closeAndPersist({
          rawPromptPath: path.join(root, "repeated-prompt.bin"),
          providerEventPath: path.join(root, "repeated-event.json"),
        }),
      /formal_provider_bridge_request/u,
    );

    let invalidIndex = 0;
    for (const invalid of [
      { ...validProviderResponse(), id: "" },
      { ...validProviderResponse(), model: "drifted-model" },
      {
        ...validProviderResponse(),
        usage: { ...validProviderResponse().usage, input_tokens: 0 },
      },
      {
        ...validProviderResponse(),
        usage: { ...validProviderResponse().usage, output_tokens: 0 },
      },
    ]) {
      providerResponse = invalid;
      invalidIndex += 1;
      const bridge = await openBridge();
      assert.equal(
        (await invokeBridge(realFetch, bridge.argv, prompt)).status,
        502,
      );
      await assert.rejects(
        () =>
          bridge.closeAndPersist({
            rawPromptPath: path.join(root, `${invalidIndex}-prompt.bin`),
            providerEventPath: path.join(root, `${invalidIndex}-event.json`),
          }),
        /formal_provider_response_identity_usage/u,
      );
    }
    for (const createdAt of [undefined, 0, 1.5, Number.MAX_SAFE_INTEGER]) {
      providerResponse = { ...validProviderResponse(), created_at: createdAt };
      invalidIndex += 1;
      const bridge = await openBridge();
      assert.equal(
        (await invokeBridge(realFetch, bridge.argv, prompt)).status,
        502,
      );
      await assert.rejects(
        () =>
          bridge.closeAndPersist({
            rawPromptPath: path.join(root, `${invalidIndex}-prompt.bin`),
            providerEventPath: path.join(root, `${invalidIndex}-event.json`),
          }),
        /formal_provider_response_timestamp/u,
      );
    }
  } finally {
    globalThis.fetch = realFetch;
    if (priorCredential === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = priorCredential;
    await rm(root, { recursive: true, force: true });
  }
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

async function openBridge() {
  return new FormalProviderCaptureAdapter(providerIdentity).openOneShotBridge({
    invocationId,
  });
}

async function invokeBridge(realFetch, argv, prompt) {
  return realFetch(argv[1], {
    method: "POST",
    headers: { authorization: `Bearer ${argv[3]}` },
    body: prompt,
  });
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

function validProviderResponse() {
  return {
    id: "response-fixture-001",
    model: "fixture-model",
    created_at: 1_786_838_400,
    usage: {
      input_tokens: 101,
      output_tokens: 17,
      input_tokens_details: { cached_tokens: 0 },
    },
  };
}
