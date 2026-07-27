import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import YAML from "yaml";

const repo = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const read = (relative) => readFile(path.join(repo, relative), "utf8");
const roots = [
  ".codex/ty-context-managed/skills/design-resource-authoring",
  ".codex/skills/design-resource-authoring",
  "packages/ty-context/assets/skills/design-resource-authoring",
];
const copies = (relative) =>
  Promise.all(roots.map((root) => read(`${root}/${relative}`)));

test("design-resource-authoring has one exact managed/generated/package source", async () => {
  for (const relative of [
    "SKILL.md",
    "references/resource-selection.md",
    "references/open-design-provider.md",
    "references/downstream-handoff.md",
  ]) {
    const values = await copies(relative);
    assert.equal(values[1], values[0], `${relative}: generated drift`);
    assert.equal(values[2], values[0], `${relative}: package drift`);
  }
  const skill = (await copies("SKILL.md"))[0];
  const match = skill.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/u);
  assert.ok(match);
  const metadata = YAML.parse(match[1]);
  assert.deepEqual(Object.keys(metadata).sort(), ["description", "name"]);
  assert.equal(metadata.name, "design-resource-authoring");
  assert.match(metadata.description, /generate.*design resources/iu);
  assert.match(metadata.description, /Open Design/iu);
  assert.match(metadata.description, /explicitly named development scope/iu);
  assert.match(metadata.description, /生成设计资源/u);
});

test("resource selection preserves the smallest sufficient scoped commission", async () => {
  const [skill, selection] = await Promise.all([
    copies("SKILL.md").then((items) => items[0]),
    copies("references/resource-selection.md").then((items) => items[0]),
  ]);
  const combined = `${skill}\n${selection}`;
  assert.match(combined, /scope as the hard ceiling|hard scope ceiling/iu);
  assert.match(combined, /necessary surrounding context/iu);
  assert.match(combined, /smallest sufficient/iu);
  assert.match(
    combined,
    /material UI\/UX decisions inside the explicit development scope/iu,
  );
  assert.match(combined, /one artifact per control/iu);
  assert.match(combined, /component family/iu);
  assert.match(
    combined,
    /static\/default.*unseen|static frame (?:cannot claim unseen|covers only conditions it actually shows)/isu,
  );
  assert.match(combined, /business.*data.*permission.*algorithmic/isu);
  for (const disposition of [
    "selected",
    "optional",
    "not-needed",
    "unavailable",
    "decision-required",
  ])
    assert.match(combined, new RegExp(`\\b${disposition}\\b`, "u"));
  for (const dimension of [
    "Surface/flow",
    "Visual treatment/content",
    "Component/control",
    "State/interaction",
    "Motion",
    "Adaptation/input",
    "Accessibility",
    "Assets",
  ])
    assert.ok(selection.includes(dimension), dimension);
});

test("only style-bearing commissions gate on configured Design Authority", async () => {
  const [skill, selection, provider] = await Promise.all([
    copies("SKILL.md").then((items) => items[0]),
    copies("references/resource-selection.md").then((items) => items[0]),
    copies("references/open-design-provider.md").then((items) => items[0]),
  ]);
  const combined = `${skill}\n${selection}\n${provider}`;
  assert.match(combined, /`style-bearing`/u);
  assert.match(combined, /`non-fidelity`/u);
  assert.match(
    combined,
    /high-fidelity.*brand.*typography\/color\/density.*production-style prototype/isu,
  );
  assert.match(combined, /low-fidelity.*IA\/flow topology.*semantics-only/isu);
  assert.match(
    combined,
    /`DESIGN\.md` is missing.*unconfigured.*starter.*lacks one authored exact-value token source/isu,
  );
  assert.match(
    combined,
    /stop before (?:creating a project|project\/run creation)/iu,
  );
  assert.match(combined, /explicitly invoke \$design-system-authoring/iu);
  assert.match(combined, /I will not initialize it automatically/iu);
  assert.match(combined, /combined explicit request authorizes/iu);
  assert.match(
    combined,
    /configured system-level authority does not by itself prove surface-level implementation readiness/iu,
  );
});

test("style-bearing Open Design projects bind and verify the adopted design system", async () => {
  const provider = (await copies("references/open-design-provider.md"))[0];
  assert.match(provider, /od:\/\/design-systems\/<id>\/DESIGN\.md/u);
  assert.match(provider, /pass that ID as `designSystem` to `create_project`/u);
  assert.match(provider, /require `designSystemId` to match/iu);
  assert.match(
    provider,
    /check its binding before every new style-bearing run/iu,
  );
  assert.match(
    provider,
    /prefer a new bounded project with the correct binding/iu,
  );
  assert.match(
    provider,
    /Never silently use the provider's default or a different system/iu,
  );
  assert.match(provider, /synchronization\/rebinding issue/iu);
});

test("implementation output uses complete canonical source plus residual handoff", async () => {
  const [skill, provider, handoff] = await Promise.all([
    copies("SKILL.md").then((items) => items[0]),
    copies("references/open-design-provider.md").then((items) => items[0]),
    copies("references/downstream-handoff.md").then((items) => items[0]),
  ]);
  const combined = `${skill}\n${provider}\n${handoff}`;
  assert.match(skill, /complete implementation source/iu);
  assert.match(provider, /Implementation-level output profile/iu);
  assert.match(provider, /canonical machine-readable entry/iu);
  assert.match(provider, /complete output set/iu);
  assert.match(provider, /without truncation/iu);
  assert.match(provider, /exact bytes.*media types.*SHA-256/isu);
  assert.match(provider, /implementation_web.*implementation_app/isu);
  assert.match(provider, /every local HTML\/CSS\/JS dependency/iu);
  assert.match(
    provider,
    /every declared verification method[\s\S]*code, specifications, tokens and asset manifests[\s\S]*decision_required.*unavailable/isu,
  );
  assert.match(
    provider,
    /stable IDs\/data attributes.*Markdown anchors.*JSON Pointers.*CSS selectors\/custom properties/isu,
  );
  assert.match(handoff, /residual semantic and index layer/iu);
  assert.match(handoff, /typed locator/iu);
  assert.match(handoff, /subject.*target.*condition.*dimension/isu);
  assert.match(
    combined,
    /PNG[\s\S]*(?:derived|visual baseline)[\s\S]*(?:cannot|not).*canonical/iu,
  );
  assert.match(
    handoff,
    /verification method[\s\S]*independently failing Assertion[\s\S]*blocker[\s\S]*Source-item\/method\/required-capability lineage/isu,
  );
  assert.match(
    handoff,
    /no second numeric\/style source|not a second numeric\/style source/iu,
  );
});

test("final selection performs one idempotent initial-proposal reconciliation", async () => {
  const [skill, selection, handoff] = await Promise.all([
    copies("SKILL.md").then((items) => items[0]),
    copies("references/resource-selection.md").then((items) => items[0]),
    copies("references/downstream-handoff.md").then((items) => items[0]),
  ]);
  const combined = `${skill}\n${selection}\n${handoff}`;
  assert.match(combined, /task-local delta buffer/iu);
  assert.match(
    combined,
    /Never continuously rewrite|never continuously synchronize/iu,
  );
  assert.match(
    combined,
    /explicit human selection or explicit delegated selection/iu,
  );
  assert.match(combined, /one consolidated.*reconciliation/isu);
  assert.match(
    combined,
    /writable initial-proposal file|authorized writable path/iu,
  );
  assert.match(
    combined,
    /exists only in conversation.*complete revised proposal/isu,
  );
  assert.match(combined, /idempotent/iu);
  assert.match(
    combined,
    /exclude rejected and unresolved|rejected and unresolved choices.*exclude/isu,
  );
  assert.match(
    combined,
    /Small requests may complete generation, selection and reconciliation in one turn/iu,
  );
  assert.match(
    combined,
    /Never mutate a Source Plan, `project_context\/\*\*`, `DESIGN\.md`, Delivery Contract, production code or tests/iu,
  );
});

test("handoff preserves immutable resource identity and direct downstream routing", async () => {
  const handoff = (await copies("references/downstream-handoff.md"))[0];
  assert.match(handoff, /Candidate, selection and authority are separate/iu);
  assert.match(
    handoff,
    /stable resource, subject, surface\/control\/state and target keys/iu,
  );
  assert.match(handoff, /provider\/project\/run\/entry/iu);
  assert.match(handoff, /immutable digest\/snapshot/iu);
  assert.match(
    handoff,
    /editable upstream owner, locator and update\/export method/iu,
  );
  assert.match(
    handoff,
    /declared platform, viewport, mode, state, content, input and full\/reduced\/not-applicable motion conditions/iu,
  );
  assert.match(handoff, /exactly one:[\s\S]*design-resource-handoff-v1/iu);
  for (const dimension of [
    "surface_flow",
    "visual_content",
    "component_control",
    "state_interaction",
    "motion",
    "adaptation_input",
    "accessibility",
    "assets",
  ])
    assert.match(handoff, new RegExp(`\\b${dimension}\\b`, "u"));
  assert.match(handoff, /ty-context design-resource preflight <handoff\.md>/u);
  assert.match(
    handoff,
    /static frame[\s\S]*cannot cover unseen interaction, motion, adaptation\/input or accessibility/iu,
  );
  assert.match(
    handoff,
    /`decision_required` or `unavailable`[\s\S]*make preflight fail/iu,
  );
  assert.match(
    handoff,
    /selected immutable resources[\s\S]*reconciled initial proposal/iu,
  );
  assert.match(handoff, /long-task-workflow.*current native Goal/isu);
  assert.match(
    handoff,
    /`source-plan-authoring` is not an intermediate stage/iu,
  );
  assert.match(
    handoff,
    /marked handoff is `task\.source_paths`[\s\S]*Check `verification_inputs`/iu,
  );
  assert.match(
    handoff,
    /Source Items map through `source_claims`[\s\S]*root conformance Assertion/iu,
  );
  assert.match(
    handoff,
    /creates no Contract Draft, Outcome, Receipt, Check result or Gate/iu,
  );
  assert.match(handoff, /Context-reachable through existing owners/iu);
  assert.match(
    handoff,
    /opens affected exact\/constraint resources before deciding/iu,
  );
  assert.match(
    handoff,
    /new immutable version rather than overwriting the adopted baseline/iu,
  );
});

test("Source, specification, Context and public docs expose the new resource contract", async () => {
  const [plan, spec, contexts, readmes, profile, manifest] = await Promise.all([
    read("docs/design-resource-authoring-source-plan.md"),
    read("PROJECT_SPEC.md"),
    Promise.all([
      read("project_context/global.md"),
      read("project_context/architecture.md"),
      read("project_context/areas/harness-package.md"),
      read(
        "project_context/areas/harness-package/contracts/workflow-contract.md",
      ),
      read(
        "project_context/areas/harness-package/contracts/design-resource-handoff.md",
      ),
      read(
        "project_context/areas/harness-package/contracts/package-managed-surfaces.md",
      ),
      read(
        "project_context/areas/harness-package/decision-rationale/long-task-workflow.md",
      ),
      read("project_context/areas/harness-package/implementation-index.md"),
      read("project_context/areas/harness-package/verification.md"),
    ]).then((items) => items.join("\n")),
    Promise.all([
      read("README.md"),
      read("README.zh-CN.md"),
      read("packages/ty-context/README.md"),
    ]).then((items) => items.join("\n")),
    read("packages/ty-context/src/lib/profiles.ts"),
    read("project_context/context.toml"),
  ]);
  assert.match(plan, /Plan key: `PLAN-DRA-001`/u);
  assert.match(plan, /^## 2026-07-22 Workflow And Provider Amendment$/mu);
  assert.match(
    plan,
    /^## 2026-07-24 Shared Development-Input Adapter Amendment$/mu,
  );
  assert.match(plan, /REQ-DSA-005/u);
  assert.match(plan, /AC-DSA-003/u);
  assert.match(plan, /AC-DRA-016/u);
  assert.match(plan, /REQ-DRA-046/u);
  assert.match(plan, /AC-DRA-024/u);
  assert.match(
    plan,
    /^## 2026-07-24 Implementation-Source Closure And Provider Selection Amendment$/mu,
  );
  assert.match(plan, /IN-DRA-USER-004/u);
  assert.match(plan, /REQ-DRA-053/u);
  assert.match(plan, /AC-DRA-028/u);
  for (const content of [spec, contexts, readmes]) {
    assert.match(content, /design-resource-authoring/u);
    assert.match(content, /style-bearing/iu);
    assert.match(
      content,
      /proposal reconciliation|initial proposal.*once|初始方案.*一次/isu,
    );
    assert.match(content, /design-resource-handoff-v1/u);
    assert.match(
      content,
      /eight.dimension|eight closed|八维|surface\/flow[\s\S]*accessibility[\s\S]*assets/isu,
    );
  }
  for (const content of [plan, spec, contexts, readmes]) {
    assert.match(
      content,
      /canonical (?:machine-readable )?(?:entry|source)|canonical entry|canonical implementation source/iu,
    );
    assert.match(
      content,
      /typed locator|typed, locally resolvable locators|typed HTML\/Markdown\/JSON\/CSS locator/iu,
    );
    assert.match(content, /subject.*target.*condition.*dimension/isu);
    assert.match(content, /residual handoff|残余.*handoff/iu);
    assert.match(content, /immutable|不可变/iu);
    assert.match(content, /Final Gate/iu);
    assert.match(content, /Figma[\s\S]*Penpot[\s\S]*OpenPencil/iu);
    assert.match(
      content,
      /source QA|源资源 QA|method-proportional.*source QA/iu,
    );
  }
  assert.match(readmes, /^## Recommended Usage$/mu);
  assert.match(readmes, /^## 推荐用法$/mu);
  assert.match(profile, /"design-resource-authoring"/u);
  assert.match(manifest, /design-resource-authoring/u);
  assert.match(manifest, /proposal reconciliation/u);
  assert.doesNotMatch(
    manifest,
    /docs\/design-resource-authoring-source-plan\.md/u,
  );
});

test("authoring overlay keeps design rationale information-complete and causally rigorous", async () => {
  const authoring = await read(
    ".codex/skills/authoring/harness_package_design/SKILL.md",
  );
  for (const term of [
    "design purpose",
    "design thinking",
    "information-complete",
    "causally rigorous",
    "problem and purpose",
    "inputs and transformation",
    "authority",
    "downstream consumption",
    "proof",
    "fail-closed",
    "alternatives",
    "indexed surfaces",
  ])
    assert.match(authoring, new RegExp(term, "iu"));
});
