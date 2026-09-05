# Tiny Context

Tiny Context 只做两件事：保存跨任务有效的项目事实，以及在 `AGENTS.md` 中安装一份自动适用的短开发契约。初始化、查询、文件维护、校验、升级和导出为这两件事服务。

当前源码版本 **0.12.0**，配置 schema **5**；旧 schema 4 的更新模式为 **upgrade-required**。完整命令说明见 [英文 README](README.md)，迁移细节见 [迁移说明](packages/ty-context/migrations/README.md)。源码尚未发布时，使用本地构建的 tarball，不要假定 npm 上的版本已经包含这些修改。

## 最小开始

需要 Node.js 24 或更新版本。安装所需包版本后：

```sh
npx --no-install ty-context init
```

默认只创建 `AGENTS.md`、`.agent/config.yaml`、`project_context/global.md`、`project_context/context.toml`。已有文件保留，未知事实留为 TODO。维护锁可能临时创建 `tmp/ty-context`，它不是开发任务状态。可用 `--adopt` 标记已有项目；显式 `--harness-folder .codex` 会把可选位置记录进 `package.json`，不能用它绕过已有安装的迁移。

默认不创建架构、Area、设计系统、角色 Skill、Hook、Makefile、工具目录或 CI。已有设计资料和用户决定仍然有效。`doctor` 会提示根目录 `AGENTS.override.md` 等可观察的覆盖；文件存在不等于当前模型已经加载或遵循它。

## 内容与读取

Context 保存项目目标、非目标、责任和依赖边界、已确认决定及理由、长期约束与可重复使用的操作入口。精确值引用真实来源，不照抄代码。Context 表达预期含义，代码表达当前实现，冲突需要解释和修复。

不要求固定标题、任务进度、Fact ID、源码行数或固定汇报。TODO 和历史测试记录可以存在；长期事实变化时才更新。

```sh
npx --no-install ty-context context list --default
npx --no-install ty-context context list --default --json
npx --no-install ty-context context inspect project_context/global.md
```

新默认集合为 `global.md` 加项目显式选择。schema 5 不再把 `architecture.md` 无条件作为默认输入；manifest 是路由元数据，不是默认正文。

CLI 不可用时，直接读取 `global.md`，按 manifest 的 `default_files`、默认 Area、`read_policy = "default"` 节点及其递归 `default_children` 确定集合。直接文件和默认 Area 不自行成为子树遍历起点；子边保留旧语义，被边引用的 `never-default` 仍可进入集合。不能按 `always` 等旧名称猜测含义。

`default_files` 用于不递归的显式默认文件选择，避免把旧架构文件改为 default 节点后意外展开子树。不要求临时联网安装 CLI，不要求集合不变时重复查询。解析失败会返回非成功状态，已知部分明确标为不完整；只优先解决影响当前任务的缺口。

Area/workspace 可以稀疏组织，按实际依赖扩读，读取相邻资料不意味着获得修改授权。

## 维护与校验

create 创建未登记草稿；register/move 默认预览，`--apply` 才通过原有文件事务写入。路径、Unicode/大小写冲突、并发内容变化和恢复保护继续有效，没有 force 绕过。当前事务为 `context-mutation-journal-v3`，恢复解析器兼容 `context-mutation-journal-v2`；无法识别的 pre-v2 记录需要匹配旧版本人工恢复。schema 4 的未完成事务必须先由兼容旧 CLI 收尾。

```sh
npx --no-install ty-context context transaction status
npx --no-install ty-context context transaction complete
npx --no-install ty-context context transaction rollback
npx --no-install ty-context sync
npx --no-install ty-context validate-context
npx --no-install ty-context doctor
```

sync 只更新托管启动块，保留周围用户内容，不静默迁移旧 schema。校验检查 manifest、已登记与直接默认路径、重复标识、安全路径和明确声明的本地依赖，例如：

```html
<!-- ty-context-controlling-source domain="technical" path="docs/api.md" -->
```

普通正文、Markdown 链接、历史示例、远端链接和未声明的待生成产物不自动成为阻断条件。不会执行生成器或联网检查。校验通过不等于事实真实、完整或产品正确；产品质量仍由项目测试与实际观察验证。

## 一次性迁移

```sh
npx --no-install ty-context upgrade --check
# 停止相关旧宿主会话后执行：
npx --no-install ty-context upgrade --sessions-stopped
```

自动退役支持固定的 schema 4 / 包 0.11.0 基准。旧 Context journal 未完成或不可读时，先阻止退役；用明确兼容的 **0.11.0** 恢复入口完成或回滚，不能用 `@latest`。如旧绑定冲突，先合法结束或 abandon，不要求旧 Final Gate，不直接删锁。

迁移保持默认正文的归一化路径集合完全一致。备份保存在 `tmp/ty-context/upgrade-backups`，未完成切换有显式记录，普通 sync 会拒绝。重新执行升级可继续；跨文件替换不宣称物理原子性。

只移除内容精确匹配的旧托管资产，保留混合 Hook/Makefile 用户部分，只解除目标 worktree 的记录和 marker。修改过的旧执行指令需要先协调。历史资料不执行、不强制转换。

软件资产成功与项目信息审阅分开报告。明确仍在用、依赖已退役解析器的资源，需要先提取独有要求、采用决定和位置并保留出处，或换成直接可读来源；不能重新生成设计或猜测原有决定。普通 Markdown、直接 JSON/YAML 值继续可读，没有通用旧编译器或任意结构化 ID 适配。构建脚本仍调用退役命令时，先替换依赖并验证派生产物。有限检查之外的当前任务、选定资源和构建入口仍需按实际引用审阅，历史提到 Final Gate 不自动阻止整个项目。

Long-Task、DSA/DRA、角色流程、设计证明、观察器、排名路由及行数门槛退出。旧命令明确失败，不伪装成语义缩减后的成功。新版不能追溯修复旧二进制；某些旧命令可能先修改 profile 再拒绝 schema 5，旧版无参数 init 还可能在检查 schema 前重选根目录并重新安装旧启动资产；指定同一根目录的旧 sync/init 才会拒绝 schema 5。新写入口拒绝这种混用安装/配置。迁移后开新宿主会话，避免已加载的旧指令继续影响工作。

短契约要求理解输入、尊重授权与项目约束、自主实施、直接设计迭代、实际验证、修复问题、按需维护事实和如实交付；不附加固定表格、流程阶段或 Gate。

## 源码开发

临时导出入口见 `ty-context export-context --help`。source-pack 只更新登记在自身清单中且未被修改的生成文件；保留未登记的用户文件和历史目录，拒绝覆盖已编辑的生成内容。导出集合不是跨文件原子事务，也不成为长期 Context 或产品验证证据。

构建使用普通 TypeScript，测试覆盖保留能力、真实旧版本事务恢复和实际 tarball 消费。canonical 位于 `.codex/ty-context-managed`，通过 source mappings 同步到包。打包前清理旧 dist，避免退役模块残留。测试只能证明其检查范围和入口文本分发，不能证明模型遵循程度或未经测量的提速。
