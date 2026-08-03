const STABLE_REF = /^[a-z0-9][a-z0-9._:-]*$/u;
const SHA256 = /^[a-f0-9]{64}$/u;
import type { CompactSharedStructureTarget } from "./compact-shared-structures.js";

export const LONG_TASK_COMPACT_CAPACITY_FIELDS = [
  "claims",
  "claim_projections",
  "selector_members",
  "structure_families",
  "structure_references",
  "structure_arguments",
  "facts",
  "obligations",
  "assertions",
  "canonical_bytes",
] as const;

type CapacityField = (typeof LONG_TASK_COMPACT_CAPACITY_FIELDS)[number];
export type LongTaskCompactCapacityCounts = Record<CapacityField, number>;

const PACKAGE_MAXIMUM: LongTaskCompactCapacityCounts = {
  claims: 1_000_000,
  claim_projections: 2_000_000,
  selector_members: 5_000_000,
  structure_families: 1_000_000,
  structure_references: 10_000_000,
  structure_arguments: 50_000_000,
  facts: 1_000_000,
  obligations: 2_000_000,
  assertions: 5_000_000,
  canonical_bytes: 256 * 1024 * 1024,
};

export function compactRequiredOutcome(
  value: unknown,
  outcomes: Map<string, Record<string, unknown>>,
  label: string,
): Record<string, unknown> {
  const ref = compactStableRef(value, `${label}.outcome_ref`);
  const outcome = outcomes.get(ref);
  if (!outcome) compactFail(`${label}.outcome_ref`, `unknown outcome: ${ref}`);
  return outcome;
}

export function compactResolveSelectors(
  value: unknown,
  selectors: Map<string, string[]>,
  label: string,
): unknown {
  if (Array.isArray(value))
    return value.map((item, index) =>
      compactResolveSelectors(item, selectors, `${label}[${index}]`),
    );
  if (!value || typeof value !== "object") return value;
  const row = value as Record<string, unknown>;
  if (Object.keys(row).length === 1 && Object.hasOwn(row, "selector_ref")) {
    const ref = compactStableRef(row.selector_ref, `${label}.selector_ref`);
    const members = selectors.get(ref);
    if (!members)
      compactFail(`${label}.selector_ref`, `unknown selector: ${ref}`);
    return [...members];
  }
  if (Object.hasOwn(row, "selector_ref"))
    compactFail(label, "selector_ref must be the only key");
  return Object.fromEntries(
    Object.entries(row).map(([key, item]) => [
      key,
      compactResolveSelectors(item, selectors, `${label}.${key}`),
    ]),
  );
}

export function validateLongTaskCompactCapacity(
  capacity: {
    measured: LongTaskCompactCapacityCounts;
    maximum: LongTaskCompactCapacityCounts;
  },
  measured: LongTaskCompactCapacityCounts,
  label: string,
): void {
  for (const field of LONG_TASK_COMPACT_CAPACITY_FIELDS) {
    if (capacity.maximum[field] > PACKAGE_MAXIMUM[field])
      compactFail(
        `${label}.capacity.maximum.${field}`,
        `exceeds package maximum ${PACKAGE_MAXIMUM[field]}`,
      );
    if (capacity.measured[field] !== measured[field])
      compactFail(
        `${label}.capacity.measured.${field}`,
        `measured mismatch: ${capacity.measured[field]}:${measured[field]}`,
      );
    if (measured[field] > capacity.maximum[field])
      compactFail(
        `${label}.capacity.maximum.${field}`,
        `capacity exceeded: ${measured[field]}:${capacity.maximum[field]}`,
      );
  }
}

export function validateLongTaskCompactDeclaredMaximum(
  maximum: LongTaskCompactCapacityCounts,
  label: string,
): void {
  for (const field of LONG_TASK_COMPACT_CAPACITY_FIELDS)
    if (maximum[field] > PACKAGE_MAXIMUM[field])
      compactFail(
        `${label}.capacity.maximum.${field}`,
        `exceeds package maximum ${PACKAGE_MAXIMUM[field]}`,
      );
}

export function compactUniqueRows(
  rows: Record<string, unknown>[],
  field: string,
  label: string,
): void {
  const seen = new Set<string>();
  for (const [index, row] of rows.entries()) {
    const value = compactStableRef(
      row[field],
      `${label}.rows[${index}].${field}`,
    );
    if (seen.has(value)) compactFail(label, `duplicate ${field}: ${value}`);
    seen.add(value);
  }
}

export function compactStrictObject(
  value: unknown,
  label: string,
  fields: string[],
): Record<string, unknown> {
  const row = compactPlainObject(value, label);
  const allowed = new Set(fields);
  const unknown = Object.keys(row).filter((key) => !allowed.has(key));
  if (unknown.length) compactFail(label, `unknown keys: ${unknown.join(",")}`);
  const missing = fields.filter((field) => !Object.hasOwn(row, field));
  if (missing.length) compactFail(label, `missing keys: ${missing.join(",")}`);
  return row;
}

export function compactPlainObject(
  value: unknown,
  label: string,
): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    compactFail(label, "must be an object");
  return value as Record<string, unknown>;
}

export function compactArray(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value)) compactFail(label, "must be an array");
  return value;
}

export function compactStableRef(value: unknown, label: string): string {
  const result = compactNonemptyString(value, label);
  if (!STABLE_REF.test(result))
    compactFail(label, "must be a stable reference");
  return result;
}

export function compactStableRefs(value: unknown, label: string): string[] {
  return compactArray(value, label).map((item, index) =>
    compactStableRef(item, `${label}[${index}]`),
  );
}

export function compactSha256(value: unknown, label: string): string {
  const result = compactNonemptyString(value, label);
  if (!SHA256.test(result)) compactFail(label, "must be a lowercase SHA-256");
  return result;
}

export function compactNonemptyString(value: unknown, label: string): string {
  if (typeof value !== "string" || !value.trim())
    compactFail(label, "must be a non-empty string");
  return value;
}

export function compactInteger(value: unknown, label: string): number {
  if (!Number.isInteger(value) || Number(value) < 0)
    compactFail(label, "must be an integer >= 0");
  return Number(value);
}

export function compactLiteral<T extends string>(
  value: unknown,
  values: readonly T[],
  label: string,
): T {
  if (typeof value !== "string" || !values.includes(value as T))
    compactFail(label, `must be one of ${values.join(",")}`);
  return value as T;
}

export function compactFail(label: string, message: string): never {
  throw new Error(`long_task_compact_carrier_invalid:${label}:${message}`);
}

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
