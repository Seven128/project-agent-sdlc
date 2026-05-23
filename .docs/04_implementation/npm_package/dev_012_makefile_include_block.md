# DEV-012 Implementation: Makefile include managed block

## Task

- Task ID: `DEV-012`
- Title: 为 `sync` 增加 `Makefile` include 托管块
- PRD: `.docs/01_product/npm_package_distribution.md`
- Tech Plan: `.docs/03_tech_plan/harness_package_distribution.md`

## Implementation Summary

`sdlc-harness sync` 现在会用 managed block 管理根 `Makefile` 的 Harness 接入片段。新项目会得到一个只包含 include block 的 `Makefile`；已有项目会在文件开头插入 include block，并保留项目原有内容。

`AGENTS.md` 和 `Makefile` 的 block 合并逻辑统一为完整 marker 替换：只有同时存在且唯一的 begin/end marker 时才替换 block 内容；marker 缺失一边、顺序错误或重复时，`sync` 返回 `blocked`，避免猜测式覆盖。

## Changed Files

| Path | Purpose |
|---|---|
| `packages/sdlc-harness/src/lib/sync-engine.ts` | 增加 `Makefile` include block 同步，并抽出通用 managed block 合并保护。 |
| `packages/sdlc-harness/src/lib/managed-file.ts` | 增加 `Makefile` marker 常量。 |
| `packages/sdlc-harness/src/lib/config.ts` | 默认 managed files 增加根 `Makefile` 的 `merge-block` 项。 |
| `packages/sdlc-harness/src/lib/migrations.ts` | 旧 config 在 `upgrade` 时补入根 `Makefile` 管理项。 |
| `tests/sdlc-harness/sync-init-doctor.test.mjs` | 覆盖默认/custom root 的 Makefile include、已有 Makefile 内容保留、坏 marker blocker。 |
| `tests/sdlc-harness/upgrade.test.mjs` | 覆盖旧 config 升级后补入 Makefile 管理项并生成 include block。 |

## Behavior Notes

`Makefile` block 形如：

```make
# sdlc-harness:make:begin
# Included before project targets so project recipes win on name conflicts.
-include .agent/managed/make/sdlc-harness.mk
.DEFAULT_GOAL :=
# sdlc-harness:make:end
```

当已有项目存在自己的 targets 时，block 插在文件开头并清空 include 产生的默认 goal，让项目自己的第一个 target 继续作为默认入口。项目后续定义的同名 target 会覆盖 Harness fragment 中的默认占位 target。

## Plan Deviations

技术方案已要求 `Makefile` 不整体覆盖，并生成 `<harnessRoot>/managed/make/sdlc-harness.mk`；实现中额外把根 `Makefile` 作为 `merge-block` managed file 写入 default config 和 migration，确保 `init`、`sync` 和 `upgrade` 都能接上线。

## Verification

| Gate | Result |
|---|---|
| `npm test` | PASS |
| `python3 tools/validate_allowed_paths.py` | PASS |
| `node packages/sdlc-harness/dist/cli.js validate-harness` | PASS |
| `make validate-harness` | PASS |
| `node packages/sdlc-harness/dist/cli.js package check-source` | PASS |
