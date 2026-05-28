# .docs/08_release overview

<!-- generated-by: AI SDLC Harness build_doc_overviews.py -->
<!-- source-hash: 9dfd3b20452ea178 -->

Generated artifact. Markdown slices remain the source of truth.

Source hash: `9dfd3b20452ea178`

## Source Slices

1. [CURRENT_RELEASE.md](CURRENT_RELEASE.md)

---

## CURRENT_RELEASE.md

Source: [CURRENT_RELEASE.md](CURRENT_RELEASE.md)

# Current Release Status（当前发布状态）

This file is overwritten by each release. Historical release evidence lives in git tags, npm registry metadata, CI logs and release commits.

## 1. Release Summary（发布摘要）

- Version: `agent-project-sdlc@0.1.15`
- Milestone: `MVP`
- Date: `2026-05-28`
- Owner: `release_manager`
- Registry: `https://registry.npmjs.org/`
- Status: `RELEASED`
- Current release report: `.docs/08_release/CURRENT_RELEASE.md`

## 2. Included Changes（包含变更）

- 发布当前 workspace 中已同步的 AI SDLC Harness package assets 和 CLI build。
- 本版本由 `tools/release_npm.mjs` 执行发布闭环，覆盖 version bump、test、source drift check、pack dry-run、publish、registry latest verification 和 installed-consumer smoke。

## 3. Build Artifacts（构建产物）

| 产物（Artifact） | 位置（Location） | Checksum/Version |
|---|---|---|
| npm package | `agent-project-sdlc` | `0.1.15` |
| dry-run tarball | `npm pack --dry-run --json --workspace agent-project-sdlc` | `2611d57f47ce0668526df012df53731c806dc4f5` |
| dry-run integrity | same | `sha512-ynZdVtVy5lMRQYX+ldTmmYjilN3RrrQKFrvUdA6ctGJ9pNq3Sj/fnkQnAoNRaqjkjzTUg99nnxMMtg5/l7D8jw==` |
| package content | dry-run output | 85 files, 71.9 kB package size, 252.0 kB unpacked size |
| registry package | `npm view agent-project-sdlc version dist-tags.latest dist.integrity --json` | `version 0.1.15`, `latest 0.1.15`, `integrity sha512-ynZdVtVy5lMRQYX+ldTmmYjilN3RrrQKFrvUdA6ctGJ9pNq3Sj/fnkQnAoNRaqjkjzTUg99nnxMMtg5/l7D8jw==` |

## 4. Smoke Test Result（冒烟测试结果）

- Decision: `PASS`
- Evidence:
  - `npm test`: PASS。
  - `node packages/sdlc-harness/dist/cli.js package check-source`: PASS。
  - `make validate-harness`: PASS。
  - `npm pack --dry-run --json --workspace agent-project-sdlc`: PASS。
  - `git diff --check`: PASS。
  - `npm publish --workspace agent-project-sdlc`: PASS，registry 返回 agent-project-sdlc@0.1.15。
  - `npm view agent-project-sdlc version dist-tags.latest dist.integrity --json`: PASS，version 和 latest 均为 0.1.15。
  - Registry installed-consumer smoke: PASS，从 npm registry 安装 agent-project-sdlc@0.1.15 后，init 和 doctor 均通过，doctor 输出 `core package: agent-project-sdlc@0.1.15`。
  - `make validate-release`: PASS。

## 5. Deployment Checklist（部署检查清单）

- [x] Confirm registry latest before publishing.
- [x] Bump package version to `0.1.15`.
- [x] Package source drift check passed.
- [x] npm tests passed.
- [x] Pack dry run passed.
- [x] Publish package with `npm publish --workspace agent-project-sdlc`.
- [x] Verify registry package with `npm view agent-project-sdlc version dist-tags.latest dist.integrity --json`.
- [x] Run installed-consumer smoke from npm registry.
- [x] Create and push git tag `v0.1.15` after publish success.

## 6. Rollback Plan（回滚方案）

- 触发条件（Trigger）:
  - `npm publish` 失败且 package 未创建。
  - 发布成功后发现 CLI 无法安装、初始化、doctor 失败，或包内 assets 与仓库事实源漂移。
- 步骤（Steps）:
  1. 如果 publish 未成功，不创建 release tag，保留当前 release status 的 blocker 状态，修复后重新执行 release gate。
  2. 如果 publish 已成功但 smoke 失败，立即停止推广该版本。
  3. 由于 npm package version 不可复用，修复后 bump 到下一个 patch version，重新执行 test/release gate 后发布。
  4. 如需让消费者回退，指导安装上一稳定版本或从 git commit/tag 固定依赖。
- 数据注意事项（Data considerations）:
  - 本包发布的是 CLI 和 Harness assets，不迁移 npm registry 外的数据。
  - 用户仓库 sync/upgrade 遵循 managed file 增量策略；回滚时不得覆盖用户本地自定义配置。
- 负责人（Owner）: `release_manager`

## 7. Known Issues（已知限制）

- None recorded for this release status. Update this section before publish if smoke, registry or consumer install limitations are discovered.
