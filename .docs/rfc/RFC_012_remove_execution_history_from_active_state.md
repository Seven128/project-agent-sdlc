# RFC_012 Remove Execution History From Active State

## Summary

Harness active state 不再保存过去阶段和任务的执行流水。`lifecycle.yaml`、`plan.yaml` 和 `gate_results.log` 只保存当前可执行状态；过去执行信息默认不读取，也不迁移到 task。需要追溯时，由用户显式要求，或当前任务本身是 regression forensic / audit，再使用 git、PR、CI、release 系统和阶段产物查询。

## Motivation

当前 `lifecycle.yaml.history` 与 git history 重复，并且会随阶段流转持续增长。完成 task 的历史合同已经从 `plan.yaml` 移除，`gate_results.log` 也已变成短期 scratchpad；`lifecycle.history` 应保持同一原则。

普通修 bug、补功能或生成阶段产物时，Agent 需要读取的是当前事实源：PRD、技术方案、implementation doc、代码、测试、当前 lifecycle 和当前 plan。过去某个阶段怎样流转、某个 task 当时怎样执行，大多数情况下会稀释注意力，而不是提升成功率。

## Decision

1. 从 active state 中移除 `lifecycle.yaml.history`。
2. `tools/transition.py` 不再 append phase history；`--reason` 只作为本次命令输出说明或兼容参数保留。
3. `sdlc-harness init` 不再生成 `history: []`。
4. `sdlc-harness upgrade` migration 会删除既有 lifecycle `history`。
5. README、AGENTS、Skill 和模板声明：过去执行信息是 cold archive，不是默认上下文。
6. 追溯历史 task 合同从主流程规则降级为显式 forensic fallback，不作为常规任务恢复路径。

## Out Of Scope

- 不删除 implementation doc、RFC、ADR、release note 等产物事实。
- 不删除 git history、CI logs 或 release 系统记录。
- 不新增自动 `git bisect`、commit blame 或 forensic workflow。
- 不把 lifecycle history 合并到 `plan.yaml` 或其它 state 文件。

## Impact

- 新项目的 `lifecycle.yaml` 更短，只记录当前阶段路由状态。
- 老项目升级后，旧 `history` 会被 migration 删除。
- Agent 默认不会读取过去执行流水；如果用户明确要求“查历史原因/定位引入 commit/恢复某历史 task 合同”，再临时使用 git 和文档。
- `memory.md` 仍保留，但只记录长期稳定知识，不记录阶段 timeline 或任务流水。

## Acceptance Criteria

- `lifecycle.yaml` 不再包含 `history` 字段。
- `transition.py` 不再写入 lifecycle history。
- package init 和 migration 与新 lifecycle shape 对齐。
- prompt-language validator 不再要求 `history` key。
- README、AGENTS 和 package assets 明确过去执行信息不是默认读取上下文。
