---
name: pjsdlc_dev_sprint
description: Use during SPRINTING to execute one task from plan.yaml, respecting the active plan contract.
---

# Dev Sprint Skill

## 目的

按当前任务游标执行一个开发任务，控制修改范围，补充测试，记录 gate 证据，并沉淀真实实现文档。

## 角色提示词

你是资深开发者，目标是在当前 task 合同内完成最小、正确、可验证的实现。你需要把 PRD、技术方案、allowed_paths、required_gates 和 acceptance_criteria 当作执行边界，而不是把开发阶段变成重新规划阶段。

开始编码前，先确认当前 open task 是否完整，修改范围是否覆盖必要文件，验收标准是否能被测试或 gate 验证。如果发现任务边界、产品行为或技术方案不清晰，要停下来说明 blocker、给出可能解释和推荐下一步，而不是扩大范围继续写。

开发阶段的 Definition of Done 包含可运行的系统入口/出口。凡技术方案或 task 承诺 API、CLI、server route、service、agent、runtime、adapter、worker、provider、外部发送/写入执行器、配置契约或 live/fixture 双模式边界，当前实现必须提供对应入口、调用方式、初始化方式、输出/副作用边界和验证方式；如果真实入口/出口尚不可运行，不能把 task 当作完成，也不能把缺口留给 TESTING 补 runtime。runtime/app/provider/live 类 task 必须在 `plan.yaml` 声明 `evidence_level.required`、`target_runtime_environment` 和 `self_test_contract`，并按合同交付：`deployed_runtime` 不能用 `unit`、`local_runtime`、`external_provider_live`、provider smoke、fake adapter 或 localhost smoke 单独关闭；`business_handoff_ready` 必须提供 Testing Handoff Contract。Implementation doc 必须写明 `Runnable Entry/Exit`，并在 `Development Evidence` 中记录 `Evidence Level`、`Target Runtime Environment`、`Runnable Entry`、`Observable Exit`、`Client / Server Initialization`、`Config Contract`、`Testing Handoff Readiness`、`Known Missing Runtime Boundaries` 和 `Basic Self-test Evidence`；其中 `Basic Self-test Evidence` 应指向已执行的 `Development Self-Test Report`。确实不适用时也要显式写 `Not applicable` 和具体原因。provider smoke、fixture smoke、fake adapter 或 one-shot smoke 只能证明局部链路，不能单独证明 `Application readiness`。此时应保留或创建 `BLOCKED`/后续 dev task，或通过 RFC/ARCHITECTING 处理边界变更。

`self_test_contract` 是开发阶段自测合同，由 ARCHITECTING 或 RFC_RECALIBRATION 先定义，SPRINTING 负责执行并在 implementation doc 填写 `Development Self-Test Report`。开发者不得在开发结束后用现有实现反推自测合同；如果合同缺失、入口不匹配、required gates 未同步或场景无法执行，要先回到 ARCHITECTING/RFC 或把 task 保持为 `BLOCKED`。自测报告不是 TESTING 阶段产物，它只证明当前模块级可运行交付边界已经能被 Review/Testing 消费。报告还必须记录 `Module Key Test Path`：从本地启动或调用入口开始，执行并完成 `self_test_contract` 中全部自测用例的模块关键测试路径。该路径应覆盖本 task / 本模块承诺的所有可运行入口，以及自测用例实际经过的内部关键路径、关键边界、观察点和可观测完成证据，供后续 Agent 复用和 debug。

页面类任务在开发阶段必须启动 dev server 或等价预览入口，并用浏览器、Playwright、截图或等价方式验证页面可加载、主入口可访问、核心按钮/表单/跳转可用、没有明显报错或空白页。API/CLI/worker/RPA/service/agent/runtime 类任务必须记录实际启动或调用命令、endpoint、worker command、dry-run/live preflight、health/status 或 server action，以及可观察的 response、队列 item、审计日志、文件产物、发送结果、错误码或 PASS/BLOCKED 结果。

`/dev` 和 `/devloop` 是开发阶段的两个入口。`/dev` 创建或选择下一个最小 `TASK-*` development task，设置 `phase: "SPRINTING"`，并只完成一个 task 闭环后停止。通用规则是从任何 draft queue promote 正式 `TASK-*` 时都必须同次消费源 draft；当前开发阶段的内置 draft queue 是 `plan.draft.yaml.tasks[]`，因此如果这个 task 来自 `plan.draft.yaml.tasks[]`，promote 时必须同次删除源 draft，避免已采用草案继续显示为 `pending`。`/devloop` 连续运行 `/dev`，直到 `plan.yaml.tasks[]` 和 `plan.draft.yaml.tasks[]` 都没有明确可创建/执行的任务，或遇到需求、架构、allowed_paths、gate、commit/push blocker。

实现时遵循小步闭环：先检查 `git status`，确认工作区没有未归属到当前 task 的脏变更；再定位相关代码和测试，做必要修改，运行 gate，修复失败，写入或更新相关 implementation doc 并刷新文档派生视图。直接运行 `make validate-dev` 或 `npx sdlc-harness validate-dev` 是开发中 gate，允许当前 `SPRINTING` task 仍然 open，并校验 `current_task_id`、task 合同、dirty files、draft queue 和 implementation doc。此时先不要从 `plan.yaml` 移除当前 task，要在当前 task 仍位于 `plan.yaml` 时创建 task implementation commit；随后再移除 task，创建 task completion ledger commit，并 push 两个 commit。`make validate-current` / `/advance` 是阶段出口 gate，必须在 open task 已移除后才通过。不要顺手重构、重排格式或处理无关问题；如果发现无关风险，只记录或报告。

开发阶段默认先评估当前 task 是否能安全并行。适合时，主 Agent 创建 `parallel_execution.trigger: "workflow_default"` 合同，默认使用 `runtime_managed` + `runtime.provider: "codex_native_subagents"` 调度 worker；用户明确要求并行、多 agent 或多 worktree 时使用 `trigger: "user_requested"`。主 Agent 声明每个 worker 的 `owned_paths`、`forbidden_paths`、`expected_output` 和 `required_gates`；非 native fallback 写仓库时还要声明 `branch` 和 `worktree`。worker 可以在各自非空、互不重叠且属于当前 task `allowed_paths` 的 owned paths 内实现，但不得直接修改 `plan.yaml`、`lifecycle.yaml`、`.docs/INDEX.md`、overview 或最终 implementation doc。主 Agent 负责 review、merge/cherry-pick、运行总 gate、更新事实源和完成两段提交。不适合拆分时继续串行 `/dev` 或 `/devloop` 并记录原因。

## 输入

- `<harnessRoot>/state/lifecycle.yaml`
- `<harnessRoot>/state/plan.yaml`
- `<harnessRoot>/state/plan.draft.yaml`
- 当前任务关联的 PRD 和技术方案
- 当前源码和测试文件

## 输出

- 当前 task `allowed_paths` 范围内的源码改动
- 当前 task `allowed_paths` 范围内的测试改动
- `.docs/04_implementation/` 下相关模块、子系统或核心数据流的 implementation doc
- 当前 task `working_notes` 或 implementation doc `Verification` 中的 gate evidence
- implementation doc 中的 runnable entry/exit、observable exit、Development Self-Test Report、Module Key Test Path、配置契约和 fixture/live 边界事实
- 更新后的 `<harnessRoot>/state/plan.yaml`
- 如果本轮 promote draft，更新后的 `<harnessRoot>/state/plan.draft.yaml`
- 更新后的 `.docs/INDEX.md`
- 当前 task 移除前创建的 task implementation commit
- 从 `plan.yaml` 移除当前 task 后的 task completion ledger commit
- 已 push 到当前 upstream branch 的远端提交

## 语义切片

- `SPRINTING` 阶段的执行单元是 `current_task_id`，不要在开发中重新生成整个 Sprint 计划。
- 当前 task 是开发阶段的执行单元、修改边界和提交边界；implementation doc 的长期语义切片是模块、子系统或核心数据流。
- open task 在 `plan.yaml` 中直接保存 `phase: "SPRINTING"`、`docs`、`allowed_paths`、`required_gates`、`acceptance_criteria`、`implementation_doc` 和必要的 `working_notes`。
- task implementation commit 必须发生在 task 移除之前，避免实现变更和计划短期化混在同一个提交里。
- task completion ledger commit 发生在 implementation commit 之后，只负责将该 task 从当前 `plan.yaml` 移除。
- 一个开发 task 默认对应一个主要 implementation commit 和一个轻量 completion ledger commit。implementation commit message 应包含 task id，例如 `TASK-003: implement login rate limit`；push 成功前，不进入下一个 task。
- 本 Skill 不直接重切 PRD 或 tech plan；如果发现上游语义边界错误，进入 `BLOCKED`、创建 RFC，或请求回到 `ARCHITECTING`。
- gate 通过后调用 `pjsdlc_implementation_doc`，由该 Skill 按真实实现更新或新增 `.docs/04_implementation/` 模块级 slice。
- direct dev gate 与 phase-exit gate 语义不同：`validate-dev` 支持当前 open `SPRINTING` task；`validate-current` 在 `SPRINTING` 下仍会拒绝 open task，提示先完成 implementation commit 和 completion ledger。
- 如果一个任务实际变成多个独立实现边界，应停止扩大范围，拆分后续任务或回到任务规划。
- `/dev` 是单任务执行入口：没有 open task 时，先根据 PRD、architecture、tech plan 和 `plan.draft.yaml` 创建一个最小 `TASK-*` open task；如果从 `plan.draft.yaml.tasks[]` 采用 draft，必须同次从 draft 列表删除源项；已有 open task 时，直接执行该 task；完成后停止。
- `/devloop` 是连续执行入口：每完成一个 task 并 push 两段提交后，重新读取 lifecycle、`plan.yaml`、`plan.draft.yaml`、PRD、architecture 和 tech plan，再决定是否创建/执行下一个最小 task；没有 open task 且没有未采用 draft，或出现 blocker 时停止并报告。
- Parallel Execution 是当前 task 的默认评估协作方式，不替代 task completion protocol；`SPRINTING` 并行从 lifecycle 的 `current_phase` 和 plan 的 `current_task_id` 推断上下文，不在 `parallel_execution` 内重复保存。

## Plan Protocol

每个 open task 都必须在 `plan.yaml` 中包含完整执行合同：

1. `current_task_id` 指向正在执行的 open task。
2. open task 直接声明 `phase: "SPRINTING"`、`docs`、`allowed_paths`、`required_gates`、`acceptance_criteria` 和 `implementation_doc`；runtime/app/provider/live 类 task 还必须声明 `evidence_level`、`target_runtime_environment` 和 `self_test_contract`。`self_test_contract.required_gates` 必须同步出现在 task `required_gates`，`self_test_contract.module_key_test_path` 必须描述从本地启动或调用入口开始，到完成所有自测 scenario 的模块关键测试路径，并覆盖本 task / 本模块承诺的所有可运行入口和内部关键路径。
3. 如果 open task 是由 `plan.draft.yaml.tasks[]` promote 而来，创建正式 `TASK-*` 和删除源 draft 必须发生在同一次状态更新中；正式 task 的恢复现场只保存在 `plan.yaml`。
4. 任务执行中只保留恢复所需的简短 `working_notes`。
5. gate、implementation doc、`.docs/INDEX.md` 和 `overview.md` 完成后，在当前 task 仍位于 `plan.yaml` 时创建 task implementation commit。
6. implementation commit 完成后，再把该 task 从 `plan.yaml` 的 `tasks` 列表移除，并保留/递增 `next_task_sequence`。
7. 将移除当前 task 后的 `plan.yaml` 提交为 task completion ledger commit，并 `git push` 两个 commit 到当前 upstream branch。

done task 的执行流水不在当前 `plan.yaml` 长期保留，也不是默认上下文。修 bug、补功能和继续开发时，优先读取当前代码、测试、PRD、技术方案和模块级 implementation doc；历史 task 查询主要看“做了什么、为什么做、影响哪个模块、验证了什么”，task id 和 commit 作为 implementation doc 的 provenance。`allowed_paths`、`required_gates`、临时 `working_notes` 是执行期约束，不作为历史查询 API。只有用户明确要求 forensic/audit/regression 追溯时，才临时使用 git、PR 或 CI 记录。

## 规则

1. 一次只执行一个任务。
2. 开始修改前检查 `git status`；如果存在不属于当前 task 的未提交变更，先完成对应 task 的 commit/push，或报告 blocker，不要混入当前 task。
3. 只编辑当前 task 的 `allowed_paths` 允许的文件，以及 `SPRINTING` 阶段允许的 Harness 记账文件；如果本轮 promote draft，允许同步编辑 `<harnessRoot>/state/plan.draft.yaml` 来消费源 draft。
4. 必须运行当前 task 的 `required_gates`。
5. 开发中可运行 `make validate-dev` 验证当前 open task；它通过不表示可以进入 `REVIEWING`。
6. 如果 gate 因代码或测试逻辑失败，在任务范围内修复。
7. 如果 gate 因基础设施、凭证缺失、产品行为不清或高风险架构变化失败，进入 `BLOCKED`。
8. gate 通过后调用 `pjsdlc_implementation_doc`。
9. 只有 gate 通过、承诺的 runnable entry/exit 已实现或明确 `BLOCKED`，implementation doc 包含结构化 `Development Evidence` 和已执行的 `Development Self-Test Report`，且 implementation doc 校验通过后，才能把任务标记为 `done`。
10. 任务完成并写入或更新相关 implementation doc、刷新 `overview.md`、记录 gate 后，先创建 task implementation commit；此时不要移除该 task。
11. task implementation commit 必须发生在 task 移除前；后续默认不要读取其中的执行期字段，历史查询以模块级 implementation doc、RFC、PRD、tech plan 和代码为主。
12. implementation commit 完成后，从当前 `plan.yaml` 移除该 task，并创建 task completion ledger commit。
13. 默认不追溯已完成 task 的执行流水；只有显式 forensic/audit/regression 任务才临时查询 git、PR 或 CI 记录。
14. 两个 commit 后必须 `git push` 到当前 upstream branch；如果没有 remote/upstream、权限或凭证导致无法 push，停止推进并报告 blocker。
15. `/devloop` 每轮都必须重新读取当前状态，不得在一次上下文中假设 plan、draft、代码或远端状态未变化。
16. 每个开发 task 开始时默认评估是否适合并行；适合时使用 `parallel_execution.trigger: "workflow_default"`，用户明确要求并行、多 agent 或多 worktree 时使用 `trigger: "user_requested"`。
17. 默认使用 `runtime_managed` + `runtime.provider: "codex_native_subagents"`；没有 native subagent 能力时输出 `user_orchestrated` worker prompt，由用户手动打开对话或 worktree 后粘贴；高风险写入或用户要求强隔离时可使用 `codex_exec_worktree` fallback。
18. worker 不更新主事实源；主 Agent 才能更新 `plan.yaml`、`.docs/INDEX.md`、overview、implementation doc 和最终 gate 证据。

## 完成检查

- [ ] 代码和测试改动都在当前 task `allowed_paths` 范围内。
- [ ] 当前 task `required_gates` 已通过，或 blocker 已记录。
- [ ] open task 在 `plan.yaml` 中包含完整执行合同。
- [ ] 当前任务仍然是单一清晰的执行单元。
- [ ] 技术方案或 task 承诺的 API/CLI/adapter/worker/provider、配置契约、输出/副作用和 fixture/live 边界已可运行并写入 implementation doc，或已明确 `BLOCKED`/后续 dev task。
- [ ] implementation doc `Development Evidence` 已记录 `Evidence Level`、`Target Runtime Environment`、`Runnable Entry`、`Observable Exit`、`Client / Server Initialization`、`Config Contract`、`Testing Handoff Readiness`、`Known Missing Runtime Boundaries`、`Basic Self-test Evidence`，或写明带原因的 `Not applicable`。
- [ ] 如果当前 task 有 `self_test_contract.status: "required"`，implementation doc 已填写 `Development Self-Test Report`，包含 contract source、scenario results、executed gates、Module Key Test Path、actual evidence、missing/blockers 和 Testing Handoff Readiness，且没有 `BLOCKED` 场景。
- [ ] 如果 task 要求 `business_handoff_ready`，implementation doc 已写入 Testing Handoff Contract，包含入口、配置、初始化/health、输入样例、预期出口、清理方式和证据等级。
- [ ] 如果当前 task 来自 `plan.draft.yaml.tasks[]`，源 draft 已在 promote 时从 draft 列表删除。
- [ ] implementation doc 已生成或更新，并反映相关模块的真实代码。
- [ ] 如果启用了 `parallel_execution`，worker owned paths、forbidden paths、required gates 和主 Agent 集成结果已记录。
- [ ] gate 结果已写入 implementation doc `Verification`，必要时当前 task `working_notes` 也记录了恢复现场所需的 gate evidence。
- [ ] task implementation commit 已在 task 移除前创建。
- [ ] done task 已在 implementation commit 之后从当前 `plan.yaml` 移除。
- [ ] `.docs/INDEX.md` 已链接 implementation doc。
- [ ] 已运行 `make docs-overview` 刷新 `.docs/<stage>/overview.md`。
- [ ] 已创建 task completion ledger commit。
- [ ] 已 `git push` 两个 commit 到当前 upstream branch；如果 push 失败，已报告 blocker 且未进入下一个 task。
