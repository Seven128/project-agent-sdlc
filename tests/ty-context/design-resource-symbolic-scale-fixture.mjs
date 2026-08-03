import { createSymbolicDenotationCompilationSession } from "../../packages/ty-context/dist/lib/symbolic-denotation-engine.js";
import {
  SYMBOLIC_NONINTERFERENCE_ORACLE_IDENTITY,
  SYMBOLIC_NONINTERFERENCE_ORACLE_IMPLEMENTATION_SHA256,
  SYMBOLIC_NONINTERFERENCE_ORACLE_VERSION,
} from "../../packages/ty-context/dist/lib/design-resource-symbolic-noninterference-artifact.js";
import {
  designResourceSymbolicCertificateKey,
  designResourceSymbolicCombinedRuleDigest,
  designResourceSymbolicRuleKey,
} from "../../packages/ty-context/dist/lib/design-resource-symbolic-fact-validation.js";
import {
  buildFixtureObligations,
  fixtureCensusRow,
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
import { buildSymbolicScaleCatalog } from "./design-resource-symbolic-scale-fixture-catalog.mjs";
import { buildScaleStaticNoninterferenceProof } from "./design-resource-symbolic-scale-fixture-proof.mjs";

export {
  SYMBOLIC_SCALE_AXIS_COUNT,
  SYMBOLIC_SCALE_PROPERTY_COUNT,
  SYMBOLIC_SCALE_SUBJECT_COUNT,
  SYMBOLIC_SCALE_VARIATION_COUNT,
} from "./design-resource-symbolic-scale-fixture-catalog.mjs";

export function buildSymbolicScaleFixtureModel(
  resourcesWithoutManifest,
  values,
) {
  const { variations, domains, properties, subjects } =
    buildSymbolicScaleCatalog();
  const reachable = {
    op: "in",
    axis_ref: "variation.case",
    values: variations,
  };
  const ruleRegions = ["off", "on"].map((value) => ({
    op: "eq",
    axis_ref: "condition.axis-00",
    value,
  }));
  const compilation = createSymbolicDenotationCompilationSession(domains, [
    reachable,
    ...ruleRegions,
  ]);
  compilation.compile(reachable);
  const located = (pointer, raw) => ({
    locator: {
      resource_ref: "resource.values",
      kind: "json_pointer",
      value: pointer,
    },
    sha256: fixtureSha(typeof raw === "string" ? raw : fixtureStableJson(raw)),
  });
  const definitions = [
    {
      propertyRef: "geometry.width",
      valueKind: "length",
      expected: located("/width", values.width),
      censusRef: "census.property.width",
    },
    {
      propertyRef: "color.background",
      valueKind: "color",
      expected: located("/background", values.background),
      censusRef: "census.property.background",
    },
  ];
  const rules = subjects.flatMap((subject) =>
    definitions.flatMap((definition) =>
      ruleRegions.map((region) => {
        const compiledRegion = compilation.compile(region);
        const input = fixtureRuleInput(
          definition.propertyRef,
          definition.valueKind,
          definition.expected,
          ["census.subject.scale", definition.censusRef],
          structuredClone(region),
          subject.key,
        );
        const key = designResourceSymbolicRuleKey(
          input,
          compiledRegion.canonical_sha256,
        );
        return {
          rule: { key, ...input, semantic_obligation_refs: [] },
          compiled: compiledRegion,
        };
      }),
    ),
  );
  const parameters = located("/parameters", values.parameters);
  const obligations = buildFixtureObligations(rules, properties, parameters);
  const factRuleRefs = rules.map((item) => item.rule.key);
  const inputResourceRefs = resourcesWithoutManifest.map((item) => item.key);
  const certificateInput = {
    fact_rule_refs: factRuleRefs,
    omitted_axis_refs: [
      ...new Set(rules.flatMap((item) => item.compiled.omitted_axis_refs)),
    ].sort(),
    dependency_edge_refs: [],
    canonical_rule_dag_sha256: designResourceSymbolicCombinedRuleDigest(
      rules.map((item) => ({
        rule: item.rule,
        compiled_region: item.compiled,
      })),
    ),
    source_noninterference_proof: buildScaleStaticNoninterferenceProof(
      "source",
      inputResourceRefs,
    ),
    production_noninterference_proof: buildScaleStaticNoninterferenceProof(
      "production",
      inputResourceRefs,
    ),
  };
  const certificate = {
    key: designResourceSymbolicCertificateKey(certificateInput),
    ...certificateInput,
  };
  const census = [
    fixtureCensusRow(
      "census.subject.scale",
      "node",
      "resource.page",
      "html_selector",
      "#root",
      factRuleRefs,
    ),
    fixtureCensusRow(
      "census.property.width",
      "declaration",
      "resource.values",
      "json_pointer",
      "/width",
      rules
        .filter((item) => item.rule.property_ref === "geometry.width")
        .map((item) => item.rule.key),
    ),
    fixtureCensusRow(
      "census.property.background",
      "declaration",
      "resource.values",
      "json_pointer",
      "/background",
      rules
        .filter((item) => item.rule.property_ref === "color.background")
        .map((item) => item.rule.key),
    ),
  ];
  const allCapabilities = [
    ...new Set([
      "render_capture",
      ...definitions.flatMap(
        (definition) =>
          properties.find((item) => item.key === definition.propertyRef)
            .inspector_capability_refs,
      ),
    ]),
  ].sort();
  const manifest = {
    schema_version: "design-resource-observable-rule-manifest-v2",
    scope_key: "symbolic-scope",
    target_key: SYMBOLIC_TARGET_KEY,
    inspector: {
      trust: "named_external_tcb",
      identity: "symbolic-scale-fixture-inspector",
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
      id: "symbolic-scale-fixture-system",
      revision: "1",
      resource_ref: "resource.values",
      sha256: resourcesWithoutManifest[1].sha256,
    },
    axis_domains: domains,
    reachable_region: reachable,
    subjects,
    populations: [],
    properties,
    fact_rules: rules.map((item) => item.rule),
    disposition_regions: [],
    semantic_proof_obligations: obligations,
    dependency_edges: [],
    noninterference_certificates: [certificate],
    oracles: [
      {
        key: "oracle.fixture",
        trust: "frozen_executable",
        identity: SYMBOLIC_NONINTERFERENCE_ORACLE_IDENTITY,
        version: SYMBOLIC_NONINTERFERENCE_ORACLE_VERSION,
        sha256: SYMBOLIC_NONINTERFERENCE_ORACLE_IMPLEMENTATION_SHA256,
        capability_refs: [
          ...allCapabilities,
          "symbolic_noninterference.production.closed_world_static_dependency_closure",
          "symbolic_noninterference.source.closed_world_static_dependency_closure",
        ].sort(),
      },
    ],
    environments: [
      {
        key: "environment.fixture",
        identity: "fixture-browser-environment",
        definition: located("/environment", values.environment),
      },
    ],
    acceptance_blockers: [],
    structural_applicability: {
      profile_catalog: "package-subject-property-applicability-v1",
      subject_profile_bindings: [
        {
          key: "profile-binding.scale-components",
          subject_refs: subjects.map((subject) => subject.key),
          profile_refs: [
            "profile.property.geometry.width",
            "profile.property.color.background",
          ],
          census_refs: ["census.subject.scale"],
          source_item_refs: [SYMBOLIC_SOURCE_ITEM_KEY],
          basis_refs: [
            "package-policy.subject-kind.component_instance.v1",
            "census.subject.scale",
          ],
          rationale:
            "One frozen Inspector classification shares the two package-owned property profiles across the complete deterministic subject set.",
        },
      ],
      inspector_custom_property_closure: [],
      instance_exceptions: [],
    },
  };
  return {
    manifest,
    rules,
    certificate,
    dependencyEdges: [],
    parameters,
    properties,
    census,
    compilationStatistics: compilation.statistics(),
    sourceNoninterferencePredicates: ruleRegions.map((region) =>
      structuredClone(region),
    ),
  };
}
