# DEV-017 Implementation: Chinese Karpathy guidelines

## Task

- Task ID: `DEV-017`
- Title: 将 Karpathy guidelines 转为中文契约表达
- PRD: `.docs/01_product/npm_package_distribution.md`
- Tech Plan: `.docs/03_tech_plan/harness_package_distribution.md`

## Implementation Summary

`AGENTS.md` 中的 `multica-ai/andrej-karpathy-skills` guideline 内容从英文原文块调整为“中文说明 + 英文关键词”的本地化契约表达。

本次没有删减上游 `CLAUDE.md` 的语义结构：保留说明、`Tradeoff`、四个 guideline 标题、每条 guideline 的检查点、multi-step plan 模板，以及最终 working signal。英文标题和关键术语保留为 `Think Before Coding`、`Simplicity First`、`Surgical Changes`、`Goal-Driven Execution`、`assumptions`、`tradeoffs`、`success criteria` 等，符合 Prompt Language Contract。

## Changed Files

| Path | Purpose |
|---|---|
| `AGENTS.md` | 将 Karpathy guideline 原文块转为中文契约表达，并保留关键英文术语。 |
| `packages/sdlc-harness/assets/agents/AGENTS_CORE.md` | 同步 npm 包分发用的 canonical agents core 文案。 |

## Source Notes

- 上游来源：`https://github.com/multica-ai/andrej-karpathy-skills`
- 对齐文件：`CLAUDE.md`
- 本次转换覆盖四个 guideline：`Think Before Coding`、`Simplicity First`、`Surgical Changes`、`Goal-Driven Execution`。

## Impact Notes

该调整只影响通用 Harness 协议文案和包内分发资产，不改变 CLI、sync、Skill 校验或阶段流转行为。

中文化后的原则更符合本仓库面向人阅读内容使用中文的约定，同时保留关键英文概念，便于跨项目复用和与上游来源对照。

## Verification

| Gate | Result |
|---|---|
| `node packages/sdlc-harness/dist/cli.js package check-source` | PASS |
| `make validate-harness` | PASS |
| `make validate-current` | PASS |
