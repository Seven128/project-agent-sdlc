import { Buffer } from "node:buffer";
import { canonicalValueJson } from "./strict-codec.js";
import {
  parseLongTaskCompactCapacity,
  parseLongTaskCompactExceptions,
  parseLongTaskCompactFactSets,
  parseLongTaskCompactProofTemplates,
  parseLongTaskCompactSelectors,
  parseLongTaskCompactTable,
} from "./long-task-compact-parser.js";
import {
  materializeLongTaskCompactAssertions,
  materializeLongTaskCompactClaimProjections,
  materializeLongTaskCompactFactBindings,
  prepareLongTaskCompactOutcomeTargets,
} from "./long-task-compact-projections.js";
import {
  type LongTaskCompactCapacityCounts,
  compactArray,
  compactFail,
  compactPlainObject,
  compactResolveSelectors,
  compactStableRef,
  compactStrictObject,
  compactUniqueRows,
  validateLongTaskCompactCapacity,
  validateLongTaskCompactDeclaredMaximum,
} from "./long-task-compact-primitives.js";

const VERSION = "long-task-compact-carrier-v1" as const;

export interface MaterializedLongTaskCompactCarrierV1 {
  root: Record<string, unknown>;
  measured: LongTaskCompactCapacityCounts;
}

export function materializeLongTaskCompactCarrier(
  rootInput: Record<string, unknown>,
): MaterializedLongTaskCompactCarrierV1 {
  const label = "compact_semantic_carrier";
  if (!Object.hasOwn(rootInput, label)) compactFail(label, "missing carrier");
  if (Object.hasOwn(rootInput, "source_claims"))
    compactFail(
      label,
      "expanded source_claims cannot coexist with compact carrier",
    );
  if (!Object.hasOwn(rootInput, "outcomes"))
    compactFail(label, "v1 compact carrier requires inline outcomes");
  const carrier = compactStrictObject(rootInput[label], label, [
    "schema_version",
    "capacity",
    "selectors",
    "claim_catalog",
    "claim_projections",
    "fact_sets",
    "proof_templates",
    "obligations",
    "assertion_projections",
    "exceptions",
  ]);
  if (carrier.schema_version !== VERSION)
    compactFail(`${label}.schema_version`, `must be ${VERSION}`);
  const capacity = parseLongTaskCompactCapacity(
    carrier.capacity,
    `${label}.capacity`,
  );
  validateLongTaskCompactDeclaredMaximum(capacity.maximum, label);
  const selectors = parseLongTaskCompactSelectors(
    carrier.selectors,
    `${label}.selectors`,
  );
  const claims = parseLongTaskCompactTable(
    carrier.claim_catalog,
    selectors,
    `${label}.claim_catalog`,
  );
  compactUniqueRows(claims, "key", `${label}.claim_catalog`);
  const claimByKey = new Map(
    claims.map((claim) => [
      compactStableRef(claim.key, `${label}.claim.key`),
      claim,
    ]),
  );
  const claimProjections = parseLongTaskCompactTable(
    carrier.claim_projections,
    selectors,
    `${label}.claim_projections`,
  );
  const facts = parseLongTaskCompactFactSets(
    carrier.fact_sets,
    selectors,
    `${label}.fact_sets`,
  );
  compactUniqueRows(facts, "fact_key", `${label}.facts`);
  const factByKey = new Map(
    facts.map((fact) => [
      compactStableRef(fact.fact_key, `${label}.fact.fact_key`),
      fact,
    ]),
  );
  const proofTemplates = parseLongTaskCompactProofTemplates(
    carrier.proof_templates,
    selectors,
    `${label}.proof_templates`,
  );
  const obligations = parseLongTaskCompactTable(
    carrier.obligations,
    selectors,
    `${label}.obligations`,
  );
  compactUniqueRows(obligations, "obligation_key", `${label}.obligations`);
  const assertions = parseLongTaskCompactTable(
    carrier.assertion_projections,
    selectors,
    `${label}.assertion_projections`,
  );
  const exceptions = parseLongTaskCompactExceptions(
    carrier.exceptions,
    `${label}.exceptions`,
  );
  validateCompactProjectionExceptions(
    claimProjections,
    exceptions,
    `${label}.exceptions`,
  );

  const { compact_semantic_carrier: _carrier, ...base } = rootInput;
  const expanded = compactPlainObject(
    compactResolveSelectors(structuredClone(base), selectors, "$"),
    "$",
  );
  expanded.source_claims = claims;
  const outcomes = compactArray(expanded.outcomes, "outcomes").map(
    (item, index) => compactPlainObject(item, `outcomes[${index}]`),
  );
  const outcomeByKey = new Map(
    outcomes.map((outcome, index) => [
      compactStableRef(outcome.key, `outcomes[${index}].key`),
      outcome,
    ]),
  );
  prepareLongTaskCompactOutcomeTargets(outcomes);
  materializeLongTaskCompactClaimProjections(
    claimProjections,
    claimByKey,
    outcomeByKey,
  );
  materializeLongTaskCompactFactBindings(
    facts,
    obligations,
    factByKey,
    proofTemplates,
    outcomeByKey,
  );
  materializeLongTaskCompactAssertions(
    assertions,
    claimByKey,
    factByKey,
    outcomeByKey,
  );
  expanded.outcomes = outcomes;

  const measured: LongTaskCompactCapacityCounts = {
    claims: claims.length,
    claim_projections: claimProjections.length,
    selector_members: [...selectors.values()].reduce(
      (sum, members) => sum + members.length,
      0,
    ),
    facts: facts.length,
    obligations: obligations.length,
    assertions: assertions.length,
    canonical_bytes: Buffer.byteLength(canonicalValueJson(expanded), "utf8"),
  };
  validateLongTaskCompactCapacity(capacity, measured, label);
  return { root: expanded, measured };
}

function validateCompactProjectionExceptions(
  projections: Record<string, unknown>[],
  exceptions: Array<{ target_ref: string }>,
  label: string,
): void {
  const expected = projections
    .filter((projection) => {
      const surfaces = projection.required_proof_surfaces;
      return (
        surfaces !== null &&
        (!Array.isArray(surfaces) ||
          surfaces.length !== 1 ||
          surfaces[0] !== "runtime_behavior")
      );
    })
    .map((projection, index) =>
      compactStableRef(
        projection.projection_key,
        `${label}.projection[${index}].projection_key`,
      ),
    )
    .sort();
  const actual = exceptions.map((item) => item.target_ref).sort();
  if (
    new Set(actual).size !== actual.length ||
    canonicalValueJson(expected) !== canonicalValueJson(actual)
  )
    compactFail(
      label,
      `projection target set mismatch: ${actual.length}:${expected.length}`,
    );
}
