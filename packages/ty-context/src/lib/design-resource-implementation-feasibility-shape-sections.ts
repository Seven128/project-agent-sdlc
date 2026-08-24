import {
  DESIGN_RESOURCE_CUSTOMIZATION_SURFACES,
  DESIGN_RESOURCE_IMPLEMENTATION_STRATEGY_STEPS,
  DESIGN_RESOURCE_SUBSTRATE_OBSERVATION_KINDS,
  type DesignResourceImplementationConditionModelV1,
} from "./design-resource-implementation-feasibility-types.js";
import { parseSymbolicPredicate } from "./design-resource-symbolic-predicate-shape.js";
import {
  contractKey,
  stableKey,
  stableKeys,
} from "./design-resource-handoff-shape-primitives.js";
import {
  array,
  literal,
  nullable,
  object,
  repositoryFile,
  string,
  strings,
} from "./long-task-shape-primitives.js";

export function parseConditionModel(
  value: unknown,
  label: string,
): DesignResourceImplementationConditionModelV1 {
  const itemLabel = `${label}.condition_model`;
  const kind = object(value, itemLabel, ["kind", "profiles"]).kind;
  if (kind === "explicit_conditions_v1") {
    const row = object(value, itemLabel, ["kind", "profiles"]);
    return {
      kind: literal(
        row.kind,
        ["explicit_conditions_v1"] as const,
        `${itemLabel}.kind`,
      ),
      profiles: array(row.profiles, `${itemLabel}.profiles`).map(
        (profile, index) => {
          const profileLabel = `${itemLabel}.profiles[${index}]`;
          const profileRow = object(profile, profileLabel, [
            "key",
            "condition_refs",
          ]);
          return {
            key: stableKey(profileRow.key, `${profileLabel}.key`),
            condition_refs: stableKeys(
              profileRow.condition_refs,
              `${profileLabel}.condition_refs`,
            ),
          };
        },
      ),
    };
  }
  const row = object(value, itemLabel, ["kind", "profiles"]);
  return {
    kind: literal(
      row.kind,
      ["symbolic_regions_v2"] as const,
      `${itemLabel}.kind`,
    ),
    profiles: array(row.profiles, `${itemLabel}.profiles`).map(
      (profile, index) => {
        const profileLabel = `${itemLabel}.profiles[${index}]`;
        const profileRow = object(profile, profileLabel, ["key", "region"]);
        return {
          key: stableKey(profileRow.key, `${profileLabel}.key`),
          region: parseSymbolicPredicate(
            profileRow.region,
            `${profileLabel}.region`,
          ),
        };
      },
    ),
  };
}

export function parseComponentFamilyCells(value: unknown, label: string) {
  return array(value, `${label}.component_family_cells`).map((item, index) => {
    const itemLabel = `${label}.component_family_cells[${index}]`;
    const row = object(item, itemLabel, [
      "key",
      "component_family_ref",
      "target_ref",
      "condition_profile_ref",
      "design_fact_refs",
      "feasible_realizations",
      "required_realization",
      "blocker_refs",
    ]);
    const required = object(
      row.required_realization,
      `${itemLabel}.required_realization`,
      ["realization_ref", "technical_authority_source_refs"],
    );
    return {
      key: stableKey(row.key, `${itemLabel}.key`),
      component_family_ref: stableKey(
        row.component_family_ref,
        `${itemLabel}.component_family_ref`,
      ),
      target_ref: contractKey(row.target_ref, `${itemLabel}.target_ref`),
      condition_profile_ref: stableKey(
        row.condition_profile_ref,
        `${itemLabel}.condition_profile_ref`,
      ),
      design_fact_refs: stableKeys(
        row.design_fact_refs,
        `${itemLabel}.design_fact_refs`,
      ),
      feasible_realizations: parseRealizations(
        row.feasible_realizations,
        itemLabel,
      ),
      required_realization: {
        realization_ref: nullable(required.realization_ref, (entry) =>
          stableKey(entry, `${itemLabel}.required_realization.realization_ref`),
        ),
        technical_authority_source_refs: stableKeys(
          required.technical_authority_source_refs,
          `${itemLabel}.required_realization.technical_authority_source_refs`,
        ),
      },
      blocker_refs: stableKeys(row.blocker_refs, `${itemLabel}.blocker_refs`),
    };
  });
}

function parseRealizations(value: unknown, label: string) {
  return array(value, `${label}.feasible_realizations`).map((item, index) => {
    const itemLabel = `${label}.feasible_realizations[${index}]`;
    const row = object(item, itemLabel, [
      "key",
      "strategy_steps",
      "primitive_refs",
      "owner_candidates",
      "supported_customization_surfaces",
      "feasibility_basis_refs",
      "observed_costs",
      "observed_risks",
    ]);
    return {
      key: stableKey(row.key, `${itemLabel}.key`),
      strategy_steps: array(
        row.strategy_steps,
        `${itemLabel}.strategy_steps`,
      ).map((step, stepIndex) =>
        literal(
          step,
          DESIGN_RESOURCE_IMPLEMENTATION_STRATEGY_STEPS,
          `${itemLabel}.strategy_steps[${stepIndex}]`,
        ),
      ),
      primitive_refs: stableKeys(
        row.primitive_refs,
        `${itemLabel}.primitive_refs`,
      ),
      owner_candidates: parseOwnerCandidates(row.owner_candidates, itemLabel),
      supported_customization_surfaces: array(
        row.supported_customization_surfaces,
        `${itemLabel}.supported_customization_surfaces`,
      ).map((surface, surfaceIndex) =>
        literal(
          surface,
          DESIGN_RESOURCE_CUSTOMIZATION_SURFACES,
          `${itemLabel}.supported_customization_surfaces[${surfaceIndex}]`,
        ),
      ),
      feasibility_basis_refs: stableKeys(
        row.feasibility_basis_refs,
        `${itemLabel}.feasibility_basis_refs`,
      ),
      observed_costs: strings(
        row.observed_costs,
        `${itemLabel}.observed_costs`,
      ),
      observed_risks: strings(
        row.observed_risks,
        `${itemLabel}.observed_risks`,
      ),
    };
  });
}

function parseOwnerCandidates(value: unknown, label: string) {
  return array(value, `${label}.owner_candidates`).map((item, index) => {
    const itemLabel = `${label}.owner_candidates[${index}]`;
    const kind = object(
      item,
      itemLabel,
      ["kind", "locator", "existence"],
      ["authorization_source_refs"],
    ).kind;
    if (kind === "existing_path") {
      const row = object(item, itemLabel, ["kind", "locator", "existence"]);
      return {
        kind: literal(
          row.kind,
          ["existing_path"] as const,
          `${itemLabel}.kind`,
        ),
        locator: repositoryFile(row.locator, `${itemLabel}.locator`),
        existence: literal(
          row.existence,
          ["existing"] as const,
          `${itemLabel}.existence`,
        ),
      };
    }
    const row = object(item, itemLabel, [
      "kind",
      "locator",
      "existence",
      "authorization_source_refs",
    ]);
    return {
      kind: literal(
        row.kind,
        ["planned_logical_owner"] as const,
        `${itemLabel}.kind`,
      ),
      locator: stableKey(row.locator, `${itemLabel}.locator`),
      existence: literal(
        row.existence,
        ["planned"] as const,
        `${itemLabel}.existence`,
      ),
      authorization_source_refs: stableKeys(
        row.authorization_source_refs,
        `${itemLabel}.authorization_source_refs`,
      ),
    };
  });
}

export function parseBlockers(value: unknown, label: string) {
  return array(value, `${label}.blockers`).map((item, index) => {
    const itemLabel = `${label}.blockers[${index}]`;
    const row = object(item, itemLabel, [
      "key",
      "component_family_ref",
      "target_ref",
      "condition_profile_ref",
      "source_record_refs",
      "substrate_observation_refs",
      "description",
    ]);
    return {
      key: stableKey(row.key, `${itemLabel}.key`),
      component_family_ref: stableKey(
        row.component_family_ref,
        `${itemLabel}.component_family_ref`,
      ),
      target_ref: contractKey(row.target_ref, `${itemLabel}.target_ref`),
      condition_profile_ref: stableKey(
        row.condition_profile_ref,
        `${itemLabel}.condition_profile_ref`,
      ),
      source_record_refs: stableKeys(
        row.source_record_refs,
        `${itemLabel}.source_record_refs`,
      ),
      substrate_observation_refs: array(
        row.substrate_observation_refs,
        `${itemLabel}.substrate_observation_refs`,
      )
        .map((observationRef, observationIndex) =>
          literal(
            observationRef,
            DESIGN_RESOURCE_SUBSTRATE_OBSERVATION_KINDS,
            `${itemLabel}.substrate_observation_refs[${observationIndex}]`,
          ),
        )
        .sort(),
      description: string(row.description, `${itemLabel}.description`),
    };
  });
}
