---
name: pjsdlc_rfc_recalibrate
description: Use during RFC_RECALIBRATION to process requirement changes with impact analysis and localized patches.
---

# RFC Recalibration Skill

## 目的

把需求变更作为受控补丁处理，而不是让 Agent 重新理解或重写整个项目。

## 角色提示词

你是变更控制负责人，目标是把新的需求、修正或范围变化限制在清晰的影响链路内。你需要保护已稳定的 PRD、技术方案、实现文档和任务状态，避免因为一个变化重写整个项目。

处理 RFC 时，先确认变化来源、动机、验收标准、紧急程度和影响范围。必须区分产品语义变化、技术实现偏移、任务边界调整和单纯文档澄清。对不确定的影响，先记录假设和待验证项，再决定是否回到 PM、ARCHITECTING 或 SPRINTING。

输出应包含 impact analysis、受影响产物、任务状态调整、测试事实源影响、回归要求和恢复路径。只修改受影响 slice；如果变化跨越多个独立能力，应拆分 RFC 或生成增量任务。

影响面分析必须先于补丁。至少检查 docs/state/skills/policies/templates/tools/package assets/tests/migrations/generated artifacts 是否受影响；如果某一类不受影响，也要显式说明不受影响或不需要修改。对于 Harness package 相关变更，还要检查 `sync`、`upgrade`、source mappings、package assets 和用户项目迁移行为。

如果 RFC 替换模块技术路线、entry/exit、环境依赖、required gates、handoff、blocker、模块关键测试路径或验收边界，必须同步审查 `.docs/07_test/**` 和开发自测链路。模块关键测试路径变化包括本 task / 本模块承诺的可运行入口、内部关键路径、关键边界、观察点或完成证据变化。被新方案 supersede 的测试环境、测试进度、测试用例、测试报告和 partial evidence 要从当前测试事实源删除或迁出，并从 `.docs/INDEX.md` 和 generated overview 中移除链接；历史证据只保留在 RFC provenance、git history、CI/release 系统或明确 archive 语义中，不能继续放在当前 `.docs/07_test/**` 冒充现行测试依据。RFC 必须写明 `Test Fact Source Impact`：reviewed test docs、superseded test docs、retained test docs 和原因；还必须写明 `Development Self-Test Impact`：entry/exit、runtime / target environment、required gates、tech plan self-test contract、`plan.yaml` / `plan.draft.yaml` task contract、implementation doc self-test report、Module Key Test Path、Review / Testing handoff 的影响。如果只是文案澄清且不影响测试事实源或自测链路，可分别写 `none`。

RFC recalibration 本身也是 workflow task。开始处理变更前，先在 `<harnessRoot>/state/plan.yaml` 创建或选择一个足够小的 `TASK-*` open task，并设置 `phase: "RFC_RECALIBRATION"`；当前轮只处理一个 RFC 文件、一个 impact analysis 单元或一个局部补丁单元。

RFC 阶段默认先评估是否适合并行 impact analysis。适合时，主 Agent 使用 `parallel_execution.trigger: "workflow_default"` 和 `runtime.provider: "codex_native_subagents"` 调度 worker 分别检查 docs、state、skills、policies、templates、tools、package assets、tests、migrations 或 generated artifacts 影响；用户明确要求并行时使用 `trigger: "user_requested"`。worker 必须 `writes_repo: false`，只提交影响面、patch candidates 和风险清单；最终 RFC、事实源补丁和任务调整由主 Agent 汇总。

## 输入

- `.docs/rfc/RFC_*.md`
- 当前 PRD 和技术方案
- `.docs/04_implementation/`
- `<harnessRoot>/state/plan.yaml`
- `tools/impact_analyzer.py`

## 输出

- 更新后的 RFC status 或 impact notes
- 局部更新后的 PRD 和技术方案
- 被标记为 `pending_revision` 的受影响任务，或新增增量任务
- Regression requirements
- Test fact source impact
- 更新后的 `<harnessRoot>/state/plan.yaml`
- 更新后的 `.docs/INDEX.md`

## 语义切片

- `.docs/rfc/` 按一次需求变更切片，一份 RFC 只描述一个可独立评估、实现和回归的变更。
- 如果用户一次提出多个互不依赖的变更，应拆成多份 RFC。
- RFC 的 impact analysis 负责判断是否需要重切 PRD、tech plan、`self_test_contract`、implementation doc、Development Self-Test Report、Module Key Test Path、test strategy、test cases 或 test report，并覆盖 state、tools、package assets、tests、migration 和 generated overview。
- 对受影响产物做局部补丁，不重写无关稳定 slice。
- 每次 RFC 影响了文档边界，都要更新 `.docs/INDEX.md` 并记录受影响任务状态。

## Plan Protocol

RFC 阶段受 `plan.yaml` 管控：

1. 没有 open task 时，先创建一个最小 `TASK-*` task，设置 `phase: "RFC_RECALIBRATION"` 和 `current_task_id`。
2. open task 必须包含 `phase`、`docs`、`allowed_paths`、`required_gates`、`acceptance_criteria` 和 `result_docs`；`result_docs` 指向本 task 计划产出的 RFC、受影响 PRD/tech plan/test docs 或 plan update。
3. 单个 task 的目标应足够小：一份 RFC 的 impact analysis、一个受影响 slice 的局部补丁、一组任务状态调整，或一个回归要求更新。
4. 执行当前 task 时只编辑 `allowed_paths` 中的 RFC、受影响 facts、`.docs/INDEX.md`、overview 和 `plan.yaml`。
5. 完成后运行 `make validate-plan` 和 task required gates；阶段出口前运行 `make validate-rfc`。
6. task 完成后从 `plan.yaml.tasks` 移除；如果还有 pending RFC task，下一轮 `/rfc` 或 `/next` 再继续。

## 规则

1. 影响已接受产物的需求变化，必须先进入本 Skill。
2. 修改下游文档或任务前，先运行 impact analysis，并列出受影响/不受影响的文件类别。
3. 受影响的已完成任务标记为 `pending_revision`。
4. 受影响的 `pending` 或 `in_progress` 任务追加 revision notes。
5. 不重写无关的稳定文档。
6. 只有 `make validate-rfc` 通过后，才能恢复原阶段或进入 `SPRINTING`。
7. RFC 阶段一次只执行一个 `TASK-*` task。
8. RFC 列为 superseded 的 `.docs/07_test/**` 文件必须在当前测试事实源中不存在，并且不得继续出现在 `.docs/INDEX.md`。

## 完成检查

- [ ] RFC 包含有效 status 和 acceptance criteria。
- [ ] 当前 RFC 工作已绑定 `plan.yaml` 中一个最小 `TASK-*` task，并设置 `phase: "RFC_RECALIBRATION"`。
- [ ] 当前 task 已从 `plan.yaml` 移除，或因中断/blocker 保留为可恢复 open task。
- [ ] Product impact 和 technical impact 已记录。
- [ ] 已判断 RFC 是否需要拆分，以及是否影响其它阶段 slice。
- [ ] 已列出 docs/state/skills/policies/templates/tools/package assets/tests/migrations/generated artifacts 的影响面。
- [ ] 已记录 `Test Fact Source Impact`，并清理被 supersede 的 `.docs/07_test/**` 当前事实链接。
- [ ] 已记录 `Development Self-Test Impact`；如果 RFC 改变 entry/exit、runtime、gate、handoff、blocker 或模块关键测试路径，已同步 tech plan、task contract、required gates、implementation doc 和 Review/Testing handoff 影响。
- [ ] 受影响任务已标记或新增。
- [ ] Regression requirements 已明确。
- [ ] `.docs/INDEX.md` 已链接 RFC 和受影响产物。
- [ ] 已运行 `make docs-overview` 刷新 `.docs/<stage>/overview.md`。
