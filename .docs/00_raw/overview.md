# .docs/00_raw overview

<!-- generated-by: AI SDLC Harness build_doc_overviews.py -->
<!-- source-hash: 1523e2918bbd1b52 -->

Generated artifact. Markdown slices remain the source of truth.

Source hash: `1523e2918bbd1b52`

## Source Slices

1. [npm_package_distribution.md](npm_package_distribution.md)

---

## npm_package_distribution.md

Source: [npm_package_distribution.md](npm_package_distribution.md)

# Raw Requirement: npm 包化分发与同步

## 来源

- 日期：2026-05-23
- 来源：用户对 AI SDLC Harness 产品形态的追问

## 原始问题摘要

用户提出当前 ProjectTemplate 仓库同时承担“工作流产品源码”和“项目实例”的问题：新项目难以中途接入，已经接入的项目也难以跟随工作流升级。

后续讨论确认：

- 通用能力可以做成 npm 包，但命令不能叫 `harness`，应使用 `sdlc-harness`。
- `sdlc-harness upgrade` 应自动执行 `sdlc-harness sync`。
- Agent 启动和 Skill 路由通常只读取工作区内固定目录，因此 Skill 不能只藏在 npm 包中，必须 materialize 到工作区。
- 需要明确 `AGENTS.md`、`Makefile`、`.agents/skills/**`、`.harness/templates/**`、`.harness/policies/**` 等哪些内容由 sync 管理。
- `.docs/**` 和 `.harness/state/**` 是项目事实源，不能被 npm 包升级覆盖。
- 当本仓库中工作流内容变化时，需要自动更新 npm 包逻辑和包内 canonical source，避免 reference implementation 与 npm 包分发内容漂移。

## 当前用户追问

用户希望明确 npm 包的工作内容，并确认这件事现在是否可以开始做。
