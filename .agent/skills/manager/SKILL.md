---
name: manager
description: Use when checking project phase, routing macro commands, validating exit gates, or switching lifecycle phase.
---

# Manager Skill

## 目的

让生命周期流转保持显式、可验证、可回溯。`manager` 负责读取状态、选择当前阶段
Skill、执行出口 gate，并记录 blocker。

## 输入

- `<harnessRoot>/state/lifecycle.yaml`
- `<harnessRoot>/state/plan.yaml`
- `.docs/INDEX.md`
- `<harnessRoot>/managed/policies/phase_contracts.yaml`

## 规则

1. 执行任何动作前，先读取 `<harnessRoot>/state/lifecycle.yaml`。
2. 不要基于猜测切换阶段。
3. 阶段切换前必须运行对应 Makefile gate。
4. 只能通过 `python3 tools/transition.py --to <PHASE>` 更新生命周期。
5. gate 失败时保持当前阶段不变，并报告 blocker。
6. 用户输入 `/status` 时，运行 `make status`。
7. 用户输入 `/next` 时，调用 `active_skill` 映射的 Skill。
8. 用户输入 `/advance` 时，运行 `make validate-current`，通过后流转到配置的 `next` 阶段。
9. 用户输入 `/rfc <file>` 时，流转到 `RFC_RECALIBRATION` 并调用 `rfc_recalibrate`。
10. 如果当前 task 处于 `blocked` 或缺少 open task 必需的 plan 字段，不要推进阶段，先要求 `plan.yaml` 完整。

## Plan Protocol

每个 open task 都必须在 `plan.yaml` 中包含 `docs`、`allowed_paths`、`required_gates` 和 `acceptance_criteria`；done/cancelled task 只保留简短摘要、implementation doc 和 gate result。完成后的历史事实以 git commit 与 implementation doc 为准。

## 完成检查

- [ ] 已确认 `current_phase`、`active_role`、`active_skill` 和下一阶段。
- [ ] gate 结果已记录到 `<harnessRoot>/state/gate_results.log`。
- [ ] 如当前 task 是 open task，`plan.yaml` 中的执行合同完整。
- [ ] 生命周期只通过 `tools/transition.py` 发生变化。
