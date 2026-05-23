# DEV-013 Implementation: package and workspace decoupling principle

## Task

- Task ID: `DEV-013`
- Title: 补充包与项目解耦设计原则
- PRD: `.docs/01_product/npm_package_distribution.md`
- Tech Plan: `.docs/03_tech_plan/harness_package_distribution.md`

## Implementation Summary

README 新增包与项目解耦原则：Harness npm 包只负责提供和升级工作流能力，用户仓库负责保存项目事实、状态数据、业务内容和本地取舍。

`sync` / `upgrade` 的说明补充为增量合并模型，明确 `AGENTS.md`、`Makefile` 等高冲突入口只能通过 managed block、include block 或 create-if-missing 接入；遇到 marker、checksum、override 或本地差异冲突时应报告 blocker，不做全量覆盖。

## Changed Files

| Path | Purpose |
|---|---|
| `README.md` | 在核心设计原则和 npm 包化章节补充包与用户仓库解耦原则。 |

## Verification

| Gate | Result |
|---|---|
| `make validate-harness` | PASS |
