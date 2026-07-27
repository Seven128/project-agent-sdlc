import type { DeliveryOutcomeV2 } from "./long-task-delivery-types.js";
import { parseKeyRefs } from "./long-task-applicability-shape.js";
import { parseRequiredProofSurfaces } from "./long-task-required-proof-surfaces.js";
import { array, key, object, string } from "./long-task-shape-primitives.js";

export function parseRequirements(
  value: unknown,
  label: string,
): DeliveryOutcomeV2["product"]["requirements"] {
  return array(value, label).map((item, index) => {
    const itemLabel = `${label}[${index}]`;
    const row = object(item, itemLabel, [
      "key",
      "statement",
      "required_proof_surfaces",
      "applicability_refs",
    ]);
    const surfaces = parseRequiredProofSurfaces(
      row.required_proof_surfaces,
      `${itemLabel}.required_proof_surfaces`,
    );
    return {
      key: key(row.key, `${itemLabel}.key`),
      statement: string(row.statement, `${itemLabel}.statement`),
      required_proof_surfaces: surfaces,
      applicability_refs: parseKeyRefs(
        row.applicability_refs,
        `${itemLabel}.applicability_refs`,
      ),
    };
  });
}
