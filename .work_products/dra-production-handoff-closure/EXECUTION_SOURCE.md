# DRA Production-Handoff Closure — Execution Source And Recovery Index

Status: active implementation Source for the current native Goal.

This file is ordinary repository Source and a compaction-recovery index. It is not Context, Design Authority, a Delivery Contract, a Gate, a Registry, a workflow state, a readiness record or acceptance evidence. The current work uses the Default Workflow Contract. It must not enable or bootstrap `long-task-workflow`.

## 1. Immutable input index and authority order

Current authority order:

1. the user's current instruction;
2. S2 corrections and accepted audit findings;
3. S1 details not superseded by S2;
4. durable repository Context and Design Authority;
5. current code as implementation fact, never as authority for omitted intent.

Canonical inputs:

- **S1 — original implementation proposal**
  - historical non-resolvable locator: `attachment-provenance://a1cf06fd-5881-411a-bcca-7067c34efe77/pasted-text.txt`
  - line count at Goal creation: `1677`
  - SHA-256: `849F33E9D0EC60C28A531F9A683482E4DEB5500687CA9E2FBD92CE03AF8030F9`
- **S2 — Web GPT Pro audit response and corrected plan**
  - historical non-resolvable locator: `attachment-provenance://304e7440-f6fa-416b-933b-a3582acec71b/pasted-text.txt`
  - line count at Goal creation: `1277`
  - SHA-256: `CA4137FE4B3C0780C17B58826249F1B84E4EDFB936948CE12CDABE3D843A03C3`
- **S3 — this execution/recovery Source**
  - repository path: `.work_products/dra-production-handoff-closure/EXECUTION_SOURCE.md`
- **S4 — durable Context**
  - `project_context/global.md`
  - `project_context/architecture.md`
  - `project_context/context.toml`
  - `project_context/areas/harness-package.md`
  - owning contracts/areas indexed below
- **S5 — authoring instructions**
  - `.codex/skills/authoring/harness_package_design/SKILL.md` and its applicable references
  - `.codex/skills/context_development_engineer/SKILL.md` and `references/engineering-design-reasoning.md`

Repository baseline at Goal creation:

- branch: `main`
- commit: `86aba0fe5ded23bc9b80e0ee8af8cc0cc865f4f5`
- worktree: clean and equal to `origin/main`

The S1/S2 locators intentionally preserve provenance without a machine-specific user-home path; the native Goal objective retains the current-session lookup paths. If either attachment digest changes, stop treating this summary as sufficient and reread the changed input before further semantic edits. After compaction, reread this file and the specific canonical sections it indexes; do not reconstruct the plan from memory. The companion `RECOVERY_INDEX.md` records this file's current digest without creating a self-referential hash.

## 2. Required outcome

Strengthen the existing Design Resource Authoring (DRA) capability so a selected formal Web/App resource handoff carries two distinct closures:

1. canonical design-resource and observable-Fact closure; and
2. Source-bound technical implementation-feasibility input closure.

The second closure informs downstream Architecture Deliberation. It must not choose the production owner or final implementation strategy, must not become a second technical/architecture authority, and must not claim production conformance.

The complete intended chain is:

```text
Product/Surface/Screen Source + Design Authority + real technical Source
  -> DRA scope and intent
  -> Style Application Closure + Source-bound Substrate Observation
  -> exact per-component-family feasibility
  -> provider capability selection
  -> mature design candidate
  -> real render + Design Suitability
  -> revision only when a material defect exists
  -> user or explicitly delegated selection
  -> formal design-resource closure + technical-feasibility input closure
  -> selected canonical resources + Fact manifest + feasibility input + revised proposal
  -> Default Workflow or explicitly selected Long-Task
  -> Architecture Deliberation selects actual owner and strategy
  -> production implementation
  -> project-native current-candidate checks prove or qualify production conformance
```

## 3. Accepted audit findings that must all be closed

### P0

1. Do not introduce `design-resource-implementation-binding-v1` or any DRA-owned production binding. It would become a second technical/architecture authority.
2. Preflight may validate input integrity and declared feasibility only. It must never prove future production reuse, owner correctness, styling discipline, runtime behavior, visual fidelity, accessibility, tests or release readiness.

### P1

3. Add the new input compatibly to both strict V1 and Symbolic V2 shapes, parsers, validation, snapshot/projection and downstream normalization. Do not break the exact canonical equation `entry + dependency refs = target.resource_refs`.
4. Do not require a cosmetic revision. A first rendered candidate with no material Design Suitability finding may proceed directly to selection. A material finding requires the highest-impact issue, smallest patch, rerender and re-review.
5. Keep any visual comparison as an opt-in, non-admission DRA diagnostic. Do not create provider ranking, admission thresholds, publication blocking, automatic routing, a registry or another benchmark authority.
6. Keep portability/history cleanup separate in ownership and diff shape. Search only declared public/runtime/active surfaces and classify history/fixtures explicitly; never use an unconditional all-repository path scan or directory-name cleanup.

### P2

7. Do not persist `preflight_validated`, `planned`, `downstream_verified`, `implementation_verified` or another readiness state machine. `planned` is allowed only as an owner-candidate attribute described below.

### Additional hard correction from S2

DRA still cannot select the production owner or final strategy, but before formal generation it must read real technical Source and require every formal component-family cell for every target/condition to have at least one implementable candidate route or an explicit blocker. A provider preview or visual file alone is insufficient technical input.

## 4. Technical-feasibility Source model

Use ordinary Source schema name:

```text
design-resource-implementation-feasibility-v1
```

The schema/model is neither Authority, Contract, Gate, acceptance, binding ledger nor production result.

### 4.1 Top-level intent

The document binds:

- one strict schema version;
- repository-relative Source references and SHA-256 identities;
- target references matching the handoff;
- substrate observations;
- complete component-family cells over the declared target × condition scope;
- unresolved blockers and limitations;
- no exact visual values.

### 4.2 `substrate_observations`

Record only Source-backed observations needed for generation feasibility, including as applicable:

- platform;
- framework/runtime;
- UI system or component kit;
- token/theming adapter;
- component owner roots;
- routing/shell or host boundary when material;
- build/runtime constraints relevant to provider output;
- other bounded technical surfaces needed for the actual target.

Every observation has exactly one disposition:

- `observed`;
- `not_applicable`;
- `decision_required`;
- `unavailable`.

An observed row carries a bounded value and at least one current technical Source reference with path, locator and digest. `not_applicable` requires a reason. `decision_required` and `unavailable` remain blockers where the missing fact is required for a formal implementation profile. A stale technical Source digest fails closed.

### 4.3 `component_family_cells`

The required cell identity is exact component family × handoff target × declared condition. The cell set must equal the expected family/target/condition universe for the feasibility input. Arbitrary summaries such as “all components” or a single default condition cannot cover the remainder.

Each cell contains exactly one of:

- one or more `feasible_realizations`; or
- one or more explicit blockers.

Do not force one preferred realization. Multiple candidates and platform-specific candidates are legal.

Each feasible realization contains:

- stable key and candidate kind;
- ordered `strategy_steps`, using bounded actions such as `reuse_existing`, `compose_existing`, `extend_shared_component`, `theme_with_tokens`, `custom_shared_component`, or another explicitly admitted owner-local action;
- one or more primitive/component references, allowing multiple primitives;
- one or more owner candidates;
- supported customization surfaces;
- feasibility-basis Source references;
- observed risks/limitations.

An owner candidate is either:

- `existing_path`, with a current repository-contained owner path; or
- `planned_logical_owner`, with an explicit authorization Source reference.

`planned_logical_owner` means only that an authorized logical owner is a feasible candidate. It is not readiness, plan state, final owner selection or permission to bypass downstream Architecture Deliberation.

`required_realization` is null/absent by default. It may be non-null only when an independent technical Authority Source explicitly selects that exact realization for the exact target/condition/family. DRA or the feasibility file may not create that authority.

### 4.4 Value and closure separation

The feasibility file may reference Fact/component/condition identities, candidate routes, basis, risks and blockers. It must never copy exact visual values, tokens, CSS declarations, pixel values or Fact-owned expectations.

Canonical design closure remains exactly:

```text
canonical entry + canonical dependency refs = target.resource_refs
```

Handoff adds a separate `technical_feasibility_inputs` array. These inputs are intentionally excluded from:

- `resources`;
- `target.resource_refs`;
- `source_profile.dependency_resource_refs`;
- the Fact manifest and Handoff Indexed Facts;
- canonical runtime dependency closure;
- design-system lineage and exact-value ownership.

Do not add `source_profile.version`, `source_profile.profile_version` or a replacement profile model.

## 5. Representation and compatibility rules

- V1 (`design-resource-handoff-v1`) and explicit Symbolic V2 (`design-resource-handoff-v2`) both expose the compatible optional `technical_feasibility_inputs` index.
- Missing legacy field normalizes to `[]`.
- An old handoff still parses and preflights under its historical design-resource semantics, while reporting the limitation `technical feasibility not declared` (wording may be a stable machine diagnostic plus readable explanation).
- Legacy absence never silently upgrades the handoff to the new formal implementation-feasibility capability.
- New authoring of `implementation_web` or `implementation_app` requires a target-matching feasibility input.
- `reference` remains legal without feasibility input.
- V1 bundle and V2 direct preflight must use one shared feasibility model/validator so their semantics cannot drift.
- Snapshot/preflight reads each feasibility input by repository-relative path with current digest identity and safe containment/link handling consistent with existing resource snapshot owners.
- Formal parsing remains strict: unknown fields, duplicates, mismatched target refs and ambiguous identities fail closed.

Preflight may establish only:

- input existence, safe readable path, declared media/shape and digest;
- schema version and strict shape;
- target/ref/set closure;
- exact family × condition coverage;
- candidate-or-blocker closure;
- planned owner authorization;
- independent authority for a non-null required realization;
- validity of multi-primitive mappings;
- canonical-resource versus technical-input separation.

It must not claim:

- future reuse or actual production owner selection;
- absence of per-instance production styling;
- production route/component binding correctness;
- runtime reachability or behavior;
- visual, interaction or accessibility conformance;
- test/CI/deployment/release status.

## 6. Profile vocabulary

Retain/redefine the design-side profile meanings without implying production completion:

- `native_substrate`: the design-side component model corresponds to a real observed substrate; it remains a design artifact.
- `mapped_substrate`: the design carrier is independent, but every family/condition has one or more feasible mappings or explicit cost/blocker information.
- `reference`: complete technical feasibility is not claimed and formal implementation handoff readiness is unavailable.

If current implementation uses only `implementation_web | implementation_app | reference`, introduce any profile vocabulary only at its real owner and without changing the canonical resource equation. Do not use a single-screen HTML phone frame as a complete React Native/App handoff merely because it renders.

## 7. DRA authoring and quality loop

The commission must be quality-oriented while remaining task-local. Material fields include:

- product/surface/screen Source and real technical Source refs;
- scope, intent, platform/targets/conditions and exclusions;
- archetype and primary task/work object;
- explicit design challenges;
- desired visual character and visual character to avoid;
- real copy/data/content stress;
- reference roles (`exact-target`, `constraint`, `inspiration`, current implementation, background);
- design-side shared component-family reuse;
- substrate input refs and feasibility blockers;
- existing Style Application Closure.

“No per-instance styling” applies only to componentization of the design resource. It is not a production claim.

Provider choice is capability matching against the actual commission, including:

- target type/platform;
- screen/surface count;
- states/conditions;
- interaction requirements;
- ability to produce a real render;
- local/material revision support;
- canonical machine-readable Source acquisition;
- formal Fact handoff support;
- feasibility-input needs.

Use actual live capability evidence. Keep Direct Agent authoring legal when it satisfies the bounded need. Do not create a provider registry, remembered ranking table or automatic policy engine.

High-fidelity work requires at least one actual render and one current Design Suitability review. One Design Suitability umbrella includes, when applicable:

- scope and controlling Source;
- mechanical integrity;
- Design-System application;
- visual craft: composition, hierarchy, typography, rhythm, density and content realism;
- design-language coherence;
- distinctiveness without unsupported invention;
- design-side family reuse/componentization;
- technical feasibility;
- state/condition coverage;
- preservation obligations.

Grounded Source, mechanical, closure or feasibility defects may block. Subjective aesthetic findings inform candidate comparison and selection but do not select a design.

If the first rendered candidate has no material finding, it may proceed directly to the Review & Selection Stop. If a material finding exists, identify the highest-impact issue, make the smallest bounded patch, rerender and rerun applicable suitability checks. Do not force a revision count. For Open Design provenance, pin an immutable commit/tag/version instead of a floating `main` reference when relying on upstream behavior.

## 8. Downstream consumption boundary

### Default Workflow

Default work opens the selected resources, conditions and matching feasibility Source. Architecture Deliberation evaluates the candidates and selects the actual production owner/strategy under repository architecture. It creates no binding ledger. Implementation uses real production owners, followed by current-candidate project-native AST/lint/component/UI/route/visual/accessibility/runtime checks as applicable. Any required observation without a reliable project check is reported `Unverified`.

### Long-Task interoperability only

Do not change the Long-Task mechanism, add a binding schema or add a Gate. When a later user explicitly selects Long-Task:

- handoff/resources/manifest/feasibility file enter existing `task.source_paths` as Source;
- actual implementation choices use existing `outcome.technical.bindings` plus `surface_bindings.route_binding_ref` / `component_binding_refs`;
- only independently Source-backed `required_realization` constraints become mandatory Claims/Constraints;
- unavailable required technical observation remains External Confirmation or otherwise unclosed;
- current Final Gate remains the sole machine acceptance carrier;
- historical DRA/provider/preflight results never prove current production behavior.

## 9. Visual diagnostic boundary

If implemented, visual comparison remains one opt-in DRA diagnostic view under the existing delivery-benchmark owner. It may use representative cases, descriptive comparisons, a fixed input, a pinned provider/skill commit, randomized blinded order, repeats and explicit raw limitations.

It must not:

- add an admission aggregate or `2-of-3`, `4/5`, `70%` threshold;
- block publication or package release;
- rank providers or create a registry;
- automatically select a provider or design;
- claim statistical/general quality beyond the observed cases.

Any future durable routing policy requires a separate delivery-benchmark owner change with a frozen evaluator, order, baseline, threshold and expiry. This Goal does not create it.

## 10. Owner-scoped portability and history workstream

Treat portability/history as a separate workstream after the feasibility/handoff closure is independently coherent. Do not mix its findings into schema authority.

Search only:

- package guidance and public docs;
- executable runtime-resolved Source;
- active formal handoffs and active Contracts;
- current Context locators and source mappings;
- explicitly named migration inputs.

Classify historical Source, frozen fixtures, snapshots and migration examples by their real owner. A historical absolute path may remain when it is deliberately historical and never executed/resolved as current Source. Do not scan `git ls-files` and fail on every absolute-looking path. Do not delete or move any tracked `.work_products/**` content, fixtures or docs without proving writer/reader/migration/test/public-doc/lifecycle ownership. Cleanup is performed only by the exact creating owner and remains link/containment safe with explicit failure.

## 11. Must-block matrix

The implementation and tests must block at least:

1. new formal `implementation_web`/`implementation_app` authoring without a matching feasibility input;
2. a component-family/target/condition cell with neither candidate nor blocker;
3. incomplete, extra, duplicate or mismatched family/condition cells;
4. non-null required realization without matching independent technical Authority Source;
5. planned logical owner without authorization Source;
6. copied exact visual/Fact values in feasibility Source;
7. feasibility input included in canonical resources/dependencies/Fact closure;
8. a Web-only candidate represented as complete native app/React Native feasibility;
9. preflight language or data claiming production behavior/conformance;
10. a material visual defect passed to selection without required bounded repair/re-review;
11. provider capability mismatch;
12. stale or missing technical Source/input digest;
13. Long-Task relying on historical provider/preflight/project checks;
14. persistent readiness-state fields or a second binding/Gate/Registry;
15. blanket portability deletion or an unowned path policy.

## 12. Must-allow matrix

The implementation and tests must allow at least:

1. visual exploration with no feasibility file;
2. a first rendered candidate with zero material defects proceeding directly to selection;
3. multiple feasible candidates for one cell;
4. per-platform realization candidates;
5. one realization composed from multiple primitives;
6. an authorized planned logical owner;
7. reuse of an existing component/owner;
8. token/theming/variant realization;
9. truthful native-substrate, mapped-substrate and reference cases;
10. legacy handoff parse/preflight with an explicit limitation;
11. Direct Agent as provider when its live capabilities match;
12. production work with no reliable check reported as `Unverified`, never falsely accepted.

## 13. Repository owner index

Durable Context owners:

- DRA behavior: `project_context/areas/harness-package/contracts/design-resource-authoring.md`
- formal handoff boundary: `project_context/areas/harness-package/contracts/design-resource-handoff.md`
- Default/Long-Task carrier boundary: `project_context/areas/harness-package/contracts/workflow-contract.md`
- managed/package source ownership: `project_context/areas/harness-package/contracts/package-managed-surfaces.md`
- temporary/path lifecycle: `project_context/areas/harness-package/contracts/temporary-content-governance.md`
- verification routing: `project_context/areas/harness-package/verification.md`
- code ownership map: `project_context/areas/harness-package/implementation-index.md`
- DRA diagnostic benchmark: `project_context/areas/delivery-benchmark.md`
- on-demand routing: `project_context/context.toml`

Managed guidance owners:

- `.codex/ty-context-managed/skills/design-resource-authoring/SKILL.md`
- `references/resource-selection.md`
- `references/open-design-provider.md`
- `references/downstream-handoff.md`
- `references/formal-selected-web-app-handoff.md`
- new owner: `references/implementation-feasibility.md`
- Long-Task references only where source-consumption wording must align; no mechanism change.

Code owners to confirm against current implementation:

- a new owner-local feasibility type/shape/model/validation module family under `packages/ty-context/src/lib/`;
- V1 handoff types/strict shape/validation/file snapshot/bundle paths;
- Symbolic V2 types/strict shape/validation/resource/snapshot/projection paths;
- shared handoff parser and preflight output;
- Long-Task normalized handoff consumption only if needed to preserve Source visibility;
- affected-test selection and focused fixtures;
- managed source → package asset → workspace skill sync.

## 14. Architecture and quality constraints

Selected dependency direction:

```text
strict generic codecs/path+digest helpers
  -> implementation-feasibility strict model and validator
  -> V1/V2 handoff input indexes and preflight normalization
  -> Default/Long-Task downstream consumers
```

The feasibility model must not depend on Contract bindings or canonical Fact values. V1 and V2 wrappers may remain representation-specific but reuse one feasibility semantic validator.

Build / Reuse / Buy allowed set:

- reuse current strict codec, repository-path, no-follow snapshot and SHA-256 owners;
- add one bounded owner-local model for the genuinely new feasibility concept;
- reuse current V1/V2 normalization seams;
- intentionally avoid abstraction where V1/V2 representation semantics differ.

Selected approach: reuse the current infrastructure plus one bounded new model. No new runtime dependency is justified. Prohibited: duplicate technical bindings, general provider registry, copied Fact values, heavy external schema framework, path-owner bypass or a second preflight/acceptance Gate.

Quality obligations:

- correctness/invariants: exact sets, unique identities, source/digest authority and canonical/technical separation;
- maintainability/changeability: one semantic feasibility validator and small representation adapters;
- compatibility/migration: legacy absence normalizes to `[]` with an honest limitation;
- security/privacy/safety: repository-contained no-follow reads, bounded strict input, no secret/protected/raw visual-value copy;
- reliability/resource lifecycle: reuse current snapshot and explicit cleanup owners; no new daemon/state;
- performance/capacity/cost: avoid duplicating Fact/resource universes; make no runtime performance claim without measurement;
- operability/observability/testability: precise blocking and limitation diagnostics plus must-block/must-allow fixtures;
- architecture: downstream selection stays in Architecture Deliberation and existing bindings.

Known nearby debt to fix if touched: the explanatory `style_application` envelope must not encode `task-local-or-not-applicable` placeholders; emit only actual Source-derived projected fields. Do not opportunistically rewrite unrelated historical DRA material.

Forbidden shortcuts include changing V1 only, putting feasibility files in resource closure, calling preflight production proof, forcing a provider/revision, adding readiness fields, blanket path scanning/deletion, skipping current-candidate tests or using code as authority for a missing technical choice.

## 15. Execution sequence

1. Verify S1/S2 digests and recover from this Source if compaction occurred.
2. Read core/default/on-demand Context and DRA/handoff/code owners; run bounded Context search.
3. Publish one externally observable Architecture Deliberation and decide `Context Delta: required`.
4. Update the smallest durable Context owners before implementation code.
5. Add the feasibility schema/model/strict parser/validation and direct unit fixtures.
6. Add compatible `technical_feasibility_inputs` to V1 and V2, legacy normalization and limitation output while preserving exact canonical resource equality.
7. Integrate safe snapshot, bundle and preflight validation; add exact set/digest/separation/authority cases.
8. Update DRA commission, technical Source observation, capability matching, render/suitability, zero-defect exit, smallest-patch refinement and downstream consumption guidance.
9. Keep Long-Task changes to existing Source/binding vocabulary and freshness boundaries only.
10. Add or update optional diagnostic guidance without admission/ranking policy.
11. Run the separately scoped portability/history audit and change only proven active owners.
12. Sync managed source to package assets and installed workspace copies, rebuild, run focused and affected checks, then current full/package/parity/smoke gates required by changed owners.
13. Run Engineering Quality Conformance, Architecture Conformance and the separate Context drift check on the final candidate.

## 16. Verification and completion conditions

At minimum verify:

- TypeScript typecheck/build;
- focused DRA Skill/provider/handoff V1/V2 tests;
- new feasibility must-block/must-allow fixtures;
- legacy V1/V2 compatibility and limitation behavior;
- canonical resource equality unchanged;
- bundle/preflight/snapshot and stale-digest behavior;
- Long-Task source ingestion/binding compatibility without a new Contract field/Gate;
- managed/package/workspace byte parity and idempotent sync;
- affected-path selection;
- Context validation and harness validation;
- complete relevant package suites on the final candidate;
- pack/smoke/release checks required by package-surface changes.

Completion requires all of the following:

1. the 2 P0, 4 P1, 1 P2 and the extra source-bound substrate correction are closed;
2. feasibility is ordinary Source, not implementation authority;
3. every new formal implementation handoff has exact family × target × condition candidate-or-blocker closure;
4. canonical design-resource closure remains unchanged and separate;
5. V1 and Symbolic V2 implement the same compatible input semantics;
6. legacy handoffs remain readable/preflightable with an honest limitation;
7. DRA performs real-render Design Suitability and revises only for a material defect;
8. provider selection is live capability matching, not ranking state;
9. Default chooses actual production ownership in Architecture Deliberation and reports unverified proof honestly;
10. Long-Task interoperability uses existing Source/binding/Final-Gate owners only;
11. visual diagnostics remain opt-in, descriptive and non-admission;
12. portability/history changes are owner-scoped and preserve intentional history/fixtures;
13. current-candidate checks, architecture/engineering conformance and Context drift are reported without overclaim.
