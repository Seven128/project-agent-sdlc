# DEV-011 Implementation: plan.yaml no checkpoint

## Task

- Task ID: `DEV-011`
- Title: 合并 checkpoint 到 `plan.yaml` 并重命名 tasks 状态
- PRD: `.docs/01_product/npm_package_distribution.md`
- Tech Plan: `.docs/03_tech_plan/harness_package_distribution.md`
- RFC: `.docs/rfc/RFC_005_merge_checkpoint_into_plan.md`

## Implementation Summary

`tasks.yaml` / `tasks.draft.yaml` 被替换为 `plan.yaml` / `plan.draft.yaml`。open task 的 `allowed_paths`、`required_gates`、`acceptance_criteria`、`working_notes` 直接保存在 `plan.yaml` 当前 task 条目中；done/cancelled task 不再保留这些活跃执行字段。

checkpoint 机制被移除：不再创建 `<harnessRoot>/state/checkpoints/`，不再分发 `CHECKPOINT_TEMPLATE.md`，Makefile、Python validators、Node CLI validators 和 GitHub workflow 都不再暴露 `validate-checkpoint`。

## Changed Files

| Path | Purpose |
|---|---|
| `.agent/state/plan.yaml` | 当前执行计划事实源，包含 DEV-011 open task 合同，完成后会压缩为摘要。 |
| `.agent/state/plan.draft.yaml` | 架构阶段计划草案事实源，替代旧 `tasks.draft.yaml`。 |
| `tools/validate_plan.py` / `tools/validate_plan_draft.py` | 替代旧 task validator，并校验 open/done task 字段边界。 |
| `tools/validate_allowed_paths.py` | 从当前 open task 读取 `allowed_paths`。 |
| `packages/sdlc-harness/src/lib/{init,doctor,migrations,validators}.ts` | 初始化、诊断、迁移和 Node validator 全部切换到 plan 模型。 |
| `.agent/skills/**` / `.agent/managed/templates/**` / `.agent/policies/**` | 阶段规则和模板改为 plan protocol。 |
| `tests/sdlc-harness/**` | 覆盖 init、upgrade 和 validator 的 plan 行为。 |

## Plan Deviations

RFC_005 原计划删除 checkpoint 并重命名 task state；实现中同时增强了 upgrade migration：旧 `tasks.yaml` / `tasks.draft.yaml` 会迁移为 `plan.yaml` / `plan.draft.yaml`，并在可解析时把旧 checkpoint `Task Contract` 合并回 open task。

## Verification

| Gate | Result |
|---|---|
| `npm test` | PASS |
| `node packages/sdlc-harness/dist/cli.js package check-source` | PASS |
| `node packages/sdlc-harness/dist/cli.js validate-harness` | PASS |
| `make validate-harness` | PASS |
| `make validate-rfc` | PASS |
| `python3 tools/validate_allowed_paths.py` | PASS |
| `make validate-current` | PASS |
