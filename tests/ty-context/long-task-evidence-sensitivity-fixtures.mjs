import assert from "node:assert/strict";
import { preflightDeliveryContract } from "../../packages/ty-context/dist/lib/long-task-authoring-preflight.js";
import { compileDeliveryContract } from "../../packages/ty-context/dist/lib/long-task-delivery-compiler.js";
import { writeContract } from "./long-task-delivery-fixtures.mjs";

export async function assertActivationRejects(
  fixture,
  { code, includes = [] },
) {
  await writeContract(fixture.workdir, fixture.contract);
  const preflight = await preflightDeliveryContract(
    fixture.workdir,
    fixture.root,
  );
  assert.equal(preflight.status, "not_ready");
  const diagnostics = preflight.diagnostics.filter(
    (item) => item.code === code,
  );
  assert.ok(diagnostics.length, `missing ${code} diagnostic`);
  for (const value of includes)
    assert.match(JSON.stringify(diagnostics), new RegExp(escapeRegExp(value)));
  await assert.rejects(
    compileDeliveryContract(fixture.workdir, fixture.root, {
      require_completion_gate: false,
    }),
    new RegExp(escapeRegExp(code), "u"),
  );
}

export async function assertActivationReady(fixture) {
  await writeContract(fixture.workdir, fixture.contract);
  const preflight = await preflightDeliveryContract(
    fixture.workdir,
    fixture.root,
  );
  assert.equal(
    preflight.status,
    "ready",
    JSON.stringify(preflight.diagnostics),
  );
  await assert.doesNotReject(
    compileDeliveryContract(fixture.workdir, fixture.root, {
      require_completion_gate: false,
    }),
  );
}

export function counterfactual({ key, checkKey, claims, assertionKeys }) {
  return {
    key,
    binding_key: "state-first",
    claims,
    check_key: checkKey,
    mutation: {
      type: "replace_file",
      path: "src/state.json",
      fixture_path: "tests/semantic-false.json",
    },
    expected_assertion_failures: assertionKeys,
    preserved_assertions: ["first-liveness"],
  };
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}
