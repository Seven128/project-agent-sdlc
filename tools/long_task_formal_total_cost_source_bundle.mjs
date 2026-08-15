import { REAL_PROCESS_SCHEMAS } from "./long_task_real_process_schema_policy.mjs";
import { assert } from "./long_task_real_process_roi_scoring.mjs";
import {
  assertExactKeys,
  assertTimestamp,
  parseJson,
} from "./long_task_formal_total_cost_shared.mjs";

const { FORMAL_TOTAL_COST_REDACTION_RULE_SCHEMA } = REAL_PROCESS_SCHEMAS;

export function validateFormalRedactionRules(
  bundle,
  window,
  precollectionFrozenAt = null,
) {
  const rules = new Map();
  for (const [sourcePath, source] of bundle.files) {
    if (source.entry.role !== "redaction_rule") continue;
    const rule = parseJson(source.bytes, `redaction_rule_json:${sourcePath}`);
    assertExactKeys(
      rule,
      [
        "fields",
        "frozen_at",
        "method",
        "replacement",
        "rule_id",
        "schema_version",
      ],
      `redaction_rule_fields:${sourcePath}`,
    );
    const frozenAt = assertTimestamp(
      rule.frozen_at,
      `redaction_rule_frozen_at:${sourcePath}`,
    );
    assert(
      rule.schema_version === FORMAL_TOTAL_COST_REDACTION_RULE_SCHEMA &&
        typeof rule.rule_id === "string" &&
        rule.rule_id.length > 0 &&
        rule.method === "deterministic-field-redaction" &&
        Array.isArray(rule.fields) &&
        rule.fields.length > 0 &&
        rule.fields.every(
          (field) => typeof field === "string" && field.length > 0,
        ) &&
        rule.replacement === "[REDACTED]" &&
        frozenAt <= window.started &&
        (precollectionFrozenAt === null || frozenAt <= precollectionFrozenAt),
      `redaction_rule:${sourcePath}`,
    );
    rules.set(sourcePath, rule);
  }
  return rules;
}
