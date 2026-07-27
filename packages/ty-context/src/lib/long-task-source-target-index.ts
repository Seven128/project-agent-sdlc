import type {
  DeliveryContractV2,
  SourceItemKind,
} from "./long-task-delivery-types.js";
import { controlFieldFacts } from "./long-task-control-fields.js";
import { normalizeSourceItemText } from "./long-task-source-item-parser.js";

export interface CanonicalSourceTarget {
  ref: string;
  kind:
    | "outcome_result"
    | "requirement"
    | "control"
    | "technical_obligation"
    | "non_completing"
    | "global_constraint"
    | "non_goal"
    | "forbidden_shortcut"
    | "acceptance"
    | "risk_fact"
    | "external_confirmation";
  normalized_text?: string;
  scope?: "global" | "outcome";
  outcome_key?: string;
  risk_fact?: keyof DeliveryContractV2["risk"]["facts"];
  affected_outcome?: string;
}

export function buildCanonicalSourceTargetIndex(
  contract: DeliveryContractV2,
): Map<string, CanonicalSourceTarget> {
  const targets: CanonicalSourceTarget[] = [];
  for (const outcome of contract.outcomes) {
    targets.push(
      target(
        `${outcome.key}.result`,
        "outcome_result",
        outcome.product.observable_result,
        outcome.key,
      ),
    );
    for (const requirement of outcome.product.requirements)
      targets.push(
        target(
          `${outcome.key}.requirement.${requirement.key}`,
          "requirement",
          requirement.statement,
          outcome.key,
        ),
      );
    for (const control of outcome.product.controls)
      for (const field of controlFieldFacts(control))
        targets.push(
          target(
            `${outcome.key}.control.${control.key}.${field.claim_field}`,
            "control",
            field.statement,
            outcome.key,
          ),
        );
    for (const relation of outcome.product.control_relations)
      targets.push(
        target(
          `${outcome.key}.control_relation.${relation.key}`,
          "control",
          relation.statement,
          outcome.key,
        ),
      );
    for (const obligation of outcome.technical.obligations)
      targets.push(
        target(
          `${outcome.key}.obligation.${obligation.key}`,
          "technical_obligation",
          obligation.statement,
          outcome.key,
        ),
      );
    for (const item of outcome.product.non_completing_outcomes)
      targets.push(
        target(
          `${outcome.key}.non_completing.${item.key}`,
          "non_completing",
          item.statement,
          outcome.key,
        ),
      );
    for (const shortcut of outcome.technical.forbidden_shortcuts)
      targets.push(
        target(
          `${outcome.key}.forbidden_shortcut.${shortcut.key}`,
          "forbidden_shortcut",
          shortcut.statement,
          outcome.key,
        ),
      );
    for (const check of outcome.acceptance.checks)
      for (const assertion of [
        ...check.positive_assertions,
        ...check.negative_assertions,
      ])
        targets.push(
          target(
            `${outcome.key}.${check.key}.${assertion.key}`,
            "acceptance",
            assertion.criterion,
            outcome.key,
            "outcome",
          ),
        );
  }
  for (const item of contract.global.product.non_goals)
    targets.push(target(`non_goal.${item.key}`, "non_goal", item.statement));
  for (const item of contract.global.technical.constraints)
    targets.push(
      target(`constraint.${item.key}`, "global_constraint", item.statement),
    );
  for (const item of contract.global.technical.forbidden_shortcuts)
    targets.push(
      target(
        `forbidden_shortcut.${item.key}`,
        "forbidden_shortcut",
        item.statement,
      ),
    );
  for (const check of contract.global.acceptance.checks)
    for (const assertion of [
      ...check.positive_assertions,
      ...check.negative_assertions,
    ])
      targets.push(
        target(
          `GLOBAL.${check.key}.${assertion.key}`,
          "acceptance",
          assertion.criterion,
          undefined,
          "global",
        ),
      );
  for (const [fact, outcomes] of Object.entries(contract.risk.facts))
    for (const outcome of outcomes)
      targets.push({
        ref: `${fact}:${outcome}`,
        kind: "risk_fact",
        risk_fact: fact as keyof DeliveryContractV2["risk"]["facts"],
        affected_outcome: outcome,
      });
  for (const item of contract.global.acceptance.external_confirmations)
    targets.push(target(item.key, "external_confirmation", item.description));
  return new Map(targets.map((item) => [item.ref, item]));
}

function target(
  ref: string,
  kind: CanonicalSourceTarget["kind"],
  text?: string,
  outcomeKey?: string,
  scope?: CanonicalSourceTarget["scope"],
): CanonicalSourceTarget {
  return {
    ref,
    kind,
    ...(text !== undefined
      ? { normalized_text: normalizeSourceItemText(text) }
      : {}),
    ...(outcomeKey ? { outcome_key: outcomeKey } : {}),
    ...(scope ? { scope } : {}),
  };
}

export function sourceKindForTarget(
  target: CanonicalSourceTarget,
): SourceItemKind | null {
  return target.kind === "global_constraint"
    ? "technical_obligation"
    : target.kind;
}
