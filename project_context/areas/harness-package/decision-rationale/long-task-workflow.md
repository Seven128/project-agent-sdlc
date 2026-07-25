---
context_role: decision-rationale
read_policy: on-demand
---
# Long-Task Workflow Design Rationale

## Decision

Single-Goal Long-Task Workflow exists to prevent false completion inside one complete declared delivery authority. It uses one native Goal, one selected workspace, one continuously authored Contract, semantic Outcome boundaries, repair-only targeted verification and one current-snapshot Final Gate. It does not own agent, process, model or Git orchestration.

Source-quality rules and Contract Draft authoring form one Source-bound authoring loop, followed by Preflight repair, formal Compile, one model-choice checkpoint, rolling implementation, verification and Final Gate in one `long-task-workflow` lifecycle. `source-plan-authoring` is now only a compatibility pointer.

The shared Architecture Deliberation occurs during Source/Contract authoring before formal Compile and implementation. Long-Task Final Gate is the sole post-implementation Architecture Conformance carrier; no default-workflow closure is nested around it.

## Controlling Objective

When Source is complete and fine-grained enough to cover every declared requirement and AC, and each item has reliable executable proof that the executing Agent cannot weaken by itself, the workflow must prevent every unsatisfied item from being accepted or reported complete.

For selected design resources, this includes one explicit design purpose: Agent implementation, acceptance and testing fully conform to every material UI/UX fact expressed within the resources' declared scope and conditions. It does not infer unexpressed interaction from a static view or prove that the user supplied every desired requirement. Open Design remains the default generation engine, but demonstrated capability is not a per-run guarantee: `design-resource-authoring` must commission and completely retrieve an implementation-level canonical source before a Web/App handoff may pass. A provider-neutral residual handoff references typed addressable facts and supplies applicability, omissions, product semantics, blockers and downstream bindings that the canonical source does not own. Long-Task preserves both layers through Source Claims, Controls/`surface_bindings`, method-specific Assertions and independently falsifiable production evidence through Final Gate; an unexpressed fact is refined, explicitly excluded/not applicable, decided or blocking, never invented.

Intermediate implementation may drift, fail or require rework. The workflow does not guarantee model success or a drift-free path. It constrains acceptance: compare Source Authority, Contract, relevant Context and the current artifact; block unsatisfied items; localize failures through Source Item, Outcome, Claim, Assertion, Check, Proof Surface, Binding and owner boundary; direct repair; and revalidate the complete final snapshot. Summary prose, progress, historical tests, Receipts and command exit alone never substitute for proof.

The efficiency target is the lowest practical total workflow cost that preserves this interception strength. Prefer equal protection with lower Authoring, Runtime, State, Recovery, maintenance and test cost, or equal cost with stronger independent drift prevention. Stop stacking mechanisms when independent protection no longer materially exceeds total cost; merely positive but marginal ROI is insufficient. When the evidence boundary is uncertain, fail safe rather than silently accept.

## Why Contract Draft Exists

Before the first successful formal Compile, `delivery-contract.yaml` is a non-authoritative Contract Draft. The Draft lets the author progressively preserve Source meaning, decompose it into atomic Claims and named Assertions, bind repository evidence, and resolve Preflight findings without prematurely creating Authority Lock.

The Draft is the same object that will later become formal Contract Authority. It may be edited across many repository reads and model responses. It needs no Draft Receipt, Authoring State, second plan, draft schema, draft CLI or draft runtime record.

## Why Outcomes Decompose Requirement Coupling

A Draft Outcome groups an independently observable and decidable result whose Claims and acceptance can be target-verified and whose dependencies and ownership boundary can be stated. This separates requirement coupling without splitting completion authority.

Outcome boundaries let one Goal keep a smaller dependency-ready working set, shorten targeted verification, localize failures, restore ready work and findings on resume, and mark precisely which local result became stale. An Outcome is not a response-length fragment, file group, frontend/backend layer, Agent-capacity unit or parallel-work allocation.

> Outcome decomposes execution and diagnosis, not completion authority.

## Execution Efficiency Without A Scheduler

`depends_on` expresses acceptance readiness. The current Goal uses it with current findings to form a temporary Rolling Frontier and chooses implementation order as code reality becomes known. The Frontier is not persisted and does not prescribe a mandatory implementation schedule.

No Draft Outcome creates a Worker, scheduler item, queue, process tree, model route or durable execution DAG. Outcome decomposition does not guarantee parallelism or fewer model calls. It improves intermediate implementation, verification, diagnosis and recovery while leaving final acceptance to the complete Contract.

The workflow must never proactively spawn, assign or coordinate parallel subagents. Platform or Agent internal delegation may still occur, but it is opaque and non-authoritative: the Harness neither depends on it nor persists it, and all outputs must converge into the unified current workspace snapshot before acceptance.

## Why One Model-Choice Checkpoint Exists

The host and user own model selection, and Harness cannot switch the model of a running conversation or Goal. It therefore creates no model router, model worker, tier scheduler or acknowledgement state.

The first successful Compile is nevertheless a distinct cost boundary: Source, Contract, relevant Context, risk and acceptance evidence are now under Authority Lock. At that point the user can safely choose whether to keep the authoring model or switch to a lower-cost execution model, while the locked Contract, targeted repair and Final Gate continue to constrain completion.

Compile emits `execution_model_checkpoint.required: true` only for the first Authority Lock. The Agent stops before product implementation and asks for `continue_current_model` or a model switch followed by resuming the active Long-Task. A model strategy already stated explicitly for the task satisfies the checkpoint. Later revisions return `required: false`; no repeated cost-only pause occurs.

This checkpoint is an execution-cost optimization enabled by the workflow's drift protection, not acceptance evidence. Model choice never proves a Claim and does not weaken Final Gate requirements.

## Why Context Remains Mutable During Execution

`Context Delta` is not a one-time pre-Compile decision. The current Goal must re-evaluate `Context Delta` whenever implementation or repair discovers a durable fact and update the owning Context rather than freezing a known error until the end.

The verifier distinguishes two classes in referenced snapshot mode:

- **Controlling Context** includes core Context, every explicit `context_ref`, verification and deployment Context, and every other selected file whose semantics can change ownership, architecture, contract, risk, recovery or repeatable verification. A change always requires Authority Revision and invalidates affected proof, but it requires a user decision only when the compiled Claims, targets, proof obligations or another decision boundary change. A raw snapshot update with those locked semantics unchanged is mechanically bounded rather than a reason to interrupt.
- **Supporting Context** is limited to graph-derived, non-explicit `implementation-index` and `archive` files. These files improve navigation or preserve background material but do not define acceptance. Their content may auto-revise through `compile --revise` without user approval, and a supporting-only revision does not invalidate otherwise fresh targeted Progress.

Full snapshot mode treats every Context file as controlling. Explicitly referencing an otherwise supporting role also makes it controlling. This prevents the executing Agent from relabeling a requirement-bearing file as support to bypass Authority Revision. Final Gate still recompiles and binds the complete current Context snapshot, so supporting updates remain visible without becoming an acceptance authority.

## Why Contract Draft Authoring Is Integrated

An early design considered having Web GPT independently emit a complete Contract Draft before repository work. That scenario was abandoned because a complete Draft can exceed Web GPT's reliable single-response length; requiring one response to contain the whole delivery Contract would make completeness depend on output capacity.

Once work enters Codex, the same Draft can be revised continuously in the real repository. Keeping Draft authoring inside `long-task-workflow` also has six architectural advantages:

1. real repository and Context reads are required to bind owners, paths, runners, verification inputs, proof surfaces and Bindings;
2. Preflight findings can directly repair the same Draft;
3. no extra Skill handoff can lose Source meaning, repository evidence or unresolved findings;
4. there is less pressure to create a second plan, Authoring Authority or Authoring Receipt;
5. Draft-to-Compile remains a lifecycle transition of one object rather than a conversion between products; and
6. the Skill can iterate across as many responses as necessary, then continue through Compile, the one-time model choice, rolling execution, verification and Final Gate.

The platform-neutral form of this rationale belongs in `PROJECT_SPEC.md`. The Web GPT-to-Codex history remains source-workspace rationale only and must not enter package-managed Skills or public consumer guidance.

## Why Source Authoring Merged Into Long-Task

The earlier separate `source-plan-authoring` boundary existed so an external conversational service could prepare a high-fidelity proposal before Codex. Once external proposal generation moved to the initial-proposal boundary—and selected design resources had to join that proposal—the extra handoff no longer provided independent protection. It added manual intervention, duplicate context transfer and a place to lose design provenance while saving little token cost.

The useful semantics remain: full mixed-input inventory, direct/derived/delegated/evidence-backed provenance, preference-sensitive research, stable keys, surface/control/state completeness, exact risk facts and falsifiable acceptance. They now live in `long-task-workflow/references/source-authoring.md` as on-demand rules within the same Source-bound Contract Draft loop. A writable initial proposal becomes the real Source; conversation-only input materializes one project-native Source. Draft mapping can begin immediately, while provenance, Source repair and markers converge before Preflight/Compile.

This removes a service boundary without creating a Source schema, Authoring Authority, gate, Receipt, cache or state. Legacy Source Plans remain valid ordinary Source and are never rewritten merely for compatibility. The old Skill is retained as a pointer so explicit historical invocations fail legibly rather than silently restoring the former workflow.

Keeping Source Authority does not justify keeping Source Authoring as an internal phase. The Contract cannot become the sole owner of missing meaning, but forcing Source completion before opening the Draft adds a serial pass without independent protection. The fail-closed invariant is instead a convergence deadline: real Source, provenance, markers, repository bindings and complete mapping must all be ready before Preflight/Compile.

## Why Workspace Scope Is Classified Before Activation

The immutable baseline protects later verification only if the first Compile cannot absorb an already-dirty undeclared file. A Verify-only `scope_escape` check detects post-lock drift but misses that first-lock path, while a Preflight-only fix can be bypassed by direct Compile.

One pure classifier therefore owns protected authority, declared expected change, allowed support, forbidden and unclassified path categories. Preflight and direct Compile classify `HEAD` to current workspace before first lock; later Compile/Verify/Final Gate classify immutable `initial_task_base` to current workspace. A bounded input collector enumerates only actual current package-asset files for configured managed destinations plus exact config/hook files during first enable; it never exempts a managed directory root or broad `.codex/**`. This shares semantics without adding schema, persistent classification state or a blanket package-directory exemption.

## Why Stale Progress And Execution Preview Stay Advisory

`progress_stale` means historical targeted evidence no longer describes the current authority/input snapshot. It is not a scheduler event and cannot know the cheapest trustworthy feedback path for every project. The current Goal may coalesce relevant edits and use project-owned incremental feedback, but must refresh evidence before relying on the affected Outcome or entering Final Gate.

`verify --explain` lowers feedback-planning cost by projecting selected compiled main Raw Execution groups and applicable Counterfactual executions without running them. It reports only declared execution counts and boundaries; it cannot promise elapsed time or reveal how many internal builds/processes a project runner may perform. Because it writes no Progress and produces no proof, it adds no acceptance bypass, execution mode or persistent state.

A second executing `diagnose-check` would still invoke the same opaque project runner while adding another execution surface and ambiguous evidence semantics. It is therefore rejected. The lower-cost generic combination is project-owned fast feedback during edits, preview before an expensive declared run, targeted verify at a useful stability/dependency boundary and Final Gate for acceptance.

Likewise, glob width and carrier/root reachability are semantic rather than syntactic. Authoring requires the smallest sound causal `input_paths`/Binding envelope and a defensible target-root route for every Counterfactual carrier, but a generic path-name linter cannot know whether `apps/**` is necessary or whether a language/runtime actually imports a barrel. Repository evidence may support the authoring decision; otherwise the current-execution Counterfactual is the proof. Runtime-specific readiness probes, build-cache invalidation, streaming progress/heartbeat and descendant-process cleanup stay with the project runner. This avoids false confidence and business-specific Harness logic while addressing the expensive-rerun cause before execution.

Preference clarification and delegation semantics are unchanged: ask only when an unknown priority would change research/recommendation; use current authoritative evidence for unstable claims; record defensible recommendations in real Source; and leave payment/contract/deployment/destructive/permission/sensitive-data/legal-security actions as external confirmations. Contract YAML cannot introduce unrecorded product meaning.

## Why Visual Design Authority Resolves Before Compile

A material production UI can satisfy functional checks while still inventing its information hierarchy, layout and component language from an unconfigured starter or style-only prose. Screenshot-checking that implementation against a baseline created from the same implementation is circular and cannot prove fidelity to user intent.

Long-Task therefore supplies the strong machine carrier for the shared selected-design obligation while reusing existing Source and authoring boundaries rather than adding a visual lifecycle. Before Compile, visual references are classified as exact targets, partial constraints or inspiration; `DESIGN.md` names the authored token source/generation direction; and every material surface either has sufficient selected authority, is explicitly scoped as a prototype/non-fidelity result, or records delegated design Source after material preferences are known. A missing or user-reserved visual direction remains `decision_required`.

The selected target must exist as Context-reachable Source or a frozen verification input before fidelity implementation is accepted. Exactly one canonical adoption record connects its stable key to interpretation, selection basis, readable immutable adopted version/digest, declared conditions and editable upstream owner/locator/update route: project/system/component-family targets live in `DESIGN.md`, while one-screen/interaction-specific targets live in the owning Screen Contract. Other layers retain pointers and applicability only. Each affected workflow opens the target before deciding. Updating it creates a new immutable version rather than overwriting the adopted baseline. Generated implementation screenshots and diffs remain artifacts and cannot promote themselves into target authority. Browser Claims use `ui_browser`; native/mobile/desktop Control proof uses `runtime_behavior` on its declared product target. A typed `design_conformance` record is distinct from `visual_render`: it binds the selected target identity and declared conditions to current actual/comparison artifacts, while the project verifier remains responsible for the comparison observation. This closes hidden-resource, duplicate-adoption, circular-self-baseline and undeclared-design paths without adding a visual Claim kind, resource registry, new risk level, second Gate, approval state or required design directory.

## Why Control Projection Expands Instead Of Adding UI/UX Workflow State

The remaining false-completion path is lossy authoring: interactive Source can state a control's task, visibility, availability, validation, default, navigation, recovery, permission and accessibility while the Contract preserves only coarse states. The executing agent then invents discarded semantics and a broad UI check may pass without proving them.

Preserving fields alone is insufficient: a real delivery demonstrated that all Control Claims could be proven on a support browser while the required native root shell remained a placeholder, because deep-linked page Checks and resource-integrity checks bypassed the production entry/owner. The smallest fail-closed invariant therefore has two parts: every applicable Control field survives as one Source-backed Claim, and every declared Control belongs to an aggregated production `surface_binding` that fixes product target, owner surface, route/component Binding carriers and a root-entry real-user Check. Every Control Claim must have target-local proof; for each bound Control the root journey proves its navigation result when declared, otherwise its interaction, trigger or location fallback, through interaction plus target-runtime evidence.

Selected exact/constraint targets extend that same binding with frozen input files, named conditions, a root-entry conformance Check/Assertion and current actual/comparison artifacts. The binding's explicit blocker inventory maps every declared design-acceptance blocker to a target-local machine Claim or target-blocking External Confirmation. An empty inventory means none were declared; it cannot waive a known blocker, whose removal instead requires revised Source and protected Contract authority. Compile rejects Controls without the binding closure, so older V2 Contracts with Controls receive an actionable semantic-migration diagnostic instead of silent proxy acceptance; Contracts without Controls pay no new authoring cost.

This projection reuses existing Controls, Claims, Technical Bindings, Checks, Assertions, External Confirmations, protected revision and Final Gate. Its cost is one entry per production surface/target rather than one record per field or screenshot, plus conformance only for selected targets. It closes independent proxy-target, deep-link/root-entry, integrity-versus-conformance and unmapped-blocker paths with no runtime/state/recovery plane. A prose-only repair was rejected because the observed all-green delivery already satisfied prose guidance; a universal per-Control screenshot matrix and a separate UI registry/Gate were rejected for materially higher authoring and maintenance cost.

Combined design-and-implementation work likewise reuses ordinary Outcomes, Stages and Authority Revision. Design Outcomes may author candidates before a selected target exists, but candidate/planned artifacts authorize no fidelity Claim. Selection first becomes real Context-reachable Source plus its owning Context/`DESIGN.md` reference; after Authority Lock its adoption is an Authority Revision that returns to rolling implementation. This keeps one Contract, one Active Authority and one Final Gate while preventing a planned-target bypass.

## Why The Generation Engine Stays External And Commissioning Remains Thin

The page-level authority model can consume rich design resources without recreating mature generation workflows owned by Open Design/Product Design, design platforms, image-generation, prototype and human design systems. A local prompt/template fork, required Resource Pack, provider-specific schema or registry would duplicate upstream logic, drift from live capabilities and still provide no implementation or acceptance authority.

Live Open Design 0.15.1 research established two thin adapters. MCP exposes design systems as `od://design-systems/<id>/DESIGN.md` resources and accepts `create_project.designSystem`, but has no creation tool; therefore `design-system-authoring` feature-detects future MCP lifecycle support and otherwise uses the official same-daemon generation/revision/accept API. It is explicit-only because cold-start visual direction is a user-owned product choice. Candidate, selection and adoption stay separate; project `DESIGN.md`/token/Context remain canonical and provider identity is synchronization only.

`design-resource-authoring` closes the scoped commissioning gap. Style-bearing work requires configured authority and verified provider binding; non-fidelity structure/flow/state work does not. Candidate implications remain task-local until selection, then accepted decisions are reconciled into the initial proposal once. For an implementation Web/App handoff, the commission also requires a machine-readable canonical entry, an exact dependency closure, complete non-truncated retrieval, immutable digests, stable typed locators and explicit reachable state/interaction/responsive/motion/accessibility/asset facts for every claimed condition. PNG or a provider-success response may supplement that source but cannot be its only implementation representation.

The remaining independent gap is semantic and causal loss between provider output and downstream implementation/proof. Direct visual inspection can overlook or reinterpret layout, component anatomy, states, transitions, motion, breakpoints/input and accessibility. Free prose can omit a category; hashes can authenticate a file whose locator is fictional; one coverage row can falsely span a subject's unrelated targets or conditions; and a verification-method name or blocker key can exist without any proof carrier. Conversely, manually retyping every CSS/property value creates a drifting second fact source.

The admitted mechanism therefore has three owners:

1. the canonical implementation source owns directly code-expressible layout, size, style, content, state, interaction, responsive, motion, semantic and asset facts;
2. one strict provider-neutral `design-resource-handoff-v1` residual index owns scope, applicability, product semantics, exclusions/unresolved meaning and downstream indexes while referencing canonical facts through preflight-resolved typed locators; and
3. the consuming workflow owns production consumption through one carrier: task-local project checks plus Contract Conformance by default, or existing Contract Claims, Controls/`surface_bindings`, method-specific Assertions, typed evidence and Final Gate for Long-Task.

The shared closure follows the same causal boundary. Source profiles prove one entry and its exact declared dependency set were completely acquired and hashed. Coverage closes each applicable `subject × target × condition × dimension` cell instead of accepting a broad row. Default work keeps exact Source-item/method/blocker/target/condition accounting ephemeral and accepts a complete-conformance claim only after independently attributable production checks pass on the final candidate. Long-Task binds every declared method to an independent positive Assertion containing relevant Source-item Claims and the required `design_conformance`, interaction and target-runtime capabilities; every blocker preserves its Source-item and method lineage into target-local machine proof or a target-blocking External Confirmation. Current-snapshot Final Gate is the only Long-Task carrier and never nests the default closure. Authoring/preflight success proves only input completeness and integrity.

The provider decision follows independent-benefit ROI rather than format preference. Figma is useful when an existing design authority/team needs native Components/Variables/Variants, shared libraries, Dev Mode or Code Connect, but paid seats, MCP quota/authentication and second-representation synchronization make default Open Design-to-Figma conversion unjustified. Penpot is compelling when open/self-hosted multi-user design infrastructure is itself required, but its service/plugin/file/deployment/backup boundary likewise does not replace enforcement. OpenPencil is a low-cost MIT local static-layout sidecar, while its current prototype-flow, trigger/action/overlay and motion-model gaps prevent it from serving as the sole eight-dimension source. These tools remain optional upstream adapters; no provider-specific Resource Pack/schema/registry, new Authority or new Gate is admitted.

## Why One Contract And One Final Gate Remain

Draft Outcomes make rolling work cheaper to reason about, but they do not create separate authorities. The first successful formal Compile locks the complete Contract, including all Outcomes. Targeted verification is repair evidence for selected Checks or Outcomes and never accepts the task.

Final Gate rechecks all Global and Outcome Checks on one current snapshot. This prevents local passes, stale passes or historically compatible results from being aggregated into completion. There is always one selected delivery, one Contract Authority and one Final Gate.

## Why Architecture Quality Reuses The Final Gate

Long-Task shares the same architecture-quality obligation as default work: one visible repository-bound Architecture Deliberation before implementation and one current-candidate Architecture Conformance after project verification. The deliberation is not a promise of universal future-proofing; it makes owner/source-of-truth/dependency/lifecycle/alternative/future-change/debt/check conclusions observable and routes durable results to Context.

Material, falsifiable conclusions already fit the Contract's Technical/Global authority: Source-backed obligations, constraints and forbidden shortcuts, owner/path envelopes, Bindings and project-owned executable Checks. Final Gate already recompiles that authority and reruns every Check on one current snapshot. Adding a second architecture Gate, field, Receipt or default Contract Conformance pass would duplicate ownership and runtime cost without closing an independent false-completion path.

The invariant is therefore single-carrier: before Authority Lock, architecture conclusions that matter to acceptance are declared through existing fields; after implementation, only Final Gate may accept them. A changed candidate or authority invalidates the Gate and reruns the existing freshness path. Subjective quality remains engineering review, while undeclared or unforeseeable requirements remain outside machine proof.

## Semantic-Drift Closure Index

The anti-semantic-drift design is indexed by the following stable mechanism keys. They are sections of the one Contract and the one Evidence Kernel, not additional plans, authorities, receipts or workflow state.

- `LT-STAGE`: Source-declared ordered delivery stages group vertical Outcomes. A stage names one gate Outcome; the Outcome DAG must make that gate depend on the rest of the stage and make later stages depend on earlier gate Outcomes. Every required target is proved at the gate from its root entrypoint, and a multi-Outcome stage additionally declares cross-surface consistency evidence. Stage readiness and status are derived from existing Progress, never persisted separately.
- `LT-TARGET`: the task declares one precise target profile, its non-empty `required_target_refs`, and the execution targets that matter to it. Each required ref resolves to a product target with a runtime family and root entrypoint. A Check binds to one target and declares root or internal entry. Every Stage Gate and critical journey proves every required target; a passing Web/process route therefore cannot satisfy an unproved Native target.
- `LT-EVIDENCE`: every Assertion declares an all-of set of evidence capabilities. `presence` proves only static presence; behavioral capabilities require exactly one typed current-execution evidence record per declared capability. Records are bound to the Assertion, Check, target and artifact hashes where applicable; cross-surface records use distinct `surface_ref` values and may cover multiple surfaces inside one runtime target.
- `LT-SCENARIO`: every Check declares one atomic Given/When scenario. Runtime evidence names the executed Given states and ordered actions; a materially different success path belongs in another Check or Outcome.
- `LT-PATH`: every Outcome declares whether success and degradation paths are required, and every Check declares its journey role. A degradation, recovery or unavailable result cannot prove the Outcome Result Claim or substitute for a required success Check.
- `LT-EXTERNAL`: external confirmations declare a kind, impacted Claim refs and whether they block the selected target. Functional prerequisites must block it; production-only gates do not block a lower target. Reclassification or impact removal is protected Authority change.
- `LT-ADEQUACY`: the existing read-only Preflight/Compile kernel checks stage closure, target/runner compatibility, scenario/evidence completeness, success/degradation separation, external impacts and risk-proportional conformance coverage before Authority Lock. There is no new lifecycle Gate or reusable adequacy receipt.
- `LT-CONFORMANCE`: an independent read-only Global product-conformance Check is required only when weak observability combines with multiple stages or multiple required product runtime families. It uses a distinct Raw Execution, starts from a declared root product target and participates in the existing Final Gate; a simple single-stage/single-family delivery keeps the cheaper existing sensitivity path. It is distinct from the shared Architecture Conformance obligation and is veto evidence, not a second acceptance authority.
- `LT-UI-SURFACE`: Controls require an aggregated production surface/product-target binding to existing route/component carriers and a root-entry real-user Check. Selected exact/constraint targets additionally require frozen inputs and typed `design_conformance`; explicit blocker dispositions reuse machine Claims or blocking External Confirmations. A support target, detached/deep route, resource-integrity result or render-only artifact cannot substitute.
- `LT-REVISION`: Authority change and user decision are separate. Monotonic strengthening, raw Source/Context snapshot updates with unchanged locked meaning, operational Runner/input repair, repository-bound scope expansion and machine-proven equivalent failure interception may auto-adopt; lost target/Claim/scenario/Evidence Capability/failure coverage, semantic/external/forbidden-boundary or verifier-kernel change and unknown reasons fail closed for one exact decision. Every pending decision derives a self-contained human brief from the canonical hash-bound summary, and every adopted revision returns to rolling implementation and invalidates affected evidence.
- `LT-TERMINAL`: terminal projections keep the existing workflow status vocabulary and additionally name the accepted target profile, target state and derived stage results. This removes ambiguous `machine_accepted` meaning without adding a second completion state machine.
- `LT-ROI`: admit a mechanism only when its expected independent drift-prevention benefit materially exceeds its total Authoring, Runtime, State, Recovery, maintenance and test cost. ROI must be positive and not marginal; prefer one cohesive implementation when staged partial mechanisms would leave seams or cost more overall.

The evidence envelope stores bounded hashes, identifiers, changed-field names and artifact references rather than unrestricted raw payloads. Capability-specific observers remain project-owned and frozen as verifier authority; the Harness validates their declared structure, current execution, target binding and cross-record invariants but does not claim hostile-verifier attestation.

## Why Live Target-Runtime Feedback Reuses Existing Checks

A same-snapshot Gate is only as truthful as its declared Checks. When a result can pass on a proxy surface while failing in its target runtime, rereading a tracked status report during Final Gate reruns the reader, not the target. The accepting Check must therefore exercise the declared target during its current Raw Execution and derive the asserted Observation from that session. Historical reports, screenshots, binaries and logs remain review artifacts; build, install, process start or absence of fatal logs prove only those exact claims unless a product-owned sentinel or interaction is also observed.

The same Check belongs to the earliest Outcome that owns the first runnable target boundary instead of a terminal omnibus Outcome. Its declared execution target, root/internal entry mode, `input_paths`, Binding carriers, verification inputs and environment requirements bind the runtime-affecting surface. The current Goal targeted-verifies it after the first runnable slice and again before dependent work grows when accumulated relevant changes make Progress stale. Related edits are coalesced, identical Raw Executions may still deduplicate, and a full target rebuild is not required per Outcome or per edit.

This closes two distinct paths: late discovery that multiplies rework, and false acceptance from a current snapshot containing stale self-reported runtime status. The bounded runtime-family and entrypoint schema prevents a browser or internal route from silently standing in for a native/root journey. Capability-specific probes remain project-owned and are required only for the Claims that need them. Targeted results remain repair-only; the one Final Gate reruns every declared live Check on the final snapshot.

## Mechanism Admission And Cost Boundary

A Long-Task change begins with the controlling design purpose and accounts for total cost by explicitly including the cost of introducing the change in its ROI judgment. A change to mechanism semantics, invariants, authority/proof boundaries or runtime behavior modifies the mechanism and its verification; a change that does not affect a mechanism stays at its owning point instead of being promoted into one.

A mechanism is admitted or retained when it closes a concrete and otherwise insufficiently covered false-completion or delivery-drift path, establishes a testable invariant, fails closed and has expected independent drift-prevention value that materially exceeds its total Authoring, Runtime, State, Recovery, maintenance and test cost. ROI must be positive and not marginal. Prefer measured data, benchmarks or operational evidence. When none exists, discuss the decision with the user or project owner; rigorous causal reasoning plus simple, bounded validation is sufficient. The Long-Task Workflow itself began from that logic-and-basic-validation standard rather than mature longitudinal data. Unsupported intuition alone is not sufficient.

With the design purpose fixed and ROI materially positive, prefer stronger purpose fulfillment when total cost is comparable, or lower implementation and operating cost when purpose fulfillment is comparable. Prefer a cohesive one-time change when partial mechanisms would preserve semantic seams or create more aggregate migration and maintenance cost.

Review must identify the path, invariant, proof, overlap with existing mechanisms, the risk reopened by deletion, total cost, net benefit, fail-closed behavior and whether the proposal creates a second Authority, second plan or scheduling plane. This review is a design and code-review principle, not a matrix file, Receipt or runtime Registry.

The rule is risk-proportional. L0 local, reversible and directly testable work pays no Contract cost. L1 uses one complete Contract, rolling repair and a current-snapshot Final Gate. L2 raises proof only on affected high-risk Outcomes. Risk may rise automatically or explicitly and cannot be downgraded by the executing Agent.

Affected-test selection follows the same rule. It shortens the developer feedback loop by mapping known hot spots to focused tests, widening unmapped Long-Task runtime changes to the canonical Trust Boundary Gate, and widening shared package, dependency or unknown changes to the full suite. One plan executes only its highest aggregate, so complete coverage supersedes a redundant Trust invocation. Inferred local discovery omits and reports only untracked `.work_products/**`; tracked or explicitly supplied paths remain inputs. Reviewed Trust/focused/hotspot budgets, a small stable critical-semantic mapping and the environment-bound `github-ubuntu-v1` profile prevent silent semantic/cost growth while complete discovery stays exhaustive. These mechanisms are fail safe and never replace complete CI/release gates or the workflow Final Gate.

Phase 4 runtime reduction and its anti-degradation closure stay below the acceptance boundary. A deterministic build-input fingerprint prevents stale `dist` from consuming a suite run; an immutable process-scoped fixture seed removes repeated Git initialization while each test still owns a copied repository; terminal sentinel coverage and per-file/top-10 timing derive from the same current event stream; and concurrency applies only to explicit proven-isolated files while every unknown file fails closed to serial. `resume` completes the workspace status/fingerprint, including its index-writing phase, before observing current Git state against the same repository; independent fixture repositories remain eligible for bounded concurrency after a real shared-seed probe. Stable IDs protect only independent critical invariants rather than freezing every test name, and Trust membership derives from the same records. These mechanisms reduce recurring cost and protect the design purpose without caching results, retrying Git locks, weakening current-snapshot proof or creating a test authority/scheduler/state plane.

Authority Revision and terminal guidance use the same cost rule. The former `reduction_reasons == approval_required` rule paid a human interruption for execution repairs even though exact identity, evidence invalidation and Final Gate already carried the safety cost. The revised derived policy retains those protections but asks only for real user-decision reasons; Rev3-Rev36 read-only replay projects 33 approvals to two decision events (31/33, 93.94% fewer), and Rev12's exact existing instruction removes the duplicate prompt so only Rev3 needs a new question. This evidence is a regression corpus, not permission to auto-classify an uncertain change: missing preservation proof remains fail closed.

The implementation adds only derived fields/classification and tests. It adds no command, persistent state, editable review artifact, instruction ledger, native-Goal state, second Gate or positive Agent-judgment proof. Before asking, an Agent may mechanically relay an explicit current task instruction only when it exactly covers every listed decision reason; generic blanket authorization or inference cannot. Candidate diagnosis stays stateless so withdrawn identities do not produce questions. This yields materially positive ROI: negligible runtime/recovery cost versus removal of repeated high-cost interruptions while the unchanged Final Gate still proves the adopted snapshot.

When a rolling blocker motivates revision, implementation difficulty alone cannot move a machine-verifiable requirement behind an External Confirmation or erase it. A real scope change is marked Source meaning and follows Authority Revision; repo-bound implementation scope alone may auto-adopt, while any Product/Claim/target/acceptance/external boundary change requires the exact user-decision identity. After adoption, affected weak-observability or high-risk Outcomes pay an adversarial evidence review: the Check must reach the furthest independently failing boundary named by the Claim, provide the declared capability records, and use a causal Counterfactual or failure/input-variation record when carrier presence alone can diverge. Risk-proportional review is enforced by the existing activation kernel and Final Gate rather than a universal runtime suite.

## Current Mechanisms And False-Completion Paths

- **Material Source inventory** prevents a Source item from being omitted, rewritten or disappearing without a mapping.
- **Atomic non-Result Claim Coverage** prevents several specific requirements from collapsing into one broad Outcome Result.
- **Source AC to named Assertion semantic identity** prevents acceptance meaning from being weakened in the Contract; the same canonical resolver covers Outcome refs and `GLOBAL.<check>.<assertion>`, while Global ACs require an independently Source-backed Global Claim and cannot cross scope.
- **Shared Preflight/Compile activation-safety kernel** prevents skipping Preflight from bypassing activation rules.
- **First-Compile Authority Lock and Authority Revision** prevent Source, Contract, Controlling Context or verifier edits from washing away requirements during execution.
- **One-time execution-model checkpoint** uses an explicit terminal-turn contract so implementation cannot silently pass the choice boundary; only an explicit task-specific current-model or switch-and-resume strategy satisfies it, while generic continuation does not. It lets the user exploit locked Authority and Final Gate protection without creating model routing, persisted acknowledgement or repeated pauses. It is a cost mechanism, not proof.
- **Controlling/Supporting Context classification** permits low-risk navigation/background updates during execution without discarding valid Progress while keeping explicit, verification, deployment and full-snapshot Context fail closed.
- **Executing Agent cannot originate its own weakening decision** prevents the implementer from lowering its own acceptance bar. Mechanically relaying an explicit current task instruction that exactly covers every listed reason is user decision transport, not Agent approval; generic blanket authorization never qualifies.
- **Decision-relevance revision classification** keeps formally monotonic strengthening, mechanically bounded execution/Source/Context repair and repo-bound scope expansion automatic, permits stateless scope diagnosis, and keeps semantic/proof/forbidden-boundary/verifier-kernel changes plus unknown reason codes behind the exact revision identity.
- **Exact material revision summary, self-contained decision brief and rolling return** explain what Authority Revision is, distinguish decision reasons from mechanically bounded changes, show Source/Product/proof/runner/scope/risk/external-confirmation changes, affected Outcomes, reject/previous-Authority behavior and no-completion effect, then make adoption return to implementation. The brief is a projection of canonical summary data, not another authority.
- **Stateless same-Contract candidate diagnosis** lets related scope discoveries accumulate in `delivery-contract.yaml`, coalesces withdrawn/replaced identities and can exercise existing active Check identities before the final Compile without creating a pending Draft authority, revision lifecycle, Progress, Receipt or acceptance result. The previous Authority remains the only active one throughout diagnosis.
- **Targeted verify is repair evidence only** prevents a local pass from being reported as whole-delivery completion; Counterfactual failure is part of the owning Check Result/Progress rather than a transient top-level Finding, so status/resume cannot recover a false `progress_passing` state.
- **Live target-runtime Check ownership** prevents a proxy pass or tracked self-report from proving a Claim that can fail independently in the target; the earliest owning Outcome executes the target in the current Check run and binds runtime-affecting inputs through existing fields.
- **UI production-surface binding and design conformance** prevent support-target Controls, detached/deep routes, resource integrity, render-only artifacts or omitted declared blockers from accepting a required production UI. One surface/target projection reuses Technical Bindings, root Checks, Claims and External Confirmations; only selected targets pay comparison evidence.
- **Coalesced rolling runtime verification** reduces late-rework cost by using that same non-accepting Check at the first runnable boundary and after accumulated relevant input changes, without a per-Outcome rebuild rule, scheduler or new state.
- **Same-snapshot Final Gate** prevents historical pass aggregation and stale evidence reuse.
- **Shared Architecture Deliberation plus Final-Gate-only Architecture Conformance** makes architecture work observable before implementation and binds every declared invariant to the same final snapshot without a second Gate, field or state. Default Contract Conformance is not run on the Long-Task route.
- **Stop/close rerun the Live Final Gate** prevents post-Gate Source, Context, Contract, verifier or code drift from being accepted.
- **Machine/native terminal scope isolation** makes Final Gate, Stop and close identify declared machine Authority, leaves native Goal mutation with the host and uses a veto-only Goal-to-Source conformance review before platform completion.
- **Scope escape and risk escalation** prevent work outside the declared boundary from passing under the old scope or proof level.
- **Counterfactual, Population and sensitivity proof** prevent always-true tests, sample-only claims and evidence disconnected from implementation carriers.
- **Global Counterfactual to Outcome Binding** prevents a Global Claim from being backed by an unrelated global oracle without inventing a second Global Binding model; the cost is one explicit cross-scope reference and carrier freshness dependency.
- **Exact Risk marker metadata** prevents a strong Source risk from being redirected to a weaker Fact or another Outcome; ambiguity costs a real `decision_required` pause instead of an inferred downgrade.
- **Planned Binding existence** permits truthful authoring before a new file exists, while Final Gate existence and freshness close the no-op mutation path; compile-time absence is allowed only for the declared planned lifecycle.
- **Two-layer Playwright trust** treats frozen standard test content as verifier authority and pays mutation cost only for `weak_observability`; its dedicated policy accepts Playwright's real exit-one test-failure protocol only when the entire unexpected-instance set is exactly the designated AC set, preserving fail-closed Baseline behavior without mutating every UI test.
- **Non-completing Source kind** prevents explicit “does not count as done” meaning from being weakened into an ordinary Requirement or non-goal and makes its negative sensitivity independently traceable.
- **Affected developer routing, critical semantic continuity, aggregate dominance and isolated runtime reuse** reduce repeated full-suite, stale-build and fixture-setup cost without lowering release proof because unknown or broad changes widen, complete supersedes Trust inside one canonical plan, only inferred untracked local work products are omitted and reported, seed copies remain independent, same-repository Git index observation is ordered at its coordinator, critical IDs must appear exactly once in the reviewed file and pass, every unclassified file remains serial, focused results remain non-authoritative, tier/hotspot growth requires explicit review and named controlled CI catches catastrophic wall-time regressions while same-run top-10 attribution identifies cost owners without limiting complete discovery.
- **Managed source, generated copy and package asset parity** prevent source-workspace rules and consumer-installed rules from diverging.
- **Pre-Compile Design Authority readiness** prevents a material UI implementation from treating an unconfigured starter, style prose, inspiration or its own generated screenshot as an exact production target; existing Source decisions, verification inputs and external confirmations carry the result without a visual state machine.

These mappings explain existing value; they are not a runtime mechanism matrix or a second Authority.

## Trusted Results And External Pending

Machine authority has only two trustworthy outcomes: fresh evidence on the current final snapshot proves all declared requirements and ACs, or at least one item is unsatisfied, unverifiable, insufficiently evidenced, stale or externally pending and the delivery remains explicitly unfinished or qualified.

`machine_accepted_external_pending` means the machine-verifiable scope passed while external confirmation remains. It is not complete external delivery, must be reported with the pending confirmation, and is not a vague third completion state.

That qualification must remain continuous after Final Gate. Collapsing it into `last_gate_passed`, `{}`, or generic `closed` reopens a false-completion path for callers that only see status, a resumed session, the Stop Hook or close output. The accepted workflow status therefore propagates through each surface; stale Receipts lose their accepted projection, while external confirmations remain visible as current Contract declarations. Stop/close can end the machine Authority lifecycle without tracking external work, but their output cannot convert machine acceptance into complete external delivery.

Progress, status, Receipts and compiled cache are audit/recovery projections. Candidate diagnostic results are transient repair output and are never Progress or completion evidence. Source, Controlling Context, Contract, verifier, runner or workspace drift stales affected evidence. Supporting-only Context revisions may preserve scoped Progress, but every adopted protected revision invalidates derived evidence; `resume` restores current semantic state rather than a physical Turn, and historical or candidate evidence cannot be spliced into current acceptance.

## Stable Anti-Goals

- No `draft_outcomes` or `plan_items` schema fields.
- No `DraftOutcome` runtime type, Draft Outcome state, Worker, scheduler or queue.
- No Contract Draft CLI, Receipt, Authoring State or Authoring Authority.
- No persistent pending-revision Draft, standing-approval policy, candidate cache, candidate Progress or revision scheduler; repeated candidate edits live only in the existing `delivery-contract.yaml` until ordinary Compile creates one exact pending decision.
- No standalone `contract-authoring`, `draft-authoring` or draft-preparation Skill.
- No second plan, second Contract authority, top-level Contract split or targeted-verify acceptance.
- No capacity-, layer-, file-, module-, Agent- or parallelism-based Outcome splitting.
- No proactive parallel subagent dispatch, Worker graph or subagent recovery state.
- No automatic model switch, model-tier scheduler, model routing state, repeated model checkpoints or persisted checkpoint acknowledgement.
- No open-ended `platform_impact` flags, manually maintained per-platform progress, or mandatory full runtime rebuild per Outcome/edit. The only target qualification is the Contract's bounded required-target/runtime-family/root binding plus `implementation_complete`, `target_profile_usable` or `production_release_ready` at terminal projection.
- No persistent `authority_revision_in_progress`, native-Goal completion state, Goal restoration runtime or second semantic completion Gate.
- No mandatory Source Plan format and no consumer platform-history guidance.
- No restoration of SFC, Packet, Wave, Campaign, Delivery Set or model/process/Git orchestration.

## Known Limits

- The workflow cannot prove that the user declared every real requirement.
- It cannot guarantee that a model completes implementation or avoids intermediate drift.
- It cannot switch the model selected by the host or observe opaque platform-internal delegation.
- It accepts only declared, falsifiable machine authority; CI, deployment and human product acceptance remain external.
- It trusts the installed project verifier and cannot semantically inspect whether an oracle truly exercised its claimed target; current-execution target proof is therefore a Contract-authoring and verifier-quality invariant, not hostile-verifier attestation.
- It cannot generically parse every external design-resource format to discover undeclared blockers. Source authoring must preserve explicit blocker facts, `surface_bindings` make their disposition machine-checkable once declared, and hostile or omitted Source remains outside acceptance.
- Local mode trusts the installed verifier and Git metadata and is not a hostile-host security boundary.
- Complete current-snapshot verification costs time; risk-proportional routing and affected developer tests keep unnecessary cost off ordinary work without weakening release acceptance.
