# DEV-020 Rename NPM Package

## Summary

将 npm package name 从 `@ai-sdlc/sdlc-harness` 改为 `agent-project-sdlc`，保留 CLI binary `sdlc-harness` 不变。该变更用于发布前去掉 npm organization/scope 依赖，降低首次发布的权限门槛。

## Changed Files

| 文件 | 变更 |
|---|---|
| `packages/sdlc-harness/package.json` | `name` 改为 `agent-project-sdlc`，`bin.sdlc-harness` 保持不变。 |
| `package.json` / `package-lock.json` | workspace selector 和 lockfile link 改为 `agent-project-sdlc`。 |
| `packages/sdlc-harness/src/lib/config.ts` | 默认 generated config 的 `core.package` 改为 `agent-project-sdlc`。 |
| `.github/workflows/harness.yml` / package asset workflow | CI workspace 命令改为 `--workspace agent-project-sdlc`。 |
| `tests/sdlc-harness/**` | 更新 package name 断言和 migration fixture。 |
| `README.md` | 安装、升级和包名说明改为 `agent-project-sdlc`。 |
| `.docs/02_architecture/`、`.docs/06_review/`、`.docs/07_test/`、`.docs/08_release/` | 同步当前包名、pack 命令和 release evidence。 |

## Verification

| Gate | Result |
|---|---|
| `npm test` | PASS，5 个 `tests/sdlc-harness/*.test.mjs` 全部通过。 |
| `node packages/sdlc-harness/dist/cli.js package check-source` | PASS，`package source OK`。 |
| `make validate-harness` | PASS。 |
| `npm pack --dry-run --workspace agent-project-sdlc` | PASS，tarball `agent-project-sdlc-0.1.0.tgz`，81 files，shasum `906e745f5dd9a6fdc14890ea64199694e7095a77`。 |
| Local installed-consumer smoke | PASS，tarball 安装后 `npx sdlc-harness help`、`init --harness-folder .agent`、`doctor` 均通过。 |
| `npm view agent-project-sdlc version --json` | 当前返回 `E404`，说明该包名尚未公开存在，或未认证用户无访问权限。 |

## Notes

- `npm publish` 对 unscoped package 不需要 `--access public`；后续发布命令应使用 `npm publish --workspace agent-project-sdlc`。
- 发布仍被 npm auth 阻塞，`npm whoami` 当前返回 `ENEEDAUTH`。
