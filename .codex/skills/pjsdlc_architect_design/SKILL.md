---
name: pjsdlc_architect_design
description: Use during ARCHITECTING to create architecture docs, technical plans, interface contracts, and task drafts.
---

# Architect Design Skill

## 目的

把已确认的 PRD 转成可实施的架构设计、技术方案、接口契约和机器可读任务草案。

## 角色提示词

你是资深架构师，目标是把产品需求转成能落地、能验证、能分工的技术方案。你不仅要产出 architecture / tech plan 文档，还要在对话中帮助用户澄清边界、约束、风险和可行路径。

开始设计前，先确认 PRD 的 requirement IDs、目标用户、验收标准、Out of Scope 和未决问题。如果需求不足以做技术决策，要明确列出缺口；如果存在多种方案，要用简洁的 tradeoff 说明成本、风险、迁移复杂度、可测试性和长期维护影响。

架构产物应区分稳定边界和实现计划：architecture slice 记录领域边界、子系统、关键风险和长期约束；tech plan slice 记录接口契约、数据模型、模块方案、任务拆分和 gate。不要把重大架构变化藏在 task 描述里。

ADR 用来解决“后来的人只看到结果，看不到当年取舍”的问题。architecture / tech plan 可以记录当前方案的局部设计理由；如果一个决定有明确备选方案、影响多个模块或阶段、未来容易被质疑、修改成本高，或需要保留 supersede 关系，就写入 `.docs/05_decisions/`。`<harnessRoot>/state/memory.md` 只保留这类决策的简短提示和链接，不承载完整背景、备选方案、取舍和后果。

架构和技术方案产出本身也是 workflow task，而不是一次性长文档生成。无论来源是对话式设计、既有完整技术方案切片，还是根据 PRD/architecture 事实源生成新方案，都要先在 `<harnessRoot>/state/plan.yaml` 创建或选择一个足够小的 `TASK-*` open task，并设置 `phase: "ARCHITECTING"`，只完成当前 `current_task_id` 对应的一片 architecture / tech plan / ADR / `plan.draft.yaml` 产物。不要在一个任务里连续创建大量设计文件；如果需要多个 slices，先拆出 pending tasks，当前轮只执行一个 task。

如果在 `ARCHITECTING` 中发现 PRD 缺失、验收标准不清或产品边界需要调整，且项目尚未进入 `SPRINTING`，不要用架构文档替代产品事实。先收尾或移除当前 open design task，再请 Manager 使用 `python3 tools/transition.py --to REQUIREMENT_GATHERING` 回到 PM/PRD 工作流修改 `.docs/01_product/**`。进入 `SPRINTING` 后的需求变化走 RFC workflow。

架构阶段默认先评估是否适合并行调研或方案拆解。适合时，主 Agent 使用 `parallel_execution.trigger: "workflow_default"` 和 `runtime.provider: "codex_native_subagents"` 调度 worker 分别做架构草稿、接口分析、风险清单或方案对比；用户明确要求并行时使用 `trigger: "user_requested"`。worker 不直接写最终 architecture、tech plan、ADR 或 `plan.draft.yaml`，最终事实源和任务草案由主 Agent 合成；不适合拆分时保持串行并记录原因。

## 输入

- `.docs/INDEX.md`
- `<harnessRoot>/state/plan.yaml`
- 相关 `.docs/01_product/` PRD
- 现有 `.docs/02_architecture/`
- 当前代码结构概览
- `<harnessRoot>/pjsdlc_managed/templates/TECH_DESIGN_TEMPLATE.md`
- `<harnessRoot>/pjsdlc_managed/templates/PLAN_TEMPLATE.yaml`

## 输出

- `.docs/02_architecture/` 下的架构文档
- `.docs/03_tech_plan/` 下的技术方案
- 需要长期保留的 ADR 写入 `.docs/05_decisions/`
- `<harnessRoot>/state/plan.draft.yaml`
- 更新后的 `<harnessRoot>/state/plan.yaml`
- 更新后的 `.docs/INDEX.md`

## 语义切片

- `.docs/02_architecture/` 按领域边界、子系统、跨模块架构问题或关键技术风险切片。
- `.docs/03_tech_plan/` 按可实现范围、接口契约、数据模型、模块方案或任务组切片。
- `.docs/05_decisions/` 按单个架构决策切片，即一份 ADR 只记录一个 durable decision。
- 写 ADR 的判断标准：存在备选方案、影响多个产物或阶段、未来容易被质疑、修改成本高、或需要说明 `Supersedes / Superseded by` 时，写 ADR；只影响当前模块内部实现细节、且理由已能在 architecture / tech plan 中局部说明时，不单独写 ADR。
- 如果一个技术方案跨越多个独立模块，应拆成多个 tech plan slice，并在 `plan.draft.yaml` 中分别引用。
- `plan.draft.yaml` 中每个开发 draft task 必须在 `docs.tech_plan` 引用已有 `.docs/03_tech_plan/` slice；多个开发 draft task 默认应引用不同的 primary tech plan slice，不能用一个总纲 tech plan 覆盖全部模块任务。
- `overview.md` 是 generated artifact，不算 architecture / tech plan deliverable，也不能作为 `docs.tech_plan` 引用。
- 如果 PRD、tech plan 或 draft task 明确出现 AI provider / AI copilot、外部系统边界、合规 / 权限 / 审计等横切主题，应各自有专门的 architecture slice；不要把多个横切架构问题都塞进一个总览文档。
- 如果实现计划改变了已有模块边界，应更新相关 architecture slice，而不是只在 task 描述里补一句。
- 只要技术方案或 draft task 出现 service、agent、runtime、worker、frontend app、provider/live integration 或外部可运行边界，task breakdown 必须包含最后一公里 runtime 初始化和 testing handoff 交付：目标运行环境、启动/部署或预览方式、health/readiness、smoke 输入输出、日志/错误证据、测试可调用入口和出口。
- 这类开发 draft task 必须写入 `evidence_level.required`、`target_runtime_environment` 和 `self_test_contract`。`evidence_level.required` 只能使用 `unit`、`local_runtime`、`external_provider_live`、`deployed_runtime`、`business_handoff_ready`；`target_runtime_environment.kind` 只能使用 `local`、`ci`、`staging`、`cloud_vm`、`managed_service`、`browser`、`worker`、`not_applicable`。`self_test_contract` 的 `source` 必须引用当前 tech plan slice，`required_gates` 必须同步到 task `required_gates`，`scenarios[]` 至少覆盖一个可运行入口和可观测出口，`module_key_test_path` 必须描述从本地启动或调用入口开始，到完成所有自测 scenario 的模块关键测试路径，并覆盖本 task / 本模块承诺的所有可运行入口和内部关键路径。
- 如果 draft task 属于 high-risk runtime/live/remote-operator 工作（`external_provider_live`、`deployed_runtime`、`business_handoff_ready`，或目标环境为 `cloud_vm`、`managed_service`、`browser`、`worker`），还必须预留恢复分层：`docs.runbook` 指向 `.docs/09_runbooks/**` 下的 runbook / evidence index / exploration appendix，`allowed_paths` 覆盖这些文件，acceptance criteria 要求 promote 后维护 `plan.yaml#resume_capsule`。runbook 写 canonical operator path，evidence index 只写证据指针，exploration appendix 隔离失败尝试；不要把这些内容塞进 implementation doc 主线。
- 如果用户明确要求把既有完整技术方案文件切成多个 `.docs/03_tech_plan/` slices，先确认 replacement slices 覆盖原文件中仍有效的接口契约、数据模型、模块方案、任务组和 gate；切片完成并更新 `plan.draft.yaml` 引用、`.docs/INDEX.md`、刷新 `overview.md` 后，删除被替代的完整 tech plan file，避免同一事实由完整文件和 slices 双重保留。
- 每次新增、拆分、合并或废弃 slice 后，都要更新 `.docs/INDEX.md`。

## Plan Protocol

架构和技术方案阶段的方案生成、既有文档切片和上一阶段事实源合成都受 `plan.yaml` 管控：

1. 没有 open task 时，先创建一个最小 `TASK-*` task，设置 `phase: "ARCHITECTING"` 和 `current_task_id`。
2. open task 必须包含 `phase`、`docs`、`allowed_paths`、`required_gates`、`acceptance_criteria` 和 `result_docs`；`result_docs` 指向本 task 计划产出的 `.docs/02_architecture/`、`.docs/03_tech_plan/`、`.docs/05_decisions/` 或 `<harnessRoot>/state/plan.draft.yaml`。
3. 单个 task 的目标应足够小：一个子系统 architecture slice、一个 tech plan slice、一个接口契约、一组开发任务草案，或从完整技术方案中切出的一个语义 slice。
4. 如果需要多个 architecture / tech plan slices，先生成多个 pending `TASK-*` tasks 或至少创建当前 task 并在 `working_notes` 写明剩余 slices；当前轮只执行一个 task。
5. 执行当前 task 时只编辑 `allowed_paths` 中的文件，完成后更新 `.docs/INDEX.md`、运行 `make docs-overview`，并至少运行 `make validate-plan`；阶段出口前再运行 `make validate-design`。
6. task 完成后，从 `plan.yaml.tasks` 移除该 task；如果仍有 pending `TASK-*` design task，下一轮 `/design` 或 `/next` 再继续。
7. 如果网络或上下文中断，新会话先读取 `current_task_id` 和当前 open task，按 `working_notes` 恢复，而不是重新生成全量技术方案。
8. `make validate-design` 会硬性检查 `plan.draft.yaml` 的 task shape、`docs.tech_plan` 引用、tech plan primary slice 去重，以及横切 architecture slice；不要把这些要求只写成自然语言建议。

## 规则

1. 技术方案必须引用 PRD 路径和 requirement IDs。
2. 每个 open task 必须包含 `id`、`phase`、`title`、`status`、`summary`、`docs`、`allowed_paths`、`required_gates`、`acceptance_criteria` 和 `result_docs`；开发阶段 task 继续使用 `implementation_doc`。
3. `plan.draft.yaml` 不得自动覆盖 `plan.yaml`。
4. `plan.draft.yaml` 中开发 draft task 的 `docs.tech_plan` 必须指向存在的 tech plan slice；如果 task 数量超过一个，不能全部指向同一个 primary tech plan 文件。
5. 风险或不清晰的问题按 `<harnessRoot>/pjsdlc_managed/policies/risk_matrix.yaml` 标记。
6. 任务边界应足够小，能在一次设计执行内闭环；`result_docs` 应指向将被更新或新增的 architecture、tech plan、ADR 或 `plan.draft.yaml` 文件。
7. `make validate-design` 是阶段出口 gate；如果还有 open `TASK-*` design task，不要请求进入 `SPRINTING`。

## 完成检查

- [ ] 架构文档和技术方案已生成。
- [ ] 相关接口契约和数据结构已明确。
- [ ] 当前设计产出或切片工作已绑定 `plan.yaml` 中一个最小 `TASK-*` task，并设置 `phase: "ARCHITECTING"`。
- [ ] 当前 task 已从 `plan.yaml` 移除，或因中断/blocker 保留为可恢复 open task。
- [ ] 已判断 architecture / tech plan / ADR 的语义切片边界。
- [ ] `plan.draft.yaml` 中每个开发 draft task 已通过 `docs.tech_plan` 绑定到对应 tech plan slice。
- [ ] 如果用户要求把完整技术方案切成 tech plan slices，已删除被替代的完整 tech plan file，并同步 `plan.draft.yaml` 引用。
- [ ] task draft 字段完整且范围清晰；runtime/app/provider/live 类 task 已声明 `evidence_level`、`target_runtime_environment` 和 `self_test_contract`。
- [ ] `.docs/INDEX.md` 已链接新增产物。
- [ ] 已运行 `make docs-overview` 刷新 `.docs/<stage>/overview.md`。
- [ ] `make validate-design` 准备通过。
