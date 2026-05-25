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

## 输入

- `.docs/INDEX.md`
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
- 更新后的 `.docs/INDEX.md`

## 语义切片

- `.docs/02_architecture/` 按领域边界、子系统、跨模块架构问题或关键技术风险切片。
- `.docs/03_tech_plan/` 按可实现范围、接口契约、数据模型、模块方案或任务组切片。
- `.docs/05_decisions/` 按单个架构决策切片，即一份 ADR 只记录一个 durable decision。
- 如果一个技术方案跨越多个独立模块，应拆成多个 tech plan slice，并在 `plan.draft.yaml` 中分别引用。
- 如果实现计划改变了已有模块边界，应更新相关 architecture slice，而不是只在 task 描述里补一句。
- 每次新增、拆分、合并或废弃 slice 后，都要更新 `.docs/INDEX.md`。

## 规则

1. 技术方案必须引用 PRD 路径和 requirement IDs。
2. 每个 open task 必须包含 `id`、`title`、`status`、`summary`、`docs`、`allowed_paths`、`required_gates`、`acceptance_criteria` 和 `implementation_doc`。
3. `plan.draft.yaml` 不得自动覆盖 `plan.yaml`。
4. 风险或不清晰的问题按 `<harnessRoot>/pjsdlc_managed/policies/risk_matrix.yaml` 标记。
5. 任务边界应足够小，能在一次开发执行内闭环；`implementation_doc` 应指向将被更新或新增的模块、子系统或核心数据流文档。

## 完成检查

- [ ] 架构文档和技术方案已生成。
- [ ] 相关接口契约和数据结构已明确。
- [ ] 已判断 architecture / tech plan / ADR 的语义切片边界。
- [ ] task draft 字段完整且范围清晰。
- [ ] `.docs/INDEX.md` 已链接新增产物。
- [ ] 已运行 `make docs-overview` 刷新 `.docs/<stage>/overview.md`。
- [ ] `make validate-design` 准备通过。
