import { assertDesignResourceFactPolicyEnabled } from "./design-resource-fact-policy.js";
import type { DesignResourceHandoffV1 } from "./design-resource-handoff-types.js";
import { validateDesignResourceFactCells } from "./design-resource-handoff-validation-fact-cells.js";
import { validateDesignResourceFactRecords } from "./design-resource-handoff-validation-fact-records.js";
import { validateDesignResourceProofObligations } from "./design-resource-handoff-validation-proofs.js";
import {
  validateDesignResourceExactTargetFacts,
  validateDesignResourceResourceFactClosure,
} from "./design-resource-handoff-validation-resource-closure.js";

export function validateDesignResourceFacts(
  handoff: DesignResourceHandoffV1,
  resources: Map<string, DesignResourceHandoffV1["resources"][number]>,
  conditions: Map<string, DesignResourceHandoffV1["conditions"][number]>,
  subjects: Map<string, DesignResourceHandoffV1["subjects"][number]>,
  targets: Map<string, DesignResourceHandoffV1["targets"][number]>,
  evidence: Map<string, DesignResourceHandoffV1["evidence"][number]>,
  sourceItems: Map<string, string>,
): void {
  assertDesignResourceFactPolicyEnabled();
  validateDesignResourceFactCells(
    handoff,
    conditions,
    subjects,
    targets,
    sourceItems,
  );
  validateDesignResourceFactRecords(
    handoff,
    resources,
    conditions,
    subjects,
    targets,
    evidence,
    sourceItems,
  );
  validateDesignResourceProofObligations(handoff, resources, targets, evidence);
  validateDesignResourceExactTargetFacts(handoff);
  validateDesignResourceResourceFactClosure(handoff, resources, evidence);
}
