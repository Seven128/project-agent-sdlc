import {
  parseSemanticFactAxisDispositions,
  parseSemanticFactConditionExclusions,
  parseSemanticFactConditionRules,
  parseSemanticFactConditions,
} from "./semantic-fact-condition-shape.js";
import {
  parseSemanticFactCensus,
  parseSemanticFactFamilyDispositions,
  parseSemanticFactInputs,
} from "./semantic-fact-input-shape.js";
import {
  SEMANTIC_FACT_MANIFEST_COLLECTIONS,
  type SemanticFactManifestV1,
} from "./semantic-fact-types.js";
import {
  parseSemanticFactCells,
  parseSemanticFactPropertyDispositions,
} from "./semantic-fact-property-shape.js";
import {
  parseSemanticFactProofObligations,
  parseSemanticFacts,
} from "./semantic-fact-proof-shape.js";
import {
  semanticArray,
  semanticInteger,
  semanticLiteral,
  semanticNullableSha256,
  semanticObject,
  semanticSha256,
  semanticStableRef,
  semanticStableRefs,
  semanticString,
} from "./semantic-fact-shape-primitives.js";
import {
  parseSemanticFactBlockers,
  parseSemanticFactEnvironments,
  parseSemanticFactOracles,
} from "./semantic-fact-support-shape.js";
import {
  parseSemanticFactPopulations,
  parseSemanticFactRelations,
  parseSemanticFactSubjects,
} from "./semantic-fact-unit-shape.js";
import { parseStrictYaml } from "./strict-codec.js";

export { parseSemanticFactLocatedValue } from "./semantic-fact-value-shape.js";

export function parseSemanticFactManifestYaml(
  content: string,
): SemanticFactManifestV1 {
  return parseSemanticFactManifestShape(parseStrictYaml(content));
}

export function parseSemanticFactManifestShape(
  value: unknown,
): SemanticFactManifestV1 {
  const label = "semantic_fact_manifest";
  const root = semanticObject(value, label, [
    "schema_version",
    "key",
    "scope",
    "inspector",
    "generation",
    "inputs",
    "family_dispositions",
    "subjects",
    "relations",
    "populations",
    "axis_dispositions",
    "condition_rules",
    "conditions",
    "condition_exclusions",
    "property_dispositions",
    "fact_cells",
    "facts",
    "proof_obligations",
    "oracles",
    "environments",
    "blockers",
  ]);
  const scope = semanticObject(root.scope, `${label}.scope`, [
    "outcome_refs",
    "source_item_refs",
    "exclusions",
  ]);
  const inspector = semanticObject(root.inspector, `${label}.inspector`, [
    "trust",
    "identity",
    "version",
    "implementation_sha256",
    "capabilities",
    "traversal",
    "dynamic_discovery",
    "census",
  ]);
  const generation = semanticObject(root.generation, `${label}.generation`, [
    "strategy",
    "sampling",
    "truncation",
    "chunk_count",
    "chunk_indexes",
    "collections",
  ]);
  return {
    schema_version: semanticLiteral(
      root.schema_version,
      ["semantic-fact-manifest-v1"] as const,
      `${label}.schema_version`,
    ),
    key: semanticStableRef(root.key, `${label}.key`),
    scope: {
      outcome_refs: semanticStableRefs(
        scope.outcome_refs,
        `${label}.scope.outcome_refs`,
      ),
      source_item_refs: semanticStableRefs(
        scope.source_item_refs,
        `${label}.scope.source_item_refs`,
      ),
      exclusions: semanticArray(
        scope.exclusions,
        `${label}.scope.exclusions`,
      ).map((item, index) => {
        const itemLabel = `${label}.scope.exclusions[${index}]`;
        const row = semanticObject(item, itemLabel, [
          "key",
          "statement",
          "affected_refs",
          "source_item_refs",
          "basis_refs",
          "rationale",
        ]);
        return {
          key: semanticStableRef(row.key, `${itemLabel}.key`),
          statement: semanticString(row.statement, `${itemLabel}.statement`),
          affected_refs: semanticStableRefs(
            row.affected_refs,
            `${itemLabel}.affected_refs`,
          ),
          source_item_refs: semanticStableRefs(
            row.source_item_refs,
            `${itemLabel}.source_item_refs`,
          ),
          basis_refs: semanticStableRefs(
            row.basis_refs,
            `${itemLabel}.basis_refs`,
          ),
          rationale: semanticString(row.rationale, `${itemLabel}.rationale`),
        };
      }),
    },
    inspector: {
      trust: semanticLiteral(
        inspector.trust,
        ["frozen_executable", "named_external_tcb"] as const,
        `${label}.inspector.trust`,
      ),
      identity: semanticString(
        inspector.identity,
        `${label}.inspector.identity`,
      ),
      version: semanticString(inspector.version, `${label}.inspector.version`),
      implementation_sha256: semanticNullableSha256(
        inspector.implementation_sha256,
        `${label}.inspector.implementation_sha256`,
      ),
      capabilities: semanticStableRefs(
        inspector.capabilities,
        `${label}.inspector.capabilities`,
      ),
      traversal: semanticLiteral(
        inspector.traversal,
        ["complete_enumeration"] as const,
        `${label}.inspector.traversal`,
      ),
      dynamic_discovery: semanticLiteral(
        inspector.dynamic_discovery,
        ["fully_enumerated"] as const,
        `${label}.inspector.dynamic_discovery`,
      ),
      census: parseSemanticFactCensus(
        inspector.census,
        `${label}.inspector.census`,
      ),
    },
    generation: {
      strategy: semanticLiteral(
        generation.strategy,
        ["complete_explicit"] as const,
        `${label}.generation.strategy`,
      ),
      sampling: semanticLiteral(
        generation.sampling,
        ["forbidden"] as const,
        `${label}.generation.sampling`,
      ),
      truncation: semanticLiteral(
        generation.truncation,
        ["forbidden"] as const,
        `${label}.generation.truncation`,
      ),
      chunk_count: semanticInteger(
        generation.chunk_count,
        `${label}.generation.chunk_count`,
        1,
      ),
      chunk_indexes: semanticArray(
        generation.chunk_indexes,
        `${label}.generation.chunk_indexes`,
      ).map((item, index) =>
        semanticInteger(item, `${label}.generation.chunk_indexes[${index}]`, 0),
      ),
      collections: semanticArray(
        generation.collections,
        `${label}.generation.collections`,
      ).map((item, index) => {
        const itemLabel = `${label}.generation.collections[${index}]`;
        const row = semanticObject(item, itemLabel, [
          "name",
          "expected_count",
          "identity_sha256",
        ]);
        return {
          name: semanticLiteral(
            row.name,
            SEMANTIC_FACT_MANIFEST_COLLECTIONS,
            `${itemLabel}.name`,
          ),
          expected_count: semanticInteger(
            row.expected_count,
            `${itemLabel}.expected_count`,
          ),
          identity_sha256: semanticSha256(
            row.identity_sha256,
            `${itemLabel}.identity_sha256`,
          ),
        };
      }),
    },
    inputs: parseSemanticFactInputs(root.inputs, `${label}.inputs`),
    family_dispositions: parseSemanticFactFamilyDispositions(
      root.family_dispositions,
      `${label}.family_dispositions`,
    ),
    subjects: parseSemanticFactSubjects(root.subjects, `${label}.subjects`),
    relations: parseSemanticFactRelations(root.relations, `${label}.relations`),
    populations: parseSemanticFactPopulations(
      root.populations,
      `${label}.populations`,
    ),
    axis_dispositions: parseSemanticFactAxisDispositions(
      root.axis_dispositions,
      `${label}.axis_dispositions`,
    ),
    condition_rules: parseSemanticFactConditionRules(
      root.condition_rules,
      `${label}.condition_rules`,
    ),
    conditions: parseSemanticFactConditions(
      root.conditions,
      `${label}.conditions`,
    ),
    condition_exclusions: parseSemanticFactConditionExclusions(
      root.condition_exclusions,
      `${label}.condition_exclusions`,
    ),
    property_dispositions: parseSemanticFactPropertyDispositions(
      root.property_dispositions,
      `${label}.property_dispositions`,
    ),
    fact_cells: parseSemanticFactCells(root.fact_cells, `${label}.fact_cells`),
    facts: parseSemanticFacts(root.facts, `${label}.facts`),
    proof_obligations: parseSemanticFactProofObligations(
      root.proof_obligations,
      `${label}.proof_obligations`,
    ),
    oracles: parseSemanticFactOracles(root.oracles, `${label}.oracles`),
    environments: parseSemanticFactEnvironments(
      root.environments,
      `${label}.environments`,
    ),
    blockers: parseSemanticFactBlockers(root.blockers, `${label}.blockers`),
  };
}
