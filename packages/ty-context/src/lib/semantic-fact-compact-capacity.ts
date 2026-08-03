import { semanticFail } from "./semantic-fact-shape-primitives.js";

export const SEMANTIC_COMPACT_CAPACITY_FIELDS = [
  "inputs",
  "catalog_rows",
  "selector_members",
  "structure_families",
  "structure_references",
  "structure_arguments",
  "facts",
  "obligations",
  "census",
  "canonical_bytes",
] as const;

type CapacityField = (typeof SEMANTIC_COMPACT_CAPACITY_FIELDS)[number];
export type SemanticCompactCapacityCounts = Record<CapacityField, number>;

const PACKAGE_MAXIMUM: SemanticCompactCapacityCounts = {
  inputs: 100_000,
  catalog_rows: 2_000_000,
  selector_members: 5_000_000,
  structure_families: 1_000_000,
  structure_references: 10_000_000,
  structure_arguments: 50_000_000,
  facts: 1_000_000,
  obligations: 2_000_000,
  census: 10_000_000,
  canonical_bytes: 256 * 1024 * 1024,
};

export function validateSemanticCompactCapacity(
  capacity: {
    measured: SemanticCompactCapacityCounts;
    maximum: SemanticCompactCapacityCounts;
  },
  measured: SemanticCompactCapacityCounts,
  label: string,
): void {
  for (const field of SEMANTIC_COMPACT_CAPACITY_FIELDS) {
    if (capacity.maximum[field] > PACKAGE_MAXIMUM[field])
      semanticFail(
        `${label}.capacity.maximum.${field}`,
        `exceeds package maximum ${PACKAGE_MAXIMUM[field]}`,
      );
    if (capacity.measured[field] !== measured[field])
      semanticFail(
        `${label}.capacity.measured.${field}`,
        `measured mismatch: ${capacity.measured[field]}:${measured[field]}`,
      );
    if (measured[field] > capacity.maximum[field])
      semanticFail(
        `${label}.capacity.maximum.${field}`,
        `capacity exceeded: ${measured[field]}:${capacity.maximum[field]}`,
      );
  }
}

export function validateSemanticCompactDeclaredMaximum(
  maximum: SemanticCompactCapacityCounts,
  label: string,
): void {
  for (const field of SEMANTIC_COMPACT_CAPACITY_FIELDS)
    if (maximum[field] > PACKAGE_MAXIMUM[field])
      semanticFail(
        `${label}.capacity.maximum.${field}`,
        `exceeds package maximum ${PACKAGE_MAXIMUM[field]}`,
      );
}
