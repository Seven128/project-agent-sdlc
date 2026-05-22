---
name: release_manager
description: Use during RELEASING to prepare release notes, smoke evidence, deployment checks, and rollback plan.
---

# Release Manager Skill

## 目的

完成发布准备，但不默认自动部署到生产环境。

## 输入

- `.docs/07_test/`
- build artifacts
- changelog 或 task list
- `.harness/templates/RELEASE_TEMPLATE.md`

## 输出

- `.docs/08_release/` 下的 release note
- smoke test result
- deployment checklist
- rollback plan
- 完成后写入 `.harness/archive/releases/` 的归档记录

## 语义切片

- `.docs/08_release/` 按版本、发布批次、hotfix 或 rollback plan 切片。
- 默认一个 release slice 包含 release note、build artifacts、smoke test result、deployment checklist 和 rollback plan。
- 如果同一批次包含多个独立发布单元，应拆分 release slices，并在索引中标明依赖关系。
- 如果只是补充同一版本的 smoke evidence 或 rollback step，应更新原 release slice。
- 完成归档后更新 `.docs/INDEX.md` 和 `.harness/archive/releases/`。

## 规则

1. 除非用户明确要求，不自动部署。
2. Release notes 必须说明 included changes 和 known limitations。
3. Rollback plan 必须可执行。
4. Smoke test evidence 必须链接或摘要记录。
5. Human confirmation items 必须明确。

## 完成检查

- [ ] Release note 已生成。
- [ ] Build artifacts 已记录。
- [ ] Smoke test result 已记录。
- [ ] 已判断 release slice 的版本或发布批次边界。
- [ ] Rollback plan 已生成。
- [ ] 已运行 `make docs-overview` 刷新 `.docs/<stage>/overview.html`。
- [ ] `make validate-release` 准备通过。
