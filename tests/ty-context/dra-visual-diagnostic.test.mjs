import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import test from "node:test";

const execFileAsync = promisify(execFile);
const repository = path.resolve(import.meta.dirname, "..", "..");
const runner = path.join(
  repository,
  "examples",
  "delivery-benchmark",
  "mechanism",
  "runner",
  "visual_diagnostic.mjs",
);

test("DRA visual diagnostic freezes a descriptive non-admission boundary", async () => {
  const { stdout } = await execFileAsync(process.execPath, [runner, "freeze-check"], {
    cwd: repository,
  });
  const result = JSON.parse(stdout);
  assert.equal(result.status, "OK");
  assert.equal(result.cases, 8);
  assert.equal(result.variants, 5);
  assert.equal(result.rubric_dimensions, 10);
  assert.equal(result.admission_effect, "none");
  assert.equal(result.provider_ranking_effect, "none");
});

test("DRA visual diagnostic prepares a complete randomized blinded schedule", async () => {
  const temporary = await mkdtemp(path.join(os.tmpdir(), "ty-dra-visual-"));
  try {
    const { stdout: freezeOutput } = await execFileAsync(
      process.execPath,
      [runner, "freeze-check"],
      { cwd: repository },
    );
    const freeze = JSON.parse(freezeOutput);
    const variants = [
      "open-design-generic-skill",
      "open-design-specialized-skill",
      "specialized-plus-quality-commission",
      "specialized-plus-refinement",
      "direct-agent-provider",
    ];
    const bindings = {
      schema_version: "dra-visual-diagnostic-bindings-v1",
      protocol_sha256: freeze.protocol_sha256,
      variant_bindings: variants.map((variant, index) => ({
        variant_key: variant,
        execution_route_identity: `route-${index + 1}-sha256-aaaaaaaa`,
        provider_identity: `provider-${index + 1}`,
        provider_version: `1.0.${index}`,
        implementation_commit_or_tag: `v1.0.${index}`,
        model_identity: `model-${index + 1}`,
        reasoning_effort: "high",
        capability_evidence_ref: `evidence-${index + 1}-sha256-bbbbbbbb`,
      })),
    };
    const bindingsPath = path.join(temporary, "bindings.json");
    const output = path.join(temporary, "prepared");
    await writeFile(bindingsPath, `${JSON.stringify(bindings, null, 2)}\n`);
    const { stdout } = await execFileAsync(
      process.execPath,
      [
        runner,
        "prepare",
        "--bindings",
        bindingsPath,
        "--run-id",
        "test-run",
        "--seed",
        "test-secret-seed",
        "--repeats",
        "3",
        "--out",
        output,
      ],
      { cwd: repository },
    );
    const result = JSON.parse(stdout);
    assert.equal(result.status, "PREPARED");
    assert.equal(result.items, 120);
    assert.equal(result.boundary, "descriptive_non_admission");

    const publicBytes = await readFile(
      path.join(output, "blind-review.json"),
      "utf8",
    );
    const publicSchedule = JSON.parse(publicBytes);
    const privateKey = JSON.parse(
      await readFile(path.join(output, "private-key.json"), "utf8"),
    );
    assert.equal(publicSchedule.items.length, 120);
    assert.equal(privateKey.mapping.length, 120);
    assert.equal(publicSchedule.provider_identity_blinded, true);
    assert.equal(publicSchedule.authority.admission_effect, "none");
    assert.equal(publicSchedule.authority.provider_ranking_effect, "none");
    assert.equal(publicSchedule.items[0].rubric.length, 10);
    for (const variant of variants) assert.equal(publicBytes.includes(variant), false);
    assert.equal(
      new Set(privateKey.mapping.map((item) => item.variant_key)).size,
      variants.length,
    );
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
});
