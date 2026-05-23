# DEV-014 Implementation: Harness authoring overlay design

## Task

- Task ID: `DEV-014`
- Title: 补充 Harness Authoring Overlay 设计
- PRD: `.docs/01_product/npm_package_distribution.md`
- Tech Plan: `.docs/03_tech_plan/harness_package_distribution.md`

## Implementation Summary

README 新增 Harness Authoring Overlay 设计，用于区分三类内容：

- 通用 Harness 配置：默认进入 npm package canonical assets，面向所有接入项目。
- 项目实例数据：当前项目的 `.agent/state/**` 和 `.docs/**`，不由包覆盖。
- Harness authoring overlay：只在本仓库开发 Harness 自身时使用的原则、专用 Skill 和包化安全规则，默认不进入 npm 包，也不分发到用户项目。

README 同时记录了 authoring overlay 的推荐目录、默认分发规则、影响面和晋升准则。

## Changed Files

| Path | Purpose |
|---|---|
| `README.md` | 在核心设计原则和第十七章自举开发说明中补充 authoring overlay 分层。 |

## Impact Notes

本次只更新设计文档，不创建 `.agent/authoring/**` 目录，也不改变 `package sync-source`、`sync`、`upgrade` 或 validator 行为。后续真正落地 authoring overlay 时，需要同步评估 `AGENTS.md` 读取规则、`source-mappings.yaml`、package assets、validators 和 Skill 晋升流程。

## Verification

| Gate | Result |
|---|---|
| `make validate-harness` | PASS |
