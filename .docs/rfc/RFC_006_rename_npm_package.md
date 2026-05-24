# RFC_006: 发布前重命名 npm package

## 1. 背景

发布前用户希望把 npm 包名从 scoped package `@ai-sdlc/sdlc-harness` 改为 unscoped package `agent-project-sdlc`。CLI binary 仍保持 `sdlc-harness`，因为用户入口、managed markers、Makefile include 和文档已经围绕该命令名建立，改包名不要求同步改命令名。

## 2. 变更内容（Change Content）

- Added:
  - DEV-020 增量任务，用于同步 package metadata、workspace scripts、CI、默认 config、文档和发布记录。
- Changed:
  - npm package name 改为 `agent-project-sdlc`。
  - 安装命令从 `npm install -D @ai-sdlc/sdlc-harness` 改为 `npm install -D agent-project-sdlc`。
  - workspace 命令从 `--workspace @ai-sdlc/sdlc-harness` 改为 `--workspace agent-project-sdlc`。
- Removed:
  - 发布前对 `@ai-sdlc` npm organization/scope 权限的依赖。
- Unchanged:
  - CLI binary 仍为 `sdlc-harness`。
  - workspace package directory 仍为 `packages/sdlc-harness/`。
  - Harness root 默认仍为 `.agent`。

## 3. Product Impact（产品影响）

| 受影响 PRD（Affected PRD） | 影响（Impact） |
|---|---|
| `.docs/01_product/npm_package_distribution.md` | `PRD-NPM-001` 的 npm 包名更新为 `agent-project-sdlc`，CLI binary 保持 `sdlc-harness`。 |

## 4. Technical Impact Candidates（技术影响候选）

| 模块（Module） | 影响（Impact） | 置信度（Confidence） |
|---|---|---|
| `packages/sdlc-harness/package.json` | `name` 改为 `agent-project-sdlc`，保持 `bin.sdlc-harness`。 | high |
| `package.json` / `package-lock.json` | workspace selector 和 lockfile link 改为新包名。 | high |
| `packages/sdlc-harness/src/lib/config.ts` | 默认 `<harnessRoot>/config.yaml` 的 `core.package` 改为新包名。 | high |
| `.github/workflows/harness.yml` | workspace test/check-source 命令改为新包名。 | high |
| `tests/sdlc-harness/**` | 断言和 fixture 中的 package name 更新。 | high |
| `README.md` 和 `.docs/**` current slices | 当前安装、发布、release 说明改为新包名。 | high |

## 5. Acceptance Criteria

- [x] PRD 和技术方案声明 npm package name 为 `agent-project-sdlc`。
- [ ] package metadata、lockfile、workspace scripts 和 CI 命令使用 `agent-project-sdlc`。
- [ ] 默认 generated config 的 `core.package` 为 `agent-project-sdlc`。
- [ ] `npm test`、`package check-source`、`make validate-harness` 和 `npm pack --dry-run --workspace agent-project-sdlc` 通过。
- [ ] release doc 记录新包名和新的 publish command。

## 6. Regression Requirements（回归要求）

- [ ] 覆盖 `runInit` 生成的 `.agent/config.yaml` 包名字段。
- [ ] 覆盖 pack dry run 的 tarball name 和内容。
- [ ] 重新执行 local installed-consumer smoke。
- [ ] 重新验证 npm registry 中 `agent-project-sdlc` 是否可发布。

## 7. Status

- Status: APPLIED
