# Project Tiny Context Harness

[![npm version](https://img.shields.io/npm/v/project-tiny-context-harness.svg)](https://www.npmjs.com/package/project-tiny-context-harness)
[![Package CI](https://github.com/Seven128/project-tiny-context-harness/actions/workflows/package.yml/badge.svg)](https://github.com/Seven128/project-tiny-context-harness/actions/workflows/package.yml)
[![OpenSSF Scorecard](https://api.securityscorecards.dev/projects/github.com/Seven128/project-tiny-context-harness/badge)](https://securityscorecards.dev/viewer/?uri=github.com/Seven128/project-tiny-context-harness)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/Seven128/project-tiny-context-harness/blob/main/LICENSE)
[![Open in GitHub Codespaces](https://img.shields.io/badge/open%20in-Codespaces-181717?logo=github)](https://codespaces.new/Seven128/project-tiny-context-harness)

Translations: [Chinese (Simplified)](https://github.com/Seven128/project-tiny-context-harness/blob/main/README.zh-CN.md)

Project Tiny Context Harness is repo-native project memory for AI coding agents, plus a narrow delivery harness for trustworthy long-task completion. The product principle is: keep the memory, drop the ceremony. It adds durable project memory behind `AGENTS.md` without becoming an agent scheduler or Git orchestrator.

Public launch surfaces are English-first; localized documents are secondary entry points.

Best for:

- repositories where coding agents repeatedly rediscover project intent;
- teams using multiple agents or frequent fresh chats;
- maintainers who want durable Context and explicit long-task evidence.

Not for:

- replacing project tests, review, CI or human acceptance;
- autonomous Tiny Context execution;
- codebase semantic indexing or external docs retrieval.

Concrete shift:

```text
Before: ask a fresh agent to read the repo and tell you what matters.
After: ask it to read AGENTS.md and project_context/** first, then summarize goal, non-goals, architecture boundaries and validation paths before proposing code.
```

What gets added:

```mermaid
flowchart LR
  A["Fresh agent session"] --> B["AGENTS.md startup router"]
  B --> C["project_context/** durable facts"]
  C --> D["Goal, boundaries, validation paths"]
  D --> E["Implementation and delivery work"]
  F["Tests / CI / review"] --> G["Product quality evidence"]
  C -. "does not own" .-> G
```

![Project Tiny Context Harness terminal demo](https://raw.githubusercontent.com/Seven128/project-tiny-context-harness/main/docs/launch/assets/demo-terminal.gif)

The demo shows the core loop: initialize `AGENTS.md` and `project_context/**`, run `validate-context`, then ask a fresh agent to recover intent before proposing code. Use the npm install path below, or inspect the no-install previews first.

Install:

```sh
npm install -D project-tiny-context-harness@latest
npx --yes --package project-tiny-context-harness@latest ty-context init
```

No-install preview:

- Read the [fresh-agent recovery walkthrough](https://github.com/Seven128/project-tiny-context-harness/blob/main/docs/examples/fresh-agent-recovery.md).
- Inspect the [Minimal Context sample guide](https://github.com/Seven128/project-tiny-context-harness/blob/main/docs/examples/minimal-context-sample.md).
- Browse the tiny generated repository at [examples/minimal-context-sample/](https://github.com/Seven128/project-tiny-context-harness/tree/main/examples/minimal-context-sample).

## Why It Exists

`project_context/**` preserves small durable facts across sessions. The default workflow reads graph-relevant Context, supplements that route with one bounded Context search before `Context Delta`, and uses the platform's internal plan. For explicit long work, `long-task-delivery-v2` adds one complete Contract authority, fail-closed Source ownership, Control/applicability closure, semantic Counterfactuals, a one-time user model choice after Authority Lock, scoped progress and a protected-input-recompiled Live Final Gate.

Tiny Context does not invoke or switch models, create agents, branches or worktrees, merge, push, create PRs, deploy, or replace project tests and human acceptance.

## Capability Model

| Capability | When and how to use it | What it owns |
|---|---|---|
| **Minimal Context** | Installed by default. Every delivery route reads and updates `project_context/**` as needed. | Durable goals, ownership, architecture/interface/state boundaries and repeatable verification/deployment facts; never a test-pass claim. |
| **Workflow Contract** | Prompt-level default after `init`. Give ordinary work to the current coding Goal; there is no Skill command or `delivery-contract.yaml`. | Context discovery, Architecture Deliberation, one `Context Delta`, implementation, project checks, Contract Conformance and Context drift; no validator result, Receipt, persisted workflow state or machine completion. |
| **Long-Task Workflow** | Enable the profile once, then explicitly select the `long-task-workflow` Skill, or resume a valid existing binding. Task size alone does not activate it. | One Source-bound Delivery Contract, Authority Lock, recoverable scoped progress, protected revision and a current-snapshot Live Final Gate. |

Every delivery uses Minimal Context. Ordinary delivery uses the default Workflow Contract; an explicitly selected Long-Task uses `long-task-workflow` as the sole long-task execution and completion carrier. `design-system-authoring` and `design-resource-authoring` are independent optional upstream Skills, not Long-Task stages. Their selected outputs may feed either route.

Skill names here are host-neutral. In Codex, explicitly select one with `$skill-name` (for example `$long-task-workflow`) or use `/skills`; other hosts use their own Skill selector.

## Install And Initialize

```powershell
npx --yes project-tiny-context-harness ty-context init
# Existing repository:
npx --yes project-tiny-context-harness ty-context init --adopt

npx --yes project-tiny-context-harness ty-context validate-context
npx --yes project-tiny-context-harness ty-context doctor
```

Default profiles are `core-portable` and `workflow-default`; the base managed set includes explicitly selected `design-system-authoring` and `design-resource-authoring`. Explicitly enable long-task support:

```powershell
ty-context enable long-task
```

Enabling Long-Task additionally installs `long-task-workflow`, the retired `source-plan-authoring` compatibility pointer and the completion Hook. Disable only those Long-Task-owned surfaces with `ty-context disable long-task`; both base design Skills remain. Tiny Context does not install Open Design or another design-generation runtime.

## Recommended Usage

Start from either a concise product request or a detailed initial proposal authored elsewhere, including Web GPT. That input does not require design authoring or Long-Task; choose the execution route independently.

- **Ordinary delivery, no new design resources:** give the request directly to the current coding Goal; the default Workflow Contract applies automatically.
- **Long delivery, no new design resources:** select `long-task-workflow` with the request or proposal. It authors the Source-bound Contract Draft; design authoring is not a prerequisite.
- **Delivery that needs new design resources:** select `design-system-authoring` only when Design Authority is absent, then `design-resource-authoring` to select and freeze resources and emit the validated residual handoff. Send the result to either the default Workflow Contract or `long-task-workflow`, based on recovery and completion-authority needs.
- **Design-resource-only request:** stop after `design-resource-authoring`; do not create a Long-Task Contract unless implementation delivery was also selected.

The design-system Skill is normally used at cold start but never auto-runs. Only style-bearing resource work is gated; low-fidelity structure, IA/flow and semantics-only state studies remain available. A legacy Source Plan remains ordinary input, not a recommended intermediate service.

## Positioning

| Adjacent tool type | Use it for | Harness stance |
|---|---|---|
| Spec-first kits | Turning a feature idea into structured specs and plans. | Complementary; Harness keeps durable repo facts beyond one feature spec. |
| BMAD-style workflows and full Tiny Context processes | Role/process ceremony for selected work. | Lighter default; ordinary work stays Context-first. |
| Task Master-style planners | Backlog decomposition and task state. | Complementary; Harness does not own backlog state. |
| Context7/Serena-style retrieval | External docs, symbols or repository retrieval. | Complementary; Harness owns local intended boundaries. |

## Try It In 60 Seconds

```sh
mkdir project-tiny-context-harness-demo
cd project-tiny-context-harness-demo
git init
npm init -y
npm install -D project-tiny-context-harness@latest
npx --yes --package project-tiny-context-harness@latest ty-context init
make validate-context
```

Expected result:

```text
AGENTS.md
project_context/
  context.toml
  global.md
  architecture.md
  areas/main.md
  areas/main/verification.md
```

Fresh-agent test prompt:

```text
Read AGENTS.md and project_context/** first. Summarize the project goal, non-goals, architecture boundaries, validation entry points and next safe action before proposing code changes.
```

### Source checkout preview:

Open <https://codespaces.new/Seven128/project-tiny-context-harness>, or run locally:

```sh
git clone https://github.com/Seven128/project-tiny-context-harness.git
cd project-tiny-context-harness
npm ci
npm run smoke:quickstart
npm run preview:pack
cd /path/to/your/test-repo
npm install -D /path/to/project-tiny-context-harness/tmp/ty-context/source-preview/package/project-tiny-context-harness-0.8.4.tgz
npx --no-install ty-context init --adopt
make validate-context
```

Use this tarball path for source-preview testing, private review or package development. For normal installs, use `project-tiny-context-harness@latest` from npm. If it fails, open a [Source preview report](https://github.com/Seven128/project-tiny-context-harness/issues/new?template=source_preview_report.yml).

## Minimal Context And Default Workflow

The default read path is `project_context/global.md`, `project_context/architecture.md`, `project_context/context.toml`, the default area root, then minimum graph-relevant role Context.

Only near-universal recovery facts should use `read_policy = "default"`; specialized detail should be task-triggered `on-demand`. `ty-context doctor` reports the deterministic default Context footprint, soft-budget overages, byte-identical default files and `DESIGN.md` authority status as advisory maintenance signals, not a new gate. Genuine near-universal recovery facts take precedence over the byte heuristic and must not be omitted, obscured or misclassified merely to fit it.

### Bounded Context discovery

Before deciding `Context Delta`, the Agent combines two low-state routes:

1. collect area, role, trigger and graph candidates from `context.toml`;
2. run one bounded text search over `project_context/**` with a small set of high-signal task terms, including explicit area/module names and relevant API/schema/state/security/verification/deployment language;
3. merge the candidates and read only semantically relevant files.

The bounded search supplements rather than replaces Agent semantic judgment. It creates no vector or persistent index, cache, registry, search state or second authority. It can still miss unrelated synonyms or indirect dependencies, so every implementation delivery still performs Architecture Deliberation and final Conformance.

Ordinary tasks:

1. resolve minimum relevant Context through manifest routing plus bounded Context search;
2. surface one concise, repository-bound Architecture Deliberation;
3. decide `Context Delta: none|required` and update durable facts before code when required;
4. use the platform's internal plan;
5. implement and run project-owned verification;
6. perform Contract Conformance, including Architecture Conformance on the current candidate;
7. perform the separate Context drift check and hand off.

The default workflow has no required plan artifact, matrix, verdict, evidence ledger, persistent retrieval index or second plan. Duration, file count and complexity never auto-enable long-task state.

Plan Validator commands no longer exist; existing plan, matrix or verdict files remain ordinary user files.

### Architecture And Modularity Guidance

Technical architecture support is a shared Workflow obligation. Every implementation delivery visibly completes `Architecture Deliberation` before its first implementation edit. Risk changes depth, not occurrence. A small change names the concrete owner/current extension point, confirms durable boundaries remain unchanged and explains why it adds or worsens no debt. Material work additionally covers the unique source of truth, dependency and interface/state/lifecycle boundaries, failure/recovery/compatibility, selected and rejected alternatives, one plausible future change and its extension point, touched technical debt, forbidden shortcuts and project-owned executable checks. `Architecture Context Hit`, `Decision Rationale Hit: existing|required|none` and `Modularity Check: none|required|exception` remain internal routing questions; no Task Contract or fixed `plan.md` is required.

After implementation and project verification, `Architecture Conformance` checks the current candidate for scope/path escape, owner or dependency-direction violations, service/facade bypass, duplicate authority or a second source of truth, undeclared API/schema/state/persistence change, missing architecture checks and new or worsened debt. A changed candidate invalidates the result. Default work embeds this closure in Contract Conformance; Long-Task work encodes material invariants with existing obligations/constraints/forbidden shortcuts, owners/paths/Bindings and executable Checks and lets Final Gate be the sole closure owner. The two closures never both run for one candidate.

Contract Conformance asks whether current Source and Context reached implementation and verification; the separately named Context drift check asks whether implementation or a new decision made durable Context stale. New or worsened debt blocks handoff unless the project has an explicit bounded exception with owner, rationale, tracking and a removal condition. Unrelated legacy debt does not automatically expand task scope, but debt touched, relied on or worsened by the change cannot remain hidden.

The visible checkpoint proves that architecture consideration occurred; it does not expose private chain-of-thought, guarantee the best design or anticipate every unknowable future request. Store stable reasons, rejected alternatives or tradeoffs only in the smallest durable Context surface. Harness routes repository-native checks rather than becoming a language-generic architecture analyzer or adding architecture artifact/state. Modularity diagnostics identify the highest-risk function and line.

`ty-context check-modularity` audits selected handwritten source. `validate-code-modularity` and `validate-harness` enforce it separately from `validate-context`.

#### Modularity Policy

Newly generated Harness configs default to `strict_except_generated`. Generated/build files remain excluded; `strict_except_generated` rejects configured `modularity.waivers`. Projects with bounded legacy exceptions may opt into `scoped_waivers`, whose entries require `path`, `category`, `owner`, `introduced_at`, `reason`, `tracking_issue` and `expiry_condition`.

### Product Surface Contract

`context_surface_contract` compiles durable screen/page/CLI responsibility using existing `contract`, area/subdomain and verification roles. `product-surface-contract.md` owns cross-surface/main-versus-drilldown responsibility; optional on-demand `screen-contract.md` goes deeper for one screen's entry/exit/shared state, information hierarchy, semantic regions, navigation/variants, material controls and target/verification references. This workflow must not add a new Context role or claim product-quality proof, and local style fixes do not require a Screen Contract.

For material UI, **UI Authority Closure** reconciles each stable surface/control/target key as covered by existing Context, requiring a Context update, task-local, explicitly out of scope or genuinely decision-required. Design Source Projection sends durable cross-surface and Screen/Control/state meaning to existing Product Surface or Screen/interaction Context, durable visual-system/token/motion-policy/rationale meaning to `DESIGN.md`, exact composition/value/condition/asset facts to versioned targets, repeatable proof routes to verification Context and delivery-local coverage/provenance/blockers to task or Contract Source. Conflicts fail closed; current code, timestamps, YAML or implementation screenshots do not silently win.

### Visual Delivery Guidance

One shared conditional purpose of both development paths is that Agent implementation, acceptance and testing fully conform to every material UI/UX fact selected design resources explicitly express within their declared scope and conditions. It activates only for a selected implementation handoff and does not infer unexpressed behavior or prove that the user supplied every desired requirement. Open Design can produce implementation-rich HTML/CSS/JS, specifications, tokens and assets, but capability is not a per-run guarantee: for a selected Web/App implementation handoff, `design-resource-authoring` must explicitly commission and completely retrieve one machine-readable canonical entry plus its exact dependency closure, freeze every file with a digest and expose stable typed locators. Before `ready`, it exercises every declared verification method on those immutable bytes and blocks unresolved conflicts among code, specs, tokens and assets. That is source QA, not production acceptance. PNG may be a visual baseline, never the sole implementation source.

The provider-neutral handoff is a residual semantic and index layer, not a textual copy of CSS or another value authority. Before formal Web/App generation, `design-resource-authoring` derives an Expected Fact Universe from scope, adopted Design Authority and a frozen Inspector/Census obligation. The atomic unit is an applicable `subject × selected target × condition combination × variation combination × property` Fact Cell. Subjects include surfaces, regions, overlays, component families/instances, controls, every anatomy part/slot/primitive, text, icons, media, assets and relations. Conditions are first-class across 33 standard condition axes (platform/runtime/device/viewport/density/safe area/window/fold/display/color/localization/content/data/text scale/input/assistive and accessibility preferences/system UI/IME/permission/capability/connectivity/lifecycle); variation is first-class across five variation axes: `variant`, `state`, `interaction_phase`, `presence_phase` and `instance_case`. Properties use 217 standard atomic keys across geometry, layout, scroll, typography, color, decoration, content, icon, media, interaction/navigation, motion/feedback, responsive, accessibility, asset, system and relation families, plus explicitly defined custom properties.

The generated canonical implementation source remains the sole owner of exact values. Its dependency closure contains a `design-resource-observable-fact-manifest-v1` with stable subject/property/Fact IDs, typed locators, located-value digests, units/rounding/pixel-snapping rules, token/effective-value lineage, dynamic population/relations/assets, required proof methods, comparator parameters/tolerance/mask, Oracle identity/capability and render environment. A frozen Inspector enumerates the complete resource/node/declaration/token/asset/relation/custom-property/variant/state/interaction/dynamic-population Census; complete-generation counts and digests prove that no sampling or truncation occurred. Each applicable Fact Cell is either covered by one atomic Fact or carries an explicit blocking/non-applicable disposition with Source/basis/rationale. Aggregate labels such as “all states” cannot stand for atomic values, and a default page/shared style cannot be used to infer another applicable combination.

Ready handoff requires exact set equality: `Expected Fact Universe = Canonical Resource Facts = Handoff Indexed Facts`, together with complete material-with-facts or honestly supporting-only resource closure. The handoff carries identities, locators, digests and proof bindings rather than copying CSS values. An `exact_target` additionally requires full-target layout and pixel facts for every applicable condition; otherwise the input remains a partial constraint or blocks. Preflight resolves the manifest and all typed locators against immutable local resources, validates dependency/Census/Fact/proof closure, and rejects missing, duplicate, unresolved, unsupported, stale, media-incompatible or value-conflicting input. Exploration remains schema-free.

Those inputs remain ordinary Source. The default Workflow keeps exact task-local accounting for every Fact and required proof obligation, then records the current actual observation/environment, comparison, tolerance, pass/fail and Oracle identity from an attributable production-owner/cold-start final-candidate check. Any unread, unsupported, unresolved, unmapped, unimplemented, unexecuted, stale, reused or indistinguishable applicable Fact blocks a complete claim and is reported as a gap. Long-Task projects the same universe into existing Claims/Assertions/Checks/Bindings: every method/condition cell carries exact `fact_refs`, one `fact_expectations` row per Fact/proof obligation and one current `fact_results` row containing that same observation/comparison/authority tuple; Final Gate requires exact expectation/result set equality and every result to pass on one current snapshot. Protected/sensitive observations remain redacted or digest-only without losing comparison authority. These proof carriers are mutually exclusive: an active Long-Task never also runs the default closure. Generation success, screenshots, hashes, Census and handoff preflight prove input completeness or integrity only, never production conformance.

The default Workflow performs UI Authority Closure and a conditional Design Authority Check before a material product, design, implementation or acceptance decision. It traverses affected stable keys to exactly one canonical adoption record, then actively opens every selected `exact-target` or `constraint`; a reference-index or handoff-index mention alone is not consumption. `DESIGN.md` canonically records project/system/component-family targets, while the owning Screen Contract records one-screen/interaction-specific targets. The canonical record owns interpretation, selection basis, readable immutable locator/digest, declared condition coverage and editable upstream owner/locator/update route; other layers keep only the stable key, canonical owner/anchor and local applicability. Missing, unreadable, stale or conflicting resources fail closed. Updates create a new immutable version instead of overwriting the adopted baseline. An unconfigured starter, candidate, style-only prose or inspiration does not authorize invented production layout, and a configured project visual system does not claim every page is implementation-ready. Explicit project design-system adoption routes to `design-system-authoring`; standalone resource generation routes to `design-resource-authoring`. Ordinary implementation with sufficient authority, local style fixes and throwaway prototypes remain lightweight.

For a selected implementation handoff, both development paths first run `ty-context design-resource preflight <handoff.md>`. Incomplete acquisition, missing or undeclared dependencies, unsafe paths, stale digests, fictional locators, non-frozen or incomplete Census, sampled/truncated generation, aggregate axis values, mismatched Expected/Canonical/Handoff Fact sets, missing required methods, invalid comparator/Oracle/environment binding, unresolved design-system lineage, uncovered applicable cells, absent exact-target layout/pixel facts, unsupported evidence and unresolved meaning all fail closed. Each workflow must still open the resources and prove the production implementation on the real entry.

For material work, `context_uiux_design` applies the projection above and keeps any risk-proportional coverage reasoning task-local. `context_development_engineer` traces every selected target/condition and the exact handoff sets through stable surface/control keys to the production route/component owner, cold-start real-user journey and independently attributable rendered/interactive checks. A first useful runnable production slice is a recommended real-entry feedback point when early localization is worth the cost, never an implementation gate; the final candidate always reruns the affected cold-start journey. Every declared/applicable combination remains covered—risk-only or pairwise sampling cannot replace it without authoritative scope narrowing or project-owned equivalence proof. Resource hashes, manifests and counts prove integrity only; an implementation screenshot cannot become its own target or implementation-conformance proof.

An explicit Long-Task is the strong machine carrier of the same shared obligation. It resolves missing/conflicting UI authority before Compile, then closes all 22 canonical fields of every real Product Control through `field_coverage`; that semantic Control projection is independent of, and never caps, the finer design Fact universe. Selected targets freeze the canonical manifest identity/digest and project every atomic Fact/required-method pair into a `fact_expectations` row with subject/target/condition/variation/property identity, expected located-value digest, comparator/parameters/tolerance/mask, Oracle identity/capabilities, environment and sensitivity. Current Check evidence supplies an exact matching `fact_results` row with actual observation/environment, comparison and pass/fail; duplicate/reused observations, missing results, stale authority or any failure block Final Gate. `design_conformance` remains a typed current-execution record for target-level actual/comparison artifacts, while `design_method` binds the independently failing method/condition cells and their per-Fact rows; neither aggregate record replaces atomic Fact proof. Product `surface_bindings`, Control Claims/relations and root-entry journeys continue to carry product semantics, while existing Claim, Assertion, Check, Stage, Binding, revision and Final Gate mechanisms remain the sole Long-Task lifecycle and closure. Every blocker preserves exact Source-item/method/capability lineage and cannot be dismissed in-band; scope removal requires revised Source/Contract authority.

Combined design-and-implementation work may author candidates in ordinary Outcomes/Stages, but a candidate or planned target cannot authorize fidelity implementation. Selection must become real marked Context-reachable Source plus the owning Context/`DESIGN.md` reference and, after Authority Lock, an adopted Authority Revision. Browser visual ACs use `ui_browser`; a browser proxy, detached route or deep link cannot prove a native/root journey that can fail independently. Resource integrity and `visual_render` cannot satisfy selected-target implementation conformance. Frozen baselines are verifier inputs, generated actual renders/diffs are current artifacts, and subjective approval remains external. No `uiux_delivery` block, visual Claim type, resource registry, risk level, lifecycle state, Gate, required design directory, per-Control screenshot matrix or universal pixel threshold is added.

`ty-context doctor` keeps its compatible `missing | unconfigured | configured` project-level status and adds advisory Design Authority Index, token-source and classified-reference signals. It explicitly does not infer surface implementation readiness; that requires the owning Screen/Control meaning, selected target/constraints and project-owned verification.

Static guidance tests prove distribution, projection and canonical ownership, not Agent performance. The optional delivery-mechanism benchmark provides a fixed fresh-agent UI/UX Context/target-recovery task with routing gold and a hidden production oracle; only independent paired runs may support effectiveness or ROI conclusions.

### Explicit Design System Authoring

Use `design-system-authoring` only on an explicit request to initialize, generate, select, adopt, replace or repair the project design system/style. It discovers live Open Design MCP resources/tools and feature-detects lifecycle methods; because Open Design 0.15.1 exposes design systems as MCP resources but no creation tool, the documented compatibility path uses the same installed daemon's official generation/revision/accept API. Candidates require explicit human or explicitly delegated selection before adoption into canonical project `DESIGN.md`, one authored token source/direction and only owning Context. Adopted targets record immutable identity/digest plus editable upstream owner/locator/update route; updates create a new immutable version instead of replacing the baseline. Provider ID/revision/digest and `get_project.designSystemId` are synchronization provenance, not another authority.

### Optional Design Resource Authoring

Use `design-resource-authoring` only for an explicit request to generate, iterate or prepare standalone design resources, prepare resources for a named development scope, or use Open Design. It accepts raw notes or an initial proposal, product/technical plans, a visual brief, screenshots, existing resources or a legacy Source Plan. A standalone Source Plan is neither prerequisite nor recommended middle stage.

The Skill makes the explicit output or development content its hard ceiling; a local slice includes only necessary surrounding context. For an implementation handoff it accounts for material UI/UX meaning through relevant surfaces/flows/regions/components/controls and applicable visual/content, state, interaction/feedback/motion, responsive/platform/input, accessibility and asset conditions, then subtracts only explicit selected-source coverage. It discovers current Open Design capabilities and assigns every considered resource a reasoned `selected`, `optional`, `not-needed`, `unavailable` or `decision-required` disposition.

For formal Web/App implementation output, “complete” defaults to the finest applicable observable Fact granularity described above. The Skill builds the Expected Fact Universe and frozen Inspector/Census obligation before commissioning generation, passes that obligation and the adopted design-system identity into Open Design, and requires the returned canonical source/manifest to express every applicable cell. It does not defer missing anatomy-part, state, responsive/platform/text-scale, motion, accessibility or asset design decisions to downstream implementation.

High-fidelity/branded output, visual direction, typography/color/density, component visual treatment and production-style prototypes are style-bearing. If Design Authority is unconfigured or lacks one authored token source/direction, the Skill stops before project/run creation and tells the user to explicitly select `design-system-authoring`; it never auto-initializes. Low-fidelity structure, IA/flow and semantics-only state studies remain non-fidelity. Style-bearing Open Design projects pass the adopted ID through `create_project.designSystem` and verify `get_project.designSystemId`.

It commissions only the smallest sufficient artifact/file set through structured MCP with bounded fallback; this minimizes packaging, never information granularity. One canonical HTML/CSS/JS prototype plus manifest, tokens/assets and an inspectable state/component workbench may carry thousands of atomic Facts. Repeated controls may map to one component family and only unique/complex uncovered controls need dedicated studies. Static/default views do not imply unseen behavior. No prototype, low/high-fidelity pair, component board, provider-native input, one-file-per-control rule, artifact count or directory is mandatory, and Tiny Context copies no provider prompt/template or catalogue. Designs carry user-visible interaction semantics, not sole ownership of business/data/permission/algorithmic rules.

For implementation Web/App output, the Skill requires the complete canonical entry/dependency set and addressable declared facts described above. Figma remains useful when an existing design team needs native Components/Variables/Variants, shared libraries, Dev Mode or Code Connect; Penpot when open/self-hosted multi-user design infrastructure is itself required; OpenPencil as a local static-layout sidecar while its prototype/motion model remains incomplete. Default conversion from complete Open Design source to another representation is not required because it adds synchronization and operating cost without closing a new enforcement gap.

Exploration returns a visible scoped candidate after minimal sanity review and requires no handoff schema. After explicit or delegated final selection for implementation, the Skill performs one consolidated idempotent proposal reconciliation and writes one provider-neutral marked Markdown Source containing exactly one strict residual `design-resource-handoff-v1` block. It records the canonical manifest/Inspector/Census identity, exact indexed Fact universe and dispositions, implementation source profile, typed locators/digests, residual product meaning, per-Fact proof bindings and acceptance blockers. Shared preflight cannot call incomplete, unaddressable, unresolved, unsupported, stale or set-unequal input ready. There is no fixed directory, provider pack or one-file-per-control rule. The adapter is ordinary Source, not Design Authority or acceptance, and the Skill never edits a Source Plan, Context, `DESIGN.md`, production code or a Delivery Contract.

Actual generation remains with configured Open Design/Product Design, Figma, image-generation, prototype or human systems. Their outputs enter the default Workflow or Long-Task as ordinary external Source. Candidates and inspiration authorize no fidelity. An adopted exact target/constraint becomes Context-reachable Source: owning Context/`DESIGN.md` maps its stable key to declared conditions, a stable immutable identity/digest and an editable upstream owner/locator/update route. `context_uiux_design` performs downstream UI Authority Closure; implementation renders and diffs remain evidence rather than self-authorizing targets.

Maintainers may set `TY_CONTEXT_OPEN_DESIGN_MCP_COMMAND` plus optional `TY_CONTEXT_OPEN_DESIGN_MCP_ARGS_JSON` and run `npm run smoke:open-design` for an opt-in, read-only discovery smoke. Normal tests use a local mock MCP and do not depend on Open Design or nondeterministic output.

### Retired Source Plan Compatibility

`source-plan-authoring` is retained only as a compatibility pointer. `long-task-workflow` opens the non-authoritative Contract Draft immediately and converges mixed-input inventory/synthesis, stable-key/Product Control-level meaning, preference/research/delegation traceability, Source markers/provenance, acceptance/risk completeness and Contract mapping in one loop. This semantic Control projection does not cap the separate complete-observable-design-fact inventory for selected resources. Existing Source Plans remain ordinary Source; no standalone or internal Source-authoring stage, handoff, schema, gate, state or second plan is created.

## Single-Goal Rolling Delivery

The explicit Long-Task Workflow uses one currently selected platform-native execution Goal, one user-selected repository and verification/convergence workspace, one complete `long-task-delivery-v2` Contract and one Final Gate. Harness does not persist a Goal identifier: compaction may continue inside that Goal, while a later Goal/session restores semantic state rather than the prior physical Turn. Outcomes are independently decidable acceptance units; Delivery Set orchestration and top-level Contract splitting inside one selected delivery are retired.

Its proof claim is conditional: complete and accurate Source at the declared observable granularity, meaning-preserving projection, complete applicability expansion and a semantically sound named project oracle/trusted verifier boundary make `AcceptedDeliveryTerminal`—exactly a fresh `machine_accepted` result with no pending External Confirmation—imply that no declared observable drift remains. `machine_accepted_external_pending` proves only the machine-verifiable declared scope; full delivery remains qualified and Harness does not complete the native Goal. Harness enforces and freezes many premises, but it cannot discover undeclared requirements or prove an arbitrary oracle truthful.

Raw/revised proposals, selected design resources and mixed attachments enter one Source-bound Contract Draft loop immediately. Complete input coverage, stable keys, Product Control-level meaning, selected-resource design facts, acceptance/risk, direct/derived/delegated/evidence-backed provenance, Source ownership and Contract mapping converge together. Every non-empty line in declared Markdown Source belongs to one Material `ty-source-item`, the single validated `design-resource-handoff-v1` formal block or a closed-grammar background block containing only text-free anchors/horizontal rules or fixed-field `ty-source-provenance` comments. Text-bearing headings, free-form provenance, arbitrary background prose and unclassified text fail closed unless classified as Material. At least one marked technical obligation carries `aspect=architecture` and maps to an independently provable architecture obligation. Unknown decision-changing preferences still trigger one targeted clarification before Preflight/Compile can succeed; defensible recommendations are written into real Source rather than hidden in YAML, while high-risk actions remain external confirmations. Legacy Source Plan structure never blocks authoring.

Before the first successful formal Compile, `delivery-contract.yaml` is one non-authoritative Contract Draft. `long-task-workflow` opens it at entry and revises the same Draft across Source refinement, repository/Context reads, mapping and Preflight repairs; a complete Contract need not fit one response. Source completeness is a convergence condition for Preflight/Compile, not a prior phase. There is no standalone Contract Draft Skill or Authoring State.

The Long-Task Skill keeps objective/boundary/activity routing in its main file and loads one-level Source-bound Draft/Contract-mapping, evidence-design and authority-lifecycle references as applicable. Draft input repair and Contract mapping are concurrent activities, not serial phases. This is instruction packaging only, not a second authority. It performs the shared Architecture Deliberation during Draft authoring. Declared architecture invariants use existing obligations/constraints/forbidden shortcuts, owner/path/Binding boundaries and project-owned executable Checks; a functional AC cannot substitute for an independently failing architecture claim. Final Gate is the sole Long-Task Architecture Conformance carrier.

A Draft Outcome is simply an Outcome before Authority Lock. Outcomes decompose independently observable, decidable and target-verifiable results to project acceptance/verification readiness, localize failures, resume findings and invalidate stale results. `depends_on` means acceptance and intermediate-proof readiness, not implementation permission, and the Rolling Frontier is a temporary advisory projection. The current Goal chooses implementation order and may optionally use one or multiple platform-native agents/subagents; Harness creates no delegation runtime, scheduler, state or proof, agent reports are non-authoritative, and all accepted output converges into the selected verification workspace. An Outcome is not a Worker, scheduler task, queue or parallel unit. Outcome decomposes diagnosis and proof ownership, not completion authority, so one complete current-snapshot Final Gate remains mandatory.

When a declared result can pass on a proxy surface while failing in its target runtime, the earliest owning Outcome declares a project-owned Check that exercises the target during the current Check execution. A tracked report, screenshot, binary, log or historical run cannot be the sole runtime proof. Global/Outcome applicability profiles bind exact target, journey, atomic duplicate-free dimensions, Given condition/input/state refs and ordered When refs; every Claim-bearing Assertion proves one Claim in one matching profile, and every actual applicability × proof-surface cell remains attributable without risk-based, pairwise or sampled substitution. Required product targets declare their family, cold-start and production-root capabilities. Every behavioral Claim-bearing Assertion also has a same-Check claim-local `replace_json_value` or `replace_text` Counterfactual that keeps a claimless target-runtime liveness Assertion passing while wrong behavior fails; whole-file replacement cannot prove semantic binding. Population binds a real universe carrier into its owning Check snapshot and proves universe = eligible = observed plus valid exclusions. Runner identity recursively freezes the supported direct-literal local verifier module/config/data graph and rejects non-literal loaders/`createRequire`; package scripts need a recoverable static Node entry. Candidate/runtime material remains explicitly owned by `input_paths`, `expected_output_paths` or `artifact_globs`; other indirect Oracle access belongs in `verification_inputs` or the named trusted boundary. Author each Check's `input_paths`/Bindings as its smallest sound invalidation envelope and keep every Counterfactual carrier traceable from the declared target root. The first useful runnable boundary and later coalesced changes are recommended targeted-feedback points only when early localization is worth the cost. Refresh `progress_stale` only before an intermediate decision relies on that result. Implementation and Final Gate may proceed with stale or absent Progress because the Gate ignores it and reruns every Check. `verify --explain` previews bounded declared runner invocations without execution or Progress writes, but cannot predict duration or runner-internal subprocesses. This adds no generic reachability claim, implementation gate, second executing diagnose mode, scheduler, trigger queue, `platform_impact` flags, completion state or per-edit rebuild rule; runtime-specific readiness/build/process behavior stays in the project runner, and Final Gate remains authoritative.

Long-Task Anti-Degradation Assurance protects current causal-chain truth, cross-version interception strength and the adjacent `F = Implementation Freedom Boundary`. Current-implementation Context must match the indexed code/runtime, which must still realize the two necessary meaning-capture and fail-closed final-proof responsibilities under the explicit theorem boundary. `F` is an efficiency/anti-process-bloat invariant, not a third responsibility or theorem premise: within Source/Contract, architecture, safety, forbidden-shortcut and irreversible/external-action boundaries, implementation order, methods, feedback cadence and optional one-agent or multi-agent/subagent execution remain Goal-owned. Harness adds no development phase/method Gate, per-edit mandate, agent scheduler/state or delegation proof. Weakening the protected purpose, key logic, either responsibility, theorem boundary or `F` requires an explicit project-owner design-purpose decision and replacement proof; a new development-stage constraint must also close a distinct path that final proof or a lighter project-owned check cannot cover and have positive net ROI. Existing Context, indexes, tests, critical sentinels, routing and parity gates carry this assurance without another Authority, Gate or state; they cannot infer omitted requirements or guarantee immutability against deliberate fully authorized joint weakening.

Workflow changes then pass two hard gates in order: first prove `Coverage_new ⊇ Coverage_old`, `FalseNegative_new ⊆ FalseNegative_old` and preserve non-bypassable Authority, fail-closed behavior and complete-current-final-snapshot proof; if that cannot be proved, preserve the current formal acceptance path. Only then require incremental anti-degradation or purpose-fulfillment benefit to exceed all authoring, runtime, state, recovery, maintenance, test, process, introduction and migration cost. Cost never compensates for weaker drift detection. Positive net ROI means the proposal may be considered, not that it is automatically adopted.

### One-time execution-model choice

The first successful Compile creates Authority Lock and returns:

```json
{
  "execution_model_checkpoint": {
    "required": true,
    "phase": "post_authority_lock_pre_implementation",
    "options": ["continue_current_model", "switch_model_then_resume"],
    "turn_boundary": "end_current_turn",
    "explicit_task_specific_choice_required": true,
    "generic_continue_satisfies": false
  }
}
```

This is a terminal-turn boundary. Unless a prior user message explicitly states this task's current-model or switch-and-resume strategy, the Agent performs no product implementation, file edit, build or test after that result, ends the turn and asks for the choice. Generic continue/resume/finish/continue-goal language does not satisfy it. Later Compile revisions return `{ "required": false }` and do not repeat it.

Harness cannot switch the host-selected model. It creates no checkpoint file, acknowledgement state, model route, model-tier scheduler or automatic model switch. The choice is a one-time execution-cost affordance enabled by locked Authority and Final Gate protection; it is not acceptance evidence.

Post-lock revisions separate authority change from user decision while retaining exact identity, old-Authority continuity, compare-and-swap adoption, evidence invalidation and the complete Final Gate. Formally monotonic strengthening; raw Source/Context snapshot changes with unchanged locked Claims/targets/proof obligations; operational Runner/input/environment repair; repository-bound scope expansion; risk strengthening; and equivalent Counterfactual coverage with the same carrier, mutation and Check and no lost Claim/assertion-failure coverage auto-adopt. Product/Source Claim/target/external-confirmation changes, lost scenario/Claim/Evidence Capability/failure interception, forbidden or owner-Context removal, runner type/effect changes, verifier-kernel changes and unknown reasons are preview-only and require the exact revision identity; risk downgrade is rejected. `diagnose-revision` remains side-effect-free and can exercise eligible scope candidates, so withdrawn/replaced candidates coalesce in the same `delivery-contract.yaml` and never ask. The final pending decision begins with a plain-language Authority Revision introduction and separates `user_decision_reasons` from mechanically bounded changes. Present it first. An explicit current-task instruction that exactly covers every listed decision reason may be mechanically relayed without a second question; generic continue, blanket approval, recommendation or Agent inference does not count. Exact identity, previous-Authority continuity, evidence invalidation and the complete Final Gate apply to every adoption, which reports `delivery_completed_by_this_event: false`, returns to rolling implementation or repair and never means delivery completion.

```text
ty-context long-task init <workdir>
ty-context long-task preflight <workdir>
ty-context long-task compile <workdir>
ty-context long-task compile <workdir> --revise
ty-context long-task diagnose-revision <workdir> [--outcome <key>] [--check <key>]
ty-context long-task approve-authority-revision <workdir> --revision <sha>
ty-context long-task explain <workdir>
ty-context long-task verify <workdir> [--outcome <key>] [--check <key>] [--explain]
ty-context long-task status <workdir>
ty-context long-task resume <workdir>
ty-context long-task doctor <workdir>
ty-context long-task final-gate <workdir>
ty-context long-task stop-check <workdir> [--message <text>]
ty-context long-task close <workdir>
ty-context long-task abandon <workdir> [--force-corrupt-state]
```

Compact authoring omits only deterministic defaults and normalizes identically to the expanded form; full Context remains explicit and mandatory. `preflight` is a read-only aggregated closed-grammar Source/background and architecture obligation, REQ/CTRL field-and-relation closure, OBL/AC, atomic applicability, Population universe, target and blocker capability, per-method design record/primary-observation artifact, supported direct-literal verifier dependency, narrow semantic witness and repository check. Before first Authority Lock, Preflight and direct Compile both classify every HEAD-relative changed path as protected, expected change, allowed support, forbidden or unclassified; forbidden and unclassified paths block, so Compile cannot bypass Preflight. During first enable, only exact current package-asset files for configured managed destinations plus exact config/hook files are temporarily protected; managed directory roots and broad `.codex/**` are never exempt. Compile then generates Global plus Outcome Result/Requirement/Control-field/Control-relation/Non-completing/Technical Claims at exact applicability, rejects uncovered cells and makes the first successful formal Compile the Authority Lock. Every Compile result includes a lifecycle event, `delivery_completed_by_this_event: false`, `native_goal_effect: none` and a next action. The first Compile result emits `execution_model_checkpoint.required: true` plus its terminal-turn/explicit-choice contract; later Compile revisions emit `required: false`. Every later authority change still compares with active authority regardless of progress, Receipt/cache deletion or implementation restoration. Source/full Context/Product/Acceptance/Global/verifier content, resolved runners and recursively frozen verification inputs are frozen in the common-dir Active Authority V3 record.

`diagnose-revision` performs a side-effect-free candidate Compile and only exercises existing active Check identities whose runner/verifier authority is unchanged. Its output explicitly denies acceptance, Progress and pending-state writes. `compile --revise` auto-adopts mechanically bounded revisions; for a user-decision revision it emits `authority_revision_pending`, the exact decision id, deterministic material summary, `user_decision_reasons` and the self-contained human `decision_brief` before failing closed. Approving a different or stale id is rejected. Adoption emits `authority_revision_adopted` and returns to rolling execution rather than completion.

Targeted verify rechecks active task/revision/compiled/worktree identity and applies the same workspace categories against the immutable baseline before writing scoped Progress. `verify --explain` groups selected Main Raw Executions, lists applicable Counterfactual calls and declared retry bounds, but runs nothing and writes no Progress. Counterfactual Findings first enter the owning Check Result, invalidate an otherwise passed Check, clear Claim Proofs and remain visible in status/resume; Global Checks reuse the same Progress type without a Global Outcome state. Final Gate first rejects stale accepted inputs, then recompiles and hashes Contract/fragments, Source, full Controlling Context, verifier/runner, recursively frozen local dependencies, verification inputs and workdir inputs before and after all Checks; any protected-input or Active Authority race fails closed. Stop/close clear only the accepted identity through CAS. Commit, migration, clear and abandon share one active-state lock. `abandon --force-corrupt-state` is reserved for corrupt continuity or stale lock cleanup and preserves Contract, Source, Context and Git content.

`status` and read-only `resume` report the current fresh Final Receipt as `final_workflow_status` (or `null` after drift) plus the active Contract's complete `external_confirmations`. Their Frontier/next-action output is advisory verification/repair guidance; legacy `ready_for_implementation` is only a compatibility alias and never gates implementation order. `progress_passing` is targeted repair evidence rather than “Outcome complete”; `progress_stale` is a freshness fact rather than a current pass or immediate rerun command, and `final_workflow_status: null` means unfinished. Every accepted Stop emits one non-blocking terminal-scope `systemMessage`; external-pending results also name every confirmation. Final/Stop/close report `acceptance_scope: declared_machine_authority` and `native_goal_effect: none`; close also reports `closed_scope: machine_authority`. Before platform-native Goal completion, the Agent performs a veto-only Goal/user-to-Source conformance review that cannot create proof. `status: closed` means only that machine Authority was cleared, not that the native Goal or external delivery completed.

New authoring uses inline Outcomes. Existing `outcome_files` remains physical compatibility only and creates no semantic or completion boundary. A Long Task requires real Source, and every declared Source file contains at least one Material Item. Every Material Source Item is wrapped in the original Markdown with a non-rendering, uniquely keyed `ty-source-item:start/end` marker; at least one technical obligation has `aspect=architecture`. Other non-empty lines may occur only in the validated handoff or a closed-grammar Markdown-structure/provenance background block. Arbitrary background prose and unclassified, nested, overlapping, unclosed or empty sections fail closed. `control` is a first-class kind, marker keys and `source_claim` keys are set-equal, and statements are text-exact after limited whitespace normalization. Every non-decision Source item owns one same-kind, same-text canonical target and duplicate ownership fails. Outcome Source Acceptance maps to criterion-identical `<outcome>.<check>.<assertion>` with an independently Source-backed non-Result Claim; Global Source Acceptance maps to criterion-identical `GLOBAL.<check>.<assertion>`, proves no Outcome Claim and needs an independently Source-backed Global Claim. Typed dispositions keep Requirements, Controls, Acceptance, Results, Fact/Affected-Outcome Risk, Non-goals, External Confirmations and Decisions distinct; `out_of_scope` is retired. Complete syntactic ownership cannot prove that the user expressed every real requirement or that marked Source is factually accurate; those remain explicit upstream premises.

After Authority Lock, semantic/Product Claim/Acceptance/verifier-kernel changes and proof weakening require an exact user decision. Mechanically bounded implementation repairs and raw snapshot changes that preserve locked meaning auto-revise but still invalidate affected evidence. Pure package root/version relocation auto-revises; schema/hook byte changes do not. Contract and Check execution field policies prevent new fields from bypassing authority or raw-execution identity. Every path-bearing field uses one canonical grammar: Windows separators and one leading `./` normalize, while internal `.`/`..`, controls, absolute/drive/UNC paths and unsupported glob syntax fail closed.

Supported runners: `package_script`, `project_binary`, `node_oracle`, `playwright_test`. Package scripts require a recoverable static Node entry for formal acceptance.

Supported proof surfaces: `ui_browser`, `runtime_behavior`, `api_contract`, `data_state`, `security_boundary`, `population_coverage`, `implementation_structure`.

After a blocker-driven semantic or proof revision, only affected weak-observability or high-risk behavioral Claims receive a causal-boundary review. Evidence must reach the furthest independently failing declared boundary; when carrier existence can diverge from the claimed capability, use a capability-disrupting Counterfactual. This adds no product taxonomy, universal runtime suite, mutation type or persistent review state.

## Risk And Evidence

L0 local work stays on the default workflow. L1 standard long work uses the Delivery Contract. L2 strict is the minimum for public API/schema, persistent data, migration, security/permission boundaries, irreversible effects, full-population operations, or a critical path with weak observability. Strict proof binds to the affected Outcome; multi-repository delivery is rejected.

Users may raise risk to strict. Explicit `standard` below the computed floor fails. Strict negative, counterfactual, population, security, environment and rollback/recovery proof is compiler-enforced as applicable. Scope escape returns a `scope_escape` Finding for revision and recompilation in the same Goal.

Agent prose, a command exit code, handwritten state, historical targeted passes and missing/weak proof cannot create accepted. Evidence adapters derive from runner kind: only `playwright_json_v1` from `playwright_test` may prove `ui_browser`; other runners produce `structured_json_v2`. Every Outcome has a non-Result atomic Claim and all required surfaces must be non-empty, unique and covered. Each Claim-bearing Assertion proves exactly one Claim at one matching atomic applicability profile. Across every Check sharing one Raw Execution identity, a Claim-bearing Observation is unique to one Assertion. Playwright Claim evidence is only `playwright.case.<ac>.passed equals true`; `[ac:<key>]` binds one declared AC per Test, ordinary tags are ignored, and missing/skipped/flaky/unexpected/timed-out/interrupted/multi-AC/duplicate-per-project evidence fails closed while distinct projects aggregate all-of. Every behavioral Claim-bearing Assertion requires same-Check claim-local `replace_json_value` or `replace_text` sensitivity plus a claimless target-runtime liveness Assertion that remains passing; `replace_file` is compatibility-only. Population proves a bound universe exactly but never waives this witness. Structured Counterfactuals require exit zero; weak Playwright Counterfactuals may accept exit one only when every unexpected Test Instance is exactly a designated executed AC and no root/unbound/extra/timeout/interruption/flaky or other Evidence failure exists. Ordinary Playwright Baselines still require exit zero, and report/instance diagnostic observations cannot prove Claims. Unrelated Artifacts/Checks do not count. Claim/Population proofs are emitted only for a fully passed Check. Findings and Explain trace Source, canonical target, Claim/applicability, Assertion, required surfaces, Check, adapter, Observation and owner paths.

## Upgrade And Compatibility

```powershell
ty-context upgrade
ty-context sync
```

Version 0.6.0 retires V1 and the repo-local Hook. Development-period V2 Active Authority, Progress and Receipts are not migrated; doctor reports `manual_required`, and the operator upgrades the Contract before forming a new Authority Lock. Invalid JSON, marker/record mismatch or stale lock is never guessed from damaged record paths; doctor reports the explicit contained cleanup command `ty-context long-task abandon <workdir> --force-corrupt-state`.

Version 0.6.0 keeps the `long-task-delivery-v2` name and physical `outcome_files` parser form while defining the first public V2 semantics; development-period Drafts receive explicit migration diagnostics. Its former optional Source Plan helper and the additive execution-model checkpoint added no Schema, CLI, Preflight, Validator, Receipt, Authority or persisted model-routing state. Current releases send inputs directly into the Source-bound Contract Draft loop and keep the old entry only as a pointer. Preflight and direct Compile share one activation-safety validator.

After updating the package, run `ty-context upgrade`. Use `ty-context upgrade --check` first when you need a read-only plan.

Release metadata declares one update mode: `sync-only`, `upgrade-required` or `manual-required`. Upgrade plans report steps as `safe_pending`, `manual_required` or `blocked`. A `sync-only` release may use `sync`; `sync` does not run migrations. An `upgrade-required` release must run upgrade, while `manual-required` includes an explicit operator step.

## Verification

```powershell
npm run format:check
npm run typecheck --workspace project-tiny-context-harness
npm run build --workspace project-tiny-context-harness
npm run test:affected:list
npm run test:affected
npm run test:long-task:trust
npm run test:long-task-performance --workspace project-tiny-context-harness
npm test
npm run smoke:quickstart
npm run preview:pack
npm run launch:check
node packages/ty-context/dist/cli.js package check-source
make validate-harness
```

`test:affected` is the edit/fix loop. In inferred local discovery it reports and omits only untracked `.work_products/**`; tracked and explicit paths still route fail safe. `test:long-task:trust` is the frozen-candidate high-impact boundary gate used by pull-request CI. Reviewed Trust/focused/hotspot budgets prevent silent feedback-tier growth, while complete discovery remains exhaustive. `npm test` is the complete release regression retained on `main` and publish; do not rerun it after every small repair. Controlled Ubuntu CI uses generous per-suite catastrophic time ceilings, but local timing stays diagnostic. Explicit delivery-contract and complete Long-Task gates remain available as package workspace scripts.

The modularity gate is `ty-context check-modularity`. Scoped waivers require `owner`, `introduced_at`, `reason`, `tracking_issue` and `expiry_condition`.

The synchronized local preview tarball is named `project-tiny-context-harness-0.8.4.tgz`.

## Community And Further Reading

Feedback from real repositories is especially useful. Open an [adoption report](https://github.com/Seven128/project-tiny-context-harness/issues/new?template=adoption_report.yml) with the recovery problem and what remained unclear.

Early feedback and starter issues:

- Report a [Context recovery gap](https://github.com/Seven128/project-tiny-context-harness/issues/new?template=context_gap.yml) through `context_gap.yml`.
- Share results in the pinned [adoption reports issue](https://github.com/Seven128/project-tiny-context-harness/issues/4).
- Pick a starter issue: [demo](https://github.com/Seven128/project-tiny-context-harness/issues/5), [sample walkthrough](https://github.com/Seven128/project-tiny-context-harness/issues/6), [benchmark rerun](https://github.com/Seven128/project-tiny-context-harness/issues/7) or [launch FAQ](https://github.com/Seven128/project-tiny-context-harness/issues/8).
- Keep claims narrow: recovery evidence is useful; benchmark speedup claims need fresh Minimal Context benchmark runs.

Read the [roadmap](https://github.com/Seven128/project-tiny-context-harness/blob/main/docs/roadmap.md), [Benchmarking And Evidence](https://github.com/Seven128/project-tiny-context-harness/blob/main/docs/benchmarking.md), [comparison guide](https://github.com/Seven128/project-tiny-context-harness/blob/main/docs/comparison.md), [adoption guide](https://github.com/Seven128/project-tiny-context-harness/blob/main/docs/adopt-existing-repo.md), [agent surface recipes](https://github.com/Seven128/project-tiny-context-harness/blob/main/docs/agent-surface-recipes.md) and [FAQ](https://github.com/Seven128/project-tiny-context-harness/blob/main/docs/faq.md).

For concrete examples, see the [fresh-agent recovery walkthrough](https://github.com/Seven128/project-tiny-context-harness/blob/main/docs/examples/fresh-agent-recovery.md), [Minimal Context sample guide](https://github.com/Seven128/project-tiny-context-harness/blob/main/docs/examples/minimal-context-sample.md) and [browseable sample repository](https://github.com/Seven128/project-tiny-context-harness/tree/main/examples/minimal-context-sample). The longer argument is [Fresh coding-agent sessions need project memory, not more ceremony](https://github.com/Seven128/project-tiny-context-harness/blob/main/docs/articles/fresh-agent-project-memory.md).

## Honest Limits

Tiny Context does not create or restore a platform Goal, prove that every requirement was declared, guarantee bounded keyword search finds every synonym or indirect dependency, switch the host-selected model, provide a parallel mutation/delegation runtime, observe platform tokens/model calls, or own Git/PR/CI/deployment/human product confirmation. A platform Goal may use opaque implementation delegation, but Harness does not persist or accept it as evidence. The installed package verifier and Git metadata are trusted; external platforms own network isolation, and deliberate same-user/admin tampering remains outside the local threat model.

## License

MIT
