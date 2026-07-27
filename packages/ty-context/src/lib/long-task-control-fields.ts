import type { DeliveryControlV2 } from "./long-task-contract-types.js";
import type { DeliveryControlFieldNameV2 } from "./long-task-control-types.js";

export const CONTROL_FIELD_NAMES = [
  "surface",
  "region",
  "location",
  "control_type",
  "label_content",
  "user_task",
  "visibility",
  "availability",
  "trigger",
  "input",
  "validation",
  "default_value",
  "interaction",
  "navigation_result",
  "loading_state",
  "empty_state",
  "success_state",
  "failure_state",
  "recovery",
  "permission",
  "feedback",
  "accessibility",
] as const satisfies readonly DeliveryControlFieldNameV2[];

export interface ControlFieldFactV2 {
  contract_field: DeliveryControlFieldNameV2;
  claim_field: string;
  statement: string;
  state: "specified" | "not_applicable" | "unresolved";
  applicability_refs: string[];
}

const CLAIM_FIELD_BY_CONTRACT_FIELD: Record<
  DeliveryControlFieldNameV2,
  string
> = {
  surface: "surface",
  region: "region",
  location: "location",
  control_type: "control_type",
  label_content: "label_content",
  user_task: "user_task",
  visibility: "visibility",
  availability: "availability",
  trigger: "trigger",
  input: "input",
  validation: "validation",
  default_value: "default_value",
  interaction: "interaction",
  navigation_result: "navigation_result",
  loading_state: "loading",
  empty_state: "empty",
  success_state: "success",
  failure_state: "failure",
  recovery: "recovery",
  permission: "permission",
  feedback: "feedback",
  accessibility: "accessibility",
};

export function controlFieldFacts(
  control: DeliveryControlV2,
): ControlFieldFactV2[] {
  const coverage = new Map(
    control.field_coverage.flatMap((entry) =>
      entry.fields.map((field) => [field, entry] as const),
    ),
  );
  return CONTROL_FIELD_NAMES.map((field) => {
    const entry = coverage.get(field);
    if (!entry)
      throw new Error(`control_field_coverage_missing:${control.key}:${field}`);
    return {
      contract_field: field,
      claim_field: CLAIM_FIELD_BY_CONTRACT_FIELD[field],
      statement: entry.state === "specified" ? control[field] : entry.statement,
      state: entry.state,
      applicability_refs: [...entry.applicability_refs],
    };
  });
}

export function controlFieldState(
  control: DeliveryControlV2,
  field: DeliveryControlFieldNameV2,
): ControlFieldFactV2["state"] {
  return controlFieldFacts(control).find(
    (candidate) => candidate.contract_field === field,
  )!.state;
}
