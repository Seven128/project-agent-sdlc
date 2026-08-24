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
