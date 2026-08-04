import assert from "node:assert/strict";
import test from "node:test";
import {
  validateSemanticFactManifestPolicy,
} from "../../packages/ty-context/dist/lib/semantic-fact-policy.js";
import {
  fixtureSemanticManifest,
  refreshFixtureSemanticManifest,
} from "./long-task-delivery-fixtures.mjs";
import {
  addFixtureCustomConditionAxis,
  digestValue,
  readRepositoryFile,
} from "./long-task-semantic-fact-test-support.mjs";

test("non-UI semantic completeness guidance is source, workflow, engineering and distribution complete", async () => {
  const paths = [
    "PROJECT_SPEC.md",
    "README.md",
    "README.zh-CN.md",
    "packages/ty-context/README.md",
    "docs/non-ui-semantic-fact-completeness.md",
    ".codex/ty-context-managed/agents/AGENTS_CORE.md",
    ".codex/ty-context-managed/skills/context_product_plan/SKILL.md",
    ".codex/ty-context-managed/skills/context_development_engineer/SKILL.md",
    ".codex/ty-context-managed/skills/long-task-workflow/SKILL.md",
    ".codex/ty-context-managed/skills/long-task-workflow/references/source-authoring.md",
    ".codex/ty-context-managed/skills/long-task-workflow/references/contract-authoring.md",
    ".codex/ty-context-managed/skills/long-task-workflow/references/evidence-design.md",
    ".codex/ty-context-managed/skills/long-task-workflow/references/authority-lifecycle.md",
    "packages/ty-context/assets/agents/AGENTS_CORE.md",
    "packages/ty-context/assets/skills/context_product_plan/SKILL.md",
    "packages/ty-context/assets/skills/context_development_engineer/SKILL.md",
    "packages/ty-context/assets/skills/long-task-workflow/SKILL.md",
  ];
  const documents = await Promise.all(paths.map(readRepositoryFile));
  const combined = documents.join("\n");
  for (const [pathName, content] of paths.map((pathName, index) => [
    pathName,
    documents[index],
  ]))
    assert.match(
      content,
      /semantic-fact-manifest-v1|非 UI 语义完整性|Non-UI Semantic Completeness|Non-UI Source And Assurance Boundary|Non-UI Semantic Implementation|non-UI (?:semantic Fact|meaning)|semantic-fact granularity/iu,
      pathName,
    );
  assert.match(
    combined,
    /business[\s\S]*API[\s\S]*schema[\s\S]*concurrency[\s\S]*security[\s\S]*(?:deployment|operations)/iu,
  );
  assert.match(
    combined,
    /Expected Semantic Facts[\s\S]*Source Indexed Facts[\s\S]*(?:Contract Indexed Facts|implementation\/acceptance accounted Facts)/iu,
  );
  assert.match(
    combined,
    /Fact\s*[×x]\s*required-method[\s\S]*(?:current|Final-Gate)[\s\S]*(?:result rows|results)/iu,
  );
  assert.match(
    combined,
    /ordinary Material Source[\s\S]*(?:cannot|must not)[\s\S]*supporting-only/iu,
  );
  assert.match(
    combined,
    /default[\s\S]*(?:does not maintain|creates no|不维护|不创建)[\s\S]*(?:exact Fact|stable Fact|精确 Fact|稳定 Fact)[\s\S]*(?:ledger|set equality|账本|集合等式)/iu,
  );
  assert.match(
    combined,
    /Long-Task[\s\S]*semantic-fact-manifest-v1[\s\S]*(?:Final Gate|最终 Gate)/iu,
  );
  assert.match(
    combined,
    /cannot discover[\s\S]*(?:unexpressed|unstated|never expressed)[\s\S]*(?:Inspector|Oracle)/iu,
  );
});

test("custom applicable family, property and condition axis extend rather than bypass the standard floor", () => {
  const manifest = fixtureSemanticManifest();
  const customAxis = addFixtureCustomConditionAxis(manifest);
  const condition = manifest.conditions[0];

  const family = {
    key: "family.custom.delivery-policy",
    family: "custom.delivery_policy",
    standard: false,
    disposition: "applicable",
    outcome_refs: ["first"],
    source_item_refs: ["fixture-architecture"],
    basis_refs: ["fixture-architecture"],
    rationale: "The Source introduces a domain-specific delivery policy.",
  };
  const subject = {
    key: "subject.custom.delivery-policy",
    family_ref: family.key,
    outcome_ref: "first",
    kind: "delivery_policy",
    parent_ref: null,
    owner_ref: null,
    source_item_refs: ["fixture-architecture"],
    basis_refs: ["fixture-architecture"],
  };
  const property = {
    key: "property.custom.delivery-policy.enabled",
    family_ref: family.key,
    property: "custom.enabled",
    standard: false,
    value_kind: "boolean",
    required_methods: ["exact_value"],
    required_evidence_capabilities: ["semantic_fact"],
    applicable_unit_refs: [subject.key],
    not_applicable_unit_refs: [],
    decision_required_unit_refs: [],
    unavailable_unit_refs: [],
    condition_refs: [condition.key],
    source_item_refs: ["fixture-architecture"],
    basis_refs: ["fixture-architecture"],
    rationale: "The custom policy has one independently decidable property.",
  };
  const factIndex = manifest.facts.length;
  const proofIndex = manifest.proof_obligations.length;
  const fact = {
    key: "fact.custom.delivery-policy.enabled",
    cell_ref: "cell.custom.delivery-policy.enabled",
    outcome_ref: "first",
    unit_ref: subject.key,
    family_ref: family.key,
    condition_ref: condition.key,
    property_ref: property.key,
    owner_ref: "owner.fixture",
    value_kind: "boolean",
    observation_scope: "service_boundary",
    observation_sensitivity: "plain",
    quantifier: {
      kind: "one",
      minimum: null,
      maximum: null,
      population_ref: null,
    },
    expected: {
      representation: "inline",
      locator: {
        material_ref: manifest.key,
        kind: "manifest_pointer",
        value: `/facts/${factIndex}/expected/value`,
      },
      sha256: digestValue(true),
      value: true,
    },
    provenance: {
      kind: "direct",
      authority_ref: "fixture-architecture",
      basis_refs: ["fixture-architecture"],
      derivation: null,
    },
    source_item_refs: ["fixture-architecture"],
  };
  const cell = {
    key: fact.cell_ref,
    outcome_ref: "first",
    unit_ref: subject.key,
    condition_ref: condition.key,
    property_ref: property.key,
    disposition: "specified",
    fact_ref: fact.key,
    source_item_refs: ["fixture-architecture"],
    basis_refs: ["fixture-architecture"],
    rationale: "The custom property is exactly specified.",
  };
  const proof = {
    key: "proof.custom.delivery-policy.enabled.exact",
    fact_ref: fact.key,
    method: "exact_value",
    authority: "machine",
    proof_surface: "runtime_behavior",
    evidence_capabilities: ["semantic_fact"],
    comparison: {
      comparator: "exact_value",
      mode: "exact",
      parameters: {
        representation: "inline",
        locator: {
          material_ref: manifest.key,
          kind: "manifest_pointer",
          value: `/proof_obligations/${proofIndex}/comparison/parameters/value`,
        },
        sha256: digestValue({ comparator: "exact_value" }),
        value: { comparator: "exact_value" },
      },
      tolerance: null,
      mask: null,
    },
    oracle_ref: "oracle.fixture-semantic",
    environment_ref: "environment.fixture",
    observer_refs: [],
    counterfactual: {
      disposition: "required",
      refs: ["remove-first-state"],
      basis_refs: ["fixture-architecture"],
      rationale: "The custom production carrier must remain sensitivity-tested.",
    },
  };
  manifest.family_dispositions.push(family);
  manifest.subjects.push(subject);
  manifest.property_dispositions.push(property);
  manifest.fact_cells.push(cell);
  manifest.facts.push(fact);
  manifest.proof_obligations.push(proof);
  manifest.inputs
    .find((item) => item.source_ref === "fixture-architecture")
    .fact_refs.push(fact.key);
  refreshFixtureSemanticManifest(manifest);

  assert.doesNotThrow(() => validateSemanticFactManifestPolicy(manifest));
});
