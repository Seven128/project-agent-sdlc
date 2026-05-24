# DEV-023 pjsdlc Layout and Skill Prefix

## Summary

将 package-managed workflow layout 从 `.agent/managed/**` 迁移到 `.agent/pjsdlc_managed/**`，并把所有通用 workflow Skill 的目录名和 frontmatter `name` 迁移为 `pjsdlc_*`。根 `Makefile` 保留为用户仓库的薄桥接入口，只 include `.agent/pjsdlc_managed/make/sdlc-harness.mk`，避免破坏现有 `make validate-*` gate 约定。

## Changed Files

| 文件 | 变更 |
|---|---|
| `.agent/pjsdlc_managed/**` | 接收原 `.agent/managed/**` 下的 policies、templates 和默认 Makefile targets。 |
| `.agent/skills/pjsdlc_*/SKILL.md` | workflow Skill 目录名和 `name:` 改为 `pjsdlc_*`，保持 `skills/<skill_name>/SKILL.md` hard index。 |
| `.agent/state/lifecycle.yaml` / `.agent/pjsdlc_managed/policies/phase_contracts.yaml` | 当前 `active_skill` 和 phase contract `skill` 全部指向 `pjsdlc_*`。 |
| `packages/sdlc-harness/src/lib/*.ts` | 默认 config、init 状态、sync include path、validators 和 migrations 改为 `pjsdlc_managed` / `pjsdlc_*`。 |
| `packages/sdlc-harness/assets/**` | 通过 `package sync-source` 同步新 skill asset 目录和 policies。 |
| `tests/sdlc-harness/*.test.mjs` | 覆盖 init/sync/upgrade 后的新目录、旧 `.managed` 路径消失、旧 `active_skill` 迁移和 package source 映射。 |
| `AGENTS.md`、`README.md`、PRD、架构和技术方案 | 记录 `pjsdlc_managed`、`pjsdlc_*` Skill 命名，以及根 `Makefile` 不删除的桥接原因。 |

## Behavior

```txt
package assets
-> sync / init / upgrade
-> <harnessRoot>/skills/pjsdlc_*/SKILL.md
-> <harnessRoot>/pjsdlc_managed/templates/**
-> <harnessRoot>/pjsdlc_managed/policies/**
-> <harnessRoot>/pjsdlc_managed/make/sdlc-harness.mk
-> root Makefile include block
```

`upgrade` 会把旧 config 中的 `.harness/templates`、`.harness/policies`、`.harness/make` 和 `<harnessRoot>/managed/**` 映射到 `<harnessRoot>/pjsdlc_managed/**`。如果旧 `<harnessRoot>/managed/**` 目录存在且新目录尚不存在，migration 会整体移动旧目录，保留 `.local.yaml` 等本地覆盖文件，再由 `sync` 刷新 canonical package assets。

根 `Makefile` 仍然是用户仓库命令入口，不作为 package-owned target 文件删除。包拥有的 target 文件位于 `<harnessRoot>/pjsdlc_managed/make/sdlc-harness.mk`，根文件只保存 `pjsdlc:sdlc-harness:make:*` include block。

## Verification

| Gate | Result |
|---|---|
| `npm test` | PASS，5 个 `tests/sdlc-harness/*.test.mjs` 全部通过。 |
| `node packages/sdlc-harness/dist/cli.js package check-source` | PASS，`package source OK`。 |
| `python3 tools/validate_allowed_paths.py` | PASS，75 个 changed files 均在 DEV-023 allowed_paths 内。 |
| `make validate-harness` | PASS，Harness scaffold、prompt language 和 overview check 全部通过。 |

## Notes

- `.agent/skills/**` 维持一层 hard index，不引入 `skills/managed/**` 嵌套，降低 Agent Skill discovery 风险。
- 旧 `.agent/managed/**` 不再作为 tracked workflow config fact source；历史 implementation docs 中的旧路径保留其当时语义。
