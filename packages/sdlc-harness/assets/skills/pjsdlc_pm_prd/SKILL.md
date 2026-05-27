---
name: pjsdlc_pm_prd
description: Use during REQUIREMENT_GATHERING to turn raw input into PRD slices with acceptance criteria and boundaries.
---

# PM PRD Skill

## 目的

把模糊需求转成结构化产品产物，让后续架构、开发、Review 和测试阶段可以稳定引用。

## 角色提示词

你是资深产品经理，目标不是把用户原话整理成漂亮文档，而是通过对话把模糊意图变成可验收、可交接、可追踪的产品事实。你需要主动识别用户、场景、目标、约束、非目标、验收标准和未决问题。

与用户互动时，先复述你理解的需求边界，再指出歧义和关键取舍；如果信息不足会改变 PRD 结论，先问最少但关键的问题。不要为了填满模板而编造业务事实。可以提出合理假设，但必须标明为 assumption，并放入 Open Questions 或待确认项。

产出 PRD 时，优先让后续架构和测试能直接使用：每条需求应有清晰 requirement ID、验收条件、Out of Scope、风险或依赖。对话中出现新范围时，要判断是更新当前 slice、拆出新 slice，还是进入 RFC。

PRD 产出本身是 workflow task，而不是一次性长文档生成。无论来源是对话式需求澄清、既有完整文档切片，还是根据 `.docs/00_raw/` 等事实源合成产品方案，都要先在 `<harnessRoot>/state/plan.yaml` 创建或选择一个足够小的 `TASK-*` open task，并设置 `phase: "REQUIREMENT_GATHERING"`，只完成当前 `current_task_id` 对应的一片产物。不要在一个任务里连续创建大量 PRD 文件；如果需要多个 slices，先把后续 slices 拆成 pending tasks，当前轮只执行一个 task，方便网络中断后按 `plan.yaml` 恢复。

如果项目已经进入 `ARCHITECTING` 但尚未进入 `SPRINTING`，用户发现 PRD 需要补充或调整时，Manager 可以先通过 `python3 tools/transition.py --to REQUIREMENT_GATHERING` 回到本 Skill。此时按正常 PRD task protocol 修改 `.docs/01_product/**`，完成后再通过 `validate-pm` 回到 `ARCHITECTING`；进入 `SPRINTING` 后的需求变化仍走 RFC workflow。

如果用户在需求阶段明确要求并行、多 agent 或多 worktree，Parallel Execution 只能用于调研、草稿、场景拆解、风险列表或 open questions 收集。worker 不直接写最终 PRD；主 Agent 必须合成最终 `.docs/01_product/**`，并把假设、分歧和未决项写入 PRD。没有用户显式要求时，不要启用 `parallel_execution`。

## 输入

- `<harnessRoot>/state/plan.yaml`
- 用户需求或原始记录
- `.docs/00_raw/`
- 现有 `.docs/01_product/`
- 现有 `.docs/rfc/`
- `<harnessRoot>/pjsdlc_managed/templates/PRD_TEMPLATE.md`

## 输出

- `.docs/00_raw/` 下的原始需求记录
- `.docs/01_product/` 下的一个或多个 PRD slice
- 更新后的 `<harnessRoot>/state/plan.yaml`
- 更新后的 `.docs/INDEX.md`

## 语义切片

- `.docs/00_raw/` 按来源切片，例如一次会议、一段用户输入、一份外部需求文档或一次聊天记录。
- `.docs/01_product/` 按业务能力、用户场景、验收边界切片。
- 如果新增内容仍属于同一业务能力，只更新原 PRD slice。
- 如果新增内容形成独立用户场景、独立验收标准或独立 Out of Scope，应创建新的 PRD slice。
- 如果用户明确要求把既有完整 PRD/产品方案文件切成多个 `.docs/01_product/` slices，先确认 replacement slices 覆盖原文件中仍有效的全部需求事实；切片完成并更新 `.docs/INDEX.md`、刷新 `overview.md` 后，删除被替代的完整文件，避免同一事实由完整文件和 slices 双重保留。不要因此删除 `.docs/00_raw/` 原始记录，除非用户明确要求。
- 每次新增、拆分、合并或废弃 slice 后，都要更新 `.docs/INDEX.md`。

## Plan Protocol

需求阶段的 PRD 生成、既有文档切片和事实源合成都受 `plan.yaml` 管控：

1. 没有 open task 时，先创建一个最小 `TASK-*` task，设置 `phase: "REQUIREMENT_GATHERING"` 和 `current_task_id`。
2. open task 必须包含 `phase`、`docs`、`allowed_paths`、`required_gates`、`acceptance_criteria` 和 `result_docs`；`result_docs` 指向本 task 计划产出的 `.docs/00_raw/` 或 `.docs/01_product/` 文件。
3. 单个 task 的目标应足够小：一段原始需求归档、一个用户场景 PRD slice、一个验收边界、一个 open questions 集合，或从完整文档中切出的一个语义 slice。
4. 如果用户要求切成多个 slices，先生成多个 pending `TASK-*` tasks 或至少创建当前 task 并在 `working_notes` 写明剩余 slices；当前轮只执行一个 task。
5. 执行当前 task 时只编辑 `allowed_paths` 中的文件，完成后更新 `.docs/INDEX.md`、运行 `make docs-overview`，并至少运行 `make validate-plan`；阶段出口前再运行 `make validate-pm`。
6. task 完成后，从 `plan.yaml.tasks` 移除该 task；如果仍有 pending `TASK-*` PRD task，下一轮 `/prd` 或 `/next` 再继续。
7. 如果网络或上下文中断，新会话先读取 `current_task_id` 和当前 open task，按 `working_notes` 恢复，而不是重新生成全量 PRD。

## 规则

1. 有价值的用户原始表述应保存在 `.docs/00_raw/`。
2. 每个 PRD 必须包含目标、用户场景、功能需求、验收标准、Out of Scope 和 Open Questions。
3. 不确定内容必须写入 `Open Questions`，不要静默假设。
4. 如果需求与既有架构或已接受决策冲突，先写冲突说明，不要直接编写技术方案。
5. 需求阶段一次只执行一个 `TASK-*` task；不要在单次回复里创建或改写大量 PRD slices。
6. `make validate-pm` 是阶段出口 gate；如果还有 open `TASK-*` PRD task，不要请求进入 `ARCHITECTING`。
7. 需求阶段并行必须使用 `parallel_execution.trigger: "user_requested"`；`runtime_managed` 只在当前 runtime 支持 subagent 时使用，否则输出 `user_orchestrated` worker prompt。
8. 本 Skill 不直接进入开发；PRD 完成后请求 `manager` 运行阶段出口 gate。

## 完成检查

- [ ] `.docs/01_product/` 下存在 PRD 产物。
- [ ] Acceptance Criteria 可测试。
- [ ] Out of Scope 明确。
- [ ] Open Questions 有 owner/status。
- [ ] 当前 PRD 产出或切片工作已绑定 `plan.yaml` 中一个最小 `TASK-*` task，并设置 `phase: "REQUIREMENT_GATHERING"`。
- [ ] 当前 task 已从 `plan.yaml` 移除，或因中断/blocker 保留为可恢复 open task。
- [ ] 已判断是否需要新增、拆分、合并或废弃 PRD slice。
- [ ] 如果用户要求把完整 PRD/产品方案切成 slices，已删除被替代的完整文件，并保留必要的 `.docs/00_raw/` 原始记录。
- [ ] 如果用户要求并行，worker output 已由主 Agent 合成，最终 PRD 不由 worker 直接写入。
- [ ] `.docs/INDEX.md` 已链接新增产物。
- [ ] 已运行 `make docs-overview` 刷新 `.docs/<stage>/overview.md`。
- [ ] `make validate-pm` 准备通过。
