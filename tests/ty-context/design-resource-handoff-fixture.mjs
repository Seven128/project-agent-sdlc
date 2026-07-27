import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import YAML from "yaml";

export const DESIGN_HANDOFF_PATH = "design/handoff.md";
export const DESIGN_RESOURCE_PATH = "design/page.html";
export const DESIGN_TOKEN_PATH = "design/tokens.css";
export const DESIGN_SPEC_PATH = "design/design-spec.md";
export const DESIGN_COMPONENT_SPEC_PATH = "design/component-spec.json";
export const DESIGN_RESOURCE_PATHS = [
  DESIGN_RESOURCE_PATH,
  DESIGN_TOKEN_PATH,
  DESIGN_SPEC_PATH,
  DESIGN_COMPONENT_SPEC_PATH,
];
export const DESIGN_SOURCE_ITEM_KEY = "design-main";
export const DESIGN_TARGET_KEY = "main-default";
export const DESIGN_CONDITION_KEY = "desktop-default";

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
  await writeFile(path.join(root, DESIGN_RESOURCE_PATH), resource);
  await writeFile(path.join(root, DESIGN_TOKEN_PATH), tokens);
  await writeFile(path.join(root, DESIGN_SPEC_PATH), designSpec);
  await writeFile(path.join(root, DESIGN_COMPONENT_SPEC_PATH), componentSpec);
  const handoff = createDesignResourceHandoff({
    resource: sha256(resource),
    tokens: sha256(tokens),
    designSpec: sha256(designSpec),
    componentSpec: sha256(componentSpec),
  });
  mutate?.(handoff);
  await writeDesignResourceHandoff(root, handoff);
  return { handoff, resource };
}

export async function writeDesignResourceHandoff(root, handoff) {
  const sourceStatement =
    "The main surface must conform to every declared design-resource dimension.";
  const markdown = `<!-- ty-source-background:start key=design-handoff-heading reason=markdown-structure -->
# Main design implementation handoff

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
    ],
    conditions: [
      {
        key: DESIGN_CONDITION_KEY,
        platform: "desktop-web",
        viewport: { width: 1440, height: 900, unit: "px" },
        modes: ["light"],
        states: ["default", "expanded", "focused"],
        content_cases: ["nominal", "long-copy"],
        input_methods: ["mouse", "keyboard"],
        motion: "full",
      },
    ],
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
        ],
        condition_refs: [DESIGN_CONDITION_KEY],
        source_profile: {
          kind: "implementation_web",
          entry_resource_ref: "resource.main",
          dependency_resource_refs: [
            "resource.tokens",
            "resource.design-spec",
            "resource.component-spec",
          ],
          acquisition: "complete",
        },
        selection_basis: "Explicit fixture selection.",
      },
    ],
    evidence,
    coverage: [
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
        ["visual_pixel", "design_token"],
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
        ["responsive-main"],
        ["responsive_reflow"],
      ),
      coverage(
        "accessibility",
        "accessibility",
        ["accessibility-main"],
        ["accessibility_semantics"],
      ),
      coverage("assets", "assets", ["asset-main"], ["asset_integrity"]),
    ],
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
    condition_refs: [DESIGN_CONDITION_KEY],
  };
}

function coverage(key, dimension, evidenceRefs, verificationMethods) {
  return {
    key: `coverage.${key}`,
    subject_refs: ["surface.main"],
    dimension,
    disposition: "covered",
    target_refs: [DESIGN_TARGET_KEY],
    condition_refs: [DESIGN_CONDITION_KEY],
    evidence_refs: evidenceRefs,
    source_item_refs: [DESIGN_SOURCE_ITEM_KEY],
    verification_methods: verificationMethods,
    rationale: `The selected resource explicitly covers ${dimension}.`,
  };
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}
