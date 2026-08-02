import { DESIGN_RESOURCE_STANDARD_PROPERTIES } from "../../packages/ty-context/dist/lib/design-resource-fact-manifest-catalog.js";
import { compileSymbolicDenotation } from "../../packages/ty-context/dist/lib/symbolic-denotation-engine.js";
import {
  designResourceSymbolicCertificateKey,
  designResourceSymbolicCombinedRuleDigest,
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
  const pointRegions = ["light", "dark"].flatMap((color) =>
    ["idle", "active"].map((state) => ({
      op: "all",
      predicates: [
        {
          op: "eq",
          axis_ref: "condition.color-scheme",
          value: color,
        },
        { op: "eq", axis_ref: "variation.state", value: state },
      ],
    })),
  );
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
    sha256: fixtureSha(typeof raw === "string" ? raw : fixtureStableJson(raw)),
  });
  const parameters = located("/parameters", values.parameters);
  const environmentDefinition = located("/environment", values.environment);
  const rules = [
    {
      propertyRef: "geometry.width",
      valueKind: "length",
      expected: located("/width", values.width),
      censusRefs: ["census.subject.root", "census.property.width"],
    },
    {
      propertyRef: "color.background",
      valueKind: "color",
      expected: located("/background", values.background),
      censusRefs: ["census.subject.root", "census.property.background"],
    },
  ]
    .flatMap((definition) =>
      pointRegions.map((region) =>
        fixtureRuleInput(
          definition.propertyRef,
          definition.valueKind,
          definition.expected,
          definition.censusRefs,
          structuredClone(region),
        ),
      ),
    )
    .map((input) => {
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
  const obligations = buildFixtureObligations(rules, properties, parameters);
  const dependencyEdges = [];
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
    ...new Set([
      "render_capture",
      ...rules.flatMap(
        (projection) =>
          properties.find(
            (property) => property.key === projection.rule.property_ref,
          ).inspector_capability_refs,
      ),
    ]),
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
  const dispositions = properties
    .filter(
      (property) =>
        property.key !== "geometry.width" &&
        property.key !== "color.background",
    )
    .flatMap((property) =>
      pointRegions.map((region, index) => ({
        key: `disposition.surface-root.${property.key}.point-${index}`,
        subject_or_relation_ref: "surface.root",
        target_ref: SYMBOLIC_TARGET_KEY,
        property_ref: property.key,
        population_ref: null,
        quantifier: fixtureOneQuantifier(),
        region: structuredClone(region),
        disposition: "not_applicable",
        census_refs: ["census.subject.root"],
        source_item_refs: [SYMBOLIC_SOURCE_ITEM_KEY],
        basis_refs: [
          `package-policy.${property.key}.not-observed-on-fixture-surface`,
        ],
        rationale:
          "The package property remains in the applicability universe and this exact fixture point carries a basis-backed not-applicable disposition.",
      })),
    );
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
  return {
    manifest,
    rules,
    certificate,
    dependencyEdges,
    parameters,
    properties,
    census,
  };
}

export function refreshSymbolicFixtureDerivedIdentities(model) {
  for (const projection of model.rules) {
    projection.rule.semantic_obligation_refs = [];
    projection.compiled = compileSymbolicDenotation(
      model.manifest.axis_domains,
      projection.rule.region,
    );
    const {
      key: _key,
      semantic_obligation_refs: _refs,
      ...input
    } = projection.rule;
    projection.rule.key = designResourceSymbolicRuleKey(
      input,
      projection.compiled.canonical_sha256,
    );
  }
  model.manifest.semantic_proof_obligations = buildFixtureObligations(
    model.rules,
    model.properties,
    model.parameters,
  );
  model.dependencyEdges = [];
  model.manifest.dependency_edges = model.dependencyEdges;
  const certificateInput = {
    fact_rule_refs: model.rules.map((item) => item.rule.key),
    omitted_axis_refs: [
      ...new Set(
        model.rules.flatMap((item) => item.compiled.omitted_axis_refs),
      ),
    ].sort(),
    dependency_edge_refs: model.dependencyEdges.map((item) => item.key).sort(),
    canonical_rule_dag_sha256: designResourceSymbolicCombinedRuleDigest(
      model.rules.map((item) => ({
        rule: item.rule,
        compiled_region: item.compiled,
      })),
    ),
  };
  model.certificate = {
    key: designResourceSymbolicCertificateKey(certificateInput),
    ...certificateInput,
  };
  model.manifest.noninterference_certificates = [model.certificate];
  model.manifest.fact_rules = model.rules.map((item) => item.rule);
  for (const row of model.census)
    row.fact_refs = model.rules
      .filter((item) => item.rule.census_refs.includes(row.key))
      .map((item) => item.rule.key);
  return model;
}

export function enableCompactSymbolicApplicability(model) {
  model.manifest.structural_applicability = {
    profile_catalog: "package-subject-property-applicability-v1",
    subject_profile_bindings: [
      {
        key: "profile-binding.fixture-surface",
        subject_refs: ["surface.root"],
        profile_refs: [
          "profile.property.geometry.width",
          "profile.property.color.background",
        ],
        census_refs: ["census.subject.root"],
        source_item_refs: [SYMBOLIC_SOURCE_ITEM_KEY],
        basis_refs: ["fixture-inspector.subject-capability-profile"],
        rationale:
          "The frozen Inspector classifies the fixture surface with exactly the two package-owned property capabilities used by this target.",
      },
    ],
    inspector_custom_property_closure: [],
    instance_exceptions: [],
  };
  model.manifest.disposition_regions = [];
  return model;
}

export function enableFixtureTrustedNoninterference(
  model,
  method = "closed_world_static_dependency_closure",
) {
  const firstByProperty = new Map();
  for (const projection of model.rules)
    if (!firstByProperty.has(projection.rule.property_ref))
      firstByProperty.set(projection.rule.property_ref, projection);
  model.rules = [...firstByProperty.values()];
  for (const projection of model.rules)
    projection.rule.region = structuredClone(model.manifest.reachable_region);
  refreshSymbolicFixtureDerivedIdentities(model);
  model.manifest.oracles[0].trust = "frozen_executable";
  model.manifest.oracles[0].sha256 = fixtureSha(
    "fixture-symbolic-noninterference-oracle-v1",
  );
  model.manifest.oracles[0].capability_refs = [
    ...new Set([
      ...model.manifest.oracles[0].capability_refs,
      `symbolic_noninterference.source.${method}`,
      `symbolic_noninterference.production.${method}`,
    ]),
  ].sort();
  const projections = model.rules.map((item) => ({
    rule: item.rule,
    compiled_region: item.compiled,
  }));
  const buildProof = (side) => {
    const inputResourceRefs = model.manifest.inspector.input_resources.map(
      (item) => item.resource_ref,
    );
    const dependencyAxisRefs = [
      ...new Set(
        model.rules.flatMap((item) => item.compiled.referenced_axis_refs),
      ),
    ].sort();
    const dependencyNodeRef = `dependency.${side}.fixture-root`;
    return {
      side,
      method,
      input_resource_refs: [...inputResourceRefs],
      oracle_ref: "oracle.fixture",
      environment_ref: "environment.fixture",
      static_dependency_nodes:
        method === "closed_world_static_dependency_closure"
          ? [
              {
                key: dependencyNodeRef,
                axis_refs: dependencyAxisRefs,
                dependency_refs: [],
                input_resource_refs: [...inputResourceRefs],
              },
            ]
          : [],
      static_rule_roots:
        method === "closed_world_static_dependency_closure"
          ? [
              {
                fact_rule_refs: null,
                node_ref: dependencyNodeRef,
              },
            ]
          : [],
      equivalence_cases:
        method === "closed_world_static_dependency_closure"
          ? []
          : [
              {
                fact_rule_refs: model.rules.map((item) => item.rule.key),
                side_predicate: structuredClone(
                  model.manifest.reachable_region,
                ),
                axis_erased_predicate: structuredClone(
                  model.manifest.reachable_region,
                ),
              },
            ],
      dynamic_dependency_kinds: [],
      external_device_refs: [],
      complete_domain_cardinality:
        method === "finite_complete_domain_exhaustive_equivalence"
          ? model.rules[0].compiled.theoretical_ground_cardinality
          : null,
    };
  };
  const certificateInput = {
    fact_rule_refs: model.rules.map((item) => item.rule.key),
    omitted_axis_refs: [
      ...new Set(
        model.rules.flatMap((item) => item.compiled.omitted_axis_refs),
      ),
    ].sort(),
    dependency_edge_refs: [],
    canonical_rule_dag_sha256:
      designResourceSymbolicCombinedRuleDigest(projections),
    source_noninterference_proof: buildProof("source"),
    production_noninterference_proof: buildProof("production"),
  };
  model.certificate = {
    key: designResourceSymbolicCertificateKey(certificateInput),
    ...certificateInput,
  };
  model.manifest.noninterference_certificates = [model.certificate];
  return model;
}

export function rekeySymbolicFixtureCertificate(model) {
  const current = model.manifest.noninterference_certificates[0];
  const { key: _key, ...input } = current;
  model.certificate = {
    key: designResourceSymbolicCertificateKey(input),
    ...input,
  };
  model.manifest.noninterference_certificates = [model.certificate];
  return model;
}
