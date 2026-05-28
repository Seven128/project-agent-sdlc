# Source Sync and Package Assets Implementation

## 1. 关联信息

- Domain: `harness_package`
- Module / subsystem / core flow: package canonical assets, source sync, managed file materialization
- Updated by task: `DEV-001`, `DEV-004`, `DEV-006`, `DEV-012`, `DEV-013`, `DEV-021`, `DEV-022`, `DEV-023`, `DEV-027`, `DEV-037`, `DEV-038`, `DEV-039`, `DEV-043`, `TASK-073`
- Linked PRD: `.docs/01_product/npm_package_distribution.md`
- Linked technical design: `.docs/03_tech_plan/harness_package_distribution.md`
- Linked RFC: `RFC_001`, `RFC_007`, `RFC_008`, `RFC_009`, `RFC_013`
- Linked commits: historical `DEV-*` implementation commits; `DEV-043` migration commit

## 2. 当前实现范围

- The authoring workspace is the source of truth for `AGENTS.md`, root `README.md`, workflow Skills, templates, policies, Makefile include assets and GitHub workflow assets.
- `package sync-source` copies or extracts those source files into `packages/sdlc-harness/assets/**`.
- `package check-source` verifies that package assets have not drifted from authoring sources.
- User-project `sync` materializes package assets into the configured `<harnessRoot>` and project root using managed strategies.
- Authoring-only Skills under `<harnessRoot>/skills/authoring/**` are excluded from package assets.
- User-owned Markdown files may contain fixed package-managed sections. `sync` / `upgrade` update only `memory.md#Harness Guidance` and `.docs/INDEX.md#Harness Maintenance Rules`, while preserving user memory entries, artifact maps and links outside those sections.
- The default GitHub workflow is safely upgradable only when the file has `pjsdlc:sdlc-harness:github-workflow:*` markers or still exactly matches the old generated workflow without markers; customized no-marker workflows are skipped and reported as `customized`.

## 3. 真实代码结构

| 文件（File） | 作用（Purpose） | 关键函数/对象（Key Functions/Objects） |
|---|---|---|
| `packages/sdlc-harness/source-mappings.yaml` | Source-to-asset manifest | `source_mappings`, `mode`, `exclude` |
| `packages/sdlc-harness/src/commands/package-source.ts` | Package source command adapter | `package sync-source`, `package check-source` |
| `packages/sdlc-harness/src/lib/package-source.ts` | Source sync/check implementation | copy/extract/check modes, exclude handling |
| `packages/sdlc-harness/src/lib/sync-engine.ts` | User-project materialization engine | managed strategies, marker handling |
| `packages/sdlc-harness/src/lib/managed-file.ts` | Managed metadata blocks | `pjsdlc:sdlc-harness:*` markers |
| `packages/sdlc-harness/src/lib/user-owned-sections.ts` | User-owned Markdown section sync | `syncProjectGuidanceSections`, `syncMemoryGuidanceSection`, `syncDocsIndexMaintenanceSection` |
| `packages/sdlc-harness/src/lib/migrations.ts` | Upgrade migrations | legacy seed guidance migration, default managed file migration |
| `packages/sdlc-harness/src/lib/init.ts` | New project seeds | initial state and docs plus guidance section merge |
| `packages/sdlc-harness/assets/**` | Package canonical assets | generated from authoring source by `package sync-source` |
| `packages/sdlc-harness/assets/docs/README.md` | Packaged agent-readable user guide | copied from root `README.md`, shipped in npm package but not auto-materialized into user project root |
| `.codex/skills/**` | Authoring source for workflow Skills | `pjsdlc_*`, `authoring/**` exclusion boundary |
| `.codex/pjsdlc_managed/**` | Authoring source for templates, policies and Makefile include | `templates`, `policies`, `make` |
| `.github/workflows/harness.yml` | Authoring source for package CI asset | workflow asset mapping |
| `tests/sdlc-harness/package-source.test.mjs` | Regression tests for source sync and drift checks | source mapping, excludes, check-source |

## 4. 核心数据流

```txt
Author edits Harness source files
-> sdlc-harness package sync-source
-> package assets are regenerated
-> sdlc-harness package check-source verifies no drift
-> npm package ships assets
-> user project runs sdlc-harness sync/upgrade
-> managed assets materialize into <harnessRoot> and root files
-> package-managed sections in user-owned Markdown files are merged by heading
-> marker-managed or exact-old GitHub workflow is updated; customized workflow is skipped
```

## 5. 关键实现逻辑

- `AGENTS.md` is synced as an extracted managed block, so project-specific text outside the block remains user-owned.
- Root `README.md` is copied into `assets/docs/README.md` so installed packages expose the full user guide to agents without overwriting a consumer repository README.
- Skills are distributed under `<harnessRoot>/skills`, while policies/templates live under `<harnessRoot>/pjsdlc_managed`.
- The package keeps a hard source mapping manifest, not a runtime scan of arbitrary repository paths.
- `copy-tree` supports exclude patterns so authoring-only material stays local to this repository.
- Makefile integration is an include block, allowing project-specific targets to win on name conflicts.
- The current package does not guarantee native skill hydration for every Agent. It distributes files in the chosen root and exposes Harness soft routing through `AGENTS.md`.
- `memory.md#Harness Guidance` and `.docs/INDEX.md#Harness Maintenance Rules` use Markdown headings as the package-owned merge boundary. The merge replaces the managed section when present, appends it when missing, and removes known legacy untitled memory guidance / exact legacy index maintenance text to avoid duplicates.
- `sync` runs user-owned guidance section sync regardless of `managed_files` so older configs receive the sections after package updates. `upgrade` also runs the same merge during migrations before its normal sync pass.
- Config migration now backfills the `.github/workflows/harness.yml` managed file entry for older projects, so the safe workflow migration path is reachable after upgrade.
- The sync CLI and upgrade report print customized workflow skips without treating them as blockers.

## Runnable Entry/Exit

- Entry points: `sdlc-harness package sync-source`, `sdlc-harness package check-source`, user-project `sdlc-harness init`, `sdlc-harness sync`, and `sdlc-harness upgrade`.
- Exit / side effects: source sync rewrites package assets from authoring sources; check-source reports drift without writing; init/sync/upgrade merge package-managed guidance sections into `memory.md` and `.docs/INDEX.md`; workflow sync writes marker-managed or exact-old generated workflow files and skips customized no-marker workflows.
- Config contract: `packages/sdlc-harness/source-mappings.yaml`, `<harnessRoot>/config.yaml`, and managed-file metadata markers.
- Fixture/live boundary: package-source tests use temporary fixtures; real package asset updates happen only in the authoring workspace.

## Development Evidence

- Runnable Entry: `npm test --workspace agent-project-sdlc`, `node packages/sdlc-harness/dist/cli.js package sync-source`, `node packages/sdlc-harness/dist/cli.js package check-source`, and `node packages/sdlc-harness/dist/cli.js sync` were run from the repository root.
- Observable Exit: package tests passed 10/10; package source check returned `package source OK`; current `.codex/state/memory.md` now has one `## Harness Guidance` section; current `.docs/INDEX.md` now has one `## Harness Maintenance Rules` section; current and packaged `.github/workflows/harness.yml` include `pjsdlc:sdlc-harness:github-workflow:*` markers.
- Basic Self-test Evidence: `npm test --workspace agent-project-sdlc` PASS; `node packages/sdlc-harness/dist/cli.js package sync-source` PASS with changed assets; `node packages/sdlc-harness/dist/cli.js package check-source` PASS; `node packages/sdlc-harness/dist/cli.js sync` PASS with `changed=3 skipped=12 blocked=0`.

## 6. 与技术方案的偏移

- Legacy package layouts referenced `.harness/managed`, `.agents/skills` and `.agent/managed`; current generated assets use `<harnessRoot>/skills` and `<harnessRoot>/pjsdlc_managed`.
- DEV-043 removed the legacy implementation-doc directory as an active asset/documentation target; source sync does not treat `.docs/04_implementation/npm_package/**` as a maintained path.

## 7. 测试覆盖（Test Coverage）

| 测试（Test） | 覆盖范围（Coverage） | 最近记录结果（Result） |
|---|---|---|
| `node packages/sdlc-harness/dist/cli.js package sync-source` | Regenerate package canonical assets from authoring source | PASS for `TASK-059`; changed 25 assets |
| `node packages/sdlc-harness/dist/cli.js package check-source` | Asset drift detection | PASS for `TASK-059` |
| `tests/sdlc-harness/package-source.test.mjs` | Mapping modes, excludes and drift errors | PASS in `npm test` |
| `make validate-harness` | Prompt language and generated overview consistency | PASS for DEV-043 |
| `tests/sdlc-harness/sync-init-doctor.test.mjs` | Init/sync generation of memory/index guidance sections, preservation of user content and workflow markers | PASS for `TASK-073` |
| `tests/sdlc-harness/upgrade.test.mjs` | Legacy memory seed migration, missing/custom memory behavior, old generated workflow migration and custom workflow skip | PASS for `TASK-073` |
| `npm test --workspace agent-project-sdlc` | Package regression including sync/init/upgrade safety | PASS for `TASK-073`; 10 tests passed |
| `node packages/sdlc-harness/dist/cli.js package sync-source` | README and GitHub workflow package assets reflect source changes | PASS for `TASK-073` |
| `node packages/sdlc-harness/dist/cli.js package check-source` | Package canonical assets match source after TASK-073 | PASS for `TASK-073` |

## 8. 变更记录（Change Log）

| 日期（Date） | Task ID | Commit | 摘要（Summary） |
|---|---|---|---|
| 2026-05-25 | `DEV-001`, `DEV-004` | Historical implementation commits | Introduced source mappings and package source sync/check commands. |
| 2026-05-25 | `DEV-006` - `DEV-023` | Historical implementation commits | Migrated roots, markers and managed layout to the current package asset shape. |
| 2026-05-25 | `DEV-037` - `DEV-039` | Historical implementation commits | Added authoring Skill boundary and excluded authoring assets from package sync. |
| 2026-05-26 | `DEV-043` | DEV-043 implementation commit | Consolidated source-sync implementation facts from legacy task docs. |
| 2026-05-27 | Direct user request | Working tree | Added root README as a packaged docs asset for installed-package agent reads. |
| 2026-05-28 | `TASK-059` | Pending implementation commit | Synced source changes that remove duplicate phase/task state from distributed assets. |
| 2026-05-29 | `TASK-073` | Working tree | Added package-managed heading sections for user-owned memory/index files and safe marker/exact-old GitHub workflow migration. |

## 9. 后续维护注意事项

- Any change to `.codex/skills/**`, `.codex/pjsdlc_managed/**`, `AGENTS.md`, root `README.md`, Makefile include or CI asset source should be followed by `package sync-source` and `package check-source`.
- If an operation becomes repetitive and deterministic, prefer extracting it into a script and documenting the script here instead of keeping it as manual release/development lore.
