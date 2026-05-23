# AI SDLC Harness

开始任何工作前读取 `.harness/state/lifecycle.yaml`，再按 `active_skill` 指定的 Skill 执行。

- `.docs/**` 是正式项目产物事实源。
- `.harness/state/**` 的具体值属于项目实例，升级不覆盖。
- state protocol、templates、policies、skills、validators 和 migrations 由 `@ai-sdlc/sdlc-harness` 提供。
- `sdlc-harness upgrade` 必须自动执行 `sdlc-harness sync`。
