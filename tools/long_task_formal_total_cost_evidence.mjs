import { REAL_PROCESS_SCHEMAS } from "./long_task_real_process_roi_policy.mjs";
import { assert, canonical, sha256 } from "./long_task_real_process_roi_scoring.mjs";
import { deriveFormalTotalCostAccounting } from "./long_task_formal_total_cost_accounting.mjs";
import { readFormalAccountingPolicy, validateFormalAccountingPolicy } from "./long_task_formal_total_cost_accounting_policy.mjs";
import { expectedFormalEvidenceKeys, validateFormalRawEvents } from "./long_task_formal_total_cost_events.mjs";
import { validateFormalPriceSources } from "./long_task_formal_total_cost_prices.mjs";
import { validateFormalPrecollectionBinding } from "./long_task_formal_total_cost_precollection.mjs";
import { validateFormalScenarioCatalog } from "./long_task_formal_total_cost_scenarios.mjs";
import {
  assertExactKeys,
  assertSameSet,
  assertTimestamp,
  gitShaPattern,
  parseJson,
  readRegularFileNoFollow,
  rejectProhibitedFields,
  shaPattern,
} from "./long_task_formal_total_cost_shared.mjs";
import {
  readFormalSourceBundle,
  validateFormalCollectorIdentity,
  validateFormalRedactionRules,
} from "./long_task_formal_total_cost_source_bundle.mjs";

const { FORMAL_TOTAL_COST_EVIDENCE_PACKET_SCHEMA } = REAL_PROCESS_SCHEMAS;

export { readFormalAccountingPolicy, validateFormalAccountingPolicy };

export async function evaluateFormalTotalCostEvidence({
  packetPath,
  accountingPolicy,
  accountingPolicyIdentity,
  runSetId,
  runs,
  setupByVariant,
  precollectionIdentity = null,
}) {
  validateFormalAccountingPolicy(accountingPolicy);
  const packetBytes = await readRegularFileNoFollow(
    packetPath,
    accountingPolicy.source_bundle_limits.maximum_bytes_per_file,
  );
  const packet = parseJson(packetBytes, "formal_evidence_packet_json");
  rejectProhibitedFields(packet, "formal_evidence_packet_prohibited_field");
  validatePacketShape(packet);
  assert(packet.run_set_id === runSetId, "formal_evidence_run_set_id");
  assert(
    canonical(packet.accounting_policy_identity) ===
      canonical(accountingPolicyIdentity),
    "formal_evidence_accounting_policy_identity",
  );
  const window = validateCollectionWindow(packet);
  validateCandidateBindings(packet.candidate_identities, setupByVariant);
  const runBindingById = validateRunBindings(
    packet.run_bindings,
    runs,
    setupByVariant,
  );
  assert(
    canonical(packet.retention_policy) === canonical(accountingPolicy.retention),
    "formal_evidence_retention_policy",
  );
  const bundle = await readFormalSourceBundle({
    packetPath,
    manifest: packet.source_bundle,
    limits: accountingPolicy.source_bundle_limits,
  });
  const precollection = validateFormalPrecollectionBinding({
    identity: precollectionIdentity,
    bundle,
    window,
    limits: accountingPolicy.source_bundle_limits,
  });
  const precollectionFrozenAt = precollectionIdentity
    ? assertTimestamp(
        precollectionIdentity.frozen_at,
        "formal_precollection_frozen_at",
      )
    : null;
  validateFormalCollectorIdentity(
    packet.collector_identity,
    bundle,
    window,
    precollectionFrozenAt,
  );
  const redactionRules = validateFormalRedactionRules(
    bundle,
    window,
    precollectionFrozenAt,
  );
  const priceResult = validateFormalPriceSources({
    bundle,
    window,
    accountingPolicy,
    precollectionFrozenAt,
  });
  const scenarios = validateFormalScenarioCatalog({
    bundle,
    window,
    accountingPolicy,
    precollectionFrozenAt,
  });
  const eventResult = validateFormalRawEvents({
    bundle,
    window,
    runSetId,
    runBindingById,
    accountingPolicy,
    redactionRules,
    priceRates: priceResult.rates,
    scenarios,
  });
  return formalEvidenceResult({
    packet,
    packetBytes,
    accountingPolicy,
    eventResult,
    priceRates: priceResult.rates,
    precollection,
    precollectionIdentity,
  });
}

function formalEvidenceResult(options) {
  const {
    packet,
    packetBytes,
    accountingPolicy,
    eventResult,
    priceRates,
    precollection,
    precollectionIdentity,
  } = options;
  const expectedKeys = expectedFormalEvidenceKeys(accountingPolicy);
  for (const key of eventResult.byKey.keys())
    assert(expectedKeys.has(key), `formal_evidence_event_unexpected:${key}`);
  const missingEventKeys = [...expectedKeys]
    .filter((key) => !eventResult.byKey.has(key))
    .sort();
  const requiredMeters = accountingPolicy.external_price_sources.required_meters;
  const missingPriceRateKeys = requiredMeters.filter(
    (key) => !priceRates.has(key),
  );
  const missingMeterKeys = requiredMeters.filter(
    (key) => !eventResult.usedMeters.has(key),
  );
  const blockers = [...precollection.blockers];
  if (missingEventKeys.length > 0)
    blockers.push("formal_evidence_event_set_incomplete");
  if (missingPriceRateKeys.length > 0)
    blockers.push("formal_price_source_incomplete");
  if (missingMeterKeys.length > 0)
    blockers.push("formal_metered_usage_incomplete");
  if (eventResult.missingAuthoringUsageKeys.length > 0)
    blockers.push("formal_authoring_usage_incomplete");
  if (eventResult.unpricedEventKeys.length > 0)
    blockers.push("formal_evidence_event_unpriced");
  const supportComplete = blockers.length === 0;
  return {
    admitted: true,
    packet_sha256: sha256(packetBytes),
    source_bundle_identity_sha256:
      packet.source_bundle.materialized_set_sha256,
    collector_identity_sha256: packet.collector_identity.identity_sha256,
    precollection_identity_sha256:
      precollectionIdentity?.identity_sha256 ?? null,
    precollection_bound: precollection.bound,
    event_count: eventResult.byKey.size,
    event_identity_set_sha256: sha256(
      canonical([...eventResult.eventIds].sort()),
    ),
    missing_event_keys: missingEventKeys,
    missing_price_rate_keys: missingPriceRateKeys,
    missing_meter_keys: missingMeterKeys,
    missing_authoring_usage_keys: eventResult.missingAuthoringUsageKeys,
    unpriced_event_keys: eventResult.unpricedEventKeys,
    support_complete: supportComplete,
    blockers,
    accounting: supportComplete
      ? deriveFormalTotalCostAccounting(eventResult.byKey, accountingPolicy)
      : null,
  };
}

function validatePacketShape(packet) {
  assertExactKeys(
    packet,
    [
      "accounting_policy_identity",
      "candidate_identities",
      "collection_window",
      "collector_identity",
      "created_at",
      "retention_policy",
      "run_bindings",
      "run_set_id",
      "schema_version",
      "source_bundle",
    ],
    "formal_evidence_packet_field_set",
  );
  assert(
    packet.schema_version === FORMAL_TOTAL_COST_EVIDENCE_PACKET_SCHEMA,
    "formal_evidence_packet_schema",
  );
  assert(
    typeof packet.run_set_id === "string" && packet.run_set_id.length > 0,
    "formal_evidence_packet_run_set",
  );
  assertTimestamp(packet.created_at, "formal_evidence_packet_created_at");
  assertExactKeys(
    packet.accounting_policy_identity,
    ["entries", "identity_sha256"],
    "formal_evidence_policy_identity_fields",
  );
}

function validateCollectionWindow(packet) {
  assertExactKeys(
    packet.collection_window,
    ["completed_at", "started_at"],
    "formal_evidence_collection_window_fields",
  );
  const started = assertTimestamp(
    packet.collection_window.started_at,
    "formal_evidence_collection_started_at",
  );
  const completed = assertTimestamp(
    packet.collection_window.completed_at,
    "formal_evidence_collection_completed_at",
  );
  const created = assertTimestamp(
    packet.created_at,
    "formal_evidence_packet_created_at",
  );
  assert(started <= completed && completed <= created, "formal_evidence_time_order");
  return { started, completed };
}

function validateCandidateBindings(candidateIdentities, setupByVariant) {
  assert(Array.isArray(candidateIdentities), "formal_evidence_candidates");
  assertSameSet(
    candidateIdentities.map((item) => item.variant_id),
    ["a", "b", "c"],
    "formal_evidence_candidate_set",
  );
  for (const item of candidateIdentities) {
    assertExactKeys(
      item,
      ["commit", "package_sha256", "tree", "variant_id"],
      `formal_evidence_candidate_fields:${item.variant_id}`,
    );
    const setup = setupByVariant.get(item.variant_id);
    assert(
      setup &&
        item.commit === setup.commit &&
        item.tree === setup.tree &&
        item.package_sha256 === setup.package_sha256 &&
        gitShaPattern.test(item.commit) &&
        gitShaPattern.test(item.tree) &&
        shaPattern.test(item.package_sha256),
      `formal_evidence_candidate_identity:${item.variant_id}`,
    );
  }
}

function validateRunBindings(runBindings, runs, setupByVariant) {
  assert(Array.isArray(runBindings), "formal_evidence_run_bindings");
  const expected = runs.map((run) => ({
    run_id: run.run_id,
    variant_id: run.variant_id,
    repeat: run.repeat,
    candidate_commit: run.candidate_identity.commit,
    candidate_tree: run.candidate_identity.tree,
    package_sha256: setupByVariant.get(run.variant_id).package_sha256,
  }));
  for (const item of runBindings)
    assertExactKeys(
      item,
      [
        "candidate_commit",
        "candidate_tree",
        "package_sha256",
        "repeat",
        "run_id",
        "variant_id",
      ],
      `formal_evidence_run_binding_fields:${item.run_id}`,
    );
  const sort = (values) =>
    [...values].sort((left, right) => left.run_id.localeCompare(right.run_id));
  const actual = sort(runBindings);
  assert(
    canonical(actual) === canonical(sort(expected)),
    "formal_evidence_run_binding_set",
  );
  return new Map(actual.map((item) => [item.run_id, item]));
}
