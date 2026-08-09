import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  symbolicDeliveryItems,
  symbolicSemanticAssertionKeys,
} from "../../tools/symbolic_denotation_efficiency_delivery_catalog.mjs";

const repositoryRoot = fileURLToPath(new URL("../..", import.meta.url));
const rolloutMarker =
  "UI symbolic V2 is explicit opt-in; V1 remains the default.";
const scopeMarker =
  "Non-UI symbolic admission remains out of scope; machine-observer and verifier/runner trust-boundary closure is mandatory rather than deferred Provider/P0 work.";
const efficiencyMarker =
  "Purpose-fulfillment efficiency non-degradation is a package mechanism-change admission property, not an AcceptedDeliveryTerminal condition.";

test("public guidance and durable Context teach one opt-in V2 rollout", async () => {
  const required = [
    "README.md",
    "packages/ty-context/README.md",
    "PROJECT_SPEC.md",
    "project_context/areas/harness-package/contracts/design-resource-handoff.md",
    "project_context/areas/harness-package/implementation-index.md",
    "project_context/areas/harness-package/verification.md",
    ".codex/ty-context-managed/agents/AGENTS_CORE.md",
    ".codex/ty-context-managed/skills/long-task-workflow/SKILL.md",
    ".codex/ty-context-managed/skills/design-resource-authoring/references/downstream-handoff.md",
  ];
  for (const file of required) {
    const content = await text(file);
    assert.ok(
      content.includes(rolloutMarker),
      `${file}: missing rollout marker`,
    );
    assert.doesNotMatch(content, /no V2 marker is added/u, file);
  }

  for (const file of [
    "README.md",
    "packages/ty-context/README.md",
    "PROJECT_SPEC.md",
    "project_context/areas/harness-package/contracts/design-resource-handoff.md",
    ".codex/ty-context-managed/agents/AGENTS_CORE.md",
    ".codex/ty-context-managed/skills/long-task-workflow/SKILL.md",
  ])
    assert.ok((await text(file)).includes(scopeMarker), `${file}: scope drift`);

  for (const file of [
    "README.md",
    "packages/ty-context/README.md",
    "PROJECT_SPEC.md",
    "project_context/areas/harness-package/contracts/design-resource-handoff.md",
    ".codex/ty-context-managed/agents/AGENTS_CORE.md",
  ])
    assert.ok(
      (await text(file)).includes(efficiencyMarker),
      `${file}: efficiency theorem drift`,
    );

  const detailedSurfaces = await Promise.all([
    "README.md",
    "packages/ty-context/README.md",
    "PROJECT_SPEC.md",
    "project_context/areas/harness-package/contracts/design-resource-handoff.md",
    ".codex/ty-context-managed/skills/design-resource-authoring/references/formal-selected-web-app-handoff.md",
  ].map(async (file) => [file, await text(file)]));
  detailedSurfaces.push([
    "long-task-workflow progressive references",
    `${await text(
      ".codex/ty-context-managed/skills/long-task-workflow/references/contract-authoring.md",
    )}\n${await text(
      ".codex/ty-context-managed/skills/long-task-workflow/references/evidence-design.md",
    )}`,
  ]);
  for (const [file, content] of detailedSurfaces) {
    assert.match(
      content,
      /custom.property/u,
      `${file}: custom-property closure drift`,
    );
    assert.match(
      content,
      /instance exceptions/u,
      `${file}: instance exception drift`,
    );
    assert.match(content, /Source-side/u, `${file}: source proof side drift`);
    assert.match(
      content,
      /production-side/u,
      `${file}: production proof side drift`,
    );
    assert.match(
      content,
      /restricted-IR|restricted decidable IR|受限 IR/u,
      `${file}: trusted IR proof drift`,
    );
    assert.match(
      content,
      /frozen executable|frozen_executable/u,
      `${file}: frozen proof Oracle drift`,
    );
    assert.match(
      content,
      /symbolic_noninterference\.<side>\.<method>/u,
      `${file}: proof Oracle capability drift`,
    );
    assert.match(
      content,
      /dependency DAG/u,
      `${file}: static proof graph drift`,
    );
    assert.match(content, /memoiz/u, `${file}: shared proof DAG drift`);
    assert.match(
      content,
      /proof digest/u,
      `${file}: Final-Gate proof binding drift`,
    );
  }
});

test("managed source, installed workspace copies and package assets are exact", async () => {
  for (const [source, installed, packaged] of [
    [
      ".codex/ty-context-managed/skills/long-task-workflow/SKILL.md",
      ".codex/skills/long-task-workflow/SKILL.md",
      "packages/ty-context/assets/skills/long-task-workflow/SKILL.md",
    ],
    [
      ".codex/ty-context-managed/skills/design-resource-authoring/references/downstream-handoff.md",
      ".codex/skills/design-resource-authoring/references/downstream-handoff.md",
      "packages/ty-context/assets/skills/design-resource-authoring/references/downstream-handoff.md",
    ],
  ]) {
    const expected = await text(source);
    assert.equal(
      await text(installed),
      expected,
      `${installed}: managed drift`,
    );
    assert.equal(await text(packaged), expected, `${packaged}: package drift`);
  }
  assert.equal(
    await text("packages/ty-context/assets/agents/AGENTS_CORE.md"),
    await text(".codex/ty-context-managed/agents/AGENTS_CORE.md"),
  );
  assert.equal(
    await text("packages/ty-context/assets/README.md"),
    await text("README.md"),
  );
  assert.ok((await text("AGENTS.md")).includes(rolloutMarker));
});

test("public schema, exports and changed-path routing include symbolic V2", async () => {
  const schema = JSON.parse(
    await text(
      "packages/ty-context/src/schemas/long-task-delivery-v2/long-task-delivery-v2.schema.json",
    ),
  );
  assert.equal(
    schema.$defs.designTarget.properties.fact_model.const,
    "symbolic_rules_v2",
  );
  assert.ok("symbolic_method_bindings" in schema.$defs.designTarget.properties);
  assert.ok(
    "symbolic_certificate_binding" in schema.$defs.designTarget.properties,
  );
  assert.ok(
    schema.$defs.evidenceCapability.enum.includes(
      "design_symbolic_certificate",
    ),
  );
  const sourceIrSchema = JSON.parse(
    await text(
      "packages/ty-context/src/schemas/design-resource-symbolic-source-ir-v1.schema.json",
    ),
  );
  assert.equal(
    sourceIrSchema.properties.schema_version.const,
    "design-resource-symbolic-source-ir-v1",
  );
  const artifactSchema = JSON.parse(
    await text(
      "packages/ty-context/src/schemas/design-resource-symbolic-noninterference-artifact-v2.schema.json",
    ),
  );
  assert.equal(
    artifactSchema.properties.schema_version.const,
    "design-resource-symbolic-noninterference-artifact-v2",
  );

  const publicApi = `${await text("packages/ty-context/src/index.ts")}\n${await text(
    "packages/ty-context/src/public-types.ts",
  )}\n${await text(
    "packages/ty-context/src/lib/symbolic-denotation-public.ts",
  )}`;
  for (const name of [
    "symbolicDenotation",
    "DesignResourceHandoffV2",
    "DesignResourceHandoffPreflightV2",
    "DesignResourceObservableRuleManifestV2",
    "DesignResourceSymbolicNoninterferenceArtifactV2",
    "DesignResourceSymbolicSourceIrV1",
    "DESIGN_RESOURCE_SYMBOLIC_SOURCE_IR_SCHEMA_VERSION",
  ])
    assert.ok(publicApi.includes(name), `public export missing: ${name}`);

  const affected = await text("tools/affected_test_selection.mjs");
  for (const testFile of [
    "symbolic-denotation-equivalence.test.mjs",
    "symbolic-denotation-ui-v2.test.mjs",
    "long-task-symbolic-denotation-v2.test.mjs",
    "symbolic-denotation-efficiency-antidegradation.test.mjs",
    "symbolic-denotation-structural-efficiency.test.mjs",
    "design-resource-v1-capacity-guard.test.mjs",
  ])
    assert.ok(
      affected.includes(testFile),
      `affected routing missing: ${testFile}`,
    );
  assert.ok(
    (await text("tools/test_suite_policy.mjs")).includes(
      "symbolic-mixed-representation-closure",
    ),
    "Trust routing is missing the mixed V1/V2 false-completion sentinel",
  );

  for (const module of [
    "design-resource-symbolic-applicability-profiles.ts",
    "design-resource-symbolic-applicability-validation.ts",
    "design-resource-symbolic-compilation.ts",
    "design-resource-symbolic-indexes.ts",
    "design-resource-symbolic-noninterference-validation.ts",
  ])
    assert.match(
      await text(`packages/ty-context/src/lib/${module}`),
      /export /u,
      `implementation owner missing: ${module}`,
    );

  assert.equal(
    symbolicDeliveryItems.length,
    113,
    "Candidate B must revise the reproducible 113-Fact baseline rather than create an unbound fourth catalog",
  );
  const candidateBSource = new Map(
    symbolicDeliveryItems.map((item) => [item.key, item.statement]),
  );
  for (const [factKey, expected] of [
    [
      "canonical-shared-decision-dag",
      /manifest-level[\s\S]*axis partitions[\s\S]*memoization[\s\S]*indexes/iu,
    ],
    [
      "deterministic-canonical-identity",
      /unrelated numeric partition cut[\s\S]*DAG[\s\S]*digest[\s\S]*byte/iu,
    ],
    [
      "package-policy-property-catalog",
      /profiles[\s\S]*physical[\s\S]*logical subject-property point/iu,
    ],
    [
      "inspector-census-applicability",
      /custom-property set[\s\S]*instance exception[\s\S]*non-empty rationale/iu,
    ],
    [
      "certificate-dependency-edge-coverage",
      /exactly empty[\s\S]*memoized[\s\S]*unreachable nodes/iu,
    ],
    [
      "certificate-package-recomputation",
      /Source-side[\s\S]*production-side[\s\S]*static dependency closure[\s\S]*restricted decidable IR[\s\S]*finite complete domain[\s\S]*symbolic_noninterference/iu,
    ],
    [
      "complexity-parameter-verification",
      /639 subjects[\s\S]*217 properties[\s\S]*53 axes[\s\S]*5,245 variations[\s\S]*138,663[\s\S]*137,385/iu,
    ],
  ])
    assert.match(
      candidateBSource.get(factKey) ?? "",
      expected,
      `Candidate B semantic revision missing: ${factKey}`,
    );
});

test("semantic Fact materialization remains the sole runtime carrier for semantic assertions", () => {
  const materializedSemanticAssertions = new Set(
    symbolicDeliveryItems.map((item) => `semantic-${item.key}`),
  );
  assert.equal(
    symbolicSemanticAssertionKeys.some((key) =>
      materializedSemanticAssertions.has(key),
    ),
    false,
    "semantic assertions would receive duplicate target_runtime records",
  );
  assert.equal(
    new Set(symbolicSemanticAssertionKeys).size,
    symbolicSemanticAssertionKeys.length,
    "ordinary target_runtime assertion keys must also remain unique",
  );
});

async function text(relativePath) {
  return readFile(path.join(repositoryRoot, relativePath), "utf8");
}
