import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  assertExpectedCounts,
  countSourceFormalBlocks,
  runDesignResourceHandoffCapacityProbe,
} from "../../tools/design_resource_handoff_capacity_probe.mjs";
import {
  DESIGN_HANDOFF_PATH,
  manifestBackedDesignResourceHandoff,
  writeDesignResourceHandoff,
  writeDesignResourceHandoffFixture,
} from "./design-resource-handoff-fixture.mjs";

test("capacity probe reports bounded metrics and enforces declared information counts", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "design-capacity-probe-"));
  try {
    const { handoff } = await writeDesignResourceHandoffFixture(
      root,
      undefined,
      { representation: "embedded" },
    );
    const expectedCounts = {
      source_items: 1,
      targets: 1,
      conditions: 2,
      properties: 217,
      fact_cells: 3038,
      facts: 36,
      proof_obligations: 48,
      acceptance_blockers: 0,
    };
    const embedded = await runDesignResourceHandoffCapacityProbe({
      repository: root,
      handoffPath: DESIGN_HANDOFF_PATH,
      expectedCounts,
    });
    await writeDesignResourceHandoff(
      root,
      manifestBackedDesignResourceHandoff(handoff),
    );
    const result = await runDesignResourceHandoffCapacityProbe({
      repository: root,
      handoffPath: DESIGN_HANDOFF_PATH,
      expectedCounts,
    });
    assert.equal(
      result.schema_version,
      "design-resource-handoff-capacity-probe-v1",
    );
    assert.equal(result.scanner.block_count, 1);
    assert.equal(result.preflight.status, "ready");
    assert.equal(result.preflight.yaml_decode_calls, 1);
    assert.equal(result.preflight.expected_yaml_decode_calls, 1);
    assert.equal(result.preflight.counts.source_items, 1);
    assert.equal(result.preflight.counts.fact_cells, 3038);
    assert.deepEqual(result.preflight.expected_counts_asserted, [
      "acceptance_blockers",
      "conditions",
      "fact_cells",
      "facts",
      "proof_obligations",
      "properties",
      "source_items",
      "targets",
    ]);
    assert.ok(result.input.bytes > 0);
    assert.ok(result.input.bytes < embedded.input.bytes / 3);
    assert.match(result.input.sha256, /^[a-f0-9]{64}$/u);
    assert.ok(result.preflight.max_rss_mib > 0);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("capacity decode accounting counts each supported formal block once", () => {
  const content = [
    "```yaml design-resource-handoff-v1",
    "schema_version: design-resource-handoff-v1",
    "  ```yaml semantic-fact-manifest-v1",
    "```",
    "```yaml semantic-fact-manifest-v1",
    "schema_version: semantic-fact-manifest-v1",
    "```",
  ].join("\n");
  assert.equal(countSourceFormalBlocks(content), 2);
});

test("capacity count expectations fail closed on drift or unknown counters", () => {
  assert.throws(
    () => assertExpectedCounts({ facts: 4 }, { facts: 5 }),
    /count_mismatch:facts:5:4/u,
  );
  assert.throws(
    () => assertExpectedCounts({ facts: 4 }, { targets: 1 }),
    /unknown_count:targets/u,
  );
  assert.throws(
    () => assertExpectedCounts({ facts: 4 }, { facts: -1 }),
    /expected_count:facts:-1/u,
  );
});
