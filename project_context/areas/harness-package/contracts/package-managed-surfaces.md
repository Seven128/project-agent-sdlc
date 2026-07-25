---
context_role: contract
read_policy: on-demand
---
# Package-Managed Surface Contract

Product Surface Contract guidance is package-managed workflow support only. It must not generate project semantics, plan artifacts, lifecycle state or campaigns; business surface responsibility remains project-owned Context using existing roles.

## Role

This contract defines source-only, managed, packaged and human-facing surfaces for the Harness.

## Surface Ownership

- `.codex/ty-context-managed/**` is source-workspace managed source for portable/default guidance, Context templates, profile metadata and package-managed Skills. The executable Long-Task Hook entry is package-owned compiled code.
- Managed Context templates include cross-surface `product-surface-contract.md` and optional on-demand `screen-contract.md`. They teach ownership/structure only and never generate consumer product facts.
- `packages/ty-context/assets/**` is packaged canonical output produced by source mappings.
- `.codex/skills/**` exposes generated/default Skills. The base set includes `design-system-authoring` and `design-resource-authoring`; `long-task` owns `long-task-workflow` plus the retired `source-plan-authoring` pointer; `normal-long-task` is also a retirement pointer. Copies are sync-overwritten.
- `.codex/skills/authoring/**` is source-workspace-only and never packaged.
- `README.md`, `README.zh-CN.md`, `packages/ty-context/README.md`, npm metadata and release docs are human-facing public surfaces and must match behavior.
- `PROJECT_SPEC.md` is the full source-workspace workflow design specification, not a consumer asset.
- `project_context/**` is source-workspace durable fact authority and is not copied wholesale to consumers.

## Profile And Consumer Boundary

- `core-portable` plus `workflow-default` are installed by default.
- `long-task` is explicit. Enabling it installs Long-Task Workflow, the Source Plan compatibility pointer, Stop Hook and templates. Enable/disable/upgrade preserve user entries and recognize only known package-owned hooks.
- Upgrade safely removes the V1 repo-local Hook, reports unfinished V1 or development-period V2 active state as manual, and never imports historical Progress/Receipts as current authority.
- Retired command names are CLI tombstones in code, not packaged runtime profiles. They import no Campaign/SFC/worker/AppServer/worktree modules.
- `init`, `sync` and `upgrade` never create, discover, import, activate or abandon a Delivery Contract.
- Consumer CI receives portable project gates only. Maintainer package CI owns Delivery Contract/Long-Task Workflow self-tests, exact-tarball smoke and source drift.

## Source Sync Boundary

- `node packages/ty-context/dist/cli.js package sync-source` copies mapped managed source to package assets.
- `package check-source` verifies exact mapping parity.
- Run build, sync twice, check-source, the enabled-profile workspace sync and relevant consumer/package tests after changing managed guidance, Skills, Hooks, templates, profile metadata or source mappings. The managed source, generated `.codex/skills/**` copy and package asset for each package-managed Skill must be byte-identical.
- Public `sync` refreshes enabled package-managed assets only; semantic migration belongs to `upgrade`.

## Generated Skill Boundary

- Package-managed Skills are business-agnostic. Project facts belong in the consumer Context or separate project-local Skills.
- Package-managed AGENTS, `context_development_engineer`, `long-task-workflow` and public docs preserve the shared architecture-quality obligation: one visible risk-proportional Deliberation before implementation; one current-candidate Conformance carried by default Contract Conformance or, exclusively, Long-Task Final Gate; explicit freshness, debt and Context-drift direction; and no architecture artifact, field, second Authority/Gate or state.
- Open Design owns default generation. `/design-system-authoring` is explicit-only, feature-detects MCP lifecycle support, uses the official same-daemon fallback when needed and adopts one selected system into canonical project authority without a provider registry. `/design-resource-authoring` gates only style-bearing resources, verifies `designSystemId`, commissions the smallest scoped set and reconciles accepted final decisions into the initial proposal once. For a selected implementation Web/App handoff it requires a completely acquired canonical source entry and exact dependency closure, freezes every file, emits one strict marked provider-neutral residual `design-resource-handoff-v1` Source and runs the package-owned shared preflight; exploration stays schema-free. It never edits a Source Plan, Context/`DESIGN.md`, code or Contract and adds no live provider dependency/authority.
- `packages/ty-context/src/lib/design-resource-handoff-*.ts` plus `commands/design-resource.ts` own the provider-neutral embedded-block parser, source-profile/dependency/integrity/addressability/coverage validator and CLI. Long-Task activation calls the same validator and maps verification methods and blocker provenance into existing Contract Claims, Assertions and typed evidence. These are package code, not managed generated assets, a provider runtime, registry, Gate or acceptance surface.
- Package-managed visual-delivery guidance reuses the existing authority split and verification surfaces. The default Workflow performs UI Authority Closure plus a conditional Design Authority Check for material production UI; `context_uiux_design` owns missing/conflicting design-authority repair, durable cross-surface/screen/control facts stay in `project_context/**`, durable visual-system semantics and the reference index stay in `DESIGN.md`, and a task-local risk-proportional Visual Coverage Set replaces any required matrix or artifact. `context_development_engineer` follows stable surface/control/target keys through one declared authored token source/generation direction, production components/routes, a cold-start real-user path and project-owned rendered/interactive comparison, checks each runnable vertical slice early, and names resource integrity separately from implementation conformance.
- Every adopted decision-relevant exact target or constraint is **Context-reachable Source** through existing owners: owning Context provides the stable surface/control/target key, `DESIGN.md` or Screen Contract records a readable immutable locator/digest and declared coverage, and the same reference records the editable upstream owner/locator/update route or an explicit manual/external boundary. Relevant product/design/development work actively opens the affected resource; index presence alone is not consumption. A change updates upstream, creates or approves a new immutable version and updates the owning reference without overwriting the adopted baseline. This adds no binary copy in Context, provider registry, asset registry, state or second authority.
- Long-Task visual guidance is authoring and evidence specialization inside the existing Contract lifecycle: material UI Source reconciles UI authority before Compile, and the Control projection preserves applicable surface, region/location, type/label, user task, visibility/availability, trigger/input/validation/default, interaction/navigation, states/recovery/permission/feedback and accessibility fields as independent Source-backed Claims. Outcomes with Controls also declare aggregated Product `surface_bindings` to existing Technical route/component Bindings, a required product target and root-entry journey Check. Selected exact/constraint targets bind frozen verification inputs, conditions and actual/comparison artifacts to typed `design_conformance`; every declared blocker maps to target-local machine proof or a target-blocking `external_confirmation` and cannot be dismissed in-band. Candidate targets cannot authorize fidelity implementation until Context-reachable selected Source/reference authority is adopted through the existing Authority Revision path. There is no `uiux_delivery` block, new Claim kind, risk level, lifecycle state, baseline authority or Final Gate.
- External design briefs/indexes may enter `source_paths`; selected acceptance-affecting targets, token sources, canonical entries, dependency files and fixed prototype fixtures enter the conformance Check's `verification_inputs`; production carriers use `input_paths`/Bindings; generated implementation renders/diffs/reports remain `artifact_globs`. The residual handoff references canonical facts while closing applicability, missing semantics and bindings. `design_resource_integrity` cannot satisfy `design_implementation_conformance`; `visual_render` cannot substitute for the selected-target comparison. Generation, extraction, export or authoring validation is not package, product or Long-Task acceptance.
- `/source-plan-authoring` is a retired compatibility pointer and creates no standalone plan. `/long-task-workflow` accepts revised proposals, selected resources, ordinary prose or legacy Source Plans directly into one Source-bound Contract Draft loop. Its `source-authoring.md` reference owns on-demand mixed-input inventory/synthesis/refinement, provenance, stable/control-level semantics and acceptance/risk completeness inside that loop; all must converge before Preflight/Compile, but the reference is not an internal stage.
- No `contract-authoring`, `draft-authoring` or other standalone Contract Draft Skill exists. Contract Draft authoring and the later workflow are one lifecycle, with one Contract and one Final Gate; no Source Inventory/Preflight Receipt, second Contract plan, top-level split or Goal/agent/process/Git orchestration is allowed.
- Historical reasons involving particular conversational or coding platforms remain source-workspace decision rationale. Package-managed Skills and public consumer guidance use only the platform-neutral repository-binding, Preflight-feedback, handoff, one-authority and iterative-authoring rationale.
- CLI JSON, the package-owned Stop Hook, the managed Long-Task Skill and English/Chinese public docs preserve revision and terminal scope consistently: revision adoption explicitly returns to rolling execution and cannot complete delivery; pending external confirmation remains named through status/resume/stop-check/`systemMessage`/close; accepted terminal output identifies `declared_machine_authority`; and `closed` denotes only machine Authority cleanup with no native-Goal effect. Generated and packaged copies must not erase those distinctions or add revision/native-Goal/external-confirmation state.
- Managed/package Long-Task surfaces expose the same generic workspace classification before activation and during verification, the same fact-only `progress_stale` meaning, and the same read-only `verify --explain` execution preview. They must not add business/runtime-specific build heuristics, a scheduler, timing promises or preview state.
- `/normal-long-task` only reports retirement and points to `/long-task-workflow`; it creates no checklist, target prompt or Local Audit.
- No package-managed Skill may restore Source Unit/SFC/Packet/Wave/Campaign artifacts or a second authority.

## Change Impact Rule

Public behavior changes require a same-semantics sweep across implementation, schema, managed source, package assets, Context, PROJECT_SPEC, English/Chinese README, package README, tests, source sync, quickstart/tarball and release/version surfaces as applicable.

The public README Contract and reusable release fixture are executable examples, not regex documentation. Source sync owns README/package copies and both Skills; exact-tarball smoke and its built-CLI fixture must share the same marked Source/Binding/Counterfactual semantics.

Public package surfaces must be English-complete. Chinese text is additive aligned documentation, never the sole activation path or explanation.
