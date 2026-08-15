import {
  validateFormalAccountingPolicy,
  validateFormalStateRetentionSource,
} from "./long_task_formal_total_cost_accounting_policy.mjs";
import { validateFormalCollectorCatalog } from "./long_task_formal_total_cost_collectors.mjs";
import { validateControlledIncidentBundle } from "./long_task_formal_total_cost_incident.mjs";
import { validateFormalPrecollectionBinding } from "./long_task_formal_total_cost_precollection.mjs";
import { validateFormalPriceSources } from "./long_task_formal_total_cost_prices.mjs";
import { validateFormalScenarioCatalog } from "./long_task_formal_total_cost_scenarios.mjs";
import { validateFormalRedactionRules } from "./long_task_formal_total_cost_source_bundle.mjs";

const missingPrecollectionPending = Object.freeze([
  "formal_evidence_precollection",
  "controlled_incident",
  "provider_compute_storage_prices",
  "state_retention",
]);

export function assessFormalCollectionReadiness({
  precollection,
  accountingPolicy,
  validationWindow,
}) {
  validateFormalAccountingPolicy(accountingPolicy);
  if (precollection === null)
    return readiness({
      blockers: ["formal_collection_precollection_required"],
      externalPending: missingPrecollectionPending,
    });

  const precollectionFrozenAt = Date.parse(precollection.identity.frozen_at);
  validateFormalPrecollectionBinding({
    identity: precollection.identity,
    bundle: precollection,
    window: validationWindow,
    limits: accountingPolicy.source_bundle_limits,
  });
  validateFormalRedactionRules(
    precollection,
    validationWindow,
    precollectionFrozenAt,
  );
  const priceResult = validateFormalPriceSources({
    bundle: precollection,
    window: validationWindow,
    accountingPolicy,
    precollectionFrozenAt,
  });
  const scenarios = validateFormalScenarioCatalog({
    bundle: precollection,
    window: validationWindow,
    accountingPolicy,
    precollectionFrozenAt,
  });
  const collectors = validateFormalCollectorCatalog({
    bundle: precollection,
    window: validationWindow,
    precollectionFrozenAt,
    scenarios,
  });
  const incident = validateControlledIncidentBundle({
    bundle: precollection,
    scenarios,
    precollectionFrozenAt,
  });

  const blockers = [];
  const externalPending = [];
  if (!incident.promotion_eligible) {
    blockers.push("formal_collection_controlled_incident_external_pending");
    externalPending.push("controlled_incident");
  }
  const missingPriceMeters =
    accountingPolicy.external_price_sources.required_meters.filter(
      (meter) => !priceResult.rates.has(meter),
    );
  if (missingPriceMeters.length > 0) {
    blockers.push("formal_collection_price_source_incomplete");
    externalPending.push("provider_compute_storage_prices");
  }

  let stateRetention = null;
  if (accountingPolicy.state_storage_retention.status === "external_pending") {
    blockers.push("formal_collection_state_retention_external_pending");
    externalPending.push("state_retention");
  } else
    stateRetention = validateFormalStateRetentionSource({
      accountingPolicy,
      bundle: precollection,
    });

  return readiness({
    blockers,
    externalPending,
    missingPriceMeters,
    sources: { scenarios, collectors, stateRetention },
  });
}

export function requireFormalCollectionReady(options) {
  const result = assessFormalCollectionReadiness(options);
  if (!result.executable) throw new Error(result.blockers[0]);
  return result.sources;
}

function readiness({
  blockers,
  externalPending,
  missingPriceMeters = [],
  sources = null,
}) {
  return Object.freeze({
    executable: blockers.length === 0,
    blockers: Object.freeze([...blockers]),
    external_pending: Object.freeze([...externalPending]),
    missing_price_meters: Object.freeze([...missingPriceMeters]),
    sources: sources === null ? null : Object.freeze(sources),
  });
}
