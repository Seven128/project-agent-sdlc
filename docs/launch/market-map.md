# Market Map

Snapshot date: 2026-06-10.

This file is a launch planning snapshot, not durable product truth. Recheck stars, descriptions, categories and eligibility before using it externally.

## Current Public State

Public state after the repository rename, checked against public GitHub and npm APIs:

| Surface | Snapshot |
|---|---|
| GitHub repository | `Seven128/project-tiny-context-harness` on default branch `main` |
| GitHub stars / forks | 0 stars, 0 forks |
| GitHub description / license | `Minimal project memory and validation harness for AI coding agents.`, MIT detected |
| GitHub homepage | `https://www.npmjs.com/package/project-tiny-context-harness` |
| GitHub topics | `agent-context`, `agent-memory`, `agents-md`, `ai-agents`, `ai-coding`, `claude-code`, `cli`, `codex`, `coding-agent`, `context-engineering`, `context-management`, `cursor`, `developer-productivity`, `developer-tools`, `gemini-cli`, `opencode`, `project-memory`, `ty-context`, `workflow` |
| GitHub release | Latest release is `Project Tiny Context Harness 0.8.1` |
| npm package | `project-tiny-context-harness@0.8.1` is published and installable through `@latest` |
| npm public metadata | Live npm package metadata |
| npm downloads | Renamed package download window is not available yet through the npm downloads API; legacy package last-week downloads remain useful only as historical distribution telemetry |
| Launch readiness | Local `npm run launch:check` and strict external check pass; the first public Show HN post and first regular HN comment are live |

Interpretation: GitHub metadata, npm distribution, the renamed GitHub Release and demo media are live. The first public Show HN post and first regular HN comment are live. Seven curated-list PRs are open: four narrow/P1 category-fit PRs plus three higher-activity P0 directory PRs selected by fit x maintenance activity x audience scale. The remaining work for serious public distribution is feedback handling: track 6-hour and 24-hour metrics, patch README/FAQ from repeated confusion and respond to curated-list maintainer feedback.

## Competitive Snapshot

GitHub public repository snapshot:

| Project | Stars | Positioning | What it owns |
|---|---:|---|---|
| [anomalyco/opencode](https://github.com/anomalyco/opencode) | 172,063 | Open source coding agent | Agent runtime |
| [github/spec-kit](https://github.com/github/spec-kit) | 110,772 | Spec-driven development toolkit | Spec workflow |
| [OpenHands/OpenHands](https://github.com/OpenHands/OpenHands) | 76,317 | AI-driven development platform | Agent/runtime platform |
| [upstash/context7](https://github.com/upstash/context7) | 57,057 | Up-to-date docs for LLMs/code editors | External documentation context |
| [bmad-code-org/BMAD-METHOD](https://github.com/bmad-code-org/BMAD-METHOD) | 48,839 | Agile AI-driven development method | Role/process workflow |
| [eyaltoledano/claude-task-master](https://github.com/eyaltoledano/claude-task-master) | 27,358 | AI task-management system | Task state and decomposition |
| [oraios/serena](https://github.com/oraios/serena) | 25,157 | MCP toolkit and semantic code agent IDE | Semantic retrieval/editing |
| [SuperClaude-Org/SuperClaude_Framework](https://github.com/SuperClaude-Org/SuperClaude_Framework) | 23,235 | Claude Code commands, personas and methodology | Agent configuration framework |

Interpretation: the visible AI coding/dev workflow market already has several 20k-170k star projects. Project Tiny Context Harness should not compete head-on as another agent, task manager, full Tiny Context method or retrieval engine.

## Wedge

Project Tiny Context Harness has the strongest wedge if it stays narrow:

```text
Repo-native project memory for fresh-agent recovery.
```

The message should be:

- Agents are strong inside one thread.
- The next thread often loses project-specific facts.
- Minimal Context keeps those facts in the repository.
- It complements tests, specs, task planners, coding agents and retrieval tools.
- It does not promise benchmark-proven speedups yet.

## Audience

Prioritize:

- Developers using Codex, Claude Code, Cursor, Cline, Roo, Gemini CLI or multiple agent tools on the same repo.
- Maintainers who already write `AGENTS.md`, `CLAUDE.md`, `CONTRIBUTING.md` or handoff notes.
- Small teams doing repeated agent handoffs, RFC changes, debugging turns or reviews.
- People who like Spec Kit/BMAD/Task Master but want a lighter default for ordinary repos.

Deprioritize:

- Users looking for a complete autonomous coding agent.
- Teams that want Jira/backlog ownership.
- Users who expect external documentation retrieval.
- Organizations that need a heavy compliance Tiny Context suite.

## Feasibility

Short-term realistic outcomes after GitHub default branch, npm metadata and launch kit are aligned:

- 10-100 stars: feasible with a clear HN/Reddit/Product Hunt style launch and working smoke/demo.
- 100-1,000 stars: requires repeated distribution, a short demo, adoption examples and clear differentiation from task/spec/agent tools.
- 1,000+ stars: likely requires integration stories, third-party mentions or benchmark/adoption evidence.
- Awards: possible only after a real public launch and visible adoption signal; treat awards as follow-up channels, not the first proof of value.
- 10k+ stars or major awards: not realistic from documentation alone. It would need category-level traction or a strong integration with the broader AI coding agent ecosystem.

## Positioning Rules

Say:

- Minimal project memory for AI coding agents.
- Fresh-agent recovery across new chats, handoffs and debug/RFC turns.
- Small repo-native files any agent can read.
- Context quality, not product quality.

Do not say:

- Autonomous Tiny Context.
- Replaces tests, CI or review.
- Faster delivery proven by benchmark.
- Better than Spec Kit, BMAD, Task Master, Context7 or Serena.
- Enterprise compliance workflow.

## Channel Plan

Recommended sequence:

1. Keep the Show HN thread focused on technical feedback and missing recovery facts.
2. Update README/launch copy from actual confusion points within 24 hours.
3. Monitor the seven open curated-list PRs, then choose any next list by `fit x maintenance activity x audience scale`; do not wait on inactive lists just because they were in the older queue.
4. Reuse the same claim on smaller communities only after the first feedback pass.
5. Use Product Hunt only after the HN feedback loop or with a deliberate scheduling decision.
6. Nominate for awards only after real use appears or a minimum eligibility threshold is met.

## Evidence To Gather Next

- HN first-comment replies and direct replies from the live Show HN thread.
- 6-hour and 24-hour metrics after the first public post.
- One example PR showing how `project_context/**` prevents agent drift.
- One fresh benchmark rerun that compares baseline vs Minimal Context without old stage results.
- User quotes or issues that mention real handoff/recovery value.
- npm download trend after launch.

## Adjacent Curated Lists

Use a three-factor score before opening more PRs:

```text
target score = category fit x maintenance activity x audience scale
```

Maintenance activity is a hard factor. A large list with no recent merged PRs can be worse than a smaller list whose maintainer is actively merging. This avoids spending launch time waiting on stale directories.

| List | Current scale / activity | Fit | Status / gate |
|---|---:|---|---|
| [awesome-harness-engineering](https://github.com/ai-boost/awesome-harness-engineering) | niche, lower recent activity | Direct context-delivery and harness-engineering fit. | Open as [PR #58](https://github.com/ai-boost/awesome-harness-engineering/pull/58); monitor, but do not let slower response block higher-activity targets. |
| [awesome-agent-harness](https://github.com/Picrew/awesome-agent-harness) | niche | Direct Context & Working-State Engineering fit. | Open as [PR #22](https://github.com/Picrew/awesome-agent-harness/pull/22); monitor maintainer feedback. |
| [awesome-agentic-coding](https://github.com/Transcenda/awesome-agentic-coding) | niche | Direct agent-instructions and Skills toolbox fit. | Open as [PR #4](https://github.com/Transcenda/awesome-agentic-coding/pull/4); monitor maintainer feedback. |
| [awesome-agentic-engineering](https://github.com/jordimas/awesome-agentic-engineering) | niche | Team-adoption fit for practical AI coding-agent workflow resources. | Open as [PR #4](https://github.com/jordimas/awesome-agentic-engineering/pull/4); monitor maintainer feedback. |
| [awesome-ai-devtools](https://github.com/jamesmurdza/awesome-ai-devtools) | 3,827 stars, pushed 2026-06-07 | Strong Agent Infrastructure / Configuration & Context Management fit and larger dev-tool audience. | Open as [PR #636](https://github.com/jamesmurdza/awesome-ai-devtools/pull/636). |
| [awesome-cli-coding-agents](https://github.com/bradAGI/awesome-cli-coding-agents) | 538 stars, pushed 2026-06-08 | Very strong CLI coding-agent harness / agent-infrastructure fit. | Open as [PR #125](https://github.com/bradAGI/awesome-cli-coding-agents/pull/125). |
| [awesome-ai-coding-tools](https://github.com/ai-for-developers/awesome-ai-coding-tools) | 1,775 stars, pushed 2026-04-25 | Good Developer Productivity Tools fit beside project-memory and agent-productivity tools. | Open as [PR #408](https://github.com/ai-for-developers/awesome-ai-coding-tools/pull/408). |
| [awesome-agents](https://github.com/kyrolabs/awesome-agents) | 2,407 stars, highly active | Broad agent list; fit is plausible as knowledge/context infrastructure, but contribution rules caution against brand-new projects without traction. | P0-watch: defer until at least one listing, feedback signal or visible traction reduces rejection risk. |
| [awesome-opencode](https://github.com/awesome-opencode/awesome-opencode) | 7,800 stars, lower recent activity | OpenCode ecosystem list; fit is plausible because README links an OpenCode setup note. | Downgrade below active targets despite higher stars; submit only if OpenCode relevance is requested or activity resumes. |
