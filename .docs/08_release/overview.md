# .docs/08_release overview

<!-- generated-by: AI SDLC Harness build_doc_overviews.py -->
<!-- source-hash: 713c2fc55eb3f180 -->

Generated artifact. Markdown slices remain the source of truth.

Source hash: `713c2fc55eb3f180`

## Source Slices

1. [v0.1.0_npm_release.md](v0.1.0_npm_release.md)

---

## v0.1.0_npm_release.md

Source: [v0.1.0_npm_release.md](v0.1.0_npm_release.md)

# Release Note And Rollback Plan（发布说明与回滚方案）

## 1. Release Summary（发布摘要）

- Version: `agent-project-sdlc@0.1.0`
- Milestone: `MVP`
- Date: `2026-05-24`
- Owner: `release_manager`
- Registry: `https://registry.npmjs.org/`
- Status: `BLOCKED_NPM_AUTH`

## 2. Included Changes（包含变更）

- 新增 npm package scaffold，提供 `sdlc-harness` CLI 与 `dist` runtime。
- 支持 `sync`、`init`、`init --adopt`、`doctor`、`upgrade`、`validate-*`、`package check-source`。
- 支持 configurable `harnessFolderName`，默认 Harness root 为 `.agent`。
- 将 task/checkpoint/archive 模型收敛到 `plan.yaml`、implementation doc 和 git history。
- 增加 Makefile `merge-block` 托管策略，避免覆盖用户已有内容。
- 将 `.docs/<stage>/overview.html` 替换为 generated `.docs/<stage>/overview.md`。
- 补充通用角色提示词、Karpathy guidelines 中文契约表达、task implementation commit 与 completion ledger commit 顺序规则。

## 3. Build Artifacts（构建产物）

| 产物（Artifact） | 位置（Location） | Checksum/Version |
|---|---|---|
| npm package | `agent-project-sdlc` | `0.1.0` |
| dry-run tarball | `npm pack --dry-run --workspace agent-project-sdlc` | `shasum 906e745f5dd9a6fdc14890ea64199694e7095a77` |
| dry-run tarball | same | `integrity sha512-38XCPG1qWFSP0[...]D7Jdf2vhrDdWQ==` |
| package content | dry-run output | 81 files, 34.7 kB package size, 111.4 kB unpacked size |

## 4. Smoke Test Result（冒烟测试结果）

- Decision: `PASS` for local tarball smoke; npm registry publish smoke blocked by npm auth.
- Evidence:
  - `npm test`: PASS，5 个 `tests/sdlc-harness/*.test.mjs` 全部通过。
  - `node packages/sdlc-harness/dist/cli.js package check-source`: PASS，`package source OK`。
  - `make validate-harness`: PASS。
  - `npm pack --dry-run --workspace agent-project-sdlc`: PASS。
  - Local tarball installed into a temporary consumer project: PASS。
  - `npx sdlc-harness help`: PASS，输出 CLI command list。
  - `npx sdlc-harness init --harness-folder .agent`: PASS，生成 `.agent`、`.docs/INDEX.md` 并完成 sync。
  - `npx sdlc-harness doctor`: PASS，输出 `core package: agent-project-sdlc@0.1.0` 和 `doctor complete`。
  - `npm whoami`: BLOCKED，返回 `ENEEDAUTH`。
  - `npm view agent-project-sdlc version --json`: 当前 registry 返回 `E404`，说明包名尚未公开存在，或当前未认证用户无访问权限。
  - `npm login --auth-type=web`: BLOCKED，web login 未完成。

## 5. Deployment Checklist（部署检查清单）

- [x] Git commits pushed to `origin/main` through TESTING.
- [x] Review report created and validated.
- [x] Test plan created and validated.
- [x] Package source drift check passed.
- [x] Pack dry run and local installed-consumer smoke passed.
- [ ] npm auth available on this machine via `npm whoami`（当前 `ENEEDAUTH`）。
- [ ] npm package name `agent-project-sdlc` availability and publish permission confirmed.
- [ ] Publish package with `npm publish --workspace agent-project-sdlc`.
- [ ] Verify registry page or `npm view agent-project-sdlc version --json`.
- [ ] Create git tag after publish success.

## 6. Rollback Plan（回滚方案）

- 触发条件（Trigger）:
  - `npm publish` 失败且 package 未创建。
  - 发布成功后发现 CLI 无法安装、初始化、doctor 失败，或包内 assets 与仓库事实源漂移。
- 步骤（Steps）:
  1. 如果 publish 未成功，不创建 release tag，保留当前 release doc 的 blocker 状态，修复后重新执行 release gate。
  2. 如果 publish 已成功但 smoke 失败，立即停止推广该版本。
  3. 由于 npm package version 不可复用，修复后 bump 到下一个 patch version，例如 `0.1.1`，重新执行 test/release gate 后发布。
  4. 如需让消费者回退，指导安装上一稳定版本或从 git commit/tag 固定依赖。
- 数据注意事项（Data considerations）:
  - 本包发布的是 CLI 和 Harness assets，不迁移 npm registry 外的数据。
  - 用户仓库 sync/upgrade 遵循 managed file 增量策略；回滚时不得覆盖用户本地自定义配置。
- 负责人（Owner）: `release_manager`
