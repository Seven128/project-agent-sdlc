# State and Task Protocol Implementation

## 1. 关联信息

- Domain: `harness_workflow`
- Module / subsystem / core flow: lifecycle state, plan state, task execution protocol and gate evidence
- Updated by task: `DEV-010`, `DEV-011`, `DEV-018`, `DEV-019`, `DEV-024`, `DEV-025`, `DEV-026`, `DEV-027`, `DEV-028`, `DEV-043`, `DEV-050`, `DEV-056`, `TASK-057`, `TASK-059`, `TASK-061`
- Linked PRD: `.docs/01_product/npm_package_distribution.md`
- Linked technical design: `.docs/03_tech_plan/harness_package_distribution.md`
- Linked RFC: `RFC_004`, `RFC_005`, `RFC_010`, `RFC_011`, `RFC_012`, `RFC_013`, `RFC_014`, `RFC_015`
- Linked commits: historical `DEV-*` implementation commits; `DEV-043` migration commit; `DEV-050` implementation commit

## 2. 当前实现范围

- `.codex/state/lifecycle.yaml` stores the single source for current phase routing state.
- `.codex/state/plan.yaml` stores the current and future short-lived task contract across all workflow phases, without duplicating `current_phase`.
- `.codex/state/plan.draft.yaml` stores draft tasks and `next_task_sequence`, without `current_phase` or `current_task_id`.
- `TASK-*` is the new task id model; `phase` identifies `REQUIREMENT_GATHERING`, `ARCHITECTING`, `SPRINTING`, `REVIEWING`, `TESTING`, `RELEASING` or `RFC_RECALIBRATION`; historical `PRD-*`, `DES-*` and `DEV-*` ids remain validator-compatible provenance.
- `next_task_sequence` preserves future `TASK-*` id allocation after done tasks are removed.
- Document, review, test, release and RFC tasks use `result_docs` for planned fact-source outputs; development tasks use `implementation_doc`.
- Checkpoint files, archive directories, gate result logs and lifecycle history are no longer active state facts.
- `phase_contracts.yaml` supports optional `returns` targets for bounded pre-development rollback; the default contract allows `ARCHITECTING -> REQUIREMENT_GATHERING` so PRD facts can be corrected before `SPRINTING`.
- A SPRINTING task completes in two commits: implementation commit while the task is still present, then completion ledger commit after removing the task.
- Past task details are cold archive and only used for explicit forensic/audit/regression requests.
- `parallel_execution` is an optional top-level plan contract; when omitted the workflow remains serial. It does not store `phase` or `linked_task_id`; validators infer phase from lifecycle and task selection from `current_task_id`.

## 3. 真实代码结构

| 文件（File） | 作用（Purpose） | 关键函数/对象（Key Functions/Objects） |
|---|---|---|
| `AGENTS.md` | Project-level protocol | Plan Protocol, work rules, natural-language routing |
| `.codex/state/lifecycle.yaml` | Current phase routing | `current_phase`, `active_skill`, `allowed_next_phases` |
| `.codex/state/plan.yaml` | Active short-term task contract | `current_task_id`, `next_task_sequence`, `tasks[]` |
| `.codex/state/plan.draft.yaml` | Draft task contract | `next_task_sequence`, `tasks[]` |
| `.codex/pjsdlc_managed/templates/PLAN_TEMPLATE.yaml` | New-task template | open task fields, `result_docs` and `implementation_doc` examples |
| `.codex/pjsdlc_managed/policies/phase_contracts.yaml` | Phase routing contract | `next` forward target and optional `returns` rollback targets |
| `.codex/skills/pjsdlc_pm_prd/SKILL.md` | Product task prompt | `TASK-*` document-production task protocol with `phase: "REQUIREMENT_GATHERING"` |
| `.codex/skills/pjsdlc_architect_design/SKILL.md` | Design task prompt | `TASK-*` document-production task protocol with `phase: "ARCHITECTING"` |
| `.codex/skills/pjsdlc_dev_sprint/SKILL.md` | Development execution prompt | one-task protocol, two-commit ledger, push requirement |
| `.codex/skills/pjsdlc_manager/SKILL.md` | Workflow routing prompt | `/next`, `/dev`, `/devloop`, status routing |
| `.codex/skills/pjsdlc_rfc_recalibrate/SKILL.md` | Change recalibration prompt | RFC impact checklist |
| `tools/harness_utils.py` | Shared state helpers | `load_plan`, `validate_task_shape`, path expansion |
| `tools/validate_plan.py` | Active plan validator | current/future task checks and optional parallel contract checks |
| `tools/validate_allowed_paths.py` | Worktree scope validator | allowed path enforcement |
| `tools/validate_review.py` | Review exit validator | no-open-task check plus review report shape |
| `tools/validate_test_plan.py` | Test exit validator | no-open-task check plus test matrix/regression/coverage gap |
| `tools/validate_release_plan.py` | Release exit validator | no-open-task check plus release/smoke/rollback docs |
| `tools/validate_rfc.py` | RFC exit validator | no-open-task check plus RFC status and impact sections |
| `tools/run_current_gate.py` | Phase gate runner | phase-to-gate dispatch |
| `tools/status.py` | Human status report | lifecycle and task summary |
| `tools/transition.py` | Phase transition helper | lifecycle state mutation without history append |
| `packages/sdlc-harness/src/lib/validators.ts` | Package-side state validators | plan/lifecycle compatibility and package CLI validators |
| `packages/sdlc-harness/src/lib/migrations.ts` | State migrations | remove checkpoints, history and gate logs |

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
SPRINTING task starts
-> plan.yaml contains full open task contract
-> agent edits only allowed_paths
-> required_gates pass
-> related module implementation doc records facts and verification
-> implementation commit is created while task remains in plan.yaml
-> task is removed from plan.yaml
-> completion ledger commit is created
-> both commits are pushed before the next task starts
```

Optional parallel execution:

```txt
User explicitly asks for parallel / multi-agent / multi-worktree
-> main agent creates parallel_execution.trigger = user_requested
-> runtime_managed: main agent spawns subagents when runtime supports it
-> user_orchestrated: main agent outputs worker prompts for manual Codex conversations/worktrees
-> workers operate inside owned_paths and run focused gates
-> main agent reviews, merges/cherry-picks, runs total gates and updates final fact sources
```

## 5. 关键实现逻辑

- `plan.yaml` is intentionally short lived. It is not a historical task database.
- `current_phase` belongs only to `lifecycle.yaml`; `plan.yaml`, `plan.draft.yaml` and `parallel_execution` must not duplicate it.
- `transition.py` derives legal targets from the current phase's `next`, optional `returns`, `allowed_next_phases`, RFC/BLOCKED special routes and BLOCKED resume rules. After transition, `allowed_next_phases` is regenerated from the target phase's `next` plus `returns`.
- `plan.draft.yaml` is not active execution state and must not contain `current_task_id`.
- Field audit: `active_role`, `active_skill`, `current_milestone`, `blocked_reason`, `suspended_phase` and `allowed_next_phases` are lifecycle-only; `current_task_id` and `next_task_sequence` are plan-only; `tasks[].phase` is semantic task classification rather than current lifecycle state and remains on each task.
- Every phase task is task-controlled: one `TASK-*` task should produce one bounded document slice, review batch, test evidence set, release artifact set, RFC impact slice or development change.
- `validate-plan` permits open tasks and checks their shape; phase exit gates reject remaining open tasks.
- `allowed_paths`, `required_gates` and `working_notes` are execution-time constraints, not a long-term query API.
- Gate evidence belongs in the current task while executing, and in implementation docs, CI logs or release docs after completion.
- `lifecycle.yaml` does not store phase history. Phase history is reconstructed from git, PRs, CI or release evidence only when explicitly needed.
- `/dev` runs one task and stops. `/devloop` repeats `/dev` until no clear task remains or a blocker appears.
- The workflow assumes a singleton project-level Harness collaboration boundary; concurrent agents must coordinate through git and active state rather than independent archive files.
- Parallel execution is opt-in only. `trigger` must be `user_requested`, `mode` must be `runtime_managed` or `user_orchestrated`, and validators reject duplicate `phase` / `linked_task_id` fields in the contract.
- Workers do not own final fact sources. PRD, plan state, implementation docs, test results, generated overviews and total gate evidence are integrated by the main agent.

## 6. 与技术方案的偏移

- Early designs used checkpoint files, `.agent/archive/**`, `gate_results.log` and lifecycle `history`; those have been removed from the active state model.
- DEV-043 migrated state/task facts from task-grain implementation docs into this module-level protocol document.

## 7. 测试覆盖（Test Coverage）

| 测试（Test） | 覆盖范围（Coverage） | 最近记录结果（Result） |
|---|---|---|
| `python3 tools/validate_plan.py --allow-open` | Current plan shape while a task is in progress | PASS for TASK-059 |
| `python3 tools/validate_plan.py` | Current plan shape and no remaining open tasks | PASS in Harness gates |
| `python3 tools/validate_allowed_paths.py` | Current worktree changes within active task boundary | PASS in task gates |
| `tests/sdlc-harness/validators.test.mjs` | Package validator plan task and optional parallel contract acceptance/failure cases | PASS for TASK-059 |
| `tests/sdlc-harness/transition.test.mjs` | `ARCHITECTING -> REQUIREMENT_GATHERING` rollback, PM role/skill activation and `SPRINTING` rollback rejection | PASS for TASK-061 |
| `make validate-current` | Phase-specific gate dispatch | PASS in sprint/review/test transitions |
| `npm test --workspace agent-project-sdlc` | Package migration and validator parity | PASS for TASK-059; 9 tests passed |
| `make validate-harness` | Prompt language and generated overview consistency | PASS for DEV-043 |

## 8. 变更记录（Change Log）

| 日期（Date） | Task ID | Commit | 摘要（Summary） |
|---|---|---|---|
| 2026-05-25 | `DEV-010`, `DEV-011` | Historical implementation commits | Replaced checkpoint/task archive model with `plan.yaml`. |
| 2026-05-25 | `DEV-018`, `DEV-019` | Historical implementation commits | Added two-commit task completion and pre-compression implementation commit rule. |
| 2026-05-25 | `DEV-024` - `DEV-028` | Historical implementation commits | Shortened plan/gate/lifecycle state and strengthened RFC impact handling. |
| 2026-05-26 | `DEV-043` | DEV-043 implementation commit | Consolidated legacy state/task implementation docs into module facts. |
| 2026-05-27 | `DEV-050` | DEV-050 implementation commit | Added opt-in `parallel_execution` contract for multi-agent/worktree coordination. |
| 2026-05-27 | `DEV-056` | Working tree | Extended `plan.yaml` task control to PRD and design document generation, slicing and fact-source synthesis. |
| 2026-05-27 | `TASK-057` | Working tree | Unified all new workflow tasks under `TASK-*` with `phase`, expanded plan control to review/test/release/RFC, and kept legacy task prefixes compatible. |
| 2026-05-28 | `TASK-059` | Pending implementation commit | Removed duplicate current phase state from plan files and parallel execution contracts. |
| 2026-05-28 | `TASK-061` | Working tree | Added `phase_contracts.yaml#returns` and `transition.py` support so ARCHITECTING can return to REQUIREMENT_GATHERING for PRD edits before SPRINTING, while SPRINTING cannot directly return to PRD. |

## 9. 后续维护注意事项

- Do not reintroduce active historical ledgers unless a new RFC explicitly changes the state model.
- If a new workflow action needs durable history, prefer git/tag/release evidence or module implementation docs before adding state files.
