# DEV-019 Implementation: commit before task compression

## Task

- Task ID: `DEV-019`
- Title: 调整 task commit 与 plan 压缩顺序
- PRD: `.docs/01_product/npm_package_distribution.md`
- Tech Plan: `.docs/03_tech_plan/harness_package_distribution.md`

## Implementation Summary

开发阶段提交顺序已从“先压缩 task 再提交”调整为“两段式提交”：

1. task implementation commit：在 `plan.yaml` 中当前 task 仍保留完整 open task 合同时提交。这个提交包含代码、测试、implementation doc、`.docs/INDEX.md`、`overview.md`、gate 记录，以及 `allowed_paths`、`required_gates`、`acceptance_criteria` 等任务边界。
2. task completion ledger commit：implementation commit 完成后，再将 `plan.yaml` 中当前 task 压缩为 `summary`、`implementation_doc`、`gate_result` 等 done 摘要，并提交这个轻量记账变化。

这样 git history 可以追溯每个 task 的真实执行范围和验收标准，而当前 `plan.yaml` 仍能保持短期化、低噪声状态。

## Changed Files

| Path | Purpose |
|---|---|
| `AGENTS.md` | 将全局工作规则改为先提交完整 open task 合同，再提交压缩后的 completion ledger。 |
| `README.md` | 更新开发阶段循环、Plan Protocol 和最小任务完成标准，明确两段式提交顺序。 |
| `.agent/skills/dev_sprint/SKILL.md` | 更新开发 Skill 的角色提示词、输出、Plan Protocol、规则和完成检查。 |
| `packages/sdlc-harness/assets/**` | 通过 `package sync-source` 同步包内 canonical assets。 |

## Impact Notes

`plan.yaml` 仍不长期保存 commit hash。完整任务合同由 task implementation commit 保留，当前 plan 由后续 completion ledger commit 压缩。

如果 push 失败，两个 commit 都不能被视为完整交付；Agent 不应进入下一个 pending task。

## Verification

| Gate | Result |
|---|---|
| `node packages/sdlc-harness/dist/cli.js package sync-source` | PASS |
| `node packages/sdlc-harness/dist/cli.js package check-source` | PASS |
| `make docs-overview` | PASS |
| `make validate-harness` | PASS |
| `git diff --check` | PASS |
| `make validate-current after compression` | PASS |
