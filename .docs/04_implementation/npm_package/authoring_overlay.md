# Harness Authoring Overlay Implementation Doc

## 1. 关联信息

- Domain: `npm_package`
- Module / subsystem / core flow: Harness authoring overlay
- Updated by task: `DEV-014`, `DEV-037`, `DEV-038`
- Linked PRD: `.docs/01_product/npm_package_distribution.md`
- Linked technical design: `PROJECT_SPEC.md` section 17
- Linked RFC: none
- Linked commit: `DEV-037` implementation commit, `DEV-038` implementation commit

## 2. 当前实现范围

- 新增（Added）:
  - `.agent/skills/authoring/harness_package_design/SKILL.md`，作为本仓库维护 AI SDLC Harness 自身时的专用 authoring skill。
  - `AGENTS.md` 将 `.agent/skills/authoring/` 声明为可选事实源，仅在维护 Harness/workflow/npm package 源码或本仓库自举规则时读取。
  - authoring skill 增加 scriptability heuristic：发现重复、耗时、易漏步骤、易漂移、需要固定证据或涉及发布/回滚安全阀的动作时，提示用户可以抽成脚本。
- 修改（Changed）:
  - authoring overlay 从仅存在于设计文档的推荐目录，落地为可被后续 Agent 读取的本地专用 Skill。
- 未覆盖（Not covered）:
  - 不把 `.agent/skills/authoring/**` 加入 `packages/sdlc-harness/source-mappings.yaml`。
  - 不把 authoring Skill materialize 到用户项目。
  - 不新增 automatic script generator；当前只要求 Agent 识别并提示可脚本化机会。

## 3. 真实代码结构

| 文件（File） | 作用（Purpose） | 关键函数/对象（Key Functions/Objects） |
|---|---|---|
| `.agent/skills/authoring/harness_package_design/SKILL.md` | 本仓库专用 authoring skill | 分层判断、scriptability heuristic、package source sync 边界 |
| `AGENTS.md` | Agent 入口协议 | 可选读取 `.agent/skills/authoring/` |
| `packages/sdlc-harness/assets/agents/AGENTS_CORE.md` | package canonical AGENTS managed block | 由 `package sync-source` 同步 `AGENTS.md` |
| `packages/sdlc-harness/source-mappings.yaml` | source to package assets 映射 | 未包含 `.agent/skills/authoring/**` |

## 4. 核心数据流

```txt
User asks to change Harness/workflow/package source
-> Agent reads AGENTS.md, lifecycle.yaml, plan.yaml
-> If relevant, Agent reads .agent/skills/authoring/** local overlay
-> Agent classifies change as common Harness config, project instance data, or authoring overlay
-> Agent suggests scripting when an action is repetitive, slow, error-prone, drift-prone, evidence-heavy, or release-sensitive
-> Common Harness source changes still run package sync-source/check-source
-> .agent/skills/authoring/** remains local-only
```

## 5. 关键实现逻辑

- 输入校验（Input validation）: authoring Skill 要求先读取 lifecycle 和 plan，并区分通用配置、项目实例数据和 authoring overlay。
- 核心分支（Core branches）: 通用配置进入 `.agent/skills/**`、`.agent/pjsdlc_managed/**` 或 package assets；项目实例数据留在 `.agent/state/**` 和 `.docs/**`；authoring overlay 留在 `.agent/skills/authoring/**`。
- 脚本化提示（Scriptability heuristic）: 重复、耗时、易漏步骤、易漂移、需要固定证据、涉及发布/回滚安全阀或未来很可能复用的动作，应提示用户可以抽成脚本，并说明脚本边界、输入、默认安全行为和验证命令。
- 边界兜底（Boundary fallback）: `.agent/skills/authoring/**` 不进入 `source-mappings.yaml`，所以 `package sync-source` 不会复制到 package assets。

## 6. 与技术方案的偏移

- DEV-014 只设计 authoring overlay，不创建目录。本次将推荐目录中的专用 Skill 最小落地，并保持“不默认进入 npm 包”的边界。

## 7. 测试覆盖（Test Coverage）

| 测试（Test） | 覆盖范围（Coverage） | 结果（Result） |
|---|---|---|
| `node packages/sdlc-harness/dist/cli.js package check-source` | AGENTS package asset 与 source workspace 一致，且 authoring overlay 不在 source mappings 中 | PASS |
| `make validate-harness` | Harness scaffold、skill language、doc overview、implementation doc index | PASS |
| `python3 tools/validate_allowed_paths.py` | DEV-038 修改范围符合 allowed_paths | PASS |
| `git diff --check` | Markdown/YAML trailing whitespace 和 patch 格式 | PASS |

## 8. 变更记录（Change Log）

| 日期（Date） | Task ID | Commit | 摘要（Summary） |
|---|---|---|---|
| 2026-05-25 | `DEV-014` | `DEV-014` implementation commit | 设计 Harness authoring overlay 分层，但未创建 `.agent/skills/authoring/**`。 |
| 2026-05-25 | `DEV-037` | `DEV-037` implementation commit | 落地本仓库专用 authoring skill，并加入可脚本化动作提示规则。 |
| 2026-05-25 | `DEV-038` | `DEV-038` implementation commit | 将 authoring skill 迁入统一 `.agent/skills/authoring/**` 树，并由 npm source sync 排除。 |

## 9. 后续维护注意事项

- `.agent/skills/authoring/**` 只服务本仓库维护 Harness 自身；不要加入 `packages/sdlc-harness/source-mappings.yaml`。
- 可脚本化提示应保持轻量：先指出机会和收益，再根据用户确认或任务要求实现脚本。
- 如果 scriptability heuristic 未来对所有用户项目都有价值，应通过 PRD / tech plan / RFC 晋升为通用 Harness 能力。
