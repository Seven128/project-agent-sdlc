# AI SDLC Harness

`agent-project-sdlc` provides the `sdlc-harness` CLI and canonical workflow assets for AI-assisted software delivery. It materializes an agent-readable lifecycle, workflow skills, templates, policies, gates and documentation structure into a project workspace.

## Install

```sh
npm install -D agent-project-sdlc
npx sdlc-harness init
```

For existing projects:

```sh
npx sdlc-harness init --adopt
```

## Capabilities

| Capability | Entry Point | Description |
|---|---|---|
| Project initialization | `npx sdlc-harness init` | Creates `AGENTS.md`, `<harnessRoot>/state/**`, workflow skills, managed templates/policies, `.docs/**` and a Makefile include. |
| Existing project adoption | `npx sdlc-harness init --adopt` | Adds Harness non-destructively to an existing repository. |
| Configurable Harness root | `--harness-folder`, `package.json#sdlcHarness.harnessFolderName`, `sdlc-harness.config.json` | Supports Codex `.codex`, Claude `.claude`, Cursor `.cursor`, Cline `.cline`, Roo `.roo`, Gemini `.gemini` or a custom folder. |
| Managed file sync | `npx sdlc-harness sync` | Materializes package canonical assets into the configured Harness root while preserving project state, docs and local overrides. |
| Upgrade | `npx sdlc-harness upgrade` | Runs migrations and sync for already-adopted projects. |
| Diagnostics | `npx sdlc-harness doctor` | Reports Harness root, package version, schema version and key managed paths. |
| Validators | `npx sdlc-harness validate-*`, `make validate-current`, `make validate-harness` | Checks phase deliverables, active plan shape, prompt language contract and generated overview freshness. |
| Lifecycle workflow | `<harnessRoot>/state/lifecycle.yaml`, `<harnessRoot>/state/plan.yaml`, `.docs/**` | Tracks REQUIREMENT_GATHERING, ARCHITECTING, SPRINTING, REVIEWING, TESTING, RELEASING and RFC_RECALIBRATION facts. |
| Natural-language control | `AGENTS.md` plus workflow skills | Lets users say things like "continue", "start development", "run tests" or "requirements changed"; agents map these to workflow actions. |
| Optional parallel execution contract | `plan.yaml#parallel_execution` | Enabled only when users explicitly request multi-agent, parallel or multi-worktree execution; supports runtime-managed subagents or user-orchestrated worker prompts. |
| Workflow skills | `<harnessRoot>/skills/pjsdlc_*/SKILL.md` | Provides role prompts for product, architecture, development, implementation docs, review, testing, release and RFC recalibration. |
| Project-local skill overrides | `<harnessRoot>/pjsdlc_managed/override_skills/<skill_name>.md` + `npx sdlc-harness sync` | Appends project-specific role instructions to generated Skill output without editing managed Skill files. |
| Local policy overrides | `<harnessRoot>/pjsdlc_managed/policies/*.local.yaml` | Preserves project-specific policy additions separately from package defaults. |
| Documentation overview | `make docs-overview`, `make validate-doc-overviews` | Regenerates human-readable stage overviews from `.docs/**` fact slices. |
| Package source checks | `sdlc-harness package sync-source`, `sdlc-harness package check-source` | Maintainer commands for keeping package canonical assets aligned with this source workspace. |

## Skill Overrides

Do not edit generated files under `<harnessRoot>/skills/**/SKILL.md`; `sync` and `upgrade` regenerate them.

To customize a stage role prompt, create:

```txt
<harnessRoot>/pjsdlc_managed/override_skills/<skill_name>.md
```

Example:

```txt
.codex/pjsdlc_managed/override_skills/pjsdlc_dev_sprint.md
```

Then run:

```sh
npx sdlc-harness sync
```

The sync output is the package base Skill plus one appended `Local Override` block. Unknown skill names block sync so misspellings do not silently fail.

## Optional Parallel Execution

The default workflow is serial. Agents should only create `parallel_execution` in `plan.yaml` when the user explicitly asks for multi-agent, parallel or multi-worktree execution.

- `runtime_managed`: use only when the current agent runtime can spawn subagents. The main agent assigns workers, waits for results, reviews, merges or cherry-picks, and runs the total gate.
- `user_orchestrated`: use when the runtime cannot spawn subagents. The main agent generates copyable worker prompts, and the user manually opens Codex conversations or worktrees and pastes them.

The CLI does not promise to automatically launch Codex agents. Workers do not need to communicate with each other; the main agent owns final fact-source updates such as PRD, plan, implementation docs, test results and generated overviews.

## Common Commands

```sh
npx sdlc-harness init
npx sdlc-harness init --adopt
npx sdlc-harness sync
npx sdlc-harness upgrade
npx sdlc-harness doctor
make validate-current
make validate-harness
make docs-overview
```

## More Information

The source repository keeps the full product and architecture specification in `PROJECT_SPEC.md`, with implementation and release evidence under `.docs/**`.
