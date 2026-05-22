---
name: manager
description: Use when checking project phase, routing macro commands, validating exit gates, or switching lifecycle phase.
---

# Manager Skill

## 目的

让生命周期流转保持显式、可验证、可回溯。`manager` 负责读取状态、选择当前阶段
Skill、执行出口 gate，并记录 blocker。

## 输入

- `.harness/state/lifecycle.yaml`
- `.harness/state/tasks.yaml`
- `.harness/state/checkpoints/`
- `.docs/INDEX.md`
- `.harness/policies/phase_contracts.yaml`

## 规则

1. 执行任何动作前，先读取 `.harness/state/lifecycle.yaml`。
2. 不要基于猜测切换阶段。
3. 阶段切换前必须运行对应 Makefile gate。
4. 只能通过 `python3 tools/transition.py --to <PHASE>` 更新生命周期。
5. gate 失败时保持当前阶段不变，并报告 blocker。
6. 用户输入 `/status` 时，运行 `make status`。
7. 用户输入 `/next` 时，调用 `active_skill` 映射的 Skill。
8. 用户输入 `/advance` 时，运行 `make validate-current`，通过后流转到配置的 `next` 阶段。
9. 用户输入 `/rfc <file>` 时，流转到 `RFC_RECALIBRATION` 并调用 `rfc_recalibrate`。
10. 用户输入 `/checkpoint` 时，检查当前 task 的 `checkpoint_required` 和 `checkpoint`，并运行 `make validate-checkpoint`。
11. 如果当前 task 处于 `blocked` 或 `checkpoint_required: true`，不要推进阶段，先要求 checkpoint 完整。

## Checkpoint 触发条件

满足任一条件时，要求当前 task 写 checkpoint：

- 当前 task 预计无法在一个连续工作回合内完成。
- 修改文件数超过 5 个。
- 出现 gate failure。
- 出现 `BLOCKED` 候选原因。
- 发现技术方案和真实实现明显偏移。
- 用户要求暂停、切换对话或继续前保存现场。
- Agent 判断上下文可能接近压缩。

## 完成检查

- [ ] 已确认 `current_phase`、`active_role`、`active_skill` 和下一阶段。
- [ ] gate 结果已记录到 `.harness/state/gate_results.log`。
- [ ] 如当前 task 需要 checkpoint，`make validate-checkpoint` 已通过。
- [ ] 生命周期只通过 `tools/transition.py` 发生变化。
