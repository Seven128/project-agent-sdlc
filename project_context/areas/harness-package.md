# Area Context: harness-package

## Responsibility

- Provide the `ty-context` CLI, Minimal Context/default Workflow assets, validators, migrations, source-sync checks and explicit Single-Goal Long-Task Workflow.
- Preserve durable project intent and repeatable verification at low recovery cost without adding lifecycle documents, duplicate authority or agent/process/Git orchestration.
- Own one-Contract V2 authoring, compiled Source/REQ/CTRL/OBL/NCOMP/AC coverage and the Live Evidence Kernel that prevents false completion for declared authority on one current Git-tree snapshot.

## User / System Contract

- `init` installs portable core/default workflow including explicit-only design-system/resource Skills. `ty-context enable long-task` installs the Long-Task Skill, retired Source Plan compatibility pointer, templates and package-owned Stop Hook; disable removes only package-owned assets.
- `delivery-contract.yaml` is the only Contract authoring file and is non-authoritative until formal Compile. Real marked Source is mandatory; compiled inventories and coverage are projections, not editable state.
- Read-only Preflight and Compile share activation safety, including one workspace path classifier also reused by verification. It checks `HEAD`-relative changes before first lock and immutable-baseline changes afterward, so forbidden or unclassified files cannot be silently absorbed by direct Compile. First enable protects only actual current package-asset files for configured managed destinations plus exact config/hook files, not managed directory roots or broad `.codex/**`. Only Compile creates Authority Lock; targeted verify never accepts; Final Gate, Stop and close recompile Source authority and rerun the complete Contract on one snapshot.
- Product Surface/Screen Contract workflow is prompt-level and project-owned through `context_surface_contract` and existing roles; the package must not add a surface-specific Context role. The managed Screen Contract template is optional/on-demand and owns durable per-screen/control semantics only when that depth is reusable.
- Material production UI uses UI Authority Closure plus a conditional Design Authority Check: affected stable surface/control/target keys reconcile screen/surface Context, `DESIGN.md`, one authored token source/generation direction and exact-target/constraint/inspiration references before implementation. Every affected adopted exact target/constraint must be opened through its Context-reachable immutable locator and editable upstream/update record; a registry mention alone is not consumption. An unconfigured starter or implementation-generated screenshot is not production design authority; no required design directory or visual workflow state is added.
- Open Design is default. `design-system-authoring` adopts Design Authority; `design-resource-authoring` commissions resources and reconciles selection once. Implementation Web/App handoffs freeze a canonical machine-readable entry, exact dependencies and digests. The Skill edits no Context/code/Contract; outputs remain Source.
- Selected implementation handoffs use one fail-closed residual `design-resource-handoff-v1`: typed locators atomically index every supported observable design fact, every resource has complete material/supporting closure, exact targets require per-condition full-target layout and pixel facts, and subject × target × condition × dimension applicability, gaps, semantics, blockers and downstream fact bindings stay explicit. Product Control granularity is not the design-fact ceiling; exploration stays lightweight.
- Selected-design conformance uses exclusive existing carriers; Design Source Projection gives each target one canonical `DESIGN.md` or Screen owner while other layers keep pointers.
- `long-task-workflow` sends every input directly into one Source-bound Contract Draft loop. Inventory/synthesis/refinement/provenance/markers and Contract mapping converge there before Preflight/Compile; `/source-plan-authoring` is a compatibility pointer and no Source-authoring intermediate stage exists.
- The platform Goal owns mutable implementation sequencing, local planning, tool choice and whether one or multiple platform-native agents/subagents are useful. Harness never launches, allocates, schedules, retries or recovers those agents or manages models/AppServer, branch/worktree fan-out, merges, pushes, PRs or deployment; delegated or parallel outputs are not Progress or proof and must converge into the selected verification workspace before verification counts.
- First Authority Lock creates a strict user-choice turn boundary: absent a prior explicit task-specific model strategy, generic continuation is insufficient and implementation/edit/build/test work waits for an explicit current-model or switch-and-resume choice. Harness stores no acknowledgement or route.
- Authority Revision separates authority change from user decision. Mechanically bounded repairs auto-adopt with evidence invalidation; a true semantic/proof boundary change exposes one self-contained deterministic brief before an exact decision. Exact current-task user instructions may be relayed, while blanket authorization cannot; the brief is a projection, not another authority or state.
- `/long-task-workflow` is the only active long-task Skill. `/normal-long-task`, `delivery-set` and historical composite commands are retirement pointers/tombstones only.
- Runtime floor is Node.js `>=24`; public package behavior is documented in English with aligned Chinese translation.

## Context Loading Contract

- This area root is default because it identifies package responsibility and routing.
- Detailed Context Model, Workflow Contract, package-managed-surface rules and verification paths are `on-demand`, selected by task triggers. Their authority is unchanged; only near-universal read cost is reduced.
- `ty-context doctor` reports the deterministic default Context footprint, exact duplicate default files and `DESIGN.md` authority status as advisory findings, with no new validation or workflow state. Required recovery facts outrank the byte heuristic; source tests exercise the warning but do not hard-gate an absolute total.

## Architecture And Quality Contract

- Package behavior changes keep implementation, managed source, package assets, Context, `PROJECT_SPEC.md`, public README and behavior tests aligned.
- Default UI guidance routes missing/conflicting durable UI meaning to its one Context/`DESIGN.md` owner or `context_uiux_design`, keeps local fixes/prototypes lightweight and, only for a selected implementation handoff, accounts for the exact covered Source-item/method set and blockers in independently failing production checks before claiming complete conformance.
- External generation stays delegated and adoption routes to `context_uiux_design`. Figma, Penpot and OpenPencil are optional rather than default conversions. The residual adapter validates source closure/addressability/coverage; consumers own conformance.
- Architecture depth is risk-triggered: material decisions resolve owner, unique source of truth, dependency direction, interface/state lifecycle, failure/recovery/compatibility, alternatives, future-change pressure, forbidden shortcuts and project-owned verification.
- Every implementation delivery surfaces one risk-proportional `Architecture Deliberation` before implementation. Small work records concrete preservation of the current owner/extension point and no new or worsened debt; material work additionally resolves alternatives, future-change pressure, lifecycle and project-owned architecture checks.
- Post-implementation `Architecture Conformance` has one owner per candidate snapshot: default Contract Conformance or Long-Task Final Gate. Candidate changes stale the result; no duplicate closure, second authority or architecture state is created.
- Long-Task architecture invariants use existing obligations/constraints/forbidden shortcuts, path/Binding ownership and executable Checks; no architecture-specific authority layer or generic dependency engine is added.
- A Claim that can pass on a proxy while failing in its target runtime uses a current-execution Check in the earliest owning Outcome. Existing input freshness supports optional coalesced feedback chosen by the Goal, while the one Final Gate reruns the live Check; no implementation gate, platform-impact fields, per-platform state or per-Outcome rebuild mandate is added.
- `F = Implementation Freedom Boundary` is a protected efficiency/anti-process-bloat invariant adjacent to the causal mechanism. Source/Contract, architecture, security, forbidden-shortcut, irreversible-effect and external-action boundaries still apply, but Harness does not prescribe a fixed development sequence, phase/method permission Gate, per-edit verification cadence or agent allocation. A proposed restriction requires an explicit project-owner design-purpose decision, a distinct path that final proof or a lighter project-owned check cannot cover, non-degradation and positive net ROI.
- Preflight diagnostics may improve repair localization through stable refs, safe repair hints and occurrence counts while remaining read-only.
- Modularity diagnostics identify the responsible function/location while preserving existing thresholds and waiver policy.

## Code Entry Points

- Commands: `packages/ty-context/src/commands/**`.
- Context graph/manifest/doctor/sync: `packages/ty-context/src/lib/context-*`, `doctor.ts`, `sync-engine.ts`.
- Design-resource adapter: `design-resource-handoff-*` including file/addressability validation, `commands/design-resource.ts`, `long-task-design-resource-handoff.ts`, and managed authoring/selection/Open Design/downstream references.
- Long-task schema/parser/compiler/risk/claims/evidence/authority/final gate: `packages/ty-context/src/schemas/long-task-delivery-v2/**` and `packages/ty-context/src/lib/long-task-*`.
- Managed sources/assets: `.codex/ty-context-managed/**`, `packages/ty-context/assets/**`, `packages/ty-context/source-mappings.yaml`.
- Release/version automation: `tools/sync_release_version.mjs`, release prepare/publish and tarball smoke tools.

## Key Constraints

- No second Contract plan, editable Source Inventory/Coverage authority, SFC/Packet/Wave/Campaign runtime, Worker scheduler, worktree manager, model router or confirmation tracker.
- No fixed file-level execution plan or Frontier implementation gate in Contract Technical authority; stable owners, obligations, boundaries, paths, Bindings and proof remain explicit while implementation order and optional targeted-feedback cadence stay internal.
- No Harness-owned one-agent/multi-agent policy, delegation registry or scheduler. Optional multiple-agent implementation remains Goal-owned, non-authoritative and converges into the single selected verification workspace.
- No targeted-verify acceptance, historical proof splicing, prose/exit-code acceptance, silent risk/scope downgrade or executing-Agent approval of protected authority reduction.
- No package operation deletes user-authored historical Source/Contract/Campaign data.
- Local affected-test inference may omit and report untracked `.work_products/**` scratch only; tracked or explicitly supplied paths remain verification inputs, and complete-suite discovery is never capped or pruned by feedback-tier budgets.
- Managed-asset changes require build, source sync, idempotence, `package check-source` and applicable package/consumer verification.

## Role Context Map

- [Context Model](harness-package/foundation/context-model.md)
- [Workflow Contract](harness-package/contracts/workflow-contract.md)
- [Design Resource Handoff Adapter Contract](harness-package/contracts/design-resource-handoff.md)
- [Package-Managed Surface Contract](harness-package/contracts/package-managed-surfaces.md)
- [Minimal Context Rationale](harness-package/decision-rationale/minimal-context.md)
- [Architecture Quality Rationale](harness-package/decision-rationale/architecture-quality.md)
- [Long-Task Workflow Rationale](harness-package/decision-rationale/long-task-workflow.md)
- [Implementation Index](harness-package/implementation-index.md)
- [Verification](harness-package/verification.md)

## Open Risks

- A complete declared Contract cannot prove omitted requirements were never omitted.
- Ordinary same-user state and Hooks are drift protection, not hostile-host security.
- Managed source, package assets, generated copies and public docs can drift without parity and behavior tests.
