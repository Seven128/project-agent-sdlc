---
name: dev_sprint
description: Use during SPRINTING to execute one task from tasks.yaml, respecting allowed paths and required gates.
---

# Dev Sprint Skill

## 目的

按当前任务游标执行一个开发任务，控制修改范围，补充测试，记录 gate 证据，并沉淀真实实现文档。

## 输入

- `.harness/state/lifecycle.yaml`
- `.harness/state/tasks.yaml`
- `.harness/state/checkpoints/`
- 当前任务关联的 PRD 和技术方案
- 当前源码和测试文件

## 输出

- 当前任务 `allowed_paths` 范围内的源码改动
- 当前任务 `allowed_paths` 范围内的测试改动
- `.docs/04_implementation/` 下的 implementation doc
- `.harness/state/gate_results.log` 中的 gate 结果
- 必要时写入 `.harness/state/checkpoints/<Task ID>.md` 和 `.harness/state/checkpoints/latest.md`
- 更新后的 `.harness/state/tasks.yaml`
- 更新后的 `.docs/INDEX.md`

## 语义切片

- `SPRINTING` 阶段的执行单元是 `current_task_id`，不要在开发中重新生成整个 Sprint 计划。
- 当前任务就是开发阶段的主要语义切片，代码、测试、gate 记录和 implementation doc 都围绕该任务闭环。
- 本 Skill 不直接重切 PRD 或 tech plan；如果发现上游语义边界错误，进入 `BLOCKED`、创建 RFC，或请求回到 `ARCHITECTING`。
- gate 通过后调用 `implementation_doc`，由该 Skill 按真实实现生成 `.docs/04_implementation/` slice。
- 如果一个任务实际变成多个独立实现边界，应停止扩大范围，拆分后续任务或回到任务规划。

## Checkpoint 触发条件

满足任一条件时，必须写 checkpoint：

- 当前 task 预计无法在一个连续工作回合内完成。
- 修改文件数超过 5 个。
- 出现 gate failure。
- 出现 `BLOCKED` 候选原因。
- 发现技术方案和真实实现明显偏移。
- 用户要求暂停、切换对话或继续前保存现场。
- Agent 判断上下文可能接近压缩。

触发后执行：

1. 在当前 task 中设置 `checkpoint_required: true`。
2. 设置 `checkpoint: ".harness/state/checkpoints/<Task ID>.md"`。
3. 按 `.harness/templates/CHECKPOINT_TEMPLATE.md` 写入 checkpoint。
4. 同步更新 `.harness/state/checkpoints/latest.md`。
5. 运行 `make validate-checkpoint`。

## 规则

1. 一次只执行一个任务。
2. 只编辑当前任务 `allowed_paths` 允许的文件，以及 `SPRINTING` 阶段允许的 Harness 记账文件。
3. 必须运行当前任务的 `required_gates`。
4. 如果 gate 因代码或测试逻辑失败，在任务范围内修复。
5. 如果 gate 因基础设施、凭证缺失、产品行为不清或高风险架构变化失败，进入 `BLOCKED`。
6. gate 通过后调用 `implementation_doc`。
7. 只有 gate 通过且 implementation doc 校验通过后，才能把任务标记为 `done`。
8. 任务完成并写入 implementation doc 后，可以把 `checkpoint_required` 改回 `false`。

## 完成检查

- [ ] 代码和测试改动都在 `allowed_paths` 范围内。
- [ ] `required_gates` 已通过，或 blocker 已记录。
- [ ] 如触发 checkpoint，`.harness/state/checkpoints/latest.md` 已更新且 `make validate-checkpoint` 通过。
- [ ] 当前任务仍然是单一清晰的开发语义切片。
- [ ] implementation doc 已生成并反映真实代码。
- [ ] 任务状态和 gate 结果已更新。
- [ ] `.docs/INDEX.md` 已链接 implementation doc。
- [ ] 已运行 `make docs-overview` 刷新 `.docs/<stage>/overview.html`。
