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

实现时遵循小步闭环：先检查 `git status`，确认工作区没有未归属到当前 task 的脏变更；再定位相关代码和测试，做必要修改，运行 gate，修复失败，写 implementation doc 并刷新文档派生视图。此时先不要从 `plan.yaml` 移除当前 task，要在当前 task 仍位于 `plan.yaml` 时创建 task implementation commit；随后再移除 task，创建 task completion ledger commit，并 push 两个 commit。不要顺手重构、重排格式或处理无关问题；如果发现无关风险，只记录或报告。

## 输入

- `<harnessRoot>/state/lifecycle.yaml`
- `<harnessRoot>/state/plan.yaml`
- 当前任务关联的 PRD 和技术方案
- 当前源码和测试文件

## 输出

- 当前 task `allowed_paths` 范围内的源码改动
- 当前 task `allowed_paths` 范围内的测试改动
- `.docs/04_implementation/` 下的 implementation doc
- 当前 task `working_notes` 或 implementation doc `Verification` 中的 gate evidence
- 更新后的 `<harnessRoot>/state/plan.yaml`
- 更新后的 `.docs/INDEX.md`
- 当前 task 移除前创建的 task implementation commit
- 从 `plan.yaml` 移除当前 task 后的 task completion ledger commit
- 已 push 到当前 upstream branch 的远端提交

## 语义切片

- `SPRINTING` 阶段的执行单元是 `current_task_id`，不要在开发中重新生成整个 Sprint 计划。
- 当前任务就是开发阶段的主要语义切片，代码、测试、gate 记录和 implementation doc 都围绕该任务闭环。
- open task 在 `plan.yaml` 中直接保存 `docs`、`allowed_paths`、`required_gates`、`acceptance_criteria` 和必要的 `working_notes`。
- task implementation commit 必须发生在 task 移除之前，避免实现变更和计划短期化混在同一个提交里。
- task completion ledger commit 发生在 implementation commit 之后，只负责将该 task 从当前 `plan.yaml` 移除。
- 一个开发 task 默认对应一个主要 implementation commit 和一个轻量 completion ledger commit。implementation commit message 应包含 task id，例如 `DEV-003: implement login rate limit`；push 成功前，不进入下一个 task。
- 本 Skill 不直接重切 PRD 或 tech plan；如果发现上游语义边界错误，进入 `BLOCKED`、创建 RFC，或请求回到 `ARCHITECTING`。
- gate 通过后调用 `implementation_doc`，由该 Skill 按真实实现生成 `.docs/04_implementation/` slice。
- 如果一个任务实际变成多个独立实现边界，应停止扩大范围，拆分后续任务或回到任务规划。

## Plan Protocol

每个 open task 都必须在 `plan.yaml` 中包含完整执行合同：

1. `current_task_id` 指向正在执行的 open task。
2. open task 直接声明 `docs`、`allowed_paths`、`required_gates`、`acceptance_criteria`。
3. 任务执行中只保留恢复所需的简短 `working_notes`。
4. gate、implementation doc、`.docs/INDEX.md` 和 `overview.md` 完成后，在当前 task 仍位于 `plan.yaml` 时创建 task implementation commit。
5. implementation commit 完成后，再把该 task 从 `plan.yaml` 的 `tasks` 列表移除，并保留/递增 `next_task_sequence`。
6. 将移除当前 task 后的 `plan.yaml` 提交为 task completion ledger commit，并 `git push` 两个 commit 到当前 upstream branch。

done task 的执行流水不在当前 `plan.yaml` 长期保留，也不是默认上下文。修 bug、补功能和继续开发时，优先读取当前代码、测试、PRD、技术方案和 implementation doc；历史 task 查询主要看“做了什么、为什么做、产物在哪里、验证了什么”。`allowed_paths`、`required_gates`、临时 `working_notes` 是执行期约束，不作为历史查询 API。只有用户明确要求 forensic/audit/regression 追溯时，才临时使用 git、PR 或 CI 记录。

## 规则

1. 一次只执行一个任务。
2. 开始修改前检查 `git status`；如果存在不属于当前 task 的未提交变更，先完成对应 task 的 commit/push，或报告 blocker，不要混入当前 task。
3. 只编辑当前 task 的 `allowed_paths` 允许的文件，以及 `SPRINTING` 阶段允许的 Harness 记账文件。
4. 必须运行当前 task 的 `required_gates`。
5. 如果 gate 因代码或测试逻辑失败，在任务范围内修复。
6. 如果 gate 因基础设施、凭证缺失、产品行为不清或高风险架构变化失败，进入 `BLOCKED`。
7. gate 通过后调用 `implementation_doc`。
8. 只有 gate 通过且 implementation doc 校验通过后，才能把任务标记为 `done`。
9. 任务完成并写入 implementation doc、刷新 `overview.md`、记录 gate 后，先创建 task implementation commit；此时不要移除该 task。
10. task implementation commit 必须发生在 task 移除前；后续默认不要读取其中的执行期字段，历史查询以 implementation doc、RFC、PRD、tech plan 和代码为主。
11. implementation commit 完成后，从当前 `plan.yaml` 移除该 task，并创建 task completion ledger commit。
12. 默认不追溯已完成 task 的执行流水；只有显式 forensic/audit/regression 任务才临时查询 git、PR 或 CI 记录。
13. 两个 commit 后必须 `git push` 到当前 upstream branch；如果没有 remote/upstream、权限或凭证导致无法 push，停止推进并报告 blocker。

## 完成检查

- [ ] 代码和测试改动都在当前 task `allowed_paths` 范围内。
- [ ] 当前 task `required_gates` 已通过，或 blocker 已记录。
- [ ] open task 在 `plan.yaml` 中包含完整执行合同。
- [ ] 当前任务仍然是单一清晰的开发语义切片。
- [ ] implementation doc 已生成并反映真实代码。
- [ ] gate 结果已写入 implementation doc `Verification`，必要时当前 task `working_notes` 也记录了恢复现场所需的 gate evidence。
- [ ] task implementation commit 已在 task 移除前创建。
- [ ] done task 已在 implementation commit 之后从当前 `plan.yaml` 移除。
- [ ] `.docs/INDEX.md` 已链接 implementation doc。
- [ ] 已运行 `make docs-overview` 刷新 `.docs/<stage>/overview.md`。
- [ ] 已创建 task completion ledger commit。
- [ ] 已 `git push` 两个 commit 到当前 upstream branch；如果 push 失败，已报告 blocker 且未进入下一个 task。
