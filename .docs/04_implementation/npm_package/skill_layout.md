# Harness Skill Layout Implementation Doc

## Summary

`DEV-039` 将 Harness 阶段角色文件重新定义为 `.agent/skills/<name>/SKILL.md` workflow skill，并把本仓库维护 Harness 自身的 authoring skill 放到同一棵 `.agent/skills/**` 树下的 `.agent/skills/authoring/**`。

这个改动明确区分两类 Skill：

| 类型 | 路径 | 是否随 npm 包分发 | 用途 |
|---|---|---|---|
| Workflow skill | `.agent/skills/<name>/SKILL.md` | 是 | 普通用户项目的阶段角色提示词，由 lifecycle 和 phase contract 软索引。 |
| Authoring skill | `.agent/skills/authoring/<name>/SKILL.md` | 否 | 只服务本仓库迭代 AI SDLC Harness 自身，不进入用户项目。 |

## Changed Files

| 文件 | 变更 |
|---|---|
| `.agent/skills/**/SKILL.md` | 承接原通用阶段角色文件，并统一使用 Skill 术语。 |
| `.agent/skills/authoring/harness_package_design/SKILL.md` | 承接本仓库专用 authoring skill。 |
| `.agent/state/lifecycle.yaml` | lifecycle 使用 `active_skill` 指向当前 workflow skill。 |
| `.agent/pjsdlc_managed/policies/phase_contracts.yaml` | phase contract 使用 `skill` 字段声明每个阶段的 workflow skill。 |
| `.agent/config.yaml` | managed path 使用 `.agent/skills`。 |
| `packages/sdlc-harness/source-mappings.yaml` | package source sync 改为同步 `.agent/skills` 到 `assets/skills`，并排除 `authoring/**`。 |
| `packages/sdlc-harness/src/lib/package-source.ts` | `copy-tree` source mapping 支持 `exclude` pattern。 |
| `packages/sdlc-harness/src/lib/sync-engine.ts` | 用户项目同步 package `skills` assets 到 `<harnessRoot>/skills`。 |
| `packages/sdlc-harness/src/lib/migrations.ts` | 旧 `skills` managed path、`SKILL.md` 和 `active_skill` 迁移到新 Skill 布局。 |
| `tools/validate_harness.py` / `tools/validate_prompt_language.py` | 本仓库 gate 改为校验 `.agent/skills/**/SKILL.md` 和 `SKILL_TEMPLATE.md`。 |
| `tests/sdlc-harness/*.test.mjs` | 覆盖 skill sync、authoring 排除、validator 和 upgrade 兼容。 |

## Behavior

- 新安装或同步的用户项目获得 `<harnessRoot>/skills/**/SKILL.md`，不获得 authoring skill。
- `package sync-source` 从 `.agent/skills/**` 复制通用 workflow skill 到 `packages/sdlc-harness/assets/skills/**`，但跳过 `.agent/skills/authoring/**`。
- `sync` / `init` / `upgrade` 使用 package `assets/skills` 作为通用 Skill source，并写入用户项目的 `<harnessRoot>/skills/**`。
- 旧项目如果配置了 `.agents/skills`、`.harness/agents/skills` 或 `<harnessRoot>/prompts`，upgrade 会改写到 `<harnessRoot>/skills`。
- 旧项目 lifecycle 中的 `active_prompt` 会迁移为 `active_skill`；旧 `PROMPT.md` 文件会在迁移 prompts 树时重命名为 `SKILL.md`。

## Important Boundary

这些 workflow skills 可以被 native skill adapter 注册，也可以被 Harness soft index 读取。默认项目内生效路径是“阶段状态 + skill 文件”的软索引：

```txt
.agent/state/lifecycle.yaml active_skill
-> .agent/pjsdlc_managed/policies/phase_contracts.yaml skill
-> .agent/skills/<skill>/SKILL.md
```

Codex 原生 skill 的注册、水合和语义枚举仍由客户端自己的 skill 目录机制控制。`.agent/skills/**` 是 Harness source of truth；要获得 native skill 首轮命中，需要由 Codex adapter 或安装命令同步/链接到 Codex 支持的 skill root。

## Verification

| Gate | Result |
|---|---|
| `npm test` | PASS，5 个 `tests/sdlc-harness/*.test.mjs` 全部通过。 |
| `node packages/sdlc-harness/dist/cli.js package check-source` | PASS，package assets 与 source mapping 一致。 |
| `make validate-harness` | PASS，Harness scaffold、Skill language 和 doc overview 均通过。 |
| `python3 tools/validate_allowed_paths.py` | PASS，60 个 changed files 均在 DEV-039 allowed_paths 内。 |
| `git diff --check` | PASS。 |
