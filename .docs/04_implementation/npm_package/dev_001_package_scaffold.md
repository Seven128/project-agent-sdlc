# DEV-001 npm 包骨架 Implementation Doc

## 1. 关联信息

- Task ID: `DEV-001`
- Linked PRD: `.docs/01_product/npm_package_distribution.md`
- Linked technical design: `.docs/03_tech_plan/harness_package_distribution.md`
- Linked RFC: none
- Linked commit: pending

## 2. 本次实现范围

- 新增（Added）:
  - 根 `package.json`，声明 workspace。
  - `packages/sdlc-harness/` npm 包骨架，包含 `package.json`、`tsconfig.json`、CLI placeholder、command placeholder、lib type definitions、assets 和 migrations 目录。
  - `.harness/config.yaml`，声明 package version、schema version、managed files、local overrides 和 never overwrite。
  - `packages/sdlc-harness/source-mappings.yaml`，声明当前工作流源文件到包内 canonical source 的同步映射。
- 修改（Changed）:
  - `.harness/state/tasks.yaml`，记录 checkpoint 和任务状态。
  - `.docs/INDEX.md`，链接 implementation doc。
- 未覆盖（Not covered）:
  - 未实现真实 `sync`、`init`、`upgrade`、`doctor`、`package sync-source` 逻辑。
  - 未复制当前工作流内容到 `assets/**`；后续由 `package sync-source` 实现自动更新。

## 3. 真实代码结构

| 文件（File） | 作用（Purpose） | 关键函数/对象（Key Functions/Objects） |
|---|---|---|
| `package.json` | 根 workspace 声明 | `workspaces`、`scripts.sdlc-harness` |
| `packages/sdlc-harness/package.json` | npm 包元数据和 binary 声明 | `bin.sdlc-harness`、`files`、`scripts.build` |
| `packages/sdlc-harness/src/cli.ts` | CLI 入口 | `main()` |
| `packages/sdlc-harness/src/commands/index.ts` | 命令路由 | `commands` |
| `packages/sdlc-harness/src/commands/*.ts` | 命令 placeholder | `init`、`sync`、`upgrade`、`doctor`、`validate`、`packageSource` |
| `packages/sdlc-harness/src/lib/types.ts` | 共享数据类型 | `HarnessConfig`、`ManagedFile`、`SourceMapping` |
| `packages/sdlc-harness/src/lib/config.ts` | 默认配置模型 | `defaultConfig()` |
| `packages/sdlc-harness/source-mappings.yaml` | source authoring workspace 到 package assets 的映射 | `source_mappings` |
| `.harness/config.yaml` | 项目接入配置 | `core`、`managed_files`、`local_overrides`、`never_overwrite` |

## 4. 核心数据流

```txt
Workflow source files in this repository
-> packages/sdlc-harness/source-mappings.yaml
-> future package sync-source command
-> package canonical assets
-> future sync command
-> project workspace agent-readable files
```

## 5. 关键实现逻辑

- 输入校验（Input validation）: DEV-001 只建立类型和配置边界，未实现运行时输入校验。
- 核心分支（Core branches）: CLI placeholder 按命令名分发到 `init`、`sync`、`upgrade`、`doctor`、`validate` 和 `package`。
- 异常处理（Error handling）: `cli.ts` 捕获顶层异常并设置 `process.exitCode = 1`。
- 边界兜底（Boundary fallback）: `.harness/config.yaml` 明确 `.docs/**`、`.harness/state/**`、`src/**`、`tests/**` 为 `never_overwrite`。
- 性能或并发注意事项（Performance or concurrency notes）: 当前无并发逻辑。

## 6. 与技术方案的偏移

- 暂无功能性偏移。DEV-001 只完成包骨架和 manifest，完整命令逻辑按任务拆分留给 DEV-002 至 DEV-005。

## 7. 测试覆盖（Test Coverage）

| 测试（Test） | 覆盖范围（Coverage） | 结果（Result） |
|---|---|---|
| `python3` JSON parse check | 根 package、npm package metadata 和 `tsconfig.json` | PASS |
| `node -e` JSON parse check | Node runtime availability | BLOCKED，本机未安装 `node` |
| `make validate-checkpoint` | DEV-001 checkpoint 完整性 | PASS |
| `make lint` | 当前项目 lint gate placeholder | PASS |
| `make test-current-domain` | 当前任务 focused test gate placeholder | PASS |

## 8. 后续维护注意事项

- DEV-002 应实现真实 `sync`、`init`、`init --adopt` 和 `doctor`，不要继续扩展 placeholder。
- DEV-004 必须实现 `package sync-source` / `package check-source`，使本仓库工作流源文件变化时自动更新包内 canonical source，并用 CI 防止漂移。
