# DEV-029 Natural Language Control

## Summary

补充自然语言控制契约。Harness 仍保留 `/status`、`/next`、`/advance`、`/rfc`、`/overview`、`/review` 和 `/test` 作为快捷入口，但用户不需要记忆这些命令。Agent 应先读取 lifecycle 和 plan，再把“状态如何”“继续”“开始开发”“跑测试”“进入下一阶段”“需求变了”等自然语言映射到对应 workflow action。

这个改动不新增 state 字段，也不依赖 Codex、Claude Code 或其它客户端的专有模式切换能力。自然语言控制属于 Agent 行为契约，现有 lifecycle、plan、Skill 和 gate 仍是事实源。

## Changed Files

| 文件 | 变更 |
|---|---|
| `AGENTS.md` | 在宏指令协议前补充自然语言控制规则和常见意图映射。 |
| `.agent/skills/pjsdlc_manager/SKILL.md` | 要求 manager 将自然语言意图路由到 status、next、advance、RFC、开发、测试、Review 和 overview 动作。 |
| `README.md` | 将宏指令定位为快捷入口，补充自然语言到 workflow action 的映射表。 |
| `.docs/01_product/npm_package_distribution.md` | 新增 `PRD-NPM-023` 和验收标准。 |
| `.docs/03_tech_plan/harness_package_distribution.md` | 新增 Natural Language Control 技术契约。 |
| `packages/sdlc-harness/assets/**` | 通过 `package sync-source` 同步 AGENTS core 和 manager Skill assets。 |

## Behavior

- 用户可以说“继续”“下一步”“开始开发”“跑测试”“准备 review”等自然语言，不需要先记住或输入宏指令。
- Agent 在执行前仍读取 `.agent/state/lifecycle.yaml` 和必要的 `.agent/state/plan.yaml`。
- 会改变阶段、创建或删除 task、提交、push 或发布的动作，Agent 先说明即将执行的动作和验证方式。
- `/xxx` 宏指令继续可用，作为 power-user shortcut、调试入口和自动化入口。

## Verification

| Gate | Result |
|---|---|
| `node packages/sdlc-harness/dist/cli.js package sync-source` | PASS，同步 package canonical assets。 |
| `python3 tools/validate_allowed_paths.py` | PASS，13 个 changed files 均在 DEV-029 allowed_paths 内。 |
| `node packages/sdlc-harness/dist/cli.js package check-source` | PASS，package source OK。 |
| `make validate-harness` | PASS，Harness scaffold、prompt language 和 overview check 全部通过。 |
| `git diff --check` | PASS。 |
