# Skills, Prompt Routing and Authoring Implementation

## 1. 关联信息

- Domain: `harness_workflow`
- Module / subsystem / core flow: workflow Skills, prompt routing, hard/soft indexing and authoring overlay
- Updated by task: `DEV-014`, `DEV-016`, `DEV-017`, `DEV-021`, `DEV-023`, `DEV-029`, `DEV-036`, `DEV-037`, `DEV-038`, `DEV-039`, `DEV-040`, `DEV-043`, `DEV-044`, `DEV-046`, `DEV-049`, `DEV-050`, `DEV-055`, `DEV-056`, `TASK-057`, `TASK-060`
- Linked PRD: `.docs/01_product/npm_package_distribution.md`
- Linked technical design: `.docs/03_tech_plan/harness_package_distribution.md`, `PROJECT_SPEC.md`
- Linked RFC: `RFC_007`, `RFC_009`, `RFC_015`
- Linked commits: historical `DEV-*` implementation commits; `DEV-043` migration commit; `DEV-049` implementation commit; `DEV-050` implementation commit

## 2. 当前实现范围

- Workflow roles are represented as local Skills under `<harnessRoot>/skills/pjsdlc_*/SKILL.md`.
- `AGENTS.md` provides the deterministic soft index from lifecycle state to `active_skill`.
- Native Agent skill hydration, when supported by the client, is a separate hard-index mechanism based on the client-specific skill root.
- Natural language intent and `/xxx` macro aliases map to the same workflow actions.
- Project-local role prompt additions live under `<harnessRoot>/pjsdlc_managed/override_skills/<skill_name>.md` and are appended to managed Skill output by `sdlc-harness sync`.
- Override files support plain snippets and complete `SKILL.md` extensions with `name`/`description` frontmatter; complete extensions merge their `description` into final Skill metadata and append their body after stripping override frontmatter.
- The generated `Local Override` block tells maintainers and downstream agents to check the merged Skill for semantic conflicts between package base rules and project-local override rules.
- This authoring repository keeps a private authoring Skill under `.codex/skills/authoring/**`; package source sync excludes it from user projects.
- The authoring Skill requires README/package README coverage to stay aligned with all public package capabilities.
- PM, Manager, Dev and Tester prompts now describe optional parallel execution semantics and keep final fact-source integration with the main agent.
- PM and Architect prompts require deleting the superseded monolithic PRD/product or tech plan file after user-requested slicing creates replacement slices and updates the related fact-source references.
- Architect prompt now treats semantic design slicing as a `make validate-design` hard gate: `plan.draft.yaml` development tasks must reference `docs.tech_plan`, multiple draft tasks need distinct primary tech plan slices, generated `overview.md` cannot satisfy design deliverables, and explicit cross-cutting themes require dedicated architecture slices.
- PM, Architect, Reviewer, Tester, Release and RFC prompts now require each main workflow action to run as one small `TASK-*` `plan.yaml` task with `phase` metadata. This covers conversational generation, existing-document slicing, synthesis from prior fact sources, review batches, test evidence, release preparation and RFC recalibration.

## 3. 真实代码结构

| 文件（File） | 作用（Purpose） | 关键函数/对象（Key Functions/Objects） |
|---|---|---|
| `AGENTS.md` | Deterministic workflow router | lifecycle-first rule, natural-language and macro mapping |
| `.codex/skills/pjsdlc_manager/SKILL.md` | Manager prompt | status/next/advance/dev/test/review routing |
| `.codex/skills/pjsdlc_pm_prd/SKILL.md` | Product prompt | PRD slicing and requirement gathering |
| `.codex/skills/pjsdlc_architect_design/SKILL.md` | Architecture prompt | architecture/tech plan and `plan.draft.yaml` |
| `.codex/skills/pjsdlc_dev_sprint/SKILL.md` | Development prompt | `/dev`, `/devloop`, one-task execution protocol |
| `.codex/skills/pjsdlc_implementation_doc/SKILL.md` | Implementation fact prompt | module-level implementation docs |
| `.codex/skills/pjsdlc_reviewer/SKILL.md` | Review prompt | read-only review workflow |
| `.codex/skills/pjsdlc_tester/SKILL.md` | Testing prompt | regression/test plan workflow |
| `.codex/skills/pjsdlc_release_manager/SKILL.md` | Release prompt | release notes, smoke and rollback plan |
| `.codex/skills/pjsdlc_rfc_recalibrate/SKILL.md` | RFC prompt | change impact analysis |
| `.codex/skills/authoring/harness_package_design/SKILL.md` | Authoring-only prompt | package iteration, scriptability heuristic, README capability coverage |
| `.codex/pjsdlc_managed/policies/phase_contracts.yaml` | Phase-to-skill contract | `skill` per phase |
| `packages/sdlc-harness/src/lib/sync-engine.ts` | Skill materialization | base Skill copy plus local override append |
| `tools/validate_prompt_language.py` | Prompt contract validator | Chinese explanation + English identifiers |

## 4. 核心数据流

```txt
Agent starts work
-> read .codex/state/lifecycle.yaml
-> read active_skill unless user requested another workflow action
-> use corresponding local Skill prompt through AGENTS.md soft index
-> map natural language or /xxx alias to workflow action
-> execute phase/task protocol
```

Native Agent skill hydration, when available:

```txt
Client scans its configured skill root
-> semantic matcher selects a SKILL.md before the turn
-> selected Skill instructions hydrate the prompt
```

Harness supports this second path by placing workflow Skills under the configured `<harnessRoot>/skills` tree, but the deterministic lifecycle route does not depend on first-turn native hydration.

Skill sync with project-local role prompt additions:

```txt
Package asset packages/sdlc-harness/assets/skills/<skill_name>/SKILL.md
+ optional <harnessRoot>/pjsdlc_managed/override_skills/<skill_name>.md
-> sdlc-harness sync
-> <harnessRoot>/skills/<skill_name>/SKILL.md
```

## 5. 关键实现逻辑

- Hard index means the Agent client itself knows a fixed skill root and can enumerate `SKILL.md` files before the model turn.
- Soft index means project instructions tell the model where to look after reading state, such as `active_skill` in `lifecycle.yaml`.
- Workflow reliability comes from the soft index because it is deterministic and tied to lifecycle state.
- User convenience comes from natural-language routing and macro aliases; users do not need to memorize every `/xxx`.
- `/plan` and `/goal` are client modes and are not automatically controlled by Harness.
- Authoring-only prompts help this repository improve the Harness itself and should not be shipped into user projects by default.
- Package-facing behavior changes must keep both `README.md` and `packages/sdlc-harness/README.md` aligned with the full public capability list, not only `PROJECT_SPEC.md` or release notes.
- Local Skill overrides are append-only in v1. They let projects add role preferences or complete local Skill extensions without replacing lifecycle, task, gate or allowed-path rules from the package Skill.
- `sync` auto-detects a complete Skill override when the override file starts with `name` and `description` frontmatter, validates that `name` matches the target skill, merges the override `description` into the final top-level metadata and appends the stripped body.
- `sync` writes a semantic maintenance note into each generated `Local Override` block so future agents can review phase boundaries, `allowed_paths`, `required_gates`, commit/release rules and completion checks for conflicts.
- `sync` blocks unknown files under `<harnessRoot>/pjsdlc_managed/override_skills/*.md`, so a misspelled Skill name cannot silently fail to apply.
- `pjsdlc_managed/override_skills` keeps override configuration with other managed workflow configuration while preserving `<harnessRoot>/skills/**` as the shallow hard file index.
- When a user explicitly asks to slice an existing complete PRD/product document or complete tech plan into multiple slices, `pjsdlc_pm_prd` and `pjsdlc_architect_design` now require validating replacement slice coverage, updating `.docs/INDEX.md` and generated `overview.md`, synchronizing `plan.draft.yaml` references for tech plan slicing, and then deleting the superseded complete file so the facts are not duplicated.
- `pjsdlc_architect_design` now states that `make validate-design` hard-checks draft task `docs.tech_plan`, distinct primary tech plan slices, generated overview exclusion and dedicated architecture slices for explicit cross-cutting themes.
- `pjsdlc_pm_prd`, `pjsdlc_architect_design`, `pjsdlc_reviewer`, `pjsdlc_tester`, `pjsdlc_release_manager` and `pjsdlc_rfc_recalibrate` create or resume one small `TASK-*` task before writing phase outputs. `pjsdlc_manager` routes `/prd`, `/design`, `/review`, `/test`, `/release` and `/rfc` through those task protocols and treats remaining open tasks as phase-exit blockers.

## 6. 与技术方案的偏移

- Earlier wording treated all workflow role files as native Skills. The current model distinguishes native hard-index hydration from Harness soft-index routing.
- The default authoring root moved from `.agent` to `.codex` after target-agent selection was added.
- DEV-043 consolidated legacy task records for role prompts, skill layout and natural-language control into this module-level doc.

## 7. 测试覆盖（Test Coverage）

| 测试（Test） | 覆盖范围（Coverage） | 最近记录结果（Result） |
|---|---|---|
| `python3 tools/validate_prompt_language.py` | Prompt language contract and managed prompts | PASS in Harness gates |
| `npm test --workspace agent-project-sdlc` | Package build and CLI behavior regression tests | PASS for DEV-056; 9 tests passed |
| `node packages/sdlc-harness/dist/cli.js package sync-source` | Package assets reflect authoring Skill source changes | PASS for DEV-056 |
| `node packages/sdlc-harness/dist/cli.js package check-source` | Skills and managed prompt assets match authoring source | PASS for DEV-056 |
| `make validate-design` | Architect Skill slicing contract is reflected in the design gate | PASS for TASK-060 |
| `tests/sdlc-harness/package-source.test.mjs` | Authoring Skill exclusion from package assets | PASS in package tests |
| `tests/sdlc-harness/sync-init-doctor.test.mjs` | Skill override append, idempotency, configured root and unknown override blocking | PASS for DEV-046 |
| `tests/sdlc-harness/upgrade.test.mjs` | Migration from legacy `overrides/skills` to `pjsdlc_managed/override_skills` | PASS for DEV-046 |
| `make validate-harness` | Prompt language and overview consistency | PASS for DEV-056 |

## 8. 变更记录（Change Log）

| 日期（Date） | Task ID | Commit | 摘要（Summary） |
|---|---|---|---|
| 2026-05-25 | `DEV-014`, `DEV-016`, `DEV-017` | Historical implementation commits | Added authoring overlay concept and prompt language guidelines. |
| 2026-05-25 | `DEV-021`, `DEV-023` | Historical implementation commits | Consolidated managed config and added `pjsdlc_*` Skill names. |
| 2026-05-25 | `DEV-029` | Historical implementation commit | Added natural-language workflow control and macro aliases. |
| 2026-05-25 | `DEV-036` - `DEV-039` | Historical implementation commits | Clarified hard/soft indexes and authoring Skill packaging boundary. |
| 2026-05-25 | `DEV-040` | `40552f0` | Added target-agent selection and `.codex` default for Codex. |
| 2026-05-26 | `DEV-043` | DEV-043 implementation commit | Migrated legacy prompt/skill implementation docs into module-level facts. |
| 2026-05-26 | `DEV-044` | DEV-044 implementation commit | Added sync-time append overrides for project-local workflow Skill prompt additions. |
| 2026-05-26 | `DEV-046` | DEV-046 implementation commit | Moved project-local Skill overrides under `pjsdlc_managed/override_skills` and updated authoring impact rules. |
| 2026-05-26 | `DEV-049` | DEV-049 implementation commit | Added authoring rule that README/package README must cover all public package capabilities. |
| 2026-05-27 | `DEV-050` | DEV-050 implementation commit | Added opt-in parallel execution prompt rules for PM, Manager, Dev and Tester workflows. |
| 2026-05-27 | `DEV-055` | Working tree | Required PRD and tech plan slicing workflows to delete superseded complete files after replacement slices and references are complete. |
| 2026-05-27 | `DEV-056` | Working tree | Routed PRD and design generation/slicing through recoverable `plan.yaml` tasks. |
| 2026-05-27 | `TASK-057` | Working tree | Generalized prompt rules so every phase main action is a `TASK-*` task governed by `plan.yaml`, with review/test/release/RFC outputs using `result_docs`. |
| 2026-05-27 | Direct user request | Working tree | Added complete Skill override merge support with description merging and semantic conflict review guidance. |
| 2026-05-28 | `TASK-060` | Working tree | Promoted architect semantic slicing guidance into explicit hard-gate wording for `plan.draft.yaml` tech plan references and dedicated architecture slices. |

## 9. 后续维护注意事项

- When adding a workflow role, update both the Skill file and the soft-index contract in lifecycle/phase policies.
- If a client-specific native skill root is supported, document it as hard-index behavior without assuming every Agent hydrates it identically.
- Do not document direct edits to `<harnessRoot>/skills/**/SKILL.md` as a customization path; use `<harnessRoot>/pjsdlc_managed/override_skills/*.md` and `sdlc-harness sync`.
