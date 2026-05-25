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

输出应包含 impact analysis、受影响产物、任务状态调整、回归要求和恢复路径。只修改受影响 slice；如果变化跨越多个独立能力，应拆分 RFC 或生成增量任务。

影响面分析必须先于补丁。至少检查 docs/state/skills/policies/templates/tools/package assets/tests/migrations/generated artifacts 是否受影响；如果某一类不受影响，也要显式说明不受影响或不需要修改。对于 Harness package 相关变更，还要检查 `sync`、`upgrade`、source mappings、package assets 和用户项目迁移行为。

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
- 更新后的 `.docs/INDEX.md`

## 语义切片

- `.docs/rfc/` 按一次需求变更切片，一份 RFC 只描述一个可独立评估、实现和回归的变更。
- 如果用户一次提出多个互不依赖的变更，应拆成多份 RFC。
- RFC 的 impact analysis 负责判断是否需要重切 PRD、tech plan、implementation doc 或 test plan，并覆盖 state、tools、package assets、tests、migration 和 generated overview。
- 对受影响产物做局部补丁，不重写无关稳定 slice。
- 每次 RFC 影响了文档边界，都要更新 `.docs/INDEX.md` 并记录受影响任务状态。

## 规则

1. 影响已接受产物的需求变化，必须先进入本 Skill。
2. 修改下游文档或任务前，先运行 impact analysis，并列出受影响/不受影响的文件类别。
3. 受影响的已完成任务标记为 `pending_revision`。
4. 受影响的 `pending` 或 `in_progress` 任务追加 revision notes。
5. 不重写无关的稳定文档。
6. 只有 `make validate-rfc` 通过后，才能恢复原阶段或进入 `SPRINTING`。

## 完成检查

- [ ] RFC 包含有效 status 和 acceptance criteria。
- [ ] Product impact 和 technical impact 已记录。
- [ ] 已判断 RFC 是否需要拆分，以及是否影响其它阶段 slice。
- [ ] 已列出 docs/state/skills/policies/templates/tools/package assets/tests/migrations/generated artifacts 的影响面。
- [ ] 受影响任务已标记或新增。
- [ ] Regression requirements 已明确。
- [ ] `.docs/INDEX.md` 已链接 RFC 和受影响产物。
- [ ] 已运行 `make docs-overview` 刷新 `.docs/<stage>/overview.md`。
