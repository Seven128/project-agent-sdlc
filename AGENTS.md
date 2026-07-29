# Project Agent Overlay

本文件是 agent 启动路由器和硬边界，不承载完整设计思想、长原则或角色流程；默认 Minimal Context 规则见下方 managed block。

## 本仓库 Authoring 例外

- 本仓库维护 `project-tiny-context-harness` package、Minimal Context managed assets、source sync、validator 和 delivery benchmark。
- 本仓库普通开发一律直接在 `main` 分支进行；除非用户明确要求，不创建、切换或保留 feature/Codex 开发分支或额外 worktree。显式选择 `long-task-workflow` 也始终复用当前选定工作区和当前原生 Goal，不创建编排分支、Worker 或 worktree。
- 修改 `packages/ty-context/**`、`.codex/ty-context-managed/**`、`tools/**` 或 `examples/delivery-benchmark/**` 时，先读 core Context、default area root 和由 `project_context/context.toml` 触发的相关 on-demand Context，并使用 `.codex/skills/authoring/harness_package_design/SKILL.md`。
- 旧阶段式工作流只作为历史设计摘要保留在 `PROJECT_SPEC.md`；不要把 stage artifacts 恢复成默认 package 能力。
- Karpathy 编码准则是本仓库 agent 的底层行为原则：先思考并暴露假设，优先简洁，精准修改，目标驱动验证；不要把长原则常驻在 AGENTS 启动路径。

<!-- ty-context:managed:begin -->
# Minimal Context Harness Protocol

This project uses Tiny Context. The Harness maintains durable Context and workflow authority; project tests, CI, runtime evidence and human acceptance prove product quality. Its three capabilities are Minimal Context, the automatically applicable default Workflow Contract and the explicitly selected Single-Goal Long-Task Workflow.

## Shared Architecture Quality Obligation

Before the first implementation edit, every delivery surfaces one externally observable, repository-bound `Architecture Deliberation`. Depth is risk-proportional, but the checkpoint always names affected owners, the current extension point/source of truth, dependency and state/lifecycle boundaries, the selected design and material alternatives, one plausible future-change challenge, touched technical debt and its disposition, forbidden shortcuts and project-owned checks. A small change may record preservation, but it still names the concrete owner/extension point and why no new or worsened debt is introduced. Refresh the checkpoint when scope, ownership or selected design materially changes.

After implementation and project verification, perform one current-candidate `Architecture Conformance`. Default work embeds it in Contract Conformance; an active Long-Task embeds it only in Final Gate. Never schedule both, and recheck after any candidate change. New/worsened debt, a duplicate source of truth, wrong dependency direction, owner bypass, scope escape or a forbidden shortcut blocks handoff unless a bounded project-owned exception records owner, rationale, tracking and removal condition. This creates no architecture artifact, second Authority, workflow state or generic analyzer.

## Default Workflow Contract

Unless a valid Long-Task binding is active, this prompt-level protocol applies automatically. It guides Agent execution but creates no validator result, Receipt, persisted phase state or machine-completion authority.

1. Read `project_context/global.md`, `project_context/architecture.md`, `project_context/context.toml` and the default area root, then collect graph/trigger candidates.
2. Before deciding `Context Delta`, run one bounded text search over `project_context/**` using a small high-signal set: explicit area/module names plus relevant API/schema/state/security/verification/deployment terms. Merge matches with manifest candidates and read only relevant Context; search supplements rather than replaces semantic judgment.
3. For UI/product-surface work, confirm information/action/feedback ownership and use `context_surface_contract` when durable responsibility is unclear or changes. For material UI, reconcile affected stable surface/control/target keys as Context-covered, requiring a Context update, task-local, out of scope or decision-required; traverse owning Context and `DESIGN.md`; and open every affected selected `exact-target` or `constraint`. Missing, stale, unreadable or conflicting authority fails closed for the affected claim. Local fixes and explicit non-fidelity prototypes stay lightweight.
4. Complete `Architecture Deliberation`, then decide exactly one `Context Delta: none|required`. Update owning Context before code for durable product ownership, architecture, API/schema/data, state/recovery, dependency, security, product-surface responsibility or repeatable verification/deployment change. Local fixes preserving durable semantics are `none`.
5. Use the agent/platform internal plan. Keep `Architecture Context Hit`, `Decision Rationale Hit: existing|required|none` and `Modularity Check: none|required|exception` as internal routing questions, not artifacts or extra deltas.
6. Implement precisely, run project-owned verification, perform Contract Conformance including `Architecture Conformance` and any selected-design closure below, then run the separate Context drift check. Report implementation, verification, architecture conformance, Context status and blockers. For material UI, inspect the production entry at a useful runnable slice and rerun the affected cold-start journey on the final candidate; detached routes/specimens are supplemental.

The default workflow never requires a plan artifact, matrix, verdict, evidence ledger or result document. Optional scratch is not Context or proof. Bounded Context search creates no index, cache, state or second authority.

## Selected-Design Conformance Obligation

This obligation activates only for a selected implementation handoff. Run `ty-context design-resource preflight <handoff.md>` before UI Authority Closure. A Web/App target needs one completely acquired machine-readable canonical entry and its exact dependency closure. Inventory every observable fact exposed by the acquired resources and declared inspector/oracle capability, close every resource as material-with-facts or honestly supporting-only and bind exact fact/evidence/Source/method sets. Product Control granularity is not the design-fact ceiling. An exact target also needs full-target layout and pixel facts for every condition; unresolved locators/cells/facts/meaning, unsupported evidence, partial input or stale digests fail closed. Preflight and hashes prove input completeness/integrity, never production conformance.

Every adopted target has exactly one canonical record: `DESIGN.md` for project/system/component-family scope or the owning Screen Contract for one-screen/interaction scope. It owns interpretation, selection basis, immutable locator/digest, conditions and editable-upstream update route; other layers keep only a stable key, owner/anchor and local applicability. Use the on-demand UI/UX Skill for Design Source Projection. Never overwrite an adopted baseline; create a new immutable version and update its canonical record.

Externally authored resources remain ordinary Source. Authoring Skills do not change Context, code or Contract and do not claim acceptance.

For every external product, architecture, technical or acceptance constraint, internally classify it as Context-covered, requiring a Context update, task-local, out of scope or decision-required. Conformance confirms it reached the correct owner and verification.

Default work keeps one ephemeral exact accounting of covered facts, Source Items, declared verification methods, blockers, targets and conditions. Route every item to its production owner, cold-start journey and an attributable final-candidate project check. Any unresolved, unmapped, unexecuted, stale or indistinguishable item blocks a complete claim and is reported as a gap. This creates no file, matrix, Claim set, state or Gate. An active Long-Task projects the same obligation into its existing Source/Claims/Assertions/bindings and Final Gate and never also runs the default closure.

## Long-Task Routing

Do not infer long-task mode from duration, complexity, file count or agent preference.

1. A valid Git common-dir active record plus matching worktree Git-config marker resumes with `ty-context long-task resume <workdir>` in the current native Goal; load and follow the package-managed `long-task-workflow` Skill.
2. An explicit selection of the logical `long-task-workflow` Skill authors or resumes exactly one complete `long-task-delivery-v2` Contract. In Codex, select it with `$long-task-workflow` or through `/skills`.
3. Otherwise remain on the default Workflow Contract.

“One native Goal” means the currently selected host execution Goal for this delivery and workspace, not a Harness-created or persisted Goal identifier. Compaction may continue inside that Goal; a later physical Goal/session restores semantic workflow state through `resume` rather than reconnecting a prior Turn.

The loaded Skill and its progressive references own Source/Contract authoring, Control/applicability closure, selected-design projection, evidence design, protected revision, rolling repair and lifecycle commands. Do not duplicate those low-frequency rules in this startup router. During Draft/proof/lifecycle work, read the applicable Skill reference and use `ty-context long-task help` for CLI syntax.

After the first Authority Lock, `execution_model_checkpoint.required: true` is a terminal-turn boundary. Unless the user already stated an explicit task-specific current-model or switch-and-resume strategy, stop before product implementation, edits, builds or tests and ask the user to choose `continue_current_model` or switch models and then resume. Generic continue/resume/finish/continue-goal language does not satisfy it; later revisions do not repeat it and Harness records no model route or checkpoint acknowledgement state.

Long-Task Final Gate is the sole `Architecture Conformance` and selected-design closure owner. It source-recompiles and reruns every declared Check on one current snapshot; targeted Progress, prose, historical tests, Receipts, compiled cache or Agent judgment never create acceptance. Exactly fresh `machine_accepted` with no pending External Confirmation is the complete declared-machine terminal; qualified/external-pending results never complete the platform-native Goal.

The `F = Implementation Freedom Boundary` keeps implementation order, methods, local feedback cadence and optional platform-native one-agent/multi-agent execution Goal-owned within Source/Contract, architecture, safety, forbidden-shortcut and external-action boundaries. Harness creates no development method Gate, per-edit mandate, agent scheduler/delegation state or proof from delegated reports; all proof-bearing output converges into the selected verification workspace.

Long-Task Anti-Degradation Assurance requires mechanism changes to preserve or strengthen coverage, false-negative resistance, fail-closed Authority and final-snapshot proof before positive net ROI matters. Replacing the controlling purpose requires an explicit project-owner design-purpose decision plus replacement proof.

Tiny Context does not create or restore platform Goals, invoke models, spawn agents, call an App Server, create branches/worktrees, merge, push, open PRs, deploy or manage process trees. `ty-context enable long-task` installs the Long-Task Workflow Skill, the retired Source Plan compatibility pointer and package-owned completion Hook. `design-system-authoring` is explicit-only.

## Durable Facts And Generated Surfaces

- Context is intended ownership/boundary/contract truth; code is current implementation truth. Treat disagreement as drift, missing work or stale Context.
- Long-term facts live only in `project_context/**` or `DESIGN.md`. Selected targets remain Context-reachable Source/verifier inputs; generated screenshots/diffs/logs/raw evidence/runtime state/Receipts do not become Context.
- Managed `AGENTS.md` blocks, `<harnessRoot>/ty-context-managed/**` and package-managed Skills are generated and sync-overwritten.
- Explicit upgrades use `context_harness_upgrade`; package sync never imports retired Campaign or development-period authority state.

## Verification

- `make validate-context`: Context recoverability.
- `make validate-harness`: Context plus touched-source modularity.
- `ty-context doctor`: installation health plus advisory default Context footprint and Design Authority status.
- `node packages/ty-context/dist/cli.js package check-source`: managed-source/package parity in this source workspace.

Every handoff reports exactly one of `Context: updated ...` or `Context: no durable fact change`. Never claim tests, deployment or acceptance from Context alone.
<!-- ty-context:managed:end -->
