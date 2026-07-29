import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (relativePath) => readFile(path.join(repoRoot, relativePath), "utf8");
const forbiddenBusinessExamples = new RegExp(
  ["My" + "Hub", "Intel" + "Hub", "Apex" + "Quant", "provider" + "-interface", "i" + "Find"].join("|")
);

const [
  sourceAgents,
  packageAgents,
  rootReadme,
  packageReadme,
  spec,
  globalContext,
  packageContext,
  workflowContract,
  packageManagedSurfaces,
  validators,
  sourceProductSkill,
  sourceUiuxSkill,
  sourceDevelopmentSkill,
  sourceSkill,
  generatedSkill,
  packagedSkill,
  sourceTemplate,
  packagedTemplate,
  sourceScreenTemplate,
  packagedScreenTemplate
] = await Promise.all([
  read(".codex/ty-context-managed/agents/AGENTS_CORE.md"),
  read("packages/ty-context/assets/agents/AGENTS_CORE.md"),
  read("README.md"),
  read("packages/ty-context/README.md"),
  read("PROJECT_SPEC.md"),
  read("project_context/global.md"),
  read("project_context/areas/harness-package.md"),
  read("project_context/areas/harness-package/contracts/workflow-contract.md"),
  read("project_context/areas/harness-package/contracts/package-managed-surfaces.md"),
  read("packages/ty-context/src/lib/validators.ts"),
  read(".codex/ty-context-managed/skills/context_product_plan/SKILL.md"),
  read(".codex/ty-context-managed/skills/context_uiux_design/SKILL.md"),
  read(".codex/ty-context-managed/skills/context_development_engineer/SKILL.md"),
  read(".codex/ty-context-managed/skills/context_surface_contract/SKILL.md"),
  read(".codex/skills/context_surface_contract/SKILL.md"),
  read("packages/ty-context/assets/skills/context_surface_contract/SKILL.md"),
  read(".codex/ty-context-managed/context_templates/product-surface-contract.md"),
  read("packages/ty-context/assets/context_templates/product-surface-contract.md"),
  read(".codex/ty-context-managed/context_templates/screen-contract.md"),
  read("packages/ty-context/assets/context_templates/screen-contract.md")
]);

for (const content of [sourceAgents, packageAgents]) {
  assert.match(content, /product-surface/i);
  assert.match(content, /context_surface_contract/);
  assert.match(
    content,
    /confirm information\/action\/feedback ownership[\s\S]*context_surface_contract/iu,
  );
  assert.match(content, /Workflow Contract/);
  assert.match(
    content,
    /For every external product, architecture, technical or acceptance constraint, internally classify/iu,
  );
  assert.match(
    content,
    /Conformance confirms it reached the correct owner and verification/iu,
  );
  assert.doesNotMatch(content, /surface-contract` role/);
}

for (const content of [sourceSkill, generatedSkill, packagedSkill]) {
  assert.match(content, /description:.*Product Surface Contract.*Surface Contract.*Screen Contract/s);
  assert.match(content, /description:.*产品界面职责治理.*页面职责契约/s);
  assert.match(content, /Do not add a new `context_role`/);
  assert.match(content, /Audit Mode/);
  assert.match(content, /Compile Mode/);
  assert.match(content, /Apply Mode/);
  assert.match(content, /Conformance Mode/);
  assert.match(content, /Allowed writes/);
  assert.match(content, /Forbidden writes/);
  assert.match(content, /role = "contract"/);
  assert.match(content, /repo-local Skill/i);
  assert.match(content, /Internal source classification/);
  assert.match(content, /implementation alignment status/);
  assert.match(content, /Do not create a fixed `plan\.md`/);
  assert.doesNotMatch(content, forbiddenBusinessExamples);
  assert.doesNotMatch(
    content,
    /REQUIREMENT_GATHERING|UI_UX_DESIGNING|SPRINTING|ty-context_manager|ty-context_dev_sprint|ty-context_reviewer|ty-context_tester/
  );
}

for (const content of [sourceTemplate, packagedTemplate]) {
  assert.match(content, /Product Surface Contract/);
  assert.match(content, /Surface Platform/);
  assert.match(content, /Primary User Question/);
  assert.match(content, /Main Surface Allows/);
  assert.match(content, /Main Surface Forbids/);
  assert.match(content, /Drilldown Ownership/);
  assert.match(content, /Long Task State Requirement/);
  assert.match(content, /Empty \/ Loading \/ Stale \/ Unavailable/);
  assert.match(content, /Security \/ Redaction/);
  assert.match(content, /Verification/);
  assert.match(content, /role = "contract"/);
  assert.match(content, /read_policy = "on-demand"/);
  assert.match(content, /Screen Contract Routing/);
  assert.match(content, /screen-contract\.md/);
  assert.doesNotMatch(content, /screenshot observations.*test logs.*implementation summaries.*secret values/s);
}

for (const content of [sourceProductSkill, sourceUiuxSkill, sourceDevelopmentSkill]) {
  assert.match(content, /Product Surface/);
  assert.match(content, /Surface Contract/);
  assert.match(content, /context_surface_contract/);
  assert.match(content, /main allows\/forbids/);
  assert.match(content, /long-task state/i);
  assert.match(content, /外部来源.*内部分类/s);
  assert.match(content, /Contract Conformance/);
  assert.match(content, /Context Delta: required/);
  assert.match(content, /exact-target.*constraint/isu);
  assert.match(content, /(?:immutable|不可变).*locator\/digest/isu);
  assert.match(content, /editable upstream.*update route/isu);
}

for (const content of [rootReadme, packageReadme, spec]) {
  assert.match(content, /Product Surface Contract/i);
  assert.match(content, /context_surface_contract/);
  assert.match(content, /contract.*role/i);
  assert.match(content, /no new|not add|must not add/i);
}
assert.match(globalContext, /Product Surface\/Screen contracts/iu);
assert.match(globalContext, /existing Context roles/iu);
assert.match(globalContext, /Material UI[\s\S]*stable surface\/control\/target keys/iu);

for (const content of [sourceScreenTemplate, packagedScreenTemplate]) {
  assert.match(content, /^# Screen Contract$/mu);
  assert.match(content, /^## Authority Boundary$/mu);
  assert.match(content, /^## Entry, Exit And Shared State$/mu);
  assert.match(content, /^## Information Hierarchy$/mu);
  assert.match(content, /^## Layout Contract$/mu);
  assert.match(content, /^## Control Inventory$/mu);
  assert.match(content, /Control Type/);
  assert.match(content, /Visibility/);
  assert.match(content, /Availability/);
  assert.match(content, /Validation/);
  assert.match(content, /Default Value/);
  assert.match(content, /Recovery/);
  assert.match(content, /Permission/);
  assert.match(content, /Accessibility/);
  assert.match(content, /^## Design Target References$/mu);
  assert.match(content, /exact-target.*constraint.*inspiration/iu);
  assert.match(content, /Every adopted target has exactly one canonical adoption record/iu);
  assert.match(content, /Canonical Owner \/ Anchor/iu);
  assert.match(
    content,
    /project\/system\/component-family target owned by `DESIGN\.md`[\s\S]*do not repeat the full record/iu,
  );
  assert.match(content, /Immutable Adopted Path \/ URI \+ Digest/iu);
  assert.match(content, /Editable Upstream \/ Owner \/ Update Route/iu);
  assert.match(content, /Relevant work opens the resource/iu);
  assert.match(content, /register a new immutable version\/digest/iu);
  assert.match(content, /never overwrite the adopted baseline/iu);
  assert.match(content, /role = "subdomain"/);
  assert.match(content, /read_policy = "on-demand"/);
  assert.match(content, /Do not introduce `screen`, `design`/);
  assert.match(content, /implementation screenshot.*own target/iu);
}
const publicSurfaceGuidance = [rootReadme, packageReadme, spec, globalContext].join("\n");
assert.match(publicSurfaceGuidance, /product-surface-contract\.md/);
assert.match(publicSurfaceGuidance, /screen-contract\.md/);
assert.match(publicSurfaceGuidance, /UI Authority Closure/);
assert.match(publicSurfaceGuidance, /Source-to-Context (?:judgment|table|表)/);
assert.match(publicSurfaceGuidance, /(?:Context-to-Implementation|Contract Conformance)/);

assert.match(packageContext, /Product Surface\/Screen Contract workflow is prompt-level and project-owned/);
assert.match(packageContext, /must not add a surface-specific Context role/);
assert.match(workflowContract, /product-surface or information-placement work/);
assert.match(workflowContract, /Source-to-Context judgment/);
assert.match(workflowContract, /replaces the former Context-to-Implementation Markdown table/);
assert.match(workflowContract, /surface\/page responsibility/);
assert.match(workflowContract, /^## UI Authority Closure$/mu);
assert.match(workflowContract, /context-covered.*context-update.*task-local.*out-of-scope.*decision-required/isu);
assert.match(workflowContract, /surface, region\/location, type\/label/iu);
assert.match(workflowContract, /Do not add Product, Architecture, Rationale or Verification delta fields/);
assert.match(packageManagedSurfaces, /Product Surface Contract/);
assert.match(packageManagedSurfaces, /must not generate project semantics, plan artifacts, lifecycle state or campaigns/);
assert.match(packageManagedSurfaces, /screen-contract\.md/);
assert.match(packageManagedSurfaces, /There is no `uiux_delivery` block/);
assert.match(packageManagedSurfaces, /Context-reachable Source/iu);
assert.match(packageManagedSurfaces, /index presence alone is not consumption/iu);

for (const role of ["surface-contract", "product-surface", "web-contract", "app-contract", "game-surface", "screen", "design"]) {
  assert.doesNotMatch(validators, new RegExp(`["']${role}["']\\s*:`));
}
assert.match(validators, /contract: "contract"/);
