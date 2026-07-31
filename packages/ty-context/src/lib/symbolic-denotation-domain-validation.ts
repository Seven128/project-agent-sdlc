import type {
  SymbolicDenotationAxisDomain,
  SymbolicDenotationComplexityLimits,
} from "./symbolic-denotation-types.js";
import {
  compareText,
  exactKeys,
  invalid,
  stableKey,
} from "./symbolic-denotation-support.js";

export function validateSymbolicLimits(
  limits: SymbolicDenotationComplexityLimits,
): SymbolicDenotationComplexityLimits {
  exactKeys(
    limits,
    [
      "max_predicate_depth",
      "max_input_predicate_nodes",
      "max_canonical_dag_nodes",
      "max_partition_edges",
      "max_canonical_bytes",
    ],
    "complexity_limits",
  );
  for (const [key, value] of Object.entries(limits))
    if (!Number.isSafeInteger(value) || value <= 0)
      invalid("complexity_limit_invalid", `${key}:${value}`);
  return { ...limits };
}

export function validateSymbolicDomains(
  domainsInput: SymbolicDenotationAxisDomain[],
): SymbolicDenotationAxisDomain[] {
  if (!Array.isArray(domainsInput) || !domainsInput.length)
    invalid("axis_domains_required", "");
  const domains = domainsInput.map(validateDomain);
  domains.sort((left, right) => compareText(left.key, right.key));
  if (new Set(domains.map((domain) => domain.key)).size !== domains.length)
    invalid("axis_domain_key_duplicate", "");
  return domains;
}

function validateDomain(
  input: SymbolicDenotationAxisDomain,
  index: number,
): SymbolicDenotationAxisDomain {
  if (!input || typeof input !== "object" || Array.isArray(input))
    invalid("axis_domain_invalid", String(index));
  stableKey(input.key, `axis_domain:${index}`);
  if (input.kind === "enum") return validateEnumDomain(input);
  if (input.kind === "bounded_number") return validateNumberDomain(input);
  return invalid(
    "axis_domain_kind_unknown",
    String((input as { kind?: unknown }).kind),
  );
}

function validateEnumDomain(
  input: Extract<SymbolicDenotationAxisDomain, { kind: "enum" }>,
): SymbolicDenotationAxisDomain {
  exactKeys(input, ["key", "kind", "values"], `axis_domain:${input.key}`);
  if (!Array.isArray(input.values) || !input.values.length)
    invalid("enum_domain_values_required", input.key);
  const values = input.values.map((value) => {
    if (typeof value !== "string" || !value)
      invalid("enum_domain_value_invalid", input.key);
    return value;
  });
  if (new Set(values).size !== values.length)
    invalid("enum_domain_value_duplicate", input.key);
  return { ...input, values: [...values].sort(compareText) };
}

function validateNumberDomain(
  input: Extract<SymbolicDenotationAxisDomain, { kind: "bounded_number" }>,
): SymbolicDenotationAxisDomain {
  exactKeys(
    input,
    ["key", "kind", "minimum", "maximum", "integer"],
    `axis_domain:${input.key}`,
  );
  if (
    input.integer !== true ||
    !Number.isSafeInteger(input.minimum) ||
    !Number.isSafeInteger(input.maximum) ||
    input.minimum > input.maximum ||
    input.maximum >= Number.MAX_SAFE_INTEGER
  )
    invalid("bounded_number_domain_invalid", input.key);
  return { ...input };
}
