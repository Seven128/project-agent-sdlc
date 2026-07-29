import {
  SEMANTIC_FACT_STANDARD_CONDITION_AXES,
  SEMANTIC_FACT_STANDARD_FAMILIES,
  SEMANTIC_FACT_STANDARD_PROPERTIES,
  SEMANTIC_FACT_REQUIRED_INSPECTOR_CAPABILITIES,
} from "../../packages/ty-context/dist/lib/semantic-fact-catalog.js";
import {
  digestText,
  refreshFixtureSemanticManifest,
} from "./long-task-semantic-refresh-fixture.mjs";
import {
  fixtureSemanticFactRecords,
} from "./long-task-semantic-records-fixture.mjs";

export const fixtureSourceStatements = {
  "first-observable": "The first outcome must be observable.",
  "second-observable": "The second outcome must be observable.",
  "fixture-architecture":
    "Preserve the fixture state owner and verifier boundary.",
  "fixture-external": "Confirm the fixture in external delivery.",
};

export function fixtureSemanticManifest(options = {}) {
  const outcomeKeys = options.twoOutcomes ? ["first", "second"] : ["first"];
  const factKeys = outcomeKeys.map((key) => `fact.${key}.observable`);
  const sourceItemKeys = [
    "first-observable",
    ...(options.twoOutcomes ? ["second-observable"] : []),
    "fixture-architecture",
    ...(options.externalConfirmation ? ["fixture-external"] : []),
  ];
  const manifestKey = "fixture-semantic-facts";
  const familyKey = (family) => `family.${family.replaceAll("_", "-")}`;
  const axisKey = (axis) => `axis.${axis.replaceAll("_", "-")}`;
  const propertyKey = (property) =>
    `property.${property.replaceAll("_", "-")}`;
  const conditionKey = (outcome) => `condition.${outcome}.baseline`;
  const unitKey = (outcome) => `subject.${outcome}.outcome`;
  const sourceFacts = (sourceKey) => {
    if (sourceKey === "first-observable") return ["fact.first.observable"];
    if (sourceKey === "second-observable") return ["fact.second.observable"];
    if (sourceKey === "fixture-architecture") return factKeys;
    if (sourceKey === "fixture-external") return factKeys;
    return [];
  };
  const inputs = [
    ...sourceItemKeys.map((sourceKey) => ({
      key: `input.${sourceKey}`,
      kind: "source_item",
      source_ref: sourceKey,
      sha256: digestText(fixtureSourceStatements[sourceKey]),
      disposition: "non_ui_material",
      fact_refs: sourceFacts(sourceKey),
      basis_refs: [sourceKey],
      rationale:
        "This marked Source item contributes to the fixture's exact non-UI Fact universe.",
    })),
    {
      key: "input.context-global",
      kind: "context",
      source_ref: "project_context/global.md",
      sha256: digestText("# Global\n"),
      disposition: "non_ui_material",
      fact_refs: factKeys,
      basis_refs: ["fixture-architecture"],
      rationale: "The full Context snapshot is classified and bound.",
    },
    {
      key: "input.context-architecture",
      kind: "context",
      source_ref: "project_context/architecture.md",
      sha256: digestText("# Architecture\n"),
      disposition: "non_ui_material",
      fact_refs: factKeys,
      basis_refs: ["fixture-architecture"],
      rationale: "The full Context snapshot is classified and bound.",
    },
    {
      key: "input.context-manifest",
      kind: "context",
      source_ref: "project_context/context.toml",
      sha256: digestText(
        '[[areas]]\nid = "main"\nroot = "."\ncontext = "project_context/areas/main.md"\nkind = "app"\ndefault = true\n',
      ),
      disposition: "non_ui_material",
      fact_refs: factKeys,
      basis_refs: ["fixture-architecture"],
      rationale: "The full Context graph manifest is classified and bound.",
    },
    {
      key: "input.context-main",
      kind: "context",
      source_ref: "project_context/areas/main.md",
      sha256: digestText("# Main\n"),
      disposition: "non_ui_material",
      fact_refs: factKeys,
      basis_refs: ["fixture-architecture"],
      rationale: "The owning Context is classified and bound.",
    },
  ];
  const familyDispositions = SEMANTIC_FACT_STANDARD_FAMILIES.map(
    (family) => ({
      key: familyKey(family),
      family,
      standard: true,
      disposition:
        family === "goal_scope_glossary"
          ? "applicable"
          : "not_applicable",
      outcome_refs: outcomeKeys,
      source_item_refs: ["fixture-architecture"],
      basis_refs: ["fixture-architecture"],
      rationale:
        family === "goal_scope_glossary"
          ? "The fixture exposes one observable outcome Fact per Outcome."
          : "The bounded fixture Source explicitly excludes this standard family.",
    }),
  );
  const subjects = outcomeKeys.map((outcome) => ({
    key: unitKey(outcome),
    family_ref: familyKey("goal_scope_glossary"),
    outcome_ref: outcome,
    kind: "outcome",
    parent_ref: null,
    owner_ref: null,
    source_item_refs: [`${outcome}-observable`, "fixture-architecture"],
    basis_refs: [`${outcome}-observable`, "fixture-architecture"],
  }));
  const axisDispositions = SEMANTIC_FACT_STANDARD_CONDITION_AXES.map(
    (axis) => ({
      key: axisKey(axis),
      axis,
      standard: true,
      disposition: "not_applicable",
      outcome_refs: outcomeKeys,
      values: [],
      source_item_refs: ["fixture-architecture"],
      basis_refs: ["fixture-architecture"],
      rationale:
        "The bounded fixture has no condition variation on this axis.",
    }),
  );
  const conditions = outcomeKeys.map((outcome) => ({
    key: conditionKey(outcome),
    outcome_ref: outcome,
    axis_values: [],
    source_item_refs: [`${outcome}-observable`, "fixture-architecture"],
    basis_refs: [`${outcome}-observable`, "fixture-architecture"],
  }));
  const familyUnits = subjects.map((item) => item.key);
  const propertyDispositions =
    SEMANTIC_FACT_STANDARD_PROPERTIES.goal_scope_glossary.map((property) => {
      const applicable = property === "observable_outcome";
      return {
        key: propertyKey(property),
        family_ref: familyKey("goal_scope_glossary"),
        property,
        standard: true,
        value_kind: "boolean",
        required_methods: applicable ? ["exact_value"] : [],
        required_evidence_capabilities: applicable ? ["semantic_fact"] : [],
        applicable_unit_refs: applicable ? familyUnits : [],
        not_applicable_unit_refs: applicable ? [] : familyUnits,
        decision_required_unit_refs: [],
        unavailable_unit_refs: [],
        condition_refs: applicable
          ? outcomeKeys.map((outcome) => conditionKey(outcome))
          : [],
        source_item_refs: ["fixture-architecture"],
        basis_refs: ["fixture-architecture"],
        rationale: applicable
          ? "Each fixture Outcome has one exact observable-result Fact."
          : "The bounded fixture Source explicitly marks this property inapplicable.",
      };
    });
  const factCells = outcomeKeys.map((outcome) => ({
    key: `cell.${outcome}.observable`,
    outcome_ref: outcome,
    unit_ref: unitKey(outcome),
    condition_ref: conditionKey(outcome),
    property_ref: propertyKey("observable_outcome"),
    disposition: "specified",
    fact_ref: `fact.${outcome}.observable`,
    source_item_refs: [`${outcome}-observable`, "fixture-architecture"],
    basis_refs: [`${outcome}-observable`, "fixture-architecture"],
    rationale: "The observable outcome property is specified.",
  }));
  const { facts, proofObligations, environments, oracles } =
    fixtureSemanticFactRecords({
      outcomeKeys,
      manifestKey,
      inputs,
      externalConfirmation: options.externalConfirmation,
    });
  const manifest = {
    schema_version: "semantic-fact-manifest-v1",
    key: manifestKey,
    scope: {
      outcome_refs: outcomeKeys,
      source_item_refs: sourceItemKeys,
      exclusions: [],
    },
    inspector: {
      trust: "named_external_tcb",
      identity: "fixture-semantic-inspector",
      version: "1.0.0",
      implementation_sha256: null,
      capabilities: [...SEMANTIC_FACT_REQUIRED_INSPECTOR_CAPABILITIES],
      traversal: "complete_enumeration",
      dynamic_discovery: "fully_enumerated",
      census: [],
    },
    generation: {
      strategy: "complete_explicit",
      sampling: "forbidden",
      truncation: "forbidden",
      chunk_count: 1,
      chunk_indexes: [0],
      collections: [],
    },
    inputs,
    family_dispositions: familyDispositions,
    subjects,
    relations: [],
    populations: [],
    axis_dispositions: axisDispositions,
    condition_rules: [],
    conditions,
    condition_exclusions: [],
    property_dispositions: propertyDispositions,
    fact_cells: factCells,
    facts,
    proof_obligations: proofObligations,
    oracles,
    environments,
    blockers: [],
  };
  return refreshFixtureSemanticManifest(manifest);
}
