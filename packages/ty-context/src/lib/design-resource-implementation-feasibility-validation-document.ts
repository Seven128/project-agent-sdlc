import {
  DESIGN_RESOURCE_SUBSTRATE_OBSERVATION_KINDS,
  type DesignResourceImplementationFeasibilityV1,
  type DesignResourceTechnicalSourceRecordV1,
} from "./design-resource-implementation-feasibility-types.js";
import type { DesignResourceImplementationFeasibilityTargetModel } from "./design-resource-implementation-feasibility-model.js";
import { validateFeasibilityCells } from "./design-resource-implementation-feasibility-validation-cells.js";
import {
  assertSameSet,
  invalidFeasibility,
  requireKnownRefs,
  unique,
} from "./design-resource-implementation-feasibility-validation-support.js";
import { createSymbolicDenotationCompilationSession } from "./symbolic-denotation-engine.js";
import type { DesignResourceFeasibilityDecisionSourceIndex } from "./design-resource-implementation-feasibility-source-decision.js";
import { validateNoExactVisualValueCarriers } from "./design-resource-implementation-feasibility-validation-support.js";
import {
  assertProtectedRepositoryDirectory,
  assertProtectedRepositoryPath,
} from "./repository-path-safety.js";
import path from "node:path";

const OBSERVATION_SOURCE_ROLES = {
  platform: "technical_platform",
  framework_runtime: "framework_runtime",
  ui_system: "ui_system",
  token_theming_adapter: "token_theming_adapter",
  component_owner_roots: "component_owner",
  route_owner_roots: "route_owner",
} as const;

export async function validateFeasibilityDocument(
  repository: string,
  document: DesignResourceImplementationFeasibilityV1,
  model: DesignResourceImplementationFeasibilityTargetModel,
  decisionSources: DesignResourceFeasibilityDecisionSourceIndex,
): Promise<void> {
  if (document.target_ref !== model.target_ref)
    invalidFeasibility(
      "document_target_mismatch",
      `${document.target_ref}:${model.target_ref}`,
    );
  if (
    document.realization_mode === "reference" &&
    model.source_profile_kind !== "reference"
  )
    invalidFeasibility(
      "reference_mode_formal_implementation_forbidden",
      model.target_ref,
    );
  if (
    document.realization_mode !== "reference" &&
    model.source_profile_kind === "reference"
  )
    invalidFeasibility(
      "reference_profile_feasibility_mode_invalid",
      model.target_ref,
    );
  const sources = new Map(
    document.source_records.map((item) => [item.key, item]),
  );
  validateNoExactVisualValueCarriers(document);
  await validateObservations(repository, document, sources);
  const profileRefs = validateConditionModel(document, model);
  await validateFeasibilityCells(
    repository,
    document,
    model,
    profileRefs,
    sources,
    decisionSources,
  );
}

async function validateObservations(
  repository: string,
  document: DesignResourceImplementationFeasibilityV1,
  sources: Map<string, DesignResourceTechnicalSourceRecordV1>,
): Promise<void> {
  unique(
    document.substrate_observations.map((item) => item.kind),
    "substrate_observation_kind_duplicate",
  );
  if (document.realization_mode !== "reference")
    assertSameSet(
      document.substrate_observations.map((item) => item.kind),
      [...DESIGN_RESOURCE_SUBSTRATE_OBSERVATION_KINDS],
      "substrate_observation_kind_set_mismatch",
    );
  for (const observation of document.substrate_observations) {
    unique(
      observation.source_record_refs,
      "substrate_observation_source_duplicate",
      observation.kind,
    );
    requireKnownRefs(
      observation.source_record_refs,
      sources,
      "substrate_observation_source_unknown",
      observation.kind,
    );
    if (observation.disposition === "observed") {
      validateObservedSubstrate(observation, sources);
    } else {
      if (observation.value !== null)
        invalidFeasibility(
          "unobserved_substrate_value_forbidden",
          observation.kind,
        );
      if (observation.reason === null)
        invalidFeasibility(
          "unobserved_substrate_reason_required",
          observation.kind,
        );
    }
    validateObservationValue(observation, sources);
    if (observation.value?.kind === "repository_paths")
      for (const repositoryPath of observation.value.paths)
        await (
          observation.kind === "component_owner_roots" ||
            observation.kind === "route_owner_roots"
            ? assertProtectedRepositoryDirectory
            : assertProtectedRepositoryPath
        )(
          repository,
          path.resolve(repository, ...repositoryPath.split("/")),
          `design_resource_feasibility_repository_path:${observation.kind}`,
        );
  }
  if (
    document.realization_mode !== "reference" &&
    document.substrate_observations.some(
      (observation) =>
        observation.disposition === "decision_required" ||
        observation.disposition === "unavailable",
    ) &&
    !document.component_family_cells.some((cell) => cell.blocker_refs.length)
  )
    invalidFeasibility(
      "unresolved_substrate_blocker_required",
      document.target_ref,
    );
}

function validateObservedSubstrate(
  observation: DesignResourceImplementationFeasibilityV1["substrate_observations"][number],
  sources: Map<string, DesignResourceTechnicalSourceRecordV1>,
): void {
  if (!observation.value)
    invalidFeasibility("observed_substrate_value_required", observation.kind);
  if (observation.reason !== null)
    invalidFeasibility("observed_substrate_reason_forbidden", observation.kind);
  if (!observation.source_record_refs.length)
    invalidFeasibility("observed_substrate_source_required", observation.kind);
  const requiredRole = OBSERVATION_SOURCE_ROLES[observation.kind];
  if (
    !observation.source_record_refs.some((ref) =>
      sources.get(ref)!.roles.includes(requiredRole),
    )
  )
    invalidFeasibility(
      "observed_substrate_source_role_missing",
      `${observation.kind}:${requiredRole}`,
    );
}

function validateObservationValue(
  observation: DesignResourceImplementationFeasibilityV1["substrate_observations"][number],
  sources: Map<string, DesignResourceTechnicalSourceRecordV1>,
): void {
  if (!observation.value) return;
  if (
    ["platform", "framework_runtime", "ui_system"].includes(observation.kind) &&
    observation.value.kind !== "identifier"
  )
    invalidFeasibility(
      "observation_value_kind_invalid",
      `${observation.kind}:${observation.value.kind}`,
    );
  if (
    ["component_owner_roots", "route_owner_roots"].includes(observation.kind) &&
    observation.value.kind !== "repository_paths"
  )
    invalidFeasibility(
      "observation_value_kind_invalid",
      `${observation.kind}:${observation.value.kind}`,
    );
  if (observation.value?.kind === "identifier") {
    const versionRef = observation.value.version_source_ref;
    if (versionRef && !sources.has(versionRef))
      invalidFeasibility("observation_version_source_unknown", versionRef);
  } else if (
    observation.value?.kind === "repository_paths" &&
    !observation.value.paths.length
  ) {
    invalidFeasibility(
      "observation_repository_paths_required",
      observation.kind,
    );
  }
}

function validateConditionModel(
  document: DesignResourceImplementationFeasibilityV1,
  model: DesignResourceImplementationFeasibilityTargetModel,
): Set<string> {
  const conditionModel = document.condition_model;
  if (
    model.representation === "fact_cells_v1" &&
    conditionModel.kind !== "explicit_conditions_v1"
  )
    invalidFeasibility(
      "v1_explicit_condition_model_required",
      model.target_ref,
    );
  if (
    model.representation === "symbolic_rules_v2" &&
    conditionModel.kind !== "symbolic_regions_v2"
  )
    invalidFeasibility(
      "v2_symbolic_condition_model_required",
      model.target_ref,
    );
  if (
    !conditionModel.profiles.length &&
    document.realization_mode !== "reference"
  )
    invalidFeasibility("condition_profiles_required", model.target_ref);
  unique(
    conditionModel.profiles.map((item) => item.key),
    "condition_profile_key_duplicate",
  );
  if (
    model.representation === "fact_cells_v1" &&
    conditionModel.kind === "explicit_conditions_v1"
  )
    validateExplicitConditionProfiles(document, model);
  if (
    model.representation === "symbolic_rules_v2" &&
    conditionModel.kind === "symbolic_regions_v2" &&
    conditionModel.profiles.length
  )
    validateSymbolicConditionProfiles(document, model);
  return new Set(conditionModel.profiles.map((item) => item.key));
}

function validateExplicitConditionProfiles(
  document: DesignResourceImplementationFeasibilityV1,
  model: Extract<
    DesignResourceImplementationFeasibilityTargetModel,
    { representation: "fact_cells_v1" }
  >,
): void {
  if (document.condition_model.kind !== "explicit_conditions_v1") return;
  const conditionRefs = document.condition_model.profiles.flatMap((profile) => {
    if (!profile.condition_refs.length)
      invalidFeasibility("condition_profile_empty", profile.key);
    unique(
      profile.condition_refs,
      "condition_profile_ref_duplicate",
      profile.key,
    );
    return profile.condition_refs;
  });
  unique(conditionRefs, "condition_profile_overlap");
  if (document.realization_mode !== "reference")
    assertSameSet(
      conditionRefs,
      model.condition_refs,
      "condition_profile_set_mismatch",
    );
}

function validateSymbolicConditionProfiles(
  document: DesignResourceImplementationFeasibilityV1,
  model: Extract<
    DesignResourceImplementationFeasibilityTargetModel,
    { representation: "symbolic_rules_v2" }
  >,
): void {
  if (document.condition_model.kind !== "symbolic_regions_v2") return;
  const profiles = document.condition_model.profiles;
  const compilation = createSymbolicDenotationCompilationSession(
    model.axis_domains,
    [model.reachable_region, ...profiles.map((item) => item.region)],
  );
  const reachable = compilation.compile(model.reachable_region);
  for (const profile of profiles) {
    const outside = compilation.compile({
      op: "all",
      predicates: [
        profile.region,
        { op: "not", predicate: model.reachable_region },
      ],
    });
    if (outside.canonical_dag.root_ref !== "terminal.false")
      invalidFeasibility("symbolic_condition_profile_unreachable", profile.key);
  }
  validateSymbolicProfileDisjointness(profiles, compilation);
  if (document.realization_mode !== "reference") {
    const union = compilation.compile({
      op: "any",
      predicates: profiles.map((item) => item.region),
    });
    if (union.canonical_sha256 !== reachable.canonical_sha256)
      invalidFeasibility(
        "symbolic_condition_profile_coverage_gap",
        model.target_ref,
      );
  }
}

function validateSymbolicProfileDisjointness(
  profiles: Extract<
    DesignResourceImplementationFeasibilityV1["condition_model"],
    { kind: "symbolic_regions_v2" }
  >["profiles"],
  compilation: ReturnType<typeof createSymbolicDenotationCompilationSession>,
): void {
  for (let left = 0; left < profiles.length; left += 1)
    for (let right = left + 1; right < profiles.length; right += 1) {
      const overlap = compilation.compile({
        op: "all",
        predicates: [profiles[left].region, profiles[right].region],
      });
      if (overlap.canonical_dag.root_ref !== "terminal.false")
        invalidFeasibility(
          "symbolic_condition_profile_overlap",
          `${profiles[left].key}:${profiles[right].key}`,
        );
    }
}
