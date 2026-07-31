import assert from "node:assert/strict";
import {
  mkdtemp,
  readFile,
  rm,
  truncate,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { preflightDesignResourceHandoff } from "../../packages/ty-context/dist/index.js";
import { DESIGN_RESOURCE_SYMBOLIC_FACT_POLICY } from "../../packages/ty-context/dist/lib/design-resource-symbolic-fact-policy.js";
import {
  assertDesignResourceV1HandoffCapacity,
  assertDesignResourceV1ManifestCapacity,
  parseDesignResourceV1CapacityHeader,
} from "../../packages/ty-context/dist/lib/design-resource-v1-capacity.js";
import {
  DESIGN_FACT_MANIFEST_PATH,
  DESIGN_HANDOFF_PATH,
  writeDesignResourceFactManifest,
  writeDesignResourceHandoffFixture,
} from "./design-resource-handoff-fixture.mjs";

const policy = DESIGN_RESOURCE_SYMBOLIC_FACT_POLICY.v1_capacity;

test("V1 capacity budgets preserve the measured admission thresholds", () => {
  assert.deepEqual(policy, {
    embedded_handoff_max_bytes: 8_388_608,
    canonical_manifest_max_bytes: 33_554_432,
    expected_fact_cells_max: 16_384,
    capacity_header_prefix_max_bytes: 65_536,
  });
});

test("bounded capacity header parser accepts the exact Fact Cell limit", () => {
  const header = capacityHeader(policy.expected_fact_cells_max);
  const parsed = parseDesignResourceV1CapacityHeader(header);
  assert.equal(
    parsed.collection_counts.get("fact_cells"),
    policy.expected_fact_cells_max,
  );
});

test("V1 handoff stat guard rejects above-limit bytes before markdown or YAML parsing", async () => {
  await withTemp(async (root) => {
    const handoff = path.join(root, "oversized.md");
    await writeFile(handoff, "not a handoff");
    await truncate(handoff, policy.embedded_handoff_max_bytes + 1);
    await assert.rejects(
      assertDesignResourceV1HandoffCapacity(handoff),
      /v1_handoff_capacity_exceeded:bytes=8388609:limit=8388608:regenerate_as=design-resource-handoff-v2/u,
    );
    await assert.rejects(
      preflightDesignResourceHandoff(root, "oversized.md"),
      /v1_handoff_capacity_exceeded/u,
    );
  });
});

test("V1 manifest stat guard rejects above-limit bytes before prefix or whole-file parsing", async () => {
  await withTemp(async (root) => {
    const manifest = path.join(root, "oversized.json");
    await writeFile(manifest, "not json");
    await truncate(manifest, policy.canonical_manifest_max_bytes + 1);
    await assert.rejects(
      assertDesignResourceV1ManifestCapacity(manifest),
      /v1_manifest_capacity_exceeded:bytes=33554433:limit=33554432:regenerate_as=design-resource-handoff-v2/u,
    );
  });
});

test("V1 manifest rejects a late header after reading no more than the fixed prefix", async () => {
  await withTemp(async (root) => {
    const manifest = path.join(root, "late-header.json");
    const padding = "x".repeat(policy.capacity_header_prefix_max_bytes);
    await writeFile(
      manifest,
      `{"schema_version":"design-resource-observable-fact-manifest-v1","padding":"${padding}","generation":${generation(policy.expected_fact_cells_max)}}`,
    );
    await assert.rejects(
      assertDesignResourceV1ManifestCapacity(manifest),
      /v1_manifest_capacity_header_missing_or_late:prefix_limit=65536/u,
    );
  });
});

test("integrated V1 preflight rejects an excessive declared Fact Cell count before full manifest validation", async () => {
  await withTemp(async (root) => {
    const fixture = await writeDesignResourceHandoffFixture(root);
    const factCells = fixture.manifest.generation.collections.find(
      (item) => item.name === "fact_cells",
    );
    factCells.expected_count = policy.expected_fact_cells_max + 1;
    await writeDesignResourceFactManifest(
      root,
      fixture.handoff,
      fixture.manifest,
      { refreshGeneration: false },
    );
    await assert.rejects(
      preflightDesignResourceHandoff(root, DESIGN_HANDOFF_PATH),
      /v1_fact_cell_capacity_exceeded:expected_count=16385:limit=16384:regenerate_as=design-resource-handoff-v2/u,
    );
  });
});

test("current complete V1 fixture remains admitted without truncation", async () => {
  await withTemp(async (root) => {
    await writeDesignResourceHandoffFixture(root);
    const result = await preflightDesignResourceHandoff(
      root,
      DESIGN_HANDOFF_PATH,
    );
    const manifest = await readFile(
      path.join(root, DESIGN_FACT_MANIFEST_PATH),
      "utf8",
    );
    assert.equal(result.status, "ready");
    assert.equal(result.counts.fact_cells, 3_038);
    assert.ok(Buffer.byteLength(manifest) < policy.canonical_manifest_max_bytes);
  });
});

function capacityHeader(expectedFactCells) {
  return `{"schema_version":"design-resource-observable-fact-manifest-v1","generation":${generation(expectedFactCells)},"fact_cells":[`;
}

function generation(expectedFactCells) {
  return JSON.stringify({
    strategy: "complete_explicit",
    sampling: "forbidden",
    truncation: "forbidden",
    chunk_count: 1,
    chunk_indexes: [0],
    collections: [
      {
        name: "fact_cells",
        expected_count: expectedFactCells,
        identity_sha256: "0".repeat(64),
      },
    ],
  });
}

async function withTemp(run) {
  const root = await mkdtemp(path.join(os.tmpdir(), "ty-context-v1-capacity-"));
  try {
    await run(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}
