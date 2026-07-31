export type SymbolicDenotationScalar = string | number;

export type SymbolicDenotationAxisDomain =
  | {
      key: string;
      kind: "enum";
      values: string[];
    }
  | {
      key: string;
      kind: "bounded_number";
      minimum: number;
      maximum: number;
      integer: true;
    };

export type SymbolicDenotationPredicate =
  | {
      op: "eq";
      axis_ref: string;
      value: SymbolicDenotationScalar;
    }
  | {
      op: "in";
      axis_ref: string;
      values: SymbolicDenotationScalar[];
    }
  | {
      op: "range";
      axis_ref: string;
      minimum: number;
      maximum: number;
      minimum_inclusive: boolean;
      maximum_inclusive: boolean;
    }
  | {
      op: "all" | "any";
      predicates: SymbolicDenotationPredicate[];
    }
  | {
      op: "not";
      predicate: SymbolicDenotationPredicate;
    };

export interface SymbolicDenotationComplexityLimits {
  max_predicate_depth: number;
  max_input_predicate_nodes: number;
  max_canonical_dag_nodes: number;
  max_partition_edges: number;
  max_canonical_bytes: number;
}

export interface SymbolicDenotationCanonicalDagV1 {
  schema_version: "symbolic-denotation-canonical-dag-v1";
  root_ref: string;
  nodes: SymbolicDenotationCanonicalNodeV1[];
}

export interface SymbolicDenotationCanonicalNodeV1 {
  key: string;
  axis_ref: string;
  edges: SymbolicDenotationCanonicalEdgeV1[];
}

export type SymbolicDenotationCanonicalEdgeV1 =
  | {
      region: {
        kind: "enum_set";
        values: string[];
      };
      child_ref: string;
    }
  | {
      region: {
        kind: "integer_range";
        minimum: number;
        maximum: number;
      };
      child_ref: string;
    };

export interface CompiledSymbolicDenotationV1 {
  canonical_dag: SymbolicDenotationCanonicalDagV1;
  canonical_sha256: string;
  canonical_bytes: number;
  referenced_axis_refs: string[];
  omitted_axis_refs: string[];
  theoretical_ground_cardinality: string;
  metrics: {
    input_predicate_nodes: number;
    canonical_dag_nodes: number;
    partition_edges: number;
    canonical_bytes: number;
  };
}

export const SYMBOLIC_DENOTATION_DISPOSITIONS = [
  "specified",
  "not_applicable",
  "excluded",
  "decision_required",
  "unavailable",
  "blocking",
] as const;

export type SymbolicDenotationDisposition =
  (typeof SYMBOLIC_DENOTATION_DISPOSITIONS)[number];

export const SYMBOLIC_DENOTATION_QUANTIFIERS = [
  "one",
  "all",
  "any",
  "none",
  "exactly",
  "at_least",
  "at_most",
  "range",
] as const;

export type SymbolicDenotationQuantifier =
  (typeof SYMBOLIC_DENOTATION_QUANTIFIERS)[number];

export interface SymbolicExtensionalPointV1 {
  subject_or_relation_ref: string;
  target_ref: string;
  condition_assignment: Record<string, SymbolicDenotationScalar>;
  variation_assignment: Record<string, SymbolicDenotationScalar>;
  property_ref: string;
  population_ref: string | null;
  quantifier: {
    kind: SymbolicDenotationQuantifier;
    minimum: number | null;
    maximum: number | null;
  };
}

export interface SymbolicExpectedSemanticsV1 {
  value_type: string;
  expected: {
    locator: {
      resource_ref: string;
      kind: string;
      value: string;
    };
    sha256: string;
  };
  provenance_ref: string;
  sensitivity: string;
  population_ref: string | null;
  quantifier: SymbolicExtensionalPointV1["quantifier"];
  lineage: unknown;
}

export interface SymbolicProofObligationDenotationV1 {
  method: string;
  proof_surface: string;
  observation_boundary: string;
  comparison: {
    comparator: string;
    mode: "exact" | "tolerance";
    parameters: unknown;
    tolerance: unknown;
    mask: unknown;
  };
  oracle: unknown;
  environment: unknown;
  protected_value_policy: string;
  completion_effect: string;
}

export interface SymbolicPointDenotationV1 {
  disposition: SymbolicDenotationDisposition;
  expected_semantics: SymbolicExpectedSemanticsV1 | null;
  proof_obligations: SymbolicProofObligationDenotationV1[];
}
