import { REAL_PROCESS_SCHEMAS } from "./long_task_real_process_roi_policy.mjs";
import { assert } from "./long_task_real_process_roi_scoring.mjs";
import {
  assertExactKeys,
  assertTimestamp,
  meterUnits,
  parseJson,
} from "./long_task_formal_total_cost_shared.mjs";

const {
  FORMAL_TOTAL_COST_PRICE_DOCUMENT_SCHEMA,
  FORMAL_TOTAL_COST_PRICE_SOURCE_SCHEMA,
} = REAL_PROCESS_SCHEMAS;

export function validateFormalPriceSources({
  bundle,
  window,
  accountingPolicy,
  precollectionFrozenAt = null,
}) {
  const rates = new Map();
  const usedPriceDocuments = new Set();
  for (const [sourcePath, source] of bundle.files) {
    if (source.entry.role !== "price_source") continue;
    const record = parseJson(source.bytes, `price_source_json:${sourcePath}`);
    validatePriceSourceRecord({
      record,
      sourcePath,
      bundle,
      window,
      usedPriceDocuments,
      precollectionFrozenAt,
    });
    const document = readPriceDocument({
      source: bundle.files.get(record.source_document_ref),
      sourcePath: record.source_document_ref,
      frozenAt: record.frozen_at,
      accountingPolicy,
    });
    for (const rate of document.rates) {
      const normalized = validatePriceRate(
        rate,
        document.source_kind,
        sourcePath,
        accountingPolicy,
      );
      assert(
        accountingPolicy.external_price_sources.required_meters.includes(
          normalized.key,
        ),
        `price_source_rate_unexpected:${normalized.key}`,
      );
      assert(
        !rates.has(normalized.key),
        `price_source_rate_duplicate:${normalized.key}`,
      );
      rates.set(normalized.key, normalized);
    }
  }
  for (const [sourcePath, source] of bundle.files)
    if (source.entry.role === "price_document")
      assert(
        usedPriceDocuments.has(sourcePath),
        `price_source_document_unused:${sourcePath}`,
      );
  return { rates };
}

function validatePriceSourceRecord({
  record,
  sourcePath,
  bundle,
  window,
  usedPriceDocuments,
  precollectionFrozenAt,
}) {
  assertExactKeys(
    record,
    [
      "currency",
      "frozen_at",
      "schema_version",
      "source_document_ref",
    ],
    `price_source_fields:${sourcePath}`,
  );
  assert(
    record.schema_version === FORMAL_TOTAL_COST_PRICE_SOURCE_SCHEMA &&
      record.currency === "CNY" &&
      bundle.files.get(record.source_document_ref)?.entry.role ===
        "price_document" &&
      !usedPriceDocuments.has(record.source_document_ref) &&
      assertTimestamp(
        record.frozen_at,
        `price_source_frozen_at:${sourcePath}`,
      ) <= window.started &&
      (precollectionFrozenAt === null ||
        assertTimestamp(
          record.frozen_at,
          `price_source_frozen_at:${sourcePath}`,
        ) <= precollectionFrozenAt),
    `price_source:${sourcePath}`,
  );
  usedPriceDocuments.add(record.source_document_ref);
}

function readPriceDocument({
  source,
  sourcePath,
  frozenAt,
  accountingPolicy,
}) {
  const document = parseJson(source.bytes, `price_document_json:${sourcePath}`);
  assertExactKeys(
    document,
    [
      "currency",
      "published_at",
      "publisher",
      "rates",
      "schema_version",
      "source_kind",
      "source_locator",
    ],
    `price_document_fields:${sourcePath}`,
  );
  assert(
    document.schema_version === FORMAL_TOTAL_COST_PRICE_DOCUMENT_SCHEMA &&
      accountingPolicy.external_price_sources.allowed_source_kinds.includes(
        document.source_kind,
      ) &&
      document.currency === "CNY" &&
      typeof document.publisher === "string" &&
      document.publisher.length > 0 &&
      typeof document.source_locator === "string" &&
      document.source_locator.length > 0 &&
      assertTimestamp(
        document.published_at,
        `price_document_published_at:${sourcePath}`,
      ) <= assertTimestamp(frozenAt, `price_source_frozen_at:${sourcePath}`) &&
      Array.isArray(document.rates) &&
      document.rates.length > 0,
    `price_document:${sourcePath}`,
  );
  return document;
}

function validatePriceRate(rate, sourceKind, sourcePath, accountingPolicy) {
  assert(
    rate && typeof rate === "object" && typeof rate.key === "string",
    `price_source_rate:${sourcePath}`,
  );
  assert(
    rate.unit === meterUnits[rate.key],
    `price_source_rate_unit:${rate.key}`,
  );
  if (sourceKind === "official_price")
    return validateOfficialRate(rate, sourcePath, accountingPolicy);
  return validateInvoiceRate(rate, sourcePath, accountingPolicy);
}

function validateOfficialRate(rate, sourcePath, accountingPolicy) {
  assertExactKeys(
    rate,
    ["basis", "cny_per_unit", "key", "unit"],
    `price_source_official_rate_fields:${rate.key}`,
  );
  assert(
    rate.basis === "official_rate" &&
      Number.isFinite(rate.cny_per_unit) &&
      rate.cny_per_unit >= 0 &&
      rate.cny_per_unit <= Number.MAX_SAFE_INTEGER,
    `price_source_official_rate:${rate.key}`,
  );
  return {
    key: rate.key,
    unit: rate.unit,
    basis: rate.basis,
    ncu_per_unit:
      rate.cny_per_unit * accountingPolicy.normalized_unit.ncu_per_cny,
    source_path: sourcePath,
  };
}

function validateInvoiceRate(rate, sourcePath, accountingPolicy) {
  assertExactKeys(
    rate,
    [
      "basis",
      "invoice_amount_cny",
      "invoice_quantity",
      "key",
      "unit",
    ],
    `price_source_invoice_rate_fields:${rate.key}`,
  );
  assert(
    rate.basis === "invoice_line" &&
      Number.isFinite(rate.invoice_quantity) &&
      rate.invoice_quantity > 0 &&
      rate.invoice_quantity <= Number.MAX_SAFE_INTEGER &&
      Number.isFinite(rate.invoice_amount_cny) &&
      rate.invoice_amount_cny >= 0 &&
      rate.invoice_amount_cny <= Number.MAX_SAFE_INTEGER,
    `price_source_invoice_rate:${rate.key}`,
  );
  return {
    key: rate.key,
    unit: rate.unit,
    basis: rate.basis,
    ncu_per_unit:
      (rate.invoice_amount_cny *
        accountingPolicy.normalized_unit.ncu_per_cny) /
      rate.invoice_quantity,
    source_path: sourcePath,
  };
}
