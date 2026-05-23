# RFC_005: 合并 checkpoint 到 plan.yaml 并移除 checkpoint 机制

## 1. 背景

RFC_004 已把 checkpoint 限定为活跃 task 的执行合同，并在 task 完成后删除。但用户进一步明确：checkpoint 文件本身也不需要。活跃 task 需要的执行现场、`allowed_paths`、`required_gates`、验收标准和备注，可以直接放进计划文件；task 完成后再把该条 task 压缩成简短摘要。

同时，`tasks.yaml` 的文件名仍然暗示它只是一组任务记录。实际它承担的是当前 sprint/阶段的执行计划和进度索引，因此应改名为 `plan.yaml`；草案文件同步从 `tasks.draft.yaml` 改为 `plan.draft.yaml`。

## 2. 变更内容（Change Content）

- Added:
  - `plan.yaml` 作为当前执行计划事实源。
  - open task 在 `plan.yaml` 内直接包含 `allowed_paths`、`required_gates`、`acceptance_criteria` 和 `working_notes`。
  - DEV-011 实现任务。
- Changed:
  - `tasks.yaml` 改名为 `plan.yaml`。
  - `tasks.draft.yaml` 改名为 `plan.draft.yaml`。
  - task 完成时，open task 的详细执行字段压缩为 `summary`、`implementation_doc` 和 `gate_result`。
  - `validate_allowed_paths` 改为从当前 open task 读取 `allowed_paths`。
- Removed:
  - checkpoint protocol、checkpoint 目录、checkpoint 模板。
  - `validate-checkpoint` gate 和 CLI alias。
  - `tools/validate_checkpoint.py`。
- Unchanged:
  - task 仍是开发执行单元。
  - implementation doc 仍记录真实实现结果。
  - git commit 仍作为动作历史事实源。

## 3. Product Impact（产品影响）

| 受影响 PRD（Affected PRD） | 影响（Impact） |
|---|---|
| `.docs/01_product/npm_package_distribution.md` | 需要把轻量 task/checkpoint 模型更新为 `plan.yaml` 单文件计划模型，并移除 checkpoint 要求。 |

## 4. Technical Impact Candidates（技术影响候选）

| 模块（Module） | 影响（Impact） | 置信度（Confidence） |
|---|---|---|
| `AGENTS.md` | 更新事实源、工作规则、宏指令和 prompt language contract。 | high |
| `README.md` | 更新工作流说明、目录结构、gate 和恢复入口。 | high |
| `.agent/state/tasks.yaml` | 改名为 `.agent/state/plan.yaml`，并新增 DEV-011 open plan 字段。 | high |
| `.agent/state/tasks.draft.yaml` | 改名为 `.agent/state/plan.draft.yaml`。 | high |
| `.agent/state/checkpoints/` | 删除目录和相关事实源声明。 | high |
| `.agent/skills/**` | 所有阶段 Skill 改用 `plan.yaml`，不再提 checkpoint。 | high |
| `.agent/managed/templates/**` | 删除 `CHECKPOINT_TEMPLATE.md`，新增/更新 `PLAN_TEMPLATE.yaml`。 | high |
| `.agent/policies/**` | inputs/outputs/write paths 改为 `plan.yaml`/`plan.draft.yaml`，移除 checkpoint 路由。 | high |
| `tools/*.py` | `load_plan`/`validate_plan`/`validate_plan_draft` 改为 plan 语义，删除 checkpoint validator。 | high |
| `packages/sdlc-harness/src/lib/*.ts` | init/doctor/migrations/validators 改为 `plan.yaml`，移除 checkpoint validator。 | high |
| `tests/sdlc-harness/**` | 更新 init/upgrade/validators 测试。 | high |
| `.docs/INDEX.md` | 路由从 task state 改为 plan state，并链接 RFC_005/DEV-011。 | high |

Impact analysis:

```sh
python3 tools/impact_analyzer.py --rfc .docs/rfc/RFC_005_merge_checkpoint_into_plan.md --top 40
```

## 5. Acceptance Criteria

- [x] `.agent/state/tasks.yaml` 和 `.agent/state/tasks.draft.yaml` 不再存在。
- [x] `.agent/state/plan.yaml` 和 `.agent/state/plan.draft.yaml` 成为计划事实源。
- [x] `.agent/state/checkpoints/` 不再存在。
- [x] open task 的 `allowed_paths`、`required_gates`、`acceptance_criteria` 和执行备注直接保存在 `plan.yaml` 当前 task 中。
- [x] done task 只保留简短摘要、implementation doc 和 gate result。
- [x] `validate-checkpoint` 从 Makefile、Python tools、Node CLI 和 package assets 中移除。
- [x] 本地 gates、Node validators、package source drift check 和 npm tests 通过。

## 6. Regression Requirements（回归要求）

- [x] 覆盖 `validate-dev` 对 open task `allowed_paths` 和 `required_gates` 的校验。
- [x] 覆盖 done task 不需要详细执行字段。
- [x] 覆盖 init/upgrade 生成或迁移 `plan.yaml`/`plan.draft.yaml`。
- [x] 覆盖 package assets 与本地 Harness 源文件无漂移。

## 7. Status

- Status: VERIFIED
