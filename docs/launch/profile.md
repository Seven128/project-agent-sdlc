# Launch Profile Sheet

Snapshot date: 2026-06-10.

Use this sheet when filling GitHub metadata, npm copy, Product Hunt fields, curated-list PRs, directory submissions, award forms or private-review intros. Keep it English-first and factual.

Do not use this as evidence of adoption, benchmark wins or product quality. It is a consistency sheet for external submissions.

## Canonical Identity

| Field | Value |
|---|---|
| Product name | Project Tiny Context Harness |
| npm package | `project-tiny-context-harness` |
| CLI bin | `ty-context` |
| Repository | `https://github.com/Seven128/project-tiny-context-harness` |
| License | MIT |
| Category | Developer Tools / AI coding-agent infrastructure / Context engineering |

## Short Fields

Use these when a platform has strict length limits.

| Field | Copy |
|---|---|
| Tagline | Minimal project memory for AI coding agents |
| GitHub description | Minimal project memory and validation harness for AI coding agents. |
| Directory one-liner | Repo-native project memory for fresh AI coding-agent sessions. |
| Problem line | Fresh agent chats lose project intent, boundaries and validation paths. |
| Wedge | Keep the memory. Drop the ceremony. |

## Medium Descriptions

### Default

```text
Project Tiny Context Harness helps fresh AI coding-agent sessions recover project intent, boundaries and validation paths from repo-owned Minimal Context: project_context/**, a short AGENTS.md router, role Skills and a validate-context gate.
```

### Product Hunt / Directory

```text
Project Tiny Context Harness helps coding agents recover project intent across new chats, handoffs and debugging turns. It installs compact project_context files, AGENTS.md guidance and a validate-context gate without adding a full Tiny Context ceremony.
```

### Curated List

```text
Project Tiny Context Harness is a small MIT npm package for repo-native AI coding-agent memory. It installs project_context files, AGENTS.md guidance, role Skills and a validate-context gate so fresh agent chats can recover project intent, ownership boundaries and validation paths.
```

### Private Review

```text
Project Tiny Context Harness is a small open-source tool for the boring failure mode of AI coding: the model is capable, but each new chat has to rediscover the project goal, non-goals, architecture boundaries and validation commands.
```

## Long Description

```text
Project Tiny Context Harness packages the Minimal Context Harness approach for repositories that use AI coding agents. It keeps durable project memory in plain repo files: project_context/** for project facts, AGENTS.md as the startup router, role Skills for explicit product/design/engineering requests and validate-context to check that the recovery surface exists without storing fake test-result claims.

It is intentionally not an autonomous coding agent, task manager, spec generator, code-indexing system or full Tiny Context framework. The design keeps the part that helps fresh chats recover intent while dropping phase gates, task state and work-product trees by default. Product quality still belongs to the repository's tests, CI, review and human acceptance.
```

## Category Fit

Good categories:

- AI coding-agent infrastructure
- Developer tools
- Context engineering
- Agent configuration
- Repo automation
- Open source tooling

Weak categories:

- Autonomous agents
- Project management
- Test automation
- CI/CD
- Knowledge-base search
- Compliance Tiny Context

## Tags

Primary tags:

```text
ai-agents
coding-agent
context-engineering
agent-context
project-memory
agent-memory
agents-md
developer-tools
developer-productivity
cli
```

Tool-surface tags when allowed:

```text
codex
claude-code
cursor
gemini-cli
opencode
```

Avoid using `ty-context` as the first tag on broad launch surfaces. It is acceptable as package history or search metadata, but the public wedge is Minimal Context and project memory.

## URLs

Use GitHub as the primary launch URL for public posts:

```text
https://github.com/Seven128/project-tiny-context-harness
```

Use npm as the GitHub repository homepage now that the renamed package is published:

```text
https://www.npmjs.com/package/project-tiny-context-harness
```

Useful deep links:

```text
README demo GIF:
https://raw.githubusercontent.com/Seven128/project-tiny-context-harness/main/docs/launch/assets/demo-terminal.gif

Codespaces source preview:
https://codespaces.new/Seven128/project-tiny-context-harness

Fresh-agent walkthrough:
https://github.com/Seven128/project-tiny-context-harness/blob/main/docs/examples/fresh-agent-recovery.md

Minimal Context sample guide:
https://github.com/Seven128/project-tiny-context-harness/blob/main/docs/examples/minimal-context-sample.md

Browseable sample repository:
https://github.com/Seven128/project-tiny-context-harness/tree/main/examples/minimal-context-sample

Comparison guide:
https://github.com/Seven128/project-tiny-context-harness/blob/main/docs/comparison.md

Adoption reports:
https://github.com/Seven128/project-tiny-context-harness/issues/4
```

## Install Copy

Normal install path:

```sh
npm install -D project-tiny-context-harness@latest
npx --yes --package project-tiny-context-harness@latest ty-context init
make validate-context
```

Source checkout preview:

Browser preview:

```text
Open https://codespaces.new/Seven128/project-tiny-context-harness
```

When the Codespace finishes `npm ci`, run:

```sh
npm run smoke:quickstart
npm run preview:pack
```

Local preview:

```sh
git clone https://github.com/Seven128/project-tiny-context-harness.git
cd project-tiny-context-harness
npm ci
npm run smoke:quickstart
npm run preview:pack
cd /path/to/your/test-repo
npm install -D /path/to/project-tiny-context-harness/tmp/ty-context/source-preview/package/project-tiny-context-harness-0.8.8.tgz
npx --no-install ty-context init --adopt
make validate-context
```

## First Comment Shape

```text
I built Project Tiny Context Harness for the boring failure mode of AI coding: the model is capable, but fresh chats lose repo-specific intent.

It keeps a small recovery surface in the repo: project_context/**, AGENTS.md, role Skills and validate-context. The product bet is "keep the memory, drop the ceremony": preserve durable project facts without forcing every task through Tiny Context phases, task state or work-product trees.

I am looking for feedback from people using coding agents on real repositories: what project facts should a fresh agent recover before it proposes code, and is this the smallest useful surface?
```

## Claims Boundary

Allowed:

- Minimal project memory for AI coding agents.
- Helps fresh chats recover project intent, boundaries and validation paths.
- Complements tests, CI, review, specs and retrieval tools.
- English-first public launch material with secondary localized docs.
- Installable from npm through `project-tiny-context-harness@latest`.

Avoid:

- Benchmark-proven faster.
- Validated by teams.
- Used in production.
- Award-winning.
- Autonomous Tiny Context.
- Replaces tests, CI, review, issue trackers or project management.
- Better than Codex, Claude Code, Cursor, OpenCode, Context7 or Spec Kit.
- Asking for stars, upvotes or nominations.

## Localized Boundary

Public launch fields should be English. It is fine to link `README.zh-CN.md` as a secondary translation and to keep literal non-English generated filenames or trigger examples where they explain package behavior.

Do not make external submission copy look Chinese-first unless the target community is explicitly Chinese-language.
