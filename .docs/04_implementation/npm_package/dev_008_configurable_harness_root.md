# DEV-008 Configurable Harness Root Implementation Doc

## 1. 关联信息

- Task ID: `DEV-008`
- Linked PRD: `.docs/01_product/npm_package_distribution.md`
- Linked technical design: `.docs/03_tech_plan/harness_package_distribution.md`
- Linked RFC: `.docs/rfc/RFC_002_configurable_harness_root.md`
- Linked commit: `0c8423e`

## 2. 本次实现范围

- 新增（Added）:
  - `packages/sdlc-harness/src/lib/harness-root.ts`，统一读取 `harnessFolderName`。
  - `tests/sdlc-harness/harness-root.test.mjs`，覆盖默认 `.agents`、`package.json` 配置、`sdlc-harness.config.json` 和 `harnessFloderName` 兼容别名。
  - DEV-008 checkpoint，用于记录多文件变更现场。
- 修改（Changed）:
  - 当前仓库在 `package.json` 中声明 `sdlcHarness.harnessFolderName: ".harness"`。
  - Skill canonical source 从 `.harness/agents/skills/**` 移动到 `.harness/skills/**`。
  - `init`、`sync`、`doctor`、`migrations`、`validators` 改为使用动态 `<harnessRoot>`。
  - `.harness/config.yaml` 和 `packages/sdlc-harness/source-mappings.yaml` 改为 `.harness/skills`。
  - README、PRD、架构和技术方案补充默认 `.agents` 与显式 `.harness` 的根目录模型。
  - 包内 `AGENTS_CORE.md` 和 Skill assets 已通过 `package sync-source` 更新。
- 未覆盖（Not covered）:
  - 当前仓库本地 Python gate 仍按本仓库配置读取 `.harness/**`；npm 包运行时 validators 已支持动态 `<harnessRoot>`。

## 3. 真实代码结构

| 文件（File） | 作用（Purpose） | 关键函数/对象（Key Functions/Objects） |
|---|---|---|
| `package.json` | 当前仓库选择 `.harness` 作为 Harness root | `sdlcHarness.harnessFolderName` |
| `packages/sdlc-harness/src/lib/harness-root.ts` | 读取并校验 Harness root 配置 | `readHarnessRootConfig`, `harnessRoot`, `harnessConfigPath`, `harnessPath` |
| `packages/sdlc-harness/src/lib/config.ts` | 生成动态默认配置 | `defaultConfig`, `readConfig`, `writeConfigIfMissing` |
| `packages/sdlc-harness/src/lib/init.ts` | 初始化项目状态与 docs | `runInit`, `createProjectState` |
| `packages/sdlc-harness/src/lib/sync-engine.ts` | 按动态 root materialize assets | `runSync`, `syncManagedFile`, `renderAgentsCore` |
| `packages/sdlc-harness/src/lib/migrations.ts` | 迁移旧 managed paths | `runMigrations`, `migrateManagedFiles` |
| `packages/sdlc-harness/src/lib/validators.ts` | Node gate runtime | `validateHarness`, `validateCurrent`, `validateDev`, `validateCheckpoint` |
| `.harness/skills/**/SKILL.md` | 当前仓库 Skill canonical source | phase Skill files |
| `tests/sdlc-harness/*.test.mjs` | 行为回归测试 | default root, configured root, source sync, upgrade, validators |

## 4. 核心数据流

```txt
project root
-> read sdlc-harness.config.json#harnessFolderName
-> fallback read package.json#sdlcHarness.harnessFolderName
-> fallback default .agents
-> build <harnessRoot>/config.yaml + <harnessRoot>/state/** + <harnessRoot>/skills/** + <harnessRoot>/managed/**
-> validate / doctor / upgrade use the same resolved root
```

## 5. 关键实现逻辑

- 输入校验（Input validation）:
  - `harnessFolderName` 必须是非空相对路径。
  - 绝对路径、`.`、`..` 和包含 `..` 的路径会被拒绝。
  - `harnessFloderName` 作为拼写兼容别名读取，但新文档推荐 `harnessFolderName`。
- 核心分支（Core branches）:
  - `sdlc-harness.config.json` 优先于 `package.json#sdlcHarness`。
  - 未配置时默认 root 为 `.agents`，让 Skill 自然落到 `.agents/skills/**`。
  - 当前仓库通过 `package.json` 配置 root 为 `.harness`，因此 Skill 位于 `.harness/skills/**`。
- 异常处理（Error handling）:
  - JSON 配置解析失败会直接抛错，避免静默使用错误 root。
  - `doctor` 报告实际 resolved root，便于排查项目配置。
- 边界兜底（Boundary fallback）:
  - `sync` 和 `migrations` 仍识别旧 `.harness/agents/skills`、`.agents/skills`、`.harness/templates`、`.harness/policies` 和 `.harness/make` 路径，便于旧项目升级。
- 性能或并发注意事项（Performance or concurrency notes）:
  - Root 解析是本地 JSON 读取，没有引入网络或并发写入。

## 6. 与技术方案的偏移

- RFC_002 要求支持 `package.json` 或其它合理 JSON 配置。本实现额外支持 `sdlc-harness.config.json`，并规定其优先级高于 `package.json`。
- 默认项目不再生成 `.agents/skills` 之外的 compatibility view；`.agents` 本身就是默认 `<harnessRoot>`。

## 7. 测试覆盖（Test Coverage）

| 测试（Test） | 覆盖范围（Coverage） | 结果（Result） |
|---|---|---|
| `npm test` | TypeScript build and package behavior tests | PASS |
| `tests/sdlc-harness/harness-root.test.mjs` | root config resolution and alias support | PASS |
| `tests/sdlc-harness/sync-init-doctor.test.mjs` | default `.agents` init/sync/doctor and configured `.harness` init/sync/doctor | PASS |
| `tests/sdlc-harness/upgrade.test.mjs` | old paths migrating to configured `.harness/skills` layout | PASS |
| `tests/sdlc-harness/validators.test.mjs` | Node validators using configured `.harness` root | PASS |
| `node packages/sdlc-harness/dist/cli.js package check-source` | source workspace to package assets drift check | PASS |
| `node packages/sdlc-harness/dist/cli.js validate-harness` | current workspace resolved root `.harness` | PASS |
| `make validate-harness` | local Harness scaffold, prompt language, checkpoint, and doc overview gates | PASS |

## 8. 后续维护注意事项

- 新项目未配置时会默认写入 `.agents/**`，这是 Agent Skill discovery 的低摩擦路径。
- 使用 `.harness` 的项目需要在项目入口规则中明确 `.harness/skills/**` 是 Skill source；当前仓库已通过 `AGENTS.md` 和 `package.json` 声明。
- 当 Harness source workspace 中的 Skill、模板、策略、Makefile、workflow 或 `AGENTS.md` 变化时，继续运行 `sdlc-harness package sync-source` 和 `package check-source`，防止包内 assets 漂移。
