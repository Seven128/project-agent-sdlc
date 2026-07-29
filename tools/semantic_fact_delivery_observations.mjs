export function collectSemanticObservations(options) {
  const {
    policy,
    files,
    requiredFiles,
    semanticRows,
    groupFiles,
    buildCode,
    focusedCode,
  } = options;
  const sourceKeys = sourceItemKeys(
    files.get("docs/non-ui-semantic-fact-completeness.md") ?? "",
  );
  const mechanismReady =
    policy.includes("complete_non_ui_semantic_fact_delivery") &&
    buildCode === 0 &&
    requiredFiles.every((file) => hasText(files, file));
  return {
    ...collectCatalogObservations({
      semanticRows,
      groupFiles,
      files,
      sourceKeys,
      mechanismReady,
    }),
    ...collectShortcutObservations(policy, sourceKeys),
    ...collectRiskObservations({
      policy,
      files,
      sourceKeys,
      mechanismReady,
      focusedCode,
    }),
  };
}

function collectCatalogObservations(options) {
  const { semanticRows, groupFiles, files, sourceKeys, mechanismReady } =
    options;
  return Object.fromEntries(
    semanticRows.map(([observation, group, authorityRef]) => [
      observation,
      mechanismReady &&
        groupFiles[group].every((file) => hasText(files, file)) &&
        sourceKeys.has(authorityRef),
    ]),
  );
}

function collectShortcutObservations(policy, sourceKeys) {
  const shortcutUsed = policy.includes("SEMANTIC_FACT_SHORTCUT_USED");
  const inventoryCompletesDelivery = policy.includes(
    "SEMANTIC_INVENTORY_COMPLETES_DELIVERY",
  );
  return {
    shortcut_used: shortcutUsed,
    inventory_completes_delivery: inventoryCompletesDelivery,
    control_relations_applicable:
      policy.includes("UI_CONTROL_RELATIONS_APPLY") &&
      !policy.includes("NO_UI_CONTROL_RELATIONS"),
    no_semantic_fact_shortcuts:
      sourceKeys.has("no-semantic-fact-shortcuts") &&
      policy.includes("NO_SEMANTIC_FACT_SHORTCUTS") &&
      !shortcutUsed,
    semantic_inventory_is_not_completion:
      sourceKeys.has("semantic-inventory-is-not-completion") &&
      policy.includes("SEMANTIC_INVENTORY_IS_NOT_COMPLETION") &&
      !inventoryCompletesDelivery,
  };
}

function collectRiskObservations(options) {
  const { policy, files, sourceKeys, mechanismReady, focusedCode } = options;
  return {
    antidegradation_and_parity_ac:
      mechanismReady &&
      sourceKeys.has("antidegradation-and-parity-ac") &&
      focusedCode === 0,
    semantic_public_schema_risk: observesPublicSchemaRisk(
      files,
      sourceKeys,
      mechanismReady,
    ),
    semantic_false_completion_risk: observesFalseCompletionRisk(
      policy,
      files,
      sourceKeys,
      mechanismReady,
    ),
    semantic_oracle_observability_risk: observesOracleRisk(
      files,
      sourceKeys,
      mechanismReady,
    ),
  };
}

function observesPublicSchemaRisk(files, sourceKeys, mechanismReady) {
  return (
    mechanismReady &&
    sourceKeys.has("semantic-public-schema-risk") &&
    hasContent(
      files,
      "packages/ty-context/src/schemas/long-task-delivery-v2/long-task-delivery-v2.schema.json",
      "semantic_fact_manifest",
    ) &&
    hasContent(
      files,
      "packages/ty-context/src/lib/long-task-semantic-drift-migration.ts",
      "semantic_fact_bindings",
    )
  );
}

function observesFalseCompletionRisk(
  policy,
  files,
  sourceKeys,
  mechanismReady,
) {
  return (
    mechanismReady &&
    sourceKeys.has("semantic-false-completion-risk") &&
    policy.includes("blockers_present") &&
    hasContent(
      files,
      "packages/ty-context/src/lib/semantic-fact-policy-units.ts",
      "family_unresolved",
    )
  );
}

function observesOracleRisk(files, sourceKeys, mechanismReady) {
  const evidenceFile =
    "packages/ty-context/src/lib/long-task-semantic-fact-evidence.ts";
  return (
    mechanismReady &&
    sourceKeys.has("semantic-oracle-observability-risk") &&
    hasContent(
      files,
      evidenceFile,
      "semantic_fact_oracle_environment_mismatch",
    ) &&
    hasContent(files, evidenceFile, "semantic_fact_observer_set_mismatch")
  );
}

function sourceItemKeys(source) {
  return new Set(
    [...source.matchAll(/ty-source-item:start key=([a-z0-9-]+)/gu)].map(
      (match) => match[1],
    ),
  );
}

function hasText(files, file) {
  return (files.get(file) ?? "").trim().length > 0;
}

function hasContent(files, file, content) {
  return (files.get(file) ?? "").includes(content);
}
