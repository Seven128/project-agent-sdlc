import assert from "node:assert/strict";
import {
  link,
  mkdir,
  mkdtemp,
  readFile,
  realpath,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  canonical,
  sha256,
} from "../../../tools/long_task_real_process_roi_scoring.mjs";
import { deriveFormalTotalCostAccounting } from "../../../tools/long_task_formal_total_cost_accounting.mjs";
import { validateFormalAccountingPolicy } from "../../../tools/long_task_formal_total_cost_accounting_policy.mjs";
import { formalEvidenceKey } from "../../../tools/long_task_formal_total_cost_events.mjs";
import {
  materializeFormalPrecollectionInputs,
  readFormalPrecollectionPlan,
  validateFormalPrecollectionIdentity,
} from "../../../tools/long_task_formal_total_cost_precollection.mjs";
import { validateFormalPriceSources } from "../../../tools/long_task_formal_total_cost_prices.mjs";
import { parseJson } from "../../../tools/long_task_formal_total_cost_shared.mjs";
import { digest, toBytes, writeArtifact } from "./long-task-level4-test-utils.mjs";

const pairIds = ["pair-01", "pair-02", "pair-03", "pair-04", "pair-05"];

export function deriveFixtureAccounting(
  policy,
  { costDeltas = {}, benefitDeltas = [200, 200, 200, 200, 200] } = {},
) {
  const byKey = new Map();
  for (const stratum of policy.lifecycle_population.strata) {
    const pairs = stratum.pair_count === 1 ? ["once"] : pairIds;
    for (const category of stratum.categories)
      for (const pairId of pairs) {
        const delta = costDeltas[category] ?? 1;
        put(byKey, "cost", category, null, pairId, "b", 10);
        put(byKey, "cost", category, null, pairId, "c", 10 + delta);
      }
  }
  for (const [index, pairId] of pairIds.entries()) {
    put(
      byKey,
      "purpose_benefit",
      null,
      "fixed-controlled-incident",
      pairId,
      "b",
      benefitDeltas[index],
    );
    put(
      byKey,
      "purpose_benefit",
      null,
      "fixed-controlled-incident",
      pairId,
      "c",
      0,
    );
  }
  return deriveFormalTotalCostAccounting(byKey, policy);
}

export async function assertPrecollectionMaterialization(fixture) {
  const root = await realpath(
    await mkdtemp(path.join(os.tmpdir(), "ty-precollection-copy-")),
  );
  try {
    await materializeFormalPrecollectionInputs({
      runSetRoot: root,
      precollection: fixture.precollection,
    });
    for (const entry of fixture.precollection.identity.entries) {
      const bytes = await readFile(
        path.join(
          root,
          "inputs",
          "formal-evidence-precollection",
          ...entry.path.split("/"),
        ),
      );
      assert.equal(bytes.length, entry.bytes);
      assert.equal(digest(bytes), entry.sha256);
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

export function assertPrecollectionBudgetFuses(fixture) {
  const limits = fixture.accountingPolicy.source_bundle_limits;
  const base = structuredClone(fixture.precollection.identity);
  const count = structuredClone(base);
  count.entries = Array.from({ length: limits.maximum_files + 1 }, (_, index) => ({
    ...base.entries[0],
    path: `overflow/${String(index).padStart(3, "0")}.bin`,
  }));
  assert.throws(
    () => validateFormalPrecollectionIdentity(count, limits),
    /formal_precollection_identity/u,
  );
  const perFile = structuredClone(base);
  perFile.entries[0].bytes = limits.maximum_bytes_per_file + 1;
  assert.throws(
    () => validateFormalPrecollectionIdentity(perFile, limits),
    /formal_precollection_entry_bytes/u,
  );
  const total = structuredClone(base);
  for (const entry of total.entries)
    entry.bytes = limits.maximum_bytes_per_file;
  assert.throws(
    () => validateFormalPrecollectionIdentity(total, limits),
    /formal_precollection_total_bytes/u,
  );
}

export function assertStrictJsonFuses() {
  assert.throws(
    () => parseJson(Buffer.from('{"a":1,"a":2}'), "fixture-json"),
    /fixture-json:duplicate_key/u,
  );
  assert.throws(
    () => parseJson(Buffer.from([0xff]), "fixture-json"),
    /fixture-json:utf8/u,
  );
  assert.throws(
    () =>
      parseJson(
        Buffer.from(`${"[".repeat(66)}0${"]".repeat(66)}`),
        "fixture-json",
      ),
    /fixture-json:depth/u,
  );
}

export function validateFixturePriceSource(fixture, options = {}) {
  const bundle = cloneBundle(fixture.precollection);
  const source = bundle.files.get("prices/official-price-source.json");
  const document = bundle.files.get("prices/official-price-document.json");
  const sourceRecord = JSON.parse(source.bytes.toString("utf8"));
  if (options.frozenAt) sourceRecord.frozen_at = options.frozenAt;
  source.bytes = toBytes(sourceRecord);
  if (options.sourceKind === "actual_invoice") {
    const documentRecord = JSON.parse(document.bytes.toString("utf8"));
    documentRecord.source_kind = "actual_invoice";
    documentRecord.rates = documentRecord.rates.map((rate) => ({
      key: rate.key,
      unit: rate.unit,
      basis: "invoice_line",
      invoice_amount_cny: rate.cny_per_unit * 1_000_000,
      invoice_quantity: 1_000_000,
    }));
    document.bytes = toBytes(documentRecord);
  }
  return validateFormalPriceSources({
    bundle,
    window: {
      started: Date.parse("2026-08-16T01:00:00.000Z"),
      completed: Date.parse("2026-08-16T02:00:00.000Z"),
    },
    accountingPolicy: fixture.accountingPolicy,
    precollectionFrozenAt: Date.parse(fixture.precollection.identity.frozen_at),
  });
}

export async function assertPrecollectionNoFollow(fixture) {
  const root = await realpath(
    await mkdtemp(path.join(os.tmpdir(), "ty-precollection-link-")),
  );
  try {
    const sourceRoot = path.join(root, "sources");
    for (const [relative, source] of fixture.precollection.files)
      await writeArtifact(sourceRoot, relative, source.bytes);
    const planPath = path.join(root, "precollection-plan.json");
    const identity = structuredClone(fixture.precollection.identity);
    identity.frozen_at = "2020-01-01T00:00:00.000Z";
    identity.identity_sha256 = sha256(
      canonical({ frozen_at: identity.frozen_at, entries: identity.entries }),
    );
    await writeFile(planPath, toBytes(identity));
    const victim = fixture.precollection.identity.entries[0].path;
    const target = path.join(sourceRoot, ...victim.split("/"));
    const outside = path.join(root, "outside.bin");
    await writeFile(outside, await readFile(target));
    await rm(target);
    try {
      await symlink(outside, target, "file");
    } catch (error) {
      if (!["EPERM", "EACCES"].includes(error?.code)) throw error;
      await link(outside, target);
    }
    await assert.rejects(
      () =>
        readFormalPrecollectionPlan({
          planPath,
          limits: fixture.accountingPolicy.source_bundle_limits,
        }),
      /formal_evidence_source_(?:link|hardlink)/u,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

export function assertAccountingPolicyValid(policy) {
  return validateFormalAccountingPolicy(policy);
}

function put(byKey, kind, category, scenarioId, pairId, variantId, value) {
  byKey.set(
    formalEvidenceKey({ kind, category, scenarioId, pairId, variantId }),
    { value },
  );
}

function cloneBundle(precollection) {
  return {
    identity: structuredClone(precollection.identity),
    files: new Map(
      [...precollection.files].map(([key, value]) => [
        key,
        { entry: structuredClone(value.entry), bytes: Buffer.from(value.bytes) },
      ]),
    ),
  };
}
