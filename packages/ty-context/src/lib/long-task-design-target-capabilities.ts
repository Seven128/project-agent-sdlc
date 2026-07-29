import type {
  DesignResourceHandoffPreflightV1,
  DesignResourceHandoffTargetV1,
  DesignResourceHandoffV1,
  DesignResourceVerificationMethod,
} from "./design-resource-handoff-types.js";
import type {
  DeliveryContractV2,
  ExecutionTargetCapabilityV2,
} from "./long-task-delivery-types.js";

type ContractDesignTarget =
  DeliveryContractV2["outcomes"][number]["product"]["surface_bindings"][number]["design_targets"][number];
type ContractSurfaceBinding =
  DeliveryContractV2["outcomes"][number]["product"]["surface_bindings"][number];
type DesignCondition = DesignResourceHandoffV1["conditions"][number];

interface ContractDesignTargetBinding {
  binding: ContractSurfaceBinding;
  target: ContractDesignTarget;
}

interface IndexedHandoffTarget {
  preflight: DesignResourceHandoffPreflightV1;
  target: DesignResourceHandoffTargetV1;
}

const METHOD_CAPABILITIES: Partial<
  Record<DesignResourceVerificationMethod, ExecutionTargetCapabilityV2>
> = {
  responsive_reflow: "viewport-control",
  motion_timeline: "motion-observation",
  accessibility_semantics: "assistive-technology",
  accessibility_navigation: "assistive-technology",
  accessibility_visual: "assistive-technology",
  localization: "localization-control",
  system_ui: "system-ui-observation",
  haptic_feedback: "haptic-output",
  sound_feedback: "audio-output",
};

const INPUT_CAPABILITIES: Record<string, ExecutionTargetCapabilityV2> = {
  mouse: "pointer-input",
  pointer: "pointer-input",
  trackpad: "pointer-input",
  keyboard: "keyboard-input",
  touch: "touch-input",
  pen: "touch-input",
  stylus: "touch-input",
  "screen-reader": "assistive-technology",
  "voice-control": "assistive-technology",
  "switch-control": "assistive-technology",
};

const CONDITION_RULES: Array<{
  capability: ExecutionTargetCapabilityV2;
  applies: (condition: DesignCondition) => boolean;
}> = [
  {
    capability: "assistive-technology",
    applies: (item) => item.assistive_technology !== "not-applicable",
  },
  {
    capability: "reduced-motion",
    applies: (item) => item.motion === "reduced",
  },
  {
    capability: "reduced-transparency",
    applies: (item) => item.transparency === "reduced",
  },
  {
    capability: "increased-contrast",
    applies: (item) => item.contrast === "increased",
  },
  {
    capability: "bold-text-control",
    applies: (item) => item.bold_text === "enabled",
  },
  {
    capability: "button-shapes-control",
    applies: (item) => item.button_shapes === "enabled",
  },
  {
    capability: "system-ui-observation",
    applies: (item) => item.system_ui !== "not-applicable",
  },
  {
    capability: "ime-control",
    applies: (item) => item.ime !== "not-applicable",
  },
  {
    capability: "permission-control",
    applies: (item) => item.permission !== "not-applicable",
  },
  {
    capability: "network-state-control",
    applies: (item) => item.connectivity !== "not-applicable",
  },
  {
    capability: "lifecycle-control",
    applies: (item) => item.lifecycle !== "not-applicable",
  },
];

export function validateLongTaskDesignTargetCapabilities(
  contract: DeliveryContractV2,
  contractTarget: ContractDesignTargetBinding,
  indexed: IndexedHandoffTarget,
): void {
  const executionTarget = contract.task.execution_targets.find(
    (item) => item.key === contractTarget.binding.target_ref,
  );
  if (!executionTarget)
    invalid(
      "execution_target_unknown",
      `${contractTarget.target.key}:${contractTarget.binding.target_ref}`,
    );
  const required = requiredTargetCapabilities(contractTarget.target, indexed);
  for (const capability of required)
    if (!executionTarget.capabilities.includes(capability))
      invalid(
        "execution_target_capability_missing",
        `${contractTarget.target.key}:${executionTarget.key}:${capability}`,
      );
}

function requiredTargetCapabilities(
  target: ContractDesignTarget,
  indexed: IndexedHandoffTarget,
): Set<ExecutionTargetCapabilityV2> {
  const required = new Set<ExecutionTargetCapabilityV2>();
  addMethodCapabilities(required, target);
  const conditions = indexed.target.condition_refs.map((conditionRef) =>
    indexed.preflight.handoff.conditions.find(
      (item) => item.key === conditionRef,
    )!,
  );
  addVaryingConditionCapabilities(required, conditions);
  addPerConditionCapabilities(required, conditions);
  return required;
}

function addMethodCapabilities(
  required: Set<ExecutionTargetCapabilityV2>,
  target: ContractDesignTarget,
): void {
  for (const binding of target.verification_method_bindings) {
    const capability = METHOD_CAPABILITIES[binding.method];
    if (capability) required.add(capability);
  }
}

function addVaryingConditionCapabilities(
  required: Set<ExecutionTargetCapabilityV2>,
  conditions: DesignCondition[],
): void {
  addIfVaries(
    required,
    conditions,
    "viewport-control",
    (item) => item.viewport.key,
  );
  addIfSome(
    required,
    conditions,
    "pixel-density-observation",
    (item) => item.density.key !== "not-applicable",
  );
  addIfSome(
    required,
    conditions,
    "safe-area-observation",
    (item) => item.safe_area.key !== "not-applicable",
  );
  addIfVaries(
    required,
    conditions,
    "color-scheme-control",
    (item) => item.color_scheme,
  );
  addIfVaries(
    required,
    conditions,
    "text-scale-control",
    (item) => item.text_scale.key,
  );
  addIfVaries(
    required,
    conditions,
    "localization-control",
    (item) => item.locale,
  );
  addIfSome(
    required,
    conditions,
    "rtl-control",
    (item) => item.direction === "rtl",
  );
  addIfVaries(
    required,
    conditions,
    "device-orientation",
    (item) => item.orientation,
  );
  addIfVaries(
    required,
    conditions,
    "window-state-control",
    (item) => item.window_state,
  );
  addIfVaries(
    required,
    conditions,
    "fold-state-control",
    (item) => item.fold_state,
  );
}

function addPerConditionCapabilities(
  required: Set<ExecutionTargetCapabilityV2>,
  conditions: DesignCondition[],
): void {
  for (const condition of conditions) {
    const inputCapability =
      INPUT_CAPABILITIES[condition.input_method.toLowerCase()];
    if (inputCapability) required.add(inputCapability);
    for (const rule of CONDITION_RULES)
      if (rule.applies(condition)) required.add(rule.capability);
  }
}

function addIfVaries(
  required: Set<ExecutionTargetCapabilityV2>,
  conditions: DesignCondition[],
  capability: ExecutionTargetCapabilityV2,
  value: (condition: DesignCondition) => string,
): void {
  if (new Set(conditions.map(value)).size > 1) required.add(capability);
}

function addIfSome(
  required: Set<ExecutionTargetCapabilityV2>,
  conditions: DesignCondition[],
  capability: ExecutionTargetCapabilityV2,
  predicate: (condition: DesignCondition) => boolean,
): void {
  if (conditions.some(predicate)) required.add(capability);
}

function invalid(code: string, detail: string): never {
  throw new Error(
    `delivery_contract_invalid:design_resource_${code}:${detail}`,
  );
}
