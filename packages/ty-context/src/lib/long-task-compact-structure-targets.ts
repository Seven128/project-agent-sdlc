import type { CompactSharedStructureTarget } from "./compact-shared-structures.js";

const BASE_STRUCTURE_BOUNDARY_BY_FIELD: Readonly<Record<string, string>> = {
  path_globs: "contract.path-set",
  expected_change_paths: "contract.path-set",
  input_paths: "contract.check.input-paths",
  verification_inputs: "contract.check.verification-inputs",
  scenario: "contract.check.scenario",
  expected_output_paths: "contract.check.output-paths",
  mutation: "contract.counterfactual.mutation",
  execution_target: "contract.check.execution-target",
  artifact_globs: "contract.check.artifact-globs",
  journey_roles: "contract.check.journey-roles",
  carrier_paths: "contract.binding.carrier-paths",
  preserved_assertions: "contract.counterfactual.preserved-assertions",
  expected_assertion_failures:
    "contract.counterfactual.expected-assertion-failures",
};

export function longTaskCompactSharedStructureTargets(
  root: Record<string, unknown>,
  carrier: Record<string, unknown>,
): CompactSharedStructureTarget[] {
  const targets: CompactSharedStructureTarget[] = [];
  for (const [field, boundary] of [
    ["claim_catalog", "contract.claim"],
    ["claim_projections", "contract.claim-projection"],
    ["obligations", "contract.obligation"],
    ["assertion_projections", "contract.assertion"],
  ] as const)
    addCompactTableTargets(targets, carrier[field], boundary);
  if (Array.isArray(carrier.fact_sets))
    for (const factSet of carrier.fact_sets)
      addCompactTableTargets(targets, factSet, "contract.fact");
  if (Array.isArray(carrier.proof_templates))
    for (const template of carrier.proof_templates) {
      const row = plainRecord(template);
      if (row && Object.hasOwn(row, "binding"))
        addTarget(targets, row, "binding", "contract.proof.policy");
    }
  for (const [key, value] of Object.entries(root)) {
    if (key === "compact_semantic_carrier") continue;
    collectBaseTargets(targets, value);
  }
  return targets;
}

function collectBaseTargets(
  targets: CompactSharedStructureTarget[],
  value: unknown,
): void {
  if (Array.isArray(value)) {
    value.forEach((item) => collectBaseTargets(targets, item));
    return;
  }
  const row = plainRecord(value);
  if (!row) return;
  for (const [key, child] of Object.entries(row)) {
    const boundary = BASE_STRUCTURE_BOUNDARY_BY_FIELD[key];
    if (boundary && child && typeof child === "object") {
      addTarget(targets, row, key, boundary);
      continue;
    }
    collectBaseTargets(targets, child);
  }
}

function addCompactTableTargets(
  targets: CompactSharedStructureTarget[],
  value: unknown,
  boundary: string,
): void {
  const table = plainRecord(value);
  if (!table || !Array.isArray(table.columns) || !Array.isArray(table.rows))
    return;
  const columns = table.columns.map(String);
  const defaults = plainRecord(table.defaults);
  if (defaults)
    for (const key of Object.keys(defaults))
      if (defaults[key] && typeof defaults[key] === "object")
        addTarget(targets, defaults, key, `${boundary}.default.${key}`);
  for (const rowValue of table.rows) {
    if (!Array.isArray(rowValue) || rowValue.length !== columns.length)
      continue;
    for (const [index, column] of columns.entries())
      if (rowValue[index] && typeof rowValue[index] === "object")
        addTarget(targets, rowValue, index, `${boundary}.${column}`);
  }
}

function addTarget(
  targets: CompactSharedStructureTarget[],
  parent: Record<string, unknown> | unknown[],
  key: string | number,
  boundary: string,
): void {
  const indexed = parent as Record<string | number, unknown>;
  targets.push({
    boundary,
    read: () => indexed[key],
    write: (value) => {
      indexed[key] = value;
    },
  });
}

function plainRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}
