# .docs/07_test overview

<!-- generated-by: AI SDLC Harness build_doc_overviews.py -->
<!-- source-hash: 83e67c96328fc02f -->

Generated artifact. Markdown slices remain the source of truth.

Source hash: `83e67c96328fc02f`

## Source Slices

1. [TEST_PLAN.md](TEST_PLAN.md)

---

## TEST_PLAN.md

Source: [TEST_PLAN.md](TEST_PLAN.md)

# Test Plan（测试计划）

## 1. 测试范围

- Release candidate: `agent-project-sdlc@0.1.0`
- Commit range: `8f7f8c8..c7fcd72`
- Review input: `.docs/06_review/REVIEW_REPORT.md`
- 覆盖目标：npm package scaffold、sync/init/doctor、upgrade/migration、source sync、validate-* CLI、managed file merge、Markdown overview、角色提示词、task commit workflow。

## 2. Test Matrix（测试矩阵）

| 需求/风险 | 测试项 | 命令/证据 | 结果 |
|---|---|---|---|
| npm package runtime 可构建并通过单元/集成测试 | Full package regression | `npm test` | PASS：5 个 test files 全部通过。 |
| package assets 与仓库事实源无漂移 | Source drift check | `node packages/sdlc-harness/dist/cli.js package check-source` | PASS：`package source OK`。 |
| Harness 结构、prompt language 和 overview 派生视图一致 | Harness validation | `make validate-harness` | PASS：scaffold、prompt language、overview check 全部通过。 |
| npm tarball 内容可发布 | Pack dry run | `npm pack --dry-run --workspace agent-project-sdlc` | PASS：81 files，package size 34.7 kB，unpacked size 111.4 kB。 |
| 阶段 gate 可执行 | TESTING gate placeholder | `make test-all` | PASS：当前 Makefile 仍为占位输出，需要后续替换为项目级 regression suite。 |

## 3. Regression（回归记录）

- `npm test` 运行 `npm run build` 后执行 `node --test ../../tests/sdlc-harness/*.test.mjs`，通过：
  - `harness-root.test.mjs`
  - `package-source.test.mjs`
  - `sync-init-doctor.test.mjs`
  - `upgrade.test.mjs`
  - `validators.test.mjs`
- `npm pack --dry-run` 触发 `prepack` build 并列出 tarball 内容，确认 `dist`、`assets`、`migrations`、`source-mappings.yaml` 和 `package.json` 被包含。
- `make validate-harness` 确认 `.docs/**/overview.md` 未过期。

## 4. Coverage Gaps（覆盖缺口）

- `make test-all` 仍是通用占位命令，真实项目级 regression 目前由 `npm test`、source drift check、Harness validation 和 pack dry run 覆盖。
- npm registry publish 需要在 RELEASING 阶段用实际 npm auth、scope 权限和 2FA/token policy 验证。
- installed-consumer smoke 尚未完成；需要发布后或从 tarball 安装后执行 CLI smoke。

## 5. Gate Result（阶段结论）

- Decision: `PASS`
- Required before release: 完成 release note、publish checklist、smoke evidence 和 rollback plan。
