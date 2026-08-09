import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import YAML from "yaml";
import { fixtureExactComparisonResultIdentity } from "./long-task-exact-comparison-fixture.mjs";
import {
  refreshFixtureSemanticManifest,
  semanticManifestIdentity,
  writeContract,
} from "./long-task-delivery-fixtures.mjs";

const repositoryRoot = fileURLToPath(new URL("../..", import.meta.url));

export async function readRepositoryFile(relativePath) {
  return readFile(
    path.join(repositoryRoot, ...relativePath.split("/")),
    "utf8",
  );
}

export function digestValue(value) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

export function refreshComparisonIdentity(record, expected, targetRef) {
  const actualValueSha256 =
    targetRef === record.target_ref
      ? record.actual_observation.value_sha256
      : record.observer_results.find((item) => item.target_ref === targetRef)
          .value_sha256;
  const revisionIdentityPresent =
    expected.fact_key !== undefined ||
    expected.fact_revision_digest !== undefined ||
    expected.obligation_key !== undefined ||
    expected.obligation_revision_digest !== undefined;
  return fixtureExactComparisonResultIdentity({
    identity: revisionIdentityPresent
      ? {
          kind: "semantic_fact_non_ui",
          fact_ref: expected.fact_ref,
          proof_ref: expected.proof_ref,
          fact_key: expected.fact_key,
          fact_revision_digest: expected.fact_revision_digest,
          obligation_key: expected.obligation_key,
          obligation_revision_digest: expected.obligation_revision_digest,
          target_ref: targetRef,
        }
      : {
          kind: "semantic_fact_non_ui",
          fact_ref: expected.fact_ref,
          proof_ref: expected.proof_ref,
          target_ref: targetRef,
        },
    actual_value_sha256: actualValueSha256,
    expected_value_sha256: expected.expected.sha256,
    comparator: expected.comparison.comparator,
    mode: expected.comparison.mode,
    parameters_sha256: expected.comparison.parameters.sha256,
    tolerance_sha256: expected.comparison.tolerance?.sha256 ?? null,
    mask_sha256: expected.comparison.mask?.sha256 ?? null,
    passed: actualValueSha256 === expected.expected.sha256,
  });
}

export function addFixtureCustomConditionAxis(manifest) {
  const condition = manifest.conditions[0];
  const customAxis = {
    key: "axis.custom.delivery-channel",
    axis: "custom.delivery_channel",
    standard: false,
    disposition: "applicable",
    outcome_refs: ["first"],
    values: [
      {
        key: "api",
        source_item_refs: ["fixture-architecture"],
        basis_refs: ["fixture-architecture"],
      },
    ],
    source_item_refs: ["fixture-architecture"],
    basis_refs: ["fixture-architecture"],
    rationale: "The custom channel is explicitly part of the fixture scope.",
  };
  manifest.axis_dispositions.push(customAxis);
  condition.axis_values.push({
    axis_ref: customAxis.key,
    value_ref: customAxis.values[0].key,
  });
  manifest.condition_rules.push({
    key: "condition-rule.custom.delivery-channel",
    outcome_ref: "first",
    axis_refs: [customAxis.key],
    mode: "cross_product",
    condition_refs: [condition.key],
    exclusion_refs: [],
    source_item_refs: ["fixture-architecture"],
    basis_refs: ["fixture-architecture"],
    rationale: "The one-value custom axis has one exact combination.",
  });
  return customAxis;
}

export async function mutateFixtureSemanticManifest(fixture, mutate) {
  const sourcePath = path.join(fixture.root, "source.md");
  const source = await readFile(sourcePath, "utf8");
  const match = source.match(
    /```yaml semantic-fact-manifest-v1\r?\n([\s\S]*?)\r?\n```/u,
  );
  assert.ok(match);
  const manifest = YAML.parse(match[1]);
  mutate(manifest);
  refreshFixtureSemanticManifest(manifest);
  const serialized = YAML.stringify(JSON.parse(JSON.stringify(manifest)), {
    lineWidth: 0,
  }).trimEnd();
  await writeFile(
    sourcePath,
    source.replace(
      match[0],
      `\`\`\`yaml semantic-fact-manifest-v1\n${serialized}\n\`\`\``,
    ),
  );
  fixture.contract.semantic_fact_manifest.sha256 =
    semanticManifestIdentity(manifest);
  await writeContract(fixture.workdir, fixture.contract, {
    synchronizeSemanticManifest: false,
  });
  return manifest;
}
