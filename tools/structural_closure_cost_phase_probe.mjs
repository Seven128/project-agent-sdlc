import assert from "node:assert/strict";
import { rm } from "node:fs/promises";
import { performance } from "node:perf_hooks";
import { preflightDeliveryContract } from "../packages/ty-context/dist/lib/long-task-authoring-preflight.js";
import { compileDeliveryContract } from "../packages/ty-context/dist/lib/long-task-delivery-compiler.js";
import {
  activateDeliveryContract,
  readFinalReceipt,
  writeCompiledDeliveryContract,
} from "../packages/ty-context/dist/lib/long-task-state.js";
import { stopCheckDeliveryTask } from "../packages/ty-context/dist/lib/long-task-status-v2.js";
import { canonicalValueJson } from "../packages/ty-context/dist/lib/strict-codec.js";
import {
  commitCandidate,
  createDeliveryFixture,
  runCli,
} from "../tests/ty-context/long-task-delivery-fixtures.mjs";

export async function measureLongTaskPhases() {
  const fixture = await createDeliveryFixture();
  const previousCwd = process.cwd();
  try {
    await runCli(fixture.root, ["enable", "long-task"]);
    const preflight = await timed(() =>
      preflightDeliveryContract(fixture.workdir, fixture.root),
    );
    assert.equal(
      preflight.value.status,
      "ready",
      JSON.stringify(preflight.value.diagnostics),
    );
    const compile = await timed(() =>
      compileDeliveryContract(fixture.workdir, fixture.root, {
        require_completion_gate: true,
      }),
    );
    await writeCompiledDeliveryContract(compile.value);
    await activateDeliveryContract(compile.value);
    await commitCandidate(fixture.root);
    process.chdir(fixture.root);
    const finalGate = await timed(() =>
      stopCheckDeliveryTask(fixture.workdir),
    );
    assert.equal(
      finalGate.value.continue,
      true,
      JSON.stringify(finalGate.value),
    );
    const receipt = await readFinalReceipt(fixture.root, fixture.workdir);
    assert.equal(receipt.workflow_status, "machine_accepted");
    return {
      preflight_ms: round(preflight.ms),
      compile_ms: round(compile.ms),
      final_gate_ms: round(finalGate.ms),
      evidence_bytes: Buffer.byteLength(
        canonicalValueJson(receipt.check_results),
        "utf8",
      ),
      peak_rss_bytes: process.resourceUsage().maxRSS * 1024,
    };
  } finally {
    process.chdir(previousCwd);
    await rm(fixture.root, {
      recursive: true,
      force: true,
      maxRetries: 20,
      retryDelay: 100,
    });
  }
}

async function timed(action) {
  const started = performance.now();
  const value = await action();
  return { value, ms: performance.now() - started };
}

function round(value) {
  return Number(value.toFixed(3));
}
