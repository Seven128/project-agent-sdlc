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
import { fixtureSemanticFactRecords } from "./long-task-semantic-records-fixture.mjs";
import { executionTargetSourceStatement } from "../../packages/ty-context/dist/lib/long-task-source-target-index.js";
import { deriveMaterialSourceFragments } from "../../packages/ty-context/dist/lib/long-task-source-fragments.js";

export const fixtureSourceStatements = {
  "first-observable": "The first outcome must be observable.",
  "second-observable": "The second outcome must be observable.",
  "fixture-architecture":
    "Preserve the fixture state owner and verifier boundary.",
  "fixture-external": "Confirm the fixture in external delivery.",
  "fixture-external-compatible":
    "The product acceptance owner must separately authorize fixture delivery compatibility.",
  "fixture-external-owner":
    "The architecture acceptance owner must authorize the fixture architecture decision.",
  "fixture-external-environment":
    "The product acceptance owner must authorize fixture delivery in the alternate environment.",
};

export const FIXTURE_ARCHITECTURE_FACT_KEY = "fact.first.architecture-boundary";
export const FIXTURE_ARCHITECTURE_CELL_KEY = "cell.first.architecture-boundary";
export const FIXTURE_ARCHITECTURE_PROOF_KEY =
  "proof.first.architecture-boundary.exact";
export const FIXTURE_ARCHITECTURE_SUBJECT_KEY =
  "subject.first.fixture-architecture";
export const FIXTURE_ARCHITECTURE_FACT_SPECS = [
  {
    outcomeKey: "first",
    factKey: FIXTURE_ARCHITECTURE_FACT_KEY,
    cellKey: FIXTURE_ARCHITECTURE_CELL_KEY,
    proofKey: FIXTURE_ARCHITECTURE_PROOF_KEY,
    subjectKey: FIXTURE_ARCHITECTURE_SUBJECT_KEY,
  },
  {
    outcomeKey: "second",
    factKey: "fact.second.architecture-boundary",
    cellKey: "cell.second.architecture-boundary",
    proofKey: "proof.second.architecture-boundary.exact",
    subjectKey: "subject.second.fixture-architecture",
  },
];
export const FIXTURE_EXTERNAL_FACT_SPECS = [
  {
    outcomeKey: "first",
    sourceKey: "fixture-external",
    confirmationKey: "fixture-external",
    factKey: "fact.first.external-confirmation",
    cellKey: "cell.first.external-confirmation",
    proofKey: "proof.first.external-confirmation.exact",
    subjectKey: "subject.first.external-confirmation",
  },
  {
    outcomeKey: "first",
    sourceKey: "fixture-external-compatible",
    confirmationKey: "fixture-external-compatible",
    factKey: "fact.first.external-confirmation-compatible",
    cellKey: "cell.first.external-confirmation-compatible",
    proofKey: "proof.first.external-confirmation-compatible.exact",
    subjectKey: "subject.first.external-confirmation-compatible",
  },
  {
    outcomeKey: "first",
    sourceKey: "fixture-external-owner",
    confirmationKey: "fixture-external-owner",
    factKey: "fact.first.external-confirmation-owner",
    cellKey: "cell.first.external-confirmation-owner",
    proofKey: "proof.first.external-confirmation-owner.exact",
    subjectKey: "subject.first.external-confirmation-owner",
  },
  {
    outcomeKey: "first",
    sourceKey: "fixture-external-environment",
    confirmationKey: "fixture-external-environment",
    factKey: "fact.first.external-confirmation-environment",
    cellKey: "cell.first.external-confirmation-environment",
    proofKey: "proof.first.external-confirmation-environment.exact",
    subjectKey: "subject.first.external-confirmation-environment",
  },
];
export const FIXTURE_EXTERNAL_FACT_KEY = FIXTURE_EXTERNAL_FACT_SPECS[0].factKey;
export const FIXTURE_EXTERNAL_CELL_KEY = FIXTURE_EXTERNAL_FACT_SPECS[0].cellKey;
export const FIXTURE_EXTERNAL_PROOF_KEY =
  FIXTURE_EXTERNAL_FACT_SPECS[0].proofKey;
export const FIXTURE_EXTERNAL_SUBJECT_KEY =
  FIXTURE_EXTERNAL_FACT_SPECS[0].subjectKey;

export function fixtureArchitectureFactSpecs(options = {}) {
  return FIXTURE_ARCHITECTURE_FACT_SPECS.slice(0, options.twoOutcomes ? 2 : 1);
}

export function fixtureExternalFactSpecs(options = {}) {
  if (!options.externalConfirmation) return [];
  const outcomeKeys = options.twoOutcomes ? ["first", "second"] : ["first"];
  return FIXTURE_EXTERNAL_FACT_SPECS.slice(
    0,
    options.externalConfirmationCount ?? 1,
  ).flatMap((external) =>
    outcomeKeys.map((outcomeKey) =>
      outcomeKey === "first"
        ? { ...external }
        : {
            ...external,
            outcomeKey,
            factKey: external.factKey.replace(".first.", `.${outcomeKey}.`),
            cellKey: external.cellKey.replace(".first.", `.${outcomeKey}.`),
            proofKey: external.proofKey.replace(".first.", `.${outcomeKey}.`),
            subjectKey: external.subjectKey.replace(
              ".first.",
              `.${outcomeKey}.`,
            ),
          },
    ),
  );
}

export function fixtureSemanticManifest(options = {}) {
  const outcomeKeys = options.twoOutcomes ? ["first", "second"] : ["first"];
  const factKeys = outcomeKeys.map((key) => `fact.${key}.observable`);
  const architectureFacts = fixtureArchitectureFactSpecs(options);
  const architectureFactKeys = architectureFacts.map((item) => item.factKey);
  const externalConfirmations = options.externalConfirmation
    ? FIXTURE_EXTERNAL_FACT_SPECS.slice(
        0,
        options.externalConfirmationCount ?? 1,
      )
    : [];
  const externalFacts = fixtureExternalFactSpecs(options);
  const sourceItemKeys = [
    "first-observable",
    ...(options.twoOutcomes ? ["second-observable"] : []),
    "fixture-architecture",
    ...(options.executionTarget ? ["fixture-execution-target"] : []),
    ...externalConfirmations.map((item) => item.sourceKey),
  ];
  const manifestKey = "fixture-semantic-facts";
  const familyKey = (family) => `family.${family.replaceAll("_", "-")}`;
  const axisKey = (axis) => `axis.${axis.replaceAll("_", "-")}`;
  const propertyKey = (property) => `property.${property.replaceAll("_", "-")}`;
  const conditionKey = (outcome) => `condition.${outcome}.baseline`;
  const unitKey = (outcome) => `subject.${outcome}.outcome`;
  const sourceFacts = (sourceKey) => {
    if (sourceKey === "first-observable") return ["fact.first.observable"];
    if (sourceKey === "second-observable") return ["fact.second.observable"];
    if (sourceKey === "fixture-architecture") return architectureFactKeys;
    if (sourceKey === "fixture-execution-target") return factKeys;
    const external = externalFacts.filter(
      (item) => item.sourceKey === sourceKey,
    );
    if (external.length) return external.map((item) => item.factKey);
    return [];
  };
  const inputs = [
    ...sourceItemKeys.map((sourceKey) => ({
      key: `input.${sourceKey}`,
      kind: "source_item",
      source_ref: sourceKey,
      sha256: digestText(
        sourceKey === "fixture-execution-target"
          ? executionTargetSourceStatement(options.executionTarget)
          : fixtureSourceStatements[sourceKey],
      ),
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
      fact_refs: architectureFactKeys,
      basis_refs: ["fixture-architecture"],
      rationale: "The full Context snapshot is classified and bound.",
    },
    {
      key: "input.context-architecture",
      kind: "context",
      source_ref: "project_context/architecture.md",
      sha256: digestText("# Architecture\n"),
      disposition: "non_ui_material",
      fact_refs: architectureFactKeys,
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
      fact_refs: architectureFactKeys,
      basis_refs: ["fixture-architecture"],
      rationale: "The full Context graph manifest is classified and bound.",
    },
    {
      key: "input.context-main",
      kind: "context",
      source_ref: "project_context/areas/main.md",
      sha256: digestText("# Main\n"),
      disposition: "non_ui_material",
      fact_refs: architectureFactKeys,
      basis_refs: ["fixture-architecture"],
      rationale: "The owning Context is classified and bound.",
    },
  ];
  const familyDispositions = SEMANTIC_FACT_STANDARD_FAMILIES.map((family) => {
    const externalApplicable =
      family === "external_integration" && options.externalConfirmation;
    const sourceRefs = externalApplicable
      ? externalConfirmations.map((item) => item.sourceKey)
      : ["fixture-architecture"];
    return {
      key: familyKey(family),
      family,
      standard: true,
      disposition:
        ["goal_scope_glossary", "architecture_ownership"].includes(family) ||
        externalApplicable
          ? "applicable"
          : "not_applicable",
      outcome_refs: outcomeKeys,
      source_item_refs: sourceRefs,
      basis_refs: sourceRefs,
      rationale:
        family === "goal_scope_glossary"
          ? "The fixture exposes one observable outcome Fact per Outcome."
          : family === "architecture_ownership"
            ? "The fixture exposes one exact technical architecture boundary Fact."
            : externalApplicable
              ? "The fixture exposes one exact externally authorized acceptance Fact."
              : "The bounded fixture Source explicitly excludes this standard family.",
    };
  });
  const subjects = [
    ...outcomeKeys.map((outcome) => ({
      key: unitKey(outcome),
      family_ref: familyKey("goal_scope_glossary"),
      outcome_ref: outcome,
      kind: "outcome",
      parent_ref: null,
      owner_ref: null,
      source_item_refs: [`${outcome}-observable`, "fixture-architecture"],
      basis_refs: [`${outcome}-observable`, "fixture-architecture"],
    })),
    ...architectureFacts.map((architecture) => ({
      key: architecture.subjectKey,
      family_ref: familyKey("architecture_ownership"),
      outcome_ref: architecture.outcomeKey,
      kind: "architecture_boundary",
      parent_ref: null,
      owner_ref: "owner.fixture",
      source_item_refs: ["fixture-architecture"],
      basis_refs: ["fixture-architecture"],
    })),
    ...externalFacts.map((external) => ({
      key: external.subjectKey,
      family_ref: familyKey("external_integration"),
      outcome_ref: external.outcomeKey,
      kind: "external_acceptance_decision",
      parent_ref: null,
      owner_ref: `owner.${external.sourceKey}`,
      source_item_refs: [external.sourceKey],
      basis_refs: [external.sourceKey],
    })),
  ];
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
      rationale: "The bounded fixture has no condition variation on this axis.",
    }),
  );
  const conditions = outcomeKeys.map((outcome) => ({
    key: conditionKey(outcome),
    outcome_ref: outcome,
    axis_values: [],
    source_item_refs: [`${outcome}-observable`, "fixture-architecture"],
    basis_refs: [`${outcome}-observable`, "fixture-architecture"],
  }));
  const goalFamilyUnits = subjects
    .filter((item) => item.family_ref === familyKey("goal_scope_glossary"))
    .map((item) => item.key);
  const propertyDispositions = [
    ...SEMANTIC_FACT_STANDARD_PROPERTIES.goal_scope_glossary.map((property) => {
      const applicable = property === "observable_outcome";
      return {
        key: propertyKey(property),
        family_ref: familyKey("goal_scope_glossary"),
        property,
        standard: true,
        value_kind: "boolean",
        required_methods: applicable ? ["exact_value"] : [],
        required_evidence_capabilities: applicable ? ["semantic_fact"] : [],
        applicable_unit_refs: applicable ? goalFamilyUnits : [],
        not_applicable_unit_refs: applicable ? [] : goalFamilyUnits,
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
    }),
    ...SEMANTIC_FACT_STANDARD_PROPERTIES.architecture_ownership.map(
      (property) => {
        const applicable = property === "state_boundary";
        return {
          key: propertyKey(property),
          family_ref: familyKey("architecture_ownership"),
          property,
          standard: true,
          value_kind: "boolean",
          required_methods: applicable ? ["exact_value"] : [],
          required_evidence_capabilities: applicable ? ["semantic_fact"] : [],
          applicable_unit_refs: applicable
            ? architectureFacts.map((item) => item.subjectKey)
            : [],
          not_applicable_unit_refs: applicable
            ? []
            : architectureFacts.map((item) => item.subjectKey),
          decision_required_unit_refs: [],
          unavailable_unit_refs: [],
          condition_refs: applicable
            ? outcomeKeys.map((outcome) => conditionKey(outcome))
            : [],
          source_item_refs: ["fixture-architecture"],
          basis_refs: ["fixture-architecture"],
          rationale: applicable
            ? "The fixture state-owner and verifier boundary is one exact technical invariant."
            : "The bounded architecture Source marks this property inapplicable.",
        };
      },
    ),
    ...(options.externalConfirmation
      ? SEMANTIC_FACT_STANDARD_PROPERTIES.external_integration.map(
          (property) => {
            const applicable = property === "external_confirmation";
            return {
              key: propertyKey(property),
              family_ref: familyKey("external_integration"),
              property,
              standard: true,
              value_kind: "boolean",
              required_methods: applicable ? ["exact_value"] : [],
              required_evidence_capabilities: applicable
                ? ["semantic_fact"]
                : [],
              applicable_unit_refs: applicable
                ? externalFacts.map((item) => item.subjectKey)
                : [],
              not_applicable_unit_refs: applicable
                ? []
                : externalFacts.map((item) => item.subjectKey),
              decision_required_unit_refs: [],
              unavailable_unit_refs: [],
              condition_refs: applicable
                ? outcomeKeys.map((outcome) => conditionKey(outcome))
                : [],
              source_item_refs: externalConfirmations.map(
                (item) => item.sourceKey,
              ),
              basis_refs: externalConfirmations.map((item) => item.sourceKey),
              rationale: applicable
                ? "The fixture requires one exact authenticated external acceptance decision."
                : "The bounded external Source marks this property inapplicable.",
            };
          },
        )
      : []),
  ];
  const factCells = [
    ...outcomeKeys.map((outcome) => ({
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
    })),
    ...architectureFacts.map((architecture) => ({
      key: architecture.cellKey,
      outcome_ref: architecture.outcomeKey,
      unit_ref: architecture.subjectKey,
      condition_ref: conditionKey(architecture.outcomeKey),
      property_ref: propertyKey("state_boundary"),
      disposition: "specified",
      fact_ref: architecture.factKey,
      source_item_refs: ["fixture-architecture"],
      basis_refs: ["fixture-architecture"],
      rationale:
        "The fixture architecture boundary is specified independently.",
    })),
    ...externalFacts.map((external) => ({
      key: external.cellKey,
      outcome_ref: external.outcomeKey,
      unit_ref: external.subjectKey,
      condition_ref: conditionKey(external.outcomeKey),
      property_ref: propertyKey("external_confirmation"),
      disposition: "specified",
      fact_ref: external.factKey,
      source_item_refs: [external.sourceKey],
      basis_refs: [external.sourceKey],
      rationale:
        "The external acceptance decision is specified independently from objective product behavior.",
    })),
  ];
  const { facts, proofObligations, environments, oracles } =
    fixtureSemanticFactRecords({
      outcomeKeys,
      manifestKey,
      inputs,
      architectureFacts: architectureFacts.map((architecture) => ({
        ...architecture,
        familyKey: familyKey("architecture_ownership"),
        conditionKey: conditionKey(architecture.outcomeKey),
        propertyKey: propertyKey("state_boundary"),
      })),
      externalFacts: externalFacts.map((external) => ({
        ...external,
        familyKey: familyKey("external_integration"),
        conditionKey: conditionKey(external.outcomeKey),
        propertyKey: propertyKey("external_confirmation"),
      })),
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
  if (options.explicitFragments !== false)
    addFixtureFragmentProjections(
      manifest,
      sourceItemKeys,
      sourceFacts,
      options,
    );
  return refreshFixtureSemanticManifest(manifest);
}

function addFixtureFragmentProjections(
  manifest,
  sourceItemKeys,
  sourceFacts,
  options,
) {
  for (const sourceKey of sourceItemKeys) {
    const text =
      sourceKey === "fixture-execution-target"
        ? executionTargetSourceStatement(options.executionTarget)
        : fixtureSourceStatements[sourceKey];
    const item = {
      key: sourceKey,
      kind:
        sourceKey === "fixture-architecture" ||
        sourceKey === "fixture-execution-target"
          ? "technical_obligation"
          : sourceKey.startsWith("fixture-external")
            ? "external_confirmation"
            : "requirement",
      source_path: "source.md",
      normalized_text: text,
      text_sha256: digestText(text),
    };
    for (const fragment of deriveMaterialSourceFragments(item)) {
      const key = `input.fragment.${sourceKey}.${fragment.ordinal}`;
      const factRefs = sourceFacts(sourceKey);
      manifest.inputs.push({
        key,
        kind: "source_fragment",
        source_ref: fragment.key,
        sha256: fragment.text_sha256,
        disposition:
          sourceKey === "first-observable" ||
          sourceKey === "second-observable" ||
          sourceKey === "fixture-architecture" ||
          sourceKey.startsWith("fixture-external")
            ? "fact_bearing"
            : "supporting_basis",
        fact_refs: factRefs,
        basis_refs: [sourceKey],
        rationale:
          "The fixture explicitly dispositions this complete material Fragment.",
      });
      for (const factRef of factRefs) {
        const fact = manifest.facts.find(
          (candidate) => candidate.key === factRef,
        );
        if (fact && !fact.provenance.basis_refs.includes(key))
          fact.provenance.basis_refs.push(key);
      }
    }
  }
}
