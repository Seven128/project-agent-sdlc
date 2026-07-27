import path from "node:path";
import { parseCheck } from "./long-task-check-shape.js";
import { normalizeRepositoryFile } from "./long-task-paths.js";
import type { DeliveryOutcomeV2 } from "./long-task-delivery-types.js";
import { parseRequirements } from "./long-task-requirement-shape.js";
import {
  array,
  boolean,
  key,
  literal,
  nullable,
  object,
  parseBindings,
  parseControls,
  parseCounterfactuals,
  parseApplicableKeyedStatements,
  parseClaimApplicability,
  parseControlRelationClosure,
  parseControlRelations,
  parseObligations,
  parseOwner,
  parsePopulation,
  parseRollback,
  repositoryPatterns,
  string,
  strings,
} from "./long-task-delivery-shape.js";
import { parseStrictYaml } from "./strict-codec.js";
import {
  assertNoSemanticDriftMigration,
  semanticDriftOutcomeMigrationFields,
} from "./long-task-semantic-drift-migration.js";
import { parseSurfaceBindings } from "./long-task-ui-surface-shape.js";

export function parseOutcome(value: unknown, label: string): DeliveryOutcomeV2 {
  assertNoSemanticDriftMigration(
    semanticDriftOutcomeMigrationFields(value, label),
  );
  const row = object(
    value,
    label,
    [
      "key",
      "title",
      "stage",
      "applicability",
      "product",
      "technical",
      "acceptance",
    ],
    ["depends_on"],
  );
  const product = object(
    row.product,
    `${label}.product`,
    [
      "observable_result",
      "result_applicability_refs",
      "success_path_required",
      "degradation_path_required",
      "owner",
      "control_relation_closure",
    ],
    [
      "requirements",
      "owner_surfaces",
      "controls",
      "control_relations",
      "surface_bindings",
      "non_completing_outcomes",
    ],
  );
  const technical = object(
    row.technical,
    `${label}.technical`,
    ["expected_change_paths"],
    [
      "obligations",
      "allowed_support_paths",
      "forbidden_paths",
      "forbidden_shortcuts",
      "bindings",
      "rollback_and_recovery",
    ],
  );
  const acceptance = object(
    row.acceptance,
    `${label}.acceptance`,
    ["checks"],
    ["population", "counterfactual_controls"],
  );
  return {
    key: key(row.key, `${label}.key`),
    title: string(row.title, `${label}.title`),
    stage: key(row.stage, `${label}.stage`),
    depends_on: Object.hasOwn(row, "depends_on")
      ? strings(row.depends_on, `${label}.depends_on`).map((item, index) =>
          key(item, `${label}.depends_on[${index}]`),
        )
      : [],
    applicability: parseClaimApplicability(
      row.applicability,
      `${label}.applicability`,
    ),
    product: {
      observable_result: string(
        product.observable_result,
        `${label}.product.observable_result`,
      ),
      result_applicability_refs: strings(
        product.result_applicability_refs,
        `${label}.product.result_applicability_refs`,
      ).map((item, index) =>
        key(item, `${label}.product.result_applicability_refs[${index}]`),
      ),
      success_path_required: boolean(
        product.success_path_required,
        `${label}.product.success_path_required`,
      ),
      degradation_path_required: boolean(
        product.degradation_path_required,
        `${label}.product.degradation_path_required`,
      ),
      owner: parseOwner(product.owner, `${label}.product.owner`),
      requirements: Object.hasOwn(product, "requirements")
        ? parseRequirements(
            product.requirements,
            `${label}.product.requirements`,
          )
        : [],
      owner_surfaces: Object.hasOwn(product, "owner_surfaces")
        ? strings(product.owner_surfaces, `${label}.product.owner_surfaces`)
        : [],
      controls: Object.hasOwn(product, "controls")
        ? parseControls(product.controls, `${label}.product.controls`)
        : [],
      control_relation_closure: parseControlRelationClosure(
        product.control_relation_closure,
        `${label}.product.control_relation_closure`,
      ),
      control_relations: Object.hasOwn(product, "control_relations")
        ? parseControlRelations(
            product.control_relations,
            `${label}.product.control_relations`,
          )
        : [],
      surface_bindings: Object.hasOwn(product, "surface_bindings")
        ? parseSurfaceBindings(
            product.surface_bindings,
            `${label}.product.surface_bindings`,
          )
        : [],
      non_completing_outcomes: Object.hasOwn(product, "non_completing_outcomes")
        ? parseApplicableKeyedStatements(
            product.non_completing_outcomes,
            `${label}.product.non_completing_outcomes`,
          )
        : [],
    },
    technical: {
      obligations: Object.hasOwn(technical, "obligations")
        ? parseObligations(
            technical.obligations,
            `${label}.technical.obligations`,
          )
        : [],
      expected_change_paths: repositoryPatterns(
        technical.expected_change_paths,
        `${label}.technical.expected_change_paths`,
      ),
      allowed_support_paths: Object.hasOwn(technical, "allowed_support_paths")
        ? repositoryPatterns(
            technical.allowed_support_paths,
            `${label}.technical.allowed_support_paths`,
          )
        : [],
      forbidden_paths: Object.hasOwn(technical, "forbidden_paths")
        ? repositoryPatterns(
            technical.forbidden_paths,
            `${label}.technical.forbidden_paths`,
          )
        : [],
      forbidden_shortcuts: Object.hasOwn(technical, "forbidden_shortcuts")
        ? parseApplicableKeyedStatements(
            technical.forbidden_shortcuts,
            `${label}.technical.forbidden_shortcuts`,
          )
        : [],
      bindings: Object.hasOwn(technical, "bindings")
        ? parseBindings(technical.bindings, `${label}.technical.bindings`)
        : [],
      rollback_and_recovery: Object.hasOwn(technical, "rollback_and_recovery")
        ? nullable(technical.rollback_and_recovery, (item) =>
            parseRollback(item, `${label}.technical.rollback_and_recovery`),
          )
        : null,
    },
    acceptance: {
      checks: array(acceptance.checks, `${label}.acceptance.checks`).map(
        (item, index) =>
          parseCheck(item, `${label}.acceptance.checks[${index}]`),
      ),
      population: Object.hasOwn(acceptance, "population")
        ? nullable(acceptance.population, (item) =>
            parsePopulation(item, `${label}.acceptance.population`),
          )
        : null,
      counterfactual_controls: Object.hasOwn(
        acceptance,
        "counterfactual_controls",
      )
        ? parseCounterfactuals(
            acceptance.counterfactual_controls,
            `${label}.acceptance.counterfactual_controls`,
          )
        : [],
    },
  };
}

export function parseOutcomeFragment(
  raw: string,
  relative: string,
): DeliveryOutcomeV2[] {
  const value = parseStrictYaml(raw);
  if (Array.isArray(value))
    return value.map((item, index) =>
      parseOutcome(item, `${relative}[${index}]`),
    );
  const row = object(
    value,
    relative,
    [],
    [
      "schema_version",
      "outcomes",
      "key",
      "title",
      "stage",
      "depends_on",
      "applicability",
      "product",
      "technical",
      "acceptance",
    ],
  );
  if (Object.hasOwn(row, "outcomes")) {
    if (
      Object.keys(row).some(
        (name) => !["schema_version", "outcomes"].includes(name),
      )
    )
      throw new Error(
        `delivery_contract_invalid:${relative}:fragment cannot mix root or Outcome keys`,
      );
    if (Object.hasOwn(row, "schema_version"))
      literal(
        row.schema_version,
        ["long-task-outcomes-v2"] as const,
        `${relative}.schema_version`,
      );
    return array(row.outcomes, `${relative}.outcomes`).map((item, index) =>
      parseOutcome(item, `${relative}.outcomes[${index}]`),
    );
  }
  return [parseOutcome(value, relative)];
}

export function safeFragmentPath(value: string, index: number): string {
  const normalized = normalizeRepositoryFile(value, `outcome_files[${index}]`);
  if (!normalized.endsWith(".yaml"))
    throw new Error(`unsafe_path:outcome_files[${index}]:${value}`);
  return normalized;
}
