# DEV-021 Consolidate Managed Workflow Config

## Summary

将除 `.agent/skills/**` hard index 之外的工作流默认配置收敛到 `.agent/managed/**`。旧的 `.agent/policies/**` 和 `.agent/templates/**` tracked mirror 已删除，工具、包资产和测试改为使用 managed canonical layout。

## Changed Files

| 文件 | 变更 |
|---|---|
| `.agent/managed/**` | 保留 policies、templates 和默认 Makefile targets 作为工作流配置事实源。 |
| `.agent/policies/**` / `.agent/templates/**` | 删除旧镜像目录，避免同一份配置出现多个工作区事实源。 |
| `Makefile` | 缩减为 include block，只引入 `.agent/managed/make/sdlc-harness.mk`。 |
| `tools/harness_utils.py`、`tools/validate_*.py` | 校验和阶段契约读取路径改为 `.agent/managed/policies/**`。 |
| `packages/sdlc-harness/source-mappings.yaml` | package asset 的 Makefile source 改为 `.agent/managed/make/sdlc-harness.mk`。 |
| `packages/sdlc-harness/src/lib/sync-engine.ts` | `sync` 不再直接 materialize legacy `.harness/templates`、`.harness/policies` 或 `.harness/make/**`。 |
| `tests/sdlc-harness/*.test.mjs` | 更新 package source fixture，并增加 init/sync 不生成 legacy mirror 的断言。 |
| `AGENTS.md` / `README.md` | 同步 managed canonical layout、Makefile include 入口和 legacy mirror 禁止规则。 |
| `.agent/config.yaml` | `core.package` 修正为已发布包名 `agent-project-sdlc`。 |

## Behavior

```txt
agent-project-sdlc assets
-> sdlc-harness sync
-> <harnessRoot>/skills/**                  # Agent hard index
-> <harnessRoot>/managed/templates/**       # workflow templates
-> <harnessRoot>/managed/policies/**        # workflow policies
-> <harnessRoot>/managed/make/sdlc-harness.mk
-> Makefile include block
```

`<harnessRoot>/state/**` 和 `.docs/**` 仍然是项目实例事实源，不由包升级全量覆盖。已有旧配置仍通过 migration 映射到 managed path；新同步路径不再生成旧镜像目录。

## Verification

| Gate | Result |
|---|---|
| `npm test` | PASS，5 个 `tests/sdlc-harness/*.test.mjs` 全部通过。 |
| `node packages/sdlc-harness/dist/cli.js package check-source` | PASS，`package source OK`。 |
| `python3 tools/validate_allowed_paths.py` | PASS，32 个 changed files 均在 DEV-021 allowed_paths 内。 |
| `make validate-harness` | PASS，Harness scaffold、prompt language 和 overview check 全部通过。 |
| `git diff --check HEAD` | PASS。 |

## Notes

- `.agent/skills/<skill_name>/SKILL.md` 继续保持一级 hard index，避免 Agent skill discovery 受到过深目录结构影响。
- 根 `Makefile` 仍然是用户项目入口；用户自己的 Makefile target 可留在 include block 之外，包升级只维护 block 内内容。
