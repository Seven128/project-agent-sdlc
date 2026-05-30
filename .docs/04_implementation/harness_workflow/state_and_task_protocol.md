# State and Task Protocol Implementation

## 1. 关联信息

- Domain: `harness_workflow`
- Module / subsystem / core flow: lifecycle state, plan state, task execution protocol and gate evidence
- Updated by task: `DEV-010`, `DEV-011`, `DEV-018`, `DEV-019`, `DEV-024`, `DEV-025`, `DEV-026`, `DEV-027`, `DEV-028`, `DEV-043`, `DEV-050`, `DEV-056`, `TASK-057`, `TASK-059`, `TASK-061`, `TASK-062`, `TASK-065`, `TASK-069`, `TASK-071`
- Linked PRD: `.docs/01_product/npm_package_distribution.md`
- Linked technical design: `.docs/03_tech_plan/harness_package_distribution.md`
- Linked RFC: `RFC_004`, `RFC_005`, `RFC_010`, `RFC_011`, `RFC_012`, `RFC_013`, `RFC_014`, `RFC_015`, `RFC_016`, `RFC_018`
- Linked commits: historical `DEV-*` implementation commits; `DEV-043` migration commit; `DEV-050` implementation commit

## 2. 当前实现范围

- `.codex/state/lifecycle.yaml` stores the single source for current phase routing state.
- `.codex/state/plan.yaml` stores the current and future short-lived task contract across all workflow phases, without duplicating `current_phase`.
- `plan.yaml` is conceptually a recoverable task-splitting container for long-running project goals; the default Harness workflow only interprets phase-related tasks, while broader project-specific task definitions belong in local configuration or overlays.
- `.codex/state/plan.draft.yaml` is the current built-in draft queue; it stores only unadopted development draft tasks and `next_task_sequence`, without `current_phase` or `current_task_id`.
- `TASK-*` is the new task id model; `phase` identifies `REQUIREMENT_GATHERING`, `ARCHITECTING`, `SPRINTING`, `REVIEWING`, `TESTING`, `RELEASING` or `RFC_RECALIBRATION`; historical `PRD-*`, `DES-*` and `DEV-*` ids remain validator-compatible provenance.
- `next_task_sequence` preserves future `TASK-*` id allocation after done tasks are removed.
- Document, review, test, release and RFC tasks use `result_docs` for planned fact-source outputs; development tasks use `implementation_doc`.
- Checkpoint files, archive directories, gate result logs and lifecycle history are no longer active state facts.
- `.codex/state/memory.md` is a short cross-stage reminder and navigation surface; complete decision context, alternatives, rationale and consequences belong in `.docs/05_decisions/` ADRs or other formal `.docs/**` fact sources.
- `.docs/05_decisions/` is not a lifecycle phase; it is an `ARCHITECTING`-produced ADR fact source for durable architecture decisions that may outlive a single architecture or tech plan slice.
- `phase_contracts.yaml` supports optional `returns` targets for bounded pre-development rollback; the default contract allows `ARCHITECTING -> REQUIREMENT_GATHERING` so PRD facts can be corrected before `SPRINTING`.
- A SPRINTING task completes in two commits: implementation commit while the task is still present, then completion ledger commit after removing the task.
- Generic draft-to-plan rule: when any workflow promotes a draft into a formal `TASK-*`, it removes the source draft in the same state update; the current built-in implementation point is SPRINTING consuming `plan.draft.yaml.tasks[]`.
- Past task details are cold archive and only used for explicit forensic/audit/regression requests.
- Release history is also cold archive. `.docs/08_release/CURRENT_RELEASE.md` stores only the current release status; older release evidence is reconstructed from git tags, registry metadata, CI, release commits or external release systems.
- `parallel_execution` is an on-demand top-level plan contract. Each stage task defaults to a parallel eligibility check; when omitted for a task, that task remains serial. It does not store `phase` or `linked_task_id`; validators infer phase from lifecycle and task selection from `current_task_id`.
- `resume_capsule` is an optional top-level plan recovery card that becomes required for high-risk runtime/live SPRINTING tasks (`external_provider_live`, `deployed_runtime`, `business_handoff_ready`, or target runtime `cloud_vm`, `managed_service`, `browser`, `worker`). It stores only current state, canonical path, next step, blocker, last passed gate, do-not-retry entries and recovery refs.
- `.docs/09_runbooks/**` stores runtime/live/remote-operator runbooks, evidence indexes and exploration appendices. `resume_capsule.recovery_refs` must include the current implementation doc and at least one runbook/evidence document.
- Open task `working_notes` remains a short recovery surface: target 5-8 notes, validator hard limit 8 notes.
- Direct `validate-dev` is the SPRINTING in-development gate. It allows a valid current open `phase: "SPRINTING"` task, checks scoped dirty files and draft consumption, and rejects missing current-task contracts.
- `Development Self-Test Report` now requires `Report Status: PASS | BLOCKED | IN_PROGRESS | STALE`; direct `validate-dev` only passes completion-oriented evidence when `Report Status: PASS` and every scenario is `PASS`.
- High-risk runtime/live implementation docs use a short `Current Operator Path` for canonical operator path, runbook link, credential reference name, command/UI channel and do-not-retry summary. Debug logs, operator logs, runbook bodies, exploration history and diagnostic attempts stay out of the self-test report.
- `validate-current` and `tools/run_current_gate.py` keep phase-exit safety: after the phase gate runs, `plan.yaml` must have no open tasks before lifecycle advancement.

## Runnable Entry/Exit

- Entry points: `.codex/state/plan.yaml`, `.codex/state/plan.draft.yaml`, lifecycle phase transitions and `validate-plan` / direct `validate-dev` / phase-exit `validate-current` gates.
- Exit / side effects: validators accept or reject task contracts, draft consumption and phase-exit readiness; SPRINTING writes implementation and completion ledger commits.
- Config contract: task fields (`phase`, `allowed_paths`, `required_gates`, `result_docs`, `implementation_doc`) and lifecycle `current_phase`.
- Fixture/live boundary: workflow state protocol only; no product runtime is owned by plan state itself.

## Development Evidence

- Evidence Level: `local_runtime`, verified through package CLI regression and local Harness gates for TASK-084.
- Target Runtime Environment: `local`; the handoff entrypoint is `npm test --workspace agent-project-sdlc`.
- Runnable Entry: `npm test --workspace agent-project-sdlc; npx sdlc-harness validate-plan; npx sdlc-harness validate-dev`.
- Observable Exit: package regression passed with validator coverage for `workflow_default`, `codex_native_subagents`, legacy `user_requested`, invalid provider cases and SPRINTING path-lock violations; source sync/check also passed.
- Client / Server Initialization: local Node CLI runtime starts through `npm test --workspace agent-project-sdlc` and package CLI commands; no server process is required.
- Config Contract: no secrets; Harness root comes from `package.json#sdlcHarness.harnessFolderName` or `sdlc-harness.config.json#harnessFolderName`, and the parallel contract is read from `plan.yaml#parallel_execution`.
- Testing Handoff Readiness: ready for Review/Testing handoff after package tests, source sync/check, docs overview, validate-harness, validate-rfc and validate-dev pass.
- Known Missing Runtime Boundaries: no standalone `sdlc-harness parallel run` CLI is implemented in this task; Codex native subagents remain the runtime provider governed by prompt and plan contract.
- Basic Self-test Evidence: See `Development Self-Test Report`; `npm test --workspace agent-project-sdlc` PASS for TASK-084 package regression.

## Development Self-Test Report

- Report Status: PASS
- Contract Source: .docs/rfc/RFC_026_default_native_subagent_parallel_execution.md#8-development-self-test-impact
- Scenario Results: parallel-contract-schema PASS; sprinting-path-lock PASS; source-sync-assets PASS.
- Executed Gates: `npm test --workspace agent-project-sdlc`; `node packages/sdlc-harness/dist/cli.js package sync-source`; `node packages/sdlc-harness/dist/cli.js package check-source`; `make docs-overview`; `make validate-harness`; `make validate-rfc`; `make validate-dev`.
- Module Key Test Path: `npm test --workspace agent-project-sdlc; npx sdlc-harness validate-plan; npx sdlc-harness validate-dev` -> parallel-contract-schema -> sprinting-path-lock -> source-sync-assets -> TypeScript validator schema and path-lock checks -> Python validator parity through `make validate-plan` -> package asset source sync/check -> observable PASS output.
- Actual Evidence: package regression passed 10 test files; package sync-source reported changed assets and package check-source reported source OK; `make validate-plan` passed with current task allowed paths; docs overview and Harness/RFC/dev validation pass in the final task gate sweep.
- Missing / Blockers: none.
- Testing Handoff Readiness: ready for Review/Testing handoff with the required package, source sync, overview, Harness, RFC and dev gates recorded above.

| Scenario ID | Result | Executed Entry | Actual Exit | Evidence |
|---|---|---|---|---|
| parallel-contract-schema | PASS | `npm test --workspace agent-project-sdlc` | Validator tests accepted `workflow_default` and `codex_native_subagents`, and rejected invalid provider combinations. | package regression output |
| sprinting-path-lock | PASS | `npm test --workspace agent-project-sdlc` | Validator tests rejected overlapping owned paths and owned paths outside current task allowed paths. | package regression output |
| source-sync-assets | PASS | `node packages/sdlc-harness/dist/cli.js package sync-source && node packages/sdlc-harness/dist/cli.js package check-source` | Managed package assets synchronized and checked without drift. | source sync/check output |

## 3. 真实代码结构

| 文件（File） | 作用（Purpose） | 关键函数/对象（Key Functions/Objects） |
|---|---|---|
| `AGENTS.md` | Project-level protocol | Plan Protocol, work rules, natural-language routing |
| `.codex/state/lifecycle.yaml` | Current phase routing | `current_phase`, `active_skill`, `allowed_next_phases` |
| `.codex/state/plan.yaml` | Active short-term task contract | `current_task_id`, `next_task_sequence`, `tasks[]` |
| `.codex/state/plan.draft.yaml` | Built-in unadopted development draft queue | `next_task_sequence`, `tasks[]` |
| `.codex/state/memory.md` | Cross-stage reminder and navigation surface | short stable summaries plus links to formal fact sources |
| `.codex/pjsdlc_managed/templates/ADR_TEMPLATE.md` | ADR authoring template | `Options`, `Rationale`, `Supersedes / Superseded by`, related links |
| `.codex/pjsdlc_managed/templates/PLAN_TEMPLATE.yaml` | New-task template | open task fields, `result_docs` and `implementation_doc` examples |
| `.codex/pjsdlc_managed/templates/RUNBOOK_TEMPLATE.md` | Runtime/operator runbook template | canonical path, command channel, credential reference and do-not-retry fields |
| `.codex/pjsdlc_managed/templates/EVIDENCE_INDEX_TEMPLATE.md` | Runtime evidence index template | scenario, status, evidence pointer and gap table |
| `.codex/pjsdlc_managed/templates/EXPLORATION_APPENDIX_TEMPLATE.md` | Failed exploration appendix template | failed attempt isolation and promoted decisions |
| `.codex/pjsdlc_managed/policies/phase_contracts.yaml` | Phase routing contract | `next` forward target and optional `returns` rollback targets |
| `.codex/skills/pjsdlc_pm_prd/SKILL.md` | Product task prompt | `TASK-*` document-production task protocol with `phase: "REQUIREMENT_GATHERING"` |
| `.codex/skills/pjsdlc_architect_design/SKILL.md` | Design task prompt | `TASK-*` document-production task protocol with `phase: "ARCHITECTING"`, ADR decision boundary guidance |
| `.codex/skills/pjsdlc_dev_sprint/SKILL.md` | Development execution prompt | one-task protocol, two-commit ledger, push requirement |
| `.codex/skills/pjsdlc_manager/SKILL.md` | Workflow routing prompt | `/next`, `/dev`, `/devloop`, status routing |
| `.codex/skills/pjsdlc_rfc_recalibrate/SKILL.md` | Change recalibration prompt | RFC impact checklist |
| `tools/harness_utils.py` | Shared state helpers | `load_plan`, `validate_task_shape`, path expansion |
| `tools/validate_plan.py` | Active plan validator | current/future task checks and optional parallel contract checks |
| `tools/validate_dev_state.py` | Development state validator | rejects stale unconsumed drafts before `validate-dev` can pass |
| `tools/validate_allowed_paths.py` | Worktree scope validator | allowed path enforcement |
| `tools/validate_review.py` | Review exit validator | no-open-task check plus review report shape |
| `tools/validate_test_plan.py` | Test exit validator | no-open-task check plus test report, matrix, regression evidence and coverage gap |
| `tools/validate_release_plan.py` | Release exit validator | no-open-task check plus current release status/smoke/rollback docs |
| `tools/validate_rfc.py` | RFC exit validator | no-open-task check plus RFC status and impact sections |
| `tools/run_current_gate.py` | Phase gate runner | phase-to-gate dispatch plus no-open phase-exit check |
| `tools/status.py` | Human status report | lifecycle and task summary |
| `tools/transition.py` | Phase transition helper | lifecycle state mutation without history append |
| `packages/sdlc-harness/src/lib/init.ts` | Package init state seed | memory seed and `.docs/09_runbooks` directory creation |
| `packages/sdlc-harness/src/lib/validators.ts` | Package-side state validators | direct dev gate, resume capsule validation, working_notes limit, Report Status, Current Operator Path, Gate Breakdown checks, SPRINTING phase-exit gate and package CLI validators |
| `packages/sdlc-harness/src/lib/migrations.ts` | State migrations | remove checkpoints, history and gate logs; create missing memory with summary/link-only scope |

## 4. 核心数据流

```txt
Any workflow phase task starts
-> plan.yaml contains one small TASK-* open task with phase metadata
-> agent edits only allowed_paths for the current slice or plan.draft output
-> result_docs or implementation_doc points to the produced fact source
-> docs index and generated overview are updated
-> validate-plan checks the open task contract during execution
-> phase exit validator runs only after open tasks are removed
```

```txt
ARCHITECTING discovers PRD needs revision before development
-> transition.py reads phase_contracts.yaml#phases.ARCHITECTING.returns
-> python3 tools/transition.py --to REQUIREMENT_GATHERING is legal without --force
-> lifecycle active_role/active_skill become pm/pjsdlc_pm_prd
-> PM updates PRD through one REQUIREMENT_GATHERING task and validate-pm
-> transition.py --to ARCHITECTING resumes design
```

```txt
Later-stage review/test/release discovers requirement or development self-test drift
-> python3 tools/transition.py --to RFC_RECALIBRATION is legal from SPRINTING / REVIEWING / TESTING / RELEASING
-> lifecycle.suspended_phase records the interrupted phase
-> active_role/active_skill become rfc_owner/pjsdlc_rfc_recalibrate
-> RFC work runs validate-rfc and creates or adjusts downstream SPRINTING tasks
-> transition.py --to SPRINTING clears suspended_phase and resumes development
```

```txt
SPRINTING task starts
-> if no open task exists, agent may promote one plan.draft.yaml task into a formal TASK-* and delete the source draft
-> plan.yaml contains full open task contract
-> high-risk runtime/live tasks maintain resume_capsule and .docs/09_runbooks recovery refs
-> agent edits only allowed_paths
-> direct validate-dev may run while the current task remains open
-> required_gates pass
-> related module implementation doc records facts and verification
-> implementation commit is created while task remains in plan.yaml
-> task is removed from plan.yaml
-> completion ledger commit is created
-> validate-current can pass only after no open task remains
-> both commits are pushed before the next task starts
```

Default parallel execution:

```txt
Stage task starts
-> main agent performs parallel eligibility check
-> if safe, main agent creates parallel_execution.trigger = workflow_default
-> runtime_managed + codex_native_subagents is the default provider
-> user_requested keeps explicit user parallel intent
-> user_orchestrated / codex_exec_worktree are fallback providers
-> workers operate inside owned_paths and run focused gates
-> main agent reviews, merges/cherry-picks, runs total gates and updates final fact sources
```

## 5. 关键实现逻辑

- `plan.yaml` is intentionally short lived. It is not a historical task database.
- `plan.yaml` is not an exhaustive log of everything an Agent does. The generic workflow contract covers tasks that affect phase deliverables, gates, implementation facts or RFC recalibration; local teams may extend task taxonomy for broader project management needs without changing the core `TASK-*` workflow semantics.
- `current_phase` belongs only to `lifecycle.yaml`; `plan.yaml`, `plan.draft.yaml` and `parallel_execution` must not duplicate it.
- `transition.py` derives legal targets from the current phase's `next`, optional `returns`, `allowed_next_phases`, controlled RFC interrupt routes and BLOCKED resume rules. `RFC_RECALIBRATION` is legal without `--force` only from `SPRINTING`, `REVIEWING`, `TESTING` and `RELEASING`; after RFC exits to `SPRINTING`, stale `suspended_phase` is cleared. After every transition, `allowed_next_phases` is regenerated from the target phase's `next` plus `returns`.
- Draft queues are not active execution state and must not retain adopted or completed drafts. The current built-in draft queue is `plan.draft.yaml`; it must not contain `current_task_id`.
- direct `validate-dev` rejects any remaining `plan.draft.yaml.tasks[]`; agents must either continue promoting real unadopted drafts or remove already-consumed stale drafts before development completion.
- direct `validate-dev` requires lifecycle `current_phase: "SPRINTING"` and allows either an empty development queue or one valid current open `phase: "SPRINTING"` task with `current_task_id`, `docs`, `allowed_paths`, `required_gates`, `acceptance_criteria` and `implementation_doc`.
- direct `validate-dev` requires `resume_capsule` for high-risk current SPRINTING tasks, validates its task id, concrete recovery fields, do-not-retry list, current implementation doc ref and `.docs/09_runbooks/**` ref.
- direct `validate-dev` requires legal `Development Self-Test Report` status. `BLOCKED`, `IN_PROGRESS` and `STALE` reports are recoverable facts but cannot close a development task; `PASS` with any non-PASS scenario also fails.
- direct `validate-dev` rejects self-test report headings that turn the report into a debug/operator/runbook/exploration log. High-risk tasks must link operator facts through `Current Operator Path` and `.docs/09_runbooks/**`.
- `validate-dev` enforces dirty-file scoping when a current open task exists; changes outside the current task `allowed_paths` fail the direct dev gate.
- ADRs solve the long-term "why this option, not another" problem. Architecture and tech plan slices may keep local rationale, but decisions with alternatives, cross-module or cross-stage impact, high reversal cost or future supersede semantics belong in `.docs/05_decisions/`.
- `memory.md` must not become a decision ledger. It may point to ADRs, PRDs, tech plans or implementation docs, but detailed context, alternatives, tradeoffs and consequences remain in those formal fact sources.
- Field audit: `active_role`, `active_skill`, `current_milestone`, `blocked_reason`, `suspended_phase` and `allowed_next_phases` are lifecycle-only; `current_task_id` and `next_task_sequence` are plan-only; `tasks[].phase` is semantic task classification rather than current lifecycle state and remains on each task.
- Every phase task is task-controlled: one `TASK-*` task should produce one bounded document slice, review batch, test evidence set, release artifact set, RFC impact slice or development change.
- `validate-plan` permits open tasks and checks their shape; phase exit gates reject remaining open tasks. In `SPRINTING`, this no-open rule lives in `validate-current` and `tools/run_current_gate.py`, not in direct `validate-dev`.
- `allowed_paths`, `required_gates` and `working_notes` are execution-time constraints, not a long-term query API; open task `working_notes` must stay within the 8 item recovery-note limit.
- Gate evidence belongs in the current task while executing, and in implementation docs, CI logs, current release status or external release systems after completion.
- `lifecycle.yaml` does not store phase history. Phase history is reconstructed from git, PRs, CI, registry metadata, tags or external release evidence only when explicitly needed.
- `/dev` runs one task and stops. `/devloop` repeats `/dev` until neither `plan.yaml.tasks[]` nor `plan.draft.yaml.tasks[]` contains a clear next task, or a blocker appears.
- The workflow assumes a singleton project-level Harness collaboration boundary; concurrent agents must coordinate through git and active state rather than independent archive files.
- Parallel execution is default-evaluated and on-demand. `trigger` must be `workflow_default` or `user_requested`; `workflow_default` requires `runtime.provider: "codex_native_subagents"`; `mode` must be `runtime_managed` or `user_orchestrated`; validators reject duplicate `phase` / `linked_task_id` fields in the contract.
- SPRINTING write workers must declare non-empty, non-overlapping `owned_paths` within the current task `allowed_paths`; non-native write runtimes still require `branch` and `worktree`.
- Workers do not own final fact sources. PRD, plan state, implementation docs, test results, generated overviews and total gate evidence are integrated by the main agent.

## 6. 与技术方案的偏移

- Early designs used checkpoint files, `.agent/archive/**`, `gate_results.log` and lifecycle `history`; those have been removed from the active state model.
- DEV-043 migrated state/task facts from task-grain implementation docs into this module-level protocol document.

## 7. 测试覆盖（Test Coverage）

| 测试（Test） | 覆盖范围（Coverage） | 最近记录结果（Result） |
|---|---|---|
| `python3 tools/validate_plan.py --allow-open` | Current plan shape while a task is in progress | PASS for TASK-065 |
| `python3 tools/validate_plan.py` | Current plan shape and no remaining open tasks | PASS in Harness gates |
| `python3 tools/validate_dev_state.py` | `validate-dev` rejection of stale unconsumed draft tasks | PASS for TASK-062 |
| `python3 tools/validate_allowed_paths.py` | Current worktree changes within active task boundary | PASS in task gates |
| `npm test --workspace agent-project-sdlc` | Package validator regression for direct `validate-dev` open-task acceptance and `validate-current` phase-exit rejection | PASS for TASK-071; 10 tests passed |
| `node packages/sdlc-harness/dist/cli.js package sync-source` | Managed Makefile and Skill/package assets reflect dev gate wiring changes | PASS for TASK-071 |
| `node packages/sdlc-harness/dist/cli.js package check-source` | Package canonical assets match source after dev gate wiring changes | PASS for TASK-071 |
| `make validate-plan` | Active RFC task contract and allowed changed paths for TASK-071 | PASS for TASK-071 |
| `make docs-overview` | Generated overview refresh after RFC_018 and implementation doc updates | PASS for TASK-071 |
| `make validate-rfc` | RFC_018 status, impact sections and no-open task safety | PASS for TASK-071 |
| `make validate-current` | Phase-exit gate keeps no-open safety after TASK-071 completion | PASS for TASK-071 |
| `make validate-dev` | Direct SPRINTING dev gate passes with an empty development queue after RFC resume | PASS for TASK-071 |
| `make validate-harness` | Prompt language and generated overview consistency after dev gate wiring changes | PASS for TASK-071 |
| `tests/sdlc-harness/sync-init-doctor.test.mjs` | Package init memory seed and managed asset sync behavior | PASS for TASK-065 |
| `tests/sdlc-harness/upgrade.test.mjs` | Migration-created memory seed and legacy state migration | PASS for TASK-065 |
| `tests/sdlc-harness/validators.test.mjs` | Package validator plan task, draft consumption, resume capsule, Gate Breakdown, default/native parallel contract and path-lock acceptance/failure cases | PASS in current working tree |
| `node packages/sdlc-harness/dist/cli.js package sync-source && package check-source` | Managed package assets include resume-first templates, Skills, tools and README updates | PASS in current working tree; sync changed=48 |
| `npm test --workspace agent-project-sdlc` | Package validator regression for Report Status, Current Operator Path, disallowed self-test log sections and working_notes limit | PASS on 2026-05-30; 10 tests passed |
| `node packages/sdlc-harness/dist/cli.js package sync-source && package check-source` | Managed package assets include self-test boundary templates, Skills, tools and README updates | PASS on 2026-05-30; sync changed=48 |
| `make docs-overview && make validate-harness && make validate-plan` | Generated overview, Harness scaffold and active plan contract after self-test boundary hardening | PASS on 2026-05-30 |
| `tests/sdlc-harness/transition.test.mjs` | `ARCHITECTING -> REQUIREMENT_GATHERING` rollback, PM role/skill activation and `SPRINTING` rollback rejection | PASS for TASK-061 |
| `tests/sdlc-harness/transition.test.mjs` | Controlled `RFC_RECALIBRATION` interrupt from SPRINTING/REVIEWING/TESTING/RELEASING, illegal pre-development RFC entry, RFC return cleanup and unchanged REVIEWING -> TESTING | PASS for TASK-082 |
| `make validate-current` | Phase-specific gate dispatch | PASS in sprint/review/test transitions |
| `npm test --workspace agent-project-sdlc` | Package migration, init seed and validator parity | PASS for TASK-065 |
| `node packages/sdlc-harness/dist/cli.js package sync-source && package check-source` | Package assets synchronized from source README, Skill and template files | PASS for TASK-065 |
| `make validate-harness` | Prompt language and generated overview consistency | PASS for TASK-065 |
| `npm test --workspace agent-project-sdlc` | Package validator parity for release current-status and legacy docs compatibility | PASS for TASK-069 |
| `make validate-harness` | Prompt language and generated overview consistency after release current-status changes | PASS for TASK-069 |

## 8. 变更记录（Change Log）

| 日期（Date） | Task ID | Commit | 摘要（Summary） |
|---|---|---|---|
| 2026-05-25 | `DEV-010`, `DEV-011` | Historical implementation commits | Replaced checkpoint/task archive model with `plan.yaml`. |
| 2026-05-25 | `DEV-018`, `DEV-019` | Historical implementation commits | Added two-commit task completion and pre-compression implementation commit rule. |
| 2026-05-25 | `DEV-024` - `DEV-028` | Historical implementation commits | Shortened plan/gate/lifecycle state and strengthened RFC impact handling. |
| 2026-05-30 | Resume-first runtime task protocol | Working tree | Added high-risk runtime `resume_capsule`, `.docs/09_runbooks` recovery docs and Gate Breakdown validation. |
| 2026-05-30 | Self-test report boundary hardening | Working tree | Added Report Status, Current Operator Path, disallowed log-section checks and working_notes limit validation. |
| 2026-05-26 | `DEV-043` | DEV-043 implementation commit | Consolidated legacy state/task implementation docs into module facts. |
| 2026-05-27 | `DEV-050` | DEV-050 implementation commit | Added opt-in `parallel_execution` contract for multi-agent/worktree coordination. |
| 2026-05-30 | `TASK-084` | TASK-084 implementation commit | Added default Codex native subagent scheduling semantics and SPRINTING path-lock validation. |
| 2026-05-27 | `DEV-056` | Working tree | Extended `plan.yaml` task control to PRD and design document generation, slicing and fact-source synthesis. |
| 2026-05-27 | `TASK-057` | Working tree | Unified all new workflow tasks under `TASK-*` with `phase`, expanded plan control to review/test/release/RFC, and kept legacy task prefixes compatible. |
| 2026-05-28 | `TASK-059` | Pending implementation commit | Removed duplicate current phase state from plan files and parallel execution contracts. |
| 2026-05-28 | `TASK-061` | Working tree | Added `phase_contracts.yaml#returns` and `transition.py` support so ARCHITECTING can return to REQUIREMENT_GATHERING for PRD edits before SPRINTING, while SPRINTING cannot directly return to PRD. |
| 2026-05-28 | Spec clarification | Working tree | Clarified that `plan.yaml` is a general recoverable task-splitting container, while default Harness behavior only governs workflow phase tasks; broader task definitions are local configuration concerns. |
| 2026-05-28 | `TASK-062` | Working tree | Added promote-on-consume semantics for `plan.draft.yaml`, dev-state validation, package validator parity, and cleared the stale `DEV-001` draft from current state. |
| 2026-05-28 | `TASK-063` | Working tree | Clarified that promote-on-consume is the generic rule for any draft-to-plan workflow, while `plan.draft.yaml` remains the current built-in development draft queue. |
| 2026-05-28 | `TASK-065` | Pending implementation commit | Clarified ADR and memory responsibilities across PROJECT_SPEC, README/package README, architect skill, ADR template and package memory seeds. |
| 2026-05-29 | `TASK-069` | Working tree | Clarified that release history is cold archive while `.docs/08_release/CURRENT_RELEASE.md` remains the active release status fact source. |
| 2026-05-29 | `TASK-071` | Working tree | Split direct `validate-dev` open-task semantics from `validate-current` phase-exit no-open checks and moved managed Makefile dev gate to package CLI. |
| 2026-05-30 | `TASK-082` | Working tree | Constrained RFC interrupts to SPRINTING and later phases, preserved normal REVIEWING -> TESTING routing, and cleared `suspended_phase` when RFC returns to SPRINTING. |

## 9. 后续维护注意事项

- Do not reintroduce active historical ledgers unless a new RFC explicitly changes the state model.
- If a new workflow action needs durable history, prefer git, tags, registry/CI/release systems or module implementation docs before adding state files.
