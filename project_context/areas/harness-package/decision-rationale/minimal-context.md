---
context_role: decision-rationale
read_policy: on-demand
---
# Minimal Context And Single-Goal Rationale

## Decision

- Keep Minimal Context as the durable project-memory layer and use Single-Goal Rolling Delivery V2: one native Goal, one selected workspace, one complete Contract authority, compiled Source/REQ/CTRL/OBL/AC coverage and verifier-owned Live Final Gate completion.

## Reason

- This preserves recovery and false-completion protection while removing scheduler, worker, worktree, persistent model-routing and duplicate-authority mechanisms that do not improve evidence for a single continuing Goal.

## Why Minimal Context

- Modern coding agents already handle compact requirements, local design, editing, focused tests and repair. Persisting that mutable reasoning as a mandatory document chain adds synchronization cost without proving behavior.
- The durable value with the clearest return is project-owned intent: goals/non-goals, ownership, architecture/interface/state boundaries and repeatable verification/deployment paths that code alone cannot decide.
- Context therefore remains the smallest durable fact surface; default execution uses platform-internal planning and project evidence.

## Why Manifest Routing Uses A Bounded Search Fallback

- `context.toml` area, role, trigger and read-policy metadata provides a cheap first-pass route, but natural-language task wording can omit or paraphrase the registered trigger. Relying on prompt routing alone can hide a relevant on-demand Context and produce a wrong `Context Delta` judgment.
- The default Workflow therefore adds one bounded text search over `project_context/**` before `Context Delta`, using only a small set of high-signal task terms such as explicit area/module names and API/schema/state/security/verification/deployment language. Matching files are merged with manifest candidates and then filtered by semantic relevance.
- The search is intentionally narrow: it does not scan the whole codebase, create a vector index, persist search state or automatically treat every keyword hit as authority. This adds low fixed cost while reducing the most direct trigger-miss path.

## Why Retrieval Metadata Is Not Delivery Authority

- `triggers`, `read_when`, `read_policy`, default selection and unselected manifest nodes change how a future Agent discovers Context; they do not change the meaning of the Context already selected for an active delivery. Freezing them as delivery Authority creates revision and Progress-invalidating work without closing a false-completion path.
- Referenced Long-Task snapshots therefore hash a canonical projection of selected area ownership, selected role classification and selected dependency closure, plus the selected Context file contents. Those authority-bearing changes remain fail-closed.
- Retrieval-only edits may preserve scoped Progress, but they do not preserve final acceptance across a changed Git tree. The Live Final Gate still recompiles the final selected authority and verifies the final committed snapshot.

## Why A Long-Task Mechanism Still Exists

- Long work is vulnerable to delivery drift across pauses, compaction and repair loops. Prompt discipline alone cannot stop a model from treating partial or stale evidence as complete.
- The minimum high-value mechanism is one canonical intent/acceptance source plus verifier-owned same-snapshot completion and freshness. This catches cheap authoring errors before implementation and prevents historical proof splicing without externalizing the entire execution process.
- Risk-proportional proof avoids making ordinary multi-file work pay security/migration/full-population ceremony while preventing risky work from silently choosing weak evidence.

## Why Single Goal And Rolling Frontier

- Physical Goal/Turn lifecycle is a platform concern. Reimplementing it in Harness creates duplicate recovery authority and process orchestration that cannot improve product proof.
- Outcome dependencies describe acceptance and intermediate-proof readiness, not implementation scheduling. The rolling Frontier localizes verification and repair but never gates edits, so the current native Goal can adapt file/function/test order and targeted-feedback cadence to current code without freezing a speculative technical DAG.
- One selected verification workspace removes branch/worktree/integration recovery and combined-gate machinery from the core. Users or the platform may explicitly use native delegation/Git parallelism as implementation means, but Harness does not create or recover it, and all accepted output converges into that workspace.

## Why One Model-Choice Checkpoint Returns

- The host and user still own model selection; Harness cannot switch models. However, the first Authority Lock creates a useful economic boundary: Source, Contract, Context, risk and executable acceptance are now frozen, so the execution model can be chosen with materially lower drift risk than during authoring.
- Compile therefore emits one explicit pre-implementation choice: continue with the current model or switch models and resume the same active Long-Task. A task-specific model choice already stated by the user satisfies the checkpoint.
- The checkpoint occurs only once, after the first Authority Lock. Later revisions do not repeat it, and no acknowledgement file, model route, scheduler or checkpoint state is persisted. This preserves the cost benefit without recreating model orchestration.

## Why One Delivery Contract

- Product, stable Technical Boundary and Acceptance are distinct logical concerns but do not need separate files or a handwritten Requirement/PI/Obligation/Binding/AC/Proof/Spec namespace.
- Nesting Outcomes and Checks lets the compiler generate deterministic ids and bottom-up graphs. The Contract stays readable, revisable through normal Git history and free of duplicate semantic projections.
- A single coverage review can catch missing observable outcomes, control states, failure paths, non-completing results, technical boundaries and proof. No structural chain can prove the user omitted nothing; the workflow states that limitation honestly.

## Why Targeted And Final Verification Differ

- Targeted verify is fast feedback for the current Frontier, so it may cache current-snapshot status but cannot authorize completion.
- Final Gate reruns every required global/Outcome Check on one fresh snapshot. Equal execution identity can deduplicate work inside that Gate, while history is never reused.
- Stop and close close post-gate drift by recompiling source authority and executing the Live Final Gate; stored Receipts are audit-only.

## Retired Architecture Rationale

- The former multi-SFC campaign architecture externalized Source Unit inventory, Scope Fit, Packets, worker/model attempts, waves, worktrees, integration and finalization. Those mechanisms solved orchestration boundaries that the new core deliberately does not own.
- Their marginal complexity exceeded the value required for one native Goal in one workspace. They are removed from active runtime rather than kept as speculative dead code.
- Historical user files are preserved because deletion or automatic semantic migration cannot establish their new authority. Lightweight CLI tombstones give a safe English migration path without importing the retired runtime.

## Stable Anti-Goals

- Do not restore stages, thick plan/result documents, Source/SFC/Packet/Wave/Campaign state, agent/process/Git orchestration or persistent model routing as default or long-task runtime.

## Why Bundle Remains And Delivery Set Is Retired

- Physical authoring capacity does not create a product boundary, so a large atomic task uses Outcome fragments under one logical Contract.
- A user-selected delivery is never split into top-level Contracts. Independently decidable results are Outcomes under the same Contract and one Final Gate; a later independent user delivery starts its own separate invocation rather than a Delivery Set or in-task split.
- Authority Lock, immutable initial base and scoped progress close execution-side weakening, baseline washing and last-result-wins paths without introducing a scheduler or lifecycle.
- Do not make Context-first order/internal planning a validator gate.
- Do not let command exit, model prose, handwritten status, targeted passes or historical runs create accepted authority.
- Do not claim hostile-host security, complete requirement discovery, platform Goal observation or token/model-call accounting.
- Keep product quality with tests/CI/browser/runtime/data proof and human acceptance.
