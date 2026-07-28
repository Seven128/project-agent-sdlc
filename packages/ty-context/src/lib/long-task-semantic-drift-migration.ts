type Row = Record<string, unknown>;

export function semanticDriftMigrationFields(value: unknown): string[] {
  const root = row(value);
  if (!root || root.schema_version !== "long-task-delivery-v2") return [];
  const missing: string[] = [];
  required(root, "$", ["stages"], missing);
  const task = row(root.task);
  if (task) {
    required(
      task,
      "task",
      ["target_profile", "execution_targets", "context_snapshot_mode"],
      missing,
    );
    if (
      Object.hasOwn(task, "context_snapshot_mode") &&
      task.context_snapshot_mode !== "full"
    )
      missing.push("task.context_snapshot_mode=full");
    for (const [index, target] of rows(task.execution_targets).entries())
      required(
        target,
        `task.execution_targets[${index}]`,
        ["capabilities"],
        missing,
      );
    const profile = row(task.target_profile);
    if (profile)
      required(
        profile,
        "task.target_profile",
        ["required_target_refs"],
        missing,
      );
  }
  for (const [index, outcome] of rows(root.outcomes).entries())
    collectOutcome(outcome, `outcomes[${index}]`, missing);
  const global = row(root.global);
  collectApplicability(global?.applicability, "global.applicability", missing);
  const globalAcceptance = row(global?.acceptance);
  collectChecks(globalAcceptance?.checks, "global.acceptance.checks", missing);
  for (const [index, confirmation] of rows(
    globalAcceptance?.external_confirmations,
  ).entries())
    required(
      confirmation,
      `global.acceptance.external_confirmations[${index}]`,
      ["kind", "impact_claims", "blocks_target"],
      missing,
    );
  return [...new Set(missing)].sort();
}

export function semanticDriftOutcomeMigrationFields(
  value: unknown,
  label: string,
): string[] {
  const missing: string[] = [];
  const outcome = row(value);
  if (outcome) collectOutcome(outcome, label, missing);
  return [...new Set(missing)].sort();
}

export function assertNoSemanticDriftMigration(fields: string[]): void {
  if (!fields.length) return;
  const detail = fields.slice(0, 24).join(",");
  const suffix = fields.length > 24 ? `,+${fields.length - 24}-more` : "";
  throw new Error(
    `long_task_delivery_v2_semantic_drift_migration_required:${detail}${suffix}`,
  );
}

function collectOutcome(outcome: Row, label: string, missing: string[]): void {
  required(outcome, label, ["stage", "applicability"], missing);
  collectApplicability(
    outcome.applicability,
    `${label}.applicability`,
    missing,
  );
  const product = row(outcome.product);
  if (product) {
    required(
      product,
      `${label}.product`,
      ["success_path_required", "degradation_path_required"],
      missing,
    );
    if (
      Array.isArray(product.controls) &&
      product.controls.length > 0 &&
      !Object.hasOwn(product, "surface_bindings")
    )
      missing.push(`${label}.product.surface_bindings`);
    const relationClosure = row(product.control_relation_closure);
    if (relationClosure && relationClosure.state !== "unresolved")
      required(
        relationClosure,
        `${label}.product.control_relation_closure`,
        ["applicability_refs"],
        missing,
      );
  }
  const acceptance = row(outcome.acceptance);
  collectChecks(acceptance?.checks, `${label}.acceptance.checks`, missing);
  const population = row(acceptance?.population);
  if (population) {
    required(
      population,
      `${label}.acceptance.population`,
      ["universe_binding_key"],
      missing,
    );
    const observations = row(population.observations);
    if (observations)
      required(
        observations,
        `${label}.acceptance.population.observations`,
        ["universe_ids"],
        missing,
      );
  }
  for (const [bindingIndex, binding] of rows(
    product?.surface_bindings,
  ).entries()) {
    for (const [blockerIndex, blocker] of rows(
      binding.acceptance_blockers,
    ).entries())
      required(
        blocker,
        `${label}.product.surface_bindings[${bindingIndex}].acceptance_blockers[${blockerIndex}]`,
        ["required_capabilities"],
        missing,
      );
    for (const [targetIndex, target] of rows(binding.design_targets).entries())
      for (const [methodIndex, method] of rows(
        target.verification_method_bindings,
      ).entries()) {
        required(
          method,
          `${label}.product.surface_bindings[${bindingIndex}].design_targets[${targetIndex}].verification_method_bindings[${methodIndex}]`,
          ["evidence_artifacts"],
          missing,
        );
        for (const [artifactIndex, artifact] of rows(
          method.evidence_artifacts,
        ).entries())
          required(
            artifact,
            `${label}.product.surface_bindings[${bindingIndex}].design_targets[${targetIndex}].verification_method_bindings[${methodIndex}].evidence_artifacts[${artifactIndex}]`,
            ["observation_path", "fact_refs"],
            missing,
          );
      }
  }
}

function collectApplicability(
  value: unknown,
  label: string,
  missing: string[],
): void {
  for (const [index, profile] of rows(value).entries())
    required(profile, `${label}[${index}]`, ["dimensions"], missing);
}

function collectChecks(value: unknown, label: string, missing: string[]): void {
  for (const [index, check] of rows(value).entries()) {
    const checkLabel = `${label}[${index}]`;
    required(
      check,
      checkLabel,
      ["journey_roles", "execution_target", "scenario"],
      missing,
    );
    for (const polarity of ["positive_assertions", "negative_assertions"])
      for (const [assertionIndex, assertion] of rows(check[polarity]).entries())
        required(
          assertion,
          `${checkLabel}.${polarity}[${assertionIndex}]`,
          ["evidence_capabilities"],
          missing,
        );
  }
}

function required(
  value: Row,
  label: string,
  keys: string[],
  missing: string[],
): void {
  for (const key of keys)
    if (!Object.hasOwn(value, key)) missing.push(`${label}.${key}`);
}

function rows(value: unknown): Row[] {
  return Array.isArray(value)
    ? value.map(row).filter((item): item is Row => item !== null)
    : [];
}

function row(value: unknown): Row | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Row)
    : null;
}
