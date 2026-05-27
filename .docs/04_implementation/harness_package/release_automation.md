# Release Automation Implementation

## 1. 关联信息

- Domain: `harness_package`
- Module / subsystem / core flow: npm release automation and registry smoke
- Updated by task: `DEV-033`, `DEV-035`, `DEV-042`, `DEV-043`, `DEV-047`, `DEV-048`
- Linked PRD: `.docs/01_product/npm_package_distribution.md`
- Linked technical design: `.docs/03_tech_plan/harness_package_distribution.md`
- Linked RFC: none
- Linked commits: `DEV-033`, `DEV-035`, `DEV-042` implementation commits; `DEV-043` migration commit; `338b4b5`; `DEV-048` implementation commit

## 2. 当前实现范围

- `tools/release_npm.mjs` automates npm package version bump, gates, publish, registry verification, installed-consumer smoke and release-doc generation.
- `npm run release:npm` is the root script entrypoint.
- The script defaults to prepare/check mode; real publishing requires `--publish --yes`.
- Release evidence is written under `.docs/08_release/vX.Y.Z_npm_release.md`.
- `packages/sdlc-harness/README.md` is included in the package `files` list so npm displays public install, command, workflow and Skill override documentation.
- Root `README.md` is packaged as `assets/docs/README.md` so installed-package agents can inspect the full user guide from `node_modules` without changing consumer project files.
- Git commit, tag and push remain outside the release script and are handled by the SPRINTING task protocol.

## 3. 真实代码结构

| 文件（File） | 作用（Purpose） | 关键函数/对象（Key Functions/Objects） |
|---|---|---|
| `tools/release_npm.mjs` | Release automation entrypoint | version resolution, gate runner, publish, smoke, release doc writer |
| `package.json` | Root script adapter | `scripts.release:npm` |
| `packages/sdlc-harness/package.json` | Package version and publish metadata | `version`, `files`, `bin`, `prepack` |
| `packages/sdlc-harness/README.md` | npm registry README | public capability list, command examples, Skill override usage |
| `packages/sdlc-harness/assets/docs/README.md` | Packaged root README asset | agent-readable full user guide copied from root `README.md` |
| `package-lock.json` | Workspace lock version record | `packages/sdlc-harness.version` |
| `.docs/08_release/*.md` | Release evidence and rollback plan | versioned release docs |

## 4. 核心数据流

```txt
npm run release:npm -- --version patch --publish --yes
-> resolve next version from local package and npm registry
-> npm version --workspace agent-project-sdlc --no-git-tag-version
-> npm test
-> package check-source
-> npm pack --dry-run --json
-> npm publish
-> npm view latest verification
-> temporary consumer install smoke
-> write release doc
-> make docs-overview
-> make validate-harness
-> git diff --check
```

## 5. 关键实现逻辑

- The script refuses accidental publish unless both `--publish` and `--yes` are present.
- Version selection can be explicit or semantic (`patch`, `minor`, `major`) and is checked against the npm registry.
- Registry smoke validates the published package by installing it into a temporary consumer and running package commands.
- Release docs are generated as durable evidence; they are not the implementation-doc source of truth for package mechanics.
- Commit and tag creation remain manual/task-driven so release automation cannot bypass Harness task ledger rules.

## 6. 与技术方案的偏移

- The original package plan expected publish evidence to be created manually in the release stage. DEV-035 added a script because repeated package publishing became deterministic enough to automate.
- DEV-042 used the script flow to publish `agent-project-sdlc@0.1.5`.

## 7. 测试覆盖（Test Coverage）

| 测试（Test） | 覆盖范围（Coverage） | 最近记录结果（Result） |
|---|---|---|
| `node --check tools/release_npm.mjs` | Script syntax | PASS |
| `npm test` | Package build and tests before publish | PASS during release tasks |
| `node packages/sdlc-harness/dist/cli.js package check-source` | Asset drift before publish | PASS during release tasks |
| `npm pack --dry-run --json --workspace agent-project-sdlc` | Tarball content and metadata | PASS during release tasks |
| `npm publish --workspace agent-project-sdlc` | Registry publish | PASS for `v0.1.3` through `v0.1.7` |
| `npm view agent-project-sdlc version dist-tags.latest dist.integrity --json` | Registry verification | PASS for `v0.1.7` |
| `npm view agent-project-sdlc readme --json` | Registry README publication | PASS for `v0.1.7` |
| Temporary installed-consumer smoke | Published package install and CLI smoke | PASS during release tasks through `v0.1.7` |

## 8. 变更记录（Change Log）

| 日期（Date） | Task ID | Commit | 摘要（Summary） |
|---|---|---|---|
| 2026-05-25 | `DEV-033` | Historical implementation commit | Published `agent-project-sdlc@0.1.3` with release evidence. |
| 2026-05-25 | `DEV-035` | Historical implementation commit | Added `tools/release_npm.mjs` release automation. |
| 2026-05-26 | `DEV-042` | `873966d` | Released `agent-project-sdlc@0.1.5`. |
| 2026-05-26 | `DEV-043` | DEV-043 implementation commit | Moved release-flow facts out of the old `npm_package` implementation-doc directory. |
| 2026-05-26 | `DEV-047` | `338b4b5` | Released `agent-project-sdlc@0.1.6`. |
| 2026-05-26 | `DEV-048` | DEV-048 implementation commit | Released `agent-project-sdlc@0.1.7` with package README registry data and public capability coverage. |
| 2026-05-27 | Direct user request | Working tree | Added root README to package assets for installed-package agent reads. |

## 9. 后续维护注意事项

- Keep the release script conservative; publishing must remain explicit.
- If release evidence format changes, update both `tools/release_npm.mjs` and `.docs/08_release/` expectations.
