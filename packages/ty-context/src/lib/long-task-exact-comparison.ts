import { canonicalValueJson, sha256Hex } from "./strict-codec.js";

export interface ExactDigestComparisonInput {
  identity: Readonly<Record<string, unknown>>;
  actual_value_sha256: string;
  expected_value_sha256: string;
  comparator: string;
  mode: "exact" | "tolerance";
  parameters_sha256: string;
  tolerance_sha256: string | null;
  mask_sha256: string | null;
  submitted_passed?: boolean;
  submitted_verdict?: string;
}

export interface ExactDigestComparisonResult {
  passed: boolean;
  result_sha256: string;
}

export function evaluateExactDigestComparison(
  input: ExactDigestComparisonInput,
): ExactDigestComparisonResult {
  if (
    input.comparator !== "exact_value" ||
    input.mode !== "exact" ||
    input.tolerance_sha256 !== null ||
    input.mask_sha256 !== null
  )
    throw new Error("exact_digest_comparison_authority_invalid");
  const { actual_value_sha256, expected_value_sha256 } = input;
  const passed = actual_value_sha256 === expected_value_sha256;
  const material = {
    identity: input.identity,
    actual_value_sha256: input.actual_value_sha256,
    expected_value_sha256: input.expected_value_sha256,
    comparator: input.comparator,
    mode: input.mode,
    parameters_sha256: input.parameters_sha256,
    tolerance_sha256: input.tolerance_sha256,
    mask_sha256: input.mask_sha256,
    passed,
  };
  return {
    passed,
    result_sha256: exactComparisonResultIdentity(material),
  };
}

export function exactComparisonResultIdentity(
  material: Readonly<Record<string, unknown>>,
): string {
  return sha256Hex(canonicalValueJson(material));
}
