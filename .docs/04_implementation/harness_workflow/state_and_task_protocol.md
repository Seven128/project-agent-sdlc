# State and Task Protocol Implementation

## 1. 关联信息

- Domain: `harness_workflow`
- Module / subsystem / core flow: lifecycle state, plan state, task execution protocol and gate evidence
- Updated by task: `DEV-010`, `DEV-011`, `DEV-018`, `DEV-019`, `DEV-024`, `DEV-025`, `DEV-026`, `DEV-027`, `DEV-028`, `DEV-043`, `DEV-050`
- Linked PRD: `.docs/01_product/npm_package_distribution.md`
- Linked technical design: `.docs/03_tech_plan/harness_package_distribution.md`
- Linked RFC: `RFC_004`, `RFC_005`, `RFC_010`, `RFC_011`, `RFC_012`, `RFC_013`, `RFC_014`, `RFC_015`
- Linked commits: historical `DEV-*` implementation commits; `DEV-043` migration commit; `DEV-050` implementation commit

## 2. 当前实现范围

- `.codex/state/lifecycle.yaml` stores only the current routing state.
- `.codex/state/plan.yaml` stores the current and future short-lived task contract.
- `next_task_sequence` preserves future `DEV-*` id allocation after done tasks are removed.
- Checkpoint files, archive directories, gate result logs and lifecycle history are no longer active state facts.
- A SPRINTING task completes in two commits: implementation commit while the task is still present, then completion ledger commit after removing the task.
- Past task details are cold archive and only used for explicit forensic/audit/regression requests.
- `parallel_execution` is an optional top-level plan contract; when omitted the workflow remains serial.

## 3. 真实代码结构

| 文件（File） | 作用（Purpose） | 关键函数/对象（Key Functions/Objects） |
|---|---|---|
| `AGENTS.md` | Project-level protocol | Plan Protocol, work rules, natural-language routing |
| `.codex/state/lifecycle.yaml` | Current phase routing | `current_phase`, `active_skill`, `allowed_next_phases` |
| `.codex/state/plan.yaml` | Active short-term task contract | `current_task_id`, `next_task_sequence`, `tasks[]` |
| `.codex/pjsdlc_managed/templates/PLAN_TEMPLATE.yaml` | New-task template | open task fields and module-level `implementation_doc` |
| `.codex/skills/pjsdlc_dev_sprint/SKILL.md` | Development execution prompt | one-task protocol, two-commit ledger, push requirement |
| `.codex/skills/pjsdlc_manager/SKILL.md` | Workflow routing prompt | `/next`, `/dev`, `/devloop`, status routing |
| `.codex/skills/pjsdlc_rfc_recalibrate/SKILL.md` | Change recalibration prompt | RFC impact checklist |
| `tools/harness_utils.py` | Shared state helpers | `load_plan`, `validate_task_shape`, path expansion |
| `tools/validate_plan.py` | Active plan validator | current/future task checks and optional parallel contract checks |
| `tools/validate_allowed_paths.py` | Worktree scope validator | allowed path enforcement |
| `tools/run_current_gate.py` | Phase gate runner | phase-to-gate dispatch |
| `tools/status.py` | Human status report | lifecycle and task summary |
| `tools/transition.py` | Phase transition helper | lifecycle state mutation without history append |
| `packages/sdlc-harness/src/lib/validators.ts` | Package-side state validators | plan/lifecycle compatibility |
| `packages/sdlc-harness/src/lib/migrations.ts` | State migrations | remove checkpoints, history and gate logs |

## 4. 核心数据流

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
- `allowed_paths`, `required_gates` and `working_notes` are execution-time constraints, not a long-term query API.
- Gate evidence belongs in the current task while executing, and in implementation docs, CI logs or release docs after completion.
- `lifecycle.yaml` does not store phase history. Phase history is reconstructed from git, PRs, CI or release evidence only when explicitly needed.
- `/dev` runs one task and stops. `/devloop` repeats `/dev` until no clear task remains or a blocker appears.
- The workflow assumes a singleton project-level Harness collaboration boundary; concurrent agents must coordinate through git and active state rather than independent archive files.
- Parallel execution is opt-in only. `trigger` must be `user_requested`, `mode` must be `runtime_managed` or `user_orchestrated`, and `SPRINTING` contracts must bind `linked_task_id` to `current_task_id`.
- Workers do not own final fact sources. PRD, plan state, implementation docs, test results, generated overviews and total gate evidence are integrated by the main agent.

## 6. 与技术方案的偏移

- Early designs used checkpoint files, `.agent/archive/**`, `gate_results.log` and lifecycle `history`; those have been removed from the active state model.
- DEV-043 migrated state/task facts from task-grain implementation docs into this module-level protocol document.

## 7. 测试覆盖（Test Coverage）

| 测试（Test） | 覆盖范围（Coverage） | 最近记录结果（Result） |
|---|---|---|
| `python3 tools/validate_plan.py` | Current plan shape and task statuses | PASS in Harness gates |
| `python3 tools/validate_allowed_paths.py` | Current worktree changes within active task boundary | PASS in task gates |
| `tests/sdlc-harness/validators.test.mjs` | Package validator optional parallel contract acceptance/failure cases | PASS for DEV-050 |
| `make validate-current` | Phase-specific gate dispatch | PASS in sprint/review/test transitions |
| `npm test` | Package migration and validator parity | PASS through release tasks |
| `make validate-harness` | Prompt language and generated overview consistency | PASS for DEV-043 |

## 8. 变更记录（Change Log）

| 日期（Date） | Task ID | Commit | 摘要（Summary） |
|---|---|---|---|
| 2026-05-25 | `DEV-010`, `DEV-011` | Historical implementation commits | Replaced checkpoint/task archive model with `plan.yaml`. |
| 2026-05-25 | `DEV-018`, `DEV-019` | Historical implementation commits | Added two-commit task completion and pre-compression implementation commit rule. |
| 2026-05-25 | `DEV-024` - `DEV-028` | Historical implementation commits | Shortened plan/gate/lifecycle state and strengthened RFC impact handling. |
| 2026-05-26 | `DEV-043` | DEV-043 implementation commit | Consolidated legacy state/task implementation docs into module facts. |
| 2026-05-27 | `DEV-050` | DEV-050 implementation commit | Added opt-in `parallel_execution` contract for multi-agent/worktree coordination. |

## 9. 后续维护注意事项

- Do not reintroduce active historical ledgers unless a new RFC explicitly changes the state model.
- If a new workflow action needs durable history, prefer git/tag/release evidence or module implementation docs before adding state files.
