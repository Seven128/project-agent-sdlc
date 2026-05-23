# DEV-009 Init Prompt And Default Agent Root Implementation Doc

## 1. 关联信息

- Task ID: `DEV-009`
- Linked PRD: `.docs/01_product/npm_package_distribution.md`
- Linked technical design: `.docs/03_tech_plan/harness_package_distribution.md`
- Linked RFC: `.docs/rfc/RFC_003_init_prompt_and_default_agent_root.md`
- Linked commit: `5c0e501`

## 2. 本次实现范围

- 新增（Added）:
  - `sdlc-harness init` 的 Harness folder name 交互式询问。
  - `--harness-folder <path>` / `--harness-folder=<path>` CLI 参数，用于脚本和测试指定 root。
  - `packages/sdlc-harness/src/lib/package-json-config.ts`，负责读写 `package.json#sdlcHarness.harnessFolderName`。
  - `RFC_003` 和 DEV-009 checkpoint。
- 修改（Changed）:
  - 默认 Harness root 从 `.agents` 改为 `.agent`。
  - 当前仓库工作流事实源从 `.harness/**` 迁移到 `.agent/**`。
  - 当前仓库移除 `package.json#sdlcHarness.harnessFolderName`，遵循默认 `.agent`。
  - 本地 Python tools、`AGENTS.md`、README、PRD、架构、技术方案和 source mappings 全部指向 `.agent` 当前 root。
  - `sync` 渲染 `AGENTS.md` managed block 时以 `.agent` 作为模板 root 替换源。
  - 包测试覆盖默认 `.agent`、自定义 `.harness`、CLI 默认写入和已有 package 配置沿用。
- 未覆盖（Not covered）:
  - 没有引入复杂多选 UI；首版使用一行文本输入，直接回车采用默认。

## 3. 真实代码结构

| 文件（File） | 作用（Purpose） | 关键函数/对象（Key Functions/Objects） |
|---|---|---|
| `packages/sdlc-harness/src/commands/init.ts` | CLI init 入口和交互逻辑 | `resolveInitHarnessRoot`, `promptHarnessRoot`, `valueForArg` |
| `packages/sdlc-harness/src/lib/package-json-config.ts` | 写入 package root 配置 | `packageHarnessRoot`, `writePackageHarnessRoot` |
| `packages/sdlc-harness/src/lib/paths.ts` | 包默认 root 常量 | `DEFAULT_HARNESS_ROOT = ".agent"` |
| `packages/sdlc-harness/src/lib/harness-root.ts` | root 配置读取和校验 | `normalizeHarnessFolderName` |
| `packages/sdlc-harness/src/lib/init.ts` | 初始化前的非空判断 | `projectHasExistingFiles` |
| `.agent/**` | 当前仓库 Harness 工作流事实源 | state, skills, managed templates, policies |
| `tools/*.py` | 当前仓库本地 gate 和状态工具 | `.agent` 路径 |
| `tests/sdlc-harness/sync-init-doctor.test.mjs` | init/sync/doctor 和 CLI 回归 | CLI default/custom/existing package config |

## 4. 核心数据流

```txt
sdlc-harness init
-> if package/sdlc config exists, keep it
-> else ask Harness folder name in TTY
-> non-TTY uses .agent
-> write package.json#sdlcHarness.harnessFolderName
-> runInit resolves root
-> create <harnessRoot>/config.yaml + state + managed assets
```

## 5. 关键实现逻辑

- 输入校验（Input validation）:
  - 复用 `normalizeHarnessFolderName`，拒绝空值、`.`、`..`、绝对路径和包含 `..` 的路径。
  - 直接回车时使用 `.agent`。
- 核心分支（Core branches）:
  - `--harness-folder` 显式参数优先。
  - 已存在 `package.json#sdlcHarness.harnessFolderName` 或 `sdlc-harness.config.json` 时，沿用现有配置。
  - 非交互环境不阻塞，直接写入默认 `.agent`。
- 异常处理（Error handling）:
  - 非对象 `package.json` 会报错，避免写入不可预期结构。
  - 写入 package 配置后再运行 `runInit`，保证 config/state/managed files 落在同一个 root。
- 边界兜底（Boundary fallback）:
  - 旧 `.harness` 和 `.agents` 路径仍保留在 migration/sync 的 legacy branches 中，便于老项目升级。
- 性能或并发注意事项（Performance or concurrency notes）:
  - 仅本地 JSON 和文件写入，没有新增网络依赖。

## 6. 与技术方案的偏移

- RFC_003 要求 CLI 询问目录名。本实现额外提供 `--harness-folder`，用于非交互脚本和自动测试。
- 当前仓库遵循默认 `.agent`，所以根 `package.json` 不再保留 `sdlcHarness.harnessFolderName`。

## 7. 测试覆盖（Test Coverage）

| 测试（Test） | 覆盖范围（Coverage） | 结果（Result） |
|---|---|---|
| `npm test` | TypeScript build and package behavior tests | PASS |
| `tests/sdlc-harness/harness-root.test.mjs` | 默认 `.agent` root 和自定义 root 配置读取 | PASS |
| `tests/sdlc-harness/sync-init-doctor.test.mjs` | 默认 `.agent`、自定义 `.harness`、CLI init 默认写入、CLI 自定义写入、已有 package 配置沿用 | PASS |
| `node packages/sdlc-harness/dist/cli.js package check-source` | 当前 `.agent` source workspace 到包 assets 无漂移 | PASS |
| `node packages/sdlc-harness/dist/cli.js validate-harness` | 当前仓库 resolved root `.agent` | PASS |
| `make validate-harness` | 本地 Harness scaffold、prompt language、checkpoint、overview gates | PASS |

## 8. 后续维护注意事项

- 当前仓库的 Harness fact source 是 `.agent/**`；不要再新增 `.harness/**` 作为当前 root。
- 自定义业务项目仍可在 init 时输入 `.harness`，CLI 会写入 `package.json#sdlcHarness.harnessFolderName`。
- 后续改动 `AGENTS.md`、Skill、templates、policies、Makefile 或 workflow 后，继续运行 `sdlc-harness package sync-source` 和 `package check-source`。
