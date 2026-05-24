# DEV-028 Remove Gate Results State And Strengthen RFC Impact

## Summary

删除独立 gate results state。Harness 不再创建、要求或写入 `<harnessRoot>/state/gate_results.log`；当前 task 的临时 gate 证据写入 `working_notes`，完成后的最终验证事实写入 implementation doc `Verification`、CI logs 或 release 记录。

同时收敛历史 task 查询方式：过去 task 查询默认面向产物结果和变更意图，读取 implementation doc、RFC、PRD、tech plan 和代码。`allowed_paths`、`required_gates`、临时 `working_notes` 是执行期约束，不作为历史查询 API。

RFC 阶段提示词也补强了 impact analysis 要求，要求补丁前显式检查 docs、state、skills、policies、templates、tools、package assets、tests、migrations 和 generated artifacts 影响面。

## Changed Files

| 文件 | 变更 |
|---|---|
| `.agent/state/gate_results.log` | 删除当前仓库的独立 gate results state。 |
| `tools/run_current_gate.py`、`tools/harness_utils.py`、`tools/status.py`、`tools/validate_harness.py` | 移除 gate log 写入、状态展示和必需文件校验。 |
| `packages/sdlc-harness/src/lib/init.ts` | 新项目初始化不再生成 `gate_results.log`。 |
| `packages/sdlc-harness/src/lib/migrations.ts` | `upgrade` 删除 legacy `gate_results.log`。 |
| `tests/sdlc-harness/**` | 覆盖 init 不生成 gate log、upgrade 删除 legacy gate log。 |
| `AGENTS.md`、`README.md`、`.agent/skills/pjsdlc_dev_sprint/SKILL.md`、`.agent/skills/pjsdlc_manager/SKILL.md` | 更新 Plan Protocol、task commit 语义和 gate evidence 记录位置。 |
| `.agent/skills/pjsdlc_rfc_recalibrate/SKILL.md` | 增加补丁前 impact analysis 要求和检查清单。 |
| `.agent/pjsdlc_managed/policies/**` | SPRINTING 阶段不再把 gate log 作为 always allow 或 phase output。 |
| `packages/sdlc-harness/assets/**` | 通过 `package sync-source` 同步 AGENTS core、Skill 和 policy assets。 |
| `.docs/01_product/`、`.docs/03_tech_plan/`、`.docs/rfc/` | 补充产品要求、技术方案和 RFC_014。 |

## Behavior

- `make validate-current` 和 `tools/run_current_gate.py` 只输出 gate 结果，不写 state。
- 新项目 `sdlc-harness init` 不生成 `<harnessRoot>/state/gate_results.log`。
- 老项目 `sdlc-harness upgrade` 会删除 legacy gate log。
- open task 仍保留 `allowed_paths`、`required_gates` 和 `acceptance_criteria` 作为当前执行约束。
- 历史查询默认不读取过去 task 的执行期字段；只有显式 forensic/audit/regression 场景才临时查询 git、PR、CI 或 release 记录。

## Verification

| Gate | Result |
|---|---|
| `node packages/sdlc-harness/dist/cli.js package sync-source` | PASS，同步 package canonical assets。 |
| `python3 tools/validate_allowed_paths.py` | PASS，31 个 changed files 均在 DEV-028 allowed_paths 内。 |
| `npm test` | PASS，5 个 Node test files 全部通过。 |
| `node packages/sdlc-harness/dist/cli.js package check-source` | PASS，package source OK。 |
| `make validate-harness` | PASS，Harness scaffold、prompt language 和 overview check 全部通过。 |
| `git diff --check` | PASS。 |

## Notes

- `gate_result` 字段仍在 migration 和 validator 中作为 legacy cleanup 目标出现：旧 open task 携带该字段会被迁移清理，新 open task 仍被 validator 拒绝。
- 本任务不删除当前 open task 的 `allowed_paths`、`required_gates` 或 `acceptance_criteria`。它们仍是执行期必要约束，只是不作为历史查询 API。
