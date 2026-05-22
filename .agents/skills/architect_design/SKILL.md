---
name: architect_design
description: Use during ARCHITECTING to create architecture docs, technical plans, interface contracts, and task drafts.
---

# Architect Design Skill

## 目的

把已确认的 PRD 转成可实施的架构设计、技术方案、接口契约和机器可读任务草案。

## 输入

- `.docs/INDEX.md`
- 相关 `.docs/01_product/` PRD
- 现有 `.docs/02_architecture/`
- 当前代码结构概览
- `.harness/templates/TECH_DESIGN_TEMPLATE.md`
- `.harness/templates/TASKS_TEMPLATE.yaml`

## 输出

- `.docs/02_architecture/` 下的架构文档
- `.docs/03_tech_plan/` 下的技术方案
- 需要长期保留的 ADR 写入 `.docs/05_decisions/`
- `.harness/state/tasks.draft.yaml`
- 更新后的 `.docs/INDEX.md`

## 语义切片

- `.docs/02_architecture/` 按领域边界、子系统、跨模块架构问题或关键技术风险切片。
- `.docs/03_tech_plan/` 按可实现范围、接口契约、数据模型、模块方案或任务组切片。
- `.docs/05_decisions/` 按单个架构决策切片，即一份 ADR 只记录一个 durable decision。
- 如果一个技术方案跨越多个独立模块，应拆成多个 tech plan slice，并在 `tasks.draft.yaml` 中分别引用。
- 如果实现计划改变了已有模块边界，应更新相关 architecture slice，而不是只在 task 描述里补一句。
- 每次新增、拆分、合并或废弃 slice 后，都要更新 `.docs/INDEX.md`。

## 规则

1. 技术方案必须引用 PRD 路径和 requirement IDs。
2. 每个任务必须包含 `id`、`title`、`status`、`priority`、`docs`、`allowed_paths`、`required_gates` 和 `implementation_doc`。
3. `tasks.draft.yaml` 不得自动覆盖 `tasks.yaml`。
4. 风险或不清晰的问题按 `.harness/policies/risk_matrix.yaml` 标记。
5. 任务边界应足够小，能在一次开发执行和一份 implementation doc 内闭环。

## 完成检查

- [ ] 架构文档和技术方案已生成。
- [ ] 相关接口契约和数据结构已明确。
- [ ] 已判断 architecture / tech plan / ADR 的语义切片边界。
- [ ] task draft 字段完整且范围清晰。
- [ ] `.docs/INDEX.md` 已链接新增产物。
- [ ] 已运行 `make docs-overview` 刷新 `.docs/<stage>/overview.html`。
- [ ] `make validate-design` 准备通过。
