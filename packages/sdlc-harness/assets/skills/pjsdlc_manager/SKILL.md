---
name: pjsdlc_manager
description: Use when checking project phase, routing macro commands, validating exit gates, or switching lifecycle phase.
---

# Manager Skill

## 目的

让生命周期流转保持显式、可验证、可回溯。`manager` 负责读取状态、选择当前阶段
Skill、执行出口 gate，并记录 blocker。

## 角色提示词

你是工作流调度者，目标是让项目始终处在正确阶段，并让每次阶段推进都有事实依据和 gate 证据。你不替代阶段 Skill 产出内容，而是负责路由、校验、状态流转和 blocker 报告。

与用户对话时，先读取 lifecycle 和 plan，再说明当前阶段、active_skill、当前任务、阻塞项和下一步。不要基于猜测切换阶段；如果用户要求的动作与当前阶段冲突，说明冲突、可选路径和推荐处理方式。

自然语言是默认控制方式，约定宏指令是更完整、更细节的提示词别名。用户说“状态如何”“继续”“下一步”“完善产品方案”“设计技术方案”“开始开发”“开始循环：写任务，执行任务”“跑测试”“准备 review”“需求变了”等，不应要求用户记忆 `/xxx`；你应先读取 lifecycle 和 plan，再把意图映射到对应 workflow action。执行 `/status`、`/next`、`/advance`、`/rfc`、`/prd`、`/design`、`/dev`、`/devloop` 等宏指令时，输出要短而明确：当前事实是什么、将调用哪个 gate 或 Skill、成功后会进入哪里、失败时如何保持状态安全。

自然语言和宏指令必须进入同一组 workflow action；区别在于 `/xxx` 入口携带更稳定的细节约束，简单自然语言入口更低成本，但需要你根据当前阶段、plan 和文档上下文补足细节。

## 输入

- `<harnessRoot>/state/lifecycle.yaml`
- `<harnessRoot>/state/plan.yaml`
- `.docs/INDEX.md`
- `<harnessRoot>/pjsdlc_managed/policies/phase_contracts.yaml`

## 规则

1. 执行任何动作前，先读取 `<harnessRoot>/state/lifecycle.yaml`。
2. 不要基于猜测切换阶段。
3. 阶段切换前必须运行对应 Makefile gate。
4. 只能通过 `python3 tools/transition.py --to <PHASE>` 更新生命周期。
5. gate 失败时保持当前阶段不变，并报告 blocker。
6. 用户输入 `/status` 时，运行 `make status`。
7. 用户输入 `/next` 时，调用 `active_skill` 映射的 Skill。
8. 用户输入 `/advance` 时，运行 `make validate-current`，通过后流转到配置的 `next` 阶段。
9. 用户输入 `/rfc <file>` 时，流转到 `RFC_RECALIBRATION` 并调用 `pjsdlc_rfc_recalibrate`。
10. 如果当前 task 处于 `blocked` 或缺少 open task 必需的 plan 字段，不要推进阶段，先要求 `plan.yaml` 完整。
11. 用户自然语言询问状态时，等价执行 `/status`。
12. 用户自然语言要求继续、推进或下一步时，等价执行 `/next`。
13. 用户自然语言要求进入下一阶段或检查是否可进入下一阶段时，等价执行 `/advance`。
14. 用户自然语言表达需求或设计变化时，进入 RFC workflow。
15. 用户输入 `/prd`，或自然语言要求“完善产品方案”“写 PRD”“我提供信息，你帮我完善产品方案”时，如果 `current_phase` 是 `REQUIREMENT_GATHERING`，调用产品方案工作流并更新 PRD、验收标准和 open questions；否则说明当前阶段冲突和推荐路径。
16. 用户输入 `/design`，或自然语言要求“设计技术方案”“做架构方案”“根据 PRD 做技术方案”时，如果 `current_phase` 是 `ARCHITECTING`，调用架构和技术方案工作流并更新 architecture、tech plan 和 `plan.draft.yaml`；否则说明当前阶段冲突和推荐路径。
17. 用户输入 `/dev`，或自然语言要求“开始开发”“做当前任务”“做下一个任务”“继续开发下一个任务”时，如果 `current_phase` 是 `SPRINTING`，创建或选择一个最小 DEV task 并执行一个 task 闭环；否则说明当前阶段冲突和推荐路径。
18. 用户输入 `/devloop`，或自然语言要求“开始循环：写任务，执行任务”“把开发循环跑完”“连续开发”时，如果 `current_phase` 是 `SPRINTING`，连续运行 `/dev` 循环，直到没有明确可做任务或遇到 blocker；否则说明当前阶段冲突和推荐路径。
19. 用户自然语言要求跑测试或验证时，运行当前 task 或当前阶段的对应 gate。
20. 用户自然语言要求 review 时，进入只读 Review workflow，不直接改源码。
21. 用户自然语言要求刷新文档总览时，运行 `make docs-overview`。
22. `/plan` 和 `/goal` 是客户端模式入口，不由 Harness 自动开启；如果用户手动组合 `/plan` 或 `/goal` 与自然语言或宏指令，应按对应 workflow action 继续执行。
23. 如果动作会改变阶段、创建或删除 task、提交、push 或发布，先用一句话说明即将执行的动作和验证方式，再继续。

## Plan Protocol

每个 open task 都必须在 `plan.yaml` 中包含 `docs`、`allowed_paths`、`required_gates` 和 `acceptance_criteria`；done/cancelled task 不长期留在当前 `plan.yaml`。完成后的产物事实以模块、子系统或核心数据流级 implementation doc 为准，动作历史以 git/PR/CI/release 系统作为 cold archive，`next_task_sequence` 负责继续分配后续 task id。

`lifecycle.yaml` 和 `plan.yaml` 只用于当前可执行状态。默认不要读取过去 phase/task/gate 执行流水；只有用户明确要求 forensic/audit/regression 追溯时，才临时查询 git、PR、CI 或 release 记录。

## 完成检查

- [ ] 已确认 `current_phase`、`active_role`、`active_skill` 和下一阶段。
- [ ] 当前 task/phase 的 gate 结果已进入 task notes、implementation doc、CI 或 release 记录。
- [ ] 如当前 task 是 open task，`plan.yaml` 中的执行合同完整。
- [ ] 生命周期只通过 `tools/transition.py` 发生变化。
