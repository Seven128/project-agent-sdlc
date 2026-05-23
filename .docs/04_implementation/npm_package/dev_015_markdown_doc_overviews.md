# DEV-015 Implementation: Markdown doc overviews

## Task

- Task ID: `DEV-015`
- Title: 将 docs overview 派生视图从 HTML 改为 Markdown
- PRD: `.docs/01_product/npm_package_distribution.md`
- Tech Plan: `.docs/03_tech_plan/harness_package_distribution.md`

## Implementation Summary

`.docs/<stage>/overview.html` 被替换为 `.docs/<stage>/overview.md`。生成器现在直接拼接阶段 Markdown slices，保留 source hash、source slice 列表和每个 slice 的原始 Markdown 内容。

`make docs-overview` 会写入 `overview.md` 并删除同目录旧 `overview.html`；`make validate-doc-overviews` 会检查 `overview.md` 是否最新，并把遗留 `overview.html` 视为过期生成物。

## Changed Files

| Path | Purpose |
|---|---|
| `tools/build_doc_overviews.py` | 输出 deterministic Markdown overview，并删除/拦截旧 HTML 生成物。 |
| `AGENTS.md` / `README.md` | 将派生视图规则从 `overview.html` 更新为 `overview.md`。 |
| `Makefile` / `.agent/managed/make/sdlc-harness.mk` | 命令帮助文案改为 Markdown overview。 |
| `.agent/skills/**` / `.agent/templates/**` / `.agent/managed/templates/**` | 阶段完成检查和 Skill 模板改为 `overview.md`。 |
| `packages/sdlc-harness/assets/**` | 包内 canonical assets 同步为 `overview.md` 语义。 |
| `.docs/**/overview.md` | 新的 Markdown 派生视图。 |

## Impact Notes

HTML 的优势主要在交互和图文排版，但当前 Harness 没有自动生成图文内容的能力。Markdown overview 更贴近现阶段事实源形态，也更适合 Agent 直接读取、diff 和校验。

历史 `overview.html` 不再保留，避免同一阶段目录中同时存在两种派生视图导致人和 Agent 混淆。

## Verification

| Gate | Result |
|---|---|
| `make docs-overview` | PASS |
| `make validate-doc-overviews` | PASS |
| `node packages/sdlc-harness/dist/cli.js package check-source` | PASS |
| `make validate-harness` | PASS |
| `make validate-current` | PASS |
| `npm test` | PASS |
