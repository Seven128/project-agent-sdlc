import { REAL_PROCESS_SCHEMAS } from "../../../tools/long_task_real_process_schema_policy.mjs";
import {
  canonical,
  sha256,
} from "../../../tools/long_task_real_process_roi_scoring.mjs";
import { digest, toBytes } from "./long-task-level4-test-utils.mjs";

export function buildLevel4FixtureSources({
  catalog,
  retentionSourceBytes,
  sourceTimeline,
}) {
  const sources = new Map();
  const add = (relative, role, value) => {
    const bytes = toBytes(value);
    sources.set(relative, {
      entry: {
        path: relative,
        role,
        bytes: bytes.length,
        sha256: digest(bytes),
      },
      bytes,
    });
  };
  add("scenarios/catalog.json", "scenario_catalog", catalog);
  for (const scenario of catalog.scenarios) {
    add(
      scenario.task_source_ref,
      "scenario_source",
      `task:${scenario.scenario_id}\n`,
    );
    add(
      scenario.gold_source_ref,
      "scenario_gold",
      `gold:${scenario.scenario_id}\n`,
    );
  }
  const collectorRef = "collectors/external-real-collector.mjs";
  add(
    collectorRef,
    "collector",
    `import { writeFile } from "node:fs/promises";

const argv = process.argv.slice(2);
const readArgument = (name) => {
  const indexes = argv.flatMap((value, index) => value === name ? [index] : []);
  if (indexes.length !== 1 || indexes[0] + 1 >= argv.length)
    throw new Error(\`fixture_collector_argument:\${name}\`);
  return argv[indexes[0] + 1];
};
const output = readArgument("--output");
const invocationId = readArgument("--invocation-id");
const scenarioId = readArgument("--scenario-id");
readArgument("--candidate-package");
readArgument("--task");
readArgument("--variant-id");
if (!/^[a-f0-9]{64}$/u.test(invocationId))
  throw new Error("fixture_collector_invocation");
await writeFile(output, Buffer.from(\`gold:\${scenarioId}\\n\`), { flag: "wx" });
`,
  );
  add("collectors/catalog.json", "collector", {
    schema_version:
      REAL_PROCESS_SCHEMAS.FORMAL_TOTAL_COST_COLLECTOR_CATALOG_SCHEMA,
    frozen_at: sourceTimeline.collectorFrozenAt,
    collectors: [
      {
        collector_id: "external-real-scenario-collector-v1",
        implementation_ref: collectorRef,
        runtime_kind: "node-direct",
        output_protocol: "runner-fresh-child-only-file-v1",
        supported_source_kinds: [
          "runner-exact-state-payload-retention-v1",
          "runner-interaction-recorder-v1",
          "runner-provider-bridge-capture-v1",
          "runner-provider-bridge-exact-prompt-v1",
          "windows-job-object-accounting-v1",
        ],
      },
    ],
  });
  addPriceSources(add, sourceTimeline);
  add(
    "state/retention-source.txt",
    "state_retention_source",
    retentionSourceBytes,
  );
  addIncidentSources(add, sources, catalog, sourceTimeline);
  return { sources, collectorRef };
}

function addPriceSources(add, sourceTimeline) {
  const documentRef = "prices/official-price-document.json";
  add(documentRef, "price_document", {
    schema_version:
      REAL_PROCESS_SCHEMAS.FORMAL_TOTAL_COST_PRICE_DOCUMENT_SCHEMA,
    source_kind: "official_price",
    publisher: "fixture-provider",
    source_locator: "fixture://provider/prices/2026-08-15",
    published_at: sourceTimeline.pricePublishedAt,
    currency: "CNY",
    rates: [
      ["provider_input_token", "token", 0.000001],
      ["provider_output_token", "token", 0.000002],
      ["provider_cached_input_token", "token", 0.0000005],
      ["compute_ms", "millisecond", 0.000001],
      ["storage_byte_hour", "byte-hour", 0.000001],
    ].map(([key, unit, cnyPerUnit]) => ({
      key,
      unit,
      basis: "official_rate",
      cny_per_unit: cnyPerUnit,
    })),
  });
  add("prices/official-price-source.json", "price_source", {
    schema_version: REAL_PROCESS_SCHEMAS.FORMAL_TOTAL_COST_PRICE_SOURCE_SCHEMA,
    source_document_ref: documentRef,
    frozen_at: sourceTimeline.priceFrozenAt,
    currency: "CNY",
  });
}

function addIncidentSources(add, sources, catalog, sourceTimeline) {
  const manifests = {};
  const roles = ["incident_design", "incident_provenance", "incident_runtime"];
  for (const kind of ["original", "sanitized"]) {
    const entries = [];
    for (const role of roles) {
      const relative = `incident/${kind}/${role}.txt`;
      const bytes = Buffer.from(`${role}\n`);
      add(relative, "incident_source", bytes);
      entries.push({
        path: relative,
        role,
        bytes: bytes.length,
        sha256: digest(bytes),
      });
    }
    manifests[kind] = {
      kind,
      entries,
      identity_sha256: sha256(canonical({ kind, entries })),
    };
  }
  const incident = catalog.scenarios.find(
    (item) => item.scenario_id === "fixed-controlled-incident",
  );
  add("incident/bundle.json", "incident_source", {
    schema_version: "level4-controlled-incident-source-bundle-v1",
    incident_id: "synthetic-structure-test-only",
    evidence_class: "synthetic_test_only",
    original: manifests.original,
    sanitized: manifests.sanitized,
    mapping: manifests.original.entries.map((entry, index) => ({
      original_path: entry.path,
      sanitized_path: manifests.sanitized.entries[index].path,
      disposition: "exact",
      reason: "structural test fixture",
    })),
    authorization: {
      authorization_id: "synthetic-fixture-authorization",
      granted_at: sourceTimeline.authorizationGrantedAt,
      owner: "fixture-owner",
      scope: "synthetic-structure-only",
      permitted_uses: [
        "formal-evidence-collection",
        "independent-capability-audit",
      ],
      retention_terms: "ephemeral test fixture",
      publication_terms: "not for promotion",
    },
    task_gold_derivation: {
      method: "authorized-incident-source-derivation-v1",
      task_source_ref: incident.task_source_ref,
      task_sha256: sources.get(incident.task_source_ref).entry.sha256,
      gold_source_ref: incident.gold_source_ref,
      gold_sha256: sources.get(incident.gold_source_ref).entry.sha256,
    },
  });
}
