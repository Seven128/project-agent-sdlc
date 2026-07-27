import type {
  ClaimApplicabilityV2,
  DeliveryContractV2,
} from "./long-task-delivery-types.js";

type Reporter = (message: string) => void;

export function validateSemanticAssuranceShape(
  contract: DeliveryContractV2,
  report?: Reporter,
): void {
  if (contract.task.context_snapshot_mode !== "full")
    issue(
      report,
      "long_task_full_context_required",
      contract.task.context_snapshot_mode,
    );
  validateApplicabilityScope("GLOBAL", contract.global.applicability, report);
  for (const outcome of contract.outcomes)
    validateApplicabilityScope(outcome.key, outcome.applicability, report);
}

function validateApplicabilityScope(
  scope: string,
  profiles: ClaimApplicabilityV2[],
  report?: Reporter,
): void {
  if (!profiles.length) return;
  let expectedDimensionKeys: string[] | null = null;
  const cells = new Map<string, string>();
  for (const profile of profiles) {
    if (!profile.dimensions.length)
      issue(
        report,
        "applicability_dimensions_required",
        `${scope}:${profile.key}`,
      );
    const keys = profile.dimensions.map((dimension) => dimension.key);
    if (new Set(keys).size !== keys.length)
      issue(
        report,
        "applicability_dimension_duplicate",
        `${scope}:${profile.key}`,
      );
    const sortedKeys = [...keys].sort();
    if (expectedDimensionKeys === null) expectedDimensionKeys = sortedKeys;
    else if (!same(expectedDimensionKeys, sortedKeys))
      issue(
        report,
        "applicability_dimension_set_mismatch",
        `${scope}:${profile.key}:${expectedDimensionKeys.join(",")}:${sortedKeys.join(",")}`,
      );
    const dimensions = [...profile.dimensions]
      .sort((left, right) => left.key.localeCompare(right.key))
      .map((dimension) => `${dimension.key}=${dimension.value}`)
      .join(",");
    const cell = [
      profile.target_ref,
      profile.journey_role,
      dimensions,
      [...profile.given_refs].sort().join(","),
      profile.when_refs.join(","),
    ].join("|");
    const owner = cells.get(cell);
    if (owner)
      issue(
        report,
        "applicability_cell_duplicate",
        `${scope}:${profile.key}:${owner}`,
      );
    else cells.set(cell, profile.key);
  }
}

function same(left: string[], right: string[]): boolean {
  return (
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
}

function issue(
  report: Reporter | undefined,
  code: string,
  detail: string,
): void {
  const message = `delivery_contract_invalid:${code}:${detail}`;
  if (report) report(message);
  else throw new Error(message);
}
