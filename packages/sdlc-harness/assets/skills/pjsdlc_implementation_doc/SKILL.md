---
name: pjsdlc_implementation_doc
description: Use after development gates pass to update module-level implementation facts and plan deviations.
---

# Implementation Doc Skill

## 目的

按模块、子系统或核心数据流记录真实实现事实，包括代码结构、数据流、防御逻辑、测试覆盖，以及相对原技术方案的偏移。

## 角色提示词

你是实现事实记录者，目标是把已经发生的代码变化沉淀成后续 Review、测试、发布和需求变更都能引用的事实。你写的是 implementation doc，不是新的技术方案，也不是对未来工作的承诺。

开始记录前，先读取 task、PRD、技术方案、git diff、测试结果和相关源码。若代码事实与技术方案不一致，要明确记录 deviation、原因和风险；若信息不足，不要脑补实现细节，应标注缺口或回到开发者确认。

文档应帮助后来者快速理解：某个模块或核心数据流的当前实现是什么、关键对象/函数职责是什么、行为如何从输入流到输出、测试覆盖了什么、还有什么未覆盖。task id 只作为 provenance，不作为默认切片粒度。

## 输入

- `<harnessRoot>/state/plan.yaml` 中当前 task 的 `implementation_doc` 路径和 task ID
- 当前 `git diff`
- 关联 PRD
- 关联技术方案
- 变更后的源码和测试文件
- `<harnessRoot>/pjsdlc_managed/templates/IMPLEMENTATION_DOC_TEMPLATE.md`

## 输出

- `.docs/04_implementation/<domain>/<module_or_flow>.md`
- 更新后的 `.docs/INDEX.md`

## 语义切片

- `.docs/04_implementation/` 默认按稳定的模块、子系统或核心数据流切片，并尽量与 architecture / tech plan 的边界对应。
- task 是执行单元和提交边界，不是 implementation doc 的默认文档边界。task ID、commit 和 RFC 只记录在文档的 provenance 或变更记录中。
- 如果一个 task 修改已有模块或数据流，应更新对应的原 implementation doc，而不是创建 `dev_*.md` task ledger。
- 如果一个 task 真实产出多个独立模块或核心数据流，可以更新或新增多份 implementation docs；每份都记录相关 Task ID 和 commit。
- 只有当某个 task 本身就是一个稳定模块/数据流边界时，implementation doc 才可以与单个 task 一一对应。
- 如果真实代码边界与技术方案边界不同，必须在文档中记录偏移，并更新 `.docs/INDEX.md`。

## 规则

1. implementation doc 描述当前代码事实，而不是期望中的未来设计。
2. 每个被记录的文件都应说明它在该模块或数据流中的作用和关键函数/对象。
3. 与技术方案的偏移必须明确记录，即便该偏移是合理的。
4. 测试覆盖必须列出具体测试，或明确记录覆盖缺口。
5. 文档粒度保持在模块、子系统或核心数据流级别；不要默认按 task 建文档，也不要写成跨全项目的巨型百科。

## 完成检查

- [ ] 模块/子系统/核心数据流边界明确，并与相关 architecture / tech plan 对齐或记录偏移。
- [ ] Task ID、commit 和关联产物路径已作为 provenance 记录。
- [ ] 真实代码结构表已填写。
- [ ] 核心数据流已说明。
- [ ] 已判断 implementation doc 的语义切片边界。
- [ ] 方案偏移和测试覆盖已记录。
- [ ] `.docs/INDEX.md` 已链接 implementation doc。
- [ ] 已运行 `make docs-overview` 刷新 `.docs/<stage>/overview.md`。
