# DEV-002 sync/init/doctor Implementation Doc

## 1. 关联信息

- Task ID: `DEV-002`
- Linked PRD: `.docs/01_product/npm_package_distribution.md`
- Linked technical design: `.docs/03_tech_plan/harness_package_distribution.md`
- Linked RFC: none
- Linked commit: `559d169`

## 2. 本次实现范围

- 新增（Added）:
  - Node-only runtime helpers for filesystem, YAML, config, init, sync, and doctor.
  - `sdlc-harness init` / `init --adopt` minimal non-destructive project setup.
  - `sdlc-harness sync` materialization for `AGENTS.md` managed block, skills, templates, policies, Makefile fragment, and optional workflow.
  - `sdlc-harness doctor` diagnostics for config, required state/docs files, and managed paths.
  - Package assets for `AGENTS_CORE.md` and `.harness/make/sdlc-harness.mk`.
  - Node test coverage for init, sync, and doctor.
- 修改（Changed）:
  - Package metadata now includes `yaml`, `@types/node`, build/test/prepack scripts, and lockfile.
  - README clarifies state protocol vs state data.
  - `tasks.yaml` includes `README.md` and `package-lock.json` in DEV-002 allowed paths.
- 未覆盖（Not covered）:
  - `upgrade` migration behavior remains DEV-003.
  - `package sync-source` / `package check-source` remains DEV-004.
  - Full validator migration remains DEV-005.

## 3. 真实代码结构

| 文件（File） | 作用（Purpose） | 关键函数/对象（Key Functions/Objects） |
|---|---|---|
| `packages/sdlc-harness/src/lib/fs.ts` | Node filesystem helpers | `pathExists`、`writeTextIfChanged`、`copyTree` |
| `packages/sdlc-harness/src/lib/yaml.ts` | YAML parse/stringify wrapper | `parseYaml`、`stringifyYaml` |
| `packages/sdlc-harness/src/lib/config.ts` | Harness config defaults and read/write | `defaultConfig`、`readConfig`、`writeConfigIfMissing` |
| `packages/sdlc-harness/src/lib/init.ts` | Project initialization | `runInit` |
| `packages/sdlc-harness/src/lib/sync-engine.ts` | Managed file materialization | `runSync` |
| `packages/sdlc-harness/src/lib/doctor.ts` | Project diagnostics | `runDoctor` |
| `packages/sdlc-harness/src/commands/*.ts` | CLI command adapters | `init`、`sync`、`doctor` |
| `tests/sdlc-harness/sync-init-doctor.test.mjs` | Focused Node tests | `runInit`、`runSync`、`runDoctor` |

## 4. 核心数据流

```txt
sdlc-harness init
-> create missing .harness/config.yaml, .harness/state/**, .docs/**
-> runSync
-> materialize package assets into workspace
-> sdlc-harness doctor validates required state/docs/config paths
```

## 5. 关键实现逻辑

- 输入校验（Input validation）: `doctor` checks config and required state/docs files; `init` is non-destructive and uses `writeTextIfChanged`.
- 核心分支（Core branches）:
  - `init --adopt` and normal `init` share safe creation logic.
  - `sync` dispatches by managed path and strategy.
  - `AGENTS.md` uses marker replacement with `sdlc-harness:begin/end`.
- 异常处理（Error handling）: CLI top-level catches errors; `doctor` returns warnings/errors and sets exit code through command adapter.
- 边界兜底（Boundary fallback）: `.docs/**` and `.harness/state/**` are created if missing but not overwritten when content already exists.
- 性能或并发注意事项（Performance or concurrency notes）: sync is sequential and deterministic.

## 6. 与技术方案的偏移

- Validator runtime is now expected to be Node/TypeScript only; Python scripts remain reference implementation until DEV-005 migrates validation entrypoints.

## 7. 测试覆盖（Test Coverage）

| 测试（Test） | 覆盖范围（Coverage） | 结果（Result） |
|---|---|---|
| `npm test` | TypeScript build plus init/sync/doctor Node tests | PASS |
| `python3 tools/validate_allowed_paths.py` | DEV-002 changed file boundaries | PASS |
| `make validate-checkpoint` | DEV-002 checkpoint completeness | PASS |
| `make lint` | Current project lint gate placeholder | PASS |
| `make test-current-domain` | Current task focused gate placeholder | PASS |

## 8. 后续维护注意事项

- DEV-003 should make `upgrade` call migration and then `sync`.
- DEV-004 should populate package assets from source mappings and enforce drift checks.
- DEV-005 should replace Python validator dependency with Node/TypeScript validation commands.
