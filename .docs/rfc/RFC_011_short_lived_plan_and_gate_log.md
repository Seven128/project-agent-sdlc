# RFC_011: plan 和 gate_results 只保留短期执行状态

## 1. 背景

当前 `plan.yaml` 在 task 完成后仍保留 done task 摘要和 `gate_result`。这比完整合同轻量，但随着项目推进，done task 会越来越多，大多数情况下都会变成无效上下文，削弱 Agent 对当前任务和下一步任务的注意力。

同样，`.agent/state/gate_results.log` 当前会无限 append 历史 gate 记录。它对当前 task 中断恢复有帮助，但长期历史已经由 git commit、implementation doc、CI logs 或外部 release 系统承载，不应长期挤占 Agent 上下文。

## 2. 变更内容（Change Content）

- Added:
  - `plan.yaml` 增加轻量 `next_task_sequence`，用于删除历史 task 后仍能分配后续 `DEV-*` id。
  - 明确 `gate_results.log` 是当前 task / 当前阶段短期 scratchpad。
- Changed:
  - `plan.yaml` 只保留当前和未来相关 task：`pending`、`in_progress`、`blocked`、`pending_revision`。
  - task completion ledger commit 不再把 completed task 压缩留在 `plan.yaml`，而是从 `tasks` 中移除该 task。
  - `gate_results.log` 在 task completion ledger 后重置为短 header，不再无限累积历史 gate 记录。
  - validators 不再要求 `plan.yaml` 必须包含 done task，也不再通过 `plan.yaml` 校验所有历史 implementation docs。
- Removed:
  - `plan.yaml` 长期保留 done/cancelled task 摘要和 `gate_result` 的要求。
- Unchanged:
  - task implementation commit 仍必须在 task 移除前创建，并保留完整 open task 合同。
  - implementation doc、git history 和 CI logs 仍是长期历史事实源。
  - `pjsdlc:sdlc-harness:*` marker namespace 保持不变。

## 3. Product Impact（产品影响）

| 受影响 PRD（Affected PRD） | 影响（Impact） |
|---|---|
| `.docs/01_product/npm_package_distribution.md` | 调整 plan/gate 状态模型：当前执行计划只保留活跃和未来任务，历史任务与 gate 历史走 git、implementation doc 和 CI logs。 |

## 4. Technical Impact Candidates（技术影响候选）

| 模块（Module） | 影响（Impact） | 置信度（Confidence） |
|---|---|---|
| `.agent/state/plan.yaml` | 移除历史 done tasks，增加 `next_task_sequence`，保留当前 open task。 | high |
| `.agent/state/gate_results.log` | completion 后重置为短期 scratchpad header。 | high |
| `AGENTS.md` / README / Skills | 更新 Plan Protocol 和 task completion loop。 | high |
| `tools/validate_plan.py` / `tools/validate_task_docs.py` | 允许 `tasks: []`，禁止 done/cancelled 长期留存，implementation docs 校验改由索引/文档存在性承担。 | high |
| `packages/sdlc-harness/src/lib/validators.ts` | Node validator 同步新 plan 语义。 | high |
| `packages/sdlc-harness/src/lib/init.ts` / templates / migrations | 初始化和迁移加入 `next_task_sequence`，不再默认要求 done task。 | high |
| `tests/sdlc-harness/**` | 更新 validator 测试覆盖空 plan、open task 和 forbidden done task。 | high |

## 5. Acceptance Criteria

- [ ] `plan.yaml` 不再长期保留历史 done/cancelled tasks。
- [ ] `plan.yaml` 包含 `next_task_sequence`，并能在没有历史 tasks 时继续分配新 task id。
- [ ] `gate_results.log` 被定义并执行为当前 task / 当前阶段短期 scratchpad，completion 后重置。
- [ ] Python validators 允许无 open/pending task 的空 `tasks: []`，但仍校验 open task 合同。
- [ ] Node validators 与 Python validators 语义一致。
- [ ] README、AGENTS、Skill 和技术方案解释长期历史应从 git、implementation doc、CI logs 查找。
- [ ] `pjsdlc:sdlc-harness:*` marker namespace 保持不变。

## 6. Regression Requirements（回归要求）

- [ ] 覆盖空 `tasks: []` 的 `validate-dev` 通过。
- [ ] 覆盖 open task 缺少 `allowed_paths` 时失败。
- [ ] 覆盖 done/cancelled task 留在 `plan.yaml` 时失败。
- [ ] 覆盖 package source assets 与 workspace prompts 一致。
- [ ] 覆盖当前仓库 `make validate-harness` 和 `make validate-current` 通过。

## 7. Status

- Status: APPLIED
