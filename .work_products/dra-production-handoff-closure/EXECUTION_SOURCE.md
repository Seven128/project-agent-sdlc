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

## 17. S4 controlling amendment — remaining production-handoff closure

### 17.1 Identity, precedence and fixed baseline

This amendment is the durable execution projection of the user-provided plan titled `DRA Production-Handoff Closure 补开发方案`. It is S4 and has precedence over Sections 1–16 wherever it is stricter. The implementation baseline is fixed at Git commit `c46e1f59961e8735b2ac76d0534a1d0995f05323`.

The amendment closes the remaining 2 P0, 2 P1 and 1 P2 findings and, because they share the same false-completion boundary, also closes both adjacent defects:

- an unresolved substrate observation must create a real blocker;
- component-owner and route-owner roots must be verifiable current repository paths rather than arbitrary identifiers.

The existing independent feasibility Source, V1/V2 compatibility, canonical-resource separation and Long-Task Source ingestion remain in place. This amendment only closes the remaining chain from technical-feasibility input through the actual downstream selection to Long-Task machine completion authority.

The Single Goal is:

> Without adding a Design/Technical Authority, production Binding type, Gate, Registry, readiness state machine or independent workflow, make every formal Web/App target's `component family × target × condition` feasibility cell close uniquely and verifiably against the current Long-Task component Bindings; bind every blocker, planned owner and required realization to an exact marked Technical Source Item; conserve every transitive family-descendant Fact/Rule; prevent every feasibility free-text carrier from copying exact visual values; and keep Preflight/CLI wording from implying production conformance or release readiness.

No Long-Task workflow is created, enabled, resumed or used to execute this amendment. Long-Task is an affected interoperability and test surface only.

### 17.2 Architecture that must remain unchanged

The intended flow remains:

```text
Product / Surface / Screen Source
+ Design Authority
+ real Technical Source
  -> canonical design resources
     + design-resource-implementation-feasibility-v1
  -> Preflight: design input, technical Source, candidate-set and reference closure only
  -> Default Workflow / Long-Task selects actual production owner and realization
  -> project-native current-candidate checks
  -> Default Verified / Unverified or the sole Long-Task Final Gate
```

Do not add any production-binding schema, Contract field family, Claim type, Gate, Authority, readiness state, Provider Registry or DRA workflow. The feasibility file remains ordinary Source; canonical resources remain the sole owner of exact design values; actual route/component ownership remains in existing `technical.bindings`, `surface_bindings` and Architecture Deliberation.

### 17.3 Exact marked Technical Source Item authority

#### Locator extension

Add this strict locator member to `DesignResourceTechnicalSourceRecordV1.locator`:

```json
{
  "kind": "source_item",
  "value": "<marked Source Item key>",
  "text_sha256": "<current normalized Source Item SHA-256>"
}
```

Retain `whole_resource`, `json_pointer`, `markdown_anchor` and `source_anchor`. The following roles must use `source_item`:

- `planned_owner_authorization`;
- `technical_authority`;
- the authority basis of every feasibility blocker.

Ordinary substrate observations and capability basis may continue to use the existing locator kinds.

#### Strict decision projection

An authoritative marked Source Item carries one or more strict JSON comments of this form:

```html
<!-- ty-design-feasibility-decision-v1 {"schema_version":"design-resource-feasibility-decision-v1","mode":"required_realization","target_ref":"target.main","component_family_ref":"family.button","condition_scope_sha256":"...","realization_ref":"reuse-project-button"} -->
```

Use exactly one schema, `design-resource-feasibility-decision-v1`, with these three modes and fields:

```json
{
  "schema_version": "design-resource-feasibility-decision-v1",
  "mode": "required_realization",
  "target_ref": "...",
  "component_family_ref": "...",
  "condition_scope_sha256": "...",
  "realization_ref": "..."
}
```

```json
{
  "schema_version": "design-resource-feasibility-decision-v1",
  "mode": "planned_owner_authorization",
  "target_ref": "...",
  "component_family_ref": "...",
  "condition_scope_sha256": "...",
  "owner_locator": "planned-shared-button"
}
```

```json
{
  "schema_version": "design-resource-feasibility-decision-v1",
  "mode": "feasibility_blocker",
  "target_ref": "...",
  "component_family_ref": "...",
  "condition_scope_sha256": "...",
  "blocker_ref": "blocker.button-owner-missing"
}
```

The projection is not a new Technical Authority. Authority remains the conjunction of:

- the marked Source Item;
- the Source Item kind;
- the current digest of its Source file;
- the Source Item `text_sha256`;
- and, for Long-Task, the exact Source Claim.

Reuse the owner-local strict JSON, Source Item digest, unique-projection and exact-set pattern already used by `ty-dra-authority-v1` recovery. Do not build a generic projection/parser framework.

#### Applicability identity

Use one condition-scope identity:

- V1: SHA-256 of canonical JSON for lexicographically sorted `condition_refs`;
- V2: the current canonical compiled SHA-256 of `profile.region`.

The projection therefore binds actual applicability and is not weakened by renaming a profile key.

#### Preflight exact matching

For each referenced `planned_logical_owner`, Preflight requires exactly one projection whose mode, target, family, condition-scope digest and `owner_locator` all match.

For each non-null `required_realization`, Preflight requires exactly one projection whose mode, target, family, condition-scope digest and `realization_ref` all match. A `technical_authority` role label alone is insufficient.

Every blocker must reference at least one exact `source_item` technical Source record and have a matching `feasibility_blocker` projection.

#### Long-Task exact Source Claim

Remove path-only matching such as:

```text
claim.source_ref.split("#")[0] === source.path
```

Require exact equality:

```text
claim.source_ref = <source path>#<source item key>
```

Also require:

- the Source file is present in `task.source_paths`;
- the current Source Item `text_sha256` equals the feasibility declaration;
- a required-realization Source Claim enters the current Outcome Claim set or Global Constraint;
- the selected planned-owner authorization Source Claim enters the current Contract;
- no unrelated item, same-file Claim or path-only Claim can substitute.

### 17.4 Long-Task allowed-realization and existing-Binding closure

Derive `Feasibility Cell -> Existing Technical Binding Closure` ephemerally. It is not a Contract field and does not persist a selected realization.

Use only:

- `outcome.technical.bindings`;
- `surface_binding.component_binding_refs`;
- `surface_binding.route_binding_ref`.

Do not add `selected_realization_ref`, `component_family_binding` or `feasibility_binding`.

#### Candidate matching

An `existing_path` owner matches a Binding exactly when:

- `binding.existence = existing`; and
- either `binding.kind = file` and `binding.target = owner.locator`, or a `binding.carrier_paths` pattern matches `owner.locator`.

A `planned_logical_owner` matches exactly when:

- `binding.existence = planned`; and
- either `binding.key = owner.locator` or `binding.target = owner.locator`;
- and the exact planned-owner Source Item authorization from Section 17.3 is satisfied.

#### Deterministic selection per cell

For each cell, `matching realizations` is the set of feasible realizations for which at least one current component Binding matches an owner.

- With `required_realization`, the matching set must equal exactly that one realization; otherwise fail closed.
- Without `required_realization`, zero matches fails as `feasibility_realization_binding_missing`.
- Without `required_realization`, more than one match fails as `feasibility_realization_binding_ambiguous`.
- Exactly one match is the ephemeral actual Long-Task selection.

Multiple feasibility candidates remain legal. Uniqueness is required only when current Long-Task machine authority is compiled. The Default Workflow continues to select through Architecture Deliberation and reports its verification boundary honestly.

#### Bidirectional closure

Every `surface_binding.component_binding_refs` member must be consumed by at least one feasibility cell for the current target. Otherwise fail as `feasibility_component_binding_unattributed`.

One shared Binding may serve multiple condition cells for the same family or multiple families that each explicitly list that owner. An extra page-level or style Binding cannot pass merely because another legal component Binding exists.

`route_binding_ref` does not select a component-family realization, but its owner must be inside observed `route_owner_roots`. Every existing component-owner candidate and every matched existing component Binding must be inside observed `component_owner_roots`. Thus declared real substrate and actual Long-Task bindings use the same substrate boundary.

### 17.5 Feasibility blockers in the Long-Task completion boundary

Any current feasibility blocker means Source has not established a complete implementable path for that `family × target × condition`. A normal machine Claim cannot make an old blocker pass. Resolution requires updating technical Source, updating feasibility, removing or revising the blocker and rerunning Preflight/Compile.

Every blocker's exact marked Source Item must map through existing Contract carriers to one of:

- `decision_required`, which blocks Compile directly; or
- `external_confirmation`, where the exact Source Claim disposition references an existing External Confirmation with `blocks_target = true` and `impact_claims` containing the affected Claim for the current target.

Do not add a blocker schema. Reuse Source Claim, External Confirmation, target blocking and Final Gate.

A cell may contain both feasible realizations and blocker refs. The realization still must match one current component Binding uniquely, and every blocker must still reach `decision_required` or blocking External Confirmation. A partial candidate never suppresses a blocker.

While the corresponding blocking External Confirmation remains open, Final Gate cannot return `machine_accepted`. Historical Preflight, Provider results or DRA summaries cannot substitute.

### 17.6 Transitive component-family subject closure

Add one owner-local helper, `deriveComponentFamilySubjectClosure(...)`.

Seed it with:

- the component-family subject itself;
- every subject with `family_ref = family`;
- every subject with `instance_of_ref = family`.

Then repeatedly add every subject whose `parent_ref`, `instance_of_ref` or `override_of_ref` points at any current member until the set stabilizes. Use `visited` so malformed cycles terminate safely.

The resulting closure includes the family, instances, variants/overrides, Anatomy Parts, slot content, primitives, text, icons, media, assets and any other subject owned through the parent chain.

For V1, each cell's `design_fact_refs` must equal the complete Fact set for:

```text
transitive family subject closure × target × condition profile
```

For V2, the cell's Rule set must equal the complete intersecting Rule set for:

```text
transitive family subject closure × target × profile region intersection
```

In particular, an Anatomy Part whose `parent_ref` points to a component instance and whose `family_ref` is null must still be included. Missing it fails as `cell_design_fact_set_mismatch` or `cell_design_rule_set_mismatch`.

### 17.7 One exact-visual-value smuggling validator

Add one owner-local entry, `validateNoExactVisualValueCarriers(document)`, and use it for all feasibility human free-text fields:

- `substrate_observations[].reason`;
- `feasible_realizations[].observed_costs[]`;
- `feasible_realizations[].observed_risks[]`;
- `blockers[].description`.

Do not maintain separate regex/rule copies in multiple validators.

The validator must reject exact visual values including colors (Hex/RGB/HSL), `px`/`rem`, CSS declarations, CSS custom properties, font/size/spacing/radius/shadow/duration values and equivalent existing protected patterns. At minimum all of these fail:

```text
Use border-radius: 12px
Fallback color is #ffffff
Needs 16px padding
Could override --brand-color: red
Requires font-size: 14px
```

Do not scan SHA-256 values, repository paths, Source Item keys, logical primitive IDs, JSON Pointers or canonical design resources themselves.

### 17.8 Substrate observation and owner-root closure

Enforce observation kind/value-kind pairs:

- `platform`, `framework_runtime`, `ui_system`: `identifier` only;
- `component_owner_roots`, `route_owner_roots`: `repository_paths` only;
- token/theming adapter: `identifier` or `repository_paths`.

Every repository path must be repository-relative, currently exist, remain contained under no-follow validation and satisfy the declared value-kind rules. Every component/route owner root must be a directory; a symlink or junction is invalid. Arbitrary identifiers such as `components` or `routes` cannot stand in for roots.

Every observation whose status is `decision_required` or `unavailable` for a formal implementation target must have at least one affected feasibility cell referencing a Source-backed blocker. A declaration such as `ui_system = unavailable` cannot coexist with every cell claiming complete implementability and no blocker. `not_applicable` requires a non-empty reason but no blocker.

### 17.9 CLI and human-visible semantics

Keep the existing Preflight JSON field `status: ready` for compatibility. It means only that validation completed successfully; add no new status values.

Replace human wording `Design resource handoff ready` with:

```text
Design resource handoff preflight valid
Input closure: valid
Technical feasibility inputs: N
Technical feasibility cells: N
Technical feasibility blockers: N
Limitations: ...
Production conformance: not evaluated
```

Bundle wording becomes:

```text
Design resource Source bundle published
Production readiness: not evaluated
```

A structurally valid input with limitations or blockers still exits zero. Structural or closure validation failure exits nonzero. Add no warning/readiness state machine. Publishing a bundle that honestly contains blockers does not mean the target is implementable.

### 17.10 Code ownership and bounded new modules

Modify the current feasibility model owners under `packages/ty-context/src/lib/`:

- `design-resource-implementation-feasibility-types.ts`;
- `design-resource-implementation-feasibility-shape.ts`;
- `design-resource-implementation-feasibility-shape-sections.ts`;
- `design-resource-implementation-feasibility-model.ts`;
- `design-resource-implementation-feasibility-validation.ts`;
- `design-resource-implementation-feasibility-validation-document.ts`;
- `design-resource-implementation-feasibility-validation-cells.ts`;
- `design-resource-implementation-feasibility-validation-realizations.ts`;
- `design-resource-implementation-feasibility-validation-facts.ts`;
- `design-resource-implementation-feasibility-validation-support.ts`.

Add `design-resource-implementation-feasibility-source-decision.ts` only for source-item locator handling, Source Item loading, `text_sha256`, strict `ty-design-feasibility-decision-v1` parsing, condition-scope digest and exact planned-owner/required-realization/blocker projection matching. Do not put those responsibilities in the main validator or expose the internal parser publicly unless an existing real public call requires it.

Modify Long-Task interoperability only in the existing owners:

- `long-task-design-resource-handoff.ts`;
- `long-task-design-resource-method-binding.ts`.

If needed, add `long-task-design-feasibility-binding.ts` only for ephemeral cell→realization→current Binding and blocker→exact Source Claim/External Confirmation validation. It must not define a Contract type.

Modify CLI wording in `packages/ty-context/src/commands/design-resource.ts`. Synchronize public types/exports in `packages/ty-context/src/index.ts` and `public-types.ts` only when existing public boundaries require it.

### 17.11 Durable Context and DRA Skill impact

Update only the existing Context roles:

- `contracts/design-resource-authoring.md`;
- `contracts/design-resource-handoff.md`;
- `contracts/workflow-contract.md`;
- `implementation-index.md`;
- `verification.md`.

Record exact marked Technical Source Item authority, Long-Task allowed-set derivation, blocker target-blocking behavior, family transitive closure and Preflight wording. Add no Context role.

Update the canonical DRA owner under `.codex/ty-context-managed/skills/design-resource-authoring/`, especially:

- `SKILL.md`;
- `references/implementation-feasibility.md`;
- `references/formal-selected-web-app-handoff.md`;
- `references/downstream-handoff.md`;
- `references/open-design-provider.md`.

Then synchronize `.codex/skills/design-resource-authoring/**` and `packages/ty-context/assets/skills/design-resource-authoring/**` through the existing source-mapping owner and retain byte parity.

### 17.12 Required tests

#### A. Technical Source Item authority

Must block:

1. `technical_authority` uses an ordinary `source_anchor` rather than a marked Source Item.
2. Source Item key is absent.
3. `text_sha256` is stale.
4. Source Item kind is wrong.
5. projection mode is wrong.
6. target differs.
7. family differs.
8. condition-scope digest differs.
9. realization ref differs.
10. only an unrelated same-file Source Claim exists.
11. Source Claim matches only path, not `path#item-key`.
12. a planned owner has no exact authorization projection.
13. a blocker has no exact blocker projection.

Must allow:

- multiple non-conflicting exact projections in one marked Source Item;
- different Source Items in one technical file authorizing different families;
- planned-owner authorization without forcing selection;
- a required realization backed by one exact technical decision Source.

#### B. Long-Task allowed set

Must block:

1. `required_realization = null` and the actual Binding belongs to no candidate.
2. two candidates both match current Bindings.
3. required realization does not match the current Binding.
4. a component Binding is consumed by no cell.
5. an existing owner Binding is outside component-owner roots.
6. the route Binding is outside route-owner roots.
7. a planned-owner Binding exists but its authority Source is absent from `task.source_paths`.
8. an exact authority Source Item lacks the exact Source Claim.

Must allow:

- multiple feasibility candidates with one uniquely matching current Binding;
- one shared Binding for multiple condition cells of one family;
- one shared owner explicitly allowed by multiple families;
- V1 and Symbolic V2 through the same derived algorithm;
- both existing and planned owner routes;
- a composite realization with multiple primitives carried by one shared owner Binding.

#### C. Blockers

Must block:

1. a blocker-only cell has no Source Claim.
2. the blocker Source Claim is a normal completing Claim.
3. referenced External Confirmation is absent.
4. `blocks_target = false`.
5. impact Claims omit the current target's affected Claim.
6. a candidate and blocker coexist but the blocker is ignored.
7. blocker Source Item digest is stale.

Must allow:

- blocker mapped to `decision_required`;
- blocker mapped to a target-blocking External Confirmation;
- successful Compile after technical Source revision removes the blocker.

#### D. Transitive family closure

Build `component_family -> component_instance -> anatomy_part -> text` plus an asset, with descendant `family_ref = null`. Prove complete V1 Facts pass; missing Anatomy Part or Asset Facts fail; missing intersecting V2 Rule fails; and an anomalous cycle terminates through `visited` and fails safely rather than looping.

#### E. Exact visual values

Parameterize all four free-text field families across Hex, RGB/HSL, pixel/rem, CSS declaration, CSS custom property, motion duration and shadow values. Every carrier must fail.

#### F. Observations and roots

Must block component roots represented as identifier, absent roots, file roots, symlink/junction roots, candidate owners outside roots, unavailable observation without a blocker, and decision-required observation combined with full unblocked implementability.

Must allow token adapter as identifier or repository path, route `not_applicable` for a component workbench with reason, and multiple valid component roots.

#### G. CLI

Human output must not contain `handoff ready`, `production ready` or `accepted`; it must contain `preflight valid`, `Technical feasibility blockers` and `Production conformance: not evaluated`. JSON output remains compatible.

### 17.13 Mandatory regression preservation

After the amendment, rerun and preserve:

- the complete default affected suite;
- the complete Long-Task suite and all critical sentinels;
- V1 embedded and manifest-backed paths;
- Symbolic V2;
- bundle and CLI;
- legacy limitation behavior;
- canonical resource equality;
- source parity and managed/package/workspace parity;
- active-source portability;
- affected-test selection;
- existing visual-diagnostic and portability positive behavior.

V1 and V2 continue to share one feasibility validator, and canonical resource equality remains untouched.

### 17.14 Implementation order and release boundary

1. Append this S4 amendment to S3 and update `RECOVERY_INDEX.md` with the new digest; do not create a third plan document.
2. Update owning Context first for Source Item authority, allowed-set closure, blocker completion effect, family closure and Preflight wording.
3. Implement Source Item locator, strict parser, digest, projection matcher and direct unit tests.
4. Implement transitive family closure before Long-Task integration.
5. Implement Long-Task candidate matching, ambiguity, unattributed Binding, exact Source Claim and blocker External Confirmation closure.
6. Add one exact-value validator and one observation/root validator rather than duplicate rules.
7. Correct CLI human wording without changing JSON compatibility.
8. Sync Skills, Context, docs and release packet. Because `0.8.17` is not published and no GitHub Release exists, keep version `0.8.17` and update that release packet rather than bumping to `0.8.18`.
9. Run all full verification once on the frozen final candidate. Any later code, Context, Contract-fixture or release-document change invalidates the affected result and requires rerun.

Do not npm publish or create a GitHub Release.

### 17.15 Completion theorem

For every formal implementation target `T` and every feasibility cell `C`, completion requires:

```text
C target/family/condition scope is complete and exact
AND C binds the complete V1 Facts or intersecting V2 Rules
AND (
  C has no blocker
  AND the current component Bindings uniquely match one allowed realization
)
OR (
  every C blocker is exactly bound to a marked Technical Source Item
  AND enters decision_required or target-blocking External Confirmation
)
AND every planned-owner authorization comes from an exact Source Item projection
AND every required realization comes from an exact Source Item projection
AND every component Binding is attributed to at least one cell
AND canonical design values do not enter feasibility
AND Preflight states only input closure
AND only project-native current-candidate evidence proves production implementation
```

The Boolean grouping above is interpreted with the global conjunctions applying to both blocker and non-blocker branches. A candidate-plus-blocker cell must satisfy both unique realization derivation and blocker handling as specified in Section 17.5.

### 17.16 Explicitly non-blocking, unverified external scope

These are not machine-development completion conditions:

- live Open Design discovery smoke;
- actual multi-route visual comparison;
- npm publish;
- GitHub Release;
- real-project production adoption of `0.8.17`.

The final report must still distinguish:

- mechanism implementation and machine constraints: verified when the declared checks pass;
- actual Open Design visual-quality improvement: unverified;
- real-project production effect: unverified.

### 17.17 Required final handoff shape

Only after all current-candidate checks pass may the handoff state:

```text
Implementation:
- exact technical Source Item decision projection implemented
- Long-Task allowed-realization closure implemented
- feasibility blocker completion boundary implemented
- transitive component-family Fact/Rule closure implemented
- complete feasibility prose visual-value protection implemented
- CLI preflight wording corrected

Verification:
- affected/default: all passed
- Long-Task: all passed
- critical sentinels: all passed
- V1/V2/bundle/legacy/CLI: all passed
- format/typecheck/build/validate-harness/parity/portability/pack/smoke: all passed

Engineering / Architecture Conformance:
- no second Design or Technical Authority
- no new Contract binding type
- no new Gate, Registry, state machine or workflow
- canonical design closure unchanged
- feasibility remains ordinary Source
- Long-Task sole Final Gate unchanged

Not verified:
- Live Open Design visual-generation quality
- multi-route visual diagnostic results
- real product adoption

Context Delta: required
```

This amendment is complete only when the prior Long-Task false-completion paths are actually rejected without turning DRA into a technical architecture selector or production acceptance system.

## 18. S5 controlling final amendment — final production-handoff closure

S5 is the final controlling amendment for this delivery. It is appended under the native Goal and default Workflow Contract; it does not activate `long-task-workflow`, create a third plan, or become Design/Technical Authority, Contract, Gate, state, Registry, readiness evidence or acceptance evidence.

- immutable source: `attachment-provenance://452528f5-e136-4b6a-a205-88532d3b9480/pasted-text.txt`
- source identity at Goal creation: 1320 lines; SHA-256 `1BDAE56602A375EDBCD9845368DD2834B344786AC5F83ACEAE115E623EB64713`
- fixed implementation baseline: commit `749aef74525368f63f45dbb24890b2547131c0b5`; tree `bcf3b2cbc878b980177a57ed5879d20b83fb453a`; package `project-tiny-context-harness@0.8.17`
- authority: current user instruction, then this exact S5 block, then S4/S3/S2/S1 where not superseded

The controlling amendment follows verbatim between the provenance markers.

<!-- S5-CONTROLLING-AMENDMENT:BEGIN -->
# DRA Production-Handoff Closure 最终补开发方案

## 一、结论与固定范围

本次以当前 `main` 的：

```text
base: 749aef74525368f63f45dbb24890b2547131c0b5
tree: bcf3b2cbc878b980177a57ed5879d20b83fb453a
package: project-tiny-context-harness@0.8.17
```

为固定开发基线。当前提交仍是 `c46e1f59` 的单一直接后继，没有混入其他提交。 当前包版本为 `0.8.17`。

这次只处理：

1. Binding 内全部路径对 owner roots 的严格包含关系；
2. unresolved substrate observation 与 blocker 的精确因果绑定；
3. blocker-only target 的完整 Long-Task Compile 和 Final Gate 路径；
4. 技术时间成本被误判为视觉值的问题；
5. 与上述四项同源的 planned owner、mixed target、legacy handoff 和完整主链回归。

不再次改造 DRA 主架构。

## Single Goal

> 在不新增第二套 Design/Technical Authority、生产 Binding 类型、Contract 字段族、Claim 类型、Gate、Registry、状态机或工作流的前提下，使正式设计 handoff 中的每一条实际生产 Binding 都完全落在真实 owner roots 内，使每个 unresolved substrate observation 精确进入所有受影响 cell 的 blocker，并使 blocker-only target 能通过完整 Long-Task Compile 进入现有阻断完成边界，同时修复技术时间成本的 must-allow 误阻。

---

# 二、开始前的硬条件

开发开始前重新 fetch，并报告：

```text
HEAD
main
origin/main
merge-base
ahead/behind
working tree
package version
npm 0.8.17 是否已经发布
GitHub v0.8.17 tag / Release 是否存在
```

只有以下条件同时成立才按本方案继续：

```text
当前 main 完整包含 749aef74525368f63f45dbb24890b2547131c0b5
working tree 无无关修改
0.8.17 尚未 npm publish
v0.8.17 尚未成为已发布协议
```

如果 `0.8.17` 已经发布，不能原地改变 `design-resource-implementation-feasibility-v1` 的严格含义；应停止本次原地修订并切换到兼容升级方案。根据当前交接事实，本次预期继续保持 `0.8.17`，不额外增加版本。

继续使用现有：

```text
.work_products/dra-production-handoff-closure/EXECUTION_SOURCE.md
.work_products/dra-production-handoff-closure/RECOVERY_INDEX.md
```

在 `EXECUTION_SOURCE.md` 追加一次最终 Amendment，不创建第三份并行开发方案或新的 Authority。

---

# 三、不可改变的架构边界

补开发完成后仍保持：

```text
DRA
→ canonical design resources
  + ordinary feasibility Source
→ preflight 证明输入闭合
→ Default / Long-Task 选择实际实现
→ 项目原生检查证明当前生产候选
```

必须保留：

* canonical design resources 独占精确视觉值；
* feasibility 仍然是普通 Source；
* DRA 只枚举可实施候选和 blocker；
* 实际 owner 仍由现有 `technical.bindings` 与 `surface_bindings` 持有；
* Default Workflow 仍由 Architecture Deliberation 选择实现；
* Long-Task 仍只有一个 Source/Contract/Authority/Final Gate；
* Preflight 不证明生产复用、生产渲染、测试通过或发布就绪；
* 不新增 `selected_realization_ref` 或 feasibility 专用 Contract Binding。

当前实现已经通过现有 `technical.bindings`、`surface_bindings` 和 design handoff consumer 接入 Long-Task，本次只补强派生验证，不改 Contract 模型。

---

# 四、P0-1：Binding 的每一条路径都必须属于 owner roots

## 1. 当前错误

当前实现把 Binding 的：

```text
target
+
carrier_paths
```

放在一起，只要其中任意一条路径看起来位于 root 内，就认为整个 Binding 合法；通配符判断也只是截取第一个通配符前的静态前缀。

这会允许：

```yaml
target: src/components/Button.tsx
carrier_paths:
  - src/components/Button.tsx
  - src/features/order/OrderButtonOverride.tsx
```

在 `component_owner_roots = ["src/components"]` 时通过。

项目已有 `proveRepositoryPatternSubset`，能够明确返回：

```text
proven_subset
not_subset
unknown
```

应直接复用，而不是继续维护简化前缀算法。

## 2. 新验证定理

对每个 component 或 route Binding：

```text
Binding 的每一个实际路径 carrier
都必须被证明是至少一个 observed owner root 的子集
```

即：

```text
∀ path ∈ bindingPathUniverse:
  ∃ root ∈ observedRoots:
    proveRepositoryPatternSubset(path, root/**) = proven_subset
```

`not_subset` 和 `unknown` 都 fail closed。

## 3. 按 Binding kind 处理

### `kind: file`

需要检查：

```text
binding.target
每一条 binding.carrier_paths
```

`target` 作为精确 repository path，`carrier_paths` 作为 repository patterns。

### `kind: path_glob`

需要检查：

```text
binding.target pattern
每一条 binding.carrier_paths pattern
```

### `kind: verified`

`target` 是逻辑标识，不作为路径检查。

但：

```text
每一条 carrier_paths
```

仍必须是 owner root 的 `proven_subset`。

### `existence: planned`

planned 不豁免路径约束。

planned Binding 必须声明至少一条计划中的 repository carrier pattern，并且所有 carrier 都在 observed component root 内。不能继续以空 `carrier_paths` 作为完整 Long-Task 正向路径。

## 4. Root disposition 规则

### Component roots

正式 target 中只要存在任意 candidate-bearing cell：

```text
component_owner_roots 必须为 observed
value.kind 必须为 repository_paths
paths 必须非空且均为当前真实 no-follow 目录
```

不能使用：

```text
not_applicable
decision_required
unavailable
```

同时又声明完整可实施 candidate。

如果 component roots 尚未确定，该 cell 必须进入 blocker 路线。

### Route roots

任何进入 Long-Task `surface_binding` 的 target 都有现有 `route_binding_ref`，因此 Long-Task 消费时：

```text
route_owner_roots 必须为 observed 且非空
```

DRA 单独生成不带 route 语义的 component workbench 时仍可使用 `not_applicable`；但它不能在缺少 route authority 时被包装成已闭合的 Long-Task product surface。

### Blocker-only component target

当所有 cell 都是 blocker-only 且没有 component Binding 时，允许 `component_owner_roots` 保持 unresolved，并由对应 blocker 承载。

但 route Binding 和 route roots 仍须闭合。

## 5. 删除旧算法

删除或停止使用：

```text
pathOrPatternWithinRoots
staticPrefix
.some(any-path-inside)
```

统一改成一个 owner-local helper，例如：

```ts
proveBindingPathUniverseWithinObservedRoots(...)
```

它返回首个不可证明路径及 `proveRepositoryPatternSubset` 的原因，方便失败定位。

## 6. 必须冻结的反例

### Must-block

```text
target inside + one carrier outside
one carrier inside + one carrier outside
target outside + carrier inside
planned binding carrier outside
verified binding carrier outside
src/components*/** against src/components
src/components-legacy/** against src/components
pattern containment = unknown
candidate-bearing cell + component roots not_applicable
Long-Task route binding + route roots not_applicable
```

### Must-allow

```text
src/components/Button.tsx against src/components/**
src/components/** against src/components/**
多个 carrier 全部位于同一 root
多个 carrier 分别位于多个已声明 root
planned carrier 位于 observed component root
verified binding 的逻辑 target + 合法 carrier
共享 component binding 被多个明确允许它的 cell 使用
```

---

# 五、P0-2：Unresolved observation 必须精确绑定到相关 blocker

## 1. 当前错误

当前验证只检查：

```text
存在 unresolved observation
且整个文档一个 blocker 都没有
→ 失败
```

只要任意 cell 中存在任意 blocker，所有 unresolved observation 就会被视为已处理。

当前 blocker 也没有保存它具体承载了哪个 substrate observation。

## 2. 扩展 blocker 严格结构

在 `DesignResourceImplementationFeasibilityBlockerV1` 中增加必填字段：

```yaml
substrate_observation_refs:
  - platform
  - ui_system
```

该数组：

* 可以为空，用于与 substrate observation 无关的普通技术 blocker；
* 必须唯一；
* 使用现有 observation kind 枚举；
* 解析后按 canonical 顺序归一化。

由于 `0.8.17` 尚未发布，本次直接修正未发布的 `design-resource-implementation-feasibility-v1`，不为了临时内部版本新增 V2。

## 3. Source Item projection 同步扩展

`feasibility_blocker` projection 增加同一集合：

```html
<!-- ty-design-feasibility-decision-v1 {
  "schema_version":"design-resource-feasibility-decision-v1",
  "mode":"feasibility_blocker",
  "target_ref":"target.main",
  "component_family_ref":"family.button",
  "condition_scope_sha256":"...",
  "blocker_ref":"blocker.ui-system",
  "substrate_observation_refs":["ui_system"]
} -->
```

严格要求：

```text
blocker JSON 中的 substrate_observation_refs
=
marked Source Item projection 中的 substrate_observation_refs
```

不能只靠 blocker 描述文字推断。

当前 strict projection parser、Source Item digest 和 exact canonical comparison 已经存在，本次只扩展 `feasibility_blocker` mode 的精确字段。

## 4. Observation 的影响范围

本次不增加 observation applicability 子系统。

当前六类 substrate observation 都按 target-wide 技术事实处理：

```text
platform
framework_runtime
ui_system
token_theming_adapter
component_owner_roots
route_owner_roots
```

因此，对于每个 disposition 为：

```text
decision_required
unavailable
```

的 observation，必须满足：

```text
每一个 material family × condition cell
至少引用一个明确包含该 observation kind 的 blocker
```

这是保守但确定的规则，避免再增加一套 observation-to-cell 作用域 Registry。

如果以后有真实案例证明某项 substrate observation 只影响部分 family，再以独立反例设计更窄 schema；本次不提前扩张。

## 5. 完整校验规则

### 每个 unresolved observation

```text
必须被每个 material cell 的至少一个 blocker 覆盖
```

否则：

```text
unresolved_substrate_observation_cell_uncovered
```

### 每个 blocker 中的 observation ref

其引用的 observation 当前必须是：

```text
decision_required
或
unavailable
```

如果 observation 已变成：

```text
observed
not_applicable
```

则 blocker 已过期，必须失败：

```text
blocker_substrate_observation_not_unresolved
```

### 无 component family 的 target

若 target 没有任何 component family，却存在 unresolved target-wide substrate observation，则当前 family-scoped blocker 模型无法表达其影响。

必须 fail closed：

```text
unresolved_substrate_without_family_carrier
```

不能因为 cell 集合为空而真空通过。

### 一个 blocker 可以覆盖多个 observation

允许：

```yaml
substrate_observation_refs:
  - ui_system
  - component_owner_roots
```

但 projection 和当前 unresolved 集合必须精确一致。

## 6. 必须冻结的反例

### Must-block

```text
platform unavailable，但只有 route-owner blocker
unresolved observation 只在一个 condition cell 被覆盖
一个 family 被覆盖，另一个 family 未覆盖
blocker 引用 observed observation
blocker 引用 not_applicable observation
projection observation set 与 blocker 不一致
重复 observation ref
没有 component family，但存在 unresolved observation
```

### Must-allow

```text
一个 blocker 同时承载多个 unresolved observations
每个 cell 使用独立 blocker 承载同一个 target-wide observation
普通非-substrate blocker 使用空 observation_refs
candidate + blocker 并存且 blocker 因果绑定完整
多个 unresolved observations 被所有 cell 完整覆盖
```

---

# 六、P1：Blocker-only 必须走通完整 Long-Task Compile 与 Final Gate

## 1. 当前局部闭合问题

当前 feasibility consumer 已能识别 blocker-only cell，并跳过 realization 选择。

但通用 UI Surface 结构校验仍无条件要求：

```text
component_binding_refs 非空
```

而结构校验在 design handoff 的 Source-aware 验证之前运行。

因此不能再只测试 `createLongTaskDesignHandoffConsumer`；必须让完整 `compileDeliveryContract` 路径成立。

## 2. 不修改 Contract Schema

仍然使用：

```yaml
component_binding_refs: []
```

表示当前确实没有可声明的生产 component owner。

不增加：

```text
blocked_component_binding
placeholder_binding
pending_binding
selected_realization
```

## 3. 增加仅限验证器调用期的 deferred exception

给 UI Surface 结构验证增加一个非持久化调用参数，例如：

```ts
allowDeferredDesignComponentBindingClosure: boolean
```

规则：

### 默认调用

`validateDeliveryContractStructure()` 默认仍然严格：

```text
component_binding_refs 为空
→ 失败
```

### 完整 Activation / Compile 调用

`validateContractForActivation()` 在同一完整验证调用中允许：

```text
surface 有 design_targets
+
component_binding_refs 为空
→ 暂时延后到 design feasibility validator
```

这只是同一 Compile 内的验证顺序协调，不是状态或新工作流。

`collect` 与 `fail_fast` 两条路径必须使用同一设置。

## 4. Source-aware 最终闭合

在 `validateLongTaskDesignFeasibilityBindings()` 中：

### 无 feasibility document

```text
component_binding_refs 为空
→ 必须失败
```

错误：

```text
componentless_surface_requires_blocker_only_feasibility
```

因此 legacy handoff 不能利用 deferred exception。

### 有 candidate-bearing cell

```text
component_binding_refs 必须非空
每个 candidate-bearing cell 必须唯一推导 realization
所有 component binding refs 必须反向归属
```

### 所有 cell 都是 blocker-only

允许：

```text
component_binding_refs = []
```

但必须同时满足：

```text
所有 cell 都没有 feasible_realizations
所有 cell 至少一个 blocker
所有 blocker 精确绑定 Source Item projection
所有 blocker 进入 decision_required
或 target-blocking External Confirmation
route binding 仍存在并位于 observed route roots
```

### 部分 candidate-bearing、部分 blocker-only

```text
component_binding_refs 仍必须存在
candidate cells 完成唯一 realization 推导
blocker-only cells 完成阻断边界
```

### blocker-only 却声明 component Binding

由于没有 candidate 可以消费它，继续通过现有：

```text
feasibility_component_binding_unattributed
```

失败，防止虚假 production owner。

## 5. Final Gate 路径

至少建立三个完整集成用例。

### External Confirmation

```text
blocker-only feasibility
+
component_binding_refs = []
+
精确 external_confirmation Source Claim
+
blocks_target = true
+
impact_claims 覆盖当前 target
```

要求：

```text
compileDeliveryContract 成功
Final Gate 不能 machine_accepted
保留现有 external-pending / externally pending 结果
```

### Decision required

```text
blocker-only
+
精确 decision Source Claim
```

要求：

```text
Compile 直接失败
```

继续复用现有 `decision_required` 语义。

### 缺少真实阻断边界

以下全部必须 Compile 失败：

```text
没有 Source Claim
ordinary claim 代替 blocker disposition
External Confirmation 不存在
blocks_target = false
impact_claims 不包含当前 target
Source Item digest 过期
不相关 Source Item
```

## 6. Planned owner 完整 Compile 回归

当前 planned owner 正向测试不能只调用局部 consumer。

增加完整路径：

```text
planned logical owner
+
精确 planned_owner_authorization
+
existing task.source_paths / exact Source Claim
+
planned technical binding
+
至少一个位于 observed component root 内的 planned carrier pattern
→ compileDeliveryContract 成功
```

同时增加：

```text
planned binding carrier_paths 为空
planned carrier 位于 root 外
planned carrier pattern containment unknown
```

的失败测试。

---

# 七、P2：区分设计动效时长与合法技术成本

## 1. 当前问题

统一视觉值扫描已经覆盖全部自由文本，但当前通用单位正则把任何：

```text
200ms
2s
```

都当成视觉值。

这会误阻：

```text
Build adds 2s.
Bundle generation adds 120ms.
```

## 2. 分离两类规则

### 永久禁止的精确视觉值

继续无条件阻断：

```text
Hex / RGB / HSL 等颜色
px / rem / em / vh / vw / deg 等视觉尺寸
CSS property declaration
CSS custom property
字体、圆角、间距、阴影、透明度等精确表达
```

从通用 dimension regex 中移除：

```text
ms
s
```

### Motion duration 语义规则

新增确定性上下文判断。

当时间单位附近出现以下语义时阻断：

```text
animation
transition
motion
duration
delay
easing
timeline
keyframe
fade
spring
stagger
enter
exit
hover
press
```

双向检查：

```text
motion keyword ... 200ms
200ms ... motion keyword
```

### 技术时间成本允许集

当时间单位附近明确出现以下语义时允许：

```text
build
compile
bundle
generation
CI
test
startup
initialization
latency
timeout
network
benchmark
runtime cost
render cost
```

### 无上下文的裸时间值

例如：

```text
200ms
takes 2s
```

无法判断是否为设计动效值，继续 fail closed。

## 3. Must-block

```text
Animation lasts 200ms
Transition delay is 0.2s
Use a 150ms fade
200ms ease-out
duration: 200ms
transition: opacity 200ms
bare "200ms"
```

## 4. Must-allow

```text
Build adds 2s
Bundle generation adds 120ms
CI smoke adds 3s
Runtime initialization adds 450ms
Network timeout is 2s
Benchmark execution takes 800ms
```

---

# 八、相邻边界一次性补齐

为了避免下一轮继续出现“局部功能实现、真实主链未验证”，本次还必须冻结以下相邻反例。

## 1. Mixed targets

同一个 surface 中：

```text
target A = blocker-only
target B = candidate-bearing
```

当 `component_binding_refs = []` 时，必须因为 target B 失败。

只有所有绑定到该 surface 的 implementation design targets 都满足 blocker-only closure 时，才允许 componentless surface。

## 2. Legacy handoff

```text
legacy handoff
technical feasibility not declared
component_binding_refs = []
```

必须 Compile 失败。

Legacy compatibility 只保证历史 handoff 可读取，不赋予 blocker-only 或 feasibility 能力。

## 3. Candidate + blocker

同一个 cell 同时存在：

```text
feasible_realizations
blocker_refs
```

必须同时完成：

```text
唯一 realization 推导
+
blocker completion boundary
```

任何一边都不能替代另一边。

## 4. Route N/A

DRA 预览或独立 component resource 可以声明 route 不适用。

但只要进入 Long-Task `surface_binding`：

```text
route binding 必须有 observed route roots
```

不能用 blocker-only component exception跳过 route owner。

## 5. Pattern unknown

所有 owner-root containment 中：

```text
unknown
```

与 `not_subset` 一样阻断。

不能将“不知道”当成可能合法。

## 6. Standalone structure validator

直接调用普通：

```text
validateDeliveryContractStructure
```

默认仍应拒绝空 component bindings。

只有完整 Activation/Compile 内部明确启用 deferred closure，并确保随后运行 design feasibility validator，才能暂时延后。

---

# 九、具体代码修改范围

## Feasibility Schema 与 Source decision

修改：

```text
packages/ty-context/src/lib/
  design-resource-implementation-feasibility-types.ts
  design-resource-implementation-feasibility-shape.ts
  design-resource-implementation-feasibility-shape-sections.ts
  design-resource-implementation-feasibility-source-decision-projection.ts
  design-resource-implementation-feasibility-source-decision.ts
  design-resource-implementation-feasibility-validation-document.ts
  design-resource-implementation-feasibility-validation-cells.ts
  design-resource-implementation-feasibility-validation-support.ts
```

主要变化：

* blocker 增加 `substrate_observation_refs`；
* blocker projection 增加同一 exact set；
* unresolved observation 做 per-cell exact closure；
* 时间值扫描改为字段与语义相关。

## Long-Task allowed-set 与 root closure

修改：

```text
packages/ty-context/src/lib/
  long-task-design-feasibility-binding.ts
  long-task-design-feasibility-binding-owners.ts
  long-task-design-feasibility-source-closure.ts
```

主要变化：

* every-path owner-root proof；
* 复用 `proveRepositoryPatternSubset`；
* planned carrier 路径检查；
* blocker-only componentless target；
* mixed target 和 legacy fail-closed。

## Long-Task 结构验证顺序

修改：

```text
packages/ty-context/src/lib/
  long-task-ui-surface-validation.ts
  long-task-ui-surface-policy.ts
  long-task-delivery-validation.ts
  long-task-activation-validation.ts
```

只增加 in-memory validator option，不修改 Contract Schema。

## CLI

当前 CLI 文案已经正确，不再改产品逻辑，只保留并扩展回归测试。当前输出已经使用 `preflight valid`、blocker 数和 `Production conformance: not evaluated`。

---

# 十、Context、Skill 与文档同步

更新：

```text
project_context/areas/harness-package/contracts/
  design-resource-authoring.md
  design-resource-handoff.md
  workflow-contract.md

project_context/areas/harness-package/
  implementation-index.md
  verification.md
```

更新 DRA owner 后同步三份：

```text
.codex/ty-context-managed/skills/design-resource-authoring/**
.codex/skills/design-resource-authoring/**
packages/ty-context/assets/skills/design-resource-authoring/**
```

重点更新：

```text
SKILL.md
references/implementation-feasibility.md
references/downstream-handoff.md
references/formal-selected-web-app-handoff.md
```

同步：

```text
PROJECT_SPEC.md
README.md
README.zh-CN.md
packages/ty-context/README.md
packages/ty-context/assets/README.md
packages/ty-context/assets/README.zh-CN.md
docs/launch/github-release-0.8.17.md
```

不新增新的 Reference 文件，防止机制再次扩张。

---

# 十一、测试矩阵

## A. Owner-root unit tests

至少覆盖：

```text
file target inside / carrier outside
file target outside / carrier inside
path_glob target 越界
verified logical target / carrier 越界
planned carrier 越界
一个 Binding 多 carrier，仅一条越界
src/components*/** 假前缀
subset unknown
多 root 合法分布
route 与 component 分别验证
```

## B. Observation-blocker tests

V1 与 Symbolic V2 都覆盖：

```text
unresolved observation 无 blocker
不相关 blocker
仅覆盖部分 family
仅覆盖部分 condition
blocker 引用 observed observation
blocker 引用 N/A observation
projection set 不匹配
重复 observation refs
一个 blocker 覆盖多个 observation
普通 blocker 空 refs
零 family + unresolved observation
```

## C. Full Long-Task blocker-only tests

必须使用完整：

```text
compileDeliveryContract
```

不能只调用 consumer。

覆盖：

```text
blocker-only + external confirmation → Compile 成功
blocker-only + Final Gate → 非 machine_accepted
blocker-only + decision_required → Compile 失败
blocker-only + no feasibility → 失败
blocker-only + missing claim → 失败
blocker-only + nonblocking confirmation → 失败
blocker-only + wrong impact claim → 失败
blocker-only + stale Source Item → 失败
blocker-only + fake component binding → unattributed 失败
```

## D. Planned owner full Compile

覆盖：

```text
planned owner + exact authorization + legal carrier → Compile 成功
planned owner carrier empty → 失败
planned owner carrier outside root → 失败
planned owner path-only Claim → 失败
```

## E. Mixed target tests

覆盖：

```text
all targets blocker-only + no components → 允许
one candidate target + no components → 失败
one legacy target + no components → 失败
candidate target + blocker-only target + legal binding → 允许且 blocker pending
```

## F. Visual-value tests

所有四类 prose carrier：

```text
observation reason
observed cost
observed risk
blocker description
```

分别测试：

* 视觉动效时间阻断；
* 技术构建时间允许；
* 裸时间值阻断；
* 原有颜色、尺寸和 CSS 表达继续阻断。

## G. CLI regression

确保人类输出不出现：

```text
handoff ready
production ready
accepted
```

必须继续包含：

```text
preflight valid
Technical feasibility blockers
Production conformance: not evaluated
```

JSON `status: ready` 保持兼容。

---

# 十二、实施顺序

## 阶段 1：先冻结全部反例

在改产品代码前，先加入本方案所有 P0/P1/P2 正反例。

确认关键负向测试在 `749aef` 上失败，避免继续用只验证指导文字的静态测试代替行为证明。

## 阶段 2：更新 Context

先写清：

* every-path owner-root theorem；
* unresolved observation 的 target-wide per-cell blocker 规则；
* blocker-only 的 deferred structure + Source-aware closure；
* 技术时间成本 must-allow。

## 阶段 3：修 observation-blocker Schema

先完成：

```text
types
strict parser
projection
exact-set validation
V1/V2 tests
```

## 阶段 4：修 root containment

删除简化前缀算法，统一复用 repository pattern subset proof。

## 阶段 5：打通 blocker-only 完整 Compile

加入 validator 调用期 deferred option，再在 Source-aware validator 中 fail closed。

## 阶段 6：修时间语义

拆分永久视觉模式、motion duration 和技术时间成本。

## 阶段 7：补完整主链测试

运行：

```text
full Compile
activation
Final Gate external-pending
planned owner Compile
mixed target
legacy handoff
```

## 阶段 8：同步三份 Skill、Context、公共文档和 release packet

更新 recovery index、受影响测试映射、compact digest 和必要 admission hashes。

## 阶段 9：冻结最终候选并完整验证

最后一次相关代码、Context、Fixture、Contract 或发布文档修改后，重新执行全部验证；修改前的结果不得复用。

---

# 十三、最终验证要求

完整执行：

```text
format check
typecheck
build
default full suite
long-task full suite
all critical sentinels
validate-harness
package source parity
DRA three-copy parity
release-version check
active-source portability
structural-cost
affected routing
pack
quickstart smoke
offline launch check
tarball smoke
fresh temporary repository install
init
sync
Context validation
diff hygiene
```

Windows 并发瞬态失败处理：

1. 保存原始失败；
2. 隔离重跑相应用例；
3. 仅在确认属于既有无关机械并发问题后，执行仓库规则允许的完整串行回滚验证；
4. 不使用缓存；
5. 不减少测试；
6. 最终报告同时保留首次失败与串行完整结果；
7. 同一业务反例在隔离或串行环境仍失败时，不得按瞬态处理。

---

# 十四、最终完成定理

只有以下全部成立，才能宣布开发完成：

```text
对每个 formal implementation target T：

1. 每个 material family × condition cell
   有 candidate 或 blocker；

2. 每个 candidate-bearing cell
   唯一推导一个当前 allowed realization；

3. 每个 component binding
   被至少一个允许它的 cell 归属；

4. 每个 component/route binding 的每一条路径或 pattern
   都是 observed owner root 的 proven_subset；

5. 每个 decision_required / unavailable substrate observation
   都由每个 material cell 的精确 blocker 承载；

6. 每个 blocker 的 observation set
   与 marked Source Item projection 完全一致；

7. blocker-only target 可以在没有虚假 component binding 的情况下
   通过完整 Compile 进入现有阻断完成边界；

8. blocker 未闭合时 Final Gate 不能 machine_accepted；

9. planned owner 的授权、Carrier 和完整 Compile 路线成立；

10. canonical design value 不进入任何 feasibility prose；

11. 合法技术时间成本不会被视觉值规则误阻；

12. Preflight 只声明 input closure；

13. 没有新增 Authority、Gate、Registry、状态机、Contract 字段族或工作流。
```

---

# 十五、最终交付报告格式

全部验证通过后只能按以下边界报告：

```text
Implementation:
- every-path owner-root subset closure implemented
- unresolved observation-to-blocker causal closure implemented
- blocker-only full Long-Task Compile/Final-Gate path implemented
- planned-owner full Compile path implemented
- technical-duration must-allow implemented

Verification:
- Default full suite: all passed
- Long-Task full suite: all passed
- critical sentinels: all passed
- V1/V2/bundle/legacy/CLI/full-Compile/Final-Gate: all passed
- format/typecheck/build/validate-harness/parity/portability/pack/smoke: all passed

Engineering / Architecture Conformance:
- no second Design or Technical Authority
- no new production Binding type
- no new Contract field family
- no new Claim type
- no new Gate, Registry, state machine or workflow
- canonical design closure unchanged
- feasibility remains ordinary Source
- sole Long-Task Final Gate unchanged

Not verified:
- Live Open Design visual-generation quality
- actual multi-route visual diagnostic results
- real-product adoption effect

Context Delta: required
Context: updated <exact files and durable reason>
```

完成以上补丁后，当前审计发现的两条 P0 错误通过路径、blocker-only 的假局部闭合以及技术时间成本误阻都会在同一轮内关闭；Live Open Design 实际视觉质量、多路线视觉实验和真实产品采用仍不属于本次机器开发完成条件。
<!-- S5-CONTROLLING-AMENDMENT:END -->

<!-- S6-CONTROLLING-AMENDMENT:BEGIN -->
# DRA Production-Handoff Closure 最终剩余缺口补开发方案

## 一、范围锁定

固定开发基线：

```text
branch: codex/scratch-20260824
base commit: 92c49dc9557ba2f2a674e609d5d03fdd292db304
parent: 749aef74525368f63f45dbb24890b2547131c0b5
package: project-tiny-context-harness@0.8.17
```

本次只处理三个剩余缺口：

1. Mixed modern/legacy target 可以替未被 feasibility 允许的 Binding 提供虚假归属。
2. Windows 进程树依赖 PID/CIM 轮询，极短根进程可能在首次观察前退出并留下未受控子进程。
3. Motion duration 防走私没有覆盖 `200 ms`、`0.2 seconds` 等写法。

**Open Design 生成质量相关部分不再改动。** 当前 DRA 已具备资源类型匹配、`quality_commission`、真实内容、视觉特征、参考角色、组件复用要求和缺陷驱动的局部 refinement；该需求已经按你的标准达成。

本次不得重新引入：

```text
视觉 Benchmark 准入
Provider 排名
自动 Provider 路由
额外 Open Design 测试
新的 Design/Technical Authority
新的 Contract Binding 类型
新的 Contract 字段族
新的 Claim 类型
新的 Gate
新的状态机
新的工作流
```

## Single Goal

> 在保留 DRA 当前设计资源生成质量能力和既有 Authority/Final Gate 边界的前提下，确保 mixed modern/legacy surface 中的每条生产 Binding 都由真实 feasibility candidate 归属；确保 Windows process-observation 执行在进程启动前即进入可靠的 Job Object containment，任何后代未闭合时均不能产生可信证据；并完整阻止所有常见精确 motion duration 写法进入 feasibility prose。

---

# 二、开始前与恢复要求

继续使用现有 worktree 和分支，不切换或修改 `main`。

开始前重新执行：

```text
git fetch --prune origin
git status --short
git rev-parse HEAD
git rev-parse codex/scratch-20260824
git rev-parse main
git rev-parse origin/main
git merge-base HEAD 92c49dc9557ba2f2a674e609d5d03fdd292db304
git rev-list --left-right --count HEAD...origin/codex/scratch-20260824
npm view project-tiny-context-harness@0.8.17 version
git ls-remote --tags origin v0.8.17
```

只有以下条件成立时继续原地修复：

```text
HEAD 完整包含 92c49dc
worktree 无无关修改
0.8.17 尚未 npm publish
v0.8.17 尚未创建 tag / Release
```

如果 `0.8.17` 在开发期间已经发布，则改为 `0.8.18`，不得静默修改已发布协议。

在：

```text
.work_products/dra-production-handoff-closure/EXECUTION_SOURCE.md
```

追加新的 **S6 controlling amendment**，并更新：

```text
.work_products/dra-production-handoff-closure/RECOVERY_INDEX.md
```

不再创建新的平行方案文件，不改变现有 Source authority order，只让 S6 在这三个剩余缺口上覆盖 S5。

---

# 三、工作包 A：关闭 mixed modern/legacy Binding 归属绕过

## 1. 当前错误路径

当前 `validateLongTaskDesignFeasibilityBindings()` 在某个 target 没有 feasibility document 时，会返回该 surface 的全部：

```text
component_binding_refs
```

作为已经消费的 Binding。

因此可以出现：

```text
Surface:
  modern target A
  legacy target L

Bindings:
  B1
  B2

A 的 feasibility:
  只允许 B1

L:
  没有 feasibility
  当前代码自动声称消费 B1、B2
```

最终 `B2` 不属于任何 modern candidate，却不会触发：

```text
feasibility_component_binding_unattributed
```

## 2. 修正后的归属模型

将内部返回结果扩展为：

```ts
interface LongTaskDesignFeasibilityBindingValidationResult {
  attribution_mode: "feasibility" | "legacy";
  consumed_component_binding_refs: string[];
}
```

它只是当前验证调用中的派生结果，不写入 Contract、Receipt、Progress 或持久状态。

### 有 feasibility document 的 target

```text
attribution_mode = feasibility
consumed refs = 实际唯一匹配 candidate 的 Binding refs
```

继续执行：

* realization 唯一推导；
* required realization；
* planned owner；
* blocker；
* owner roots；
* exact Source Item。

### 无 feasibility document 的 legacy target

```text
attribution_mode = legacy
consumed refs = []
```

Legacy target 不再自动“消费”surface 上的所有 Binding。

## 3. Surface 级兼容规则

将 surface 归属检查分成两类。

### Surface 上全部 target 都是 legacy

保持旧输入兼容：

```text
不执行新的 feasibility Binding attribution theorem
不把旧 handoff 重新解释为已完成 feasibility
保留原有 Contract 行为
```

这只是兼容旧输入，不产生新的 DRA feasibility 声明。

### Surface 上存在至少一个 modern feasibility target

进入严格模式：

```text
legacy target 不贡献任何 Binding 归属
surface 上每个 component_binding_ref
必须被至少一个 modern candidate-bearing cell 消费
```

否则：

```text
feasibility_component_binding_unattributed
```

## 4. Mixed target 的完整规则

| Surface 组成                                                 | 结果                                                   |
| ---------------------------------------------------------- | ---------------------------------------------------- |
| 全部 legacy，component refs 非空                                | 保持旧兼容                                                |
| Modern candidate + legacy，所有 Binding 被 modern candidate 消费 | 允许                                                   |
| Modern candidate + legacy，额外 Binding 只由 legacy 冒领          | 阻断                                                   |
| Modern blocker-only + legacy，component refs 为空             | 阻断；legacy 不能使用 blocker-only deferred closure         |
| Modern candidate + modern blocker-only                     | 允许，但 candidate 完成归属、blocker 完成 External Confirmation |
| 全部 modern blocker-only，component refs 为空                   | 保留当前合法路径                                             |
| Legacy target + component refs 为空                          | 保持当前 fail closed                                     |

## 5. 不得采用的修法

不能简单把所有 legacy surface 都改成失败，否则会破坏旧输入兼容。

不能禁止所有 mixed surface，除非真实实现证明无法可靠区分；当前可以通过 surface 级 attribution mode 精确闭合，因此没有必要扩大限制。

不能给 Contract 增加：

```text
legacy_binding_refs
selected_realization_ref
feasibility_binding_ref
```

## 6. 必补完整 Compile 测试

所有测试必须调用完整：

```text
compileDeliveryContract
```

不能只调用局部 consumer。

### Must-block

```text
modern 允许 B1 + legacy + surface 声明 B1/B2
→ B2 unattributed

modern blocker-only + legacy + component refs=[]
→ componentless_surface_requires_blocker_only_feasibility

modern candidate + legacy + component refs=[]
→ feasibility_component_binding_required

两个 modern target 只共同消费 B1，但 surface 有 B2
→ B2 unattributed
```

### Must-allow

```text
modern 允许 B1 + legacy + surface 只有 B1

两个 modern target 共同合法消费共享 B1

全部 legacy + 原有非空 bindings

modern candidate + modern blocker-only
→ candidate 归属闭合
→ blocker 保持 blocked_external
```

还要验证：

```text
raw Contract 未变
compiled Contract 仍来自当前 raw Contract
Final Gate freshness 仍重新读取当前 Contract
```

---

# 四、工作包 B：Windows 进程闭合改用现有 Job Object 原语

## 1. 不再继续修补 PID/CIM 轮询

当前 Windows 实现通过周期性读取 `Win32_Process` 捕获 PID、父 PID和 CreationDate；只有 snapshot 中仍存在 root 时，才建立 root identity 并枚举后代。

继续给这个轮询模型增加时间窗口、重试或更多 PID 判断，仍然无法可靠处理：

```text
root 启动 child
root 在首次 snapshot 前退出
child 再启动 grandchild 并退出
PID 被重用
CreationDate 无法读取
```

仓库已经存在更强的 Windows 原生实现：

```text
CreateProcessW(CREATE_SUSPENDED)
→
AssignProcessToJobObject
→
ResumeThread
→
JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE
→
等待 ActiveProcesses == 0
```

实际 product executable 在恢复执行之前已经加入 Job Object，因此不存在“先启动、后发现来不及”的窗口。

本次必须复用这一现有 primitive，不再发明第二套 Windows containment。

## 2. 单一实现 owner 与 package 分发

现有 canonical native owner 保持：

```text
tools/formal_process_supervisor_native_types.cs
tools/formal_process_supervisor_native_run.cs
tools/formal_process_supervisor_native_helpers.cs
tools/windows_job_process_supervisor.ps1
```

PowerShell helper 已经按结构化 request 执行 native Job Object supervisor。

新增 package managed mirror：

```text
packages/ty-context/assets/runtime/windows-job-supervisor/
  formal_process_supervisor_native_types.cs
  formal_process_supervisor_native_run.cs
  formal_process_supervisor_native_helpers.cs
  windows_job_process_supervisor.ps1
```

要求：

```text
tools canonical source
→ package asset managed copy
→ byte-for-byte parity test
```

不能手工维护两份不同实现。

`package.json` 已经发布整个 `assets` 目录，因此这些运行资源会进入 tarball。

## 3. PowerShell 兼容性

当前 helper 的 `$IsWindows` 和 `ConvertFrom-Json -AsHashtable` 偏向 PowerShell 7。为了不把 `pwsh` 变成新的隐式运行依赖，应将 canonical helper 同时兼容：

```text
Windows PowerShell 5.1
PowerShell 7+
```

具体要求：

* 使用稳定的平台判断，不依赖 `$IsWindows`；
* 使用 `PSObject.Properties` 严格读取 request 字段；
* 保持字段白名单和排序比较；
* 不通过 shell 拼接 executable 或 argv；
* 环境变量继续逐项构造；
* JSON response 继续使用单行结构；
* 任意未知字段、重复或缺失字段 fail closed。

## 4. 新增 package runtime adapter

新增：

```text
packages/ty-context/src/lib/
  long-task-windows-job-supervisor.ts
  long-task-windows-job-supervisor-protocol.ts
```

职责严格限定为：

```text
定位 package-owned helper
创建 fresh private temp directory
发送单个结构化执行 request
读取并验证单个 result
读取 stdout/stderr
清理 helper 和临时文件
返回现有 SpawnedCommandExecution
```

不得形成新的通用调度器或 process registry。

## 5. `spawnCommandOnce` 的平台分流

修改：

```text
long-task-command-process.ts
```

为：

```text
containProcessTree = true && win32
→ Windows Job Object supervisor

containProcessTree = true && non-Windows
→ 保留现有 process-group / tree closure

containProcessTree = false
→ 保留普通直接 spawn
```

Windows 下不得静默 fallback 到 PID polling。

以下任何情况必须 fail closed：

```text
PowerShell helper 不可启动
C# Add-Type 失败
CreateJobObject 失败
CreateProcessW 失败
AssignProcessToJobObject 失败
ResumeThread 失败
response shape 无效
request_id 不匹配
ActiveProcessesAtResult != 0
DescendantsCleaned != true
stdout/stderr identity 不匹配
临时输出超过限制
helper 异常退出
```

错误统一映射到现有 process-observation 失败边界，例如：

```text
process_observer_windows_job_unavailable
process_observer_windows_job_result_invalid
process_observer_descendant_process_alive
command_timeout
command_output_limit_exceeded
```

不得产生 `completed` evidence。

## 6. 保持 direct-root 语义

Job helper 必须直接调用：

```text
CreateProcessW(actual executable, actual argv)
```

不得使用：

```text
cmd /c
Start-Process 包装产品命令
shell: true
额外项目 wrapper
```

PowerShell/C# 只是 Harness containment owner；实际 product executable 和 argv 仍然是被验证的 product root。

现有 host attestation 继续记录：

```text
实际 product pid
实际 executable
实际 argv
started_at
completed_at
exit_code
snapshot identity
process runtime closure identity
```

不新增新的 Contract attestation 类型。

## 7. Job Object 完成定理

Windows contained execution 只有在以下全部成立时才允许返回：

```text
product 创建时处于 suspended
product 在 resume 前已加入 Job Object
root 与全部 descendants 均属于同一个 Job
root 已退出
Job ActiveProcesses == 0
stdout/stderr 已完整关闭
输出未超过限制
timeout 未触发
helper result 身份匹配
```

只要 Job 中还有一个进程：

```text
不得 completed
不得生成可信 observation
不得进入 machine_accepted
```

## 8. Verifier identity 必须包含 helper

当前 verifier bundle 主要冻结 `dist` 下的 Long-Task 运行文件和 Schema。

新增 runtime assets 后，必须将以下文件加入现有 `VerifierIdentityV2.bundle_files`：

```text
assets/runtime/windows-job-supervisor/*.cs
assets/runtime/windows-job-supervisor/*.ps1
```

这只是扩展现有 verifier bundle digest，不是新的 Authority。

如果 helper asset 在 Compile 后变化：

```text
verifier_changed_after_compile
```

必须由现有 freshness 边界阻断。

## 9. 删除误导性 PID 证明

Windows contained execution 改为 Job Object 后：

* 不再把 `PID + CreationDate` 宣称为完整进程树权威；
* 删除或缩小 Windows polling 专用 `processInstanceMatches` 路径；
* `long-task-process-table.ts` / `long-task-process-tree.ts` 只保留非 Windows 实际需要的逻辑；
* Recovery Index、Context 和 release notes 改为：

  ```text
  Windows Job Object pre-resume containment
  ```

  而不是：

  ```text
  PID + creation identity proves containment
  ```

## 10. Windows 必补真实测试

这些测试必须在真实 Windows 上执行，静态字符串检查不能代替。

### Must-allow

```text
极短 root，无 child，立即输出并退出
→ completed

普通 root + 所有 child 正常结束
→ completed

合法 nonzero product exit
→ 返回真实 exit code，不伪装 infrastructure failure
```

### Must-block / cleanup

```text
root 启动长存 direct child 后立即退出
→ timeout 或 descendants-alive
→ child 被清理
→ 不得 completed

root → short-lived child → long-lived grandchild
→ 整个 Job 被清理

root 在首次用户态观察前退出
→ Job containment仍然成立

timeout
→ root/child/grandchild 全部结束

output overflow
→ 整个 Job 结束

helper malformed response
→ fail closed

AssignProcessToJobObject 失败
→ product 从未 Resume，不能逃逸
```

### 并行和跨运行隔离

```text
两个并行 execution 使用不同 request/temp/output identity
一个失败不能关闭另一个 Job
旧结果不能满足新 request
```

优先采用“一次执行一个 helper”的简单模型，避免共享 helper 状态和跨执行污染。只有真实测量证明启动成本成为显著热点时，才另行考虑持久 helper；本次不提前增加池化和并发状态。

---

# 五、工作包 C：完整封闭 Motion Duration 写法

## 1. 当前缺口

当前时间 token 只匹配紧邻形式：

```text
200ms
0.2s
```

必须同时识别：

```text
200 ms
200 msec
200 milliseconds
0.2 sec
0.2 seconds
2 s
```

## 2. 新时间 token

使用等价于以下规则的 matcher：

```regex
\b\d+(?:\.\d+)?\s*
(?:milliseconds?|msecs?|ms|seconds?|secs?|sec|s)\b
```

注意：

* 长单位放在短单位前；
* 支持大小写；
* 支持普通空格和其他 `\s`；
* 不把单词内部的 `s` 误判为秒。

## 3. 上下文分类保持三分法

### Motion context

出现以下语义时阻断：

```text
animation
transition
motion
duration
delay
easing
timeline
keyframe
fade
spring
stagger
enter
exit
hover
press
ease-in / ease-out
```

### Technical time context

明确出现以下语义时允许：

```text
build
compile
bundle
generation
CI
test
startup
initialization
latency
timeout
network
benchmark
runtime cost
render cost
```

### 无明确上下文

Fail closed。

如果同一局部语句同时出现 motion 和 technical 词，motion 优先阻断，防止用：

```text
build animation takes 200 ms
```

绕过。

## 4. 四类 prose carrier 全覆盖

同一个统一 validator 必须覆盖：

```text
substrate observation reason
realization observed_costs
realization observed_risks
blocker description
```

不能只补某一个字段。

## 5. 必补测试

### Must-block

```text
Animation lasts 200 ms
Transition takes 0.2 seconds
Use a 150 millisecond fade
Motion delay is 2 sec
200 milliseconds
takes 2 seconds
duration: 200 ms
transition: opacity 0.2 seconds
```

### Must-allow

```text
Build adds 2 seconds
Bundle generation adds 120 ms
CI smoke adds 3 sec
Runtime initialization adds 450 milliseconds
Network timeout is 2 s
Benchmark execution takes 800 msec
```

原有颜色、尺寸、CSS declaration、custom property 和紧凑时间测试全部保留。

---

# 六、必须保留的已完成能力

本次修改必须证明以下内容没有退化：

1. `substrate_observation_refs` 仍唯一、canonical，并逐 family × condition cell 覆盖 unresolved observation。
2. 每条 component/route Binding path 仍必须是 observed root 的 `proven_subset`。
3. `not_subset`、`unknown` 和空 planned carrier 仍 fail closed。
4. Blocker-only target 仍可通过完整 Compile 进入 `blocked_external`，不能 `machine_accepted`。
5. Standalone Contract validator 仍拒绝空 `component_binding_refs`。
6. Deferred component closure 仍只存在于完整 Source-aware activation 调用中。
7. Required realization、planned owner 和 blocker 仍绑定 exact marked Source Item。
8. Raw Contract 不被 blocker projection 改写。
9. Final Gate 仍重新读取当前 raw Contract，并保持唯一完成权威。
10. Candidate + blocker 必须同时闭合 realization 和 blocker。
11. V1、Symbolic V2、bundle、legacy 读取和 canonical resource 等式不退化。
12. Open Design `quality_commission`、能力匹配和最小 refinement 保持原样。

---

# 七、具体文件范围

## Mixed legacy attribution

```text
packages/ty-context/src/lib/
  long-task-design-feasibility-binding.ts
  long-task-design-resource-handoff.ts

tests/ty-context/
  long-task-delivery-compiler.test.mjs
```

## Windows Job Object runtime

```text
packages/ty-context/src/lib/
  long-task-command-process.ts
  long-task-check-runner.ts
  long-task-verifier-identity.ts
  long-task-windows-job-supervisor.ts              # new
  long-task-windows-job-supervisor-protocol.ts     # new
  long-task-process-table.ts                       # shrink/remove Windows path
  long-task-process-tree.ts                        # non-Windows only where applicable
```

Managed runtime assets：

```text
packages/ty-context/assets/runtime/windows-job-supervisor/**
```

Canonical shared owner：

```text
tools/formal_process_supervisor_native_types.cs
tools/formal_process_supervisor_native_run.cs
tools/formal_process_supervisor_native_helpers.cs
tools/windows_job_process_supervisor.ps1
```

测试：

```text
tests/ty-context/
  long-task-direct-process-observer.test.mjs
  long-task-level4-acquisition.test.mjs
  long-task-verifier-identity.test.mjs
  long-task-release-tarball-contract.test.mjs
  test-suite-runtime.test.mjs
```

## Duration scanner

```text
packages/ty-context/src/lib/
  design-resource-implementation-feasibility-validation-support.ts

tests/ty-context/
  design-resource-implementation-feasibility.test.mjs
```

## 路由、Context 和发布面

```text
tools/affected_test_selection.mjs
tools/test_suite_policy.mjs
tools/test_suite_lane_policy.mjs

project_context/areas/harness-package/contracts/
  design-resource-handoff.md
  workflow-contract.md

project_context/areas/harness-package/
  implementation-index.md
  verification.md

PROJECT_SPEC.md
README.md
README.zh-CN.md
packages/ty-context/README.md
packages/ty-context/assets/README.md
packages/ty-context/assets/README.zh-CN.md
docs/launch/github-release-0.8.17.md
```

DRA Skill 只在需要澄清 legacy attribution 或 duration 表达边界时更新；若更新，三份副本必须保持字节一致。

---

# 八、实施顺序

## 第 1 步：先冻结全部反例

在修改实现前先加入以下失败测试：

```text
modern + legacy 洗白额外 Binding
short-lived Windows root + long-lived child
short-lived child + long-lived grandchild
200 ms / 0.2 seconds motion duration
```

确认这些测试在 `92c49dc` 上确实失败。

## 第 2 步：更新 S6 Source 和 Context

先写清：

* legacy compatibility 不等于 feasibility attribution；
* Windows process observation 使用 pre-resume Job Object；
* duration 单位的完整识别；
* 不改变 DRA 生成质量路线。

## 第 3 步：修 mixed legacy attribution

先完成纯 Contract/feasibility 闭合和完整 Compile 测试。

## 第 4 步：接入 Windows Job Object

顺序：

```text
canonical helper兼容
→
package asset parity
→
protocol adapter
→
spawn dispatch
→
verifier identity
→
真实 Windows regressions
```

禁止先删除旧 Windows路径而尚未完成 Job Object 正向运行。

## 第 5 步：修 duration scanner

使用统一 token/context classifier，参数化覆盖四类 prose carrier。

## 第 6 步：清理旧声明和死代码

删除不再作为 Windows Authority 的 PID/CIM 轮询声明、测试和 Recovery 文案。

## 第 7 步：同步 Context、文档、package 和 compact carrier

必要时刷新：

```text
Compact Source/Contract digest
mechanism admission hash
affected-test routing
release packet
recovery index
```

## 第 8 步：冻结最终候选并完整验证

最后一次代码、Context、Fixture、helper asset 或文档修改后，所有相关验证重新运行；不得复用修改前结果。

---

# 九、最终验证要求

必须完成：

```text
format
typecheck
build
Default full suite
Long-Task full suite
Long-Task trust suite
all critical sentinels
validate-harness
source parity
DRA three-copy parity
Windows helper canonical/package parity
verifier bundle identity
portability
structural-cost
affected routing
pack
Quickstart
offline launch
tarball smoke
fresh temporary repository install/init/sync/Context validation
diff hygiene
```

Windows 还必须实际执行：

```text
Job Object direct root
short-lived root
direct child
multi-level descendant
timeout cleanup
output-overflow cleanup
parallel request isolation
tarball-installed helper
```

不得用 Linux 模拟、静态源码搜索或 mock 结果替代这些 Windows 测试。

Windows 瞬态处理继续遵守现有规则：

```text
保留首次失败
隔离复现
确认是机械瞬态后才允许显式串行回滚
不使用缓存
不减少测试
最终重跑完整 suite
```

---

# 十、最终完成定理

只有以下全部成立，才能宣布开发完成并合并：

```text
1. Mixed surface 上只要存在 modern feasibility target，
   legacy target 就不能贡献 Binding attribution。

2. Surface 的每个生产 component Binding
   都由至少一个 modern candidate-bearing cell 真实消费，
   或该 surface 属于纯 legacy compatibility。

3. Windows product root 在开始执行前
   已被加入 package-owned Job Object。

4. Windows Job Object 中 ActiveProcesses 不为 0 时，
   execution 不得 completed。

5. 极短 root、子进程和多级后代
   都不能逃过 cleanup 或产生可信 evidence。

6. Windows containment 不依赖 PID polling、
   CreationDate 恰好可读或首次 snapshot 时 root 仍存活。

7. 所有标准紧凑、空格和完整英文 motion duration
   都不能进入 feasibility prose。

8. 明确的技术执行时间成本仍合法通过。

9. Raw Contract、现有 technical/surface bindings、
   唯一 Final Gate 和所有 Authority 边界保持不变。

10. DRA 的 Open Design 生成质量优化保持不变，
    不重新增加视觉测试、Provider 排名或自动路由。
```

---

# 十一、最终交付报告格式

```text
Implementation:
- mixed modern/legacy Binding attribution closure implemented
- Windows pre-resume Job Object containment implemented
- short-lived root/descendant escape closed
- package-owned supervisor assets frozen in verifier identity
- full motion-duration token classification implemented

Verification:
- Default: all passed
- Long-Task: all passed
- Trust: all passed
- critical sentinels: all passed
- real Windows Job Object regressions: all passed
- V1/V2/bundle/legacy/full Compile/Final Gate: all passed
- format/typecheck/build/validate/parity/portability/pack/smoke: all passed

Engineering / Architecture Conformance:
- no second Design or Technical Authority
- no new production Binding type
- no new Contract field family
- no new Claim type
- no new Gate, Registry, state machine or workflow
- canonical design closure unchanged
- feasibility remains ordinary Source
- sole Long-Task Final Gate unchanged
- Open Design quality commission unchanged

Context Delta: required
Context: updated exact owners and durable reasons

Release:
- branch pushed
- worktree clean
- ahead/behind reported
- main unchanged until independent audit
- npm/tag/Release not created
```

这次补开发的关键不是继续给现有 Windows PID 观察打补丁，而是复用仓库已经存在的、启动前完成 containment 的 Job Object 原语。这样才能一次性关闭极短根进程、PID 重用、多级子进程和清理证明这几个同源问题。
<!-- S6-CONTROLLING-AMENDMENT:END -->
