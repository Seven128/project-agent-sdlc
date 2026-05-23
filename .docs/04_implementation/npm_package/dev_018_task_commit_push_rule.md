# DEV-018 Implementation: task commit and push rule

## Task

- Task ID: `DEV-018`
- Title: 补充每个开发任务完成后 commit 并 push 的规则
- PRD: `.docs/01_product/npm_package_distribution.md`
- Tech Plan: `.docs/03_tech_plan/harness_package_distribution.md`

## Implementation Summary

开发阶段规则已明确：每个 `SPRINTING` task 完成后必须形成单独的 task-level `git commit`，并 `git push` 到当前 upstream branch。push 成功前，不进入下一个 pending task，也不能把该 task 视为完整闭环。

规则同时增加了 task 开始前的工作区检查：先看 `git status`，确认没有未归属到当前 task 的脏变更。如果存在历史 task 残留变更，应先完成对应 task 的 commit/push，或报告 blocker，避免多个 task 被混入同一个 commit。

## Changed Files

| Path | Purpose |
|---|---|
| `AGENTS.md` | 在全局 Plan Protocol 和工作规则中补充 task-level commit/push 要求。 |
| `README.md` | 更新开发阶段循环、Plan Protocol 说明、Skill 表和最小任务完成标准。 |
| `.agent/skills/dev_sprint/SKILL.md` | 将 `git status`、task-level `git commit` 和 `git push` 纳入开发 Skill 的输出、规则和完成检查。 |
| `packages/sdlc-harness/assets/**` | 通过 `package sync-source` 同步包内 canonical assets。 |

## Impact Notes

该规则是工作流约束，不改变 CLI 行为。它依赖 agent 执行 `git status`、`git commit` 和 `git push`，并在 remote/upstream、权限或凭证失败时停止推进并报告 blocker。

本次没有在 `plan.yaml` 的 done task 中新增 commit hash 字段，保持此前的短期化设计。task 历史边界由 git history、PR 或外部 release 系统追溯。

## Verification

| Gate | Result |
|---|---|
| `node packages/sdlc-harness/dist/cli.js package sync-source` | PASS |
| `node packages/sdlc-harness/dist/cli.js package check-source` | PASS |
| `make docs-overview` | PASS |
| `make validate-harness` | PASS |
| `make validate-current` | PASS |
| `git diff --check` | PASS |

## Follow-up Note

当前仓库已有多个尚未提交的 DEV 任务改动。按本任务新增规则，后续整理 git history 时应按 task 边界拆分 commit，不应把所有历史改动合并为一个大 commit。
