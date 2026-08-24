import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import YAML from "yaml";
import { DESIGN_RESOURCE_STANDARD_PROPERTIES } from "../../packages/ty-context/dist/lib/design-resource-fact-manifest-catalog.js";
import { DESIGN_RESOURCE_MANIFEST_COLLECTIONS } from "../../packages/ty-context/dist/lib/design-resource-fact-manifest-types.js";
import { normalizeSourceItemText } from "../../packages/ty-context/dist/lib/long-task-source-item-parser.js";

export const DESIGN_HANDOFF_PATH = "design/handoff.md";
export const DESIGN_RESOURCE_PATH = "design/page.html";
export const DESIGN_TOKEN_PATH = "design/tokens.css";
export const DESIGN_SPEC_PATH = "design/design-spec.md";
export const DESIGN_COMPONENT_SPEC_PATH = "design/component-spec.json";
export const DESIGN_SUPPORT_PATH = "design/supporting-notes.txt";
export const DESIGN_FACT_MANIFEST_PATH = "design/observable-facts.json";
export const DESIGN_FEASIBILITY_PATH =
  "design/implementation-feasibility.json";
export const DESIGN_TECHNICAL_SOURCE_PATH = "src/ui-system.ts";
export const DESIGN_RESOURCE_PATHS = [
  DESIGN_RESOURCE_PATH,
  DESIGN_TOKEN_PATH,
  DESIGN_SPEC_PATH,
  DESIGN_COMPONENT_SPEC_PATH,
  DESIGN_SUPPORT_PATH,
  DESIGN_FACT_MANIFEST_PATH,
];
export const DESIGN_SOURCE_ITEM_KEY = "design-main";
export const DESIGN_TARGET_KEY = "main-default";
const bundles = new WeakMap();

const DESIGN_CONDITION_CASES = ["mouse", "keyboard"].map((inputMethod) => ({
  key: `desktop-light-${inputMethod}`,
  inputMethod,
}));
export const DESIGN_CONDITION_KEYS = DESIGN_CONDITION_CASES.map(
  (condition) => condition.key,
);
export const DESIGN_CONDITION_KEY = DESIGN_CONDITION_KEYS[0];

const SUBJECT_SPECS = [
  {
    key: "surface.main",
    kind: "surface",
    parent_ref: null,
    instance_of_ref: null,
    slot_key: null,
    family_ref: null,
    presence: "always",
    population_ref: null,
    portal_host_ref: null,
    relation_endpoints: [],
    selector: "#design-target",
  },
  {
    key: "component-family.card",
    kind: "component_family",
    parent_ref: "surface.main",
    instance_of_ref: null,
    slot_key: null,
    family_ref: null,
    presence: "always",
    population_ref: null,
    portal_host_ref: null,
    relation_endpoints: [],
    spec: true,
  },
  {
    key: "component.card",
    kind: "component_instance",
    parent_ref: "surface.main",
    instance_of_ref: "component-family.card",
    slot_key: null,
    family_ref: "component-family.card",
    presence: "always",
    population_ref: null,
    portal_host_ref: null,
    relation_endpoints: [],
    selector: "#card-main",
  },
  {
    key: "part.card-label",
    kind: "anatomy_part",
    parent_ref: "component.card",
    instance_of_ref: null,
    slot_key: "label",
    family_ref: "component-family.card",
    presence: "always",
    population_ref: null,
    portal_host_ref: null,
    relation_endpoints: [],
    selector: "#card-label",
  },
  {
    key: "relation.card-label",
    kind: "relation",
    parent_ref: "surface.main",
    instance_of_ref: null,
    slot_key: null,
    family_ref: null,
    presence: "always",
    population_ref: null,
    portal_host_ref: null,
    relation_endpoints: [
      { role: "container", subject_ref: "component.card" },
      { role: "content", subject_ref: "part.card-label" },
    ],
    spec: true,
  },
  {
    key: "asset.hero",
    kind: "asset",
    parent_ref: "component.card",
    instance_of_ref: null,
    slot_key: "hero",
    family_ref: "component-family.card",
    presence: "always",
    population_ref: null,
    portal_host_ref: null,
    relation_endpoints: [],
    selector: "#asset-main",
  },
];

export async function writeDesignResourceHandoffFixture(
  root,
  mutate,
  options = {},
) {
  await mkdir(path.join(root, "design"), { recursive: true });
  const bundle = createFixtureBundle();
  bundle.representation = options.representation ?? "manifest_backed";
  bundles.set(bundle.handoff, bundle);
  mutate?.(bundle.handoff, bundle.manifest);
  await writeFixtureResources(root, bundle);
  if (options.feasibility)
    await addDesignResourceImplementationFeasibility(
      root,
      bundle.handoff,
      options.mutateFeasibility,
    );
  await writeDesignResourceHandoff(root, bundle.handoff, options);
  return {
    handoff: bundle.handoff,
    manifest: bundle.manifest,
    resource: bundle.resource,
  };
}

export async function writeDesignResourceHandoff(root, handoff, options = {}) {
  const bundle = bundles.get(handoff);
  if (bundle && options.syncManifest !== false) {
    synchronizeManifest(bundle.manifest, handoff);
    const manifestContent = `${JSON.stringify(bundle.manifest, null, 2)}\n`;
    await writeFile(
      path.join(root, DESIGN_FACT_MANIFEST_PATH),
      manifestContent,
    );
    const manifestResource = handoff.resources.find(
      (resource) => resource.key === "resource.fact-manifest",
    );
    if (manifestResource) manifestResource.sha256 = sha256(manifestContent);
  }
  const handoffPath = options.handoffPath ?? DESIGN_HANDOFF_PATH;
  const representation =
    options.representation ?? bundle?.representation ?? "manifest_backed";
  const renderedHandoff =
    representation === "embedded" ||
    handoff.representation === "manifest_backed"
      ? handoff
      : manifestBackedDesignResourceHandoff(handoff);
  await mkdir(path.dirname(path.join(root, handoffPath)), { recursive: true });
  await writeFile(
    path.join(root, handoffPath),
    renderDesignResourceHandoffMarkdown(
      renderedHandoff,
      options.additionalSourceItems,
    ),
  );
}

export function renderDesignResourceHandoffMarkdown(
  handoff,
  additionalSourceItems = [],
) {
  const sourceItems = [
    {
      key: DESIGN_SOURCE_ITEM_KEY,
      kind: "requirement",
      statement:
        "The main surface must conform to every declared atomic observable design Fact.",
    },
    ...additionalSourceItems,
  ];
  const sourceBlocks = sourceItems
    .map(
      (item) => `<!-- ty-source-item:start key=${item.key} kind=${item.kind} -->
${item.statement}
<!-- ty-source-item:end -->`,
    )
    .join("\n\n");
  return `<!-- ty-source-background:start key=design-handoff-heading reason=markdown-structure -->
<a id="main-design"></a>
<!-- ty-source-background:end -->

${sourceBlocks}

\`\`\`yaml design-resource-handoff-v1
${YAML.stringify(JSON.parse(JSON.stringify(handoff)), { lineWidth: 0 }).trimEnd()}
\`\`\`
`;
}

export function manifestBackedDesignResourceHandoff(handoff) {
  return {
    schema_version: handoff.schema_version,
    representation: "manifest_backed",
    intent: handoff.intent,
    scope: structuredClone(handoff.scope),
    provenance: structuredClone(handoff.provenance),
    ...(handoff.technical_feasibility_inputs
      ? {
          technical_feasibility_inputs: structuredClone(
            handoff.technical_feasibility_inputs,
          ),
        }
      : {}),
    resources: structuredClone(handoff.resources),
    targets: structuredClone(handoff.targets),
    resource_fact_closure: structuredClone(handoff.resource_fact_closure),
    coverage: structuredClone(handoff.coverage),
    proposal: structuredClone(handoff.proposal),
  };
}

export async function addDesignResourceImplementationFeasibility(
  root,
  handoff,
  mutate,
) {
  const technicalSource = [
    "export const platform = 'desktop-web';",
    "export const frameworkRuntime = 'fixture-framework';",
    "export const uiSystem = 'fixture-ui-system';",
    "export const tokenAdapter = 'fixture-token-adapter';",
    "export const Card = 'project-card';",
    "export const routeOwner = 'main-route';",
    "",
  ].join("\n");
  await mkdir(path.join(root, "src"), { recursive: true });
  await writeFile(
    path.join(root, DESIGN_TECHNICAL_SOURCE_PATH),
    technicalSource,
  );
  const sourceKey = "technical.fixture-substrate";
  const familyRef = "component-family.card";
  const feasibility = {
    schema_version: "design-resource-implementation-feasibility-v1",
    key: "main-default-feasibility",
    target_ref: DESIGN_TARGET_KEY,
    realization_mode: "native_substrate",
    source_records: [
      {
        key: sourceKey,
        path: DESIGN_TECHNICAL_SOURCE_PATH,
        media_type: "text/typescript",
        sha256: sha256(technicalSource),
        locator: { kind: "source_anchor", value: "export const Card" },
        roles: [
          "technical_platform",
          "framework_runtime",
          "ui_system",
          "token_theming_adapter",
          "component_owner",
          "route_owner",
          "capability_basis",
          "feasibility_basis",
        ],
      },
    ],
    substrate_observations: [
      observation("platform", "desktop-web", sourceKey),
      observation("framework_runtime", "fixture-framework", sourceKey),
      observation("ui_system", "fixture-ui-system", sourceKey),
      observation("token_theming_adapter", "fixture-token-adapter", sourceKey),
      observation("component_owner_roots", "fixture-components", sourceKey),
      observation("route_owner_roots", "fixture-routes", sourceKey),
    ],
    condition_model: {
      kind: "explicit_conditions_v1",
      profiles: [
        {
          key: "desktop-all-inputs",
          condition_refs: [...DESIGN_CONDITION_KEYS],
        },
      ],
    },
    component_family_cells: [
      {
        key: "card-main-all-inputs",
        component_family_ref: familyRef,
        target_ref: DESIGN_TARGET_KEY,
        condition_profile_ref: "desktop-all-inputs",
        design_fact_refs: handoff.facts
          .filter(
            (fact) =>
              fact.target_ref === DESIGN_TARGET_KEY &&
              transitiveFamilySubjectRefs(handoff.subjects, familyRef).has(
                fact.subject_ref,
              ),
          )
          .map((fact) => fact.key),
        feasible_realizations: [
          {
            key: "reuse-project-card",
            strategy_steps: ["reuse_existing", "theme_with_tokens"],
            primitive_refs: ["project-card", "project-theme"],
            owner_candidates: [
              {
                kind: "existing_path",
                locator: DESIGN_TECHNICAL_SOURCE_PATH,
                existence: "existing",
              },
            ],
            supported_customization_surfaces: [
              "theme_tokens",
              "component_variant",
            ],
            feasibility_basis_refs: [sourceKey],
            observed_costs: [],
            observed_risks: [],
          },
        ],
        required_realization: {
          realization_ref: null,
          technical_authority_source_refs: [],
        },
        blocker_refs: [],
      },
    ],
    blockers: [],
  };
  await mutate?.(feasibility, root);
  const content = `${JSON.stringify(feasibility, null, 2)}\n`;
  await writeFile(path.join(root, DESIGN_FEASIBILITY_PATH), content);
  handoff.technical_feasibility_inputs = [
    {
      key: feasibility.key,
      target_ref: feasibility.target_ref,
      path: DESIGN_FEASIBILITY_PATH,
      media_type: "application/json",
      sha256: sha256(content),
    },
  ];
  return feasibility;
}

export async function addV1FeasibilityDecisionSource(
  root,
  document,
  {
    recordKey,
    itemKey,
    itemKind,
    roles,
    projections,
  },
) {
  const sourcePath = `src/${recordKey}.md`;
  const body = [
    `# ${itemKey}`,
    `Technical feasibility decision source for ${recordKey}.`,
    ...projections.map(
      (projection) =>
        `<!-- ty-design-feasibility-decision-v1 ${JSON.stringify({
          schema_version: "design-resource-feasibility-decision-v1",
          ...projection,
        })} -->`,
    ),
  ].join("\n");
  const content = `<!-- ty-source-item:start key=${itemKey} kind=${itemKind} -->\n${body}\n<!-- ty-source-item:end -->\n`;
  await writeFile(path.join(root, sourcePath), content);
  document.source_records.push({
    key: recordKey,
    path: sourcePath,
    media_type: "text/markdown",
    sha256: sha256(content),
    locator: {
      kind: "source_item",
      value: itemKey,
      text_sha256: sha256(normalizeSourceItemText(body)),
    },
    roles: [...roles],
  });
  return {
    recordRef: recordKey,
    sourcePath,
    itemKey,
    normalizedText: normalizeSourceItemText(body),
  };
}

export function v1FeasibilityConditionScopeSha256(document, profileRef) {
  const profile = document.condition_model.profiles.find(
    (candidate) => candidate.key === profileRef,
  );
  return sha256(JSON.stringify([...profile.condition_refs].sort()));
}

function observation(kind, name, sourceRef) {
  if (["component_owner_roots", "route_owner_roots"].includes(kind))
    return {
      kind,
      disposition: "observed",
      value: { kind: "repository_paths", paths: ["src"] },
      source_record_refs: [sourceRef],
      reason: null,
    };
  return {
    kind,
    disposition: "observed",
    value: {
      kind: "identifier",
      name,
      version_source_ref: sourceRef,
    },
    source_record_refs: [sourceRef],
    reason: null,
  };
}

function transitiveFamilySubjectRefs(subjects, familyRef) {
  const refs = new Set(
    subjects
      .filter(
        (subject) =>
          subject.key === familyRef ||
          subject.family_ref === familyRef ||
          subject.instance_of_ref === familyRef,
      )
      .map((subject) => subject.key),
  );
  let changed = true;
  while (changed) {
    changed = false;
    for (const subject of subjects) {
      if (refs.has(subject.key)) continue;
      if (
        [subject.parent_ref, subject.instance_of_ref, subject.override_of_ref]
          .filter(Boolean)
          .some((ref) => refs.has(ref))
      ) {
        refs.add(subject.key);
        changed = true;
      }
    }
  }
  return refs;
}

export async function writeDesignResourceFactManifest(
  root,
  handoff,
  manifest,
  options = {},
) {
  if (options.refreshGeneration !== false)
    manifest.generation = generationFor(manifestCollections(manifest));
  const manifestContent = `${JSON.stringify(manifest, null, 2)}\n`;
  await writeFile(path.join(root, DESIGN_FACT_MANIFEST_PATH), manifestContent);
  handoff.resources.find(
    (resource) => resource.key === "resource.fact-manifest",
  ).sha256 = sha256(manifestContent);
  await writeDesignResourceHandoff(root, handoff, {
    syncManifest: false,
    representation: options.representation,
  });
}

export function createDesignResourceHandoff() {
  const bundle = createFixtureBundle();
  bundles.set(bundle.handoff, bundle);
  return bundle.handoff;
}

function createFixtureBundle() {
  const resource = `<!doctype html>
<html>
<head><link rel="stylesheet" href="tokens.css"></head>
<body>
  <main id="design-target">
    <section id="frame-main">Design target</section>
    <article id="card-main"><span id="card-label">Card label</span></article>
    <button id="transition-main" data-state="pressed">Toggle</button>
    <section id="responsive-main">Responsive region</section>
    <section id="accessibility-main" aria-label="Accessible region">Semantics</section>
    <img id="asset-main" alt="Fixture asset">
  </main>
</body>
</html>
`;
  const tokens =
    ":root {\n  --fixture-accent: #3366ff;\n  --fixture-font-size: 16px;\n}\n";
  const designSpec =
    "# Design specification\n\n## Responsive behavior\n\nReflow at the declared viewport.\n";
  const supportingNotes =
    "This file records export provenance and carries no UI/UX fact.\n";
  const conditions = createConditions();
  const subjects = createSubjects();
  const { variationAxisDispositions, variations } = createVariations(subjects);
  const componentSpec = {
    accessibility: { role: "main", name: "Accessible region" },
    subjects: Object.fromEntries(
      subjects.map((subject) => [
        subject.key,
        { kind: subject.kind, parent_ref: subject.parent_ref },
      ]),
    ),
    axes: {},
    variation_axes: {},
    values: {},
    comparators: {
      exact_value: { algorithm: "exact-value-v1" },
      geometry_delta: { algorithm: "geometry-delta-v1" },
      pixel_diff: { algorithm: "pixel-diff-v1" },
      token_resolution: { algorithm: "token-resolution-v1" },
      content_equal: { algorithm: "content-equal-v1" },
      state_equal: { algorithm: "state-equal-v1" },
      trace_equal: { algorithm: "trace-equal-v1" },
      asset_equal: { algorithm: "asset-equal-v1" },
    },
    tolerances: {
      platform_raster: { max_changed_ratio: 0.001, channel_delta: 2 },
    },
    environment: {
      platform: "desktop-web",
      browser: "fixture-browser-1",
      viewport: [1440, 900],
      pixel_ratio: 1,
      fonts: ["Fixture Sans"],
      color_space: "srgb",
      clock: "2026-01-01T00:00:00Z",
      animation_state: "settled",
    },
  };
  const axisDispositions = createConditionAxes(conditions, componentSpec);
  populateVariationSpec(variationAxisDispositions, componentSpec);
  const properties = DESIGN_RESOURCE_STANDARD_PROPERTIES.map((property) => ({
    ...property,
    required_methods: [...property.required_methods],
    inspector_capability_refs: [...property.inspector_capability_refs],
    census_refs: [...property.census_refs],
  }));
  const evidence = createEvidence();
  const {
    factCells,
    facts,
    lineageNodes,
    proofObligations,
    oracles,
    environments,
  } = createFacts({
    conditions,
    subjects,
    variations,
    properties,
    componentSpec,
  });
  const componentSpecContent = `${JSON.stringify(componentSpec, null, 2)}\n`;
  const resourcesWithoutManifest = createResources({
    resource,
    tokens,
    designSpec,
    componentSpec: componentSpecContent,
    supportingNotes,
  });
  const census = createCensus({
    conditions,
    subjects,
    variations,
    axisDispositions,
    variationAxisDispositions,
    factCells,
    facts,
    lineageNodes,
    resources: resourcesWithoutManifest,
  });
  const coverage = createCoverage({
    factCells,
    facts,
    proofObligations,
    evidence,
    properties,
  });
  const assetBindings = [
    {
      key: "asset-binding.hero",
      asset_subject_ref: "asset.hero",
      resource_ref: "resource.main",
      target_refs: [DESIGN_TARGET_KEY],
      condition_refs: [...DESIGN_CONDITION_KEYS],
      fact_refs: facts
        .filter((fact) => fact.subject_ref === "asset.hero")
        .map((fact) => fact.key),
      consumer_subject_refs: ["component.card"],
    },
  ];
  const acceptanceBlockers = [];
  const inspectorInputResources = resourcesWithoutManifest.map((item) => ({
    resource_ref: item.key,
    path: item.path,
    sha256: item.sha256,
  }));
  const generationCollections = {
    inspector_inputs: inspectorInputResources,
    inspector_census: census,
    axis_dispositions: axisDispositions,
    condition_exclusions: [],
    conditions,
    subjects,
    variation_axis_dispositions: variationAxisDispositions,
    variation_exclusions: [],
    variations,
    properties,
    lineage_nodes: lineageNodes,
    fact_cells: factCells,
    facts,
    evidence,
    proof_obligations: proofObligations,
    oracles,
    environments,
    asset_bindings: assetBindings,
    acceptance_blockers: acceptanceBlockers,
  };
  const manifest = {
    schema_version: "design-resource-observable-fact-manifest-v1",
    generation: generationFor(generationCollections),
    scope_key: "main-surface",
    target_key: DESIGN_TARGET_KEY,
    inspector: {
      trust: "named_external_tcb",
      identity: "fixture-design-fact-inspector",
      version: "1.0.0",
      implementation_sha256: null,
      capability_refs: [
        ...new Set(
          properties.flatMap((property) => property.inspector_capability_refs),
        ),
      ].sort(),
      entry_resource_ref: "resource.main",
      input_resources: inspectorInputResources,
      traversal: "complete_enumeration",
      dynamic_discovery: "fully_enumerated",
      census,
    },
    design_system: {
      disposition: "used",
      id: "fixture-design-system",
      revision: "fixture-design-system-v1",
      resource_ref: "resource.tokens",
      sha256: resourcesWithoutManifest.find(
        (item) => item.key === "resource.tokens",
      ).sha256,
    },
    axis_dispositions: axisDispositions,
    condition_exclusions: [],
    conditions,
    subjects,
    variation_axis_dispositions: variationAxisDispositions,
    variation_exclusions: [],
    variations,
    properties,
    lineage_nodes: lineageNodes,
    fact_cells: factCells,
    facts,
    evidence,
    proof_obligations: proofObligations,
    oracles,
    environments,
    asset_bindings: assetBindings,
    acceptance_blockers: acceptanceBlockers,
  };
  const manifestContent = `${JSON.stringify(manifest, null, 2)}\n`;
  const manifestResource = resourceItem(
    "resource.fact-manifest",
    "supporting",
    DESIGN_FACT_MANIFEST_PATH,
    "application/json",
    sha256(manifestContent),
  );
  const resources = [...resourcesWithoutManifest, manifestResource];
  const handoff = {
    schema_version: "design-resource-handoff-v1",
    intent: "implementation_handoff",
    scope: {
      key: "main-surface",
      style_dependency: "style-bearing",
      surface_keys: ["surface.main"],
      necessary_context: ["The page has no business logic."],
      exclusions: ["All other surfaces."],
    },
    provenance: {
      provider: "fixture-open-design",
      provider_version: "1.0.0",
      project: "fixture-project",
      run: "fixture-run",
      capability: "complex-single-page",
      agent: "fixture-agent",
      model: "fixture-model",
      design_system_id: "fixture-design-system",
    },
    resources,
    axis_dispositions: axisDispositions,
    condition_exclusions: [],
    conditions,
    subjects,
    variation_axis_dispositions: variationAxisDispositions,
    variation_exclusions: [],
    variations,
    properties,
    lineage_nodes: lineageNodes,
    targets: [
      {
        key: DESIGN_TARGET_KEY,
        interpretation: "exact_target",
        resource_refs: resources.map((item) => item.key),
        condition_refs: [...DESIGN_CONDITION_KEYS],
        source_profile: {
          kind: "implementation_web",
          entry_resource_ref: "resource.main",
          dependency_resource_refs: resources
            .map((item) => item.key)
            .filter((key) => key !== "resource.main"),
          fact_manifest_resource_ref: "resource.fact-manifest",
          acquisition: "complete",
        },
        selection_basis: "Explicit fixture selection.",
      },
    ],
    evidence,
    fact_cells: factCells,
    facts,
    proof_obligations: proofObligations,
    oracles,
    environments,
    asset_bindings: assetBindings,
    resource_fact_closure: createResourceClosure(
      resources,
      facts,
      proofObligations,
      environments,
      evidence,
      lineageNodes,
    ),
    coverage,
    acceptance_blockers: acceptanceBlockers,
    proposal: {
      reconciliation_status: "applied",
      path: "proposal.md",
      revision: "fixture-selected-v2",
    },
  };
  return {
    handoff,
    manifest,
    resource,
    resourceContents: {
      [DESIGN_RESOURCE_PATH]: resource,
      [DESIGN_TOKEN_PATH]: tokens,
      [DESIGN_SPEC_PATH]: designSpec,
      [DESIGN_COMPONENT_SPEC_PATH]: componentSpecContent,
      [DESIGN_SUPPORT_PATH]: supportingNotes,
    },
  };
}

async function writeFixtureResources(root, bundle) {
  for (const [file, content] of Object.entries(bundle.resourceContents))
    await writeFile(path.join(root, file), content);
  const manifestContent = `${JSON.stringify(bundle.manifest, null, 2)}\n`;
  await writeFile(path.join(root, DESIGN_FACT_MANIFEST_PATH), manifestContent);
  bundle.handoff.resources.find(
    (resource) => resource.key === "resource.fact-manifest",
  ).sha256 = sha256(manifestContent);
}

function createConditions() {
  return DESIGN_CONDITION_CASES.map(({ key, inputMethod }) => ({
    key,
    platform: "desktop-web",
    os_version: "not-applicable",
    device_profile: "desktop-standard",
    form_factor: "desktop",
    viewport: {
      key: "desktop-1440x900",
      width: 1440,
      height: 900,
      unit: "px",
    },
    orientation: "landscape",
    density: { key: "density-1x", pixel_ratio: 1 },
    safe_area: {
      key: "zero-insets",
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      unit: "px",
    },
    window_state: "full-window",
    fold_state: "not-applicable",
    display_mode: "planning",
    color_scheme: "light",
    locale: "en-us",
    language: "en",
    script: "latin",
    direction: "ltr",
    pseudo_localization: "disabled",
    content_case: "nominal",
    data_case: "populated",
    text_scale: { key: "text-100-percent", multiplier: 1 },
    input_method: inputMethod,
    assistive_technology: "not-applicable",
    motion: "full",
    transparency: "full",
    contrast: "standard",
    bold_text: "disabled",
    button_shapes: "disabled",
    system_ui: "not-applicable",
    ime: "not-applicable",
    permission: "not-applicable",
    capability: "available",
    connectivity: "online",
    lifecycle: "foreground",
    custom_axes: [],
  }));
}

function createSubjects() {
  return SUBJECT_SPECS.map((spec) => ({
    key: spec.key,
    kind: spec.kind,
    stable_keys: [spec.key],
    target_refs: [DESIGN_TARGET_KEY],
    parent_ref: spec.parent_ref,
    instance_of_ref: spec.instance_of_ref,
    slot_key: spec.slot_key,
    override_of_ref: null,
    family_ref: spec.family_ref,
    presence: spec.presence,
    presence_rule_ref: null,
    population_ref: spec.population_ref,
    portal_host_ref: spec.portal_host_ref,
    relation_endpoints: spec.relation_endpoints,
    census_refs: [`census.subject.${safeKey(spec.key)}`],
  }));
}

function createConditionAxes(conditions, componentSpec) {
  const accessors = {
    platform: (condition) => condition.platform,
    os_version: (condition) => condition.os_version,
    device_profile: (condition) => condition.device_profile,
    form_factor: (condition) => condition.form_factor,
    viewport: (condition) => condition.viewport.key,
    orientation: (condition) => condition.orientation,
    density: (condition) => condition.density.key,
    safe_area: (condition) => condition.safe_area.key,
    window_state: (condition) => condition.window_state,
    fold_state: (condition) => condition.fold_state,
    display_mode: (condition) => condition.display_mode,
    color_scheme: (condition) => condition.color_scheme,
    locale: (condition) => condition.locale,
    language: (condition) => condition.language,
    script: (condition) => condition.script,
    direction: (condition) => condition.direction,
    pseudo_localization: (condition) => condition.pseudo_localization,
    content_case: (condition) => condition.content_case,
    data_case: (condition) => condition.data_case,
    text_scale: (condition) => condition.text_scale.key,
    input_method: (condition) => condition.input_method,
    assistive_technology: (condition) => condition.assistive_technology,
    motion: (condition) => condition.motion,
    transparency: (condition) => condition.transparency,
    contrast: (condition) => condition.contrast,
    bold_text: (condition) => condition.bold_text,
    button_shapes: (condition) => condition.button_shapes,
    system_ui: (condition) => condition.system_ui,
    ime: (condition) => condition.ime,
    permission: (condition) => condition.permission,
    capability: (condition) => condition.capability,
    connectivity: (condition) => condition.connectivity,
    lifecycle: (condition) => condition.lifecycle,
  };
  return Object.entries(accessors).map(([axis, accessor]) => {
    const values = [...new Set(conditions.map(accessor))].sort();
    const notApplicable = values.length === 1 && values[0] === "not-applicable";
    componentSpec.axes[axis] = Object.fromEntries(
      values.map((value) => [value, value]),
    );
    return {
      key: `axis.${axis}`,
      target_ref: DESIGN_TARGET_KEY,
      axis,
      disposition: notApplicable ? "not_applicable" : "applicable",
      values: values.map((value) => ({
        key: value,
        census_refs: notApplicable
          ? []
          : [`census.axis.${safeKey(axis)}.${safeKey(value)}`],
      })),
      source_item_refs: [DESIGN_SOURCE_ITEM_KEY],
      basis_refs: notApplicable
        ? [DESIGN_SOURCE_ITEM_KEY]
        : values.map(
            (value) => `census.axis.${safeKey(axis)}.${safeKey(value)}`,
          ),
      rationale: notApplicable
        ? `${axis} is explicitly not applicable to this target.`
        : `${axis} values are explicitly enumerated by the canonical resource.`,
    };
  });
}

function createVariations(subjects) {
  const variationAxisDispositions = [];
  const variations = [];
  for (const subject of subjects) {
    const valuesByAxis =
      subject.key === "component.card"
        ? {
            variant: ["standard"],
            state: ["initial", "pressed"],
            interaction_phase: ["idle"],
            presence_phase: ["visible"],
            instance_case: ["primary"],
          }
        : {
            variant: ["not-applicable"],
            state: ["not-applicable"],
            interaction_phase: ["not-applicable"],
            presence_phase: ["not-applicable"],
            instance_case: ["not-applicable"],
          };
    for (const [axis, values] of Object.entries(valuesByAxis)) {
      const notApplicable = values[0] === "not-applicable";
      variationAxisDispositions.push({
        key: `variation-axis.${safeKey(subject.key)}.${axis}`,
        subject_ref: subject.key,
        axis,
        disposition: notApplicable ? "not_applicable" : "applicable",
        values: values.map((value) => ({
          key: value,
          census_refs: notApplicable
            ? []
            : [
                `census.variation.${safeKey(subject.key)}.${safeKey(axis)}.${safeKey(value)}`,
              ],
        })),
        source_item_refs: [DESIGN_SOURCE_ITEM_KEY],
        basis_refs: notApplicable
          ? [DESIGN_SOURCE_ITEM_KEY]
          : values.map(
              (value) =>
                `census.variation.${safeKey(subject.key)}.${safeKey(axis)}.${safeKey(value)}`,
            ),
        rationale: notApplicable
          ? `${axis} is not applicable to ${subject.key}.`
          : `${axis} values are explicit for ${subject.key}.`,
      });
    }
    for (const values of cartesian(Object.values(valuesByAxis)))
      variations.push({
        key: `variation.${safeKey(subject.key)}.${values.map(safeKey).join(".")}`,
        subject_ref: subject.key,
        variant: values[0],
        state: values[1],
        interaction_phase: values[2],
        presence_phase: values[3],
        instance_case: values[4],
      });
  }
  return { variationAxisDispositions, variations };
}

function populateVariationSpec(rows, componentSpec) {
  for (const row of rows) {
    componentSpec.variation_axes[row.key] = Object.fromEntries(
      row.values.map((value) => [value.key, value.key]),
    );
  }
}

function createEvidence() {
  return [
    evidenceItem(
      "frame-main",
      "frame",
      "resource.main",
      "html_selector",
      "#design-target",
    ),
    evidenceItem(
      "transition-main",
      "prototype_transition",
      "resource.main",
      "html_selector",
      "#transition-main",
    ),
    evidenceItem(
      "motion-main",
      "motion_spec",
      "resource.component-spec",
      "json_pointer",
      "/comparators/trace_equal",
    ),
    evidenceItem(
      "responsive-main",
      "responsive_spec",
      "resource.main",
      "html_selector",
      "#responsive-main",
    ),
    evidenceItem(
      "accessibility-main",
      "accessibility_spec",
      "resource.component-spec",
      "json_pointer",
      "/accessibility",
    ),
    evidenceItem(
      "input-main",
      "input_spec",
      "resource.component-spec",
      "json_pointer",
      "/environment",
    ),
    evidenceItem(
      "relation-main",
      "relation_spec",
      "resource.component-spec",
      "json_pointer",
      "/subjects/relation.card-label",
    ),
    evidenceItem(
      "asset-main",
      "asset",
      "resource.main",
      "html_selector",
      "#asset-main",
    ),
    evidenceItem(
      "token-main",
      "token_spec",
      "resource.tokens",
      "css_custom_property",
      "--fixture-accent",
    ),
  ];
}

function createFacts({
  conditions,
  subjects,
  variations,
  properties,
  componentSpec,
}) {
  const lineageNodes = [
    {
      key: "token.fixture-accent",
      kind: "base_token",
      predecessor_refs: [],
      value: located(
        "resource.tokens",
        "css_custom_property",
        "--fixture-accent",
        sha256("#3366ff"),
      ),
      census_refs: ["census.lineage.token.fixture-accent"],
    },
    {
      key: "token.fixture-font-size",
      kind: "base_token",
      predecessor_refs: [],
      value: located(
        "resource.tokens",
        "css_custom_property",
        "--fixture-font-size",
        sha256("16px"),
      ),
      census_refs: ["census.lineage.token.fixture-font-size"],
    },
  ];
  const lineageByProperty = new Map([
    ["color.background", lineageNodes[0]],
    ["typography.font-size", lineageNodes[1]],
  ]);
  const covered = new Map([
    ["surface.main\0geometry.coordinate-system", ["layout_geometry"]],
    ["surface.main\0system.render-environment", ["visual_pixel"]],
    ["surface.main\0responsive.reflow", ["responsive_reflow"]],
    ["surface.main\0system.keyboard-ime-avoidance", ["input_method"]],
    ["component.card\0geometry.width", ["layout_geometry"]],
    ["component.card\0color.background", ["visual_pixel", "design_token"]],
    [
      "component.card\0interaction.trigger",
      ["component_state", "interaction_trace"],
    ],
    ["component.card\0motion.duration", ["motion_timeline"]],
    ["component.card\0accessibility.role", ["accessibility_semantics"]],
    [
      "part.card-label\0typography.font-size",
      ["layout_geometry", "visual_pixel", "design_token"],
    ],
    ["part.card-label\0content.copy", ["content"]],
    ["relation.card-label\0relation.relative-spacing", ["layout_geometry"]],
    ["asset.hero\0asset.identity", ["asset_integrity"]],
  ]);
  const propertyByKey = new Map(
    properties.map((property) => [property.key, property]),
  );
  const factCells = [];
  const facts = [];
  const proofObligations = [];
  let index = 0;
  for (const subject of subjects)
    for (const condition of conditions)
      for (const variation of variations.filter(
        (item) => item.subject_ref === subject.key,
      ))
        for (const property of properties) {
          const methods = covered.get(`${subject.key}\0${property.key}`);
          const cellKey = `cell.${String(index).padStart(6, "0")}`;
          const factKey = methods
            ? `fact.${safeKey(subject.key)}.${safeKey(property.key)}.${safeKey(condition.key)}.${safeKey(variation.key)}`
            : null;
          factCells.push({
            key: cellKey,
            subject_ref: subject.key,
            target_ref: DESIGN_TARGET_KEY,
            condition_ref: condition.key,
            variation_ref: variation.key,
            property_ref: property.key,
            disposition: methods ? "covered" : "not_applicable",
            fact_ref: factKey,
            source_item_refs: [DESIGN_SOURCE_ITEM_KEY],
            basis_refs: [
              methods
                ? `census.subject.${safeKey(subject.key)}`
                : DESIGN_SOURCE_ITEM_KEY,
            ],
            rationale: methods
              ? "The canonical resource exposes this atomic observable value."
              : "The scoped product and Inspector census explicitly close this property as not applicable for this subject and condition.",
          });
          index += 1;
          if (!methods) continue;
          const value = canonicalFactValue(
            subject.key,
            condition.key,
            variation.key,
            property.key,
          );
          componentSpec.values[factKey] = value;
          const lineageNode = lineageByProperty.get(property.key);
          const valueLocator =
            lineageNode?.value ??
            located(
              "resource.component-spec",
              "json_pointer",
              `/values/${pointer(factKey)}`,
              typeof value === "string" ? sha256(value) : sha256Stable(value),
            );
          const styleBearing = [
            "color",
            "typography",
            "decoration",
            "icon",
          ].includes(property.family);
          const fact = {
            key: factKey,
            cell_ref: cellKey,
            subject_ref: subject.key,
            target_ref: DESIGN_TARGET_KEY,
            condition_ref: condition.key,
            variation_ref: variation.key,
            property_ref: property.key,
            dimension: property.dimension,
            observation_scope:
              subject.key === "surface.main" &&
              [
                "geometry.coordinate-system",
                "system.render-environment",
              ].includes(property.key)
                ? "full_target"
                : "subject",
            observation_sensitivity: "plain",
            value_kind: property.value_kind,
            value: valueLocator,
            evidence_refs: evidenceFor(subject.key, property),
            source_item_refs: [DESIGN_SOURCE_ITEM_KEY],
            lineage: {
              design_system_ref: styleBearing ? "fixture-design-system" : null,
              token_chain_refs: lineageNode ? [lineageNode.key] : [],
              override_chain_refs: [],
              resolved_value: valueLocator,
              conflict_status: "none",
              conflict_resolution: "",
            },
          };
          facts.push(fact);
          for (const method of methods) {
            const comparator = comparatorFor(method);
            const tolerance =
              method === "visual_pixel"
                ? located(
                    "resource.component-spec",
                    "json_pointer",
                    "/tolerances/platform_raster",
                    sha256Stable(componentSpec.tolerances.platform_raster),
                  )
                : null;
            proofObligations.push({
              key: `proof.${safeKey(factKey)}.${method}`,
              fact_ref: factKey,
              method,
              comparison: {
                comparator,
                mode: tolerance ? "tolerance" : "exact",
                parameters: located(
                  "resource.component-spec",
                  "json_pointer",
                  `/comparators/${pointer(comparator)}`,
                  sha256Stable(componentSpec.comparators[comparator]),
                ),
                tolerance,
                mask: null,
              },
              oracle_ref: "oracle.fixture",
              environment_ref: "environment.fixture",
            });
          }
        }
  const oracles = [
    {
      key: "oracle.fixture",
      trust: "named_external_tcb",
      identity: "fixture-production-design-oracle",
      version: "1.0.0",
      sha256: null,
      capability_refs: [
        "html_dom",
        "css_cascade",
        "json",
        "design_tokens",
        "component_anatomy",
        "prototype_transitions",
        "input_rules",
        "responsive_rules",
        "accessibility",
        "assets",
        "relations",
      ],
    },
  ];
  const environments = [
    {
      key: "environment.fixture",
      identity: "fixture-desktop-render-environment-v1",
      definition: located(
        "resource.component-spec",
        "json_pointer",
        "/environment",
        sha256Stable(componentSpec.environment),
      ),
    },
  ];
  return {
    factCells,
    facts,
    lineageNodes,
    proofObligations,
    oracles,
    environments,
  };
}

function evidenceFor(subjectRef, property) {
  if (subjectRef === "asset.hero") return ["asset-main"];
  if (subjectRef === "relation.card-label") return ["relation-main"];
  if (property.key === "system.keyboard-ime-avoidance") return ["input-main"];
  if (property.dimension === "motion") return ["motion-main"];
  if (property.dimension === "adaptation_input") return ["responsive-main"];
  if (property.dimension === "accessibility") return ["accessibility-main"];
  if (
    property.dimension === "visual_content" ||
    property.dimension === "component_control"
  )
    return ["frame-main", "token-main"];
  if (property.dimension === "state_interaction") return ["transition-main"];
  return ["frame-main"];
}

function comparatorFor(method) {
  return (
    {
      layout_geometry: "geometry_delta",
      visual_pixel: "pixel_diff",
      design_token: "token_resolution",
      content: "content_equal",
      component_state: "state_equal",
      interaction_trace: "trace_equal",
      motion_timeline: "trace_equal",
      responsive_reflow: "geometry_delta",
      input_method: "state_equal",
      accessibility_semantics: "state_equal",
      asset_integrity: "asset_equal",
    }[method] ?? "exact_value"
  );
}

function canonicalFactValue(
  subjectRef,
  conditionRef,
  variationRef,
  propertyRef,
) {
  const context = {
    subject_ref: subjectRef,
    condition_ref: conditionRef,
    variation_ref: variationRef,
  };
  return (
    {
      "geometry.coordinate-system": "css-pixel",
      "geometry.width": "320px",
      "system.render-environment": {
        ...context,
        environment_ref: "environment.fixture",
      },
      "responsive.reflow": {
        ...context,
        strategy: "single-column",
        breakpoint: "desktop-1440x900",
      },
      "system.keyboard-ime-avoidance": {
        ...context,
        strategy: "resize",
        inset_source: "ime",
      },
      "interaction.trigger": {
        ...context,
        event: "press",
        phase: "press-in",
      },
      "motion.duration": 180,
      "accessibility.role": "button",
      "content.copy": "Card label",
      "relation.relative-spacing": {
        ...context,
        from_subject_ref: "component.card",
        to_subject_ref: "part.card-label",
        axis: "inline",
        distance: "8px",
      },
      "asset.identity": "fixture-hero",
    }[propertyRef] ?? {
      ...context,
      property_ref: propertyRef,
    }
  );
}

function createResources({
  resource,
  tokens,
  designSpec,
  componentSpec,
  supportingNotes,
}) {
  return [
    resourceItem(
      "resource.main",
      "exact_target",
      DESIGN_RESOURCE_PATH,
      "text/html",
      sha256(resource),
    ),
    resourceItem(
      "resource.tokens",
      "supporting",
      DESIGN_TOKEN_PATH,
      "text/css",
      sha256(tokens),
    ),
    resourceItem(
      "resource.design-spec",
      "supporting",
      DESIGN_SPEC_PATH,
      "text/markdown",
      sha256(designSpec),
    ),
    resourceItem(
      "resource.component-spec",
      "supporting",
      DESIGN_COMPONENT_SPEC_PATH,
      "application/json",
      sha256(componentSpec),
    ),
    resourceItem(
      "resource.supporting-notes",
      "supporting",
      DESIGN_SUPPORT_PATH,
      "text/plain",
      sha256(supportingNotes),
    ),
  ];
}

function resourceItem(key, role, file, mediaType, digest) {
  return {
    key,
    role,
    path: file,
    media_type: mediaType,
    sha256: digest,
    editable_upstream: {
      owner: "fixture-design-owner",
      locator: `od://projects/fixture-project/${key}`,
      update_route: "Create and select a new immutable export.",
    },
  };
}

function createCensus({
  conditions,
  subjects,
  variations,
  axisDispositions,
  variationAxisDispositions,
  factCells,
  facts,
  lineageNodes,
  resources,
}) {
  const entries = [];
  const factBySubject = groupBy(facts, (fact) => fact.subject_ref);
  const cellsBySubject = groupBy(factCells, (cell) => cell.subject_ref);
  const resourceFactRefs = resourceFactMap(facts, lineageNodes);
  for (const resource of resources) {
    const factRefs = resourceFactRefs.get(resource.key) ?? [];
    entries.push({
      key: `census.resource.${safeKey(resource.key)}`,
      kind: "resource",
      resource_ref: resource.key,
      locator: { kind: "whole_resource", value: "." },
      disposition: factRefs.length ? "covered" : "non_material",
      fact_refs: factRefs,
      fact_cell_refs: [],
    });
  }
  for (const spec of SUBJECT_SPECS) {
    const subjectFacts = (factBySubject.get(spec.key) ?? []).map(
      (fact) => fact.key,
    );
    const subjectCells = (cellsBySubject.get(spec.key) ?? []).map(
      (cell) => cell.key,
    );
    entries.push({
      key: `census.subject.${safeKey(spec.key)}`,
      kind: spec.kind === "relation" ? "relation" : "node",
      resource_ref: spec.spec ? "resource.component-spec" : "resource.main",
      locator: spec.spec
        ? {
            kind: "json_pointer",
            value: `/subjects/${pointer(spec.key)}`,
          }
        : { kind: "html_selector", value: spec.selector },
      disposition: "covered",
      fact_refs: subjectFacts,
      fact_cell_refs: subjectFacts.length ? [] : subjectCells,
    });
  }
  for (const axis of axisDispositions)
    for (const value of axis.values) {
      if (!value.census_refs.length) continue;
      const matchingConditions = conditions.filter((condition) =>
        conditionMatchesAxis(condition, axis.axis, value.key),
      );
      entries.push({
        key: value.census_refs[0],
        kind: "declaration",
        resource_ref: "resource.component-spec",
        locator: {
          kind: "json_pointer",
          value: `/axes/${pointer(axis.axis)}/${pointer(value.key)}`,
        },
        disposition: "covered",
        fact_refs: [],
        fact_cell_refs: factCells
          .filter((cell) =>
            matchingConditions.some(
              (condition) => condition.key === cell.condition_ref,
            ),
          )
          .map((cell) => cell.key),
      });
    }
  for (const axis of variationAxisDispositions)
    for (const value of axis.values) {
      if (!value.census_refs.length) continue;
      const matchingVariations = variations.filter(
        (variation) =>
          variation.subject_ref === axis.subject_ref &&
          variation[axis.axis] === value.key,
      );
      entries.push({
        key: value.census_refs[0],
        kind:
          axis.axis === "state"
            ? "state"
            : axis.axis === "interaction_phase"
              ? "interaction_phase"
              : "variant",
        resource_ref: "resource.component-spec",
        locator: {
          kind: "json_pointer",
          value: `/variation_axes/${pointer(axis.key)}/${pointer(value.key)}`,
        },
        disposition: "covered",
        fact_refs: [],
        fact_cell_refs: factCells
          .filter((cell) =>
            matchingVariations.some(
              (variation) => variation.key === cell.variation_ref,
            ),
          )
          .map((cell) => cell.key),
      });
    }
  for (const node of lineageNodes) {
    const factRefs = facts
      .filter((fact) =>
        [
          ...fact.lineage.token_chain_refs,
          ...fact.lineage.override_chain_refs,
        ].includes(node.key),
      )
      .map((fact) => fact.key);
    entries.push({
      key: node.census_refs[0],
      kind: "token",
      resource_ref: node.value.locator.resource_ref,
      locator: {
        kind: node.value.locator.kind,
        value: node.value.locator.value,
      },
      disposition: "covered",
      fact_refs: factRefs,
      fact_cell_refs: [],
    });
  }
  return entries.map((entry) => ({
    ...entry,
    source_item_refs: [DESIGN_SOURCE_ITEM_KEY],
    basis_refs: [DESIGN_SOURCE_ITEM_KEY],
    rationale:
      entry.disposition === "covered"
        ? "The frozen Inspector located this addressable item and bound it to the exact Fact or Fact Cell universe."
        : "The frozen Inspector located this addressable item and the scoped Source explicitly classifies it as non-material supporting context.",
  }));
}

function resourceFactMap(facts, lineageNodes) {
  const lineageByKey = new Map(lineageNodes.map((node) => [node.key, node]));
  const result = new Map();
  for (const fact of facts) {
    for (const ref of [
      fact.value.locator.resource_ref,
      ...[
        ...fact.lineage.token_chain_refs,
        ...fact.lineage.override_chain_refs,
      ].map((key) => lineageByKey.get(key).value.locator.resource_ref),
      ...fact.evidence_refs.map((key) =>
        [
          "frame-main",
          "transition-main",
          "responsive-main",
          "asset-main",
        ].includes(key)
          ? "resource.main"
          : key === "token-main"
            ? "resource.tokens"
            : "resource.component-spec",
      ),
    ]) {
      const rows = result.get(ref) ?? [];
      rows.push(fact.key);
      result.set(ref, [...new Set(rows)]);
    }
  }
  return result;
}

function createCoverage({
  factCells,
  facts,
  proofObligations,
  evidence,
  properties,
}) {
  const propertyByKey = new Map(
    properties.map((property) => [property.key, property]),
  );
  const factByKey = new Map(facts.map((fact) => [fact.key, fact]));
  const groups = new Map();
  for (const cell of factCells) {
    const dimension = propertyByKey.get(cell.property_ref).dimension;
    const key = `${dimension}\0${cell.disposition}`;
    const rows = groups.get(key) ?? [];
    rows.push(cell);
    groups.set(key, rows);
  }
  return [...groups.entries()].map(([identity, cells]) => {
    const [dimension, disposition] = identity.split("\0");
    const localFacts = cells
      .map((cell) => (cell.fact_ref ? factByKey.get(cell.fact_ref) : null))
      .filter(Boolean);
    const factRefs = localFacts.map((fact) => fact.key);
    const localProofs = proofObligations.filter((proof) =>
      factRefs.includes(proof.fact_ref),
    );
    return {
      key: `coverage.${dimension}.${disposition}`,
      subject_refs: uniqueSorted(cells.map((cell) => cell.subject_ref)),
      dimension,
      disposition,
      target_refs: uniqueSorted(cells.map((cell) => cell.target_ref)),
      condition_refs: uniqueSorted(cells.map((cell) => cell.condition_ref)),
      variation_refs: uniqueSorted(cells.map((cell) => cell.variation_ref)),
      property_refs: uniqueSorted(cells.map((cell) => cell.property_ref)),
      evidence_refs: uniqueSorted(
        localFacts.flatMap((fact) => fact.evidence_refs),
      ),
      fact_cell_refs: cells.map((cell) => cell.key),
      fact_refs: factRefs,
      proof_obligation_refs: localProofs.map((proof) => proof.key),
      source_item_refs: [DESIGN_SOURCE_ITEM_KEY],
      verification_methods: uniqueSorted(
        localProofs.map((proof) => proof.method),
      ),
      rationale:
        disposition === "covered"
          ? `Every ${dimension} Fact Cell is indexed with its exact proof obligations.`
          : `Every non-applicable ${dimension} Fact Cell is explicitly closed.`,
    };
  });
}

function createResourceClosure(
  resources,
  facts,
  proofObligations,
  environments,
  evidence,
  lineageNodes,
) {
  const evidenceByKey = new Map(evidence.map((item) => [item.key, item]));
  const environmentByKey = new Map(
    environments.map((item) => [item.key, item]),
  );
  const lineageByKey = new Map(lineageNodes.map((item) => [item.key, item]));
  return resources.map((resource) => {
    const factRefs = facts
      .filter((fact) => {
        const proofs = proofObligations.filter(
          (proof) => proof.fact_ref === fact.key,
        );
        return (
          fact.value.locator.resource_ref === resource.key ||
          fact.lineage.resolved_value.locator.resource_ref === resource.key ||
          [
            ...fact.lineage.token_chain_refs,
            ...fact.lineage.override_chain_refs,
          ].some(
            (ref) =>
              lineageByKey.get(ref)?.value.locator.resource_ref ===
              resource.key,
          ) ||
          fact.evidence_refs.some(
            (ref) => evidenceByKey.get(ref)?.resource_ref === resource.key,
          ) ||
          proofs.some((proof) =>
            [
              proof.comparison.parameters,
              proof.comparison.tolerance,
              proof.comparison.mask,
              environmentByKey.get(proof.environment_ref)?.definition,
            ]
              .filter(Boolean)
              .some(
                (locatedValue) =>
                  locatedValue.locator.resource_ref === resource.key,
              ),
          )
        );
      })
      .map((fact) => fact.key);
    return {
      key: `closure.${safeKey(resource.key)}`,
      resource_ref: resource.key,
      disposition: factRefs.length ? "material_with_facts" : "supporting_only",
      fact_refs: factRefs,
      inspection: {
        status: "complete",
        inspector: "fixture-design-fact-inspector@1.0.0",
      },
      rationale: factRefs.length
        ? "Every located Fact in this immutable resource is indexed."
        : "The frozen Inspector classified this resource as non-material support.",
    };
  });
}

function synchronizeManifest(manifest, handoff) {
  for (const [manifestKey, handoffKey = manifestKey] of [
    ["axis_dispositions"],
    ["condition_exclusions"],
    ["conditions"],
    ["subjects"],
    ["variation_axis_dispositions"],
    ["variation_exclusions"],
    ["variations"],
    ["properties"],
    ["lineage_nodes"],
    ["fact_cells"],
    ["facts"],
    ["evidence"],
    ["proof_obligations"],
    ["oracles"],
    ["environments"],
    ["asset_bindings"],
    ["acceptance_blockers"],
  ])
    manifest[manifestKey] = structuredClone(handoff[handoffKey]);
  manifest.generation = generationFor(manifestCollections(manifest));
}

function generationFor(collections) {
  return {
    strategy: "complete_explicit",
    sampling: "forbidden",
    truncation: "forbidden",
    chunk_count: 1,
    chunk_indexes: [0],
    collections: DESIGN_RESOURCE_MANIFEST_COLLECTIONS.map((name) => ({
      name,
      expected_count: collections[name].length,
      identity_sha256: identityDigest(collections[name]),
    })),
  };
}

function manifestCollections(manifest) {
  return {
    inspector_inputs: manifest.inspector.input_resources,
    inspector_census: manifest.inspector.census,
    axis_dispositions: manifest.axis_dispositions,
    condition_exclusions: manifest.condition_exclusions,
    conditions: manifest.conditions,
    subjects: manifest.subjects,
    variation_axis_dispositions: manifest.variation_axis_dispositions,
    variation_exclusions: manifest.variation_exclusions,
    variations: manifest.variations,
    properties: manifest.properties,
    lineage_nodes: manifest.lineage_nodes,
    fact_cells: manifest.fact_cells,
    facts: manifest.facts,
    evidence: manifest.evidence,
    proof_obligations: manifest.proof_obligations,
    oracles: manifest.oracles,
    environments: manifest.environments,
    asset_bindings: manifest.asset_bindings,
    acceptance_blockers: manifest.acceptance_blockers,
  };
}

function conditionMatchesAxis(condition, axis, value) {
  const special = {
    viewport: condition.viewport.key,
    density: condition.density.key,
    safe_area: condition.safe_area.key,
    text_scale: condition.text_scale.key,
  };
  return (special[axis] ?? condition[axis]) === value;
}

function evidenceItem(key, kind, resourceRef, locatorKind, locatorValue) {
  return {
    key,
    resource_ref: resourceRef,
    kind,
    locator: {
      kind: locatorKind,
      value: locatorValue,
    },
    condition_refs: [...DESIGN_CONDITION_KEYS],
  };
}

function located(resourceRef, kind, value, digest) {
  return {
    locator: { resource_ref: resourceRef, kind, value },
    sha256: digest,
  };
}

function identityDigest(rows) {
  return sha256(rows.map(stableJson).sort().join("\n"));
}

function stableJson(value) {
  if (Array.isArray(value))
    return `[${value.map((item) => stableJson(item)).join(",")}]`;
  if (value && typeof value === "object")
    return `{${Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => `${JSON.stringify(key)}:${stableJson(entry)}`)
      .join(",")}}`;
  return JSON.stringify(value);
}

function sha256Stable(value) {
  return sha256(stableJson(value));
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function safeKey(value) {
  return value.replace(/[^a-z0-9._-]/gu, "-");
}

function pointer(value) {
  return value.replace(/~/gu, "~0").replace(/\//gu, "~1");
}

function uniqueSorted(values) {
  return [...new Set(values)].sort();
}

function groupBy(rows, key) {
  const result = new Map();
  for (const row of rows) {
    const identity = key(row);
    const group = result.get(identity) ?? [];
    group.push(row);
    result.set(identity, group);
  }
  return result;
}

function cartesian(groups) {
  let result = [[]];
  for (const group of groups)
    result = result.flatMap((prefix) => group.map((item) => [...prefix, item]));
  return result;
}
