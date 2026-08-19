import { round } from "./shared.mjs";

export function executionCostComparison(baseline, candidate) {
  const b = baseline.execution_cost;
  const c = candidate.execution_cost;
  return {
    baseline_total_tool_calls: b.total_tool_calls,
    candidate_total_tool_calls: c.total_tool_calls,
    total_tool_call_reduction: reduction(b.total_tool_calls, c.total_tool_calls),
    baseline_pre_implementation_tool_calls: b.pre_implementation_tool_calls,
    candidate_pre_implementation_tool_calls: c.pre_implementation_tool_calls,
    pre_implementation_tool_call_reduction: reduction(
      b.pre_implementation_tool_calls,
      c.pre_implementation_tool_calls,
    ),
    baseline_formal_enumeration_tool_calls: b.formal_enumeration_tool_calls,
    candidate_formal_enumeration_tool_calls: c.formal_enumeration_tool_calls,
    formal_enumeration_tool_call_reduction: reduction(
      b.formal_enumeration_tool_calls,
      c.formal_enumeration_tool_calls,
    ),
    baseline_total_tokens: b.total_tokens,
    candidate_total_tokens: c.total_tokens,
    token_reduction: reduction(b.total_tokens, c.total_tokens),
  };
}

export function reduction(before, after) {
  return Number.isFinite(before) && before > 0 && Number.isFinite(after)
    ? round((before - after) / before)
    : null;
}

export function difference(left, right) {
  return Number.isFinite(left) && Number.isFinite(right)
    ? round(left - right)
    : null;
}
