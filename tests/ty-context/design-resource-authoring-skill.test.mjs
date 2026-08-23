import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
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
    "references/implementation-feasibility.md",
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

test("formal Web/App authoring carries real-substrate feasibility without another authority", async () => {
  const [skill, selection, provider, downstream, feasibility, formal] =
    await Promise.all([
      copies("SKILL.md").then((items) => items[0]),
      copies("references/resource-selection.md").then((items) => items[0]),
      copies("references/open-design-provider.md").then((items) => items[0]),
      copies("references/downstream-handoff.md").then((items) => items[0]),
      copies("references/implementation-feasibility.md").then(
        (items) => items[0],
      ),
      copies("references/formal-selected-web-app-handoff.md").then(
        (items) => items[0],
      ),
    ]);

  assert.match(skill, /read \[implementation-feasibility\.md\][\s\S]*real repository substrate/iu);
  assert.match(
    selection,
    /every material component-family × target × condition profile[\s\S]*Source-backed candidate realization or blocker/iu,
  );
  assert.match(
    selection,
    /quality_commission[\s\S]*main design challenges[\s\S]*desired\/avoided visual character[\s\S]*real-content obligations[\s\S]*distinct role of each selected reference[\s\S]*shared-family expectations/iu,
  );
  assert.match(
    provider,
    /Always inspect the actual rendered candidate[\s\S]*never manufacture a revision quota/iu,
  );
  assert.match(
    provider,
    /single-frame HTML phone mockup cannot claim a native mobile-App or multi-screen formal handoff/iu,
  );
  assert.match(
    provider,
    /first candidate has no material Source, feasibility, mechanical or suitability defect[\s\S]*proceed directly[\s\S]*smallest defect-localizing revision/iu,
  );
  assert.match(
    provider,
    /Direct Agent authoring the resource is also a legal other Provider[\s\S]*same bounded archetype, render, revision, canonical-source and formal-handoff capabilities/iu,
  );
  assert.match(
    provider,
    /separate `design-resource-implementation-feasibility-v1` input per target[\s\S]*Never put this document or its technical Source records into the canonical resource closure/iu,
  );
  assert.match(
    feasibility,
    /canonical design resources and observable-Fact manifest remain the sole owners of exact selected design values/iu,
  );
  assert.match(
    feasibility,
    /Default Workflow chooses among still-allowed candidates in its Architecture Deliberation[\s\S]*Long-Task projects the document only through existing `task\.source_paths`, Source claims, technical\/surface bindings, Checks and Assertions/iu,
  );
  assert.match(
    feasibility,
    /Leave `required_realization\.realization_ref` null[\s\S]*current technical authority requires a specific candidate/iu,
  );
  assert.match(
    feasibility,
    /every non-observed disposition carries a concrete non-empty reason[\s\S]*no value/iu,
  );
  assert.match(
    feasibility,
    /complete matching canonical V1 Fact set or intersecting V2 Fact Rule set[\s\S]*neither omissions nor extras/iu,
  );
  assert.match(
    feasibility,
    /Browser HTML\/CSS capability alone cannot support a native-App or React Native realization[\s\S]*mapped_substrate[\s\S]*blocker/iu,
  );
  assert.match(
    feasibility,
    /Different platform\/condition profiles for the same component family may carry different candidate sets, primitives, costs, risks or blockers/iu,
  );
  assert.match(
    feasibility,
    /preflight validates input closure only[\s\S]*never proves that production uses the candidate, renders correctly or passes acceptance/iu,
  );
  assert.match(
    feasibility,
    /Create no implementation registry, readiness flag, workflow state, second Design Authority, new Gate or production acceptance record/iu,
  );
  assert.match(
    feasibility,
    /Planned-owner authorization, required-realization authority and blocker authority[\s\S]*"kind":"source_item"[\s\S]*"text_sha256"/iu,
  );
  assert.match(
    feasibility,
    /ty-design-feasibility-decision-v1[\s\S]*condition_scope_sha256/iu,
  );
  assert.match(
    feasibility,
    /family subject closure[\s\S]*until stable[\s\S]*Anatomy Parts[\s\S]*assets/iu,
  );
  assert.match(
    feasibility,
    /current component bindings must uniquely derive one allowed realization for each candidate-bearing cell[\s\S]*blocker-only cell[\s\S]*Every component binding ref must still be consumed/iu,
  );
  assert.match(
    feasibility,
    /Each blocker item maps either to `decision_required`[\s\S]*target-blocking External Confirmation/iu,
  );
  assert.match(
    downstream,
    /Multiple feasible candidates remain allowed[\s\S]*DRA selects none unless current technical authority already requires one/iu,
  );
  assert.match(
    downstream,
    /no reliable project-native check[\s\S]*report it as `Unverified`[\s\S]*preflight or model judgment cannot promote it/iu,
  );
  assert.match(
    downstream,
    /Historical Provider, preflight, DRA-audit or project-check results never replace current-candidate evidence/iu,
  );
  assert.match(
    formal,
    /one `design-resource-implementation-feasibility-v1` JSON document per target[\s\S]*Keep canonical design values exclusively in the design resources and manifest/iu,
  );
});

test("incremental DRA review reuses existing owners without widening scope or authority", async () => {
  const [skill, selection, provider, downstream, recovery, formal] =
    await Promise.all([
      copies("SKILL.md").then((items) => items[0]),
      copies("references/resource-selection.md").then((items) => items[0]),
      copies("references/open-design-provider.md").then((items) => items[0]),
      copies("references/downstream-handoff.md").then((items) => items[0]),
      copies("references/recovery-and-writeback.md").then((items) => items[0]),
      copies("references/formal-selected-web-app-handoff.md").then(
        (items) => items[0],
      ),
    ]);
  const combined = [
    skill,
    selection,
    provider,
    downstream,
    recovery,
    formal,
  ].join("\n");

  assert.match(
    selection,
    /outside-ceiling effect[\s\S]*`decision-required`[\s\S]*`reason: scope-expansion-required`[\s\S]*only then recompute the ceiling/iu,
  );
  assert.match(
    selection,
    /user may choose an in-scope alternative or explicitly expand scope/iu,
  );
  assert.match(
    selection,
    /stop and route the change to the actual Product\/Surface\/Screen\/Design owner[\s\S]*Reread the updated owner before resuming/iu,
  );
  assert.match(
    selection,
    /candidate execution defect stays within DRA[\s\S]*does not.*durable owner change/iu,
  );

  for (const field of [
    "style_application:",
    "primary_content_priority:",
    "density:",
    "container_treatment:",
    "visible_vs_hit_geometry:",
    "preserve:",
    "prohibited_patterns:",
  ])
    assert.ok(selection.includes(field), field);
  assert.match(
    selection,
    /not a persisted Application Projection, Authority, state or acceptance record/iu,
  );
  assert.match(
    selection,
    /simple high-fidelity preview does not gain another tool action or persisted side effect/iu,
  );

  assert.match(
    selection,
    /material\/recoverable loop[\s\S]*`audit_expectations`[\s\S]*explicitly unchanged universe[\s\S]*blast-radius universe/iu,
  );
  assert.match(
    selection,
    /ordinary loop without those complete bindings[\s\S]*conservative impact analysis[\s\S]*Never claim that only identified resources are affected/iu,
  );
  assert.match(
    recovery,
    /change and preservation claims remain bounded to its exact Requirements-to-Resource, Resource-to-Requirements[\s\S]*inactive-leakage universes/iu,
  );

  assert.match(
    provider,
    /scope and Source suitability[\s\S]*mechanical checks[\s\S]*Design-System application checks[\s\S]*visual-language checks[\s\S]*state\/condition coverage checks[\s\S]*preservation checks/iu,
  );
  assert.match(
    provider,
    /Design suitability is one freshly derived umbrella review[\s\S]*never human selection/iu,
  );
  assert.match(
    provider,
    /After every material revision, rerun every applicable suitability subcheck/iu,
  );
  assert.match(
    provider,
    /visual-language or mechanical pass cannot independently establish Artifact readiness, selection, formal completeness, handoff readiness/iu,
  );

  assert.match(downstream, /^## Design Resource Review & Selection Stop$/mu);
  assert.match(
    downstream,
    /not an approval record, `review_set_id`, registry, persisted status, Gate, acceptance, readiness or formal-completeness claim/iu,
  );
  assert.match(
    downstream,
    /not a required extra turn[\s\S]*small request.*one turn/iu,
  );
  assert.match(
    recovery,
    /Ordinary conversational review and selection[\s\S]*no approval record or persistent selection state/iu,
  );
  assert.match(
    recovery,
    /Deterministic cross-interruption selection uses only the existing raw-digest-bound marked Source, `ty-dra-authority-v1`, selected-resource binding and conditional checkpoint/iu,
  );

  assert.match(
    downstream,
    /selection binds the canonical selected-source digest, target identity, declared conditions and controlling Source\/Design-Authority identity/iu,
  );
  assert.match(
    downstream,
    /derived artifact proved equivalent[\s\S]*preserves selection[\s\S]*visible or semantic difference[\s\S]*another user choice/iu,
  );
  assert.match(formal, /^## Review-return boundary$/mu);
  assert.match(
    formal,
    /exposes a new state[\s\S]*visible\/semantic design difference[\s\S]*return to the downstream `Design Resource Review & Selection Stop`/iu,
  );
  assert.match(
    formal,
    /Only closure which introduces no new visible decision[\s\S]*one consolidated Proposal reconciliation/iu,
  );
  assert.match(
    downstream,
    /Formal Web\/App work defers its one reconciliation until direction selection plus stable formal closure/iu,
  );

  const references = await readdir(
    path.join(
      repo,
      ".codex/ty-context-managed/skills/design-resource-authoring/references",
    ),
  );
  assert.deepEqual(references.sort(), [
    "downstream-handoff.md",
    "formal-selected-web-app-handoff.md",
    "implementation-feasibility.md",
    "open-design-provider.md",
    "recovery-and-writeback.md",
    "resource-selection.md",
  ]);
  assert.doesNotMatch(
    combined,
    /references\/design-application-and-review\.md/iu,
  );
});

test("style-bearing DRA closes application dimensions before provider execution", async () => {
  const [skill, selection, provider] = await Promise.all([
    copies("SKILL.md").then((items) => items[0]),
    copies("references/resource-selection.md").then((items) => items[0]),
    copies("references/open-design-provider.md").then((items) => items[0]),
  ]);

  const workflowMatch = skill.match(
    /^## Workflow\r?\n([\s\S]*?)(?=^## Conditional Design Authority stop$)/mu,
  );
  assert.ok(workflowMatch);
  const workflow = workflowMatch[1];
  assert.deepEqual(
    [...workflow.matchAll(/^(\d+)\. /gmu)].map((match) => Number(match[1])),
    [1, 2, 3, 4, 5, 6, 7, 8, 9],
  );
  const skillClosureAt = workflow.indexOf(
    "Before every style-bearing generation or material revision",
  );
  assert.ok(skillClosureAt > workflow.indexOf("4. For style-bearing work"));
  assert.ok(skillClosureAt < workflow.indexOf("6. Discover only"));
  assert.match(
    workflow,
    /No applicable dimension may be silently omitted; `decision-required`, an undispositioned dimension or Source conflict blocks the Provider run/iu,
  );
  assert.match(
    workflow,
    /Complete current input-bound coverage permits omitting `style_application`[\s\S]*actual envelope contains only `projected` fields/iu,
  );

  const closureMatch = selection.match(
    /^### Pre-generation style-application closure\r?\n([\s\S]*?)(?=^## 4\. Derive development-corresponding coverage$)/mu,
  );
  assert.ok(closureMatch);
  const closure = closureMatch[1];
  const rows = [
    ...closure.matchAll(
      /^\| `(existing-covered|projected|not-applicable|decision-required)` \| ([^|]+) \| ([^|]+) \| ([^|]+) \|$/gmu,
    ),
  ];
  assert.deepEqual(
    rows.map((row) => row[1]),
    [
      "existing-covered",
      "projected",
      "not-applicable",
      "decision-required",
    ],
  );
  const disposition = new Map(
    rows.map((row) => [
      row[1],
      {
        condition: row[2],
        envelope: row[3],
        provider: row[4],
      },
    ]),
  );
  assert.match(
    disposition.get("existing-covered").condition,
    /Current controlling Source.*selected `exact-target`\/`constraint`.*exact target, slice and declared conditions.*existing input binding/iu,
  );
  assert.match(
    disposition.get("existing-covered").envelope,
    /do not duplicate it in `style_application`/iu,
  );
  assert.match(
    disposition.get("projected").condition,
    /Source and Design Authority.*determine.*slice-specific application.*does not directly and completely express/iu,
  );
  assert.match(
    disposition.get("projected").envelope,
    /only the necessary current-slice field/iu,
  );
  assert.match(
    disposition.get("not-applicable").envelope,
    /task-local.*no empty or placeholder field/iu,
  );
  assert.match(
    disposition.get("decision-required").provider,
    /Blocks the Provider run/iu,
  );

  for (const dimension of [
    "primary_content_priority",
    "density",
    "container_treatment",
    "visible_vs_hit_geometry",
    "preserve",
    "prohibited_patterns",
  ])
    assert.ok(closure.includes(`\`${dimension}\``), dimension);
  assert.match(
    closure,
    /Provider run is allowed if and only if every applicable dimension is `existing-covered`, `projected` or `not-applicable`/iu,
  );
  assert.match(
    closure,
    /Any `decision-required`, undispositioned dimension or Source conflict blocks commission submission and Provider execution/iu,
  );
  assert.match(
    closure,
    /Design System identity, generic Tokens[\s\S]*do not by themselves establish `existing-covered`/iu,
  );
  assert.match(
    closure,
    /Current implementation may support `preserve` only when controlling Source explicitly makes.*a preservation constraint/iu,
  );
  assert.match(
    closure,
    /actual commission envelope contains exactly the `projected` fields[\s\S]*omit `existing-covered` fields[\s\S]*never encode `decision-required` as a placeholder/iu,
  );
  assert.match(
    closure,
    /simple high-fidelity preview[\s\S]*adds no Provider generation, tool action, file, checkpoint, persistent state, fixed user pause, required extra conversation turn, formal handoff, manifest, bundle, preflight or complete Fact Universe/iu,
  );

  const providerClosureMatch = provider.match(
    /^## Pre-run style-application closure\r?\n([\s\S]*?)(?=^## Structured commission sequence$)/mu,
  );
  assert.ok(providerClosureMatch);
  const providerClosure = providerClosureMatch[1];
  assert.ok(
    provider.indexOf("## Pre-run style-application closure") <
      provider.indexOf("## Structured commission sequence"),
  );
  assert.match(
    providerClosure,
    /Before submitting a commission or calling `start_run`[\s\S]*`decision-required`, undispositioned dimension or Source conflict blocks the run before Provider execution/iu,
  );
  assert.match(
    providerClosure,
    /`existing-covered` meaning must arrive through.*existing `inputs\.exact_targets`, `inputs\.constraints` or corresponding input binding/iu,
  );
  assert.match(
    providerClosure,
    /only `projected` meaning enters the existing `style_application` object[\s\S]*`not-applicable` stays.*task-local[\s\S]*`decision-required` stays unresolved/iu,
  );
  assert.match(
    providerClosure,
    /verified `designSystemId`[\s\S]*generic instruction to follow the system[\s\S]*cannot prove.*current slice/iu,
  );
  assert.match(
    providerClosure,
    /Repeat the closure immediately before each material-revision run[\s\S]*After the resulting candidate.*rerun the applicable Design suitability subchecks/iu,
  );
  assert.match(
    providerClosure,
    /packaging, rename or byte-only export proved equivalent[\s\S]*neither a new Provider run nor a new design decision/iu,
  );
  assert.match(
    providerClosure,
    /not a schema, state, Authority, Gate, readiness result or Provider lifecycle/iu,
  );

  const examplesAt = selection.indexOf(
    "### Style-application worked examples",
  );
  assert.notEqual(examplesAt, -1);
  const examples = selection.slice(examplesAt);
  const mustBlock = examples.match(
    /^#### Example A — must block\r?\n([\s\S]*?)(?=^#### Example B)/mu,
  );
  const mustAllow = examples.match(
    /^#### Example B — complete existing coverage may omit projection\r?\n([\s\S]*?)(?=^#### Example C)/mu,
  );
  const mixed = examples.match(
    /^#### Example C — mixed closure projects only the gaps\r?\n([\s\S]*)$/mu,
  );
  assert.ok(mustBlock);
  assert.ok(mustAllow);
  assert.ok(mixed);
  assert.match(
    mustBlock[1],
    /configured Design Authority[\s\S]*only generic Tokens[\s\S]*No selected `exact-target` or `constraint`[\s\S]*`decision-required`[\s\S]*Provider run must not start/iu,
  );
  assert.match(
    mustAllow[1],
    /every applicable style-application dimension[\s\S]*existing exact-target input binding[\s\S]*Every dimension is `existing-covered`[\s\S]*omit `style_application`[\s\S]*allow the Provider run/iu,
  );
  const mixedEnvelopeMatch = mixed[1].match(
    /```yaml\r?\n([\s\S]*?)\r?\n```/u,
  );
  assert.ok(mixedEnvelopeMatch);
  const mixedEnvelope = YAML.parse(mixedEnvelopeMatch[1]);
  assert.deepEqual(Object.keys(mixedEnvelope.style_application).sort(), [
    "container_treatment",
    "density",
    "prohibited_patterns",
  ]);
  assert.match(
    mixed[1],
    /All applicable dimensions are closed, so the Provider run is allowed[\s\S]*If any one.*unresolved, stale or conflicting[\s\S]*`decision-required` and the run is blocked/iu,
  );
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
  assert.match(combined, /page, flow or complex control/iu);
  assert.match(combined, /target user\/role and usage context reference/iu);
  assert.match(combined, /client\/host\/platform/iu);
  assert.match(combined, /Surface\/Screen duty/iu);
  assert.match(
    combined,
    /primary task outcome, primary work object and shortest task loop/iu,
  );
  assert.match(combined, /operation–affected-object–feedback relationships/iu);
  assert.match(
    combined,
    /critical context, state, recovery and accessibility constraints/iu,
  );
  assert.match(
    combined,
    /controlling Product\/Surface\/Screen Source[\s\S]*target user\/context[\s\S]*page duty[\s\S]*primary task outcome[\s\S]*primary work object\/task loop[\s\S]*operation-object-feedback[\s\S]*state\/recovery\/accessibility meaning/iu,
  );
  assert.match(
    combined,
    /`DESIGN\.md` and selected exact-target\/constraint Source for visual-system and selected-design conditions/iu,
  );
  assert.match(
    combined,
    /Non-authoritative task-level UI\/UX analysis may inform candidate comparison but cannot supply missing product or surface meaning/iu,
  );
  assert.match(combined, /A Provider must not infer that meaning/iu);
  assert.match(
    combined,
    /feature list, screenshot, route tree, component inventory or analysis output/iu,
  );
  assert.doesNotMatch(
    combined,
    /Product\/Surface\/Screen\/UIUX (?:Source|constraints)/iu,
  );
  assert.match(combined, /product_surface_constraints/iu);
  assert.match(combined, /decision-required.*owning Source update/isu);
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
    /Fact × (?:property-)?required(?: verification)? method[\s\S]*Blockers compile only as `decision_required` or an existing target-blocking External Confirmation/isu,
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
  const [
    plan,
    incrementalSource,
    factCompleteness,
    spec,
    contexts,
    readmes,
    profile,
    manifest,
  ] = await Promise.all([
    read("docs/design-resource-authoring-implementation-source.md"),
    read("docs/dra-incremental-authoring-review-development-source.md"),
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
        "project_context/areas/harness-package/contracts/design-resource-authoring.md",
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
  assert.match(incrementalSource, /^## Indexed Inputs And Owners$/mu);
  assert.match(incrementalSource, /S1.*555a8095-effe-404c-a2c9-4e9363c545c8/u);
  assert.match(incrementalSource, /S2.*9ed6ff3f-2736-4b58-9235-01e8076f228e/u);
  assert.match(incrementalSource, /Default Workflow Contract/iu);
  assert.match(incrementalSource, /explicitly excluded Long-Task Workflow/iu);
  assert.match(incrementalSource, /`Context Delta: required`/u);
  assert.match(
    spec,
    /Underlying Engineering Problem[\s\S]*designed to reduce that drift/iu,
  );
  assert.match(
    spec,
    /docs\/dra-incremental-authoring-review-development-source\.md/u,
  );
  for (const content of [spec, contexts, readmes]) {
    assert.match(content, /scope-expansion-required/u);
    assert.match(content, /style_application/u);
    assert.match(content, /Design Resource Review & Selection Stop/u);
    assert.match(content, /Design suitability/iu);
    assert.match(
      content,
      /canonical selected-source digest|canonical source digest|canonical selected source/iu,
    );
  }
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
