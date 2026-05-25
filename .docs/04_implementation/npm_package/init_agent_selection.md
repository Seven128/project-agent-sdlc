# Init Agent Selection Implementation Doc

## Summary

`DEV-040` 将 `sdlc-harness init` 的默认交互从直接询问 `Harness folder name` 调整为先选择目标 Agent。直接回车默认选择 `Codex`，并写入 `.codex`；只有选择 `Other` 时才继续询问自定义 folder，且自定义 folder 的空输入默认 `.agent`。

本次也把 workflow skill 的索引模型补充进 README、PRD、architecture、tech plan 和 PROJECT_SPEC：`<harnessRoot>/skills/**` 是 Harness hard file index，`AGENTS.md + lifecycle + phase_contracts` 是 Harness soft index；native skill 首轮水合仍由具体 Agent 客户端或 adapter 决定。

## Changed Files

| 文件 | 变更 |
|---|---|
| `packages/sdlc-harness/src/commands/init.ts` | 新增 Agent 选项映射和 `resolveAgentHarnessFolderName`；`init` 在无显式配置时先选择目标 Agent。 |
| `packages/sdlc-harness/src/commands/index.ts` | 更新 `init` help，说明无 `--harness-folder` 时会先选择目标 Agent。 |
| `tests/sdlc-harness/sync-init-doctor.test.mjs` | 覆盖默认 Codex、Other 默认、自定义 folder、内置 Agent 映射和 CLI `--harness-folder` / `--harnessFolderName` 覆盖。 |
| `README.md` | 从用户视角说明 init 选择 Agent、Other 自定义目录和 workflow skill 生效方式。 |
| `PROJECT_SPEC.md` | 明确 native skill hard index、Harness hard file index 和 Harness soft index 的差异。 |
| `.docs/01_product/npm_package_distribution.md` | 更新 PRD-NPM-015 / PRD-NPM-016 和 acceptance criteria。 |
| `.docs/02_architecture/harness_package_distribution.md` | 更新项目接入架构和 Agent 可读性约束。 |
| `.docs/03_tech_plan/harness_package_distribution.md` | 更新 init 接口契约、Agent 映射和风险缓解。 |

## Behavior

- `npx sdlc-harness init` 在交互环境中先显示目标 Agent 列表。
- 直接回车、输入 `1` 或输入 `Codex` 都解析为 `.codex`。
- 选择 `Other` 后才显示 `Harness folder name` 问句；此时直接回车解析为 `.agent`。
- 非交互环境不会阻塞，使用 Codex 默认 `.codex`。
- 显式 `--harness-folder` / `--harnessFolderName` 继续拥有最高优先级，并跳过 Agent 选择。
- 已有 `package.json#sdlcHarness.harnessFolderName` 或 `sdlc-harness.config.json#harnessFolderName` 的项目不会被重复询问。
- 配置读取层的兜底默认值仍是 `.agent`，用于没有经过交互式 init 且没有显式配置的兼容路径。

## Skill Index Boundary

本模块不把 `<harnessRoot>/skills/**` 声明为所有 Agent 的 native skill root。实际边界是：

```txt
Native skill hard index:
  Agent 客户端预扫描自己的 skill root / registry，并在首轮水合命中的 SKILL.md。

Harness hard file index:
  <harnessRoot>/skills/<skill_name>/SKILL.md，是 Harness 文件路径契约。

Harness soft index:
  AGENTS.md -> lifecycle.yaml active_skill -> phase_contracts.yaml skill -> <harnessRoot>/skills/<skill>/SKILL.md。
```

因此，在 `AGENTS.md` 里写 `<harnessRoot>/skills` 可以保证 Harness soft index，但不能保证 native skill 首轮水合。native 注册需要具体 Agent adapter 或客户端配置。

## Verification

| Gate | Result |
|---|---|
| `npm test` | PASS，5 个 `tests/sdlc-harness/*.test.mjs` 全部通过。 |
| `node packages/sdlc-harness/dist/cli.js package check-source` | PASS，package assets 与 source mappings 一致。 |
| `make validate-harness` | PASS，Harness scaffold、Skill language contract 和 doc overview check 均通过。 |
| `python3 tools/validate_allowed_paths.py` | PASS，15 个 changed files 均在 DEV-040 allowed_paths 内。 |
| `git diff --check` | PASS。 |
