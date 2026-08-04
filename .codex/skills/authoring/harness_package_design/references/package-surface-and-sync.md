# Package Surface And Sync

Use this reference for CLI/package behavior, managed guidance/assets, source mappings, validator/doctor/init behavior or public documentation.

## Impact sweep

Index the same entry and semantics across all applicable owners:

- `packages/ty-context/src/**` implementation and `dist/**` build output;
- `.codex/ty-context-managed/**` canonical managed sources;
- installed `.codex/skills/**`, `.codex/agents/**`, Hooks/config and generated root `AGENTS.md` surfaces;
- `packages/ty-context/assets/**` package payload and source mappings;
- root `README.md`, `README.zh-CN.md`, `packages/ty-context/README.md`, CLI help/errors and npm/release copy;
- owning `PROJECT_SPEC.md` and `project_context/**` facts;
- focused, source-parity, init/sync/upgrade/doctor, tarball, consumer-lab and release-smoke coverage.

If a report originated in a consumer repository, trace every package source and destination rather than fixing the consumer copy. Package-managed destinations are generated and sync-overwritten only under their declared ownership; user files and same-name collisions remain protected.

## Placement and Context routing

Before editing managed `AGENTS.md`, apply the placement test: only startup facts, hard rules, triggers, Context entrypoints and shortest checks remain there. Put causal design in `PROJECT_SPEC.md`, current repository facts in `project_context/**`, role procedures in Skills and human instructions in READMEs. Consumer defaults do not require a `PROJECT_SPEC.md`.

Preserve the Context Priority Ladder: read Context; for page/layout/module-boundary/information-placement work first establish product/surface responsibility; classify durable meaning; update owning Context first only when durable; otherwise work code-first and write back any newly discovered durable conclusion; finish with Context drift. Never turn this into an edit-order validator.

Context graph and optional monorepo workspace metadata remain semantic routing only. Validate manifest metadata, but do not add import/path/runtime topology scans, required mirrors, read ACLs, target registries or automatic authority inference.

## Source sync

After changing managed guidance, default Skills, templates, validator, Makefile include or package docs:

1. build the current local CLI;
2. run `node packages/ty-context/dist/cli.js package sync-source`;
3. sync the current workspace when installed copies are affected;
4. rerun sync to prove idempotence when behavior changed;
5. run `node packages/ty-context/dist/cli.js package check-source`.

`sync` only refreshes declared managed assets, default Skills and tooling. It never generates project semantics, executes the full migration registry or requires an upgrade plan. Do not copy authoring-only `.codex/skills/authoring/**` into the package.

## Public and cross-platform rules

Every public CLI/help/error, README/npm/release explanation, generated trigger example, default Skill description and default artifact name must have a complete English route. Localized examples may supplement it but never be the sole path.

Treat Windows and macOS as first-class:

- keep repository-relative config/Context/managed paths in `/` form;
- use `path.join`/`path.resolve` for filesystem access and normalized POSIX paths for keys/comparisons/output;
- prefer Node/package CLI portability over platform-only shell behavior;
- source workspaces invoke the local built CLI; consumer workspaces use their installed package CLI;
- tests use normalized relative/resolved paths, not assumed `/tmp` strings;
- path behavior covers configured harness roots, slash variants, missing assets, repeated execution and safe recovery.

Do not store secrets, raw credentials, cookies, tokens, device IDs, transient logs, screenshots, CI artifacts or test-pass claims in Context or package guidance.
