import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repositoryRoot = fileURLToPath(new URL("../..", import.meta.url));
const rolloutMarker =
  "UI symbolic V2 is explicit opt-in; V1 remains the default.";
const scopeMarker =
  "Non-UI symbolic admission and Provider/P0 trust-boundary work remain out of scope.";
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
    assert.ok(content.includes(rolloutMarker), `${file}: missing rollout marker`);
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
    assert.equal(await text(installed), expected, `${installed}: managed drift`);
    assert.equal(await text(packaged), expected, `${packaged}: package drift`);
  }
  assert.equal(
    await text("packages/ty-context/assets/agents/AGENTS_CORE.md"),
    await text(".codex/ty-context-managed/agents/AGENTS_CORE.md"),
  );
  assert.equal(await text("packages/ty-context/assets/README.md"), await text("README.md"));
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

  const publicApi = `${await text("packages/ty-context/src/index.ts")}\n${await text(
    "packages/ty-context/src/public-types.ts",
  )}`;
  for (const name of [
    "symbolicDenotation",
    "DesignResourceHandoffV2",
    "DesignResourceHandoffPreflightV2",
    "DesignResourceObservableRuleManifestV2",
  ])
    assert.ok(publicApi.includes(name), `public export missing: ${name}`);

  const affected = await text("tools/affected_test_selection.mjs");
  for (const testFile of [
    "symbolic-denotation-equivalence.test.mjs",
    "symbolic-denotation-ui-v2.test.mjs",
    "symbolic-denotation-long-task-v2.test.mjs",
    "symbolic-denotation-efficiency-antidegradation.test.mjs",
    "design-resource-v1-capacity-guard.test.mjs",
  ])
    assert.ok(affected.includes(testFile), `affected routing missing: ${testFile}`);
  assert.ok(
    (await text("tools/test_suite_policy.mjs")).includes(
      "symbolic-mixed-representation-closure",
    ),
    "Trust routing is missing the mixed V1/V2 false-completion sentinel",
  );
});

async function text(relativePath) {
  return readFile(path.join(repositoryRoot, relativePath), "utf8");
}
