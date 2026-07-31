import { DESIGN_RESOURCE_STANDARD_PROPERTIES } from "../../packages/ty-context/dist/lib/design-resource-fact-manifest-catalog.js";
import { compileSymbolicDenotation } from "../../packages/ty-context/dist/lib/symbolic-denotation-engine.js";
import {
  designResourceSymbolicCertificateKey,
  designResourceSymbolicCombinedRuleDigest,
  designResourceSymbolicDependencyEdge,
  designResourceSymbolicRuleKey,
} from "../../packages/ty-context/dist/lib/design-resource-symbolic-fact-validation.js";
import {
  buildFixtureObligations,
  fixtureCensusRow,
  fixtureOneQuantifier,
  fixtureRuleInput,
} from "./design-resource-symbolic-handoff-fixture-builders.mjs";
import {
  SYMBOLIC_SOURCE_ITEM_KEY,
  SYMBOLIC_TARGET_KEY,
} from "./design-resource-symbolic-handoff-fixture-constants.mjs";
import {
  fixtureSha,
  fixtureStableJson,
} from "./design-resource-symbolic-handoff-fixture-support.mjs";

export function buildSymbolicFixtureModel(resourcesWithoutManifest, values) {
  const domains = [
    {
      key: "condition.color-scheme",
      kind: "enum",
      values: ["light", "dark"],
    },
    {
      key: "variation.state",
      kind: "enum",
      values: ["idle", "active"],
    },
  ];
  const reachable = {
    op: "in",
    axis_ref: "condition.color-scheme",
    values: ["light", "dark"],
  };
  const properties = DESIGN_RESOURCE_STANDARD_PROPERTIES.map((property) => ({
    ...structuredClone(property),
    census_refs:
      property.key === "geometry.width"
        ? ["census.property.width"]
        : property.key === "color.background"
          ? ["census.property.background"]
          : [],
  }));
  const located = (pointer, raw) => ({
    locator: {
      resource_ref: "resource.values",
      kind: "json_pointer",
      value: pointer,
    },
    sha256: fixtureSha(
      typeof raw === "string" ? raw : fixtureStableJson(raw),
    ),
  });
  const parameters = located("/parameters", values.parameters);
  const environmentDefinition = located("/environment", values.environment);
  const rules = [
    fixtureRuleInput(
      "geometry.width",
      "length",
      located("/width", values.width),
      ["census.subject.root", "census.property.width"],
    ),
    fixtureRuleInput(
      "color.background",
      "color",
      located("/background", values.background),
      ["census.subject.root", "census.property.background"],
    ),
  ].map((input) => {
    const compiled = compileSymbolicDenotation(domains, input.region);
    const key = designResourceSymbolicRuleKey(
      input,
      compiled.canonical_sha256,
    );
    return {
      rule: { key, ...input, semantic_obligation_refs: [] },
      compiled,
    };
  });
  const obligations = buildFixtureObligations(
    rules,
    properties,
    parameters,
  );
  const dependencyEdges = rules.flatMap((projection) =>
    projection.compiled.omitted_axis_refs.map((axisRef) =>
      designResourceSymbolicDependencyEdge(axisRef, projection.rule.key),
    ),
  );
  const certificateInput = {
    fact_rule_refs: rules.map((item) => item.rule.key),
    omitted_axis_refs: [
      ...new Set(rules.flatMap((item) => item.compiled.omitted_axis_refs)),
    ].sort(),
    dependency_edge_refs: dependencyEdges.map((item) => item.key).sort(),
    canonical_rule_dag_sha256: designResourceSymbolicCombinedRuleDigest(
      rules.map((item) => ({
        rule: item.rule,
        compiled_region: item.compiled,
      })),
    ),
  };
  const certificate = {
    key: designResourceSymbolicCertificateKey(certificateInput),
    ...certificateInput,
  };
  const allCapabilities = [
    ...new Set(
      rules.flatMap(
        (projection) =>
          properties.find(
            (property) => property.key === projection.rule.property_ref,
          ).inspector_capability_refs,
      ),
    ),
  ].sort();
  const census = [
    fixtureCensusRow(
      "census.subject.root",
      "node",
      "resource.page",
      "html_selector",
      "#root",
      rules.map((item) => item.rule.key),
    ),
    fixtureCensusRow(
      "census.property.width",
      "declaration",
      "resource.values",
      "json_pointer",
      "/width",
      [rules[0].rule.key],
    ),
    fixtureCensusRow(
      "census.property.background",
      "declaration",
      "resource.values",
      "json_pointer",
      "/background",
      [rules[1].rule.key],
    ),
  ];
  const dispositions = properties
    .filter(
      (property) =>
        property.key !== "geometry.width" &&
        property.key !== "color.background",
    )
    .map((property) => ({
      key: `disposition.surface-root.${property.key}`,
      subject_or_relation_ref: "surface.root",
      target_ref: SYMBOLIC_TARGET_KEY,
      property_ref: property.key,
      population_ref: null,
      quantifier: fixtureOneQuantifier(),
      region: structuredClone(reachable),
      disposition: "not_applicable",
      census_refs: ["census.subject.root"],
      source_item_refs: [SYMBOLIC_SOURCE_ITEM_KEY],
      basis_refs: [
        `package-policy.${property.key}.not-observed-on-fixture-surface`,
      ],
      rationale:
        "The package property remains in the applicability universe and this exact fixture surface carries a basis-backed not-applicable remainder.",
    }));
  const manifest = {
    schema_version: "design-resource-observable-rule-manifest-v2",
    scope_key: "symbolic-scope",
    target_key: SYMBOLIC_TARGET_KEY,
    inspector: {
      trust: "named_external_tcb",
      identity: "symbolic-fixture-inspector",
      version: "1.0.0",
      implementation_sha256: null,
      capability_refs: allCapabilities,
      entry_resource_ref: "resource.page",
      input_resources: resourcesWithoutManifest.map((item) => ({
        resource_ref: item.key,
        path: item.path,
        sha256: item.sha256,
      })),
      traversal: "complete_enumeration",
      dynamic_discovery: "fully_enumerated",
      census,
    },
    design_system: {
      disposition: "used",
      id: "symbolic-fixture-system",
      revision: "1",
      resource_ref: "resource.values",
      sha256: resourcesWithoutManifest[1].sha256,
    },
    axis_domains: domains,
    reachable_region: reachable,
    subjects: [
      {
        key: "surface.root",
        kind: "surface",
        stable_keys: ["surface.root"],
        target_refs: [SYMBOLIC_TARGET_KEY],
        parent_ref: null,
        instance_of_ref: null,
        slot_key: null,
        override_of_ref: null,
        family_ref: null,
        presence: "always",
        presence_rule_ref: null,
        population_ref: null,
        portal_host_ref: null,
        relation_endpoints: [],
        census_refs: ["census.subject.root"],
      },
    ],
    populations: [],
    properties,
    fact_rules: rules.map((item) => item.rule),
    disposition_regions: dispositions,
    semantic_proof_obligations: obligations,
    dependency_edges: dependencyEdges,
    noninterference_certificates: [certificate],
    oracles: [
      {
        key: "oracle.fixture",
        trust: "named_external_tcb",
        identity: "fixture-symbolic-oracle",
        version: "1.0.0",
        sha256: null,
        capability_refs: allCapabilities,
      },
    ],
    environments: [
      {
        key: "environment.fixture",
        identity: "fixture-browser-environment",
        definition: environmentDefinition,
      },
    ],
    acceptance_blockers: [],
  };
  return { manifest, rules, certificate, dependencyEdges };
}
