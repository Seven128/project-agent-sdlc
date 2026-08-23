# Open Design–Backed Design Resource Authoring — Historical Implementation Source

Status: dated ordinary Source/history. Current DRA behavior and provider policy live in the canonical package-managed Skill/reference, `PROJECT_SPEC.md` and owning `project_context/**`. Legacy mechanism terminology and provider observations below are retained only with their stated dates as provenance; they are not an active Skill route, workflow stage, plan type, model-selection authority or completion evidence.

<a id="dra-plan-meta"></a>
## Plan Metadata

- Plan key: `PLAN-DRA-001`
- Status: implementation baseline for a separately authorized package delivery; provider experiments completed on 2026-07-22
- Goal: define a high-quality, efficient `design-resource-authoring` Skill that reads product/technical/design Source; makes the explicit output or development content its hard scope ceiling; determines the material user-visible UI/UX meaning needed inside that scope through relevant controls and conditions; subtracts sufficient selected-source coverage; discovers Open Design's current capabilities; commissions only the smallest remaining resources; and hands them to Tiny Context as ordinary external Source.
- Originating research Goal delivery: current-source research, bounded capability experiments and this implementation-ready plan only.
- Subsequent implementation delivery: the user separately authorized package implementation on 2026-07-22; that delivery owned the production Skill, owning Context/public guidance, package distribution and deterministic/opt-in verification changes. At that point application-product code, Delivery Contract authoring, package publication and automatic adoption of generated resources remained excluded.
- Clarification delivery: the user subsequently clarified on 2026-07-22 that the Skill's design purpose is workflow-independent and development-corresponding: a local development slice must not expand into whole-product design, while an implementation handoff must cover every material in-scope UI/UX decision through relevant control detail without requiring one artifact per control. The current Goal owns this Source clarification, Skill/Context/index/public/test alignment, release preparation and package publication; it still does not authorize application-product implementation or automatic adoption of generated resources.
- Input-adapter delivery: on 2026-07-24 the user required the selected implementation handoff to become a shared, machine-validatable input for both the default Workflow Contract and Long-Task so implementation, testing and acceptance can completely follow every declared design fact. This amendment owns the provider-neutral `design-resource-handoff-v1` adapter, CLI/Long-Task integration, Context/Skill/public guidance, deterministic tests and one real complex-single-page Open Design workflow smoke. It does not make exploration pay the handoff cost or turn the adapter into Design Authority/acceptance.
- Implementation-source closure delivery: on 2026-07-24 a read-only audit found that the handoff could hash a resource while accepting fictional locators, broad coverage rows and unconsumed verification-method/blocker declarations. This amendment makes implementation-level source output, complete retrieval, typed locator addressability, applicable-cell coverage and downstream proof lineage fail-closed. It also records Figma/Penpot/OpenPencil as concise optional-provider selection background rather than default conversions.
- Shared-conformance and durable-recovery delivery: on 2026-07-25 the user required the default lightweight Workflow to approach the same complete selected-design purpose without copying Long-Task cost, required project Context to recover UI/UX facts as accurately as other durable facts, and asked whether shared/default/Long-Task logic would duplicate. This amendment establishes one shared obligation with mutually exclusive carriers, exact ephemeral default accounting, deterministic Design Source Projection, exactly one canonical target adoption record and an optional fresh-agent recovery benchmark. It adds no Long-Task schema/runtime, default state, generic semantic validator or doctor gate.
- Boundary: this document is optional ordinary upstream Source/history. It is not Context, a Contract Draft, runtime state, Design Authority, current model-selection policy, selection approval or completion evidence.
- Research dates: Open Design 2026-07-22; Figma, Penpot and OpenPencil official/project guidance 2026-07-24.

### Navigation index

- [Executive decision](#dra-executive-decision)
- [Input inventory and treatment](#dra-input-inventory)
- [Existing Tiny Context consumption boundary](#dra-current-boundary)
- [Research questions](#dra-research-questions)
- [Resolved Open Design capability findings](#dra-research-findings)
- [Dynamic resource decision model](#dra-decision-model)
- [Open Design orchestration and recovery](#dra-provider-orchestration)
- [Bounded experiment record](#dra-experiments)
- [Requirements and non-goals](#dra-requirements)
- [Output and downstream handoff](#dra-handoff-contract)
- [Non-goals](#dra-non-goals)
- [Implementation outcomes and dependencies](#dra-outcomes)
- [Implementation blueprint](#dra-implementation-blueprint)
- [Acceptance scenarios](#dra-acceptance)
- [Risks and mitigations](#dra-risks)
- [Delegated decisions](#dra-decisions)
- [Repository/test impact](#dra-implementation-impact)
- [Traceability](#dra-traceability)
- [Completeness status](#dra-completeness)

<a id="dra-executive-decision"></a>
## Executive Decision

The implemented Skill is a thin, provider-aware commissioning and handoff layer over Open Design, not a local copy of Open Design prompts, templates or generation logic.

```text
explicit request + initial proposal/product/technical/design Source
  -> explicit design-system initialization/adoption when requested at cold start
  -> explicit output/development-scope ceiling and necessary surrounding context
  -> style-bearing gate plus adopted Open Design design-system binding
  -> material in-scope UI/UX coverage through relevant controls
  -> subtract sufficient selected-source coverage and expose unresolved meaning
  -> live Open Design capability discovery
  -> justified resource selection, with reasons and omissions
  -> Open Design project/run/artifact generation
  -> bounded review, optional iteration and final selection
  -> ordinary external design Source + strict implementation-handoff adapter
  -> shared design-resource preflight
  -> downstream default Workflow Contract or Long-Task UI Authority Closure
  -> optional durable adoption, implementation and project-owned verification
```

No resource type is globally mandatory. A prototype is expected to be high-value for many new Web/App screens and interaction flows, but it is selected only when the current design gap and available Open Design capability justify it. The same rule applies to wireframes, visual candidates, component state studies, design systems, optional provider adapters and every other resource. Once a Web/App resource is selected for implementation, however, its representation must satisfy the implementation-source profile rather than relying on a flattened image.

For an implementation handoff, sufficiency is development-corresponding rather than product-global: every material user-visible design decision inside the explicit development scope is covered by selected existing or newly generated Source, is not applicable or is excluded by that scope. An honestly unresolved/unavailable decision may stop further authoring, but only as a blocked result; it cannot become a ready handoff. One addressable page/prototype/board may cover many conditions; repeated controls may map to a shared component family; only unique or complex uncovered controls need dedicated studies. A static/default view proves no unshown state, interaction, motion, responsive or accessibility behavior. Design resources express user-visible interaction semantics and product-rule presentation, while business, data, permission and algorithmic rules remain owned by product/technical Source.

The resource-generation Skill never updates `project_context/**`, `DESIGN.md` or production code merely because generation succeeded. It never promotes a candidate to `exact-target`, creates Contract authority or claims product acceptance. The separate explicit-only `design-system-authoring` Skill may adopt one selected system into canonical project authority.

`source-plan-authoring` is no longer installed or package-managed. A raw initial proposal enters a bounded design loop directly. During iteration the Skill buffers decision effects task-locally; after explicit or delegated final selection it performs one consolidated idempotent reconciliation of accepted decisions into that proposal. The revised proposal plus selected immutable resources then goes directly to the current native Goal or enters `long-task-workflow`'s Source-bound Contract Draft loop immediately, where Source completeness and Contract mapping converge without semantic flattening. Legacy Source Plan documents remain ordinary Source.

## 2026-07-22 Workflow And Provider Amendment

This amendment supersedes older statements below that assigned proposal revision to another owner or recommended a later standalone Source Plan handoff. Historical experiment observations remain valid.

- Add explicit-only `design-system-authoring` to the base managed set. It is normally invoked by the user at project cold start and is never auto-run by `init`, `sync`, default Workflow or `design-resource-authoring`.
- Open Design 0.15.1 MCP server 0.2.0 exposes design systems as `od://design-systems/<id>/DESIGN.md` resources and `create_project.designSystem`, but no design-system creation tool. The Skill feature-detects a future MCP lifecycle tool first, otherwise uses the same official daemon's `/api/design-systems/generation-jobs`, revision, revision-status, preview/file and token-rebuild routes.
- The final read-only live smoke enumerated 152 concrete design-system resources and read one body successfully. Current MCP returns `-32601` for `resources/templates/list`, so concrete `resources/list`/`resources/read` is the required path and template enumeration remains optional capability discovery.
- Candidate generation, explicit/delegated selection, provider revision acceptance and project authority adoption are distinct. Project `DESIGN.md`, one authored exact-value token source/generation direction and owning Context remain canonical; provider ID/revision/digest/project binding are synchronization provenance.
- `design-resource-authoring` gates only style-bearing work. High-fidelity/branded/visual-treatment/prod-style resources require configured Design Authority and a matching `get_project.designSystemId`; low-fidelity structure, IA/flow and semantics-only state studies remain allowed. Missing authority stops and points to explicit `$design-system-authoring` without invoking it.
- Proposal effects remain task-local during iteration. Final selection triggers exactly one consolidated, idempotent writeback of accepted decisions to the initial proposal; rejected/unresolved choices are excluded. No Source Plan, Context, `DESIGN.md`, code or Contract is mutated.
- Source-quality synthesis/refinement is integrated into `long-task-workflow`. The recommended inputs are the revised proposal plus selected immutable resources. `/source-plan-authoring` is a retired, uninstalled name; legacy Source Plan documents remain valid ordinary Source.

## 2026-07-24 Shared Development-Input Adapter Amendment

This amendment supersedes older statements below that allowed a selected implementation handoff to remain prose-only or said that no dedicated file/schema was required. That lightweight rule still applies to exploration, candidates and unselected previews.

- The design purpose is explicit: every material UI/UX fact actually declared for the selected development scope must survive into implementation, testing and acceptance without Agent invention or category substitution.
- Open Design HTML, images and prototypes remain valid artifacts. For a selected implementation Web/App handoff, the canonical machine-readable source—not a PNG alone—must be retrieved completely with its exact dependencies. The provider-neutral structured supplement remains the residual coverage/binding layer: it makes only explicitly specified or demonstrated facts traceable into a Contract, while absent meaning requires resource refinement, an explicit decision or a blocked handoff rather than inference.
- A selected implementation handoff emits one project-native marked Markdown Source containing exactly one strict `design-resource-handoff-v1` YAML block. Its repository location is arbitrary and it is not a pack or registry.
- The block indexes scope, provenance, immutable repository-local resources/digests/editable upstreams, declared conditions, stable subjects/targets, implementation source profiles, typed addressable evidence, eight-dimension coverage, Source-item refs, verification methods, acceptance blockers and proposal-reconciliation status.
- Every subject closes `surface_flow`, `visual_content`, `component_control`, `state_interaction`, `motion`, `adaptation_input`, `accessibility` and `assets` separately for each applicable selected target and condition. Unresolved/unavailable meaning makes the handoff not ready.
- Evidence kinds are dimension-sensitive. In particular, a static frame cannot prove unseen states, interaction, motion, responsive/input or accessibility semantics; resource integrity never proves implementation conformance.
- `ty-context design-resource preflight <handoff.md>` is the shared adapter entry. `design-resource-authoring` runs it before handoff, the default Workflow reruns it before fidelity authorization, and Long-Task Preflight/Compile reruns it while binding target/conditions/files/Source Claims/root Assertion/blockers.
- Default and Long-Task retain different lifecycle strength but consume the same design meaning. The adapter creates no Authority Lock, Progress, Receipt, Gate, acceptance result or durable Context fact.

## 2026-07-24 Implementation-Source Closure And Provider Selection Amendment

This amendment supersedes the short-lived default Figma-native producer profile. The earlier Open Design/Figma research remains historical evidence, but the accepted architecture is provider-neutral and closes the enforcement gaps directly.

- **Problem and purpose:** direct visual consumption and manually rewritten prose can omit or distort selected UI/UX facts. Hash-only validation can accept a real file with fictional locators; subject-by-dimension coverage can falsely span unrelated targets/conditions; method names and blocker keys can exist without proof carriers. The purpose remains complete conformance by Agent implementation, acceptance and testing to every material fact explicitly selected inside its declared scope and conditions.
- **Canonical implementation source:** for Web/App implementation handoffs, `design-resource-authoring` explicitly commissions and completely retrieves one machine-readable canonical entry and its exact dependency closure, freezes each file with a digest and declares `acquisition: complete`. PNG is only a derived visual baseline. Reachable state/interaction, responsive, motion, semantic/accessibility and asset facts must be represented when claimed.
- **Source QA and conflict closure:** before `ready`, authoring exercises every declared verification method against the immutable canonical entry under its claimed conditions and cross-checks repeated facts across code/specs/tokens/assets. A mismatch is refined or remains `decision_required`/`unavailable` with a blocker. Shared preflight checks identity/addressability rather than pretending to be a universal browser/semantic comparator.
- **Residual handoff:** `design-resource-handoff-v1` references canonical facts through typed HTML/Markdown/JSON/CSS locators that preflight resolves against the declared resource. It owns scope, applicability, product meaning, exclusions/unresolved facts, Source Items, methods and blockers without copying every CSS value.
- **Coverage closure:** each applicable `subject × target × condition × dimension` cell has exactly one disposition. A broad row cannot satisfy a target or condition to which the subject does not apply.
- **Authority and proof:** canonical output and residual handoff remain ordinary Source. Context/`DESIGN.md` owns durable selection. Default Contract Conformance reports only the affected conditions established by current-candidate project checks. Long-Task maps every verification method to an independent positive Assertion with relevant Source-item Claims and method-appropriate typed evidence; blockers retain exact Source-item/method lineage into target-local machine proof or a target-blocking External Confirmation, and its sole Final Gate proves only the declared current production snapshot.
- **Fail-closed limits:** incomplete dependency closure, truncated acquisition, unsafe/missing file, stale digest, unresolvable locator, incompatible media, uncovered applicable cell, unresolved meaning, method drift and blocker-lineage drift block readiness. Generation/preflight success proves input completeness/integrity only.
- **Provider selection background:** Figma is valuable for an existing collaborative authority using Components/Variables/Variants, shared libraries, Dev Mode or Code Connect, but seats, MCP quotas/auth and dual-representation sync make default conversion unjustified. Penpot is appropriate when open/self-hosted multi-user design infrastructure is itself required. OpenPencil is useful as a local MIT static-layout sidecar, but its current prototype/motion coverage is incomplete. None replaces the residual handoff or Final Gate.
- **Indexed surfaces:** the owning Context, `PROJECT_SPEC.md`, English/Chinese/package README, managed/generated/package Skills and references, Long-Task Source/Contract/evidence guidance, authoring overlay, source-sync map and deterministic mutation tests must stay aligned.

```text
product/technical Source + configured Design Authority
  -> design-resource-authoring implementation-level Open Design commission
  -> complete canonical entry + exact dependency closure + immutable digests
  -> method-proportional source QA + cross-resource conflict closure
  -> typed locator addressability + editable upstream route
  -> residual provider-neutral design-resource-handoff-v1
  -> subject × target × condition × dimension closure
  -> Context-reachable target + Source Claims + Controls/surface_bindings
  -> method Assertions + blocker provenance
  -> production owner + cold-start journey
  -> design_conformance + interaction + target-runtime evidence
  -> Contract Conformance or sole Long-Task Final Gate
```

Provider-selection sources consulted on 2026-07-24:

| Source | Selection meaning |
| --- | --- |
| [Figma pricing](https://www.figma.com/pricing/) and [MCP limits](https://developers.figma.com/docs/figma-mcp-server/rate-limits-access/) | Native collaboration can justify Figma, but current seat cost, plan/seat-dependent read quotas and authentication are real operating boundaries. |
| [Penpot open format](https://help.penpot.app/technical-guide/developer/data-model/penpot-file-format/), [MCP](https://help.penpot.app/mcp/) and [self-hosting](https://penpot.app/pricing/self-host) | Open/self-hosted collaboration is a distinct benefit only when the deployment/service boundary is desired. |
| [OpenPencil repository](https://github.com/open-pencil/open-pencil) and [roadmap](https://openpencil.dev/development/roadmap) | Local static inspection/conversion is useful; current prototype-flow/motion gaps prevent sole-source use for all eight dimensions. |

## 2026-07-25 Shared Conformance And Durable UI/UX Recovery Amendment

This amendment supersedes wording that made complete selected-design conformance Long-Task-specific or allowed `DESIGN.md` and a Screen Contract to duplicate the same adopted target metadata.

- **One obligation, two carriers:** a selected implementation handoff activates one shared coverage-conservation obligation. Default work uses exact task-local accounting plus project checks and Contract Conformance; Long-Task projects the same meaning into existing Claims, Assertions, bindings and Final Gate. The two closures never run together.
- **Lightweight default closure:** every covered Source Item, declared verification method, blocker, target and condition reaches a production owner, cold-start journey and attributable current-candidate check. Unmapped, unresolved, unexecuted, stale or indistinguishable items block a complete claim. The mapping is ephemeral and adds no file, matrix, state, schema or Gate.
- **Design Source Projection:** durable surface/flow/Screen/Control/state semantics route to existing Product Surface or Screen/interaction Context; durable visual-system/token/motion-policy/rationale semantics route to `DESIGN.md`; exact composition/value/timeline/condition and asset bytes remain in the target; repeatable proof routes go to verification Context; provenance, applicability cells, delivery blockers and proof bindings remain Source/Contract-local unless they reveal a durable decision or risk.
- **One canonical adoption record:** `DESIGN.md` owns project/system/component-family targets; the owning Screen Contract owns one-screen/interaction-specific targets. The canonical record owns interpretation, selection basis, immutable locator/digest, condition coverage and editable-upstream update route. Other layers keep only a stable-key owner/anchor pointer and local applicability; the residual handoff's changing coverage index is never copied into Context.
- **Evidence before enforcement expansion:** static tests prove distribution, projection and ownership wording. An optional fixed fresh-agent task/gold/hidden oracle measures actual Context/target recovery; only independent paired runs may support effectiveness/ROI claims. No generic validator or doctor gate is admitted before such evidence establishes a distinct positive-ROI enforcement gap.

### 2026-07-24 live browser mutation benchmark

The existing Open Design project `tc-ui-fidelity-e2e-aurora-20260724` (generation run `25f56aff-7545-4279-968e-07b593824ad6`, correction run `f5e93822-364f-48c0-9336-0c1785e931d8`) supplied `index.html`, `design-spec.md`, `component-spec.md`, `tokens.css` and `asset-manifest.md`; the final entry SHA-256 is `EA83C71DF25FB9B7E0588BFAA0F35E03147F9304CF6DB7792EFF34E5F7C5FDA2`. A real Chromium run independently mutated layout, accent token, copy, selected Control state, site-selection interaction, 390px reflow, accessible name, motion timing and inline SVG assets. All nine owning checks passed on their baselines and failed on mutation: kill rate `9/9` (100%), targeted false-green count `0`, browser mutation execution `34.4s`.

The same run found one source-level conflict outside those baseline checks: `--motion-dialog`/the spec declares `240ms cubic-bezier(0.22,1,0.36,1)`, while the rendered dialog computes the higher-specificity surface `filter` transition at `180ms ease-in-out`. Therefore this resource is not a ready all-facts handoff until refined or explicitly blocked. This is exactly why provider success, static checks and file completeness cannot replace method-proportional source QA.

<a id="dra-input-inventory"></a>
## Input Inventory And Treatment

### `IN-DRA-USER-001` — Current conversation and explicit Goal

- Role: controlling direct Source.
- Direct meaning:
  - design-resource generation deserves a dedicated Skill separate from Source Plan authoring and from downstream development workflows;
  - inputs may be a product plan plus technical plan, or a specialized visual-design brief and requirements;
  - the Skill must decide what to obtain from Open Design from the actual request and Open Design's actual capabilities;
  - neither prototypes nor any other artifact are fixed mandatory outputs, even if prototypes are often likely for Web/App work;
  - Open Design should be invoked rather than having its mature generation logic copied into Tiny Context;
  - the result must be suitable Source for the default Workflow Contract or `long-task-workflow`;
  - generation alone must not update Context or implementation;
  - a user may provide extensive background while requesting only one control, one screen or a few screens for style exploration;
  - an initial draft may go directly through repeated design-resource exploration before any Source Plan exists;
  - after explicit/delegated final selection, the Skill consolidates impacts and performs one idempotent accepted-decision reconciliation of the initial proposal;
  - efficiency and quality both matter, and unnecessary post-generation packaging/validation work should not obscure a simple preview request;
  - this Goal must research source and live behavior, execute bounded experiments, produce a complete plan and index important details.

### `IN-DRA-USER-002` — Development-corresponding design-purpose clarification

- Role: controlling direct Source for the clarified Skill purpose and this package update.
- Direct meaning:
  - the Skill is independent of Long-Task and other consuming workflows; those workflows may consume its outputs but do not define its purpose;
  - the explicit development content is the generation ceiling when the user asks for implementation-facing resources, so a partial feature never expands into detailed design for the whole page or product;
  - necessary surrounding context may be included only to place, size or explain the in-scope slice and does not itself become detailed generation scope;
  - within that ceiling, the resource set must carry every material user-visible UI/UX decision needed for implementation from overall flow/page/region composition and layout constraints down to relevant control anatomy, dimensions, variants, copy/content, static/dynamic states, interaction, focus/selection, feedback, recovery, motion, responsive/platform/input behavior, localization/content stress, accessibility and necessary assets;
  - an existing page prototype or design system counts only for the conditions it explicitly specifies or demonstrates; a visible default control does not imply all states or interaction coverage;
  - control-level completeness does not mean one separate design file per control: repeated controls may map to one selected component family, related states may share one board/workbench and one large addressable artifact may cover several items;
  - unique or complex controls with uncovered material behavior may require dedicated state/interaction resources;
  - design resources may describe user-visible interaction logic and the visual presentation of product rules, but business/data/permission/algorithmic rules remain owned by product/technical Source;
  - the ready-handoff stop condition is that no material in-scope user-visible design choice is silently left for the implementer to invent; honest unresolved/unavailable items remain visible blocked outcomes rather than fabricated completeness;
  - the design purpose and its owners, indexes, public documentation and regression coverage must remain aligned, followed by a versioned npm release.

### `IN-DRA-USER-003` — Shared development-input adaptation requirement

- Role: controlling direct Source for the 2026-07-24 adapter delivery and workflow smoke.
- Direct meaning:
  - the target outcome is that Agents developing, testing and accepting UI/UX completely follow the selected design resources inside their declared scope;
  - `design-resource-authoring` must transform the raw Open Design result into input rich enough for both the Long-Task Workflow and the non-Long-Task Workflow Contract, instead of returning the provider result unchanged;
  - prototype layout/information, control visual detail, states, interaction UX, motion and every other applicable design-resource fact must remain explicit and consumable rather than being guessed from one static image;
  - the owning Context must state both this purpose and the mechanism and must route future work to all affected implementation, Skill, documentation and verification surfaces;
  - verification must include one actual Open Design generation of a UI/UX-complex, business-logic-simple single page and exercise its handoff through both development consumers.

### `IN-DRA-USER-004` — implementation-source and proof-closure requirement

- Role: controlling direct Source for the 2026-07-24 source/proof strengthening.
- Direct meaning:
  - force Open Design to produce and completely expose implementation-readable UI/UX source rather than treating its capability as a promise;
  - keep the structured handoff as a residual semantic/index layer and resolve every claimed locator;
  - close applicability per subject/target/condition/dimension and preserve method/blocker proof lineage;
  - record Figma, Penpot and OpenPencil only as concise provider-selection background;
  - update the entire design-purpose mechanism chain with complete, causally rigorous explanation rather than isolated wording;
  - retain the same information-completeness and causal-rigor obligation in the source-workspace authoring Skill; and
  - verify the false-green counterexamples through deterministic mutations and the complete package suite.

### `IN-DRA-USER-005` — shared conformance, lightweight default and durable UI/UX Context requirement

- Role: controlling direct Source for the 2026-07-25 workflow/Context clarification and release.
- Direct meaning:
  - preserve selected-resource Source authority on both routes while reserving complete per-Fact machine production closure for Long-Task and keeping the default route materially lighter;
  - distinguish the task-input workflow obligation from durable project UI/UX Context recovery;
  - reuse a single shared contract rather than duplicate the same closure in default and Long-Task execution;
  - ensure default work explicitly hands every covered fact, method and blocker to implementation and final-candidate checks without introducing Long-Task artifacts/state;
  - make UI/UX facts accurately recoverable through deterministic placement and exactly one canonical adopted-target owner rather than duplicated records;
  - add benchmarkable fresh-agent recovery evidence while keeping static checks honest about what they prove;
  - keep default-Context byte budgets advisory so a fixed heuristic cannot force omission, unreadable compression or false `on-demand` placement of genuinely near-universal recovery facts;
  - assess ROI, reject unnecessary validator/runtime/schema cost and preserve conditional activation; and
  - complete package verification, commit/current-branch push, main integration/push and patch npm publication.

### `IN-DRA-USER-006` — default-Context budget origin, influence and historical-audit requirement

- Role: controlling direct Source for the 2026-07-25 byte-budget correction and audit.
- Direct meaning:
  - identify when and why the 64 KiB default-Context threshold entered the repository;
  - distinguish runtime/validation/workflow effects from a source-workspace release-test effect;
  - remove the absolute source-release gate while retaining only clearly advisory attention-cost telemetry;
  - determine from repository history whether post-introduction mechanism work lost controlling semantics during default-Context contraction;
  - correct any residual warning language that could still reward omission, unreadable compression or false `on-demand` placement; and
  - report the audit's epistemic boundary honestly: committed diffs and current owners are inspectable, but uncommitted ideas and author intent cannot be proven from Git.

### 2026-07-25 default-Context byte-budget historical audit

Commit `a17d3656949b93ae7151f44b81653c1a38f38a2b` introduced the 64 KiB total and 16 KiB per-file soft-budget constants on 2026-07-18. Runtime use was confined to default-footprint inspection and `doctor` warnings; no Context parser, validator, export, sync, default Workflow, Long-Task compiler, verifier or Final Gate read either constant. The same commit also added one source-workspace test assertion that the repository's selected default set remained below 64 KiB, making the heuristic an unintended source-release acceptance gate.

A first-parent-relative audit of every commit reachable from the current line that touched `project_context/context.toml`, `global.md`, `architecture.md` or the default `areas/harness-package.md` found 29 commits and only four contractions:

| Commit | Before | After | Delta | Classification |
| --- | ---: | ---: | ---: | --- |
| `a17d3656` | 49,433 | 27,344 | -22,089 | Startup summarization plus explicit on-demand/Skill/`PROJECT_SPEC.md` routing. Detailed Long-Task procedures remained in newly split authoring/evidence/authority references and executable code/tests; current owners still expose the removed Source, Draft, Preflight, Authority Lock, targeted-repair, same-snapshot Final Gate, recovery and platform-boundary semantics. |
| `03eda2bc` | 54,476 | 52,762 | -1,714 | Deliberate retirement of standalone Source Plan authoring in favor of the integrated Source-bound Contract Draft loop. The commit replaced the old Skill with the compatibility pointer, added integrated source-authoring guidance and corresponding tests; it changed the mechanism rather than silently dropping its still-required preference/provenance/high-risk boundaries. |
| `4c9d84f9` | 64,997 | 64,124 | -873 | Authority Revision and design-resource summaries were shortened while the same commit added revision-analysis/runtime code, tests and 6,311 net bytes across the full Context tree. This is summary replacement backed by stronger on-demand ownership, not a missing mechanism obligation. |
| `2aa2af06` | 65,038 | 63,725 | -1,313 | Provider-specific Figma-native wording was replaced by stricter provider-neutral canonical source/dependency/locator closure. The commit added source-validation/Long-Task proof code and tests while retiring a default conversion representation; selected-design enforcement became stronger, and Figma/Penpot/OpenPencil remained optional upstream choices. |

The history therefore shows real maintenance pressure: several default snapshots approached the 65,536-byte ceiling, so the assertion and the old “shorten or move” doctor wording could influence future authoring even though they never constrained runtime mechanism code. The semantic-retention audit found no repository evidence that a still-required post-2026-07-18 mechanism was weakened because of that pressure. That conclusion is narrower than “it was impossible”: Git can verify committed deletions, replacements, owners and tests, but cannot reveal an idea omitted before commit or prove subjective causation. The correction removes the absolute assertion, proves oversized valid Context returns warnings with no error, preserves required-fact precedence in owning Context/public guidance and makes both total/per-file warning text explicitly advisory.

### `IN-DRA-EXT-001` — Original 1,077-line external UI/UX upgrade proposal

- Historical authoring locator: `attachment-provenance://adc1c9bf-c698-46ae-b6bc-819752ba43fb/pasted-text.txt` (deliberately non-resolvable).
- Role: external proposal/problem evidence, not automatically authoritative project fact.
- Adopted meaning:
  - distinguish product/surface meaning, visual-system authority, concrete targets, implementation and evidence;
  - preserve stable surface/control/target identities and explicit condition coverage;
  - candidates and inspiration do not authorize fidelity implementation;
  - subjective visual selection remains a human or explicitly delegated decision;
  - static visuals alone do not prove interaction, accessibility or independent native targets.
- Corrected/narrowed meaning:
  - no mandatory Figma, three variants, fixed directory, pixel threshold, full state-image set or Cartesian coverage;
  - Starward-specific pages, directions and viewport suggestions are pilot material, not package-wide facts;
  - the resource-generation Skill does not own Context adoption, production implementation or Final Gate evidence.

### `IN-DRA-PLAN-001` — Existing page-level UI/UX authority Source Plan

- Repository path: `docs/page-level-uiux-authority-design-source.md`.
- Role: approved upstream architecture Source for the already-implemented consumption boundary.
- Controlling constraints:
  - external design resources remain ordinary Source until reconciled downstream;
  - stable surface/control/target keys connect design Source to Context, `DESIGN.md`, implementation and verification;
  - lightweight UI work remains lightweight;
  - no second product/design authority, Contract, Gate or UI workflow lifecycle;
  - selected targets require real selection basis and protected adoption, while candidates cannot select themselves.

### `IN-DRA-HARNESS-001` — Current Tiny Context authority and implementation

- Role: controlling durable project authority plus current implementation evidence.
- Primary sources read for this plan: `project_context/global.md`, `project_context/architecture.md`, `project_context/context.toml`, the Harness package area root and its workflow/package/foundation/Long-Task/verification/implementation-index Context.
- Current boundary:
  - Tiny Context already consumes externally authored flows, wireframes, visual candidates, prototypes, token exports, component specifications and Figma resources without requiring a common pack;
  - default Workflow owns UI Authority Closure, `Context Delta`, durable adoption, implementation and project verification;
  - Long-Task accepts such resources through existing Source, Binding, verification-input, protected revision and Check mechanisms;
  - integrated Long-Task Source authoring may supply richer downstream meaning; the retired Source Plan pointer does not generate designs;
  - at research time the product specification did not yet include this thin commissioner; the separately authorized implementation delivery therefore treated adding it as a product-boundary change and applied the normal package-authoring impact review.

### `IN-DRA-OD-001` — Open Design official repository and protocol sources

- Role: primary, current provider evidence; retrieved 2026-07-22.
- Repository: <https://github.com/nexu-io/open-design>.
- Researched revision: [`447b18b98e0db98a586ef913b76b0269e487db70`](https://github.com/nexu-io/open-design/tree/447b18b98e0db98a586ef913b76b0269e487db70), current upstream `main` at retrieval time.
- Material sources:
  - [project README](https://github.com/nexu-io/open-design/blob/447b18b98e0db98a586ef913b76b0269e487db70/README.md);
  - [`docs/agent-adapters.md`](https://github.com/nexu-io/open-design/blob/447b18b98e0db98a586ef913b76b0269e487db70/docs/agent-adapters.md);
  - [`docs/skills-protocol.md`](https://github.com/nexu-io/open-design/blob/447b18b98e0db98a586ef913b76b0269e487db70/docs/skills-protocol.md);
  - [daemon MCP implementation](https://github.com/nexu-io/open-design/blob/447b18b98e0db98a586ef913b76b0269e487db70/apps/daemon/src/mcp.ts) and MCP run/artifact tests;
  - current functional-skill, rendering-template, design-system and plugin registries;
  - [`mobile-app`](https://github.com/nexu-io/open-design/blob/447b18b98e0db98a586ef913b76b0269e487db70/design-templates/mobile-app/SKILL.md), [`wireframe-mobile-flow`](https://github.com/nexu-io/open-design/blob/447b18b98e0db98a586ef913b76b0269e487db70/design-templates/wireframe-mobile-flow/SKILL.md), [`frontend-design`](https://github.com/nexu-io/open-design/blob/447b18b98e0db98a586ef913b76b0269e487db70/skills/frontend-design/SKILL.md) and Figma catalogue/plugin sources.
- Treatment: repository claims are pinned to this revision. Runtime availability was independently checked against the local installation rather than inferred from documentation.

### `IN-DRA-OD-LOCAL-001` — Local Open Design installation and visible capability catalogue

- Role: environment-specific runtime evidence, observed 2026-07-22.
- Installation: `E:\Open Design\Open Design.exe`; the desktop app is installed and running.
- Installed payload: `open-design-packaged-app` `0.15.1`; its embedded MCP server reports protocol `2025-06-18` and server version `0.2.0`.
- Live catalogue snapshot: 162 functional skills, 125 rendering templates, 152 design systems and 460 installed plugin records.
- Inner agents available through Open Design included Codex CLI `0.144.5`, AMR and BYOK OpenCode. Codex advertised nine live model choices including `gpt-5.6-sol`; all four experiment runs used Open Design's `codex` agent with that model.
- The active experiment design system was `user:design-md` (“今晚去观星”), digest `42ec0bd36f8be7a4f92245044633922c6c661d9e9411bcc4d801f73a5378e201`.
- Open Design exposes project templates including prototype, wireframe, mobile app, website, slides, document, HyperFrames, WebGL, dashboard, image, video, audio and design-system creation. Relevant templates include greybox, hand-drawn, mobile-flow and annotated/redline wireframes.
- `od` is not on this shell's `PATH`, but `/api/mcp/install-info` returned an absolute packaged runtime command that successfully launched `od --help` and the stdio MCP server. Codex MCP install status was `available: true`, `installed: false`; this Goal did not mutate global Codex MCP configuration.

### `IN-DRA-VIS-001` — Supplied screenshots and prior exploratory output

- `codex-clipboard-52fa92f7-7bda-45bb-8feb-c5a02c3f69f8.png`: Open Design advice distinguishing high-fidelity prototype use from wireframe-only structure work.
- `codex-clipboard-d78da62b-37b7-4402-8ba5-ee29cf46edfc.png`: prior one-screen “今晚首页” candidate and the unwanted extra validation/packaging actions that followed a simple preview request.
- `codex-clipboard-ef65d3c9-c5ac-4725-901d-c5c1b6f74958.png`: current Open Design home and template picker, including prototype, wireframe, mobile and other project types.
- Role: visual/runtime evidence and usability motivation, not selected product target authority.

<a id="dra-current-boundary"></a>
## Existing Consumption Boundary To Preserve

Tiny Context already has the downstream half of the system:

1. generation outputs can arrive in any project-native format as ordinary Source;
2. a candidate has no fidelity authority;
3. a selected exact target or scoped constraint must have selection basis, declared surface/viewport/mode/state/content coverage and stable immutable identity;
4. default Workflow or Long-Task reconciles that Source with product/surface Context and `DESIGN.md`;
5. only the downstream workflow may update durable owners, implement production code and declare project-owned checks;
6. generated screenshots, diffs, logs, Open Design runs and packaging receipts remain Source/review/evidence material, not Context.

The missing half is not another authority model. It is a resource-planning and provider-orchestration capability that can answer:

```text
What design uncertainty blocks or materially improves this requested scope?
When the request is implementation-facing, what exact development surfaces/flows/regions/components/controls and conditions are in scope, and what surrounding context is necessary but not itself detailed scope?
Which material user-visible UI/UX decisions inside that scope are already covered by selected Source, and which would otherwise be invented during implementation?
Which available Open Design resource is the cheapest sufficient way to resolve it?
What should intentionally not be generated?
What condition coverage and provenance must survive handoff?
Does the user want exploration, a development handoff, or selected-source preparation?
```

<a id="dra-research-questions"></a>
## Research Questions

- `RQ-DRA-001` — Which Open Design capabilities are callable through MCP today, and which still require CLI or desktop interaction?
- `RQ-DRA-002` — Can the outer Codex commission an Open Design run whose configured inner agent is Codex CLI, without emulating Open Design prompts?
- `RQ-DRA-003` — Which resource kinds are first-class skills/templates/plugins, and which require a generic project plus a custom commission?
- `RQ-DRA-004` — Can generated source files, previews, run status and provenance be retrieved programmatically and handed off reproducibly?
- `RQ-DRA-005` — What installation/authentication/model-discovery/bootstrap steps are required, and which may safely be automated?
- `RQ-DRA-006` — Is Figma export/library/file generation operational from Open Design, merely catalogued, or dependent on separately installed upstream capabilities?
- `RQ-DRA-007` — Can one component, one page and one low-to-high-fidelity flow be generated without scope expansion, and what review/iteration is actually useful?
- `RQ-DRA-008` — Which provider failures are recoverable by retry/resume, and when is UI/Computer Use genuinely required?

<a id="dra-research-findings"></a>
## Resolved Open Design Capability Findings

### `FIND-DRA-001` — MCP is a real commissioning surface, not only a file reader

A live stdio handshake against the installed Open Design MCP succeeded with protocol `2025-06-18`. It exposed 19 tools:

```text
list_projects, get_active_context, get_artifact, get_project, get_file,
search_files, list_files, create_artifact, write_file, delete_file,
delete_project, create_project, list_skills, list_plugins, start_run,
get_run, cancel_run, list_agents
```

`create_project` intentionally defaults `skipDiscoveryBrief` to true for outer-agent use. `start_run` commissions Open Design; the daemon then launches its own configured agent. `get_run` is asynchronous and exposes terminal status, preview and the inner agent message. This is the primary v1 integration contract.

### `FIND-DRA-002` — Codex CLI can be the inner Open Design agent

Live `list_agents` returned Codex as available and authenticated. The three initial runs and one high-fidelity follow-up were launched by Open Design with agent `codex` and model `gpt-5.6-sol`. Run start events identify the project cwd, model and agent, and the daemon captured a redacted native resume handle. The outer Skill therefore chooses/discovers an Open Design agent; it does not recursively execute itself or imitate the selected Open Design recipe.

### `FIND-DRA-003` — Functional skills and rendering templates are distinct registries

Open Design serves functional skills from `/api/skills` and rendering templates from `/api/design-templates`; a project/run can resolve an ID from either registry. The distinction is material:

- `frontend-design` is a functional skill and appears in MCP `list_skills`;
- `mobile-app` and `wireframe-mobile-flow` are rendering templates and do not appear in MCP `list_skills`;
- the installed provider had 162 functional skills and 125 rendering templates;
- no general-purpose component-state-board template was present; the bounded component experiment used `frontend-design` instead;
- `mobile-app` is deliberately one high-fidelity screen/one job; `wireframe-mobile-flow` is deliberately a three-or-four-frame lo-fi structure board;
- Open Design has specific high-fidelity multi-frame templates such as onboarding or gamified-app, but no generic high-fidelity multi-page product-flow template. Generic `frontend-design` is the supported escape hatch for a bespoke interactive flow.

### `FIND-DRA-004` — Current MCP has a template-discovery gap

The live MCP exposed 315 resources under only `od://focus`, `od://skills` and `od://design-systems`. It has no `list_design_templates` tool and no `od://design-templates/...` resources, even though `start_run`/project resolution can use a known rendering-template ID. The Skill must not solve this by copying a stale template catalogue.

Required compatibility behavior:

1. use `list_design_templates` when a future provider exposes it;
2. on the tested local provider, use a version-guarded structured `/api/design-templates` compatibility query or UI-assisted template selection;
3. when neither is available, continue with discoverable functional skills/plugins only if they preserve the requested meaning, and report degraded template discovery;
4. propose an upstream Open Design addition for `list_design_templates` plus `od://design-templates/<id>/SKILL.md`, because the run protocol already accepts these IDs.

Computer Use is therefore a fallback for provider bootstrap/template-picker or other genuinely UI-only state, not the primary generation transport.

### `FIND-DRA-005` — Artifact retrieval needs explicit entry resolution and immutable identity

MCP `get_run` successfully returned a raw preview for completed runs. MCP `get_artifact` retrieved the page source when called with explicit `entry: "index.html"`, but the implicit call failed with `no entry file` because generated files did not automatically populate project `metadata.entryFile`. The lo-fi template emitted `stargazing-decision-flow.html`, so assuming `index.html` also fails in the opposite direction.

Preview URLs are project paths, not immutable run snapshots. After the same project gained a later `index.html`, querying the earlier lo-fi run resolved the project's current `index.html` preview. Handoff must therefore preserve `project id + run id + explicit entry path + content hash/snapshot`; a mutable preview URL alone is insufficient.

### `FIND-DRA-006` — Figma support is conditional and currently asymmetric

The provider has real Figma-import machinery: `figma-extract` accepts a Figma URL and OAuth token, retrieves node tree/tokens/assets and requires a configured Figma connector. Its plugin doctor passed manifest integrity, which does not prove OAuth, connector availability or a successful extraction.

The installed `figma-generate-design` and `figma-generate-library` skills are catalogue pointers to `https://github.com/figma/skills`; their own instructions require the full upstream bundles to be installed in the active agent. Open Design's `handoff` atom records a Figma export target only after another exporter wrote it; it is not itself a Figma frame writer. No Figma MCP/connector or editable-design creation was proven operational in this Goal. A Codex Figma plugin may be offered only when the user explicitly wants Figma and the connector/plugin is installed and authenticated; it is never a prerequisite for HTML prototypes or Tiny Context consumption.

This is a historical finding about the tested 2026-07-22 Open Design environment, not a prohibition on current native Figma input. The 2026-07-24 amendment feature-detects the active Figma path and, when operational, consumes exact version/node facts through the provider-neutral immutable-input and residual-handoff boundary.

### `FIND-DRA-007` — Provider self-review and outer review are different layers

The generated HTML sources contained structural checks, but the high-fidelity flow run showed that the nested Codex process had no Browser MCP servers in its Open Design tool bundle. It attempted a hidden local server that policy rejected and a Windows-incompatible Bash Playwright wrapper before recovering. The outer Codex Browser could inspect the finished provider preview directly.

The efficient split is:

- Open Design owns its recipe/template execution and source creation;
- the outer Skill performs the intent-proportional render, interaction and console sanity check promised to the user;
- project E2E/native/visual-regression tests remain downstream implementation evidence.

Do not instruct every Open Design run to reproduce the outer browser harness. This adds latency and fragility without improving authority.

### `FIND-DRA-008` — Run status, diagnostics and quality must be interpreted separately

The live Codex runs emitted repeated model-cache schema and refresh diagnostics on stderr while still completing with exit code 0 and usable artifacts. The high-fidelity flow follow-up exposed the inverse mismatch: its agent emitted a final response, usage event and complete artifact that passed outer review, but remained `running` until Open Design eventually marked it `failed` after 600 seconds without new output. The terminal record reported exit code 1, `AGENT_EXECUTION_FAILED`, `timeout` / `inactivity_timeout`, `resumable: true`, `endedWithUnfinishedWork: false` and `artifactCount: 1`. Conversely, a `succeeded` run and artifact count do not prove visual correctness, interaction coverage or downstream suitability.

The adapter must preserve three separate facts:

- provider execution state: `running`, terminal success, terminal failure or terminal reconciliation pending;
- artifact readiness: missing, partial, retrievable and hashable, or review-complete;
- design suitability: unreviewed, structurally sane, interaction-sane or selected by a human/delegated rule.

It should preserve diagnostics, require terminal status before declaring provider execution success, and apply the bounded artifact check promised by the current intent. If a complete artifact exists while terminal reconciliation remains pending, it may show or hand off that artifact with the explicit qualifier `artifact-ready/run-unreconciled`. If the provider later fails after the complete artifact was emitted, update the qualifier to `artifact-ready/provider-failed` and preserve the failure details. Do not silently relabel either run as succeeded, discard an independently verified artifact solely because of post-artifact process bookkeeping, cancel a still-live run without the user's instruction or turn any status into product acceptance.

<a id="dra-decision-model"></a>
## Dynamic Resource Decision Model

The Skill should infer a bounded commission from ordinary prose; it must not require a questionnaire or assume that all supplied background is generation scope.

### Step 1 — Establish the requested-scope ceiling

Separate background coverage from requested output or development coverage. Explicit scoping such as “only this control,” “this panel,” “one screen,” “three screens,” “style exploration only,” “do not update Context/code,” or “prepare the design resources for this development slice” is binding. When development scope is partial, identify only the surrounding context needed to place, size or explain it; that context does not put the rest of the page/product into detailed generation scope. More input detail improves selected resources but never silently expands coverage or artifact count.

### Step 2 — Inventory existing authority and uncertainty

For the requested surfaces/flows/regions/components/controls only, identify:

- product/user decision and required behavior;
- platform, viewport and interaction modality;
- existing information architecture, screen/control semantics and states;
- existing design system, exact targets, constraints, inspiration and implementation;
- material visual/content, component anatomy/variant, static/dynamic state, interaction/feedback/recovery/motion, responsive/platform/input, accessibility and asset needs;
- which conditions selected Source explicitly specifies or demonstrates and which remain uncovered; seeing a control in one default frame is not dynamic-state coverage;
- which repeated controls map to one existing component family and which unique/complex controls require independent design treatment;
- product/business/data/permission/algorithmic rules that must remain referenced owning Source rather than invented or owned only by visuals;
- genuine user choices that cannot be inferred from stated quality, efficiency, brand, cost, privacy or lock-in preferences.

For an implementation handoff, use the task-local equation:

```text
resources to commission
  = material UI/UX decisions inside the explicit development scope
  - decisions sufficiently covered by selected existing Source
```

Give each material in-scope item one authoring disposition: `existing-covered`, `new-resource-needed`, `not-applicable`, `excluded-by-scope`, `decision-required` or `unavailable`. This is reasoning/handoff metadata rather than a required file, coverage registry, Design Authority or acceptance result.

### Step 3 — Discover live provider capability

Query Open Design's current agents, models, skills, plugins, templates/projects and available integration paths. Do not hardcode a copied template prompt or assume a catalogued Figma workflow is installed. Record unavailable capabilities and choose a supported substitute only when it preserves the requested meaning.

### Step 4 — Select the smallest sufficient resource set

Each candidate resource receives one disposition:

- `selected`: needed now, with a stated gap it resolves;
- `optional`: useful but not needed for the requested decision/handoff;
- `not-needed`: existing authority or smaller resources are sufficient;
- `unavailable`: Open Design cannot currently produce or export it in this environment;
- `decision-required`: a user-reserved preference materially changes the commission.

Resource selection is benefit-driven rather than phase-driven. Examples to validate, not universal rules:

- a single known control may need an interactive component specimen or state board, but no page prototype;
- a new information-dense screen with uncertain hierarchy may benefit first from an annotated or greybox wireframe;
- a visually directed single page may need one high-fidelity interactive prototype and no low-fidelity duplicate;
- a multi-screen flow with navigation/state inheritance may justify a low-fidelity flow and then a consistent high-fidelity prototype;
- a page scheduled for development may use one page/flow target plus shared component-family mappings and only the dedicated unique/complex-control studies needed to close uncovered states, interaction, motion, responsive or accessibility meaning;
- a local panel inside a large app may include a coarse surrounding page context while generating detailed resources only for the panel and affected conditions;
- one large addressable interactive artifact may cover several resources' meaning when its states and sections are inspectable, while one static/default frame cannot claim unseen dynamic coverage;
- an existing immutable Figma/HTML target may require no new design generation;
- a local style bug under adequate authority requires none of these resources.

Use the following as selection heuristics, not a mandatory phase sequence:

| Design gap to resolve | Usually sufficient resource | Select when | Usually omit when |
| --- | --- | --- | --- |
| Route, screen ownership or transition order | Lo-fi flow/wireframe | navigation, branching or cross-screen state is unresolved | the flow is already authoritative and only styling is open |
| One screen's information hierarchy | Annotated/greybox screen | grouping, priority, disclosure or action placement is unresolved | a selected exact target already fixes layout |
| Visual direction for a bounded surface | One or more high-fidelity candidates | the user is comparing styles or no selected visual target exists | only interaction semantics are uncertain |
| One control's behavior and states | Interactive component specimen/state workbench | a unique/complex control's user-visible anatomy, variants, feedback, motion, keyboard, error/loading or recovery is unclear | a selected component/page/prototype source explicitly specifies and demonstrates every applicable condition |
| Cross-screen behavior and shared state | Interactive flow prototype | transitions, persistence or conditional UI must be experienced | a static board answers the current decision and implementation is not yet requested |
| Reusable visual language | `DESIGN.md`/design-system resource | several surfaces need a coherent durable language and existing authority is insufficient | the request is a throwaway style probe or one isolated control |
| Native inspectable/editable source | Figma frames/library plus exact version/node capture | team review, native property/component inspection, editable collaboration or Figma is the declared system of record | other selected resources are sufficient or the connector/auth/read/export path is unavailable |
| Bespoke imagery/media/3D | Specialized Open Design media capability | the requested UI genuinely depends on those assets | decorative media would only fill an authority gap with invention |

Prototype selection heuristic: prefer a real prototype when the unresolved question depends on interaction, transition, shared state, responsive behavior or implementation-facing feedback. Prefer a static/lo-fi resource when the unresolved question is topology, hierarchy or visual direction and interaction would add no independent information. Select neither when existing authority already answers the requested scope.

Control-level completeness is a coverage requirement, not an artifact-count rule. Map ordinary controls to selected shared component variants, group related controls/states into component-family boards or workbenches and reserve dedicated resources for unique or complex uncovered meaning.

### Step 5 — Match execution depth to user intent

- `exploration`: generate only the requested candidate count/scope, perform a minimal render/open sanity check, show the result and stop for feedback; do not create a pack, validator run, Context change or implementation.
- `handoff`: retrieve the minimum sufficient project-native sources, preview and concise provenance/coverage notes needed by another designer or developer. For an implementation handoff, stop only when every material in-scope item has an explicit disposition and mapping, so no material user-visible UI/UX decision is silently left to implementation. Honest `decision_required`/`unavailable` items may end further generation as a blocked outcome, but they cannot pass shared preflight, be called ready or authorize fidelity implementation. Run bounded structural/interaction checks relevant to the promised resources.
- `selected-source-preparation`: only after an explicit user selection or delegated selection rule, freeze/export the selected resource with stable identity and declared coverage so the downstream workflow can consider adoption. This still does not itself update durable authority or production code.

### Ephemeral commission envelope

For every selected resource, the Skill forms one task-local commission envelope. It is an internal execution structure, not a required file or second plan:

- requested scope ceiling and maximum artifact/screen/control count;
- explicit development surfaces/flows/regions/component families/unique controls, necessary surrounding context and exclusions when implementation-facing;
- source facts, constraints, references and unresolved decisions relevant to that scope;
- stable surface/control/state keys;
- platform, viewport, mode and interaction modality;
- the independent design gap this resource must resolve;
- selected live provider capability ID and why it is the smallest sufficient choice;
- required content/state/transition coverage and explicit exclusions;
- existing-source mappings and required visual/content, component/state, interaction/motion, adaptation/input, accessibility and asset coverage;
- expected entry/file form and intent-proportional review promise.

The envelope supplies product-specific instructions around the provider capability. It must not embed or paraphrase Open Design's own template body, seed or hidden workflow prompt.

<a id="dra-provider-orchestration"></a>
## Open Design Orchestration Boundary

The preferred transport order is:

1. Open Design MCP for discovery, project creation, run commissioning, status/cancel and artifact/file retrieval;
2. Open Design CLI or daemon API when MCP installation cannot be refreshed in the current host but equivalent structured behavior is available;
3. desktop Browser/Computer Use only for bootstrap, an unavoidable UI-only selection, signed-in provider interaction, visual preview inspection or recovery.

The outer Skill supplies the product commission, selected Open Design capability and bounded inputs. Open Design's daemon launches its configured inner agent, including Codex CLI where configured. The outer Skill must not recreate the Open Design template prompt, pretend that calling image generation alone is equivalent, or hardcode a model ID that Open Design can discover.

Figma is an optional native input or provider-side refinement/handoff route. It is selected only when the request benefits from native inspectability, editable frames/libraries, component reuse or organizational handoff and the required Figma read/export capabilities/authentication are operational. A catalogue pointer, URL or thumbnail is not evidence that the local path is operational; selected input follows the exact-identity, small-node, immutable-capture and residual-handoff rules in the 2026-07-24 amendment.

### Provider preflight and execution algorithm

1. Discover whether callable Open Design MCP tools already exist. Do not infer absence merely from a missing `od` command.
2. If MCP is callable, initialize only the required discovery surfaces: installed agents/models, functional skills, plugins, relevant design systems and rendering templates when supported.
3. If MCP is not configured but Open Design is installed, report the exact setup boundary. A persistent MCP install changes host configuration and must be explicit; do not silently edit Codex configuration. A tested absolute `od mcp`/daemon route may serve as a task-local compatibility path without installation.
4. Normalize capability metadata to `id`, `kind`, `mode`, `platform`, `fidelity`, `preview type`, design-system requirement, setup/auth state and source version. Do not persist the whole catalogue in Tiny Context.
5. Create or choose a task-local Open Design project. For a new outer-agent project, skip the nested discovery brief because the outer Skill already established the commission.
6. Select the live inner agent/model from `list_agents` or respect an explicit user choice. Do not hardcode the experiment model.
7. Start one run per independently useful resource; parallelize only independent commissions. A low-to-high transformation that consumes the lo-fi artifact is sequential.
8. Poll at provider-appropriate intervals. `running` with unchanged files is not itself a hang; never replace a slow run with hand-authored placeholder output. If a final response and retrievable artifact appear before terminal reconciliation, classify them as `artifact-ready/run-unreconciled`, preserve the run locator/last update and continue bounded observation without claiming provider success. If the provider later fails, transition to `artifact-ready/provider-failed`; retry/resume only when the promised artifact is incomplete/corrupt or the user requests another attempt. Cancel only on explicit user request or a confirmed, user-authorized recovery decision.
9. On success, resolve the actual entry through run output/project metadata/file listing. Retrieve using an explicit entry path, then calculate a content hash or snapshot before later iterations mutate the project.
10. Perform only the review promised by intent. Exploration needs render/open and obvious-scope sanity; handoff adds relevant structure, interaction, console and coverage checks; neither proves production acceptance.
11. Return the requested preview or handoff. Keep provider diagnostics and known limitations visible without burying a simple exploration result in packaging noise.

### Recovery order

- Missing MCP registration: use explicit setup guidance or a task-local structured bridge; UI automation is last.
- Missing template enumeration: future MCP method, then version-guarded daemon query, then UI-assisted selection, then an honest functional-skill substitute or `unavailable` result.
- Unknown/failed entry lookup: `get_project`/`list_files`, choose the declared or generated entry explicitly, then `get_artifact(entry=...)`.
- Authentication/connector failure: preserve the failed provider result and request only the missing auth/authorization; never synthesize Figma IDs, tokens or exports.
- Terminal provider failure: if the promised artifact is missing/incomplete/corrupt and diagnostics identify a recoverable cause, allow one bounded retry/resume; if an independently reviewed artifact is complete, retain it with `artifact-ready/provider-failed` and stop unless the user requests another attempt. Always return the failure and task-local project/run locator.
- Visually or behaviorally unsuitable artifact: refine the same project/run lineage with a precise delta when the user requested handoff quality; for exploration, show the candidate and ask for direction rather than silently multiplying variants.

<a id="dra-experiments"></a>
## Bounded Capability Experiments

All experiments use one compact stargazing-product scenario to reduce domain variance. They create only external/task-local Open Design projects and artifacts; they do not modify repository Context, `DESIGN.md` or production code.

### `EXP-DRA-001` — One control/component

- Purpose: test whether Open Design can produce a focused, implementation-useful component interaction/state resource without expanding to a whole screen.
- Subject/key: `tonight-observation-window-selector`, a 390px night observation-window range control for 20:00–05:00, recommended 23:40–02:10 and humidity risk after 01:00.
- Capability choice: functional skill `frontend-design`; no relevant dedicated generic component template was found in the 125-template catalogue.
- Open Design project: `tc-dra-component-20260722`.
- Run: `82157a4b-958d-48ea-9458-6d655d8e9506`; `codex` / `gpt-5.6-sol`; succeeded in 11m38s; exit code 0; one artifact.
- Artifact: task-local `index.html`, 37,282 bytes, SHA-256 `4175AB613765340D94DA1A31502A9FE8F71D8799E50E058B295CDC065D99D39D`.
- Verified result:
  - exactly one control workbench, not a page;
  - default, keyboard/focus, dragging/pressed, disabled, loading and invalid/recovery states share one component instance;
  - two semantic sliders expose current values and accessible value text;
  - ArrowRight changed start by 10 minutes, PageUp by 30 minutes and Escape restored 23:40;
  - invalid state exposed a visible alert and “恢复推荐窗口” returned to valid defaults;
  - native controls and state buttons measured 44px minimum; no Browser console warnings/errors were observed.
- Conclusion: a focused component resource is viable without a template or page expansion, but its state/interaction coverage must be explicitly commissioned and outer-verified. This resource is useful only when the control behavior is an independent design gap.

### `EXP-DRA-002` — One high-fidelity page

- Purpose: test the common “large background, one requested screen, show me the style” path.
- Subject: only the night-mode “今晚首页.”
- Capability choice: rendering template `mobile-app`, whose own contract is one high-fidelity iPhone 15 Pro screen/one job and requires a design system.
- Open Design project: `tc-dra-page-20260722`.
- Run: `179d96ac-95e4-4f09-b6e5-ca58e8549c60`; `codex` / `gpt-5.6-sol`; succeeded in 7m36s; exit code 0; one artifact.
- Artifact: task-local `index.html`, 24,223 bytes, SHA-256 `559231D46905EF9ADD882A5A6AB0F8F194B7EA631615F5598DF032E6D279A90F`.
- Verified result:
  - one 390×844 device and one “今晚首页,” with no second screen/flow board/Figma/pack;
  - decision, 82/100 score, 23:40–02:10 window, favorable/risk reasons, CTA, four-condition summary and two visible-target previews are present;
  - CTA stayed on the same URL, showed progress and settled as “推荐地点已准备” with a live status message;
  - the conditions control toggled `aria-expanded` and revealed window/risk rationale;
  - CTA, disclosure and five navigation anchors measured at least 50px high; no Browser console warnings/errors were observed.
- Conclusion: when hierarchy and visual direction are already sufficiently bounded, one high-fidelity interactive page can answer the style question without a preceding wireframe. Template choice enforced the scope ceiling more reliably than a generic “make it beautiful” prompt.

### `EXP-DRA-003` — Three-screen low-to-high-fidelity flow

- Purpose: test whether a multi-screen Web/App delivery benefits from and can sustain a low-fidelity flow followed by a consistent high-fidelity prototype.
- Subject: “今晚首页 → 观星地图 → 地点详情.”
- Low-fidelity capability: `wireframe-mobile-flow` rendering template.
- Open Design project: `tc-dra-flow-20260722`.
- Low-fidelity run: `c752f171-8e3d-4328-a00e-d2e32bc73fd6`; `codex` / `gpt-5.6-sol`; succeeded in 4m52s; exit code 0; one artifact.
- Low-fidelity artifact: task-local `stargazing-decision-flow.html`, 25,638 bytes, SHA-256 `36C47EB5EA889E6DBEE51882A45140F28D4105B6BF9183E00272976F9FB4F661`.
- Low-fidelity verification:
  - exactly one board, three phone frames (`tonight-home`, `stargazing-map`, `spot-detail`), two action connectors and two UX annotations;
  - `百花山观景台` and its time context remain consistent from selected map card to detail;
  - all three 245px phone frames fit inside the measured 1,280px viewport;
  - the board is intentionally static and its CTA-like elements are not development-ready interactions;
  - no Browser console warnings/errors were observed.
- High-fidelity follow-up: the same project was switched to `frontend-design`; the commission preserves the lo-fi file and creates a separate single-shell `index.html` with exactly three interactive states, shared `百花山观景台` and 23:40–02:10 state, real forward/back transitions and no extra surface.
- High-fidelity run: `53fd454f-d88d-46e3-8db6-82b996a820ac`; `codex` / `gpt-5.6-sol`; terminal `failed` after 26m38s with exit code 1 and one artifact. Open Design reported `AGENT_EXECUTION_FAILED`, `timeout` / `inactivity_timeout`, `resumable: true` and `endedWithUnfinishedWork: false` after 600 seconds without new output. Because the inner agent had already emitted its final response/usage and the complete artifact passed outer review, this is recorded as `artifact-ready/provider-failed`, not provider success and not an incomplete design result.
- High-fidelity artifact: task-local `index.html`, 36,562 bytes, SHA-256 `06CBF4CD36F21917E18C5CDE7AF1169E9EF109308555AB2038D96A7C4C546D77`. The lo-fi source retained SHA-256 `36C47EB5EA889E6DBEE51882A45140F28D4105B6BF9183E00272976F9FB4F661` after the follow-up.
- High-fidelity verification:
  - exactly one 390×844 phone shell exposes three screen states rather than three unrelated mockups;
  - the home CTA transitions to map; the selected `百花山观景台` marker/card and 23:40–02:10 window remain visible;
  - opening detail preserves the selected location/window, its route action produces in-artifact feedback, and Back returns to map with the same selection;
  - visible controls measured at least 44px; 25 `data-od-id` hooks were present; no Browser console warnings/errors were observed.
- Comparison: the lo-fi board independently exposes simultaneous topology, connectors and UX annotations; the high-fi artifact independently proves transitions, feedback, control sizing and state retention. Both are justified when both information topology and interaction/visual behavior remain unresolved. Either is redundant when the other already answers the current decision, so this experiment supports a conditional two-step choice rather than a universal low-to-high sequence.

<a id="dra-requirements"></a>
## Requirements

### Skill trigger and input handling

- `REQ-DRA-001` — Trigger only for explicit standalone design-resource planning/generation or an explicit request to use Open Design; ordinary UI implementation and durable authority repair remain with existing workflows/Skills.
- `REQ-DRA-002` — Accept product plans, technical plans, optional Source Plans, specialized visual briefs, screenshots/references and existing design resources without a mandatory input schema.
- `REQ-DRA-003` — Inventory every supplied input and preserve its role as exact target, constraint, inspiration, current implementation evidence or background.
- `REQ-DRA-004` — Treat explicit output or development scope as a hard ceiling independent of background breadth; when scope is partial, include only necessary surrounding context and never expand detailed generation to unaffected page/product areas.
- `REQ-DRA-005` — Ask only for a genuine missing preference that materially changes the provider commission; otherwise use traceable, reversible judgment.
- `REQ-DRA-006` — Accept a raw initial proposal without invoking `source-plan-authoring`; buffer iteration effects task-locally, then after explicit/delegated final selection perform one consolidated idempotent reconciliation of accepted decisions into the proposal. Never edit or regenerate a Source Plan.

### Resource planning

- `REQ-DRA-010` — Derive resource needs from requested scope, existing authority/gaps, uncertainty, platform/interactions, desired downstream use and live Open Design capability.
- `REQ-DRA-011` — Make no artifact globally mandatory and explain every selected, omitted, unavailable or decision-blocked resource.
- `REQ-DRA-012` — Prefer the smallest sufficient resource set. Stop exploration once its requested decision is supported; stop implementation-handoff generation only after every material in-scope UI/UX item is mapped to existing/new Source, is non-applicable/excluded by explicit scope or is honestly decision-blocked/unavailable. The last two unresolved dispositions may produce only a blocked authoring result, never a preflight-ready handoff or fidelity authorization, and no handoff claims downstream authority or acceptance.
- `REQ-DRA-013` — Preserve stable surface/control/state/target keys from input when available and propose task-local stable keys when needed for handoff.
- `REQ-DRA-014` — Keep candidate generation, selection and authority adoption distinct.
- `REQ-DRA-015` — For implementation-facing work, account from surface/flow/page/region composition, layout grid/constraints, stacking and scroll/overflow through relevant component/control anatomy, dimensions/hit area, variants, exact copy/content/formatting/localization, visual treatment, static/dynamic states, focus/selection, interaction/feedback/recovery/motion, responsive/platform/input behavior, accessibility and necessary visual/auditory/haptic assets; require no filler for non-applicable dimensions.
- `REQ-DRA-016` — Subtract existing coverage only when selected Source explicitly specifies or demonstrates the relevant conditions; never infer unseen states, interaction, motion, responsiveness or accessibility from a default/static page frame or a design-system label.
- `REQ-DRA-017` — Treat control-level completeness as coverage rather than artifact count: map repeated controls to selected shared component variants, group related states/families and commission dedicated resources only for unique or complex uncovered material meaning. Permit one addressable, inspectable artifact to cover many items.
- `REQ-DRA-018` — Keep user-visible interaction semantics and product-rule presentation in design coverage while preserving business, data, permission and algorithmic rule ownership in product/technical Source; never invent those rules or make visuals their sole authority.
- `REQ-DRA-019` — Keep exploration/candidate coverage task-local and intent-sized with no required file. For a selected implementation handoff only, emit one strict project-native `design-resource-handoff-v1` Markdown Source; it is an input adapter, never a pack, persistent registry, workflow readiness state, Design Authority or acceptance result.

### Provider execution

- `REQ-DRA-020` — Discover current Open Design agents/models/capabilities at runtime rather than copying prompts or hardcoding stale catalogue/model values.
- `REQ-DRA-021` — Prefer structured MCP execution and retrieval, with CLI/daemon and UI-only fallbacks that preserve the same commission semantics.
- `REQ-DRA-022` — Support the Open Design daemon using Codex CLI as its configured inner agent without treating the nested process as recursive Skill execution.
- `REQ-DRA-023` — Keep generated Open Design projects/runs/artifacts task-local until the user requests a handoff or selects a candidate.
- `REQ-DRA-024` — Bound run polling, report provider progress during long runs, keep terminal execution state separate from artifact readiness, label complete output from a nonterminal run `artifact-ready/run-unreconciled` and transition it to `artifact-ready/provider-failed` if the provider later fails, retry only when the promised resource remains incomplete/corrupt or the user requests it, support user-authorized cancellation where available and never hide a provider failure behind a generated placeholder.
- `REQ-DRA-025` — Treat Figma, image, video, 3D/WebGL and other specialized routes as conditional capabilities with their own setup/export checks.
- `REQ-DRA-026` — Treat persistent MCP/plugin installation, authentication and new disclosure paths as explicit setup actions; generation permission does not silently authorize global host configuration changes.
- `REQ-DRA-027` — Distinguish functional-skill and rendering-template discovery; never vendor a fallback template catalogue, and surface degraded discovery when the provider cannot enumerate a relevant registry.
- `REQ-DRA-028` — Resolve and retrieve the actual entry path explicitly, then preserve run/project/capability/design-system provenance plus an immutable content hash or snapshot before later iterations.
- `REQ-DRA-029` — Keep provider self-check, outer artifact sanity review and downstream product verification distinct; require only the layer promised by the current intent.

### Output and downstream handoff

- `REQ-DRA-030` — In exploration intent, show the requested result with only minimal sanity review and no unsolicited packaging/validator sequence.
- `REQ-DRA-031` — In a selected implementation handoff, return project-native resources plus one strict marked Markdown handoff at any repository path; no fixed Tiny Context directory or provider-specific pack is required. Exploration remains schema-free.
- `REQ-DRA-032` — For selected-source preparation, preserve immutable identity or a content snapshot/hash and selection basis, while leaving actual Context/`DESIGN.md`/Contract adoption downstream.
- `REQ-DRA-033` — Never claim that Open Design tool success proves product quality, production fidelity, accessibility, native behavior or acceptance beyond the inspected artifact.
- `REQ-DRA-034` — Never update Context, `DESIGN.md`, production code or a Delivery Contract unless the user separately enters and authorizes the consuming workflow.
- `REQ-DRA-035` — In a handoff, identify the explicit output/development scope, necessary surrounding context and exclusions; identify every resource by stable surface/flow/region/component/control keys, candidate/constraint/selected classification, declared viewport/mode/state/content/interaction/motion/accessibility coverage, source locator/hash, selection basis if any, unresolved decisions and forbidden inferences. For an implementation handoff, map every material in-scope condition to existing/generated Source or an explicit non-applicable/excluded/unresolved disposition.
- `REQ-DRA-036` — If the user explicitly selects a candidate and asks to prepare it for team/development use, export or snapshot it to a user-approved durable location; do not rely on Open Design's mutable project preview URL.
- `REQ-DRA-037` — Keep candidate iterations/interim observations task-local and never continuously rewrite the proposal. After final selection, consolidate accepted/rejected/unresolved implications once, write only accepted changes into an authorized writable proposal (or return the complete revised conversation-only proposal), preserve original meaning/provenance and make reruns idempotent.
- `REQ-DRA-038` — Close every applicable stable in-scope subject × target × condition across `surface_flow`, `visual_content`, `component_control`, `state_interaction`, `motion`, `adaptation_input`, `accessibility` and `assets`; each cell has exactly one covered/non-applicable/excluded/unresolved disposition, and unresolved/unavailable cells prevent a ready handoff.
- `REQ-DRA-039` — Resolve every scope surface to an unambiguous surface subject, declare each subject's applicable target set and forbid duplicate stable-key ownership. For every covered cell, bind the selected target/condition, immutable addressable evidence, real marked requirement/control/acceptance Source Items and dimension-appropriate project verification methods. Reject static-frame substitution for unseen state/interaction/motion/adaptation/accessibility and keep resource integrity distinct from implementation conformance.

### Design-system authority and binding

- `REQ-DSA-001` — Install `design-system-authoring` in the base managed set with `allow_implicit_invocation: false`; run only from explicit user intent.
- `REQ-DSA-002` — Prefer live Open Design MCP for discovery/read/binding and feature-detect lifecycle tools; while creation is absent, use only the official same-daemon generation/revision/accept API.
- `REQ-DSA-003` — Require explicit human selection or explicit delegated selection before adoption; generation/job success alone never selects or adopts.
- `REQ-DSA-004` — Adopt one selected system into canonical root `DESIGN.md`, one authored exact-value token source/generation direction and only owning Context; record provider ID/version/revision/digest as non-authoritative provenance.
- `REQ-DSA-005` — For style-bearing resource work, require configured authority, read the matching MCP design-system resource, pass its ID through `create_project.designSystem` and verify `get_project.designSystemId`; stop and route to explicit system authoring on absence/mismatch.
- `REQ-DSA-006` — Do not gate low-fidelity hierarchy, IA/flow topology, semantics-only state/behavior studies or explicitly non-fidelity prototypes.

### Distribution and verification planning

- `REQ-DRA-040` — Keep one authored Skill source and synchronized workspace/package-managed copies under existing source-sync rules.
- `REQ-DRA-041` — Update the product specification, public English/Chinese guidance, Skill routing and affected-test selection to reflect the new optional orchestration capability without weakening the existing consumption boundary.
- `REQ-DRA-042` — Add static contract tests, mock-provider behavior tests and opt-in live Open Design smoke tests; the normal package suite must not depend on a running desktop app, paid provider, login or nondeterministic design quality.
- `REQ-DRA-043` — Test scope ceilings, no-mutation boundaries, capability fallback, candidate-versus-selected semantics, timeout/cancel/recovery and downstream handoff fields.
- `REQ-DRA-044` — Expose one provider-neutral `ty-context design-resource preflight` parser/validator to both workflows; reject unknown fields, duplicate/incomplete coverage, unsupported evidence, path escape, missing/stale resources and unresolved handoffs.
- `REQ-DRA-045` — Long-Task Preflight/Compile requires each Contract `design_target` to match exactly one validated handoff target, freezes the handoff/resources as inputs, maps every covered Source Item through `source_claims`, maps every declared verification method to an independent positive Assertion carrying relevant Claims and required typed evidence, and binds every acceptance blocker with exact Source-item/method provenance.
- `REQ-DRA-046` — The default Workflow reruns the same preflight before UI Authority Closure, opens every selected exact/constraint resource, routes covered Source Items/verification methods through production owners and real-entry checks, and reports only declared combinations.
- `REQ-DRA-047` — For every selected implementation Web/App target, require a declared `implementation_web` or `implementation_app` source profile with one machine-readable canonical entry, an exact dependency-resource set, `acquisition: complete`, repository containment and immutable hashes. A PNG may supplement but cannot be the canonical implementation source.
- `REQ-DRA-048` — Require typed provider-neutral locators and resolve them against their exact declared resource during preflight. Support only bounded HTML selectors, Markdown anchors, JSON Pointers, CSS selectors/custom properties and explicit whole-resource addressing; reject missing, unsupported or media-incompatible locators.
- `REQ-DRA-049` — Validate source dependency closure. For Web entries, reject local HTML/CSS/JS dependencies absent from the target profile and reject unsafe paths; never call provider generation success, a file list or a completeness declaration sufficient on its own.
- `REQ-DRA-050` — Keep `design-resource-handoff-v1` as the residual handoff: reference canonical addressable facts, close every applicable subject/target/condition/eight-dimension cell, and retain scope, product semantics, missing/not-applicable distinctions, unresolved items, blockers, Source Items and project verification methods without becoming a second numeric/style source.
- `REQ-DRA-051` — Preserve the shared authority chain from immutable source profile and residual handoff through Context-reachable targets, blocker provenance, production owners and attributable project checks; for Long-Task, additionally preserve the exact Source Claims, Controls/`surface_bindings`, method-specific Assertions and independently failing `design_conformance`, interaction and target-runtime evidence through Final Gate. Input success/integrity cannot substitute for production conformance on either route.
- `REQ-DRA-052` — Keep design-purpose/design-thinking/mechanism-rationale documentation and Context information-complete and causally rigorous across problem/purpose, inputs/transformation, authority/ownership, downstream consumption/proof, fail-closed limits, costs/alternatives and indexed surfaces.
- `REQ-DRA-053` — Keep Figma, Penpot and OpenPencil as optional upstream/sidecar choices selected only for a distinct collaboration, self-hosting or static-editing benefit; record concise current cost/capability/representation tradeoffs and add no default conversion, provider-specific schema, pack, registry, Authority, Claim kind, Gate or acceptance lifecycle.
- `REQ-DRA-054` — Define selected-design Source authority once as a shared conditional obligation activated only by a selected implementation handoff; default Contract Conformance and Long-Task Final Gate remain mutually exclusive downstream proof carriers with different formal strength.
- `REQ-DRA-055` — Default Workflow opens every affected selected target/constraint and declared condition, routes material requirements to the production owner and cold-start journey, runs applicable attributable current-candidate project checks and reports every unchecked, unresolved or unsupported condition. It creates no exact ephemeral Fact/method ledger and makes no complete-machine-closure claim.
- `REQ-DRA-056` — Add deterministic Design Source Projection for all eight dimensions: place durable Surface/Screen/Control/state and visual-system meaning in existing Context/`DESIGN.md` owners, exact resource facts in immutable targets, repeatable checks in verification Context and delivery-local provenance/coverage/blockers/proof bindings outside durable Context.
- `REQ-DRA-057` — Require exactly one canonical adoption record per selected target. `DESIGN.md` owns project/system/component-family records; the owning Screen Contract owns one-screen/interaction-specific records. Other layers keep stable-key canonical-owner/anchor pointers and local applicability only.
- `REQ-DRA-058` — Keep the shared obligation, carrier exclusivity, projection and canonical ownership aligned across owning Context, product specification, managed/generated/package AGENTS/Skills/templates, public English/Chinese/package docs and deterministic tests without changing Long-Task schema/runtime.
- `REQ-DRA-059` — Add an optional fixed fresh-agent UI/UX recovery/conformance benchmark with fixture, task, routing gold and hidden oracle. Static tests may prove its structure, but only fixed independent paired Agent runs may support effectiveness or ROI conclusions.
- `REQ-DRA-060` — Preserve positive ROI: activate default accounting only for selected handoffs, keep it task-local, compact the shared startup router, route detail on demand and add no plan/matrix/ledger, Claim set, readiness state, validator, doctor gate or second acceptance Gate.
- `REQ-DRA-061` — Treat default-Context byte budgets as advisory attention-cost telemetry only. Required readable recovery facts take precedence, and neither validation nor source release tests may turn an absolute byte heuristic into an acceptance gate; deterministic selection, duplicate/path safety and warning behavior remain tested.
- `REQ-DRA-062` — Audit every post-introduction default-set contraction against its replacement/current semantic owner and mechanism tests, remove residual budget-driven release enforcement or misleading optimization pressure, and state separately what repository evidence supports versus what Git history cannot prove.

<a id="dra-handoff-contract"></a>
## Output And Downstream Handoff Contract

The Skill returns ordinary Source, not a new package authority. A simple exploration response may contain only the preview, scope and obvious limitations. After final selection for implementation, it emits one repository-local Markdown Source with readable `ty-source-item` facts and exactly one fenced `design-resource-handoff-v1` YAML block. The file may live at any user-approved project path; its strict shape is shared by both development workflows and is not a provider-specific pack.

```yaml
schema_version: design-resource-handoff-v1
intent: implementation_handoff
scope:
  key: tonight-home
  style_dependency: style-bearing
  surface_keys: [surface.tonight-home]
  necessary_context: []
  exclusions: [other application surfaces]
provenance:
  provider: open-design
  provider_version: 0.15.1
  project: tc-dra-page-20260722
  run: 179d96ac-95e4-4f09-b6e5-ca58e8549c60
  capability: mobile-app
  agent: codex
  model: gpt-5.6-sol
  design_system_id: user:design-md
resources:
  - key: resource.tonight-home
    role: exact_target
    path: design/tonight-home/index.html
    media_type: text/html
    sha256: 559231d400000000000000000000000000000000000000000000000000000000
    editable_upstream:
      owner: design-team
      locator: od://projects/tc-dra-page-20260722
      update_route: create a new accepted immutable export
  - key: resource.tonight-tokens
    role: constraint
    path: design/tonight-home/tokens.css
    media_type: text/css
    sha256: 669231d400000000000000000000000000000000000000000000000000000000
    editable_upstream:
      owner: design-team
      locator: od://projects/tc-dra-page-20260722
      update_route: create a new accepted immutable export
conditions:
  - key: mobile-night-default
    platform: mobile-web
    viewport: { width: 390, height: 844, unit: px }
    modes: [night]
    states: [default, conditions-expanded, cta-progress, cta-ready]
    content_cases: [nominal]
    input_methods: [touch, keyboard]
    motion: full
subjects:
  - key: component-family.tonight-decision
    kind: component_family
    stable_keys: [control.recommended-spots-cta, control.conditions-disclosure]
    target_refs: [tonight-home-night]
targets:
  - key: tonight-home-night
    interpretation: exact_target
    resource_refs: [resource.tonight-home, resource.tonight-tokens]
    condition_refs: [mobile-night-default]
    selection_basis: explicit user selection
    source_profile:
      kind: implementation_web
      entry_resource_ref: resource.tonight-home
      dependency_resource_refs: [resource.tonight-tokens]
      acquisition: complete
evidence:
  - key: evidence.tonight-prototype
    resource_ref: resource.tonight-home
    kind: prototype_transition
    locator:
      kind: html_selector
      value: "[data-state='conditions-expanded']"
    condition_refs: [mobile-night-default]
coverage:
  - key: coverage.tonight.state
    subject_refs: [component-family.tonight-decision]
    dimension: state_interaction
    disposition: covered
    target_refs: [tonight-home-night]
    condition_refs: [mobile-night-default]
    evidence_refs: [evidence.tonight-prototype]
    source_item_refs: [design-tonight-state-interaction]
    verification_methods: [component_state, interaction_trace]
    rationale: all declared states and transitions are inspectable
acceptance_blockers: []
proposal:
  reconciliation_status: applied
  path: proposal.md
  revision: selected-tonight-home-v1
```

The exact V1 field contract is owned by the package parser and the Design Resource Handoff Adapter Context. Unknown fields fail rather than being ignored. The abbreviated example shows one of the eight required cells for one subject/target/condition tuple; a valid handoff closes all eight for every applicable tuple. One resource may own several entries and repeated controls may map to one component-family subject. A static/default frame carries only the conditions it actually shows.

### Initial-draft exploration loop

1. A raw initial proposal and mixed inputs may be used directly; no Source Plan is generated as a side effect.
2. Candidate iterations remain task-local and do not continuously rewrite the proposal.
3. After explicit/delegated final selection, the Skill consolidates accepted, rejected and unresolved choices plus affected keys exactly once.
4. The Skill applies only accepted changes to an authorized writable initial proposal, or returns one complete revised proposal for conversation-only input. Reruns update rather than duplicate the decision/reference.
5. The revised proposal and selected immutable resources go directly to the default native Goal or enter `long-task-workflow`'s Source-bound Contract Draft loop immediately; Source completeness and Contract mapping converge there while preserving rich meaning.

### Default Workflow Contract consumption

1. The user brings the selected resources, reconciled proposal and strict handoff while authorizing a concrete development request.
2. Default Workflow runs `ty-context design-resource preflight <handoff.md>`; any unresolved dimension, unsupported evidence or stale identity stops fidelity work.
3. It opens the indexed exact/constraint resources, performs UI Authority Closure against product/surface Context and `DESIGN.md`, confirms selection/coverage and decides `Context Delta`.
4. It opens every affected selected target or constraint and its declared conditions, routes material Source requirements to the real production owner and cold-start journey, and runs attributable project checks after the last relevant change. Implementation inspects the first runnable real-entry slice when useful; final-current-candidate Contract Conformance reports checked, unchecked and unresolved scope without reconstructing the complete Fact-by-method ledger. Missing or conflicting authority, stale or failed evidence, and unsupported observations block an unqualified claim. Candidate previews and Open Design run success cannot authorize fidelity.

### Long-Task Workflow consumption

1. The revised proposal, selected immutable resources and strict handoff are ordinary upstream Source to integrated Source/Contract authoring; a legacy Source Plan is also accepted if supplied.
2. Long-Task Preflight/Compile reruns the shared adapter; the marked handoff belongs to `task.source_paths`, and handoff plus resource snapshots belong to the target Check's `verification_inputs`.
3. Each Contract `design_target` must exactly match one handoff target's interpretation, condition set and frozen handoff/resource paths. Covered Source Items map through `source_claims`; the exact method set maps to independent non-root positive Assertions with relevant Claims and method-appropriate evidence capabilities; declared blockers carry exact Source-item/method lineage into the owning `surface_binding`.
4. Existing Product `surface_bindings`, Claims, Bindings, Checks, typed evidence, revision and Final Gate are the sole Long-Task carrier. The default task-local selected-design closure is not run before or after it. If a selected target changes, normal Source/Authority revision applies; an Open Design rerun alone never mutates authority.

### Context and `DESIGN.md` boundary

- Candidate exploration changes neither Context nor `DESIGN.md`.
- A user-selected visual target may remain versioned authored design Source. Design Source Projection places durable surface/flow/Screen/Control/state semantics in existing Product Surface or Screen/interaction Context, durable visual-system/token/motion-policy/rationale semantics in `DESIGN.md`, repeatable proof routes in verification Context and exact target facts in the target itself; delivery-local provenance, applicability, blockers and proof bindings do not become Context by default.
- Every adopted target has exactly one canonical record. `DESIGN.md` owns project/system/component-family targets; the owning Screen Contract owns one-screen/interaction-specific targets. Other layers keep only the stable key, canonical owner/anchor and local applicability.
- Screenshots, diffs, provider logs, prompt caches, raw run events, mutable preview URLs and generated review receipts do not become Context.
- If generation reveals a product/surface decision that the user has not made, record it as unresolved Source rather than silently resolving it in visuals.

<a id="dra-non-goals"></a>
## Non-Goals

- `NCOMP-DRA-001` — Do not vendor, fork or paraphrase Open Design's internal prompts/templates into the Tiny Context Skill.
- `NCOMP-DRA-002` — Do not make prototype, wireframe, high-fidelity output, Figma, three variants, a design system, a component board or any directory/pack universally required.
- `NCOMP-DRA-003` — Do not create a second Design Authority, Context role, Contract, Gate, artifact registry, provider state machine or acceptance lifecycle.
- `NCOMP-DRA-004` — Do not have generated candidates select or approve themselves.
- `NCOMP-DRA-005` — Do not modify production UI, project Context or `DESIGN.md` during standalone generation.
- `NCOMP-DRA-006` — Do not equate a rendered image with an interactive prototype or claim unsupported platform/state/accessibility coverage.
- `NCOMP-DRA-007` — Do not require the user to reduce a rich input set merely because the requested output is small.
- `NCOMP-DRA-008` — This Source Plan alone does not authorize implementation or publication; either requires a separate explicit delivery request and the normal package-authoring workflow.
- `NCOMP-DRA-009` — Do not invoke `source-plan-authoring`, continuously rewrite an initial proposal during iteration or write rejected/unresolved candidate meaning as accepted product change.
- `NCOMP-DRA-010` — Do not expand a partial development request into detailed design for the rest of its page, flow or product merely because broader background is available.
- `NCOMP-DRA-011` — Do not require one design file per control, but also do not treat a page prototype, design-system label or static/default view as coverage for conditions it does not specify or demonstrate.
- `NCOMP-DRA-012` — Do not invent business/data/permission/algorithmic rules or make a visual resource their sole owner; designs may only carry the user-visible presentation and interaction consequences of owning Source.

<a id="dra-outcomes"></a>
## Implementation Outcomes And Dependencies

### `OUT-DRA-01` — Capability-aware commissioning contract

- Result: the Skill trigger, input inventory, explicit output/development scope ceiling, necessary-context boundary, material control-level UI/UX coverage, selected-source subtraction, shared-versus-dedicated resource selection and disposition logic are documented and tested.
- Depends on: none.

### `OUT-DRA-02` — Open Design adapter and recovery path

- Result: structured capability discovery, functional-skill/rendering-template distinction, project/run/artifact orchestration, explicit entry/hash capture and bounded fallbacks work without copied prompts.
- Depends on: `OUT-DRA-01`.

### `OUT-DRA-03` — Intent-proportional review and handoff

- Result: exploration stops after a preview; a ready implementation handoff preserves scope/source/provenance/coverage and leaves no silent material in-scope design invention, while unresolved meaning remains an explicit blocked authoring result; selected-source preparation remains separate from adoption.
- Depends on: `OUT-DRA-01`, `OUT-DRA-02`.

### `OUT-DRA-04` — Tiny Context routing and package integration

- Result: the explicit `design-resource-authoring` Skill is installed as a default package-managed capability while current Source Plan, Product Design, UI/UX authority, default Workflow and Long-Task responsibilities remain non-overlapping and discoverable.
- Depends on: `OUT-DRA-01`, `OUT-DRA-03`.

### `OUT-DRA-05` — Deterministic regression and optional live confidence

- Result: repository tests prove Skill/package semantics without making normal CI depend on Open Design; separately enabled live smoke tests prove the installed provider path.
- Depends on: `OUT-DRA-02`, `OUT-DRA-03`, `OUT-DRA-04`.

<a id="dra-implementation-blueprint"></a>
## Implementation Blueprint

### Authoritative files and distribution

The authoring source is `.codex/ty-context-managed/skills/design-resource-authoring/**`, not the generated `.codex/skills/**` copy. `package sync-source` copies it into `packages/ty-context/assets/skills/design-resource-authoring/**`; the workspace/profile sync then materializes `.codex/skills/design-resource-authoring/**` and consumer harness-root equivalents.

Proposed authored tree:

```text
.codex/ty-context-managed/skills/design-resource-authoring/
├── SKILL.md
└── references/
    ├── resource-selection.md
    ├── open-design-provider.md
    └── downstream-handoff.md
```

- `SKILL.md`: narrow triggers, input inventory, scope ceiling, intent mode, core decision/execution loop and hard boundaries.
- `resource-selection.md`: explicit output/development ceiling, material surface/flow/region/component/control condition model, selected-source subtraction, shared-versus-dedicated dynamic gap-to-resource heuristics, dispositions, intent-specific stop rules and commission envelope; no fixed artifact sequence.
- `open-design-provider.md`: capability discovery, MCP/daemon/UI recovery, polling, entry resolution, implementation-level output/dependency acquisition, hashing and optional specialist-provider checks; no copied provider templates.
- `downstream-handoff.md`: candidate/selection/authority separation plus canonical-versus-residual ownership, workflow-independent development scope, necessary-context, applicability, typed locator, stable-key coverage, provenance and downstream proof fields; default/Long-Task are consumers rather than design-purpose owners.

The shared selected-implementation adapter is package code rather than a provider helper:

```text
packages/ty-context/src/
├── commands/design-resource.ts
└── lib/
    ├── design-resource-handoff-types.ts
    ├── design-resource-handoff-shape.ts
    ├── design-resource-handoff-shape-primitives.ts
    ├── design-resource-handoff-shape-structure.ts
    ├── design-resource-handoff-shape-evidence.ts
    ├── design-resource-handoff-parser.ts
    ├── design-resource-handoff-policy.ts
    ├── design-resource-handoff-file-validation.ts
    ├── design-resource-handoff-validation.ts
    ├── design-resource-handoff-validation-primitives.ts
    ├── design-resource-handoff-validation-structure.ts
    ├── design-resource-handoff-validation-coverage.ts
    └── long-task-design-resource-handoff.ts
```

The parser/shape/policy/file/validation modules and CLI own one strict provider-neutral parser plus source-profile/dependency, locator-addressability, semantic/evidence, applicable-cell and repository-integrity preflight. The Long-Task bridge calls that same preflight during shared activation validation, then binds targets, frozen files, Source Claims, per-method Assertions and blocker provenance through existing Contract structures. The default Workflow invokes the CLI and consumes the same returned meaning through guidance; it gains no validator-owned lifecycle.

Do not add a provider script merely to restate instructions. Add a small protocol helper only if implementation proves that platform-exposed MCP calls cannot safely perform the current template-discovery/explicit-entry compatibility path. Any provider helper must normalize metadata and transport only; it must not contain design prompts, a template catalogue or an authority registry. The package handoff adapter is independently justified because it intercepts silent semantic loss between authoring and both consumers.

Because narrow one-control/one-screen exploration is useful outside Long-Task, add `design-resource-authoring` to the base set returned by `enabledManagedSkillNames`; do not require the `long-task` profile. Its front matter remains explicit enough that ordinary UI implementation does not trigger provider generation.

### Phase `IMP-DRA-01` — Skill contract and routing

- Author `SKILL.md` and three references from `REQ-DRA-001` through `REQ-DRA-019`.
- Add precise English and Chinese explicit triggers such as “generate design resources,” “author design resources,” “prepare design resources for this development scope,” “use Open Design,” “生成设计资源”, “为开发准备设计资源” and “使用 Open Design”; exclude generic `design`, `UI`, `prototype` and ordinary implementation without an explicit resource request.
- Cross-link, without duplicating logic, from `source-plan-authoring`, `context_uiux_design` and `long-task-workflow` only where routing ambiguity exists.
- Update stable product rationale in `PROJECT_SPEC.md` and durable package-capability ownership in the appropriate `project_context/**` owner when implementation begins.

### Phase `IMP-DRA-02` — Provider capability and execution path

- Implement instructions/tool routing for MCP `list_agents`, `list_skills`, `list_plugins`, design-system resources, `create_project`, `start_run`, `get_run`, `cancel_run`, `list_files` and `get_artifact`.
- Feature-detect a future `list_design_templates`; otherwise use the bounded compatibility order in `FIND-DRA-004`.
- Recommend or contribute the minimal upstream Open Design MCP addition rather than vendoring catalogue data.
- Make persistent MCP installation and Figma/plugin authentication explicit setup actions.
- Enforce explicit entry lookup and immutable snapshot/hash capture before handoff.

### Phase `IMP-DRA-03` — Intent-proportional review and handoff

- Exploration: render/open, verify scope count and obvious corruption, show result, stop.
- Handoff: add relevant DOM/interaction/console checks and compact provenance/coverage.
- Implementation handoff: preserve the explicit development ceiling and necessary context/exclusions, map every material in-scope item to existing/generated Source or an honest disposition, reuse component families, add dedicated unique/complex-control resources only when needed and stop only when no silent material design invention remains.
- Selected-source preparation: require real selection basis, then export/snapshot to an approved durable location and return the locator/hash; make no Context/code/Contract edits.
- Keep outer visual checking outside the nested Open Design run unless the live provider advertises a reliable equivalent.

### Phase `IMP-DRA-03A` — Shared implementation-input adapter

- Parse exactly one fenced `design-resource-handoff-v1` block from ordinary marked Markdown Source with strict unknown-field rejection.
- Validate repository containment/digests, unique/reachable keys, exact subject-by-eight-dimension closure, disposition semantics, evidence/method compatibility and Source Item references.
- Expose `ty-context design-resource preflight <handoff.md> [--json]` and make `design-resource-authoring` require a passing result before reporting a ready handoff.
- Invoke the same validator from Long-Task activation and require exact target interpretation/condition/frozen-file equality, covered Source Claim/root Assertion reachability and blocker binding.
- Keep exploration, Design Authority, default-workflow lifecycle and final production acceptance outside the adapter.

### Phase `IMP-DRA-04` — Package/public surfaces and migration

- Add the Skill to base managed-skill selection and source/package/release inventories.
- Update `README.md`, `README.zh-CN.md`, `packages/ty-context/README.md` and generated/public guidance with an English-complete explanation of optional Open Design orchestration and its no-authority/no-provider-dependency guarantee.
- Remove the former deleted-Skill tombstone expectation only where tests currently assert `design-resource-authoring` is absent; do not reintroduce the old Resource Pack behavior.
- Treat the reintroduced name as a new thin commissioner. No migration should resurrect stale prior Skill files, packs or generated resources; normal sync overwrites package-managed copies from the new source.

### Phase `IMP-DRA-05` — Verification and release readiness

- Add deterministic static/behavioral tests described below.
- Build, run focused tests, run `package sync-source` twice to prove convergence, `package check-source`, workspace/profile sync, Context/Harness validation, affected tests, package regression, tarball smoke and `git diff --check`.
- Keep live provider smoke opt-in and non-gating for normal package CI.

<a id="dra-acceptance"></a>
## Acceptance Scenarios

- `AC-DRA-001` — Given a long product/technical plan and an explicit “one control only” request, the Skill commissions at most one control-scoped resource and explains why no page/flow resources were generated. Accepts `REQ-DRA-002`, `REQ-DRA-004`, `REQ-DRA-010` through `REQ-DRA-012`.
- `AC-DRA-002` — Given a one-screen visual exploration request, the Skill generates only that candidate, shows it after a minimal sanity check and performs no Context/code/pack mutation. Accepts `REQ-DRA-004`, `REQ-DRA-030`, `REQ-DRA-034`.
- `AC-DRA-003` — Given a new interaction-rich three-screen flow and insufficient existing authority, the Skill can select both a flow wireframe and high-fidelity prototype only when each resolves an independent gap, otherwise it omits the redundant resource with reasons. Accepts `REQ-DRA-010` through `REQ-DRA-012`.
- `AC-DRA-004` — Given sufficient selected exact design authority for a local style fix, the Skill selects no new design resource and routes the request back to the ordinary implementation path. Accepts `REQ-DRA-001`, `REQ-DRA-011`, `NCOMP-DRA-002`.
- `AC-DRA-005` — Given Open Design with Codex CLI configured, structured commissioning starts an inner Open Design run and retrieves its status/output without the outer Skill copying the Open Design prompt or hardcoding a model. Accepts `REQ-DRA-020` through `REQ-DRA-022`, `NCOMP-DRA-001`.
- `AC-DRA-006` — Given MCP is unavailable in the current host but the local daemon/CLI is usable, the Skill uses the bounded fallback and preserves the same commission and provenance. Accepts `REQ-DRA-021`, `REQ-DRA-024`.
- `AC-DRA-007` — Given a catalogued but uninstalled Figma capability, the Skill reports it unavailable or optional and does not pretend a Figma handoff succeeded. Accepts `REQ-DRA-020`, `REQ-DRA-025`, `REQ-DRA-033`.
- `AC-DRA-008` — Given a generated candidate, the result remains ordinary Source until an explicit selection basis exists and the downstream workflow adopts it. Accepts `REQ-DRA-014`, `REQ-DRA-032` through `REQ-DRA-034`.
- `AC-DRA-009` — Given a handoff request, the downstream workflow can identify the surface/control keys, resource classification, conditions, provenance, stable locator/snapshot and known gaps without a mandatory proprietary pack. Accepts `REQ-DRA-013`, `REQ-DRA-031`, `REQ-DRA-032`.
- `AC-DRA-010` — Given normal package CI with no Open Design installation, deterministic mock/static tests pass and live provider tests are skipped explicitly rather than failing or fabricating evidence. Accepts `REQ-DRA-040` through `REQ-DRA-043`.
- `AC-DRA-011` — Given current Open Design MCP where functional skills are enumerable but rendering templates are not, the Skill detects the gap, uses the declared compatibility order and never falls back to a copied catalogue. Accepts `REQ-DRA-020`, `REQ-DRA-027`, `FIND-DRA-003`, `FIND-DRA-004`.
- `AC-DRA-012` — Given a succeeded run whose project lacks `metadata.entryFile`, the Skill lists files, retrieves the intended artifact with explicit entry and records its hash; a later project iteration cannot silently change the handed-off identity. Accepts `REQ-DRA-028`, `REQ-DRA-036`, `FIND-DRA-005`.
- `AC-DRA-013` — Given an exploration request, the nested provider cannot run its own browser verification, but the artifact renders and its requested scope is intact; the outer Skill performs only the promised sanity check and does not launch a validation pack. Accepts `REQ-DRA-029`, `REQ-DRA-030`, `FIND-DRA-007`.
- `AC-DRA-014` — Given an explicit Figma deliverable request with only catalogue pointers or missing connector/auth, the Skill reports exact setup/unavailability and offers a non-Figma resource only if it preserves intent; it never labels HTML or a manifest record as an editable Figma design. Accepts `REQ-DRA-025`, `REQ-DRA-026`, `REQ-DRA-033`.
- `AC-DRA-015` — Given a provider run that emitted a final message and complete retrievable artifact but remains nonterminal, the Skill may show it with its hash and `artifact-ready/run-unreconciled` qualifier. If the provider later terminates with a post-artifact timeout, the result becomes `artifact-ready/provider-failed`, retains the exact failure and run locator, claims neither provider success nor product acceptance and is not automatically retried or discarded. Accepts `REQ-DRA-024`, `REQ-DRA-028`, `REQ-DRA-033`, `FIND-DRA-008`.
- `AC-DRA-016` — Given only an initial proposal, the Skill iterates bounded candidates without creating a Source Plan or continuously rewriting. After explicit/delegated final selection it consolidates once, updates only accepted decisions idempotently and hands the revised proposal plus selected immutable resources directly to the default Goal or `long-task-workflow`. Accepts `REQ-DRA-002`, `REQ-DRA-006`, `REQ-DRA-014`, `REQ-DRA-037`, `NCOMP-DRA-009`.
- `AC-DSA-001` — Given an unconfigured project and a style-bearing resource request, resource authoring creates no project/run, emits the exact explicit `$design-system-authoring` route and does not auto-invoke it. Given a low-fidelity flow request, it proceeds without the style gate. Accepts `REQ-DSA-001`, `REQ-DSA-005`, `REQ-DSA-006`.
- `AC-DSA-002` — Given Open Design 0.15.1, system authoring reads MCP resources, observes no lifecycle tool, starts/polls the official daemon generation job, reviews/revises a candidate and accepts only the explicitly selected revision. Accepts `REQ-DSA-002`, `REQ-DSA-003`.
- `AC-DSA-003` — Given a selected system, adoption writes canonical `DESIGN.md`/one token direction/owning Context, records provider provenance and verifies an MCP project reports the matching `designSystemId`; no provider record becomes authority. Accepts `REQ-DSA-004`, `REQ-DSA-005`.
- `AC-DRA-017` — Given a large application plan but development scope limited to one local panel, the Skill may include the minimum surrounding page context needed to place the panel, but commissions detailed layout/control/state/interaction resources only for that panel and its affected conditions. Accepts `REQ-DRA-004`, `REQ-DRA-010`, `REQ-DRA-015`, `NCOMP-DRA-010`.
- `AC-DRA-018` — Given a selected page prototype and design system that show ordinary controls only in default state while a development handoff includes unique multi-state controls, the Skill maps ordinary controls to shared component variants, does not commission one file per instance, and selects grouped component-state or dedicated unique/complex-control studies for uncovered variants, feedback, motion, responsive or accessibility conditions. Accepts `REQ-DRA-012`, `REQ-DRA-015` through `REQ-DRA-017`, `NCOMP-DRA-011`.
- `AC-DRA-019` — Given one large addressable interactive artifact whose sections and reachable states explicitly cover every material item inside the development scope, the Skill accepts that one artifact as the smallest sufficient set and generates no duplicate control boards. Given only a static/default frame, it does not infer unseen dynamic coverage. Accepts `REQ-DRA-011`, `REQ-DRA-012`, `REQ-DRA-016`, `REQ-DRA-017`.
- `AC-DRA-020` — Given product/technical Source that defines a permission, data or algorithmic rule, the design commission references that rule and shows its user-visible states/feedback without inventing or making the visual artifact the rule's sole authority. Accepts `REQ-DRA-018`, `NCOMP-DRA-012`.
- `AC-DRA-021` — Given implementation-handoff generation, every material in-scope subject closes all eight dimensions separately for each applicable target and condition with covered/not-applicable/excluded/decision-required/unavailable meaning. Any decision-required/unavailable cell remains an explicit blocked authoring result and shared preflight refuses ready status; the Skill claims neither Design Authority nor product acceptance. Accepts `REQ-DRA-012`, `REQ-DRA-019`, `REQ-DRA-031`, `REQ-DRA-035`, `REQ-DRA-038`.
- `AC-DRA-022` — Given one complete marked implementation handoff, both the standalone CLI and Long-Task activation accept the same source profiles, targets, conditions, resources and coverage. Removing or duplicating a cell, crossing a target/condition boundary, substituting static media for machine-readable/motion/accessibility evidence, mutating a resource digest or adding an unknown field fails closed. Accepts `REQ-DRA-038`, `REQ-DRA-039`, `REQ-DRA-044`.
- `AC-DRA-023` — Given a valid handoff and a Long-Task Contract, Compile fails unless each design target exactly matches the handoff interpretation/conditions/frozen files, every covered Source Item becomes a Claim, every verification method binds to an independent positive Assertion carrying relevant Claims and required capabilities, and every handoff blocker preserves Source-item/method provenance in the owning surface. Accepts `REQ-DRA-045`.
- `AC-DRA-024` — Given the same valid handoff under the default Workflow, shared preflight runs before UI Authority Closure, every exact/constraint resource is opened, and declared Source Items/methods are routed to real-entry production checks; handoff integrity alone is never reported as implementation conformance. Accepts `REQ-DRA-046`.
- `AC-DRA-025` — Given a selected implementation Web/App source, authoring freezes one machine-readable canonical entry plus its exact dependency set, declares complete acquisition and hashes every file. Removing a dependency, adding an undeclared local import or substituting a PNG as canonical fails preflight. Accepts `REQ-DRA-047`, `REQ-DRA-049`.
- `AC-DRA-026` — Given HTML, Markdown, JSON and CSS source facts, preflight resolves each typed locator against its declared resource. A fictional selector/anchor/pointer/property, unsupported syntax, incompatible media or prose placeholder fails before UI Authority Closure. Accepts `REQ-DRA-048`.
- `AC-DRA-027` — Given a source-rich handoff, the residual adapter references rather than duplicates canonical facts while closing every applicable cell. Long-Task rejects missing/extra method bindings, Claims unrelated to a method Assertion or blocker Source-item/method drift; each production mutation must independently fail its owning Check or Final Gate. Accepts `REQ-DRA-050`, `REQ-DRA-051`.
- `AC-DRA-028` — Given a design-purpose or design-thinking mechanism change, owning specification, Context, managed/generated/package guidance, public docs and tests expose one information-complete, causally rigorous chain with authority, proof, fail-closed and alternative/ROI boundaries, including concise Figma/Penpot/OpenPencil selection background. Accepts `REQ-DRA-052`, `REQ-DRA-053`.
- `AC-DRA-029` — Given a selected handoff under the default Workflow, every affected selected target/constraint and declared condition is opened and its material requirements are routed to production owners, a cold-start journey and attributable project checks on the final candidate. Mutating relevant Source, implementation or check input stales the affected evidence; every unchecked, unresolved or unsupported condition is reported and blocks an unqualified claim without creating an exact ledger, persisted matrix, state or Gate. Accepts `REQ-DRA-054`, `REQ-DRA-055`, `REQ-DRA-060`.
- `AC-DRA-030` — Given an active Long-Task with the same handoff, existing Claims/Assertions/verification-method bindings/surface bindings/design-conformance evidence and Final Gate carry the obligation, and managed guidance explicitly forbids also running the default selected-design closure. Accepts `REQ-DRA-054`, `REQ-DRA-058`.
- `AC-DRA-031` — Given selected facts across all eight dimensions and both a component-family target and screen-specific target, a fresh recovery follows deterministic Design Source Projection and finds exactly one canonical adoption record for each at its correct `DESIGN.md` or Screen Contract owner; no handoff coverage index or duplicate locator/digest/coverage/update record appears in another layer. Accepts `REQ-DRA-056`, `REQ-DRA-057`.
- `AC-DRA-032` — Given the optional UI/UX recovery benchmark, its fixed fixture, task, routing gold and hidden oracle can distinguish Context-only discovery, selected-target consumption and production preservation. Static suite success makes no Agent-effectiveness claim; only fixed independent paired runs may do so. Accepts `REQ-DRA-059`.
- `AC-DRA-033` — Given a consumer without a selected implementation handoff, default startup and workflow behavior add no selected-design accounting or new artifact/state/gate; detailed projection guidance remains on-demand and Long-Task schema/runtime is unchanged. Accepts `REQ-DRA-058`, `REQ-DRA-060`.
- `AC-DRA-034` — Given a valid project whose genuinely near-universal default Context exceeds the total or per-file byte heuristic, `doctor` reports advisory warnings while returning no budget error, validation remains unaffected and the source release suite does not fail on the absolute total. Accepts `REQ-DRA-061`.
- `AC-DRA-035` — Given repository history from the threshold-introduction commit through the current baseline, every default-set contraction is inventoried and classified against surviving/replacement owners, code and tests; the report distinguishes “no tracked evidence of weakening” from the unprovable claim that no uncommitted idea or subjective decision was ever influenced. Both total and per-file warning text state required readable facts take precedence. Accepts `REQ-DRA-062`.

<a id="dra-risks"></a>
## Risks And Mitigations

- `RISK-DRA-001` — Fact `external_dependency`: Open Design MCP/tools/templates may change independently. Affects `OUT-DRA-02`. Mitigation: runtime discovery, pinned research evidence, thin adapter, honest unavailable results and optional live tests.
- `RISK-DRA-002` — Fact `weak_observability`: design quality is partly subjective and provider runs are nondeterministic. Affects `OUT-DRA-03`. Mitigation: separate structural sanity checks from human selection; never convert aesthetic judgment into a machine pass.
- `RISK-DRA-003` — Fact `critical_user_path`: a Skill may over-generate from rich background and violate a narrow exploration request. Affects `OUT-DRA-01`, `OUT-DRA-03`. Mitigation: hard requested-scope ceiling and explicit exploration stopping rule.
- `RISK-DRA-004` — Fact `third_party_outage`: daemon/agent/authentication failure can interrupt generation. Affects `OUT-DRA-02`. Mitigation: preflight discovery, bounded polling, surfaced run errors, cancel/retry/resume where supported and no placeholder success.
- `RISK-DRA-005` — Fact `security_boundary`: product Source or proprietary references may be sent through configured provider/agent paths. Affects `OUT-DRA-02`, `OUT-DRA-03`. Mitigation: expose the selected provider path, respect local-first execution and require explicit confirmation only when the actual path expands data disclosure beyond the user's configured/local expectation.
- `RISK-DRA-006` — Fact `architecture_change`: adding a package-owned orchestration Skill reverses the current “no generation Skill” product boundary. Affects `OUT-DRA-04`, `OUT-DRA-05`. Mitigation: keep the Skill optional/thin, update all controlling/public surfaces together and prove no authority/lifecycle duplication.
- `RISK-DRA-007` — Fact `partial_provider_discovery`: current MCP omits the rendering-template registry. Affects `OUT-DRA-02`. Mitigation: feature detection, upstream-compatible addition, version-guarded fallback and no vendored catalogue.
- `RISK-DRA-008` — Fact `mutable_external_source`: Open Design preview/project files can change after later runs and implicit entry discovery can fail. Affects `OUT-DRA-03`. Mitigation: explicit entry resolution and immutable hash/snapshot before handoff.
- `RISK-DRA-009` — Fact `nested_tool_mismatch`: Open Design's inner agent may see Skill instructions without the browser/MCP runtime they expect. Affects `OUT-DRA-02`, `OUT-DRA-03`. Mitigation: keep provider commission focused on generation, inspect advertised tool bundle, and perform outer review with available project/browser tools.
- `RISK-DRA-010` — Fact `profile_surface_growth`: a base-installed Skill increases default capability/trigger surface. Affects `OUT-DRA-04`. Mitigation: explicit narrow triggers, no automatic provider dependency, static trigger tests and no change to ordinary Workflow routing.
- `RISK-DRA-011` — Fact `post_artifact_terminal_failure`: a nested provider process may leave a run nonterminal and eventually time out after its final message and complete artifact. Affects `OUT-DRA-02`, `OUT-DRA-03`. Mitigation: model execution state and artifact readiness separately, preserve last-update/failure diagnostics, use bounded observation, never invent success, retain independently verified output and retry only when artifact completeness or user intent justifies it.
- `RISK-DRA-012` — Fact `critical_user_path`: a handoff may stop after a page/default-state prototype while implementation still has to invent material control states, interaction, motion, responsive or accessibility behavior. Affects `OUT-DRA-01`, `OUT-DRA-03`. Mitigation: task-local material coverage through controls, selected-source subtraction only for explicit conditions and fail-closed shared preflight that keeps every unresolved disposition blocked.
- `RISK-DRA-013` — Fact `architecture_change`: control-level completeness may be misread as one artifact per control, creating unnecessary output and a de facto pack. Affects `OUT-DRA-01`, `OUT-DRA-03`, `OUT-DRA-04`. Mitigation: component-family reuse, one-addressable-artifact coverage, dedicated studies only for unique/complex gaps and explicit no-registry/no-pack boundaries.

<a id="dra-decisions"></a>
## Delegated Decisions And Open Research Items

The user delegated detailed plan design under the explicit preference for high quality, efficiency and reuse of Open Design. The following are supported delegated choices:

- `DLG-DRA-001` — Implement a thin Open Design commissioner rather than a local design-generation engine. Basis: explicit user preference plus Open Design's MCP/CLI skill/template architecture.
- `DLG-DRA-002` — Use dynamic resource dispositions and a hard scope ceiling rather than a fixed artifact sequence. Basis: the user's correction that no artifact is universally mandatory and the need to support one-control/one-screen exploration.
- `DLG-DRA-003` — Prefer MCP, then structured CLI/daemon fallback, with UI automation last. Basis: current Open Design MCP source and reliability/efficiency constraints.
- `DLG-DRA-004` — Separate exploration, handoff and selected-source preparation behavior without creating persisted workflow state. Basis: prior one-page trial and existing Tiny Context downstream authority boundary.
- `DLG-DRA-005` — Install the new Skill in the base managed-skill set, not only the Long-Task profile. Basis: one-control/one-screen exploration and development-corresponding handoff are workflow-independent upstream needs; narrow explicit triggers prevent ordinary UI work from invoking it.
- `DLG-DRA-006` — Treat current rendering-template enumeration as a provider compatibility gap and prefer an upstream MCP addition over a Tiny Context-owned catalogue. Basis: live MCP/source evidence and the user's “do not reinvent Open Design” constraint.
- `DLG-DRA-007` — Make outer artifact review the default and nested provider browser verification optional/capability-driven. Basis: the high-fidelity flow experiment's tool-bundle mismatch and the requirement for efficient, evidence-backed generation.
- `DLG-DRA-008` — Define implementation-handoff sufficiency by the explicit development scope and material user-visible UI/UX coverage through relevant controls, not by Long-Task or another consuming workflow. Basis: `IN-DRA-USER-002` and the existing ordinary-Source boundary.
- `DLG-DRA-009` — Treat control granularity as addressable coverage rather than artifact count: reuse component families and comprehensive inspectable resources while requiring dedicated unique/complex-control studies only for uncovered meaning. Basis: `IN-DRA-USER-002`, output efficiency and the no-mandatory-pack boundary.
- `DLG-DRA-010` — Use one strict provider-neutral marked Markdown adapter only for selected implementation handoffs and share its preflight across both consumers. Basis: `IN-DRA-USER-003`, the independent semantic-loss boundary between resource authoring and development, and the need to reject omission/category substitution without creating a provider pack or second workflow.
- `DLG-DRA-011` — Strengthen the unreleased V1 adapter with a complete implementation source profile, typed addressability, applicable-cell closure and existing-Contract proof lineage instead of adding a provider-specific V2, registry or Gate. Basis: observed fictional-locator/target-condition/method/blocker false greens and the smallest distinct-protection rule.
- `DLG-DRA-012` — Keep Figma, Penpot and OpenPencil optional. Adopt one only when its collaboration, self-hosting or local static-editing benefit is independently required; never convert complete Open Design source merely to add another representation. Basis: current official cost/capability research and absence of a distinct enforcement gap.

`RQ-DRA-001` through `RQ-DRA-008` are resolved by `FIND-DRA-001` through `FIND-DRA-008` and the experiment record. No user decision is required before implementation. A later user may still choose a provider/model, approve persistent design-platform setup, select among candidates or reserve a visual decision; those are runtime choices, not plan gaps.

<a id="dra-implementation-impact"></a>
## Proposed Repository Impact And Verification

The separately authorized implementation and current clarification/release delivery are reviewed under the Harness package authoring rules. Current impact includes:

- authored `.codex/ty-context-managed/skills/design-resource-authoring/**`, generated `.codex/skills/**`, and `packages/ty-context/assets/skills/**` through existing source sync;
- `packages/ty-context/src/lib/profiles.ts` base managed-skill set plus sync/init/upgrade/release fixture inventories;
- small directly referenced Skill resources, and a transport-only helper only if capability probing proves necessary;
- package-owned `design-resource-handoff-{types,shape,parser,policy,validation,file-validation}.ts`, `commands/design-resource.ts` and the Long-Task activation/proof bridge, with no provider prompt/runtime dependency;
- `PROJECT_SPEC.md`, owning package Context, `README.md`, `README.zh-CN.md`, `packages/ty-context/README.md` and relevant Skill-routing wording;
- current `source-plan-authoring`, `context_uiux_design`, default Workflow and `long-task-workflow` boundary text only where cross-links are needed, not duplicated generation logic;
- `tests/ty-context/design-resource-authoring-skill.test.mjs`, the shared adapter/CLI fixture suite, Long-Task compiler integration, default/Long-Task guidance assertions and affected-test routing plus existing package-source/profile/sync/doctor/orientation/tarball/consumer-lab tests;
- explicit migration of the deleted-Skill assertions in `tests/ty-context/sync-init-doctor.test.mjs` and the no-generation-Skill boundary assertion in `tests/ty-context/visual-delivery-guidance.test.mjs`, replacing them with the new thin-commissioner/no-authority boundary rather than simply removing coverage;
- optional local integration fixture/tooling outside the normal deterministic gate.

Focused deterministic test cases should cover:

- explicit bilingual trigger inclusion and generic-design/ordinary-implementation exclusions;
- rich background plus one-control/one-page scope ceilings;
- large background plus a partial development slice, necessary surrounding context and no detailed whole-page/product expansion;
- implementation-handoff material coverage from surface/flow/region through component/control visual/content, state, interaction/feedback/recovery/motion, adaptation/input, accessibility and asset conditions;
- selected page/design-system coverage that does not imply unshown dynamic conditions;
- shared component-family mappings and one comprehensive inspectable artifact versus dedicated unique/complex-control gaps, with no one-file-per-control rule;
- user-visible interaction semantics versus product/business/data/permission/algorithmic Source ownership;
- implementation-handoff stop behavior with explicit existing/new/non-applicable/excluded/decision-required/unavailable coverage, unresolved results blocked from ready status and no Design Authority/acceptance claim;
- strict V1 unknown-field, source-profile/dependency closure, complete acquisition, typed locator, applicable-cell, evidence/media, repository-path/digest and Source-item validation through both library and CLI entry points;
- Long-Task target/condition/frozen-input equality, covered Source Claim/method-Assertion reachability, evidence-capability requirements and blocker provenance binding;
- default Workflow shared-preflight routing, resource opening and real-entry verification without treating adapter integrity as implementation conformance;
- no globally mandatory prototype/wireframe/Figma/design-system sequence;
- selected/optional/not-needed/unavailable/decision-required dispositions;
- functional-skill versus rendering-template discovery and missing-template fallback;
- Open Design unavailable, MCP unregistered, missing agent/model, running/succeeded/failed/canceled, nonfatal stderr and bounded retry paths;
- implicit `get_artifact` entry failure followed by file listing/explicit retrieval;
- mutable preview rejection in favor of explicit entry plus content hash/snapshot;
- final agent message plus complete artifact while the run remains nonterminal, followed by a post-artifact provider timeout; test `artifact-ready/run-unreconciled` → `artifact-ready/provider-failed`, retained provenance and no automatic cancel/retry;
- provider catalogue-only, missing connector/auth and proven-operational capability cases;
- Figma/Penpot/OpenPencil selection-background parity with no default-provider or second-representation requirement;
- fictional locators, missing/undeclared dependencies, truncated acquisition, target/condition coverage crossing, method drift and blocker-lineage drift;
- design-purpose causal-chain and source-workspace information-complete/causally-rigorous authoring-rule drift;
- exploration stopping after minimal preview, handoff metadata, selection-basis enforcement and zero Context/`DESIGN.md`/code/Contract mutation;
- authored/package/generated source equality, profile installation, idempotent sync and release tarball inclusion.

Live tests are split:

- read-only opt-in smoke: MCP initialize, tool/resource enumeration, agent discovery and capability split;
- manual/opt-in generative confidence: one tiny bounded artifact and explicit-entry retrieval, never a normal CI requirement;
- human/Browser review: aesthetic/interaction judgment, never reduced to a package pass/fail claim.

The implementation verification sequence should include build, focused static/mock tests, two source-sync passes, source parity, enabled-profile sync, Context/Harness validation, affected tests, package regression and `git diff --check`. Live Open Design experiments remain separately reported external-integration evidence and cannot be a required deterministic package gate.

<a id="dra-traceability"></a>
## Traceability Summary

- `IN-DRA-USER-001` controls the no-mandatory-resource rule, scope ceiling, Open Design reuse, no-mutation boundary, experiments and original complete-plan requirement.
- `IN-DRA-USER-002` controls workflow-independent purpose, explicit development-scope correspondence, necessary-context boundary, material control-level UI/UX coverage, selected-source subtraction, shared-versus-dedicated resource selection, business-logic ownership, handoff stop rule, indexing and package release.
- `IN-DRA-USER-003` controls the strict shared adapter, complete declared-fact preservation, dual-consumer integration, owning Context purpose/mechanism and real complex-single-page Open Design workflow smoke.
- `IN-DRA-USER-004` controls the implementation-source profile, typed addressability, applicable-cell closure, method/blocker proof lineage, concise provider-selection background, complete causal chain and authoring-quality rule.
- `IN-DRA-USER-005` controls the shared conditional conformance obligation, mutually exclusive carriers, lightweight exact default accounting, deterministic Design Source Projection, one canonical adopted-target owner, fresh-agent benchmark boundary, advisory-only byte budgets, positive-ROI constraint and authorized release operations.
- `IN-DRA-USER-006` controls the 64 KiB origin/effect distinction, post-introduction semantic-retention audit, residual-warning correction and evidence-boundary wording.
- `IN-DRA-EXT-001` and `IN-DRA-PLAN-001` control the design-authority, target-classification, condition-coverage and evidence boundaries.
- `IN-DRA-HARNESS-001` controls Tiny Context ownership, Source/Contract separation, package impact and downstream adoption.
- `IN-DRA-OD-001`, `IN-DRA-OD-LOCAL-001` and `FIND-DRA-001` through `FIND-DRA-008` control the adapter, capability split, setup/recovery, optional-provider boundary, entry/provenance rules and live test design.
- `IN-DRA-VIS-001` controls the narrow-preview and no-unnecessary-postprocessing usability requirement.

<a id="dra-completeness"></a>
## Completeness Status

- Input inventory: complete for the original conversation/attachment/repository/screenshots, development-corresponding design-purpose clarification, shared input-adapter/source-closure amendments, the 2026-07-25 shared-conformance/durable-Context clarification and the default-Context threshold origin/influence/audit follow-up.
- Open Design source pin and capability audit: complete against upstream revision `447b18b98e0db98a586ef913b76b0269e487db70` and local package `0.15.1`.
- Provider-selection research: complete against current official Figma pricing/MCP limits, Penpot open-format/MCP/self-hosting and OpenPencil repository/roadmap guidance retrieved on 2026-07-24; live installation/authentication is intentionally outside this delivery.
- Component/page/flow experiments: complete; three terminal-success artifacts and one fully generated/outer-reviewed `artifact-ready/provider-failed` artifact are recorded with project/run IDs, explicit entries, hashes and failure diagnostics.
- Provider failure/recovery, registry asymmetry, mutable-preview, nested-tool and optional-provider availability findings: complete for the researched provider/runtime.
- Requirements, development-scope/material-coverage semantics, downstream boundaries, implementation outcomes, repository impact and deterministic/live test split: complete and traceable.
- Final cross-input audit: complete; every current user correction—including partial-development scope, control-level completeness without one-file-per-control output, static/dynamic coverage honesty, user-visible versus business-logic ownership, workflow independence, implementation-source completeness, typed addressability, applicable-cell and downstream proof closure, optional provider selection, retained residual handoff, shared/default/Long-Task carrier de-duplication, complete lightweight default accounting without an absolute byte acceptance gate, durable UI/UX fact projection, canonical target ownership, fresh-agent evidence honesty, positive ROI, historical byte-budget influence auditing with explicit epistemic limits and information-complete/causally-rigorous rationale authoring—and every material external/repository/provider constraint is covered, delegated or explicitly excluded.

This Source Plan remains optional upstream Source and authorizes no package change by itself. The separately authorized 2026-07-22 implementation request entered the normal Harness package-authoring workflow and owns its Context Delta, Skill/tests and release-facing verification; the current clarification Goal separately and explicitly authorizes the requested commit, remote/main integration and npm publication.
