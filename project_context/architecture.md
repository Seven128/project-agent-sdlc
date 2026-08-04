# Architecture Context

This is the minimum durable architecture map for the Harness source repository. Detailed contracts, current implementation owners, proof routes and rationale are selected on demand through `project_context/context.toml`.

## System Boundary

- The repository owns the `project-tiny-context-harness` npm package, `ty-context` CLI, managed Minimal Context/default Workflow assets, validators, source sync, explicit Long-Task capability, release automation and delivery benchmark.
- Consumer projects receive portable core/default assets. `ty-context enable long-task` adds the Long-Task Skill, retired Source Plan pointer and package-owned Stop Hook.
- Harness owns durable Context and declared workflow authority, not product quality. Project tests, CI, runtime observation and human acceptance remain evidence authorities.
- Harness does not own host Goal/Turn lifecycle, models, agents, process trees, network isolation, Git collaboration, CI/deployment or external-confirmation execution.

## Component Map

- CLI/command routing: `packages/ty-context/src/commands/**`.
- Context manifest, graph, validation, export, sync and doctor: `packages/ty-context/src/lib/context-*`, `validators.ts`, `sync-engine.ts` and `doctor.ts`.
- Design Authority scaffold/advisory inspection: `design-md.ts`, managed UI Skills and project-owned `DESIGN.md`/Context. Selected targets remain ordinary Source or verifier inputs, not a package-owned design registry.
- Long-Task schema/compiler: `packages/ty-context/src/schemas/long-task-delivery-v2/**` plus focused `long-task-*` Source, Contract, activation, authority, revision, evidence and lifecycle modules.
- Long-Task Context authority: `long-task-context-authority-topology.ts` separates selected delivery-authority structure from retrieval guidance; `context-graph-snapshot.ts` freezes the selected/full Context boundary required by the active mode.
- Evidence Kernel: runner adapters, structured/Playwright observations, Counterfactual and Population sensitivity, exact target-runtime evidence, Git-aware snapshots and the source-recompiled same-snapshot Live Final Gate.
- Authority/recovery: one Git common-dir Active Authority plus matching worktree marker; workdir compiled output, Progress and Receipts are rebuildable audit/recovery projections.
- Test feedback/cost: `tools/affected_change_discovery.mjs`, `affected_test_selection.mjs`, `test_suite_policy.mjs`, package build fingerprinting and the package-suite runner/reporters. These surfaces never define Delivery acceptance or cache green results.
- Release: `.github/workflows/npm-publish.yml` prepares/tests/packs/smokes once, then the protected publisher verifies and publishes those exact bytes without rebuilding.
- Managed-source owner: `.codex/ty-context-managed/**`; package output: `packages/ty-context/assets/**`; copy authority: `packages/ty-context/source-mappings.yaml`.
- Exact current modules and test owners live in the on-demand [implementation index](areas/harness-package/implementation-index.md); detailed commands and tier semantics live in [verification](areas/harness-package/verification.md).

## Default Context Read Architecture

- Near-universal startup Context is limited to `global.md`, `architecture.md`, `context.toml` and the default area root.
- Foundation, workflow-contract, package-managed-surface, implementation-index, verification and rationale Context is selected on demand.
- Before `Context Delta`, the Agent combines graph/trigger candidates with one bounded high-signal text search over `project_context/**`.
- Search discovers candidates only; semantic judgment decides relevance. It creates no vector/persistent index, cache, registry, state or second authority.
- The selected startup/candidate set is a minimum working set rather than a read sandbox. The Agent may widen to any Context or code needed for an indirect/shared dependency, while a complete-graph default remains intentionally absent.
- Monorepos may mirror only Context-bearing implementation workspaces under `project_context/workspaces/<workspace-id>/**`. Every represented Context workspace maps exactly one repository-relative code root through existing `[[areas]].root` and `context`; multiple workspace-local Areas may own distinct durable responsibilities within that root. Package-manager/build files remain the complete implementation-workspace authority, so unrepresented workspaces require no empty Context directory.
- Cross-workspace, repository-wide, shared and governance Areas remain under top-level `project_context/areas/**`; single-workspace and non-monorepo projects retain that existing layout. Directory placement, Area selection and `read_policy` guide ownership/discovery and never grant or deny reads or edits.
- A monorepo's default Area should normally be the small top-level repository-common owner; workspace-local Areas and role Context stay `on-demand` unless their facts are truly near-universal.
- A durable fact has one primary Context owner. Startup surfaces retain short routing/hard-boundary statements instead of copying specialized rules.
- `ty-context doctor` reports deterministic default files/bytes, exact duplicates and Design Authority signals as advisory maintenance information, never as acceptance state or an absolute byte gate.

## Design Rationale

- Keep the startup graph small because every fresh Agent pays its read and attention cost; preserve specialized truth through on-demand ownership.
- Add bounded search because manifest triggers are cheap but wording recall is imperfect. Search supplements rather than replaces semantic reasoning.
- Keep retrieval and mutation as separate questions: shared Context/code can be read for a client task without becoming a product target. Resolve task-local intended workspace(s) from explicit user/product/path/repository facts; only unresolved ambiguity among materially different siblings pauses product edits, while intentional cross-workspace work names every target and any supporting/shared scope.
- Let consumer repositories own exact path-to-target rules and changed-path verification. Harness invokes or follows those project-native checks when present and otherwise uses final diff/owner Conformance; it does not infer a universal monorepo dependency or applicability graph.
- Keep default-route planning, architecture judgment and implementation order inside the current host Goal regardless of task complexity. Persist only durable facts and use project-native executable checks for objective boundaries.
- Make Architecture Deliberation and applicable engineering-risk conclusions externally observable and risk-proportional without creating an engineering plan/quality authority or claiming private-reasoning proof.
- Keep Long-Task acceptance separate from implementation sequencing: one Contract and one Final Gate provide completion authority without a scheduler, second plan or Worker state.
- Protect `F = Implementation Freedom Boundary`: within declared authority and architecture/safety/external-effect constraints, the Goal selects methods, feedback cadence and optional native delegation; delegated reports are never proof and all proof-bearing results converge into one workspace.

## Shared Workflow And Engineering Quality

- Every implementation delivery surfaces one repository-bound `Architecture Deliberation` before the first implementation edit. It includes triggered quality attributes or a concrete preservation basis, then Goal-owned implementation follows boundary/failure/abstraction guardrails without a new stage or method Gate.
- Deliberation always identifies the concrete owner/source of truth/extension point, shortest reliable verification route and debt disposition. Material work also resolves dependency direction, interface/state/resource lifecycle, alternatives, a plausible future-change challenge, forbidden shortcuts, project-owned checks and applicable failure/load/threat scenarios.
- Exact expected semantics remain with authoritative Source/Context or selected-design resources. Long-Task may project them into Non-UI Semantic Facts or selected-design Facts; the default route does not build a parallel exact ledger. Shared Engineering Quality owns implementation boundaries, risk treatment and proof method and creates no duplicate quality values, manifest or matrix.
- Durable conclusions update owning Context; local conclusions remain task-local. A material scope, owner, Context, selected-design, applicable-quality or debt-disposition change refreshes the deliberation.
- Work of any complexity automatically follows the prompt-level Workflow Contract unless Long-Task is explicitly selected or already bound. It uses platform-internal planning and carries Engineering Quality Conformance—including Architecture Conformance—inside Contract Conformance. It creates no workflow state or machine-completion result.
- An explicitly selected or validly bound Long-Task loads the `long-task-workflow` Skill. Its Final Gate is the sole Engineering Quality/Architecture and selected-design closure carrier and proves only declared, falsifiable, project-check-bound invariants, not overall code quality.
- Harness routes project-owned architecture/type/lint/behavior/benchmark checks but is not a language-generic analyzer. Its modularity command exposes JS/TS, Python and line-only capability honestly; unsupported metrics are unavailable rather than zero.

## Data / Control Flow

Default:

`minimum Context + manifest candidates + bounded Context search + dependency-driven widening -> intended-workspace resolution when needed -> material requirement / selected-design authority understanding -> Architecture Deliberation + applicable-quality assessment -> Context Delta -> Goal-owned implementation discipline -> fresh project verification / project-owned changed-path scope check -> failure localization and affected repair -> current-candidate Contract Conformance / Engineering Quality Conformance including Architecture Conformance -> qualified handoff -> Context drift check`

Long-Task:

`proposal/resources + minimum Context -> one Source-bound Contract Draft loop -> Preflight -> Compile / Authority Lock -> one-time unconditional host model-change checkpoint -> Goal-owned adaptive implementation -> optional targeted repair evidence -> protected revision when needed -> source-recompiled same-snapshot Final Gate`

- Product, Technical Boundary and Acceptance remain distinct logical authorities inside one Contract.
- A Draft Outcome is the pre-lock lifecycle of an Outcome, not another runtime type or authority. Dependencies express acceptance/intermediate-proof readiness and never implementation permission.
- Preflight is read-only and non-authoritative; Compile creates Authority Lock and the one-time unconditional host model-change boundary.
- Targeted verification localizes repair and may store scoped Progress, but only Final Gate can create Long-Task machine acceptance.
- One native Goal means the currently selected host execution Goal, not a Harness-created or persisted Goal identifier. Compaction may continue in that Goal; a later physical Goal/session restores semantic state through `resume`.
- Revision adoption invalidates affected evidence and returns to rolling implementation; it never completes delivery or mutates the host Goal.
- Final Gate/Stop/close bind current Source, Context, Contract, verifier/runner and workspace inputs and rerun all declared Checks on one snapshot. Public output preserves declared-machine versus native-Goal scope.

## Contract And Engineering Quality Closure

- Default and Long-Task share one thin engineering-quality obligation but use mutually exclusive closure carriers and different completion-authority levels. Any later candidate, declared check-input or authority change invalidates the owning closure.
- Stable architecture and material engineering-quality requirements use existing Source-backed technical obligations/constraints/forbidden shortcuts, owner/path boundaries, Bindings and project-owned executable Checks.
- Functional behavior and an engineering-quality invariant use independent Assertions when either can pass independently; one broad quality Boolean cannot prove several independently failing invariants.
- Unsupported design preference, inferred product semantics or unverifiable “good design” remains durable Context, task-local judgment or `decision_required`, never false proof.
- Scope escape, duplicate authority, owner/service bypass, wrong dependency direction, a second source of truth, missing triggered-quality proof or new/worsened debt blocks handoff when the declared invariant applies and no bounded project-owned exception closes it.
- Default Contract Conformance distinguishes read dependencies, intended product targets, allowed supporting changes and actual changed paths; verifies that explicit Source/Context reached the correct owner; uses only checks rerun after the last relevant change; and separates implemented, verified, unverified and decision/external-pending scope. It uses a repository-owned scope verifier when available; unrelated pre-existing dirty paths are not attributed to the current task without task provenance.

## Constraints And Tradeoffs

- Smaller default Context trades automatic reading of every specialized rule for lower recurring attention cost; manifest routing plus bounded search reduces but cannot eliminate recall risk.
- Intended-workspace resolution is conditional. A non-monorepo repository or an already explicit/unambiguous target pays no schema, state, migration or clarification ceremony.
- The default Workflow Contract is soft/prompt-level. Project checks prove behavior; it deliberately has no validator, Receipt, persisted phase state or machine acceptance.
- Route selection is assurance-driven rather than size-driven: complexity changes execution and verification depth; required completion authority, recovery and auditability determine whether Long-Task's durable Contract/Authority/Final-Gate cost is justified; Long-Task's existing internal risk floor then selects standard or strict proof.
- The first successful Long-Task Compile creates Authority Lock and always ends the current turn at the host model-change checkpoint before implementation; earlier model wording cannot skip it, continuation is not proof that the model changed, and Harness stores no acknowledgement or model route.
- One selected delivery has one Contract, selected verification workspace and Final Gate. Harness owns no delegation, branch/worktree or process fan-out.
- Selected-design preflight/integrity never substitutes for production conformance. The default route performs risk-proportional project-native checks and reports unchecked declared conditions without an exact Fact ledger; Long-Task compiled proof remains the sole exact machine carrier.
- Quality attributes are constraints and tradeoffs, not automatic maximization targets. Performance claims require attributable workload/budget/environment/measurement; preservation-only work uses the cheapest existing evidence and makes no unsupported improvement claim.
- Retrieval guidance, test timing and benchmark output remain non-authoritative. Formal mechanism adoption requires non-degradation first and positive total ROI second.
- Package-managed asset changes require canonical-source edits, generated/package parity, idempotent sync and consumer-facing verification.

## Verification Implications

- `make validate-context` protects required recovery structure and registered role consistency; it is not weakened to obtain a smaller Context.
- Default-footprint tests prove deterministic selection, exact-duplicate reporting and advisory budgets, not compliance with an absolute byte ceiling.
- Workflow tests prove manifest routing plus bounded search, prompt-level default semantics, explicit/bound Long-Task routing and absence of added index/state/authority.
- Sparse-workspace tests prove the default set remains a starting set, represented Context workspaces map through existing fields, unrepresented code workspaces need no Context directory, ambiguous-target/change-scope guidance reaches managed/generated/public surfaces, and non-monorepo initialization remains unchanged. Static guidance tests do not prove Agent adherence; an effectiveness claim requires fixed independent fresh-Agent runs.
- Long-Task tests prove Source/Contract/Authority continuity, the unconditional one-time host checkpoint, protected revision, exact evidence sensitivity, current-snapshot Final Gate and declared-machine/native-Goal separation.
- The `implementation-freedom-boundary` critical sentinel protects Goal-owned order/method/feedback/delegation choices without weakening final proof.
- Affected/focused and Trust tests are feedback/package regression evidence only. Unknown or shared changes widen fail safe; complete selection supersedes a redundant Trust invocation.
- Managed source, generated workspace copies and package assets remain byte-aligned through source sync and `package check-source`.
- Project-native architecture/modularity/type/behavior/measurement checks protect only their declared observable boundaries; Final Gate alone carries Long-Task Engineering Quality/Architecture Conformance.
- Trusted publication binds the tested tarball, source commit and stable lockfile identity across the protected job boundary.

## Open Risks

- A structurally complete Contract cannot discover requirements omitted from Source.
- Bounded keyword search can miss synonyms or indirect dependencies; conclusion-grade Agent routing evidence is required before replacing it.
- Same-user files, installed package/runtime behavior, Git metadata and declared external observers are trusted boundaries, not hostile-host isolation.
- Engineering quality beyond declared/falsifiable invariants still depends on engineering judgment and review.
- Public docs, Context, managed source, package assets and generated copies can drift unless parity checks remain enforced.
