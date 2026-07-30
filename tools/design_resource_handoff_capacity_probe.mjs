import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";
import YAML from "yaml";
import {
  parseDesignResourceHandoffMarkdown,
  scanDesignResourceHandoffBlocks,
} from "../packages/ty-context/dist/lib/design-resource-handoff-parser.js";
import { preflightParsedDesignResourceHandoff } from "../packages/ty-context/dist/lib/design-resource-handoff-validation.js";
import { assertProtectedRepositoryFile } from "../packages/ty-context/dist/lib/long-task-protected-files.js";
import { forEachSourceLine } from "../packages/ty-context/dist/lib/source-line-scanner.js";

export async function runDesignResourceHandoffCapacityProbe({
  repository,
  handoffPath,
  expectedCounts = {},
}) {
  const handoffFile = await assertProtectedRepositoryFile(
    repository,
    path.resolve(repository, ...handoffPath.split("/")),
    "design_resource_capacity_probe",
  );
  let raw = await readFile(handoffFile);
  const bytes = raw.length;
  const sha256 = createHash("sha256").update(raw).digest("hex");
  let content = raw.toString("utf8");
  const utf16CodeUnits = content.length;
  raw = null;
  const scannerStarted = performance.now();
  const blocks = scanDesignResourceHandoffBlocks(content);
  const scannerWallMs = performance.now() - scannerStarted;
  if (blocks.length !== 1)
    throw new Error(
      `design_resource_capacity_probe_invalid:block_count:${blocks.length}`,
    );
  const expectedYamlDecodeCalls = countSourceFormalBlocks(content);

  const beforeMaxRss = process.resourceUsage().maxRSS;
  const beforeCpu = process.cpuUsage();
  const preflightStarted = performance.now();
  const originalParseAllDocuments = YAML.parseAllDocuments;
  let yamlDecodeCalls = 0;
  YAML.parseAllDocuments = (...args) => {
    yamlDecodeCalls += 1;
    return Reflect.apply(originalParseAllDocuments, YAML, args);
  };
  let result;
  try {
    const parsed = parseDesignResourceHandoffMarkdown(handoffPath, content);
    content = null;
    result = await preflightParsedDesignResourceHandoff(repository, parsed);
  } finally {
    YAML.parseAllDocuments = originalParseAllDocuments;
  }
  const preflightWallMs = performance.now() - preflightStarted;
  const cpu = process.cpuUsage(beforeCpu);
  const usage = process.resourceUsage();
  const memory = process.memoryUsage();
  if (yamlDecodeCalls !== expectedYamlDecodeCalls)
    throw new Error(
      `design_resource_capacity_probe_invalid:yaml_decode_calls:${expectedYamlDecodeCalls}:${yamlDecodeCalls}`,
    );
  const informationCounts = designResourceInformationCounts(result);
  assertExpectedCounts(informationCounts, expectedCounts);
  return {
    schema_version: "design-resource-handoff-capacity-probe-v1",
    node: process.version,
    platform: process.platform,
    arch: process.arch,
    input: {
      bytes,
      utf16_code_units: utf16CodeUnits,
      sha256,
    },
    scanner: {
      block_count: blocks.length,
      wall_ms: rounded(scannerWallMs),
    },
    preflight: {
      status: result.status,
      wall_ms: rounded(preflightWallMs),
      user_cpu_ms: rounded(cpu.user / 1000),
      system_cpu_ms: rounded(cpu.system / 1000),
      max_rss_mib: rounded(usage.maxRSS / 1024),
      max_rss_delta_mib: rounded((usage.maxRSS - beforeMaxRss) / 1024),
      end_heap_used_mib: rounded(memory.heapUsed / 1024 / 1024),
      end_external_mib: rounded(memory.external / 1024 / 1024),
      yaml_decode_calls: yamlDecodeCalls,
      expected_yaml_decode_calls: expectedYamlDecodeCalls,
      counts: informationCounts,
      expected_counts_asserted: Object.keys(expectedCounts).sort(),
    },
  };
}

export function countSourceFormalBlocks(content) {
  let count = 0;
  let open = false;
  forEachSourceLine(content, (line) => {
    if (open) {
      if (/^\s*```[ \t]*$/u.test(line)) open = false;
      return;
    }
    if (
      /^\s*```yaml[ \t]+(?:design-resource-handoff-v1|semantic-fact-manifest-v1)[ \t]*$/u.test(
        line,
      )
    ) {
      count += 1;
      open = true;
    }
  });
  return count;
}

function designResourceInformationCounts(result) {
  const handoff = result.handoff;
  return {
    surface_keys: handoff.scope.surface_keys.length,
    necessary_context: handoff.scope.necessary_context.length,
    scope_exclusions: handoff.scope.exclusions.length,
    source_items: result.source_item_keys.length,
    resources: handoff.resources.length,
    manifests: result.counts.manifests,
    axis_dispositions: handoff.axis_dispositions.length,
    condition_exclusions: handoff.condition_exclusions.length,
    conditions: handoff.conditions.length,
    subjects: handoff.subjects.length,
    variation_axis_dispositions: handoff.variation_axis_dispositions.length,
    variation_exclusions: handoff.variation_exclusions.length,
    variations: handoff.variations.length,
    properties: handoff.properties.length,
    lineage_nodes: handoff.lineage_nodes.length,
    targets: handoff.targets.length,
    evidence: handoff.evidence.length,
    fact_cells: handoff.fact_cells.length,
    facts: handoff.facts.length,
    proof_obligations: handoff.proof_obligations.length,
    oracles: handoff.oracles.length,
    environments: handoff.environments.length,
    asset_bindings: handoff.asset_bindings.length,
    resource_fact_closure: handoff.resource_fact_closure.length,
    coverage: handoff.coverage.length,
    acceptance_blockers: handoff.acceptance_blockers.length,
  };
}

export function assertExpectedCounts(actual, expected) {
  for (const [key, value] of Object.entries(expected)) {
    if (!Number.isSafeInteger(value) || value < 0)
      throw new Error(
        `design_resource_capacity_probe_invalid:expected_count:${key}:${value}`,
      );
    if (!(key in actual))
      throw new Error(
        `design_resource_capacity_probe_invalid:unknown_count:${key}`,
      );
    if (actual[key] !== value)
      throw new Error(
        `design_resource_capacity_probe_invalid:count_mismatch:${key}:${value}:${actual[key]}`,
      );
  }
}

function rounded(value) {
  return Math.round(value * 100) / 100;
}

async function main() {
  const repository =
    process.argv[2] ?? process.env.TY_CONTEXT_TARGET_REPOSITORY;
  const handoffPath = process.argv[3] ?? process.env.TY_CONTEXT_HANDOFF_PATH;
  if (!repository || !handoffPath)
    throw new Error(
      "Usage: node tools/design_resource_handoff_capacity_probe.mjs <repository> <repository-relative-handoff.md>; optional TY_CONTEXT_EXPECTED_HANDOFF_COUNTS JSON",
    );
  const expectedCounts = process.env.TY_CONTEXT_EXPECTED_HANDOFF_COUNTS
    ? JSON.parse(process.env.TY_CONTEXT_EXPECTED_HANDOFF_COUNTS)
    : {};
  console.log(
    JSON.stringify(
      await runDesignResourceHandoffCapacityProbe({
        repository,
        handoffPath,
        expectedCounts,
      }),
      null,
      2,
    ),
  );
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
)
  await main();
