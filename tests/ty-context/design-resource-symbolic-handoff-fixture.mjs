import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import YAML from "yaml";
import {
  SYMBOLIC_HANDOFF_PATH,
  SYMBOLIC_MANIFEST_PATH,
  SYMBOLIC_SOURCE_ITEM_KEY,
  SYMBOLIC_TARGET_KEY,
} from "./design-resource-symbolic-handoff-fixture-constants.mjs";
import { buildSymbolicFixtureModel } from "./design-resource-symbolic-handoff-fixture-model.mjs";
import { fixtureResource } from "./design-resource-symbolic-handoff-fixture-support.mjs";

export {
  SYMBOLIC_HANDOFF_PATH,
  SYMBOLIC_MANIFEST_PATH,
  SYMBOLIC_SOURCE_ITEM_KEY,
  SYMBOLIC_TARGET_KEY,
};

export async function writeDesignResourceSymbolicHandoffFixture(
  root,
  mutate,
  { directory = "design", modelFactory = buildSymbolicFixtureModel } = {},
) {
  const handoffPath = `${directory}/symbolic-handoff.md`;
  const manifestPath = `${directory}/symbolic-rules.json`;
  const pagePath = `${directory}/page.html`;
  const valuesPath = `${directory}/values.json`;
  await mkdir(path.join(root, directory), { recursive: true });
  const page = '<!doctype html><main id="root">Symbolic target</main>\n';
  const values = {
    width: "100px",
    background: "#ffffff",
    parameters: { mode: "exact" },
    environment: { browser: "fixture", scale: 1 },
  };
  const valuesContent = `${JSON.stringify(values, null, 2)}\n`;
  await writeFile(path.join(root, pagePath), page);
  await writeFile(path.join(root, valuesPath), valuesContent);
  const resourcesWithoutManifest = [
    fixtureResource(
      "resource.page",
      "exact_target",
      pagePath,
      "text/html",
      page,
    ),
    fixtureResource(
      "resource.values",
      "supporting",
      valuesPath,
      "application/json",
      valuesContent,
    ),
  ];
  const model = modelFactory(resourcesWithoutManifest, values);
  await mutate?.(model);
  const { manifest, rules, certificate, dependencyEdges } = model;
  const manifestContent = `${JSON.stringify(manifest, null, 2)}\n`;
  await writeFile(path.join(root, manifestPath), manifestContent);
  const manifestResource = fixtureResource(
    "resource.symbolic-manifest",
    "supporting",
    manifestPath,
    "application/json",
    manifestContent,
  );
  const handoff = buildSymbolicHandoff(
    resourcesWithoutManifest,
    manifestResource,
    manifest,
    certificate,
  );
  const markdown = `<!-- ty-source-item:start key=${SYMBOLIC_SOURCE_ITEM_KEY} kind=requirement -->
The symbolic fixture preserves every declared atomic design rule.
<!-- ty-source-item:end -->

\`\`\`yaml design-resource-handoff-v2
${YAML.stringify(handoff, { lineWidth: 0 }).trimEnd()}
\`\`\`
`;
  await writeFile(path.join(root, handoffPath), markdown);
  return {
    handoff,
    manifest,
    rules,
    certificate,
    dependencyEdges,
    model,
    handoffPath,
    manifestPath,
  };
}

function buildSymbolicHandoff(
  resourcesWithoutManifest,
  manifestResource,
  manifest,
  certificate,
) {
  return {
    schema_version: "design-resource-handoff-v2",
    representation: "symbolic_rules_v2",
    intent: "implementation_handoff",
    scope: {
      key: "symbolic-scope",
      style_dependency: "style-bearing",
      surface_keys: ["surface.root"],
      necessary_context: ["DESIGN.md"],
      exclusions: [],
    },
    provenance: {
      provider: "fixture",
      provider_version: "1",
      project: "fixture",
      run: "symbolic-v2",
      capability: "symbolic_rules_v2",
      agent: "fixture",
      model: "fixture",
      design_system_id: "symbolic-fixture-system",
    },
    resources: [...resourcesWithoutManifest, manifestResource],
    targets: [
      {
        key: SYMBOLIC_TARGET_KEY,
        interpretation: "exact_target",
        resource_refs: [
          "resource.page",
          "resource.values",
          "resource.symbolic-manifest",
        ],
        source_profile: {
          kind: "implementation_web",
          entry_resource_ref: "resource.page",
          dependency_resource_refs: [
            "resource.values",
            "resource.symbolic-manifest",
          ],
          fact_manifest_resource_ref: "resource.symbolic-manifest",
          acquisition: "complete",
        },
        selection_basis: "Selected exact symbolic fixture target.",
      },
    ],
    coverage: [
      {
        key: "coverage.symbolic-main",
        target_ref: SYMBOLIC_TARGET_KEY,
        subject_or_relation_refs: manifest.subjects.map((item) => item.key),
        property_refs: manifest.properties.map((item) => item.key),
        fact_rule_refs: manifest.fact_rules.map((item) => item.key),
        semantic_obligation_refs: manifest.semantic_proof_obligations.map(
          (item) => item.key,
        ),
        certificate_refs: [certificate.key],
        source_item_refs: [SYMBOLIC_SOURCE_ITEM_KEY],
        rationale: "Exact symbolic target closure.",
      },
    ],
    proposal: {
      reconciliation_status: "applied",
      path: "DESIGN.md",
      revision: "symbolic-fixture-v1",
    },
  };
}
