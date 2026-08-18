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

test("DRA admission output cardinality is set-equal to the frozen case universe", async () => {
  const task = JSON.parse(
    await read(
      "examples/delivery-benchmark/mechanism/admission/dra-quality-cases.json",
    ),
  );
  const hidden = JSON.parse(
    await read(
      "examples/delivery-benchmark/mechanism/hidden/dra-semantic-recovery-admission-v1.json",
    ),
  );
  const schema = JSON.parse(
    await read(
      "examples/delivery-benchmark/mechanism/admission/dra-quality-result.schema.json",
    ),
  );
  const resultShape = schema.properties.case_results;
  assert.equal(resultShape.minItems, task.cases.length);
  assert.equal(resultShape.maxItems, task.cases.length);
  assert.deepEqual(
    task.cases.map((row) => row.id),
    hidden.expectations.map((row) => row.id),
  );
  assert.equal(
    new Set(task.cases.map((row) => row.id)).size,
    task.cases.length,
  );
  for (const id of [
    "duplicate-resource-identities-mixed",
    "wrong-requirement-condition",
    "wrong-unchanged-resource",
    "wrong-unchanged-basis",
  ]) {
    const item = task.cases.find((row) => row.id === id);
    assert.match(item.facts.join(" "), /reconciliation.*writeback/iu);
  }
  const taskById = new Map(task.cases.map((row) => [row.id, row]));
  for (const expectation of hidden.expectations) {
    const facts = taskById.get(expectation.id).facts.join(" ");
    for (const field of ["accepted_keys", "rejected_keys", "unresolved_keys"]) {
      for (const key of expectation.contains?.[field] ?? [])
        assert.match(facts, new RegExp(key.replaceAll(".", "\\."), "u"));
    }
    if (expectation.exact?.write_action === "block")
      assert.match(facts, /writeback|handoff-ready/iu);
  }
});

test("design-resource-authoring has one exact managed/generated/package source", async () => {
  for (const relative of [
    "SKILL.md",
    "references/resource-selection.md",
    "references/open-design-provider.md",
    "references/downstream-handoff.md",
    "references/recovery-and-writeback.md",
    "references/formal-selected-web-app-handoff.md",
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
  assert.match(metadata.description, /implementation handoff/iu);
  assert.match(metadata.description, /生成设计资源/u);
});

test("resource selection preserves the smallest sufficient scoped commission", async () => {
  const [skill, selection] = await Promise.all([
    copies("SKILL.md").then((items) => items[0]),
    copies("references/resource-selection.md").then((items) => items[0]),
  ]);
  const combined = `${skill}\n${selection}`;
  assert.match(
    combined,
    /scope (?:as|is) (?:the |a )?hard ceiling|hard scope ceiling/iu,
  );
  assert.match(combined, /necessary surrounding context/iu);
  assert.match(combined, /smallest sufficient/iu);
  assert.match(
    combined,
    /(?:artifact count|artifact\/file set)[\s\S]*never (?:material )?information granularity/iu,
  );
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
    /high.?fidelity.*brand.*typography\/color\/density.*production-style prototype/isu,
  );
  assert.match(combined, /low-fidelity.*IA\/flow topology.*semantics-only/isu);
  assert.match(
    combined,
    /(?:`DESIGN\.md` is missing|missing `DESIGN\.md`).*unconfigured.*(?:starter|style-only).*exact-value token source/isu,
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
    /Candidates[\s\S]*do not[\s\S]*prove implementation acceptance/iu,
  );
  assert.match(combined, /does not itself adopt Design Authority/iu);
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
  const [skill, provider, downstream, formal] = await Promise.all([
    copies("SKILL.md").then((items) => items[0]),
    copies("references/open-design-provider.md").then((items) => items[0]),
    copies("references/downstream-handoff.md").then((items) => items[0]),
    copies("references/formal-selected-web-app-handoff.md").then(
      (items) => items[0],
    ),
  ]);
  const handoff = `${downstream}\n${formal}`;
  const combined = `${skill}\n${provider}\n${handoff}`;
  assert.match(
    combined,
    /machine-readable canonical entry|canonical implementation source/iu,
  );
  assert.match(provider, /Implementation-level output profile/iu);
  assert.match(provider, /canonical machine-readable entry/iu);
  assert.match(provider, /complete output set/iu);
  assert.match(provider, /without truncation/iu);
  assert.match(provider, /exact bytes.*media types.*SHA-256/isu);
  assert.match(provider, /implementation_web.*implementation_app/isu);
  assert.match(
    provider,
    /every locally referenced dependency[\s\S]*declared target set/iu,
  );
  assert.match(
    provider,
    /every property-required verification method[\s\S]*code, specifications, tokens and asset manifests[\s\S]*decision_required.*unavailable/isu,
  );
  assert.match(
    provider,
    /stable IDs\/data attributes.*Markdown anchors.*JSON Pointers.*HTML\/CSS\/JS\/SVG selectors.*declarations.*attributes/isu,
  );
  assert.match(
    handoff,
    /residual (?:semantic and binding layer|scope\/provenance)/iu,
  );
  assert.match(
    handoff,
    /typed (?:located digests|value[\s\S]*located digest|locally resolvable .* locators)/iu,
  );
  assert.match(
    handoff,
    /subject × target × condition × variation × (?:atomic )?property/iu,
  );
  assert.match(combined, /Expected Fact Universe/iu);
  assert.match(handoff, /Product Controls[\s\S]*not the Fact ceiling/iu);
  assert.match(
    handoff,
    /one atomic Fact for every covered cell|every covered cell becomes one atomic Fact/iu,
  );
  assert.match(handoff, /resource[_-]fact closure|resource_fact_closure/iu);
  assert.match(handoff, /`fact_refs`/u);
  assert.match(handoff, /full_target.*layout_geometry/isu);
  assert.match(handoff, /full_target.*visual_pixel/isu);
  assert.match(
    combined,
    /PNG[\s\S]*(?:derived|visual baseline)[\s\S]*(?:cannot|not).*canonical/iu,
  );
  assert.match(
    handoff,
    /Fact × (?:property-)?required(?: verification)? method[\s\S]*Source-item\/method\/required-capability lineage[\s\S]*machine Claim or target-blocking External Confirmation/isu,
  );
  assert.match(
    handoff,
    /sole complete collection index[\s\S]*residual scope\/provenance/iu,
  );
});

test("formal Web/App authoring closes the complete atomic Fact universe before handoff", async () => {
  const [skill, provider, downstream, selection, formal] = await Promise.all([
    copies("SKILL.md").then((items) => items[0]),
    copies("references/open-design-provider.md").then((items) => items[0]),
    copies("references/downstream-handoff.md").then((items) => items[0]),
    copies("references/resource-selection.md").then((items) => items[0]),
    copies("references/formal-selected-web-app-handoff.md").then(
      (items) => items[0],
    ),
  ]);
  const handoff = `${downstream}\n${formal}`;
  const combined = `${skill}\n${provider}\n${handoff}\n${selection}`;

  assert.match(
    combined,
    /derive.*Expected Fact Universe.*before generation/isu,
  );
  assert.match(
    combined,
    /Expected Fact Universe[\s\S]*Canonical Resource Facts[\s\S]*Handoff Indexed Facts/iu,
  );
  assert.match(
    combined,
    /subject × target × condition × variation × (?:atomic )?property/iu,
  );
  assert.match(combined, /all 33 standard target-condition axes/iu);
  for (const axis of [
    "platform",
    "viewport",
    "density",
    "Safe Area",
    "text scale",
    "assistive technology",
    "permission",
    "connectivity",
    "lifecycle",
  ])
    assert.match(combined, new RegExp(axis, "iu"));
  assert.match(
    combined,
    /`?variant(?:`| ×).*state.*interaction_phase.*presence_phase.*instance_case/isu,
  );
  assert.match(
    combined,
    /Surface.*region.*component family.*Control.*Anatomy Part\/slot.*primitive.*text.*icon.*media.*asset.*relation/isu,
  );
  assert.match(combined, /complete standard atomic property catalog/iu);
  for (const family of [
    "geometry",
    "layout",
    "scroll",
    "typography",
    "color",
    "decoration",
    "content",
    "interaction",
    "navigation",
    "motion",
    "feedback",
    "responsive",
    "accessibility",
    "asset",
    "system",
    "relation",
  ])
    assert.match(combined, new RegExp(`\\b${family}\\b`, "iu"));

  assert.match(combined, /design-resource-observable-fact-manifest-v1/u);
  assert.match(combined, /frozen Inspector/iu);
  assert.match(
    combined,
    /resource\/node\/declaration\/token\/asset\/relation\/custom.prop.*variant\/state\/interaction.*dynamic.population.*Census/isu,
  );
  assert.match(combined, /complete_enumeration/iu);
  assert.match(combined, /sampling: forbidden/iu);
  assert.match(combined, /truncation: forbidden/iu);
  assert.match(combined, /all-states[\s\S]*atomic identities/iu);
  assert.match(
    combined,
    /exact universe is every applicable[\s\S]*Fact Cell/iu,
  );
  assert.match(
    combined,
    /one atomic Fact for every covered cell|every covered cell becomes one atomic Fact/iu,
  );
  assert.match(combined, /typed value locators\/digests/iu);
  assert.match(
    combined,
    /(?:effective )?design-system (?:identity and )?lineage/iu,
  );
  assert.match(combined, /dynamic\/lazy\/virtualized\/portal population/iu);
  assert.match(combined, /separate `proof_obligations` for every Fact/iu);
  assert.match(
    combined,
    /comparator.*tolerance.*mask.*Oracle.*render environment/isu,
  );
  assert.match(
    combined,
    /Preflight hydrates omitted collections directly from the declared manifest bytes[\s\S]*same full semantic validator/iu,
  );
  assert.match(combined, /complete_explicit/iu);
  assert.match(combined, /count plus identity digest/iu);
  assert.match(
    handoff,
    /`fact_expectations`[\s\S]*`fact_results`[\s\S]*actual observation[\s\S]*pass\/fail verdict/iu,
  );
  assert.match(combined, /digest-only\/redacted|digest-only or redacted/iu);
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
    /explicit (?:human )?selection or explicit(?:ly)? delegated selection/iu,
  );
  assert.match(
    combined,
    /one consolidated.*reconciliation|consolidate[\s\S]*once/isu,
  );
  assert.match(
    combined,
    /writable initial-proposal file|authorized writable path/iu,
  );
  assert.match(
    combined,
    /exists only in conversation.*complete revised proposal|complete revised proposal.*exists only in conversation/isu,
  );
  assert.match(combined, /idempotent/iu);
  assert.match(
    combined,
    /exclude rejected(?: and|\/)unresolved|rejected(?: and|\/)unresolved choices.*exclude|never write rejected\/unresolved meaning as accepted/isu,
  );
  assert.match(
    combined,
    /Small requests may complete generation, selection and reconciliation in one turn/iu,
  );
  assert.match(
    combined,
    /never rewrite caller-owned Source except for the one explicitly selected proposal reconciliation/iu,
  );
  assert.match(
    combined,
    /Never mutate `project_context\/\*\*`, `DESIGN\.md`, a Delivery Contract, production code or tests/iu,
  );
});

test("material DRA recovery preserves replay semantics, authority separation and a zero-cost simple path", async () => {
  const [skill, recovery] = await Promise.all([
    copies("SKILL.md").then((items) => items[0]),
    copies("references/recovery-and-writeback.md").then((items) => items[0]),
  ]);
  const combined = `${skill}\n${recovery}`;

  for (const field of [
    "locator",
    "raw_byte_digest",
    "encoding",
    "eol_policy",
    "scope_ceiling",
    "in_scope_keys",
    "explicitly_excluded_keys",
    "delta_id",
    "sequence",
    "supersedes",
    "proposes_replacement_of",
    "operation",
    "semantic_kind",
    "target_keys",
    "before_semantics",
    "after_semantics",
    "origin",
    "decision_authority",
    "evidence_refs",
    "source_refs",
    "explicitly_unchanged_keys",
    "status",
  ])
    assert.match(recovery, new RegExp(`\\b${field}\\b`, "u"));

  assert.match(
    recovery,
    /user-direct.*necessary-derived.*repository-evidence-backed.*provider-suggested/isu,
  );
  assert.match(
    recovery,
    /explicit-user.*delegated:<bounded-scope-key>.*none/isu,
  );
  assert.match(recovery, /accepted.*rejected.*unresolved/isu);
  assert.match(
    recovery,
    /selected resource is evidence and never authorizes itself/iu,
  );
  assert.match(
    recovery,
    /accepted Provider suggestion requires explicit user authority or a delegation.*covers its origin, semantic kind and every target/isu,
  );
  assert.match(recovery, /ty-dra-authority-v1/u);
  assert.match(
    recovery,
    /explicit projection.*exact target keys, semantic kinds, allowed origins.*canonical `after_semantics` SHA-256/isu,
  );
  assert.match(
    recovery,
    /delegation projection.*delegation key.*allowed target keys, semantic kinds and origins/isu,
  );
  assert.match(recovery, /free text.*Authoring TCB/isu);
  assert.match(
    recovery,
    /rejected\/unresolved meaning never enters accepted requirements or writeback/iu,
  );
  assert.match(recovery, /cross-session deterministic recovery unavailable/u);
  assert.match(
    recovery,
    /Never use a prior Agent summary or generated resource as the next Base/iu,
  );

  assert.match(
    recovery,
    /simple scoped preview creates zero recovery files and persisted recovery bytes.*no user pause or Provider generation.*no formal handoff\/preflight.*no Proposal writeback.*no helper write transaction/isu,
  );
  assert.match(
    recovery,
    /only when interruption would otherwise lose material/iu,
  );
  assert.match(
    recovery,
    /not Source, Context, a Contract, Authority, Evidence, Receipt, Gate/iu,
  );
  assert.match(
    recovery,
    /stores no current activity, live Provider execution, Artifact readiness, Design suitability, next action, readiness\/completion or acceptance/iu,
  );

  for (const command of [
    "create",
    "update",
    "inspect",
    "preview",
    "apply",
    "reconcile",
    "remove",
  ])
    assert.match(
      recovery,
      new RegExp(`ty-context design-resource recovery ${command}`, "u"),
    );
  assert.match(recovery, /current == pre-write digest.*unapplied/isu);
  assert.match(
    recovery,
    /current == expected post digest.*already applied\/idempotent/isu,
  );
  assert.match(recovery, /otherwise.*concurrent conflict; fail closed/isu);
  assert.match(
    recovery,
    /arbitrary string or conversation-only locator cannot create authority/iu,
  );
  assert.match(recovery, /authorization of one key never covers another/iu);
  assert.match(
    recovery,
    /stable semantic target key has at most one active accepted Delta owner/iu,
  );
  assert.match(
    recovery,
    /inactive universe as rejected plus unresolved plus superseded accepted Delta IDs/iu,
  );
  assert.match(recovery, /design-resource-recovery-input-v4/u);
  assert.match(recovery, /design-resource-reconciliation-audit-v4/u);
  assert.match(recovery, /design-resource-exact-patch-v4/u);
  assert.match(recovery, /audit_expectations/u);
  assert.match(recovery, /selected_resource_bindings/u);
  assert.match(recovery, /proposal-written.*resource-owned-exact-visual/isu);
  assert.match(
    recovery,
    /Audit observes and verifies this owner; it never selects it/iu,
  );
  assert.match(
    recovery,
    /Every patch operation has one unique ID, exactly one Delta, one target, one semantic binding and one `source_span`/iu,
  );
  assert.match(
    recovery,
    /prefix before the scalar and suffix after it must be character-for-character equal/iu,
  );
  assert.match(recovery, /ty-dra-proposal-scalar-v1/u);
  assert.match(recovery, /deterministic Proposal writeback unavailable/u);
  assert.match(recovery, /descending offset/iu);
  assert.match(
    recovery,
    /cannot consume output generated by an earlier operation/iu,
  );
  assert.match(recovery, /`remove`.*requires empty `after_text`/isu);
  assert.match(recovery, /does not accept a `formal-handoff-target` label/iu);
  assert.match(recovery, /structured downstream owner.*repository-readable/isu);
  assert.match(recovery, /explicit `partial` result/iu);
  assert.match(recovery, /Requirements → Resource/iu);
  assert.match(recovery, /Resource → Requirements/iu);
  assert.match(recovery, /Unexpected Blast Radius/iu);
  assert.match(recovery, /does not report `handoff-ready`/u);
  assert.match(
    recovery,
    /Only the DRA Skill may derive final `handoff-ready`.*current Provider\/resource revalidation.*durable final owner.*formal handoff\/preflight.*no unresolved blocker/isu,
  );
  assert.match(
    recovery,
    /never replaces the Proposal, selected immutable resources, formal handoff/iu,
  );
  assert.match(
    recovery,
    /Final Gate cannot prove historical Provider execution/iu,
  );
});

test("handoff preserves immutable resource identity and direct downstream routing", async () => {
  const [downstream, formal] = await Promise.all([
    copies("references/downstream-handoff.md").then((items) => items[0]),
    copies("references/formal-selected-web-app-handoff.md").then(
      (items) => items[0],
    ),
  ]);
  const handoff = `${downstream}\n${formal}`;
  assert.match(handoff, /Candidate, selection and (?:authority|adoption)/iu);
  assert.match(handoff, /for each target|per-target/iu);
  assert.match(handoff, /provider\/project\/run\/entry/iu);
  assert.match(handoff, /immutable[\s\S]{0,120}digest\/snapshot/iu);
  assert.match(
    handoff,
    /editable upstream owner, locator and update\/export method/iu,
  );
  assert.match(handoff, /all 33 standard target-condition axes/iu);
  assert.match(
    handoff,
    /exactly one fenced[\s\S]*design-resource-handoff-v1/iu,
  );
  assert.match(handoff, /representation: manifest_backed/u);
  assert.match(
    handoff,
    /canonical manifest as the sole complete collection index/iu,
  );
  assert.match(
    handoff,
    /explicit manifest path set[\s\S]*SHA-256[\s\S]*collection counts\/identity digests/iu,
  );
  assert.match(handoff, /truthful UTF-8 (?:byte )?ceiling/iu);
  assert.match(
    handoff,
    /ty-context design-resource bundle <draft-dir> <new-output-dir>/u,
  );
  assert.match(
    handoff,
    /rejects? (?:any )?embedded\/full-array or multi-target drafts?/iu,
  );
  assert.match(handoff, /atomically renames the complete set/iu);
  assert.match(handoff, /never post-hoc splits?|not a post-hoc split/iu);
  assert.match(
    handoff,
    /a semantic target is never divided|never post-hoc splits? a semantic target/iu,
  );
  assert.match(
    handoff,
    /File\/model\/parser\/memory limits cannot weaken the universe/iu,
  );
  assert.match(handoff, /older embedded-?V1 read compatibility/iu);
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
    /Preflight hydrates omitted collections directly from the declared manifest bytes[\s\S]*same full semantic validator/iu,
  );
  assert.match(
    handoff,
    /material resource cannot be hidden as `supporting_only`/iu,
  );
  assert.match(
    handoff,
    /static\/default frame covers only what it actually shows/iu,
  );
  assert.match(handoff, /blocking `decision_required`\/`unavailable`/iu);
  assert.match(handoff, /unresolved rows[\s\S]*fail closed/iu);
  assert.match(
    handoff,
    /initial proposal[\s\S]*selected immutable(?:\/editable)? identities/iu,
  );
  assert.match(
    handoff,
    /active Long-Task[\s\S]*one Source\/Contract\/Authority\/Final Gate lifecycle/iu,
  );
  assert.match(
    handoff,
    /Every marked handoff(?:\/resource\/manifest)? (?:is|belongs) in `task\.source_paths`[\s\S]*Check `verification_inputs`/iu,
  );
  assert.match(
    handoff,
    /Source Items map through `source_claims`[\s\S]*root conformance Assertion/iu,
  );
  assert.match(
    handoff,
    /method × condition evidence cell[\s\S]*exact handoff `fact_refs`/iu,
  );
  assert.match(
    handoff,
    /creates no Contract Draft[\s\S]{0,120}Outcome[\s\S]{0,120}Receipt[\s\S]{0,120}Check result or Gate/iu,
  );
  assert.match(handoff, /Context-reachable through existing owners/iu);
  assert.match(
    handoff,
    /default Workflow opens (?:every affected selected `exact-target` or `constraint`|actual resources and conditions)/iu,
  );
  assert.match(
    handoff,
    /never overwrites an accepted baseline[\s\S]*new immutable version/iu,
  );
});

test("Source, specification, Context and public docs expose the new resource contract", async () => {
  const [plan, factCompleteness, spec, contexts, readmes, profile, manifest] =
    await Promise.all([
      read("docs/design-resource-authoring-implementation-source.md"),
      read("docs/design-fact-completeness.md"),
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
    assert.match(content, /Expected Fact Universe/iu);
    assert.match(content, /pixel/iu);
    assert.match(
      content,
      /resource_fact_closure|resource.fact closure|资源事实闭包|Fact Cell\/Fact\/proof|Fact\/proof closure/iu,
    );
    assert.match(content, /fact_refs|fact refs/iu);
  }
  for (const content of [factCompleteness, spec, contexts, readmes]) {
    assert.match(content, /Expected Fact Universe/iu);
    assert.match(
      content,
      /subject × (?:selected )?target × condition(?: combination)? × variation(?: combination)? × (?:atomic )?property/iu,
    );
    assert.match(content, /33 (?:standard )?(?:target-)?condition axes/iu);
    assert.match(content, /five variation axes|5 variation axes/iu);
    assert.match(content, /design-resource-observable-fact-manifest-v1/u);
    assert.match(content, /Inspector/iu);
    assert.match(content, /Census/iu);
    assert.match(content, /fact_expectations/u);
    assert.match(content, /fact_results/u);
    assert.match(content, /actual observation/iu);
    assert.match(content, /Oracle/iu);
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
    assert.match(
      content,
      /subject.*target.*condition.*(?:dimension|variation.*property)/isu,
    );
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
  const publicReadmes = await Promise.all([
    read("README.md"),
    read("README.zh-CN.md"),
    read("packages/ty-context/README.md"),
  ]);
  for (const content of publicReadmes) {
    assert.match(
      content,
      /^### (?:Design-First Machine-Assurance Workflow|设计优先的机器保障工作流)$/mu,
    );
    assert.match(content, /ty-context enable long-task/u);
    assert.match(content, /\$design-system-authoring/u);
    assert.match(
      content,
      /writable(?: project-native)? initial proposal|可写的初始方案/iu,
    );
    assert.match(content, /\$design-resource-authoring/u);
    assert.match(
      content,
      /selected immutable canonical resources|选定的不可变规范资源/iu,
    );
    assert.match(content, /manifest/iu);
    assert.match(content, /dependenc/iu);
    assert.match(content, /\$long-task-workflow/u);
    assert.match(
      content,
      /After handling the model change, reply exactly: model checkpoint cleared, continue|处理好模型更换后，请仅回复：模型切换卡点解除，继续/iu,
    );
  }
  assert.match(profile, /"design-resource-authoring"/u);
  assert.match(manifest, /design-resource-authoring/u);
  assert.match(manifest, /proposal reconciliation/u);
  assert.doesNotMatch(
    manifest,
    /docs\/design-resource-authoring-implementation-source\.md/u,
  );
});

test("authoring overlay keeps design rationale information-complete and causally rigorous", async () => {
  const main = await read(
    ".codex/skills/authoring/harness_package_design/SKILL.md",
  );
  const referencePaths = [
    "package-surface-and-sync.md",
    "default-skill-governance.md",
    "long-task-mechanism-admission.md",
    "migration-and-release.md",
    "test-and-benchmark-governance.md",
  ];
  const linked = [...main.matchAll(/\(references\/([^\)]+\.md)\)/gu)].map(
    (match) => match[1],
  );
  assert.deepEqual(linked, referencePaths);
  assert.ok(Buffer.byteLength(main, "utf8") < 7_000, "compact main Skill");

  const references = await Promise.all(
    referencePaths.map((name) =>
      read(`.codex/skills/authoring/harness_package_design/references/${name}`),
    ),
  );
  const authoring = `${main}\n${references.join("\n")}`;
  for (const term of [
    "managed source",
    "generated/install surface",
    "current implementation truth",
    "intended product truth",
    "trigger discipline",
    "Coverage_new",
    "FalseNegative_new",
    "fail-closed",
    "Final Gate",
    "migration",
    "source parity",
    "current-candidate",
  ])
    assert.match(authoring, new RegExp(term, "iu"));
});
