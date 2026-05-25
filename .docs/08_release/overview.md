# .docs/08_release overview

<!-- generated-by: AI SDLC Harness build_doc_overviews.py -->
<!-- source-hash: 121f71b9ce8945bb -->

Generated artifact. Markdown slices remain the source of truth.

Source hash: `121f71b9ce8945bb`

## Source Slices

1. [v0.1.0_npm_release.md](v0.1.0_npm_release.md)
2. [v0.1.1_npm_release.md](v0.1.1_npm_release.md)
3. [v0.1.2_npm_release.md](v0.1.2_npm_release.md)

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
- Status: `RELEASED`

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
| registry package | `npm view agent-project-sdlc version dist-tags.latest dist.integrity --json` | `version 0.1.0`, `latest 0.1.0`, `integrity sha512-38XCPG1qWFSP0CwF9QyAFZveXPfgIDmvRqc3wCe6Qd4MoUBkQRZ/vB5fracu2wnxnyb6N439/D7Jdf2vhrDdWQ==` |
| package content | dry-run output | 81 files, 34.7 kB package size, 111.4 kB unpacked size |

## 4. Smoke Test Result（冒烟测试结果）

- Decision: `PASS`
- Evidence:
  - `npm test`: PASS，5 个 `tests/sdlc-harness/*.test.mjs` 全部通过。
  - `node packages/sdlc-harness/dist/cli.js package check-source`: PASS，`package source OK`。
  - `make validate-harness`: PASS。
  - `npm pack --dry-run --workspace agent-project-sdlc`: PASS。
  - Local tarball installed into a temporary consumer project: PASS。
  - `npx sdlc-harness help`: PASS，输出 CLI command list。
  - `npx sdlc-harness init --harness-folder .agent`: PASS，生成 `.agent`、`.docs/INDEX.md` 并完成 sync。
  - `npx sdlc-harness doctor`: PASS，输出 `core package: agent-project-sdlc@0.1.0` 和 `doctor complete`。
  - `npm whoami`: PASS，发布账号 `steve1998`。
  - `npm publish --workspace agent-project-sdlc`: PASS，registry 返回 `+ agent-project-sdlc@0.1.0`。
  - `npm view agent-project-sdlc version dist-tags.latest dist.integrity --json`: PASS，`version` 和 `latest` 均为 `0.1.0`。
  - Registry installed-consumer smoke: PASS，从 npm registry 安装 `agent-project-sdlc@0.1.0` 后，`npx sdlc-harness help`、`init --harness-folder .agent`、`doctor` 均通过。

## 5. Deployment Checklist（部署检查清单）

- [x] Git commits pushed to `origin/main` through TESTING.
- [x] Review report created and validated.
- [x] Test plan created and validated.
- [x] Package source drift check passed.
- [x] Pack dry run and local installed-consumer smoke passed.
- [x] npm auth available on this machine via `npm whoami`.
- [x] npm package name `agent-project-sdlc` availability and publish permission confirmed.
- [x] Publish package with `npm publish --workspace agent-project-sdlc`.
- [x] Verify registry package with `npm view agent-project-sdlc version dist-tags.latest dist.integrity --json`.
- [x] Create git tag after publish success.

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

---

## v0.1.1_npm_release.md

Source: [v0.1.1_npm_release.md](v0.1.1_npm_release.md)

# Release Note And Rollback Plan（发布说明与回滚方案）

## 1. Release Summary（发布摘要）

- Version: `agent-project-sdlc@0.1.1`
- Milestone: `MVP`
- Date: `2026-05-25`
- Owner: `release_manager`
- Registry: `https://registry.npmjs.org/`
- Status: `SUPERSEDED`

## 2. Included Changes（包含变更）

- 新增 Natural Language Control 契约：用户可以用“继续”“开始开发”“跑测试”“需求变了”等自然语言驱动 workflow，`/xxx` 宏指令降级为快捷入口。
- `AGENTS.md` managed core 和 `pjsdlc_manager` package asset 已同步自然语言路由规则。
- npm 包版本从 `0.1.0` bump 到 `0.1.1`，因为 `0.1.0` 已发布且 npm 版本不可复用。

## 3. Build Artifacts（构建产物）

| 产物（Artifact） | 位置（Location） | Checksum/Version |
|---|---|---|
| npm package | `agent-project-sdlc` | `0.1.1` |
| dry-run tarball | `npm pack --dry-run --workspace agent-project-sdlc` | `shasum dd690a392902d578071c3fcbbd8bdc5c5edf927e` |
| dry-run tarball | same | `integrity sha512-rtmR3mUaM2H7r[...]BnRlub3ZkOLQA==` |
| package content | dry-run output | 81 files, 37.8 kB package size, 123.5 kB unpacked size |
| registry package | `npm view agent-project-sdlc version dist-tags.latest dist.integrity --json` | `version 0.1.1`, later superseded by `0.1.2` |

## 4. Smoke Test Result（冒烟测试结果）

- Decision: `SUPERSEDED_BY_0.1.2`
- Evidence:
  - `npm whoami`: PASS，发布账号 `steve1998`。
  - `npm view agent-project-sdlc version --json`: PASS，发布前 latest 为 `0.1.0`。
  - `npm test`: PASS，5 个 `tests/sdlc-harness/*.test.mjs` 全部通过。
  - `node packages/sdlc-harness/dist/cli.js package check-source`: PASS，`package source OK`。
  - `make validate-harness`: PASS。
  - `npm pack --dry-run --workspace agent-project-sdlc`: PASS。
  - `python3 tools/validate_allowed_paths.py`: PASS，发布前 changed files 在 DEV-031 allowed_paths 内。
  - `npm publish --workspace agent-project-sdlc`: PASS，registry 返回 `+ agent-project-sdlc@0.1.1`。
  - `npm view agent-project-sdlc version dist-tags.latest dist.integrity --json`: PASS，`version` 和 `latest` 曾为 `0.1.1`。
  - Registry installed-consumer smoke: FAIL，`npx sdlc-harness doctor` 输出 `core package: agent-project-sdlc@0.1.0`，说明默认 config 版本仍来自硬编码旧值。
  - Follow-up: `0.1.2` 修复默认 config 版本来源，并作为 latest 发布。

## 5. Deployment Checklist（部署检查清单）

- [x] Local working tree was clean before starting DEV-031.
- [x] Git branch `main` was already synced with `origin/main`.
- [x] npm auth available on this machine via `npm whoami`.
- [x] Existing registry version checked; `0.1.0` already exists.
- [x] Package version bumped to `0.1.1`.
- [x] Package source drift check passed.
- [x] npm tests passed.
- [x] Pack dry run passed.
- [x] Publish package with `npm publish --workspace agent-project-sdlc`.
- [x] Verify registry package with `npm view agent-project-sdlc version dist-tags.latest dist.integrity --json`.
- [x] Supersede with `agent-project-sdlc@0.1.2` because installed-consumer smoke found stale config version.
- [ ] Do not create git tag `v0.1.1`; tag only the corrected latest release.

## 6. Rollback Plan（回滚方案）

- 触发条件（Trigger）:
  - `npm publish` 失败且 package 未创建。
  - 发布成功后发现 CLI 无法安装、初始化、doctor 失败，或包内 assets 与仓库事实源漂移。
- 步骤（Steps）:
  1. 如果 publish 未成功，不创建 release tag，保留当前 release doc 的 blocker 状态，修复后重新执行 release gate。
  2. 如果 publish 已成功但 smoke 失败，立即停止推广该版本。
  3. 由于 npm package version 不可复用，修复后 bump 到下一个 patch version，例如 `0.1.2`，重新执行 test/release gate 后发布。
  4. 如需让消费者回退，指导安装上一稳定版本或从 git commit/tag 固定依赖。
- 数据注意事项（Data considerations）:
  - 本包发布的是 CLI 和 Harness assets，不迁移 npm registry 外的数据。
  - 用户仓库 sync/upgrade 遵循 managed file 增量策略；回滚时不得覆盖用户本地自定义配置。
- 负责人（Owner）: `release_manager`

---

## v0.1.2_npm_release.md

Source: [v0.1.2_npm_release.md](v0.1.2_npm_release.md)

# Release Note And Rollback Plan（发布说明与回滚方案）

## 1. Release Summary（发布摘要）

- Version: `agent-project-sdlc@0.1.2`
- Milestone: `MVP`
- Date: `2026-05-25`
- Owner: `release_manager`
- Registry: `https://registry.npmjs.org/`
- Status: `RELEASED`

## 2. Included Changes（包含变更）

- 修复新项目初始化后的 `<harnessRoot>/config.yaml` 版本来源：`defaultConfig` 现在从 package metadata 读取 `agent-project-sdlc` 当前版本，不再硬编码 `0.1.0`。
- 增加测试覆盖，确保初始化生成的 config version 与 package version 一致。
- 继承 `0.1.1` 的 Natural Language Control 契约和 package assets 更新。
- `0.1.1` 已发布但被本版本 supersede；不创建 `v0.1.1` tag。

## 3. Build Artifacts（构建产物）

| 产物（Artifact） | 位置（Location） | Checksum/Version |
|---|---|---|
| npm package | `agent-project-sdlc` | `0.1.2` |
| dry-run tarball | `npm pack --dry-run --workspace agent-project-sdlc` | `shasum 340d13cb17b790930a53413d8cd42615e475b80d` |
| dry-run tarball | same | `integrity sha512-ezFTTxGUjKR0S[...]ygn1/iWE2ktxw==` |
| package content | dry-run output | 81 files, 37.9 kB package size, 123.7 kB unpacked size |
| registry package | `npm view agent-project-sdlc version dist-tags.latest dist.integrity --json` | `version 0.1.2`, `latest 0.1.2`, `integrity sha512-ezFTTxGUjKR0SLjvqhvA3Vw15wY7LhrEhXbKNChvCTglFyTRTURdj6ARA/TV4nK9UAgBZK4ZXygn1/iWE2ktxw==` |

## 4. Smoke Test Result（冒烟测试结果）

- Decision: `PASS`
- Evidence:
  - `npm test`: PASS，5 个 `tests/sdlc-harness/*.test.mjs` 全部通过。
  - `node packages/sdlc-harness/dist/cli.js package check-source`: PASS，`package source OK`。
  - `make validate-harness`: PASS。
  - `python3 tools/validate_allowed_paths.py`: PASS，9 个 changed files 均在 DEV-031 allowed_paths 内。
  - `npm pack --dry-run --workspace agent-project-sdlc`: PASS。
  - `git diff --check`: PASS。
  - `npm publish --workspace agent-project-sdlc`: PASS，registry 返回 `+ agent-project-sdlc@0.1.2`。
  - `npm view agent-project-sdlc version dist-tags.latest dist.integrity --json`: PASS，`version` 和 `latest` 均为 `0.1.2`。
  - Registry installed-consumer smoke: PASS，从 npm registry 安装 `agent-project-sdlc@0.1.2` 后，`npx sdlc-harness init --harness-folder .agent` 和 `npx sdlc-harness doctor` 均通过，doctor 输出 `core package: agent-project-sdlc@0.1.2`。

## 5. Deployment Checklist（部署检查清单）

- [x] `0.1.1` publish smoke issue identified and documented.
- [x] Version source fixed to read package metadata.
- [x] Package version bumped to `0.1.2`.
- [x] Package source drift check passed.
- [x] npm tests passed.
- [x] Pack dry run passed.
- [x] Publish package with `npm publish --workspace agent-project-sdlc`.
- [x] Verify registry package with `npm view agent-project-sdlc version dist-tags.latest dist.integrity --json`.
- [x] Run installed-consumer smoke from npm registry.
- [x] Create and push git tag `v0.1.2` after publish success.

## 6. Rollback Plan（回滚方案）

- 触发条件（Trigger）:
  - `npm publish` 失败且 package 未创建。
  - 发布成功后发现 CLI 无法安装、初始化、doctor 失败，或包内 assets 与仓库事实源漂移。
- 步骤（Steps）:
  1. 如果 publish 未成功，不创建 release tag，保留当前 release doc 的 blocker 状态，修复后重新执行 release gate。
  2. 如果 publish 已成功但 smoke 失败，立即停止推广该版本。
  3. 由于 npm package version 不可复用，修复后 bump 到下一个 patch version，例如 `0.1.3`，重新执行 test/release gate 后发布。
  4. 如需让消费者回退，指导安装上一稳定版本或从 git commit/tag 固定依赖。
- 数据注意事项（Data considerations）:
  - 本包发布的是 CLI 和 Harness assets，不迁移 npm registry 外的数据。
  - 用户仓库 sync/upgrade 遵循 managed file 增量策略；回滚时不得覆盖用户本地自定义配置。
- 负责人（Owner）: `release_manager`
