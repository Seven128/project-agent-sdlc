---
name: dev_sprint
description: Use during SPRINTING to execute one task from tasks.yaml, respecting the active checkpoint contract.
---

# Dev Sprint Skill

## 目的

按当前任务游标执行一个开发任务，控制修改范围，补充测试，记录 gate 证据，并沉淀真实实现文档。

## 输入

- `<harnessRoot>/state/lifecycle.yaml`
- `<harnessRoot>/state/tasks.yaml`
- 当前 task 的 `<harnessRoot>/state/checkpoints/<Task ID>.md`
- 当前任务关联的 PRD 和技术方案
- 当前源码和测试文件

## 输出

- 当前 task checkpoint 中 `allowed_paths` 范围内的源码改动
- 当前 task checkpoint 中 `allowed_paths` 范围内的测试改动
- `.docs/04_implementation/` 下的 implementation doc
- `<harnessRoot>/state/gate_results.log` 中的 gate 结果
- 更新后的 `<harnessRoot>/state/tasks.yaml`
- 更新后的 `.docs/INDEX.md`

## 语义切片

- `SPRINTING` 阶段的执行单元是 `current_task_id`，不要在开发中重新生成整个 Sprint 计划。
- 当前任务就是开发阶段的主要语义切片，代码、测试、gate 记录和 implementation doc 都围绕该任务闭环。
- `tasks.yaml` 只保留轻量任务索引；`allowed_paths`、`required_gates` 和验收标准从当前 task checkpoint 的 `Task Contract` 读取。
- task 完成后删除对应 checkpoint；历史动作记录以 git commit 为准，产物结果以 implementation doc 为准。
- 本 Skill 不直接重切 PRD 或 tech plan；如果发现上游语义边界错误，进入 `BLOCKED`、创建 RFC，或请求回到 `ARCHITECTING`。
- gate 通过后调用 `implementation_doc`，由该 Skill 按真实实现生成 `.docs/04_implementation/` slice。
- 如果一个任务实际变成多个独立实现边界，应停止扩大范围，拆分后续任务或回到任务规划。

## Checkpoint Protocol

每个 open task 都必须有 checkpoint：

1. `tasks.yaml` 中当前 task 设置 `checkpoint: "<harnessRoot>/state/checkpoints/<Task ID>.md"`。
2. checkpoint 按 `<harnessRoot>/managed/templates/CHECKPOINT_TEMPLATE.md` 写入。
3. checkpoint 必须包含 `Task Contract` YAML 区块，声明 `allowed_paths`、`required_gates` 和验收标准。
4. 任务执行中持续更新 checkpoint，必要时同步更新 `<harnessRoot>/state/checkpoints/latest.md`。
5. 任务完成并写入 implementation doc 后，删除该 checkpoint。

## 规则

1. 一次只执行一个任务。
2. 只编辑当前 task checkpoint 的 `allowed_paths` 允许的文件，以及 `SPRINTING` 阶段允许的 Harness 记账文件。
3. 必须运行当前 task checkpoint 的 `required_gates`。
4. 如果 gate 因代码或测试逻辑失败，在任务范围内修复。
5. 如果 gate 因基础设施、凭证缺失、产品行为不清或高风险架构变化失败，进入 `BLOCKED`。
6. gate 通过后调用 `implementation_doc`。
7. 只有 gate 通过且 implementation doc 校验通过后，才能把任务标记为 `done`。
8. 任务完成并写入 implementation doc 后，删除对应 checkpoint。

## 完成检查

- [ ] 代码和测试改动都在当前 checkpoint `allowed_paths` 范围内。
- [ ] 当前 checkpoint `required_gates` 已通过，或 blocker 已记录。
- [ ] open task checkpoint 存在且 `make validate-checkpoint` 通过。
- [ ] 当前任务仍然是单一清晰的开发语义切片。
- [ ] implementation doc 已生成并反映真实代码。
- [ ] 任务状态和 gate 结果已更新。
- [ ] done task 对应 checkpoint 已删除。
- [ ] `.docs/INDEX.md` 已链接 implementation doc。
- [ ] 已运行 `make docs-overview` 刷新 `.docs/<stage>/overview.html`。
