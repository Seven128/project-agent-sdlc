import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import YAML from "yaml";

export const DESIGN_HANDOFF_PATH = "design/handoff.md";
export const DESIGN_RESOURCE_PATH = "design/page.html";
export const DESIGN_TOKEN_PATH = "design/tokens.css";
export const DESIGN_SPEC_PATH = "design/design-spec.md";
export const DESIGN_COMPONENT_SPEC_PATH = "design/component-spec.json";
export const DESIGN_SUPPORT_PATH = "design/supporting-notes.txt";
export const DESIGN_RESOURCE_PATHS = [
  DESIGN_RESOURCE_PATH,
  DESIGN_TOKEN_PATH,
  DESIGN_SPEC_PATH,
  DESIGN_COMPONENT_SPEC_PATH,
  DESIGN_SUPPORT_PATH,
];
export const DESIGN_SOURCE_ITEM_KEY = "design-main";
export const DESIGN_TARGET_KEY = "main-default";
const DESIGN_CONDITION_CASES = ["default", "expanded", "focused"].flatMap(
  (state) =>
    ["nominal", "long-copy"].flatMap((contentCase) =>
      ["mouse", "keyboard"].map((inputMethod) => ({
        key: `desktop-light-${state}-${contentCase}-${inputMethod}`,
        state,
        contentCase,
        inputMethod,
      })),
    ),
);
export const DESIGN_CONDITION_KEYS = DESIGN_CONDITION_CASES.map(
  (condition) => condition.key,
);
export const DESIGN_CONDITION_KEY = DESIGN_CONDITION_KEYS[0];

export async function writeDesignResourceHandoffFixture(root, mutate) {
  await mkdir(path.join(root, "design"), { recursive: true });
  const resource = `<!doctype html>
<html>
<head><link rel="stylesheet" href="tokens.css"></head>
<body>
  <main id="design-target">
    <section id="frame-main">Design target</section>
    <button id="transition-main" data-state="expanded">Toggle</button>
    <section id="responsive-main">Responsive region</section>
    <section id="accessibility-main" aria-label="Accessible region">Semantics</section>
    <img id="asset-main" alt="Fixture asset">
  </main>
</body>
</html>
`;
  const tokens = ":root {\n  --fixture-accent: #3366ff;\n}\n";
  const designSpec =
    "# Design specification\n\n## Responsive behavior\n\nReflow at the declared viewport.\n";
  const componentSpec = `${JSON.stringify(
    { accessibility: { role: "main", name: "Accessible region" } },
    null,
    2,
  )}\n`;
  const supportingNotes =
    "This file records export provenance and carries no UI/UX fact.\n";
  await writeFile(path.join(root, DESIGN_RESOURCE_PATH), resource);
  await writeFile(path.join(root, DESIGN_TOKEN_PATH), tokens);
  await writeFile(path.join(root, DESIGN_SPEC_PATH), designSpec);
  await writeFile(path.join(root, DESIGN_COMPONENT_SPEC_PATH), componentSpec);
  await writeFile(path.join(root, DESIGN_SUPPORT_PATH), supportingNotes);
  const handoff = createDesignResourceHandoff({
    resource: sha256(resource),
    tokens: sha256(tokens),
    designSpec: sha256(designSpec),
    componentSpec: sha256(componentSpec),
    supportingNotes: sha256(supportingNotes),
  });
  mutate?.(handoff);
  await writeDesignResourceHandoff(root, handoff);
  return { handoff, resource };
}

export async function writeDesignResourceHandoff(root, handoff) {
  const sourceStatement =
    "The main surface must conform to every declared design-resource dimension.";
  const markdown = `<!-- ty-source-background:start key=design-handoff-heading reason=markdown-structure -->
<a id="main-design"></a>
<!-- ty-source-background:end -->

<!-- ty-source-item:start key=${DESIGN_SOURCE_ITEM_KEY} kind=requirement -->
${sourceStatement}
<!-- ty-source-item:end -->

\`\`\`yaml design-resource-handoff-v1
${YAML.stringify(handoff, { lineWidth: 0 }).trimEnd()}
\`\`\`
`;
  await writeFile(path.join(root, DESIGN_HANDOFF_PATH), markdown);
}

export function createDesignResourceHandoff(resourceSha256) {
  const evidence = [
    evidenceItem(
      "frame-main",
      "frame",
      "resource.main",
      "html_selector",
      "#frame-main",
    ),
    evidenceItem(
      "transition-main",
      "prototype_transition",
      "resource.main",
      "html_selector",
      "#transition-main",
    ),
    evidenceItem(
      "responsive-main",
      "responsive_spec",
      "resource.design-spec",
      "markdown_anchor",
      "responsive-behavior",
    ),
    evidenceItem(
      "input-main",
      "input_spec",
      "resource.main",
      "html_selector",
      "#transition-main",
    ),
    evidenceItem(
      "accessibility-main",
      "accessibility_spec",
      "resource.component-spec",
      "json_pointer",
      "/accessibility/role",
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
  const coverageRows = [
    coverage(
      "surface-flow",
      "surface_flow",
      ["frame-main"],
      ["layout_geometry"],
    ),
    coverage(
      "visual-content",
      "visual_content",
      ["frame-main", "token-main"],
      ["visual_pixel", "design_token", "content"],
    ),
    coverage(
      "component-control",
      "component_control",
      ["frame-main", "token-main"],
      ["visual_pixel", "component_state"],
    ),
    coverage(
      "state-interaction",
      "state_interaction",
      ["transition-main"],
      ["component_state", "interaction_trace"],
    ),
    coverage("motion", "motion", ["transition-main"], ["motion_timeline"]),
    coverage(
      "adaptation-input",
      "adaptation_input",
      ["responsive-main", "input-main"],
      ["responsive_reflow", "input_method"],
    ),
    coverage(
      "accessibility",
      "accessibility",
      ["accessibility-main"],
      ["accessibility_semantics"],
    ),
    coverage("assets", "assets", ["asset-main"], ["asset_integrity"]),
  ];
  const facts = coverageRows.flatMap((row) =>
    DESIGN_CONDITION_KEYS.flatMap((conditionRef) =>
      row.verification_methods.map((method) => ({
        key: `fact.${row.key.slice("coverage.".length)}.${method}.${conditionRef}`,
        subject_ref: "surface.main",
        target_ref: DESIGN_TARGET_KEY,
        condition_ref: conditionRef,
        dimension: row.dimension,
        observation_scope:
          (row.dimension === "surface_flow" && method === "layout_geometry") ||
          (row.dimension === "visual_content" && method === "visual_pixel")
            ? "full_target"
            : "subject",
        evidence_refs: [...row.evidence_refs],
        source_item_refs: [DESIGN_SOURCE_ITEM_KEY],
        verification_method: method,
      })),
    ),
  );
  for (const row of coverageRows)
    row.fact_refs = facts
      .filter((fact) => fact.dimension === row.dimension)
      .map((fact) => fact.key);
  const evidenceByKey = new Map(evidence.map((item) => [item.key, item]));
  const resourceFactClosure = [
    "resource.main",
    "resource.tokens",
    "resource.design-spec",
    "resource.component-spec",
    "resource.supporting-notes",
  ].map((resourceRef) => {
    const factRefs = facts
      .filter((fact) =>
        fact.evidence_refs.some(
          (evidenceRef) =>
            evidenceByKey.get(evidenceRef)?.resource_ref === resourceRef,
        ),
      )
      .map((fact) => fact.key);
    return {
      key: `closure.${resourceRef.slice("resource.".length)}`,
      resource_ref: resourceRef,
      disposition: factRefs.length ? "material_with_facts" : "supporting_only",
      fact_refs: factRefs,
      inspection: {
        status: "complete",
        inspector: "fixture-design-fact-extractor-v1",
      },
      rationale: factRefs.length
        ? "Every located fact in this immutable resource is indexed."
        : "The inspected resource carries export provenance only.",
    };
  });
  return {
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
    resources: [
      {
        key: "resource.main",
        role: "exact_target",
        path: DESIGN_RESOURCE_PATH,
        media_type: "text/html",
        sha256: resourceSha256.resource,
        editable_upstream: {
          owner: "fixture-design-owner",
          locator: "od://projects/fixture-project",
          update_route: "Create and select a new immutable export.",
        },
      },
      {
        key: "resource.tokens",
        role: "supporting",
        path: DESIGN_TOKEN_PATH,
        media_type: "text/css",
        sha256: resourceSha256.tokens,
        editable_upstream: {
          owner: "fixture-design-owner",
          locator: "od://projects/fixture-project/tokens",
          update_route: "Create and select a new immutable export.",
        },
      },
      {
        key: "resource.design-spec",
        role: "supporting",
        path: DESIGN_SPEC_PATH,
        media_type: "text/markdown",
        sha256: resourceSha256.designSpec,
        editable_upstream: {
          owner: "fixture-design-owner",
          locator: "od://projects/fixture-project/design-spec",
          update_route: "Create and select a new immutable export.",
        },
      },
      {
        key: "resource.component-spec",
        role: "supporting",
        path: DESIGN_COMPONENT_SPEC_PATH,
        media_type: "application/json",
        sha256: resourceSha256.componentSpec,
        editable_upstream: {
          owner: "fixture-design-owner",
          locator: "od://projects/fixture-project/component-spec",
          update_route: "Create and select a new immutable export.",
        },
      },
      {
        key: "resource.supporting-notes",
        role: "supporting",
        path: DESIGN_SUPPORT_PATH,
        media_type: "text/plain",
        sha256: resourceSha256.supportingNotes,
        editable_upstream: {
          owner: "fixture-design-owner",
          locator: "od://projects/fixture-project/supporting-notes",
          update_route: "Create and select a new immutable export.",
        },
      },
    ],
    conditions: DESIGN_CONDITION_CASES.map(
      ({ key, state, contentCase, inputMethod }) => {
      return {
        key,
        platform: "desktop-web",
        viewport: { width: 1440, height: 900, unit: "px" },
        modes: ["light"],
        states: [state],
        content_cases: [contentCase],
        input_methods: [inputMethod],
        motion: "full",
        };
      },
    ),
    subjects: [
      {
        key: "surface.main",
        kind: "surface",
        stable_keys: ["surface.main", "control.main"],
        target_refs: [DESIGN_TARGET_KEY],
      },
    ],
    targets: [
      {
        key: DESIGN_TARGET_KEY,
        interpretation: "exact_target",
        resource_refs: [
          "resource.main",
          "resource.tokens",
          "resource.design-spec",
          "resource.component-spec",
          "resource.supporting-notes",
        ],
        condition_refs: [...DESIGN_CONDITION_KEYS],
        source_profile: {
          kind: "implementation_web",
          entry_resource_ref: "resource.main",
          dependency_resource_refs: [
            "resource.tokens",
            "resource.design-spec",
            "resource.component-spec",
            "resource.supporting-notes",
          ],
          acquisition: "complete",
        },
        selection_basis: "Explicit fixture selection.",
      },
    ],
    evidence,
    facts,
    resource_fact_closure: resourceFactClosure,
    coverage: coverageRows,
    acceptance_blockers: [],
    proposal: {
      reconciliation_status: "applied",
      path: "proposal.md",
      revision: "fixture-selected-v1",
    },
  };
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

function coverage(key, dimension, evidenceRefs, verificationMethods) {
  return {
    key: `coverage.${key}`,
    subject_refs: ["surface.main"],
    dimension,
    disposition: "covered",
    target_refs: [DESIGN_TARGET_KEY],
    condition_refs: [...DESIGN_CONDITION_KEYS],
    evidence_refs: evidenceRefs,
    fact_refs: [],
    source_item_refs: [DESIGN_SOURCE_ITEM_KEY],
    verification_methods: verificationMethods,
    rationale: `The selected resource explicitly covers ${dimension}.`,
  };
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}
