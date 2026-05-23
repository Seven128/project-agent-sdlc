# RFC_004: 简化 task、checkpoint 和 archive 状态模型

## 1. 背景

当前 Harness 同时保存 `tasks.yaml`、checkpoint、`.agent/archive/`、implementation doc 和 git commit 信息。对于 task 和 release 这类动作记录，`.agent/archive/` 与 git 历史重复；对于已完成 task，checkpoint 与 implementation doc 和 commit 也重复。长期保留这些热路径状态会让 Agent 每次查进度时读入过多无效上下文，并增加事实源漂移风险。

用户明确要求：删除 archive 机制；每个活跃 task 都有 checkpoint；task 完成后删除对应 checkpoint；复杂执行合同如 `allowed_paths` 和 `required_gates` 放入 checkpoint；`tasks.yaml` 只保留轻量摘要、状态、实现文档和当前活跃 checkpoint 路径。

## 2. 变更内容（Change Content）

- Added:
  - 新增 DEV-010 实现任务，负责简化 task/checkpoint/archive 协议。
  - checkpoint 模板新增 `Task Contract` YAML 区块，承载 `allowed_paths`、`required_gates` 和验收标准。
  - validators 从当前活跃 task 的 checkpoint 读取路径约束。
- Changed:
  - `tasks.yaml` 从详细任务合同改为轻量任务索引。
  - `checkpoint` 从条件恢复快照改为活跃 task 的执行合同和现场记录。
  - task 完成后删除 checkpoint 文件，最终事实由 git commit 和 implementation doc 承载。
  - `.agent` 路由声明修正为当前默认 Harness root。
- Removed:
  - `.agent/archive/**` 常规归档机制。
  - `checkpoint_required` 条件门槛。
  - 已完成 task 的历史 checkpoint 文件。
  - task 级 `archived` 状态。
- Unchanged:
  - `.docs/**` 仍是正式阶段产物事实源。
  - implementation doc 仍在 task 完成后记录真实实现。
  - `make validate-*` 和 `sdlc-harness validate-*` 仍作为 gate 入口。

## 3. Product Impact（产品影响）

| 受影响 PRD（Affected PRD） | 影响（Impact） |
|---|---|
| `.docs/01_product/npm_package_distribution.md` | 需要补充轻量 task state、活跃 checkpoint 和删除 archive 的工作流需求。 |

## 4. Technical Impact Candidates（技术影响候选）

| 模块（Module） | 影响（Impact） | 置信度（Confidence） |
|---|---|---|
| `AGENTS.md` | 更新 checkpoint 和 archive 协议，去除条件 checkpoint 和 archive 路由。 | high |
| `.agent/skills/**` | 更新各阶段 Skill 的输入、输出和完成检查，改用 `.agent`/`<harnessRoot>` 路由和活跃 checkpoint 语义。 | high |
| `.agent/managed/templates/**` | 更新 `TASKS_TEMPLATE.yaml`、`CHECKPOINT_TEMPLATE.md` 和 `SKILL_TEMPLATE.md`。 | high |
| `.agent/policies/**` | 移除 archive 路由，修正 `.agent` 或 `<harnessRoot>` 路由声明。 | high |
| `tools/validate_tasks.py` | 校验轻量 task schema，不再要求 `allowed_paths` 和 `required_gates`。 | high |
| `tools/validate_allowed_paths.py` | 从活跃 checkpoint 的 `Task Contract` 读取 `allowed_paths`。 | high |
| `tools/validate_checkpoint.py` | 校验 open task 必须有 checkpoint，done task 不应保留 checkpoint。 | high |
| `packages/sdlc-harness/src/lib/validators.ts` | Node validators 对齐轻量 task 和活跃 checkpoint 语义。 | high |
| `.agent/state/tasks.yaml` | 瘦身为当前工作队列索引，移除已完成 task 的 checkpoint 和复杂合同字段。 | high |
| `.agent/state/checkpoints/**` | 删除已完成 task checkpoint。 | high |
| `.agent/archive/**` | 删除常规归档目录。 | high |
| `.docs/INDEX.md` | 修正 `.agent` 路由和 implementation doc 链接，不再声明 archive 路由。 | high |

Impact analysis:

```sh
python3 tools/impact_analyzer.py --rfc .docs/rfc/RFC_004_simplify_task_checkpoint_archive_model.md --top 40
```

## 5. Acceptance Criteria

- [ ] `.agent/archive/**` 被删除，协议和 policy 不再把 archive 作为常规路由。
- [ ] `tasks.yaml` 中 task 只保留轻量摘要、状态、implementation doc、gate result 和活跃 task 的 checkpoint 路径。
- [ ] `checkpoint_required` 从协议、模板、validators 和当前 state 中移除。
- [ ] open task 必须有 checkpoint；done/cancelled task 不保留 checkpoint 文件。
- [ ] `allowed_paths` 和 `required_gates` 从活跃 checkpoint 的 `Task Contract` 读取。
- [ ] `make validate-harness`、`make validate-current`、`npm test` 和 package source drift check 通过。

## 6. Regression Requirements（回归要求）

- [ ] 覆盖 done task 无 checkpoint 时 `validate-checkpoint` 通过。
- [ ] 覆盖 open task 缺 checkpoint 时 `validate-checkpoint` 失败。
- [ ] 覆盖 active checkpoint 缺 `allowed_paths` 时 `validate_allowed_paths` 或对应 validator 失败。
- [ ] 覆盖 package assets 与本地 Harness 源文件无漂移。

## 7. Status

- Status: APPLIED
