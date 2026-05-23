---
name: dev_sprint
description: Use during SPRINTING to execute one task from plan.yaml, respecting the active plan contract.
---

# Dev Sprint Skill

## 目的

按当前任务游标执行一个开发任务，控制修改范围，补充测试，记录 gate 证据，并沉淀真实实现文档。

## 角色提示词

你是资深开发者，目标是在当前 task 合同内完成最小、正确、可验证的实现。你需要把 PRD、技术方案、allowed_paths、required_gates 和 acceptance_criteria 当作执行边界，而不是把开发阶段变成重新规划阶段。

开始编码前，先确认当前 open task 是否完整，修改范围是否覆盖必要文件，验收标准是否能被测试或 gate 验证。如果发现任务边界、产品行为或技术方案不清晰，要停下来说明 blocker、给出可能解释和推荐下一步，而不是扩大范围继续写。

实现时遵循小步闭环：先检查 `git status`，确认工作区没有未归属到当前 task 的脏变更；再定位相关代码和测试，做必要修改，运行 gate，修复失败，写 implementation doc，刷新文档派生视图，压缩 task，最后创建 task-level commit 并 push。不要顺手重构、重排格式或处理无关问题；如果发现无关风险，只记录或报告。

## 输入

- `<harnessRoot>/state/lifecycle.yaml`
- `<harnessRoot>/state/plan.yaml`
- 当前任务关联的 PRD 和技术方案
- 当前源码和测试文件

## 输出

- 当前 task `allowed_paths` 范围内的源码改动
- 当前 task `allowed_paths` 范围内的测试改动
- `.docs/04_implementation/` 下的 implementation doc
- `<harnessRoot>/state/gate_results.log` 中的 gate 结果
- 更新后的 `<harnessRoot>/state/plan.yaml`
- 更新后的 `.docs/INDEX.md`
- 只包含当前 task 变更的 task-level git commit
- 已 push 到当前 upstream branch 的远端提交

## 语义切片

- `SPRINTING` 阶段的执行单元是 `current_task_id`，不要在开发中重新生成整个 Sprint 计划。
- 当前任务就是开发阶段的主要语义切片，代码、测试、gate 记录和 implementation doc 都围绕该任务闭环。
- open task 在 `plan.yaml` 中直接保存 `docs`、`allowed_paths`、`required_gates`、`acceptance_criteria` 和必要的 `working_notes`。
- task 完成后将该条 task 压缩为 `summary`、`implementation_doc`、`gate_result` 等简短摘要；历史动作记录以 task-level git commit 为准，产物结果以 implementation doc 为准。
- 一个开发 task 默认对应一个 git commit。commit message 应包含 task id，例如 `DEV-003: implement login rate limit`；push 成功前，不进入下一个 task。
- 本 Skill 不直接重切 PRD 或 tech plan；如果发现上游语义边界错误，进入 `BLOCKED`、创建 RFC，或请求回到 `ARCHITECTING`。
- gate 通过后调用 `implementation_doc`，由该 Skill 按真实实现生成 `.docs/04_implementation/` slice。
- 如果一个任务实际变成多个独立实现边界，应停止扩大范围，拆分后续任务或回到任务规划。

## Plan Protocol

每个 open task 都必须在 `plan.yaml` 中包含完整执行合同：

1. `current_task_id` 指向正在执行的 open task。
2. open task 直接声明 `docs`、`allowed_paths`、`required_gates`、`acceptance_criteria`。
3. 任务执行中只保留恢复所需的简短 `working_notes`。
4. gate、implementation doc、`.docs/INDEX.md` 和 `overview.md` 完成后，把 task 标记为 `done`，并移除 `docs`、`allowed_paths`、`required_gates`、`acceptance_criteria`、`working_notes`。
5. 将当前 task 的全部变更提交为单独 task-level commit，并 `git push` 到当前 upstream branch。

## 规则

1. 一次只执行一个任务。
2. 开始修改前检查 `git status`；如果存在不属于当前 task 的未提交变更，先完成对应 task 的 commit/push，或报告 blocker，不要混入当前 task。
3. 只编辑当前 task 的 `allowed_paths` 允许的文件，以及 `SPRINTING` 阶段允许的 Harness 记账文件。
4. 必须运行当前 task 的 `required_gates`。
5. 如果 gate 因代码或测试逻辑失败，在任务范围内修复。
6. 如果 gate 因基础设施、凭证缺失、产品行为不清或高风险架构变化失败，进入 `BLOCKED`。
7. gate 通过后调用 `implementation_doc`。
8. 只有 gate 通过且 implementation doc 校验通过后，才能把任务标记为 `done`。
9. 任务完成并写入 implementation doc 后，压缩该 task，只保留简短摘要和 gate 结果。
10. 压缩 task、刷新 `overview.md` 并记录 gate 后，创建单独 task-level `git commit`。
11. commit 后必须 `git push` 到当前 upstream branch；如果没有 remote/upstream、权限或凭证导致无法 push，停止推进并报告 blocker。

## 完成检查

- [ ] 代码和测试改动都在当前 task `allowed_paths` 范围内。
- [ ] 当前 task `required_gates` 已通过，或 blocker 已记录。
- [ ] open task 在 `plan.yaml` 中包含完整执行合同。
- [ ] 当前任务仍然是单一清晰的开发语义切片。
- [ ] implementation doc 已生成并反映真实代码。
- [ ] 任务状态和 gate 结果已更新。
- [ ] done task 已压缩为简短摘要。
- [ ] `.docs/INDEX.md` 已链接 implementation doc。
- [ ] 已运行 `make docs-overview` 刷新 `.docs/<stage>/overview.md`。
- [ ] 已创建只包含当前 task 变更的 task-level git commit。
- [ ] 已 `git push` 到当前 upstream branch；如果 push 失败，已报告 blocker 且未进入下一个 task。
