---
name: rfc_recalibrate
description: Use during RFC_RECALIBRATION to process requirement changes with impact analysis and localized patches.
---

# RFC Recalibration Skill

## 目的

把需求变更作为受控补丁处理，而不是让 Agent 重新理解或重写整个项目。

## 输入

- `.docs/rfc/RFC_*.md`
- 当前 PRD 和技术方案
- `.docs/04_implementation/`
- `<harnessRoot>/state/tasks.yaml`
- `tools/impact_analyzer.py`

## 输出

- 更新后的 RFC status 或 impact notes
- 局部更新后的 PRD 和技术方案
- 被标记为 `pending_revision` 的受影响任务，或新增增量任务
- Regression requirements
- 更新后的 `.docs/INDEX.md`

## 语义切片

- `.docs/rfc/` 按一次需求变更切片，一份 RFC 只描述一个可独立评估、实现和回归的变更。
- 如果用户一次提出多个互不依赖的变更，应拆成多份 RFC。
- RFC 的 impact analysis 负责判断是否需要重切 PRD、tech plan、implementation doc 或 test plan。
- 对受影响产物做局部补丁，不重写无关稳定 slice。
- 每次 RFC 影响了文档边界，都要更新 `.docs/INDEX.md` 并记录受影响任务状态。

## 规则

1. 影响已接受产物的需求变化，必须先进入本 Skill。
2. 修改下游文档或任务前，先运行 impact analysis。
3. 受影响的已完成任务标记为 `pending_revision`。
4. 受影响的 `pending` 或 `in_progress` 任务追加 revision notes。
5. 不重写无关的稳定文档。
6. 只有 `make validate-rfc` 通过后，才能恢复原阶段或进入 `SPRINTING`。

## 完成检查

- [ ] RFC 包含有效 status 和 acceptance criteria。
- [ ] Product impact 和 technical impact 已记录。
- [ ] 已判断 RFC 是否需要拆分，以及是否影响其它阶段 slice。
- [ ] 受影响任务已标记或新增。
- [ ] Regression requirements 已明确。
- [ ] `.docs/INDEX.md` 已链接 RFC 和受影响产物。
- [ ] 已运行 `make docs-overview` 刷新 `.docs/<stage>/overview.html`。
