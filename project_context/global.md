# Project / Delivery Context

## Project Goal

- Maintain `project-tiny-context-harness`, the npm package and `ty-context` CLI behind Project Tiny Context Harness.
- Keep three cooperating capabilities small and distinct: **Minimal Context** preserves durable project facts, **Workflow Contract** defines the lightweight default engineering loop, and the explicitly enabled **Long-Task Workflow** adds one complete Contract authority plus current-snapshot machine completion for work that needs durable recovery.
- Apply one shared architecture-quality obligation to every implementation delivery: an externally observable `Architecture Deliberation` before implementation and one current-candidate `Architecture Conformance` after project verification. Default work carries closure inside Contract Conformance; Long-Task carries it only inside Final Gate.
- Preventing false completion inside declared authority is the Long-Task Workflow's controlling objective. Intermediate implementation may drift or fail; only fresh evidence for every declared Plan Item/Claim and AC on the complete current final snapshot may accept. Otherwise the task remains explicitly unfinished or `machine_accepted_external_pending` when only named external confirmation remains.
- A selected implementation handoff requires every declared material UI/UX fact to reach current-candidate production proof; default Contract Conformance and Long-Task Final Gate are mutually exclusive carriers.
- Preserve that protection at the lowest practical total Authoring, Runtime, State, Recovery, maintenance and test cost. Retain a mechanism only when it closes a distinct false-completion/delivery-drift path or enables a material total-cost reduction without weakening acceptance, and its non-substitutable benefit materially exceeds its total cost.

## Background

- Fresh coding-agent sessions need a repo-owned recovery path for product intent, ownership, architecture boundaries and repeatable verification instead of rediscovering them from code.
- The package previously carried a multi-worker Campaign runtime; the active design now keeps durable Context and verifier-owned completion while leaving mutable implementation sequencing to the current platform Goal.

## Durable Context Purpose

- `project_context/**` stores the smallest durable non-implementation facts future agents need to recover product intent, ownership, architecture and dependency boundaries, contracts, state/recovery semantics, and repeatable verification/deployment paths.
- The default recovery path is intentionally small: read `global.md`, `architecture.md`, `context.toml`, the default area root, collect manifest candidates, then run one bounded text search over `project_context/**` with a small set of high-signal task terms before `Context Delta`. Specialized workflow, package-management and verification detail remains `on-demand`, not near-universal startup context.
- The bounded search supplements triggers and semantic judgment, reads only relevant Context matches, and creates no vector/persistent index, cache, registry, state or second authority.
- Context owns intended durable truth; code owns current implementation; tests, CI, runtime evidence and human observation prove behavior. A disagreement is implementation drift, missing work or stale Context, never permission for code convenience to silently redefine intent.
- Every task decides exactly one `Context Delta: none|required`. Durable ownership, architecture, API/schema/data, state/recovery, dependency, security, product-surface responsibility or repeatable verification/deployment changes are `required` and update the owning Context. Semantics-preserving local fixes are `none`.
- Context is not a plan, implementation summary, log, evidence ledger, Receipt or result claim. Do not store one-off output, secrets, screenshots, temporary JSON, raw evidence or delivery state in it.
- Material production UI uses a conditional Design Authority Check before implementation: relevant surface/interaction Context, `DESIGN.md`, its authored token source and selected design references must distinguish exact targets, partial constraints and inspiration. An unconfigured starter, style-only prose or inspiration reference cannot silently authorize invented production layout.
- UI/UX authority is depth-layered rather than one generic design document: global experience principles, cross-surface responsibility, Screen/Control Context, `DESIGN.md` visual-system facts, versioned authored targets and repeatable verification each keep one meaning owner. Screen/Control Context uses existing `contract`, area/subdomain, decision-rationale and verification roles; no `design` role is added.
- Before material UI implementation or Long-Task Compile, **UI Authority Closure** classifies every affected UI item as Context-covered, requiring a Context update, task-local, explicitly out of scope or genuinely decision-required. Stable surface/control/target keys connect layers; conflicting owners fail closed instead of being resolved by current code or Contract convenience.
- Versioned authored design targets may remain project Source or verifier inputs referenced from Context/`DESIGN.md`; generated implementation screenshots, diffs and one-off review output remain evidence artifacts rather than durable Context.
- Explicit Open Design adapters separate `design-system-authoring` adoption from `design-resource-authoring` commissioning. Selected handoffs use completely acquired canonical resources plus one residual `design-resource-handoff-v1`; consumers own Context reachability, implementation, method Assertions and blocker proof.
- Design Source Projection routes durable UI/UX meaning to existing Context/`DESIGN.md` owners while exact target values and delivery proof stay Source/Contract; each adopted target has one canonical record.

## Design Rationale

- Keep one primary owner for each durable fact, use the smallest near-universal Context set, and combine cheap manifest routing with a bounded search fallback so trigger wording is not the only discovery path.
- Prefer existing Context, Contract and project-verification mechanisms over new artifacts or state. Add a mechanism only when it closes a distinct failure path or delivers a material net cost reduction.
- Make architecture consideration observable and repository-bound without claiming hidden-reasoning access or universal future-proofing. Depth is risk-proportional, but a small task records a concrete preservation result rather than skipping; objective invariants use project-native checks.
- Keep acceptance fail-closed: efficiency may reduce authoring, model or recovery cost but never substitutes historical evidence, prose or Agent judgment for current-snapshot proof.
- When a declared result can pass on a proxy surface while failing in its target runtime, require a project-owned Check that exercises that target during the current Check execution. A tracked report, screenshot, binary or prior run is review material, not live runtime proof.

## Non-goals / Boundaries

- The default Workflow Contract reads minimum relevant Context through manifest routing plus bounded Context search, conditionally resolves Design Authority readiness for material production UI, performs `Architecture Deliberation`, decides one Context Delta, uses platform-internal planning, implements, runs project-owned verification, performs Contract Conformance including `Architecture Conformance`, and separately checks Context drift. It requires no `plan.md`, matrix, verdict, evidence ledger or result artifact.
- Product Surface Contract work uses `context_surface_contract` with existing `contract`, area/subdomain and verification roles. It must not add a new product-surface Context role; durable surface responsibility remains project-owned Context.
- A Product Surface Contract owns cross-surface/main-versus-drilldown responsibility. An on-demand Screen Contract may own durable per-screen hierarchy, regions, navigation, variants and control interaction semantics. Neither duplicates visual tokens or target pixels from `DESIGN.md`/authored targets, and local UI fixes do not require a Screen Contract.
- The active long-task design is **Single-Goal Rolling Delivery V2**: one user-selected delivery, one complete Contract authority, one native Goal, one selected workspace, one user model-choice checkpoint after first Authority Lock, dependency-ready rolling implementation, targeted verifier repair evidence and one source-recompiled same-snapshot Live Final Gate.
- `delivery-contract.yaml` is the only Contract authoring file and remains a non-authoritative Draft until the first successful formal Compile creates Authority Lock. New authoring uses inline Outcomes; existing `outcome_files` are physical compatibility only and create no semantic or completion boundary.
- Raw/revised proposals, selected design resources and mixed attachments enter one Source-bound Contract Draft loop directly. Inventory, refinement/synthesis, direct/derived/delegated/evidence-backed provenance, applicable control/state expansion, Source markers and Contract mapping converge incrementally before Preflight/Compile; Source-quality work is not a serial stage. `/source-plan-authoring` is only a compatibility pointer; legacy Source Plans remain valid ordinary Source. Unknown decision-changing preferences still cause one targeted clarification and high-risk actions remain external confirmations.
- No live design provider or fixed artifact sequence/count/directory is required. Figma, Penpot and OpenPencil are optional upstream/sidecars when collaboration, self-hosting or static editing justifies a second representation; none replaces source closure, residual handoff or production proof.
- Selected implementation handoffs, unlike exploration, must close declared UI/UX scope through shared fail-closed preflight; this adds no second Authority or acceptance result.
- Default selected-design accounting is task-local and creates no artifact/state/Gate; active Long-Task uses only its compiled projection and Final Gate.
- Harness never creates or recovers platform Goals, invokes or switches models, persists model routes/checkpoint acknowledgement, schedules agents, creates branches/worktrees, merges, pushes, opens PRs, deploys or manages process trees. The selected workspace and external platform own those operations.
- No Source Inventory file, Coverage authority, Packet/SFC/Wave/Campaign runtime, second Contract plan, scheduler, Worker registry or external-confirmation state machine belongs in the active product.

## Long-Task Authority

- Real Source is mandatory. Non-rendering Material Source Item markers preserve original text; compiled Source/REQ/CTRL/OBL/NCOMP/AC coverage is a derived projection, never a second editable authority.
- Preflight and Compile share activation safety. Their workspace classifier uses `HEAD` before first lock and immutable `initial_task_base` afterward; forbidden or unclassified paths fail closed, with only exact package-enable bootstrap files protected. Preflight may aggregate diagnostics but creates no authority, cache, Progress, Receipt or pending revision and runs no project check.
- The first successful Compile creates Authority Lock and emits `execution_model_checkpoint.required: true` plus a machine-readable terminal-turn contract. Unless the user already gave an explicit task-specific choice naming current-model continuation or a model switch, the Agent ends that turn before product edits, builds, tests or implementation and asks for the choice; generic continue/resume/finish language does not satisfy the checkpoint. Later revisions do not repeat it, Harness persists no acknowledgement or model route, and the choice is not proof.
- Outcome decomposes execution, dependency readiness, targeted verification and diagnosis; it does not split completion authority. File count, layers, capacity, model context, desired parallelism or output length never create an Outcome or Contract boundary.
- Targeted verify is repair evidence only. `verify --explain` may preview declared main and Counterfactual Raw Executions without running checks or writing Progress. `progress_stale` reports evidence freshness rather than ordering an immediate rerun; relevant changes may be coalesced, but evidence must be refreshed before dependency or Final-Gate reliance. Final Gate, Stop and close recompile Source authority and rerun the complete Contract on one clean current Git-tree snapshot. Status, Progress, Receipts and compiled cache are audit/recovery projections only.
- Declare a bounded target profile with non-empty required product target refs, runtime family and root entrypoint. Put target-runtime proof in the earliest vertical Outcome that owns the runnable boundary, declare its runtime-affecting `input_paths` and Binding carriers, and use the existing targeted verifier after the first runnable slice and after coalesced relevant changes. This rolling feedback never accepts, does not require a build per Outcome/edit and adds no open-ended platform-impact metadata, scheduler or per-platform Progress; Final Gate derives only the exact Contract target qualification and Stage results after rerunning the same live Checks.
- Authority Revision preserves exact identity, old Authority, atomic adoption, evidence invalidation and Final Gate while separating change from user decision. Machine-bounded repairs auto-adopt; decision-semantic/proof/boundary/runner-type/verifier-kernel or unknown changes require the exact identity, and risk downgrade is rejected. Stateless diagnosis/coalescing avoids intermediate prompts; a brief explains the final decision, exact task instructions may carry all reasons, generic/inferred approval cannot, and adoption never completes delivery.
- Architecture requirements that matter to acceptance must use existing Contract mechanisms: Source-backed technical obligations or forbidden shortcuts, owner/path/binding boundaries and project-owned executable checks. A functional AC cannot substitute for a declared architecture invariant.
- For behavioral Claims, evidence reaches the furthest independently failing boundary named by the Claim. Self-reported proxy success cannot prove a downstream result, and a Counterfactual should disrupt the claimed causal capability rather than only file presence when those can diverge. Apply this review only to affected weak-observability or high-risk Outcomes; it creates no Schema, matrix, state or universal runtime mandate.
- Machine acceptance covers declared machine Authority only. It never implies Git hosting, CI, deployment, network isolation, migration/payment execution, human product acceptance or completion of the platform-native Goal. Before completing that Goal, the Agent performs a veto-only conformance check that current user/Goal meaning is fully represented by accepted Source and that no revision, blocker or omitted requirement remains; the check may block or trigger revision but never substitutes Agent judgment for Final Gate proof.

## Architecture Context

- `project_context/architecture.md` owns the minimum component, authority, data-flow and verification-boundary map.
- Specialized foundation, workflow-contract, package-managed-surface, verification and decision-rationale facts are registered in `project_context/context.toml` and read on demand.
- `PROJECT_SPEC.md` owns the full stable product/workflow explanation; Context keeps only the durable facts needed for recovery and decisions.

## Current State

- The current package line preserves the public `long-task-delivery-v2` path, explicit `long-task` profile, package-owned Stop Hook, stateless Authority Revision diagnosis, revision-to-rolling return and declared-machine/native-Goal terminal boundary while sharing architecture and selected-design obligations across mutually exclusive execution carriers.
- Managed source lives under `.codex/ty-context-managed/**`; packaged assets live under `packages/ty-context/assets/**`; `packages/ty-context/source-mappings.yaml` is the copy authority.
- Root `AGENTS.md` is a startup router and hard-boundary surface. Skills own role procedures, `PROJECT_SPEC.md` owns the full stable design explanation, role Context owns durable facts, README owns human usage, and tests own machine proof.
- `ty-context doctor` reports the deterministic default Context read footprint, excessive/byte-identical default content and `DESIGN.md` authority status without creating a new validation gate. Byte budgets are advisory: required recovery facts win, and neither source tests nor release gates may force their omission, unreadable compression or wrong `on-demand` classification.
- `ty-context long-task compile` exposes the first-lock model choice as additive JSON rather than a persistent workflow state.

## Verification Entry Points

- `make validate-context`: Context recoverability.
- `make validate-harness`: Context plus touched-source modularity.
- `npm run test:affected`: fail-safe affected test selection.
- `npm run test:long-task:trust`: bounded high-impact Long-Task Trust Boundary regression after a candidate diff is frozen.
- `npm test --workspace project-tiny-context-harness`: complete package and Long-Task release-regression suites.
- Canonical tier-size/hotspot budgets, 14 stable critical-semantic sentinel IDs, deterministic `dist` freshness, immutable fixture-seed isolation, exhaustive per-file plus top-10 slow-file diagnostics and the environment-bound `github-ubuntu-v1` CI budget profile reduce cost and block semantic/cost regression without trimming complete-suite discovery; local timing remains diagnostic only.
- `npm run test:long-task-performance --workspace project-tiny-context-harness`: large-repository runtime budgets.
- `node packages/ty-context/dist/cli.js package check-source`: managed source/package parity.
- `git diff --check`: patch hygiene.

## Next Safe Action

Keep implementation, managed source, package assets, Context, `PROJECT_SPEC.md`, English/Chinese README and behavior tests aligned. Use affected/focused loops while editing, ignore only untracked `.work_products/**` from inferred local discovery while reporting it, then run exactly one highest selected aggregate on the frozen candidate: Trust when it is the highest required tier, or complete without a preceding Trust run when complete routing applies. A stronger replacement for a critical invariant updates its existing policy record/tag/rationale in review; ordinary tests remain outside that small registry.

## Context Index

- [harness-package](areas/harness-package.md)
  - [context model](areas/harness-package/foundation/context-model.md)
  - [workflow contract](areas/harness-package/contracts/workflow-contract.md)
  - [package-managed surfaces](areas/harness-package/contracts/package-managed-surfaces.md)
  - [Minimal Context rationale](areas/harness-package/decision-rationale/minimal-context.md)
  - [Architecture quality rationale](areas/harness-package/decision-rationale/architecture-quality.md)
  - [Long-Task Workflow rationale](areas/harness-package/decision-rationale/long-task-workflow.md)
  - [implementation index](areas/harness-package/implementation-index.md)
  - [verification](areas/harness-package/verification.md)
- [delivery-benchmark](areas/delivery-benchmark.md)

## Context Graph

See `project_context/context.toml` for registered areas, role Context, triggers and read policy.
