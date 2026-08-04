import { symbolicDeliveryItemsPart1 } from "./symbolic_denotation_efficiency_delivery_catalog_part1.mjs";
import { symbolicDeliveryItemsPart2 } from "./symbolic_denotation_efficiency_delivery_catalog_part2.mjs";
import { symbolicDeliveryItemsPart3 } from "./symbolic_denotation_efficiency_delivery_catalog_part3.mjs";
import { symbolicDeliveryItemsPart4 } from "./symbolic_denotation_efficiency_delivery_catalog_part4.mjs";

export const symbolicDeliveryItems = [
  ...symbolicDeliveryItemsPart1,
  ...symbolicDeliveryItemsPart2,
  ...symbolicDeliveryItemsPart3,
  ...symbolicDeliveryItemsPart4,
];

export const symbolicDeliveryGroups = {
  architecture: {
    tests: [
      "tests/ty-context/symbolic-denotation-efficiency-guidance.test.mjs",
    ],
  },
  denotation: {
    tests: [
      "tests/ty-context/symbolic-denotation-equivalence.test.mjs",
      "tests/ty-context/symbolic-denotation-extensional-equivalence.test.mjs",
    ],
  },
  "symbolic-engine": {
    tests: ["tests/ty-context/symbolic-denotation-equivalence.test.mjs"],
  },
  applicability: {
    tests: [
      "tests/ty-context/symbolic-denotation-ui-v2.test.mjs",
      "tests/ty-context/symbolic-denotation-structural-efficiency.test.mjs",
    ],
  },
  downstream: {
    tests: ["tests/ty-context/long-task-symbolic-denotation-v2.test.mjs"],
  },
  noninterference: {
    tests: [
      "tests/ty-context/symbolic-denotation-efficiency-antidegradation.test.mjs",
      "tests/ty-context/symbolic-denotation-ui-v2.test.mjs",
      "tests/ty-context/long-task-symbolic-denotation-v2.test.mjs",
    ],
  },
  capacity: {
    tests: ["tests/ty-context/design-resource-v1-capacity-guard.test.mjs"],
  },
  efficiency: {
    tests: [
      "tests/ty-context/symbolic-denotation-efficiency-antidegradation.test.mjs",
      "tests/ty-context/symbolic-denotation-structural-efficiency.test.mjs",
    ],
  },
  scope: {
    tests: ["tests/ty-context/long-task-symbolic-denotation-v2.test.mjs"],
  },
  rollout: {
    tests: ["tests/ty-context/long-task-symbolic-denotation-v2.test.mjs"],
  },
  verification: {
    tests: [
      "tests/ty-context/symbolic-denotation-equivalence.test.mjs",
      "tests/ty-context/symbolic-denotation-extensional-equivalence.test.mjs",
      "tests/ty-context/symbolic-denotation-efficiency-antidegradation.test.mjs",
      "tests/ty-context/symbolic-denotation-structural-efficiency.test.mjs",
    ],
  },
  distribution: {
    tests: [
      "tests/ty-context/symbolic-denotation-efficiency-guidance.test.mjs",
    ],
  },
  safety: {
    tests: [
      "tests/ty-context/symbolic-denotation-efficiency-antidegradation.test.mjs",
    ],
  },
  outcome: {
    tests: [],
  },
};

export const symbolicDeliveryObservation = (key) => key.replaceAll("-", "_");

export const symbolicFactObservationRefs = Object.fromEntries(
  symbolicDeliveryItems.map((item) => [
    item.key,
    `fact_${symbolicDeliveryObservation(item.key)}`,
  ]),
);

export const symbolicSemanticAssertionKeys = [
  ...symbolicDeliveryItems
    .filter((item) => item.kind !== "risk_fact" && !item.complete)
    .map((item) =>
      item.kind === "outcome_result"
        ? "result"
        : item.kind === "non_completing"
          ? "inventory-is-not-completion"
          : item.key,
    ),
  "relations-na",
  "symbolic-liveness",
];

export const symbolicPolicyMarkers = Object.freeze({
  delivery: "symbolic_denotation_efficiency_delivery: true",
  relations: "control_relations_unchanged: true",
  shortcuts: "forbidden_symbolic_shortcuts_absent: true",
  nonCompletion: "symbolic_inventory_is_not_completion: true",
});

const keys = symbolicDeliveryItems.map((item) => item.key);
if (new Set(keys).size !== keys.length)
  throw new Error("symbolic_delivery_item_key_duplicate");
