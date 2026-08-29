# Architecture Context

This is the minimum durable component, authority and data-flow map for the Harness source repository. Detailed contracts, current implementation owners, proof routes and rationale are selected on demand through `project_context/context.toml`.

## System Boundary

- The repository owns the `project-tiny-context-harness` package, `ty-context` CLI, managed Minimal Context/default Workflow assets, validators, source synchronization, explicit Long-Task capability, release automation and delivery benchmark.
- Harness owns durable Context and declared workflow mechanisms, not application quality. Product code, project tests, CI, runtime observation and human acceptance remain evidence authorities.
- Harness does not own host Goal/Turn lifecycle, model selection, general agent/process scheduling, Git collaboration, CI/deployment or external-confirmation execution.

## Component Map

- CLI and command routing: `packages/ty-context/src/cli.ts` and `packages/ty-context/src/commands/**`.
- Context manifest/graph/validation/export/sync/doctor: an immutable Shared Context Catalog under `packages/ty-context/src/lib/context-catalog/**` owns parsed/normalized Manifest facts, registered and unregistered discovery, reusable diagnostics and default-footprint projection; existing validators, `context-*`, `sync-engine.ts`, `doctor.ts` and managed templates consume it through their current public entrypoints.
- Read-only Context diagnostics: `commands/route.ts` and `commands/context.ts` consume the Catalog. Experimental route scans all eligible `project_context/**` under deterministic literal-search budgets without replacing Workflow discovery; `context inspect` explains one current node without writing.
- Context mutation: `packages/ty-context/src/lib/context-mutation/**` is the future staging/CAS/journal/recovery owner for register and move. It reuses Catalog validation over a candidate overlay and current Long-Task binding/Authority checks; no ordinary command claims a multi-file filesystem transaction is physically atomic.
- Managed-source owner: `.codex/ty-context-managed/**`; package output: `packages/ty-context/assets/**`; copy authority: `packages/ty-context/source-mappings.yaml`.
- Design Authority and authoring adapters: `design-md.ts`, package-managed design Skills and project-owned `DESIGN.md`/Context. Root `DESIGN.md` remains the single entry/revision/initial Token owner; an optional sparse manifest binds a complete subordinate/generated closure digest, and every DRA or Long-Task consumer revalidates that identity. External resources and Authority-delta assessments remain Source/diagnostics, not a package registry or acceptance state.
- DRA replay/recovery/writeback: the package-managed `design-resource-authoring` Skill plus `commands/design-resource.ts` and owner-local recovery modules. A conditional ignored checkpoint stores only replay inputs; live Provider/artifact/suitability/audit/writeback views are re-derived, and no DRA state enters Long-Task authority.
- Long-Task: `packages/ty-context/src/schemas/long-task-delivery-v2/**` plus focused Source, Contract, evidence, authority, revision, recovery and Final-Gate modules under `packages/ty-context/src/lib/long-task-*`.
- Direct-process actual acquisition reuses `long-task-source-target-*`, `long-task-observation-authority.ts`, `long-task-process-runtime-closure.ts`, `long-task-execution-observation.ts`, the existing Counterfactual owners and the shared exact comparator. The compiled closure contains only the Source-backed root, safe repository-relative argv values which match production Bindings by exact path or pattern, and exact Claim/Counterfactual production carriers; `input_paths` remains scope/freshness only.
- Global Checks reuse Outcome-owned Bindings through the internal scoped identity `<outcome>.<binding>`. Logical identity remains outcome-scoped while execution snapshots deduplicate the same physical carrier path; authored Contract Bindings, Authority, Gate and persistent state remain unchanged.
- Test feedback/cost: `tools/affected_change_discovery.mjs`, `affected_test_selection.mjs`, `test_suite_policy.mjs`, `test_suite_lane_policy.mjs`, package build fingerprinting and package-suite runners/reporters. They select regression evidence and never create delivery acceptance.
- Release: `.github/workflows/npm-publish.yml` and release prepare/artifact verification/publish tools. Publication consumes one tested packed artifact and is outside Harness workflow authority.
- Exact modules and tests are indexed in [implementation index](areas/harness-package/implementation-index.md); command and tier semantics live in [verification](areas/harness-package/verification.md).

## Context Recovery Architecture

- The near-universal startup set is `global.md`, `architecture.md`, `context.toml` and the default Area root.
- Foundation, contracts, implementation, verification and rationale stay `on-demand` unless genuinely near-universal.
- Before `Context Delta`, the Agent merges manifest/trigger candidates with one bounded high-signal search over `project_context/**`; semantic judgment selects relevant matches and later dependencies may widen the set.
- The startup/candidate set is an expandable minimum, never a read sandbox, access-control list, automatic Authority inference or complete-graph mandate.
- A durable fact has one primary owner. Startup surfaces keep short responsibility, hard-boundary and routing statements instead of copying specialized rules.
- Monorepos may sparsely place Context-bearing implementation workspaces under `project_context/workspaces/<workspace-id>/**`, each mapped to one code root through existing Area fields. Unrepresented code workspaces need no empty mirror; shared/repository facts remain top-level. Placement guides recovery and grants no edit permission.
- Read scope and intended change scope remain separate. If user/product/path facts do not distinguish materially different sibling products, default work pauses product edits for one concise clarification. Intentional multi-workspace targets and supporting/shared changes are explicit.
- `ty-context doctor` reports default files/bytes, duplicates and Design Authority signals as advisory maintenance data. Required recovery facts outrank the soft byte heuristic.

The complete Context purpose, effect/efficiency non-degradation and change admission are owned by [Minimal Context rationale](areas/harness-package/decision-rationale/minimal-context.md).

## Data / Control Flow

Default:

`minimum Context + manifest candidates + bounded search + dependency widening -> intended-target resolution when needed -> material requirements/conditions/owners/failure-recovery understanding -> Architecture Deliberation -> Context Delta -> Goal-owned implementation -> fresh project checks and failure repair -> current-candidate Contract/Engineering/Architecture Conformance -> qualified handoff -> Context drift`

Experimental diagnostic:

`task/path/literal terms + Shared Context Catalog + bounded all-Context scan -> stable registered/unregistered candidates + costs/ambiguity/completeness diagnostics -> Agent judgment`; this path writes no state, does not change the minimum Context set and does not satisfy the default search in its first release.

Long-Task:

`Source/resources + relevant Context -> Architecture Deliberation -> one Source-bound Contract Draft -> Preflight -> Compile/Authority Lock -> one host-owned terminal-turn checkpoint -> Goal-owned implementation/repair -> protected revision when needed -> source-recompiled one-snapshot Final Gate -> qualified declared-machine result`

- Complexity changes depth, not route. Machine completion authority/recovery/audit need selects Long-Task explicitly; risk inside Long-Task selects its proof floor.
- Default work performs risk-proportional material reconciliation and project verification. It creates no complete semantic Census, stable Fact/Obligation identities, exact-set proof, per-Fact results, Authority or machine result.
- Long-Task owns exact declared semantic/design closure, Authority freshness and current-snapshot Final Gate. Its Progress, delegated reports, historical results and Receipts are never acceptance.
- Each route has exactly one post-implementation conformance carrier for a candidate: default Contract Conformance or Long-Task Final Gate.

## Design Rationale

- Keep near-universal recovery summaries in the startup set and specialized mechanism/proof detail in one on-demand owner; bounded discovery closes wording drift without imposing full-graph reading.
- Keep the default Workflow prompt-level and Long-Task machine-authoritative so ordinary work pays no exact-ledger/state cost and selected assurance retains one complete Authority/Final Gate.
- Keep managed source canonical and synchronize installed/package copies one way; generated copies never become independent design owners.

## Shared Engineering Quality Boundary

- Every implementation delivery surfaces one repository-bound `Architecture Deliberation` before its first implementation edit. It names affected owners, source of truth/extension point, dependency and lifecycle boundaries, selected/rejected alternatives, future-change pressure, debt disposition, forbidden shortcuts, project checks and applicable quality risks.
- Correctness and maintainability always receive preservation. Other quality families activate only when the change exposes material reliability, concurrency, performance, security, compatibility or operability/testability risk.
- Implementation remains Goal-owned and reuses the real owner, one source of truth and explicit failure/resource semantics. A new abstraction requires a stable evidenced change axis.
- Current-candidate Engineering Quality Conformance includes Architecture Conformance and checks only attributable project-check-bound invariants. It is not an overall code-quality Authority.
- A performance or cost improvement claim requires a named workload, metric, baseline/budget, environment, comparator/tolerance and current project-owned measurement.

## Dependency And Ownership Constraints

- Context owns durable intended facts; Source owns task-specific product/technical meaning; code owns current implementation; project evidence proves behavior.
- Managed sources are edited at their canonical owner and reach installed/package/public copies through source mappings and workspace sync. Generated copies never become independent semantic owners.
- Migrations are versioned, deterministic and exact-ownership-aware. Ordinary sync does not run a tombstone registry or reinterpret user files.
- Context structural writes are staged and content-identity protected. Lossless Manifest patching, current-byte CAS, an owner journal and explicit recovery precede multi-file publication; single-file rename is not generalized into a cross-file atomicity claim.
- External generators may produce Source but cannot become Context, Design Authority, Contract or acceptance. The only DRA workflow-state exception is the versioned task-local non-authoritative replay checkpoint defined by the owning authoring contract; it is neither Provider lifecycle nor Long-Task state.
- Product-surface responsibility, visual Design Authority and engineering architecture stay with their existing non-overlapping Context/Skill owners.

## Constraints And Tradeoffs

- Smaller default Context trades automatic reading of every specialized fact for lower recurring attention cost; bounded search and dependency widening reduce but cannot eliminate recall risk.
- The default Workflow is prompt-level and deliberately lacks machine Authority and persistent recovery state. Its effect floor is protected through current-candidate evidence and honest qualification, not a duplicate exact ledger.
- Long-Task pays greater authoring and verification cost only when its exact, recoverable machine assurance is selected. It keeps one Contract, one workspace and one Final Gate without owning implementation scheduling.
- Anti-degradation changes are effect-first. A safeguard must close an independent real path, reuse the lightest owner-local mechanism, add no second Authority/Gate/state and show evidenced high total-cost ROI and high efficiency after effect equivalence. High means a significant, stable margin rather than merely non-negative cost; it does not require exhaustive search or proof of a global/local optimum.
- Sufficiency stops construction after the declared-purpose validity floor, relative non-degradation, must-allow controls, structural-cost limits and applicable total-cost thresholds are met. Reopen mechanism expansion only for a new real counterexample, a repeated material cost hot spot or evidence of significant additional net benefit.
- Static guidance and parity checks establish distribution and known structure, not Agent adherence, provider execution or high ROI. Those claims require the existing controlled benchmark/trace and complete-cost boundary; `observed_lifecycle_*` facts alone have no admission meaning.

## Verification Implications

- `make validate-context` protects recovery structure; it does not prove product behavior or impose an absolute byte ceiling.
- `make validate-harness` adds touched-source modularity and owner checks within its declared language capabilities.
- Workflow/Context tests protect routing, default-versus-Long-Task carrier separation, current-candidate evidence wording and absence of new state/authority.
- Migration/package tests protect exact ownership, collision preservation, generated/package parity, idempotence and consumer behavior.
- Long-Task Trust/complete tests protect its declared Authority, proof and lifecycle boundaries when affected.
- Fresh-Agent benchmark conclusions require frozen baseline/candidate, host/model/tools/settings, hidden oracle, normalized trace and sufficient independent pairs; otherwise only static continuity may be reported.

## Open Risks

- Bounded search can miss synonyms or indirect dependencies.
- Prompt guidance cannot force an Agent to apply every recovered fact or select the intended sibling without sufficient task facts.
- A complete declared Contract cannot discover an omitted human requirement or independently prove an arbitrary external Oracle sound.
- Managed, generated, package, public and Context surfaces can drift unless existing parity and current-candidate checks remain enforced.
