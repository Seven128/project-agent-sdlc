# RFC_003: init 询问 Harness 根目录并默认使用 .agent

## 1. 背景

RFC_002 已支持通过 `harnessFolderName` 配置 Harness root，但新项目接入时仍然需要用户预先知道要在 `package.json` 中写什么。这个体验不够自然：用户运行 `sdlc-harness init` 时，CLI 应该主动询问 Harness 配置目录名，并说明默认值。

用户进一步明确：默认 Harness 配置目录应为 `.agent`，直接回车使用默认值；用户也可以输入自定义目录名。CLI 最终仍把选择写入 `package.json` 的 `sdlcHarness.harnessFolderName`。当前 `ProjectTemplate` 仓库也应遵循默认目录，从 `.harness` 迁移为 `.agent`。

## 2. 变更内容（Change Content）

- Added:
  - `sdlc-harness init` 在 CLI 层询问 Harness folder name。
  - 提示文案说明默认值为 `.agent`，直接回车采用默认。
  - CLI 将最终选择写入 `package.json` 的 `sdlcHarness.harnessFolderName`。
  - 新增 DEV-009 实现任务。
- Changed:
  - npm 包默认 Harness root 从 `.agents` 改为 `.agent`。
  - 当前仓库从 `.harness/**` 迁移为 `.agent/**`，不再通过 package.json 显式配置 `.harness`。
  - `AGENTS.md`、README、PRD、架构、技术方案、Python tools、source mappings 和测试改用 `.agent` 当前根目录。
  - `sdlc-harness init` 在非交互环境中不阻塞，采用默认 `.agent`。
- Removed:
  - 当前仓库对 `.harness` 作为自身 Harness root 的显式配置。
  - 当前仓库 `.harness/**` 工作流事实源目录。
- Unchanged:
  - 自定义项目仍可在 `package.json` 中配置其它 `harnessFolderName`，例如 `.harness`。
  - `sdlc-harness.config.json` 和 `harnessFloderName` 兼容别名仍可被读取。
  - `AGENTS.md` 仍位于项目根，作为 Agent 全局入口。
  - `.docs/**` 仍是项目文档事实源，不随 Harness root 移动。

## 3. Product Impact（产品影响）

| 受影响 PRD（Affected PRD） | 影响（Impact） |
|---|---|
| `.docs/01_product/npm_package_distribution.md` | 需要新增 init 交互式选择 root 的需求，并把默认 root 从 `.agents` 改为 `.agent`。 |

## 4. Technical Impact Candidates（技术影响候选）

| 模块（Module） | 影响（Impact） | 置信度（Confidence） |
|---|---|---|
| `packages/sdlc-harness/src/commands/init.ts` | 需要询问 Harness folder name，并在 init 前写入 `package.json#sdlcHarness.harnessFolderName`。 | high |
| `packages/sdlc-harness/src/lib/paths.ts` | 默认 Harness root 改为 `.agent`。 | high |
| `packages/sdlc-harness/src/lib/harness-root.ts` | 需要保持 `.agent` 默认和配置读取语义一致。 | high |
| `packages/sdlc-harness/source-mappings.yaml` | 当前仓库 source mappings 改为 `.agent/skills`、`.agent/managed/**`。 | high |
| `.harness/**` -> `.agent/**` | 当前仓库工作流事实源迁移到默认目录。 | high |
| `tools/*.py` | 本地 Python gate、transition、status 和 validation 需要按当前 root `.agent` 读写。 | high |
| `AGENTS.md` | 需要改为 `.agent/**` 路由，并说明默认 root。 | high |
| `README.md` | 需要更新默认目录、交互式 init、当前仓库自迭代描述和接入说明。 | high |
| `.docs/02_architecture/harness_package_distribution.md` | 需要更新默认 root 和 Agent 可读性说明。 | medium |
| `.docs/03_tech_plan/harness_package_distribution.md` | 需要新增 DEV-009，并更新默认 root、source mappings、风险说明。 | high |
| `tests/sdlc-harness/**` | 需要覆盖 CLI init prompt/default 和 `.agent` 默认 root。 | high |

Impact analysis:

```sh
python3 tools/impact_analyzer.py --rfc .docs/rfc/RFC_003_init_prompt_and_default_agent_root.md --top 40
```

## 5. Acceptance Criteria

- [ ] `sdlc-harness init` 在交互式 CLI 中提示输入 Harness folder name，并说明默认 `.agent`。
- [ ] 用户直接回车时，CLI 写入 `package.json#sdlcHarness.harnessFolderName = ".agent"` 并初始化 `.agent/**`。
- [ ] 用户输入 `.harness` 时，CLI 写入 `package.json#sdlcHarness.harnessFolderName = ".harness"` 并初始化 `.harness/**`。
- [ ] 非交互环境运行 `sdlc-harness init` 不阻塞，使用默认 `.agent`。
- [ ] 当前仓库工作流事实源迁移为 `.agent/**`，`AGENTS.md` 和 README 不再把 `.harness` 描述为当前 root。
- [ ] `npm test`、`package check-source`、`validate-harness`、`make validate-harness` 通过。

## 6. Regression Requirements（回归要求）

- [ ] 覆盖默认 `.agent` root 的 init/sync/doctor/validate 测试。
- [ ] 覆盖 CLI init 写入 package.json 默认 `.agent`。
- [ ] 覆盖 CLI init 输入自定义 `.harness` 时写入 package.json 并生成 `.harness/**`。
- [ ] 覆盖 `package.json` 中已存在 `sdlcHarness.harnessFolderName` 时不重复询问并沿用配置。
- [ ] 覆盖当前仓库 source mappings 无漂移。
- [ ] 运行 `make validate-current` 确认开发阶段闭环。

## 7. Status

- Status: APPLIED
