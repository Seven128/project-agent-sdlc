---
name: implementation_doc
description: Use after a development task passes code gates to document the real implementation and plan deviations.
---

# Implementation Doc Skill

## 目的

记录真实实现事实，包括代码结构、数据流、防御逻辑、测试覆盖，以及相对原技术方案的偏移。

## 输入

- `<harnessRoot>/state/tasks.yaml` 中的当前 task ID
- 当前 `git diff`
- 关联 PRD
- 关联技术方案
- 变更后的源码和测试文件
- `<harnessRoot>/managed/templates/IMPLEMENTATION_DOC_TEMPLATE.md`

## 输出

- `.docs/04_implementation/<domain>/<task>_impl.md`
- 更新后的 `.docs/INDEX.md`

## 语义切片

- `.docs/04_implementation/` 按已完成任务、真实实现模块或核心数据流切片。
- 默认一项 `done` task 对应一份 implementation doc。
- 如果一个任务实际产出多个独立模块或多个核心数据流，可以拆成多份 implementation docs，但每份都必须回链同一个 Task ID。
- 如果实现只是在已有模块内补充逻辑，应更新原 implementation doc，而不是创建重复文档。
- 如果真实代码边界与技术方案边界不同，必须在文档中记录偏移，并更新 `.docs/INDEX.md`。

## 规则

1. implementation doc 描述当前代码事实，而不是期望中的未来设计。
2. 每个被记录的文件都应说明作用和关键函数/对象。
3. 与技术方案的偏移必须明确记录，即便该偏移是合理的。
4. 测试覆盖必须列出具体测试，或明确记录覆盖缺口。
5. 文档粒度保持在任务级，不要写成巨型实现百科。

## 完成检查

- [ ] Task ID 和关联产物路径齐全。
- [ ] 真实代码结构表已填写。
- [ ] 核心数据流已说明。
- [ ] 已判断 implementation doc 的语义切片边界。
- [ ] 方案偏移和测试覆盖已记录。
- [ ] `.docs/INDEX.md` 已链接 implementation doc。
- [ ] 已运行 `make docs-overview` 刷新 `.docs/<stage>/overview.html`。
